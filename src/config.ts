// ============================================================
// GLOBAL TUNING — adjust these to make the game faster/slower.
// PACE scales all mining times; COST scales nothing directly
// but recipe quantities live in data/recipes.ts.
// ============================================================

export const TILE = 32;          // tile size in px
export const MAP_W = 110;        // map width in tiles
export const MAP_H = 560;        // map height (depth) in tiles
export const SURFACE_H = 8;      // rows used by the surface camp

export const PACE = 1.0;         // global multiplier on mining time (higher = slower game)

// Mining time in seconds per rock tier (index = tier). Tier 0 unused.
export const MINE_TIME = [0, 0.55, 0.85, 1.25, 1.8, 2.5];
export const CLUSTER_MINE_TIME = 0.4;   // ore-cluster tiles (inside blasted pockets)
export const PICK_SPEED_BONUS = 0.72;   // time *= bonus^(pickTier - rockTier)

export const WALK_MS = 138;      // ms per tile walking
export const CART_MS = 46;       // ms per tile riding the minecart

export const BASE_SATCHEL = 50;  // starting raw-material capacity
export const SATCHEL_CAPS = [50, 100, 170, 260]; // tier 0..3

export const BASE_LIGHT = 8;     // player lamp radius (tiles)
export const LANTERN_BONUS = 3;  // extra radius with lantern
export const TORCH_LIGHT = 6;    // placed torch radius

// Depth bands: rows [from, to), rock tier, ambient light
export interface Band { name: string; from: number; to: number; rock: number; ambient: number; }
export const BANDS: Band[] = [
  { name: 'Topsoil Galleries', from: SURFACE_H, to: 70,  rock: 1, ambient: 0.16 },
  { name: 'The Stoneworks',    from: 70,  to: 150, rock: 2, ambient: 0.10 },
  { name: 'Deep Stoneworks',   from: 150, to: 250, rock: 3, ambient: 0.06 },
  { name: 'Granite Abyss',     from: 250, to: 360, rock: 4, ambient: 0.04 },
  { name: 'The Voidreach',     from: 360, to: 500, rock: 5, ambient: 0.03 },
  { name: 'The Core',          from: 500, to: MAP_H, rock: 6, ambient: 0.05 },
];

// Seal walls between bands: row -> tier of bomb required
export const SEAL_ROWS: Record<number, number> = { 150: 1, 250: 2, 360: 3, 500: 3 };
export const SEAL_THICK = 3;

// Chasm belts (must be bridged with track): [startRow, width]
export const CHASM_BELTS: [number, number][] = [
  [109, 5], [198, 6], [300, 8], [432, 10],
];

// Bombs: blast radius (diamond), max rock tier destroyed
export const BOMB_STATS: Record<number, { radius: number; maxRock: number; name: string }> = {
  1: { radius: 2, maxRock: 3, name: 'Dynamite' },
  2: { radius: 3, maxRock: 4, name: 'Big Blast' },
  3: { radius: 4, maxRock: 6, name: 'Mega Bomb' },
};

export function bandAt(y: number): Band {
  for (const b of BANDS) if (y >= b.from && y < b.to) return b;
  return BANDS[0];
}

export function depthMeters(y: number): number {
  return Math.max(0, (y - SURFACE_H) * 2); // 2m per tile, camp = 0m
}
