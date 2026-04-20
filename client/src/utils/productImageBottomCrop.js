/**
 * Returns crop hint for catalog images by filename (product_NN.png): some assets have a bottom strip to clip.
 */
export function getProductImageCropKind(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null
  const m = imageUrl.match(/product_(\d+)\.(?:png|jpe?g|webp)$/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (n >= 32 && n <= 35) return 'four'
  if (n >= 43 && n <= 54) return 'tail12'
  return null
}
