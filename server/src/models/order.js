import mongoose from "mongoose";

const minimalProductSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderDate: { type: Date, required: true },
    deadLine: { type: Date, required: true },
    address: { type: String, required: true, trim: true, lowerCase: true },
    code: { type: String, required: true },
    orderdProducts: { type: [minimalProductSchema], required: true },
    isShipped: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

export default mongoose.model('Order', orderSchema);
