/**
 * Animations.js — Island Forge (2026-05-24, Wilson).
 *
 * v2: animations are rendered as REAL voxel parts, not cartoon overlays.
 *
 * Currently delivers windmill blade rotation (separated blade voxels
 * rendered offscreen, stamped + rotated each frame around the hub).
 * Water / flag / lantern / etc. are queued for later — see notes in
 * MEMORY for the v3 plan to extend the same separated-voxel pattern.
 *
 * The renderer's dirty-flag is forced true on each tick of the animation
 * timer so the frame loop stays alive while rotation is in progress.
 */

import { CONFIG } from '../config.js';
import { cellToScreen } from '../grid/IsoGrid.js';
import { voxelToScreen, renderVoxels } from '../assets/voxelRenderer.js';

const A = CONFIG.animations;
const VPT = CONFIG.voxel.perTile;
const P = CONFIG.palette;

export class Animations {
    constructor(game) {
        this.game = game;
        this._raf = null;
        this._attached = false;
        this._bladeSprite = null; // { canvas, hubX, hubY }
    }

    attach() {
        if (this._attached) return;
        this._attached = true;

        // Pre-render the windmill blade assembly once. Same voxel coords
        // the upstream windmillBuilding() used for the (now removed)
        // baked-in blades — so the rotation pivots over the same spot
        // the static tower expects to see the hub.
        this._bladeSprite = buildWindmillBladeSprite();

        const renderer = this.game.renderer;
        const origDraw = renderer.draw.bind(renderer);
        renderer.draw = () => {
            origDraw();
            try { this._paintOverlays(); } catch (err) { /* swallow */ }
        };

        const tick = () => {
            if (this._hasAnimatedContent()) renderer.markDirty();
            this._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
    }

    detach() {
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = null;
        this._attached = false;
    }

    _hasAnimatedContent() {
        const tm = this.game.tileMap;
        for (const obj of tm.objects) {
            if (obj.assetId === 'windmill') return true;
        }
        return false;
    }

    _paintOverlays() {
        if (!this._bladeSprite) return;
        const r = this.game.renderer;
        const ctx = r.ctx;
        const cam = this.game.camera;
        const tm = this.game.tileMap;
        const t = performance.now() / 1000;
        const angle = (t * A.windmillRpm * Math.PI * 2) / 60;

        ctx.save();
        ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.offsetX, cam.offsetY);

        for (const obj of tm.objects) {
            if (obj.assetId !== 'windmill') continue;
            // Hub world position = back corner of object's footprint origin
            // + voxel-to-screen offset for the hub voxel + elevation lift.
            const back = cellToScreen(obj.gx, obj.gy);
            const cx = Math.floor(VPT * obj.footprint.w / 2);
            const cy = Math.floor(VPT * obj.footprint.d / 2);
            const hubLocal = voxelToScreen(cx, cy, 6);
            const lift = (tm.getHeight(obj.gx, obj.gy) || 0) * CONFIG.height.stepPxPerLevel;
            const hubX = back.x + hubLocal.sx;
            const hubY = back.y + hubLocal.sy - lift;
            this._stampBlades(ctx, hubX, hubY, angle);
        }

        ctx.restore();
    }

    _stampBlades(ctx, hubX, hubY, angle) {
        const sprite = this._bladeSprite;
        if (!sprite) return;
        ctx.save();
        ctx.translate(hubX, hubY);
        ctx.rotate(angle);
        ctx.drawImage(sprite.canvas, -sprite.hubX, -sprite.hubY);
        ctx.restore();
    }
}

/**
 * Build the rotating-blades sprite: hub iron block + 4 blade arms,
 * positioned with the hub voxel at the canvas's origin so we can rotate
 * the whole sprite around its center cleanly.
 *
 * Voxel layout mirrors the original baked-in windmill blades:
 *   - hub:    (cx, cy, 6) iron
 *   - arms:   (cx ± 2, cy, 6), (cx ± 3, cy, 6)  — horizontal
 *             (cx, cy, 4), (cx, cy, 8)          — vertical
 *
 * The voxelRenderer returns a canvas + anchor for world (0,0,0); we
 * compute where the hub voxel actually rendered inside that canvas so
 * the rotation pivot is exact.
 */
function buildWindmillBladeSprite() {
    const cx = 0;
    const cy = 0;
    const cz = 0;
    const voxels = [];
    // Hub (iron, slightly larger so it reads as the rotation center).
    voxels.push({ x: cx, y: cy, z: cz, c: P.iron });
    // Horizontal arms.
    voxels.push({ x: cx + 2, y: cy, z: cz, c: P.wood });
    voxels.push({ x: cx + 3, y: cy, z: cz, c: P.woodDark });
    voxels.push({ x: cx - 2, y: cy, z: cz, c: P.wood });
    voxels.push({ x: cx - 3, y: cy, z: cz, c: P.woodDark });
    // Vertical arms.
    voxels.push({ x: cx, y: cy, z: cz - 2, c: P.wood });
    voxels.push({ x: cx, y: cy, z: cz + 2, c: P.wood });

    const { canvas, anchorX, anchorY } = renderVoxels(voxels, { w: 1, d: 1 });
    const hubLocal = voxelToScreen(cx, cy, cz);
    // Pixel position of the hub voxel's top-back corner inside the
    // rendered canvas. Shift by half-width / quarter-width to centre on
    // the hub voxel's top face rather than its corner.
    const hubX = anchorX + hubLocal.sx;
    const hubY = anchorY + hubLocal.sy + CONFIG.voxel.size / 4;
    return { canvas, hubX, hubY };
}
