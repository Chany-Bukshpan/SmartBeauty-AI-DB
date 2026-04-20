import { useCallback, useMemo } from 'react';
import { detectFaceLandmarksWithFallback } from '../../utils/mediapipeFaceMeshSolution';
import {
  drawCheekBlush,
  drawEyelinerMesh,
  drawEyeshadowMesh,
  drawLipstickMesh,
  drawLipstickMeshSplit,
  indicesToCanvasPoints,
  LEFT_CHEEK_INDICES,
  LEFT_EYELINER_INDICES,
  LEFT_EYESHADOW_INDICES,
  LIP_INNER_INDICES,
  LIP_LOWER_INNER_INDICES,
  LIP_LOWER_OUTER_INDICES,
  LIP_OUTER_INDICES,
  LIP_UPPER_INNER_INDICES,
  LIP_UPPER_OUTER_INDICES,
  rgbaFromHex,
  RIGHT_CHEEK_INDICES,
  RIGHT_EYELINER_INDICES,
  RIGHT_EYESHADOW_INDICES,
} from '../../utils/faceMeshMakeup';
import { makeupZones } from './makeupZones.config';

const MIN_LANDMARKS = 468;

function normalizeHex(hex) {
  const raw = String(hex || '').trim();
  if (!raw) return '';
  return raw.startsWith('#') ? raw.toLowerCase() : `#${raw}`.toLowerCase();
}

function pickHexFromProduct(product) {
  const c0 = product?.colors?.[0];
  const hex = c0?.hex || c0?.hexCode || product?.hex || product?.hexCode || product?.colorHex;
  return normalizeHex(hex || '#c9a96e');
}

const FACE_OUTER_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

