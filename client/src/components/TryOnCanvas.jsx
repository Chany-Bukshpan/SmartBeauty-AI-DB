import { useEffect, useMemo, useRef, useState } from 'react';
import { detectFaceLandmarksWithFallback } from '../utils/mediapipeFaceMeshSolution';
import {
  centroid,
  drawCheekBlush,
  drawEyelinerMesh,
  drawEyeshadowMesh,
  drawLipstickMesh,
  drawLipstickMeshSplit,
  indicesToCanvasPoints,
  LEFT_CHEEK_INDICES,
  LEFT_EYESHADOW_INDICES,
  LEFT_EYELINER_INDICES,
  LIP_INNER_INDICES,
  LIP_LOWER_INNER_INDICES,
  LIP_LOWER_OUTER_INDICES,
  LIP_OUTER_INDICES,
  LIP_UPPER_INNER_INDICES,
  LIP_UPPER_OUTER_INDICES,
  rgbaFromHex,
  RIGHT_CHEEK_INDICES,
  RIGHT_EYESHADOW_INDICES,
  RIGHT_EYELINER_INDICES,
} from '../utils/faceMeshMakeup';

/** גיבוי גיאומטרי — אם אין Face Mesh */
function drawLipTintFallback(ctx, w, h, hex, alpha) {
  const cx = w * 0.5;
  const rx = w * 0.13;
  const upperY = h * 0.632;
  const lowerY = h * 0.666;
  const ryU = h * 0.021;
  const ryL = h * 0.026;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgbaFromHex(hex, alpha);
  ctx.beginPath();
  ctx.ellipse(cx, upperY, rx, ryU, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, lowerY, rx * 0.96, ryL, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getOverlayRegions(productCategory) {
  if (productCategory === 'lipstick') return { meshLips: true };
  if (productCategory === 'blush') return { meshCheeks: true };
  if (productCategory === 'eyeshadow') return { meshEyeshadow: true };
  if (productCategory === 'eyeliner') return { meshEyeliner: true };
  if (productCategory === 'foundation') return { face: true };
  return {};
}

const MIN_LANDMARKS = 468;

export default function TryOnCanvas({ imageSrc, productCategory, selectedHex }) {
  const beforeCanvasRef = useRef(null);
  const afterCanvasRef = useRef(null);
  const [imgEl, setImgEl] = useState(null);
  const [intensity, setIntensity] = useState(0.55);
  const [view, setView] = useState('tabs');
  const [showAfter, setShowAfter] = useState(true);
  const [splitPercent, setSplitPercent] = useState(50);
  /** Normalized landmarks (0–1) — עדיפות: @mediapipe/face_mesh, גיבוי: Face Landmarker */
  const [faceLandmarks, setFaceLandmarks] = useState(null);

  const normalizedHex = useMemo(() => (selectedHex ? String(selectedHex) : ''), [selectedHex]);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImgEl(img);
    img.onerror = () => setImgEl(null);
    img.src = imageSrc;
  }, [imageSrc]);

  const needsFaceMesh = useMemo(
    () => ['lipstick', 'blush', 'eyeshadow', 'eyeliner'].includes(productCategory),
    [productCategory]
  );

  useEffect(() => {
    if (!imgEl || !needsFaceMesh) {
      setFaceLandmarks(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const lm = await detectFaceLandmarksWithFallback(imgEl);
        if (cancelled) return;
        if (lm && lm.length >= MIN_LANDMARKS) {
          setFaceLandmarks(lm);
        } else {
          setFaceLandmarks(null);
        }
      } catch (e) {
        console.warn('[TryOnCanvas] face landmarks', e);
        if (!cancelled) setFaceLandmarks(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imgEl, needsFaceMesh, imageSrc]);

  useEffect(() => {
    if (!imgEl) return;
    const before = beforeCanvasRef.current;
    const after = afterCanvasRef.current;
    if (!before || !after) return;

    const maxW = 880;
    const maxH = 620;
    const scale = Math.min(1, maxW / imgEl.naturalWidth, maxH / imgEl.naturalHeight);
    const w = Math.round(imgEl.naturalWidth * scale);
    const h = Math.round(imgEl.naturalHeight * scale);

    before.width = w;
    before.height = h;
    after.width = w;
    after.height = h;

    const bctx = before.getContext('2d');
    const actx = after.getContext('2d');
    if (!bctx || !actx) return;

    bctx.clearRect(0, 0, w, h);
    bctx.drawImage(imgEl, 0, 0, w, h);

    actx.clearRect(0, 0, w, h);
    actx.drawImage(imgEl, 0, 0, w, h);

    const overlays = getOverlayRegions(productCategory);
    if (!normalizedHex || !overlays || Object.keys(overlays).length === 0) return;

    const alpha = 0.12 + intensity * 0.5;
    const lm = faceLandmarks;

    if (overlays.meshLips) {
      const uo = lm ? indicesToCanvasPoints(lm, LIP_UPPER_OUTER_INDICES, w, h) : null;
      const ui = lm ? indicesToCanvasPoints(lm, LIP_UPPER_INNER_INDICES, w, h) : null;
      const lo = lm ? indicesToCanvasPoints(lm, LIP_LOWER_OUTER_INDICES, w, h) : null;
      const li = lm ? indicesToCanvasPoints(lm, LIP_LOWER_INNER_INDICES, w, h) : null;
      if (uo && ui && lo && li) {
        drawLipstickMeshSplit(actx, uo, ui, lo, li, normalizedHex, alpha);
      } else {
        const outer = lm ? indicesToCanvasPoints(lm, LIP_OUTER_INDICES, w, h) : null;
        const inner = lm ? indicesToCanvasPoints(lm, LIP_INNER_INDICES, w, h) : null;
        if (outer && inner) {
          drawLipstickMesh(actx, outer, inner, normalizedHex, alpha);
        } else {
          drawLipTintFallback(actx, w, h, normalizedHex, alpha);
        }
      }
    }

    if (overlays.meshCheeks && lm) {
      const leftPts = indicesToCanvasPoints(lm, LEFT_CHEEK_INDICES, w, h);
      const rightPts = indicesToCanvasPoints(lm, RIGHT_CHEEK_INDICES, w, h);
      if (leftPts) drawCheekBlush(actx, leftPts, normalizedHex, alpha);
      if (rightPts) drawCheekBlush(actx, rightPts, normalizedHex, alpha);
    }

    if (overlays.meshEyeshadow && lm) {
      const le = indicesToCanvasPoints(lm, LEFT_EYESHADOW_INDICES, w, h);
      const re = indicesToCanvasPoints(lm, RIGHT_EYESHADOW_INDICES, w, h);
      if (le) drawEyeshadowMesh(actx, le, normalizedHex, alpha);
      if (re) drawEyeshadowMesh(actx, re, normalizedHex, alpha);
    }

    if (overlays.meshEyeliner && lm) {
      const ll = indicesToCanvasPoints(lm, LEFT_EYELINER_INDICES, w, h);
      const rl = indicesToCanvasPoints(lm, RIGHT_EYELINER_INDICES, w, h);
      if (ll) drawEyelinerMesh(actx, ll, normalizedHex, alpha);
      if (rl) drawEyelinerMesh(actx, rl, normalizedHex, alpha);
    }

    if (overlays.face) {
      actx.save();
      actx.globalCompositeOperation = 'multiply';
      const cx = w * 0.5;
      const cy = h * 0.56;
      const rx = w * 0.3;
      const ry = h * 0.42;
      actx.beginPath();
      actx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      actx.closePath();
      actx.fillStyle = rgbaFromHex(normalizedHex, alpha * 0.72);
      actx.fill();
      actx.restore();
    }
  }, [imgEl, productCategory, normalizedHex, intensity, view, faceLandmarks]);

  if (!imageSrc) {
    return (
      <div className="w-full rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
        העלו תמונה כדי להציג סימולציה.
      </div>
    );
  }

  const canvasWrapClass =
    'mx-auto block max-h-[min(70vh,560px)] w-full max-w-full object-contain';

  const meshOk = faceLandmarks && faceLandmarks.length >= MIN_LANDMARKS;

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-neutral-800">עוצמת אפקט</span>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:min-w-[200px]">
          <span className="text-xs text-neutral-500">{Math.round(intensity * 100)}%</span>
          <input
            aria-label="עוצמת אפקט"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="h-2 w-40 max-w-full accent-[var(--accent)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView('tabs')}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            view === 'tabs'
              ? 'border-[var(--accent)] bg-[rgba(201,169,110,0.18)] text-[var(--primary-dark)]'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          לפני / אחרי
        </button>
        <button
          type="button"
          onClick={() => setView('slider')}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            view === 'slider'
              ? 'border-[var(--accent)] bg-[rgba(201,169,110,0.18)] text-[var(--primary-dark)]'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          השוואה עם גרירה
        </button>
        <button
          type="button"
          onClick={() => setView('side')}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            view === 'side'
              ? 'border-[var(--accent)] bg-[rgba(201,169,110,0.18)] text-[var(--primary-dark)]'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          זה לצד זה
        </button>
      </div>

      {view === 'tabs' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAfter(false)}
            className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
              !showAfter
                ? 'border-[var(--accent)] bg-[rgba(201,169,110,0.15)] text-[var(--primary-dark)]'
                : 'border-neutral-200 bg-white text-neutral-600'
            }`}
          >
            לפני
          </button>
          <button
            type="button"
            onClick={() => setShowAfter(true)}
            className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
              showAfter
                ? 'border-[var(--accent)] bg-[rgba(201,169,110,0.15)] text-[var(--primary-dark)]'
                : 'border-neutral-200 bg-white text-neutral-600'
            }`}
          >
            אחרי
          </button>
        </div>
      )}

      {view === 'tabs' && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          <canvas
            ref={beforeCanvasRef}
            className={canvasWrapClass + (showAfter ? ' hidden' : '')}
            aria-hidden={showAfter}
          />
          <canvas
            ref={afterCanvasRef}
            className={canvasWrapClass + (!showAfter ? ' hidden' : '')}
            aria-hidden={!showAfter}
          />
        </div>
      )}

      {view === 'slider' && (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            <canvas ref={beforeCanvasRef} className="relative z-0 block w-full max-w-full" />
            <canvas
              ref={afterCanvasRef}
              className="absolute left-0 top-0 z-10 block h-full w-full max-w-full"
              style={{
                clipPath: `polygon(0 0, ${splitPercent}% 0, ${splitPercent}% 100%, 0 100%)`,
              }}
            />
            <div
              className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white"
              aria-hidden
            >
              גרור את המחוון למטה
            </div>
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-neutral-500">לפני</span>
            <input
              aria-label="מיקום קו ההשוואה"
              type="range"
              min={5}
              max={95}
              value={splitPercent}
              onChange={(e) => setSplitPercent(Number(e.target.value))}
              className="h-2 flex-1 accent-[var(--accent)]"
            />
            <span className="text-xs text-neutral-500">אחרי</span>
          </div>
        </div>
      )}

      {view === 'side' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            <div className="bg-neutral-200/80 px-2 py-1 text-center text-xs font-semibold text-neutral-700">
              לפני
            </div>
            <canvas ref={beforeCanvasRef} className="block w-full max-w-full" />
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            <div className="bg-[rgba(201,169,110,0.25)] px-2 py-1 text-center text-xs font-semibold text-neutral-800">
              אחרי
            </div>
            <canvas ref={afterCanvasRef} className="block w-full max-w-full" />
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-neutral-400">
        סימולציה מבוססת MediaPipe Face Mesh (refineLandmarks) + גיבוי Face Landmarker. האיפור על השפתיים לפי קו הנקודות בתמונה
        {needsFaceMesh && !meshOk ? ' — טוען/מזהה פנים… אם אין זיהוי מוצג גיבוי גיאומטרי.' : '.'}
      </p>
    </div>
  );
}
