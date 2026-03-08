import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/slices/productsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';
import { ColorSwatches } from '../components/ColorSwatches';
import { RecoloredProductImage } from '../components/RecoloredProductImage';
import './Products.css';

// דף מוצרים - מציג את כל המוצרים עם pagination
function Products() {
  const dispatch = useDispatch();
  // שליפת מוצרים מהסטייט הכללי
  const { items, pagination, loading, error } = useSelector((state) => state.products);
  const [page, setPage] = useState(1);
  const [quantities, setQuantities] = useState({});
  const [selectedColorByProduct, setSelectedColorByProduct] = useState({});

  // הגדלת כמות למוצר ספציפי
  const increaseQuantity = (productId) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  // הקטנת כמות למוצר ספציפי (מינימום 0)
  const decreaseQuantity = (productId) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) > 0 ? (prev[productId] || 0) - 1 : 0
    }));
  };

  // פונקציה להוספת מוצר לעגלה עם הכמות הנבחרת
  const handleAddToCart = (product) => {
    const qty = quantities[product._id] || 0;
    if (qty > 0) {
      const colorIndex = selectedColorByProduct[product._id] ?? 0;
      const selectedColor = product.colors?.[colorIndex] ? { name: product.colors[colorIndex].name, hex: product.colors[colorIndex].hex } : null;
      dispatch(addToCart({ product, quantity: qty, selectedColor }));
      window.dispatchEvent(new CustomEvent('cart:added', { detail: { name: product.makeupName } }));
      setQuantities(prev => ({ ...prev, [product._id]: 0 }));
    }
  };

  // טעינת מוצרים מהשרת כשהדף נטען או כשמשנים עמוד
  useEffect(() => {
    dispatch(fetchProducts({ page, limit: 12 }));
  }, [dispatch, page]);

  // הצגת הודעת טעינה או שגיאה
  if (loading) return <div className="loading">טוען מוצרים...</div>;
  if (error) return <div className="products"><div className="loading">שגיאה בטעינת מוצרים</div><div className="error">שגיאה: {error}</div></div>;

  return (
    <div className="products">
      <div className="products-head">
        <h1 className="section-title products-title">
          <span className="gradient-text">המוצרים</span> שלנו
        </h1>
        <p className="section-tagline">גלו את מבחר האיפור המעודכן — איכות ומחיר במרכז</p>
      </div>
      {!items?.length ? (
        <p className="loading">לא נמצאו מוצרים. ייתכן שהשרת לא פעיל או שהמאגר ריק.</p>
      ) : (
      <div className="products-grid">
        {items.map((product, index) => {
          const selectedIndex = selectedColorByProduct[product._id] ?? 0;
          const selectedColorHex = product.colors?.[selectedIndex]?.hex;
          const useRecolor = product.colors?.length > 0 && selectedColorHex;
          const displayImage = product.colors?.[selectedIndex]?.imageUrl || product.imageUrl;
          return (
          <div key={product._id} className="product-card" style={{ animationDelay: `${index * 0.06}s` }}>
            <div className="product-card-image-wrap">
              {useRecolor ? (
                <RecoloredProductImage
                  src={displayImage}
                  alt={product.makeupName}
                  targetHex={selectedColorHex}
                  className="product-card-recolored-img"
                />
              ) : (
                <img src={displayImage} alt={product.makeupName} />
              )}
            </div>
            <div className="product-card-body">
              <h3>{product.makeupName}</h3>
              {product.colors && product.colors.length > 0 && (
                <ColorSwatches
                  colors={product.colors}
                  selectedIndex={selectedIndex}
                  onSelect={(i) => setSelectedColorByProduct(prev => ({ ...prev, [product._id]: i }))}
                  compact
                />
              )}
              <p className="brand">{product.brand}</p>
              <p className="price">₪{product.price}</p>
              <p className={product.inStock ? 'in-stock' : 'out-of-stock'}>
                {product.inStock ? 'במלאי' : 'לא במלאי'}
              </p>
              <div className="qty-controls">
                <Button 
                  icon="pi pi-plus" 
                  className="p-button-rounded p-button-sm" 
                  onClick={() => increaseQuantity(product._id)}
                />
                <span>{quantities[product._id] || 0}</span>
                <Button 
                  icon="pi pi-minus" 
                  className="p-button-rounded p-button-sm" 
                  onClick={() => decreaseQuantity(product._id)}
                  disabled={(quantities[product._id] || 0) <= 0}
                />
              </div>
            </div>
            <div className="product-actions">
              <Link to={`/product/${product._id}`} style={{ textDecoration: 'none' }}>
                <Button 
                  label="לפרטים נוספים" 
                  icon="pi pi-info-circle" 
                  className="btn-details"
                />
              </Link>
              <Button 
                label={`הוסף לעגלה (${quantities[product._id] || 0})`} 
                icon="pi pi-shopping-cart" 
                className="btn-add-cart"
                onClick={() => handleAddToCart(product)}
                disabled={!product.inStock || (quantities[product._id] || 0) === 0}
              />
            </div>
          </div>
          );
        })}
      </div>
      )}
      {/* כפתורי pagination - מוצגים רק אם יש יותר מעמוד אחד */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="pagination-btn"
            disabled={!pagination.hasPrevPage}
            onClick={() => setPage(page - 1)}
          >
            הקודם
          </button>
          <span>
            עמוד {pagination.currentPage} מתוך {pagination.totalPages}
          </span>
          <button
            type="button"
            className="pagination-btn"
            disabled={!pagination.hasNextPage}
            onClick={() => setPage(page + 1)}
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
}

export default Products;
