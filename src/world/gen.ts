import { MAP_W, MAP_H, SURFACE_H, BANDS, SEAL_ROWS, SEAL_THICK, CHASM_BELTS, bandAt } from '../config';
import { T, ORE, CLUSTER_FLAG } from '../data/tiles';

export interface World {
  seed: number;
  w: number;
  h: number;
  type: Uint8Array;
  aux: Uint8Array;
  spawn: { x: number; y: number };
  cradle: { x: number; y: number };
  benches: { work: [number, number]; furnace: [number, number]; blast: [number, number]; crate: [number, number] };
}

// mulberry32 seeded RNG
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generate(seed: number): World {
  const r = rng(seed);
  const w = MAP_W, h = MAP_H;
  const type = new Uint8Array(w * h);
  const aux = new Uint8Array(w * h);
  const idx = (x: number, y: number) => y * w + x;
  const inb = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h;

  const set = (x: number, y: number, t: number, a = 0) => {
    if (!inb(x, y)) return;
    const i = idx(x, y);
    type[i] = t; aux[i] = a;
  };
  const get = (x: number, y: number) => (inb(x, y) ? type[idx(x, y)] : T.Bedrock);

  // ---- 1. base fill: banded rock ----
  for (let y = 0; y < h; y++) {
    const band = bandAt(y);
    for (let x = 0; x < w; x++) {
      if (x < 2 || x >= w - 2 || y >= h - 2 || y < 1) { set(x, y, T.Bedrock); continue; }
      if (y < SURFACE_H) { set(x, y, T.Bedrock); continue; }
      if (band.rock >= 6) { set(x, y, T.Corestone); continue; }
      // soft patches: some tiles are one tier softer
      const tier = r() < 0.13 ? Math.max(1, band.rock - 1) : band.rock;
      set(x, y, T.Rock, tier);
    }
  }

  // ---- 2. surface camp ----
  for (let y = 1; y < SURFACE_H; y++)
    for (let x = 36; x <= 74; x++) set(x, y, T.Camp);
  const benches = {
    work: [46, 3] as [number, number],
    furnace: [50, 3] as [number, number],
    blast: [54, 3] as [number, number],
    crate: [60, 3] as [number, number],
  };
  set(...benches.work, T.Workbench);
  set(...benches.furnace, T.Furnace);
  set(...benches.blast, T.BlastBench);
  set(...benches.crate, T.Crate);
  // mine mouth
  for (let y = SURFACE_H; y < SURFACE_H + 4; y++)
    for (let x = 54; x <= 56; x++) set(x, y, T.Floor);

  const carve = (x: number, y: number, rad: number) => {
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++) {
        const tx = x + dx, ty = y + dy;
        if (!inb(tx, ty)) continue;
        if (tx < 2 || tx >= w - 2 || ty >= h - 2 || ty < SURFACE_H) continue;
        const t = type[idx(tx, ty)];
        if (t === T.Bedrock || t === T.Camp) continue;
        set(tx, ty, T.Floor);
      }
  };

  // ---- 3. spine: guaranteed route from mouth to the core ----
  const spine: [number, number][] = [];
  let sx = 55, sy = SURFACE_H + 3;
  while (sy < 516) {
    spine.push([sx, sy]);
    carve(sx, sy, 1);
    const roll = r();
    if (roll < 0.62) sy++;
    else if (roll < 0.81) sx = Math.min(w - 10, sx + 1);
    else sx = Math.max(9, sx - 1);
  }
  const spineEndX = sx;

  // ---- 4. heart of the mountain ----
  const hx = spineEndX, hy = 524;
  for (let dy = -6; dy <= 6; dy++)
    for (let dx = -9; dx <= 9; dx++) {
      if ((dx * dx) / 81 + (dy * dy) / 36 <= 1) {
        const tx = hx + dx, ty = hy + dy;
        if (inb(tx, ty) && tx >= 2 && tx < w - 2 && ty < h - 2) set(tx, ty, T.Floor);
      }
    }
  // corridor from spine end down into the chamber
  for (let y = 514; y <= hy; y++) { set(spineEndX, y, T.Floor); set(spineEndX + 1, y, T.Floor); }
  // corestone plugs across the corridor (need Mega Bombs to pass)
  for (let y = 507; y <= 508; y++)
    for (let x = spineEndX - 2; x <= spineEndX + 3; x++) set(x, y, T.Corestone);
  const cradle = { x: hx, y: hy };
  set(hx, hy, T.Cradle);

  // ---- 5. branches & caverns (kept inside their own band segment) ----
  const sealRows = Object.keys(SEAL_ROWS).map(Number);
  const beltRows: number[] = [];
  for (const [start, width] of CHASM_BELTS) for (let i = 0; i < width; i++) beltRows.push(start + i);
  const forbiddenRow = (y: number) => {
    for (const s of sealRows) if (Math.abs(y - s) <= SEAL_THICK) return true;
    for (const b of beltRows) if (Math.abs(y - b) <= 1) return true;
    return false;
  };

  const carvedSpots: [number, number][] = [...spine];
  const walkers = 150;
  for (let i = 0; i < walkers; i++) {
    const start = carvedSpots[Math.floor(r() * carvedSpots.length)];
    let [x, y] = start;
    if (y < SURFACE_H + 4 || y > 498) continue;
    const len = 20 + Math.floor(r() * 75);
    const wide = r() < 0.3 ? 1 : 0;
    let dir = r() < 0.5 ? [1, 0] : r() < 0.5 ? [-1, 0] : r() < 0.5 ? [0, 1] : [0, -1];
    for (let s = 0; s < len; s++) {
      if (r() < 0.28) {
        const roll = r();
        dir = roll < 0.35 ? [1, 0] : roll < 0.7 ? [-1, 0] : roll < 0.85 ? [0, 1] : [0, -1];
      }
      const nx = x + dir[0], ny = y + dir[1];
      if (nx < 6 || nx > w - 7 || ny < SURFACE_H + 2 || ny > 497) break;
      if (forbiddenRow(ny)) break;                 // never tunnel through seals/belts
      if (bandAt(ny).rock >= 6) break;             // stay out of the core
      x = nx; y = ny;
      carve(x, y, wide);
      if (r() < 0.02) carvedSpots.push([x, y]);
    }
  }
  // caverns
  for (let i = 0; i < 85; i++) {
    const cx = 8 + Math.floor(r() * (w - 16));
    const cy = SURFACE_H + 6 + Math.floor(r() * (492 - SURFACE_H));
    if (forbiddenRow(cy) || forbiddenRow(cy - 4) || forbiddenRow(cy + 4)) continue;
    if (bandAt(cy).rock >= 6) continue;
    const rx = 2 + Math.floor(r() * 5), ry = 2 + Math.floor(r() * 3);
    for (let dy = -ry; dy <= ry; dy++)
      for (let dx = -rx; dx <= rx; dx++)
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
          const tx = cx + dx, ty = cy + dy;
          if (inb(tx, ty) && !forbiddenRow(ty) && get(tx, ty) === T.Rock) set(tx, ty, T.Floor);
        }
  }

  // ---- 6. chasm belts (full width — only tracks cross) ----
  for (const [start, width] of CHASM_BELTS)
    for (let y = start; y < start + width; y++)
      for (let x = 2; x < w - 2; x++) set(x, y, T.Chasm);

  // ---- 7. seal walls (full width, must be blasted) ----
  for (const [rowS, tier] of Object.entries(SEAL_ROWS)) {
    const row = Number(rowS);
    for (let y = row - 1; y <= row + 1; y++)
      for (let x = 2; x < w - 2; x++) set(x, y, T.Seal, tier);
  }

  // ---- 8. ore veins ----
  interface VeinDef { ore: number; yMin: number; yMax: number; count: number; lenMin: number; lenMax: number; }
  const veins: VeinDef[] = [
    { ore: ORE.coal,      yMin: 10,  yMax: 495, count: 240, lenMin: 5, lenMax: 14 },
    { ore: ORE.copper,    yMin: 10,  yMax: 150, count: 95,  lenMin: 4, lenMax: 10 },
    { ore: ORE.iron,      yMin: 62,  yMax: 260, count: 100, lenMin: 4, lenMax: 10 },
    { ore: ORE.sulfur,    yMin: 72,  yMax: 260, count: 85,  lenMin: 4, lenMax: 9 },
    { ore: ORE.silver,    yMin: 152, yMax: 365, count: 70,  lenMin: 4, lenMax: 8 },
    { ore: ORE.gold,      yMin: 252, yMax: 430, count: 60,  lenMin: 3, lenMax: 7 },
    { ore: ORE.crystal,   yMin: 252, yMax: 498, count: 62,  lenMin: 3, lenMax: 7 },
    { ore: ORE.voidstone, yMin: 362, yMax: 498, count: 48,  lenMin: 3, lenMax: 6 },
    { ore: ORE.uranium,   yMin: 395, yMax: 498, count: 38,  lenMin: 3, lenMax: 6 },
  ];
  const paintVein = (v: VeinDef) => {
    let x = 4 + Math.floor(r() * (w - 8));
    let y = v.yMin + Math.floor(r() * (v.yMax - v.yMin));
    const len = v.lenMin + Math.floor(r() * (v.lenMax - v.lenMin + 1));
    for (let s = 0; s < len; s++) {
      if (inb(x, y) && type[idx(x, y)] === T.Rock) set(x, y, T.Ore, v.ore);
      // widen: also paint a neighbour
      const wx = x + (r() < 0.5 ? 1 : -1), wy = y + (r() < 0.5 ? 1 : -1);
      if (inb(wx, wy) && r() < 0.45 && type[idx(wx, wy)] === T.Rock) set(wx, wy, T.Ore, v.ore);
      x += Math.floor(r() * 3) - 1;
      y += Math.floor(r() * 3) - 1;
      if (x < 4 || x > w - 5 || y < v.yMin || y > v.yMax) break;
    }
  };
  for (const v of veins) for (let i = 0; i < v.count; i++) paintVein(v);

  // ---- 9. treasure pockets (sealed ore caches — blast to open) ----
  interface PocketDef { yMin: number; yMax: number; count: number; ores: number[]; shell: number; rad: [number, number]; }
  const pockets: PocketDef[] = [
    { yMin: 20,  yMax: 105, count: 6,  ores: [ORE.coal, ORE.copper], shell: 1, rad: [2, 3] },
    { yMin: 118, yMax: 145, count: 4,  ores: [ORE.iron, ORE.sulfur, ORE.coal], shell: 1, rad: [2, 3] },
    { yMin: 155, yMax: 245, count: 10, ores: [ORE.iron, ORE.sulfur, ORE.silver, ORE.coal], shell: 1, rad: [2, 4] },
    { yMin: 255, yMax: 355, count: 10, ores: [ORE.gold, ORE.crystal, ORE.coal, ORE.sulfur], shell: 2, rad: [2, 4] },
    { yMin: 365, yMax: 495, count: 12, ores: [ORE.uranium, ORE.voidstone, ORE.crystal, ORE.coal], shell: 2, rad: [3, 4] },
  ];
  for (const p of pockets) {
    for (let i = 0; i < p.count; i++) {
      const cx = 8 + Math.floor(r() * (w - 16));
      const cy = p.yMin + Math.floor(r() * (p.yMax - p.yMin));
      if (forbiddenRow(cy) || forbiddenRow(cy - 5) || forbiddenRow(cy + 5)) { i--; continue; }
      const rad = p.rad[0] + Math.floor(r() * (p.rad[1] - p.rad[0] + 1));
      const ore = p.ores[Math.floor(r() * p.ores.length)];
      const cluster = new Set<number>();
      for (let dy = -rad; dy <= rad; dy++)
        for (let dx = -rad; dx <= rad; dx++)
          if (dx * dx + dy * dy <= rad * rad) {
            const tx = cx + dx, ty = cy + dy;
            if (!inb(tx, ty) || tx < 3 || tx > w - 4 || forbiddenRow(ty)) continue;
            const t = type[idx(tx, ty)];
            if (t !== T.Rock && t !== T.Ore && t !== T.Floor) continue;
            set(tx, ty, T.Ore, ore | CLUSTER_FLAG);
            cluster.add(idx(tx, ty));
          }
      // shell around the cluster
      for (const ci of cluster) {
        const cxx = ci % w, cyy = Math.floor(ci / w);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const tx = cxx + dx, ty = cyy + dy;
            if (!inb(tx, ty) || cluster.has(idx(tx, ty))) continue;
            const t = type[idx(tx, ty)];
            if (t === T.Bedrock || t === T.Seal || t === T.Chasm || t === T.Corestone || t === T.Cradle) continue;
            if (t >= T.Workbench && t <= T.Crate) continue;
            set(tx, ty, T.Pocket, p.shell);
          }
      }
    }
  }

  // ---- 10. guarantee minimum uranium/voidstone (win must be possible) ----
  const countOre = (ore: number) => {
    let n = 0;
    for (let i = 0; i < type.length; i++)
      if (type[i] === T.Ore && (aux[i] & 31) === ore) n += (aux[i] & CLUSTER_FLAG) ? 3 : 1;
    return n;
  };
  let guard = 0;
  while (countOre(ORE.uranium) < 60 && guard++ < 200) paintVein(veins[8]);
  guard = 0;
  while (countOre(ORE.voidstone) < 30 && guard++ < 200) paintVein(veins[7]);

  return { seed, w, h, type, aux, spawn: { x: 55, y: 5 }, cradle, benches };
}
