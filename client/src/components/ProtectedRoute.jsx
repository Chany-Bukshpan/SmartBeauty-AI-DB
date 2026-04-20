/**
 * Redirects to /login if there is no valid session (token + user in Redux).
 */
import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
    let token = useSelector(state => state.user.token)
    let user = useSelector(state => state.user.currentUser)
    
    if (!token || !user) {
        return <Navigate to="/login" replace />
    }
    
    return children
}
