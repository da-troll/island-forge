/**
 * Renders the exact DOM skeleton the upstream vanilla engine's UIManager
 * expects to find: loading screen, app shell, canvas, toolbar, palette,
 * hud, instructions, toast. The engine fills the empty containers
 * (toolbar, palette, hud) with its own DOM at runtime.
 */
export function EngineSkeleton() {
  return (
    <>
      <div id="loading-screen">
        <div className="loading-card">
          <div className="loading-logo" />
          <div className="loading-title">Island Forge</div>
          <div className="loading-sub">Generating asset pack…</div>
          <div className="loading-bar">
            <div className="loading-fill" id="loading-fill" />
          </div>
          <div className="loading-status" id="loading-status">warming the kilns</div>
        </div>
      </div>

      <div id="app" className="hidden">
        <canvas id="game-canvas" />

        <header id="title-card">
          <div className="title-logo" />
          <div className="title-text">
            <h1>Island Forge</h1>
            <p>Mediterranean voxel builder · 28×28 grid</p>
          </div>
        </header>

        <aside id="toolbar" />

        <section id="palette">
          <nav id="palette-tabs" />
          <div id="palette-grid" />
        </section>

        <section id="hud">
          <div className="hud-row">
            <div className="hud-clock">
              <span className="sun-icon" />
              <span id="hud-time">10:42</span>
            </div>
          </div>
          <div className="hud-toggles">
            <label className="toggle"><span>Shadows</span><input type="checkbox" id="toggle-ao" defaultChecked /><span className="switch" /></label>
            <label className="toggle"><span>Grid</span><input type="checkbox" id="toggle-grid" /><span className="switch" /></label>
            <label className="toggle"><span>Borders</span><input type="checkbox" id="toggle-borders" defaultChecked /><span className="switch" /></label>
          </div>
          <div className="hud-layers">Layers</div>
        </section>

        <details id="instructions" aria-label="Controls help">
          <summary className="ins-summary">
            <span className="ins-badge" aria-hidden="true">?</span>
            <span className="ins-summary-label">Controls</span>
            <span className="ins-summary-hint" aria-hidden="true">click to open</span>
          </summary>
          <div className="ins-grid ins-grid--mouse">
            <span className="key">Click</span><span>Place selected asset</span>
            <span className="key">Drag</span><span>Brush place across cells</span>
            <span className="key">Right click</span><span>Erase</span>
            <span className="key">Shift drag</span><span>Pan camera</span>
            <span className="key">Wheel</span><span>Zoom</span>
            <span className="key">Ctrl+Z / Y</span><span>Undo / redo</span>
            <span className="key">H / V</span><span>Flip preview</span>
            <span className="key">G</span><span>Toggle grid</span>
            <span className="key">1-5</span><span>Switch categories</span>
          </div>
          <div className="ins-grid ins-grid--touch">
            <span className="key">Tap</span><span>Place selected asset</span>
            <span className="key">Drag</span><span>Brush place across cells</span>
            <span className="key">Long-press</span><span>Erase tile under finger</span>
            <span className="key">Pinch</span><span>Zoom in / out</span>
            <span className="key">Two-finger drag</span><span>Pan camera</span>
          </div>
        </details>

        <div id="toast" />
      </div>
    </>
  );
}
