/**
 * Cart slice: line items keyed by product id + optional selected color.
 */
import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
    name: "cart",
    initialState: {
        items: [] 
    },
    reducers: {
        addToCart: (state, action) => {
            const { product, quantity = 1, selectedColor } = action.payload;
            const productToAdd = product || action.payload;
            const qty = quantity || 1;
            const colorKey = selectedColor?.name ?? (selectedColor?.hex ?? null);
            const existingItem = state.items.find(
                item => item._id === productToAdd._id && (item.selectedColor?.name ?? item.selectedColor?.hex ?? null) === colorKey
            );
            if (existingItem) {
                existingItem.qty += qty;
            } else {
                state.items.push({ ...productToAdd, qty, selectedColor: selectedColor ?? null });
            }
        },
        updateqty: (state, action) => { 
            const item = state.items.find(i => i._id === action.payload.id);
            if (item) {
                item.qty += action.payload.amount;
                if (item.qty <= 0) {
                    state.items = state.items.filter(i => i._id !== action.payload.id);
                }
            }
        },
        removeItem: (state, action) => {
            state.items = state.items.filter(item => item._id !== action.payload);
        },
        clearCart: (state) => {
            state.items = [];
        },
        setCart: (state, action) => {
            state.items = action.payload || [];
        }
    }
});

export const { addToCart, updateqty, removeItem, clearCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;
