import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// הגנה על דפים שמיועדים רק למנהל
// אם לא מחובר → התחברות. אם מחובר אבל לא אדמין → דף הבית (בלי גישה)
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
