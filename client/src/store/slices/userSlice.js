/**
 * Auth slice: current user and JWT token (localStorage sync lives in components / App).
 */
import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    currentUser: null,
    token: null
}

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        userIn: (state, action) => {
            state.currentUser = action.payload.user;
            state.token = action.payload.token;
        },
        logOut: (state) => {
            state.currentUser = null;
            state.token = null;
        },
        setUserRole: (state, action) => {
            if (state.currentUser) {
                state.currentUser.role = action.payload;
            }
        }
    }
})

export const { logOut, userIn, setUserRole } = userSlice.actions
export default userSlice.reducer;
