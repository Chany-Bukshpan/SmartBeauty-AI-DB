import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllProducts } from '../store/slices/productsSlice';
import { ProductCard } from '../components/ProductCard';
import './Products.css';

// דף רשימת מוצרים - מציג את כל המוצרים
export const ProductList = () => {
    const dispatch = useDispatch();
    
    const products = useSelector((state) => state.products.items) || [];

    useEffect(() => {
        dispatch(fetchAllProducts());
    }, [dispatch]);

    return (
        <div className='list-container'>
            {products.length > 0 ? (
                products.map((item) => (
                    <ProductCard key={item._id || item.id} product={item} />
                ))
            ) : (
                <p>טוען מוצרים...</p>
            )}
        </div>
    );
}


