/**
 * HTTP helpers for /api/user — auth, password reset, contact form, admin user list.
 * Base URL from VITE_API_BASE_URL or same-origin /api in dev proxy.
 */
import axios from "axios"

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
let baseUrl = API_BASE ? `${API_BASE}/api/user` : "/api/user";

export function SignUp(user) {
    return axios.post(`${baseUrl}/register`, user)
}

export function Login(credentials) {
    return axios.post(`${baseUrl}/login`, credentials)
}

export function FirebaseLogin(payload) {
    return axios.post(`${baseUrl}/firebase-login`, payload)
}

export function requestPasswordReset(payload) {
    return axios.post(`${baseUrl}/request-password-reset`, payload)
}

export function confirmPasswordReset(payload) {
    return axios.post(`${baseUrl}/confirm-password-reset`, payload)
}

export function verifyPasswordResetCode(payload) {
    return axios.post(`${baseUrl}/verify-password-reset-code`, payload)
}

export function resetPasswordWithToken(payload) {
    return axios.post(`${baseUrl}/reset-password-with-token`, payload)
}

export function sendContactUs(payload) {
    return axios.post(`${baseUrl}/contact-us`, payload)
}

export function GetAllUsers() {
    return axios.get(baseUrl)
}
