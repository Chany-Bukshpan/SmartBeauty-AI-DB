import { userModel } from "../models/user.js";
import { mapMongooseUserErr } from "../utils/dbMessages.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import nodemailer from "nodemailer";

const PASSWORD_MIN_LENGTH = 6;

//Authenticate user and return data with token.
export const loginUser = async (req, res) => {
    try {
        const { email, userName, password } = req.body;
        // 1. Validation: Check if credentials are provided
        if ((!email && !userName) || !password) {
            return res.status(400).json({ 
                title: "Missing data", 
                message: "email/username and password required" 
            });
        }
        // 2. Identification: Find user by email or username
        const user = await userModel.findOne({ $or: [{ email }, { userName }] });
        if (!user)
            return res.status(401).json({ 
                title: "Authentication failed", 
                message: "User not found" 
            });
        // 3. Verification: Compare provided password with hashed password
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch)
            return res.status(401).json({ 
                title: "Authentication failed", 
                message: "Incorrect password" 
            });

        // 4. Create JWT token for authentication
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // 5. Cleanup: Remove password from the user object
        const userData = user.toObject();
        delete userData.password;
        // 6. Response: Return authenticated user data and token
        res.json({ 
            message: "Login successful",
            user: userData,
            token: token
        });
    }
    catch (err) {
        res.status(500).json({
            title: "Error logging in",
            message: mapMongooseUserErr(err),
        });
    }
};

//Get all users
export const getCurrentUser = async (req, res) => {
    try {
        // Get all users from the database
        const users = await userModel.find().select("-password");
        res.json(users);
    } catch (err) {
        // Handle database or server errors
        res.status(500).json({ 
            title: "Error retrieving user", 
            message: err.message 
        });
    }
};

//Retrieving all users
export const getAllUsers = async (req, res) => {
    try {
        // Fetch all users while excluding passwords for security
        const users = await userModel.find().select("-password");
        // Return the list of users
        res.json(users);
    } catch (err) {
        // Handle database or server errors
        res.status(500).json({ error: err.message });
    }
};

//regist new user and return token.
export const registerUser = async (req, res) => {
    try {
        const { userName, email, password, role } = req.body;
        // 1. Check if all required fields are provided
        if (!userName || !email || !password)
            return res.status(400).json({ title: "Missing data", message: "All fields are required except role" });
        if (String(password).length < PASSWORD_MIN_LENGTH) {
            return res.status(400).json({
                title: "Invalid password",
                message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
            });
        }
        // 2. Verify if the email is already registered
        const alreadyExists = await userModel.findOne({ email });
        if (alreadyExists)
            return res.status(409).json({ title: "Duplicate user", message: "A user with the same email already exists" });
        // 3. Secure the password using hashing
        const hashedPassword = await bcrypt.hash(password, 10);
        // 4. Create and save the new user to the database
        const newUser = new userModel({ 
            userName, 
            email, 
            password: hashedPassword, 
            role: role || 'user' 
        });
        await newUser.save();
        
        // 5. Create JWT token for the new user
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        // 6. Return user details without the sensitive password and token
        const { password: pw, ...userData } = newUser._doc;
        res.status(201).json({
            user: userData,
            token: token
        });
    } catch (error) {
        res.status(500).json({
            title: "Error creating user",
            message: mapMongooseUserErr(error),
        });
    }
};

// Firebase/Google login: create local user if missing, then return regular JWT
export const loginWithFirebase = async (req, res) => {
    try {
        const { email, userName, firebaseUid } = req.body || {};
        if (!email) {
            return res.status(400).json({
                title: "Missing data",
                message: "email is required"
            });
        }

        let user = await userModel.findOne({ email: String(email).toLowerCase().trim() });
        if (!user) {
            const fallbackName = (userName && String(userName).trim()) || String(email).split("@")[0] || "user";
            const randomPassword = crypto.randomBytes(24).toString("hex");
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            user = new userModel({
                userName: fallbackName,
                email: String(email).toLowerCase().trim(),
                password: hashedPassword,
                role: "user"
            });
            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, firebaseUid: firebaseUid || undefined },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        const userData = user.toObject();
        delete userData.password;

        res.json({
            message: "Firebase login successful",
            user: userData,
            token
        });
    } catch (error) {
        res.status(500).json({
            title: "Error logging in with Firebase",
            message: error.message
        });
    }
};

