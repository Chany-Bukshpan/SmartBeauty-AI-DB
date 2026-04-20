/**
 * Draws product photo to canvas and shifts lip/product tint toward targetHex (client-side preview).
 */
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { recolorLipstickInImageData } from "../utils/recolorLipstick";

const SIZE = 400;

export function RecoloredProductImage({ src, alt, targetHex, className, recolorTopOnly = false, drawTrigger = 0 }) {
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

  useLayoutEffect(() => {
    if (!shouldRecolor || !imageLoaded || !imgRef.current || !canvasRef.current) return;

    const img = imgRef.current;
    if (!img.naturalWidth) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.max(SIZE / w, SIZE / h);
    const drawW = w * scale;
    const drawH = h * scale;
    const xOff = (SIZE - drawW) / 2;
    const yOff = 0;

    const canvas = canvasRef.current;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    try {
      ctx.drawImage(img, 0, 0, w, h, xOff, yOff, drawW, drawH);
      const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
      recolorLipstickInImageData(imageData, targetHex, recolorTopOnly ? { topFraction: 0.35 } : {});
      ctx.putImageData(imageData, 0, 0);
      setRecolored(true);
    } catch (e) {
      setFallback(true);
    }
  }, [src, targetHex, shouldRecolor, imageLoaded, recolorTopOnly, drawTrigger]);

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
