# Boundless Crown — core-loop prototype

Phone-first, single-page HTML5 canvas prototype (vanilla JS, no build step, no CDN). Art is drawn in code.

**Play:** https://johnsonswork-star.github.io/boundless-crown/  (add `?seed=123` for a repeatable map)

## Controls
- **Drag anywhere** on the map: virtual joystick, the monarch walks that way (WASD/arrows on desktop).
- **Auto-attack:** the monarch hits the nearest enemy in reach. **Tap an enemy** to focus it.
- **Bottom bar (portrait):**
  - **Build** opens Wall 4 · Gate 6 · Tower 12 · Farm 8 · House 6 · Hammer stand 3 · Bow stand 5 · Scythe stand 5. Pick one, then tap inside your land (or **drag** when Wall is selected). You pay and a **scaffold** appears, and a free **Builder** walks over and builds it (progress bar). With no builder it stays a scaffold. Build stays selected for repeats; tap **Cancel** (same button, or Esc) to stop.
  - **Walls** are click-and-drag: press and drag to preview a line of segments and the total cost, then release to order them all. Cancel drops the preview without placing. Build mode does not steer the joystick or start a pinch.
  - **Gates** can be placed on their own or by tapping an existing Wall (you pay the difference). Friendly units and the monarch walk through; the Pale Host is blocked and attacks a gate like a wall. The sprite opens when your people are near and closes when they leave. Builders repair gates.
  - **Drop coin** drops one coin at the monarch's feet; **hold** to keep dropping (Space on desktop). The coin falls, and the nearest valid target within reach claims it: a **vagrant** (recruited, if you have housing) or a **tool stand**. Unclaimed coins stay on the ground; walk away and back over them to pick them up.
  - **Rally** makes nearby archers follow you; tap again to send them back to guard.
- **Pinch with two fingers** to zoom (clamped in `TUNE`). The zoom stays centered on the pinch midpoint, then the camera eases back to the monarch. Two fingers never move the joystick or drop a coin. On desktop, the **mouse wheel** zooms toward the cursor. The HUD does not scale.
- `?debug=1` shows the old ⏭ day/night skip (and `N` key). It is hidden in normal play.

## Kingdom economy (Two Crowns style)
- **Vagrants** live at the **Vagrant camp** just inside the nearest wild region (an edge arrow points to it). New ones show up every 18 s (max 4). Drop a coin on one and they walk home as a **Villager**.
- **Housing:** the keep gives 1 slot, every built **House** gives 2. You start with only the keep/banner, 1 House and 1 **Builder** (1/3 used) — no pre-built stands, walls, towers or farms. The vagrant camp still sits in the nearest wild region. Every villager, builder, farmer and archer counts. With housing full, vagrants ignore coins (the coin waits on the ground and is taken as soon as a House finishes).
- **Tool stands** are build orders (Hammer 3, Bow 5, Scythe 5 in `TUNE.standCost` — the Hammer stand is cheap so you can get going). A Builder raises the scaffold, then drop coins on the finished stand to stock tools: **Bow 4** → Archer, **Hammer 3** → Builder, **Scythe 4** → Farmer (prices on `TOOL`). Each stand shows a live stock badge (tool icon + number) that stays readable at any zoom, plus tools on the rack (max 3). An idle villager walks over and takes one, and the count drops.
- **Builders** build scaffolds, and by day they repair damaged buildings and banners.
- **Farms** pay +1 coin every 5 s by day, **only while a Farmer works them**. Passive income is now small (+1 per region every 10 s by day).
- **Archers** do not follow by default. They guard posts (towers first, then banners, then walls), patrol around them by day and hold position at night, shooting anything in range.

## Night and the Pale Host
- Day 60 s, night 45 s. The **Necromancer** picks the weakest, most exposed banner and marches from the nearest wild/Pale land. While he lives the wave hits 25% harder and he **raises a skeleton every 5 s**. Kill him and the rest scatter, and a nearby Pale Warden is weakened by 40%.
- Wave size: 2 + 7 × nights survived + 2 × (extra regions held), plus the necromancer.
- If undead destroy a region's banner, it turns **Pale Host**. Finished buildings flip to them (towers shoot you); unfinished scaffolds collapse. Kill the **Pale Warden** to retake it and get buildings back at 60% HP.
- Balance check (headless sim, 4 seeds): an undefended outpost falls on night 1–2; one tower + one archer falls around night 3–5; a region with the free Fort plus a tower can hold.

## Tuning
All knobs are in `TUNE` at the top of `game.js` (start coins, slots per house, gate cost, wall spacing, zoom min/max, costs, build times, farm rate, vagrant spawn, banner HP, wave scaling, necromancer raise rate, rally range). Per-tool stock prices are on `TOOL`.

## Visual style
The look is original and procedural (baked terrain plus pre-rendered canvas sprites — nothing is loaded from a CDN or taken from another game). It aims at the same read as a minimalist low-poly kingdom game: warm pastel grass and sand, soft blue water, terracotta roofs, chunky silhouettes, and gentle shadows.

- **Day** is a calm countryside. Owned land has a warm gold wash and a blue banner rim, wild land stays neutral olive, and Pale Host land is a grey-green fog with bare trees.
- **Night** eases in over a couple of seconds. A blue-purple veil covers the map, with warm light around the monarch, towers, forts, and keeps. Pale fires and the necromancer's staff burn green.
- **Buildings** are extruded stone and timber: wall segments, a roofed tower with an archer, the larger Encampment Fort, and a ruined Keep. Pale-occupied copies are ghostly grey with skull banners, not a flat recolor.
- **Units** are readable tokens: the crowned monarch on horseback with a cape, archers in green, a horned guardian, the taller Pale Warden, hunched shamblers, skeletons, and a robed necromancer.
- **Effects** include arrow trails, a sword arc, hit flashes, death puffs, coin pops, and a capture ring.
- Terrain is cached on an offscreen canvas. Sprites, fog, and night lights are pre-rendered so the frame avoids per-entity shadow blurs and gradients. HUD icons are inline SVG, not emoji, so they still show on phones that don't render emoji.

## Placeholder / stubbed
- There is no audio and no save.
- Units: Monarch, Vagrant, Villager, Builder, Farmer, Archer. Scout, Miner, Pikeman and Knight are not in yet. Archers don't hunt animals yet (there are none).
- Vagrants, villagers, builders, farmers, tool stands, farms, houses, scaffolds, coins and the vagrant camp are procedural sprites in the same warm low-poly style as the rest of the map.
- No Wood > Stone > Iron tech tiers, and the map has no fog of war or terrain.
- "Smart" undead only means focusing one target. They don't yet claim new regions or man towers on their own beyond the flip-on-loss.
- The map is a fixed 2400×2400 world, not infinite.

## Test hooks
`window.__bc`: `S` (state), `teleport(x,y)`, `coins(n)`, `heal()`, `forceLose(regionId)`, `skipPhase()`, `guardianOf(id)`, `w2s`/`s2w`, `zoom`/`scale`/`setZoomAt`, `planWallLine`/`commitWallLine`/`setWallDrag`, `placeUndead`, `timeScale` (set >1 to fast-forward), `TUNE`, `dropCoin()`, `workers()`, `housingCap()`, `toggleRally()`.
