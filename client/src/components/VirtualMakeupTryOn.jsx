import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import FaceAnalysisPanel from './FaceAnalysisPanel';
import ColorRecommendations from './ColorRecommendations';
import TryOnCanvas from './TryOnCanvas';

function stripDataUrlPrefix(dataUrl) {
  if (typeof dataUrl !== 'string') return '';
  const commaIdx = dataUrl.indexOf(',');
  return commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
}

const ANALYZE_MAX_EDGE = 720;
const ANALYZE_JPEG_QUALITY = 0.82;

function resizeImageToJpegDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: width, naturalHeight: height } = img;
      if (!width || !height) {
        reject(new Error('Invalid image'));
        return;
      }
      const maxEdge = Math.max(width, height);
      const scale = maxEdge > ANALYZE_MAX_EDGE ? ANALYZE_MAX_EDGE / maxEdge : 1;
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas'));
        return;
      }
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

function humanizeAnalyzeError(err) {
  const data = err?.response?.data;
  const status = err?.response?.status;
  const serverMsg = data?.error;
  const details = data?.details;

  if (serverMsg === 'GEMINI_RATE_LIMIT' && typeof details === 'string') {
    return `${details}\n\nטיפ: הוסיפי בשרת OPENAI_API_KEY (מ-platform.openai.com) — ברירת המחדל היא לנסות OpenAI לפני Gemini.`;
  }
  if (status === 429) {
    const base =
      typeof details === 'string'
        ? details
        : 'חרגת ממכסת הבקשות. נסי שוב בעוד כמה דקות.';
    return `${base}\n\n(מגבלת Gemini/Google — לא קשור לסימולציית האיפור בדפדפן.)`;
  }

  if (serverMsg === 'Missing ANTHROPIC_API_KEY on server.') {
    return 'נדרש מפתח API בשרת.';
  }
  if (serverMsg === 'Face analysis failed.' || serverMsg === 'Claude returned an unparsable response.') {
    return 'ניתוח התמונה נכשל. נסי תמונה אחרת.';
  }
  if (!err?.response) {
    return 'לא ניתן להתחבר לשרת.';
  }
  if (serverMsg === 'Server error analyzing face.' && details) {
    const d = String(details);
    if (/429|quota|Too Many Requests|exceeded your current quota/i.test(d)) {
      return 'חרגת ממכסת הבקשות של Google (Gemini). המתיני כמה דקות או הגדירי בשרת OPENAI_API_KEY + PREFER_OPENAI=1 לניתוח דרך OpenAI.';
    }
    if (d.length > 220) {
      return 'שגיאת ניתוח. נסי שוב מאוחר יותר או תמונה קטנה יותר.';
    }
    return `שגיאת ניתוח: ${d}`;
  }
  if (typeof serverMsg === 'string' && serverMsg) return serverMsg;
  return 'ניתוח התמונה נכשל.';
}

