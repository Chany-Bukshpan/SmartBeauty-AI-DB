import { useForm } from "react-hook-form"
import { SignUp } from "../api/userService"
import { useDispatch } from "react-redux"
import { userIn } from "../store/slices/userSlice"
import { clearCart } from "../store/slices/cartSlice"
import { clearOrders } from "../store/slices/ordersSlice"
import { useNavigate } from "react-router-dom"
import './Register.css'

// דף הרשמה - טופס לרישום משתמש חדש
export default function Register() {
    // useForm לניהול הטופס וולידציות
    let { register, handleSubmit, formState: { errors } } = useForm()
    let dispatch = useDispatch()
    let navigate = useNavigate()

    // פונקציה לשמירת משתמש חדש
    async function saveUser(data) {
        try {
            // שליחת בקשה לשרת לרישום
            let res = await SignUp(data)
            alert("הפרטים " + res.data.user.userName + " נשמרו בהצלחה")
            dispatch(clearOrders())
            dispatch(clearCart())
            dispatch(userIn(res.data))
            navigate('/')
        }
        catch (error) {
            alert("תקלה בהרשמה: " + (error.response?.data?.message || error.message))
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
            </form>
        </div>
    )
}

