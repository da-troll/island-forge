// Wire types shared between server and client.

export type TimeOfDayMode = 'day' | 'golden' | 'night';

export interface CensusEntry {
  id: string;
  count: number;
}

export interface NameRequest {
  census: CensusEntry[];
  hint?: string | null;
}

export interface NameResponse {
  name: string;
  model: string;
}

export interface ShareRequest {
  name: string;
  islandName: string | null;
  payload: unknown;       // SaveSlots payload — tileMap + heights + meta
  thumbnail: string;      // data URL
  tileCensus: CensusEntry[];
  timeOfDay: TimeOfDayMode;
  floating: boolean;
}

export interface ShareResponse {
  code: string;
  url: string;
}

export interface IslandRow {
  id: string;
  name: string;
  island_name: string | null;
  thumbnail: string;
  tile_census: CensusEntry[];
  created_at: string;
}

export interface IslandFull extends IslandRow {
  tilemap: unknown;
  payload: unknown;
  time_of_day: TimeOfDayMode;
  floating: boolean;
}

export interface GalleryResponse {
  islands: IslandRow[];
}
