/**
 * MediaPipe Face Mesh (הפתרון הקלאסי) — דיוק גבוה לשפתיים עם refineLandmarks.
 * חבילה: @mediapipe/face_mesh (מול @mediapipe/tasks-vision Face Landmarker).
 */
import { FaceMesh } from '@mediapipe/face_mesh';

const FACE_MESH_VERSION = '0.4.1633559619';
const CDN_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${FACE_MESH_VERSION}`;

let faceMeshInstance = null;
let initPromise = null;
let pendingResolve = null;
let pendingReject = null;

function initFaceMesh() {
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve, reject) => {
    try {
      const fm = new FaceMesh({
        locateFile: (file) => `${CDN_BASE}/${file}`,
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      fm.onResults((results) => {
        const lm = results.multiFaceLandmarks?.[0] || null;
        if (pendingResolve) {
          pendingResolve(lm);
          pendingResolve = null;
          pendingReject = null;
        }
      });
      faceMeshInstance = fm;
      resolve(fm);
    } catch (e) {
      reject(e);
    }
  });
  return initPromise;
}

/**
 * מחזיר מערך NormalizedLandmark (x,y,z ב־0–1) או null.
 * @param {HTMLImageElement | HTMLCanvasElement | HTMLVideoElement} image
 */
export async function detectFaceMeshLandmarks(image) {
  await initFaceMesh();
  const fm = faceMeshInstance;

  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;

    const timeoutId = setTimeout(() => {
      if (pendingReject) {
        pendingReject(new Error('FaceMesh timeout'));
        pendingResolve = null;
        pendingReject = null;
      }
    }, 25000);

    fm.send({ image })
      .then(() => clearTimeout(timeoutId))
      .catch((err) => {
        clearTimeout(timeoutId);
        if (pendingReject) {
          pendingReject(err);
          pendingResolve = null;
          pendingReject = null;
        }
      });
  });
}

/** גיבוי: Face Landmarker (tasks-vision) אם Face Mesh נכשל */
export async function detectFaceLandmarksWithFallback(image) {
  try {
    const lm = await detectFaceMeshLandmarks(image);
    if (lm && lm.length >= 468) return lm;
  } catch (e) {
    console.warn('[FaceMesh]', e);
  }
  const { detectFaceLandmarks } = await import('./mediapipeVision.js');
  try {
    const result = await detectFaceLandmarks(image, { numFaces: 1 });
    const lm = result?.faceLandmarks?.[0];
    if (lm && lm.length >= 468) return lm;
  } catch (e2) {
    console.warn('[Face Landmarker]', e2);
  }
  return null;
}
