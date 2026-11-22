# Boundless Crown — core-loop prototype

Phone-first, single-page HTML5 canvas prototype (vanilla JS, no build step, no CDN). Art is drawn in code.

**Play:** https://johnsonswork-star.github.io/boundless-crown/  (add `?seed=123` for a repeatable map)

## Modes
The title screen offers **Endless** and **Challenge**.

- **Endless** is the original game: survive as long as you can. There is no score and no finish line. (This path is kept separate so later multiplayer can hook into it cleanly.)
- **Challenge** is a scored run. Survive **20 nights** (`TUNE.challengeNights`) to win — Blood Moons on nights 10 and 20 fall inside the run. Before you start, a loadout screen lets you toggle any number of **Curses** (harder, higher score) and **Blessings** (helpful, lower score). The live combined multiplier (the product of every toggle) is shown as you pick. Locked cards stay greyed until you reach nights 5, 10, 15, or 20 in any Challenge run; that progress is saved in `localStorage` under `bc-challenge-unlocks`. `window.__bc.unlockAll()` / `resetUnlocks()` are there for QA.

### Scoring (Challenge only)
Each survived night adds three parts, same shape as Thronefall:

- **+100** for the night.
- **Realm Protected** up to **+250** = `250 × (buildings still standing / buildings at nightfall)²`. Each wall segment counts. If you had no buildings, you get the full 250.
- **Time Bonus** up to **+250** if the wave is cleared within **5 s** of the last spawn. It then falls **linearly** to 0 at **90 s**, and is 0 after that: `250 × (90 − t) / 85`. (Thronefall used a squared falloff; Chris asked for a linear scale-down.)

**Unspent coins × 10**, the curse/blessing multiplier, and a **×1.1** no-restart bonus apply **only on a win**. Defeat still shows those lines, marked as not applied, and the final score is just the base. Retrying the same loadout from the end screen drops the no-restart bonus. A HUD chip shows the running base and the multiplier during the run.

Pacifist Pact: the monarch cannot attack; player buildings, archers, and workers have **2× health and 2× damage** (the current game.wiki description of live Thronefall Pacifist Pact). No Walls is a hard ban on walls and gates. No Towers and No Units make those options very expensive rather than banned.

## Controls
- **Drag anywhere** on the map: virtual joystick, the monarch walks that way (WASD/arrows on desktop).
- **Auto-attack:** the monarch hits the nearest enemy in reach. **Tap an enemy** to focus it.
- **Tap a hired worker** (villager, builder, farmer or archer) to select them — a gold ring and a **Tap where to send** hint appear. The next tap on **your land** sends them walking there (a small gold pin marks the destination). Archers take that spot as a new guard post; builders, farmers and villagers walk there, then resume their work from the new place. A tap on unowned land is refused (a toast says so) and they stay selected. Tap the same worker again, tap **Cancel**, or wait (`TUNE.sendTimeout` 6 s) to deselect. Tapping another worker switches the selection. Dragging is unchanged: a one-finger drag is still the joystick (or a camera pan in build mode) — there is no drag-to-send.
- **Bottom bar (portrait):**
  - **Build** opens Wall 4 · Gate 6 · Tower 12 · Farm 8 · House 6 · Hammer stand 3 · Bow stand 5 · Scythe stand 5 · **Clear** (tree 1 / rock 2) · **Demolish** (free). Pick a building, then tap inside your land (or **drag** when Wall is selected). You pay and a **scaffold** appears, and a free **Builder** walks over and builds it (progress bar). With no builder it stays a scaffold. Build stays selected for repeats; tap **Cancel** (same button, or Esc) to stop. In build mode, a **one-finger drag** pans the camera (a short tap still places); **two fingers** pan and pinch-zoom. While dragging a Wall, the map **auto-scrolls** if your finger is near the screen edge. **Clear** lets you tap trees and rocks to mark them; a short tap still marks, a drag still pans. **Demolish** marks a player building with a red X; a Builder tears it down over a few seconds (no refund). Tap the same building again or Cancel to unmark. The Keep cannot be demolished.
  - **Walls** are click-and-drag: press and drag to preview a line of segments and the total cost, then release to order them all. Cancel drops the preview without placing. Build mode does not steer the joystick or start a pinch.
  - **Gates** can be placed on their own or by tapping an existing Wall (you pay the difference). Friendly units and the monarch walk through; the Pale Host is blocked and attacks a gate like a wall. The sprite opens when your people are near and closes when they leave. Builders repair gates.
  - **Drop coin** drops one coin at the monarch's feet; **hold** to keep dropping (Space on desktop). The coin falls, and the nearest valid target claims it: a **marked tree or rock** (from up to mark range, 170), a **vagrant** (recruited, if you have housing) or a **tool stand**. Unclaimed coins stay on the ground; walk away and back over them to pick them up.
  - **Rally** makes nearby archers follow you; tap again to send them back to guard.
