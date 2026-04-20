/**
 * Orders slice: authenticated user orders from /api/order.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_URL = API_BASE ? `${API_BASE}/api/order` : https://final-project-n18z.onrender.com/order';

export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async (token) => {
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async ({ orderData, token }) => {
    const response = await axios.post(API_URL, orderData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearOrders: (state) => {
      state.items = [];
      state.loading = false;
      state.error = null;
    },
    setOrders: (state, action) => {
      state.items = action.payload || [];
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(createOrder.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export const { clearOrders, setOrders } = ordersSlice.actions;
export default ordersSlice.reducer;
