import type GameScene from '../scenes/GameScene';

// Force with ?touch=1, disable with ?touch=0, otherwise autodetect.
export function isTouchDevice(): boolean {
  const p = new URLSearchParams(location.search).get('touch');
  if (p === '1') return true;
  if (p === '0') return false;
  return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}

// Virtual thumbpad + action buttons for phones/tablets.
export class TouchControls {
  private root: HTMLDivElement;
  private padId = -1;
  private nub: HTMLDivElement;
  private pressTimer: number | null = null;
  private longPressed = false;

  constructor(private scene: GameScene, parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'touchui';
    this.root.innerHTML = `
      <div id="tpad" class="clickable"><div id="tpad-nub"></div></div>
      <div id="tbtns" class="clickable">
        <div class="trow">
          <button data-act="bag" aria-label="Inventory">🎒</button>
          <button data-act="journal" aria-label="Journal">📖</button>
          <button data-act="map" aria-label="Map">🗺️</button>
          <button data-act="bomb" aria-label="Bombs">🧨</button>
        </div>
        <div class="trow">
          <button data-act="torch" aria-label="Torch">🔥</button>
          <button data-act="track" aria-label="Track">🛤️</button>
          <button data-act="use" class="big" aria-label="Use">USE</button>
        </div>
      </div>`;
    parent.appendChild(this.root);
    this.root.addEventListener('contextmenu', e => e.preventDefault());

    const pad = this.root.querySelector<HTMLDivElement>('#tpad')!;
    this.nub = this.root.querySelector<HTMLDivElement>('#tpad-nub')!;
    pad.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { pad.setPointerCapture(e.pointerId); } catch { /* synthetic or stale pointer */ }
      this.padId = e.pointerId;
      this.padMove(pad, e);
    });
    pad.addEventListener('pointermove', e => { if (e.pointerId === this.padId) this.padMove(pad, e); });
    const padEnd = (e: PointerEvent) => { if (e.pointerId === this.padId) this.padReset(); };
    pad.addEventListener('pointerup', padEnd);
    pad.addEventListener('pointercancel', padEnd);

    for (const btn of this.root.querySelectorAll<HTMLButtonElement>('#tbtns button')) {
      const act = btn.dataset.act!;
      if (act === 'track') {
        // tap = lay track, hold = pull it up
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          this.longPressed = false;
          this.pressTimer = window.setTimeout(() => {
            this.longPressed = true;
            navigator.vibrate?.(25);
            this.scene.removeTrack();
          }, 450);
        });
        const end = (e: PointerEvent) => {
          e.preventDefault();
          if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null; }
          if (e.type === 'pointerup' && !this.longPressed) this.scene.placeTrack();
          this.longPressed = false;
        };
        btn.addEventListener('pointerup', end);
        btn.addEventListener('pointercancel', end);
        btn.addEventListener('pointerleave', () => { if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null; } });
      } else {
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          switch (act) {
            case 'use': this.scene.interact(); break;
            case 'torch': this.scene.placeTorch(); break;
            case 'bomb': this.scene.hud.toggle('bombs'); break;
            case 'bag': this.scene.hud.toggle('inv'); break;
            case 'journal': this.scene.hud.toggle('journal'); break;
            case 'map': this.scene.hud.toggle('map'); break;
          }
        });
      }
    }
  }

  private padMove(pad: HTMLDivElement, e: PointerEvent) {
    const r = pad.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const dead = r.width * 0.14;
    if (Math.hypot(dx, dy) < dead) {
      this.scene.touchDir = null;
    } else {
      this.scene.touchDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
    }
    const max = r.width * 0.32;
    const m = Math.hypot(dx, dy);
    if (m > max) { dx = (dx / m) * max; dy = (dy / m) * max; }
    this.nub.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private padReset() {
    this.padId = -1;
    this.scene.touchDir = null;
    this.nub.style.transform = 'translate(0, 0)';
  }
}