// Password reset (real OTP flow): request code -> confirm code -> update password in MongoDB
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) {
            return res.status(400).json({ title: "Missing data", message: "email is required" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const user = await userModel.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                title: "User not found",
                message: "המייל לא קיים במערכת. בדקי את הכתובת או הירשמי קודם."
            });
        }

        const code = String(crypto.randomInt(100000, 999999)); // 6 digits
        const codeHash = crypto.createHash("sha256").update(code).digest("hex");
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (process.env.PASSWORD_RESET_DEBUG === "1") {
            console.log(`[password-reset] code for ${normalizedEmail}: ${code}`);
        }

        user.resetPasswordCodeHash = codeHash;
        user.resetPasswordCodeExpiresAt = expiresAt;
        await user.save();

        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, RESET_FROM_EMAIL } = process.env;
        const looksLikePlaceholder = (v) => {
            if (v == null) return true;
            const s = String(v);
            return (
                !s ||
                s.includes("your-") ||
                s.includes("<") ||
                s.includes("example.com")
            );
        };
        if (looksLikePlaceholder(SMTP_HOST) || looksLikePlaceholder(SMTP_USER) || looksLikePlaceholder(SMTP_PASS)) {
            return res.status(500).json({
                title: "Email not configured",
                message:
                    "כדי לשלוח קוד איפוס צריך להגדיר SMTP בשרת. עבור Gmail: SMTP_HOST=smtp.gmail.com + App Password ב־SMTP_PASS. כרגע הערכים נראים כ-Placeholder."
            });
        }

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT || 587),
            secure: false,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        // Validate SMTP connection early (so we fail clearly instead of silently)
        await transporter.verify();

        const fromEmail = RESET_FROM_EMAIL || SMTP_USER;
        await transporter.sendMail({
            from: fromEmail,
            to: normalizedEmail,
            subject: "איפוס סיסמה - MakeUp Store",
            text: `הקוד שלך לאיפוס סיסמה הוא: ${code}\n\nהקוד תקף ל-10 דקות.`,
            html: `<p>הקוד שלך לאיפוס סיסמה הוא: <b style="font-size:18px;">${code}</b></p><p>הקוד תקף ל-10 דקות.</p>`,
        });

        return res.json({
            message: "נשלח קוד לאיפוס סיסמה למייל."
        });
    } catch (error) {
        return res.status(500).json({
            title: "Error sending reset code",
            message: error.message || "שגיאה"
        });
    }
};

