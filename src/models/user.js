import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, },
    userName: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['user', 'admin'] }
},
    {
        timestamps: true
    });

export const userModel=mongoose.model('users',userSchema)