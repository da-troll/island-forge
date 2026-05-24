import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';
import type { IslandRow } from '../shared/types';

export default function Gallery() {
  const [islands, setIslands] = useState<IslandRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.gallery()
      .then((r) => setIslands(r.islands))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="if-gallery">
      <div className="if-gallery-header">
        <div>
          <h1 style={{ margin: 0, color: '#134680', fontSize: 28, fontWeight: 800 }}>Island Gallery</h1>
          <p style={{ margin: '4px 0 0', color: '#51504a', fontSize: 13 }}>
            Community-shared islands. Click one to view and remix.
          </p>
        </div>
        <Link to="/" className="if-pill if-pill--primary">← Back to forge</Link>
      </div>

      {error ? (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16, color: '#7f1d1d', background: '#fee2e2', borderRadius: 12 }}>
          Failed to load gallery: {error}
        </div>
      ) : null}

      {!islands && !error ? (
        <div style={{ maxWidth: 1100, margin: '0 auto', color: '#8a8678' }}>Loading…</div>
      ) : null}

      {islands && islands.length === 0 ? (
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center', padding: 40, color: '#8a8678' }}>
          No islands shared yet. Be the first!
        </div>
      ) : null}

      <div className="if-gallery-grid">
        {(islands ?? []).map((island) => (
          <Link key={island.id} to={`/i/${island.id}`} className="if-island-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            {island.thumbnail ? (
              <img src={island.thumbnail} alt={island.name} />
            ) : (
              <div style={{ aspectRatio: '16/9', background: '#ede4d2' }} />
            )}
            <div className="meta">
              <div className="name">{island.island_name ?? island.name}</div>
              <div className="time">{new Date(island.created_at).toLocaleString()}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
