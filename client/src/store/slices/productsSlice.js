import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'https://final-project-n18z.onrender.com/api/product';

// פונקציה אסינכרונית לשליפת כל המוצרים מהשרת (ללא pagination - לניהול מנהל)
export const fetchAllProducts = createAsyncThunk('products/fetchAll', async () => {
    const response = await axios.get(`${API_URL}?all=true`);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.products ?? data);
});

// פונקציה אסינכרונית לשליפת כל המוצרים מהשרת עם pagination
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ page = 1, limit = 12 } = {}) => {
    const response = await axios.get(`${API_URL}?page=${page}&limit=${limit}`);
    return response.data;
  }
);

// פונקציה אסינכרונית לשליפת מוצר לפי ID
export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  }
);

// יצירת slice לניהול מצב המוצרים
const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],           // רשימת המוצרים
    pagination: {},      // מידע על pagination
    currentProduct: null, // מוצר נוכחי (לצפייה בפרטים)
    loading: false,      // מצב טעינה
    error: null,         // שגיאות
  },
  reducers: {
    // פונקציה לניקוי המוצר הנוכחי
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },
  // טיפול בתוצאות של הפעולות האסינכרוניות
  extraReducers: (builder) => {
    builder
      // טיפול בשליפת כל המוצרים (ללא pagination)
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        const payload = action.payload;
        state.items = Array.isArray(payload) ? payload : (payload?.products || []);
        state.status = 'succeeded';
      })
      // טיפול בשליפת כל המוצרים
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products || [];
        state.pagination = action.payload.pagination || {};
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // טיפול בשליפת מוצר לפי ID
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { clearCurrentProduct } = productsSlice.actions;
export default productsSlice.reducer;
