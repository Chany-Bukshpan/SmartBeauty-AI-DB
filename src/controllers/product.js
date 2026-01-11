import { productModel } from '../models/product.js';

// Get all products with pagination
export const getAllProducts = async (req, res) => {
    try {
        // Get page and limit from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Calculate how many to skip
        const skip = (page - 1) * limit;
        
        // Count total products
        const totalProducts = await productModel.countDocuments();
        
        // Get products with pagination
        const products = await productModel.find()
            .skip(skip)
            .limit(limit);
        
        // Calculate total pages
        const totalPages = Math.ceil(totalProducts / limit);
        
        // Return products with pagination info
        res.json({
            products: products,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalProducts: totalProducts,
                limit: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (err) {
        res.status(500).json({ title: "Error retrieving products", message: err.message });
    }
};

// Get product by ID
export const getProductById = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ title: "Product not found", message: "Product not found" });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ title: "Error retrieving product", message: err.message });
    }
};

// Add new product
export const addProduct = async (req, res) => {
    try {
        const { makeupName, brand, category, description, imageUrl, price, inStock } = req.body;
        
        // Check required fields
        if (!makeupName || !brand || !category || !imageUrl || price === undefined) {
            return res.status(400).json({ 
                title: "Missing details", 
                message: "makeupName, brand, category, imageUrl, and price are required" 
            });
        }

        // Create new product
        const newProduct = new productModel({
            makeupName,
            brand,
            category,
            description,
            imageUrl,
            price,
            inStock: inStock !== undefined ? inStock : true
        });

        // Save to database
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        res.status(500).json({ title: "Error creating product", message: err.message });
    }
};

// Update product
export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updateData = req.body;
        
        // Update product
        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedProduct) {
            return res.status(404).json({ 
                title: "Product not found", 
                message: "Product not found" 
            });
        }
        
        res.json({ message: "Product updated successfully", product: updatedProduct });
    } catch (err) {
        res.status(500).json({ title: "Error updating product", message: err.message });
    }
};

// Delete product
export const deleteById = async (req, res) => {
    try {
        const id = req.params.id;
        const deletedProduct = await productModel.findByIdAndDelete(id);
        
        if (!deletedProduct) {
            return res.status(404).json({ 
                title: "Product not found", 
                message: "Product not found" 
            });
        }
        
        res.json({ message: "Product successfully deleted", product: deletedProduct });
    } catch (err) {
        res.status(500).json({ title: "Error deleting product", message: err.message });
    }
};

