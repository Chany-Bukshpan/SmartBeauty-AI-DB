import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './store/store.js'
import './index.css'
import App from './App.jsx'

// PrimeReact CSS
import "primereact/resources/themes/lara-light-indigo/theme.css";  
import "primereact/resources/primereact.min.css";                 
import "primeicons/primeicons.css";

// נקודת הכניסה הראשית של האפליקציה
// Provider - משתף את ה-Redux store עם כל הקומפוננטות
// BrowserRouter - מאפשר ניווט בין דפים

// הוספת store ל-window כדי שניתן יהיה לגשת אליו מ-Console (לבדיקות)
if (typeof window !== 'undefined') {
  window.store = store;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
