import { SATCHEL_CAPS, bandAt, depthMeters, SURFACE_H } from '../config';
import { T, CLUSTER_FLAG, oreById } from '../data/tiles';
import { ITEMS, ITEM, PICK_NAMES, countRaw } from '../data/items';
import { recipesFor, type BenchKind, type Recipe } from '../data/recipes';
import { toggleMuted } from '../systems/sound';
import { TouchControls, isTouchDevice } from './touch';
import type GameScene from '../scenes/GameScene';

type Mode = null | 'inv' | 'map' | 'help' | 'bombs' | 'confirm' | `bench-${BenchKind}`;

const BENCH_TITLES: Record<BenchKind, [string, string]> = {
  work: ['Workbench', 'Tools, tracks, torches, upgrades.'],
  furnace: ['Furnace', 'Smelt ores into bars. Everything needs coal.'],
  blast: ['Blast Bench', 'Powder, bombs, and one very final device.'],
};

export class Hud {
  private scene: GameScene;
  private root: HTMLDivElement;
  private topbar: HTMLDivElement;
  private objective: HTMLDivElement;
  private toasts: HTMLDivElement;
  private modal: HTMLDivElement;
  private box: HTMLDivElement;
  private mode: Mode = null;
  private icons: Record<string, string>;
  private mapTimer: number | null = null;
  private confirmYes: (() => void) | null = null;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.icons = scene.registry.get('icons') as Record<string, string>;
    const ui = document.getElementById('ui')!;
    this.root = document.createElement('div');
    this.root.innerHTML = `
      <div id="topbar"></div>
      <div id="objective"></div>
      <div id="toasts"></div>
      <div id="keysbar"><b>WASD</b> mine/move · <b>E</b> use/ride · <b>F</b> track · <b>G</b> pull track · <b>T</b> torch · <b>1/2/3</b> bomb · <b>I</b> inventory · <b>M</b> map · <b>H</b> help · <b>N</b> mute</div>
      <div id="modal"><div class="box clickable"></div></div>`;
    ui.appendChild(this.root);
    this.topbar = this.root.querySelector('#topbar')!;
    this.objective = this.root.querySelector('#objective')!;
    this.toasts = this.root.querySelector('#toasts')!;
    this.modal = this.root.querySelector('#modal')!;
    this.box = this.modal.querySelector('.box')!;
    this.modal.addEventListener('mousedown', e => { if (e.target === this.modal) this.close(); });
    this.modal.classList.add('clickable');
    if (isTouchDevice()) {
      document.body.classList.add('touch');
      new TouchControls(scene, this.root); // lives inside this.root — removed with it
    }
    this.refresh();
  }

  get isOpen(): boolean { return this.mode !== null; }

  destroy() {
    if (this.mapTimer) { clearInterval(this.mapTimer); this.mapTimer = null; }
    this.root.remove();
  }

  // ---------- top bar & objective ----------
  refresh() {
    const s = this.scene;
    const cap = SATCHEL_CAPS[s.satchelTier];
    const load = countRaw(s.inv);
    const band = s.py < SURFACE_H ? 'Base Camp' : bandAt(s.py).name;
    const bombs = `🧨${s.inv['dynamite'] || 0} ● ${s.inv['bigBlast'] || 0} ◉ ${s.inv['megaBomb'] || 0}`;
    const nuke = (s.inv['nuke'] || 0) > 0 ? ' <b style="color:#7dff3a">☢ NUKE ABOARD</b>' : '';
    this.topbar.innerHTML =
      `<span><b>${depthMeters(s.py)}m</b> ${band}</span>` +
      `<span class="${load >= cap ? 'warn' : ''}">⛏ ${load}/${cap}</span>` +
      `<span>${PICK_NAMES[s.pick]}</span>` +
      `<span>🔥${s.inv['torch'] || 0} 🛤${s.inv['track'] || 0}</span>` +
      `<span>${bombs}</span>` + nuke;
    this.objective.textContent = this.scene.objective();
    if (this.mode?.startsWith('bench-')) this.renderBench(this.mode.slice(6) as BenchKind);
    if (this.mode === 'inv') this.renderInventory();
  }

  toast(msg: string, cls: '' | 'bad' | 'good' | 'epic' = '') {
    const el = document.createElement('div');
    el.className = `toast ${cls}`;
    el.innerHTML = msg;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 4) this.toasts.firstChild?.remove();
    const life = cls === 'epic' ? 5200 : 3600;
    setTimeout(() => { el.classList.add('fadeout'); setTimeout(() => el.remove(), 550); }, life);
  }

  toggleMute() {
    const m = toggleMuted();
    this.toast(m ? 'Sound muted.' : 'Sound on.');
  }

  // ---------- modal handling ----------
  close() {
    this.mode = null;
    this.modal.classList.remove('open');
    if (this.mapTimer) { clearInterval(this.mapTimer); this.mapTimer = null; }
  }

  toggle(mode: Mode) {
    if (this.mode === mode) { this.close(); return; }
    this.open(mode);
  }

  private open(mode: Mode) {
    if (this.mapTimer) { clearInterval(this.mapTimer); this.mapTimer = null; }
    this.mode = mode;
    this.modal.classList.add('open');
    if (mode === 'inv') this.renderInventory();
    else if (mode === 'map') this.renderMap();
    else if (mode === 'help') this.renderHelp();
    else if (mode === 'bombs') this.renderBombs();
    else if (mode?.startsWith('bench-')) this.renderBench(mode.slice(6) as BenchKind);
  }

  openBench(kind: BenchKind) { this.open(`bench-${kind}`); }

  confirm(title: string, html: string, onYes: () => void) {
    this.mode = 'confirm';
    this.modal.classList.add('open');
    this.confirmYes = onYes;
    this.box.innerHTML = `
      <h2 style="color:#ff4747">${title}</h2>
      <div style="text-align:center; margin: 14px 0; line-height:1.7">${html}</div>
      <div class="confirmrow">
        <button id="c-no">GO BACK</button>
        <button id="c-yes" class="danger">ARM IT</button>
      </div>`;
    this.box.querySelector('#c-no')!.addEventListener('click', () => this.close());
    this.box.querySelector('#c-yes')!.addEventListener('click', () => {
      const fn = this.confirmYes; this.confirmYes = null;
      this.close();
      fn?.();
    });
  }

  // ---------- panels ----------
  private icon(id: string): string {
    const src = this.icons[id];
    return src ? `<img src="${src}" alt="">` : '';
  }

  private hiddenUpgrade(r: Recipe): boolean {
    const s = this.scene;
    switch (r.upgrade) {
      case 'pick2': return s.pick >= 2;
      case 'pick3': return s.pick >= 3;
      case 'pick4': return s.pick >= 4;
      case 'pick5': return s.pick >= 5;
      case 'satchel1': return s.satchelTier >= 1;
      case 'satchel2': return s.satchelTier >= 2;
      case 'satchel3': return s.satchelTier >= 3;
      case 'cart': return s.cart;
      case 'lantern': return s.lantern;
      default: return false;
    }
  }

  private renderBench(kind: BenchKind) {
    const [title, sub] = BENCH_TITLES[kind];
    const s = this.scene;
    const rows = recipesFor(kind).filter(r => !this.hiddenUpgrade(r)).map(r => {
      const mats = Object.entries(r.mats).map(([id, n]) => {
        const have = s.totalOf(id);
        return `<span class="${have >= n ? 'have' : 'miss'}">${ITEM[id]?.name ?? id} ${Math.min(have, n)}/${n}</span>`;
      }).join('');
      const ok = s.canCraft(r);
      return `<div class="recipe">
        ${this.icon(r.out) || this.icon(r.id)}
        <div class="rmain">
          <div class="rname">${r.name}</div>
          <div class="rdesc">${r.desc}</div>
          <div class="rmats">${mats}</div>
        </div>
        <button data-craft="${r.id}" ${ok ? '' : 'disabled'}>CRAFT</button>
      </div>`;
    }).join('');
    this.box.innerHTML = `<span class="closehint">ESC to close</span><h2>${title}</h2><div class="sub">${sub} Uses satchel + crate storage.</div>${rows}`;
    this.box.querySelectorAll('button[data-craft]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLButtonElement).dataset.craft!;
        const recipe = recipesFor(kind).find(r => r.id === id);
        if (recipe) this.scene.craft(recipe);
      });
    });
  }

  private renderInventory() {
    const s = this.scene;
    const cap = SATCHEL_CAPS[s.satchelTier];
    const rows = (inv: Record<string, number>, raw: boolean) =>
      ITEMS.filter(it => !!it.raw === raw && (inv[it.id] || 0) > 0)
        .map(it => `<div class="invrow">${this.icon(it.id)}<span>${it.name}</span><span class="cnt">${inv[it.id]}</span></div>`)
        .join('') || '<div style="color:#666">— empty —</div>';
    this.box.innerHTML = `
      <span class="closehint">ESC / I to close</span>
      <h2>Inventory</h2>
      <div class="sub">Satchel: ${countRaw(s.inv)}/${cap} raw materials. Crafted goods weigh nothing (mining logic).</div>
      <div class="invcols">
        <div style="flex:1"><h3>Satchel (raw)</h3>${rows(s.inv, true)}</div>
        <div style="flex:1"><h3>Goods</h3>${rows(s.inv, false)}</div>
        <div style="flex:1"><h3>Crate storage</h3>${rows(s.storage, true)}</div>
      </div>`;
  }

  private renderBombs() {
    const s = this.scene;
    const row = (key: string, id: string, note: string, tier?: number) => `
      <div class="recipe brow" ${tier ? `data-tier="${tier}"` : ''}>${this.icon(id)}
        <div class="rmain"><div class="rname">[${key}] ${ITEM[id].name} — ×${s.inv[id] || 0}</div>
        <div class="rdesc">${note}</div></div>
        ${tier ? '<button data-place="' + tier + '"' + ((s.inv[id] || 0) < 1 ? ' disabled' : '') + '>PLACE</button>' : ''}
      </div>`;
    this.box.innerHTML = `
      <span class="closehint">ESC to close</span>
      <h2>Ordnance</h2>
      <div class="sub">Tap PLACE (or press the number key) to set a bomb on the tile you face. 2.3s fuse — step back.</div>
      ${row('1', 'dynamite', 'Seal I · pockets · rock ≤ tier 3 · radius 2', 1)}
      ${row('2', 'bigBlast', 'Seal II · deep pockets · rock ≤ tier 4 · radius 3', 2)}
      ${row('3', 'megaBomb', 'Seal III · Corestone · everything · radius 4', 3)}
      ${(s.inv['nuke'] || 0) > 0 ? row('E', 'nuke', 'Only works at the Cradle, at the very bottom. You know what to do.') : ''}`;
    this.box.querySelectorAll<HTMLButtonElement>('button[data-place]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tier = Number(btn.dataset.place);
        this.close();
        this.scene.placeBomb(tier);
      });
    });
  }

  private renderHelp() {
    this.box.innerHTML = `
      <span class="closehint">ESC / H to close</span>
      <h2>Miner's Handbook</h2>
      <div style="font-size:13px; line-height:1.85">
        <b style="color:#ffb84d">The loop:</b> mine → haul to camp → smelt & craft → dig deeper.<br>
        · Walk into rock to mine it. Harder rock needs better picks (Workbench).<br>
        · Raw ore fills your satchel — deposit at the camp <b>Crate</b> (E). Benches use crate storage automatically.<br>
        · <b>Chasms</b> block the way down. Face them and lay track with <b>F</b>. Craft a Minecart, then press <b>E</b> on any track to ride fast.<br>
        · <b>Seal walls</b> (glowing chevrons) only open with the right bomb tier. Face the wall, press <b>1/2/3</b>, run.<br>
        · <b>Cracked glittering rock</b> hides treasure pockets — blast them for huge ore hauls.<br>
        · Torches (<b>T</b>) are permanent light. You will want many.<br>
        · Depth bands: Topsoil → Stoneworks (iron/sulfur) → Deep (silver) → Granite (gold/crystal) → Voidreach (uranium) → <b style="color:#ff6a3c">The Core</b>.<br>
        · Endgame: enrich uranium, build <b style="color:#7dff3a">T.H.E. N.U.K.E.</b>, carry it to the Cradle at ~1030m, press E.<br>
        <br><span style="color:#8a8578">Autosaves every 15 seconds. The world, sadly for it, is persistent.</span>
      </div>`;
  }

  // ---------- map ----------
  private renderMap() {
    this.box.innerHTML = `
      <span class="closehint">ESC / M to close</span>
      <h2>Survey Map</h2>
      <canvas id="mapcanvas" width="384" height="560"></canvas>
      <div class="maplegend">left: full survey (explored) · right: local area · <span style="color:#ffb84d">◆ you</span></div>`;
    const draw = () => this.drawMap();
    draw();
    this.mapTimer = window.setInterval(draw, 800);
  }

  private drawMap() {
    const cv = this.box.querySelector<HTMLCanvasElement>('#mapcanvas');
    if (!cv) return;
    const g = cv.getContext('2d')!;
    const s = this.scene;
    const w = s.world.w, h = s.world.h;
    g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);

    const color = (i: number): string => {
      const t = s.world.type[i], a = s.world.aux[i];
      switch (t) {
        case T.Camp: return '#665c4a';
        case T.Floor: return '#48423a';
        case T.Chasm: return '#101420';
        case T.Bedrock: return '#0a0a0d';
        case T.Corestone: return '#4a1c1c';
        case T.Cradle: return '#ffd84d';
        case T.Workbench: case T.Furnace: case T.BlastBench: case T.Crate: return '#7dc4de';
        case T.Rock: return ['#6b5f49', '#5d5d64', '#4c515a', '#443e4e', '#2c2c36'][Math.min(4, a - 1)] || '#555';
        case T.Ore: {
          const ore = oreById(a & 31);
          return '#' + ore.color.toString(16).padStart(6, '0');
        }
        case T.Seal: return ['#ff9d2e', '#ff4747', '#c44dff'][Math.min(2, a - 1)] || '#f00';
        case T.Pocket: return '#c9b458';
        case T.Track: return '#a8763e';
        default: return '#111';
      }
    };

    // full survey, 1px per tile
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!s.explored[i]) continue;
        g.fillStyle = color(i);
        g.fillRect(x, y, 1, 1);
      }
    // player on full map
    g.fillStyle = '#ffb84d'; g.fillRect(s.px - 1, s.py - 1, 3, 3);

    // local area, 3px per tile, 84x84 window
    const LX = 128, LS = 3, RANGE = 42;
    g.strokeStyle = '#33333f'; g.strokeRect(LX - 1, 0, RANGE * 2 * LS + 2, RANGE * 2 * LS + 2);
    for (let dy = -RANGE; dy < RANGE; dy++)
      for (let dx = -RANGE; dx < RANGE; dx++) {
        const x = s.px + dx, y = s.py + dy;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const i = y * w + x;
        if (!s.explored[i]) continue;
        g.fillStyle = color(i);
        g.fillRect(LX + (dx + RANGE) * LS, (dy + RANGE) * LS, LS, LS);
      }
    g.fillStyle = '#ffb84d';
    g.fillRect(LX + RANGE * LS - 2, RANGE * LS - 2, 5, 5);
  }
}
