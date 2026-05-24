/**
 * History.js — Island Forge undo/redo (2026-05-24, Wilson).
 *
 * Snapshot-based undo stack (cap 50). Wraps the placement system's place()
 * and erase() methods so every mutation pushes the prior state onto the
 * stack. Cheap because each snapshot is just the serialized TileMap + height
 * array — ~10–50 KB depending on island fullness.
 *
 * This trades memory for simplicity (vs. a per-op delta) but the trade-off
 * is fine for a creative toy with ~50 ops max.
 */

import { PlacedObject } from '../building/PlacedObject.js';

const CAP = 50;

export class History {
    constructor(game) {
        this.game = game;
        this.undoStack = [];
        this.redoStack = [];
        this._attached = false;
    }

    attach() {
        if (this._attached) return;
        this._attached = true;
        const ps = this.game.placement;
        const origPlace = ps.place.bind(ps);
        const origErase = ps.erase.bind(ps);

        const recordBefore = () => {
            const snap = this._snapshot();
            this.undoStack.push(snap);
            if (this.undoStack.length > CAP) this.undoStack.shift();
            this.redoStack.length = 0;
        };

        ps.place = (...args) => {
            const snap = this._snapshot();
            const result = origPlace(...args);
            // Only record successful, world-changing operations.
            if (result?.kind) {
                this.undoStack.push(snap);
                if (this.undoStack.length > CAP) this.undoStack.shift();
                this.redoStack.length = 0;
            }
            return result;
        };

        ps.erase = (...args) => {
            const snap = this._snapshot();
            const result = origErase(...args);
            if (result) {
                this.undoStack.push(snap);
                if (this.undoStack.length > CAP) this.undoStack.shift();
                this.redoStack.length = 0;
            }
            return result;
        };

        // Record before destructive setHeight ops too.
        const tm = this.game.tileMap;
        const origSetHeight = tm.setHeight.bind(tm);
        tm.setHeight = (gx, gy, h) => {
            const before = tm.getHeight(gx, gy);
            const snap = this._snapshot();
            origSetHeight(gx, gy, h);
            const after = tm.getHeight(gx, gy);
            if (before !== after) {
                this.undoStack.push(snap);
                if (this.undoStack.length > CAP) this.undoStack.shift();
                this.redoStack.length = 0;
            }
        };

        // Keyboard shortcuts.
        window.addEventListener('keydown', (e) => {
            const meta = e.ctrlKey || e.metaKey;
            if (!meta) return;
            if (e.key === 'z' || e.key === 'Z') {
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
                e.preventDefault();
            } else if (e.key === 'y' || e.key === 'Y') {
                this.redo();
                e.preventDefault();
            }
        });
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    undo() {
        if (!this.canUndo()) return false;
        this.redoStack.push(this._snapshot());
        const prev = this.undoStack.pop();
        this._restore(prev);
        this.game.ui?.showToast('Undone');
        return true;
    }

    redo() {
        if (!this.canRedo()) return false;
        this.undoStack.push(this._snapshot());
        const next = this.redoStack.pop();
        this._restore(next);
        this.game.ui?.showToast('Redone');
        return true;
    }

    _snapshot() {
        return JSON.stringify({
            tileMap: this.game.tileMap.serialize(),
            heights: this.game.tileMap.getHeights(),
        });
    }

    _restore(snap) {
        try {
            const data = JSON.parse(snap);
            this.game.tileMap.deserialize(data.tileMap, d => new PlacedObject(d));
            if (Array.isArray(data.heights)) this.game.tileMap.setHeights(data.heights);
            this.game.renderer.markDirty();
        } catch (err) {
            console.warn('[history] restore failed', err);
        }
    }
}
