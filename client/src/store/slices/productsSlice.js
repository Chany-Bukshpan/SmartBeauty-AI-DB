/**
 * Products slice: loads catalog (including multi-page fetch for client-side filters),
 * and holds currentProduct for the detail route.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_URL = API_BASE
  ? `${API_BASE}/api/product`
  : 'https://final-project-n18z.onrender.com/api/product';

export const fetchAllProducts = createAsyncThunk('products/fetchAll', async () => {
    const response = await axios.get(`${API_URL}?all=true`);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.products ?? data);
});

export const fetchAllProductsByPages = createAsyncThunk(
  'products/fetchAllByPages',
  async (_, { rejectWithValue }) => {
    try {
      const limit = 12;
      const first = await axios.get(`${API_URL}?page=1&limit=${limit}`);
      const data = first.data;
      if (data?.title && data?.message) {
        return rejectWithValue(data.message || 'שגיאה מהשרת');
      }
      const products = Array.isArray(data) ? data : (data?.products || []);
      const totalPages = data?.pagination?.totalPages ?? 1;
      if (totalPages <= 1) return products;
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          axios.get(`${API_URL}?page=${i + 2}&limit=${limit}`)
        )
      );
      const restProducts = rest.flatMap((r) => {
        const d = r.data;
        if (d?.title && d?.message) return [];
        return Array.isArray(d) ? d : (d?.products || []);
      });
      return [...products, ...restProducts];
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || err.message || 'שגיאה בטעינת מוצרים';
      return rejectWithValue(msg);
    }
  }
);

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ page = 1, limit = 12 } = {}) => {
    const response = await axios.get(`${API_URL}?page=${page}&limit=${limit}`);
    return response.data;
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    pagination: {},
    currentProduct: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        state.items = Array.isArray(payload) ? payload : (payload?.products || []);
        state.status = 'succeeded';
      })
      .addCase(fetchAllProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'שגיאה בטעינה';
      })
      .addCase(fetchAllProductsByPages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllProductsByPages.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.pagination = {};
      })
      .addCase(fetchAllProductsByPages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'שגיאה בטעינה';
      })
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
