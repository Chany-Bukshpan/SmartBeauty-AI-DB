/**
 * Authenticated user's order history list (fetches from /api/order).
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { fetchUserOrders } from '../store/slices/ordersSlice';
import './Orders.css';

function Orders() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.orders);
  const { token } = useSelector((state) => state.user);

  useEffect(() => {
    if (token) {
      dispatch(fetchUserOrders(token));
    }
  }, [dispatch, token]);

  if (!token) {
    return <div className="error">Please login to view your orders</div>;
  }

  if (loading) return <div className="loading">Loading orders...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="orders">
      <div className="orders-head">
        <h1 className="section-title">ההזמנות שלי</h1>
        <p className="section-tagline">כאן אפשר לעקוב אחרי כל הזמנה שביצעת</p>
      </div>
      {items.length === 0 ? (
        <div className="orders-empty">
          <p>עדיין לא בוצעו הזמנות — התחילו לקנות וחזרו לכאן.</p>
          <Link to="/products">
            <Button label="למוצרים" icon="pi pi-shopping-bag" className="p-button-outlined" />
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {items.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header-row">
                <h3>הזמנה #{order.code}</h3>
                <span className={`order-status ${order.isShipped ? 'shipped' : 'pending'}`}>
                  {order.isShipped ? 'נשלחה' : 'בטיפול'}
                </span>
              </div>
              <p><strong>תאריך:</strong> {new Date(order.orderDate).toLocaleDateString('he-IL')}</p>
              <p><strong>כתובת:</strong> {order.address}</p>
              <p><strong>אספקה משוערת:</strong> {new Date(order.deadLine).toLocaleDateString('he-IL')}</p>
              <p>
                <strong>תשלום:</strong>{' '}
                <span className={`order-payment ${order.paymentStatus === 'paid_test' ? 'paid' : 'pending'}`}>
                  {order.paymentStatus === 'paid_test' ? 'אושר (טסט)' : 'ממתין'}
                </span>
                {order.paymentLast4 ? ` • כרטיס **** ${order.paymentLast4}` : ''}
              </p>
              {/* הצגת המוצרים בהזמנה */}
              <div className="order-products">
                <h4>מוצרים:</h4>
                {(order.orderedProducts || order.orderdProducts || []).map((product, index) => (
                  <div key={index} className="order-product">
                    <span>{product.name}</span>
                    <span>כמות: {product.quantity}</span>
                    <span>₪{product.price}</span>
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
