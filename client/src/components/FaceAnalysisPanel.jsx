const SKIN_HE = {
  fair: 'בהיר מאוד',
  light: 'בהיר',
  medium: 'בינוני',
  tan: 'שזוף',
  deep: 'כהה',
};

const UNDERTONE_HE = {
  warm: 'חמים',
  cool: 'קרים',
  neutral: 'ניטרלי',
};

const FACE_HE = {
  oval: 'סגלגל',
  round: 'עגול',
  square: 'מרובע',
  heart: 'בצורת לב',
  diamond: 'יהלום',
};

function displayHe(map, val) {
  if (val == null || val === '') return '—';
  const s = String(val).trim();
  const key = s.toLowerCase();
  if (map[key]) return map[key];
  if (/[\u0590-\u05FF]/.test(s)) return s;
  return s;
}

const FALLBACK_SUMMARY_HE =
  'התיאור חזר בעיקר באנגלית. נסי שוב או העלו תמונה חדה ומוארת יותר — הניתוח מוצג בעברית בלבד.';
const FALLBACK_REASON_HE =
  'ההסבר חזר בעיקר באנגלית. נסי שוב; ההמלצות מבוססות על גוון העור והתאורה בתמונה.';

/** אם ריק — null (מציגים —). אם בעיקר לטינית — הודעת גיבוי בעברית */
function preferHebrewParagraph(text, latinFallback) {
  if (text == null || typeof text !== 'string') return null;
  const t = text.trim();
  if (!t) return null;
  const he = (t.match(/[\u0590-\u05FF]/g) || []).length;
  const lat = (t.match(/[a-zA-Z]/g) || []).length;
  if (lat > 8 && lat > he * 1.2) return latinFallback;
  return t;
}

export default function FaceAnalysisPanel({ analysis }) {
  if (!analysis) return null;

  const isDemo = Boolean(analysis.demoMode);

  const skinTone = displayHe(SKIN_HE, analysis.skin_tone);
  const undertone = displayHe(UNDERTONE_HE, analysis.undertone);
  const faceShape = displayHe(FACE_HE, analysis.face_shape);
  const eyeColor = displayHe({}, analysis.eye_color);

  const summary = preferHebrewParagraph(analysis.features_summary, FALLBACK_SUMMARY_HE) ?? '—';
  const reasoning = preferHebrewParagraph(analysis.reasoning, FALLBACK_REASON_HE) ?? '—';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      {isDemo && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          מצב דמו — תוצאות לדוגמה בלבד.
        </div>
      )}

      <h3 className="mb-3 text-sm font-bold text-neutral-900">סיכום ניתוח</h3>

      <ul className="mb-4 grid gap-2 text-sm text-neutral-800 sm:grid-cols-2">
        <li className="flex flex-col rounded-lg bg-neutral-50 px-3 py-2">
          <span className="text-xs font-semibold text-neutral-500">גוון עור</span>
          <span className="mt-0.5">{skinTone}</span>
        </li>
        <li className="flex flex-col rounded-lg bg-neutral-50 px-3 py-2">
          <span className="text-xs font-semibold text-neutral-500">תת־גוון</span>
          <span className="mt-0.5">{undertone}</span>
        </li>
        <li className="flex flex-col rounded-lg bg-neutral-50 px-3 py-2">
          <span className="text-xs font-semibold text-neutral-500">צורת פנים</span>
          <span className="mt-0.5">{faceShape}</span>
        </li>
        <li className="flex flex-col rounded-lg bg-neutral-50 px-3 py-2">
          <span className="text-xs font-semibold text-neutral-500">עיניים</span>
          <span className="mt-0.5">{eyeColor}</span>
        </li>
      </ul>

      <div className="space-y-3 border-t border-neutral-100 pt-3">
        <div>
          <div className="text-xs font-semibold text-neutral-600">מה רואים בתמונה</div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
            {summary}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-neutral-600">המלצה</div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
            {reasoning}
          </p>
        </div>
      </div>
    </div>
  );
}
