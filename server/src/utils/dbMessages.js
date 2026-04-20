export const DB_UNAVAILABLE_MSG =
  "המסד לא מחובר — התחברות ורישום דורשים MongoDB. בדקי: MONGODB_URI ב־server/.env, שרת MongoDB/Atlas פעיל, ו־Network Access ב־Atlas שמאפשר את ה־IP שלך (או 0.0.0.0/0 לבדיקות).";

export function mapMongooseUserErr(err) {
  const m = String(err?.message || "");
  if (m.includes("buffering timed out")) return DB_UNAVAILABLE_MSG;
  return m || "Unknown error";
}
