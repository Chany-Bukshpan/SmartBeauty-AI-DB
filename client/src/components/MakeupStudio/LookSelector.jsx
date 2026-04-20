export default function LookSelector({ looks, activeIndex, onSelect }) {
  if (!Array.isArray(looks) || looks.length === 0) return null;

  return (
    <div className="sc-studio-looks">
      {looks.map((l, i) => {
        const active = i === activeIndex;
        const score = typeof l?.score === 'number' ? l.score : null;
        return (
          <button
            key={l?.lookName || i}
            type="button"
            className={`sc-look-tab ${active ? 'is-active' : ''}`}
            onClick={() => onSelect?.(i)}
          >
            <div className="sc-look-tab-top">
              <span className="sc-look-name">{l?.lookName || `Look ${i + 1}`}</span>
              {score != null && <span className="sc-look-score">{score}</span>}
            </div>
            <div className="sc-look-desc">{l?.lookDescription || ''}</div>
          </button>
        );
      })}
    </div>
  );
}