export const confirmPasswordReset = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body || {};

        if (!email || !code || !newPassword) {
            return res.status(400).json({ title: "Missing data", message: "email, code and newPassword are required" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const codeStr = String(code).trim();
        if (!/^\d{6}$/.test(codeStr)) {
            return res.status(400).json({ title: "Invalid code", message: "קוד האימות חייב להיות 6 ספרות." });
        }
        if (String(newPassword).length < PASSWORD_MIN_LENGTH) {
            return res.status(400).json({ title: "Invalid password", message: "סיסמה חייבת להיות לפחות 6 תווים." });
        }

        const user = await userModel.findOne({ email: normalizedEmail });
        if (!user || !user.resetPasswordCodeHash || !user.resetPasswordCodeExpiresAt) {
            return res.status(400).json({ title: "Invalid request", message: "הקוד לא תקף או לא נמצא." });
        }

        if (new Date(user.resetPasswordCodeExpiresAt).getTime() < Date.now()) {
            return res.status(400).json({ title: "Code expired", message: "הקוד פג תוקף. בקשי קוד חדש." });
        }

        const hash = crypto.createHash("sha256").update(codeStr).digest("hex");
        if (hash !== user.resetPasswordCodeHash) {
            return res.status(400).json({ title: "Invalid code", message: "הקוד שגוי." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordCodeHash = null;
        user.resetPasswordCodeExpiresAt = null;
        await user.save();

        return res.json({ message: "הסיסמה עודכנה בהצלחה." });
    } catch (error) {
        return res.status(500).json({
            title: "Error resetting password",
            message: error.message || "שגיאה"
        });
    }
};

// Step 2: verify OTP code and issue a short-lived reset token
export const verifyPasswordResetCode = async (req, res) => {
    try {
        const { email, code } = req.body || {};
        if (!email || !code) {
            return res.status(400).json({ title: "Missing data", message: "email and code are required" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const codeStr = String(code).trim();
        if (!/^\d{6}$/.test(codeStr)) {
            return res.status(400).json({ title: "Invalid code", message: "קוד האימות חייב להיות 6 ספרות." });
        }

        const user = await userModel.findOne({ email: normalizedEmail });
        if (!user || !user.resetPasswordCodeHash || !user.resetPasswordCodeExpiresAt) {
            return res.status(400).json({ title: "Invalid request", message: "הקוד לא תקף או לא נמצא." });
        }
        if (new Date(user.resetPasswordCodeExpiresAt).getTime() < Date.now()) {
            return res.status(400).json({ title: "Code expired", message: "הקוד פג תוקף. בקשי קוד חדש." });
        }

        const hash = crypto.createHash("sha256").update(codeStr).digest("hex");
        if (hash !== user.resetPasswordCodeHash) {
            return res.status(400).json({ title: "Invalid code", message: "הקוד שגוי." });
        }

        const token = crypto.randomBytes(32).toString("hex");
        user.resetPasswordTokenHash = crypto.createHash("sha256").update(token).digest("hex");
        user.resetPasswordTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        return res.json({ message: "קוד אומת בהצלחה.", resetToken: token });
    } catch (error) {
        return res.status(500).json({
            title: "Error verifying reset code",
            message: error.message || "שגיאה"
        });
    }
};

// Step 3: set new password using reset token
export const resetPasswordWithToken = async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body || {};
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ title: "Missing data", message: "email, resetToken and newPassword are required" });
        }
        if (String(newPassword).length < PASSWORD_MIN_LENGTH) {
            return res.status(400).json({ title: "Invalid password", message: "סיסמה חייבת להיות לפחות 6 תווים." });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const tokenStr = String(resetToken).trim();

        const user = await userModel.findOne({ email: normalizedEmail });
        if (!user || !user.resetPasswordTokenHash || !user.resetPasswordTokenExpiresAt) {
            return res.status(400).json({ title: "Invalid request", message: "האימות לא תקף או פג תוקף. בקשי קוד חדש." });
        }
        if (new Date(user.resetPasswordTokenExpiresAt).getTime() < Date.now()) {
            return res.status(400).json({ title: "Token expired", message: "האימות פג תוקף. בקשי קוד חדש." });
        }

        const tokenHash = crypto.createHash("sha256").update(tokenStr).digest("hex");
        if (tokenHash !== user.resetPasswordTokenHash) {
            return res.status(400).json({ title: "Invalid token", message: "האימות לא תקין. בקשי קוד חדש." });
        }

        const hashedPassword = await bcrypt.hash(String(newPassword), 10);
        user.password = hashedPassword;
        user.resetPasswordCodeHash = null;
        user.resetPasswordCodeExpiresAt = null;
        user.resetPasswordTokenHash = null;
        user.resetPasswordTokenExpiresAt = null;
        await user.save();

        return res.json({ message: "הסיסמה עודכנה בהצלחה." });
    } catch (error) {
        return res.status(500).json({
            title: "Error resetting password",
            message: error.message || "שגיאה"
        });
    }
};

// Contact us form -> sends to the same site mailbox used for reset/orders
export const sendContactUsMessage = async (req, res) => {
    try {
        const { fullName, email, subject, message } = req.body || {};
        if (!fullName || !email || !subject || !message) {
            return res.status(400).json({
                title: "Missing data",
                message: "fullName, email, subject and message are required"
            });
        }

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const fromEmail = process.env.RESET_FROM_EMAIL || smtpUser;
        const targetEmail = process.env.RESET_FROM_EMAIL || smtpUser;

        const looksLikePlaceholder = (v) => {
            if (v == null) return true;
            const s = String(v);
            return !s || s.includes("your-") || s.includes("<") || s.includes("example.com");
        };
        if (looksLikePlaceholder(smtpHost) || looksLikePlaceholder(smtpUser) || looksLikePlaceholder(smtpPass)) {
            return res.status(500).json({
                title: "Email not configured",
                message: "תצורת המייל בשרת לא הוגדרה עדיין. אנא בדקי SMTP בהגדרות השרת."
            });
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort || 587),
            secure: false,
            auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.verify();

        await transporter.sendMail({
            from: fromEmail,
            to: targetEmail,
            replyTo: String(email).trim(),
            subject: `Connect Us | ${String(subject).trim()}`,
            text:
                `פנייה חדשה מדף Connect Us\n\n` +
                `שם: ${String(fullName).trim()}\n` +
                `מייל שולח: ${String(email).trim()}\n` +
                `נושא: ${String(subject).trim()}\n\n` +
                `תוכן:\n${String(message).trim()}\n`,
            html:
                `<h3>פנייה חדשה מדף Connect Us</h3>` +
                `<p><b>שם:</b> ${String(fullName).trim()}</p>` +
                `<p><b>מייל שולח:</b> ${String(email).trim()}</p>` +
                `<p><b>נושא:</b> ${String(subject).trim()}</p>` +
                `<p><b>תוכן:</b><br/>${String(message).trim().replace(/\n/g, "<br/>")}</p>`,
        });

        return res.json({ message: "הפנייה נשלחה בהצלחה. נחזור אלייך בהקדם." });
    } catch (error) {
        return res.status(500).json({
            title: "Error sending contact message",
            message: error.message || "שגיאה"
        });
    }
};
