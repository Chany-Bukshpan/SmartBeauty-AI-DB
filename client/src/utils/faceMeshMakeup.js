/**
 * אינדקסי Face Mesh (MediaPipe) — תואמים ל־Face Landmarker ב־@mediapipe/tasks-vision
 * (ממשק ישן: @mediapipe/face_mesh; המודל הנוכחי: Face Landmarker).
 */

/** שפתיים — קו חיצוני (מסלול מלא) */
export const LIP_OUTER_INDICES = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
  185, 40, 39, 37, 0, 267, 269, 270, 409,
];

/** שפתיים — קו פנימי (מסלול מלא) */
export const LIP_INNER_INDICES = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
];

/**
 * פיצול לשפה עליונה / תחתונה — מילוי even-odd נפרד מתקן מקרים שלא נמלאה השפה העליונה מבפנים.
 * חוץ עליון: 61→291 | פנים עליון: 78→308
 * חוץ תחתון: 308→409 | פנים תחתון: 308→95
 */
export const LIP_UPPER_OUTER_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
export const LIP_UPPER_INNER_INDICES = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];

export const LIP_LOWER_OUTER_INDICES = [
  308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409,
];
export const LIP_LOWER_INNER_INDICES = [308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

export const LEFT_CHEEK_INDICES = [123, 50, 117, 118, 101];
export const RIGHT_CHEEK_INDICES = [352, 280, 346, 347, 330];

export const LEFT_EYESHADOW_INDICES = [226, 111, 117, 118, 101, 243];
export const RIGHT_EYESHADOW_INDICES = [446, 340, 346, 347, 330, 463];

export const LEFT_EYELINER_INDICES = [243, 112, 26, 22, 23, 24, 110, 228];
export const RIGHT_EYELINER_INDICES = [463, 341, 256, 252, 253, 254, 339, 448];

function hexToRgb(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  if (![3, 6].includes(raw.length)) return null;
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * @param {import('@mediapipe/tasks-vision').NormalizedLandmark[]} landmarks
 * @param {number[]} indices
 */
export function indicesToCanvasPoints(landmarks, indices, width, height) {
  if (!landmarks?.length || !indices?.length) return null;
  const out = [];
  for (const i of indices) {
    const p = landmarks[i];
    if (p == null || typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    out.push({ x: p.x * width, y: p.y * height });
  }
  return out;
}

export function centroid(points) {
  if (!points?.length) return null;
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** רדיוס לסומק — מרחק מקסימלי מהמרכז + מרווח */
export function cheekGradientRadius(points, center) {
  if (!points?.length || !center) return 40;
  let max = 0;
  for (const p of points) {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    max = Math.max(max, Math.hypot(dx, dy));
  }
  return Math.max(max * 1.25, 24);
}

/**
 * שפתיים: soft-light + blur 2px — שני אזורי even-odd (עליון + תחתון) למילוי מלא של השפה העליונה
 */
export function drawLipstickMeshSplit(ctx, upperOuter, upperInner, lowerOuter, lowerInner, hex, alpha) {
  const hasUpper =
    upperOuter?.length >= 3 && upperInner?.length >= 3;
  const hasLower =
    lowerOuter?.length >= 3 && lowerInner?.length >= 3;
  if (!hasUpper && !hasLower) return;

  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = rgbaFromHex(hex, alpha);

  const drawPair = (outer, inner) => {
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
    ctx.closePath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath();
    ctx.fill('evenodd');
  };

  if (hasUpper) drawPair(upperOuter, upperInner);
  if (hasLower) drawPair(lowerOuter, lowerInner);

  ctx.filter = 'none';
  ctx.restore();
}

/**
 * גיבוי: מסלול אחד (שפה שלמה) — אם אין פיצול
 */
export function drawLipstickMesh(ctx, outer, inner, hex, alpha) {
  if (!outer?.length || outer.length < 3) return;
  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = rgbaFromHex(hex, alpha);
  ctx.beginPath();
  ctx.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
  ctx.closePath();
  if (inner && inner.length >= 3) {
    ctx.moveTo(inner[0].x, inner[0].y);
    for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath();
    ctx.fill('evenodd');
  } else {
    ctx.fill();
  }
  ctx.filter = 'none';
  ctx.restore();
}

/**
 * סומק: radial gradient, multiply, blur ~12px
 */
export function drawCheekBlush(ctx, points, hex, alpha) {
  if (!points?.length) return;
  const c = centroid(points);
  if (!c) return;
  const r = cheekGradientRadius(points, c);
  ctx.save();
  ctx.filter = 'blur(12px)';
  ctx.globalCompositeOperation = 'multiply';
  const grd = ctx.createRadialGradient(c.x, c.y, r * 0.05, c.x, c.y, r);
  grd.addColorStop(0, rgbaFromHex(hex, alpha * 0.85));
  grd.addColorStop(0.55, rgbaFromHex(hex, alpha * 0.35));
  grd.addColorStop(1, rgbaFromHex(hex, 0));
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

/**
 * צללית: פוליגון, multiply, blur 5px
 */
export function drawEyeshadowMesh(ctx, points, hex, alpha) {
  if (!points || points.length < 3) return;
  ctx.save();
  ctx.filter = 'blur(5px)';
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgbaFromHex(hex, alpha * 0.75);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

/**
 * אייליינר: stroke, lineWidth 2, blur מינימלי
 */
export function drawEyelinerMesh(ctx, points, hex, alpha) {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.filter = 'blur(0.5px)';
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = rgbaFromHex(hex, Math.min(1, alpha + 0.35));
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.filter = 'none';
  ctx.restore();
}
