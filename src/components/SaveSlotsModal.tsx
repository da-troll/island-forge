import { useCallback, useEffect, useState } from 'react';
import type { IslandForgeAPI, SlotMeta } from '../engine.d';
import type { TimeOfDayMode } from '../../shared/types';

interface Props {
  engine: IslandForgeAPI;
  islandName: string | null;
  timeOfDay: TimeOfDayMode;
  floating: boolean;
  onClose: () => void;
  onLoaded: (meta: SlotMeta) => void;
  onSaved: () => void;
}

export function SaveSlotsModal({ engine, islandName, timeOfDay, floating, onClose, onLoaded, onSaved }: Props) {
  const [slots, setSlots] = useState<SlotMeta[]>(() => engine.listSlots());
  const refresh = useCallback(() => setSlots(engine.listSlots()), [engine]);

  useEffect(() => { refresh(); }, [refresh]);

  const onSaveTo = (slot: number) => {
    engine.saveSlot(slot, { name: islandName ?? `Slot ${slot}`, islandName, timeOfDay, floating });
    refresh();
    onSaved();
  };

  const onLoadFrom = (meta: SlotMeta) => {
    if (meta.empty) return;
    if (engine.loadSlot(meta.slot)) onLoaded(meta);
  };

  const onDelete = (slot: number) => {
    if (!confirm(`Delete slot ${slot}?`)) return;
    engine.deleteSlot(slot);
    refresh();
  };

  return (
    <div className="if-modal-backdrop" onClick={onClose}>
      <div className="if-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Save slots</h2>
        <p>Five named slots. Save the current island, or load a previous one.</p>

        <div className="if-slot-grid">
          {slots.map((s) => (
            <div key={s.slot} className={`if-slot ${s.empty ? 'empty' : ''}`}>
              {s.empty ? (
                <button
                  onClick={() => onSaveTo(s.slot)}
                  style={{ background: 'transparent', border: 0, width: '100%', padding: '14px 0', cursor: 'pointer', color: 'inherit' }}
                >
                  Slot {s.slot}<br />
                  <span style={{ fontSize: 11 }}>Empty — click to save</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onLoadFrom(s)}
                    style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    {s.thumbnail ? (
                      <img src={s.thumbnail} alt="" />
                    ) : (
                      <div style={{ aspectRatio: '16/9', background: '#ede4d2', borderRadius: 8 }} />
                    )}
                    <div className="if-slot-name">{s.islandName ?? s.name ?? `Slot ${s.slot}`}</div>
                    <div className="if-slot-meta">
                      {s.objects ?? 0} objects · {s.timeOfDay ?? 'day'}
                      {s.savedAt ? ` · ${new Date(s.savedAt).toLocaleDateString()}` : ''}
                    </div>
                  </button>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button className="if-pill" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => onSaveTo(s.slot)}>Overwrite</button>
                    <button className="if-pill" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => onDelete(s.slot)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="if-modal-actions">
          <button className="if-pill" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
