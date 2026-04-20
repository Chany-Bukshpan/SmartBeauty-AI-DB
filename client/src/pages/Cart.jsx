/**
 * Shopping cart table and optional Smart Basket recommendations (navigate to product details).
 */
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { updateqty, removeItem } from "../store/slices/cartSlice";
import { fetchAllProductsByPages } from "../store/slices/productsSlice";
import { getProductImageCropKind } from "../utils/productImageBottomCrop";
import "../pages/Products.css";
import "./Cart.css";

export const Cart = () => {
    const cartItems = useSelector((state) => state.cart.items);
    const products = useSelector((state) => state.products.items);
    const token = useSelector((state) => state.user.token);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (!products?.length) {
            dispatch(fetchAllProductsByPages());
        }
    }, [dispatch, products?.length]);

    const totalAmount = cartItems.reduce((amount, item) => amount + (item.price * item.qty), 0);

    const smartRecommendations = useMemo(() => {
        if (!products?.length || !cartItems?.length) return [];
        const cartIds = new Set(cartItems.map((i) => i._id));
        const cartCategories = new Map();
        let avgPrice = 0;
        for (const item of cartItems) {
            const cat = item.category || "General";
            cartCategories.set(cat, (cartCategories.get(cat) || 0) + item.qty);
            avgPrice += (item.price || 0) * item.qty;
        }
        const totalQty = cartItems.reduce((s, i) => s + i.qty, 0) || 1;
        avgPrice = avgPrice / totalQty;

        const scored = products
            .filter((p) => !cartIds.has(p._id) && p.inStock)
            .map((p) => {
                const catScore = (cartCategories.get(p.category || "General") || 0) * 2;
                const priceGap = Math.abs((p.price || 0) - avgPrice);
                const priceScore = Math.max(0, 3 - priceGap / 40);
                return { product: p, score: catScore + priceScore };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map((x) => x.product);

        return scored;
    }, [products, cartItems]);

    const smartCardImageWrapClass = (imageUrl) => {
        const cropKind = getProductImageCropKind(imageUrl);
        if (cropKind === "four") return "product-card-image-wrap product-card-image-wrap--crop-bottom--four";
        if (cropKind === "tail12") return "product-card-image-wrap product-card-image-wrap--crop-bottom";
        return "product-card-image-wrap";
    };

    const imageBodyTemplate = (rowData) => {
        return <img src={rowData.imageUrl} alt={rowData.makeupName || rowData.name} className="cart-item-img" />;
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="cart-row-actions">
                <Button icon="pi pi-plus" className="p-button-rounded p-button-sm cart-qty-btn" 
                    onClick={() => dispatch(updateqty({ id: rowData._id, amount: 1 }))} />
                <span className="cart-qty-num">{rowData.qty}</span>
                <Button icon="pi pi-minus" className="p-button-rounded p-button-sm cart-qty-btn" 
                    onClick={() => dispatch(updateqty({ id: rowData._id, amount: -1 }))} 
                    disabled={rowData.qty <= 1} />
                <Button icon="pi pi-trash" className="p-button-rounded p-button-sm cart-remove-btn" 
                    onClick={() => dispatch(removeItem(rowData._id))} title="הסר" />
            </div>
        );
    };
    
    return (
        <div className="cart-page">
            <div className="cart-page-head">
                <h1 className="section-title">העגלה שלי</h1>
                <p className="section-tagline">סיכום המוצרים — עוד רגע וההזמנה אצלך</p>
            </div>
            <Card title="פרטי העגלה">
                <DataTable value={cartItems} emptyMessage="העגלה ריקה." className="cart-table">
                    <Column header="תמונה" body={imageBodyTemplate}></Column>
                    <Column field="makeupName" header="שם מוצר" body={(data) => (
                        <span>
                            {data.makeupName || data.name}
                            {data.selectedColor?.name && <span className="cart-item-color"> — צבע: {data.selectedColor.name}</span>}
                        </span>
                    )}></Column>
                    <Column field="price" header="מחיר ליחידה" body={(data) => `₪${data.price}`}></Column>
                    <Column header="כמות ופעולות" body={actionBodyTemplate}></Column>
                    <Column header="סה״כ" body={(data) => `₪${data.price * data.qty}`}></Column>
                </DataTable>

                <div className="cart-total">
                    <h3>סה״כ לתשלום: ₪{totalAmount}</h3>
                    <div className="cart-total-buttons">
                        <Button label="המשך קנייה" icon="pi pi-arrow-left" className="btn-cart-secondary" 
                            onClick={() => navigate('/products')} />
                        <Button label="אישור הזמנה" icon="pi pi-check" className="btn-cart-primary" 
                            disabled={cartItems.length === 0}
                            onClick={() => navigate(token ? '/checkout' : '/login')} />
                    </div>
                </div>

                {smartRecommendations.length > 0 && (
                    <section className="smart-basket">
                        <h4>Smart Basket - המלצות עבורך</h4>
                        <p className="smart-basket-intro">
                            מבוסס על העגלה והתאמה לקטגוריות ולמחיר. לכל מוצר מוצע יש כפתור ״לפרטים״ לדף
                            המוצר.
                        </p>
                        <div className="smart-basket-grid">
                            {smartRecommendations.map((p) => {
                                const productId = p._id ?? p.id;
                                const name = p.makeupName || p.name;
                                return (
                                    <div key={productId} className="smart-card product-card smart-card--reco">
                                        <div className="smart-card-visual">
                                            <div className={smartCardImageWrapClass(p.imageUrl)}>
                                                <img src={p.imageUrl} alt={name} />
                                            </div>
                                            <div className="smart-card-link-body">
                                                <div className="smart-name">{name}</div>
                                                <div className="smart-meta">
                                                    {p.brand} · ₪{p.price}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="smart-card-actions">
                                            <Button
                                                label="לפרטים"
                                                icon="pi pi-info-circle"
                                                className="p-button-sm smart-card-details-btn"
                                                type="button"
                                                onClick={() => navigate(`/product/${productId}`)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </Card>
        </div>
    );
};

