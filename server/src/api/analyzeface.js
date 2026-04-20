import dns from 'node:dns';
import https from 'node:https';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

dns.setDefaultResultOrder?.('ipv4first');

/**
 * הוראות מבנה באנגלית — המודלים מחזירים JSON תקין יותר כך.
 * דרישת עברית מפורשת בתוך הפרומפט (לא רק בעברית).
 */
const SYSTEM_PROMPT = `You are an expert makeup artist. Analyze the face in the photo and return exactly ONE JSON object (no markdown fences).

Required JSON shape:
{
  "skin_tone": "fair" | "light" | "medium" | "tan" | "deep",
  "undertone": "warm" | "cool" | "neutral",
  "face_shape": "oval" | "round" | "square" | "heart" | "diamond",
  "eye_color": "string (Hebrew only, short)",
  "features_summary": "string (Hebrew only, 1-2 sentences: skin, lighting, clarity)",
  "reasoning": "string (Hebrew only, 2-4 sentences: why these color families fit)",
  "recommended_colors": {
    "lipstick": [ { "hex": "#RRGGBB", "name": "Hebrew shade name only" }, ... 3 items ],
    "eyeshadow": [ { "hex": "#RRGGBB", "name": "Hebrew shade name only" }, ... 3 items ],
    "blush": [ { "hex": "#RRGGBB", "name": "Hebrew shade name only" }, ... 3 items ],
    "foundation_shade": "Hebrew string only (e.g. בינוני ניטרלי)"
  }
}

LANGUAGE RULES (critical):
- All user-visible strings MUST be in Hebrew: eye_color, features_summary, reasoning, each "name", foundation_shade.
- Do not use English words in those Hebrew strings (shade names may be Hebrew transliterations if needed).
- Only the enum values for skin_tone, undertone, face_shape use English tokens as shown.`;

function stripDataUrlPrefix(data) {
  if (typeof data !== 'string') return '';
  const trimmed = data.trim();
  const commaIdx = trimmed.indexOf(',');
  return commaIdx !== -1 ? trimmed.slice(commaIdx + 1) : trimmed;
}

function extractMediaType(dataUrl) {
  if (typeof dataUrl !== 'string') return 'image/jpeg';
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,/i);
  return match?.[1] || 'image/jpeg';
}

