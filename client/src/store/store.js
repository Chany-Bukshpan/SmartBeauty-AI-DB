/**
 * Redux root store: products catalog, auth user, orders, and cart.
 */
import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './slices/productsSlice';
import userReducer from './slices/userSlice';
import ordersReducer from './slices/ordersSlice';
import cartReducer from './slices/cartSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    user: userReducer,
    orders: ordersReducer,
    cart: cartReducer,
  },
  devTools: true,
});
