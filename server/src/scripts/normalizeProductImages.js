/**
 * מנרמל את כל תמונות המוצרים:
 * - חיתוך מהתחתית (הסרת כיתובים שחורים)
 * - גודל אחיד (ריבוע) עם המוצר במרכז
 * הרצה: מתוך תיקיית server → node src/scripts/normalizeProductImages.js
 */
import sharp from 'sharp';
import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '../../../client/public/images');

const OUTPUT_SIZE = 400; // ריבוע 400x400 פיקסלים

// אחוז חיתוך מהתחתית (הסרת כיתוב/רקע): דף 1 - מעט, דף 2 - בינוני, דף 3+ - כיתוב שחור
const CROP_BOTTOM = {
  page1: 2,   // 1-12
  page2: 8,   // 13-25
  page3: 18,  // 26+ (כיתובים שחורים)
};

function getCropPercent(filename) {
  const num = parseInt(filename.replace('product_', '').replace('.png', ''), 10);
  if (num >= 26) return CROP_BOTTOM.page3;
  if (num >= 13) return CROP_BOTTOM.page2;
  return CROP_BOTTOM.page1;
}

async function normalizeImage(filePath, cropPercent) {
  const buffer = readFileSync(filePath);
  const meta = await sharp(buffer).metadata();
  let { width, height } = meta;

  // 1. חיתוך מהתחתית (הסרת כיתוב)
  const newHeight = Math.max(100, Math.round(height * (1 - cropPercent / 100)));
  let pipeline = sharp(buffer).extract({ left: 0, top: 0, width, height: newHeight });
  height = newHeight;

  // 2. ריזוז לריבוע אחיד עם מירכוז (המוצר במרכז)
  await pipeline
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'cover', position: 'center' })
    .toFile(filePath);

  return { original: meta.width + 'x' + meta.height, output: OUTPUT_SIZE + 'x' + OUTPUT_SIZE };
}

async function main() {
  if (!existsSync(imagesDir)) {
    console.error('התיקייה לא נמצאה:', imagesDir);
    process.exit(1);
  }

  const files = readdirSync(imagesDir)
    .filter((f) => f.startsWith('product_') && f.endsWith('.png'))
    .sort((a, b) => {
      const n1 = parseInt(a.replace(/\D/g, ''), 10);
      const n2 = parseInt(b.replace(/\D/g, ''), 10);
      return n1 - n2;
    });

  if (files.length === 0) {
    console.log('לא נמצאו קבצי product_*.png בתיקייה:', imagesDir);
    return;
  }

  console.log(`מנרמל ${files.length} תמונות ל-${OUTPUT_SIZE}x${OUTPUT_SIZE}, מירכוז + הסרת כיתוב...`);
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const cropPercent = getCropPercent(file);
    const result = await normalizeImage(filePath, cropPercent);
    console.log(`${file}: חיתוך תחתית ${cropPercent}% → ${result.output}`);
  }
  console.log('הסתיים.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
