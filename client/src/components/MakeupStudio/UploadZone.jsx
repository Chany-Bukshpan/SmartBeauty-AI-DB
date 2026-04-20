import { useCallback, useMemo, useRef } from 'react';

export default function UploadZone({ onFile, busy }) {
  const accept = useMemo(() => 'image/*', []);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (busy) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) onFile?.(file);
    },
    [onFile, busy]
  );

  return (
    <div
      className={`sc-studio-upload ${busy ? 'is-busy' : ''}`}
      onClick={() => {
        if (busy) return;
        inputRef.current?.click?.();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (busy) return;
          inputRef.current?.click?.();
        }
      }}
      aria-label="גרירה והעלאה של תמונה"
    >
      <div className="sc-studio-upload-inner">
        <div className="sc-studio-upload-title">גררי תמונת פנים לכאן</div>
        <div className="sc-studio-upload-sub">או לחצי כדי לבחור קובץ</div>
        <input
          id="sc-studio-file"
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile?.(f);
            e.target.value = '';
          }}
          className="sc-studio-upload-input"
        />
      </div>
    </div>
  );
}

