/**
 * Checkout: shipping form, test card fields, creates order via API; supports "buy now" from product page state.
 */
import { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { createOrder } from '../store/slices/ordersSlice';
import { addToCart, clearCart, removeItem } from '../store/slices/cartSlice';
import { fetchAllProductsByPages } from '../store/slices/productsSlice';
import './Checkout.css';

const TEST_CARD_PLACEHOLDER = '4242 4242 4242 4242';

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const cartItems = useSelector((state) => state.cart.items || []);
  const products = useSelector((state) => state.products.items || []);
  const token = useSelector((state) => state.user.token);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      fullName: '',
      phone: '',
      city: '',
      street: '',
      houseNumber: '',
      notes: '',
      paymentMethod: 'card_test',
      cardName: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvv: '',
    },
  });

  const buyNowItem = useMemo(() => {
    const buyNow = location.state?.buyNow;
    if (!buyNow?.product) return null;
    return {
      ...buyNow.product,
      qty: Math.max(1, Number(buyNow.quantity) || 1),
      selectedColor: buyNow.selectedColor || null,
    };
  }, [location.state]);

  const [buyNowItems, setBuyNowItems] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    setBuyNowItems(buyNowItem ? [buyNowItem] : []);
  }, [buyNowItem]);

  useEffect(() => {
    if (!products.length) {
      dispatch(fetchAllProductsByPages());
    }
  }, [dispatch, products.length]);

  const checkoutItems = useMemo(() => {
    if (cartItems.length) return cartItems;
    return buyNowItems;
  }, [cartItems, buyNowItems]);

  const handleRemoveCheckoutItem = (item) => {
    if (cartItems.length) {
      dispatch(removeItem(item._id));
      return;
    }
    setBuyNowItems((prev) => prev.filter((p) => String(p._id || p.id) !== String(item._id || item.id)));
  };

  const selectedPaymentMethod = watch('paymentMethod');

  const totalAmount = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0),
    [checkoutItems]
  );

  const shippingFee = checkoutItems.length ? (totalAmount >= 199 ? 0 : 25) : 0;
  const grandTotal = totalAmount + shippingFee;

  const smartRecommendations = useMemo(() => {
    if (!products.length || !checkoutItems.length) return [];
    const inCheckoutIds = new Set(checkoutItems.map((i) => String(i._id || i.id)));
    const catMap = new Map();
    let avgPrice = 0;
    let qtyTotal = 0;
    for (const item of checkoutItems) {
      const qty = Number(item.qty) || 1;
      const category = item.category || 'General';
      catMap.set(category, (catMap.get(category) || 0) + qty);
      avgPrice += (Number(item.price) || 0) * qty;
      qtyTotal += qty;
    }
    avgPrice = avgPrice / (qtyTotal || 1);

    return products
      .filter((p) => !inCheckoutIds.has(String(p._id || p.id)) && p.inStock)
      .map((p) => {
        const catScore = (catMap.get(p.category || 'General') || 0) * 2;
        const priceGap = Math.abs((Number(p.price) || 0) - avgPrice);
        const priceScore = Math.max(0, 3 - priceGap / 40);
        return { product: p, score: catScore + priceScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.product);
  }, [products, checkoutItems]);

  const handleAddRecommended = (product) => {
    if (cartItems.length) {
      dispatch(addToCart({ product, quantity: 1 }));
      return;
    }
    setBuyNowItems((prev) => {
      const idx = prev.findIndex((p) => String(p._id || p.id) === String(product._id || product.id));
      if (idx === -1) return [...prev, { ...product, qty: 1 }];
      return prev.map((p, i) => (i === idx ? { ...p, qty: (Number(p.qty) || 1) + 1 } : p));
    });
  };

  const onSubmit = async (data) => {
    if (!checkoutItems.length) {
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { severity: 'warn', summary: 'אין מוצרים', detail: 'העגלה ריקה.', life: 2500 },
      }));
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    const orderedProducts = checkoutItems.map((item) => ({
      productId: item._id,
      name: `${item.makeupName || item.name}${item.selectedColor?.name ? ` - ${item.selectedColor.name}` : ''}`,
      price: Number(item.price) || 0,
      quantity: Number(item.qty) || 1,
    }));

    const address =
      `${data.city}, ${data.street} ${data.houseNumber}` +
      (data.notes?.trim() ? ` (${data.notes.trim()})` : '');

    const digitsCard = String(data.cardNumber || '').replace(/\D/g, '');
    if (data.paymentMethod === 'card_test' && digitsCard.length < 12) {
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { severity: 'warn', summary: 'כרטיס לא תקין', detail: 'הזיני מספר כרטיס טסט תקין.', life: 3000 },
      }));
      return;
    }

    try {
      await dispatch(createOrder({
        orderData: {
          address,
          orderedProducts,
          totalAmount: grandTotal,
          payment: {
            method: data.paymentMethod,
            cardNumber: data.paymentMethod === 'card_test' ? digitsCard : '',
            cardName: data.cardName,
            expiry: data.cardExpiry,
          },
        },
        token,
      })).unwrap();

      if (cartItems.length) dispatch(clearCart());
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { severity: 'success', summary: 'הזמנה בוצעה', detail: 'ההזמנה נקלטה בהצלחה.', life: 3200 },
      }));
      navigate('/');
    } catch (error) {
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: {
          severity: 'error',
          summary: 'הזמנה נכשלה',
          detail: error?.message || 'לא ניתן להשלים הזמנה כרגע.',
          life: 3600,
        },
      }));
    }
  };

  if (!checkoutItems.length) {
    return (
      <div className="checkout-page">
        <div className="checkout-head">
          <h1 className="section-title">סיום הזמנה</h1>
          <p className="section-tagline">העגלה שלך ריקה כרגע</p>
        </div>
        <div className="checkout-empty">
          <p>כדי לבצע הזמנה הוסיפי מוצרים לעגלה.</p>
          <Link to="/products">
            <Button label="למוצרים" icon="pi pi-shopping-bag" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-head">
        <h1 className="section-title">סיום הזמנה</h1>
        <p className="section-tagline">פרטי משלוח ותשלום מאובטח</p>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit(onSubmit)}>
          <h3>פרטי משלוח</h3>

          <label>שם מלא</label>
          <input
            type="text"
            {...register('fullName', { required: 'חובה להזין שם מלא' })}
            placeholder="שם פרטי ומשפחה"
          />
          {errors.fullName && <small className="checkout-error">{errors.fullName.message}</small>}

          <label>טלפון</label>
          <input
            type="text"
            {...register('phone', { required: 'חובה להזין טלפון', minLength: { value: 9, message: 'טלפון לא תקין' } })}
            placeholder="05X-XXXXXXX"
          />
          {errors.phone && <small className="checkout-error">{errors.phone.message}</small>}

          <div className="checkout-row">
            <div>
              <label>עיר</label>
              <input
                type="text"
                {...register('city', { required: 'חובה להזין עיר' })}
                placeholder="לדוגמה: תל אביב"
              />
              {errors.city && <small className="checkout-error">{errors.city.message}</small>}
            </div>
            <div>
              <label>רחוב</label>
              <input
                type="text"
                {...register('street', { required: 'חובה להזין רחוב' })}
                placeholder="שם רחוב"
              />
              {errors.street && <small className="checkout-error">{errors.street.message}</small>}
            </div>
            <div>
              <label>מספר בית</label>
              <input
                type="text"
                {...register('houseNumber', { required: 'חובה להזין מספר בית' })}
                placeholder="12"
              />
              {errors.houseNumber && <small className="checkout-error">{errors.houseNumber.message}</small>}
            </div>
          </div>

          <label>הערות למשלוח (אופציונלי)</label>
          <textarea
            rows={3}
            {...register('notes')}
            placeholder="קומה, כניסה, קוד שער וכו'"
          />

          <div className="checkout-payment-box">
            <h3>אמצעי תשלום</h3>
            <p className="checkout-payment-note">
              מצב לימודי בלבד - אין חיוב אמיתי.
            </p>

            <div className="checkout-payment-methods">
              <label className="checkout-method-chip">
                <input type="radio" value="card_test" {...register('paymentMethod')} />
                כרטיס אשראי
              </label>
              <label className="checkout-method-chip">
                <input type="radio" value="bit_test" {...register('paymentMethod')} />
                Bit
              </label>
              <label className="checkout-method-chip">
                <input type="radio" value="paypal_test" {...register('paymentMethod')} />
                PayPal
              </label>
              <label className="checkout-method-chip">
                <input type="radio" value="cash_delivery" {...register('paymentMethod')} />
                מזומן לשליח
              </label>
            </div>

            {selectedPaymentMethod === 'card_test' && (
              <>
                <label>שם בעל הכרטיס</label>
                <input
                  type="text"
                  {...register('cardName', {
                    validate: (v) => selectedPaymentMethod !== 'card_test' || Boolean(String(v || '').trim()) || 'חובה להזין שם בעל כרטיס',
                  })}
                  placeholder="שם כפי שמופיע על הכרטיס"
                />
                {errors.cardName && <small className="checkout-error">{errors.cardName.message}</small>}

                <label>מספר כרטיס</label>
                <input
                  type="text"
                  inputMode="numeric"
                  {...register('cardNumber', {
                    validate: (v) => {
                      if (selectedPaymentMethod !== 'card_test') return true;
                      return String(v || '').replace(/\D/g, '').length >= 12 || 'חובה להזין מספר כרטיס תקין';
                    },
                  })}
                  placeholder={TEST_CARD_PLACEHOLDER}
                />
                {errors.cardNumber && <small className="checkout-error">{errors.cardNumber.message}</small>}

                <div className="checkout-row checkout-row--card">
                  <div>
                    <label>תוקף</label>
                    <input
                      type="text"
                      {...register('cardExpiry', {
                        validate: (v) => selectedPaymentMethod !== 'card_test' || Boolean(String(v || '').trim()) || 'חובה להזין תוקף',
                      })}
                      placeholder="MM/YY"
                    />
                    {errors.cardExpiry && <small className="checkout-error">{errors.cardExpiry.message}</small>}
                  </div>
                  <div>
                    <label>CVV</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      {...register('cardCvv', {
                        validate: (v) => {
                          if (selectedPaymentMethod !== 'card_test') return true;
                          return String(v || '').trim().length >= 3 || 'CVV לא תקין';
                        },
                      })}
                      placeholder="***"
                    />
                    {errors.cardCvv && <small className="checkout-error">{errors.cardCvv.message}</small>}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="checkout-actions">
            <Button
              type="button"
              label="חזרה לעגלה"
              className="p-button-outlined"
              onClick={() => navigate('/cart')}
            />
            <Button
              type="submit"
              label={isSubmitting ? 'שולח...' : `אישור הזמנה ₪${grandTotal}`}
              icon="pi pi-check"
              loading={isSubmitting}
            />
          </div>
        </form>

        <aside className="checkout-summary">
          <h3>סיכום הזמנה</h3>
          {checkoutItems.map((item) => (
            <div className="checkout-item" key={item._id}>
              <div>
                <div className="checkout-item-name">{item.makeupName || item.name}</div>
                <div className="checkout-item-meta">כמות: {item.qty}</div>
              </div>
              <div className="checkout-item-side">
                <div className="checkout-item-price">₪{(Number(item.price) || 0) * (Number(item.qty) || 1)}</div>
                <button
                  type="button"
                  className="checkout-item-remove"
                  onClick={() => handleRemoveCheckoutItem(item)}
                >
                  מחיקה
                </button>
              </div>
            </div>
          ))}

          <div className="checkout-totals">
            <div><span>סכום ביניים</span><span>₪{totalAmount}</span></div>
            <div><span>משלוח</span><span>{shippingFee === 0 ? 'חינם' : `₪${shippingFee}`}</span></div>
            <div className="grand"><span>סה״כ לתשלום</span><span>₪{grandTotal}</span></div>
          </div>

          {smartRecommendations.length > 0 && (
            <section className="checkout-reco">
              <h4>אולי תאהבי גם לפני סיום הזמנה</h4>
              <div className="checkout-reco-list">
                {smartRecommendations.map((p) => (
                  <article key={p._id || p.id} className="checkout-reco-item">
                    <img src={p.imageUrl} alt={p.makeupName || p.name} />
                    <div className="checkout-reco-body">
                      <div className="checkout-reco-name">{p.makeupName || p.name}</div>
                      <div className="checkout-reco-meta">₪{p.price}</div>
                      <Button
                        label="הוספה לעגלה"
                        className="checkout-reco-btn"
                        onClick={() => handleAddRecommended(p)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
