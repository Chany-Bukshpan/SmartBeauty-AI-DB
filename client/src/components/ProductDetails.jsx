import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "primereact/button";
import { addToCart } from "../store/slices/cartSlice";
import { fetchProductById } from "../store/slices/productsSlice";
import { ColorSwatches } from "./ColorSwatches";
import { RecoloredProductImage } from "./RecoloredProductImage";
import "../pages/Products.css";

// קומפוננטה להצגת פרטי מוצר - מציגה את כל הפרטים של מוצר ספציפי
export const ProductDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const { items, currentProduct, loading } = useSelector((state) => state.products);
    const product = currentProduct && (String(currentProduct._id) === id || currentProduct.id === id)
        ? currentProduct
        : items.find((item) => String(item._id) === id || item.id === id);
    const [quantity, setQuantity] = useState(0);
    const [selectedColorIndex, setSelectedColorIndex] = useState(0);

    useEffect(() => {
        if (id) dispatch(fetchProductById(id));
    }, [id, dispatch]);

    if (loading && !product) return <div className="loading">טוען מוצר...</div>;
    if (!product) return <h2 className="product-not-found">המוצר לא נמצא</h2>;

    // הגדלת כמות
    const increaseQuantity = () => {
        setQuantity(prev => prev + 1);
    };

    // הקטנת כמות (מינימום 0)
    const decreaseQuantity = () => {
        setQuantity(prev => (prev > 0 ? prev - 1 : 0));
    };

    // הוספת מוצר לעגלה עם הכמות הנבחרת
    const handleAddToCart = () => {
        if (quantity > 0) {
            const selectedColor = product.colors?.[selectedColorIndex] ? { name: product.colors[selectedColorIndex].name, hex: product.colors[selectedColorIndex].hex } : null;
            dispatch(addToCart({ product, quantity, selectedColor }));
            window.dispatchEvent(new CustomEvent('cart:added', { detail: { name: product.makeupName } }));
            setQuantity(0);
        }
    };

    const displayImage = (product.colors?.[selectedColorIndex]?.imageUrl) || product.imageUrl;
    const selectedColorHex = product.colors?.[selectedColorIndex]?.hex;
    const useMainImage = !product.colors?.[selectedColorIndex]?.imageUrl;

    return (
        <div className="product-details-page">
            <h1>{product.makeupName || product.name}</h1>
            <div className="product-details-image-wrap">
                {useMainImage && selectedColorHex ? (
                    <RecoloredProductImage
                        src={displayImage}
                        alt={product.makeupName || product.name}
                        targetHex={selectedColorHex}
                        className="product-details-recolored-img"
                    />
                ) : (
                    <img
                        src={displayImage}
                        alt={product.makeupName || product.name}
                    />
                )}
            </div>
            <p><strong>מותג:</strong> {product.brand}</p>
            <p><strong>קטגוריה:</strong> {product.category}</p>
            <p>{product.description}</p>
            <strong>מחיר: ₪{product.price}</strong>

            {product.colors && product.colors.length > 0 && (
                <div className="product-details-swatches">
                    <span className="product-details-swatches-label">צבע:</span>
                    <ColorSwatches
                        colors={product.colors}
                        selectedIndex={selectedColorIndex}
                        onSelect={setSelectedColorIndex}
                        compact={false}
                    />
                </div>
            )}

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
            <div className="product-details-add">
                <Button
                    label={`הוסף לעגלה (${quantity})`}
                    icon="pi pi-shopping-cart"
                    className="product-details-add-btn"
                    onClick={handleAddToCart}
                    disabled={!product.inStock || quantity === 0}
                />
            </div>
        </div>
    );
}

