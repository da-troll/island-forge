/**
 * main.js
 *
 * Entry point. Generates the asset pack first (with progress UI), then
 * instantiates the game once everything is ready.
 *
 * MODIFIED for Island Forge (2026-05-24, Wilson):
 *   - exposes `window.IslandForge` namespace with game/ui handles + helpers
 *   - dispatches `island-forge:ready` so the React shell can take over
 *   - seedExampleVillage only fires when no autosave AND no slot/island
 *     preference is set by the shell
 *   - census + thumbnail helpers for AI namer and Supabase share
 */

import { loadAssets } from './assets/assetLoader.js';
import { Game } from './core/Game.js';
import { UIManager } from './ui/UIManager.js';
import { loadUiAudio } from './ui/Audio.js';
import { SaveSlots } from './storage/SaveSlots.js';
import { PlacedObject } from './building/PlacedObject.js';
import { Animations } from './effects/Animations.js';
import { TimeOfDay } from './effects/TimeOfDay.js';
import { History } from './effects/History.js';
import { TEMPLATES } from './templates/templates.js';
import { extendAssetManifest } from './assets/extras.js';

async function main() {
    const fill = document.getElementById('loading-fill');
    const status = document.getElementById('loading-status');
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');

    // Procedurally extend the manifest BEFORE loading assets so the new
    // tiles get baked into the displayCanvas cache at the same time.
    try { extendAssetManifest(); } catch (err) { console.warn('[extras]', err); }

    await loadAssets((p, label) => {
        if (fill) fill.style.width = `${Math.round(p * 100)}%`;
        if (status) status.textContent = `crafting ${label}…`;
    });

    // Kick off the UI sound effect download in parallel — it's tiny and
    // we don't want the very first click to feel sluggish waiting for it.
    loadUiAudio();

    if (fill) fill.style.width = '100%';
    if (status) status.textContent = 'arriving at the harbor';

    // Tiny delay for the bar to finish its sweep — feels nicer.
    await new Promise(r => setTimeout(r, 250));

    const canvas = document.getElementById('game-canvas');
    const game = new Game(canvas);
    const ui = new UIManager(game);
    game.ui = ui;
    ui.update();

    // Hook animations + time-of-day overlay into the game's frame loop.
    const animations = new Animations(game);
    const tod = new TimeOfDay(game);
    const history = new History(game);
    game.animations = animations;
    game.tod = tod;
    game.history = history;
    // History MUST attach before any seed/template/slot mutations so the
    // wrap-around place/erase/setHeight monkeypatches are in place — but the
    // initial seed shouldn't fill the undo stack. We attach after the seed.
    animations.attach();
    tod.attach();

    // Decide initial scene. If the shell requested a slot/template/share
    // load via window.IslandForge.bootstrap, honour it. Otherwise restore
    // the upstream autosave, falling back to the seeded village.
    const bootstrap = window.IslandForge?.bootstrap ?? null;
    let loadedSomething = false;
    if (bootstrap?.kind === 'slot' && Number.isInteger(bootstrap.slot)) {
        const payload = SaveSlots.load(bootstrap.slot);
        if (payload && SaveSlots.applyToGame(game, payload)) {
            loadedSomething = true;
            if (payload.timeOfDay) tod.set(payload.timeOfDay);
            ui.showToast(`Loaded slot ${bootstrap.slot}`);
        }
    } else if (bootstrap?.kind === 'template' && bootstrap.id && TEMPLATES[bootstrap.id]) {
        applyTemplate(game, TEMPLATES[bootstrap.id]);
        loadedSomething = true;
        ui.showToast(`Loaded ${TEMPLATES[bootstrap.id].name}`);
    } else if (bootstrap?.kind === 'island' && bootstrap.payload) {
        // Read-only preview from /api/island/:code.
        SaveSlots.applyToGame(game, bootstrap.payload);
        loadedSomething = true;
        if (bootstrap.payload.timeOfDay) tod.set(bootstrap.payload.timeOfDay);
    }

    if (!loadedSomething) {
        if (game.load()) {
            ui.showToast('Welcome back');
        } else {
            seedExampleVillage(game);
        }
    }

    loadingScreen?.classList.add('hidden');
    app?.classList.remove('hidden');

    // Attach undo/redo AFTER the initial seed/template/load so we don't
    // pollute the undo stack with bootstrap noise.
    history.attach();

    // Publish the namespace the React shell talks to.
    publishApi(game, ui, animations, tod);
    window.dispatchEvent(new CustomEvent('island-forge:ready', {
        detail: { game, ui },
    }));
}

