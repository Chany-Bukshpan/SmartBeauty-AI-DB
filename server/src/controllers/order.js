import jwt from 'jsonwebtoken';
import orderSchema from '../models/order.js';
import { userModel } from '../models/user.js';
import nodemailer from 'nodemailer';

const getUserIdFromToken = (req) => {
  const auth = req.headers?.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded?.id || null;
  } catch {
    return null;
  }
};

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
       const userId = getUserIdFromToken(req);
       if (!userId) {
         return res.status(401).json({ title: "Unauthorized", message: "Missing/invalid token" });
       }
       // 1. Find current user's orders
       const orders=await orderSchema.find({ userId }).sort({ orderDate: -1 });
       // 2. Send orders back
       res.json(orders);
    } catch (err) {
        // 3. Handle errors if the search fails
        res.status(500).json({ title: "Error retrieving user orders", message: err.message });
    }
};

//Create and save a new order
export const addOrder = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({
        title: "Unauthorized",
        message: "Missing/invalid token"
      });
    }

    const { address, orderedProducts, payment, totalAmount } = req.body || {};
    if (!address || !String(address).trim()) {
      return res.status(400).json({
        title: "Missing details",
        message: "Shipping address is required"
      });
    }
    if (!orderedProducts || orderedProducts.length === 0) {
      return res.status(400).json({
        title: "Missing details",
        message: "Order products are required"
      });
    }
    const normalizedProducts = orderedProducts.map((p) => ({
      productId: p.productId,
      name: p.name,
      price: Number(p.price) || 0,
      quantity: Math.max(1, Number(p.quantity) || 1),
    }));
    const calculatedTotal = normalizedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const requestedTotal = Number(totalAmount) || calculatedTotal;
    const finalTotal = Math.max(requestedTotal, calculatedTotal);

    const paymentMethod = String(payment?.method || 'card_test');
    const digitsOnlyCard = String(payment?.cardNumber || '').replace(/\D/g, '');
    let paymentLast4 = '';
    let paymentStatus = 'paid_test';
    if (paymentMethod === 'card_test') {
      paymentLast4 = digitsOnlyCard.slice(-4);
      const hasValidTestCard = digitsOnlyCard.length >= 12 && paymentLast4.length === 4;
      if (!hasValidTestCard) {
        return res.status(400).json({
          title: "Invalid test card",
          message: "For card payment, a valid test card number is required"
        });
      }
    }

    const newOrder = new orderSchema({
      orderDate: new Date(),
      deadLine: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      address,
      code: `SC${Date.now().toString(36).toUpperCase().slice(-6)}`,
      orderedProducts: normalizedProducts,
      totalAmount: finalTotal,
      paymentMethod,
      paymentStatus,
      paymentLast4,
      userId
    });
    const savedOrder = await newOrder.save();

    // Best-effort email confirmation (לא מפיל הזמנה אם נכשל)
    try {
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const resetFromEmail = process.env.RESET_FROM_EMAIL || smtpUser;

      const looksLikePlaceholder = (v) => {
        if (v == null) return true;
        const s = String(v);
        return !s || s.includes("your-") || s.includes("<") || s.includes("example.com");
      };

      if (!looksLikePlaceholder(smtpHost) && !looksLikePlaceholder(smtpUser) && !looksLikePlaceholder(smtpPass)) {
        const user = await userModel.findById(savedOrder.userId).select("email");
        const customerEmail = user?.email ? String(user.email).trim() : '';
        const storeInbox = process.env.RESET_FROM_EMAIL || smtpUser;

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(smtpPort || 587),
          secure: false,
          auth: { user: smtpUser, pass: smtpPass },
        });

        const orderedLines = savedOrder.orderedProducts
          .map((p) => `- ${p.name} | ₪${p.price} | כמות: ${p.quantity}`)
          .join('\n');

        const customerBody =
          `היי,\n\n` +
          `הזמנתך התקבלה בהצלחה.\n\n` +
          `קוד הזמנה: ${savedOrder.code}\n` +
          `סכום: ₪${savedOrder.totalAmount}\n` +
          `כתובת: ${savedOrder.address}\n\n` +
          `פריטים:\n${orderedLines}\n\n` +
          `תודה,\nMakeUp Store`;

        const storeBody =
          `התקבלה הזמנה חדשה (אותה תיבה כמו פניית יצירת קשר).\n\n` +
          `קוד: ${savedOrder.code}\n` +
          `לקוח: ${customerEmail || '(לא נמצא מייל במשתמש)'}\n` +
          `סכום: ₪${savedOrder.totalAmount}\n` +
          `כתובת משלוח: ${savedOrder.address}\n\n` +
          `פריטים:\n${orderedLines}\n`;

        const sameMailbox =
          customerEmail &&
          storeInbox &&
          customerEmail.toLowerCase() === String(storeInbox).toLowerCase();

        if (customerEmail) {
          const mail = {
            from: resetFromEmail,
            to: customerEmail,
            subject: `אישור הזמנה - ${savedOrder.code}`,
            text: customerBody,
          };
          if (storeInbox && !sameMailbox) {
            mail.bcc = storeInbox;
          }
          await transporter.sendMail(mail);
        } else if (storeInbox) {
          await transporter.sendMail({
            from: resetFromEmail,
            to: storeInbox,
            subject: `הזמנה חדשה - ${savedOrder.code}`,
            text: storeBody,
          });
        }
      }
    } catch (mailErr) {
      // אל תגרום לנפילת checkout
      console.warn("Order email sending failed:", mailErr?.message || mailErr);
    }

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
