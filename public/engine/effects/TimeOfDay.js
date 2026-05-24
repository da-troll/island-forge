/**
 * TimeOfDay.js — Island Forge addition (2026-05-24, Wilson).
 *
 * Three modes — day / golden / night — applied as a post-pass overlay
 * over the rendered world. Day is a no-op. Golden applies a warm multiply
 * + brighter sky gradient. Night applies a dark multiply, swaps the sky
 * for a deep-blue gradient with stars, and additively glows around
 * lantern/lit objects.
 *
 * Floating-island mode swaps the platform/sky for a sky-and-cloud backdrop.
 *
 * Implementation: hooks the renderer's draw the same way Animations does
 * (wrap draw to post-paint overlays). Order matters — TOD attaches AFTER
 * Animations so its overlay sits on top of the windmill/water/lantern
 * accents.
 */

import { CONFIG } from '../config.js';
import { cellToScreen } from '../grid/IsoGrid.js';

export class TimeOfDay {
    constructor(game) {
        this.game = game;
        this.mode = 'day';
        this.floating = false;
        this._attached = false;
        this._stars = null;
    }

    attach() {
        if (this._attached) return;
        this._attached = true;
        const renderer = this.game.renderer;
        const origDraw = renderer.draw.bind(renderer);
        renderer.draw = () => {
            origDraw();
            try { this._paintOverlay(); } catch (err) { /* swallow */ }
        };
    }

    set(mode) {
        if (!['day', 'golden', 'night'].includes(mode)) return;
        if (this.mode === mode) return;
        this.mode = mode;
        this.game.renderer.markDirty();
        // Stars regen for night.
        if (mode === 'night') this._stars = this._generateStars(80);
        // Sky background swap (CSS variable on canvas).
        const sky = CONFIG.timeOfDay[mode];
        if (sky) {
            this.game.canvas.style.background = `radial-gradient(ellipse at 50% 30%, ${sky.sky} 0%, ${sky.skyMid} 60%, ${sky.skyDeep} 100%)`;
        }
    }

    setFloating(on) {
        this.floating = !!on;
        this.game.renderer.markDirty();
        if (this.floating) {
            this.game.canvas.style.background = 'linear-gradient(180deg, #b4d8f4 0%, #d6e8f5 45%, #f0e7d2 100%)';
        } else {
            this.set(this.mode); // re-apply current TOD sky
        }
    }

    _paintOverlay() {
        const r = this.game.renderer;
        const ctx = r.ctx;
        const cam = this.game.camera;
        const tm = this.game.tileMap;
        const cfg = CONFIG.timeOfDay[this.mode] ?? CONFIG.timeOfDay.day;

        // Stars (night only) — screen space, behind world.
        if (this.mode === 'night' && this._stars) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            for (const s of this._stars) {
                ctx.globalAlpha = 0.4 + 0.6 * s.brightness;
                ctx.fillRect(s.x * this.game.canvas.width, s.y * this.game.canvas.height * 0.55, 1.2, 1.2);
            }
            ctx.restore();
        }

        // Floating-mode cloud drift (screen space, behind world).
        if (this.floating) {
            const t = performance.now() / 1000;
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = '#fff';
            const W = this.game.canvas.width;
            const H = this.game.canvas.height;
            for (let i = 0; i < 6; i++) {
                const cx = ((i * 0.18 + (t * 0.012)) % 1.2 - 0.1) * W;
                const cy = (0.18 + i * 0.12) * H;
                this._drawCloud(ctx, cx, cy, 60 + i * 8);
            }
            ctx.restore();
        }

        // Multiply overlay across the whole canvas — softens warm/cool tone.
        if (cfg.multiplyAlpha > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = cfg.multiply;
            ctx.globalAlpha = cfg.multiplyAlpha;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
            ctx.restore();
        }

        // Night additive glow on lanterns + houses with windows.
        if (cfg.lanternGlow > 0) {
            ctx.save();
            ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.offsetX, cam.offsetY);
            ctx.globalCompositeOperation = 'lighter';
            for (const obj of tm.objects) {
                const glowStrength = this._objectGlow(obj.assetId);
                if (glowStrength <= 0) continue;
                const s = cellToScreen(obj.gx + 0.5, obj.gy + 0.5);
                const lift = (tm.getHeight(obj.gx, obj.gy) || 0) * CONFIG.height.stepPxPerLevel;
                const cx = s.x;
                const cy = s.y - 18 - lift;
                const radius = 20 + glowStrength * 14;
                const alpha = cfg.lanternGlow * glowStrength;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                grad.addColorStop(0, `rgba(255, 220, 120, ${0.45 * alpha})`);
                grad.addColorStop(1, 'rgba(255, 220, 120, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    _objectGlow(assetId) {
        if (!assetId) return 0;
        if (assetId === 'lantern_post' || assetId === 'hanging_lantern') return 1.0;
        if (assetId === 'house' || assetId === 'two_story' || assetId === 'villa' ||
            assetId === 'cube_house' || assetId === 'main_chapel') return 0.55;
        if (assetId === 'taverna' || assetId === 'fishing_boat' || assetId === 'rooftop_terrace') return 0.5;
        return 0;
    }

    _drawCloud(ctx, x, y, w) {
        ctx.beginPath();
        ctx.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2);
        ctx.ellipse(x - w * 0.6, y + 6, w * 0.45, w * 0.24, 0, 0, Math.PI * 2);
        ctx.ellipse(x + w * 0.55, y + 4, w * 0.5, w * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _generateStars(n) {
        const stars = [];
        // Deterministic-ish: simple LCG so the stars don't reshuffle every frame.
        let s = 0xc0ffee;
        const rand = () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 0xffffffff;
        };
        for (let i = 0; i < n; i++) {
            stars.push({
                x: rand(),
                y: rand(),
                brightness: rand(),
            });
        }
        return stars;
    }
}
