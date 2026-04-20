import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Badge } from 'primereact/badge';
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// קומפוננטה קטנה להצגת עגלת קניות - מוצגת ב-header
export const CompactCart = () => {
    const cartItems = useSelector((state) => state.cart.items);
    const navigate = useNavigate();
    const prevTotalRef = useRef(0);
    const [bump, setBump] = useState(false);

    const totalItems = cartItems.reduce((total, item) => total + item.qty, 0);
    const totalAmount = cartItems.reduce((amount, item) => amount + (item.price * item.qty), 0);

    useEffect(() => {
        if (totalItems > prevTotalRef.current && prevTotalRef.current > 0) {
            setBump(true);
            const t = setTimeout(() => setBump(false), 500);
            prevTotalRef.current = totalItems;
            return () => clearTimeout(t);
        }
        prevTotalRef.current = totalItems;
    }, [totalItems]);

    return (
        <div className="compact-cart-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={`cart-icon-wrapper ${bump ? 'cart-bump' : ''}`} style={{ position: 'relative' }}>
                <Button
                    icon="pi pi-shopping-cart" 
                    className="p-button-rounded p-button-text p-button-plain" 
                    aria-label="Cart"
                    onClick={() => navigate('/cart')} 
                />
                {totalItems > 0 && (
                    <Badge value={totalItems} severity="danger" style={{ position: 'absolute', top: '-2px', left: '-2px', right: 'auto' }}></Badge>
                )}
            </div>

            {totalItems > 0 && (
                <div className="cart-info" style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 'bold' }}>₪{totalAmount}</span>
                </div>
            )}
        </div>
    );
};


