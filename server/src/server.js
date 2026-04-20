import dns from "node:dns";
import util from "node:util";
import http from "node:http";
import { readFileSync } from "node:fs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose, { connect } from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";

import userRouter from "./routes/user.js";
import orderRouter from "./routes/order.js";
import productRouter from "./routes/product.js";
import { productModel } from "./models/product.js";
import analyzeFace from "./api/analyzeface.js";
import aiMakeupRouter from "./routes/ai-makeup.js";
import { registerChatSocket } from "./socket/chat.js";

dns.setDefaultResultOrder?.("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });

const dbUrl = (
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DB_URI ||
  ""
).trim();

const port = process.env.PORT || 3000;

const app = express().use(express.json({ limit: "15mb" }));
app.use(cors());
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "..")));

const seedProductsIfCollectionEmpty = async () => {
  if (String(process.env.DISABLE_AUTO_SEED_ON_EMPTY || "").trim() === "1") {
    console.log(
      "[MongoDB] מילוי אוטומטי מ-products.json מושבת (DISABLE_AUTO_SEED_ON_EMPTY=1)."
    );
    return;
  }
  const productsCount = await productModel.countDocuments();
  if (productsCount > 0) {
    return;
  }

  const jsonPath = path.join(__dirname, "data", "products.json");
  let payload = readFileSync(jsonPath, "utf-8");
  if (payload.charCodeAt(0) === 0xfeff) payload = payload.slice(1);

  const products = JSON.parse(payload);
  if (!Array.isArray(products) || products.length === 0) {
    console.warn(
      "[MongoDB] אוסף products ריק, אבל products.json לא תקין/ריק — לא בוצעה טעינה."
    );
    return;
  }

  await productModel.insertMany(products);
  console.log(
    `[MongoDB] אוסף products היה ריק — נטענו ${products.length} מוצרים מ-src/data/products.json`
  );
};

const connectToDB = async () => {
  if (!dbUrl) {
    console.warn(
      "אזהרה: לא הוגדר MONGODB_URI/MONGO_URI ב־server/.env — התחברות/משתמשים לא יעבדו."
    );
    return;
  }
  try {
    try {
      const parsed = new URL(dbUrl);
      console.log(`[MongoDB] trying host: ${parsed.host}`);
    } catch {
      // keep quiet if URI is not parseable; connect() will report the real issue
    }
    await connect(dbUrl, { serverSelectionTimeoutMS: 20_000 });
    console.log("Connected to MongoDB successfully");
    await seedProductsIfCollectionEmpty();
    console.log(
      "מידע: restart של השרת לא מוחק מוצרים. איפוס מלא רק עם: npm run seed -- --force"
    );
  } catch (err) {
    const msg = String(err?.message || err);
    const deep =
      msg +
      (err?.cause?.message || "") +
      util.inspect(err, { depth: 5, maxStringLength: 4000 });
    console.error("Database connection error:", msg);
    if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(deep)) {
      console.error(
        "[MongoDB] timeout / חסימת רשת (פורט 27017) — לא מגיעים לשרתי Atlas. נסי: Hotspot, רשת ביתית, כבוי VPN, לא WiFi מלון."
      );
    } else if (/bad auth|authentication failed/i.test(deep)) {
      console.error(
        "[MongoDB] סיסמה לא תואמת — עדכני את הסיסמה ב-MONGODB_URI (Database Access ב-Atlas)."
      );
    } else if (
      msg.includes("Could not connect to any servers") ||
      msg.includes("whitelist")
    ) {
      console.error(
        "[MongoDB] לא נוצר חיבור ל-Atlas. זו אותה הודעה גנרית של MongoDB — לא אומרת תמיד \"רק IP\".\n" +
          "  • רשת: WiFi אורח/מלון/Firewall חוסמים לעיתים — נסי Hotspot או בית.\n" +
          "  • Atlas → Network Access: ודאי ש-0.0.0.0/0 (או ה-IP שלך) ב-Active.\n" +
          "  • Atlas → Database Access: סיסמה תואמת ל-MONGODB_URI.\n" +
          "  • Database: הקלאסטר לא ב-Paused."
      );
    }
    console.warn(
      "מצב גיבוי: מוצרים ייטענו מ־src/data/products.json; הזמנות/משתמשים דורשים MongoDB."
    );
  }
};
connectToDB();

app.get("/", (req, res) => {
  res.json({
    message: "MakeUp Store API is running!",
    endpoints: {
      products: "/api/product",
      users: "/api/user",
      orders: "/api/order",
      dbHealth: "/api/health/db",
    },
    documentation: "/api-docs.html",
  });
});

app.get("/api-docs.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "api-docs.html"));
});

/** בדיקה מהירה: האם MongoDB מחובר (ללא סודות) */
app.get("/api/health/db", (req, res) => {
  const s = mongoose.connection.readyState;
  const labels = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    mongoOk: s === 1,
    state: labels[s] ?? String(s),
    hintHe:
      s === 1
        ? "MongoDB מחובר — התחברות אמורה לעבוד."
        : "אין חיבור ל-MongoDB. בדקי בטרמינל של השרת אם מופיע Database connection error; נסי רשת אחרת (Hotspot) או עדכני סיסמת משתמש ב-Atlas.",
  });
});

app.use("/api/user", userRouter);
app.use("/api/order", orderRouter);
app.use("/api/product", productRouter);
app.post("/api/analyze-face", analyzeFace);
app.use("/api/ai", aiMakeupRouter);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
registerChatSocket(io);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `פורט ${port} תפוס — עצרי שרת ישן (Ctrl+C) או: npm run free-port`
    );
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
