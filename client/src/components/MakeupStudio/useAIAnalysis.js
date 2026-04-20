import { useCallback, useMemo, useState } from 'react';
import axios from 'axios';

const ANALYZE_MAX_EDGE = 860;
const ANALYZE_JPEG_QUALITY = 0.86;

function resizeImageToJpegDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: width, naturalHeight: height } = img;
      if (!width || !height) return reject(new Error('Invalid image'));
      const maxEdge = Math.max(width, height);
      const scale = maxEdge > ANALYZE_MAX_EDGE ? ANALYZE_MAX_EDGE / maxEdge : 1;
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', ANALYZE_JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

async function readFileAsDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function humanize(err) {
  const data = err?.response?.data;
  const serverMsg = data?.error;
  const details = data?.details;
  if (serverMsg && details) return `${serverMsg}\n${details}`;
  if (serverMsg) return String(serverMsg);
  return err?.message || 'שגיאה';
}

function toCatalogProduct(p) {
  const colors = Array.isArray(p?.colors)
    ? p.colors
        .map((c) => ({
          id: c?.id ?? null,
          name: c?.name ?? '',
          hex: c?.hex || c?.hexCode || '',
          hexCode: c?.hexCode || c?.hex || '',
        }))
        .filter((c) => c.hex || c.hexCode)
    : [];
  return {
    _id: p?._id,
    name: p?.makeupName || p?.name || '',
    category: p?.category || '',
    brand: p?.brand || '',
    price: p?.price || p?.makeupPrice || null,
    imageUrl: p?.imageUrl || p?.img || p?.image || '',
    colors,
  };
}

function normHex(hex) {
  const v = String(hex || '').trim();
  if (!v) return '';
  return v.startsWith('#') ? v.toLowerCase() : `#${v}`.toLowerCase();
}

function hexToRgb(hex) {
  const h = normHex(hex).slice(1);
  if (![3, 6].includes(h.length)) return null;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function distHex(a, b) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return Number.POSITIVE_INFINITY;
  const dr = ra.r - rb.r;
  const dg = ra.g - rb.g;
  const db = ra.b - rb.b;
  return dr * dr + dg * dg + db * db;
}

function inferSlot(product) {
  const cat = String(product?.category || '').toLowerCase();
  const name = String(product?.name || product?.makeupName || '').toLowerCase();
  const hay = `${cat} ${name}`;
  if (/lip|אודם|שפת|ליפסטיק|גלוס/.test(hay)) return 'lipstick';
  if (/blush|סומק/.test(hay)) return 'blush';
  if (/eyeliner|אייליינר/.test(hay)) return 'eyeliner';
  if (/shadow|eyeshadow|צללית/.test(hay)) return 'eyeshadow';
  if (/maskara|mascara|מסקרה|lashes|ריס/.test(hay)) return 'mascara';
  if (/foundation|מייקאפ|פאונדיישן|בסיס|face/.test(hay)) return 'foundation';
  return null;
}

function getColorHex(product) {
  const c0 = product?.colors?.[0];
  return normHex(c0?.hex || c0?.hexCode || product?.hex || product?.hexCode || '');
}

