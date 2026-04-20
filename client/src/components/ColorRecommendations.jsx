function normalizeHex(hex) {
  const raw = String(hex || '').trim();
  if (!raw) return '';
  if (raw.startsWith('#')) return raw.toLowerCase();
  return `#${raw}`.toLowerCase();
}

function hexToRgb(hex) {
  const raw = normalizeHex(hex).replace('#', '');
  if (![3, 6].includes(raw.length)) return null;
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hexDistance(a, b) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return Infinity;
  const dr = ra.r - rb.r;
  const dg = ra.g - rb.g;
  const db = ra.b - rb.b;
  return dr * dr + dg * dg + db * db;
}

function normalizeAiColorItem(item) {
  if (!item || typeof item !== 'object') return null;
  const hex =
    item.hex ||
    item.hexCode ||
    item.color ||
    item.value ||
    item.code ||
    '';
  const name = item.name || item.label || item.title || item.color_name || '';
  const normalizedHex = normalizeHex(hex);
  if (!normalizedHex || normalizedHex === '#') return null;
  return { hex: normalizedHex, name: name || normalizedHex };
}

function categoryKeyFromProduct(productCategory) {
  if (productCategory === 'lipstick') return 'lipstick';
  if (productCategory === 'eyeshadow') return 'eyeshadow';
  if (productCategory === 'eyeliner') return 'eyeshadow';
  if (productCategory === 'blush') return 'blush';
  return 'foundation';
}

export default function ColorRecommendations({
  analysis,
  productCategory,
  availableColors,
  selectedColorId,
  onSelectColor,
}) {
  if (!analysis?.recommended_colors) return null;
  if (!availableColors || availableColors.length === 0) return null;

  const categoryKey = categoryKeyFromProduct(productCategory);

  const categoryLabel =
    productCategory === 'lipstick'
      ? 'שפתיים'
      : productCategory === 'eyeshadow'
        ? 'עיניים / צלליות'
        : productCategory === 'eyeliner'
          ? 'איילנר / קו עין'
          : productCategory === 'blush'
            ? 'סומק'
            : 'פאונדיישן';

  const recArr = analysis.recommended_colors[categoryKey];
  const aiHexes = Array.isArray(recArr)
    ? recArr.map(normalizeAiColorItem).filter(Boolean).map((x) => x.hex)
    : [];

  if (productCategory === 'foundation') {
    const shade = analysis.recommended_colors.foundation_shade || '-';
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-neutral-800">גוון פאונדיישן מומלץ</div>
        <p className="text-sm text-neutral-700">
          <span className="font-semibold">{shade}</span>
        </p>
        {availableColors.length > 0 && (
          <>
            <div className="mt-4 text-xs font-semibold text-neutral-600">גווני המוצר (לסימולציה)</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableColors.map((c) => {
                const hex = normalizeHex(c.hexCode || c.hex);
                const isSel = c.id === selectedColorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectColor(c)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition ${
                      isSel
                        ? 'border-[var(--accent)] bg-[rgba(201,169,110,0.12)] ring-2 ring-[var(--accent)]'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    }`}
                    aria-label={c.name || `גוון ${c.id}`}
                  >
                    <span
                      className="h-10 w-10 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: hex || '#ccc' }}
                    />
                    {c.name && (
                      <span className="max-w-[5rem] truncate text-center text-[10px] font-medium text-neutral-700">
                        {c.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {analysis.reasoning && (
          <div className="mt-3 text-xs leading-relaxed text-neutral-600">{analysis.reasoning}</div>
        )}
      </div>
    );
  }

  const scored = availableColors.map((c) => {
    const cHex = normalizeHex(c.hexCode || c.hex);
    let best = Infinity;
    for (const h of aiHexes) {
      best = Math.min(best, hexDistance(cHex, h));
    }
    if (!Number.isFinite(best)) best = Infinity;
    return { color: c, dist: best };
  });

  scored.sort((a, b) => a.dist - b.dist);
  const rankById = new Map();
  scored.forEach((s, i) => {
    rankById.set(s.color.id, i + 1);
  });

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-1 text-sm font-semibold text-neutral-800">גווני המוצר לסימולציה</div>
      <p className="mb-3 text-xs text-neutral-500">
        האזור על הפנים: <span className="font-medium text-neutral-700">{categoryLabel}</span> — בחרי גוון
        מהמוצר; ההמלצה מסומנת לפי קרבה לגוון שהמערכת הציעה.
      </p>

      <div className="flex flex-wrap gap-2">
        {scored.map(({ color: c }) => {
          const hex = normalizeHex(c.hexCode || c.hex);
          const isSel = c.id === selectedColorId;
          const rank = rankById.get(c.id);
          const isTop = rank <= 3 && aiHexes.length > 0;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectColor(c)}
              className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 transition ${
                isSel
                  ? 'border-[var(--accent)] bg-[rgba(201,169,110,0.12)] ring-2 ring-[var(--accent)]'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50'
              }`}
              aria-label={c.name || `גוון ${c.id}`}
            >
              {isTop && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white shadow">
                  {rank}
                </span>
              )}
              <span
                className="h-11 w-11 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: hex || '#ccc' }}
              />
              {c.name && (
                <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium text-neutral-800">
                  {c.name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {analysis.reasoning && (
        <div className="mt-3 text-xs leading-relaxed text-neutral-600">{analysis.reasoning}</div>
      )}
    </div>
  );
}
