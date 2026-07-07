import Phaser from 'phaser';
import { FRAMES, SHEET_COLS, ORES } from '../data/tiles';
import { ITEMS } from '../data/items';

const TS = 32;

function hx(c: number): string { return '#' + c.toString(16).padStart(6, '0'); }

// deterministic hash for speckle placement (stable art)
function h2(x: number, y: number, s: number): number {
  let n = x * 374761393 + y * 668265263 + s * 2147483647;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

interface RockStyle { base: string; dark: string; light: string; }
const ROCK: RockStyle[] = [
  { base: '#7a6a4c', dark: '#5d5038', light: '#94805e' }, // 1 topsoil
  { base: '#73737d', dark: '#57575f', light: '#8b8b96' }, // 2 stone
  { base: '#5f6570', dark: '#474c55', light: '#747b88' }, // 3 deep stone
  { base: '#574f63', dark: '#403a4a', light: '#6b6178' }, // 4 granite
  { base: '#33333f', dark: '#232330', light: '#4a4a5c' }, // 5 obsidian
];

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeTileSheet();
    this.makeChars();
    this.makeIcons();
    this.scene.start('Menu');
  }

  // =============== TILE SHEET ===============
  private makeTileSheet() {
    const cols = SHEET_COLS, rows = Math.ceil(FRAMES.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * TS; cv.height = rows * TS;
    const g = cv.getContext('2d')!;

    FRAMES.forEach((name, i) => {
      const px = (i % cols) * TS, py = Math.floor(i / cols) * TS;
      g.save();
      g.translate(px, py);
      g.beginPath(); g.rect(0, 0, TS, TS); g.clip();
      this.drawTile(g, name, i);
      g.restore();
    });

    const tex = this.textures.addCanvas('tiles', cv);
    tex?.refresh();
  }

  private speckle(g: CanvasRenderingContext2D, seed: number, color: string, n: number, size = 2) {
    g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = Math.floor(h2(i, seed, 7) * 30) + 1;
      const y = Math.floor(h2(seed, i, 13) * 30) + 1;
      g.fillRect(x, y, size, size);
    }
  }

  private rockBase(g: CanvasRenderingContext2D, tier: number, seed: number) {
    const s = ROCK[Math.min(4, Math.max(0, tier - 1))];
    g.fillStyle = s.base; g.fillRect(0, 0, TS, TS);
    this.speckle(g, seed * 3 + tier, s.dark, 10, 3);
    this.speckle(g, seed * 7 + tier, s.light, 6, 2);
    // edge shading
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, 0, TS, 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, TS - 2, TS, 2);
    g.strokeStyle = 'rgba(0,0,0,0.28)'; g.strokeRect(0.5, 0.5, TS - 1, TS - 1);
  }

  private floorBase(g: CanvasRenderingContext2D, seed: number) {
    g.fillStyle = '#322c26'; g.fillRect(0, 0, TS, TS);
    this.speckle(g, seed + 31, '#423a30', 7, 2);
    this.speckle(g, seed + 47, '#262019', 8, 2);
  }

  private drawTile(g: CanvasRenderingContext2D, name: string, i: number) {
    if (name === 'camp') {
      g.fillStyle = '#4a4034'; g.fillRect(0, 0, TS, TS);
      g.fillStyle = '#3a3229';
      for (let y = 0; y < TS; y += 8) g.fillRect(0, y, TS, 1);
      this.speckle(g, 5, '#574b3c', 5, 2);
      return;
    }
    if (name === 'floor') { this.floorBase(g, i); return; }
    if (name === 'chasm') {
      const gr = g.createLinearGradient(0, 0, 0, TS);
      gr.addColorStop(0, '#191922'); gr.addColorStop(0.4, '#0b0b10'); gr.addColorStop(1, '#040406');
      g.fillStyle = gr; g.fillRect(0, 0, TS, TS);
      g.fillStyle = '#33333f'; g.fillRect(0, 0, TS, 2);
      g.fillStyle = 'rgba(60,60,80,0.25)';
      for (let k = 0; k < 3; k++) g.fillRect(4 + k * 10, 3, 2, 6 + k * 2);
      return;
    }
    if (name === 'bedrock') {
      g.fillStyle = '#141419'; g.fillRect(0, 0, TS, TS);
      this.speckle(g, 91, '#1d1d24', 8, 3);
      return;
    }
    if (name === 'corestone') {
      g.fillStyle = '#3c1e22'; g.fillRect(0, 0, TS, TS);
      this.speckle(g, 77, '#2a1216', 9, 3);
      g.strokeStyle = '#ff5a3c'; g.lineWidth = 1; g.globalAlpha = 0.7;
      g.beginPath();
      g.moveTo(4, 28); g.lineTo(12, 18); g.lineTo(10, 10); g.lineTo(18, 4);
      g.moveTo(22, 30); g.lineTo(26, 20); g.lineTo(21, 14);
      g.stroke(); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.strokeRect(0.5, 0.5, TS - 1, TS - 1);
      return;
    }
    if (name === 'cradle') {
      g.fillStyle = '#2b2e38'; g.fillRect(0, 0, TS, TS);
      g.strokeStyle = '#767e92'; g.lineWidth = 3;
      g.beginPath(); g.arc(16, 16, 11, 0, Math.PI * 2); g.stroke();
      const gr = g.createRadialGradient(16, 16, 1, 16, 16, 8);
      gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#ffd84d'); gr.addColorStop(1, 'rgba(255,150,40,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(16, 16, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#767e92';
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
        g.fillRect(15 + Math.cos(a) * 13 - 1, 15 + Math.sin(a) * 13 - 1, 4, 4);
      return;
    }
    if (name === 'workbench') {
      this.drawTile(g, 'camp', 0);
      g.fillStyle = '#5a4426'; g.fillRect(3, 10, 26, 16);
      g.fillStyle = '#8a6a3e'; g.fillRect(3, 8, 26, 5);
      g.fillStyle = '#a8834e'; g.fillRect(3, 8, 26, 2);
      g.fillStyle = '#c9c9d4'; g.fillRect(8, 5, 3, 6);   // hammer head
      g.fillStyle = '#7a5a34'; g.fillRect(9, 9, 1, 6);
      g.fillStyle = '#9aa0ac'; g.fillRect(20, 6, 6, 2);  // saw
      return;
    }
    if (name === 'furnace') {
      this.drawTile(g, 'camp', 0);
      g.fillStyle = '#6d6d76'; g.fillRect(4, 4, 24, 26);
      g.fillStyle = '#57575f'; g.fillRect(4, 4, 24, 4);
      g.fillStyle = '#2b1a12';
      g.beginPath(); g.arc(16, 22, 8, Math.PI, 0); g.rect(8, 22, 16, 6); g.fill();
      const fg = g.createRadialGradient(16, 24, 1, 16, 24, 7);
      fg.addColorStop(0, '#ffe294'); fg.addColorStop(0.5, '#ff8a2e'); fg.addColorStop(1, 'rgba(200,40,0,0)');
      g.fillStyle = fg; g.beginPath(); g.arc(16, 24, 7, 0, Math.PI * 2); g.fill();
      return;
    }
    if (name === 'blastbench') {
      this.drawTile(g, 'camp', 0);
      g.fillStyle = '#4a3a3a'; g.fillRect(3, 10, 26, 16);
      g.fillStyle = '#6a5050'; g.fillRect(3, 8, 26, 4);
      g.fillStyle = '#d44a3a';
      g.fillRect(7, 12, 4, 10); g.fillRect(12, 12, 4, 10); g.fillRect(17, 12, 4, 10);
      g.fillStyle = '#555049'; g.beginPath(); g.arc(25, 20, 3.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e8d84a'; g.beginPath(); g.moveTo(9, 12); g.quadraticCurveTo(14, 6, 19, 12); g.stroke();
      return;
    }
    if (name === 'crate') {
      this.drawTile(g, 'camp', 0);
      g.fillStyle = '#8a6a3e'; g.fillRect(4, 6, 24, 22);
      g.strokeStyle = '#5a4426'; g.lineWidth = 2;
      g.strokeRect(5, 7, 22, 20);
      g.beginPath(); g.moveTo(5, 7); g.lineTo(27, 27); g.moveTo(27, 7); g.lineTo(5, 27); g.stroke();
      g.fillStyle = '#a8834e'; g.fillRect(4, 6, 24, 3);
      return;
    }
    if (name.startsWith('rock')) { this.rockBase(g, Number(name[4]), i); return; }
    if (name.startsWith('seal')) {
      const tier = Number(name[4]);
      const col = ['#ff9d2e', '#ff4747', '#c44dff'][tier - 1];
      g.fillStyle = '#63636e'; g.fillRect(0, 0, TS, TS);
      g.strokeStyle = '#4a4a54'; g.lineWidth = 2;
      g.strokeRect(1, 1, 30, 14); g.strokeRect(1, 17, 14, 14); g.strokeRect(17, 17, 14, 14);
      g.fillStyle = col; g.globalAlpha = 0.85;
      g.beginPath();
      g.moveTo(2, 24); g.lineTo(8, 18); g.lineTo(14, 24); g.lineTo(8, 30); g.closePath(); g.fill();
      g.globalAlpha = 0.5;
      g.fillRect(4, 4, 24, 3);
      g.globalAlpha = 1;
      g.fillStyle = '#8b8b96';
      for (const [bx, by] of [[4, 4], [26, 4], [4, 26], [26, 26]]) g.fillRect(bx, by, 3, 3);
      return;
    }
    if (name.startsWith('pocket')) {
      const deep = name === 'pocket2';
      g.fillStyle = deep ? '#4c4658' : '#6a6258'; g.fillRect(0, 0, TS, TS);
      this.speckle(g, i + 3, deep ? '#383244' : '#544c42', 8, 3);
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(6, 2); g.lineTo(12, 12); g.lineTo(8, 20); g.lineTo(14, 30);
      g.moveTo(24, 2); g.lineTo(20, 14); g.lineTo(26, 24);
      g.stroke();
      const glint = deep ? '#7de6ff' : '#ffe98a';
      g.fillStyle = glint;
      for (const [gx, gy] of [[10, 8], [22, 18], [15, 25], [26, 8]]) {
        g.fillRect(gx, gy, 2, 2);
        g.globalAlpha = 0.4; g.fillRect(gx - 1, gy - 1, 4, 4); g.globalAlpha = 1;
      }
      return;
    }
    if (name.startsWith('track')) {
      this.floorBase(g, i);
      g.fillStyle = '#6d5330';
      if (name === 'trackH' || name === 'trackX')
        for (let x = 2; x < TS; x += 7) g.fillRect(x, 7, 4, 18);
      if (name === 'trackV' || name === 'trackX')
        for (let y = 2; y < TS; y += 7) g.fillRect(7, y, 18, 4);
      g.fillStyle = '#9aa0ac';
      if (name === 'trackH' || name === 'trackX') { g.fillRect(0, 9, TS, 3); g.fillRect(0, 20, TS, 3); }
      if (name === 'trackV' || name === 'trackX') { g.fillRect(9, 0, 3, TS); g.fillRect(20, 0, 3, TS); }
      g.fillStyle = 'rgba(255,255,255,0.25)';
      if (name === 'trackH' || name === 'trackX') { g.fillRect(0, 9, TS, 1); g.fillRect(0, 20, TS, 1); }
      if (name === 'trackV' || name === 'trackX') { g.fillRect(9, 0, 1, TS); g.fillRect(20, 0, 1, TS); }
      return;
    }
    if (name.startsWith('ore')) {
      const ore = ORES[Number(name.slice(3)) - 1];
      this.rockBase(g, ore.tier, i + 11);
      this.gems(g, ore.color, 5, i, false);
      return;
    }
    if (name.startsWith('cl')) {
      const ore = ORES[Number(name.slice(2)) - 1];
      g.fillStyle = '#2e2823'; g.fillRect(0, 0, TS, TS);
      this.speckle(g, i + 17, '#3a322e', 8, 3);
      this.gems(g, ore.color, 9, i, true);
      return;
    }
    // fallback
    g.fillStyle = '#f0f'; g.fillRect(0, 0, TS, TS);
  }

  private gems(g: CanvasRenderingContext2D, color: number, n: number, seed: number, big: boolean) {
    const c = hx(color);
    for (let k = 0; k < n; k++) {
      const x = 3 + Math.floor(h2(k, seed, 3) * 24);
      const y = 3 + Math.floor(h2(seed, k, 9) * 24);
      const s = big ? 4 + Math.floor(h2(k, seed, 21) * 3) : 3 + Math.floor(h2(k, seed, 21) * 2);
      if (color === 0x7dff3a || color === 0x5ee6e0) { // uranium / crystal glow halo
        g.fillStyle = c; g.globalAlpha = 0.25;
        g.fillRect(x - 2, y - 2, s + 4, s + 4);
        g.globalAlpha = 1;
      }
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(x + s / 2, y); g.lineTo(x + s, y + s / 2); g.lineTo(x + s / 2, y + s); g.lineTo(x, y + s / 2);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(x + s / 2 - 1, y + 1, 1.5, 1.5);
    }
  }

  // =============== CHARACTERS & OBJECTS ===============
  private makeChars() {
    const cv = document.createElement('canvas');
    cv.width = 320; cv.height = 64;
    const g = cv.getContext('2d')!;
    const frames: Record<string, number> = {
      'player-d': 0, 'player-u': 1, 'player-l': 2, 'player-r': 3,
      'ride': 4, 'cart': 5, 'torch0': 6, 'torch1': 7,
      'bomb1': 8, 'bomb2': 9,
    };
    const drawPlayer = (ox: number, dir: string) => {
      g.save(); g.translate(ox, 0);
      // legs
      g.fillStyle = '#2b4a94'; g.fillRect(11, 24, 4, 6); g.fillRect(17, 24, 4, 6);
      // body
      g.fillStyle = '#3d6bd6'; g.fillRect(9, 14, 14, 11);
      g.fillStyle = '#2b4a94'; g.fillRect(9, 14, 14, 2);
      // arms
      g.fillStyle = '#d8a476'; g.fillRect(6, 15, 3, 7); g.fillRect(23, 15, 3, 7);
      // head
      g.fillStyle = '#e8b98a'; g.fillRect(10, 5, 12, 10);
      // helmet
      g.fillStyle = '#f2c94c'; g.fillRect(9, 2, 14, 6); g.fillRect(8, 6, 16, 2);
      if (dir === 'd') {
        g.fillStyle = '#fff'; g.fillRect(14, 3, 4, 3);            // lamp
        g.fillStyle = '#2b2b2e'; g.fillRect(12, 9, 2, 2); g.fillRect(18, 9, 2, 2); // eyes
      } else if (dir === 'l') {
        g.fillStyle = '#fff'; g.fillRect(9, 3, 3, 3);
        g.fillStyle = '#2b2b2e'; g.fillRect(11, 9, 2, 2);
        g.fillStyle = '#7a5a34'; g.fillRect(24, 12, 2, 12); // pick handle on back
      } else if (dir === 'r') {
        g.fillStyle = '#fff'; g.fillRect(20, 3, 3, 3);
        g.fillStyle = '#2b2b2e'; g.fillRect(19, 9, 2, 2);
        g.fillStyle = '#7a5a34'; g.fillRect(6, 12, 2, 12);
      } else {
        g.fillStyle = '#e5bd45'; g.fillRect(10, 5, 12, 4); // back of helmet
      }
      g.restore();
    };
    drawPlayer(0, 'd'); drawPlayer(32, 'u'); drawPlayer(64, 'l'); drawPlayer(96, 'r');
    // ride frame: cart + head
    g.save(); g.translate(128, 0);
    g.fillStyle = '#e8b98a'; g.fillRect(11, 4, 10, 8);
    g.fillStyle = '#f2c94c'; g.fillRect(10, 1, 12, 5);
    g.fillStyle = '#fff'; g.fillRect(14, 2, 4, 3);
    this.drawCart(g);
    g.restore();
    // cart alone
    g.save(); g.translate(160, 0); this.drawCart(g); g.restore();
    // torches
    for (let f = 0; f < 2; f++) {
      g.save(); g.translate(192 + f * 32, 0);
      g.fillStyle = '#7a5a34'; g.fillRect(14, 14, 4, 14);
      g.fillStyle = '#ff8a2e';
      g.beginPath(); g.ellipse(16, 10, f ? 4 : 5, f ? 7 : 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd84d';
      g.beginPath(); g.ellipse(16, 11, f ? 2 : 3, f ? 4 : 3, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // bomb sprites (generic small / big)
    g.save(); g.translate(256, 0);
    g.fillStyle = '#d44a3a'; g.fillRect(10, 12, 5, 14); g.fillRect(16, 12, 5, 14);
    g.strokeStyle = '#e8d84a'; g.beginPath(); g.moveTo(13, 12); g.quadraticCurveTo(16, 4, 20, 8); g.stroke();
    g.fillStyle = '#ffd84d'; g.fillRect(19, 6, 3, 3);
    g.restore();
    g.save(); g.translate(288, 0);
    g.fillStyle = '#2f2f36'; g.beginPath(); g.arc(16, 19, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c2a13a'; g.fillRect(7, 17, 18, 3);
    g.strokeStyle = '#e8d84a'; g.beginPath(); g.moveTo(16, 10); g.quadraticCurveTo(20, 4, 24, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(13, 15, 3, 0, Math.PI * 2); g.fill();
    g.restore();

    const tex = this.textures.addCanvas('chars', cv);
    if (tex) {
      for (const [name, f] of Object.entries(frames)) tex.add(name, 0, f * 32, 0, 32, 32);
      tex.refresh();
    }

    // glow (for torches / explosions)
    const gc = document.createElement('canvas'); gc.width = gc.height = 64;
    const gg = gc.getContext('2d')!;
    const gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
    this.textures.addCanvas('glow', gc)?.refresh();

    // spark particle
    const sc = document.createElement('canvas'); sc.width = sc.height = 8;
    const sg = sc.getContext('2d')!;
    sg.fillStyle = '#fff'; sg.beginPath(); sg.arc(4, 4, 3.5, 0, Math.PI * 2); sg.fill();
    this.textures.addCanvas('spark', sc)?.refresh();
  }

  private drawCart(g: CanvasRenderingContext2D) {
    g.fillStyle = '#6a4522'; g.fillRect(5, 12, 22, 13);
    g.fillStyle = '#8a5c30'; g.fillRect(5, 12, 22, 3);
    g.fillStyle = '#4a3018'; g.fillRect(7, 16, 18, 8);
    g.fillStyle = '#3a3a40';
    g.beginPath(); g.arc(10, 27, 3.5, 0, Math.PI * 2); g.arc(22, 27, 3.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8b8b96';
    g.beginPath(); g.arc(10, 27, 1.5, 0, Math.PI * 2); g.arc(22, 27, 1.5, 0, Math.PI * 2); g.fill();
  }

  // =============== ITEM ICONS (dataURLs for the DOM HUD) ===============
  private makeIcons() {
    const icons: Record<string, string> = {};
    const mk = (fn: (g: CanvasRenderingContext2D) => void): string => {
      const c = document.createElement('canvas'); c.width = c.height = 24;
      const g = c.getContext('2d')!;
      fn(g);
      return c.toDataURL();
    };
    const gemIcon = (color: number) => mk(g => {
      const c = hx(color);
      for (const [x, y, s] of [[3, 9, 9], [12, 5, 8], [11, 13, 7]]) {
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(x + s / 2, y); g.lineTo(x + s, y + s / 2); g.lineTo(x + s / 2, y + s); g.lineTo(x, y + s / 2);
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + s / 2 - 1, y + 2, 2, 2);
      }
    });
    const barIcon = (color: number) => mk(g => {
      g.fillStyle = hx(color);
      g.beginPath(); g.moveTo(4, 16); g.lineTo(7, 9); g.lineTo(19, 9); g.lineTo(22, 16); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(8, 10, 8, 2);
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.stroke();
    });
    const pickIcon = (color: string) => mk(g => {
      g.strokeStyle = '#7a5a34'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(6, 20); g.lineTo(16, 8); g.stroke();
      g.strokeStyle = color; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(8, 4); g.quadraticCurveTo(17, 3, 21, 11); g.stroke();
    });

    for (const it of ITEMS) {
      if (it.kind === 'ore') icons[it.id] = gemIcon(it.color);
      else if (it.kind === 'bar') icons[it.id] = barIcon(it.color);
    }
    icons['gunpowder'] = mk(g => {
      g.fillStyle = '#555049';
      g.beginPath(); g.moveTo(4, 20); g.quadraticCurveTo(12, 6, 20, 20); g.closePath(); g.fill();
      g.fillStyle = '#6a655c'; g.fillRect(10, 9, 3, 3);
    });
    icons['dynamite'] = mk(g => {
      g.fillStyle = '#d44a3a'; g.fillRect(7, 8, 4, 12); g.fillRect(13, 8, 4, 12);
      g.strokeStyle = '#e8d84a'; g.beginPath(); g.moveTo(9, 8); g.quadraticCurveTo(12, 2, 16, 5); g.stroke();
    });
    icons['bigBlast'] = mk(g => {
      g.fillStyle = '#2f2f36'; g.beginPath(); g.arc(12, 14, 8, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e8d84a'; g.beginPath(); g.moveTo(12, 6); g.quadraticCurveTo(16, 1, 20, 4); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(9, 11, 2.5, 0, Math.PI * 2); g.fill();
    });
    icons['megaBomb'] = mk(g => {
      g.fillStyle = '#2f2f36'; g.beginPath(); g.arc(12, 14, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c2a13a'; g.fillRect(3, 12, 18, 4);
      g.strokeStyle = '#e8d84a'; g.beginPath(); g.moveTo(12, 5); g.quadraticCurveTo(17, 0, 21, 3); g.stroke();
    });
    icons['nuke'] = mk(g => {
      g.fillStyle = '#e8c93d'; g.fillRect(5, 4, 14, 17);
      g.fillStyle = '#c2a13a'; g.fillRect(5, 4, 14, 3); g.fillRect(5, 18, 14, 3);
      g.fillStyle = '#1a1a1e';
      g.beginPath(); g.arc(12, 12, 4.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8c93d'; g.beginPath(); g.arc(12, 12, 1.5, 0, Math.PI * 2); g.fill();
    });
    icons['track'] = mk(g => {
      g.fillStyle = '#6d5330'; for (let x = 2; x < 24; x += 6) g.fillRect(x, 6, 3, 12);
      g.fillStyle = '#9aa0ac'; g.fillRect(0, 8, 24, 2); g.fillRect(0, 15, 24, 2);
    });
    icons['torch'] = mk(g => {
      g.fillStyle = '#7a5a34'; g.fillRect(10, 10, 3, 11);
      g.fillStyle = '#ff8a2e'; g.beginPath(); g.ellipse(11.5, 7, 4, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd84d'; g.beginPath(); g.ellipse(11.5, 8, 2, 3, 0, 0, Math.PI * 2); g.fill();
    });
    icons['pick2'] = pickIcon('#e8944a');
    icons['pick3'] = pickIcon('#c9c9d4');
    icons['pick4'] = pickIcon('#9aa8bd');
    icons['pick5'] = pickIcon('#5ee6e0');
    const bag = mk(g => {
      g.fillStyle = '#8a6a3e';
      g.beginPath(); g.moveTo(5, 9); g.quadraticCurveTo(3, 21, 12, 21); g.quadraticCurveTo(21, 21, 19, 9); g.closePath(); g.fill();
      g.fillStyle = '#5a4426'; g.fillRect(7, 6, 10, 4);
      g.strokeStyle = '#5a4426'; g.beginPath(); g.moveTo(9, 6); g.quadraticCurveTo(12, 1, 15, 6); g.stroke();
    });
    icons['satchel1'] = bag; icons['satchel2'] = bag; icons['satchel3'] = bag;
    icons['cart'] = mk(g => {
      g.fillStyle = '#6a4522'; g.fillRect(3, 7, 18, 10);
      g.fillStyle = '#8a5c30'; g.fillRect(3, 7, 18, 2);
      g.fillStyle = '#3a3a40';
      g.beginPath(); g.arc(8, 19, 3, 0, Math.PI * 2); g.arc(17, 19, 3, 0, Math.PI * 2); g.fill();
    });
    icons['lantern'] = mk(g => {
      g.fillStyle = '#57575f'; g.fillRect(8, 4, 8, 3);
      g.fillStyle = '#ffd84d'; g.fillRect(7, 7, 10, 11);
      g.fillStyle = '#fff3b0'; g.fillRect(10, 9, 4, 6);
      g.fillStyle = '#57575f'; g.fillRect(8, 18, 8, 3);
    });

    this.registry.set('icons', icons);
  }
}
