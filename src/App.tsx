import { useCallback, useEffect, useState } from 'react';
import { EngineSkeleton } from './components/EngineSkeleton';
import { useEngine } from './useEngine';
import { api } from './api';
import { TopBar } from './components/TopBar';
import { RightRail } from './components/RightRail';
import { SaveSlotsModal } from './components/SaveSlotsModal';
import { TemplatesModal } from './components/TemplatesModal';
import { ShareModal } from './components/ShareModal';
import { ToastStack } from './components/ToastStack';
import type { TimeOfDayMode } from '../shared/types';

type Modal = null | 'slots' | 'templates' | 'share';

export default function App() {
  const engine = useEngine();
  const [islandName, setIslandName] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayMode>('day');
  const [floating, setFloating] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const pushToast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  // Sync TOD state from engine (e.g. when a slot load applies one)
  useEffect(() => {
    if (!engine) return;
    const sync = () => {
      setTimeOfDay(engine.getTimeOfDay());
      setFloating(engine.getFloating());
    };
    sync();
    const t = setInterval(sync, 1500);
    return () => clearInterval(t);
  }, [engine]);

  const onNameIsland = async () => {
    if (!engine || busy) return;
    setBusy('name');
    try {
      const census = engine.census(10);
      if (!census.length) {
        pushToast('Place something first');
        return;
      }
      const { name } = await api.nameIsland({ census });
      setIslandName(name);
      pushToast(`Named: ${name}`);
    } catch (err) {
      pushToast(`Naming failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const onChangeTimeOfDay = (mode: TimeOfDayMode) => {
    engine?.setTimeOfDay(mode);
    setTimeOfDay(mode);
  };

  const onToggleFloating = () => {
    const next = !floating;
    engine?.setFloating(next);
    setFloating(next);
  };

  const onRaise = () => {
    if (!engine) return;
    const cell = engine.game.renderer.hoverCell;
    if (!cell) {
      pushToast('Hover a cell first');
      return;
    }
    engine.raise(cell.gx, cell.gy);
  };

  const onLower = () => {
    if (!engine) return;
    const cell = engine.game.renderer.hoverCell;
    if (!cell) {
      pushToast('Hover a cell first');
      return;
    }
    engine.lower(cell.gx, cell.gy);
  };

  const onExport = () => {
    engine?.exportPng(islandName ? islandName.toLowerCase().replace(/\s+/g, '-') : 'island');
    pushToast('Exported PNG');
  };

  const onShare = async (publishName: string) => {
    if (!engine) return;
    setBusy('share');
    try {
      const payload = engine.serialize();
      const thumbnail = engine.thumbnail(320) ?? '';
      const census = engine.census(10);
      const res = await api.share({
        name: publishName,
        islandName,
        payload,
        thumbnail,
        tileCensus: census,
        timeOfDay,
        floating,
      });
      setShareUrl(res.url);
      pushToast('Shared!');
    } catch (err) {
      pushToast(`Share failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <EngineSkeleton />

      {engine && (
        <>
          <TopBar
            islandName={islandName}
            naming={busy === 'name'}
            onName={onNameIsland}
            onSlots={() => setModal('slots')}
            onTemplates={() => setModal('templates')}
            onShare={() => setModal('share')}
            onExport={onExport}
            onUndo={() => engine.undo()}
            onRedo={() => engine.redo()}
            historyState={engine.historyState()}
          />
          <RightRail
            timeOfDay={timeOfDay}
            onChangeTimeOfDay={onChangeTimeOfDay}
            floating={floating}
            onToggleFloating={onToggleFloating}
            onRaise={onRaise}
            onLower={onLower}
          />

          {modal === 'slots' && (
            <SaveSlotsModal
              engine={engine}
              islandName={islandName}
              timeOfDay={timeOfDay}
              floating={floating}
              onClose={() => setModal(null)}
              onLoaded={(meta) => {
                if (meta.islandName) setIslandName(meta.islandName);
                pushToast('Loaded');
                setModal(null);
              }}
              onSaved={() => pushToast('Saved')}
            />
          )}

          {modal === 'templates' && (
            <TemplatesModal
              engine={engine}
              onPick={(id) => {
                engine.applyTemplate(id);
                setIslandName(null);
                pushToast(`Template loaded`);
                setModal(null);
              }}
              onClose={() => setModal(null)}
            />
          )}

          {modal === 'share' && (
            <ShareModal
              busy={busy === 'share'}
              onShare={onShare}
              defaultName={islandName ?? 'My Island'}
              shareUrl={shareUrl}
              onClose={() => {
                setShareUrl(null);
                setModal(null);
              }}
            />
          )}
        </>
      )}

      <ToastStack toasts={toasts} />
    </>
  );
}
