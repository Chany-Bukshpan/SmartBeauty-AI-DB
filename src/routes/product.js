import express from 'express';

import {getAllProducts,getProductById,addProduct,deleteById,updateProduct} from "../controllers/product.js";

const productRouter=express.Router();
productRouter.get('/:id', getProductById);
productRouter.get('/', getAllProducts);
productRouter.delete('/:id', deleteById);
productRouter.post('/', addProduct);
productRouter.put('/:id', updateProduct);
export default productRouter;

