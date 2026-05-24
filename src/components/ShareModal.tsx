import { useState } from 'react';

interface Props {
  busy: boolean;
  defaultName: string;
  shareUrl: string | null;
  onShare: (name: string) => void;
  onClose: () => void;
}

export function ShareModal({ busy, defaultName, shareUrl, onShare, onClose }: Props) {
  const [name, setName] = useState(defaultName);

  const copy = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); } catch {}
  };

  return (
    <div className="if-modal-backdrop" onClick={onClose}>
      <div className="if-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share island</h2>
        {!shareUrl ? (
          <>
            <p>Posts a snapshot of your island to the community gallery. You get back a 6-character code anyone can use to view it.</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#8a8678', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Public name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Island"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #d9d0bd',
                  background: '#fff',
                  font: 'inherit',
                }}
              />
            </div>
            <div className="if-modal-actions">
              <button className="if-pill" onClick={onClose}>Cancel</button>
              <button
                className="if-pill if-pill--primary"
                onClick={() => onShare(name.trim() || 'Untitled Island')}
                disabled={busy}
              >
                {busy ? 'Sharing…' : 'Publish to gallery'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Shared! Anyone can open this URL.</p>
            <div className="if-share-link">{shareUrl}</div>
            <div className="if-modal-actions">
              <button className="if-pill" onClick={copy}>Copy link</button>
              <button className="if-pill if-pill--primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
