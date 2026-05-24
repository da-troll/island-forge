import type {
  GalleryResponse,
  IslandFull,
  NameRequest,
  NameResponse,
  ShareRequest,
  ShareResponse,
} from '../shared/types';

const RAW_BASE = import.meta.env.BASE_URL ?? '/';
const API_BASE = `${RAW_BASE}api`.replace(/\/+api$/, '/api');

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail = '';
    try {
      const j = (await res.json()) as { error?: string };
      detail = j.error ?? '';
    } catch {
      detail = await res.text();
    }
    throw new Error(`${res.status}: ${detail || res.statusText}`);
  }
  return (await res.json()) as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const api = {
  nameIsland: (req: NameRequest) => post<NameResponse>('/name-island', req),
  share: (req: ShareRequest) => post<ShareResponse>('/share', req),
  gallery: () => fetchJson<GalleryResponse>('/gallery'),
  island: (code: string) => fetchJson<IslandFull>(`/island/${encodeURIComponent(code)}`),
  health: () => fetchJson<{ ok: boolean }>('/health'),
};
