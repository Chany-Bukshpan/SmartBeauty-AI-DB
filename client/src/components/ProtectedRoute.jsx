import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

// קומפוננטה להגנה על דפים - בודקת אם המשתמש מחובר
// אם לא מחובר, מעבירה לדף התחברות
export default function ProtectedRoute({ children }) {
    let token = useSelector(state => state.user.token)
    let user = useSelector(state => state.user.currentUser)
    
    // אם אין token או משתמש - מעביר לדף התחברות
    if (!token || !user) {
        return <Navigate to="/login" replace />
    }
    
    // אם המשתמש מחובר - מציג את התוכן המוגן
    return children
}