- **Pinch with two fingers** to zoom (clamped in `TUNE`). The zoom stays centered on the pinch midpoint, then the camera eases back to the monarch. Two fingers never move the joystick or drop a coin. On desktop, the **mouse wheel** zooms toward the cursor. The HUD does not scale.
- `?debug=1` shows the old ⏭ day/night skip (and `N` key). It is hidden in normal play.

## Kingdom economy (Two Crowns style)
- **Vagrants** live at the **Vagrant camp**, which is only ever placed on **unowned** land (wild or Pale), just inside the nearest such region toward home (an edge arrow points to it). New ones show up every 18 s (max 4). Drop a coin on one and they walk home as a **Villager**. The camp never sits in a player-owned region: if you capture or retake its region, the camp disappears at once with a puff, and unhired vagrants relocate to the nearest remaining unowned camp spot — or vanish if no unowned land is left. Hired workers are not moved. If every region is yours, no camp is spawned. A camp can return if a region later falls out of your hands.
- **Starting coins:** a new game starts with **3 coins** in the purse (`TUNE.startCoins`) and no loose coins on the ground.
- **Housing:** the keep gives no slots (`TUNE.keepSlots` 0). Every built **House** holds 1 worker at wood, 2 at stone, and 3 at iron (`TUNE.houseSlotsByLevel`); the hire cap is the sum of finished houses. You start with the keep, 1 House and 1 **Builder** (1/1 used) — no pre-built stands, walls, towers or farms. The vagrant camp starts in the nearest unowned region and will never sit on land you own. Every villager, builder, farmer, miner and archer counts. With housing full, hiring is refused: a toast says **Build a house to hire more**, and the dropped coin stays on the ground (it is taken as soon as a House finishes if it is still by the vagrant).
- **Tool stands** are build orders (Hammer 3, Bow 5, Scythe 5, Pickaxe 5 in `TUNE.standCost` — the Hammer stand is cheap so you can get going). A Builder raises the scaffold, then drop coins on the finished stand to stock tools: **Bow 4** → Archer, **Hammer 3** → Builder, **Scythe 4** → Farmer, **Pickaxe 4** → Miner (prices on `TOOL`). Each stand shows its stock as tools hanging on the rack — one sprite per item, up to `TUNE.standMax` (3) — readable at phone distance. An empty stand is a bare rack, with no count bubble. Coins you are dropping still appear as payment glyphs on the stand. An idle villager walks over and takes one, and the count drops. A new Farmer who has no farm yet waits near the keep until you build one. A Miner walks to an owned stone or iron mine and works it.
- **Trees and rocks** block building until a Builder clears them. Tap one near the monarch (or choose **Clear** in the Build menu, then tap) to mark it in one tap: **1** coin for a tree or **2** for a rock is taken from your purse immediately (`TUNE.treeCost` / `TUNE.rockCost`), a small axe/pick marker appears, and a brief −1 / −2 floats up. If you cannot afford it, a toast says **Need 1 coin** or **Need 2 coins** and nothing is marked. Tap a marked tree or rock again to cancel and refund. A Builder then chops or breaks it (progress bar). A felled tree drops **2** coins and a broken rock drops **3** (`TUNE.treeCoin` / `TUNE.rockCoin`), so you net one coin. Walk over the coins to pick them up.
- **Demolish** (Build menu, free) marks one of your buildings with a red X sign. A Builder walks over and tears it down (`TUNE.demoTime` 4 s, progress bar), then it is removed with **no refund**. Tap the mark again or Cancel to unmark it. The Keep / home banner cannot be demolished (a toast says so). Demolishing a house evicts any workers over the new housing cap back to vagrants. Demolishing a tool stand drops its leftover stock (and any partial payment) as coins on the ground.
- **Builders** build scaffolds, raise paid upgrades, tear down demolish marks, clear marked trees and rocks, and by day they repair damaged buildings and banners.
- **Pathfinding:** Walking units (vagrants, villagers, builders, farmers, miners, archers, and the Pale Host) route around finished buildings and banners on a coarse grid (`TUNE.navCell` 16). If someone gets stuck they repath and step back onto walkable ground. The monarch slides around anything they bump into. Trees and rocks still only block building, not walking.

