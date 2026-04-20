/**
 * Single product page: description, color swatches with recolored hero image, add to cart, virtual try-on block.
 */
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "primereact/button";
import { addToCart } from "../store/slices/cartSlice";
import { fetchProductById } from "../store/slices/productsSlice";
import { ColorSwatches } from "./ColorSwatches";
import { RecoloredProductImage } from "./RecoloredProductImage";
import VirtualMakeupTryOn from "./VirtualMakeupTryOn";
import { getProductImageCropKind } from "../utils/productImageBottomCrop";
import "../pages/Products.css";

export const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { items, currentProduct, loading } = useSelector((state) => state.products);
    const product = currentProduct && (String(currentProduct._id) === id || currentProduct.id === id)
        ? currentProduct
        : items.find((item) => String(item._id) === id || item.id === id);
    const [quantity, setQuantity] = useState(0);
    const [selectedColorIndex, setSelectedColorIndex] = useState(0);
    const [colorChangeKey, setColorChangeKey] = useState(0);

    const getTryOnCategory = (p) => {
        if (!p) return 'lipstick';
        const name = String(p?.makeupName || '').toLowerCase();
        const cat = String(p?.category || '').toLowerCase();

        if (
            cat.includes('שפת') ||
            name.includes('שפת') ||
            name.includes('גלוס') ||
            name.includes('ליפ') ||
            name.includes('תוחם')
        ) {
            return 'lipstick';
        }

        if (name.includes('סומק') || cat.includes('סומק')) {
            return 'blush';
        }

        if (name.includes('איילנר') || name.includes('eyeliner')) {
            return 'eyeliner';
        }

        if (name.includes('צללית') || cat.includes('עין') || cat.includes('ריס')) {
            return 'eyeshadow';
        }

        if (name.includes('פאונדיישן') || name.includes('foundation')) {
            return 'foundation';
        }

        if (
            cat.includes('פנים') &&
            (name.includes('פאונדיישן') ||
                name.includes('קונסילר') ||
                name.includes('היילייט'))
        ) {
            return 'foundation';
        }

        if (cat.includes('פנים')) {
            return 'blush';
        }

        return 'lipstick';
    };

    const tryOnCategory = getTryOnCategory(product);
    const productId = String(product?._id || product?.id || id || "");
    const sku = `SC-${productId.slice(-6).toUpperCase().padStart(6, "0")}`;

    const tryOnAvailableColors = (product?.colors || []).map((c, index) => ({
        id: index,
        name: c.name,
        hexCode: c.hex,
        productUrl: `/product/${product?._id || product?.id || id}`,
    }));

    useEffect(() => {
        if (id) dispatch(fetchProductById(id));
    }, [id, dispatch]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, [id]);

    const similarProducts = useMemo(() => {
        if (!product) return [];
        const currentId = String(product._id || product.id || "");
        return (items || [])
            .filter((p) => String(p._id || p.id) !== currentId && p.category === product.category)
            .slice(0, 4);
    }, [items, product]);

    const keyBenefits = useMemo(() => {
        if (!product) return [];
        const list = [];
        if (product?.inStock) list.push("זמין במלאי למשלוח מהיר");
        if (product?.colors?.length) list.push(`מבחר גוונים: ${product.colors.length} אפשרויות`);
        if (String(product?.category || "").includes("שפת")) list.push("מרקם עשיר ונעים לשפתיים");
        if (String(product?.category || "").includes("פנים")) list.push("גימור טבעי ונוח לשימוש יומי");
        if (String(product?.category || "").includes("עיניים")) list.push("עמידות גבוהה לאורך היום");
        if (!list.length) list.push("נבחר בקפידה לשגרת איפור יומיומית");
        return list.slice(0, 4);
    }, [product]);

    if (loading && !product) return <div className="loading">טוען מוצר...</div>;
    if (!product) return <h2 className="product-not-found">המוצר לא נמצא</h2>;

    const increaseQuantity = () => {
        setQuantity(prev => prev + 1);
    };

    const decreaseQuantity = () => {
        setQuantity(prev => (prev > 0 ? prev - 1 : 0));
    };

    const handleAddToCart = () => {
        if (quantity > 0) {
            const selectedColor = product.colors?.[selectedColorIndex] ? { name: product.colors[selectedColorIndex].name, hex: product.colors[selectedColorIndex].hex } : null;
            dispatch(addToCart({ product, quantity, selectedColor }));
            window.dispatchEvent(new CustomEvent('cart:added', { detail: { name: product.makeupName } }));
            setQuantity(0);
        }
    };

    const handleOrderNow = () => {
        const orderQuantity = quantity > 0 ? quantity : 1;
        const selectedColor = product.colors?.[selectedColorIndex]
            ? { name: product.colors[selectedColorIndex].name, hex: product.colors[selectedColorIndex].hex }
            : null;
        navigate('/checkout', {
            state: {
                buyNow: {
                    product,
                    quantity: orderQuantity,
                    selectedColor,
                },
            },
        });
    };

    const displayImage = product.colors?.[selectedColorIndex]?.imageUrl || product.imageUrl;
    const selectedColorHex = product.colors?.[selectedColorIndex]?.hex;
    const useRecolor = product.colors?.length > 0 && selectedColorHex;
    const cropKind = getProductImageCropKind(displayImage);
    const detailsImageWrapClass =
        cropKind === 'four'
            ? 'product-details-image-wrap product-details-image-wrap--crop-bottom--four'
            : cropKind === 'tail12'
              ? 'product-details-image-wrap product-details-image-wrap--crop-bottom'
              : 'product-details-image-wrap';

    return (
        <div className="product-details-page">
            <div className="product-details-breadcrumbs">
                <Link to="/products">מוצרים</Link>
                <span>/</span>
                <span>{product.category}</span>
            </div>

            <div className="product-details-top">
                <section className="product-details-content">
                    <h1>{product.makeupName || product.name}</h1>
                    <div className="product-details-meta-line">
                        <span className={`product-stock-chip ${product.inStock ? "in" : "out"}`}>
                            {product.inStock ? "במלאי" : "אזל זמנית"}
                        </span>
                        <span className="product-sku">מק״ט: {sku}</span>
                    </div>

                    <p><strong>מותג:</strong> {product.brand}</p>
                    <p><strong>קטגוריה:</strong> {product.category}</p>
                    <p>{product.description}</p>
                    <strong>מחיר: ₪{product.price}</strong>
                    <p className="product-price-sub">כולל מע״מ | אפשרות החלפה עד 14 יום</p>

                    <div className="product-trust-strip">
                        <div>משלוח מהיר 2-5 ימי עסקים</div>
                        <div>החזרה/החלפה לפי מדיניות האתר</div>
                        <div>תשלום מאובטח</div>
                    </div>

                    <section className="product-benefits">
                        <h3>למה תאהבי את המוצר הזה</h3>
                        <ul>
                            {keyBenefits.map((b) => <li key={b}>{b}</li>)}
                        </ul>
                    </section>

                    <div className="product-details-qty">
                        <span className="product-details-qty-label">כמות:</span>
                        <Button
                            icon="pi pi-plus"
                            className="p-button-rounded p-button-sm product-details-qty-btn"
                            onClick={increaseQuantity}
                        />
                        <span className="product-details-qty-num">{quantity}</span>
                        <Button
                            icon="pi pi-minus"
                            className="p-button-rounded p-button-sm product-details-qty-btn"
                            onClick={decreaseQuantity}
                            disabled={quantity <= 0}
                        />
                    </div>
                    <div className="product-details-add product-details-add-row">
                        <Button
                            label={`הוסף לעגלה (${quantity})`}
                            icon="pi pi-shopping-cart"
                            className="product-details-add-btn"
                            onClick={handleAddToCart}
                            disabled={!product.inStock || quantity === 0}
                        />
                        <Button
                            label="להזמנה"
                            icon="pi pi-credit-card"
                            className="product-details-order-btn"
                            onClick={handleOrderNow}
                            disabled={!product.inStock}
                        />
                    </div>
                </section>

                <section className="product-details-media">
                    <div className={detailsImageWrapClass}>
                        {useRecolor ? (
                            <RecoloredProductImage
                                key={`pd-img-${id}-${selectedColorIndex}-${selectedColorHex}`}
                                src={displayImage}
                                alt={product.makeupName || product.name}
                                targetHex={selectedColorHex}
                                className="product-details-recolored-img"
                                recolorTopOnly={product.recolorTopOnly}
                                drawTrigger={colorChangeKey}
                            />
                        ) : (
                            <img
                                src={displayImage}
                                alt={product.makeupName || product.name}
                            />
                        )}
                    </div>

                    {product.colors && product.colors.length > 0 && (
                        <div className="product-details-swatches product-details-swatches--tight">
                            <span className="product-details-swatches-label">צבע:</span>
                            <ColorSwatches
                                colors={product.colors}
                                selectedIndex={selectedColorIndex}
                                onSelect={(i) => {
                                    setSelectedColorIndex(i);
                                    setColorChangeKey((k) => k + 1);
                                }}
                                compact={false}
                            />
                        </div>
                    )}
                </section>
            </div>

            {product.colors && product.colors.length > 0 && (
                <div className="mt-6">
                    <VirtualMakeupTryOn
                        productName={product.makeupName || product.name}
                        productCategory={tryOnCategory}
                        availableColors={tryOnAvailableColors}
                        onAddToCart={(colorId) => {
                            const nextIndex = Number(colorId);
                            if (Number.isNaN(nextIndex)) return;
                            setSelectedColorIndex(nextIndex);
                            setColorChangeKey((k) => k + 1);
                        }}
                    />
                </div>
            )}

            {similarProducts.length > 0 && (
                <section className="similar-products">
                    <h3>עוד מוצרים שיכולים להתאים לך</h3>
                    <div className="similar-products-grid">
                        {similarProducts.map((p) => (
                            <article key={p._id || p.id} className="similar-product-card">
                                <img src={p.imageUrl} alt={p.makeupName || p.name} />
                                <div className="similar-product-body">
                                    <div className="similar-product-name">{p.makeupName || p.name}</div>
                                    <div className="similar-product-price">₪{p.price}</div>
                                    <Link to={`/product/${p._id || p.id}`}>
                                        <Button label="לפרטים" className="p-button-sm similar-product-btn" />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

