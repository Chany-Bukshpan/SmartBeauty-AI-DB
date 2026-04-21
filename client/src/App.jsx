/**
 * Root shell: global toast, route list, navbar/footer, floating AI makeup + chat,
 * and effects for cart toasts, session persistence, Google redirect login, and JWT hydration.
 */
import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Toast } from 'primereact/toast'
import { userIn } from './store/slices/userSlice'
import { setCart } from './store/slices/cartSlice'
import { setOrders } from './store/slices/ordersSlice'
import { saveUserState, loadUserState } from './store/userStateStorage'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import FloatingChatWidget from './components/FloatingChatWidget'
import MakeupStudio from './components/MakeupStudio'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import Products from './pages/Products'
import { AddProduct } from './pages/AddProduct'
import { Cart } from './pages/Cart'
import { ProductDetails } from './components/ProductDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthEntry from './pages/AuthEntry'
import Orders from './pages/Orders'
import Checkout from './pages/Checkout'
import SupportChat from './pages/SupportChat'
import SupportAgent from './pages/SupportAgent'
import Users from './pages/Users'
import AdminPanel from './pages/AdminPanel'
import NotFound from './pages/NotFound'
import { consumeGoogleRedirectResult } from './firebase/firebaseAuthService'
import { syncFirebaseUserToApp } from './auth/syncFirebaseUserToApp'
import { toastDetailForFirebaseGoogleError } from './auth/firebaseGoogleHelp'
import { getJwtPayload } from './utils/jwtPayload'
import './App.css'

const PageWrap = ({ children }) => <div className="page-wrap">{children}</div>

function ScrollToTopOnRouteChange() {
  const location = useLocation()
  useEffect(() => {
    // כשמנווטים עם hash (למשל #contact-us), ניתן לעמוד היעד לבצע גלילה מדויקת בעצמו.
    if (location.hash) return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])
  return null
}

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

function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const toastRef = useRef(null)
  const user = useSelector(state => state.user.currentUser)
  const cartItems = useSelector(state => state.cart.items)
  const orderItems = useSelector(state => state.orders.items)

  // PrimeReact toast when cart dispatches window "cart:added"
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

  // Generic toasts from window "app:toast" (login, errors, etc.)
  useEffect(() => {
    const onToast = (e) => {
      if (!toastRef.current) return
      const detail = e.detail || {}
      toastRef.current.show({
        severity: detail.severity || 'info',
        summary: detail.summary || 'הודעה',
        detail: detail.detail || '',
        life: detail.life || 2800,
      })
    }
    window.addEventListener('app:toast', onToast)
    return () => window.removeEventListener('app:toast', onToast)
  }, [])

  // Persist cart + orders per user in localStorage (see userStateStorage.js)
  useEffect(() => {
    if (user?._id == null) return
    try {
      saveUserState(user._id, { cart: cartItems, orders: orderItems })
    } catch {}
  }, [user?._id, cartItems, orderItems])

  // Complete Firebase Google sign-in after redirect return
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const firebaseUser = await consumeGoogleRedirectResult()
        if (!firebaseUser || cancelled) return
        await syncFirebaseUserToApp(firebaseUser, dispatch)
        window.dispatchEvent(
          new CustomEvent('app:toast', {
            detail: {
              severity: 'success',
              summary: 'Google התחברות',
              detail: 'התחברת בהצלחה עם Google',
              life: 2600,
            },
          })
        )
        navigate('/', { replace: true })
      } catch (error) {
        if (cancelled) return
        const code = error?.code || error?.response?.data?.code || ''
        if (code === 'auth/unauthorized-domain' || code === 'auth/operation-not-allowed') {
          const detail =
            toastDetailForFirebaseGoogleError(code) ||
            'בדקי Firebase Authentication (דומיין מאושר + Google מופעל).'
          window.dispatchEvent(
            new CustomEvent('app:toast', {
              detail: {
                severity: 'warn',
                summary:
                  code === 'auth/unauthorized-domain'
                    ? 'דומיין לא מאושר ב-Firebase'
                    : 'Google לא מופעל ב-Firebase',
                detail,
                life: 8000,
              },
            })
          )
          return
        }
        const msg = error.response?.data?.message || error.message || 'שגיאה'
        const extra = code && !String(msg).includes(code) ? ` (${code})` : ''
        window.dispatchEvent(
          new CustomEvent('app:toast', {
            detail: {
              severity: 'error',
              summary: 'Google התחברות נכשלה',
              detail: 'תקלה בהתחברות עם Google: ' + msg + extra,
              life: 4200,
            },
          })
        )
        console.error(error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dispatch, navigate])

  // On load: restore JWT user, sync role from token payload, reload saved cart/orders
  useEffect(() => {
    let token, userStr, user
    try {
      token = localStorage.getItem('token')
      userStr = localStorage.getItem('user')
    } catch {
      return
    }
    if (!token || !userStr) return
    try {
      user = JSON.parse(userStr)
    } catch {
      try { localStorage.removeItem('token'); localStorage.removeItem('user') } catch {}
      return
    }
    const payload = getJwtPayload(token)
    if (payload?.role && user?.role !== payload.role) {
      user = { ...user, role: payload.role }
      try {
        localStorage.setItem('user', JSON.stringify(user))
      } catch {}
    }
    dispatch(userIn({ user, token }))
    try {
      const saved = loadUserState(user._id)
      if (saved?.cart?.length) dispatch(setCart(saved.cart))
      if (saved?.orders?.length) dispatch(setOrders(saved.orders))
    } catch {}
  }, [dispatch])

  return (
    <>
      <ScrollToTopOnRouteChange />
      <Toast ref={toastRef} position="top-center" dir="rtl" />
      <Navbar />
      <main
        className={
          location.pathname === '/'
            ? 'main-content main-content--home'
            : 'main-content'
        }
      >
        <Routes>
          <Route path="/" element={<PageWrap><Home /></PageWrap>} />
          <Route path="/products" element={<PageWrap><Products /></PageWrap>} />
          <Route path="/product/:id" element={<PageWrap><ProductDetails /></PageWrap>} />
          <Route path="/cart" element={<PageWrap><Cart /></PageWrap>} />
          <Route path="/support-chat" element={<PageWrap><SupportChat /></PageWrap>} />
          <Route
            path="/support-agent"
            element={
              <AdminRoute>
                <PageWrap><SupportAgent /></PageWrap>
              </AdminRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <PageWrap><Checkout /></PageWrap>
              </ProtectedRoute>
            }
          />
          <Route path="/add-product" element={<AdminRoute><PageWrap><AddProduct /></PageWrap></AdminRoute>} />
          <Route path="/login" element={<PageWrap><Login /></PageWrap>} />
          <Route path="/register" element={<PageWrap><Register /></PageWrap>} />
          <Route path="/auth" element={<PageWrap><AuthEntry /></PageWrap>} />
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
      <MakeupStudio />
      <FloatingChatWidget />
    </>
  )
}

export default App
