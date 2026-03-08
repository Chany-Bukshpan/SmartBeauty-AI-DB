import { useForm } from "react-hook-form"
import { Login as LoginAPI } from "../api/userService"
import { useDispatch } from "react-redux"
import { userIn } from "../store/slices/userSlice"
import { clearCart, setCart } from "../store/slices/cartSlice"
import { clearOrders, setOrders } from "../store/slices/ordersSlice"
import { loadUserState } from "../store/userStateStorage"
import { useNavigate } from "react-router-dom"
import './Login.css'

// דף התחברות - טופס להתחברות משתמש קיים
export default function Login() {
    // useForm לניהול הטופס וולידציות
    let { register, handleSubmit, formState: { errors } } = useForm()
    let dispatch = useDispatch()
    let navigate = useNavigate()

    // פונקציה לטיפול בהתחברות
    async function handleLogin(data) {
        try {
            // שליחת בקשה לשרת להתחברות
            let res = await LoginAPI(data)
            alert("התחברת בהצלחה")
            dispatch(userIn(res.data))
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
            alert("תקלה בהתחברות: " + (error.response?.data?.message || error.message))
            console.log(error)
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
            </form>
        </div>
    )
}