export default function VirtualMakeupTryOn({
  productName = 'Makeup',
  productCategory,
  availableColors = [],
  onAddToCart = () => {},
}) {
  const [step, setStep] = useState('upload');
  const [imageSrc, setImageSrc] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  const [selectedColor, setSelectedColor] = useState(null);

  const [webcamOn, setWebcamOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const analyzeUrl = useMemo(() => {
    const fromEnv = import.meta.env.VITE_ANALYZE_FACE_URL;
    if (fromEnv) return fromEnv;
    return 'https://final-project-n18z.onrender.com/api/analyze-face';
  }, []);

  const stopWebcam = () => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    streamRef.current = null;
    setWebcamOn(false);
  };

  useEffect(() => {
    return () => stopWebcam();
  }, []);

  const resetFlow = () => {
    stopWebcam();
    setStep('upload');
    setImageSrc('');
    setImageBase64('');
    setAnalysis(null);
    setError('');
    setSelectedColor(null);
  };

  function normalizeHex(hex) {
    const raw = String(hex || '').trim();
    if (!raw) return '';
    if (raw.startsWith('#')) return raw.toLowerCase();
    return `#${raw}`.toLowerCase();
  }

  function hexToRgb(hex) {
    const h = normalizeHex(hex).replace('#', '');
    if (![3, 6].includes(h.length)) return null;
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function hexDistance(a, b) {
    const ra = hexToRgb(a);
    const rb = hexToRgb(b);
    if (!ra || !rb) return Infinity;
    const dr = ra.r - rb.r;
    const dg = ra.g - rb.g;
    const db = ra.b - rb.b;
    return dr * dr + dg * dg + db * db;
  }

  useEffect(() => {
    if (step !== 'results') return;
    if (!analysis) return;
    if (selectedColor) return;
    if (!availableColors || availableColors.length === 0) return;
    if (!productCategory) return;

    const categoryKey =
      productCategory === 'lipstick'
        ? 'lipstick'
        : productCategory === 'eyeshadow' || productCategory === 'eyeliner'
          ? 'eyeshadow'
          : productCategory === 'blush'
            ? 'blush'
            : 'foundation';

    const recArr = analysis?.recommended_colors?.[categoryKey];
    const recHexes = Array.isArray(recArr)
      ? recArr
          .map((r) => r?.hex || r?.hexCode || r?.color)
          .filter(Boolean)
      : [];

    if (recHexes.length === 0) return;

    let best = null;
    let bestDist = Infinity;
    for (const c of availableColors) {
      const cHex = c.hexCode || c.hex;
      let minToAny = Infinity;
      for (const rh of recHexes) {
        minToAny = Math.min(minToAny, hexDistance(rh, cHex));
      }
      if (minToAny < bestDist) {
        bestDist = minToAny;
        best = c;
      }
    }

    if (best) {
      setSelectedColor(best);
    }
  }, [step, analysis, selectedColor, availableColors, productCategory]);

  const handleFile = async (file) => {
    setError('');
    if (!file) return;
    const okType = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type) || file.type.startsWith('image/');
    if (!okType) {
      setError('נא להעלות תמונה בפורמט JPG/PNG.');
      return;
    }

    const rawUrl = await readFileAsDataUrl(file);
    let dataUrl = String(rawUrl);
    try {
      dataUrl = await resizeImageToJpegDataUrl(dataUrl);
    } catch {
      void 0;
    }
    const base64 = stripDataUrlPrefix(dataUrl);
    setImageSrc(dataUrl);
    setImageBase64(base64);
    setAnalysis(null);
    setSelectedColor(null);
    setStep('analyzing');
  };

  useEffect(() => {
    if (step !== 'analyzing') return;
    let cancelled = false;

    const run = async () => {
      try {
        setError('');
        const res = await axios.post(analyzeUrl, { imageBase64 });
        if (cancelled) return;
        setAnalysis(res.data);
        setStep('results');
      } catch (e) {
        if (cancelled) return;
        setError(humanizeAnalyzeError(e));
        setStep('upload');
      }
    };

    if (imageBase64) run();
    return () => {
      cancelled = true;
    };
  }, [step, imageBase64, analyzeUrl]);

  const startWebcam = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setWebcamOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('לא הצלחתי להפעיל מצלמה. נסי להעלות תמונה במקום.');
      setWebcamOn(false);
    }
  };

  const captureWebcam = async () => {
    const video = videoRef.current;
    if (!video) return;
    const w0 = video.videoWidth || 720;
    const h0 = video.videoHeight || 720;
    const maxEdge = Math.max(w0, h0);
    const scale = maxEdge > ANALYZE_MAX_EDGE ? ANALYZE_MAX_EDGE / maxEdge : 1;
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', ANALYZE_JPEG_QUALITY);
    const base64 = stripDataUrlPrefix(dataUrl);
    stopWebcam();
    setImageSrc(dataUrl);
    setImageBase64(base64);
    setAnalysis(null);
    setSelectedColor(null);
    setStep('analyzing');
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-800">{productName}</div>
          <div className="text-xs text-neutral-500">יועצת יופי חכמה + סימולציית איפור</div>
        </div>
        {step !== 'upload' && (
          <button
            type="button"
            onClick={resetFlow}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            העלי/ה תמונה אחרת
          </button>
        )}
      </div>

      <div className="relative rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        {step !== 'upload' && (
          <button
            type="button"
            onClick={resetFlow}
            aria-label="סגירת ניתוח ותמונה"
            title="סגור"
            className="absolute left-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg leading-none text-neutral-600 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-900"
          >
            ×
          </button>
        )}
        {step === 'upload' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-neutral-800">שלב 1: העלאת תמונה</div>
              <p className="mt-1 text-xs text-neutral-500">
                הפרטיות שלך: התמונה מנותחת מיד ולא נשמרת.
              </p>

              <label className="mt-3 block cursor-pointer rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <div className="text-sm font-semibold text-neutral-800">העלאת JPG/PNG</div>
                <div className="mt-1 text-xs text-neutral-500">או גרירה ושחרור בדפדפן</div>
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!webcamOn ? (
                  <button
                    type="button"
                    onClick={startWebcam}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    השתמש/י במצלמה
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={captureWebcam}
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[rgba(201,169,110,0.9)]"
                    >
                      צלם/י
                    </button>
                    <button
                      type="button"
                      onClick={stopWebcam}
                      className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      ביטול
                    </button>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-3 max-w-full break-words rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-neutral-800">תצוגה מקדימה</div>
              <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="preview"
                    className="mx-auto block max-h-56 w-auto max-w-full object-contain sm:max-h-64"
                  />
                ) : (
                  <div className="p-6 text-center text-xs text-neutral-500">עדיין לא הועלתה תמונה.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-neutral-800">שלב 2: ניתוח התמונה</div>
              <div className="mt-2 text-xs text-neutral-500">מנתחים את התווי פנים...</div>
              <div className="mt-4 space-y-2">
                <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-200" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-neutral-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-xs font-semibold text-neutral-800">טיפ</div>
              <div className="mt-1 text-xs text-neutral-600">
                לתוצאה טובה: פנים ברורות, תאורה טובה, בלי פילטרים חזקים.
              </div>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <FaceAnalysisPanel analysis={analysis} />
              <div className="mt-4">
                <ColorRecommendations
                  analysis={analysis}
                  productCategory={productCategory}
                  availableColors={availableColors}
                  selectedColorId={selectedColor?.id}
                  onSelectColor={(c) => {
                    setSelectedColor(c);
                    onAddToCart(c.id);
                  }}
                />
              </div>
              {productCategory && selectedColor?.id && (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
                  צבע נבחר: <span className="font-semibold">{selectedColor.name}</span>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="mb-3 text-xs text-neutral-600">
                הגוון על הפנים תואם לקטגוריית המוצר. בחרי גוון מהמוצר — האפקט משתנה לפי הצבע שנבחר.
              </div>
              <TryOnCanvas
                imageSrc={imageSrc}
                productCategory={productCategory}
                selectedHex={selectedColor?.hexCode || selectedColor?.hex}
              />

              {error && (
                <div className="mt-3 max-w-full break-words text-xs text-red-700">{error}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

