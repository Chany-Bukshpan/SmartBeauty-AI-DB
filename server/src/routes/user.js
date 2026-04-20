import express from 'express';
import mongoose from 'mongoose';

import {
  registerUser,
  loginUser,
  getAllUsers,
  getCurrentUser,
  loginWithFirebase,
  requestPasswordReset,
  confirmPasswordReset,
  verifyPasswordResetCode,
  resetPasswordWithToken,
  sendContactUsMessage,
} from "../controllers/user.js";

/** מונע המתנה של 10 שניות (Mongoose buffer) כשאין חיבור ל-DB */
const requireMongo = (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    title: "מסד נתונים לא זמין",
    message:
      "השרת לא מחובר ל-MongoDB. בדקי ב-Render את משתנה MONGODB_URI, וב-Atlas: Network Access (למשל 0.0.0.0/0), סיסמת משתמש DB, והקלאסטר לא ב-Paused.",
  });
};

const userRouter = express.Router();
userRouter.post('/register', requireMongo, registerUser);
userRouter.post('/login', requireMongo, loginUser);
userRouter.post('/firebase-login', requireMongo, loginWithFirebase);
userRouter.post('/request-password-reset', requireMongo, requestPasswordReset);
userRouter.post('/confirm-password-reset', requireMongo, confirmPasswordReset);
userRouter.post('/verify-password-reset-code', requireMongo, verifyPasswordResetCode);
userRouter.post('/reset-password-with-token', requireMongo, resetPasswordWithToken);
userRouter.post('/contact-us', sendContactUsMessage);
userRouter.get('/me', requireMongo, getCurrentUser);
userRouter.get('/', requireMongo, getAllUsers);
export default userRouter;