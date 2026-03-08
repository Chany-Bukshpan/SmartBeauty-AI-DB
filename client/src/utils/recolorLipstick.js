/**
 * צביעה מחדש של פיקסלי "אודם" (ורוד/אדום) בתמונה - רק האזורים הרלוונטיים משתנים.
 */

function hexToRgb(hex) {
  const m = hex.replace(/^#/, '').match(/^(..)(..)(..)$/);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, l };
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const c = l * 255;
    return { r: c, g: c, b: c };
  }
  h /= 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
  };
}

/** האם הפיקסל נחשב אודם או עיגול צבע - כל הגוונים הוורודים/אדומים/כתומים-אדומים, כולל עיגולים קטנים */
function isLipstickPixel(h, s, l) {
  const isRedPinkCoralHue = h >= 310 || h <= 70;
  const hasEnoughSaturation = s >= 0.12;
  const notWhiteOrBlack = l >= 0.12 && l <= 0.95;
  return isRedPinkCoralHue && hasEnoughSaturation && notWhiteOrBlack;
}

/**
 * מעבר על ImageData ומחליף רק פיקסלי אודם בצבע היעד (שומר את ה-lightness המקורי לצלילות).
 */
export function recolorLipstickInImageData(imageData, targetHex) {
  const target = hexToRgb(targetHex);
  if (!target) return;
  const { data } = imageData;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;

    const { h, s, l } = rgbToHsl(r, g, b);
    if (!isLipstickPixel(h, s, l)) continue;

    const targetHsl = rgbToHsl(target.r, target.g, target.b);
    const newRgb = hslToRgb(targetHsl.h, targetHsl.s, l);
    data[i] = newRgb.r;
    data[i + 1] = newRgb.g;
    data[i + 2] = newRgb.b;
  }
}
