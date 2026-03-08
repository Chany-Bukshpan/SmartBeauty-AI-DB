import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { GetAllUsers } from '../api/userService';
import './Users.css';

// דף משתמשים - מציג את כל המשתמשים (למנהל בלבד)
function Users() {
  const { token, currentUser } = useSelector((state) => state.user);
  const [users, setUsers] = useState([]);

  // טעינת משתמשים מהשרת כשהדף נטען
  useEffect(() => {
    async function loadUsers() {
      // טעינה רק אם המשתמש מחובר והוא מנהל
      if (token && currentUser?.role === 'admin') {
        try {
          let res = await GetAllUsers();
          setUsers(res.data);
        } catch (error) {
          console.error('Error loading users:', error);
        }
      }
    }
    loadUsers();
  }, [token, currentUser]);

  // בדיקה אם המשתמש הוא מנהל - אם לא, מציג הודעת שגיאה
  if (currentUser?.role !== 'admin') {
    return <div className="error">Access denied. Admin only.</div>;
  }

  return (
    <div className="users">
      <div className="users-head">
        <h1 className="section-title">משתמשים</h1>
        <p className="section-tagline">ניהול רשימת המשתמשים במערכת</p>
      </div>
      <div className="users-list">
        {users.map((user) => (
          <div key={user._id} className="user-card">
            <h3>{user.userName}</h3>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Users;
