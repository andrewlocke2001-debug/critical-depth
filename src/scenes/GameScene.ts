import Phaser from 'phaser';
import {
  TILE, MAP_W, MAP_H, SURFACE_H, PACE, MINE_TIME, CLUSTER_MINE_TIME, PICK_SPEED_BONUS,
  WALK_MS, CART_MS, SATCHEL_CAPS, BASE_LIGHT, LANTERN_BONUS, TORCH_LIGHT,
  EVERGLOW_LIGHT, SHROOM_LIGHT, BOMB_STATS, bandAt, depthMeters,
} from '../config';
import { T, F, CLUSTER_FLAG, ORES, oreById, frameFor, WALKABLE, TRANSPARENT } from '../data/tiles';
import { ITEM, PICK_NAMES, countRaw, type Inventory } from '../data/items';
import { PAGES, relicById, DEEP_WHISPERS } from '../data/lore';
import type { Recipe } from '../data/recipes';
import { generate, type World } from '../world/gen';
import { loadSave, writeSave, freshStats, type Stats, type SaveData } from '../systems/save';
import { sfx } from '../systems/sound';
import { Hud } from '../ui/hud';
import { isTouchDevice } from '../ui/touch';

const DIRS: Record<string, [number, number]> = { d: [0, 1], u: [0, -1], l: [-1, 0], r: [1, 0] };
const BOMB_ITEMS: Record<number, string> = { 1: 'dynamite', 2: 'bigBlast', 3: 'megaBomb' };

export default class GameScene extends Phaser.Scene {
  world!: World;
  diffs = new Map<number, [number, number]>();
  torchSet = new Map<number, number>();   // tile index -> 1 torch | 2 everglow
  journal = new Set<number>();
  relics = new Set<number>();

  private map!: Phaser.Tilemaps.Tilemap;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private player!: Phaser.GameObjects.Sprite;
  private mineBar!: Phaser.GameObjects.Graphics;
  private torchSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private armedBombs = new Set<number>();

  px = 0; py = 0;
  facing: [number, number] = [0, 1];
  private moving = false;
  mounted = false;
  touchDir: 'd' | 'u' | 'l' | 'r' | null = null;

  inv: Inventory = {};
  storage: Inventory = {};
  pick = 1;
  satchelTier = 0;
  cart = false;
  lantern = false;
  stats: Stats = freshStats();

  hud!: Hud;

  private strength!: Int16Array;    // light BFS strengths
  explored!: Uint8Array;
  private varB!: Float32Array;      // per-tile brightness variation
  private lastCamX = -999; private lastCamY = -999;

  private mineIdx = -1;
  private mineProgress = 0;
  private mineNeed = 0;
  private lastHintAt = 0;
  private lastMineSfx = 0;
  private lastBand = '';
  private startedAt = 0;
  private savedPlayMs = 0;
  private beforeUnload = () => this.doSave();

  constructor() { super('Game'); }

  // ============================ SETUP ============================

  create(data: { fresh?: boolean }) {
    const save = data.fresh ? null : loadSave();
    const seed = save ? save.seed : ((Math.random() * 1e9) | 0) || 1;

    this.diffs = new Map();
    this.torchSet = new Map();
    this.torchSprites = new Map();
    this.armedBombs = new Set();
    this.journal = new Set();
    this.relics = new Set();
    this.mounted = false; this.moving = false; this.mineIdx = -1;

    this.world = generate(seed);
    if (save) {
      for (const [i, t, a] of save.diffs) { this.world.type[i] = t; this.world.aux[i] = a; this.diffs.set(i, [t, a]); }
      this.torchSet = new Map(save.torches);
      this.journal = new Set(save.journal);
      this.relics = new Set(save.relics);
      this.inv = save.inv; this.storage = save.storage;
      this.pick = save.pick; this.satchelTier = save.satchelTier;
      this.cart = save.cart; this.lantern = save.lantern;
      this.stats = save.stats; this.savedPlayMs = save.stats.playMs;
      this.px = save.pos[0]; this.py = save.pos[1];
    } else {
      this.inv = { torch: 8 }; this.storage = {};
      this.pick = 1; this.satchelTier = 0; this.cart = false; this.lantern = false;
      this.stats = freshStats(); this.savedPlayMs = 0;
      this.px = this.world.spawn.x; this.py = this.world.spawn.y;
    }
    this.startedAt = Date.now();

    // tilemap
    this.map = this.make.tilemap({ width: MAP_W, height: MAP_H, tileWidth: TILE, tileHeight: TILE });
    const tileset = this.map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = this.map.createBlankLayer('main', tileset)!;
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++)
        this.redrawTile(x, y);

    // lighting state
    this.strength = new Int16Array(MAP_W * MAP_H);
    this.explored = new Uint8Array(MAP_W * MAP_H);
    this.varB = new Float32Array(MAP_W * MAP_H);
    for (let i = 0; i < this.varB.length; i++) {
      let n = (i * 2654435761) >>> 0; n ^= n >> 13;
      this.varB[i] = 0.86 + 0.14 * ((n % 1000) / 1000);
    }

    // torch sprites from save
    for (const [i, tt] of this.torchSet) this.addTorchSprite(i, tt);

