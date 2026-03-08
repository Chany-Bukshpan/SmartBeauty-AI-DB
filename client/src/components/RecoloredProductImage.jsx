import { useState, useRef, useEffect } from "react";
import { recolorLipstickInImageData } from "../utils/recolorLipstick";

const SIZE = 400;

/**
 * מציג תמונת מוצר; כש-targetHex מוגדר, צובע מחדש רק את אזורי האודם (עיגול + פס) דרך Canvas.
 * הקנבס תמיד ריבוע (cover, יישור מלמעלה) כדי שלא יופיע "חצי ריבוע" אחרי הריקולור.
 */
export function RecoloredProductImage({ src, alt, targetHex, className }) {
  const [recolored, setRecolored] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const shouldRecolor = Boolean(src && targetHex);

  useEffect(() => {
    setImageLoaded(false);
    setRecolored(false);
    setFallback(false);
  }, [src]);

  useEffect(() => {
    setRecolored(false);
    setFallback(false);
  }, [targetHex]);

  useEffect(() => {
    if (!shouldRecolor || !imageLoaded || !imgRef.current || !canvasRef.current) return;

    const img = imgRef.current;
    if (!img.naturalWidth) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    // ריבוע עם cover — התמונה ממלאת את הריבוע, יישור מלמעלה (כדי לחתוך ריק)
    const scale = Math.max(SIZE / w, SIZE / h);
    const drawW = w * scale;
    const drawH = h * scale;
    const xOff = (SIZE - drawW) / 2;
    const yOff = 0;

    const canvas = canvasRef.current;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      ctx.drawImage(img, 0, 0, w, h, xOff, yOff, drawW, drawH);
      const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
      recolorLipstickInImageData(imageData, targetHex);
      ctx.putImageData(imageData, 0, 0);
      setRecolored(true);
    } catch (e) {
      setFallback(true);
    }
  }, [src, targetHex, shouldRecolor, imageLoaded]);

  const showCanvas = shouldRecolor && recolored && !fallback;

  return (
    <>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        style={{
          position: showCanvas ? "absolute" : undefined,
          visibility: showCanvas ? "hidden" : undefined,
          width: showCanvas ? undefined : "100%",
        }}
        crossOrigin="anonymous"
        onLoad={() => setImageLoaded(true)}
      />
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          display: showCanvas ? "block" : "none",
        }}
        aria-hidden={!showCanvas}
        aria-label={showCanvas ? alt : undefined}
      />
    </>
  );
}
