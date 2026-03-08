import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { logOut } from "../store/slices/userSlice"
import { clearCart } from "../store/slices/cartSlice"
import { clearOrders } from "../store/slices/ordersSlice"
import { saveUserState } from "../store/userStateStorage"
import { CompactCart } from "./CompactCart"
import './Navbar.css'

export default function Navbar() {
    let disp = useDispatch()
    let user = useSelector(state => state.user.currentUser)
    let token = useSelector(state => state.user.token)
    const cartItems = useSelector(state => state.cart.items)
    const orderItems = useSelector(state => state.orders.items)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
            {/* הצגת ברכה לפי מצב המשתמש */}
            <h1>שלום ל-{!user ? "אורח" : user.userName}</h1>
            {/* עגלת קניות קטנה */}
            <CompactCart />
            {/* כפתור יציאה - מוצג רק אם המשתמש מחובר */}
            {user && (
                <input 
                    type="button" 
                    value="יציאה" 
                    onClick={() => {
                        if (user?._id) saveUserState(user._id, { cart: cartItems, orders: orderItems })
                        disp(clearOrders())
                        disp(clearCart())
                        disp(logOut())
                    }} 
                />
            )}
            <ul className="navbar-menu">
                <li><Link to="/">דף הבית</Link></li>
                <li><Link to="/products">מוצרים</Link></li>
                {/* הצגת קישורים לפי מצב המשתמש */}
                {!user || !token ? (
                    <>
                        <li><Link to="/login">התחברות</Link></li>
                        <li><Link to="/register">הרשמה</Link></li>
                    </>
                ) : (
                    <>
                        <li><Link to="/orders">ההזמנות שלי</Link></li>
                        {/* קישור לניהול מוצרים - מוצג רק למנהל (הוספה / עריכה / מחיקה) */}
                        {user?.role === 'admin' && (
                            <li><Link to="/admin">ניהול מוצרים</Link></li>
                        )}
                    </>
                )}
            </ul>
        </nav>
    )
}
