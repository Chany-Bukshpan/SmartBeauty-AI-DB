import { createSlice } from "@reduxjs/toolkit";

// Redux slice לניהול עגלת הקניות
const cartSlice = createSlice({
    name: "cart",
    initialState: {
        items: [] 
    },
    reducers: {
        // הוספת מוצר לעגלה - עם כמות (אם לא מצוינת, מוסיף 1)
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
        // עדכון כמות מוצר בעגלה
        updateqty: (state, action) => { 
            const item = state.items.find(i => i._id === action.payload.id);
            if (item) {
                item.qty += action.payload.amount;
                if (item.qty <= 0) {
                    state.items = state.items.filter(i => i._id !== action.payload.id);
                }
            }
        },
        // הסרת מוצר מהעגלה
        removeItem: (state, action) => {
            state.items = state.items.filter(item => item._id !== action.payload);
        },
        // ריקון העגלה (בהתחלף משתמש)
        clearCart: (state) => {
            state.items = [];
        },
        // שחזור עגלה שמורה (בהתחברות עם אותו משתמש)
        setCart: (state, action) => {
            state.items = action.payload || [];
        }
    }
});

export const { addToCart, updateqty, removeItem, clearCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;

