// Ambient declarations for window.IslandForge exposed by the vanilla engine.
import type { TimeOfDayMode, CensusEntry } from '../shared/types';

declare global {
  interface Window {
    IslandForge?: IslandForgeAPI;
  }
}

export interface SlotMeta {
  slot: number;
  empty: boolean;
  name?: string | null;
  islandName?: string | null;
  savedAt?: number | null;
  thumbnail?: string | null;
  timeOfDay?: TimeOfDayMode;
  floating?: boolean;
  objects?: number;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
}

export interface SavePayload {
  tileMap: unknown;
  heights: number[] | null;
  timeOfDay: TimeOfDayMode;
  floating: boolean;
  camera: { offsetX: number; offsetY: number; zoom: number } | null;
}

export interface IslandForgeAPI {
  ready: boolean;
  game: any;
  ui: any;
  animations: any;
  tod: any;
  listSlots: () => SlotMeta[];
  saveSlot: (slot: number, overrides?: { name?: string | null; islandName?: string | null; timeOfDay?: TimeOfDayMode; floating?: boolean; thumbnail?: string | null }) => unknown;
  loadSlot: (slot: number) => boolean;
  deleteSlot: (slot: number) => void;
  templates: () => TemplateMeta[];
  applyTemplate: (id: string) => boolean;
  setTimeOfDay: (mode: TimeOfDayMode) => void;
  getTimeOfDay: () => TimeOfDayMode;
  setFloating: (on: boolean) => void;
  getFloating: () => boolean;
  raise: (gx: number, gy: number) => void;
  lower: (gx: number, gy: number) => void;
  undo: () => boolean;
  redo: () => boolean;
  historyState: () => { canUndo: boolean; canRedo: boolean };
  census: (topN?: number) => CensusEntry[];
  thumbnail: (maxWidth?: number) => string | null;
  exportPng: (filename?: string) => boolean;
  serialize: () => SavePayload;
  applyShared: (payload: unknown) => boolean;
}
