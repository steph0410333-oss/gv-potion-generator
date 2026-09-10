export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { more, can, take } = req.body || {};
  if (!more || !can || !take) {
    return res.status(400).json({ error: 'Missing reflection fields' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  const prompt = `
You are generating a reflective "GV Potion" for a Global Volunteer returnee activity.

Participant reflection:
1. Now I am more... ${more}
2. I know I can... ${can}
3. What I take from this journey is... ${take}

Create a result that is warm, reflective, concise, and slightly magical but not childish.
Do not invent growth, traits, or experiences that are not supported by the participant's words.

Return ONLY valid JSON, with no markdown and no code fences:
{
  "potion_name": "English potion name, 2-5 words",
  "potion_effect": "1-2 concise sentences in Traditional Chinese",
  "key_ingredients": ["3 short phrases"],
  "gv_values": ["1 or 2 values selected ONLY from: Cross-Cultural Experience, Develop Yourself, Contribute to the Sustainable Development Goals"]
}

Choose GV values only when supported by the reflection.
If the reflection does not clearly mention SDGs or social impact, do not force that value.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        input: prompt
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(data);
      return res.status(500).json({ error: 'AI generation failed' });
    }

    let text = data.output_text || '';
    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) continue;
        for (const c of item.content) {
          if (c.type === 'output_text' && c.text) text += c.text;
        }
      }
    }

    text = text.trim()
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
      potion_name: String(parsed.potion_name || 'Journey Distillation Potion'),
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