/** Place a small starter scene so first-run users see something pretty. */
function seedExampleVillage(game) {
    const W = game.tileMap.width, H = game.tileMap.height;
    const STEP_MS = 16;
    const OBJECT_DELAY = 60;

    const placeT = (id, gx, gy) => {
        const delay = (gx + gy) * STEP_MS;
        game.placeAndAnimate(id, gx, gy, { delay });
    };
    const placeO = (id, gx, gy) => {
        const delay = (gx + gy) * STEP_MS + OBJECT_DELAY;
        game.placeAndAnimate(id, gx, gy, { delay });
    };

    // Grass everywhere
    for (let gy = 0; gy < H; gy++)
    for (let gx = 0; gx < W; gx++) {
        placeT('grass', gx, gy);
    }

    // Stone path crossing
    const midX = Math.floor(W / 2);
    const midY = Math.floor(H / 2);
    for (let gx = 2; gx < W - 2; gx++) placeT('path', gx, midY);
    for (let gy = 2; gy < H - 2; gy++) placeT('path', midX, gy);

    // Water canal along the front + back edges
    for (let gx = 0; gx < W; gx++) {
        placeT('water', gx, H - 1);
        placeT('water', gx, H - 2);
    }
    // Sand strip just behind the water as beach
    for (let gx = 0; gx < W; gx++) placeT('sand', gx, H - 3);

    // Hilltop: raise a 5×5 patch in the upper-left quadrant.
    for (let gy = 3; gy < 8; gy++)
    for (let gx = 3; gx < 8; gx++) {
        const dy = gy - 5.5, dx = gx - 5.5;
        const h = Math.max(0, Math.round(2 - Math.sqrt(dx * dx + dy * dy) * 0.6));
        if (h > 0) game.tileMap.setHeight(gx, gy, h);
    }

    // A spread-out village across the larger canvas.
    placeO('main_chapel', 10, 4);
    placeO('windmill', 22, 4);
    placeO('windmill', 4, 22);
    placeO('house', 18, 18);
    placeO('house', 5, 12);
    placeO('two_story', 12, 14);
    placeO('villa', 18, 9);
    placeO('villa', 8, 18);

    // Nature accents
    placeO('cypress', 14, 6);
    placeO('cypress', 6, 6);
    placeO('cypress', 22, 12);
    placeO('cypress', 2, 18);
    placeO('bougainvillea', 11, 9);
    placeO('bougainvillea', 19, 13);
    placeO('olive', 0, 14);
    placeO('olive', 25, 18);
    placeO('flower_pot', 13, 11);
    placeO('terracotta_pot', 17, 13);
    placeO('agave', 25, 24);
    placeO('agave', 2, 24);

    // Lanterns + small bridge
    placeO('lantern_post', 8, 14);
    placeO('lantern_post', 16, 14);
    placeO('lantern_post', 12, 22);
    placeO('small_bridge', 14, H - 2);

    // A few pennants near the chapel + harbor so the flag-wave animation
    // has somewhere to land. Falls back gracefully if `small_flag` (one
    // of the procedural extras) wasn't registered for any reason.
    placeO('small_flag', 11, 4);
    placeO('small_flag', 13, 18);
    placeO('small_flag', 23, 5);
}

