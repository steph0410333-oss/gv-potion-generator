# GV Potion Generator

Mobile-friendly AI reflection website for a Global Volunteer returnee activity.

## Flow
Participants answer three prompts:
- Now I am more...
- I know I can...
- What I take from this journey is...

The site sends those answers to an OpenAI-powered serverless endpoint and returns:
- Potion Name
- Potion Effect
- 3 Key Ingredients
- 1–2 GV Value connections

## Deploy on Vercel
1. Import this repository into Vercel.
2. In Project Settings → Environment Variables, add `OPENAI_API_KEY`.
3. Redeploy.

The API currently uses `gpt-5.6-luna` for low-cost generation.
