import { useEffect, useRef, useState } from 'react';
import type { IslandForgeAPI } from './engine.d';

const ENGINE_SCRIPT_URL = '/2026-05-24-island-forge/engine/main.js';

/**
 * Mount the vanilla engine once. Returns the API once the engine fires the
 * `island-forge:ready` event. Subsequent re-renders of the host component
 * are safe — we never tear the engine down.
 */
export function useEngine(bootstrap?: { kind: 'slot' | 'template' | 'island'; slot?: number; id?: string; payload?: unknown }) {
  const [api, setApi] = useState<IslandForgeAPI | null>(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    // Hand the bootstrap preference to the engine before its main() runs.
    if (bootstrap) {
      (window as any).IslandForge = { ...(window as any).IslandForge, bootstrap };
    }

    const onReady = () => {
      const candidate = (window as any).IslandForge;
      if (candidate?.ready) setApi(candidate);
    };
    window.addEventListener('island-forge:ready', onReady);

    // Inject script tag if not already present.
    if (!document.querySelector(`script[data-island-engine]`)) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = ENGINE_SCRIPT_URL;
      script.dataset.islandEngine = '1';
      document.body.appendChild(script);
    }

    return () => window.removeEventListener('island-forge:ready', onReady);
  }, []);

  return api;
}
