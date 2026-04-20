import { useState, useEffect } from 'react';

const STORAGE_KEY = 'makeup_favorites';

function getStoredIds() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    const list = Array.isArray(arr) ? arr : [];
    return list.filter((id) => id != null && id !== '');
  } catch {
    return [];
  }
}

function setStoredIds(ids) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids || []));
  } catch {}
}

export function useFavorites() {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    try {
      setIds(getStoredIds());
    } catch {
      setIds([]);
    }
  }, []);

  const toggle = (productId) => {
    if (productId == null || productId === '') return;
    setIds((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      setStoredIds(next);
      return next;
    });
  };

  const isFavorite = (productId) => productId != null && ids.includes(productId);

  return { ids, toggle, isFavorite };
}

export function FavoriteHeart({ productId, isFavorite, onToggle }) {
  const [bump, setBump] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBump(true);
    onToggle();
    setTimeout(() => setBump(false), 300);
  };

  return (
    <button
      type="button"
      className={`favorite-heart ${isFavorite ? 'favorite-heart--on' : ''} ${bump ? 'favorite-heart--bump' : ''}`}
      onClick={handleClick}
      aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
      title={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
    >
      <span className="favorite-heart-icon">{isFavorite ? '♥' : '♡'}</span>
    </button>
  );
}
