import { FirebaseLogin } from "../api/userService"
import { userIn } from "../store/slices/userSlice"
import { clearCart, setCart } from "../store/slices/cartSlice"
import { clearOrders, setOrders } from "../store/slices/ordersSlice"
import { loadUserState } from "../store/userStateStorage"

/**
 * After Firebase sign-in (Google): exchanges for app JWT via API, hydrates Redux, localStorage, cart/orders.
 */
export async function syncFirebaseUserToApp(firebaseUser, dispatch) {
  const email = firebaseUser?.email
  if (!email) {
    throw new Error("לא התקבל מייל מחשבון Google")
  }
  const res = await FirebaseLogin({
    email,
    userName: firebaseUser.displayName || email.split("@")[0],
    firebaseUid: firebaseUser.uid,
  })
  dispatch(userIn(res.data))
  try {
    if (res.data?.token) localStorage.setItem("token", res.data.token)
    if (res.data?.user) localStorage.setItem("user", JSON.stringify(res.data.user))
  } catch {}
  const userId = res.data.user?._id
  const saved = userId ? loadUserState(userId) : null
  if (saved) {
    dispatch(setCart(saved.cart || []))
    dispatch(setOrders(saved.orders || []))
  } else {
    dispatch(clearOrders())
    dispatch(clearCart())
  }
  return res
}
