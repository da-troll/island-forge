import type { IslandForgeAPI } from '../engine.d';

interface Props {
  engine: IslandForgeAPI;
  onPick: (id: string) => void;
  onClose: () => void;
}

export function TemplatesModal({ engine, onPick, onClose }: Props) {
  const templates = engine.templates();
  return (
    <div className="if-modal-backdrop" onClick={onClose}>
      <div className="if-modal" onClick={(e) => e.stopPropagation()}>
        <h2>New island from template</h2>
        <p>Heads-up: loading a template replaces your current canvas.</p>
        <div className="if-template-grid">
          {templates.map((t) => (
            <button
              key={t.id}
              className="if-template-card"
              onClick={() => onPick(t.id)}
            >
              <div className="name">{t.name}</div>
              <div className="desc">{t.description}</div>
            </button>
          ))}
        </div>
        <div className="if-modal-actions">
          <button className="if-pill" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
