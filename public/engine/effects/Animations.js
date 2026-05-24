/**
 * Animations.js — Island Forge addition (2026-05-24, Wilson).
 *
 * Continuous animations layered over the static cache:
 *   - Windmill blades rotate
 *   - Water tiles shimmer (3-frame opacity cycle)
 *   - Lanterns flicker
 *   - Flags wave
 *
 * Strategy: we don't surgically modify the renderer's main draw pipeline.
 * Instead we attach a render hook on the canvas's main context that runs
 * after each game frame, walks the placed objects + terrain, and paints
 * the dynamic overlays in screen space using cellToScreen + the camera
 * transform. The renderer's dirty-flag is forced true on each tick of the
 * animation timer so the frame loop stays alive while animations are on.
 */

import { CONFIG } from '../config.js';
import { cellToScreen } from '../grid/IsoGrid.js';

const A = CONFIG.animations;

export class Animations {
    constructor(game) {
        this.game = game;
        this._raf = null;
        this._attached = false;
    }

    attach() {
        if (this._attached) return;
        this._attached = true;
        // Hijack the renderer's draw method to post-paint our overlays.
        const renderer = this.game.renderer;
        const origDraw = renderer.draw.bind(renderer);
        renderer.draw = () => {
            origDraw();
            try { this._paintOverlays(); } catch (err) { /* swallow */ }
        };
        // Keep the frame loop alive while we have animated tiles to draw.
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
        // Cheap check: any water terrain or any animatable object?
        const tm = this.game.tileMap;
        for (const id of tm.terrain) {
            if (id === 'water') return true;
        }
        for (const obj of tm.objects) {
            if (this._objectAnimKind(obj.assetId)) return true;
        }
        return false;
    }

    _objectAnimKind(assetId) {
        if (!assetId) return null;
        if (assetId === 'windmill') return 'windmill';
        if (assetId === 'lantern_post' || assetId === 'hanging_lantern') return 'lantern';
        if (assetId === 'banner' || assetId === 'flag' || assetId === 'small_flag') return 'flag';
        return null;
    }

    _paintOverlays() {
        const r = this.game.renderer;
        const ctx = r.ctx;
        const cam = this.game.camera;
        const tm = this.game.tileMap;
        const t = performance.now() / 1000;

        ctx.save();
        ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.offsetX, cam.offsetY);

        // Water shimmer — 3-frame cycle at configured fps.
        const shimmerFrame = Math.floor(t * A.waterShimmerFps) % 3;
        for (let gy = 0; gy < tm.height; gy++)
        for (let gx = 0; gx < tm.width; gx++) {
            const id = tm.terrain[gy * tm.width + gx];
            if (id !== 'water') continue;
            const s = cellToScreen(gx + 0.5, gy + 0.5);
            const heightLift = (tm.getHeight(gx, gy) || 0) * CONFIG.height.stepPxPerLevel;
            const sx = s.x;
            const sy = s.y - heightLift;
            // Three subtle dashes shifting position per frame.
            ctx.globalAlpha = 0.18 + shimmerFrame * 0.06;
            ctx.fillStyle = '#ffffff';
            const dashY = sy + (shimmerFrame - 1) * 1.5;
            ctx.beginPath();
            ctx.ellipse(sx - 10 + shimmerFrame * 4, dashY, 4, 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 10 - shimmerFrame * 3, dashY + 4, 3, 1, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Object-level animations.
        for (const obj of tm.objects) {
            const kind = this._objectAnimKind(obj.assetId);
            if (!kind) continue;
            const s = cellToScreen(obj.gx + 0.5, obj.gy + 0.5);
            const heightLift = (tm.getHeight(obj.gx, obj.gy) || 0) * CONFIG.height.stepPxPerLevel;
            const sx = s.x;
            const sy = s.y - heightLift;
            if (kind === 'windmill') {
                this._paintWindmill(ctx, sx, sy, t);
            } else if (kind === 'lantern') {
                this._paintLantern(ctx, sx, sy, t);
            } else if (kind === 'flag') {
                this._paintFlag(ctx, sx, sy, t);
            }
        }
        ctx.restore();
    }

    _paintWindmill(ctx, sx, sy, t) {
        // Windmill blade hub sits about 36px above the tile center.
        const hubY = sy - 38;
        const angle = (t * A.windmillRpm * Math.PI * 2) / 60;
        ctx.save();
        ctx.translate(sx, hubY);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.strokeStyle = 'rgba(45, 35, 25, 0.65)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(4, -22);
            ctx.lineTo(-4, -22);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        // Hub cap
        ctx.fillStyle = '#5a4a35';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _paintLantern(ctx, sx, sy, t) {
        const pulse = 0.85 + 0.15 * Math.sin(t * A.lanternFlickerHz * Math.PI * 2);
        // Lantern bulb sits ~24px above the tile center for a lantern_post.
        const bx = sx;
        const by = sy - 22;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 18);
        grad.addColorStop(0, `rgba(255, 198, 90, ${0.55 * pulse})`);
        grad.addColorStop(1, 'rgba(255, 198, 90, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _paintFlag(ctx, sx, sy, t) {
        const wave = Math.sin(t * A.flagWaveHz * Math.PI * 2) * A.flagAmplitudePx;
        const fx = sx + 4 + wave;
        const fy = sy - 26;
        ctx.save();
        ctx.fillStyle = '#1b5ba8';
        ctx.strokeStyle = '#134680';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(fx + 8, fy - 1 + wave * 0.4, fx + 14, fy + 2);
        ctx.lineTo(fx + 14, fy + 8);
        ctx.quadraticCurveTo(fx + 8, fy + 6 + wave * 0.4, fx, fy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}
