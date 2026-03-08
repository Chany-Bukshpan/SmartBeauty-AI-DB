import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import { ColorSwatches } from './ColorSwatches';
import { RecoloredProductImage } from './RecoloredProductImage';

// קומפוננטה להצגת כרטיס מוצר - מציגה מידע בסיסי על מוצר
export const ProductCard = ({ product }) => {
    const dispatch = useDispatch();
    const [quantity, setQuantity] = useState(0);
    const [selectedColorIndex, setSelectedColorIndex] = useState(0);

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
            window.dispatchEvent(new CustomEvent('cart:added', { detail: { name: product.makeupName || product.name } }));
            setQuantity(0);
        }
    };

    const displayImage = product.colors?.[selectedColorIndex]?.imageUrl || product.imageUrl;
    const selectedColorHex = product.colors?.[selectedColorIndex]?.hex;
    const useRecolor = product.colors?.length > 0 && selectedColorHex;

    return (
        <div className="product-card">
            <div className="product-card-image-wrap">
                {useRecolor ? (
                    <RecoloredProductImage src={displayImage} alt={product.makeupName || product.name} targetHex={selectedColorHex} className="product-card-recolored-img" />
                ) : (
                    <img src={displayImage} alt={product.makeupName || product.name} />
                )}
            </div>
            <div className="product-card-body">
                <h3>{product.makeupName || product.name}</h3>
                {product.colors && product.colors.length > 0 && (
                    <ColorSwatches
                        colors={product.colors}
                        selectedIndex={selectedColorIndex}
                        onSelect={setSelectedColorIndex}
                        compact
                    />
                )}
                <p className="brand"><strong>מותג:</strong> {product.brand}</p>
                <strong className="price">מחיר: ₪{product.price}</strong>
                <div className="qty-controls">
                    <Button 
                        icon="pi pi-plus" 
                        className="p-button-rounded p-button-sm" 
                        onClick={increaseQuantity}
                    />
                    <span>{quantity}</span>
                    <Button 
                        icon="pi pi-minus" 
                        className="p-button-rounded p-button-sm" 
                        onClick={decreaseQuantity}
                        disabled={quantity <= 0}
                    />
                </div>
            </div>
            <div className="product-actions">
                <Link to={`/product/${product._id || product.id}`} style={{ textDecoration: 'none' }}>
                    <Button label="לפרטים נוספים" icon="pi pi-info-circle" className="btn-details" />
                </Link>
                <Button 
                    label={`הוסף לעגלה (${quantity})`} 
                    icon="pi pi-shopping-cart" 
                    className="btn-add-cart"
                    onClick={handleAddToCart}
                    disabled={!product.inStock || quantity === 0}
                />
            </div>
        </div>
    );
};

