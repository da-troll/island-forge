import fs from 'node:fs';

const HOUSEHOLD_PATH = '/home/eve/config/household.json';

interface HouseholdKeys {
  openai_chat?: string;
  supabase_service_role_vps?: string;
  supabase_pat_vps?: string;
}

function loadHouseholdKeys(): HouseholdKeys {
  try {
    const raw = fs.readFileSync(HOUSEHOLD_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.skills?.apiKeys ?? {};
  } catch {
    return {};
  }
}

const keys = loadHouseholdKeys();

// vps project id is the canonical handle Eve gave us in the brief.
const SUPABASE_PROJECT_REF = 'axcevbeemcvcanvbbdow';

export const config = {
  port: Number(process.env.PORT ?? 3486),

  openaiKey: process.env.OPENAI_API_KEY ?? keys.openai_chat ?? null,
  models: {
    namer: 'gpt-4o-mini',
  },

  supabase: {
    projectRef: SUPABASE_PROJECT_REF,
    url: `https://${SUPABASE_PROJECT_REF}.supabase.co`,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_VPS ?? keys.supabase_service_role_vps ?? null,
    pat: process.env.SUPABASE_PAT_VPS ?? keys.supabase_pat_vps ?? null,
  },

  baseUrl: process.env.BASE_URL ?? 'https://mvp.trollefsen.com/2026-05-24-island-forge',
} as const;

if (!config.openaiKey) {
  console.warn('[config] no OpenAI key — /api/name-island will fail');
}
if (!config.supabase.serviceRole) {
  console.warn('[config] no Supabase service role — /api/share + /api/gallery will fail');
}
