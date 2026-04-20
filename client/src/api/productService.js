/**
 * HTTP helpers for /api/product — CRUD used by catalog and admin.
 */
import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
let baseUrl = API_BASE ? `${API_BASE}/api/product` : "/api/product";

export function getAllProductsFromServer(limit, page) {
    let url = baseUrl;
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

export function getProductById(id) {
    return axios.get(`${baseUrl}/${id}`)
}

export function addProduct(product) {
    return axios.post(baseUrl, product)
}

export function updateProduct(id, product) {
    return axios.put(`${baseUrl}/${id}`, product)
}

export function deleteProduct(id) {
    return axios.delete(`${baseUrl}/${id}`)
}
