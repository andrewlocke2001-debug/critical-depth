export interface ItemDef {
  id: string;
  name: string;
  raw?: boolean;      // counts against satchel capacity
  color: number;      // used for icon generation
  kind: 'ore' | 'bar' | 'bomb' | 'gear' | 'misc';
  desc?: string;
}

export const ITEMS: ItemDef[] = [
  { id: 'stone',      name: 'Stone',        raw: true, color: 0x8d8d95, kind: 'ore', desc: 'Rubble. Used for torches and track beds.' },
  { id: 'coal',       name: 'Coal',         raw: true, color: 0x2b2b2e, kind: 'ore', desc: 'Fuel for the furnace and gunpowder.' },
  { id: 'copperOre',  name: 'Copper Ore',   raw: true, color: 0xd97b2f, kind: 'ore' },
  { id: 'ironOre',    name: 'Iron Ore',     raw: true, color: 0xb0653f, kind: 'ore' },
  { id: 'sulfur',     name: 'Sulfur',       raw: true, color: 0xe8d84a, kind: 'ore', desc: 'Reeks of rotten eggs. Explosive potential.' },
  { id: 'silverOre',  name: 'Silver Ore',   raw: true, color: 0xd7dde6, kind: 'ore' },
  { id: 'goldOre',    name: 'Gold Ore',     raw: true, color: 0xffcf3d, kind: 'ore' },
  { id: 'crystal',    name: 'Crystal',      raw: true, color: 0x5ee6e0, kind: 'ore', desc: 'Hums faintly. Focuses energy.' },
  { id: 'voidstone',  name: 'Voidstone',    raw: true, color: 0x8a4fd4, kind: 'ore', desc: 'Darker than dark. Cold to the touch.' },
  { id: 'uraniumOre', name: 'Uranium Ore',  raw: true, color: 0x7dff3a, kind: 'ore', desc: 'It glows. That is probably fine.' },

  { id: 'copperBar',  name: 'Copper Bar',   color: 0xe8944a, kind: 'bar' },
  { id: 'ironBar',    name: 'Iron Bar',     color: 0xc9c9d4, kind: 'bar' },
  { id: 'steelBar',   name: 'Steel Bar',    color: 0x9aa8bd, kind: 'bar' },
  { id: 'silverBar',  name: 'Silver Bar',   color: 0xeef2fa, kind: 'bar' },
  { id: 'goldBar',    name: 'Gold Bar',     color: 0xffd84d, kind: 'bar' },
  { id: 'uraniumRod', name: 'Uranium Rod',  color: 0x9dff5e, kind: 'bar', desc: 'Refined, enriched, deeply unwise.' },

  { id: 'gunpowder',  name: 'Gunpowder',    color: 0x555049, kind: 'misc' },
  { id: 'dynamite',   name: 'Dynamite',     color: 0xd44a3a, kind: 'bomb', desc: 'Breaks Seal I and rock up to tier 3. Blast radius 2.' },
  { id: 'bigBlast',   name: 'Big Blast',    color: 0x3a3a40, kind: 'bomb', desc: 'Breaks Seal II and rock up to tier 4. Blast radius 3.' },
  { id: 'megaBomb',   name: 'Mega Bomb',    color: 0xc2a13a, kind: 'bomb', desc: 'Breaks Seal III, Corestone, everything. Radius 4.' },
  { id: 'nuke',       name: 'T.H.E.  N.U.K.E.', color: 0xffe94d, kind: 'bomb', desc: 'Total Habitat Elimination — Nuclear Underground Kinetic Event. Take it to the Heart of the Mountain.' },

  { id: 'track',      name: 'Cart Track',   color: 0xa8763e, kind: 'gear', desc: 'Place with F. Bridges chasms. Ride with E.' },
  { id: 'torch',      name: 'Torch',        color: 0xffb84d, kind: 'gear', desc: 'Place with T. Lights the dark permanently.' },
  { id: 'glowshroom', name: 'Glowshroom',   color: 0x5ef0d0, kind: 'misc', desc: 'Cold light in a stalk. Priya called them everglows.' },
  { id: 'everglow',   name: 'Everglow Torch', color: 0x5ef0d0, kind: 'gear', desc: 'Place with T (used after normal torches). Wider, colder, eternal light.' },
];

export const ITEM: Record<string, ItemDef> = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export type Inventory = Record<string, number>;

export function countRaw(inv: Inventory): number {
  let n = 0;
  for (const it of ITEMS) if (it.raw) n += inv[it.id] || 0;
  return n;
}

export const PICK_NAMES = ['', 'Rusty Pick', 'Copper Pick', 'Iron Pick', 'Steel Pick', 'Crystal Pick'];