function getBestColorForProduct(product, targetHex) {
  const colors = Array.isArray(product?.colors) ? product.colors : [];
  if (!colors.length) return { hex: getColorHex(product), name: '' };
  if (!targetHex) {
    const c0 = colors[0];
    return { hex: normHex(c0?.hex || c0?.hexCode), name: c0?.name || '' };
  }
  let best = colors[0];
  let bestD = distHex(normHex(colors[0]?.hex || colors[0]?.hexCode), targetHex);
  for (let i = 1; i < colors.length; i++) {
    const c = colors[i];
    const d = distHex(normHex(c?.hex || c?.hexCode), targetHex);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return { hex: normHex(best?.hex || best?.hexCode), name: best?.name || '' };
}

function pickBestProduct(candidates, targetHex, usedSet) {
  const filtered = (candidates || []).filter((p) => !usedSet.has(String(p._id)));
  if (!filtered.length) return null;
  if (!targetHex) return filtered[0];
  let best = filtered[0];
  let bestD = distHex(getColorHex(best), targetHex);
  for (let i = 1; i < filtered.length; i++) {
    const d = distHex(getColorHex(filtered[i]), targetHex);
    if (d < bestD) {
      bestD = d;
      best = filtered[i];
    }
  }
  return best;
}

function buildLooksLocal(analysis, products) {
  const grouped = {
    foundation: [],
    eyeliner: [],
    mascara: [],
    lipstick: [],
    blush: [],
    eyeshadow: [],
  };

  for (const raw of products || []) {
    const p = toCatalogProduct(raw);
    const slot = inferSlot(p);
    if (!slot || !grouped[slot]) continue;
    grouped[slot].push(p);
  }

  const rc = analysis?.recommended_colors || {};
  const lips = rc?.lipstick?.map((x) => normHex(x?.hex)).filter(Boolean) || [];
  const blushes = rc?.blush?.map((x) => normHex(x?.hex)).filter(Boolean) || [];
  const shadows = rc?.eyeshadow?.map((x) => normHex(x?.hex)).filter(Boolean) || [];

  const lookNames = ['Natural Glow', 'Soft Glam', 'Evening Chic'];
  const lookDescriptions = ['מראה יומיומי טבעי', 'זוהר עדין לאירוע', 'מראה ערב מודגש'];

  const looks = [];
  for (let i = 0; i < 3; i++) {
    const used = new Set();
    const pick = (slot, targetHex, reason) => {
      const p = pickBestProduct(grouped[slot], targetHex, used);
      if (!p) return null;
      used.add(String(p._id));
      const selected = getBestColorForProduct(p, targetHex);
      return {
        productId: String(p._id),
        reason,
        selectedHex: selected.hex || '',
        selectedColorName: selected.name || '',
      };
    };

    const lipstickHex = lips[i % Math.max(1, lips.length)] || '';
    const blushHex = blushes[i % Math.max(1, blushes.length)] || '';
    const shadowHex = shadows[i % Math.max(1, shadows.length)] || '';

    const productsObj = {
      foundation: pick('foundation', '', 'נבחר להתאמה עדינה לגוון העור.'),
      eyeliner: pick('eyeliner', '', 'מדגיש את קו העין בצורה מחמיאה.'),
      mascara: pick('mascara', '', 'פותח את המבט ומחזק את נוכחות העיניים.'),
      lipstick: pick('lipstick', lipstickHex, 'נבחר לפי התאמה לתת-גוון ולמראה הכללי.'),
      blush: pick('blush', blushHex, 'מוסיף חיות טבעית ללחיים.'),
      eyeshadow: pick('eyeshadow', shadowHex, 'גוון צללית שמדגיש את צבע העיניים.'),
    };

    looks.push({
      lookName: lookNames[i],
      lookDescription: lookDescriptions[i],
      score: Math.max(75, 95 - i * 7),
      products: productsObj,
    });
  }
  return looks;
}

export function useAIAnalysis({ products }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | analyzing | recommending | ready | error
  const [progressText, setProgressText] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [faceAnalysis, setFaceAnalysis] = useState(null);
  const [looks, setLooks] = useState([]);
  const [error, setError] = useState('');

  const apiUserFacing = useMemo(() => {
    const base = (import.meta.env.VITE_API_BASE_URL || '').trim();
    return base ? `${base}/api` : '/api';
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgressText('');
    setImageSrc('');
    setImageDataUrl('');
    setFaceAnalysis(null);
    setLooks([]);
    setError('');
  }, []);

  const analyzeAndRecommend = useCallback(
    async (dataUrl) => {
      setError('');
      setLooks([]);
      setFaceAnalysis(null);
      setStatus('analyzing');
      setProgressText('מנתחת פנים... 🔍');
      try {
        const cleanedDataUrl = await resizeImageToJpegDataUrl(dataUrl);
        const analyzeRes = await axios.post(`${apiUserFacing}/analyze-face`, { imageBase64: cleanedDataUrl });
        const analysis = analyzeRes.data;
        setFaceAnalysis(analysis);
        setStatus('recommending');
        setProgressText('בוחרת צבעים... 💄');
        const normalized = buildLooksLocal(analysis, products || []);
        setLooks(normalized);
        setStatus('ready');
        setProgressText('מוכן ✨');
      } catch (e) {
        setStatus('error');
        setProgressText('');
        setError(humanize(e));
      }
    },
    [apiUserFacing, products]
  );

  const handleFile = useCallback(
    async (file) => {
      setStatus('uploading');
      setProgressText('');
      setError('');
      const raw = await readFileAsDataUrl(file);
      const dataUrl = String(raw);
      setImageSrc(dataUrl);
      setImageDataUrl(dataUrl);
      await analyzeAndRecommend(dataUrl);
    },
    [analyzeAndRecommend]
  );

  return {
    status,
    progressText,
    imageSrc,
    imageDataUrl,
    faceAnalysis,
    looks,
    error,
    reset,
    handleFile,
    analyzeAndRecommend,
    setImageSrc,
    setImageDataUrl,
  };
}