function drawFaceTint(ctx, w, h, hex, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgbaFromHex(hex, alpha);
  const cx = w * 0.5;
  const cy = h * 0.55;
  const rx = w * 0.34;
  const ry = h * 0.46;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFoundationMesh(ctx, lm, w, h, hex, alpha) {
  const points = indicesToCanvasPoints(lm, FACE_OUTER_INDICES, w, h);
  if (!points || points.length < 3) {
    drawFaceTint(ctx, w, h, hex, alpha);
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgbaFromHex(hex, alpha * 0.7);
  ctx.filter = 'blur(3px)';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function pointFromLandmark(lm, idx, w, h) {
  const p = lm?.[idx];
  if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return null;
  return { x: p.x * w, y: p.y * h };
}

function centerOfPoints(points) {
  const valid = points.filter(Boolean);
  if (!valid.length) return null;
  const sum = valid.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / valid.length, y: sum.y / valid.length };
}

// Eyeshadow clipped to upper eyelid area only (prevents painting on cheeks).
function drawEyeshadowClipped(ctx, lm, w, h, hex, alpha) {
  const leftEyeCenter = centerOfPoints([
    pointFromLandmark(lm, 33, w, h),
    pointFromLandmark(lm, 133, w, h),
    pointFromLandmark(lm, 159, w, h),
    pointFromLandmark(lm, 145, w, h),
  ]);
  const rightEyeCenter = centerOfPoints([
    pointFromLandmark(lm, 362, w, h),
    pointFromLandmark(lm, 263, w, h),
    pointFromLandmark(lm, 386, w, h),
    pointFromLandmark(lm, 374, w, h),
  ]);
  if (!leftEyeCenter || !rightEyeCenter) return;

  const interEye = Math.abs(rightEyeCenter.x - leftEyeCenter.x);
  const scale = Math.max(interEye, w * 0.18);
  const shadowW = scale * 0.2;
  const shadowH = scale * 0.09;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  for (const eye of [leftEyeCenter, rightEyeCenter]) {
    ctx.save();
    // Clip: above eye line only.
    ctx.beginPath();
    ctx.rect(eye.x - shadowW, eye.y - shadowH * 2.5, shadowW * 2, shadowH * 2.5);
    ctx.clip();

    const grad = ctx.createRadialGradient(
      eye.x,
      eye.y - shadowH * 0.4,
      0,
      eye.x,
      eye.y - shadowH * 0.4,
      shadowW * 0.9
    );
    grad.addColorStop(0, rgbaFromHex(hex, alpha * 0.95));
    grad.addColorStop(0.5, rgbaFromHex(hex, alpha * 0.5));
    grad.addColorStop(1, rgbaFromHex(hex, 0));

    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y - shadowH * 0.3, shadowW, shadowH * 1.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawFoundationAdaptive(ctx, lm, w, h, hex, alpha) {
  const leftEye = centerOfPoints([
    pointFromLandmark(lm, 33, w, h),
    pointFromLandmark(lm, 133, w, h),
  ]);
  const rightEye = centerOfPoints([
    pointFromLandmark(lm, 362, w, h),
    pointFromLandmark(lm, 263, w, h),
  ]);
  const leftCheek = pointFromLandmark(lm, 234, w, h);
  const rightCheek = pointFromLandmark(lm, 454, w, h);
  const noseTip = pointFromLandmark(lm, 1, w, h);
  const lipCenter = pointFromLandmark(lm, 13, w, h);
  const points = [leftEye, rightEye, leftCheek, rightCheek, noseTip, lipCenter].filter(Boolean);
  if (points.length < 4 || !leftCheek || !rightCheek || !leftEye || !lipCenter) {
    drawFoundationMesh(ctx, lm, w, h, hex, alpha);
    return;
  }

  const c = centerOfPoints(points);
  if (!c) return;
  const faceW = Math.max(Math.abs(rightCheek.x - leftCheek.x) * 0.62, w * 0.16);
  const faceH = Math.max((lipCenter.y - leftEye.y) * 0.78, h * 0.16);

  const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, faceW);
  grad.addColorStop(0, rgbaFromHex(hex, alpha * 0.65));
  grad.addColorStop(0.65, rgbaFromHex(hex, alpha * 0.38));
  grad.addColorStop(0.88, rgbaFromHex(hex, alpha * 0.15));
  grad.addColorStop(1, rgbaFromHex(hex, 0));

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, faceW, faceH, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

export function useFaceRenderer() {
  const renderers = useMemo(
    () => ({
      lipstick: (ctx, lm, w, h, hex, alpha) => {
        const uo = indicesToCanvasPoints(lm, LIP_UPPER_OUTER_INDICES, w, h);
        const ui = indicesToCanvasPoints(lm, LIP_UPPER_INNER_INDICES, w, h);
        const lo = indicesToCanvasPoints(lm, LIP_LOWER_OUTER_INDICES, w, h);
        const li = indicesToCanvasPoints(lm, LIP_LOWER_INNER_INDICES, w, h);
        if (uo && ui && lo && li) {
          drawLipstickMeshSplit(ctx, uo, ui, lo, li, hex, alpha);
          return;
        }
        const outer = indicesToCanvasPoints(lm, LIP_OUTER_INDICES, w, h);
        const inner = indicesToCanvasPoints(lm, LIP_INNER_INDICES, w, h);
        if (outer && inner) {
          drawLipstickMesh(ctx, outer, inner, hex, alpha);
        }
      },
      blush: (ctx, lm, w, h, hex, alpha) => {
        const leftPts = indicesToCanvasPoints(lm, LEFT_CHEEK_INDICES, w, h);
        const rightPts = indicesToCanvasPoints(lm, RIGHT_CHEEK_INDICES, w, h);
        if (leftPts) drawCheekBlush(ctx, leftPts, hex, alpha);
        if (rightPts) drawCheekBlush(ctx, rightPts, hex, alpha);
      },
      eyeliner: (ctx, lm, w, h, hex, alpha) => {
        const ll = indicesToCanvasPoints(lm, LEFT_EYELINER_INDICES, w, h);
        const rl = indicesToCanvasPoints(lm, RIGHT_EYELINER_INDICES, w, h);
        if (ll) drawEyelinerMesh(ctx, ll, hex, alpha);
        if (rl) drawEyelinerMesh(ctx, rl, hex, alpha);
      },
      mascara: (ctx, lm, w, h, hex, alpha) => {
        const ll = indicesToCanvasPoints(lm, LEFT_EYELINER_INDICES, w, h);
        const rl = indicesToCanvasPoints(lm, RIGHT_EYELINER_INDICES, w, h);
        if (ll) drawEyelinerMesh(ctx, ll, hex, alpha * 0.8);
        if (rl) drawEyelinerMesh(ctx, rl, hex, alpha * 0.8);
      },
      eyeshadow: (ctx, lm, w, h, hex, alpha) => {
        // Use clipped eyelid rendering to avoid shadow leaking to cheeks.
        drawEyeshadowClipped(ctx, lm, w, h, hex, alpha);
      },
      foundation: (ctx, lm, w, h, hex, alpha) => drawFoundationAdaptive(ctx, lm, w, h, hex, alpha),
    }),
    []
  );

  const buildOverlayPlan = useCallback((look, productsById, enabled) => {
    if (!look?.products) return [];
    const entries = Object.entries(look.products);
    return entries
      .filter(([k, v]) => enabled?.[k] !== false && v?.productId)
      .map(([k, v]) => {
        const product = productsById.get(String(v.productId)) || null;
        const hex = normalizeHex(v?.selectedHex) || pickHexFromProduct(product);
        return { key: k, product, hex, reason: v?.reason || '', selectedColorName: v?.selectedColorName || '' };
      })
      .filter((x) => x.product);
  }, []);

  const renderToCanvas = useCallback(
    async ({ canvas, imageEl, look, productsById, enabled, intensity = 0.8, showMakeup = true }) => {
      if (!canvas || !imageEl) return { ok: false, error: 'missing_canvas_or_image' };
      const ctx = canvas.getContext('2d');
      if (!ctx) return { ok: false, error: 'no_ctx' };

      const maxW = 920;
      const maxH = 660;
      const scale = Math.min(1, maxW / imageEl.naturalWidth, maxH / imageEl.naturalHeight);
      const w = Math.round(imageEl.naturalWidth * scale);
      const h = Math.round(imageEl.naturalHeight * scale);
      canvas.width = w;
      canvas.height = h;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(imageEl, 0, 0, w, h);
      if (!showMakeup || !look) return { ok: true, landmarksOk: false };

      let lm = null;
      try {
        lm = await detectFaceLandmarksWithFallback(imageEl);
      } catch {
        lm = null;
      }
      const landmarksOk = Array.isArray(lm) && lm.length >= MIN_LANDMARKS;
      if (!landmarksOk) return { ok: false, error: 'no_face_detected' };

      const plan = buildOverlayPlan(look, productsById, enabled);
      for (const item of plan) {
        const zoneCfg = makeupZones[item.key] || {};
        const baseOpacity = typeof zoneCfg.opacity === 'number' ? zoneCfg.opacity : 0.5;
        const alpha = Math.max(0, Math.min(1, baseOpacity * intensity));
        const renderer = renderers[item.key];
        if (!renderer) continue;
        renderer(ctx, lm, w, h, item.hex, alpha);
      }

      return { ok: true, landmarksOk: true };
    },
    [buildOverlayPlan, renderers]
  );

  return { renderToCanvas };
}

