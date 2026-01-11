import express from "express"
import cors from "cors" 
import 'dotenv/config';
import { connect } from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import userRouter from './routes/user.js';
import orderRouter from './routes/order.js';
import productRouter from './routes/product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.MONGODB_URI || process.env.DB_URI; 
const port = process.env.PORT || 3000;
const app=express().use(express.json());// Allow the server to handle JSON data
app.use(cors())// Enable Cross-Origin Resource Sharing

// Serve static files from server directory (for api-docs.html)
app.use(express.static(path.join(__dirname, '..')));

// 1. Connection to Database
const connectToDB=async()=>{
    try {
        await connect(dbUrl);
        console.log("Connected to MongoDB successfully");
    } catch (err) {
        console.error("Database connection error:", err);
    }
};
connectToDB();

// 2. Routes
app.get('/', (req, res) => {
    res.json({ 
        message: "MakeUp Store API is running!",
        endpoints: {
            products: "/api/product",
            users: "/api/user",
            orders: "/api/order"
        },
        documentation: "/api-docs.html"
    });
});

// Serve API documentation
app.get('/api-docs.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'api-docs.html'));
});
app.use('/api/user', userRouter);
app.use('/api/order', orderRouter);
app.use('/api/product', productRouter);

// 3. Start the server
app.listen(port,()=>{
console.log(`Server is running on port ${port}`)})

