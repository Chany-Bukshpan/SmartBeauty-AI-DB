/**
 * חותך את החלק התחתון של כל תמונה (איפה שמופיע הכיתוב)
 * מריצים: node src/scripts/cropImagesBottom.js (מתוך תיקיית server)
 */
import sharp from 'sharp';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '../../../client/public/images');

// 1-12: בלי חיתוך. 13-25: טיפה (3%). 26+: חיתוך כיתוב (16%)
const CROP_PERCENT_PAGE2 = 3;
const CROP_PERCENT_NEW = 16;

function getCropPercent(filename) {
  const num = parseInt(filename.replace('product_', '').replace('.png', ''), 10);
  if (num >= 26) return CROP_PERCENT_NEW;
  if (num >= 13) return CROP_PERCENT_PAGE2;
  return 0;
}

async function cropImage(filePath, percent) {
  const buffer = readFileSync(filePath);
  const meta = await sharp(buffer).metadata();
  const { width, height } = meta;
  const newHeight = Math.round(height * (1 - percent / 100));
  await sharp(buffer)
    .extract({ left: 0, top: 0, width, height: newHeight })
    .toFile(filePath);
  return { width, height, newHeight };
}

async function main() {
  const files = readdirSync(imagesDir)
    .filter((f) => f.startsWith('product_') && f.endsWith('.png'))
    .sort();
  console.log(`מעבד ${files.length} תמונות (1-12 ללא שינוי, 13-25 טיפה, 26+ חיתוך כיתוב)...`);
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const percent = getCropPercent(file);
    const { height, newHeight } = await cropImage(filePath, percent);
    console.log(`${file}: גובה ${height} → ${newHeight} (נחתך ${percent}%, ${height - newHeight} px)`);
  }
  console.log('הסתיים.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
