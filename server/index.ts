import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { customAlphabet } from 'nanoid';
import { config } from './config.js';
import { nameIsland } from './namer.js';
import { supabase, runMigration } from './supabase.js';
import type { NameRequest, ShareRequest } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STATIC_DIR = path.join(REPO_ROOT, 'out');

const code6 = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

const app = express();
app.use(express.json({ limit: '4mb' }));

const apiLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: config.models.namer,
    supabase: !!config.supabase.serviceRole,
    ts: Date.now(),
  });
});

app.post('/api/migrate', async (_req, res, next) => {
  try {
    const result = await runMigration();
    res.status(result.ok ? 200 : 500).json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/name-island', apiLimit, async (req, res, next) => {
  try {
    const body = req.body as NameRequest;
    if (!Array.isArray(body?.census)) {
      res.status(400).json({ error: 'census array required' });
      return;
    }
    const result = await nameIsland(body.census, body.hint ?? null);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/share', apiLimit, async (req, res, next) => {
  try {
    const body = req.body as ShareRequest;
    if (!body?.payload) {
      res.status(400).json({ error: 'payload required' });
      return;
    }
    if (!body.thumbnail) {
      res.status(400).json({ error: 'thumbnail required' });
      return;
    }
    if (body.thumbnail.length > 200_000) {
      res.status(413).json({ error: 'thumbnail too large (>200KB)' });
      return;
    }

    const id = code6();
    const row = {
      id,
      name: (body.name || 'Untitled Island').slice(0, 80),
      island_name: body.islandName ? body.islandName.slice(0, 80) : null,
      thumbnail: body.thumbnail,
      tile_census: body.tileCensus ?? [],
      time_of_day: body.timeOfDay ?? 'day',
      floating: !!body.floating,
      payload: body.payload,
    };

    const { error } = await (supabase().from('islands') as any).insert(row);
    if (error) throw new Error(error.message);

    res.json({
      code: id,
      url: `${config.baseUrl}/i/${id}`,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/gallery', async (_req, res, next) => {
  try {
    const { data, error } = await (supabase().from('islands') as any)
      .select('id, name, island_name, thumbnail, tile_census, created_at')
      .order('created_at', { ascending: false })
      .limit(48);
    if (error) throw new Error(error.message);
    res.json({ islands: data ?? [] });
  } catch (err) {
    next(err);
  }
});

app.get('/api/island/:code', async (req, res, next) => {
  try {
    const code = req.params.code;
    if (!/^[a-z0-9]{6}$/.test(code)) {
      res.status(400).json({ error: 'bad code format' });
      return;
    }
    const { data, error } = await (supabase().from('islands') as any)
      .select('*')
      .eq('id', code)
      .single();
    if (error || !data) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Static SPA serving — subpath + SPA fallback.
app.use(
  '/2026-05-24-island-forge',
  express.static(STATIC_DIR, { index: 'index.html', extensions: ['html'] })
);
app.use(express.static(STATIC_DIR, { index: 'index.html', extensions: ['html'] }));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api]', err);
  res.status(500).json({ error: err.message || String(err) });
});

app.listen(config.port, () => {
  console.log(`[island-forge] listening on 0.0.0.0:${config.port}`);
});
