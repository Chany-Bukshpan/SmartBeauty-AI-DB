import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'https://final-project-n18z.onrender.com/api/order';

// פונקציה אסינכרונית לשליפת הזמנות המשתמש
export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async (token) => {
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }
);

// פונקציה אסינכרונית ליצירת הזמנה חדשה
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async ({ orderData, token }) => {
    const response = await axios.post(API_URL, orderData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }
);

// יצירת slice לניהול מצב ההזמנות
const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    items: [],      // רשימת ההזמנות
    loading: false, // מצב טעינה
    error: null,    // שגיאות
  },
  reducers: {
    // איפוס הזמנות (בהתחלף משתמש)
    clearOrders: (state) => {
      state.items = [];
      state.loading = false;
      state.error = null;
    },
    // שחזור הזמנות שמורות (מצב המשתמש מהפעם הקודמת)
    setOrders: (state, action) => {
      state.items = action.payload || [];
    },
  },
  // טיפול בתוצאות של הפעולות האסינכרוניות
  extraReducers: (builder) => {
    builder
      // טיפול בשליפת הזמנות
      .addCase(fetchUserOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // טיפול ביצירת הזמנה חדשה
      .addCase(createOrder.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export const { clearOrders, setOrders } = ordersSlice.actions;
export default ordersSlice.reducer;
