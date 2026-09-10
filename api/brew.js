export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { more, can, take } = req.body || {};
  if (!more || !can || !take) {
    return res.status(400).json({ error: 'Missing reflection fields' });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.google_api ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Gemini API key is not configured',
      diagnostics: {
        GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
        google_api: Boolean(process.env.google_api),
        GOOGLE_API_KEY: Boolean(process.env.GOOGLE_API_KEY),
        GOOGLE_GENERATIVE_AI_API_KEY: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      }
    });
  }

  const prompt = `
You are generating a reflective "GV Potion" for an AIESEC Global Volunteer returnee reflection activity.

Participant reflection:
1. Now I am more... ${more}
2. I know I can... ${can}
3. What I take from this journey is... ${take}

Create a result that is warm, reflective, concise, magical, and slightly literary, but not childish.
Do not invent growth, traits, or experiences that are not supported by the participant's words.

Return ONLY valid JSON with exactly these keys:
{
  "potion_name": "English potion name, 2-5 words",
  "potion_name_zh": "Traditional Chinese potion name, 4-10 Chinese characters, elegant and magical",
  "potion_effect": "1-2 concise sentences in Traditional Chinese",
  "key_ingredients": ["3 short phrases"],
  "gv_values": ["1 or 2 values selected ONLY from: Cross-Cultural Experience, Develop Yourself, Contribute to the Sustainable Development Goals"]
}

The Chinese potion name should not be a literal translation only. It should sound refined, magical, and poetic.
Choose GV values only when supported by the reflection.
If the reflection does not clearly mention SDGs or social impact, do not force that value.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.85,
            maxOutputTokens: 700
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(500).json({
        error: data?.error?.message || 'AI generation failed'
      });
    }

    let text = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    if (!text) {
      console.error('No Gemini output:', data);
      return res.status(500).json({ error: 'AI returned an empty response' });
    }

    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '');

    const parsed = JSON.parse(text);

    const allowed = [
      'Cross-Cultural Experience',
      'Develop Yourself',
      'Contribute to the Sustainable Development Goals'
    ];

    const output = {
      potion_name: String(parsed.potion_name || 'Journey Distillation'),
      potion_name_zh: String(parsed.potion_name_zh || '旅程釀成之藥'),
      potion_effect: String(parsed.potion_effect || ''),
      key_ingredients: Array.isArray(parsed.key_ingredients)
        ? parsed.key_ingredients.slice(0, 3).map(String)
        : [],
      gv_values: Array.isArray(parsed.gv_values)
        ? parsed.gv_values.filter(v => allowed.includes(v)).slice(0, 2)
        : []
    };

    if (output.key_ingredients.length === 0) {
      output.key_ingredients = ['Reflection', 'Growth', 'Journey'];
    }
    if (output.gv_values.length === 0) {
      output.gv_values = ['Develop Yourself'];
    }

    return res.status(200).json(output);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
