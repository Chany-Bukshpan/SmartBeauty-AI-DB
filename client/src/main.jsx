/**
 * Application entry: Redux, React Router, PrimeReact theme, and a class-based
 * error boundary so runtime errors show a friendly RTL message instead of a blank page.
 */
import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './store/store.js'
import './index.css'
import App from './App.jsx'
import axios from 'axios';
axios.defaults.baseURL = 'https://onrender.com';

import "primereact/resources/themes/lara-light-indigo/theme.css";  
import "primereact/resources/primereact.min.css";                 
import "primeicons/primeicons.css";

class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem', textAlign: 'center', fontFamily: 'Heebo,sans-serif', direction: 'rtl',
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f7f4ef',
        }}>
          <h1 style={{ color: '#5c4033', marginBottom: '1rem' }}>משהו השתבש</h1>
          <p style={{ color: '#6b5d52', marginBottom: '1.5rem' }}>נסי לרענן את הדף (F5)</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '0.75rem 1.5rem', background: '#5c4033', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            רענן דף
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
)
