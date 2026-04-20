import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, },
    userName: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['user', 'admin'] },
    // Reset סיסמה (OTP 6 ספרות)
    resetPasswordCodeHash: { type: String, default: null },
    resetPasswordCodeExpiresAt: { type: Date, default: null },
    // Token איפוס אחרי אימות קוד (כדי להפריד בין "קוד" לבין "סיסמה חדשה")
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordTokenExpiresAt: { type: Date, default: null },
},
    {
        timestamps: true
    });

export const userModel=mongoose.model('users',userSchema)