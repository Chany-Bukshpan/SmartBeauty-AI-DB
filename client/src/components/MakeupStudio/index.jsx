/**
 * Floating AI makeup studio: upload/face mesh, product toggles, add matched catalog items to cart.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllProductsByPages } from '../../store/slices/productsSlice';
import { addToCart } from '../../store/slices/cartSlice';
import UploadZone from './UploadZone';
import FaceCanvas from './FaceCanvas';
import LookSelector from './LookSelector';
import ProductToggleList from './ProductToggleList';
import { useAIAnalysis } from './useAIAnalysis';
import './MakeupStudio.css';

function buildProductsById(products) {
  const m = new Map();
  for (const p of products || []) m.set(String(p?._id), p);
  return m;
}

function makeInitialToggles() {
  return {
    foundation: true,
    eyeshadow: true,
    eyeliner: true,
    mascara: true,
    blush: true,
    lipstick: true,
  };
}

export default function MakeupStudio() {
  const dispatch = useDispatch();
  const products = useSelector((s) => s.products.items || []);
  const [open, setOpen] = useState(false);
  const [activeLookIndex, setActiveLookIndex] = useState(0);
  const [enabledProducts, setEnabledProducts] = useState(makeInitialToggles);
  const [showMakeup, setShowMakeup] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [intensity, setIntensity] = useState(0.82);

  const { status, progressText, imageSrc, looks, faceAnalysis, error, reset, handleFile, analyzeAndRecommend, setImageSrc } =
    useAIAnalysis({ products });

  useEffect(() => {
    if (!products.length) dispatch(fetchAllProductsByPages());
  }, [dispatch, products.length]);

  const productsById = useMemo(() => buildProductsById(products), [products]);
  const activeLook = Array.isArray(looks) ? looks[activeLookIndex] : null;

  useEffect(() => {
    if (!open) return;
    if (looks?.length) return;
    setActiveLookIndex(0);
    setEnabledProducts(makeInitialToggles());
    setShowMakeup(true);
    setIntensity(0.82);
  }, [open, looks?.length]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [webcamOn, setWebcamOn] = useState(false);

  const stopWebcam = () => {
    const s = streamRef.current;
    if (s) for (const t of s.getTracks()) t.stop();
    streamRef.current = null;
    setWebcamOn(false);
  };

  useEffect(() => () => stopWebcam(), []);

  const startWebcam = async () => {
    try {
      stopWebcam();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setWebcamOn(true);
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { severity: 'warn', summary: 'מצלמה', detail: 'לא ניתן להפעיל מצלמה. בדקי הרשאות.', life: 3200 },
        })
      );
    }
  };

  const capture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    setImageSrc(dataUrl);
    stopWebcam();
    await analyzeAndRecommend(dataUrl);
  };

  const addOne = (product) => {
    if (!product) return;
    const c0 = product?.colors?.[0];
    const selectedColor = c0 ? { name: c0.name, hex: c0.hex || c0.hexCode } : null;
    dispatch(addToCart({ product, quantity: 1, selectedColor }));
    window.dispatchEvent(new CustomEvent('cart:added', { detail: { name: product.makeupName || product.name } }));
  };

  const addLookToCart = () => {
    const p = activeLook?.products || {};
    for (const v of Object.values(p)) {
      const product = productsById.get(String(v?.productId));
      if (product) addOne(product);
    }
    window.dispatchEvent(
      new CustomEvent('app:toast', {
        detail: { severity: 'success', summary: 'לוק', detail: 'כל הלוק נוסף לסל', life: 2600 },
      })
    );
  };

  const toggleOne = (key) => setEnabledProducts((prev) => ({ ...prev, [key]: !(prev?.[key] !== false) }));

  const busy = status === 'uploading' || status === 'analyzing' || status === 'recommending';

  return (
    <div className={`sc-studio-floating ${open ? 'is-open' : ''}`}>
      {!open ? (
        <>
          <div className="sc-studio-hint" aria-hidden="true">
            <span className="sc-studio-hint-icon">✨</span>
            <span className="sc-studio-hint-text">
              <strong>התאמת איפור חכמה</strong>
              <small>לפי תווי הפנים שלך</small>
            </span>
          </div>
          <button type="button" className="sc-studio-fab" onClick={() => setOpen(true)} aria-label="פתיחת AI Makeup Studio">
            <span aria-hidden="true">✨</span>
            AI Studio
          </button>
        </>
      ) : (
        <div className="sc-studio-panel" role="dialog" aria-label="AI Makeup Studio">
          <div className="sc-studio-panel-head">
            <div>
              <h4 className="sc-studio-title">AI Makeup Studio</h4>
              <div className="sc-studio-sub">שחקי עם לוקים, הדליקי/כבי מוצרים, ותוסיפי לסל</div>
            </div>
            <button
              type="button"
              className="sc-studio-close"
              onClick={() => {
                stopWebcam();
                setOpen(false);
              }}
              aria-label="סגירה"
            >
              ×
            </button>
          </div>

          <div className="sc-studio-body">
            <div className="sc-studio-left">
              <UploadZone onFile={handleFile} busy={busy} />

              <div className="sc-studio-controls">
                {!webcamOn ? (
                  <button type="button" className="sc-btn" onClick={startWebcam} disabled={busy}>
                    מצלמה
                  </button>
                ) : (
                  <>
                    <button type="button" className="sc-btn sc-btn-primary" onClick={capture} disabled={busy}>
                      צילום
                    </button>
                    <button type="button" className="sc-btn" onClick={stopWebcam}>
                      כיבוי מצלמה
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => setShowMakeup((v) => !v)}
                  disabled={!imageSrc}
                >
                  {showMakeup ? 'הצג ללא איפור' : 'החזר איפור'}
                </button>
                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => setShowAnalysis((v) => !v)}
                  disabled={!faceAnalysis}
                >
                  {showAnalysis ? 'הסתר ניתוח פנים' : 'קריאת ניתוח פנים'}
                </button>

                <button
                  type="button"
                  className="sc-btn"
                  onClick={() => {
                    stopWebcam();
                    reset();
                    setActiveLookIndex(0);
                    setEnabledProducts(makeInitialToggles());
                    setShowMakeup(true);
                    setIntensity(0.82);
                  }}
                >
                  התחל מחדש
                </button>
              </div>

              {webcamOn ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', borderRadius: '16px', border: '1px solid rgba(201,169,110,0.22)' }}
                  />
                </div>
              ) : null}

              {busy && progressText ? <div className="sc-studio-progress">{progressText}</div> : null}
              {error ? <div className="sc-studio-error">{error}</div> : null}
              {showAnalysis && faceAnalysis ? (
                <div className="sc-studio-analysis">
                  <div><strong>גוון עור:</strong> {faceAnalysis?.skin_tone || faceAnalysis?.skinTone || 'לא זוהה'}</div>
                  <div><strong>תת-גוון:</strong> {faceAnalysis?.undertone || 'לא זוהה'}</div>
                  <div><strong>צורת פנים:</strong> {faceAnalysis?.face_shape || faceAnalysis?.faceShape || 'לא זוהה'}</div>
                  <div><strong>צבע עיניים:</strong> {faceAnalysis?.eye_color || faceAnalysis?.eyeColor || 'לא זוהה'}</div>
                  {faceAnalysis?.features_summary ? <div><strong>סיכום:</strong> {faceAnalysis.features_summary}</div> : null}
                  {faceAnalysis?.reasoning ? <div><strong>הסבר התאמה:</strong> {faceAnalysis.reasoning}</div> : null}
                </div>
              ) : null}

              <div className="sc-studio-slider">
                <div className="sc-studio-slider-top">
                  <span>עוצמה</span>
                  <span>{Math.round(intensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  disabled={!imageSrc}
                  aria-label="עוצמת סימולציה"
                />
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <FaceCanvas
                  imageSrc={imageSrc}
                  activeLook={activeLook}
                  productsById={productsById}
                  enabledProducts={enabledProducts}
                  intensity={intensity}
                  showMakeup={showMakeup}
                  onLandmarksError={() => {
                    window.dispatchEvent(
                      new CustomEvent('app:toast', {
                        detail: {
                          severity: 'warn',
                          summary: 'זיהוי פנים',
                          detail: 'לא הצלחתי לזהות פנים. נסי תמונה ברורה יותר עם פנים קדימה.',
                          life: 3600,
                        },
                      })
                    );
                  }}
                />
              </div>
            </div>

            <div className="sc-studio-right">
              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <button type="button" className="sc-btn sc-btn-primary" onClick={addLookToCart} disabled={!activeLook}>
                  הוסף כל הלוק לסל
                </button>
              </div>

              <LookSelector
                looks={looks}
                activeIndex={activeLookIndex}
                onSelect={(i) => {
                  setActiveLookIndex(i);
                  setEnabledProducts(makeInitialToggles());
                }}
              />

              <ProductToggleList
                look={activeLook}
                productsById={productsById}
                enabledProducts={enabledProducts}
                onToggle={toggleOne}
                onAddOne={addOne}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