## Building upgrades
Stand next to a finished building (or the keep). A coin slot shows the cost — **12** for stone, **20** for iron (`TUNE.upgradeCost`). One tap deducts the rest from the purse, the same as clearing a tree; a second tap before work starts refunds it. You can also drop coins on the mark. A Builder then raises the whole upgrade (`TUNE.upgradeTime`). The **Keep** starts at wood and caps every other building: nothing may rise above the keep's level. Stone needs an owned stone mine with a miner working it; iron needs the iron mine the same way. Each map places one of each mine on wild land outside the start area. If you lose the mine's land, finished upgrades stay, but new ones of that material stop. A lock icon gives the reason when something is gated (keep level, mine, or miner).
- **Houses** hold 1, then 2, then 3 workers.
- **Walls** upgrade a whole connected line at once for one flat 12 / 20 cost (not per segment). One builder job does the line.
- **Towers** start as a wood archer tower. At stone you pick a permanent path — **Cannon** (slow area damage) or **Ballista** (long range, pierces several) — from two large phone-sized buttons. Iron strengthens that same path. Captured forts stay archer nests (more shots at higher tiers, never cannon or ballista).
- **The keep** gains HP at each tier. Stone adds an archer on top who does not use a housing slot. No extra coin chest and no land expansion.
- **Farms** pay 1, then 2, then 3 coins per tick. Gates follow the same wood / stone / iron HP path. Iron walls and gates deal 8 spike damage back (`TUNE.wallSpikeDmg`).
- Placeholder drawings ship with the game for every tier, both tower branches, the mines, the miner, the pickaxe stand and a lock icon, keyed so official sprites can be swapped in later by the names in `art/upgrades/manifest.json`. Balance numbers live in `TUNE`.

- **Farms** pay +1 coin every 5 s by day, **only while a Farmer works them**. Passive income is now small (+1 per region every 10 s by day).
- The monarch does **not** regenerate health at night. Out of combat during the day they recover 4 HP/s (`TUNE.monarchRegen`), and dawn restores 40 HP.
- **Archers** do not follow by default. They guard posts (towers first, then banners, then walls), patrol around them by day and hold position at night, shooting anything in range.

## Night and the Pale Host
- Day lasts 60 s. Night ends **when every monster is slain** — not on a timer. The HUD shows the remaining host (living undead plus those still queued to spawn) instead of a countdown. Dawn triggers once the wave has actually started (so the short spawn delay at nightfall does not flash dawn) and both the spawn queue and the living host are empty, including skeletons the Necromancer raised. An empty wave never starts night. The monarch still does not regenerate until dawn. `?debug=1` skip jumps straight to the next phase. Each night the Pale Host enters from a fully random side (left, right, or both) with no pattern from earlier nights. With `?seed=` this is deterministic; otherwise it uses `Math.random`. The **Necromancer** comes only on every 10th day (day 10, 20, 30…), leading a blood-moon wave about twice as large (`TUNE.necroWaveMul`). A warning toast and Blood Moon HUD appear only on those nights; at the dawn of day 9 (19, 29…) a heads-up says the Necromancer comes tomorrow night. On a blood-moon night he picks the weakest, most exposed banner as the attack focus. While he lives the wave hits 25% harder and he **raises a skeleton every 5 s**. Kill him and the rest scatter, and a nearby Pale Warden is weakened by 40%. Ordinary nights are shamblers and skeletons only.
- Wave size: 2 + 7 × nights survived + 2 × (extra regions held), plus the necromancer.
- If undead destroy a region's banner, it turns **Pale Host**. Finished buildings flip to them (towers shoot you); unfinished scaffolds collapse. Kill the **Pale Warden** to retake it and get buildings back at 60% HP.
- Balance check (headless sim, 4 seeds): an undefended outpost falls on night 1–2; one tower + one archer falls around night 3–5; a region with the free Fort plus a tower can hold.

