import { userModel } from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
        // Handle server errors
        res.status(500).json({ 
            title: "Error logging in", 
            message: err.message 
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
        // Handle unexpected server errors
        res.status(500).json({ title: "Error creating user", message: error.message });
    }
};
