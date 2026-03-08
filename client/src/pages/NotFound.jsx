import { Link } from "react-router-dom"
import './NotFound.css'

// דף 404 - מוצג כשמנסים לגשת לנתיב שלא קיים
export default function NotFound() {
    return (
        <div className="not-found">
            <p className="not-found-label">שגיאה</p>
            <h1 className="not-found-title">404</h1>
            <p className="not-found-msg">הדף שביקשת לא נמצא — אולי עבר לכתובת אחרת</p>
            <div className="not-found-line" aria-hidden="true" />
            <Link to="/" className="not-found-link">חזור לדף הבית</Link>
        </div>
    )
}