function parseJsonFromText(text) {
  if (typeof text !== 'string') return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  const firstBrace = t.indexOf('{');
  const lastBrace = t.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const candidate = t.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/** פרסור עמיד: JSON ישיר, קוד בתוך fence, או חילוץ אובייקט {...} */
function parseAnalysisJsonFromModelText(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    void 0;
  }
  const fromFence = parseJsonFromText(trimmed);
  if (fromFence) return fromFence;

  const first = trimmed.indexOf('{');
  if (first === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = first; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  const slice = trimmed.slice(first, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function normalizeColorItem(x) {
  if (!x) return null;
  if (typeof x === 'string') {
    const hex = x.match(/#[0-9A-Fa-f]{3,8}/)?.[0];
    return hex ? { hex, name: hex } : null;
  }
  if (typeof x === 'object') {
    const hex = x.hex || x.hexCode || x.color || x.value || '';
    const name = x.name || x.label || x.title || hex || '';
    if (!hex) return null;
    return { hex: String(hex).startsWith('#') ? String(hex) : `#${hex}`, name: String(name) };
  }
  return null;
}

function normalizeColorArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeColorItem).filter(Boolean).slice(0, 3);
}

function getDemoAnalysis() {
  const base = normalizeAnalysis({
    skin_tone: 'medium',
    undertone: 'warm',
    face_shape: 'oval',
    eye_color: 'חום',
    features_summary: 'תצוגה לדוגמה — תאורה אחידה ועור נראה טבעי.',
    recommended_colors: {
      lipstick: [
        { hex: '#C4756B', name: 'ורוד עתיק' },
        { hex: '#B85C5C', name: 'פטל' },
        { hex: '#8B3A3A', name: 'אדום עמוק' },
      ],
      eyeshadow: [
        { hex: '#C9A962', name: 'זהב חם' },
        { hex: '#6B5B4F', name: 'חום מעושן' },
        { hex: '#A89078', name: 'נוד' },
      ],
      blush: [
        { hex: '#E8A598', name: 'קורל' },
        { hex: '#F4A88A', name: 'אפרסק' },
        { hex: '#D4A59A', name: 'ורוד עור' },
      ],
      foundation_shade: 'בינוני חם',
    },
    reasoning: 'תוצאות לדוגמה — ההמלצות מותאמות לפי גוון עור ותאורה.',
  });
  return { ...base, demoMode: true, aiProvider: 'demo' };
}

function normalizeAnalysis(parsed) {
  const rcIn = parsed?.recommended_colors || parsed?.recommendedColors || {};
  const lipstick = normalizeColorArray(rcIn.lipstick);
  const eyeshadow = normalizeColorArray(rcIn.eyeshadow);
  const blush = normalizeColorArray(rcIn.blush);
  const foundation_shade =
    rcIn.foundation_shade ||
    rcIn.foundationShade ||
    (typeof rcIn.foundation === 'string' ? rcIn.foundation : '') ||
    'medium neutral';

  return {
    skin_tone: parsed?.skin_tone || parsed?.skinTone || 'medium',
    undertone: parsed?.undertone || 'neutral',
    face_shape: parsed?.face_shape || parsed?.faceShape || 'oval',
    eye_color: parsed?.eye_color || parsed?.eyeColor || 'unknown',
    features_summary: parsed?.features_summary || parsed?.featuresSummary || '',
    recommended_colors: {
      lipstick: lipstick.length ? lipstick : [{ hex: '#C08081', name: 'נוד' }, { hex: '#DB7093', name: 'ורוד' }, { hex: '#8B0000', name: 'אדום' }],
      eyeshadow: eyeshadow.length ? eyeshadow : [{ hex: '#D4AF37', name: 'זהב' }, { hex: '#8B4513', name: 'חום' }, { hex: '#C0C0C0', name: 'כסף' }],
      blush: blush.length ? blush : [{ hex: '#F4A88A', name: 'אפרסק' }, { hex: '#E8A598', name: 'קורל' }, { hex: '#FFB6C1', name: 'ורוד' }],
      foundation_shade,
    },
    reasoning: parsed?.reasoning || parsed?.explanation || 'המלצות מותאמות לפי גוון העור והתאורה בתמונה.',
  };
}

/** רק למחרוזת לא ריקה — האם נראית כמו אנגלית ולא עברית */
function isMostlyLatinUserText(s) {
  if (typeof s !== 'string' || !s.trim()) return false;
  const he = (s.match(/[\u0590-\u05FF]/g) || []).length;
  const lat = (s.match(/[a-zA-Z]/g) || []).length;
  return lat > 6 && lat > he * 1.2;
}

function ensureHebrewUserStrings(analysis) {
  try {
    const fallbackSummary =
      'בתמונה נראים פנים טבעיות; התאורה והחדות משפיעים על הדיוק. ניתן להעלות תמונה חדה יותר לניתוח מדויק יותר.';
    const fallbackReasoning =
      'ההמלצות מבוססות על גוון העור, תת־הגוון והתאורה שזוהו — כדי לבחור גוונים שמשתלבים עם המראה הכללי.';
    const out = { ...analysis };

    const fs = out.features_summary;
    if (typeof fs !== 'string' || !fs.trim() || isMostlyLatinUserText(fs)) {
      out.features_summary = fallbackSummary;
    }
    const rs = out.reasoning;
    if (typeof rs !== 'string' || !rs.trim() || isMostlyLatinUserText(rs)) {
      out.reasoning = fallbackReasoning;
    }
    if (typeof out.eye_color === 'string' && out.eye_color.trim() && isMostlyLatinUserText(out.eye_color)) {
      out.eye_color = 'לא זוהה בבירור — נסי תמונה חדה יותר';
    }
    if (typeof out.recommended_colors?.foundation_shade === 'string') {
      const fsh = out.recommended_colors.foundation_shade;
      if (fsh.trim() && isMostlyLatinUserText(fsh)) {
        out.recommended_colors = {
          ...out.recommended_colors,
          foundation_shade: 'בינוני ניטרלי',
        };
      }
    }
    const rc = out.recommended_colors;
    if (rc && typeof rc === 'object') {
      for (const key of ['lipstick', 'eyeshadow', 'blush']) {
        const arr = rc[key];
        if (!Array.isArray(arr)) continue;
        rc[key] = arr.map((item) => {
          if (!item || typeof item !== 'object') return item;
          const name = item.name;
          if (typeof name === 'string' && name.trim() && isMostlyLatinUserText(name)) {
            return { ...item, name: item.hex || 'גוון' };
          }
          return item;
        });
      }
    }
    return out;
  } catch (e) {
    console.warn('ensureHebrewUserStrings:', e);
    return analysis;
  }
}

function trimEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

const GEMINI_USER_PROMPT =
  'Analyze this face photo. Return ONLY one valid JSON object matching the schema from the system prompt. ' +
  'All user-visible strings must be in Hebrew (features_summary, reasoning, eye_color, color names, foundation_shade). ' +
  'If no clear face is visible, still return valid JSON with the same keys and explain in Hebrew in "reasoning".';

const GEMINI_DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

function isGeminiModelNotFoundError(err) {
  const s = String(err?.message || err || '');
  return /404|not found|not supported for generateContent|is not found for API version/i.test(
    s
  );
}

function isGeminiRateLimitError(err) {
  const s = String(err?.message || err || '');
  return /429|Too Many Requests|quota exceeded|exceeded your current quota|RESOURCE_EXHAUSTED/i.test(
    s
  );
}

function isUnparseableGeminiError(err) {
  return err?.code === 'UNPARSEABLE';
}

function geminiErrorForClient(err) {
  if (!isGeminiRateLimitError(err)) return null;
  return {
    status: 429,
    body: {
      error: 'GEMINI_RATE_LIMIT',
      details:
        'חרגת ממכסת הבקשות החינמית של Gemini (או מגבלת דקה/יום). נסי שוב בעוד כמה דקות. אפשר גם לבדוק חיוב ומכסות ב-Google AI Studio.',
    },
  };
}

function geminiGenerateContentHttps(apiKey, modelName, cleaned, mediaType) {
  const body = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: GEMINI_USER_PROMPT },
          {
            inline_data: {
              mime_type: mediaType || 'image/jpeg',
              data: cleaned,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2048,
    },
  };

  const payload = JSON.stringify(body);
  const path = `/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path,
        method: 'POST',
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload, 'utf8'),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const j = JSON.parse(raw);
            if (res.statusCode && res.statusCode >= 400) {
              reject(
                new Error(
                  j.error?.message || j.error?.status || `HTTP ${res.statusCode}`
                )
              );
              return;
            }
            const text =
              j.candidates?.[0]?.content?.parts
                ?.map((p) => p.text)
                .filter(Boolean)
                .join('') || '';
            if (!text) {
              reject(new Error('Empty Gemini response (HTTPS fallback)'));
              return;
            }
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini HTTPS request timeout'));
    });
    req.write(payload);
    req.end();
  });
}

async function runGeminiOnce(apiKey, modelName, cleaned, mediaType) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel(
    {
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
      },
    },
    { timeout: 120000 }
  );

  const imagePart = {
    inlineData: {
      mimeType: mediaType || 'image/jpeg',
      data: cleaned,
    },
  };

  let text;
  try {
    const result = await model.generateContent(
      [GEMINI_USER_PROMPT, imagePart],
      { timeout: 120000 }
    );
    text = result.response.text();
  } catch (sdkErr) {
    const msg = String(sdkErr?.message || sdkErr);
    const retry =
      /fetch failed|Failed to fetch|ECONNRESET|ENOTFOUND|ETIMEDOUT|certificate/i.test(
        msg
      );
    if (retry) {
      text = await geminiGenerateContentHttps(
        apiKey,
        modelName,
        cleaned,
        mediaType
      );
    } else {
      throw sdkErr;
    }
  }

  return text;
}

async function analyzeWithGemini(apiKey, cleaned, mediaType) {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const modelCandidates = envModel ? [envModel] : [...GEMINI_DEFAULT_MODELS];

  let lastErr;
  for (let i = 0; i < modelCandidates.length; i++) {
    const modelName = modelCandidates[i];
    try {
      const text = await runGeminiOnce(apiKey, modelName, cleaned, mediaType);

      const parsed = parseAnalysisJsonFromModelText(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        const err = new Error('Gemini returned unparsable response.');
        err.code = 'UNPARSEABLE';
        throw err;
      }

      const out = ensureHebrewUserStrings(normalizeAnalysis(parsed));
      return { ...out, aiProvider: 'gemini', geminiModel: modelName };
    } catch (e) {
      lastErr = e;
      const canTryNext =
        !envModel &&
        i < modelCandidates.length - 1 &&
        (isGeminiModelNotFoundError(e) ||
          isGeminiRateLimitError(e) ||
          isUnparseableGeminiError(e));
      if (canTryNext) {
        continue;
      }
      throw e;
    }
  }

  throw lastErr || new Error('Gemini: no model succeeded');
}

async function analyzeWithOpenAI(apiKey, cleaned, mediaType) {
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const openai = new OpenAI({ apiKey });

  const dataUrl = `data:${mediaType || 'image/jpeg'};base64,${cleaned}`;

  const response = await openai.chat.completions.create({
    model,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: GEMINI_USER_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'low',
            },
          },
        ],
      },
    ],
  });

  const text = response.choices?.[0]?.message?.content || '';
  const parsed = parseAnalysisJsonFromModelText(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const err = new Error('OpenAI returned unparsable response.');
    err.code = 'UNPARSEABLE';
    throw err;
  }

  const out = ensureHebrewUserStrings(normalizeAnalysis(parsed));
  return { ...out, aiProvider: 'openai', openaiModel: model };
}

async function analyzeWithAnthropic(apiKey, cleaned, mediaType) {
  const anthropic = new Anthropic({ apiKey });
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514';

  const claudeResponse = await anthropic.messages.create({
    model,
    max_tokens: 900,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: cleaned,
            },
          },
          {
            type: 'text',
            text:
              'החזירי רק JSON תקין לפי הסכימה. כל טקסט למשתמשת חייב להיות בעברית בלבד (features_summary, reasoning, שמות צבעים). ' +
              'אם אין זיהוי פנים — אותם מפתחות עם ערכים ריקים/לא ידוע והסבר בעברית ב-reasoning.',
          },
        ],
      },
    ],
  });

  const blocks = claudeResponse?.content || [];
  const responseText = Array.isArray(blocks)
    ? blocks
        .filter((b) => b?.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('\n')
    : '';
  const parsed = parseAnalysisJsonFromModelText(responseText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const err = new Error('Claude returned unparsable response.');
    err.code = 'UNPARSEABLE';
    throw err;
  }

  const out = ensureHebrewUserStrings(normalizeAnalysis(parsed));
  return { ...out, aiProvider: 'anthropic' };
}

function resolveGeminiKey() {
  // ברירת מחדל: להשתמש רק ב-GEMINI_API_KEY.
  // זה מונע מצב שבו משתני מערכת/שרת מכילים GOOGLE_API_KEY וכו' ולכן עדיין מנסים Gemini
  // גם כשב-`server/.env` כיבית/מחיקת את GEMINI_API_KEY.
  const direct = trimEnv('GEMINI_API_KEY');
  if (direct) return direct;

  // תאימות לאחור (רק אם מפעילים במפורש):
  // set USE_GOOGLE_API_KEY_FALLBACK=1 כדי לאפשר נפילה ל-GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY.
  const allowFallback = String(process.env.USE_GOOGLE_API_KEY_FALLBACK || '').trim() === '1';
  if (!allowFallback) return '';

  return trimEnv('GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY');
}

function resolveOpenAIKey() {
  return trimEnv('OPENAI_API_KEY');
}

/**
 * סדר ברירת מחדל: אם יש OPENAI_API_KEY — קודם OpenAI (פחות תלות במכסת Gemini החינמית).
 * PREFER_GEMINI_FIRST=1 — לנסות Gemini לפני OpenAI.
 * PREFER_OPENAI=1 — כפיית OpenAI ראשון (זהה לברירת המחדל כשיש מפתח).
 */
function shouldTryOpenAIFirst(openaiKey) {
  if (!openaiKey) return false;
  const geminiFirst = process.env.PREFER_GEMINI_FIRST || process.env.USE_GEMINI_FIRST;
  if (typeof geminiFirst === 'string' && /^1|true|yes$/i.test(geminiFirst.trim())) {
    return false;
  }
  return true;
}

export default async function analyzeFace(req, res) {
  try {
    const { imageBase64, image } = req.body || {};
    const input = imageBase64 || image;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Missing base64 image. Provide imageBase64.' });
    }

    const cleaned = stripDataUrlPrefix(input);
    if (!cleaned || cleaned.length < 50) {
      return res.status(400).json({ error: 'Invalid or empty image data.' });
    }

    const media_type = extractMediaType(input);

    const geminiKey = resolveGeminiKey();
    const openaiKey = resolveOpenAIKey();
    const anthropicKey =
      typeof process.env.ANTHROPIC_API_KEY === 'string'
        ? process.env.ANTHROPIC_API_KEY.trim()
        : '';
    // Only treat as a valid Anthropic key if it matches Anthropic format.
    // This prevents misconfiguration where an OpenAI key is placed in ANTHROPIC_API_KEY
    // which would cause "invalid x-api-key" and block the flow.
    const anthropicReal = anthropicKey && anthropicKey.startsWith('sk-ant-') ? anthropicKey : '';

    if (!geminiKey && !anthropicReal && !openaiKey) {
      return res.status(400).json({
        error: 'Missing API keys',
        details: 'Set GEMINI_API_KEY and/or OPENAI_API_KEY in server/.env and restart the server.',
      });
    }

    /** סדר: OpenAI ראשון (ברירת מחדל כשיש מפתח) → Gemini → Anthropic; או Gemini קודם עם PREFER_GEMINI_FIRST=1 */
    const openaiFirst = shouldTryOpenAIFirst(openaiKey);
    const steps = [];
    if (openaiFirst && openaiKey) {
      steps.push(['openai', () => analyzeWithOpenAI(openaiKey, cleaned, media_type)]);
    }
    if (geminiKey) {
      steps.push(['gemini', () => analyzeWithGemini(geminiKey, cleaned, media_type)]);
    }
    if (!openaiFirst && openaiKey) {
      steps.push(['openai', () => analyzeWithOpenAI(openaiKey, cleaned, media_type)]);
    }
    if (anthropicReal) {
      steps.push(['anthropic', () => analyzeWithAnthropic(anthropicReal, cleaned, media_type)]);
    }

    if (!globalThis.__analyzeFaceOrderLogged) {
      globalThis.__analyzeFaceOrderLogged = true;
      console.log(
        '[analyze-face] סדר ניסיון:',
        steps.map((s) => s[0]).join(' → ') || '(אין ספקים)',
        '| OPENAI_API_KEY:',
        openaiKey ? 'מוגדר' : 'חסר',
        '| GEMINI_API_KEY:',
        geminiKey ? 'מוגדר' : 'חסר'
      );
    }

    let lastErr = null;
    /** אם OpenAI נכשל ואז Gemini — נסביר בלוג ובתשובה */
    let openaiFailedMsg = null;
    for (const [name, run] of steps) {
      try {
        const out = await run();
        return res.json(out);
      } catch (err) {
        lastErr = err;
        console.error(`analyzeFace (${name}):`, err);
        if (name === 'openai') {
          const m = err?.message || String(err);
          openaiFailedMsg = m.length > 200 ? `${m.slice(0, 200)}…` : m;
        }
      }
    }

    if (lastErr && isGeminiRateLimitError(lastErr)) {
      const clientErr = geminiErrorForClient(lastErr);
      if (clientErr) {
        if (openaiFailedMsg) {
          clientErr.body.details = `${clientErr.body.details}\n\n(OpenAI ניסה קודם ונכשל — בדקי מפתח/חיוב ב-OpenAI. שגיאה: ${openaiFailedMsg})`;
        } else if (openaiKey && !openaiFirst) {
          clientErr.body.details = `${clientErr.body.details}\n\n(מוגדר PREFER_GEMINI_FIRST — לכן Gemini רץ לפני OpenAI. הסירי אותו כדי לנסות OpenAI קודם.)`;
        } else if (!openaiKey) {
          clientErr.body.details = `${clientErr.body.details}\n\n(אין OPENAI_API_KEY ב-server/.env — השרת משתמש ב-Gemini בלבד. הוסיפי OPENAI_API_KEY והפעילי מחדש את השרת.)`;
        }
        return res.status(clientErr.status).json(clientErr.body);
      }
    }

    const apiMsg =
      lastErr?.message ||
      lastErr?.error?.message ||
      String(lastErr || 'unknown');
    const short =
      apiMsg.length > 280 ? `${apiMsg.slice(0, 280)}…` : apiMsg;
    return res.status(500).json({
      error: 'Server error analyzing face.',
      details: short,
    });
  } catch (err) {
    console.error('analyzeFace error:', err);
    const apiMsg =
      err?.error?.message ||
      err?.message ||
      (typeof err?.status === 'number' ? `HTTP ${err.status}` : '');
    const details =
      typeof apiMsg === 'string' && apiMsg.trim()
        ? apiMsg.trim()
        : String(err?.error || err || 'unknown');

    return res.status(500).json({
      error: 'Server error analyzing face.',
      details,
    });
  }
}