function applyTemplate(game, template) {
    game.tileMap.clearAll();
    const W = game.tileMap.width, H = game.tileMap.height;
    const STEP_MS = 12;
    for (const [gy, row] of (template.terrain ?? []).entries()) {
        for (const [gx, id] of row.entries()) {
            if (id && gx < W && gy < H) {
                game.placeAndAnimate(id, gx, gy, { delay: (gx + gy) * STEP_MS });
            }
        }
    }
    for (const obj of template.objects ?? []) {
        if (game.tileMap.inBounds(obj.gx, obj.gy)) {
            game.placeAndAnimate(obj.id, obj.gx, obj.gy, {
                delay: (obj.gx + obj.gy) * STEP_MS + 90,
                flipH: !!obj.flipH,
                flipV: !!obj.flipV,
            });
        }
    }
    if (Array.isArray(template.heights)) {
        // Apply heights after a tick so the placement animation doesn't fight.
        setTimeout(() => game.tileMap.setHeights(template.heights), 50);
    }
}

/** Public API exposed on window.IslandForge for the React shell. */
function publishApi(game, ui, animations, tod) {
    const api = window.IslandForge || {};
    api.game = game;
    api.ui = ui;
    api.animations = animations;
    api.tod = tod;
    api.ready = true;

    // ── Pickup / move tool (placed objects only, not terrain) ────
    // We monkey-patch Game.onPrimaryClick so that when the user enters
    // pickup mode the next click on a placed object removes it from the
    // map and re-attaches the asset to the cursor in place-mode with
    // flips preserved. Click on terrain or empty cells is a no-op so the
    // user can't accidentally bulldoze the surface they're standing on.
    let pickupArmed = false;
    let pickupListener = null;
    const origOnPrimaryClick = game.onPrimaryClick.bind(game);
    game.onPrimaryClick = (gx, gy) => {
        if (pickupArmed) {
            if (!game.tileMap.inBounds(gx, gy)) return;
            const obj = game.tileMap.objectAt(gx, gy);
            if (!obj) {
                ui.showToast('Click a placed object to pick it up');
                return;
            }
            const assetId = obj.assetId;
            const flipH = !!obj.flipH;
            const flipV = !!obj.flipV;
            const removed = game.placement.erase(obj.gx, obj.gy);
            if (!removed) return;
            pickupArmed = false;
            game.canvas.style.cursor = 'crosshair';
            if (pickupListener) {
                window.removeEventListener('keydown', pickupListener);
                pickupListener = null;
            }
            game.setTool('place');
            game.selectAsset(assetId);
            game.flipH = flipH;
            game.flipV = flipV;
            game._syncPreviewFlip();
            game.renderer.markDirty();
            ui.showToast(`Picked up — click to place`);
            window.dispatchEvent(new CustomEvent('island-forge:pickup-changed', {
                detail: { armed: false },
            }));
            return;
        }
        return origOnPrimaryClick(gx, gy);
    };

    api.isPickupArmed = () => pickupArmed;
    api.startPickup = () => {
        if (pickupArmed) return;
        pickupArmed = true;
        game.canvas.style.cursor = 'grab';
        ui.showToast('Click a placed object to pick it up');
        pickupListener = (e) => {
            if (e.key === 'Escape') api.cancelPickup();
        };
        window.addEventListener('keydown', pickupListener);
        window.dispatchEvent(new CustomEvent('island-forge:pickup-changed', {
            detail: { armed: true },
        }));
    };
    api.cancelPickup = () => {
        if (!pickupArmed) return;
        pickupArmed = false;
        game.canvas.style.cursor = 'crosshair';
        if (pickupListener) {
            window.removeEventListener('keydown', pickupListener);
            pickupListener = null;
        }
        window.dispatchEvent(new CustomEvent('island-forge:pickup-changed', {
            detail: { armed: false },
        }));
    };

    // Save slot operations
    api.listSlots = () => SaveSlots.list();
    api.saveSlot = (slot, overrides = {}) => SaveSlots.save(slot, {
        ...SaveSlots.capture(game, overrides),
        thumbnail: overrides.thumbnail ?? api.thumbnail(160),
    });
    api.loadSlot = (slot) => {
        const payload = SaveSlots.load(slot);
        if (!payload) return false;
        const ok = SaveSlots.applyToGame(game, payload);
        if (ok && payload.timeOfDay) tod.set(payload.timeOfDay);
        return ok;
    };
    api.deleteSlot = (slot) => SaveSlots.delete(slot);

    // Template
    api.templates = () => Object.values(TEMPLATES).map(t => ({
        id: t.id, name: t.name, description: t.description,
    }));
    api.applyTemplate = (id) => {
        if (!TEMPLATES[id]) return false;
        applyTemplate(game, TEMPLATES[id]);
        return true;
    };

    // Time-of-day
    api.setTimeOfDay = (mode) => tod.set(mode);
    api.getTimeOfDay = () => tod.mode;

    // Floating mode (just routes through TOD)
    api.setFloating = (on) => tod.setFloating(!!on);
    api.getFloating = () => tod.floating;

    // Elevation
    api.raise = (gx, gy) => game.tileMap.raiseAt(gx, gy);
    api.lower = (gx, gy) => game.tileMap.lowerAt(gx, gy);

    // Undo/redo (stack lives on game.history; History module attaches in Game)
    api.undo = () => game.history?.undo?.();
    api.redo = () => game.history?.redo?.();
    api.historyState = () => ({
        canUndo: game.history?.canUndo?.() ?? false,
        canRedo: game.history?.canRedo?.() ?? false,
    });

    // Tile census for AI namer (top N assets placed)
    api.census = (topN = 10) => {
        const counts = new Map();
        for (const id of game.tileMap.terrain) {
            if (!id) continue;
            counts.set(id, (counts.get(id) || 0) + 1);
        }
        for (const obj of game.tileMap.objects) {
            counts.set(obj.assetId, (counts.get(obj.assetId) || 0) + 1);
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([id, n]) => ({ id, count: n }));
    };

    // PNG snapshot (2x for export, smaller for thumbnails).
    api.thumbnail = (maxWidth = 160) => {
        try {
            const c = game.canvas;
            const ratio = c.width / c.height;
            const w = Math.min(maxWidth, c.width);
            const h = Math.round(w / ratio);
            const off = document.createElement('canvas');
            off.width = w;
            off.height = h;
            const ctx = off.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(c, 0, 0, w, h);
            return off.toDataURL('image/webp', 0.7);
        } catch (err) {
            console.warn('[thumbnail]', err);
            return null;
        }
    };

    api.exportPng = (filename = 'island') => {
        try {
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = game.canvas.toDataURL('image/png');
            link.click();
            return true;
        } catch (err) {
            console.warn('[exportPng]', err);
            return false;
        }
    };

    api.serialize = () => ({
        tileMap: game.tileMap.serialize(),
        heights: game.tileMap.getHeights(),
        timeOfDay: tod.mode,
        floating: tod.floating,
        camera: {
            offsetX: game.camera.offsetX,
            offsetY: game.camera.offsetY,
            zoom: game.camera.zoom,
        },
    });

    api.applyShared = (payload) => {
        if (!payload?.tileMap) return false;
        SaveSlots.applyToGame(game, payload);
        if (payload.timeOfDay) tod.set(payload.timeOfDay);
        if (typeof payload.floating === 'boolean') tod.setFloating(payload.floating);
        return true;
    };

    window.IslandForge = api;
}

main().catch(err => {
    console.error(err);
    const status = document.getElementById('loading-status');
    if (status) status.textContent = `Something went wrong: ${err.message}`;
});
