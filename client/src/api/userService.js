import axios from "axios"

// כתובת בסיסית לשרת - משתמשים
let baseUrl = "https://final-project-n18z.onrender.com/api/user"

// פונקציה לרישום משתמש חדש
export function SignUp(user) {
    return axios.post(`${baseUrl}/register`, user)
}

// פונקציה להתחברות משתמש קיים
export function Login(credentials) {
    return axios.post(`${baseUrl}/login`, credentials)
}

// פונקציה לקבלת כל המשתמשים (למנהל)
export function GetAllUsers() {
    return axios.get(baseUrl)
}