    // cradle glow
    const c = this.world.cradle;
    const cg = this.add.image(c.x * TILE + 16, c.y * TILE + 16, 'glow')
      .setTint(0xff6a3c).setAlpha(0.5).setScale(2).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: cg, alpha: 0.2, scale: 1.6, duration: 1200, yoyo: true, repeat: -1 });

    // player
    this.player = this.add.sprite(this.px * TILE + 16, this.py * TILE + 16, 'chars', 'player-d').setDepth(10);
    this.mineBar = this.add.graphics().setDepth(40);

    // camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.startFollow(this.player, true, 0.18, 0.18);
    cam.setBackgroundColor('#050508');

    // HUD
    this.hud = new Hud(this);

    // phones: zoom in so tiles stay readable on a small screen
    if (isTouchDevice()) {
      const small = Math.min(window.innerWidth, window.innerHeight) < 700;
      cam.setZoom(small ? 1.6 : 1.25);
      if (window.innerHeight > window.innerWidth)
        this.hud.toast('Tip: landscape gives you a much wider view.');
    }

    this.bindKeys();

    // torch flicker
    let tf = 0;
    this.time.addEvent({
      delay: 160, loop: true,
      callback: () => {
        tf = 1 - tf;
        for (const s of this.torchSprites.values())
          s.setFrame(`${s.getData('everglow') ? 'etorch' : 'torch'}${tf}`);
      },
    });

    // the mountain's heartbeat — audible from the Granite Abyss down
    this.time.addEvent({
      delay: 1900, loop: true,
      callback: () => {
        if (this.py < 250) return;
        const v = Math.min(1, 0.25 + (this.py - 250) / 200);
        sfx.heartbeat(v);
      },
    });
    // ...and its voice
    this.time.addEvent({
      delay: 52000, loop: true,
      callback: () => {
        if (this.py < 250 || this.hud.isOpen || Math.random() > 0.45) return;
        this.hud.toast(DEEP_WHISPERS[(Math.random() * DEEP_WHISPERS.length) | 0]);
        sfx.rumble();
        this.cameras.main.shake(500, 0.0012);
      },
    });
    // the Dowsing Pendulum tugs toward treasure
    this.time.addEvent({
      delay: 24000, loop: true,
      callback: () => {
        if (!this.relics.has(3) || this.hud.isOpen || this.py < SURFACE_H) return;
        const t = this.nearestTreasure(45);
        if (t) this.hud.toast(`The pendulum tugs ${t.dir}. Something is buried there.`);
      },
    });

    // autosave
    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.doSave() });
    window.addEventListener('beforeunload', this.beforeUnload);
    this.events.once('shutdown', () => {
      window.removeEventListener('beforeunload', this.beforeUnload);
      this.hud.destroy();
    });

    this.relight();
    this.lastBand = bandAt(this.py).name;
    if (!save) {
      this.hud.toast('Welcome to the mine. The world ends at the bottom of it.', 'epic');
      this.hud.toast('Walk into rock to mine it. Copper is orange. Coal is black.');
    } else {
      this.hud.toast('Back underground. The dark missed you.');
    }
    this.hud.refresh();

    // dev cheats: append ?dev=1 to the URL
    if (new URLSearchParams(location.search).get('dev') === '1') {
      (window as unknown as Record<string, unknown>).CD = {
        scene: this,
        give: (id: string, n = 1) => { this.addItem(id, n, false); this.hud.refresh(); },
        tp: (x: number, y: number) => this.teleport(x, y),
        reveal: () => { this.explored.fill(1); },
        pickup: (tier: number) => { this.pick = tier; this.hud.refresh(); },
        win: () => this.startWin(),
        cradle: () => this.teleport(this.world.cradle.x, this.world.cradle.y - 2),
      };
    }
  }

  private teleport(x: number, y: number) {
    this.px = x; this.py = y; this.moving = false;
    this.tweens.killTweensOf(this.player);
    this.player.setPosition(x * TILE + 16, y * TILE + 16);
    this.relight();
  }

  private bindKeys() {
    const kb = this.input.keyboard!;
    const on = (key: string, fn: () => void) => kb.on(`keydown-${key}`, () => {
      if (this.hud.isOpen && !['ESC', 'I', 'M', 'H', 'B', 'J'].includes(key)) return;
      fn();
    });
    on('E', () => this.interact());
    on('F', () => this.placeTrack());
    on('G', () => this.removeTrack());
    on('T', () => this.placeTorch());
    on('ONE', () => this.placeBomb(1));
    on('TWO', () => this.placeBomb(2));
    on('THREE', () => this.placeBomb(3));
    on('I', () => this.hud.toggle('inv'));
    on('M', () => this.hud.toggle('map'));
    on('H', () => this.hud.toggle('help'));
    on('B', () => this.hud.toggle('bombs'));
    on('J', () => this.hud.toggle('journal'));
    on('N', () => this.hud.toggleMute());
    on('ESC', () => this.hud.close());
    // movement keys are polled in update()
    kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  }

  // ============================ RELIC EFFECTS ============================

  satchelCap(): number { return SATCHEL_CAPS[this.satchelTier] + (this.relics.has(4) ? 60 : 0); }
  lightRadius(): number { return BASE_LIGHT + (this.lantern ? LANTERN_BONUS : 0) + (this.relics.has(1) ? 2 : 0); }
  walkMs(): number { return this.relics.has(2) ? WALK_MS * 0.85 : WALK_MS; }
  mineFactor(): number { return this.relics.has(5) ? 0.75 : 1; }
  bombRadius(tier: number): number { return BOMB_STATS[tier].radius + (this.relics.has(6) ? 1 : 0); }

  // nearest sealed pocket or untouched pedestal — for the Dowsing Pendulum
  nearestTreasure(range: number): { x: number; y: number; d: number; dir: string } | null {
    let best: { x: number; y: number; d: number } | null = null;
    for (let dy = -range; dy <= range; dy++) {
      const y = this.py + dy;
      if (y < 0 || y >= MAP_H) continue;
      for (let dx = -range; dx <= range; dx++) {
        const x = this.px + dx;
        if (x < 0 || x >= MAP_W) continue;
        const i = this.idx(x, y);
        const t = this.world.type[i];
        if (t !== T.Pocket && !(t === T.Pedestal && this.world.aux[i] > 0)) continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (!best || d < best.d) best = { x, y, d };
      }
    }
    if (!best) return null;
    const dx = best.x - this.px, dy = best.y - this.py;
    const vert = dy > 2 ? 'down' : dy < -2 ? 'up' : '';
    const horiz = dx > 2 ? 'east' : dx < -2 ? 'west' : '';
    const dir = vert && horiz ? `${vert} and ${horiz}` : vert ? `straight ${vert}` : horiz ? `due ${horiz}` : 'right beneath your boots';
    return { ...best, dir };
  }

  // ============================ WORLD ACCESS ============================

  idx(x: number, y: number) { return y * MAP_W + x; }
  inb(x: number, y: number) { return x >= 0 && x < MAP_W && y >= 0 && y < MAP_H; }
  tileAt(x: number, y: number): [number, number] {
    if (!this.inb(x, y)) return [T.Bedrock, 0];
    const i = this.idx(x, y);
    return [this.world.type[i], this.world.aux[i]];
  }

  setTile(x: number, y: number, t: number, a = 0) {
    if (!this.inb(x, y)) return;
    const i = this.idx(x, y);
    this.world.type[i] = t; this.world.aux[i] = a;
    this.diffs.set(i, [t, a]);
    this.redrawTile(x, y);
    // track frames depend on neighbours
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const [nt] = this.tileAt(x + dx, y + dy);
      if (nt === T.Track) this.redrawTile(x + dx, y + dy);
    }
  }

  private redrawTile(x: number, y: number) {
    const i = this.idx(x, y);
    const t = this.world.type[i], a = this.world.aux[i];
    let frame: number;
    if (t === T.Track) {
      const isT = (xx: number, yy: number) => this.tileAt(xx, yy)[0] === T.Track;
      const h = isT(x - 1, y) || isT(x + 1, y);
      const v = isT(x, y - 1) || isT(x, y + 1);
      frame = h && v ? F.trackX : v ? F.trackV : F.trackH;
    } else {
      frame = frameFor(t, a);
    }
    this.layer.putTileAt(frame, x, y, false);
  }

  // ============================ LIGHTING ============================

  relight() {
    this.strength.fill(0);
    const R = this.lightRadius();
    const queue: number[] = [];
    const push = (x: number, y: number, s: number) => {
      if (!this.inb(x, y)) return;
      const i = this.idx(x, y);
      if (this.strength[i] >= s) return;
      this.strength[i] = s;
      queue.push((i << 5) | s);
    };
    push(this.px, this.py, R);
    for (const [ti, tt] of this.torchSet) {
      const tx = ti % MAP_W, ty = (ti / MAP_W) | 0;
      if (Math.abs(tx - this.px) < 40 && Math.abs(ty - this.py) < 32)
        push(tx, ty, tt === 2 ? EVERGLOW_LIGHT : TORCH_LIGHT);
    }
    // wild glowshrooms shine on their own
    for (let y = Math.max(0, this.py - 32); y <= Math.min(MAP_H - 1, this.py + 32); y++)
      for (let x = Math.max(0, this.px - 40); x <= Math.min(MAP_W - 1, this.px + 40); x++)
        if (this.world.type[this.idx(x, y)] === T.Glowshroom) push(x, y, SHROOM_LIGHT);
    while (queue.length) {
      const packed = queue.pop()!;
      const i = packed >> 5, s = packed & 31;
      if (this.strength[i] > s) continue;
      if (s <= 1) continue;
      if (!TRANSPARENT.has(this.world.type[i])) continue; // walls glow but don't pass light
      const x = i % MAP_W, y = (i / MAP_W) | 0;
      push(x - 1, y, s - 1); push(x + 1, y, s - 1); push(x, y - 1, s - 1); push(x, y + 1, s - 1);
    }
    this.applyShade();
  }

  private applyShade() {
    const cam = this.cameras.main;
    const x0 = Math.max(0, (cam.worldView.x / TILE | 0) - 2);
    const y0 = Math.max(0, (cam.worldView.y / TILE | 0) - 2);
    const x1 = Math.min(MAP_W - 1, ((cam.worldView.right / TILE) | 0) + 2);
    const y1 = Math.min(MAP_H - 1, ((cam.worldView.bottom / TILE) | 0) + 2);
    for (let y = y0; y <= y1; y++) {
      const ambient = y < SURFACE_H ? 1 : bandAt(y).ambient;
      for (let x = x0; x <= x1; x++) {
        const i = this.idx(x, y);
        const tile = this.layer.getTileAt(x, y);
        if (!tile) continue;
        const s = this.strength[i] / 7;
        // perceptual curve: lift the mid-tones so lit areas read clearly
        const v = Math.pow(Math.min(1, Math.max(s, ambient)), 0.62) * this.varB[i];
        const g = Math.min(255, Math.round(v * 255));
        tile.tint = (g << 16) | (g << 8) | g;
        if (s > 0.05 || y < SURFACE_H) this.explored[i] = 1;
      }
    }
    this.lastCamX = cam.worldView.x / TILE | 0;
    this.lastCamY = cam.worldView.y / TILE | 0;
  }

  lightAt(x: number, y: number): number {
    if (y < SURFACE_H) return 1;
    return Math.min(1, Math.max(this.strength[this.idx(x, y)] / 9, bandAt(y).ambient));
  }

  // ============================ UPDATE LOOP ============================

  update(_time: number, delta: number) {
    this.stats.playMs = this.savedPlayMs + (Date.now() - this.startedAt);

    // re-shade if camera crossed a tile boundary
    const cam = this.cameras.main;
    if ((cam.worldView.x / TILE | 0) !== this.lastCamX || (cam.worldView.y / TILE | 0) !== this.lastCamY)
      this.applyShade();

    if (this.hud.isOpen) { this.stopMining(); return; }

    const dir = this.heldDir();
    if (!dir) { this.stopMining(); return; }

    this.facing = DIRS[dir];
    if (!this.mounted) this.player.setFrame(`player-${dir}`);

    if (this.moving) return;

    const tx = this.px + this.facing[0], ty = this.py + this.facing[1];
    const [t] = this.tileAt(tx, ty);

    if (this.mounted) {
      this.stopMining();
      if (t === T.Track) this.stepTo(tx, ty, CART_MS);
      else if (WALKABLE.has(t)) { this.dismount(); this.stepTo(tx, ty, this.walkMs()); }
      else if (Date.now() - this.lastHintAt > 1600) {
        this.lastHintAt = Date.now();
        this.hud.toast('The cart rattles to a halt. Hop off (E) to mine.');
      }
      return;
    }

    if (WALKABLE.has(t)) { this.stopMining(); this.stepTo(tx, ty, this.walkMs()); return; }

    this.tryMine(tx, ty, delta);
  }

  private heldDir(): 'd' | 'u' | 'l' | 'r' | null {
    if (this.touchDir) return this.touchDir;
    const kb = this.input.keyboard!;
    const k = (code: number) => kb.keys[code]?.isDown;
    const K = Phaser.Input.Keyboard.KeyCodes;
    if (k(K.S) || k(K.DOWN)) return 'd';
    if (k(K.W) || k(K.UP)) return 'u';
    if (k(K.A) || k(K.LEFT)) return 'l';
    if (k(K.D) || k(K.RIGHT)) return 'r';
    return null;
  }

  private stepTo(x: number, y: number, ms: number) {
    this.moving = true;
    if (this.mounted && this.stats.mined % 3 === 0) sfx.cartStep();
    this.tweens.add({
      targets: this.player,
      x: x * TILE + 16, y: y * TILE + 16,
      duration: ms,
      onComplete: () => {
        this.px = x; this.py = y; this.moving = false;
        if (y > this.stats.deepest) this.stats.deepest = y;
        const band = bandAt(y).name;
        if (band !== this.lastBand && y >= SURFACE_H) {
          this.lastBand = band;
          this.hud.toast(`— ${band} —`, 'epic');
        }
        // walked onto a journal page?
        const [st, sa] = this.tileAt(x, y);
        if (st === T.Page) this.collectPage(x, y, sa);
        this.relight();
        this.hud.refresh();
      },
    });
  }

  // ============================ MINING ============================

  private mineInfo(x: number, y: number): { ok: true; time: number } | { ok: false; reason: string } {
    const [t, a] = this.tileAt(x, y);
    if (t === T.Rock) {
      if (this.pick < a) return { ok: false, reason: `Tier-${a} rock. Your ${PICK_NAMES[this.pick]} can't cut it — upgrade or blast it.` };
      const time = MINE_TIME[a] * PACE * this.mineFactor() * Math.pow(PICK_SPEED_BONUS, this.pick - a);
      return { ok: true, time };
    }
    if (t === T.Ore) {
      if (this.satchelFull()) return { ok: false, reason: 'Satchel full! Deposit at the camp Crate (or ride the rails home).' };
      if (a & CLUSTER_FLAG) return { ok: true, time: CLUSTER_MINE_TIME * PACE * this.mineFactor() };
      const ore = oreById(a & 31);
      if (this.pick < ore.tier) return { ok: false, reason: `${ore.name} sits in tier-${ore.tier} rock — you need a better pick.` };
      return { ok: true, time: MINE_TIME[ore.tier] * 1.15 * PACE * this.mineFactor() * Math.pow(PICK_SPEED_BONUS, this.pick - ore.tier) };
    }
    if (t === T.Glowshroom) return { ok: true, time: 0.35 * PACE };
    if (t === T.Seal) return { ok: false, reason: `SEAL ${'I'.repeat(a)} — the old miners closed this. Only a tier-${a} bomb [key ${a}] opens it.` };
    if (t === T.Pocket) return { ok: false, reason: 'Cracked, glittering rock — a treasure pocket! Blast it open with any bomb.' };
    if (t === T.Corestone) return { ok: false, reason: 'Corestone. No pick made by man will ever scratch it. A Mega Bomb [3] might.' };
    if (t === T.Chasm) return { ok: false, reason: 'A yawning chasm. Lay cart track (F) to bridge it.' };
    if (t === T.Bedrock) return { ok: false, reason: 'Bedrock. The mountain refuses.' };
    if (t === T.Cradle) return { ok: false, reason: 'The Cradle. It hums, waiting for its payload.' };
    return { ok: false, reason: '' };
  }

  private tryMine(x: number, y: number, delta: number) {
    const info = this.mineInfo(x, y);
    if (!info.ok) {
      this.stopMining();
      if (info.reason && Date.now() - this.lastHintAt > 1600) {
        this.lastHintAt = Date.now();
        this.hud.toast(info.reason, 'bad');
        sfx.error();
      }
      return;
    }
    const i = this.idx(x, y);
    if (this.mineIdx !== i) { this.mineIdx = i; this.mineProgress = 0; this.mineNeed = info.time; }
    this.mineProgress += delta / 1000;
    if (Date.now() - this.lastMineSfx > 160) { this.lastMineSfx = Date.now(); sfx.mineHit(); }

    // progress bar
    this.mineBar.clear();
    const frac = Math.min(1, this.mineProgress / this.mineNeed);
    this.mineBar.fillStyle(0x000000, 0.6).fillRect(x * TILE + 3, y * TILE - 7, 26, 5);
    this.mineBar.fillStyle(0xffb84d, 1).fillRect(x * TILE + 4, y * TILE - 6, 24 * frac, 3);

    if (this.mineProgress >= this.mineNeed) this.breakTile(x, y);
  }

  private stopMining() {
    this.mineIdx = -1; this.mineProgress = 0;
    this.mineBar.clear();
  }

  private breakTile(x: number, y: number) {
    const [t, a] = this.tileAt(x, y);
    this.stopMining();
    if (t === T.Rock) {
      if (Math.random() < 0.4) this.addItem('stone', 1);
    } else if (t === T.Ore) {
      const ore = oreById(a & 31);
      this.addItem(ore.item, (a & CLUSTER_FLAG) ? 3 : 1);
      if (Math.random() < 0.2) this.addItem('stone', 1);
    } else if (t === T.Glowshroom) {
      this.addItem('glowshroom', 1);
      this.setTile(x, y, T.Floor);
      this.stats.mined++;
      sfx.squish();
      this.relight();
      this.hud.refresh();
      return;
    }
    this.setTile(x, y, T.Floor);
    this.stats.mined++;
    sfx.breakRock();
    this.relight();
    this.hud.refresh();
  }

  satchelFull(): boolean { return countRaw(this.inv) >= this.satchelCap(); }

  addItem(id: string, n: number, announce = true) {
    this.inv[id] = (this.inv[id] || 0) + n;
    const def = ITEM[id];
    if (def?.raw) this.stats.oreCollected += n;
    if (announce) {
      this.floatText(`+${n} ${def?.name ?? id}`, def ? def.color : 0xffffff);
      sfx.pickup();
    }
  }

  private floatText(msg: string, color: number) {
    const c = Math.max(color, 0x606060);
    const txt = this.add.text(this.player.x, this.player.y - 20, msg, {
      fontFamily: 'Consolas, monospace', fontSize: '13px',
      color: '#' + c.toString(16).padStart(6, '0'),
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: txt, y: txt.y - 26, alpha: 0, duration: 1100, onComplete: () => txt.destroy() });
  }

  // ============================ ACTIONS ============================

  interact() {
    const fx = this.px + this.facing[0], fy = this.py + this.facing[1];
    const [ft] = this.tileAt(fx, fy);
    if (ft === T.Workbench) { sfx.click(); this.hud.openBench('work'); return; }
    if (ft === T.Furnace) { sfx.click(); this.hud.openBench('furnace'); return; }
    if (ft === T.BlastBench) { sfx.click(); this.hud.openBench('blast'); return; }
    if (ft === T.Crate) { this.deposit(); return; }
    if (ft === T.Cradle) { this.useCradle(); return; }
    if (ft === T.SupplyCrate) { this.lootCrate(fx, fy); return; }
    if (ft === T.Pedestal) { this.takeRelic(fx, fy); return; }
    if (ft === T.Bones) { this.hud.toast('One of the Deep Delvers. The bones are old, tidy, and unbothered. You leave them be.'); return; }

    // mount / dismount
    const [st] = this.tileAt(this.px, this.py);
    if (this.mounted) { this.dismount(); return; }
    if (st === T.Track) {
      if (!this.cart) { this.hud.toast('You need a Minecart — build one at the Workbench.', 'bad'); sfx.error(); return; }
      this.mounted = true;
      this.player.setFrame('ride');
      this.hud.toast('Riding the rails. Hold a direction to speed along the track. E to hop off.');
      sfx.place();
      return;
    }
    this.hud.toast('Nothing to use here. (E works on benches, the crate, tracks, and the Cradle.)');
  }

  private dismount() {
    this.mounted = false;
    this.player.setFrame('player-d');
    sfx.place();
  }

  private deposit() {
    let moved = 0;
    for (const [id, n] of Object.entries(this.inv)) {
      if (!ITEM[id]?.raw || n <= 0) continue;
      this.storage[id] = (this.storage[id] || 0) + n;
      moved += n;
      this.inv[id] = 0;
    }
    if (moved > 0) {
      this.hud.toast(`Deposited ${moved} materials in the crate. Benches can use them from storage.`, 'good');
      sfx.deposit();
    } else {
      this.hud.toast('Nothing raw to deposit. The crate feeds the benches automatically.');
    }
    this.hud.refresh();
  }

  private useCradle() {
    if ((this.inv['nuke'] || 0) < 1) {
      this.hud.toast('The Cradle hums, empty. It wants T.H.E. N.U.K.E. — build it at the Blast Bench.', 'epic');
      sfx.seal();
      return;
    }
    this.hud.confirm(
      'ARM T.H.E. N.U.K.E.?',
      'Total Habitat Elimination — Nuclear Underground Kinetic Event.<br>There is no undo. Anywhere. For anyone.',
      () => this.startWin(),
    );
  }

  startWin() {
    this.doSave();
    this.hud.destroy();
    this.scene.start('Win', {
      stats: this.stats,
      pages: this.journal.size,
      pageTotal: this.world.pageCount,
      relicCount: this.relics.size,
    });
  }

  // ============================ DISCOVERIES ============================

  private collectPage(x: number, y: number, pageId: number) {
    this.setTile(x, y, this.py < SURFACE_H ? T.Camp : T.Floor);
    if (pageId >= 1 && pageId <= PAGES.length && !this.journal.has(pageId)) {
      this.journal.add(pageId);
      const p = PAGES[pageId - 1];
      this.hud.toast(`Journal recovered — “${p.title}” (${this.journal.size}/${this.world.pageCount}). Press J to read.`, 'epic');
    } else {
      this.hud.toast('A journal page, pulped beyond reading.');
    }
    sfx.page();
    this.doSave();
    this.hud.refresh();
  }

  private lootCrate(x: number, y: number) {
    const [, a] = this.tileAt(x, y);
    if (a !== 1) { this.hud.toast('Empty. Someone got here first. It was you.'); return; }
    const band = bandAt(y).rock;
    const roll = (n: number) => 1 + Math.floor(Math.random() * n);
    const loot: Record<string, number> = { torch: 2 + roll(4), stone: 2 + roll(5) };
    if (Math.random() < 0.6) loot['track'] = 1 + roll(4);
    if (Math.random() < 0.6) loot['coal'] = 2 + roll(4);
    if (band >= 2 && Math.random() < 0.5) loot['gunpowder'] = roll(3);
    if (band >= 3 && Math.random() < 0.4) loot['dynamite'] = roll(2);
    if (band >= 4 && Math.random() < 0.25) loot['bigBlast'] = 1;
    if (Math.random() < 0.15) loot['glowshroom'] = 1;
    const parts: string[] = [];
    for (const [id, n] of Object.entries(loot)) {
      this.inv[id] = (this.inv[id] || 0) + n;
      if (ITEM[id]?.raw) this.stats.oreCollected += n;
      parts.push(`${n} ${ITEM[id]?.name ?? id}`);
    }
    this.setTile(x, y, T.SupplyCrate, 0);
    this.hud.toast(`Old expedition supplies: ${parts.join(', ')}. The Delvers won't mind.`, 'good');
    sfx.crateOpen();
    this.doSave();
    this.hud.refresh();
  }

  private takeRelic(x: number, y: number) {
    const [, a] = this.tileAt(x, y);
    if (a === 0) { this.hud.toast('The pedestal is empty. It still hums, faintly, like a picked-clean instrument.'); return; }
    const relic = relicById(a);
    this.relics.add(a);
    this.setTile(x, y, T.Pedestal, 0);
    this.hud.toast(`RELIC — ${relic.name}: ${relic.desc}`, 'epic');
    this.hud.toast(`“${relic.flavor}”`);
    sfx.relic();
    if (a === 1) this.relight(); // Ember Heart
    this.doSave();
    this.hud.refresh();
  }

  placeTrack() {
    const fx = this.px + this.facing[0], fy = this.py + this.facing[1];
    const [ft] = this.tileAt(fx, fy);
    if ((this.inv['track'] || 0) < 1) { this.hud.toast('No track. Craft Cart Track at the Workbench (iron + stone).', 'bad'); sfx.error(); return; }
    if (ft !== T.Floor && ft !== T.Chasm) {
      if (Date.now() - this.lastHintAt > 1200) { this.lastHintAt = Date.now(); this.hud.toast('Track needs open floor or a chasm edge (face the gap and press F).', 'bad'); }
      return;
    }
    this.inv['track']--;
    this.setTile(fx, fy, T.Track, ft === T.Chasm ? 1 : 0);
    this.stats.tracksLaid++;
    sfx.place();
    this.relight();
    this.hud.refresh();
  }

  removeTrack() {
    const fx = this.px + this.facing[0], fy = this.py + this.facing[1];
    const [ft, fa] = this.tileAt(fx, fy);
    if (ft !== T.Track) { this.hud.toast('Face a track piece to pull it up (G).'); return; }
    this.setTile(fx, fy, fa === 1 ? T.Chasm : T.Floor);
    this.addItem('track', 1, false);
    this.hud.toast('Track recovered.');
    sfx.place();
    this.relight();
    this.hud.refresh();
  }

  placeTorch() {
    const i = this.idx(this.px, this.py);
    const [t] = this.tileAt(this.px, this.py);
    const type = (this.inv['torch'] || 0) > 0 ? 1 : (this.inv['everglow'] || 0) > 0 ? 2 : 0;
    if (type === 0) { this.hud.toast('No torches. Craft them at the Workbench (coal + stone).', 'bad'); sfx.error(); return; }
    if (t !== T.Floor && t !== T.Camp && t !== T.RuneFloor) { this.hud.toast('Stand on open floor to plant a torch.'); return; }
    if (this.torchSet.has(i)) { this.hud.toast('There is already a torch here.'); return; }
    this.inv[type === 2 ? 'everglow' : 'torch']--;
    this.torchSet.set(i, type);
    this.addTorchSprite(i, type);
    this.stats.torchesPlaced++;
    sfx.torch();
    this.relight();
    this.hud.refresh();
  }

  private addTorchSprite(i: number, type: number) {
    const x = i % MAP_W, y = (i / MAP_W) | 0;
    const everglow = type === 2;
    const s = this.add.sprite(x * TILE + 16, y * TILE + 12, 'chars', everglow ? 'etorch0' : 'torch0').setDepth(6);
    const glow = this.add.image(x * TILE + 16, y * TILE + 10, 'glow')
      .setTint(everglow ? 0x66ffe0 : 0xffb050).setAlpha(everglow ? 0.4 : 0.35)
      .setScale(everglow ? 1.7 : 1.3).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    s.setData('glow', glow);
    s.setData('everglow', everglow);
    this.torchSprites.set(i, s);
  }

  // ============================ BOMBS ============================

  placeBomb(tier: number) {
    const item = BOMB_ITEMS[tier];
    const stats = BOMB_STATS[tier];
    if ((this.inv[item] || 0) < 1) {
      this.hud.toast(`No ${stats.name}. Mix one at the Blast Bench.`, 'bad');
      sfx.error();
      return;
    }
    const fx = this.px + this.facing[0], fy = this.py + this.facing[1];
    const [ft] = this.tileAt(fx, fy);
    const i = this.idx(fx, fy);
    if (ft === T.Bedrock || (ft >= T.Workbench && ft <= T.Crate) || ft === T.Cradle || ft === T.Camp) {
      this.hud.toast('Not a great spot for explosives.', 'bad');
      return;
    }
    if (this.armedBombs.has(i)) return;
    this.inv[item]--;
    this.armedBombs.add(i);
    sfx.fuse();
    this.hud.refresh();

    const frame = tier === 1 ? 'bomb1' : 'bomb2';
    const spr = this.add.sprite(fx * TILE + 16, fy * TILE + 16, 'chars', frame).setDepth(20);
    if (tier === 3) spr.setScale(1.25).setTint(0xffe08a);
    this.tweens.add({ targets: spr, alpha: 0.35, duration: 180, yoyo: true, repeat: 6 });
    this.time.delayedCall(2300, () => {
      spr.destroy();
      this.armedBombs.delete(i);
      this.explode(fx, fy, tier);
    });
  }

  private explode(cx: number, cy: number, tier: number) {
    const { maxRock } = BOMB_STATS[tier];
    const radius = this.bombRadius(tier);
    this.stats.bombs++;
    const yields: Record<string, number> = {};
    let sealBroken = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > radius) continue;
        const x = cx + dx, y = cy + dy;
        if (!this.inb(x, y)) continue;
        const [t, a] = this.tileAt(x, y);
        if (t === T.Seal && tier >= a) { this.setTile(x, y, T.Floor); sealBroken = Math.max(sealBroken, a); continue; }
        if (t === T.Pocket && tier >= a) { this.setTile(x, y, T.Floor); continue; }
        if (t === T.Corestone && tier >= 3) { this.setTile(x, y, T.Floor); continue; }
        if (t === T.Rock && a <= maxRock) {
          if (Math.random() < 0.25) yields['stone'] = (yields['stone'] || 0) + 1;
          this.setTile(x, y, T.Floor);
          continue;
        }
        if (t === T.Glowshroom) {
          yields['glowshroom'] = (yields['glowshroom'] || 0) + 1;
          this.setTile(x, y, T.Floor);
          continue;
        }
        if (t === T.Ore) {
          const ore = oreById(a & 31);
          const isCluster = !!(a & CLUSTER_FLAG);
          if (isCluster || ore.tier <= maxRock) {
            yields[ore.item] = (yields[ore.item] || 0) + (isCluster ? 3 : 1);
            this.setTile(x, y, T.Floor);
          }
        }
      }
    }

    // effects
    const wx = cx * TILE + 16, wy = cy * TILE + 16;
    const flash = this.add.image(wx, wy, 'glow')
      .setTint(0xffd27a).setScale(tier * 3.2).setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, alpha: 0, scale: tier * 6, duration: 420, onComplete: () => flash.destroy() });
    const emitter = this.add.particles(wx, wy, 'spark', {
      speed: { min: 80, max: 200 + tier * 90 },
      lifespan: 550,
      quantity: 18 + tier * 14,
      scale: { start: 1.1, end: 0 },
      tint: [0xffd27a, 0xff8a2e, 0x8a8578],
      emitting: false,
    }).setDepth(59);
    emitter.explode(18 + tier * 14);
    this.time.delayedCall(900, () => emitter.destroy());
    this.cameras.main.shake(280 + tier * 180, 0.004 + tier * 0.004);
    sfx.boom(tier);

    // collect yields (blasting can overflow the satchel — hauling it home is your problem)
    const parts: string[] = [];
    let total = 0;
    for (const [id, n] of Object.entries(yields)) {
      this.inv[id] = (this.inv[id] || 0) + n;
      if (ITEM[id]?.raw) this.stats.oreCollected += n;
      total += n;
      parts.push(`${n} ${ITEM[id]?.name ?? id}`);
    }
    if (sealBroken > 0) this.hud.toast(`SEAL ${'I'.repeat(sealBroken)} BREACHED. The way down is open.`, 'epic');
    if (total > 0) this.hud.toast(`Blast yield: ${parts.join(', ')}`, 'good');
    this.stats.mined += total;
    this.relight();
    this.hud.refresh();
  }

  // ============================ CRAFTING ============================

  totalOf(id: string): number { return (this.inv[id] || 0) + (this.storage[id] || 0); }

  canCraft(r: Recipe): boolean {
    return Object.entries(r.mats).every(([id, n]) => this.totalOf(id) >= n);
  }

  craft(r: Recipe) {
    if (!this.canCraft(r)) { sfx.error(); return; }
    for (const [id, n] of Object.entries(r.mats)) {
      let need = n;
      const fromStore = Math.min(this.storage[id] || 0, need);
      if (fromStore > 0) { this.storage[id]! -= fromStore; need -= fromStore; }
      if (need > 0) this.inv[id] = (this.inv[id] || 0) - need;
    }
    this.stats.crafted++;
    sfx.craft();

    if (r.upgrade) {
      switch (r.upgrade) {
        case 'pick2': this.pick = 2; break;
        case 'pick3': this.pick = 3; break;
        case 'pick4': this.pick = 4; break;
        case 'pick5': this.pick = 5; break;
        case 'satchel1': this.satchelTier = Math.max(this.satchelTier, 1); break;
        case 'satchel2': this.satchelTier = Math.max(this.satchelTier, 2); break;
        case 'satchel3': this.satchelTier = Math.max(this.satchelTier, 3); break;
        case 'cart': this.cart = true; break;
        case 'lantern': this.lantern = true; this.relight(); break;
      }
      this.hud.toast(`${r.name} — equipped!`, 'epic');
    } else {
      this.inv[r.out] = (this.inv[r.out] || 0) + r.n;
      if (r.out === 'nuke') {
        this.hud.toast('T.H.E. N.U.K.E. IS COMPLETE. Take it down. All the way down.', 'epic');
        sfx.seal();
      } else {
        this.hud.toast(`Crafted ${r.name}.`, 'good');
      }
    }
    this.doSave();
    this.hud.refresh();
  }

  // ============================ OBJECTIVE & SAVE ============================

  objective(): string {
    const d = this.stats.deepest;
    if ((this.inv['nuke'] || 0) >= 1) return 'Carry T.H.E. N.U.K.E. to the Cradle in the Heart of the Mountain (~1030m). Press E. Farewell.';
    if (this.pick < 2) return 'Mine copper (orange) and coal, smelt bars at the Furnace, craft a Copper Pick.';
    if (d < 109 && !this.cart) return 'Dig deeper. Smelt Iron Bars → craft Cart Track and a Minecart before the Great Chasm (~200m).';
    if (d < 150) return 'Bridge the Great Chasm: face the gap, press F to lay track. Ride with E.';
    if (d < 250) return 'Cook Gunpowder → Dynamite at the Blast Bench. Breach SEAL I (~285m). Blast glittering pockets!';
    if (d < 360) return 'Deep Stoneworks: mine silver, refine Steel. Build Big Blasts [2] → SEAL II (~485m).';
    if (d < 500) return 'Granite Abyss: gold & crystal. Assemble Mega Bombs [3] → SEAL III (~705m).';
    return 'The Voidreach: uranium & voidstone. Enrich Uranium Rods, then build T.H.E. N.U.K.E. at the Blast Bench.';
  }

  doSave() {
    const data: SaveData = {
      v: 2,
      seed: this.world.seed,
      diffs: [...this.diffs.entries()].map(([i, [t, a]]) => [i, t, a] as [number, number, number]),
      torches: [...this.torchSet.entries()],
      inv: this.inv,
      storage: this.storage,
      pos: [this.px, this.py],
      pick: this.pick,
      satchelTier: this.satchelTier,
      cart: this.cart,
      lantern: this.lantern,
      stats: this.stats,
      journal: [...this.journal],
      relics: [...this.relics],
    };
    writeSave(data);
  }
}
