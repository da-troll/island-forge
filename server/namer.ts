import { config } from './config.js';
import type { CensusEntry } from '../shared/types.js';

const SYSTEM_PROMPT = `You name Mediterranean / Greek-coast islands for a voxel builder game.

Return ONE name only — 2 to 3 words. Evocative, poetic. Think: "Aegean Whisper", "Saffron Bay", "Vermilion Reach", "Cypress Hollow", "Salt and Lavender".

Rules:
- 2 to 3 words (single-word names are flat; long names are clunky)
- No quotes, no punctuation, no parenthetical hints
- No generic suffixes ("Island", "Town", "Village") — they steal characters from the evocative part
- Greek / Mediterranean / coastal feel — saints, winds, plants, fishing, white-blue-gold palette
- Match the contents: heavy on water = sea/wave/tide. Heavy on chapels = saints/votive. Many cypresses = grove/spire. Hilly = ridge/promontory.

Respond with just the name, nothing else.`;

export async function nameIsland(census: CensusEntry[], hint?: string | null): Promise<{ name: string; model: string }> {
  if (!config.openaiKey) throw new Error('no OpenAI key configured');
  const censusLine = census.slice(0, 10).map((c) => `${c.id}×${c.count}`).join(', ');

  const userMsg = [
    `Top tiles placed: ${censusLine || '(none yet)'}`,
    hint ? `User hint: ${hint}` : '',
    'Name this island.',
  ].filter(Boolean).join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.models.namer,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.85,
      max_tokens: 24,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  let name = (json.choices?.[0]?.message?.content ?? '').trim();
  // Strip enclosing punctuation just in case.
  name = name.replace(/^["'`]+|["'`]+$/g, '').replace(/[.!?]+$/g, '').trim();
  if (!name) throw new Error('empty name from model');
  return { name, model: config.models.namer };
}
