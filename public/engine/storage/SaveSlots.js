/**
 * SaveSlots.js — Island Forge addition (2026-05-24, Wilson).
 *
 * Five named localStorage save slots, replacing the upstream single-slot
 * autosave (which still works at CONFIG.storageKey for back-compat).
 *
 * Slot shape:
 *   {
 *     v: 1,
 *     name: 'My Island' | null,        // human-readable label
 *     savedAt: 1716580000000,           // ms epoch
 *     thumbnail: 'data:image/webp;...',// downscaled canvas snapshot
 *     islandName: 'Aegean Whisper',    // AI-generated name (optional)
 *     timeOfDay: 'day' | 'golden' | 'night',
 *     floating: false,
 *     tileMap: {...},                   // upstream TileMap serialize()
 *     heights: [...],                   // flat array of cell heights
 *     camera: { offsetX, offsetY, zoom },
 *   }
 */

import { PlacedObject } from '../building/PlacedObject.js';

const SLOT_PREFIX = 'island-forge.slot.';
const NUM_SLOTS = 5;

function key(n) {
    return `${SLOT_PREFIX}${n}`;
}

export const SaveSlots = {
    NUM_SLOTS,

    /** Return all slot metadata (no full payload) for the slot manager UI. */
    list() {
        const out = [];
        for (let i = 1; i <= NUM_SLOTS; i++) {
            const raw = localStorage.getItem(key(i));
            if (!raw) {
                out.push({ slot: i, empty: true });
                continue;
            }
            try {
                const data = JSON.parse(raw);
                out.push({
                    slot: i,
                    empty: false,
                    name: data.name ?? null,
                    islandName: data.islandName ?? null,
                    savedAt: data.savedAt ?? null,
                    thumbnail: data.thumbnail ?? null,
                    timeOfDay: data.timeOfDay ?? 'day',
                    floating: !!data.floating,
                    objects: data.tileMap?.objects?.length ?? 0,
                });
            } catch (err) {
                out.push({ slot: i, empty: true, error: String(err) });
            }
        }
        return out;
    },

    save(slot, payload) {
        if (slot < 1 || slot > NUM_SLOTS) throw new Error(`bad slot ${slot}`);
        const full = { v: 1, ...payload, savedAt: Date.now() };
        localStorage.setItem(key(slot), JSON.stringify(full));
        return full;
    },

    load(slot) {
        if (slot < 1 || slot > NUM_SLOTS) return null;
        const raw = localStorage.getItem(key(slot));
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    },

    delete(slot) {
        if (slot < 1 || slot > NUM_SLOTS) return;
        localStorage.removeItem(key(slot));
    },

    /** Apply a loaded slot payload to a live game instance. */
    applyToGame(game, payload) {
        if (!payload?.tileMap) return false;
        game.tileMap.deserialize(payload.tileMap, d => new PlacedObject(d));
        // Heights are stored as a flat array; restore alongside terrain.
        if (Array.isArray(payload.heights) && game.tileMap.setHeights) {
            game.tileMap.setHeights(payload.heights);
        }
        if (payload.camera && game.camera) {
            game.camera.offsetX = payload.camera.offsetX ?? game.camera.offsetX;
            game.camera.offsetY = payload.camera.offsetY ?? game.camera.offsetY;
            game.camera.zoom    = payload.camera.zoom    ?? game.camera.zoom;
        }
        game.renderer.markDirty();
        return true;
    },

    /**
     * Build a save payload from a live game instance. Caller can override
     * name/islandName/timeOfDay/floating/thumbnail.
     */
    capture(game, overrides = {}) {
        return {
            name: overrides.name ?? null,
            islandName: overrides.islandName ?? null,
            timeOfDay: overrides.timeOfDay ?? 'day',
            floating: !!overrides.floating,
            thumbnail: overrides.thumbnail ?? null,
            tileMap: game.tileMap.serialize(),
            heights: game.tileMap.getHeights ? game.tileMap.getHeights() : null,
            camera: game.camera ? {
                offsetX: game.camera.offsetX,
                offsetY: game.camera.offsetY,
                zoom: game.camera.zoom,
            } : null,
        };
    },
};