## Tuning
All knobs are in `TUNE` at the top of `game.js` (start coins, slots per house, gate cost, wall spacing, zoom min/max, costs, build times, farm rate, vagrant spawn, banner HP, wave scaling, necromancer raise rate, rally range, pathfinding grid and stuck-time). Per-tool stock prices are on `TOOL`.

## Visual style
The look is original and procedural (baked terrain plus pre-rendered canvas sprites — nothing is loaded from a CDN or taken from another game). It aims at the same read as a minimalist low-poly kingdom game: warm pastel grass and sand, soft blue water, terracotta roofs, chunky silhouettes, and gentle shadows.

- **Day** is a calm countryside. Owned land has a warm gold wash and a blue banner rim, wild land stays neutral olive, and Pale Host land is a grey-green fog with bare trees.
- **Night** eases in over a couple of seconds. A blue-purple veil covers the map, with warm light around the monarch, towers, forts, and keeps. Pale fires and the necromancer's staff burn green.
- **Buildings** are extruded stone and timber: wall segments, a roofed tower with an archer, the larger Encampment Fort, and a ruined Keep. Pale-occupied copies are ghostly grey with skull banners, not a flat recolor.
- **Units** are readable tokens: the crowned monarch on horseback with a cape, archers in green, a horned guardian, the taller Pale Warden, hunched shamblers in ragged tunics, bone skeletons with rusty blades, and a taller hooded necromancer with a violet orb. Pale Host sprites keep a dark rim so they read on day grass and through the night veil; night no longer covers them with filled ovals.
- **Effects** include arrow trails, a sword arc, hit flashes, death puffs, coin pops, and a capture ring.
- Terrain is cached on an offscreen canvas. Sprites, fog, and night lights are pre-rendered so the frame avoids per-entity shadow blurs and gradients. HUD, build-menu, and bottom-bar icons are chunky filled inline SVG (dark rim and a soft highlight), not emoji, so they still show on phones that don't render emoji. Tool-stand badges use the matching bow, hammer, and scythe.

## Placeholder / stubbed
- There is no audio. Challenge unlocks are the only save (localStorage).
- Units: Monarch, Vagrant, Villager, Builder, Farmer, Archer. Scout, Miner, Pikeman and Knight are not in yet. Archers don't hunt animals yet (there are none).
- Vagrants, villagers, builders, farmers, tool stands, farms, houses, scaffolds, coins and the vagrant camp are procedural sprites in the same warm low-poly style as the rest of the map.
- No Wood > Stone > Iron tech tiers, and the map has no fog of war or terrain.
- "Smart" undead only means focusing one target. They don't yet claim new regions or man towers on their own beyond the flip-on-loss.
- The map is a fixed 2400×2400 world, not infinite.

## Test hooks
`window.__bc`: `S` (state), `teleport(x,y)`, `coins(n)`, `heal()`, `forceLose(regionId)`, `skipPhase()`, `guardianOf(id)`, `w2s`/`s2w`, `zoom`/`scale`/`setZoomAt`, `planWallLine`/`commitWallLine`/`setWallDrag`, `placeUndead`, `timeScale` (set >1 to fast-forward), `TUNE`, `dropCoin()`, `workers()`, `housingCap()`, `toggleRally()`, `markNavDirty()`, `nearestWalkable()`, `astarPath()`, `nav`.
