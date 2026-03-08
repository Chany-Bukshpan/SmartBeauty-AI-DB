import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserOrders } from '../store/slices/ordersSlice';
import './Orders.css';

// דף הזמנות - מציג את כל ההזמנות של המשתמש המחובר
function Orders() {
  const dispatch = useDispatch();
  // שליפת הזמנות מהסטייט הכללי
  const { items, loading, error } = useSelector((state) => state.orders);
  const { token } = useSelector((state) => state.user);

  // טעינת הזמנות מהשרת כשהדף נטען
  useEffect(() => {
    if (token) {
      dispatch(fetchUserOrders(token));
    }
  }, [dispatch, token]);

  // בדיקה אם המשתמש מחובר
  if (!token) {
    return <div className="error">Please login to view your orders</div>;
  }

  // הצגת הודעת טעינה או שגיאה
  if (loading) return <div className="loading">Loading orders...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="orders">
      <h1>My Orders</h1>
      {/* אם אין הזמנות - מציג הודעה, אחרת מציג את כל ההזמנות */}
      {items.length === 0 ? (
        <p className="orders-empty">עדיין לא בוצעו הזמנות — התחילו לקנות וחזרו לכאן</p>
      ) : (
        <div className="orders-list">
          {items.map((order) => (
            <div key={order._id} className="order-card">
              <h3>Order #{order.code}</h3>
              <p>Date: {new Date(order.orderDate).toLocaleDateString()}</p>
              <p>Address: {order.address}</p>
              <p>Status: {order.isShipped ? 'Shipped' : 'Pending'}</p>
              {/* הצגת המוצרים בהזמנה */}
              <div className="order-products">
                <h4>Products:</h4>
                {order.orderedProducts?.map((product, index) => (
                  <div key={index} className="order-product">
                    <span>{product.name}</span>
                    <span>Qty: {product.quantity}</span>
                    <span>${product.price}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
