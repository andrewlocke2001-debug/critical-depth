// Tile type ids (stored in world.type)
export const T = {
  Camp: 0,        // surface camp floor (always lit)
  Floor: 1,       // carved tunnel floor
  Chasm: 2,       // impassable pit — bridge with track
  Bedrock: 3,     // indestructible border
  Corestone: 4,   // tier-6 rock, only a Mega Bomb breaks it
  Cradle: 5,      // the nuke cradle at the Heart of the Mountain
  Workbench: 6,
  Furnace: 7,
  BlastBench: 8,
  Crate: 9,       // camp storage
  Rock: 10,       // aux = rock tier 1..5
  Ore: 11,        // aux = oreId (1..9) | CLUSTER_FLAG
  Seal: 12,       // aux = seal tier 1..3 (bomb tier required)
  Pocket: 13,     // pocket shell, aux = bomb tier required (1..2)
  Track: 14,      // aux = 1 if laid over chasm
  Bones: 15,      // the Deep Delvers, at rest (walkable)
  Page: 16,       // journal page, aux = page number (walk over to collect)
  Glowshroom: 17, // bioluminescent — natural light source, harvestable
  Pedestal: 18,   // relic pedestal, aux = relic id (0 = taken)
  RuneFloor: 19,  // carved vault floor (walkable)
  SupplyCrate: 20,// abandoned supplies, aux = 1 until looted
} as const;

export const CLUSTER_FLAG = 32;

// Ore ids (aux & 31 on Ore tiles)
export const ORE = {
  coal: 1, copper: 2, iron: 3, sulfur: 4, silver: 5,
  gold: 6, crystal: 7, voidstone: 8, uranium: 9,
} as const;

export interface OreDef { id: number; item: string; name: string; tier: number; color: number; }
export const ORES: OreDef[] = [
  { id: 1, item: 'coal',       name: 'Coal',       tier: 1, color: 0x2b2b2e },
  { id: 2, item: 'copperOre',  name: 'Copper Ore', tier: 1, color: 0xd97b2f },
  { id: 3, item: 'ironOre',    name: 'Iron Ore',   tier: 2, color: 0xb0653f },
  { id: 4, item: 'sulfur',     name: 'Sulfur',     tier: 2, color: 0xe8d84a },
  { id: 5, item: 'silverOre',  name: 'Silver Ore', tier: 3, color: 0xd7dde6 },
  { id: 6, item: 'goldOre',    name: 'Gold Ore',   tier: 4, color: 0xffcf3d },
  { id: 7, item: 'crystal',    name: 'Crystal',    tier: 4, color: 0x5ee6e0 },
  { id: 8, item: 'voidstone',  name: 'Voidstone',  tier: 5, color: 0x8a4fd4 },
  { id: 9, item: 'uraniumOre', name: 'Uranium Ore',tier: 5, color: 0x7dff3a },
];
export const oreById = (id: number): OreDef => ORES[id - 1];

// ---- Tile frame layout in the generated spritesheet (8 columns) ----
export const FRAMES: string[] = [
  'camp', 'floor', 'chasm', 'bedrock', 'corestone', 'cradle', 'workbench', 'furnace',
  'blastbench', 'crate', 'rock1', 'rock2', 'rock3', 'rock4', 'rock5', 'seal1',
  'seal2', 'seal3', 'pocket1', 'pocket2', 'trackH', 'trackV', 'trackX',
  'ore1', 'ore2', 'ore3', 'ore4', 'ore5', 'ore6', 'ore7', 'ore8', 'ore9',
  'cl1', 'cl2', 'cl3', 'cl4', 'cl5', 'cl6', 'cl7', 'cl8', 'cl9',
  'bones', 'page', 'shroom', 'pedestal1', 'pedestal0', 'runefloor', 'scrate1', 'scrate0',
];
export const F: Record<string, number> = Object.fromEntries(FRAMES.map((n, i) => [n, i]));
export const SHEET_COLS = 8;

// frame for a tile (Track handled separately — needs neighbours)
export function frameFor(type: number, aux: number): number {
  switch (type) {
    case T.Camp: return F.camp;
    case T.Floor: return F.floor;
    case T.Chasm: return F.chasm;
    case T.Bedrock: return F.bedrock;
    case T.Corestone: return F.corestone;
    case T.Cradle: return F.cradle;
    case T.Workbench: return F.workbench;
    case T.Furnace: return F.furnace;
    case T.BlastBench: return F.blastbench;
    case T.Crate: return F.crate;
    case T.Rock: return F.rock1 + Math.min(4, Math.max(0, aux - 1));
    case T.Seal: return F.seal1 + Math.min(2, Math.max(0, aux - 1));
    case T.Pocket: return F.pocket1 + Math.min(1, Math.max(0, aux - 1));
    case T.Ore: {
      const id = aux & 31;
      return (aux & CLUSTER_FLAG) ? F.cl1 + id - 1 : F.ore1 + id - 1;
    }
    case T.Track: return F.trackH;
    case T.Bones: return F.bones;
    case T.Page: return F.page;
    case T.Glowshroom: return F.shroom;
    case T.Pedestal: return aux > 0 ? F.pedestal1 : F.pedestal0;
    case T.RuneFloor: return F.runefloor;
    case T.SupplyCrate: return aux > 0 ? F.scrate1 : F.scrate0;
    default: return F.bedrock;
  }
}

export const WALKABLE = new Set<number>([T.Camp, T.Floor, T.Track, T.Bones, T.Page, T.RuneFloor]);
// tiles light can pass through
export const TRANSPARENT = new Set<number>([
  T.Camp, T.Floor, T.Track, T.Chasm, T.Cradle,
  T.Bones, T.Page, T.RuneFloor, T.Glowshroom,
]);
