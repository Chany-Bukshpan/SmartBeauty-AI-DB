import { useState } from 'react'
import './Logo.css'

/** לוגו — תמונה מ־public/logo/logo.png. height (מסרגל) קובע גובה כדי שלא יידרס. */
const LOGO_SRC = '/logo/logo.png'

export default function Logo({ height = 220 }) {
  const [showFallback, setShowFallback] = useState(false)

  return (
    <div className="logo-wrap">
      {!showFallback ? (
        <img
          src={LOGO_SRC}
          alt="לוגו"
          className="logo-img"
          style={{ height: `${height}px`, maxHeight: `${height}px` }}
          onError={() => setShowFallback(true)}
        />
      ) : (
        <span className="logo-placeholder">MakeUp</span>
      )}
    </div>
  )
}
