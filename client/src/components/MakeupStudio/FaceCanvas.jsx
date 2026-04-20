import { useEffect, useRef, useState } from 'react';
import { useFaceRenderer } from './useFaceRenderer';

export default function FaceCanvas({
  imageSrc,
  activeLook,
  productsById,
  enabledProducts,
  intensity,
  showMakeup,
  onLandmarksError,
}) {
  const beforeCanvasRef = useRef(null);
  const afterCanvasRef = useRef(null);
  const compareRef = useRef(null);
  const [imgEl, setImgEl] = useState(null);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const { renderToCanvas } = useFaceRenderer();

  useEffect(() => {
    if (!imageSrc) {
      setImgEl(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImgEl(img);
    img.onerror = () => setImgEl(null);
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!beforeCanvasRef.current || !imgEl) return;
      await renderToCanvas({
        canvas: beforeCanvasRef.current,
        imageEl: imgEl,
        look: activeLook,
        productsById,
        enabled: enabledProducts,
        intensity,
        showMakeup: false,
      });

      if (!afterCanvasRef.current) return;
      const res = await renderToCanvas({
        canvas: afterCanvasRef.current,
        imageEl: imgEl,
        look: activeLook,
        productsById,
        enabled: enabledProducts,
        intensity,
        showMakeup,
      });
      if (cancelled) return;
      if (showMakeup && !res.ok && res.error === 'no_face_detected') {
        onLandmarksError?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imgEl, renderToCanvas, activeLook, productsById, enabledProducts, intensity, showMakeup, onLandmarksError]);

  const updateSplitFromClientX = (clientX) => {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplit(pct);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => updateSplitFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  if (!imageSrc) {
    return (
      <div className="sc-studio-canvas-empty">
        העלי תמונה או הפעילי מצלמה כדי להתחיל.
      </div>
    );
  }

  return (
    <div className="sc-studio-canvas-wrap">
      <div
        ref={compareRef}
        className={`sc-studio-compare ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={(e) => {
          updateSplitFromClientX(e.clientX);
          setDragging(true);
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
      >
        <canvas ref={beforeCanvasRef} className="sc-studio-canvas" />

        {showMakeup ? (
          <>
            <canvas
              ref={afterCanvasRef}
              className="sc-studio-canvas sc-studio-canvas-after"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div className="sc-studio-compare-divider" style={{ left: `${split}%` }}>
              <span className="sc-studio-compare-knob">⇆</span>
            </div>
          </>
        ) : (
          <canvas ref={afterCanvasRef} className="sc-studio-canvas sc-studio-canvas-after" style={{ opacity: 0 }} />
        )}
      </div>
    </div>
  );
}

