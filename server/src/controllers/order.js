import order from '../models/order.js';
import  orderSchema from '../models/order.js';

//Get all orders from the database
export const getAllOrders = async (req, res) => { 
    try {
        // 1. Get all orders from the collection
        const orders = await orderSchema.find();
        // 2. Send the orders back to the client
        res.json(orders);
    } catch (err) {
        // 3. Handle errors if something goes wrong
        res.status(500).json({ title: "Error retrieving orders", message: err.message });
    }
};

//Update order status to 'shipped'
export const updateOrder=async (req, res) => {
    try{
   const orderId=req.params.id;
   // 1. Find the order and set 'isShipped' to true
   const updatedOrder= await orderSchema.findByIdAndUpdate(orderId,{isShipped:true},{new: true});
  // 2. If order does not exist, return 404 error
   if(!updatedOrder){
    return res.status(404).json({ title: "Order not found", message: "Order not found" });
   }
   // 3. Return success message and the updated order
   res.json({message:"Order shipped",order:updatedOrder});
}catch(err){
    // 4. Handle server errors
res.status(500).json({ title: "Error updating order", message: err.message });
}};

//Get all orders
export const getallOrdersFromUser=async (req, res) => {
     try {
        // 1. Find all orders from the database
       const orders=await orderSchema.find();
       // 2. Send the orders back
       res.json(orders);
    } catch (err) {
        // 3. Handle errors if the search fails
        res.status(500).json({ title: "Error retrieving user orders", message: err.message });
    }
};

//Create and save a new order
export const addOrder = async (req, res) => {
  try {
    const { address, orderedProducts, userId } = req.body;
    if (!orderedProducts || orderedProducts.length === 0) {
      return res.status(400).json({
        title: "Missing details",
        message: "Order products are required"
      });
    }
    const newOrder = new orderSchema({
      orderDate: new Date(),
      deadLine: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      address,
      code: Math.random().toString(36).substring(7).toUpperCase(),
      orderedProducts,
      userId   // ✅ לא null
    });
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({
      title: "Error creating order",
      message: err.message
    });
  }
};

//Delete an order if it has not been shipped
export const deleteOrder=async (req, res) => {
   try {
    const orderId=req.params.id;
    // 1. Find the order by its ID
    const order= await orderSchema.findById(orderId);
    // 2. If the order does not exist, return 404 error
    if(!order){
        return res.status(404).json({message:"Order not found"});
       }
       // 3. Security check: Cannot delete orders that are already shipped
    if(order.isShipped){
        return res.status(400).json({message:"Can not delete a shipped order."});
    }
    // 4. Delete the order from the database
       await orderSchema.findByIdAndDelete(orderId);
       res.json({message:"Order successfully deleted."})
    } catch (err) {
        // 5. Handle server errors
        res.status(500).json({ title: "Error deleting order", message: err.message });
    }
};
