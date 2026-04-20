/**
 * Top navigation: auth, search suggestions, cart preview, role-based links (admin, support).
 */
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { logOut } from "../store/slices/userSlice"
import { clearCart } from "../store/slices/cartSlice"
import { clearOrders } from "../store/slices/ordersSlice"
import { saveUserState } from "../store/userStateStorage"
import { fetchAllProductsByPages } from "../store/slices/productsSlice";
import { CompactCart } from "./CompactCart"
import Logo from "./Logo"
import './Navbar.css'

export default function Navbar() {
    let disp = useDispatch()
    let user = useSelector(state => state.user.currentUser)
    let token = useSelector(state => state.user.token)
    const products = useSelector(state => state.products.items || [])
    const cartItems = useSelector(state => state.cart.items)
    const orderItems = useSelector(state => state.orders.items)
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [searchOpen, setSearchOpen] = useState(false)

    useEffect(() => {
        if (!products.length) disp(fetchAllProductsByPages())
    }, [disp, products.length])

    const suggestions = useMemo(() => {
        const q = String(search || '').trim().toLowerCase()
        if (!q) return []
        const productMatches = products
            .filter((p) => {
                const name = String(p.makeupName || p.name || '').toLowerCase()
                const brand = String(p.brand || '').toLowerCase()
                return name.includes(q) || brand.includes(q)
            })
            .slice(0, 5)
            .map((p) => ({
                key: `p-${p._id}`,
                label: p.makeupName || p.name,
                sub: p.brand || 'מוצר',
                type: 'product',
                id: p._id
            }))

        const seenBrands = new Set()
        const brandMatches = products
            .map((p) => p.brand)
            .filter(Boolean)
            .filter((b) => {
                const low = String(b).toLowerCase()
                if (!low.includes(q) || seenBrands.has(low)) return false
                seenBrands.add(low)
                return true
            })
            .slice(0, 4)
            .map((b) => ({
                key: `b-${b}`,
                label: b,
                sub: 'מותג',
                type: 'brand'
            }))

        return [...productMatches, ...brandMatches].slice(0, 7)
    }, [search, products])

    const submitSearch = () => {
        const q = String(search || '').trim()
        if (!q) return
        setSearchOpen(false)
        navigate(`/products?q=${encodeURIComponent(q)}`)
    }

    const chooseSuggestion = (item) => {
        setSearchOpen(false)
        setSearch('')
        if (item.type === 'product') {
            navigate(`/product/${item.id}`)
            return
        }
        navigate(`/products?brand=${encodeURIComponent(item.label)}`)
    }

    const logoHeight = 120

    return (
        <>
            <nav
                className="navbar"
            >
            <Link
                to="/"
                className="navbar-logo"
                aria-label="דף הבית"
                onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            >
                <Logo height={logoHeight} />
            </Link>
            <div className="navbar-top">
                <div className="navbar-right">
                    <div className="navbar-start">
                        <h1>שלום ל-{!user ? "אורח" : user.userName}</h1>
                        {user && (
                            <input 
                                type="button" 
                                value="יציאה" 
                                onClick={() => {
                                    if (user?._id) saveUserState(user._id, { cart: cartItems, orders: orderItems })
                                    disp(clearOrders())
                                    disp(clearCart())
                                    disp(logOut())
                                    try { localStorage.removeItem('token'); localStorage.removeItem('user') } catch {}
                                }} 
                            />
                        )}
                    </div>

                    <div className="navbar-search-wrap">
                        <div className="navbar-search">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setSearchOpen(true)
                                }}
                                onFocus={() => setSearchOpen(true)}
                                onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
                                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                                placeholder="חיפוש"
                                aria-label="חיפוש מוצרים ומותגים"
                            />
                            <button type="button" onClick={submitSearch} aria-label="חפש">
                                <i className="pi pi-search" />
                            </button>
                        </div>
                        {searchOpen && suggestions.length > 0 && (
                            <div className="navbar-search-suggestions">
                                {suggestions.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className="navbar-search-suggestion"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => chooseSuggestion(item)}
                                    >
                                        <span>{item.label}</span>
                                        <small>{item.sub}</small>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="navbar-left">
                    <ul className="navbar-menu">
                        {/*
                          RTL: הפריט הראשון ברשימה = הכי ימין.
                          מחובר: אודותינו → ההזמנות שלי → יצירת קשר → (אם מנהל) ניהול מוצרים → מוצרים (אחרון)
                          אורח:  אודותינו → יצירת קשר → מוצרים → התחברות → הרשמה
                        */}

                        <li className="nav-item nav-item--about">
                            <Link
                                to="/support-chat#top"
                                onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' })}
                            >
                                אודותינו
                            </Link>
                        </li>

                        {user && token ? (
                            <li className="nav-item nav-item--orders"><Link to="/orders">ההזמנות שלי</Link></li>
                        ) : null}

                        <li className="nav-item nav-item--contact"><Link to="/support-chat#contact-us">יצירת קשר</Link></li>

                        {user && token && user?.role === 'admin' ? (
                            <li className="nav-item nav-item--admin"><Link to="/admin">ניהול מוצרים</Link></li>
                        ) : null}

                        <li className="nav-item nav-item--products"><Link to="/products">מוצרים</Link></li>

                        {!user || !token ? (
                            <>
                                <li className="nav-item nav-item--login">
                                    <Link to="/login" className="navbar-auth-icon-link">
                                        <span className="navbar-auth-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" role="img">
                                                <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.2c-3.6 0-6.8 2-8.3 5.1a.9.9 0 0 0 .82 1.3h15a.9.9 0 0 0 .82-1.3c-1.51-3.1-4.7-5.1-8.34-5.1z" />
                                            </svg>
                                        </span>
                                        התחברות
                                    </Link>
                                </li>
                                <li className="nav-item nav-item--register">
                                    <Link to="/register" className="navbar-auth-icon-link">
                                        <span className="navbar-auth-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" role="img">
                                                <path d="M15 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-2 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm7 9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6Zm-5.5-5H11c-2.2 0-4 1.8-4 4h11c0-2.2-1.8-4-4-4ZM19 6h-2V4a1 1 0 1 0-2 0v2h-2a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0V8h2a1 1 0 1 0 0-2Z" />
                                            </svg>
                                        </span>
                                        הרשמה
                                    </Link>
                                </li>
                            </>
                        ) : null}
                    </ul>
                </div>
            </div>
            </nav>
            <div className="navbar-floating-cart" aria-label="עגלה">
                <CompactCart />
            </div>
        </>
    )
}
