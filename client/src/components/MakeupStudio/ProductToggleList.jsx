import { useMemo } from 'react';
import { Link } from 'react-router-dom';

const ORDER = ['foundation', 'eyeshadow', 'eyeliner', 'mascara', 'blush', 'lipstick'];

function titleForKey(k) {
  if (k === 'foundation') return 'מייקאפ';
  if (k === 'eyeshadow') return 'צללית';
  if (k === 'eyeliner') return 'אייליינר';
  if (k === 'mascara') return 'מסקרה';
  if (k === 'blush') return 'סומק';
  if (k === 'lipstick') return 'אודם';
  return k;
}

export default function ProductToggleList({
  look,
  productsById,
  enabledProducts,
  onToggle,
  onAddOne,
}) {
  const rows = useMemo(() => {
    const p = look?.products || {};
    const entries = Object.entries(p)
      .filter(([_, v]) => v?.productId)
      .sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));

    return entries.map(([k, v]) => {
      const product = productsById.get(String(v.productId)) || null;
      return {
        key: k,
        product,
        reason: v?.reason || '',
        selectedHex: v?.selectedHex || '',
        selectedColorName: v?.selectedColorName || '',
      };
    });
  }, [look, productsById]);

  if (!rows.length) return null;

  return (
    <div className="sc-studio-products">
      {rows.map((r) => {
        const enabled = enabledProducts?.[r.key] !== false;
        const pid = r.product?._id || r.product?.id;
        const productPath = pid ? `/product/${pid}` : null;
        return (
          <div key={r.key} className="sc-product-row">
            <label className="sc-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => onToggle?.(r.key)}
              />
              <span className="sc-toggle-ui" aria-hidden="true" />
              <span className="sc-product-title">
                {titleForKey(r.key)}:{' '}
                {productPath ? (
                  <Link to={productPath} className="sc-product-name-link">
                    <strong>{r.product?.makeupName || r.product?.name || 'מוצר'}</strong>
                  </Link>
                ) : (
                  <strong>{r.product?.makeupName || r.product?.name || 'מוצר'}</strong>
                )}
              </span>
            </label>

            <div className="sc-product-visual">
              {productPath ? (
                <Link to={productPath} className="sc-product-thumb-link" aria-label="לפרטי המוצר">
                  <img
                    src={r.product?.imageUrl || '/vite.svg'}
                    alt=""
                    className="sc-product-thumb"
                  />
                </Link>
              ) : (
                <img
                  src={r.product?.imageUrl || '/vite.svg'}
                  alt={r.product?.makeupName || r.product?.name || 'product'}
                  className="sc-product-thumb"
                />
              )}
              <div className="sc-product-meta">
                <div className="sc-product-price">₪{Number(r.product?.price || 0).toFixed(2)}</div>
                <div className="sc-product-color">
                  <span className="sc-product-color-chip" style={{ background: r.selectedHex || '#c9a96e' }} />
                  <span>{r.selectedColorName || r.selectedHex || 'גוון מותאם'}</span>
                </div>
              </div>
            </div>

            <div className="sc-product-actions">
              {productPath ? (
                <Link to={productPath} className="sc-btn sc-btn-ghost sc-product-page-link">
                  לכרטיס המוצר
                </Link>
              ) : null}
              <button type="button" className="sc-btn sc-btn-ghost" onClick={() => onAddOne?.(r.product)}>
                הוסף לסל
              </button>
            </div>

            {r.reason ? <div className="sc-product-reason">{r.reason}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

