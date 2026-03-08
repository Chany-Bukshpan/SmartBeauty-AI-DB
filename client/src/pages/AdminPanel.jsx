import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../store/slices/productsSlice';
import { deleteProduct, updateProduct } from '../api/productService';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Card } from 'primereact/card';
import './AdminPanel.css';

// דף ניהול למנהל - עריכת מוצרים, מחיקת מוצרים, הוספת מוצרים (פגינציה כמו בדף המוצרים)
function AdminPanel() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  const { items: products, pagination, loading, error } = useSelector((state) => state.products);
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editForm, setEditForm] = useState({});

  // טעינת מוצרים מהשרת לפי עמוד (כמו בדף המוצרים)
  useEffect(() => {
    dispatch(fetchProducts({ page, limit: 12 }));
  }, [dispatch, page]);

  // בדיקה אם המשתמש הוא מנהל
  if (currentUser?.role !== 'admin') {
    return <div className="admin-panel"><div className="error">אין גישה. מנהלים בלבד.</div></div>;
  }

  if (loading) return <div className="admin-panel"><div className="loading">טוען מוצרים...</div></div>;
  if (error) return <div className="admin-panel"><div className="error">שגיאה: {error}</div></div>;

  // מחיקת מוצר
  const handleDelete = async (productId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את המוצר?')) {
      try {
        await deleteProduct(productId);
        dispatch(fetchProducts({ page, limit: 12 })); // רענון העמוד הנוכחי
        alert('המוצר נמחק בהצלחה');
      } catch (error) {
        alert('שגיאה במחיקת המוצר');
        console.error(error);
      }
    }
  };

  // פתיחת דיאלוג עריכה
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setEditForm({
      makeupName: product.makeupName,
      price: product.price,
      description: product.description || '',
      imageUrl: product.imageUrl,
      brand: product.brand || '',
      category: product.category || '',
      inStock: product.inStock !== false
    });
    setEditDialogVisible(true);
  };

  // שמירת עריכת מוצר
  const handleSaveEdit = async () => {
    try {
      await updateProduct(selectedProduct._id, editForm);
      dispatch(fetchAllProducts()); // רענון הרשימה
      setEditDialogVisible(false);
      setSelectedProduct(null);
      alert('המוצר עודכן בהצלחה');
    } catch (error) {
      alert('שגיאה בעדכון המוצר');
      console.error(error);
    }
  };

  // תבנית תמונה
  const imageBodyTemplate = (rowData) => {
    return (
      <img 
        src={rowData.imageUrl} 
        alt={rowData.makeupName} 
        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} 
      />
    );
  };

  // תבנית פעולות (עריכה ומחיקה)
  const actionsBodyTemplate = (rowData) => {
    return (
      <div className="admin-row-actions">
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-sm admin-btn-edit"
          onClick={() => handleEdit(rowData)}
          tooltip="ערוך"
        />
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-sm admin-btn-delete"
          onClick={() => handleDelete(rowData._id)}
          tooltip="מחק"
        />
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h1 className="section-title">לוח ניהול</h1>
        <p className="section-tagline">עריכת מוצרים, הוספה ומחיקה — שליטה מלאה בחנות</p>
      </div>
      <Card title="ניהול מוצרים">
        <div className="admin-toolbar">
          <Button 
            label="הוסף מוצר חדש" 
            icon="pi pi-plus" 
            className="admin-btn-primary"
            onClick={() => navigate('/add-product')}
          />
          <Button 
            label="ניהול משתמשים" 
            icon="pi pi-users" 
            className="admin-btn-outline"
            onClick={() => navigate('/users')}
          />
        </div>

        <DataTable 
          value={products} 
          className="admin-datatable"
          emptyMessage="אין מוצרים"
        >
          <Column header="תמונה" body={imageBodyTemplate} style={{ width: '80px' }} />
          <Column field="makeupName" header="שם מוצר" sortable />
          <Column field="brand" header="מותג" sortable />
          <Column field="category" header="קטגוריה" sortable />
          <Column 
            field="price" 
            header="מחיר" 
            body={(data) => `₪${data.price}`}
            sortable 
          />
          <Column 
            field="inStock" 
            header="במלאי" 
            body={(data) => data.inStock ? 'כן' : 'לא'}
            sortable 
          />
          <Column header="פעולות" body={actionsBodyTemplate} style={{ width: '120px' }} />
        </DataTable>

        {/* מעבר דפים כמו בדף המוצרים */}
        {pagination?.totalPages > 1 && (
          <div className="admin-pagination">
            <button
              type="button"
              className="pagination-btn"
              disabled={!pagination?.hasPrevPage}
              onClick={() => setPage(p => p - 1)}
            >
              הקודם
            </button>
            <span>
              עמוד {pagination.currentPage} מתוך {pagination.totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={!pagination?.hasNextPage}
              onClick={() => setPage(p => p + 1)}
            >
              הבא
            </button>
          </div>
        )}
      </Card>

      {/* דיאלוג עריכת מוצר */}
      <Dialog
        header="ערוך מוצר"
        visible={editDialogVisible}
        className="admin-edit-dialog"
        style={{ width: '50vw' }}
        onHide={() => setEditDialogVisible(false)}
        footer={
          <div className="admin-dialog-footer">
            <Button label="ביטול" icon="pi pi-times" onClick={() => setEditDialogVisible(false)} className="admin-btn-outline" />
            <Button label="שמור" icon="pi pi-check" onClick={handleSaveEdit} className="admin-btn-primary" />
          </div>
        }
      >
        <div className="admin-edit-form">
          <section className="admin-form-section">
            <h4 className="admin-form-section-title">פרטי מוצר</h4>
            <div className="admin-form-field">
              <label>שם מוצר</label>
              <InputText 
                value={editForm.makeupName} 
                onChange={(e) => setEditForm({...editForm, makeupName: e.target.value})}
                className="admin-form-input"
              />
            </div>
            <div className="admin-form-field">
              <label>תיאור</label>
              <InputTextarea 
                value={editForm.description} 
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={3}
                className="admin-form-input"
              />
            </div>
            <div className="admin-form-field">
              <label>מותג</label>
              <InputText 
                value={editForm.brand} 
                onChange={(e) => setEditForm({...editForm, brand: e.target.value})}
                className="admin-form-input"
              />
            </div>
            <div className="admin-form-field">
              <label>קטגוריה</label>
              <InputText 
                value={editForm.category} 
                onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                className="admin-form-input"
              />
            </div>
          </section>
          <section className="admin-form-section">
            <h4 className="admin-form-section-title">מחיר ומלאי</h4>
            <div className="admin-form-field">
              <label>מחיר (₪)</label>
              <InputNumber 
                value={editForm.price} 
                onValueChange={(e) => setEditForm({...editForm, price: e.value})}
                mode="currency"
                currency="ILS"
                locale="he-IL"
                className="admin-form-input"
              />
            </div>
          </section>
          <section className="admin-form-section">
            <h4 className="admin-form-section-title">תמונה</h4>
            <div className="admin-form-field">
              <label>כתובת תמונה (URL)</label>
              <InputText 
                value={editForm.imageUrl} 
                onChange={(e) => setEditForm({...editForm, imageUrl: e.target.value})}
                className="admin-form-input"
              />
            </div>
          </section>
        </div>
      </Dialog>
    </div>
  );
}

export default AdminPanel;


