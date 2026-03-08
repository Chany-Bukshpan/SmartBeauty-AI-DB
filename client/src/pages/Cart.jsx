import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { updateqty, removeItem } from "../store/slices/cartSlice";
import "./Cart.css";

// דף עגלת קניות - מציג את המוצרים בעגלה
export const Cart = () => {
    const cartItems = useSelector((state) => state.cart.items);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const totalAmount = cartItems.reduce((amount, item) => amount + (item.price * item.qty), 0);

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
                            disabled={cartItems.length === 0} />
                    </div>
                </div>
            </Card>
        </div>
    );
};

