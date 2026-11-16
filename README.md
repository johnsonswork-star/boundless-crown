# Boundless Crown — core-loop prototype

Phone-first, single-page HTML5 canvas prototype (vanilla JS, no build step, no CDN). Art is drawn in code.

**Play:** https://johnsonswork-star.github.io/boundless-crown/  (add `?seed=123` for a repeatable map)

## Controls
- **Drag anywhere** on the map: virtual joystick, the monarch walks that way (WASD/arrows on desktop).
- **Auto-attack:** the monarch hits the nearest enemy in reach. **Tap an enemy** to focus it.
- **Bottom bar:** Wall (5) · Tower (15) · Archer (10) · Cancel. Pick Wall/Tower, then tap a spot inside your land (warm ground with a blue rim). It stays selected for repeat placement until Cancel.
- **Night / Day** (top right) is a debug skip. `N` on a keyboard does the same.

## Loop
- 7 Voronoi regions (seeded). You start with **Crownhold** (blue). Wild regions (green) each have a **Guardian**. Red arrows at the screen edge point to off-screen guardians.
- Kill a guardian to capture its region. Some regions include a free **Encampment Fort** (strong tower) or **Ruin Keep** (450 HP banner).
- Coins: +1 per owned region every 3 s by day, plus kills (undead 2, necromancer 10, guardian 15, warden 25).
- Day is 60 s, night is 45 s. At night an ordered wave of shamblers and skeletons comes from one direction (an unowned region or the map edge), led by a **Necromancer** (purple, ringed). While he lives they all focus one region's banner. Kill him and the rest wander chaotically, and any Pale Warden is weakened by 40%.
- Walls block undead, which stop and chew through them. Towers auto-shoot undead. Archers follow the monarch and shoot.
- If undead destroy a region's banner, the region turns **Pale Host** (grey). Your walls and towers stay but turn enemy (green, ☠), and enemy towers shoot you and your archers. A **Pale Warden** appears.
- Retake: kill the Warden (tougher than a guardian, and its towers fire on you). The region flips back and the buildings return to you at 60% HP.
- Game over (with Restart) when the monarch dies or every region is lost.

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
- Units are only the Monarch and Archer. Villager, Builder, Farmer, Scout and Miner are not in yet. Building is instant, with no builders.
- No Wood > Stone > Iron tech tiers, and the map has no fog of war or terrain.
- "Smart" undead only means focusing one target. They don't yet claim new regions or man towers on their own beyond the flip-on-loss.
- The map is a fixed 2400×2400 world, not infinite.

## Test hooks
`window.__bc`: `S` (state), `teleport(x,y)`, `coins(n)`, `heal()`, `forceLose(regionId)`, `skipPhase()`, `guardianOf(id)`, `w2s`/`s2w`.
