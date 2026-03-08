import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './slices/productsSlice';
import userReducer from './slices/userSlice';
import ordersReducer from './slices/ordersSlice';
import cartReducer from './slices/cartSlice';

// יצירת הסטור הראשי - מחבר את כל ה-slices יחד
export const store = configureStore({
  reducer: {
    products: productsReducer,  // ניהול מצב המוצרים
    user: userReducer,          // ניהול מצב המשתמש
    orders: ordersReducer,      // ניהול מצב ההזמנות
    cart: cartReducer,         // ניהול מצב עגלת הקניות
  },
  // אפשר לראות את ה-store ב-Redux DevTools
  devTools: true,  // תמיד מופעל (גם ב-development)
});
