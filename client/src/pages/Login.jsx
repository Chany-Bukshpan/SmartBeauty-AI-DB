/**
 * Login + password reset wizard; Google sign-in syncs app session via syncFirebaseUserToApp.
 */
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Login as LoginAPI } from "../api/userService"
import { useDispatch } from "react-redux"
import { userIn } from "../store/slices/userSlice"
import { clearCart, setCart } from "../store/slices/cartSlice"
import { clearOrders, setOrders } from "../store/slices/ordersSlice"
import { loadUserState } from "../store/userStateStorage"
import { Link, useNavigate } from "react-router-dom"
import { loginWithGooglePreferred } from "../firebase/firebaseAuthService"
import { syncFirebaseUserToApp } from "../auth/syncFirebaseUserToApp"
import { toastDetailForFirebaseGoogleError } from "../auth/firebaseGoogleHelp"
import { Dialog } from "primereact/dialog"
import { InputText } from "primereact/inputtext"
import { Button } from "primereact/button"
import './Login.css'
import { requestPasswordReset, verifyPasswordResetCode, resetPasswordWithToken } from "../api/userService"

export default function Login() {
    let { register, handleSubmit, formState: { errors } } = useForm()
    let dispatch = useDispatch()
    let navigate = useNavigate()
    const [resetDialogVisible, setResetDialogVisible] = useState(false)
    const [resetEmail, setResetEmail] = useState("")
    const [resetLoading, setResetLoading] = useState(false)
    const [resetStep, setResetStep] = useState("email")
    const [resetCode, setResetCode] = useState("")
    const [resetToken, setResetToken] = useState("")
    const [resetNewPassword, setResetNewPassword] = useState("")
    const [resetNewPassword2, setResetNewPassword2] = useState("")

    async function handleLogin(data) {
        try {
            const payload = {
                ...data,
                email: data?.email != null ? String(data.email).trim().toLowerCase() : data?.email,
            }
            let res = await LoginAPI(payload)
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'success', summary: 'ברוכה הבאה', detail: 'התחברת בהצלחה', life: 2600 }
            }))
            dispatch(userIn(res.data))
            try {
                if (res.data?.token) localStorage.setItem('token', res.data.token)
                if (res.data?.user) localStorage.setItem('user', JSON.stringify(res.data.user))
            } catch {}
            const userId = res.data.user?._id
            const saved = userId ? loadUserState(userId) : null
            if (saved) {
                dispatch(setCart(saved.cart || []))
                dispatch(setOrders(saved.orders || []))
            } else {
                dispatch(clearOrders())
                dispatch(clearCart())
            }
            navigate('/')
        }
        catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: {
                    severity: 'error',
                    summary: 'התחברות נכשלה',
                    detail: "תקלה בהתחברות: " + (error.response?.data?.message || error.message),
                    life: 3600
                }
            }))
            console.log(error)
        }
    }

    async function handleGoogleLogin() {
        try {
            const firebaseUser = await loginWithGooglePreferred()
            if (!firebaseUser) return
            await syncFirebaseUserToApp(firebaseUser, dispatch)
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'success', summary: 'Google התחברות', detail: 'התחברת בהצלחה עם Google', life: 2600 }
            }))
            navigate('/')
        } catch (error) {
            const code = error?.code || error?.response?.data?.code || ""
            if (
                code === "auth/cancelled-popup-request" ||
                code === "auth/popup-closed-by-user"
            ) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { severity: 'info', summary: 'התחברות בוטלה', detail: 'סגרת את חלון Google לפני השלמת ההתחברות.', life: 2600 }
                }))
                return
            }
            if (code === "auth/unauthorized-domain" || code === "auth/operation-not-allowed") {
                const detail =
                    toastDetailForFirebaseGoogleError(code) ||
                    "בדקי ש-Google Sign-In מופעל ב-Firebase ושהדומיין מאושר."
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: {
                        severity: 'warn',
                        summary:
                            code === "auth/unauthorized-domain"
                                ? 'דומיין לא מאושר ב-Firebase'
                                : 'Google לא מופעל ב-Firebase',
                        detail,
                        life: 8000,
                    },
                }))
                return
            }
            const msg = error.response?.data?.message || error.message || "שגיאה"
            const extra = code && !String(msg).includes(code) ? ` (${code})` : ""
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: {
                    severity: 'error',
                    summary: 'Google התחברות נכשלה',
                    detail: "תקלה בהתחברות עם Google: " + msg + extra,
                    life: 3600
                }
            }))
            console.log(error)
        }
    }

    async function handleForgotPassword() {
        setResetStep("email")
        setResetCode("")
        setResetToken("")
        setResetNewPassword("")
        setResetNewPassword2("")
        setResetDialogVisible(true)
    }

    async function submitResetEmail() {
        const email = resetEmail.trim()
        if (!email) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'warn', summary: 'איפוס סיסמה', detail: 'נא להזין כתובת מייל.', life: 2600 }
            }))
            return
        }
        try {
            setResetLoading(true)
            await requestPasswordReset({ email })
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'success', summary: 'איפוס סיסמה', detail: 'נשלח קוד אימות למייל (6 ספרות).', life: 3200 }
            }))
            setResetStep("code")
        } catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: {
                    severity: 'error',
                    summary: 'איפוס סיסמה נכשל',
                    detail: error.response?.data?.message || error.message || "שגיאה",
                    life: 3600
                }
            }))
            console.log(error)
        } finally {
            setResetLoading(false)
        }
    }

    async function submitVerifyCode() {
        const email = resetEmail.trim()
        const code = String(resetCode || "").trim()

        if (!email) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'warn', summary: 'איפוס סיסמה', detail: 'נא להזין כתובת מייל.', life: 2600 }
            }))
            return
        }
        if (!/^\d{6}$/.test(code)) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'warn', summary: 'איפוס סיסמה', detail: 'נא להזין קוד של 6 ספרות.', life: 2600 }
            }))
            return
        }

        try {
            setResetLoading(true)
            const res = await verifyPasswordResetCode({ email, code })
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'success', summary: 'אימות קוד', detail: 'הקוד אומת. אפשר לבחור סיסמה חדשה.', life: 3200 }
            }))
            setResetToken(res?.data?.resetToken || "")
            setResetStep("password")
        } catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: {
                    severity: 'error',
                    summary: 'אימות קוד נכשל',
                    detail: error.response?.data?.message || error.message || "שגיאה",
                    life: 3600
                }
            }))
            console.log(error)
        } finally {
            setResetLoading(false)
        }
    }

    async function submitSetNewPassword() {
        const email = resetEmail.trim()
        const pw1 = resetNewPassword
        const pw2 = resetNewPassword2

        if (!email) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'warn', summary: 'איפוס סיסמה', detail: 'נא להזין כתובת מייל.', life: 2600 }
            }))
            return
        }
        if (!resetToken) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'warn', summary: 'איפוס סיסמה', detail: 'האימות לא תקף. בקשי קוד חדש.', life: 2600 }
            }))
            setResetStep("email")
            return
        }
        if (!pw1 || pw1.length < 6) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'warn', summary: 'איפוס סיסמה', detail: 'נא להזין סיסמה חדשה (לפחות 6 תווים).', life: 2600 }
            }))
            return
        }
        if (pw1 !== pw2) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'warn', summary: 'איפוס סיסמה', detail: 'שתי הסיסמאות לא תואמות.', life: 2600 }
            }))
            return
        }

        try {
            setResetLoading(true)
            await resetPasswordWithToken({ email, resetToken, newPassword: pw1 })
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'success', summary: 'איפוס סיסמה הצליח', detail: 'הסיסמה עודכנה בהצלחה.', life: 3200 }
            }))
            setResetDialogVisible(false)
            setResetEmail("")
            setResetStep("email")
            setResetCode("")
            setResetToken("")
            setResetNewPassword("")
            setResetNewPassword2("")
        } catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: {
                    severity: 'error',
                    summary: 'איפוס סיסמה נכשל',
                    detail: error.response?.data?.message || error.message || "שגיאה",
                    life: 3600
                }
            }))
            console.log(error)
        } finally {
            setResetLoading(false)
        }
    }

    return (
        <div className="login login-enter">
            <h1 className="section-title">התחברות</h1>
            <p className="section-tagline">היכנס לחשבון והמשך לקנות בנוחות</p>
            <form className="form-login" onSubmit={handleSubmit(handleLogin)}>
                <label>מייל</label>
                <input 
                    type="email" 
                    {...register("email", { 
                        required: { value: true, message: "חובה להזין מייל" } 
                    })} 
                />
                {/* הצגת שגיאת ולידציה אם יש */}
                {errors.email && <span className="error">{errors.email.message}</span>}
                
                <label>סיסמא</label>
                <input 
                    type="password" 
                    {...register("password", { 
                        required: { value: true, message: "חובה להזין סיסמא" } 
                    })} 
                />
                {errors.password && <span className="error">{errors.password.message}</span>}
                
                <input type="submit" value="התחבר" />
                <button type="button" className="auth-google-btn" onClick={handleGoogleLogin}>
                    התחברות עם Google
                </button>
                <p className="auth-helper-line">
                    אין לך חשבון? <Link to="/register">להרשמה</Link>
                </p>
                <p className="auth-helper-line auth-helper-line--minor">
                    <button type="button" className="auth-inline-link" onClick={handleForgotPassword}>
                        שכחת סיסמה?
                    </button>
                </p>
            </form>

            <Dialog
                header="איפוס סיסמה"
                visible={resetDialogVisible}
                onHide={() => setResetDialogVisible(false)}
                style={{ width: 'min(92vw, 420px)' }}
                className="login-reset-dialog"
                draggable={false}
                resizable={false}
                modal
                footer={
                    <div className="reset-dialog-actions">
                        <Button
                            label="ביטול"
                            className="p-button-text reset-btn-cancel"
                            onClick={() => setResetDialogVisible(false)}
                            disabled={resetLoading}
                        />
                        {resetStep === "email" ? (
                            <Button
                                label={resetLoading ? "שולח..." : "שלח קוד"}
                                icon="pi pi-send"
                                className="reset-btn-send"
                                onClick={submitResetEmail}
                                loading={resetLoading}
                            />
                        ) : resetStep === "code" ? (
                            <Button
                                label={resetLoading ? "מאמת..." : "המשך"}
                                icon="pi pi-arrow-left"
                                className="reset-btn-send"
                                onClick={submitVerifyCode}
                                loading={resetLoading}
                            />
                        ) : (
                            <Button
                                label={resetLoading ? "מעדכן..." : "עדכן סיסמה"}
                                icon="pi pi-check"
                                className="reset-btn-send"
                                onClick={submitSetNewPassword}
                                loading={resetLoading}
                            />
                        )}
                    </div>
                }
            >
                <div className="reset-dialog-body">
                    {resetStep === "email" ? (
                        <>
                            <p>הזיני כתובת מייל ונשלח אלייך קוד אימות (6 ספרות) לאיפוס סיסמה.</p>
                            <InputText
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full"
                            />
                        </>
                    ) : resetStep === "code" ? (
                        <>
                            <p>בדקי במייל וקחי את קוד האימות (6 ספרות).</p>
                            <div style={{ display: "grid", gap: "0.75rem" }}>
                                <InputText
                                    inputMode="numeric"
                                    value={resetCode}
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, "").slice(0, 6)
                                        setResetCode(v)
                                    }}
                                    placeholder="123456"
                                    className="w-full"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <p>בחרי סיסמה חדשה.</p>
                            <div style={{ display: "grid", gap: "0.75rem" }}>
                                <InputText
                                    type="password"
                                    value={resetNewPassword}
                                    onChange={(e) => setResetNewPassword(e.target.value)}
                                    placeholder="סיסמה חדשה"
                                    className="w-full"
                                />
                                <InputText
                                    type="password"
                                    value={resetNewPassword2}
                                    onChange={(e) => setResetNewPassword2(e.target.value)}
                                    placeholder="אימות סיסמה חדשה"
                                    className="w-full"
                                />
                            </div>
                        </>
                    )}
                </div>
            </Dialog>
        </div>
    )
}
