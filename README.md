# CRITICAL DEPTH

*Dig deep. Blast deeper. End the world.*

A single-player 2D mining game (~6–7 hours to finish). You start at the mouth of a mine.
At the bottom of it — about a kilometre down — is the Cradle, an ancient socket that fits
exactly one apocalypse. Build it. Deliver it. Win, technically.

Built with Phaser 3 + TypeScript + Vite. All art and sound are generated at runtime — no assets.

## ▶ Play it

**https://andrewlocke2001-debug.github.io/critical-depth/** — desktop browser + keyboard required.
Progress autosaves in your browser (one slot per browser).

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5199
```

`npm run build` produces a static build in `dist/`.

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move — walk into rock to mine it |
| E | Use bench / crate / cradle · ride or leave the minecart |
| F | Lay cart track ahead (bridges chasms) |
| G | Pull up the track ahead |
| T | Plant a torch (permanent light) |
| 1 / 2 / 3 | Place Dynamite / Big Blast / Mega Bomb ahead (2.3s fuse — run) |
| I / M / H / B | Inventory · survey map · handbook · ordnance |
| N | Mute |

Autosaves every 15 seconds. One save slot.

## How the game flows (mild spoilers)

1. **Topsoil Galleries** — mine copper + coal, smelt bars, craft a Copper Pick.
2. **The Great Chasm (~200m)** — a gap only cart track can cross. Iron → tracks + minecart.
3. **Seal I (~285m)** — the old miners sealed each level. Coal + sulfur → gunpowder → dynamite.
   Blast the glittering cracked pockets you find — they hide huge ore caches.
4. **Deep Stoneworks** — silver, steel, Big Blasts → Seal II (~485m).
5. **Granite Abyss** — gold and crystal, Mega Bombs → Seal III (~705m).
6. **The Voidreach** — uranium and voidstone. Enrich rods, assemble **T.H.E. N.U.K.E.**
   (Total Habitat Elimination — Nuclear Underground Kinetic Event).
7. **The Core** — corestone yields only to Mega Bombs. Reach the Cradle. Press E. Watch.

The world is seeded per save — every New Game is a different mine, but always completable
(the resource chain for each gate always exists above that gate).

## Tuning the pacing

All the knobs live in [src/config.ts](src/config.ts):

- `PACE` — global multiplier on mining time (1.0 default; 1.3 makes the run noticeably longer)
- `MINE_TIME` — seconds per rock tier
- `SATCHEL_CAPS` — carry limits (smaller = more hauling trips)
- `WALK_MS` / `CART_MS` — movement speed
- Recipe quantities in [src/data/recipes.ts](src/data/recipes.ts) — the bomb chain
  (nuke = 3 mega = 6 big = 18 dynamite = 54 gunpowder) dominates total playtime
- World size / band depths / seal rows in `config.ts`, ore density in [src/world/gen.ts](src/world/gen.ts)

## Dev cheats

Open `http://localhost:5199/?dev=1`, then in the browser console:

```js
CD.give('dynamite', 10)   // any item id from src/data/items.ts
CD.tp(55, 300)            // teleport (x, y in tiles; y≈ depth/2)
CD.pickup(5)              // set pick tier
CD.reveal()               // reveal the survey map
CD.cradle()               // jump to the end chamber
CD.win()                  // roll credits
```
