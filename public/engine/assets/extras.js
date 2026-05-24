/**
 * extras.js — Island Forge addition (2026-05-24, Wilson).
 *
 * Procedurally registers new tile/object assets ON TOP OF the upstream
 * manifest. Each extra uses the same `builder()` voxel-recipe pattern
 * upstream uses for its fallback procedural rendering.
 *
 * To keep the v1 build tight we ship a curated subset of high-impact
 * additions and leave the rest as v2. Adding a new entry is mechanical:
 * write a `builderFoo()` that returns `{ x, y, z, c }` voxels and add a
 * manifest entry below.
 */

import { ASSET_MANIFEST, ASSET_INDEX } from './assetManifest.js';
import { CONFIG } from '../config.js';

const P = CONFIG.palette;
const VPT = CONFIG.voxel.perTile; // 4

function flatFloor(color, accents = null) {
    const v = [];
    for (let ix = 0; ix < VPT; ix++)
    for (let iy = 0; iy < VPT; iy++) {
        let c = color;
        if (accents) c = accents(ix, iy) ?? color;
        v.push({ x: ix, y: iy, z: 0, c });
    }
    return v;
}

function pillar(x, y, zStart, height, color) {
    const v = [];
    for (let z = zStart; z < zStart + height; z++) v.push({ x, y, z, c: color });
    return v;
}

/* ───────────── Floating-mode terrain ───────────── */

export function tileCloud() {
    const cloud = '#fbfdff';
    const cloudShadow = '#e0e8f2';
    return flatFloor(cloud, (ix, iy) => {
        if ((ix + iy) % 3 === 0) return cloudShadow;
        return null;
    });
}

export function tileMist() {
    const mist = '#e6ecf5';
    const mistDark = '#cbd5e6';
    const v = flatFloor(mist, (ix, iy) => {
        if ((ix * 7 + iy * 11) % 5 === 0) return mistDark;
        return null;
    });
    v.forEach(d => { d.water = true; }); // borrow water's transparency
    return v;
}

export function tileSkyPlatform() {
    const sky = '#cbe2f6';
    const skyDark = '#a8c8e0';
    return flatFloor(sky, (ix, iy) => {
        if ((ix + iy) % 2 === 0) return skyDark;
        return null;
    });
}

/* ───────────── Harbour ───────────── */

export function fishingBoat() {
    // Footprint 1×2. Build hull along iy = 0..7 (2 cells of 4 voxels each).
    const v = [];
    const hull = '#3a3833';
    const hullLight = '#5a5750';
    const deck = '#a07344';
    const mast = '#fbf6ec';
    for (let iy = 0; iy < VPT * 2; iy++)
    for (let ix = 1; ix < VPT - 1; ix++) {
        v.push({ x: ix, y: iy, z: 0, c: hull });
        v.push({ x: ix, y: iy, z: 1, c: hullLight });
    }
    // Deck floor.
    for (let iy = 1; iy < VPT * 2 - 1; iy++)
    for (let ix = 1; ix < VPT - 1; ix++) {
        v.push({ x: ix, y: iy, z: 2, c: deck });
    }
    // Mast in center.
    v.push(...pillar(1, 3, 3, 5, mast));
    v.push({ x: 2, y: 3, z: 5, c: mast });
    v.push({ x: 0, y: 3, z: 4, c: mast });
    return v;
}

export function dockSection() {
    const v = [];
    const wood = '#7a4a2a';
    const woodDark = '#562f17';
    for (let ix = 0; ix < VPT; ix++)
    for (let iy = 0; iy < VPT; iy++) {
        v.push({ x: ix, y: iy, z: 0, c: wood });
        if ((ix + iy) % 2 === 0) v.push({ x: ix, y: iy, z: 1, c: woodDark });
    }
    return v;
}

export function mooringPost() {
    const v = [];
    const wood = '#7a4a2a';
    const rope = '#d6c8a0';
    v.push(...pillar(1, 1, 0, 5, wood));
    // Rope coil.
    v.push({ x: 2, y: 1, z: 1, c: rope });
    v.push({ x: 2, y: 1, z: 2, c: rope });
    v.push({ x: 1, y: 2, z: 1, c: rope });
    return v;
}

