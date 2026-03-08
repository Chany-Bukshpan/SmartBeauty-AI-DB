import { createSlice } from "@reduxjs/toolkit"

// מצב התחלתי - משתמש לא מחובר
const initialState = {
    currentUser: null,
    token: null  // לא טוען אוטומטית מ-localStorage
}

// יצירת slice לניהול מצב המשתמש
const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        // פונקציה להתחברות - שומרת את פרטי המשתמש וה-token (גם ב-localStorage כדי לשחזר אחרי רענון)
        userIn: (state, action) => {
            state.currentUser = action.payload.user;
            state.token = action.payload.token;
            if (action.payload.token) {
                localStorage.setItem('token', action.payload.token);
            }
            if (action.payload.user) {
                localStorage.setItem('user', JSON.stringify(action.payload.user));
            }
        },
        // פונקציה ליציאה - מוחקת את פרטי המשתמש וה-token
        logOut: (state) => {
            state.currentUser = null;
            state.token = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
        // פונקציה לעדכון role (לבדיקות בלבד)
        setUserRole: (state, action) => {
            if (state.currentUser) {
                state.currentUser.role = action.payload;
            }
        }
    }
})

export const { logOut, userIn, setUserRole } = userSlice.actions
export default userSlice.reducer;
