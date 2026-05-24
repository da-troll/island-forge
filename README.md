# Island Forge

Mediterranean voxel island builder. Drop tiles on a 28×28 isometric grid, raise hilltops, turn the whole scene golden or moonlit, name your island with AI, and share it to a community gallery.

**Live:** https://mvp.trollefsen.com/2026-05-24-island-forge/
**Gallery:** https://mvp.trollefsen.com/2026-05-24-island-forge/gallery
**Inspired by:** [boona13/mykonos-island-voxels](https://github.com/boona13/mykonos-island-voxels) (MIT) — vendored verbatim and extended

## Features

**Engine**
- 28×28 grid (4× the upstream canvas area), same 2:1 isometric tile system
- Per-cell 4-level elevation — `TileMap.setHeight`, full serialize round-trip
- Undo/redo stack (50 ops) — monkey-patches place/erase/setHeight, bound to Ctrl+Z / Ctrl+Y
- Continuous animations layered over the static cache: windmill RPM rotation, water 3-frame shimmer (2fps), lantern opacity pulse (1.2Hz), flag sine wave
- Three time-of-day modes — Day, Golden Hour (warm amber multiply + warmer sky), Night (deep blue multiply + 80-star LCG starfield + additive radial glow on lanterns/lit buildings)
- Floating Island mode — sky + cloud + sky-platform tiles + sky-gradient backdrop + drifting parallax clouds
- ~15 procedural extras via the upstream voxelRenderer builder fallback — fishing boat, dock, mooring post, crumbled wall, broken column, fallen arch, taverna table, amphora stack, rooftop terrace, lit window, pennant, fountain, cloud / mist / sky-platform terrain

**Persistence**
- Five named localStorage save slots with WebP thumbnail previews + overwrite/delete
- Supabase community gallery (vps project) — 6-character nanoid share codes, RLS public-read policy, service-role server writes, one-click "Remix → Slot 1"
- One-shot `/api/migrate` runs the schema via Supabase Management API

**AI**
- Island Namer — sends top-10 tile census to `gpt-4o-mini`, returns one evocative 2-3 word Greek/Mediterranean name (e.g. "Cypress Tide", "Aegean Whisper")

**Templates**
- Five starter templates — Blank Canvas / Harbor Town / Hilltop Chapel (with pre-set elevation) / Fishing Village / Garden Estate — replayed through the same staggered `placeAndAnimate` pipeline as the seeded village

## Tech Stack

- Vite + React + TypeScript + Tailwind CSS v4 (shell)
- Express + pm2 + Caddy reverse-proxy (server, port 3485)
- OpenAI `gpt-4o-mini` (namer)
- Supabase JS + Management API (gallery, schema)
- Canvas 2D + vanilla ES modules (vendored upstream engine — 21 modules, 54 PNGs, 8 OGGs)
- nanoid (share codes), react-router-dom (SPA routes)

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│  Browser                                                   │
│                                                            │
│  ┌──────────────┐  window.IslandForge   ┌───────────────┐ │
│  │ React shell  │ ───── bridge ──────▶ │ Vanilla engine│ │
│  │ (Vite)       │ ◀── island-forge:    │ (vendored)    │ │
│  │              │     ready event       │  + extensions │ │
│  └──────────────┘                       └───────────────┘ │
│         │                                       │          │
│         │ fetch /api/*                          │ canvas2d │
│         ▼                                       ▼          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Express (port 3485) — pm2-managed                    │ │
│  │  /api/name-island   → OpenAI gpt-4o-mini             │ │
│  │  /api/share         → Supabase insert (service role) │ │
│  │  /api/island/:code  → Supabase select                │ │
│  │  /api/gallery       → Supabase recent 48             │ │
│  │  /api/migrate       → Supabase Management API + PAT  │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

The React shell renders the exact DOM skeleton the upstream engine's `UIManager` expects (`#game-canvas`, `#toolbar`, `#palette`, `#hud`, `#loading-screen`…). The engine is loaded as a vanilla ES module via `<script type="module" src="/engine/main.js">`, attaches to those IDs, runs as upstream does, then publishes `window.IslandForge` for React to drive.

## Local dev

```bash
npm install
OPENAI_API_KEY=sk-... SUPABASE_SERVICE_ROLE_VPS=... npm run dev:server   # port 3485
npm run dev:client                                                          # port 5173 (proxies /api → 3485)
```

## Deploy

```bash
npm run build
bash /home/eve/workspaces/eve/scripts/nightly-builder/mvp-deploy.sh ~/projects/nightly-mvps/2026-05-24-island-forge
bash /home/eve/workspaces/eve/scripts/nightly-builder/mvp-finalize.sh
# Then once, to provision the islands table on Supabase:
curl -X POST https://mvp.trollefsen.com/2026-05-24-island-forge/api/migrate
```

## License

MIT, like the upstream engine. The vendored upstream files retain their original copyright (see `UPSTREAM-LICENSE`). My additions are MIT-licensed under the same terms.

---

Built by the Nightly MVP Builder (Wilson 🏐).
