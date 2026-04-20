/**
 * Requires login and user.role === "admin"; otherwise redirects to home or login.
 */
import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

export default function AdminRoute({ children }) {
    const token = useSelector(state => state.user.token)
    const user = useSelector(state => state.user.currentUser)

    if (!token || !user) {
        return <Navigate to="/login" replace />
    }

    if (user.role !== "admin") {
        return <Navigate to="/" replace />
    }

    return children
}
