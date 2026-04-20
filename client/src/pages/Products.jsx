/**
 * Product catalog: loads full list once, filters by URL query + UI, pagination, color swatches + recolor previews.
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllProductsByPages } from '../store/slices/productsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { Button } from 'primereact/button';
import { Link, useSearchParams } from 'react-router-dom';
import { ColorSwatches } from '../components/ColorSwatches';
import { RecoloredProductImage } from '../components/RecoloredProductImage';
import { getProductImageCropKind } from '../utils/productImageBottomCrop';
import './Products.css';

const PER_PAGE = 35;
const CATEGORIES = [
  { value: '', label: 'כל הקטגוריות' },
  { value: 'פנים', label: 'פנים' },
  { value: 'שפתיים', label: 'שפתיים' },
  { value: 'עיניים', label: 'עיניים' },
  { value: 'ריסים', label: 'ריסים' },
];

function Products() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, loading, error } = useSelector((state) => state.products);
  const [page, setPage] = useState(1);
  const [quantities, setQuantities] = useState({});
  const [selectedColorByProduct, setSelectedColorByProduct] = useState({});
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showBackTop, setShowBackTop] = useState(false);
  const productsCatalogStartRef = useRef(null);
  const skipScrollOnMount = useRef(true);
  const searchString = searchParams.toString();

  const syncFiltersToUrl = (next = {}) => {
    const q = next.filterText ?? filterText;
    const brand = next.filterBrand ?? filterBrand;
    const category = next.filterCategory ?? filterCategory;
    const maxPrice = next.filterMaxPrice ?? filterMaxPrice;
    const inStockOnly = next.filterInStockOnly ?? filterInStockOnly;

    const params = new URLSearchParams(searchString);
    const setOrDelete = (key, value) => {
      const normalized = String(value || '').trim();
      if (normalized) params.set(key, normalized);
      else params.delete(key);
    };

    setOrDelete('q', q);
    setOrDelete('brand', brand);
    setOrDelete('category', category);
    setOrDelete('maxPrice', maxPrice);
    if (inStockOnly) params.set('inStock', '1');
    else params.delete('inStock');

    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const increaseQuantity = (productId) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const decreaseQuantity = (productId) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) > 0 ? (prev[productId] || 0) - 1 : 0
    }));
  };

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

  useEffect(() => {
    dispatch(fetchAllProductsByPages());
  }, [dispatch]);

  const brands = useMemo(() => {
    const set = new Set();
    (items || []).forEach(p => p.brand && set.add(p.brand));
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items?.length) return [];
    let list = [...items];
    if (filterBrand) list = list.filter(p => p.brand === filterBrand);
    if (filterCategory) list = list.filter(p => p.category === filterCategory);
    if (filterText) {
      const q = String(filterText).toLowerCase();
      list = list.filter((p) =>
        String(p.makeupName || p.name || '').toLowerCase().includes(q) ||
        String(p.brand || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q)
      );
    }
    if (filterMaxPrice) {
      const max = Number(filterMaxPrice);
      if (!Number.isNaN(max)) list = list.filter(p => (p.price || 0) <= max);
    }
    if (filterInStockOnly) list = list.filter(p => p.inStock);
    return list;
  }, [items, filterBrand, filterCategory, filterMaxPrice, filterInStockOnly, filterText]);

  const clearFilters = () => {
    setFilterText('');
    setFilterBrand('');
    setFilterCategory('');
    setFilterMaxPrice('');
    setFilterInStockOnly(false);
    syncFiltersToUrl({
      filterText: '',
      filterBrand: '',
      filterCategory: '',
      filterMaxPrice: '',
      filterInStockOnly: false,
    });
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [filterBrand, filterCategory, filterMaxPrice, filterInStockOnly, filterText]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const q = params.get('q') || '';
    const b = params.get('brand') || '';
    const c = params.get('category') || '';
    const maxPrice = params.get('maxPrice') || '';
    const inStockRaw = String(params.get('inStock') || '').toLowerCase();
    const inStock = inStockRaw === '1' || inStockRaw === 'true' || inStockRaw === 'yes';
    setFilterText(q);
    setFilterBrand(b);
    setFilterCategory(c);
    setFilterMaxPrice(maxPrice);
    setFilterInStockOnly(inStock);
    setPage(1);
  }, [searchString]);

  /* מעבר עמוד בפגינציה — גלילה לתחילת אזור המוצרים (לא נשארים למטה) */
  useEffect(() => {
    if (skipScrollOnMount.current) {
      skipScrollOnMount.current = false;
      return;
    }
    productsCatalogStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  const hasActiveFilters = filterText || filterBrand || filterCategory || filterMaxPrice || filterInStockOnly;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((filteredItems?.length || 0) / PER_PAGE)),
    [filteredItems]
  );
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return (filteredItems || []).slice(start, start + PER_PAGE);
  }, [filteredItems, page]);

  if (loading) return <div className="loading">טוען מוצרים...</div>;
  if (error) return <div className="products"><div className="loading">שגיאה בטעינת מוצרים</div><div className="error">שגיאה: {error}</div></div>;

  return (
    <div className="products">
      <section className="products-hero">
        <div className="products-hero-bg" aria-hidden="true" />
        <div className="products-hero-content">
          <h1 className="products-hero-title">
            <span className="gradient-text">המוצרים</span> שלנו
          </h1>
          <p className="products-hero-tagline">גלו את מבחר האיפור — סינון לפי מותג, קטגוריה ומחיר</p>
        </div>
      </section>

      <div
        ref={productsCatalogStartRef}
        className="products-head products-head-sub"
        id="products-catalog-start"
        tabIndex={-1}
      >
        <p className="section-tagline">בחרו מוצרים, הוסיפו לעגלה והזמינו בנוחות עד הבית</p>
      </div>

      <div className="products-filters">
        <div className="filter-group filter-search">
          <label htmlFor="filter-text">חיפוש</label>
          <input
            id="filter-text"
            type="text"
            value={filterText}
            onChange={(e) => {
              const value = e.target.value;
              setFilterText(value);
              syncFiltersToUrl({ filterText: value });
              setPage(1);
            }}
            placeholder="שם מוצר / מותג / קטגוריה"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="filter-brand">מותג</label>
          <select
            id="filter-brand"
            value={filterBrand}
            onChange={(e) => {
              const value = e.target.value;
              setFilterBrand(value);
              syncFiltersToUrl({ filterBrand: value });
              setPage(1);
            }}
          >
            <option value="">כל המותגים</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filter-category">קטגוריה / אזור</label>
          <select
            id="filter-category"
            value={filterCategory}
            onChange={(e) => {
              const value = e.target.value;
              setFilterCategory(value);
              syncFiltersToUrl({ filterCategory: value });
              setPage(1);
            }}
          >
            {CATEGORIES.map(c => <option key={c.value || 'all'} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filter-price">מחיר עד (₪)</label>
          <select
            id="filter-price"
            value={filterMaxPrice}
            onChange={(e) => {
              const value = e.target.value;
              setFilterMaxPrice(value);
              syncFiltersToUrl({ filterMaxPrice: value });
              setPage(1);
            }}
          >
            <option value="">ללא הגבלה</option>
            <option value="50">₪50</option>
            <option value="100">₪100</option>
            <option value="150">₪150</option>
            <option value="200">₪200</option>
          </select>
        </div>
        <div className="filter-group filter-instock">
          <input
            type="checkbox"
            id="filter-instock"
            checked={filterInStockOnly}
            onChange={(e) => {
              const checked = e.target.checked;
              setFilterInStockOnly(checked);
              syncFiltersToUrl({ filterInStockOnly: checked });
              setPage(1);
            }}
          />
          <label htmlFor="filter-instock">במלאי בלבד</label>
        </div>
        {hasActiveFilters && (
          <button type="button" className="btn-clear-filters" onClick={clearFilters}>
            נקה סינונים
          </button>
        )}
        <span className="products-filter-count">
          {filteredItems.length} מוצרים
        </span>
      </div>

      {!paginatedItems.length ? (
        <p className="loading">
          {items?.length ? 'לא נמצאו מוצרים התואמים את הסינון. נסו לנקות סינונים.' : 'טוען מוצרים...'}
        </p>
      ) : (
        <div className="products-grid">
          {paginatedItems.map((product, index) => {
            const selectedIndex = selectedColorByProduct[product._id] ?? 0;
            const selectedColorHex = product.colors?.[selectedIndex]?.hex;
            const useRecolor = product.colors?.length > 0 && selectedColorHex;
            const displayImage = product.colors?.[selectedIndex]?.imageUrl || product.imageUrl;
            const cropKind = getProductImageCropKind(displayImage);
            const imageWrapClass =
              cropKind === 'four'
                ? 'product-card-image-wrap product-card-image-wrap--crop-bottom--four'
                : cropKind === 'tail12'
                  ? 'product-card-image-wrap product-card-image-wrap--crop-bottom'
                  : 'product-card-image-wrap';
            return (
              <div key={product._id} className="product-card" style={{ animationDelay: `${index * 0.04}s` }}>
                <div className={imageWrapClass}>
                  {product.inStock && <span className="product-card-badge">במלאי</span>}
                  {useRecolor ? (
                    <RecoloredProductImage
                      src={displayImage}
                      alt={product.makeupName}
                      targetHex={selectedColorHex}
                      className="product-card-recolored-img"
                      recolorTopOnly={product.recolorTopOnly}
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
                    <Button icon="pi pi-plus" className="p-button-rounded p-button-sm" onClick={() => increaseQuantity(product._id)} />
                    <span>{quantities[product._id] || 0}</span>
                    <Button icon="pi pi-minus" className="p-button-rounded p-button-sm" onClick={() => decreaseQuantity(product._id)} disabled={(quantities[product._id] || 0) <= 0} />
                  </div>
                </div>
                <div className="product-actions">
                  <Link to={`/product/${product._id}`} style={{ textDecoration: 'none' }}>
                    <Button label="לפרטים נוספים" icon="pi pi-info-circle" className="btn-details" />
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

      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>הקודם</button>
          <span className="pagination-info">עמוד {page} מתוך {totalPages}</span>
          <button type="button" className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>הבא</button>
        </div>
      )}

      <button
        type="button"
        className={`back-to-top ${showBackTop ? 'back-to-top--visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="חזרה למעלה"
      >
        ↑
      </button>
    </div>
  );
}

export default Products;
