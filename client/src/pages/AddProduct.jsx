import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom'; 
import { addProduct } from '../api/productService'; 
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber'; 
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button'; 
import { Card } from 'primereact/card'; 
import { classNames } from 'primereact/utils';
import './AddProduct.css'; 

// דף הוספת מוצר חדש - טופס להוספת מוצר למערכת
export const AddProduct = () => {
    const navigate = useNavigate(); 

    const { 
        control,
        handleSubmit, 
        formState: { errors },
        reset 
    } = useForm({
        defaultValues: {
            makeupName: '',
            price: null,
            description: '',
            imageUrl: '',
            brand: '',
            category: ''
        }
    });

    const onSubmit = async (data) => {
        try {
            // המרת הנתונים לפורמט שהשרת מצפה
            const productData = {
                makeupName: data.makeupName,
                price: data.price,
                description: data.description,
                imageUrl: data.imageUrl,
                brand: data.brand || 'Unknown',
                category: data.category || 'General',
                inStock: true
            };
            
            const response = await addProduct(productData);
            
            if (response.status === 200 || response.status === 201) {
                alert("המוצר נוסף בהצלחה"); 
                reset(); 
                navigate('/products'); 
            }
        } catch (error) {
            console.error("Error adding product:", error); 
            alert("אירעה שגיאה. וודאי שיש לך הרשאות מנהל."); 
        }
    };

    return (
        <div className="add-product-page">
            <div className="add-product-head">
                <h1 className="section-title">הוספת מוצר חדש</h1>
                <p className="section-tagline">מלאו את הפרטים והמוצר יופיע בחנות</p>
            </div>
            <Card title="פרטי המוצר" className="add-product-card">
                <form onSubmit={handleSubmit(onSubmit)} className="add-product-form">
                    <section className="add-product-section">
                        <h4 className="add-product-section-title">פרטי מוצר</h4>
                        <div className="add-product-field">
                            <label htmlFor="makeupName">שם מוצר</label>
                            <Controller
                                name="makeupName" 
                                control={control} 
                                rules={{ required: 'חובה להזין שם מוצר' }} 
                                render={({ field }) => (
                                    <InputText id={field.name} {...field} className={classNames('add-product-input', { 'p-invalid': errors.makeupName })} placeholder="שם המוצר" />
                                )}
                            />
                            {errors.makeupName && <small className="add-product-error">{errors.makeupName.message}</small>}
                        </div>
                        <div className="add-product-field">
                            <label htmlFor="description">תיאור</label>
                            <Controller
                                name="description"
                                control={control}
                                rules={{ required: 'חובה להזין תיאור' }}
                                render={({ field }) => (
                                    <InputTextarea id={field.name} {...field} rows={3} className={classNames('add-product-input', { 'p-invalid': errors.description })} placeholder="תיאור המוצר" />
                                )}
                            />
                            {errors.description && <small className="add-product-error">{errors.description.message}</small>}
                        </div>
                        <div className="add-product-field">
                            <label htmlFor="brand">מותג</label>
                            <Controller
                                name="brand"
                                control={control}
                                render={({ field }) => (
                                    <InputText id={field.name} {...field} className="add-product-input" placeholder="שם המותג" />
                                )}
                            />
                        </div>
                        <div className="add-product-field">
                            <label htmlFor="category">קטגוריה</label>
                            <Controller
                                name="category"
                                control={control}
                                render={({ field }) => (
                                    <InputText id={field.name} {...field} className="add-product-input" placeholder="למשל: שפתיים, עיניים" />
                                )}
                            />
                        </div>
                    </section>
                    <section className="add-product-section">
                        <h4 className="add-product-section-title">מחיר</h4>
                        <div className="add-product-field">
                            <label htmlFor="price">מחיר (₪)</label>
                            <Controller
                                name="price"
                                control={control}
                                rules={{ required: 'חובה להזין מחיר', min: { value: 1, message: 'המחיר חייב להיות מעל 0' } }}
                                render={({ field }) => (
                                    <InputNumber 
                                        id={field.name} 
                                        value={field.value} 
                                        onValueChange={(e) => field.onChange(e.value)} 
                                        mode="currency"
                                        currency="ILS" 
                                        locale="he-IL" 
                                        className={classNames('add-product-input', { 'p-invalid': errors.price })} 
                                    />
                                )}
                            />
                            {errors.price && <small className="add-product-error">{errors.price.message}</small>}
                        </div>
                    </section>
                    <section className="add-product-section">
                        <h4 className="add-product-section-title">תמונה</h4>
                        <div className="add-product-field">
                            <label htmlFor="imageUrl">כתובת תמונה (URL)</label>
                            <Controller
                                name="imageUrl"
                                control={control}
                                rules={{ required: 'חובה להזין כתובת תמונה' }}
                                render={({ field }) => (
                                    <InputText id={field.name} {...field} placeholder="https://..." className={classNames('add-product-input', { 'p-invalid': errors.imageUrl })} />
                                )}
                            />
                            {errors.imageUrl && <small className="add-product-error">{errors.imageUrl.message}</small>}
                        </div>
                    </section>
                    <Button type="submit" label="הוסף מוצר" icon="pi pi-check" className="btn-add-product" />
                </form>
            </Card>
        </div>
    );
}


