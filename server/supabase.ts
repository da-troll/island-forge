import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!_client) {
    if (!config.supabase.serviceRole) {
      throw new Error('Supabase service role key missing — set supabase_service_role_vps in household.json');
    }
    _client = createClient(config.supabase.url, config.supabase.serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/**
 * One-shot schema migration via the Supabase Management API (works without
 * the supabase CLI). Uses the PAT scoped to the vps project.
 *
 * The "islands" table is intentionally tiny and public-readable behind RLS
 * — only the server (service role) can write.
 */
const MIGRATION_SQL = `
create table if not exists public.islands (
  id text primary key,
  name text not null,
  island_name text,
  thumbnail text not null,
  tile_census jsonb default '[]'::jsonb,
  time_of_day text default 'day',
  floating boolean default false,
  payload jsonb not null,
  created_at timestamptz default now()
);

alter table public.islands enable row level security;

drop policy if exists "islands public read" on public.islands;
create policy "islands public read"
  on public.islands
  for select
  using (true);

-- service role bypasses RLS for inserts; no insert policy needed.

create index if not exists islands_created_at_idx on public.islands (created_at desc);
`;

export async function runMigration(): Promise<{ ok: boolean; detail: string }> {
  if (!config.supabase.pat) {
    return { ok: false, detail: 'No supabase_pat_vps configured — set in household.json' };
  }
  const url = `https://api.supabase.com/v1/projects/${config.supabase.projectRef}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabase.pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: MIGRATION_SQL }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, detail: `${res.status}: ${text.slice(0, 400)}` };
  }
  return { ok: true, detail: text.slice(0, 200) };
}
