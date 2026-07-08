import Phaser from 'phaser';
import { hasSave, clearSave } from '../systems/save';
import { sfx } from '../systems/sound';
import { isTouchDevice } from '../ui/touch';

export default class MenuScene extends Phaser.Scene {
  private el!: HTMLDivElement;

  constructor() { super('Menu'); }

  create() {
    const ui = document.getElementById('ui')!;
    this.el = document.createElement('div');
    this.el.id = 'menu';
    this.el.className = 'open clickable';
    const saved = hasSave();
    const controls = isTouchDevice()
      ? `Drag the <b>pad</b> to move — push into rock to mine it.<br>
         <b>USE</b> benches, crates, carts & the Cradle &nbsp;·&nbsp; <b>🛤️</b> lay track (hold to pull up)<br>
         <b>🔥</b> torch &nbsp;·&nbsp; <b>🧨</b> bombs &nbsp;·&nbsp; <b>🎒</b> inventory &nbsp;·&nbsp; <b>📖</b> journal &nbsp;·&nbsp; <b>🗺️</b> map<br><br>`
      : `<b>WASD / Arrows</b> move & mine &nbsp;·&nbsp; <b>E</b> interact / ride cart &nbsp;·&nbsp; <b>F</b> lay track &nbsp;·&nbsp; <b>G</b> remove track<br>
         <b>T</b> torch &nbsp;·&nbsp; <b>1/2/3</b> place bomb &nbsp;·&nbsp; <b>I</b> inventory &nbsp;·&nbsp; <b>J</b> journal &nbsp;·&nbsp; <b>M</b> map &nbsp;·&nbsp; <b>H</b> help &nbsp;·&nbsp; <b>N</b> mute<br><br>`;
    this.el.innerHTML = `
      <h1>CRITICAL DEPTH</h1>
      <div class="tag">DIG DEEP · BLAST DEEPER · END THE WORLD</div>
      <button id="btn-continue" ${saved ? '' : 'disabled'}>⛏ &nbsp;CONTINUE</button>
      <button id="btn-new">☢ &nbsp;NEW GAME</button>
      <div class="controls">
        ${controls}
        Reach the Heart of the Mountain. Build the N.U.K.E. Say goodbye.
      </div>`;
    ui.appendChild(this.el);

    this.el.querySelector('#btn-new')!.addEventListener('click', () => {
      sfx.click();
      if (hasSave() && !confirm('Start a new game? Your existing save will be erased.')) return;
      clearSave();
      this.launch(true);
    });
    this.el.querySelector('#btn-continue')!.addEventListener('click', () => {
      sfx.click();
      this.launch(false);
    });

    this.events.once('shutdown', () => this.el.remove());
  }

  private launch(fresh: boolean) {
    this.scene.start('Game', { fresh });
  }
}
