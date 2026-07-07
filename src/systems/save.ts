import type { Inventory } from '../data/items';

export interface Stats {
  mined: number;
  oreCollected: number;
  bombs: number;
  tracksLaid: number;
  torchesPlaced: number;
  crafted: number;
  playMs: number;
  deepest: number;   // deepest row reached
}

export interface SaveData {
  v: number;
  seed: number;
  diffs: [number, number, number][];   // [index, type, aux]
  torches: number[];
  inv: Inventory;
  storage: Inventory;
  pos: [number, number];
  pick: number;
  satchelTier: number;
  cart: boolean;
  lantern: boolean;
  stats: Stats;
}

const KEY = 'critical-depth-save';

export function freshStats(): Stats {
  return { mined: 0, oreCollected: 0, bombs: 0, tracksLaid: 0, torchesPlaced: 0, crafted: 0, playMs: 0, deepest: 0 };
}

export function hasSave(): boolean {
  try { return localStorage.getItem(KEY) !== null; } catch { return false; }
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.v !== 1) return null;
    return data;
  } catch { return null; }
}

export function writeSave(data: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full/blocked */ }
}

export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
