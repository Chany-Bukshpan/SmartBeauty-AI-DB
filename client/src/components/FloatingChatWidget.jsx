/**
 * Site-wide floating chat: keyword-based product hints from Redux catalog + link to human support.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import './FloatingChatWidget.css';

const normalize = (text) => String(text || '').toLowerCase().trim();

const hasAny = (text, terms) => terms.some((t) => text.includes(t));

const STOP_WORDS = new Set(['אני', 'מחפשת', 'מחפש', 'רוצה', 'עם', 'בלי', 'של', 'את', 'על', 'זה', 'זאת', 'משהו', 'מוצר', 'מוצרים']);

function extractBudget(text) {
  const q = normalize(text);
  const m = q.match(/(?:עד|ב)?\s*(\d{2,4})\s*(?:₪|שח|ש״ח)?/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function pickProductsByCategory(products, categoryTerms = [], budget = null) {
  if (!products?.length) return [];
  return products
    .filter((p) => {
      const category = normalize(p.category);
      const name = normalize(p.makeupName || p.name);
      const byCategory = categoryTerms.some((t) => category.includes(t) || name.includes(t));
      const byBudget = budget == null || Number(p.price || 0) <= budget;
      return byCategory && byBudget && p.inStock;
    })
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    .slice(0, 3);
}

function pickProductsByKeywords(products, text, budget = null) {
  if (!products?.length) return [];
  const tokens = normalize(text)
    .split(/[\s,.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  if (!tokens.length) return [];

  return products
    .map((p) => {
      const name = normalize(p.makeupName || p.name);
      const brand = normalize(p.brand);
      const category = normalize(p.category);
      const hay = `${name} ${brand} ${category}`;
      let score = 0;
      for (const token of tokens) {
        if (name.includes(token)) score += 4;
        else if (brand.includes(token)) score += 3;
        else if (category.includes(token)) score += 2;
        else if (hay.includes(token)) score += 1;
      }
      if (budget != null && Number(p.price || 0) <= budget) score += 1;
      return { product: p, score };
    })
    .filter((x) => x.product.inStock && x.score > 0 && (budget == null || Number(x.product.price || 0) <= budget))
    .sort((a, b) => b.score - a.score || Number(a.product.price || 0) - Number(b.product.price || 0))
    .slice(0, 3)
    .map((x) => x.product);
}

function buildProductReply(products, categoryTerms, title, budget = null) {
  const picks = pickProductsByCategory(products, categoryTerms, budget);
  if (!picks.length) return `אין כרגע ${title} זמינים, אבל אפשר להציע קטגוריה דומה מהמלאי.`;
  const names = picks.map((p) => `${p.makeupName || p.name} (₪${p.price})`).join(', ');
  return `בטח. הנה ${title} שיכולים להתאים${budget ? ` עד ₪${budget}` : ''}: ${names}.`;
}

function buildBotReply(userText, products) {
  const q = normalize(userText);
  const budget = extractBudget(q);

  if (!q || q.length < 2) {
    return 'לא הבנתי—תוכלי לכתוב שוב במילים אחרות? אפשר גם לציין קטגוריה/מותג/תקציב.';
  }

  if (hasAny(q, ['היי', 'שלום', 'הלו', 'מה נשמע'])) {
    return 'היי, כאן הבוט של החנות. אפשר לעזור בבחירת מוצרים, משלוחים, הזמנות ותשלום.';
  }
  if (hasAny(q, ['משלוח', 'מתי מגיע', 'זמן אספקה', 'אספקה'])) {
    return 'זמן אספקה רגיל הוא כ-2 עד 5 ימי עסקים. בעמוד ההזמנות אפשר לעקוב אחרי סטטוס ההזמנה.';
  }
  if (hasAny(q, ['תשלום', 'אשראי', 'bit', 'paypal', 'מזומן'])) {
    return 'אפשר לשלם בכרטיס, Bit, PayPal או מזומן לשליח (במצב לימודי זה במצב טסט).';
  }
  if (hasAny(q, ['החזר', 'החלפה', 'ביטול', 'להחזיר'])) {
    return 'ניתן לבצע החלפה/החזרה לפי מדיניות האתר. אם תרצי, אסביר בדיוק איך לבצע בקשה.';
  }
  if (hasAny(q, ['הזמנה', 'הזמנות', 'סטטוס'])) {
    return 'אפשר לראות את כל ההזמנות בעמוד "ההזמנות שלי", כולל סטטוס משלוח ותשלום.';
  }
  if (hasAny(q, ['שפתון', 'שפתיים', 'ליפסטיק', 'גלוס'])) {
    return buildProductReply(products, ['שפת', 'lip', 'גלוס'], 'מוצרי שפתיים', budget);
  }
  if (hasAny(q, ['סומק', 'פנים', 'פאונדיישן', 'קונסילר'])) {
    return buildProductReply(products, ['פנים', 'סומק', 'פאונדיישן', 'קונסילר'], 'מוצרי פנים', budget);
  }
  if (hasAny(q, ['עיניים', 'צללית', 'איילנר', 'מסקרה', 'ריסים'])) {
    return buildProductReply(products, ['עין', 'עיניים', 'ריס', 'צללית', 'איילנר'], 'מוצרי עיניים', budget);
  }

  const keywordPicks = pickProductsByKeywords(products, q, budget);
  if (keywordPicks.length) {
    const names = keywordPicks.map((p) => `${p.makeupName || p.name} (₪${p.price})`).join(', ');
    return `מצאתי התאמות לפי מה שכתבת${budget ? ` (עד ₪${budget})` : ''}: ${names}.`;
  }

  const looksLikeQuestion = q.includes('?') || hasAny(q, ['איך', 'למה', 'מתי', 'איפה', 'כמה', 'מה']);
  if (looksLikeQuestion) {
    return (
      'אין לי מספיק מידע כדי לענות בוודאות. ' +
      'תוכלי לפרט קצת (למשל מוצר/מותג/תקציב/מטרה)? ' +
      'אם תרצי—נעביר אותך לנציג אנושי.'
    );
  }
  return (
    'לא הבנתי בדיוק למה התכוונת. ' +
    'תוכלי לנסח מחדש או לתת דוגמה? ' +
    'אם זה דחוף—נעביר אותך לנציג אנושי. ' +
    'דוגמאות: "שפתון עמיד עד 100", "מה זמני המשלוח?", "איך משלמים?"'
  );
}

export default function FloatingChatWidget() {
  const products = useSelector((state) => state.products.items || []);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  useEffect(() => {
    return () => clearTimeout(typingTimerRef.current);
  }, []);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { sender: 'לקוח', text }]);
    setInput('');
    setIsTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      const reply = buildBotReply(text, products);
      setMessages((prev) => [...prev, { sender: 'בוט', text: reply }]);
      setIsTyping(false);
    }, 800);
  };

  const closeAndRestart = () => {
    setMessages([]);
    setInput('');
    setIsTyping(false);
  };

  return (
    <div className="floating-chat-root">
      {open && (
        <div className="floating-chat-panel">
          <div className="floating-chat-header">
            <div>
              <h4>צ׳אט תמיכה</h4>
              <small>בוט שירות זמין 24/7</small>
            </div>
          </div>

          <div className="floating-chat-body">
            <div className="floating-chat-messages">
              {messages.length === 0 && (
                <div className="floating-chat-msg sys">היי, אני הבוט של החנות. איך אפשר לעזור?</div>
              )}
              {messages.map((m, i) => (
                <div key={`${m.sender}-${i}`} className={`floating-chat-msg ${m.sender === 'לקוח' ? 'user' : 'agent'}`}>
                  {m.sender !== 'לקוח' ? <strong>{m.sender}: </strong> : null}
                  {m.text}
                </div>
              ))}
              {isTyping && <div className="floating-chat-msg agent">הבוט מקליד...</div>}
            </div>
            <div className="floating-chat-input">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="כתבי הודעה..."
              />
              <button type="button" onClick={sendMessage} disabled={!canSend}>שליחה</button>
            </div>
            <button type="button" className="floating-chat-reset" onClick={closeAndRestart}>ניקוי צ׳אט</button>
          </div>
        </div>
      )}

      {!open && (
        <button type="button" className="floating-chat-hint" onClick={() => setOpen(true)}>
          היי 👋 צריכים עזרה?
        </button>
      )}

      <button
        type="button"
        className="floating-chat-launcher"
        onClick={() => setOpen((v) => !v)}
        aria-label="פתיחת צ׳אט תמיכה"
      >
        {open ? (
          <svg className="floating-chat-launcher-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg className="floating-chat-launcher-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 4h16v11a2 2 0 0 1-2 2H9l-4.2 3.6c-.34.29-.8.05-.8-.4V17a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm4.2 7.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm3.8 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm3.8 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
