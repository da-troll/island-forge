import type { TimeOfDayMode } from '../../shared/types';

interface Props {
  timeOfDay: TimeOfDayMode;
  onChangeTimeOfDay: (m: TimeOfDayMode) => void;
  floating: boolean;
  onToggleFloating: () => void;
  onRaise: () => void;
  onLower: () => void;
}

export function RightRail(p: Props) {
  return (
    <div className="if-right-rail">
      <div className="if-card">
        <div className="if-card-title">Time of day</div>
        <div className="if-toggle-group">
          {(['day', 'golden', 'night'] as TimeOfDayMode[]).map((mode) => (
            <button
              key={mode}
              className={p.timeOfDay === mode ? 'active' : ''}
              onClick={() => p.onChangeTimeOfDay(mode)}
            >
              {mode === 'day' ? '☀ Day' : mode === 'golden' ? '🌇 Golden' : '🌙 Night'}
            </button>
          ))}
        </div>
      </div>

      <div className="if-card">
        <div className="if-card-title">Elevation</div>
        <div className="if-toggle-group">
          <button onClick={p.onLower}>− Lower</button>
          <button onClick={p.onRaise}>+ Raise</button>
        </div>
        <div style={{ fontSize: 10, color: '#8a8678', marginTop: 4 }}>
          Hover a cell, then click (or Shift+scroll)
        </div>
      </div>

      <div className="if-card">
        <div className="if-card-title">Mode</div>
        <div className="if-toggle-group">
          <button
            className={!p.floating ? 'active' : ''}
            onClick={() => p.floating && p.onToggleFloating()}
          >
            🏝 Island
          </button>
          <button
            className={p.floating ? 'active' : ''}
            onClick={() => !p.floating && p.onToggleFloating()}
          >
            ☁ Floating
          </button>
        </div>
      </div>
    </div>
  );
}