/* ───────────── Ruins ───────────── */

export function crumbledWall() {
    const v = [];
    const stone = '#cdc8b8';
    const stoneDark = '#8d8878';
    for (let ix = 0; ix < VPT; ix++) {
        if (ix === 2) continue; // gap
        v.push({ x: ix, y: 1, z: 0, c: stone });
        v.push({ x: ix, y: 1, z: 1, c: stoneDark });
        if (ix !== 1) v.push({ x: ix, y: 1, z: 2, c: stone });
    }
    return v;
}

export function brokenColumn() {
    const v = [];
    const stone = '#e6dec8';
    const stoneDark = '#b7ad94';
    v.push(...pillar(1, 1, 0, 4, stone));
    v.push({ x: 1, y: 1, z: 4, c: stoneDark });
    v.push({ x: 2, y: 1, z: 0, c: stone });
    v.push({ x: 1, y: 2, z: 0, c: stoneDark });
    return v;
}

export function fallenArch() {
    // 2-wide footprint.
    const v = [];
    const stone = '#dccfb4';
    const stoneDark = '#a89878';
    v.push(...pillar(1, 1, 0, 4, stone));
    v.push(...pillar(6, 1, 0, 4, stoneDark));
    // Fallen pieces between columns.
    v.push({ x: 3, y: 1, z: 0, c: stone });
    v.push({ x: 4, y: 1, z: 0, c: stoneDark });
    v.push({ x: 5, y: 1, z: 0, c: stone });
    return v;
}

/* ───────────── Props ───────────── */

export function tavernaTable() {
    const v = [];
    const wood = '#a67448';
    const cloth = '#fbf6ec';
    for (let ix = 1; ix < VPT - 1; ix++)
    for (let iy = 1; iy < VPT - 1; iy++) {
        v.push({ x: ix, y: iy, z: 0, c: wood });
        v.push({ x: ix, y: iy, z: 1, c: wood });
        v.push({ x: ix, y: iy, z: 2, c: cloth });
    }
    return v;
}

export function amphoraStack() {
    const v = [];
    const body = '#a85a30';
    const shadow = '#7f4322';
    const positions = [[1, 1], [2, 1], [1, 2]];
    for (const [x, y] of positions) {
        for (let z = 0; z < 3; z++) v.push({ x, y, z, c: body });
        v.push({ x, y, z: 3, c: shadow });
    }
    return v;
}

export function rooftopTerrace() {
    // 2×2 footprint flat terrace with a railing accent.
    const v = [];
    const floor = '#fbf6ec';
    const accent = '#1b5ba8';
    const W = VPT * 2;
    for (let ix = 0; ix < W; ix++)
    for (let iy = 0; iy < W; iy++) {
        v.push({ x: ix, y: iy, z: 0, c: floor });
    }
    for (let ix = 0; ix < W; ix++) {
        v.push({ x: ix, y: 0, z: 1, c: accent });
        v.push({ x: ix, y: W - 1, z: 1, c: accent });
    }
    for (let iy = 0; iy < W; iy++) {
        v.push({ x: 0, y: iy, z: 1, c: accent });
        v.push({ x: W - 1, y: iy, z: 1, c: accent });
    }
    return v;
}

export function glowingWindow() {
    const v = [];
    const wall = '#fafaf5';
    const glow = '#ffd989';
    for (let ix = 0; ix < VPT; ix++)
    for (let iy = 0; iy < VPT; iy++) {
        for (let z = 0; z < 3; z++) v.push({ x: ix, y: iy, z, c: wall });
    }
    // Carve a window.
    for (let z = 1; z < 3; z++) {
        v.push({ x: 1, y: 1, z, c: glow });
        v.push({ x: 2, y: 1, z, c: glow });
    }
    return v;
}

export function smallFlagPole() {
    const v = [];
    const pole = '#56432a';
    const flag = '#1b5ba8';
    v.push(...pillar(1, 1, 0, 5, pole));
    v.push({ x: 2, y: 1, z: 3, c: flag });
    v.push({ x: 2, y: 1, z: 4, c: flag });
    return v;
}

