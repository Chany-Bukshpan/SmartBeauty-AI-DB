/**
 * MediaPipe Tasks Vision — טעינה עצלה של Face Landmarker.
 * חבילה: @mediapipe/tasks-vision (ראו package.json).
 *
 * WASM + מודל נטענים מהרשת בפעם הראשונה. אפשר גם HandLandmarker, PoseLandmarker וכו'
 * מאותו ייבוא: import { HandLandmarker } from '@mediapipe/tasks-vision';
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/** תואם לגרסה ב־package.json — עדכנו יחד עם npm install */
export const MEDIAPIPE_TASKS_VISION_VERSION = '0.10.33';

const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`;

/** מודל רשמי (Google) — Face Landmarker */
export const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let faceLandmarkerPromise = null;

/**
 * @returns {Promise<import('@mediapipe/tasks-vision').FaceLandmarker>}
 */
export async function getFaceLandmarker(options = {}) {
  if (faceLandmarkerPromise) return faceLandmarkerPromise;

  faceLandmarkerPromise = (async () => {
    const wasm = await FilesetResolver.forVisionTasks(WASM_BASE, true);
    return FaceLandmarker.createFromOptions(wasm, {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL_URL,
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      numFaces: options.numFaces ?? 1,
      minFaceDetectionConfidence: options.minFaceDetectionConfidence ?? 0.5,
      minFacePresenceConfidence: options.minFacePresenceConfidence ?? 0.5,
      minTrackingConfidence: options.minTrackingConfidence ?? 0.5,
      outputFaceBlendshapes: options.outputFaceBlendshapes ?? false,
      outputFacialTransformationMatrixes: options.outputFacialTransformationMatrixes ?? false,
    });
  })();

  return faceLandmarkerPromise;
}

/**
 * @param {HTMLImageElement | HTMLCanvasElement | ImageBitmap} imageSource
 * @returns {Promise<import('@mediapipe/tasks-vision').FaceLandmarkerResult>}
 */
export async function detectFaceLandmarks(imageSource, options) {
  const landmarker = await getFaceLandmarker(options);
  return landmarker.detect(imageSource);
}

/** איפוס (למשל אחרי שינוי אפשרויות) — בדרך כלל לא נדרש */
export function resetFaceLandmarkerCache() {
  faceLandmarkerPromise = null;
}

export { FaceLandmarker, FilesetResolver };
