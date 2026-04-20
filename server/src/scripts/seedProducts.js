/**
 * סקריפט להזרעת מוצרים למסד הנתונים (MongoDB).
 *
 * ⚠️  פעולה הרסנית: מוחקת את כל המוצרים במסד ומייבאת מחדש מ-products.json
 *     רץ רק עם אישור מפורש — ראו למטה.
 *
 * הרצה (מתוך תיקיית server):
 *   npm run seed -- --force
 *   או:  SEED_FORCE=1 npm run seed   (Linux/Mac)
 *   או:  set SEED_FORCE=1 && npm run seed   (Windows CMD)
 *
 * כדי להוסיף מוצרים ל-JSON: ערכי את src/data/products.json
 */

import 'dotenv/config';
import { connect } from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { productModel } from '../models/product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI;

if (!dbUrl) {
  console.error('חסר MONGODB_URI או DB_URI ב-.env');
  process.exit(1);
}

const allowDestructive =
  process.argv.includes('--force') ||
  process.argv.includes('-f') ||
  String(process.env.SEED_FORCE || '').trim() === '1';

if (!allowDestructive) {
  console.error('');
  console.error('══════════════════════════════════════════════════════════════');
  console.error('  seed לא רץ — כדי למנוע מחיקת כל המוצרים בטעות.');
  console.error('');
  console.error('  • הפעלה מחדש של השרת (npm run dev / start) לא מוחקת מוצרים.');
  console.error('  • רק סקריפט זה (עם --force) מוחק ומייבא מחדש מ-products.json.');
  console.error('');
  console.error('  לאיפוס מלא מכוון:  npm run seed -- --force');
  console.error('══════════════════════════════════════════════════════════════');
  console.error('');
  process.exit(1);
}

async function seed() {
  try {
    const jsonPath = path.join(__dirname, '../data/products.json');
    const absolutePath = path.resolve(jsonPath);
    console.log('קורא קובץ:', absolutePath);

    let json = readFileSync(jsonPath, 'utf-8');
    if (json.charCodeAt(0) === 0xFEFF) json = json.slice(1);
    let products;
    try {
      products = JSON.parse(json);
    } catch (parseErr) {
      console.error('שגיאה ב-JSON בקובץ products.json:');
      console.error(parseErr.message);
      console.error('');
      console.error('וודאי: פסיק בין כל מוצר למוצר, בלי פסיק אחרי המוצר האחרון בשורה.');
      console.error('כל מוצר צריך: makeupName, brand, category, description, imageUrl, price, inStock');
      process.exit(1);
    }

    if (!Array.isArray(products)) {
      console.error('הקובץ חייב להכיל מערך של מוצרים (מתחיל ב-[ ומסתיים ב-])');
      process.exit(1);
    }

    await connect(dbUrl);
    console.log('מתחבר ל-MongoDB...');

    // קודם מוחקים את כל המוצרים הקיימים, כדי שלא יצטברו בכל הרצת seed
    const deleted = await productModel.deleteMany({});
    console.log(`נמחקו ${deleted.deletedCount} מוצרים ישנים.`);

    const result = await productModel.insertMany(products);
    console.log(`הוזנו ${result.length} מוצרים בהצלחה.`);
  } catch (err) {
    console.error('שגיאה:', err.message);
    if (err.message && err.message.includes('validation')) {
      console.error('וודאי שלכל מוצר יש: makeupName, brand, category, imageUrl, price (מספר), inStock (true/false)');
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
