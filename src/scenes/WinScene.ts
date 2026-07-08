import Phaser from 'phaser';
import type { Stats } from '../systems/save';
import { clearSave } from '../systems/save';
import { sfx } from '../systems/sound';

// The final cinematic: countdown in the dark, white flash, zoom out to the
// planet, watch it crack apart and detonate. Then stats + credits.
export default class WinScene extends Phaser.Scene {
  private stats!: Stats;
  private pages = 0;
  private pageTotal = 0;
  private relicCount = 0;
  private skipHint!: Phaser.GameObjects.Text;
  private stage = 0;

  constructor() { super('Win'); }

  init(data: { stats: Stats; pages?: number; pageTotal?: number; relicCount?: number }) {
    this.stats = data.stats;
    this.pages = data.pages ?? 0;
    this.pageTotal = data.pageTotal ?? 0;
    this.relicCount = data.relicCount ?? 0;
    this.stage = 0;
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor('#000');
    this.skipHint = this.add.text(W - 14, H - 12, 'SPACE — skip', {
      fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#555',
    }).setOrigin(1, 1).setDepth(100);

    this.input.keyboard?.on('keydown-SPACE', () => this.skip());
    this.stageCountdown();
  }

  private skip() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this.stage = 99;
    this.stageStats();
  }

  // ---- Stage 1: the countdown ----
  private stageCountdown() {
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;

    // the nuke, alone in the dark
    const glow = this.add.image(cx, cy + 40, 'glow').setScale(4).setTint(0xffd84d).setAlpha(0.25);
    const nuke = this.add.rectangle(cx, cy + 40, 46, 66, 0xe8c93d);
    this.add.rectangle(cx, cy + 12, 46, 10, 0xc2a13a);
    this.add.rectangle(cx, cy + 68, 46, 10, 0xc2a13a);
    const core = this.add.circle(cx, cy + 40, 12, 0x1a1a1e);
    this.add.circle(cx, cy + 40, 4, 0xff4747);

    this.add.text(cx, cy - 110, 'THE CRADLE ACCEPTS YOUR OFFERING.', {
      fontFamily: 'Consolas, monospace', fontSize: '18px', color: '#d8d4c8',
    }).setOrigin(0.5);

    const count = this.add.text(cx, cy - 60, '', {
      fontFamily: 'Consolas, monospace', fontSize: '52px', color: '#ff4747',
    }).setOrigin(0.5);

    let n = 5;
    const tick = () => {
      if (this.stage !== 0) return;
      if (n === 0) { this.stage = 1; this.stageBlast(); return; }
      count.setText(String(n));
      sfx.click();
      this.cameras.main.shake(180, 0.002 * (6 - n));
      this.tweens.add({ targets: [glow], alpha: 0.55, duration: 120, yoyo: true });
      this.tweens.add({ targets: [nuke, core], scaleX: 1.06, scaleY: 1.06, duration: 120, yoyo: true });
      n--;
      this.time.delayedCall(900, tick);
    };
    tick();
  }

  // ---- Stage 2: flash + planet destruction ----
  private stageBlast() {
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;
    sfx.win();
    this.cameras.main.shake(2500, 0.02);

    const flash = this.add.rectangle(cx, cy, W, H, 0xffffff).setDepth(50);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 1600, delay: 500,
      onComplete: () => {
        flash.destroy();
        this.children.removeAll(true);
        this.stagePlanet();
      },
    });
  }

  private stagePlanet() {
    if (this.stage === 99) return;
    const { width: W, height: H } = this.scale;
    const cx = W / 2, cy = H / 2;

    // starfield
    for (let i = 0; i < 140; i++) {
      const s = this.add.circle(Math.random() * W, Math.random() * H, Math.random() * 1.4 + 0.3, 0xffffff)
        .setAlpha(0.2 + Math.random() * 0.6);
      this.tweens.add({ targets: s, alpha: 0.1, duration: 600 + Math.random() * 1500, yoyo: true, repeat: -1 });
    }

    // the planet — a modest, doomed world
    const planet = this.add.container(cx, cy);
    const ball = this.add.circle(0, 0, 130, 0x3a6b4a);
    const sea = this.add.circle(-30, 20, 100, 0x2e4a7d).setAlpha(0.7);
    const land1 = this.add.ellipse(40, -40, 110, 70, 0x4a7d52);
    const land2 = this.add.ellipse(-55, -25, 70, 50, 0x55895e);
    const cap = this.add.ellipse(0, -112, 90, 34, 0xdfe8ee);
    const mountain = this.add.triangle(20, 30, 0, 22, 14, 0, 28, 22, 0x6b5a44);
    planet.add([ball, sea, land1, land2, cap, mountain]);
    planet.setScale(0.1).setAlpha(0);

    this.add.text(cx, 60, ' ', { fontSize: '16px' });
    const caption = this.add.text(cx, H - 70, 'Somewhere on this planet, a very deep mine.', {
      fontFamily: 'Consolas, monospace', fontSize: '15px', color: '#8a8578',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: planet, scale: 1, alpha: 1, duration: 2200, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: caption, alpha: 1, duration: 800, delay: 1400 });

    // pinprick of light at the mountain
    this.time.delayedCall(3200, () => {
      if (this.stage === 99) return;
      caption.setText('It is no longer a mine.');
      const spark = this.add.image(cx + 20, cy + 20, 'glow').setTint(0xffffcc).setScale(0.2);
      this.tweens.add({ targets: spark, scale: 1.2, duration: 500, yoyo: true, repeat: 2 });

      // cracks spread across the planet
      this.time.delayedCall(1700, () => {
        if (this.stage === 99) return;
        sfx.boom(3);
        this.cameras.main.shake(3000, 0.012);
        const cracks = this.add.graphics().setDepth(5);
        cracks.lineStyle(3, 0xffb84d, 1);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
          cracks.beginPath();
          let px = cx + 20, py = cy + 20;
          cracks.moveTo(px, py);
          for (let s = 0; s < 6; s++) {
            px += Math.cos(a + (Math.random() - 0.5) * 0.8) * 26;
            py += Math.sin(a + (Math.random() - 0.5) * 0.8) * 26;
            cracks.lineTo(px, py);
          }
          cracks.strokePath();
        }
        cracks.setAlpha(0);
        this.tweens.add({ targets: cracks, alpha: 1, duration: 900 });
        caption.setText('Ah.');

        // detonation
        this.time.delayedCall(2200, () => {
          if (this.stage === 99) return;
          sfx.win();
          const fire = this.add.image(cx + 20, cy + 20, 'glow').setTint(0xffa02e).setScale(0.5).setDepth(6);
          this.tweens.add({ targets: fire, scale: 16, duration: 1800, ease: 'Expo.easeIn' });
          this.cameras.main.shake(2000, 0.03);
          // planet chunks fly off
          for (let i = 0; i < 26; i++) {
            const a = Math.random() * Math.PI * 2;
            const chunk = this.add.polygon(cx, cy,
              [0, 0, 14 + Math.random() * 16, 6, 8, 18 + Math.random() * 10],
              [0x3a6b4a, 0x4a7d52, 0x2e4a7d, 0x6b5a44][i % 4]).setDepth(7);
            this.tweens.add({
              targets: chunk,
              x: cx + Math.cos(a) * (300 + Math.random() * 500),
              y: cy + Math.sin(a) * (300 + Math.random() * 500),
              angle: Math.random() * 720 - 360,
              alpha: 0,
              duration: 2600, delay: 900, ease: 'Cubic.easeOut',
            });
          }
          this.time.delayedCall(1200, () => planet.destroy());

          const flash2 = this.add.rectangle(cx, cy, W, H, 0xfff3d0).setDepth(20).setAlpha(0);
          this.tweens.add({
            targets: flash2, alpha: 1, duration: 900, delay: 800,
            onComplete: () => {
              this.tweens.add({
                targets: flash2, alpha: 0, duration: 2000,
                onComplete: () => { if (this.stage !== 99) this.stageStats(); },
              });
              this.children.each(c => { if (c !== flash2 && c !== this.skipHint) (c as Phaser.GameObjects.Shape).setVisible?.(false); });
            },
          });
        });
      });
    });
  }

  // ---- Stage 3: stats & credits ----
  private stageStats() {
    this.stage = 99;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    clearSave();

    const { width: W, height: H } = this.scale;
    const cx = W / 2;
    const mono = 'Consolas, monospace';

    const allPages = this.pageTotal > 0 && this.pages >= this.pageTotal;
    this.add.text(cx, 84, 'THE WORLD IS GONE.', {
      fontFamily: mono, fontSize: '40px', color: '#ffb84d', letterSpacing: 6,
    } as never).setOrigin(0.5);
    this.add.text(cx, 132, allPages
      ? 'You read every page. You knew exactly what you were finishing. Hale would have liked you.'
      : 'You won. Technically.', {
      fontFamily: mono, fontSize: allPages ? '14px' : '17px', color: allPages ? '#c8b890' : '#8a8578',
    }).setOrigin(0.5);

    const s = this.stats;
    const hrs = Math.floor(s.playMs / 3600000);
    const mins = Math.floor((s.playMs % 3600000) / 60000);
    const lines = [
      ['Time underground', `${hrs}h ${mins}m`],
      ['Blocks mined', String(s.mined)],
      ['Ore collected', String(s.oreCollected)],
      ['Bombs detonated', String(s.bombs)],
      ['Track laid', String(s.tracksLaid)],
      ['Torches placed', String(s.torchesPlaced)],
      ['Items crafted', String(s.crafted)],
      ['Journal pages', `${this.pages}/${this.pageTotal}${allPages ? ' — all of them' : ''}`],
      ['Relics recovered', `${this.relicCount}/6`],
      ['Deepest point', `${Math.max(0, (s.deepest - 8) * 2)}m`],
      ['Worlds destroyed', '1'],
    ];
    lines.forEach(([k, v], i) => {
      this.add.text(cx - 190, 178 + i * 26, k, { fontFamily: mono, fontSize: '14px', color: '#d8d4c8' });
      this.add.text(cx + 190, 178 + i * 26, v, { fontFamily: mono, fontSize: '14px', color: '#ffb84d' }).setOrigin(1, 0);
    });

    this.add.text(cx, H - 90, 'CRITICAL DEPTH', { fontFamily: mono, fontSize: '14px', color: '#555', letterSpacing: 4 } as never).setOrigin(0.5);

    const again = this.add.text(cx, H - 50, '[ DIG AGAIN ]', {
      fontFamily: mono, fontSize: '18px', color: '#7dde76',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    again.on('pointerover', () => again.setColor('#b8ffb0'));
    again.on('pointerout', () => again.setColor('#7dde76'));
    again.on('pointerup', () => { sfx.click(); this.scene.start('Menu'); });
  }
}
