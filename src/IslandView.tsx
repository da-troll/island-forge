import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EngineSkeleton } from './components/EngineSkeleton';
import { useEngine } from './useEngine';
import { api } from './api';
import type { IslandFull } from '../shared/types';

export default function IslandView() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [island, setIsland] = useState<IslandFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch island metadata BEFORE the engine boots so the bootstrap path can
  // hand the payload straight to main.js.
  useEffect(() => {
    if (!code) return;
    api.island(code)
      .then((data) => {
        setIsland(data);
        // Stash the payload so useEngine picks it up on its first run.
        (window as any).IslandForge = {
          ...(window as any).IslandForge,
          bootstrap: { kind: 'island', payload: data.payload },
        };
      })
      .catch((err) => setError(err.message));
  }, [code]);

  const engine = useEngine(island ? { kind: 'island', payload: island.payload } : undefined);

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#f6efe1' }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, maxWidth: 480 }}>
          <h2>Island not found</h2>
          <p>{error}</p>
          <Link to="/gallery" className="if-pill if-pill--primary">Back to gallery</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <EngineSkeleton />

      <div className="if-top-bar">
        {island ? (
          <span className="if-name-display">{island.island_name ?? island.name}</span>
        ) : null}
        <button
          className="if-pill"
          onClick={() => navigate('/gallery')}
        >
          ← Gallery
        </button>
        <button
          className="if-pill if-pill--primary"
          disabled={!engine || !island}
          onClick={() => {
            if (!engine || !island) return;
            engine.saveSlot(1, { name: `Remix of ${island.name}`, islandName: island.island_name });
            navigate('/');
          }}
        >
          Remix → Slot 1
        </button>
      </div>
    </>
  );
}