export function fountainCircle() {
    const v = [];
    const stone = '#cdc8b8';
    const water = '#6ec8e0';
    for (let ix = 0; ix < VPT; ix++)
    for (let iy = 0; iy < VPT; iy++) {
        const onEdge = ix === 0 || ix === VPT - 1 || iy === 0 || iy === VPT - 1;
        if (onEdge) {
            v.push({ x: ix, y: iy, z: 0, c: stone });
            v.push({ x: ix, y: iy, z: 1, c: stone });
        } else {
            const w = { x: ix, y: iy, z: 0, c: water };
            w.water = true;
            v.push(w);
        }
    }
    return v;
}

const EXTRAS = [
    // Terrain
    { id: 'cloud', name: 'Cloud', category: 'terrain', tileLike: true, footprint: { w: 1, d: 1 }, kind: 'terrain', builder: tileCloud },
    { id: 'mist', name: 'Mist', category: 'terrain', tileLike: true, footprint: { w: 1, d: 1 }, kind: 'terrain', builder: tileMist },
    { id: 'sky_platform', name: 'Sky Platform', category: 'terrain', tileLike: true, footprint: { w: 1, d: 1 }, kind: 'terrain', builder: tileSkyPlatform },

    // Buildings + objects
    { id: 'fishing_boat', name: 'Fishing Boat', category: 'buildings', footprint: { w: 1, d: 2 }, kind: 'object', builder: fishingBoat, sizeScale: 0.92 },
    { id: 'dock_section', name: 'Dock', category: 'water', footprint: { w: 1, d: 1 }, kind: 'object', builder: dockSection, sizeScale: 1, tileLike: true },
    { id: 'mooring_post', name: 'Mooring Post', category: 'water', footprint: { w: 1, d: 1 }, kind: 'object', builder: mooringPost, sizeScale: 0.4 },

    { id: 'crumbled_wall', name: 'Crumbled Wall', category: 'props', footprint: { w: 1, d: 1 }, kind: 'object', builder: crumbledWall, sizeScale: 0.85 },
    { id: 'broken_column', name: 'Broken Column', category: 'props', footprint: { w: 1, d: 1 }, kind: 'object', builder: brokenColumn, sizeScale: 0.5 },
    { id: 'fallen_arch', name: 'Fallen Arch', category: 'props', footprint: { w: 2, d: 1 }, kind: 'object', builder: fallenArch, sizeScale: 0.9 },

    { id: 'taverna_table', name: 'Taverna Table', category: 'props', footprint: { w: 1, d: 1 }, kind: 'object', builder: tavernaTable, sizeScale: 0.7 },
    { id: 'amphora_stack', name: 'Amphora Stack', category: 'props', footprint: { w: 1, d: 1 }, kind: 'object', builder: amphoraStack, sizeScale: 0.55 },
    { id: 'rooftop_terrace', name: 'Rooftop Terrace', category: 'buildings', footprint: { w: 2, d: 2 }, kind: 'object', builder: rooftopTerrace, sizeScale: 0.95 },
    { id: 'glowing_window', name: 'Lit Window', category: 'buildings', footprint: { w: 1, d: 1 }, kind: 'object', builder: glowingWindow, sizeScale: 0.5 },
    { id: 'small_flag', name: 'Pennant Flag', category: 'props', footprint: { w: 1, d: 1 }, kind: 'object', builder: smallFlagPole, sizeScale: 0.4 },
    { id: 'fountain_circle', name: 'Fountain', category: 'props', footprint: { w: 1, d: 1 }, kind: 'object', builder: fountainCircle, sizeScale: 0.85 },
];

/**
 * Append extras to the manifest BEFORE loadAssets() runs. Safe to call
 * multiple times — duplicate ids are skipped. Note that we deliberately
 * omit `filename` so the loader uses the procedural `builder` directly
 * (no failed PNG fetches, no 404s in devtools).
 */
export function extendAssetManifest() {
    let added = 0;
    for (const e of EXTRAS) {
        if (ASSET_INDEX[e.id]) continue;
        ASSET_MANIFEST.push(e);
        ASSET_INDEX[e.id] = e;
        added++;
    }
    if (added > 0) {
        console.info(`[island-forge] registered ${added} procedural extras`);
    }
    return added;
}
