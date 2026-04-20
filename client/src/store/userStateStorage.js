/**
 * Per-user localStorage snapshot of cart and orders (keyed by user id).
 * Used so switching accounts does not mix carts; restored on login.
 */
const KEY_PREFIX = 'userState_'

export function getUserStateKey(userId) {
  if (!userId) return null
  return KEY_PREFIX + userId
}

export function saveUserState(userId, state) {
  const key = getUserStateKey(userId)
  if (!key) return
  try {
    const data = {
      cart: state.cart || [],
      orders: state.orders || [],
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {}
}

export function loadUserState(userId) {
  const key = getUserStateKey(userId)
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    return {
      cart: Array.isArray(data.cart) ? data.cart : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
    }
  } catch (e) {
    return null
  }
}
