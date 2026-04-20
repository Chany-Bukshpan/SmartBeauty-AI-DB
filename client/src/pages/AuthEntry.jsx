import { Link } from 'react-router-dom';
import './AuthEntry.css';

export default function AuthEntry() {
  return (
    <div className="auth-entry-page">
      <div className="auth-entry-card">
        <div className="auth-entry-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.2c-3.6 0-6.8 2-8.3 5.1a.9.9 0 0 0 .82 1.3h15a.9.9 0 0 0 .82-1.3c-1.51-3.1-4.7-5.1-8.34-5.1z" />
          </svg>
        </div>
        <h1 className="section-title">כניסה לחשבון</h1>
        <p className="section-tagline">בחרי איך תרצי להמשיך</p>

        <div className="auth-entry-actions">
          <Link to="/login" className="auth-entry-btn auth-entry-btn--login">התחברות</Link>
          <Link to="/register" className="auth-entry-btn auth-entry-btn--register">הרשמה</Link>
        </div>
      </div>
    </div>
  );
}
