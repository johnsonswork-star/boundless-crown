# Boundless Crown — core-loop prototype

Phone-first, single-page HTML5 canvas prototype (vanilla JS, no build step, no CDN). Placeholder art only.

**Play:** https://johnsonswork-star.github.io/boundless-crown/  (add `?seed=123` for a repeatable map)

## Controls
- **Drag anywhere** on the map: virtual joystick, the monarch walks that way (WASD/arrows on desktop).
- **Auto-attack:** the monarch hits the nearest enemy in reach. **Tap an enemy** to focus it.
- **Bottom bar:** 🧱 Wall (5) · 🗼 Tower (15) · 🏹 Archer (10) · ✖ Cancel. Pick Wall/Tower, then tap a spot inside your **blue** land. It stays selected for repeat placement until Cancel.
- **⏭ Night / ⏭ Day** (top right) is a debug skip. `N` on a keyboard does the same.

## Loop
- 7 Voronoi regions (seeded). You start with **Crownhold** (blue). Wild regions (green) each have a **Guardian**. Red arrows at the screen edge point to off-screen guardians.
- Kill a guardian to capture its region. Some regions include a free **Encampment Fort** (strong tower) or **Ruin Keep** (450 HP banner).
- Coins: +1 per owned region every 3 s by day, plus kills (undead 2, necromancer 10, guardian 15, warden 25).
- Day is 60 s, night is 45 s. At night an ordered wave of shamblers and skeletons comes from one direction (an unowned region or the map edge), led by a **Necromancer** (purple, ringed). While he lives they all focus one region's banner. Kill him and the rest wander chaotically, and any Pale Warden is weakened by 40%.
- Walls block undead, which stop and chew through them. Towers auto-shoot undead. Archers follow the monarch and shoot.
- If undead destroy a region's banner, the region turns **Pale Host** (grey). Your walls and towers stay but turn enemy (green, ☠), and enemy towers shoot you and your archers. A **Pale Warden** appears.
- Retake: kill the Warden (tougher than a guardian, and its towers fire on you). The region flips back and the buildings return to you at 60% HP.
- Game over (with Restart) when the monarch dies or every region is lost.

## Placeholder / stubbed
- All art is circles and rects. There is no audio and no save.
- Units are only the Monarch and Archer. Villager, Builder, Farmer, Scout and Miner are not in yet. Building is instant, with no builders.
- No Wood > Stone > Iron tech tiers, and the map has no fog of war or terrain.
- "Smart" undead only means focusing one target. They don't yet claim new regions or man towers on their own beyond the flip-on-loss.
- The map is a fixed 2400×2400 world, not infinite.

## Test hooks
`window.__bc`: `S` (state), `teleport(x,y)`, `coins(n)`, `heal()`, `forceLose(regionId)`, `skipPhase()`, `guardianOf(id)`, `w2s`/`s2w`.
