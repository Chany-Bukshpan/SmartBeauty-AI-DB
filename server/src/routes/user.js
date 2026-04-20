import express from 'express';

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

const userRouter = express.Router();
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/firebase-login', loginWithFirebase);
userRouter.post('/request-password-reset', requestPasswordReset);
userRouter.post('/confirm-password-reset', confirmPasswordReset);
userRouter.post('/verify-password-reset-code', verifyPasswordResetCode);
userRouter.post('/reset-password-with-token', resetPasswordWithToken);
userRouter.post('/contact-us', sendContactUsMessage);
userRouter.get('/me', getCurrentUser);
userRouter.get('/', getAllUsers);
export default userRouter;