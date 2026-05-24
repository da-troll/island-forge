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

        // Water shimmer — bright moving whitecaps across each water tile.
        // Per-tile phase based on (gx + gy) so neighbouring tiles aren't
        // in lockstep. Two horizontal dash bands sliding in opposite
        // directions for a "broken light on water" feel.
        ctx.fillStyle = '#ffffff';
        for (let gy = 0; gy < tm.height; gy++)
        for (let gx = 0; gx < tm.width; gx++) {
            const id = tm.terrain[gy * tm.width + gx];
            if (id !== 'water' && id !== 'sea') continue;
            const s = cellToScreen(gx + 0.5, gy + 0.5);
            const heightLift = (tm.getHeight(gx, gy) || 0) * CONFIG.height.stepPxPerLevel;
            const sx = s.x;
            const sy = s.y - heightLift;
            const phase = (gx * 0.7 + gy * 0.4 + t * 1.2);
            // Band 1: long dash sliding right.
            const slide1 = ((phase * 12) % 28) - 14;
            ctx.globalAlpha = 0.42 + 0.2 * Math.sin(phase * Math.PI);
            ctx.beginPath();
            ctx.ellipse(sx + slide1, sy + 4, 10, 1.4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Band 2: shorter dash sliding the other way.
            const slide2 = -((phase * 8) % 22) + 11;
            ctx.globalAlpha = 0.30 + 0.18 * Math.sin(phase * Math.PI * 1.3);
            ctx.beginPath();
            ctx.ellipse(sx + slide2, sy - 5, 7, 1.2, 0, 0, Math.PI * 2);
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
        // Hub sits well above the tower — the static windmill builder
        // puts blades at voxel z=6 (out of ~10 tower height), and the
        // 2x2 footprint means the tower top is roughly 70-90px above the
        // tile center. The wider radius dominates the static baked
        // blades so the rotation reads clearly.
        const hubY = sy - 78;
        const angle = (t * A.windmillRpm * Math.PI * 2) / 60;
        const bladeLen = 44;
        const bladeWide = 9;
        ctx.save();
        ctx.translate(sx, hubY);
        ctx.rotate(angle);
        // Soft halo behind the blades so they "punch through" the static
        // sprite even on bright backgrounds.
        const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, bladeLen + 6);
        halo.addColorStop(0, 'rgba(255,255,255,0.65)');
        halo.addColorStop(0.6, 'rgba(255,255,255,0.18)');
        halo.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, bladeLen + 6, 0, Math.PI * 2);
        ctx.fill();
        // 4 paddle blades.
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeStyle = 'rgba(40, 30, 18, 0.85)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(bladeWide, -bladeLen);
            ctx.lineTo(-bladeWide, -bladeLen);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Wood spine.
            ctx.strokeStyle = 'rgba(90, 60, 30, 0.9)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -bladeLen);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(40, 30, 18, 0.85)';
            ctx.lineWidth = 1.6;
            ctx.restore();
        }
        // Hub cap.
        ctx.fillStyle = '#5a4a35';
        ctx.strokeStyle = 'rgba(20, 15, 8, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    _paintLantern(ctx, sx, sy, t) {
        // Lanterns don't glow in real daylight, but the user needs to see
        // something is moving. Tiny warm flame flicker sitting on top of
        // the lantern bulb regardless of time of day; the TimeOfDay layer
        // adds the bigger ambient glow at golden/night.
        const pulse = 0.75 + 0.25 * Math.sin(t * A.lanternFlickerHz * Math.PI * 2 + sx * 0.1);
        const bx = sx;
        const by = sy - 28;
        ctx.save();
        // Inner bright dot.
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 10);
        grad.addColorStop(0, `rgba(255, 220, 130, ${0.9 * pulse})`);
        grad.addColorStop(1, 'rgba(255, 198, 90, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _paintFlag(ctx, sx, sy, t) {
        // Bigger, brighter flag so it actually reads. Pole anchored at
        // tile center, flag flying right with sinusoidal wave + per-segment
        // phase shift so the ripple travels along the cloth.
        const baseY = sy - 6;
        const poleH = 36;
        const flagW = 22;
        const flagH = 12;
        ctx.save();
        // Pole.
        ctx.strokeStyle = '#3a2a18';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, baseY);
        ctx.lineTo(sx, baseY - poleH);
        ctx.stroke();
        // Pole cap.
        ctx.fillStyle = '#cc9a3a';
        ctx.beginPath();
        ctx.arc(sx, baseY - poleH - 1, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // Flag cloth as 5 segments so the wave travels.
        const seg = 5;
        const top = baseY - poleH + 1;
        ctx.fillStyle = '#d44545';
        ctx.strokeStyle = 'rgba(60, 15, 15, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, top);
        for (let i = 0; i <= seg; i++) {
            const phase = (i / seg) * Math.PI * 2;
            const x = sx + (i / seg) * flagW;
            const yOff = Math.sin(t * A.flagWaveHz * Math.PI * 2 + phase) * A.flagAmplitudePx * (i / seg);
            ctx.lineTo(x, top + yOff);
        }
        for (let i = seg; i >= 0; i--) {
            const phase = (i / seg) * Math.PI * 2;
            const x = sx + (i / seg) * flagW;
            const yOff = Math.sin(t * A.flagWaveHz * Math.PI * 2 + phase) * A.flagAmplitudePx * (i / seg);
            ctx.lineTo(x, top + flagH + yOff);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}
