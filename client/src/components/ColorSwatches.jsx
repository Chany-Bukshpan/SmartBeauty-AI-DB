import { useRef } from 'react';
import './ColorSwatches.css';

/**
 * עיגולי צבעים למוצר — גלילה ימינה/שמאלה, לחיצה בוחרת צבע.
 * compact: ברשימת מוצרים (רק עיגולים).
 * !compact: בדף פרטי מוצר (עיגול + שם הצבע מתחת).
 */
export function ColorSwatches({ colors, selectedIndex = 0, onSelect, compact = true }) {
  const scrollRef = useRef(null);

  if (!colors || colors.length === 0) return null;

  return (
    <div className="color-swatches-wrap">
      <div
        ref={scrollRef}
        className={`color-swatches-scroll ${compact ? 'compact' : 'detailed'}`}
        role="listbox"
        aria-label="בחירת צבע"
      >
        {colors.map((c, i) => (
          <button
            key={i}
            type="button"
            role="option"
            aria-selected={i === selectedIndex}
            aria-label={c.name ? `צבע ${c.name}` : `צבע ${i + 1}`}
            className={`color-swatch ${i === selectedIndex ? 'selected' : ''}`}
            onClick={() => onSelect(i)}
          >
            <span className="color-swatch-circle" style={{ backgroundColor: c.hex || '#ccc' }} />
            {!compact && c.name && (
              <span className="color-swatch-name">{c.name}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
