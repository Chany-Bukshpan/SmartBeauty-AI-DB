import express from 'express';

import {getAllOrders,addOrder,deleteOrder,getallOrdersFromUser,updateOrder} from "../controllers/order.js";

const orderRouter=express.Router();

orderRouter.get('/all', getAllOrders);
orderRouter.get('/', getallOrdersFromUser);
orderRouter.post('/', addOrder);
orderRouter.delete('/:id', deleteOrder);
orderRouter.put('/:id', updateOrder);
export default orderRouter;