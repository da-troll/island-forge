interface Props {
  islandName: string | null;
  naming: boolean;
  pickupArmed: boolean;
  onName: () => void;
  onSlots: () => void;
  onTemplates: () => void;
  onShare: () => void;
  onExport: () => void;
  onPickup: () => void;
  onUndo: () => void;
  onRedo: () => void;
  historyState: { canUndo: boolean; canRedo: boolean };
}

export function TopBar(p: Props) {
  return (
    <div className="if-top-bar">
      {p.islandName ? (
        <span className="if-name-display">{p.islandName}</span>
      ) : null}
      <button
        className="if-pill if-pill--primary"
        onClick={p.onName}
        disabled={p.naming}
      >
        {p.naming ? 'Naming…' : 'Name your island'}
      </button>
      <button className="if-pill" onClick={p.onTemplates}>Templates</button>
      <button className="if-pill" onClick={p.onSlots}>Save slots</button>
      <button className="if-pill" onClick={p.onShare}>Share</button>
      <button className="if-pill" onClick={p.onExport}>Export PNG</button>
      <button
        className={p.pickupArmed ? 'if-pill if-pill--primary' : 'if-pill'}
        onClick={p.onPickup}
        title={p.pickupArmed ? 'Cancel pickup (Esc)' : 'Pick up a placed object to move it'}
      >
        {p.pickupArmed ? '✕ Cancel pickup' : '✥ Move object'}
      </button>
      <button
        className="if-pill if-pill--ghost"
        onClick={p.onUndo}
        disabled={!p.historyState.canUndo}
        title="Ctrl+Z"
      >
        ↶
      </button>
      <button
        className="if-pill if-pill--ghost"
        onClick={p.onRedo}
        disabled={!p.historyState.canRedo}
        title="Ctrl+Shift+Z"
      >
        ↷
      </button>
    </div>
  );
}
