import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

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

function parseJsonLoose(text) {
  if (typeof text !== 'string') return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(t.slice(first, last + 1));
  } catch {
    return null;
  }
}

router.post('/analyze-face', async (req, res) => {
  try {
    const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(400).json({ error: 'Missing ANTHROPIC_API_KEY on server.' });
    }
    if (apiKey.startsWith('sk-proj-') || apiKey.startsWith('sk-')) {
      // Common misconfiguration: OpenAI key placed in ANTHROPIC_API_KEY
      if (!apiKey.startsWith('sk-ant-')) {
        return res.status(400).json({
          error: 'Invalid ANTHROPIC_API_KEY',
          details: 'נראה שהוזן מפתח שאינו של Anthropic. אנא הכניסי מפתח שמתחיל ב־sk-ant- (Claude).',
        });
      }
    }
    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const cleaned = stripDataUrlPrefix(imageBase64);
    if (!cleaned || cleaned.length < 50) {
      return res.status(400).json({ error: 'Invalid image' });
    }
    const mediaType = extractMediaType(imageBase64);

    const prompt = `Analyze this face image and return ONLY a JSON object with:
{
  "skinTone": "fair/light/medium/olive/tan/deep",
  "skinUndertone": "cool/warm/neutral",
  "eyeColor": "brown/blue/green/hazel/grey/black",
  "eyeShape": "almond/round/hooded/monolid/upturned/downturned",
  "lipShape": "thin/medium/full/bow-shaped/wide",
  "faceShape": "oval/round/square/heart/diamond/oblong",
  "facialLandmarks": {
    "leftEye": {"x": 0-1, "y": 0-1},
    "rightEye": {"x": 0-1, "y": 0-1},
    "noseTip": {"x": 0-1, "y": 0-1},
    "leftLip": {"x": 0-1, "y": 0-1},
    "rightLip": {"x": 0-1, "y": 0-1},
    "leftCheek": {"x": 0-1, "y": 0-1},
    "rightCheek": {"x": 0-1, "y": 0-1},
    "lipCenter": {"x": 0-1, "y": 0-1}
  }
}
Coordinates are relative (0=left/top, 1=right/bottom). Return ONLY JSON, no text.`;

    const anthropic = new Anthropic({ apiKey });
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 900,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: cleaned },
            },
            { type: 'text', text: prompt },
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

    const parsed = parseJsonLoose(responseText);
    if (!parsed) {
      return res.status(500).json({ error: 'Claude returned an unparsable response.' });
    }
    return res.json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Face analysis failed.', details: e?.message || String(e) });
  }
});

router.post('/recommend-looks', async (req, res) => {
  try {
    const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(400).json({ error: 'Missing ANTHROPIC_API_KEY on server.' });
    }
    if (apiKey.startsWith('sk-proj-') || apiKey.startsWith('sk-')) {
      if (!apiKey.startsWith('sk-ant-')) {
        return res.status(400).json({
          error: 'Invalid ANTHROPIC_API_KEY',
          details: 'נראה שהוזן מפתח שאינו של Anthropic. אנא הכניסי מפתח שמתחיל ב־sk-ant- (Claude).',
        });
      }
    }
    const { faceAnalysis, products } = req.body || {};
    if (!faceAnalysis || typeof faceAnalysis !== 'object') {
      return res.status(400).json({ error: 'Missing faceAnalysis' });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Missing products' });
    }

    const prompt = `You are a professional makeup artist.
Given this face analysis: ${JSON.stringify(faceAnalysis)}
And this product catalog: ${JSON.stringify(products)}

Return ONLY a JSON with 3 complete makeup looks, ordered from MOST to LEAST flattering:
{
  "looks": [
    {
      "lookName": "Natural Glow",
      "lookDescription": "מראה יומיומי טבעי",
      "score": 95,
      "products": {
        "foundation": { "productId": "...", "reason": "..." },
        "eyeliner": { "productId": "...", "reason": "..." },
        "mascara": { "productId": "...", "reason": "..." },
        "lipstick": { "productId": "...", "reason": "..." },
        "blush": { "productId": "...", "reason": "..." },
        "eyeshadow": { "productId": "...", "reason": "..." }
      }
    },
    { "lookName": "...", "lookDescription": "...", "score": 0, "products": { "foundation": {"productId":"", "reason":""}, "eyeliner": {"productId":"", "reason":""}, "mascara": {"productId":"", "reason":""}, "lipstick": {"productId":"", "reason":""}, "blush": {"productId":"", "reason":""}, "eyeshadow": {"productId":"", "reason":""} } },
    { "lookName": "...", "lookDescription": "...", "score": 0, "products": { "foundation": {"productId":"", "reason":""}, "eyeliner": {"productId":"", "reason":""}, "mascara": {"productId":"", "reason":""}, "lipstick": {"productId":"", "reason":""}, "blush": {"productId":"", "reason":""}, "eyeshadow": {"productId":"", "reason":""} } }
  ]
}
Match products by: skin undertone compatibility, eye color enhancement, face shape flattery. Return ONLY JSON.`;

    const anthropic = new Anthropic({ apiKey });
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1400,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    });

    const blocks = claudeResponse?.content || [];
    const responseText = Array.isArray(blocks)
      ? blocks
          .filter((b) => b?.type === 'text' && typeof b.text === 'string')
          .map((b) => b.text)
          .join('\n')
      : '';

    const parsed = parseJsonLoose(responseText);
    if (!parsed) {
      return res.status(500).json({ error: 'Claude returned an unparsable response.' });
    }
    return res.json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Look recommendation failed.', details: e?.message || String(e) });
  }
});

export default router;

