export type BenchKind = 'work' | 'furnace' | 'blast';

export interface Recipe {
  id: string;                    // unique
  name: string;
  out: string;                   // item id produced, or upgrade key
  n: number;                     // amount produced
  mats: Record<string, number>;
  bench: BenchKind;
  upgrade?: 'pick2' | 'pick3' | 'pick4' | 'pick5' | 'satchel1' | 'satchel2' | 'satchel3' | 'cart' | 'lantern';
  desc: string;
}

export const RECIPES: Recipe[] = [
  // ---------- WORKBENCH ----------
  { id: 'torch4', name: 'Torch ×4', out: 'torch', n: 4, bench: 'work',
    mats: { coal: 1, stone: 2 },
    desc: 'Place with T. The deep is very dark.' },
  { id: 'track4', name: 'Cart Track ×4', out: 'track', n: 4, bench: 'work',
    mats: { ironBar: 1, stone: 4 },
    desc: 'Place with F (also over chasms). Remove with G.' },
  { id: 'cart', name: 'Minecart', out: 'cart', n: 1, bench: 'work', upgrade: 'cart',
    mats: { ironBar: 4, copperBar: 2 },
    desc: 'Press E on any track to ride at high speed.' },
  { id: 'pick2', name: 'Copper Pick', out: 'pick2', n: 1, bench: 'work', upgrade: 'pick2',
    mats: { copperBar: 4, stone: 6 },
    desc: 'Mines tier-2 rock (The Stoneworks: iron, sulfur).' },
  { id: 'pick3', name: 'Iron Pick', out: 'pick3', n: 1, bench: 'work', upgrade: 'pick3',
    mats: { ironBar: 6, stone: 8 },
    desc: 'Mines tier-3 rock (Deep Stoneworks: silver).' },
  { id: 'pick4', name: 'Steel Pick', out: 'pick4', n: 1, bench: 'work', upgrade: 'pick4',
    mats: { steelBar: 5, silverBar: 2 },
    desc: 'Mines tier-4 rock (Granite Abyss: gold, crystal).' },
  { id: 'pick5', name: 'Crystal Pick', out: 'pick5', n: 1, bench: 'work', upgrade: 'pick5',
    mats: { crystal: 6, goldBar: 3, steelBar: 2 },
    desc: 'Mines tier-5 rock (The Voidreach: voidstone, uranium).' },
  { id: 'satchel1', name: 'Reinforced Satchel (100)', out: 'satchel1', n: 1, bench: 'work', upgrade: 'satchel1',
    mats: { copperBar: 5, stone: 12 },
    desc: 'Carry 100 raw materials.' },
  { id: 'satchel2', name: 'Ironbound Satchel (170)', out: 'satchel2', n: 1, bench: 'work', upgrade: 'satchel2',
    mats: { ironBar: 6, silverBar: 3 },
    desc: 'Carry 170 raw materials.' },
  { id: 'satchel3', name: 'Abyssal Satchel (260)', out: 'satchel3', n: 1, bench: 'work', upgrade: 'satchel3',
    mats: { goldBar: 4, crystal: 5 },
    desc: 'Carry 260 raw materials.' },
  { id: 'lantern', name: 'Miner\'s Lantern', out: 'lantern', n: 1, bench: 'work', upgrade: 'lantern',
    mats: { silverBar: 4, coal: 10 },
    desc: 'Permanently increases your light radius.' },

  // ---------- FURNACE ----------
  { id: 'copperBar', name: 'Copper Bar', out: 'copperBar', n: 1, bench: 'furnace',
    mats: { copperOre: 2, coal: 1 }, desc: 'Smelt copper.' },
  { id: 'ironBar', name: 'Iron Bar', out: 'ironBar', n: 1, bench: 'furnace',
    mats: { ironOre: 2, coal: 1 }, desc: 'Smelt iron.' },
  { id: 'steelBar', name: 'Steel Bar', out: 'steelBar', n: 1, bench: 'furnace',
    mats: { ironBar: 1, coal: 2 }, desc: 'Refine iron into steel.' },
  { id: 'silverBar', name: 'Silver Bar', out: 'silverBar', n: 1, bench: 'furnace',
    mats: { silverOre: 2, coal: 1 }, desc: 'Smelt silver.' },
  { id: 'goldBar', name: 'Gold Bar', out: 'goldBar', n: 1, bench: 'furnace',
    mats: { goldOre: 2, coal: 2 }, desc: 'Smelt gold.' },
  { id: 'uraniumRod', name: 'Uranium Rod', out: 'uraniumRod', n: 1, bench: 'furnace',
    mats: { uraniumOre: 3, coal: 2, crystal: 1 },
    desc: 'Enrich uranium in a crystal matrix. Handle with... hands, probably.' },

  // ---------- BLAST BENCH ----------
  { id: 'gunpowder2', name: 'Gunpowder ×2', out: 'gunpowder', n: 2, bench: 'blast',
    mats: { coal: 2, sulfur: 1 }, desc: 'The foundation of progress.' },
  { id: 'dynamite', name: 'Dynamite', out: 'dynamite', n: 1, bench: 'blast',
    mats: { gunpowder: 3, copperBar: 1 },
    desc: 'Place with [1]. Breaks Seal I, pocket shells, rock ≤ tier 3.' },
  { id: 'bigBlast', name: 'Big Blast', out: 'bigBlast', n: 1, bench: 'blast',
    mats: { dynamite: 3, ironBar: 2, silverBar: 1 },
    desc: 'Place with [2]. Breaks Seal II, deep pockets, rock ≤ tier 4.' },
  { id: 'megaBomb', name: 'Mega Bomb', out: 'megaBomb', n: 1, bench: 'blast',
    mats: { bigBlast: 2, goldBar: 2, crystal: 3 },
    desc: 'Place with [3]. Breaks Seal III and even Corestone.' },
  { id: 'nuke', name: 'T.H.E.  N.U.K.E.', out: 'nuke', n: 1, bench: 'blast',
    mats: { megaBomb: 3, uraniumRod: 8, voidstone: 4 },
    desc: 'End it all. Carry it to the Cradle in the Heart of the Mountain and press E.' },
];

export const recipesFor = (bench: BenchKind) => RECIPES.filter(r => r.bench === bench);
