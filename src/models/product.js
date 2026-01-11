import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    makeupName: { type: String, required: true, trim: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    productionDate: { type: Date, default: Date.now },
    imageUrl: { type: String, required: true },
    price: { type: Number, required: true },
    inStock: { type: Boolean, default: true },
},
    {
        timestamps: true
    })
export const productModel = mongoose.model('Product', productSchema);

