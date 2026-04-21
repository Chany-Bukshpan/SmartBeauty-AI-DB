/**
 * הודעות עזר כש-Google Sign-In נכשל (דומיין לא מאושר / ספק לא מופעל).
 */
export function toastDetailForFirebaseGoogleError(code) {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const hostTip = host
    ? ` הדומיין של האתר עכשיו: ${host} — צריך להופיע ברשימת Authorized domains ב-Firebase.`
    : "";

  if (code === "auth/unauthorized-domain") {
    return (
      "הדומיין שבו האתר רץ לא מופיע ב-Firebase. כנסי ל-Firebase Console → Authentication → Settings → Authorized domains → Add domain, והוסיפי את הדומיין של האתר (למשל makeup-store-front.onrender.com)." +
      hostTip
    );
  }
  if (code === "auth/operation-not-allowed") {
    return (
      "ספק Google לא מופעל בפרויקט. כנסי ל-Firebase Console → Authentication → Sign-in method → Google → Enable." +
      hostTip
    );
  }
  return null;
}
