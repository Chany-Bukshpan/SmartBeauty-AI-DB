/**
 * מייצא את כל המוצרים מ-MongoDB לקובץ src/data/products.json (גיבוי / סנכרון).
 * לא מוחק מוצרים במסד.
 *
 * הרצה מתוך תיקיית server:
 *   npm run export-products
 */

import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { writeFileSync } from 'fs';
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

async function run() {
  try {
    await connect(dbUrl);
    const docs = await productModel.find().sort({ _id: 1 }).lean();
    const arr = docs.map((d) => {
      const { _id, __v, createdAt, updatedAt, ...rest } = d;
      return rest;
    });
    const jsonPath = path.join(__dirname, '../data/products.json');
    writeFileSync(jsonPath, JSON.stringify(arr, null, 2) + '\n', 'utf-8');
    console.log(`נשמרו ${arr.length} מוצרים ב: ${path.resolve(jsonPath)}`);
  } catch (err) {
    console.error('שגיאה:', err.message);
    process.exit(1);
  } finally {
    await disconnect().catch(() => {});
  }
}

run();
