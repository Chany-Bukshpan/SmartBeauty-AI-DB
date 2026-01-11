import express from 'express';

import {registerUser,loginUser,getAllUsers,getCurrentUser} from "../controllers/user.js";

const userRouter=express.Router();
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/me', getCurrentUser);
userRouter.get('/', getAllUsers)
export default userRouter;