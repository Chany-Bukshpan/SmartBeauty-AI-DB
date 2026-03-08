import { useState, useRef, useEffect } from "react";
import { recolorLipstickInImageData } from "../utils/recolorLipstick";

const MAX_SIZE = 420;

/**
 * מציג תמונת מוצר; כש-targetHex מוגדר, צובע מחדש רק את אזורי האודם (עיגול + פס) דרך Canvas.
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

    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const scale = w > h ? MAX_SIZE / w : MAX_SIZE / h;
    if (scale >= 1) {
      w = img.naturalWidth;
      h = img.naturalHeight;
    } else {
      w = Math.round(img.naturalWidth * scale);
      h = Math.round(img.naturalHeight * scale);
    }

    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      recolorLipstickInImageData(imageData, targetHex);
      ctx.putImageData(imageData, 0, 0);
      canvas.style.aspectRatio = `${w}/${h}`;
      canvas.style.maxWidth = "100%";
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
          maxWidth: showCanvas ? undefined : MAX_SIZE,
        }}
        crossOrigin="anonymous"
        onLoad={() => setImageLoaded(true)}
      />
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          display: showCanvas ? "block" : "none",
          maxWidth: "100%",
          height: "auto",
        }}
        aria-hidden={!showCanvas}
        aria-label={showCanvas ? alt : undefined}
      />
    </>
  );
}
