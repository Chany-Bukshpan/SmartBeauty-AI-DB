/**
 * Email/password registration and optional Google sign-up path.
 */
import { useForm } from "react-hook-form"
import { SignUp } from "../api/userService"
import { useDispatch } from "react-redux"
import { userIn } from "../store/slices/userSlice"
import { clearCart } from "../store/slices/cartSlice"
import { clearOrders } from "../store/slices/ordersSlice"
import { Link, useNavigate } from "react-router-dom"
import { loginWithGooglePreferred, registerFirebaseEmail } from "../firebase/firebaseAuthService"
import { syncFirebaseUserToApp } from "../auth/syncFirebaseUserToApp"
import { toastDetailForFirebaseGoogleError } from "../auth/firebaseGoogleHelp"
import './Register.css'

export default function Register() {
    let { register, handleSubmit, formState: { errors } } = useForm()
    let dispatch = useDispatch()
    let navigate = useNavigate()

    async function saveUser(data) {
        try {
            const payload = {
                ...data,
                email: data?.email != null ? String(data.email).trim().toLowerCase() : data?.email,
            }
            let res = await SignUp(payload)
            try {
                await registerFirebaseEmail(payload.email, data.password)
            } catch {
            }
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: {
                    severity: 'success',
                    summary: 'הרשמה הושלמה',
                    detail: "הפרטים " + res.data.user.userName + " נשמרו בהצלחה",
                    life: 3000
                }
            }))
            dispatch(clearOrders())
            dispatch(clearCart())
            dispatch(userIn(res.data))
            try {
                if (res.data?.token) localStorage.setItem('token', res.data.token)
                if (res.data?.user) localStorage.setItem('user', JSON.stringify(res.data.user))
            } catch {}
            navigate('/')
        }
        catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: {
                    severity: 'error',
                    summary: 'הרשמה נכשלה',
                    detail: "תקלה בהרשמה: " + (error.response?.data?.message || error.message),
                    life: 3600
                }
            }))
            console.log(error)
        }
    }

    async function handleGoogleRegister() {
        try {
            const firebaseUser = await loginWithGooglePreferred()
            if (!firebaseUser) return
            await syncFirebaseUserToApp(firebaseUser, dispatch)
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { severity: 'success', summary: 'Google התחברות', detail: 'נכנסת בהצלחה עם Google', life: 2600 }
            }))
            navigate('/')
        } catch (error) {
            const code = error?.code || error?.response?.data?.code || ""
            if (
                code === "auth/cancelled-popup-request" ||
                code === "auth/popup-closed-by-user"
            ) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { severity: 'info', summary: 'Google', detail: 'סגרת את חלון Google לפני השלמת הפעולה.', life: 2600 }
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
                    summary: 'Google נכשל',
                    detail: "תקלה בהתחברות עם Google: " + msg + extra,
                    life: 3600
                }
            }))
            console.log(error)
        }
    }

    return (
        <div className="register register-enter">
            <h1 className="section-title">הרשמה</h1>
            <p className="section-tagline">צרו חשבון והתחילו ליהנות ממבצעים ומשלוחים</p>
            <form className="form-register" onSubmit={handleSubmit(saveUser)}>
                <label>שם משתמש</label>
                <input 
                    type="text" 
                    {...register("userName", { 
                        required: { value: true, message: "חובה להזין שם משתמש" } 
                    })} 
                />
                {/* הצגת שגיאת ולידציה אם יש */}
                {errors.userName && <span className="error">{errors.userName.message}</span>}
                
                <label>מייל</label>
                <input 
                    type="email" 
                    {...register("email", { 
                        required: { value: true, message: "חובה להזין מייל" } 
                    })} 
                />
                {errors.email && <span className="error">{errors.email.message}</span>}
                
                <label>סיסמא</label>
                <input 
                    type="password" 
                    {...register("password", { 
                        required: { value: true, message: "חובה להזין סיסמא" },
                        minLength: { value: 6, message: "סיסמא חייבת להכיל לפחות 6 תווים" }
                    })} 
                />
                {errors.password && <span className="error">{errors.password.message}</span>}
                
                <input type="submit" value="הירשם" />
                <button type="button" className="register-google-btn" onClick={handleGoogleRegister}>
                    הרשמה / התחברות עם Google
                </button>
                <p className="auth-helper-line">
                    כבר יש לך חשבון? <Link to="/login">להתחברות</Link>
                </p>
            </form>
        </div>
    )
}

