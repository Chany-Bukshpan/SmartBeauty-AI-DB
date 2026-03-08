import axios from "axios";

// כתובת בסיסית לשרת - מוצרים
let baseUrl = "https://final-project-n18z.onrender.com/api/product"

// פונקציה לקבלת כל המוצרים מהשרת עם pagination
export function getAllProductsFromServer(limit, page) {
    let url = baseUrl;
    // בניית URL עם פרמטרים של pagination
    if (limit || page)
        url += "?";
    if (limit)
        url += "limit=" + limit;
    if (limit && page)
        url += "&";
    if (page)
        url += "page=" + page;
    return axios.get(url)
}

// פונקציה לקבלת מוצר לפי ID
export function getProductById(id) {
    return axios.get(`${baseUrl}/${id}`)
}

// פונקציה להוספת מוצר חדש
export function addProduct(product) {
    return axios.post(baseUrl, product)
}

// פונקציה לעדכון מוצר קיים
export function updateProduct(id, product) {
    return axios.put(`${baseUrl}/${id}`, product)
}

// פונקציה למחיקת מוצר
export function deleteProduct(id) {
    return axios.delete(`${baseUrl}/${id}`)
}
