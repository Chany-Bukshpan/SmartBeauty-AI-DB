import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Routes, Route } from 'react-router-dom'
import { Toast } from 'primereact/toast'
import { userIn } from './store/slices/userSlice'
import { setCart } from './store/slices/cartSlice'
import { setOrders } from './store/slices/ordersSlice'
import { saveUserState, loadUserState } from './store/userStateStorage'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import Products from './pages/Products'
import { ProductList } from './pages/ProductList'
import { AddProduct } from './pages/AddProduct'
import { Cart } from './pages/Cart'
import { ProductDetails } from './components/ProductDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import Orders from './pages/Orders'
import Users from './pages/Users'
import AdminPanel from './pages/AdminPanel'
import NotFound from './pages/NotFound'
import './App.css'

const PageWrap = ({ children }) => <div className="page-wrap">{children}</div>

function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!visible) return null
  return (
    <button
      type="button"
      className="back-to-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="חזרה למעלה"
    >
      ↑
    </button>
  )
}

// קומפוננטה ראשית - מגדירה את כל הנתיבים והקומפוננטות
function App() {
  const dispatch = useDispatch()
  const toastRef = useRef(null)
  const user = useSelector(state => state.user.currentUser)
  const cartItems = useSelector(state => state.cart.items)
  const orderItems = useSelector(state => state.orders.items)

  // הודעת "נוסף לעגלה" כשמוסיפים מוצר
  useEffect(() => {
    const onCartAdded = (e) => {
      if (toastRef.current) {
        const name = e.detail?.name
        toastRef.current.show({
          severity: 'success',
          summary: 'נוסף לעגלה',
          detail: name ? `"${name}" נוסף לעגלה` : 'המוצר נוסף לעגלה',
          life: 2800,
        })
      }
    }
    window.addEventListener('cart:added', onCartAdded)
    return () => window.removeEventListener('cart:added', onCartAdded)
  }, [])

  // שמירת מצב המשתמש (עגלה + הזמנות) – מפתח אחד לכל משתמש, מתעדכן כל שינוי
  useEffect(() => {
    if (user?._id != null) {
      saveUserState(user._id, { cart: cartItems, orders: orderItems })
    }
  }, [user?._id, cartItems, orderItems])

  // שחזור התחברות אחרי רענון דף + שחזור המצב השמור (עגלה, הזמנות)
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        dispatch(userIn({ user, token }))
        const saved = loadUserState(user._id)
        if (saved) {
          if (saved.cart?.length) dispatch(setCart(saved.cart))
          if (saved.orders?.length) dispatch(setOrders(saved.orders))
        }
      } catch (e) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }, [dispatch])

  return (
    <>
      <Toast ref={toastRef} position="top-center" dir="rtl" />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PageWrap><Home /></PageWrap>} />
          <Route path="/products" element={<PageWrap><Products /></PageWrap>} />
          <Route path="/product-list" element={<PageWrap><ProductList /></PageWrap>} />
          <Route path="/product/:id" element={<PageWrap><ProductDetails /></PageWrap>} />
          <Route path="/cart" element={<PageWrap><Cart /></PageWrap>} />
          <Route path="/add-product" element={<AdminRoute><PageWrap><AddProduct /></PageWrap></AdminRoute>} />
          <Route path="/login" element={<PageWrap><Login /></PageWrap>} />
          <Route path="/register" element={<PageWrap><Register /></PageWrap>} />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <PageWrap><Orders /></PageWrap>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/users" 
            element={
              <AdminRoute>
                <PageWrap><Users /></PageWrap>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <PageWrap><AdminPanel /></PageWrap>
              </AdminRoute>
            } 
          />
          <Route path="*" element={<PageWrap><NotFound /></PageWrap>} />
        </Routes>
      </main>
      <Footer />
      <BackToTop />
    </>
  )
}

export default App
