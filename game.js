/* Boundless Crown — playable core-loop prototype. Vanilla JS, no deps.
   Terrain is baked; units and buildings are procedural sprites. No external art. */
(() => {
'use strict';
const W = 2400, H = 2400, CX = W / 2, CY = H / 2;
const DAY = 60, NIGHT = 45, CELL = 8, GW = W / CELL, GH = H / CELL;
const COST = { wall: 4, tower: 12, farm: 8, house: 6, hall: 8 };
const NICE = { wall: 'Wall', tower: 'Tower', farm: 'Farm', house: 'House', hall: 'Hall', fort: 'Fort', gate: 'Gate', bow: 'Bow stand', hammer: 'Hammer stand', scythe: 'Scythe stand', pick: 'Pickaxe stand', clear: 'Clear', demolish: 'Demolish' };
const TOOL = {
  bow:    { cost: 4, role: 'archer',  label: 'Bow' },
  hammer: { cost: 3, role: 'builder', label: 'Hammer' },
  scythe: { cost: 4, role: 'farmer',  label: 'Scythe' },
  pick:   { cost: 4, role: 'miner',   label: 'Pickaxe' },
};
// Tuning knobs (Kingdom-style economy). All in one place for playtest iteration.
const TUNE = {
  startCoins: 3, keepSlots: 0, houseSlots: 1, startHouses: 1, startBuilders: 1,
  trickleEvery: 10,              // +1 coin per owned region every N s by day (small passive)
  dropRange: 64, pickupGrace: 0.6, standMax: 3,
  standCost: { bow: 5, hammer: 3, scythe: 5, pick: 5 }, // Build-menu price; Hammer is cheap so you can get going
  // Per-tool stock prices live on TOOL (Bow 4, Hammer 3, Scythe 4).
  gateCost: 6, wallSpacing: 34,
  zoomMin: 0.55, zoomMax: 2.4, zoomStart: 1,
  vagrantEvery: 18, vagrantMax: 4, vagrantStart: 2,
  buildTime: { wall: 4, tower: 8, farm: 5, house: 6, hall: 6, bow: 5, hammer: 4, scythe: 5, pick: 5, gate: 5 }, repairRate: 14,
  farmEvery: 5, farmCoins: 1,    // a worked farm pays farmCoins every farmEvery s, by day
  coreHome: 280, coreCaptured: 150, coreRetaken: 130, coreKeep: 320,
  bannerHp: 200, bannerR: 18, bannerPlantRange: 220,
  hallCost: 8, hallHp: 220, hallR: 20,
  claimWaveMul: 2,        // counterattack spawn count vs that night's regular wave
  claimFailScale: 0.25,   // +25% enemy count AND +25% HP/damage per failed attempt, compounding per zone
  waveBase: 2, wavePerNight: 7, wavePerRegion: 2,
  necroRaiseEvery: 5, leaderDmg: 1.25,
  necroWaveMul: 2, // every 10th day (10, 20, …) the wave is this many times larger and a Necromancer leads
  guardianLeash: 220, rallyRange: 280, folkSpeed: 72,
  monarchRegen: 4, // HP/s out of combat, day only — never at night
  treeCoin: 2, rockCoin: 3, // coins dropped when a Builder finishes a marked tree / rock
  treeCost: 1, rockCost: 2, // deducted from the purse on the mark tap (net profit vs treeCoin/rockCoin)
  clearTime: { tree: 4, rock: 5 }, // seconds for a Builder to chop or break
  clearMarkRange: 170, // monarch must be this close to mark a tree or rock
  demoTime: 4, // seconds for a Builder to tear down a marked building
  demoMarkRange: 170, // monarch must be this close to mark a building for demolish
  sendTimeout: 6, // seconds a hired-worker selection lasts with no send / re-tap
  navCell: 16,         // walkable grid cell size in world px
  navPad: 10,          // extra radius stamped around blocking footprints
  navStuckTime: 1.5,   // seconds of no progress before a repath / nudge
  navStuckDist: 6,     // movement counted as "progress" in that window
  navRepathMax: 6,     // new A* searches allowed per update tick
  navIterMax: 2500,    // A* node expansions cap
  navCache: 96,        // cached start-goal paths kept between rebuilds
  // Building upgrades (Wood / Stone / Iron). Level 1 uses today's build prices.
  upgradeCost: { 2: 12, 3: 20 },
  upgradeTime: 6,
  upgradeMarkRange: 170,
  keepHp: [280, 480, 720],
  keepR: [22, 26, 30],
  houseHp: [130, 220, 340],
  houseR: [18, 22, 26],
  houseSlotsByLevel: [1, 2, 3],
  wallHp: [160, 300, 480],
  wallR: [16, 17, 18],
  wallSpikeDmg: 8,
  gateHp: [140, 260, 400],
  gateR: [16, 17, 18],
  farmHp: [70, 110, 160],
  farmR: [24, 26, 28],
  farmCoinsByLevel: [1, 2, 3],
  fortHp: [260, 400, 600],
  fortR: [22, 26, 30],
  fortRange: [220, 260, 300],
  fortDmg: [13, 18, 24],
  fortArchers: [1, 2, 2],
  towerHp: { 1: 120, cannon: [220, 360], ballista: [200, 340] },
  towerR: { 1: 16, cannon: [20, 24], ballista: [18, 22] },
  towerRange: { 1: 220, cannon: [200, 230], ballista: [340, 420] },
  towerDmg: { 1: 12, cannon: [28, 44], ballista: [22, 34] },
  towerCd: { 1: 0.8, cannon: [2.4, 2.2], ballista: [1.6, 1.4] },
  towerAoe: { cannon: [56, 80], ballista: [0, 0] },
  towerPierce: { cannon: [0, 0], ballista: [3, 5] },
  challengeNights: 20,
  scoreNight: 100,
  scoreProtect: 250,
  scoreTime: 250,
  scoreTimeFull: 5,
  scoreTimeZero: 90,
  scoreCoin: 10,
  noRestartBonus: 1.1,
  blessPurseCoins: 6,
  blessHideHp: 40,
  blessSwift: 0.7,
  blessArrowRange: 1.4,
  blessHouseCost: 3,
  blessMending: 2,
  blessDawnHeal: 80,
  blessFieldCoins: 1,
  blessRoadEvery: 0.5,
  blessRoadMax: 2,
  blessSharpDmg: 8,
  blessStoneHp: 1.4,
  curseTurtleHp: 1.6,
  curseTigerDmg: 1.75,
  curseFalconSpeed: 1.75,
  curseSnakeCoin: 0.5,
  curseWaspNights: 3,
  curseWaspCount: 2,
  curseWaspSpawn: 1.25,
  cursePhoenixRate: 0.04,
  cursePhoenixCap: 15,
  curseEliteEvery: 4,
  curseEliteHp: 4,
  curseEliteDmg: 3,
  curseGrowthMax: 0.75,
  curseAfterlifeDelay: 4,
  curseChaosDelay: 3,
  curseDestroyRepair: 0.33,
  curseDestroyWait: 2,
  curseNoTowerMul: 3,
  curseNoUnitAdd: 10,
  curseRangeHp: 2,
  curseRangeDmg: 1.4,
  curseRangeSpd: 1.5,
  curseRangeRng: 1.7,
  curseRangeCd: 0.7,
  pacifistHp: 2,
  pacifistDmg: 2,
  monarchDmg: 22,
  archerDmg: 9,
  archerRange: 210,
  mineR: 22,
};

const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
const NAMES = ['Crownhold', 'Ashford', 'Briarmoor', 'Coldwater', 'Duskfen', 'Elmreach', 'Frostgate', 'Gloamwood'];
const UNDEAD = {
  shambler: { hp: 30, speed: 42, dmg: 6, r: 12, coin: 2, col: '#b9c9a3' },
  skeleton: { hp: 20, speed: 64, dmg: 5, r: 11, coin: 2, col: '#f4f4ee' },
  necro:    { hp: 90, speed: 40, dmg: 8, r: 15, coin: 10, col: '#7b35a8' },
};
const BLD = {
  wall:  { hp: 160, r: 16 },
  tower: { hp: 120, r: 16, range: 220, cd: 0.8, dmg: 12 },
  fort:  { hp: 260, r: 22, range: 220, cd: 0.8, dmg: 13 },
  farm:  { hp: 70, r: 24 },
  house: { hp: 130, r: 18 },
  hall:  { hp: 220, r: 20 },
  bow:    { hp: 90, r: 16 },
  hammer: { hp: 90, r: 16 },
  scythe: { hp: 90, r: 16 },
  pick:   { hp: 90, r: 16 },
  gate:   { hp: 140, r: 16 },
};
Object.assign(COST, TUNE.standCost);
COST.gate = TUNE.gateCost;
COST.hall = TUNE.hallCost;

// ---------- Challenge: curses, blessings, score, unlocks ----------
// Pacifist: monarch cannot attack; player buildings, archers, and workers
// have 2× health and 2× damage (game.wiki description of live Thronefall Pacifist Pact).
const CURSES = [
  { id: 'turtle', name: 'Turtle God', effect: 'Enemies have +60% health', mult: 1.4, unlock: 0 },
  { id: 'tiger', name: 'Tiger God', effect: 'Enemies deal +75% damage', mult: 1.2, unlock: 0 },
  { id: 'snake', name: 'Snake God', effect: 'Enemies drop half as many coins', mult: 1.3, unlock: 0 },
  { id: 'wasp', name: 'Wasp God', effect: 'First 3 nights: twice as many enemies, 25% faster spawns', mult: 1.2, unlock: 0 },
  { id: 'nowalls', name: 'No Walls Pact', effect: 'You cannot build walls or gates', mult: 1.1, unlock: 0 },
  { id: 'falcon', name: 'Falcon God', effect: 'Enemies move 75% faster', mult: 1.2, unlock: 5 },
  { id: 'phoenix', name: 'Phoenix God', effect: 'Enemies regenerate 4% health per second (max 15, not Necromancers)', mult: 1.3, unlock: 5 },
  { id: 'notowers', name: 'No Towers Pact', effect: 'Towers cost three times as much to build and upgrade', mult: 1.2, unlock: 5 },
  { id: 'death', name: 'God of Death', effect: 'Workers and archers take no action at night', mult: 1.2, unlock: 5 },
  { id: 'elite', name: 'Elite God', effect: 'Every 4th enemy is an elite with 4× health and 3× damage', mult: 1.75, unlock: 10 },
  { id: 'growth', name: 'Growth God', effect: 'Enemies grow stronger each night, up to +75% health and damage', mult: 1.5, unlock: 10 },
  { id: 'nounits', name: 'No Units Pact', effect: 'Bow stands and bows cost 10 more coins', mult: 1.4, unlock: 10 },
  { id: 'destruction', name: 'God of Destruction', effect: 'Builders repair at one-third speed; wrecked buildings leave rubble for an extra day', mult: 1.2, unlock: 10 },
  { id: 'afterlife', name: 'God of Afterlife', effect: 'Slain shamblers and skeletons return once after a short delay', mult: 1.5, unlock: 15 },
  { id: 'chaos', name: 'God of Chaos', effect: 'Enemies appear on your land and cannot attack for 3 seconds', mult: 1.45, unlock: 15 },
  { id: 'range', name: 'Range God', effect: 'Necromancers and Pale towers have much more range, health, and damage', mult: 1.2, unlock: 15 },
  { id: 'pacifist', name: 'Pacifist Pact', effect: 'The monarch cannot attack; your buildings and people have 2× health and damage', mult: 1.4, unlock: 15 },
  { id: 'choice', name: 'God of Choice', effect: 'Half of your build and upgrade options are locked for this run', mult: 1.1, unlock: 20 },
];
const BLESSINGS = [
  { id: 'dawn', name: 'Blessing of the Dawn', effect: 'Enemies have 20% less health and deal 20% less damage', mult: 0.6, unlock: 0 },
  { id: 'purse', name: 'Royal Purse', effect: 'Start the run with 6 extra coins', mult: 0.90, unlock: 0 },
  { id: 'hide', name: 'Iron Hide', effect: 'The monarch has 40 more health', mult: 0.90, unlock: 0 },
  { id: 'swift', name: 'Swift Builders', effect: 'Builders work 30% faster', mult: 0.88, unlock: 0 },
  { id: 'arrows', name: 'Keen Arrows', effect: 'Archers shoot 40% farther', mult: 0.90, unlock: 5 },
  { id: 'hearths', name: 'Cheap Hearths', effect: 'Houses cost 3 coins instead of 6', mult: 0.92, unlock: 5 },
  { id: 'mending', name: 'Mending Hands', effect: 'Builders repair twice as fast', mult: 0.92, unlock: 5 },
  { id: 'rest', name: 'Dawn Rest', effect: 'Dawn restores 80 more health to the monarch', mult: 0.92, unlock: 10 },
  { id: 'fields', name: 'Bountiful Fields', effect: 'Worked farms pay 1 extra coin', mult: 0.90, unlock: 10 },
  { id: 'road', name: 'Open Road', effect: 'Vagrants arrive twice as often, and two more can wait at camp', mult: 0.92, unlock: 10 },
  { id: 'sharp', name: 'Sharp Crown', effect: 'The monarch deals 8 more damage', mult: 0.90, unlock: 15 },
  { id: 'stone', name: 'Stone Walls', effect: 'Walls and gates have 40% more health', mult: 0.90, unlock: 15 },
];
const CHOICE_OPTS = ['wall', 'gate', 'tower', 'farm', 'house', 'hall', 'hammer', 'bow', 'scythe', 'pick',
  'upgrade-keep', 'upgrade-house', 'upgrade-wall', 'upgrade-tower-cannon', 'upgrade-tower-ballista', 'upgrade-farm'];
const UNLOCK_KEY = 'bc-challenge-unlocks';
let LO = { curses: new Set(), blessings: new Set() };
let lastChallenge = { curses: [], blessings: [] };
let unlockOverride = null;

function isChallenge() { return !!(S && S.mode === 'challenge'); }
function hasCurse(id) { return !!(S && S.curses && S.curses.indexOf(id) >= 0); }
function hasBless(id) { return !!(S && S.blessings && S.blessings.indexOf(id) >= 0); }
function catalogById(id) {
  return CURSES.find(c => c.id === id) || BLESSINGS.find(b => b.id === id) || null;
}
function loadoutMultiplier(curses, blessings) {
  let m = 1;
  for (const id of curses || []) { const c = CURSES.find(x => x.id === id); if (c) m *= c.mult; }
  for (const id of blessings || []) { const b = BLESSINGS.find(x => x.id === id); if (b) m *= b.mult; }
  return m;
}
function fmtMult(m) {
  const r = Math.round(m * 100) / 100;
  return '×' + r.toFixed(r >= 10 || Number.isInteger(r * 10) && Math.abs(r * 10 - Math.round(r * 10)) < 1e-6 ? 2 : 2);
}
function readUnlocks() {
  if (unlockOverride != null) return { bestNight: unlockOverride, debug: true };
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return { bestNight: 0 };
    const o = JSON.parse(raw);
    return { bestNight: Math.max(0, +o.bestNight || 0) };
  } catch (e) { return { bestNight: 0 }; }
}
function writeUnlocks(bestNight) {
  const cur = readUnlocks();
  const n = Math.max(cur.bestNight || 0, bestNight | 0);
  if (unlockOverride != null && unlockOverride >= n) return n;
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify({ bestNight: n })); } catch (e) {}
  return n;
}
function noteUnlock(nights) {
  if (!isChallenge()) return;
  const prev = readUnlocks().bestNight || 0;
  const n = writeUnlocks(nights);
  if (n > prev) {
    const freshly = [].concat(CURSES, BLESSINGS).filter(x => x.unlock > prev && x.unlock <= n);
    if (freshly.length) toast('Unlocked: ' + freshly.map(x => x.name).join(', '), 'good');
  }
}
function isUnlocked(entry) {
  if (!entry.unlock) return true;
  return (readUnlocks().bestNight || 0) >= entry.unlock;
}
function unlockAll() { unlockOverride = 99; }
function resetUnlocks() {
  unlockOverride = null;
  try { localStorage.removeItem(UNLOCK_KEY); } catch (e) {}
}

function buildCost(type) {
  let c = COST[type];
  if (c == null) return 0;
  if (type === 'house' && hasBless('hearths')) c = TUNE.blessHouseCost;
  if (type === 'tower' && hasCurse('notowers')) c = Math.round(c * (TUNE.curseNoTowerMul || 3));
  if (type === 'bow' && hasCurse('nounits')) c = c + (TUNE.curseNoUnitAdd || 10);
  return c;
}
function toolStockCost(kind) {
  let c = TOOL[kind] ? TOOL[kind].cost : 0;
  if (kind === 'bow' && hasCurse('nounits')) c += (TUNE.curseNoUnitAdd || 10);
  return c;
}
function workSpeed() { return hasBless('swift') ? (TUNE.blessSwift || 0.7) : 1; }
function repairSpeed() {
  let r = TUNE.repairRate;
  if (hasCurse('destruction')) r *= (TUNE.curseDestroyRepair || 0.33);
  if (hasBless('mending')) r *= (TUNE.blessMending || 2);
  return r;
}
function vagrantEvery() { return TUNE.vagrantEvery * (hasBless('road') ? (TUNE.blessRoadEvery || 0.5) : 1); }
function vagrantMax() { return TUNE.vagrantMax + (hasBless('road') ? (TUNE.blessRoadMax || 2) : 0); }
function monarchDamage() {
  if (hasCurse('pacifist')) return 0;
  return (TUNE.monarchDmg || 22) + (hasBless('sharp') ? (TUNE.blessSharpDmg || 8) : 0);
}
function archerDamage() {
  let d = TUNE.archerDmg || 9;
  if (hasCurse('pacifist')) d *= (TUNE.pacifistDmg || 2);
  return d;
}
function archerRangeOf() {
  return (TUNE.archerRange || 210) * (hasBless('arrows') ? (TUNE.blessArrowRange || 1.4) : 1);
}
function allyHpMul() { return hasCurse('pacifist') ? (TUNE.pacifistHp || 2) : 1; }
function allyDmgMul() { return hasCurse('pacifist') ? (TUNE.pacifistDmg || 2) : 1; }
function optionLocked(key) {
  return !!(S && S.choiceLocks && S.choiceLocks.indexOf(key) >= 0);
}
function pickChoiceLocks(rnd) {
  const roll = rnd || rand;
  const pool = CHOICE_OPTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (roll() * (i + 1)) | 0;
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  const n = Math.ceil(pool.length / 2);
  return pool.slice(0, n);
}

function timeBonus(dtSinceLastSpawn) {
  const fullAt = TUNE.scoreTimeFull || 5, zeroAt = TUNE.scoreTimeZero || 90, max = TUNE.scoreTime || 250;
  if (dtSinceLastSpawn <= fullAt) return max;
  if (dtSinceLastSpawn >= zeroAt) return 0;
  return Math.round(max * (zeroAt - dtSinceLastSpawn) / (zeroAt - fullAt));
}
function realmBonus(standing, total) {
  const max = TUNE.scoreProtect || 250;
  if (!total) return max;
  const r = standing / total;
  return Math.round(max * r * r);
}
function scoreBase(sc) { return (sc.nights || 0) + (sc.protected || 0) + (sc.time || 0); }
function finalScore(sc, applied) {
  const base = scoreBase(sc);
  if (!applied) return base;
  const coins = (sc.coinScore || 0);
  const m = sc.multiplier || 1;
  const nr = sc.noRestart ? (TUNE.noRestartBonus || 1.1) : 1;
  return Math.round((base + coins) * m * nr);
}

function refreshBuildMenu() {
  const menu = $('buildMenu');
  if (!menu) return;
  for (const btn of menu.querySelectorAll('button[data-act]')) {
    const act = btn.dataset.act;
    if (act === 'close' || act === 'clear' || act === 'demolish' || act === 'build') continue;
    const banned = (act === 'wall' || act === 'gate') && hasCurse('nowalls');
    const locked = optionLocked(act);
    btn.classList.toggle('locked-opt', !!(banned || locked));
    btn.disabled = !!(banned || locked);
    const i = btn.querySelector('i');
    if (!i || act === 'demolish') continue;
    if (act === 'clear') continue;
    if (COST[act] != null) {
      const c = buildCost(act);
      i.innerHTML = '<svg class="ico" viewBox="0 0 24 24"><use href="#i-coin"/></svg>' + c;
    }
  }
}

function renderLoadout() {
  const fill = (el, list, kind) => {
    if (!el) return;
    el.innerHTML = '';
    const picked = kind === 'curse' ? LO.curses : LO.blessings;
    for (const item of list) {
      const open = isUnlocked(item);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'loadout-card' + (open && picked.has(item.id) ? ' on' : '') + (open ? '' : ' locked');
      btn.dataset.id = item.id;
      btn.dataset.kind = kind;
      const copy = document.createElement('span');
      copy.className = 'copy';
      copy.innerHTML = '<span class="name"></span><span class="effect"></span>';
      copy.querySelector('.name').textContent = item.name;
      copy.querySelector('.effect').textContent = open ? item.effect : ('Reach night ' + item.unlock);
      btn.appendChild(copy);
      if (open) {
        const m = document.createElement('span');
        m.className = 'mult';
        m.textContent = fmtMult(item.mult);
        btn.appendChild(m);
      } else {
        const lock = document.createElement('span');
        lock.className = 'lock';
        lock.textContent = 'Reach night ' + item.unlock;
        btn.appendChild(lock);
      }
      btn.addEventListener('click', () => {
        if (!isUnlocked(item)) { toast('Reach night ' + item.unlock + ' in a Challenge run to unlock', 'bad'); return; }
        if (picked.has(item.id)) picked.delete(item.id); else picked.add(item.id);
        renderLoadout();
      });
      el.appendChild(btn);
    }
  };
  fill($('curseList'), CURSES, 'curse');
  fill($('blessList'), BLESSINGS, 'bless');
  const m = loadoutMultiplier([...LO.curses], [...LO.blessings]);
  $('loadoutMult').textContent = fmtMult(m);
  const n = TUNE.challengeNights || 20;
  $('loadoutGoal').textContent = 'Survive ' + n + ' nights';
}

// ---------- Endless account / cloud (v24) ----------
// Public API only. Challenge never calls this. No secrets in the client.
const BC_API = 'https://boundless-crown-api.pages.dev';
const SESSION_KEY = 'bc-endless-session';
const CLOUD = {
  api: BC_API,
  token: null,
  kingdom: null,
  world: null,
  offline: false,
  forceOffline: false,
  lastError: '',
  lastSaveOk: false,
  saving: false,
  dirty: false,
  lastSaveAt: 0,
};
function apiBase() { return (window.__bc && window.__bc._apiBase) || CLOUD.api || BC_API; }
function isEndlessCloud() { return !!(CLOUD.token && S && S.mode === 'endless'); }
function isWorldLive() {
  return !!(isEndlessCloud() && !CLOUD.forceOffline && WORLD && WORLD.ws && WORLD.ws.readyState === 1);
}
function worldInputBlocked() {
  return !!(S && S.mode === 'endless' && !isWorldLive());
}
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s && s.token) {
      CLOUD.token = s.token;
      CLOUD.kingdom = s.kingdom || null;
      CLOUD.world = s.world || null;
    }
  } catch (e) {}
}
function persistSession() {
  try {
    if (!CLOUD.token) { sessionStorage.removeItem(SESSION_KEY); return; }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      token: CLOUD.token,
      kingdom: CLOUD.kingdom,
      world: CLOUD.world,
    }));
  } catch (e) {}
}
function clearSession() {
  CLOUD.token = null;
  CLOUD.kingdom = null;
  CLOUD.world = null;
  CLOUD.dirty = false;
  CLOUD.lastSaveOk = false;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
}
function acceptSession(r) {
  CLOUD.token = r.token || CLOUD.token;
  CLOUD.kingdom = r.kingdom || CLOUD.kingdom;
  CLOUD.world = r.world || CLOUD.world;
  CLOUD.offline = false;
  CLOUD.lastError = '';
  persistSession();
  if (S && S.mode === 'endless' && CLOUD.kingdom && CLOUD.kingdom.spawn) S.worldSpawn = CLOUD.kingdom.spawn;
}
function acctMsg(text, cls) {
  const el = $('acctMsg');
  if (!el) return;
  if (!text) { el.hidden = true; el.textContent = ''; el.className = 'acct-msg'; return; }
  el.hidden = false;
  el.textContent = text;
  el.className = 'acct-msg' + (cls ? ' ' + cls : '');
}
function acctBusy(on) {
  for (const id of ['btnSignIn', 'btnSignUp', 'btnNeedRetry', 'btnNeedChallenge']) {
    const b = $(id); if (b) b.disabled = !!on;
  }
}
function humanApiError(err) {
  return ({
    name_taken: 'That kingdom name is taken.',
    bad_credentials: 'Wrong name or password.',
    bad_name: "Use 3–24 letters, numbers, spaces, or hyphens.",
    bad_password: 'Password must be 6–72 characters.',
    offline: 'Endless needs internet. Challenge works offline.',
    unauthorized: 'Please sign in again.',
    bad_response: 'The world sent a bad reply.',
  })[err] || (err ? String(err) : 'Something went wrong.');
}
async function api(path, opts) {
  opts = opts || {};
  if (CLOUD.forceOffline) {
    CLOUD.offline = true;
    CLOUD.lastError = 'offline';
    return { ok: false, error: 'offline', hint: 'Server unreachable' };
  }
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (CLOUD.token && !opts.noAuth) headers.Authorization = 'Bearer ' + CLOUD.token;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeout || 10000);
  try {
    const r = await fetch(apiBase() + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ac.signal,
    });
    const data = await r.json().catch(() => ({ ok: false, error: 'bad_response' }));
    clearTimeout(timer);
    CLOUD.offline = false;
    if (!data.ok) CLOUD.lastError = data.error || 'error';
    else CLOUD.lastError = '';
    return data;
  } catch (e) {
    clearTimeout(timer);
    CLOUD.offline = true;
    CLOUD.lastError = 'offline';
    return { ok: false, error: 'offline', hint: 'Server unreachable' };
  }
}
function updateCloudNote() {
  const el = $('cloudNote');
  if (!el) return;
  const chip = $('hKingdom');
  if (chip) {
    const on = isEndlessCloud();
    chip.hidden = !on;
    if (on) {
      const v = chip.querySelector('.val');
      if (v) v.textContent = CLOUD.kingdom.name || '';
    }
  }
  const worldBtn = $('btnWorld');
  if (worldBtn) worldBtn.hidden = !isEndlessCloud();
  el.hidden = true;
  el.textContent = '';
  el.className = '';
  updateReconnectUi();
}
function reconnectBannerText() {
  return WORLD && WORLD.ever ? 'Reconnecting to the world…' : 'Connecting to the world…';
}
function updateReconnectUi() {
  const el = $('reconnect');
  if (!el) return;
  const blocked = worldInputBlocked();
  el.hidden = !blocked;
  const ban = el.querySelector('.reconnect-banner');
  if (ban) ban.textContent = reconnectBannerText();
  if (blocked) {
    if (PUI && PUI.inspectId) closeInspect();
    if (PUI && PUI.worldOpen) closeWorld();
    if (S) S.dropHold = false;
    ptr = null;
    wallDrag = null;
    pinch = null;
    pts.clear();
  }
}
function plainCopy(obj, skip) {
  const o = {};
  if (!obj) return o;
  for (const k of Object.keys(obj)) {
    if (skip && skip.has(k)) continue;
    const v = obj[k];
    if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') o[k] = v;
    else if (Array.isArray(v) && v.every(x => x == null || typeof x !== 'object')) o[k] = v.slice();
  }
  return o;
}
function serializeKingdom() {
  if (!S || S.mode !== 'endless') return null;
  const groups = {};
  function groupId(g) {
    if (!g) return null;
    if (!g._sid) g._sid = 'ug' + (Object.keys(groups).length + 1);
    if (!groups[g._sid]) {
      groups[g._sid] = {
        id: g._sid, levelTo: g.levelTo, paid: g.paid, cost: g.cost, prog: g.prog,
        path: g.path || null, x: g.x, y: g.y, r: g.r, type: 'upgrade',
        memberIds: (g.members || []).map(m => m && m.id).filter(Boolean),
      };
    }
    return g._sid;
  }
  function jobRef(j) {
    if (!j) return null;
    if (j.type === 'upgrade' || (j.members && j.cost != null)) return { k: 'upg', id: groupId(j) };
    if (j.id && (j.type === 'core' || j.type === 'mine' || (S.buildings && S.buildings.includes(j)) || (S.stands && S.stands.includes(j)) || (S.mines && S.mines.includes(j))))
      return { k: 'id', id: j.id };
    if (j.kind === 'tree' || (S.trees && S.trees.includes(j))) return { k: 'tree', x: j.x, y: j.y };
    if (j.kind === 'rock' || (S.rocks && S.rocks.includes(j))) return { k: 'rock', x: j.x, y: j.y };
    return null;
  }
  function snapB(b) {
    const o = plainCopy(b, new Set(['upgGroup', 'farmer', 'miner', '_pickPath', '_sid', 'members']));
    if (b.farmer && b.farmer.id) o.farmerId = b.farmer.id;
    if (b.miner && b.miner.id) o.minerId = b.miner.id;
    if (b.upgGroup) o.upgG = groupId(b.upgGroup);
    return o;
  }
  const folk = S.folk.map((f, i) => {
    if (!f.id) f.id = 'f' + (i + 1);
    const o = plainCopy(f, new Set(['job', 'stand']));
    o.job = jobRef(f.job);
    o.stand = f.stand && f.stand.id ? { id: f.stand.id } : null;
    return o;
  });
  const archers = (S.archers || []).map(a => {
    const o = plainCopy(a, new Set(['post', 'tgt']));
    if (a.post && a.post.id && (S.buildings.includes(a.post) || S.stands.includes(a.post))) o.post = { k: 'id', id: a.post.id };
    else if (a.post) o.post = { k: 'pt', x: a.post.x, y: a.post.y, r: a.post.r, sent: a.post.sent };
    else o.post = null;
    return o;
  });
  const undead = (S.undead || []).map(u => plainCopy(u, new Set(['tgt'])));
  let leader = null;
  if (S.leader && S.undead) {
    const i = S.undead.indexOf(S.leader);
    if (i >= 0) leader = i;
  }
  return {
    v: 24,
    seed: S.seed,
    t: S.t,
    phase: S.phase,
    phaseT: S.phaseT,
    day: S.day,
    nights: S.nights,
    nightSpawned: !!S.nightSpawned,
    coins: S.coins,
    trickle: S.trickle,
    rally: !!S.rally,
    postT: S.postT || 0,
    over: !!S.over,
    kills: S.kills || 0,
    vagrantT: S.vagrantT,
    spawnT: S.spawnT,
    spawnGap: S.spawnGap,
    claimT: S.claimT,
    claimGap: S.claimGap,
    chaos: !!S.chaos,
    bloodMoon: !!S.bloodMoon,
    nightK: S.nightK || 0,
    waveSide: S.waveSide || null,
    waveSrc: S.waveSrc && typeof S.waveSrc === 'object' ? { x: S.waveSrc.x, y: S.waveSrc.y, side: S.waveSrc.side } : (S.waveSrc || null),
    spawnIndex: S.spawnIndex || 0,
    nextBid,
    worldSpawn: S.worldSpawn || (CLOUD.kingdom && CLOUD.kingdom.spawn) || null,
    stats: S.stats ? { ...S.stats } : {},
    monarch: plainCopy(S.monarch, new Set(['target'])),
    regions: (S.regions || []).map(r => {
      const o = plainCopy(r, new Set(['core']));
      o.core = r.core ? snapB(r.core) : null;
      return o;
    }),
    buildings: (S.buildings || []).map(snapB),
    mines: (S.mines || []).map(snapB),
    camp: S.camp ? { x: S.camp.x, y: S.camp.y, region: S.camp.region } : null,
    trees: (S.trees || []).map(t => plainCopy(t)),
    rocks: (S.rocks || []).map(t => plainCopy(t)),
    ponds: (S.ponds || []).map(t => plainCopy(t)),
    reeds: (S.reeds || []).map(t => plainCopy(t)),
    folk, archers, undead,
    guardians: (S.guardians || []).map(g => plainCopy(g)),
    drops: (S.drops || []).map(d => plainCopy(d)),
    rubble: (S.rubble || []).map(d => plainCopy(d)),
    returnQ: (S.returnQ || []).map(d => (typeof d === 'object' ? plainCopy(d) : d)),
    spawnQ: (S.spawnQ || []).slice(),
    claimQ: (S.claimQ || []).map(d => (typeof d === 'object' ? plainCopy(d) : d)),
    upgGroups: groups,
    leader,
  };
}
function applyKingdomState(state) {
  if (!state || typeof state !== 'object') return false;
  closeInspect();
  const byId = new Map();
  function reviveB(raw) {
    if (!raw) return null;
    const b = plainCopy(raw, new Set(['upgG', 'farmerId', 'minerId', 'farmer', 'miner', 'upgGroup']));
    if (raw.id) byId.set(raw.id, b);
    return b;
  }
  const buildings = (state.buildings || []).map(reviveB);
  const mines = (state.mines || []).map(reviveB);
  const regions = (state.regions || []).map(r => {
    const rr = plainCopy(r, new Set(['core']));
    rr.core = r.core ? reviveB(r.core) : null;
    return rr;
  });
  const trees = (state.trees || []).map(t => plainCopy(t));
  const rocks = (state.rocks || []).map(t => plainCopy(t));
  const ponds = (state.ponds || []).map(t => plainCopy(t));
  const reeds = (state.reeds || []).map(t => plainCopy(t));
  const folk = (state.folk || []).map(f => {
    const o = plainCopy(f, new Set(['job', 'stand']));
    o.job = null;
    o.stand = null;
    if (f.id) byId.set(f.id, o);
    return o;
  });
  const emptyStats = { towerShots: 0, paleTowerShots: 0, spawned: 0, captures: 0, losses: 0, retakes: 0,
    dropped: 0, recruits: 0, tools: 0, roles: 0, built: 0, farmCoins: 0, raised: 0, folkLost: 0, cleared: 0, clearCoins: 0 };
  S = {
    seed: state.seed,
    t: state.t || 0,
    phase: state.phase || 'day',
    phaseT: state.phaseT != null ? state.phaseT : DAY,
    day: state.day || 1,
    nights: state.nights || 0,
    nightSpawned: !!state.nightSpawned,
    coins: state.coins != null ? state.coins : TUNE.startCoins,
    trickle: state.trickle || 0,
    regions, buildings,
    archers: (state.archers || []).map(a => ({ ...plainCopy(a, new Set(['post', 'tgt'])), post: null })),
    undead: (state.undead || []).map(u => ({ ...plainCopy(u, new Set(['tgt'])), tgt: null })),
    guardians: (state.guardians || []).map(g => plainCopy(g)),
    fx: [],
    folk,
    drops: (state.drops || []).map(d => plainCopy(d)),
    stands: [],
    mines,
    camp: state.camp ? { ...state.camp } : null,
    vagrantT: state.vagrantT != null ? state.vagrantT : TUNE.vagrantEvery,
    rally: !!state.rally,
    dropHold: false, dropT: 0, postT: state.postT || 0,
    spawnQ: (state.spawnQ || []).slice(),
    spawnT: state.spawnT || 0,
    spawnGap: state.spawnGap || 1,
    claimQ: (state.claimQ || []).map(x => (x && typeof x === 'object' ? { ...x } : x)),
    claimT: state.claimT || 0,
    claimGap: state.claimGap || 1,
    leader: null,
    chaos: !!state.chaos,
    focus: null,
    waveSrc: state.waveSrc || null,
    build: null,
    over: !!state.over,
    kills: state.kills || 0,
    mapDirty: true,
    mode: 'endless',
    curses: [],
    blessings: [],
    choiceLocks: [],
    rubble: (state.rubble || []).map(x => plainCopy(x)),
    returnQ: (state.returnQ || []).map(x => (x && typeof x === 'object' ? { ...x } : x)),
    spawnIndex: state.spawnIndex || 0,
    score: null,
    stats: { ...emptyStats, ...(state.stats || {}) },
    monarch: {
      x: 0, y: 0, r: 16, hp: 120, max: 120, cd: 0, target: null, speed: 190, vx: 0, vy: 0, face: 0,
      ...(state.monarch || {}),
      target: null,
    },
    nightK: state.nightK || 0,
    waveSide: state.waveSide || null,
    bloodMoon: !!state.bloodMoon,
    trees, rocks, ponds, reeds,
    worldSpawn: state.worldSpawn || (CLOUD.kingdom && CLOUD.kingdom.spawn) || null,
    seeded: true,
    playRng: mulberry(((state.seed || 0) ^ 0xa5a5a5a5) >>> 0),
  };
  S.stands = S.buildings.filter(b => isStandType(b.type) || isStandType(b.tool));
  (state.folk || []).forEach((raw, i) => {
    const f = folk[i];
    if (!f) return;
    if (raw.stand && raw.stand.id) f.stand = byId.get(raw.stand.id) || null;
    if (raw.job) {
      if (raw.job.k === 'id') f.job = byId.get(raw.job.id) || null;
      else if (raw.job.k === 'tree') f.job = trees.find(t => t.x === raw.job.x && t.y === raw.job.y) || null;
      else if (raw.job.k === 'rock') f.job = rocks.find(t => t.x === raw.job.x && t.y === raw.job.y) || null;
    }
  });
  (state.buildings || []).forEach((raw, i) => {
    if (raw.farmerId && buildings[i]) buildings[i].farmer = byId.get(raw.farmerId) || null;
  });
  (state.mines || []).forEach((raw, i) => {
    if (raw.minerId && mines[i]) mines[i].miner = byId.get(raw.minerId) || null;
  });
  const groupObjs = {};
  const gSnap = state.upgGroups || {};
  for (const gid of Object.keys(gSnap)) {
    const g = gSnap[gid];
    const members = (g.memberIds || []).map(id => byId.get(id)).filter(Boolean);
    const grp = { members, levelTo: g.levelTo, paid: g.paid, cost: g.cost, prog: g.prog, path: g.path, x: g.x, y: g.y, r: g.r, type: 'upgrade', _sid: gid };
    groupObjs[gid] = grp;
    for (const m of members) m.upgGroup = grp;
  }
  (state.folk || []).forEach((raw, i) => {
    if (raw.job && raw.job.k === 'upg' && groupObjs[raw.job.id] && folk[i]) folk[i].job = groupObjs[raw.job.id];
  });
  (state.archers || []).forEach((raw, i) => {
    const a = S.archers[i];
    if (!a) return;
    if (raw.post && raw.post.k === 'id') a.post = byId.get(raw.post.id) || null;
    else if (raw.post && raw.post.k === 'pt') a.post = { x: raw.post.x, y: raw.post.y, r: raw.post.r, sent: raw.post.sent };
    else if (raw.post && typeof raw.post.x === 'number') a.post = { x: raw.post.x, y: raw.post.y, r: raw.post.r, sent: raw.post.sent };
    else a.post = null;
  });
  if (typeof state.leader === 'number' && S.undead[state.leader]) S.leader = S.undead[state.leader];
  nextBid = Math.max(state.nextBid || 1, 1);
  for (const id of byId.keys()) {
    const m = String(id).match(/^b(\d+)$/);
    if (m) nextBid = Math.max(nextBid, (+m[1]) + 1);
  }
  grid = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = regionIdAt(gx * CELL + CELL / 2, gy * CELL + CELL / 2);
  markNavDirty();
  bakeGround();
  $('title').hidden = true;
  $('loadout').hidden = true;
  if ($('account')) $('account').hidden = true;
  $('over').hidden = !S.over;
  $('hud').hidden = false;
  $('bar').hidden = !!S.over;
  if ($('hScore')) $('hScore').hidden = true;
  setBuild(null); showMenu(false); clearSel();
  refreshBuildMenu();
  $('btnRally').classList.toggle('sel', !!S.rally);
  zoom = TUNE.zoomStart; applyScale();
  lookX = S.monarch.x; lookY = S.monarch.y; lookFree = false;
  pinch = null; wallDrag = null; pts.clear(); ptr = null;
  clearToasts();
  const nm = (CLOUD.kingdom && CLOUD.kingdom.name) || 'your kingdom';
  toast('Welcome back, ' + nm + '.', 'good');
  updateCloudNote();
  return true;
}
function showNeedNet() {
  disconnectWorld();
  S = null;
  showOverlay('needNet');
  updateCloudNote();
}
async function openAccount() {
  acctMsg('');
  acctBusy(false);
  if (CLOUD.forceOffline) {
    CLOUD.offline = true;
    CLOUD.lastError = 'offline';
    showNeedNet();
    return;
  }
  showOverlay('account');
  const h = await api('/v1/health', { noAuth: true, timeout: 6000 });
  if (!h.ok) {
    CLOUD.offline = true;
    CLOUD.lastError = 'offline';
    showNeedNet();
  }
}
async function requestSignUp(name, password, opts) {
  opts = opts || {};
  acctBusy(true);
  const body = { name, password };
  if (opts.cell && opts.cell.lat != null && opts.cell.lon != null) {
    // Already snapped. Never attach raw coordinates.
    body.cell = { lat: opts.cell.lat, lon: opts.cell.lon };
  }
  const r = await api('/v1/signup', { method: 'POST', body, noAuth: true });
  acctBusy(false);
  if (!r.ok) {
    if (r.error === 'offline') showNeedNet();
    else acctMsg(humanApiError(r.error), 'bad');
    return r;
  }
  acceptSession(r);
  if (r.save && r.save.state) applyKingdomState(r.save.state);
  else {
    startEndless();
    if (CLOUD.kingdom && CLOUD.kingdom.spawn) S.worldSpawn = CLOUD.kingdom.spawn;
  }
  acctMsg('');
  requestSaveKingdom();
  updateCloudNote();
  return r;
}
async function requestSignIn(name, password) {
  acctBusy(true);
  const r = await api('/v1/signin', { method: 'POST', body: { name, password }, noAuth: true });
  acctBusy(false);
  if (!r.ok) {
    if (r.error === 'offline') showNeedNet();
    else acctMsg(humanApiError(r.error), 'bad');
    return r;
  }
  acceptSession(r);
  if (r.save && r.save.state) applyKingdomState(r.save.state);
  else {
    startEndless();
    if (CLOUD.kingdom && CLOUD.kingdom.spawn) S.worldSpawn = CLOUD.kingdom.spawn;
    requestSaveKingdom();
  }
  acctMsg('');
  updateCloudNote();
  return r;
}
async function requestSignOut() {
  if (CLOUD.token && !CLOUD.forceOffline) {
    try { await api('/v1/signout', { method: 'POST' }); } catch (e) {}
  }
  clearSession();
  updateCloudNote();
  showTitle();
}
let saveWaiters = [];
async function requestSaveKingdom() {
  if (!CLOUD.token || CLOUD.forceOffline) return { ok: false, error: CLOUD.forceOffline ? 'offline' : 'skipped' };
  if (!S || S.mode !== 'endless') return { ok: false, error: 'no_state' };
  if (CLOUD.saving) {
    CLOUD.saveQueued = true;
    return new Promise(resolve => saveWaiters.push(resolve));
  }
  CLOUD.saving = true;
  const state = serializeKingdom();
  if (!state) {
    CLOUD.saving = false;
    return { ok: false, error: 'no_state' };
  }
  const r = await api('/v1/kingdom', { method: 'PUT', body: { state } });
  CLOUD.saving = false;
  if (r.ok) {
    CLOUD.dirty = false;
    CLOUD.lastSaveAt = performance.now();
    CLOUD.lastSaveOk = true;
    CLOUD.offline = false;
  } else {
    CLOUD.lastSaveOk = false;
    if (r.error === 'unauthorized') clearSession();
  }
  updateCloudNote();
  if (CLOUD.saveQueued) {
    CLOUD.saveQueued = false;
    const r2 = await requestSaveKingdom();
    const waiters = saveWaiters.splice(0);
    for (const fn of waiters) fn(r2);
    return r2;
  }
  const waiters = saveWaiters.splice(0);
  for (const fn of waiters) fn(r);
  return r;
}
function maybeAutosave() {
  if (!isEndlessCloud() || !CLOUD.dirty || CLOUD.saving) return;
  if (performance.now() - (CLOUD.lastSaveAt || 0) < 15000) return;
  requestSaveKingdom();
}
loadSession();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') requestSaveKingdom();
});
window.addEventListener('pagehide', () => { requestSaveKingdom(); });

// ---------- Shared world (v25): city-cell spawn, live realms, walk anywhere ----------
const CELL_DEG = 0.2;
const CELL_WORLD = 8000;
function snapCell(lat, lon) {
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  const iLat = Math.round(la / CELL_DEG);
  const iLon = Math.round(lo / CELL_DEG);
  return {
    iLat,
    iLon,
    lat: Math.round(iLat * CELL_DEG * 10) / 10,
    lon: Math.round(iLon * CELL_DEG * 10) / 10,
  };
}
function cellCenter(cell) {
  return { x: cell.iLon * CELL_WORLD, y: cell.iLat * CELL_WORLD };
}
function cellWorldBounds(cell) {
  if (!cell) return null;
  const c = cell.iLat != null ? cell : snapCell(cell.lat, cell.lon);
  if (!c) return null;
  const mid = cellCenter(c);
  return { x0: mid.x - CELL_WORLD / 2, x1: mid.x + CELL_WORLD / 2, y0: mid.y - CELL_WORLD / 2, y1: mid.y + CELL_WORLD / 2, cx: mid.x, cy: mid.y };
}
function spawnInCell(spawn, cell) {
  const b = cellWorldBounds(cell);
  if (!b || !spawn) return false;
  return spawn.x >= b.x0 && spawn.x < b.x1 && spawn.y >= b.y0 && spawn.y < b.y1;
}

async function requestCityCell() {
  if (CLOUD.forceGeoDenied) return null;
  if (CLOUD.fakeGeo && CLOUD.fakeGeo.lat != null) {
    return snapCell(CLOUD.fakeGeo.lat, CLOUD.fakeGeo.lon);
  }
  if (!navigator.geolocation) return null;
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      });
    });
    // Snap immediately and drop the raw reading. Never keep exact coords.
    return snapCell(pos.coords.latitude, pos.coords.longitude);
  } catch (e) {
    return null;
  }
}

async function requestCreateKingdom() {
  acctMsg('This places your kingdom near others from your city. We only use a rough city-sized area — never your exact spot or address.', '');
  const cell = await requestCityCell();
  if (!cell) acctMsg('No city location — you will start at a random place in the world. You can still walk anywhere.', '');
  return requestSignUp($('acctName').value, $('acctPass').value, { cell });
}

const WORLD = {
  ws: null,
  room: '',
  realms: new Map(),
  zones: new Map(),
  wanted: false,
  ever: false,
  lastSt: 0,
  lastSig: '',
  lastPub: 0,
  backoff: 800,
  timer: 0,
  lastAlert: null,
  attackAlerts: new Set(),
};

function myWorldSpawn() {
  return (S && S.worldSpawn) || (CLOUD.kingdom && CLOUD.kingdom.spawn) || { x: 0, y: 0 };
}
function realmLocal(r) {
  const me = myWorldSpawn();
  const sp = r && r.spawn ? r.spawn : { x: 0, y: 0 };
  return { x: CX + (sp.x - me.x), y: CY + (sp.y - me.y) };
}
function monarchLocal(r) {
  const keep = realmLocal(r);
  if (r.mx == null || r.my == null) return keep;
  const me = myWorldSpawn();
  return { x: CX + (r.spawn.x + (r.mx - CX) - me.x), y: CY + (r.spawn.y + (r.my - CY) - me.y) };
}
function canWalkWorld() { return isWorldLive(); }

const ZONE_PAL = ['#e07a5f', '#81b29a', '#3d7ea6', '#e9c46a', '#9b5de5', '#00bbf9', '#f15bb5', '#f4a261'];
function kingdomColor(id) {
  let h = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ZONE_PAL[h % ZONE_PAL.length];
}
function myKingdomId() { return (CLOUD.kingdom && CLOUD.kingdom.id) || null; }
function worldFromLocal(x, y, spawn) {
  const sp = spawn || myWorldSpawn();
  return { x: (sp.x || 0) + (x - CX), y: (sp.y || 0) + (y - CY) };
}
function localFromWorld(wx, wy, spawn) {
  const sp = spawn || myWorldSpawn();
  return { x: CX + (wx - (sp.x || 0)), y: CY + (wy - (sp.y || 0)) };
}
function zoneKey(homeId, rid) { return String(homeId) + ':' + (rid | 0); }
function zoneHasHall(r) {
  if (!r) return false;
  if (r.gov) return true;
  const rid = r.id;
  return S.buildings.some(b => b.type === 'hall' && b.hp > 0 && ((b.region === rid && rid >= 0) || (r.zoneId && b.zoneId === r.zoneId)) && (b.built >= 1 || b.owner === 'rival'));
}
function hallOf(rid, zoneId) {
  return S.buildings.find(b => b.type === 'hall' && b.hp > 0 && ((zoneId && b.zoneId === zoneId) || (rid != null && b.region === rid)));
}
function packBldWorld(b) {
  const w = worldFromLocal(b.x, b.y);
  return { type: b.type, x: w.x, y: w.y, hp: b.hp, max: b.max, level: b.level || 1, path: b.path || null, built: b.built == null ? 1 : b.built, r: b.r, id: b.id || null };
}
function homeZonesPayload() {
  if (!S || !S.regions || !myKingdomId()) return [];
  const me = myKingdomId();
  const out = [];
  for (const r of S.regions) {
    if (!r || r.id === 0) continue;
    const hall = S.buildings.find(b => b.type === 'hall' && b.region === r.id && b.owner === 'player' && b.built >= 1 && b.hp > 0);
    const pos = worldFromLocal(r.x, r.y);
    out.push({
      id: zoneKey(me, r.id),
      region: r.id,
      wx: pos.x, wy: pos.y,
      name: r.name,
      gov: !!hall,
      govHp: hall ? hall.hp : null,
      govMax: hall ? hall.max : null,
      buildings: S.buildings.filter(b => b.region === r.id && b.type !== 'hall' && b.owner === 'player').map(packBldWorld),
    });
  }
  return out;
}
function sendZoneMsg(obj) {
  const ws = WORLD.ws;
  if (!ws || ws.readyState !== 1) return false;
  try { ws.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
}
function publishHomeZones() {
  if (!isEndlessCloud() || !S) return false;
  const zones = homeZonesPayload();
  WORLD.lastPub = performance.now();
  return sendZoneMsg({ t: 'zpub', zones });
}
function zoneAct(act, id, extra) {
  return sendZoneMsg(Object.assign({ t: 'zact', act, id }, extra || {}));
}
function owningZoneAt(x, y) {
  if (!S) return null;
  const pt = { x, y };
  if (S.regions && S.regions.length) {
    const rid = regionIdAt(x, y);
    const r = S.regions[rid];
    if (r && r.owner === 'player' && dist(r, pt) < 520) return { home: true, r, rid, x: r.x, y: r.y };
  }
  const me = myKingdomId();
  if (!me || !WORLD.zones) return null;
  let best = null, bd = 520;
  for (const z of WORLD.zones.values()) {
    if (z.state !== 'owned' || z.ownerId !== me) continue;
    const loc = localFromWorld(z.wx, z.wy);
    const d = dist(loc, pt);
    if (d < bd) { bd = d; best = { home: z.homeId === me, z, loc, x: loc.x, y: loc.y }; }
  }
  return best;
}
function alertZoneAttack(z) {
  if (!z) return;
  const key = z.id + ':' + (z.attackerId || 'x');
  WORLD.attackAlerts = WORLD.attackAlerts || new Set();
  if (WORLD.attackAlerts.has(key)) return;
  WORLD.attackAlerts.add(key);
  WORLD.lastAlert = { id: z.id, name: z.name, attackerId: z.attackerId, at: Date.now() };
  toast((z.name || 'Your land') + ' is under attack!', 'bad');
}
function stripForeign(zoneId) {
  if (!S) return;
  S.buildings = S.buildings.filter(b => b.zoneId !== zoneId);
  S.stands = S.stands.filter(st => S.buildings.includes(st) || st.zoneId !== zoneId);
}
function materializeForeignZone(z) {
  const me = myKingdomId();
  if (!S || !z || z.homeId === me) return;
  stripForeign(z.id);
  const loc = localFromWorld(z.wx, z.wy);
  z._lx = loc.x; z._ly = loc.y;
  if (z.gov && z.ownerId && z.ownerId !== me) {
    const hall = mkBld('hall', loc.x, loc.y, -1, 1);
    hall.owner = 'rival';
    hall.zoneId = z.id;
    hall.foreign = true;
    hall.hp = z.govHp != null ? z.govHp : hall.max;
    hall.max = z.govMax != null ? z.govMax : hall.max;
    S.buildings.push(hall);
  }
  for (const raw of (z.buildings || [])) {
    if (!raw || raw.type === 'hall') continue;
    const p = localFromWorld(raw.x, raw.y);
    const b = mkBld(raw.type, p.x, p.y, -1, raw.built == null ? 1 : raw.built);
    b.owner = (z.ownerId && z.ownerId !== me) ? 'rival' : 'player';
    b.zoneId = z.id;
    b.foreign = true;
    if (raw.hp != null) b.hp = raw.hp;
    if (raw.max != null) b.max = raw.max;
    if (raw.level) b.level = raw.level;
    if (raw.path) b.path = raw.path;
    if (raw.id) b.id = raw.id;
    S.buildings.push(b);
    if (isStandType(raw.type)) { b.tool = raw.type; S.stands.push(b); }
  }
}
function applyHomeParcel(z) {
  const me = myKingdomId();
  if (!S || !S.regions || !z || z.homeId !== me) return;
  const rid = z.region | 0;
  const r = S.regions[rid];
  if (!r || rid === 0) return;
  r.worldOwnerId = z.ownerId;
  r.worldOwnerName = z.ownerName;
  r.worldOwnerColor = z.ownerColor;
  r.gov = !!z.gov;
  if (z.underAttack && z.ownerId === me) alertZoneAttack(z);
  if (z.state === 'owned' && z.ownerId && z.ownerId !== me) {
    if (r.owner === 'player' || r.owner === 'contested') {
      r.owner = 'rival';
      r.core = null;
      r.claimFrom = null;
      r.claimQueued = false;
      S.buildings = S.buildings.filter(b => {
        if (b.region !== r.id) return true;
        if (b.type === 'hall') return false;
        b.owner = 'rival';
        b.zoneId = z.id;
        return true;
      });
      toast((r.name || 'Your land') + ' was taken by ' + (z.ownerName || 'a rival') + '!', 'bad');
      S.mapDirty = true;
      markNavDirty();
    } else if (r.owner !== 'rival') {
      r.owner = 'rival';
      S.mapDirty = true;
    }
  } else if (z.state === 'owned' && z.ownerId === me) {
    if (r.owner === 'rival') {
      r.owner = 'player';
      S.mapDirty = true;
    }
  } else if (z.state === 'contested' && z.claimerId && z.claimerId !== me && r.owner === 'player' && !zoneHasHall(r)) {
    toast((z.name || r.name) + ' is being claimed by a rival banner!', 'bad');
    WORLD.lastAlert = { id: z.id, name: z.name || r.name, kind: 'banner', at: Date.now() };
  } else if (z.state === 'unowned' && r.owner === 'rival') {
    r.owner = 'wild';
    r.worldOwnerId = null;
    r.gov = false;
    S.mapDirty = true;
  }
}
function applyServerZone(z) {
  if (!z || !z.id) return;
  const prev = WORLD.zones.get(z.id);
  WORLD.zones.set(z.id, z);
  applyHomeParcel(z);
  materializeForeignZone(z);
  if (z.underAttack && z.ownerId === myKingdomId()) alertZoneAttack(z);
  void prev;
}
function seedZone(z) {
  applyServerZone(z);
  return z;
}
function worldZoneAt(x, y) {
  let best = null, bd = 480;
  const pt = { x, y };
  for (const z of WORLD.zones.values()) {
    const loc = localFromWorld(z.wx, z.wy);
    const d = dist(loc, pt);
    if (d < bd) { bd = d; best = z; }
  }
  return best;
}
function isWorldClaimable(z) {
  if (!z) return false;
  if (z.gov) return false;
  if (z.state === 'contested' && z.claimerId && z.claimerId !== myKingdomId()) return false;
  if (z.ownerId && z.ownerId === myKingdomId()) return false;
  if (z.state === 'owned' && z.gov) return false;
  return z.state === 'unowned' || (z.state === 'owned' && !z.gov);
}
function plantWorldBanner(zoneId) {
  if (!S || S.over) return { ok: false, reason: 'No game' };
  const z = WORLD.zones.get(zoneId);
  if (!z) return { ok: false, reason: 'No zone' };
  if (z.ownerId && z.ownerId === myKingdomId()) return { ok: false, reason: 'Already yours' };
  if (z.gov) return { ok: false, reason: 'A Hall governs this land' };
  if (z.state === 'contested' && z.claimerId && z.claimerId !== myKingdomId()) return { ok: false, reason: 'A banner already stands' };
  const loc = localFromWorld(z.wx, z.wy);
  const range = TUNE.bannerPlantRange || 220;
  if (dist(S.monarch, loc) > range) {
    toast('Move closer to plant a banner', 'bad');
    return { ok: false, reason: 'Too far' };
  }
  const from = z.state === 'owned' ? 'held' : 'wild';
  const hp = Math.round((TUNE.bannerHp || 200) * allyHpMul());
  z.state = 'contested';
  z.claimerId = myKingdomId();
  z.claimFrom = from;
  z._banner = { x: loc.x, y: loc.y, hp, max: hp, contested: true, type: 'core', zoneId: z.id, r: TUNE.bannerR || 18 };
  zoneAct('plant', z.id, { from, bannerHp: hp });
  toast('Banner planted in ' + (z.name || 'this land') + ' — contested! Hold it through the night to capture.', 'good');
  return { ok: true, id: z.id };
}
function completeWorldClaim(z) {
  z = typeof z === 'string' ? WORLD.zones.get(z) : z;
  if (!z || z.state !== 'contested') return false;
  const me = myKingdomId();
  z.state = 'owned';
  z.ownerId = me;
  z.ownerName = CLOUD.kingdom && CLOUD.kingdom.name;
  z.ownerColor = kingdomColor(me);
  z.claimerId = null;
  z.gov = false;
  z.govHp = null;
  z.govMax = null;
  z._banner = null;
  zoneAct('claim', z.id, { buildings: (z.buildings || []) });
  toast((z.name || 'The land') + ' is yours. Build a Hall to lock the claim.', 'good');
  applyServerZone(z);
  return true;
}
function takeZoneFromHall(hall) {
  if (!hall) return;
  const zid = hall.zoneId || (hall.region >= 1 && myKingdomId() ? zoneKey(myKingdomId(), hall.region) : null);
  const leftover = S.buildings.filter(b => b !== hall && b.hp > 0 && ((zid && b.zoneId === zid) || (hall.region >= 0 && b.region === hall.region)));
  for (const b of leftover) { b.owner = 'player'; b.foreign = false; }
  if (hall.region >= 1 && S.regions[hall.region]) {
    const r = S.regions[hall.region];
    r.owner = 'player';
    r.gov = false;
    r.worldOwnerId = myKingdomId();
    r.worldOwnerName = CLOUD.kingdom && CLOUD.kingdom.name;
    r.worldOwnerColor = kingdomColor(myKingdomId());
    toast(r.name + ' is yours — leftover buildings transfer. Build a Hall to lock the claim.', 'good');
  } else {
    const z = zid && WORLD.zones.get(zid);
    if (z) {
      z.ownerId = myKingdomId();
      z.ownerName = CLOUD.kingdom && CLOUD.kingdom.name;
      z.ownerColor = kingdomColor(myKingdomId());
      z.gov = false;
      z.govHp = null;
      z.govMax = null;
      z.underAttack = false;
    }
    toast(((z && z.name) || 'The land') + ' is yours — leftover buildings transfer. Build a Hall to lock the claim.', 'good');
  }
  if (zid) zoneAct('take', zid, { buildings: leftover.map(packBldWorld) });
  S.mapDirty = true;
  markNavDirty();
}


function upsertRealm(r) {
  if (!r || !r.id || (CLOUD.kingdom && r.id === CLOUD.kingdom.id)) return;
  const prev = WORLD.realms.get(r.id) || {};
  WORLD.realms.set(r.id, Object.assign({}, prev, r));
  if (PUI.worldOpen) renderWorldSheet();
}
function worldUrl() {
  const base = apiBase();
  const u = new URL('/v1/ws', base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  if (CLOUD.token) u.searchParams.set('access_token', CLOUD.token);
  return u.toString();
}
function disconnectWorld() {
  WORLD.wanted = false;
  if (WORLD.timer) { clearTimeout(WORLD.timer); WORLD.timer = 0; }
  const ws = WORLD.ws;
  WORLD.ws = null;
  WORLD.room = '';
  WORLD.realms.clear();
  if (WORLD.zones) WORLD.zones.clear();
  if (WORLD.attackAlerts) WORLD.attackAlerts.clear();
  WORLD.lastAlert = null;
  if (ws) {
    try { ws.onclose = null; ws.onerror = null; ws.onmessage = null; ws.close(); } catch (e) {}
  }
  if (PUI.worldOpen) closeWorld();
  updateCloudNote();
}
function connectWorld() {
  if (!isEndlessCloud() || CLOUD.forceOffline) { disconnectWorld(); return; }
  WORLD.wanted = true;
  if (WORLD.ws && (WORLD.ws.readyState === 0 || WORLD.ws.readyState === 1)) return;
  let ws;
  try { ws = new WebSocket(worldUrl()); }
  catch (e) { scheduleWorldReconnect(); return; }
  WORLD.ws = ws;
  ws.onopen = () => {
    WORLD.ever = true;
    WORLD.backoff = 800;
    CLOUD.offline = false;
    sendWorldState(true);
    updateCloudNote();
  };
  ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    handleWorldMsg(msg);
  };
  ws.onclose = () => {
    if (WORLD.ws === ws) WORLD.ws = null;
    updateCloudNote();
    if (WORLD.wanted) scheduleWorldReconnect();
  };
  ws.onerror = () => { /* onclose follows */ };
}
function scheduleWorldReconnect() {
  if (!WORLD.wanted || WORLD.timer) return;
  const wait = WORLD.backoff;
  WORLD.backoff = Math.min(8000, WORLD.backoff * 1.6);
  WORLD.timer = setTimeout(() => { WORLD.timer = 0; if (WORLD.wanted) connectWorld(); }, wait);
}
function handleWorldMsg(msg) {
  if (!msg || !msg.t) return;
  if (msg.t === 'pong') return;
  if (msg.t === 'hello') {
    WORLD.room = msg.room || '';
    WORLD.realms.clear();
    if (WORLD.zones) WORLD.zones.clear();
    for (const r of (msg.realms || [])) upsertRealm(r);
    for (const z of (msg.zones || [])) applyServerZone(z);
    publishHomeZones();
    updateCloudNote();
    if (PUI.worldOpen) renderWorldSheet();
    return;
  }
  if (msg.t === 'join' && msg.realm) { upsertRealm(msg.realm); return; }
  if (msg.t === 'leave' && msg.id) {
    const r = WORLD.realms.get(msg.id);
    if (r) { r.online = false; WORLD.realms.set(msg.id, r); }
    if (PUI.worldOpen) renderWorldSheet();
    return;
  }
  if (msg.t === 'upd' && msg.id) {
    const r = WORLD.realms.get(msg.id) || { id: msg.id };
    upsertRealm(Object.assign(r, msg, { online: true }));
  }
  if (msg.t === 'zup' && msg.zone) applyServerZone(msg.zone);
  if (msg.t === 'zlist' && msg.zones) for (const z of msg.zones) applyServerZone(z);
}
function sendWorldState(force) {
  const ws = WORLD.ws;
  if (!ws || ws.readyState !== 1 || !S || S.mode !== 'endless') return;
  const now = performance.now();
  if (!force && now - WORLD.lastSt < 250) return;
  const sig = [S.nights, S.day, S.phase, Math.round(S.monarch.x), Math.round(S.monarch.y), S.over ? 1 : 0].join(',');
  if (!force && sig === WORLD.lastSig && now - WORLD.lastSt < 1000) return;
  WORLD.lastSt = now;
  WORLD.lastSig = sig;
  try {
    ws.send(JSON.stringify({
      t: 'st',
      nights: S.nights,
      day: S.day,
      phase: S.phase,
      mx: S.monarch.x,
      my: S.monarch.y,
      hp: S.monarch.hp,
      max: S.monarch.max,
      over: !!S.over,
    }));
  } catch (e) {}
  if (force || now - (WORLD.lastPub || 0) > 2000) publishHomeZones();
}
function syncWorld() {
  if (isEndlessCloud() && !CLOUD.forceOffline) {
    if (!WORLD.ws || WORLD.ws.readyState > 1) connectWorld();
    sendWorldState(false);
  } else if (WORLD.ws || WORLD.wanted) {
    disconnectWorld();
  }
}

function openWorld() {
  if (!isEndlessCloud()) return;
  PUI.worldOpen = true;
  const el = $('world');
  if (el) el.hidden = false;
  renderWorldSheet();
}
function closeWorld() {
  PUI.worldOpen = false;
  const el = $('world');
  if (el) el.hidden = true;
  if (PUI.worldLook) {
    PUI.worldLook = false;
    lookFree = false;
    zoom = TUNE.zoomStart;
    applyScale();
  }
}
function lookAtRealm(id) {
  const r = WORLD.realms.get(id);
  if (!r || !S) return;
  const p = realmLocal(r);
  PUI.worldLook = true;
  lookFree = true;
  lookX = p.x; lookY = p.y;
  const me = { x: S.monarch.x, y: S.monarch.y };
  const dist = Math.hypot(p.x - me.x, p.y - me.y);
  const need = Math.max(vw, vh) / Math.max(220, dist * 1.3);
  zoom = Math.max(0.08, Math.min(TUNE.zoomMin, need / (baseScale || 1)));
  applyScale();
  closeWorld();
  PUI.worldLook = true;
  lookFree = true;
  toast((r.name || 'A kingdom') + (r.online ? ' — online' : ' — away'), '');
}
function renderWorldSheet() {
  const list = $('worldList');
  const empty = $('worldEmpty');
  const canvas = $('worldMap');
  if (!list || !canvas) return;
  const realms = [...WORLD.realms.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  list.innerHTML = '';
  if (empty) empty.hidden = realms.length > 0;
  for (const r of realms) {
    const li = document.createElement('li');
    const nights = r.nights != null ? r.nights : 0;
    const st = r.online ? 'Online · Night ' + nights : 'Away · Night ' + nights;
    li.innerHTML = '<div class="meta"><span class="nm"></span><span class="st ' + (r.online ? 'on' : 'off') + '"></span></div>';
    li.querySelector('.nm').textContent = r.name || 'Kingdom';
    li.querySelector('.st').textContent = st;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Look';
    btn.addEventListener('click', () => lookAtRealm(r.id));
    li.appendChild(btn);
    list.appendChild(li);
  }
  const ctxw = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctxw.fillStyle = '#1c1612';
  ctxw.fillRect(0, 0, w, h);
  const me = myWorldSpawn();
  const pts = [{ x: me.x, y: me.y, self: true, name: (CLOUD.kingdom && CLOUD.kingdom.name) || 'You', online: true }];
  for (const r of realms) if (r.spawn) pts.push({ x: r.spawn.x, y: r.spawn.y, name: r.name, online: !!r.online, id: r.id });
  let minX = me.x, maxX = me.x, minY = me.y, maxY = me.y;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const pad = 2000;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const sx = (w - 24) / Math.max(2000, maxX - minX);
  const sy = (h - 24) / Math.max(2000, maxY - minY);
  const sc = Math.min(sx, sy);
  const ox = (w - (maxX - minX) * sc) / 2;
  const oy = (h - (maxY - minY) * sc) / 2;
  const map = (p) => ({ x: ox + (p.x - minX) * sc, y: h - (oy + (p.y - minY) * sc) });
  for (const p of pts) {
    const s = map(p);
    ctxw.beginPath();
    ctxw.arc(s.x, s.y, p.self ? 8 : 6, 0, Math.PI * 2);
    ctxw.fillStyle = p.self ? '#f0c14a' : (p.online ? '#d6ffb0' : '#8c7352');
    ctxw.fill();
    ctxw.lineWidth = 2;
    ctxw.strokeStyle = '#2a1c10';
    ctxw.stroke();
    ctxw.font = '700 11px "Segoe UI", system-ui, sans-serif';
    ctxw.fillStyle = '#fff6e4';
    ctxw.textAlign = 'center';
    ctxw.fillText(p.name || '', s.x, s.y - 12);
  }
}
function drawRemoteRealms() {
  if (!S || !isEndlessCloud() || !WORLD.realms.size) return;
  for (const r of WORLD.realms.values()) {
    const p = realmLocal(r);
    if (!vis(p.x, p.y) && !vis(p.x, p.y - 80)) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(28,20,14,.45)';
    ctx.beginPath(); ctx.ellipse(0, 8, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = r.online ? '#5a3a22' : '#3a2c22';
    ctx.beginPath();
    ctx.moveTo(-22, 6); ctx.lineTo(-18, -16); ctx.lineTo(0, -28); ctx.lineTo(18, -16); ctx.lineTo(22, 6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = r.online ? '#f0c14a' : '#8c7352';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#f0c14a';
    ctx.beginPath();
    ctx.moveTo(-8, -26); ctx.lineTo(-8, -38); ctx.lineTo(0, -33); ctx.lineTo(8, -38); ctx.lineTo(8, -26);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    if (r.online && r.mx != null) {
      const m = monarchLocal(r);
      if (vis(m.x, m.y)) {
        ctx.fillStyle = '#d6ffb0';
        ctx.beginPath(); ctx.arc(m.x, m.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    const tag = (r.name || 'Kingdom') + (r.online ? '  ·  online' : '');
    queueWorldTag(tag, p.x, p.y - 48, 15, r.online ? '#d6ffb0' : '#f3e6cf', r.online ? '#3a7a3a' : '#5a4a38', 'realm');
  }
}


function showOverlay(id) {
  closeInspect();
  for (const k of ['title', 'loadout', 'over', 'account', 'needNet']) {
    const el = $(k);
    if (el) el.hidden = k !== id;
  }
  if (id === 'title' || id === 'loadout' || id === 'account' || id === 'needNet') {
    $('hud').hidden = true;
    $('bar').hidden = true;
    showMenu(false);
    if (S) S.dropHold = false;
  }
}
function showTitle() {
  S = null;
  disconnectWorld();
  showOverlay('title');
  $('hint').textContent = '';
  clearToasts();
  updateCloudNote();
}
function openLoadout() {
  showOverlay('loadout');
  renderLoadout();
}
function startEndless() {
  if (!CLOUD.token || CLOUD.forceOffline) {
    if (CLOUD.forceOffline || CLOUD.offline) showNeedNet();
    else openAccount();
    return false;
  }
  newGame({ mode: 'endless' });
  connectWorld();
  return true;
}
function startChallenge(opts) {
  opts = opts || {};
  const curses = opts.curses || [...LO.curses];
  const blessings = opts.blessings || [...LO.blessings];
  lastChallenge = { curses: curses.slice(), blessings: blessings.slice() };
  newGame({ mode: 'challenge', curses, blessings, retry: !!opts.retry });
}

function paintScoreBreakdown(sc, applied, into) {
  const el = into || $('overScore');
  if (!el) return;
  el.hidden = false;
  const rows = [];
  const add = (label, val, mute) => {
    rows.push('<div class="row' + (mute ? ' mute' : '') + '"><span>' + label + '</span><span>' + val + '</span></div>');
  };
  add('Nights survived', String(sc.nightsCount || 0) + '  →  ' + (sc.nights || 0));
  add('Realm protected', '+' + (sc.protected || 0));
  add('Time bonus', '+' + (sc.time || 0));
  add('Base score', String(scoreBase(sc)));
  add('Unspent coins × 10', '+' + (sc.coinScore || 0), !applied);
  add('Curse / blessing multiplier', fmtMult(sc.multiplier || 1), !applied);
  add('No-restart bonus', sc.noRestart ? '×1.1' : '×1.0', !applied);
  if (!applied) add('Bonuses applied', 'Not applied — win to score them', true);
  rows.push('<div class="row total"><span>Final score</span><span>' + finalScore(sc, applied) + '</span></div>');
  el.innerHTML = rows.join('');
}

function snapshotNightBuildings() {
  if (!isChallenge()) return;
  // Realm Protected: cores/banners never count; contested land is not yours yet, so its buildings (if any) also wait until capture.
  S.nightBlds = S.buildings.filter(b => b.owner === 'player' && b.built >= 1 && b.type !== 'core' && !isContested(S.regions[b.region])).slice();
  S.lastSpawnAt = S.t;
}
function recordNightScore() {
  if (!isChallenge() || !S.score) return;
  const total = (S.nightBlds && S.nightBlds.length) || 0;
  let standing = 0;
  if (total) {
    for (const b of S.nightBlds) {
      if (S.buildings.includes(b) && b.owner === 'player' && b.hp > 0) standing++;
    }
  }
  const prot = realmBonus(standing, total);
  const tbonus = timeBonus(Math.max(0, S.t - (S.lastSpawnAt || S.t)));
  S.score.nightsCount = (S.score.nightsCount || 0) + 1;
  S.score.nights += (TUNE.scoreNight || 100);
  S.score.protected += prot;
  S.score.time += tbonus;
  S.score.log.push({ night: S.score.nightsCount, standing, total, prot, time: tbonus });
}
function syncChallengeScore() {
  if (!isChallenge() || !S.score) return;
  S.score.coinScore = (S.coins | 0) * (TUNE.scoreCoin || 10);
  S.score.multiplier = loadoutMultiplier(S.curses, S.blessings);
  S.score.base = scoreBase(S.score);
  S.score.final = finalScore(S.score, true);
}

function growthFactor() {
  if (!hasCurse('growth') || !isChallenge()) return 1;
  const cap = TUNE.challengeNights || 20;
  const night = Math.min(cap, (S.nights || 0) + 1);
  return 1 + (TUNE.curseGrowthMax || 0.75) * (night / cap);
}
function enemyMods(kind, spawnIndex, opts) {
  const s = UNDEAD[kind] || UNDEAD.shambler;
  let hp = s.hp, speed = s.speed, dmg = s.dmg, r = s.r, coin = s.coin;
  const eliteEvery = TUNE.curseEliteEvery || 4;
  let elite = false;
  if (hasBless('dawn')) { hp *= 0.8; dmg *= 0.8; }
  const claimScale = opts && opts.claimScale;
  if (claimScale && claimScale !== 1) { hp *= claimScale; dmg *= claimScale; }
  if (hasCurse('turtle')) hp *= (TUNE.curseTurtleHp || 1.6);
  if (hasCurse('tiger')) dmg *= (TUNE.curseTigerDmg || 1.75);
  if (hasCurse('falcon')) speed *= (TUNE.curseFalconSpeed || 1.75);
  const g = growthFactor();
  if (g !== 1) { hp *= g; dmg *= g; }
  if (hasCurse('snake')) coin = Math.max(1, Math.round(coin * (TUNE.curseSnakeCoin || 0.5)));
  if (hasCurse('elite') && spawnIndex != null && eliteEvery > 0 && (spawnIndex % eliteEvery === eliteEvery - 1)) {
    hp *= (TUNE.curseEliteHp || 4);
    dmg *= (TUNE.curseEliteDmg || 3);
    r *= 1.15;
    elite = true;
  }
  if (hasCurse('range') && kind === 'necro') {
    hp *= (TUNE.curseRangeHp || 2);
    dmg *= (TUNE.curseRangeDmg || 1.4);
    speed *= (TUNE.curseRangeSpd || 1.5);
  }
  return {
    hp: Math.max(1, Math.round(hp)),
    speed,
    dmg,
    r,
    coin,
    elite,
    rangeMul: (hasCurse('range') && kind === 'necro') ? (TUNE.curseRangeRng || 1.7) : 1,
    cdMul: (hasCurse('range') && kind === 'necro') ? (TUNE.curseRangeCd || 0.7) : 1,
  };
}
function chaosSpawnPoint() {
  const home = S.regions[0] || { x: CX, y: CY };
  const ownedR = owned();
  const base = ownedR.length ? ownedR[(rand() * ownedR.length) | 0] : home;
  const ang = rand() * Math.PI * 2, rad = 40 + rand() * 160;
  return { x: clamp(base.x + Math.cos(ang) * rad, 20, W - 20), y: clamp(base.y + Math.sin(ang) * rad, 20, H - 20) };
}


const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
let dpr = 1, vw = 0, vh = 0, baseScale = 1, zoom = TUNE.zoomStart, scale = 1;
let lookX = null, lookY = null, lookFree = false, pinch = null;
// Per-player UI only (not simulation state). A later multiplayer Endless
// mode can give each client their own inspect sheet without freezing the world.
const PUI = { inspectId: null, inspectSig: '', worldOpen: false, worldLook: false };
let nextBid = 1;
function allocBid() { return 'b' + (nextBid++); }
const pts = new Map();
function applyScale() {
  const zMin = (PUI.worldLook ? 0.08 : TUNE.zoomMin), zMax = TUNE.zoomMax;
  zoom = zoom < zMin ? zMin : zoom > zMax ? zMax : zoom;
  scale = baseScale * zoom;
}
function resize() {
  // Backing store stops at 2x. A 3x phone buffer was the main fill-rate cost.
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = innerWidth; vh = innerHeight;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  baseScale = Math.max(0.55, Math.min(1.3, vw / 560));
  applyScale();
}
addEventListener('resize', resize);

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rand() { return (S && S.seeded && S.playRng) ? S.playRng() : Math.random(); }
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
resize();

let S = null, nav = null, grid = null, mapCv = document.createElement('canvas');
mapCv.width = GW; mapCv.height = GH;

function regionIdAt(x, y) {
  let best = 0, bd = 1e18;
  for (const r of S.regions) { const d = (r.x - x) ** 2 + (r.y - y) ** 2; if (d < bd) { bd = d; best = r.id; } }
  return best;
}

function newGame(opts) {
  opts = opts || {};
  const mode = opts.mode || 'endless';
  const q = new URLSearchParams(location.search);
  const seedQ = q.get('seed');
  const seeded = seedQ != null && seedQ !== '';
  const seed = seeded ? ((+seedQ) || 0) : ((Math.random() * 1e9) | 0);
  const rnd = mulberry(seed);
  const curses = mode === 'challenge' ? (opts.curses || []).slice() : [];
  const blessings = mode === 'challenge' ? (opts.blessings || []).slice() : [];
  S = {
    seed, t: 0, phase: 'day', phaseT: DAY, day: 1, nights: 0, nightSpawned: false, coins: TUNE.startCoins, trickle: 0,
    regions: [], buildings: [], archers: [], undead: [], guardians: [], fx: [],
    folk: [], drops: [], stands: [], mines: [], camp: null, vagrantT: TUNE.vagrantEvery, rally: false, dropHold: false, dropT: 0, postT: 0,
    spawnQ: [], spawnT: 0, spawnGap: 1, claimQ: [], claimT: 0, claimGap: 1, leader: null, chaos: false, focus: null, waveSrc: null,
    build: null, over: false, kills: 0, mapDirty: true, mode, curses, blessings,
    choiceLocks: (mode === 'challenge' && curses.indexOf('choice') >= 0) ? pickChoiceLocks(rnd) : [],
    rubble: [], returnQ: [], spawnIndex: 0,
    score: mode === 'challenge' ? {
      nights: 0, protected: 0, time: 0, nightsCount: 0, coinScore: 0,
      multiplier: loadoutMultiplier(curses, blessings), noRestart: !opts.retry,
      log: [], base: 0, final: 0
    } : null,
    stats: { towerShots: 0, paleTowerShots: 0, spawned: 0, captures: 0, losses: 0, retakes: 0,
      dropped: 0, recruits: 0, tools: 0, roles: 0, built: 0, farmCoins: 0, raised: 0, folkLost: 0, cleared: 0, clearCoins: 0 },
    monarch: { x: 0, y: 0, r: 16, hp: 120, max: 120, cd: 0, target: null, speed: 190, vx: 0, vy: 0, face: 0 },
    nightK: 0, waveSide: null,
  };
  nextBid = 1;
  closeInspect();
  S.seeded = seeded;
  S.playRng = seeded ? mulberry((seed ^ 0xa5a5a5a5) >>> 0) : null;
  const N = 7;
  S.regions.push(mkRegion(0, CX + (rnd() - .5) * 80, CY + (rnd() - .5) * 80));
  const a0 = rnd() * Math.PI * 2;
  for (let i = 1; i < N; i++) {
    const a = a0 + (i - 1) / (N - 1) * Math.PI * 2 + (rnd() - .5) * 0.5;
    const rr = 620 + rnd() * 330;
    S.regions.push(mkRegion(i, clamp(CX + Math.cos(a) * rr, 150, W - 150), clamp(CY + Math.sin(a) * rr, 150, H - 150)));
  }
  grid = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = regionIdAt(gx * CELL + CELL / 2, gy * CELL + CELL / 2);
  const home = S.regions[0];
  home.owner = 'player';
  home.core = mkCore(home, TUNE.coreHome);
  home.core.keep = true;
  applyTier(home.core, true);
  for (const r of S.regions) {
    if (r.id === 0) continue;
    r.bonus = rnd() < 0.6 ? (rnd() < 0.5 ? 'fort' : 'keep') : null;
    const d = Math.hypot(r.x - CX, r.y - CY);
    S.guardians.push({ kind: 'guardian', name: 'Guardian', x: r.x, y: r.y, hx: r.x, hy: r.y, r: 22,
      hp: Math.round(140 + d * 0.08), max: Math.round(140 + d * 0.08), dmg: 9, cd: 0, region: r.id });
  }
  S.monarch.x = home.x; S.monarch.y = home.y + 40;
  if (hasBless('purse')) S.coins += (TUNE.blessPurseCoins || 6);
  if (hasBless('hide')) { S.monarch.max += (TUNE.blessHideHp || 40); S.monarch.hp = S.monarch.max; }
  S.vagrantT = vagrantEvery();
  S.focus = null;
  S.mines = [];
  setupHome();
  placeMines(rnd);
  markNavDirty();
  buildDecor();
  bakeGround();
  $('title').hidden = true;
  $('loadout').hidden = true;
  if ($('account')) $('account').hidden = true;
  if ($('needNet')) $('needNet').hidden = true;
  $('over').hidden = true;
  $('hud').hidden = false;
  $('bar').hidden = false;
  $('hScore').hidden = mode !== 'challenge';
  setBuild(null); showMenu(false); clearSel();
  refreshBuildMenu();
  $('btnRally').classList.remove('sel');
  zoom = TUNE.zoomStart; applyScale();
  lookX = S.monarch.x; lookY = S.monarch.y; lookFree = false;
  pinch = null; wallDrag = null; pts.clear(); ptr = null;
  clearToasts();
  toast('Start with your Builder and House. Order a Hammer stand, then drop coins on vagrants and stands', '');
  if (CLOUD.kingdom && CLOUD.kingdom.spawn && S.mode === 'endless') S.worldSpawn = CLOUD.kingdom.spawn;
  if (isEndlessCloud()) { CLOUD.dirty = true; requestSaveKingdom(); }
  updateCloudNote();
}
function mkBld(type, x, y, rid, built) {
  const b = { id: allocBid(), type, x, y, r: 16, hp: 1, max: 1, owner: 'player', region: rid, cd: 0, built: built ? 1 : 0, level: 1, path: null };
  applyTier(b, true);
  if (!built) b.hp = Math.ceil(b.max * 0.15);
  return b;
}
function mkFolk(role, x, y) {
  const hp = Math.round(24 * allyHpMul());
  return { type: 'folk', role, x, y, r: 9, hp, max: hp, tx: null, ty: null, wt: 0, ph: Math.random() * 6.28, job: null, stand: null, state: 'idle' };
}
function setupHome() {
  const h = S.regions[0];
  for (let i = 0; i < TUNE.startHouses; i++) S.buildings.push(mkBld('house', h.x + 100 + i * 46, h.y - 24, 0, 1));
  S.stands = [];
  for (let i = 0; i < TUNE.startBuilders; i++) S.folk.push(mkFolk('builder', h.x - 46 + i * 18, h.y + 50));
  // Vagrant camp only on unowned land, just inside the nearest wild/pale region toward home.
  S.camp = nearestCampSpot(h);
  if (S.camp) for (let i = 0; i < TUNE.vagrantStart; i++) spawnVagrant();
}
function spawnVagrant() {
  const c = S.camp; if (!c) return;
  S.folk.push(mkFolk('vagrant', c.x + (Math.random() - .5) * 60, c.y + 10 + (Math.random() - .5) * 40));
}
function isUnownedRegion(r) { return !!r && r.owner !== 'player' && r.owner !== 'contested' && r.owner !== 'rival'; }
function findCampSpot(r) {
  if (!isUnownedRegion(r)) return null;
  const toward = (S.regions && S.regions[0]) || { x: CX, y: CY };
  for (let t = 0.47; t >= 0.15; t -= 0.01) {
    const x = r.x + (toward.x - r.x) * t, y = r.y + (toward.y - r.y) * t;
    if (regionIdAt(x, y) === r.id && regionIdAt(x, y + 40) === r.id) return { x, y, region: r.id };
  }
  for (let a = 0; a < 16; a++) {
    const x = r.x + Math.cos(a * Math.PI / 8) * 80, y = r.y + Math.sin(a * Math.PI / 8) * 80;
    if (regionIdAt(x, y) === r.id && regionIdAt(x, y + 40) === r.id) return { x, y, region: r.id };
  }
  return { x: r.x + (toward.x - r.x) * 0.3, y: r.y + (toward.y - r.y) * 0.3, region: r.id };
}
function nearestCampSpot(from) {
  const origin = from || S.camp || (S.regions && S.regions[0]) || { x: CX, y: CY };
  let best = null, bd = 1e9;
  for (const r of S.regions) {
    const s = findCampSpot(r);
    if (!s) continue;
    const d = dist(s, origin);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function settleVagrants() {
  if (!S) return;
  const vags = S.folk.filter(f => f.role === 'vagrant');
  if (S.camp) {
    for (const f of vags) {
      // Already near the (possibly new) camp? Leave them; otherwise move them there.
      if (Math.hypot(f.x - S.camp.x, f.y - (S.camp.y + 10)) < 90) continue;
      S.fx.push({ k: 'puff', x: f.x, y: f.y, t: 0.4, t0: 0.4 });
      f.x = S.camp.x + (Math.random() - .5) * 60;
      f.y = S.camp.y + 10 + (Math.random() - .5) * 40;
      f.tx = null; f.ty = null; f.state = 'idle';
    }
    return;
  }
  for (const f of vags) S.fx.push({ k: 'puff', x: f.x, y: f.y, t: 0.45, t0: 0.45 });
  if (vags.length) S.folk = S.folk.filter(f => f.role !== 'vagrant');
}
function refreshCamps() {
  if (!S) return;
  if (S.camp) {
    const r = S.regions[S.camp.region];
    if (isUnownedRegion(r)) return;
    const old = S.camp;
    S.fx.push({ k: 'puff', x: old.x, y: old.y, t: 0.6, t0: 0.6, big: 1 });
    S.camp = nearestCampSpot(old);
    settleVagrants();
    return;
  }
  S.camp = nearestCampSpot(S.regions[0]);
  if (S.camp) settleVagrants();
}
function mkRegion(id, x, y) { return { id, x, y, name: NAMES[id], owner: 'wild', core: null, bonus: null, weakened: false, claimFails: 0, claimFrom: null }; }
function mkCore(r, hp) { return { id: allocBid(), type: 'core', x: r.x, y: r.y, r: 20, hp, max: hp, region: r.id, keep: false, level: 1, owner: 'player', contested: false }; }
const owned = () => S.regions.filter(r => r.owner === 'player');
const isContested = r => !!(r && r.owner === 'contested');
const contested = () => S.regions.filter(isContested);
function heldCores() { return S.regions.filter(r => r.core && (r.owner === 'player' || r.owner === 'contested')).map(r => r.core); }
function claimScaleOf(r) { return Math.pow(1 + (TUNE.claimFailScale || 0.25), (r && r.claimFails) || 0); }
function isClaimable(r) {
  if (!r || r.owner === 'player' || r.owner === 'contested') return false;
  if (zoneHasHall(r)) return false;
  if (r.core && r.core.hp > 0) return false;
  if (S.guardians.some(g => g.region === r.id && g.hp > 0)) return false;
  return true;
}
function bannerSiteId(rid) { return 'site-' + rid; }
function bannerSiteOf(r) {
  return { id: bannerSiteId(r.id), type: 'bannerSite', x: r.x, y: r.y, r: 22, region: r.id, owner: 'none', built: 1, level: 1 };
}

// ---------- toasts / hint ----------
const TOAST_MAX = 2, toastQ = [];
let toastShowing = 0;
function clearToasts() {
  toastQ.length = 0; toastShowing = 0;
  const box = $('toasts');
  if (box) while (box.firstChild) box.firstChild.remove();
}
function pumpToasts() {
  const box = $('toasts'); if (!box) return;
  while (toastShowing < TOAST_MAX && toastQ.length) {
    const { msg, cls } = toastQ.shift();
    const el = document.createElement('div'); el.className = 'toast ' + (cls || ''); el.textContent = msg;
    box.appendChild(el);
    toastShowing++;
    setTimeout(() => { el.remove(); toastShowing = Math.max(0, toastShowing - 1); pumpToasts(); }, 2600);
  }
}
function toast(msg, cls) {
  if (S) (S.toastLog || (S.toastLog = [])).push(msg);
  toastQ.push({ msg, cls: cls || '' });
  pumpToasts();
}

// ---------- input ----------
let ptr = null, wallDrag = null, pinched = false; const keys = {};
function startPinch() {
  const arr = [...pts.values()];
  if (arr.length < 2) return;
  const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) || 1;
  const mx = (arr[0].x + arr[1].x) / 2, my = (arr[0].y + arr[1].y) / 2;
  pinch = { d0: d, z0: zoom, mx, my };
  pinched = true;
  ptr = null;
  wallDrag = null; // pinch/two-finger pan wins; do not place the wall line
}
function onWheelZoom(e) {
  e.preventDefault();
  if (!S || S.over || worldInputBlocked()) return;
  const factor = Math.pow(0.999, e.deltaY);
  setZoomAt(zoom * factor, e.clientX, e.clientY);
}
cv.addEventListener('wheel', onWheelZoom, { passive: false });
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (worldInputBlocked()) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  if (pts.size >= 2) { startPinch(); return; }
  if (pinch || pinched) return;
  ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, drag: false, pan: false, t: performance.now(), build: !!(S && S.build) };
  if (S && !S.over && S.build === 'wall') {
    const w = s2w(e.clientX, e.clientY);
    wallDrag = { x0: w.x, y0: w.y, x1: w.x, y1: w.y };
    ptr.wall = true;
  }
});
cv.addEventListener('pointermove', e => {
  if (worldInputBlocked()) return;
  if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pts.size >= 2) {
    const arr = [...pts.values()];
    const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) || 1;
    const mx = (arr[0].x + arr[1].x) / 2, my = (arr[0].y + arr[1].y) / 2;
    lookX -= (mx - pinch.mx) / scale;
    lookY -= (my - pinch.my) / scale;
    pinch.mx = mx; pinch.my = my;
    if (S && S.build) lookFree = true;
    setZoomAt(pinch.z0 * (d / pinch.d0), mx, my);
    return;
  }
  if (!ptr || e.pointerId !== ptr.id) return;
  const lx = ptr.x, ly = ptr.y;
  ptr.x = e.clientX; ptr.y = e.clientY;
  if (Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy) > 14) ptr.drag = true;
  if (wallDrag && ptr.wall) {
    const w = s2w(ptr.x, ptr.y);
    wallDrag.x1 = w.x; wallDrag.y1 = w.y;
  } else if (S && S.build && S.build !== 'wall' && ptr.drag && !pinch) {
    // Tap-to-place: a drag pans the map so you can reach land off-screen. A short tap still places.
    ptr.pan = true;
    lookX -= (ptr.x - lx) / scale;
    lookY -= (ptr.y - ly) / scale;
    lookFree = true;
  }
});
const endPtr = e => {
  pts.delete(e.pointerId);
  if (pinch) {
    if (pts.size < 2) pinch = null;
    if (ptr && ptr.id === e.pointerId) ptr = null;
    if (pts.size === 0) pinched = false;
    return;
  }
  if (pts.size === 0) pinched = false;
  if (!ptr || e.pointerId !== ptr.id) return;
  if (wallDrag && ptr.wall && e.type === 'pointerup') commitWallLine(planWallLine(wallDrag.x0, wallDrag.y0, wallDrag.x1, wallDrag.y1));
  else if (!ptr.drag && !ptr.wall && !ptr.pan && performance.now() - ptr.t < 600 && e.type === 'pointerup') onTap(ptr.x, ptr.y);
  wallDrag = null;
  ptr = null;
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
addEventListener('keydown', e => {
  if (worldInputBlocked()) return;
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape' && (PUI.inspectId || (S && (S.sel || S.build)))) {
    e.preventDefault();
    if (PUI.inspectId) closeInspect();
    else if (S && S.sel) clearSel();
    else if (S && S.build) setBuild(null);
  }
  if (e.key === 'n' && DEBUG) skipPhase();
  if (e.key === ' ' && !e.repeat) dropCoin();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

$('bar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !S || S.over || worldInputBlocked()) return;
  const a = b.dataset.act;
  if (a === 'build') { if (S.sel) { clearSel(); return; } if (S.build) setBuild(null); else showMenu($('buildMenu').hidden); return; }
  if (a === 'rally') { showMenu(false); toggleRally(); }
});
$('buildMenu').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !S || S.over || worldInputBlocked()) return;
  if (b.disabled || b.classList.contains('locked-opt')) {
    const act = b.dataset.act;
    if ((act === 'wall' || act === 'gate') && hasCurse('nowalls')) toast('No Walls Pact forbids walls and gates', 'bad');
    else toast('God of Choice locked this option', 'bad');
    return;
  }
  showMenu(false);
  if (b.dataset.act !== 'close') setBuild(b.dataset.act); // stays selected for repeat placement
});
const dropBtn = $('btnDrop');
dropBtn.addEventListener('pointerdown', e => {
  e.preventDefault(); if (!S || S.over || worldInputBlocked()) return;
  showMenu(false);
  S.dropHold = true; S.dropT = 0.4; dropCoin();
  try { dropBtn.setPointerCapture(e.pointerId); } catch (_) {}
  dropBtn.classList.add('held');
});
const dropEnd = () => { if (S) S.dropHold = false; dropBtn.classList.remove('held'); };
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) dropBtn.addEventListener(t, dropEnd);
$('btnSkip').hidden = !DEBUG;
$('btnSkip').addEventListener('click', () => { if (DEBUG) skipPhase(); });
$('btnRestart').addEventListener('click', () => {
  if (!S || S.mode === 'endless') startEndless();
  else newGame({ mode: S.mode });
});
$('btnRetry').addEventListener('click', () => startChallenge({ curses: lastChallenge.curses, blessings: lastChallenge.blessings, retry: true }));
$('btnMenu').addEventListener('click', () => showTitle());
$('btnEndless').addEventListener('click', () => openAccount());
$('btnChallenge').addEventListener('click', () => openLoadout());
$('btnAcctBack').addEventListener('click', () => showTitle());
$('btnSignIn').addEventListener('click', () => requestSignIn($('acctName').value, $('acctPass').value));
$('btnSignUp').addEventListener('click', () => requestCreateKingdom());
if ($('btnNeedRetry')) $('btnNeedRetry').addEventListener('click', () => openAccount());
if ($('btnNeedChallenge')) $('btnNeedChallenge').addEventListener('click', () => openLoadout());
$('acctPass').addEventListener('keydown', e => { if (e.key === 'Enter') requestSignIn($('acctName').value, $('acctPass').value); });
$('btnLoadoutBack').addEventListener('click', () => showTitle());
$('btnStartChallenge').addEventListener('click', () => startChallenge());
$('btnInspectClose').addEventListener('click', () => closeInspect());
if ($('btnWorld')) $('btnWorld').addEventListener('click', () => openWorld());
if ($('btnWorldClose')) $('btnWorldClose').addEventListener('click', () => closeWorld());
$('inspectActions').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn || btn.disabled || !PUI.inspectId) return;
  if (worldInputBlocked()) return;
  const act = btn.dataset.act;
  if (act === 'upgrade') requestUpgrade(PUI.inspectId, {});
  else if (act === 'cannon' || act === 'ballista') requestUpgrade(PUI.inspectId, { path: act });
  else if (act === 'cancel') requestUpgrade(PUI.inspectId, { cancel: true });
  else if (act === 'stock') requestStock(PUI.inspectId);
  else if (act === 'gate') requestSwapGate(PUI.inspectId);
  else if (act === 'plant') {
    const t = inspectTarget();
    if (t) requestPlantBanner(t.region);
  }
  renderInspect(true);
});

function setBuild(t) {
  if (!S) return;
  if (t && (t === 'wall' || t === 'gate') && hasCurse('nowalls')) { toast('No Walls Pact forbids walls and gates', 'bad'); return; }
  if (t && optionLocked(t)) { toast('God of Choice locked this option', 'bad'); return; }
  if (S.sel) S.sel = null;
  if (S.build === 'demolish' && t !== 'demolish') unmarkAllDemo();
  wallDrag = null;
  S.build = t; S.mapDirty = true;
  const bb = $('btnBuild');
  bb.classList.toggle('sel', !!t);
  bb.querySelector('b').textContent = t ? 'Cancel' : 'Build';
  bb.querySelector('i').textContent = t ? NICE[t] : 'menu';
  if (!t) { $('hint').textContent = ''; lookFree = false; }
  else if (t === 'wall') $('hint').textContent = `Drag to lay a Wall · ${buildCost('wall')} coins each · drag to a screen edge to scroll, two fingers to look around · Cancel to stop`;
  else if (t === 'gate') $('hint').textContent = `Tap to place a Gate, or tap a Wall to swap · ${buildCost('gate')} coins · drag to look around`;
  else if (t === 'clear') $('hint').textContent = `Tap a tree or rock near you to clear it · ${TUNE.treeCost} coin for a tree, ${TUNE.rockCost} for a rock, taken from your purse · tap again to cancel and refund · trees drop ${TUNE.treeCoin} coins, rocks ${TUNE.rockCoin} · drag to look around`;
  else if (t === 'demolish') $('hint').textContent = `Tap a building near you to mark it for demolish — free, no refund · tap again or Cancel to unmark · the Keep cannot be demolished · drag to look around`;
  else $('hint').textContent = `Tap your land to order a ${NICE[t]} · ${buildCost(t)} coins · drag to look around`;
}
function isStandType(t) { return !!TOOL[t]; }
function rackedToolCount(st) { return Math.max(0, Math.min((st && st.tools) || 0, TUNE.standMax)); }
function setZoomAt(z, sx, sy) {
  const before = s2w(sx, sy);
  zoom = z;
  applyScale();
  lookX = before.x - (sx - vw / 2) / scale;
  lookY = before.y - (sy - vh / 2) / scale;
}
function followCam(dt) {
  if (!S || pinch) return;
  if (ptr && ptr.pan) return;
  // In build mode, or while a worker is selected to send, a pan / scripted look stays put so you can tap off-screen land.
  if (lookFree && (S.build || (S && S.sel) || PUI.worldLook)) return;
  lookFree = false;
  const m = S.monarch;
  if (lookX == null) { lookX = m.x; lookY = m.y; return; }
  const k = Math.min(1, 6 * dt);
  lookX += (m.x - lookX) * k;
  lookY += (m.y - lookY) * k;
}
function showMenu(on) {
  if (on) { closeInspect(); refreshBuildMenu(); }
  $('buildMenu').hidden = !on;
  $('btnBuild').classList.toggle('open', !!on);
}
function toggleRally() {
  S.rally = !S.rally;
  let n = 0;
  for (const a of S.archers) {
    if (S.rally) { if (dist(a, S.monarch) < TUNE.rallyRange) { a.follow = true; n++; } }
    else a.follow = false;
  }
  $('btnRally').classList.toggle('sel', S.rally);
  toast(S.rally ? (n ? `Rally! ${n} archer${n === 1 ? '' : 's'} follow you` : 'Rally: no archers nearby') : 'Archers return to guard duty', S.rally ? 'good' : '');
}

function camera() {
  const tx = lookX != null ? lookX : S.monarch.x, ty = lookY != null ? lookY : S.monarch.y;
  const hw = vw / 2 / scale, hh = vh / 2 / scale;
  // Signed-in Endless: the monarch may walk the whole shared world, so the camera may leave the home 2400 map.
  if (canWalkWorld() || PUI.worldLook) return { x: tx, y: ty };
  return { x: clamp(tx, Math.min(hw, CX), Math.max(W - hw, CX)), y: clamp(ty, Math.min(hh, CY), Math.max(H - hh, CY)) };
}
function s2w(sx, sy) { const c = camera(); return { x: c.x + (sx - vw / 2) / scale, y: c.y + (sy - vh / 2) / scale }; }
function w2s(wx, wy) { const c = camera(); return { x: (wx - c.x) * scale + vw / 2, y: (wy - c.y) * scale + vh / 2 }; }

function hiredWorkers() {
  const list = [];
  if (!S) return list;
  for (const f of S.folk) if (f.role !== 'vagrant') list.push(f);
  for (const a of S.archers) list.push(a);
  return list;
}
function workerAt(x, y) {
  let best = null, bd = Math.max(24, 42 / scale);
  const pt = { x, y };
  for (const u of hiredWorkers()) {
    const d = dist(u, pt) - (u.r || 9);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}
function isOwnedLand(x, y) {
  const r = S.regions[regionIdAt(x, y)];
  return !!(r && r.owner === 'player');
}
function clearSel() {
  if (!S) return;
  S.sel = null;
  if (S.build) return;
  const bb = $('btnBuild');
  if (bb) {
    bb.classList.remove('sel');
    const b = bb.querySelector('b'), i = bb.querySelector('i');
    if (b) b.textContent = 'Build';
    if (i) i.textContent = 'menu';
  }
  const h = $('hint'); if (h) h.textContent = '';
}
function setSel(u) {
  if (!S || !u) return;
  S.sel = { u, t0: performance.now() };
  const bb = $('btnBuild');
  if (bb) {
    bb.classList.add('sel');
    const b = bb.querySelector('b'), i = bb.querySelector('i');
    if (b) b.textContent = 'Cancel';
    if (i) i.textContent = '';
  }
  const h = $('hint'); if (h) h.textContent = 'Tap where to send';
}
function sendWorker(u, x, y) {
  if (!u) return false;
  if (!isOwnedLand(x, y)) {
    toast('You can only send workers on land you own', 'bad');
    if (S.sel) S.sel.t0 = performance.now();
    return false;
  }
  if (u.type === 'archer') {
    u.follow = false;
    u.sendPost = true;
    u.post = { x, y, r: 16, sent: 1 };
    u.tx = x; u.ty = y;
    u.send = { x, y };
  } else {
    u.send = { x, y };
    u.tx = x; u.ty = y;
  }
  clearSel();
  return true;
}
function tickSel() {
  if (!S || !S.sel) return;
  const u = S.sel.u;
  const gone = !u || u.hp <= 0 || u.role === 'vagrant'
    || (u.type === 'archer' ? !S.archers.includes(u) : !S.folk.includes(u));
  if (gone || performance.now() - (S.sel.t0 || 0) > (TUNE.sendTimeout || 6) * 1000) clearSel();
}

function onTap(sx, sy) {
  if (S.over) return;
  const w = s2w(sx, sy);
  if (S.build === 'clear') return tryMarkDecor(w.x, w.y, true);
  if (S.build === 'demolish') return tryMarkDemo(w.x, w.y, true);
  if (S.build) return tryPlace(S.build, w.x, w.y);
  const bld = buildingAt(w.x, w.y, Math.max(44, 64 / scale));
  const hit = workerAt(w.x, w.y);
  // A selected worker stays in "tap where to send" mode — don't steal the dest tap for inspect.
  if (!S.sel && bld) {
    const bD = dist(bld, w) - (bld.r || 16);
    const hD = hit ? dist(hit, w) - (hit.r || 9) : 1e9;
    if (!hit || bD <= hD + 6) {
      openInspect(bld);
      return;
    }
  }
  if (PUI.inspectId) { closeInspect(); return; }
  // Prefer a tree/rock under the finger unless a worker is already selected (then a worker tap switches/deselects).
  const decor = decorAt(w.x, w.y, Math.max(28, 48 / scale));
  if (hit) {
    const hitD = dist(hit, w) - (hit.r || 9);
    const decD = decor ? dist(decor, w) - (decor.r || 16) : 1e9;
    const preferDecor = decor && !S.sel && decD <= hitD + 8;
    if (!preferDecor) {
      if (S.sel && S.sel.u === hit) clearSel();
      else setSel(hit);
      return;
    }
  }
  if (S.sel) { sendWorker(S.sel.u, w.x, w.y); return; }
  if (tryMarkDecor(w.x, w.y, false)) return;
  // tap an enemy to focus it
  let best = null, bd = 45 / scale;
  for (const e of enemiesList()) { const d = dist(e, w) - e.r; if (d < bd) { bd = d; best = e; } }
  if (best) { S.monarch.target = best; if (dist(best, S.monarch) > 90) toast('Target set — move closer to strike'); }
}

function decorKind(o) { return o && o.kind ? o.kind : (S.trees.includes(o) ? 'tree' : S.rocks.includes(o) ? 'rock' : null); }
function clearCost(o) { return decorKind(o) === 'rock' ? TUNE.rockCost : TUNE.treeCost; }
function clearPaid(o) { return !!o && (o.paid || 0) >= clearCost(o); }
function isClearJob(j) {
  if (!j || !j.marked || !clearPaid(j) || (j.prog || 0) >= 1) return false;
  const k = decorKind(j);
  return k === 'tree' ? S.trees.includes(j) : k === 'rock' ? S.rocks.includes(j) : false;
}
function decorAt(x, y, rad) {
  let best = null, bd = rad;
  const pt = { x, y };
  for (const t of S.trees) { const d = dist(t, pt) - (t.r || 16); if (d < bd) { bd = d; best = t; } }
  for (const rk of S.rocks) { const d = dist(rk, pt) - (rk.r || 12); if (d < bd) { bd = d; best = rk; } }
  return best;
}
function unmarkClear(obj) {
  if (!obj || !obj.marked) return;
  const cost = clearCost(obj);
  const refund = Math.min(cost, obj.paid || 0);
  if (refund) { S.coins += refund; floatTxt(obj.x, obj.y - 36, '+' + refund, '#ffd56a'); }
  obj.marked = false; obj.paid = 0; obj.prog = 0;
  for (const f of S.folk) if (f.job === obj) f.job = null;
  toast(decorKind(obj) === 'rock' ? 'Rock unmarked — coins refunded' : 'Tree unmarked — coin refunded');
}
function markClear(obj) {
  if (!obj) return null;
  if (obj.marked) { unmarkClear(obj); return obj; }
  const k = decorKind(obj), cost = k === 'rock' ? TUNE.rockCost : TUNE.treeCost;
  const drop = k === 'rock' ? TUNE.rockCoin : TUNE.treeCoin;
  if (S.coins < cost) {
    toast(cost === 1 ? 'Need 1 coin' : 'Need ' + cost + ' coins', 'bad');
    return null;
  }
  S.coins -= cost;
  obj.marked = true; obj.prog = 0; obj.paid = cost;
  floatTxt(obj.x, obj.y - 36, '-' + cost, '#ffb0a0');
  toast(k === 'rock'
    ? `Rock marked — a Builder will break it (drops ${drop} coins)`
    : `Tree marked — a Builder will chop it (drops ${drop} coins)`);
  return obj;
}
function tryMarkDecor(x, y, mode) {
  const rad = Math.max(36, 48 / scale);
  const hit = decorAt(x, y, rad);
  if (!hit) { if (mode) toast('Tap a tree or rock to clear it'); return null; }
  if (dist(hit, S.monarch) > TUNE.clearMarkRange) {
    if (mode) toast('Move closer to mark that', 'bad');
    return null;
  }
  if (hit.marked) { unmarkClear(hit); return hit; }
  // Truthy even when the player cannot afford it, so the tap is consumed after the toast.
  return markClear(hit) || true;
}
function isDemoJob(j) {
  return !!(j && j.demo && S.buildings.includes(j) && j.owner === 'player' && (j.demoProg || 0) < 1);
}
function coreAt(x, y, rad) {
  let best = null, bd = rad;
  const pt = { x, y };
  for (const r of S.regions) {
    if (!r.core || (r.owner !== 'player' && r.owner !== 'contested')) continue;
    const d = dist(r.core, pt) - (r.core.r || 20);
    if (d < bd) { bd = d; best = r.core; }
  }
  return best;
}
function bldAt(x, y, rad) {
  let best = null, bd = rad;
  const pt = { x, y };
  for (const b of S.buildings) {
    if (b.owner !== 'player') continue;
    const d = dist(b, pt) - (b.r || 16);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function unmarkDemo(b) {
  if (!b || !b.demo) return;
  b.demo = false; b.demoProg = 0;
  for (const f of S.folk) if (f.job === b) f.job = null;
  toast((NICE[b.tool] || NICE[b.type] || 'Building') + ' unmarked');
}
function unmarkAllDemo() {
  if (!S) return;
  for (const b of S.buildings) if (b.demo) { b.demo = false; b.demoProg = 0; }
  for (const f of S.folk) if (f.role === 'builder' && f.job && f.job.demo === false) f.job = null;
}
function evictToCap() {
  let over = workers() - housingCap();
  if (over <= 0) return 0;
  let n = 0;
  const evictFolk = pred => {
    for (const f of S.folk) {
      if (over <= 0) break;
      if (f.role === 'vagrant' || !pred(f)) continue;
      if (f.role === 'farmer' && f.job && f.job.farmer === f) f.job.farmer = null;
      if (f.role === 'miner') for (const m of (S.mines || [])) if (m.miner === f) m.miner = null;
      f.role = 'vagrant'; f.job = null; f.stand = null; f.tx = null; f.state = 'idle';
      over--; n++;
    }
  };
  evictFolk(f => f.role === 'villager');
  evictFolk(f => f.role === 'farmer');
  evictFolk(f => f.role === 'miner');
  evictFolk(f => f.role === 'builder' && S.folk.filter(o => o.role === 'builder').length > 1);
  for (let i = S.archers.length - 1; i >= 0 && over > 0; i--) {
    const a = S.archers[i];
    S.archers.splice(i, 1);
    S.folk.push(mkFolk('vagrant', a.x, a.y));
    over--; n++;
  }
  evictFolk(f => f.role === 'builder');
  settleVagrants();
  return n;
}
function finishDemo(b) {
  if (!b || !S.buildings.includes(b)) return;
  const wasHouse = b.type === 'house' && b.owner === 'player';
  const label = NICE[b.tool] || NICE[b.type] || 'Building';
  const stock = (b.tool && (b.tools || 0) > 0) ? b.tools : 0;
  const leftover = (b.tool ? (b.paid || 0) : 0);
  const coins = (b.tool ? stock * (TOOL[b.tool] ? toolStockCost(b.tool) : 0) + leftover : 0);
  for (const f of S.folk) {
    if (f.job === b) { if (b.farmer === f) b.farmer = null; f.job = null; }
    if (f.stand === b) f.stand = null;
  }
  S.buildings.splice(S.buildings.indexOf(b), 1);
  const si = S.stands.indexOf(b); if (si >= 0) S.stands.splice(si, 1);
  markNavDirty();
  if (coins) dropLoot(b.x, b.y, coins);
  S.fx.push({ k: 'puff', x: b.x, y: b.y, t: 0.55, t0: 0.55, big: 1 });
  floatTxt(b.x, b.y - 36, label + ' gone', '#ffd0c8');
  if (S.stats) S.stats.demo = (S.stats.demo || 0) + 1;
  if (wasHouse) {
    const ev = evictToCap();
    toast(ev
      ? `House demolished — ${ev} worker${ev === 1 ? '' : 's'} evicted (no refund)`
      : 'House demolished — no refund', ev ? 'bad' : '');
  } else if (b.tool) {
    toast(coins
      ? `${label} demolished — ${coins} coin${coins === 1 ? '' : 's'} from leftover stock`
      : `${label} demolished — no refund`);
  } else {
    toast(label + ' demolished — no refund');
  }
}
function tryMarkDemo(x, y, mode) {
  const rad = Math.max(36, 52 / scale);
  const core = coreAt(x, y, rad);
  const b = bldAt(x, y, rad);
  const coreD = core ? dist(core, { x, y }) - (core.r || 20) : 1e9;
  const bD = b ? dist(b, { x, y }) - (b.r || 16) : 1e9;
  if (core && coreD <= bD) {
    toast(isPlayerKeep(core) ? 'You cannot demolish the Keep' : 'You cannot demolish a banner', 'bad');
    return true;
  }
  if (!b) { if (mode) toast('Tap a building to demolish it'); return null; }
  if (dist(b, S.monarch) > (TUNE.demoMarkRange || TUNE.clearMarkRange || 170)) {
    if (mode) toast('Move closer to mark that', 'bad');
    return null;
  }
  if (b.demo) { unmarkDemo(b); return b; }
  b.demo = true; b.demoProg = 0;
  const label = NICE[b.tool] || NICE[b.type] || 'Building';
  toast(label + ' marked — a Builder will tear it down (no refund)');
  return b;
}
function dropLoot(x, y, n) {
  for (let i = 0; i < n; i++) {
    S.drops.push({
      x: x + (Math.random() - .5) * 18, y: y + 8 + (Math.random() - .5) * 10,
      z: 22 + i * 8, vz: -50 - i * 8, landed: false, away: true, age: 0, tryT: 0, loot: true
    });
  }
}
function finishClear(obj) {
  const k = decorKind(obj); if (!k) return;
  const arr = k === 'tree' ? S.trees : S.rocks;
  const i = arr.indexOf(obj); if (i < 0) return;
  arr.splice(i, 1);
  const n = k === 'rock' ? TUNE.rockCoin : TUNE.treeCoin;
  dropLoot(obj.x, obj.y, n);
  S.stats.cleared++; S.stats.clearCoins += n;
  S.fx.push({ k: 'puff', x: obj.x, y: obj.y, t: 0.55, t0: 0.55, big: 1 });
  floatTxt(obj.x, obj.y - 36, '+' + n, '#ffd56a');
  toast(k === 'rock' ? `Rock broken — ${n} coins on the ground` : `Tree felled — ${n} coins on the ground`, 'good');
  for (const f of S.folk) if (f.job === obj) f.job = null;
}
function placeBlocked(type, x, y, extra) {
  if ((type === 'wall' || type === 'gate') && hasCurse('nowalls')) return 'No Walls Pact forbids walls and gates';
  if (optionLocked(type)) return 'God of Choice locked this option';
  const oz = owningZoneAt(x, y);
  if (x < 20 || y < 20 || x > W - 20 || y > H - 20) {
    if (!oz || oz.home) return 'Out of bounds';
  }
  const rid = oz && oz.rid != null ? oz.rid : regionIdAt(x, y);
  const r = (oz && oz.r) || (S.regions && S.regions[rid]);
  if (!oz && (!r || r.owner !== 'player')) return 'You can only build in captured land';
  if (!oz && r && r.owner !== 'player') return 'You can only build in captured land';
  if (type === 'hall') {
    if ((oz && oz.home && oz.rid === 0) || rid === 0) return 'The castle already governs your seat';
    const zid = oz && oz.z && oz.z.id;
    if (S.buildings.some(b => b.type === 'hall' && b.hp > 0 && ((zid && b.zoneId === zid) || (rid != null && b.region === rid)))) return 'This land already has a Hall';
  }
  if (r && r.core && dist(r.core, { x, y }) < 40) return 'Too close to the banner';
  const rr = (BLD[type] && BLD[type].r) || 16;
  const ignore = extra && extra.ignore;
  const wallish = t => t === 'wall' || t === 'gate';
  const tooClose = (other, otherType) => {
    const d = dist(other, { x, y });
    if (wallish(type) && wallish(otherType || type)) return d < (TUNE.wallSpacing || 34) - 4;
    return d < (other.r || rr) + rr + 2;
  };
  for (const b of S.buildings) {
    if (b === ignore) continue;
    if (tooClose(b, b.type)) return 'Spot taken';
  }
  for (const s of S.stands) {
    if (s === ignore || S.buildings.includes(s)) continue;
    if (dist(s, { x, y }) < rr + 22) return 'Too close to a tool stand';
  }
  if (extra && extra.others) {
    for (const o of extra.others) if (tooClose(o, o.type || type)) return 'Spot taken';
  }
  if (isStandType(type) && S.stands.some(st => st.tool === type && st.region === rid && st.owner === 'player')) return 'This land already has a ' + NICE[type];
  for (const t of S.trees) if (dist(t, { x, y }) < (t.r || 16) + rr + 2) return 'Clear the tree first';
  for (const rk of S.rocks) if (dist(rk, { x, y }) < (rk.r || 12) + rr + 2) return 'Clear the rock first';
  for (const m of (S.mines || [])) if (dist(m, { x, y }) < (m.r || 22) + rr + 4) return 'Too close to a mine';
  for (const ru of (S.rubble || [])) {
    if (S.day < ru.unlockDay && dist(ru, { x, y }) < (ru.r || 16) + rr) return 'Rubble — wait until day ' + ru.unlockDay;
  }
  return null;
}
function swapWallForGate(wall) {
  if (hasCurse('nowalls') || optionLocked('gate')) return toast('No Walls Pact forbids walls and gates', 'bad');
  const fee = Math.max(0, buildCost('gate') - buildCost('wall'));
  if (S.coins < fee) return toast(fee ? `Need ${fee} coins to swap in a Gate` : 'Cannot swap', 'bad');
  if (fee) { S.coins -= fee; floatTxt(wall.x, wall.y - 30, '-' + fee, '#ffb0a0'); }
  wall.type = 'gate';
  markNavDirty();
  const ratio = wall.max ? wall.hp / wall.max : 1;
  applyTier(wall, false);
  wall.hp = Math.max(1, Math.ceil(wall.max * (wall.built >= 1 ? ratio : Math.max(0.15, wall.built || 0))));
  toast(wall.built >= 1 ? 'Wall swapped for a Gate' : 'Wall order swapped for a Gate', 'good');
  return wall;
}
function placeBld(type, x, y) {
  const oz = owningZoneAt(x, y);
  const rid = oz && oz.rid != null ? oz.rid : regionIdAt(x, y);
  S.coins -= buildCost(type);
  const b = mkBld(type, x, y, rid, 0);
  if (oz && oz.z) b.zoneId = oz.z.id;
  if (isStandType(type)) { b.tool = type; b.paid = 0; b.tools = 0; S.stands.push(b); }
  S.buildings.push(b);
  if (S.rubble && S.rubble.length) S.rubble = S.rubble.filter(ru => dist(ru, b) > (ru.r || 16) + (b.r || 16));
  markNavDirty();
  floatTxt(x, y - 30, '-' + buildCost(type), '#ffb0a0');
  return b;
}
function tryPlace(type, x, y) {
  if (type === 'clear') return tryMarkDecor(x, y, true);
  if (type === 'demolish') return tryMarkDemo(x, y, true);
  if (type === 'gate') {
    const hit = S.buildings.find(b => b.type === 'wall' && b.owner === 'player' && dist(b, { x, y }) < (b.r || 16) + 14);
    if (hit) return swapWallForGate(hit);
  }
  const why = placeBlocked(type, x, y);
  if (why) return toast(why, 'bad');
  if (S.coins < buildCost(type)) return toast(`Need ${buildCost(type)} coins`, 'bad');
  const b = placeBld(type, x, y);
  const nb = S.folk.filter(f => f.role === 'builder').length;
  toast(nb ? `${NICE[type]} ordered — a Builder is on the way` : `${NICE[type]} ordered — buy a hammer to get a Builder`, nb ? '' : 'bad');
  return b;
}
function planWallLine(x0, y0, x1, y1) {
  const sp = TUNE.wallSpacing, dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
  const steps = d < sp * 0.45 ? 0 : Math.max(1, Math.round(d / sp));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    pts.push({ x: x0 + dx * t, y: y0 + dy * t });
  }
  const planned = [], others = [];
  let paid = 0;
  for (const pt of pts) {
    const why = placeBlocked('wall', pt.x, pt.y, { others });
    const afford = !why && S.coins >= paid + buildCost('wall');
    const ok = !why && afford;
    planned.push({ x: pt.x, y: pt.y, ok, why: why || (afford ? null : 'Need more coins') });
    if (ok) { others.push({ x: pt.x, y: pt.y, r: BLD.wall.r }); paid += buildCost('wall'); }
  }
  return planned;
}
function commitWallLine(plan) {
  if (!S || S.over) return 0;
  const ok = (plan || []).filter(pt => pt.ok);
  if (!ok.length) {
    const why = (plan && plan[0] && plan[0].why) || 'Cannot place wall here';
    toast(why, 'bad');
    return 0;
  }
  let n = 0;
  for (const pt of ok) {
    if (S.coins < buildCost('wall')) break;
    if (placeBld('wall', pt.x, pt.y)) n++;
  }
  if (n) {
    const nb = S.folk.filter(f => f.role === 'builder').length;
    toast(nb
      ? (n === 1 ? 'Wall ordered — a Builder is on the way' : n + ' walls ordered — Builders will raise them')
      : 'Walls ordered — buy a hammer to get a Builder', nb ? '' : 'bad');
  }
  return n;
}

// ---------- coin economy (Kingdom-style coin drops) ----------
function floatTxt(x, y, txt, col) {
  let nx = x, ny = y;
  const near = (S.fx || []).filter(f => f.k === 'txt' && Math.hypot(f.x - x, f.y - y) < 46);
  if (near.length) {
    const k = near.length;
    nx += (k % 2 ? 1 : -1) * 26 * Math.ceil(k / 2);
    ny -= 18 * k;
  }
  S.fx.push({ k: 'txt', x: nx, y: ny, txt, col: col || '#ffd56a', t: 1.1, t0: 1.1 });
}
function workers() { let n = S.archers.length; for (const f of S.folk) if (f.role !== 'vagrant') n++; return n; }
function housingCap() {
  let c = S.regions[0].owner === 'player' ? TUNE.keepSlots : 0;
  for (const b of S.buildings) if (b.type === 'house' && b.owner === 'player' && b.built >= 1) c += houseSlotsOf(b);
  return c;
}
function keepLevel() {
  const h = S && S.regions && S.regions[0];
  return (h && h.owner === 'player' && h.core && h.core.level) || 1;
}
function isPlayerKeep(k) {
  if (!k || k.type !== 'core') return false;
  const h = S.regions[0];
  return k === h.core || !!k.keep;
}
function houseSlotsOf(b) {
  const lv = Math.max(1, Math.min(3, (b && b.level) || 1));
  const arr = TUNE.houseSlotsByLevel || [TUNE.houseSlots || 1, 2, 3];
  return arr[lv - 1] || 1;
}
function farmCoinsOf(b) {
  const lv = Math.max(1, Math.min(3, (b && b.level) || 1));
  const arr = TUNE.farmCoinsByLevel || [TUNE.farmCoins || 1, 2, 3];
  return (arr[lv - 1] || 1) + (hasBless('fields') ? (TUNE.blessFieldCoins || 1) : 0);
}
function upgradeCostTo(lv, b) {
  let c = (TUNE.upgradeCost && TUNE.upgradeCost[lv]) || (lv === 2 ? 12 : 20);
  if (b && b.type === 'tower' && hasCurse('notowers')) c = Math.round(c * (TUNE.curseNoTowerMul || 3));
  return c;
}
function pathIndex(lv) { return lv <= 2 ? 0 : 1; }
function towerCombat(b) {
  const lv = b.level || 1, path = b.path;
  if (lv <= 1 || !path) {
    return { hp: TUNE.towerHp[1], r: TUNE.towerR[1], range: TUNE.towerRange[1], dmg: TUNE.towerDmg[1], cd: TUNE.towerCd[1], aoe: 0, pierce: 0 };
  }
  const i = pathIndex(lv);
  return {
    hp: TUNE.towerHp[path][i], r: TUNE.towerR[path][i], range: TUNE.towerRange[path][i],
    dmg: TUNE.towerDmg[path][i], cd: TUNE.towerCd[path][i],
    aoe: (TUNE.towerAoe[path] || [0, 0])[i] || 0,
    pierce: (TUNE.towerPierce[path] || [0, 0])[i] || 0
  };
}
function applyTier(b, init) {
  if (!b) return;
  const lv = Math.max(1, Math.min(3, b.level || 1));
  const prevMax = b.max || 0;
  let max = prevMax, r = b.r || 16;
  if (b.type === 'core') {
    if (isPlayerKeep(b)) { max = TUNE.keepHp[lv - 1]; r = TUNE.keepR[lv - 1]; }
  } else if (b.type === 'house') { max = TUNE.houseHp[lv - 1]; r = TUNE.houseR[lv - 1]; }
  else if (b.type === 'wall') { max = TUNE.wallHp[lv - 1]; r = TUNE.wallR[lv - 1]; }
  else if (b.type === 'gate') { max = TUNE.gateHp[lv - 1]; r = TUNE.gateR[lv - 1]; }
  else if (b.type === 'farm') { max = TUNE.farmHp[lv - 1]; r = TUNE.farmR[lv - 1]; }
  else if (b.type === 'fort') { max = TUNE.fortHp[lv - 1]; r = TUNE.fortR[lv - 1]; }
  else if (b.type === 'tower') {
    const c = towerCombat(b); max = c.hp; r = c.r;
  } else if (BLD[b.type]) { max = BLD[b.type].hp; r = BLD[b.type].r; }
  if ((b.type === 'wall' || b.type === 'gate') && hasBless('stone')) max = Math.round(max * (TUNE.blessStoneHp || 1.4));
  if (b.owner !== 'pale' && b.type !== 'core' && allyHpMul() !== 1) max = Math.round(max * allyHpMul());
  else if (b.type === 'core' && isPlayerKeep(b) && allyHpMul() !== 1) max = Math.round(max * allyHpMul());
  b.max = max; b.r = r;
  if (init) b.hp = (b.built >= 1 || b.type === 'core') ? max : Math.ceil(max * 0.15);
  else if (max > prevMax) b.hp = Math.min(max, (b.hp || 0) + (max - prevMax));
  else b.hp = Math.min(b.hp || max, max);
}
function mineOf(kind) { return (S.mines || []).find(m => m.kind === kind) || null; }
function minerReach(m) {
  return (m && m.r || TUNE.mineR || 22) + (TUNE.navPad || 10) + 16;
}
function minerAtMine(m) {
  if (!m || !m.miner) return null;
  const f = m.miner;
  if (!S.folk.includes(f) || f.role !== 'miner') { m.miner = null; return null; }
  if (dist(f, m) > minerReach(m)) return null;
  return f;
}
function materialReady(kind) {
  const m = mineOf(kind);
  if (!m) return false;
  const r = S.regions[m.region];
  return !!(r && r.owner === 'player' && minerAtMine(m));
}
function mineOwned(kind) {
  const m = mineOf(kind);
  if (!m) return false;
  const r = S.regions[m.region];
  return !!(r && r.owner === 'player');
}
function upgradeNeed(target, levelTo) {
  if (!target) return { ok: false, lock: 'none', reason: 'No target' };
  if ((target.level || 1) >= 3) return { ok: false, lock: 'max', reason: 'Already iron', levelTo: 3 };
  const lv = levelTo || (target.level || 1) + 1;
  if (lv > 3) return { ok: false, lock: 'max', reason: 'Already iron', levelTo: lv };
  if (target.type === 'tower' && lv >= 2 && !target.path && !target._pickPath) {
    return { ok: false, lock: 'path', reason: 'Choose Cannon or Ballista', levelTo: lv };
  }
  const isKeep = isPlayerKeep(target);
  const mat = lv === 2 ? 'stone' : 'iron';
  if (!isKeep && lv > keepLevel()) return { ok: false, lock: 'keep', reason: 'Need Keep Lv ' + lv, levelTo: lv, mat };
  const choiceWhy = (function () {
    if (!hasCurse('choice')) return null;
    if (isPlayerKeep(target) && optionLocked('upgrade-keep')) return 'Keep upgrades are locked this run';
    if (target.type === 'house' && optionLocked('upgrade-house')) return 'House upgrades are locked this run';
    if ((target.type === 'wall' || target.type === 'gate') && optionLocked('upgrade-wall')) return 'Wall upgrades are locked this run';
    if (target.type === 'farm' && optionLocked('upgrade-farm')) return 'Farm upgrades are locked this run';
    if (target.type === 'tower') {
      const p = target.path || target._pickPath;
      if (p === 'cannon' && optionLocked('upgrade-tower-cannon')) return 'Cannon upgrades are locked this run';
      if (p === 'ballista' && optionLocked('upgrade-tower-ballista')) return 'Ballista upgrades are locked this run';
      if (!p && optionLocked('upgrade-tower-cannon') && optionLocked('upgrade-tower-ballista')) return 'Tower upgrades are locked this run';
    }
    return null;
  })();
  if (choiceWhy) return { ok: false, lock: 'choice', reason: choiceWhy, levelTo: lv, mat };
  if (!mineOwned(mat)) return { ok: false, lock: 'mine', reason: 'Need an owned ' + mat + ' mine', mat, levelTo: lv };
  if (!materialReady(mat)) return { ok: false, lock: 'miner', reason: 'Need a miner at the ' + mat + ' mine', mat, levelTo: lv };
  return { ok: true, lock: null, reason: '', mat, levelTo: lv, cost: upgradeCostTo(lv, target) };
}
function wallConnected(start) {
  if (!start || (start.type !== 'wall' && start.type !== 'gate')) return [start];
  const reach = (TUNE.wallSpacing || 34) * 1.35;
  const all = S.buildings.filter(b => (b.type === 'wall' || b.type === 'gate') && b.owner === start.owner && b.built >= 1);
  const out = [], seen = new Set();
  const q = [start];
  seen.add(start);
  while (q.length) {
    const cur = q.pop();
    out.push(cur);
    for (const b of all) {
      if (seen.has(b)) continue;
      if (dist(b, cur) <= reach + (b.r || 16) * 0.2) { seen.add(b); q.push(b); }
    }
  }
  return out;
}
function upgradeMembers(target) {
  if (!target) return [];
  if (target.type === 'wall' || target.type === 'gate') {
    const line = wallConnected(target);
    const minL = Math.min(...line.map(b => b.level || 1));
    return line.filter(b => (b.level || 1) === minL);
  }
  return [target];
}
function cancelUpgrade(g) {
  if (!g || g.prog > 0) return;
  const refund = g.paid || 0;
  if (refund) { S.coins += refund; const a = g.members[0]; floatTxt(a.x, a.y - 36, '+' + refund, '#ffd56a'); }
  for (const b of g.members) { if (b.upgGroup === g) b.upgGroup = null; if (b._pickPath) delete b._pickPath; }
  for (const f of S.folk) if (f.job === g) f.job = null;
  toast(refund ? 'Upgrade cancelled — coins refunded' : 'Upgrade cancelled');
}
function beginUpgrade(members, levelTo, path) {
  const lead = members[0];
  const need = upgradeNeed(lead, levelTo);
  if (!need.ok) return need;
  if (lead.type === 'tower' && levelTo >= 2) {
    const p = path || lead.path || lead._pickPath;
    if (!p) return { ok: false, lock: 'path', reason: 'Choose Cannon or Ballista' };
    for (const b of members) b._pickPath = p;
  }
  let g = lead.upgGroup;
  if (g && g.prog > 0) return { ok: false, lock: 'busy', reason: 'A builder is already working' };
  if (!g) {
    const cx = members.reduce((s, b) => s + b.x, 0) / members.length;
    const cy = members.reduce((s, b) => s + b.y, 0) / members.length;
    g = { members, levelTo, paid: 0, cost: need.cost, prog: 0, path: (lead._pickPath || lead.path || null), x: cx, y: cy, r: lead.r || 16, type: 'upgrade' };
    for (const b of members) b.upgGroup = g;
  }
  return { ok: true, group: g, cost: g.cost, paid: g.paid, need };
}
function payUpgrade(g, n) {
  if (!g || g.prog > 0) return 0;
  const room = g.cost - g.paid;
  const add = Math.min(room, n);
  g.paid += add;
  g.paidAt = performance.now();
  const a = g.members[0];
  floatTxt(a.x, a.y - 36, '-' + add, '#ffb0a0');
  if (g.paid >= g.cost) toast('Upgrade paid — a Builder will raise it', 'good');
  return add;
}
function finishUpgrade(g) {
  if (!g) return;
  for (const b of g.members) {
    b.level = g.levelTo;
    if (g.path && b.type === 'tower') b.path = g.path;
    delete b._pickPath;
    applyTier(b, false);
    b.upgGroup = null;
  }
  markNavDirty();
  const a = g.members[0];
  const label = isPlayerKeep(a) ? 'Keep' : (NICE[a.type] || a.type);
  const mat = g.levelTo === 2 ? 'Stone' : 'Iron';
  floatTxt(a.x, a.y - 44, mat + ' ' + label, '#d6ffb0');
  if (a.type === 'house') toast(`House upgraded — now holds ${houseSlotsOf(a)} workers`, 'good');
  else if (a.type === 'tower' && g.path) toast((g.path === 'cannon' ? 'Cannon' : 'Ballista') + ' tower raised', 'good');
  else if (g.members.length > 1) toast('Wall line upgraded to ' + mat.toLowerCase(), 'good');
  else toast(label + ' upgraded to ' + mat.toLowerCase(), 'good');
  if (isPlayerKeep(a) && g.levelTo >= 2) toast('An archer now guards the keep', 'good');
}
function isUpgradeJob(j) { return !!(j && j.members && j.paid >= j.cost && j.prog < 1); }
function placeMines(rnd) {
  S.mines = [];
  const used = new Set([0]);
  for (const kind of ['stone', 'iron']) {
    const cands = S.regions.filter(r => r.id !== 0 && !used.has(r.id));
    for (let i = cands.length - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const tmp = cands[i]; cands[i] = cands[j]; cands[j] = tmp;
    }
    cands.sort((a, b) => Math.hypot(b.x - CX, b.y - CY) - Math.hypot(a.x - CX, a.y - CY));
    const r = cands[0] || S.regions[1];
    used.add(r.id);
    const ang = Math.atan2(r.y - CY, r.x - CX) + (rnd() - 0.5) * 0.9;
    const d = 70 + rnd() * 50;
    const x = clamp(r.x + Math.cos(ang) * d, 80, W - 80);
    const y = clamp(r.y + Math.sin(ang) * d, 80, H - 80);
    S.mines.push({ id: allocBid(), type: 'mine', kind, x, y, r: TUNE.mineR || 22, region: r.id, miner: null });
  }
}
function upgradeTargetAt(x, y, rad) {
  const pt = { x, y };
  let best = null, bd = rad;
  for (const b of S.buildings) {
    if (b.owner !== 'player' || b.built < 1 || b.tool || b.demo) continue;
    if (b.type === 'bow' || b.type === 'hammer' || b.type === 'scythe' || b.type === 'pick') continue;
    const d = dist(b, pt) - (b.r || 16);
    if (d < bd) { bd = d; best = b; }
  }
  for (const r of owned()) {
    if (!r.core || !isPlayerKeep(r.core)) continue;
    const d = dist(r.core, pt) - (r.core.r || 22);
    if (d < bd) { bd = d; best = r.core; }
  }
  return best;
}
function nearestPayableUpgrade(pt, rad) {
  let best = null, bd = rad;
  const consider = [];
  for (const b of S.buildings) if (b.owner === 'player' && b.built >= 1 && !b.tool && !b.demo) consider.push(b);
  for (const r of owned()) if (r.core && isPlayerKeep(r.core)) consider.push(r.core);
  for (const b of consider) {
    const d = dist(b, pt) - (b.r || 16);
    if (d >= bd) continue;
    const members = upgradeMembers(b);
    const lead = members[0];
    if ((lead.level || 1) >= 3) continue;
    if (lead.upgGroup && lead.upgGroup.paid >= lead.upgGroup.cost) continue;
    const need = upgradeNeed(lead, (lead.level || 1) + 1);
    if (!need.ok && need.lock !== 'path') continue;
    if (need.lock === 'path') continue;
    if (dist(S.monarch, b) > (TUNE.upgradeMarkRange || 170)) continue;
    bd = d; best = b;
  }
  return best;
}
function tryUpgradeTap(x, y, sx, sy) {
  const btns = S._choiceBtns;
  if (btns && btns.length && sx != null) {
    for (const btn of btns) {
      if (sx >= btn.x && sx <= btn.x + btn.w && sy >= btn.y && sy <= btn.y + btn.h) {
        const b = btn.b;
        if (dist(b, S.monarch) > (TUNE.upgradeMarkRange || 170)) { toast('Move closer to upgrade that', 'bad'); return true; }
        if (btn.locked) { toast(btn.reason, 'bad'); return true; }
        if (b.path && b.path !== btn.path) { toast('This tower already chose its path', 'bad'); return true; }
        b._pickPath = btn.path;
        const members = upgradeMembers(b);
        const started = beginUpgrade(members, (b.level || 1) + 1, btn.path);
        if (!started.ok) { toast(started.reason, 'bad'); return true; }
        const g = started.group;
        if (g.paid >= g.cost) { toast('A Builder is already on the way', 'good'); return true; }
        const remain = g.cost - g.paid;
        if (S.coins < remain) { toast('Need ' + remain + ' coins', 'bad'); return true; }
        S.coins -= remain;
        payUpgrade(g, remain);
        return true;
      }
    }
  }
  let hit = null;
  if (sx != null && S._upgradeBadges && S._upgradeBadges.length) {
    for (const badge of S._upgradeBadges) {
      if (sx >= badge.x && sx <= badge.x + badge.w && sy >= badge.y && sy <= badge.y + badge.h && badge.lead) {
        hit = badge.lead;
        break;
      }
    }
  }
  // With a worker selected, only steal a ground tap that lands on the building body.
  // The coin-slot / lock badge is handled above so sending past a keep still works.
  if (!hit) {
    const rad = S.sel ? Math.max(18, 28 / scale) : Math.max(36, 52 / scale);
    hit = upgradeTargetAt(x, y, rad);
  }
  if (!hit) return null;
  if (dist(hit, S.monarch) > (TUNE.upgradeMarkRange || 170)) return null;
  const members = upgradeMembers(hit);
  const lead = members[0];
  if (lead.upgGroup && lead.upgGroup.paid > 0 && lead.upgGroup.prog <= 0) {
    // A single press can fire pointerup twice (especially with look-free / touch). Don't refund instantly.
    if ((performance.now() - (lead.upgGroup.paidAt || 0)) < 500) return true;
    cancelUpgrade(lead.upgGroup);
    return true;
  }
  if (lead.type === 'tower' && (lead.level || 1) === 1 && !lead.path) {
    // Path choice is drawn as buttons; a body tap is ignored so the two targets stay the only way to pick.
    const need = upgradeNeed(Object.assign({}, lead, { _pickPath: 'cannon' }), 2);
    if (!need.ok && need.lock !== 'path') toast(need.reason, 'bad');
    return true;
  }
  const need = upgradeNeed(lead);
  if (!need.ok) { toast(need.reason, 'bad'); return true; }
  const started = beginUpgrade(members, need.levelTo, lead.path);
  if (!started.ok) { toast(started.reason, 'bad'); return true; }
  const g = started.group;
  if (g.paid >= g.cost) return true;
  const remain = g.cost - g.paid;
  if (S.coins < remain) { toast('Need ' + remain + ' coins', 'bad'); return true; }
  S.coins -= remain;
  payUpgrade(g, remain);
  return true;
}

function buildingById(id) {
  if (!S || id == null) return null;
  for (const b of S.buildings) if (b.id === id) return b;
  for (const r of S.regions) if (r.core && r.core.id === id) return r.core;
  for (const m of S.mines || []) if (m.id === id) return m;
  if (typeof id === 'string' && id.slice(0, 5) === 'site-') {
    const r = S.regions[+id.slice(5)];
    if (r && isClaimable(r)) return bannerSiteOf(r);
  }
  return null;
}
function buildingAlive(b) {
  if (!S || !b) return false;
  if (b.type === 'mine') return !!(S.mines && S.mines.includes(b));
  if (b.type === 'core') return !!(S.regions[b.region] && S.regions[b.region].core === b);
  if (b.type === 'bannerSite') { const r = S.regions[b.region]; return !!(r && isClaimable(r)); }
  return S.buildings.includes(b);
}
function inspectables() {
  if (!S) return [];
  const out = [];
  for (const b of S.buildings) out.push(b);
  for (const r of S.regions) if (r.core && !S.buildings.includes(r.core)) out.push(r.core);
  for (const r of S.regions) if (isClaimable(r)) out.push(bannerSiteOf(r));
  for (const z of WORLD.zones.values()) if (isWorldClaimable(z) && z.homeId !== myKingdomId()) {
    const loc = localFromWorld(z.wx, z.wy);
    out.push({ id: 'wsite-' + z.id, type: 'bannerSite', x: loc.x, y: loc.y, r: 22, zoneId: z.id, owner: 'none', built: 1, level: 1 });
  }
  for (const m of S.mines || []) out.push(m);
  return out;
}
function buildingAt(x, y, rad) {
  const pt = { x, y };
  let best = null, bd = rad;
  for (const b of inspectables()) {
    const d = dist(b, pt) - (b.r || 16);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function inspectTarget() { return buildingById(PUI.inspectId); }
function tierLabel(lv) { return lv >= 3 ? 'Iron' : lv === 2 ? 'Stone' : 'Wood'; }
function inspectNameOf(b) {
  if (!b) return 'Building';
  if (b.type === 'mine') return (b.kind === 'iron' ? 'Iron' : 'Stone') + ' mine';
  if (b.type === 'bannerSite') return 'Banner site';
  if (b.type === 'core' || b.type === 'keep') return isPlayerKeep(b) ? 'Keep' : (b.owner === 'pale' ? 'Pale banner' : (b.contested ? 'Contested banner' : 'Banner'));
  if (b.type === 'tower' && b.path === 'cannon') return 'Cannon tower';
  if (b.type === 'tower' && b.path === 'ballista') return 'Ballista tower';
  if (b.tool) return NICE[b.tool] || 'Tool stand';
  const n = NICE[b.type] || b.type;
  if (b.owner === 'rival') return (b.worldOwnerName ? (b.worldOwnerName + ' ') : 'Rival ') + n;
  return b.owner === 'pale' ? ('Pale ' + n) : n;
}
function inspectReason(need) {
  if (!need || need.ok) return '';
  const mat = need.mat || 'stone';
  if (need.lock === 'keep') return 'Keep must be level ' + (need.levelTo || 2);
  if (need.lock === 'mine') return 'Needs an owned ' + mat + ' mine';
  if (need.lock === 'miner') return 'Needs a ' + mat + ' mine with a miner';
  if (need.lock === 'path') return 'Choose Cannon or Ballista';
  if (need.lock === 'max') return 'Already iron';
  if (need.lock === 'busy') return 'A builder is already working';
  return need.reason || 'Locked';
}
function inspectCanAct(b) {
  if (!b || b.owner === 'pale' || b.type === 'mine' || b.type === 'bannerSite') return false;
  if (b.type === 'core') return isPlayerKeep(b);
  return true;
}
function inspectStatsOf(b) {
  const rows = [];
  const push = (k, v) => rows.push({ k, v });
  if (b.type === 'mine') {
    const r = S.regions[b.region];
    const owned = !!(r && r.owner === 'player');
    const working = !!minerAtMine(b);
    push('Status', working ? 'Miner working' : owned ? 'No miner' : 'Wild land');
    push('Region', (r && r.name) || ('Land ' + b.region));
    return rows;
  }
  if (b.type === 'bannerSite' || (b.type === 'core' && (b.contested || isContested(S.regions[b.region])))) {
    const r = S.regions[b.region];
    const fails = (r && r.claimFails) || 0;
    const attempt = fails + 1;
    const pct = Math.round((claimScaleOf(r) - 1) * 100);
    push('Status', b.type === 'bannerSite' ? 'Unguarded — plant to contest' : 'Contested');
    push('Region', (r && r.name) || ('Land ' + b.region));
    if (b.max) push('Health', Math.max(0, Math.ceil(b.hp)) + ' / ' + b.max);
    push('Attempt', String(attempt));
    if (fails) push('Failed attempts', String(fails));
    if (pct) push('Next host', '+' + pct + '% count and strength');
    else push('On failure', 'Zone stays enemy; next try +25% count and strength');
    return rows;
  }
  if ((b.built || 0) < 1 && b.type !== 'core') {
    push('Status', 'Under construction');
    push('Progress', Math.round((b.built || 0) * 100) + '%');
  }
  if (b.max) push('Health', Math.max(0, Math.ceil(b.hp)) + ' / ' + b.max);
  const lv = b.level || 1;
  if (b.type === 'house') push('Workers housed', String(houseSlotsOf(b)));
  if (isPlayerKeep(b)) {
    if (TUNE.keepSlots) push('Housing', String(TUNE.keepSlots));
    if (lv >= 2) push('Keep archer', 'Guarding');
  }
  if (b.type === 'farm') {
    push('Pays', farmCoinsOf(b) + ' coin' + (farmCoinsOf(b) === 1 ? '' : 's') + ' per tick');
    const farmed = !!(b.farmer && S.folk.includes(b.farmer));
    push('Farmer', farmed ? 'Working' : 'Needs a Farmer');
  }
  if (b.type === 'tower') {
    const c = towerCombat(b);
    push('Range', String(c.range));
    push('Damage', String(c.dmg));
    push('Shot time', c.cd + 's');
    if (c.aoe) push('Area', String(c.aoe));
    if (c.pierce) push('Pierce', String(c.pierce));
    if (!b.path && lv <= 1) push('Armament', 'Archer');
  }
  if (b.type === 'fort') {
    const i = Math.max(0, Math.min(2, lv - 1));
    push('Archers', String((TUNE.fortArchers && TUNE.fortArchers[i]) || 1));
    push('Range', String((TUNE.fortRange && TUNE.fortRange[i]) || 220));
    push('Damage', String((TUNE.fortDmg && TUNE.fortDmg[i]) || 13));
  }
  if (b.type === 'wall' || b.type === 'gate') {
    const line = wallConnected(b);
    if (line.length > 1) push('Connected line', line.length + ' segments');
    if (lv >= 3) push('Spikes', (TUNE.wallSpikeDmg || 8) + ' damage');
  }
  if (b.tool) {
    const stock = rackedToolCount(b);
    push('Tools stocked', stock + ' / ' + TUNE.standMax);
    if ((b.paid || 0) > 0) push('Partial payment', (b.paid || 0) + ' / ' + toolStockCost(b.tool));
  }
  if (b.upgGroup && b.upgGroup.prog > 0) push('Upgrade', Math.round(b.upgGroup.prog * 100) + '%');
  else if (b.upgGroup && b.upgGroup.paid > 0) push('Upgrade paid', b.upgGroup.paid + ' / ' + b.upgGroup.cost);
  if (b.demo) push('Demolish', 'Marked');
  return rows;
}
function inspectSprite(b) {
  if (!b) return null;
  if (b.type === 'mine') {
    const working = !!minerAtMine(b);
    return getSprite('mine-' + b.kind + (working ? '-working' : '-idle')) || null;
  }
  if (b.type === 'bannerSite') return Art.bannerSite || null;
  if (b.type === 'core' && !isPlayerKeep(b)) return (b.contested ? Art.bannerContest : Art.banner) || null;
  if ((b.built || 0) < 1 && b.type !== 'core' && Art.scaffold) return Art.scaffold[b.built < 0.33 ? 0 : b.built < 0.66 ? 1 : 2] || buildingSpr(b);
  return buildingSpr(b) || (isPlayerKeep(b) ? getSprite(spriteIdFor(b)) : null);
}
function paintInspectPortrait(b) {
  const c = $('inspectArt');
  if (!c) return;
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#2a2118';
  g.fillRect(0, 0, w, h);
  const spr = inspectSprite(b);
  if (!spr || !spr.c) return;
  const gy = spr.gy != null ? spr.gy : spr.h;
  const sc = Math.min((w - 20) / spr.w, (h - 16) / spr.h);
  g.save();
  g.translate(w / 2, h - 8);
  g.scale(sc, sc);
  g.drawImage(spr.c, -spr.w / 2, -gy, spr.w, spr.h);
  g.restore();
}
function inspectActionSig(b) {
  if (!b) return '';
  const g = b.upgGroup;
  const need = (b.type !== 'mine' && !b.tool && ((b.built >= 1) || b.type === 'core') && b.owner !== 'pale')
    ? upgradeNeed(b) : {};
  const line = (b.type === 'wall' || b.type === 'gate') ? wallConnected(b).length : 0;
  const r = S.regions[b.region];
  return [b.id, b.type, b.level || 1, b.path || '', b._pickPath || '', b.built || 0, b.owner || '',
    g && g.paid, g && g.cost, g && Math.round((g.prog || 0) * 20), b.tools, b.paid, S && S.coins,
    need.lock, need.reason, need.cost, line, !!b.demo, b.contested, r && r.owner, r && r.claimFails,
    b.max ? Math.ceil(b.hp) : 0].join('|');
}

// Discrete upgrade command (ready to send over the network later; no networking now).
function requestUpgrade(buildingId, option) {
  option = option || {};
  if (!S || S.over) return { ok: false, reason: 'No game' };
  const target = buildingById(buildingId);
  if (!target || !buildingAlive(target)) return { ok: false, reason: 'No building' };
  if (target.owner === 'pale') return { ok: false, reason: 'That building is not yours' };
  if (target.type === 'mine' || target.tool || isStandType(target.type) && target.tool) return { ok: false, reason: 'Cannot upgrade this' };
  if ((target.built || 0) < 1 && target.type !== 'core') return { ok: false, reason: 'Still under construction' };
  const members = upgradeMembers(target);
  const lead = members[0];
  if (!lead) return { ok: false, reason: 'No building' };
  if (option.cancel) {
    if (lead.upgGroup && lead.upgGroup.prog <= 0) { cancelUpgrade(lead.upgGroup); return { ok: true, cancelled: true }; }
    return { ok: false, reason: 'Nothing to cancel' };
  }
  if (lead.upgGroup && lead.upgGroup.prog > 0) return { ok: false, lock: 'busy', reason: 'A builder is already working' };
  const path = option.path || lead.path || lead._pickPath || null;
  if (path && lead.type === 'tower') lead._pickPath = path;
  const need = upgradeNeed(lead, (lead.level || 1) + 1);
  if (!need.ok) {
    toast(inspectReason(need) || need.reason, 'bad');
    return need;
  }
  const started = beginUpgrade(members, need.levelTo, path);
  if (!started.ok) { toast(inspectReason(started) || started.reason, 'bad'); return started; }
  const g = started.group;
  if (g.paid >= g.cost) { toast('A Builder is already on the way', 'good'); return { ok: true, group: g }; }
  const remain = g.cost - g.paid;
  if (S.coins < remain) { toast('Need ' + remain + ' coins', 'bad'); return { ok: false, lock: 'coins', reason: 'Need ' + remain + ' coins' }; }
  S.coins -= remain;
  payUpgrade(g, remain);
  return { ok: true, group: g };
}
function requestStock(buildingId) {
  if (!S || S.over) return { ok: false, reason: 'No game' };
  const st = buildingById(buildingId);
  if (!st || !st.tool || st.built < 1) return { ok: false, reason: 'No stand' };
  if (st.owner === 'pale') return { ok: false, reason: 'That building is not yours' };
  if ((st.tools || 0) >= TUNE.standMax) return { ok: false, reason: 'Stand is full' };
  const cost = toolStockCost(st.tool);
  const remain = cost - (st.paid || 0);
  if (remain <= 0) return { ok: false, reason: 'Already stocked' };
  if (S.coins < remain) { toast('Need ' + remain + ' coins', 'bad'); return { ok: false, lock: 'coins', reason: 'Need ' + remain + ' coins' }; }
  S.coins -= remain;
  st.paid = (st.paid || 0) + remain;
  floatTxt(st.x + 28, st.y - 70, '-' + remain, '#ffb0a0');
  if (st.paid >= cost) {
    st.paid = 0; st.tools++; S.stats.tools++;
    floatTxt(st.x + 28, st.y - 70, TOOL[st.tool].label + ' ready!', '#d6ffb0');
    toast(`${TOOL[st.tool].label} bought — an idle villager will take it`, 'good');
  }
  return { ok: true };
}
function requestSwapGate(buildingId) {
  if (!S || S.over) return { ok: false, reason: 'No game' };
  const wall = buildingById(buildingId);
  if (!wall || wall.type !== 'wall' || wall.owner !== 'player') return { ok: false, reason: 'Not a wall' };
  const out = swapWallForGate(wall);
  return out ? { ok: true } : { ok: false };
}

function closeInspect() {
  PUI.inspectId = null;
  PUI.inspectSig = '';
  const el = $('inspect');
  if (el) el.hidden = true;
}
function openInspect(b) {
  if (!b || !b.id) return;
  showMenu(false);
  PUI.inspectId = b.id;
  PUI.inspectSig = '';
  const el = $('inspect');
  if (el) el.hidden = false;
  renderInspect(true);
}
function renderInspect(force) {
  const el = $('inspect');
  if (!el) return;
  const b = inspectTarget();
  if (!b || !buildingAlive(b)) { closeInspect(); return; }
  const sig = inspectActionSig(b);
  const name = inspectNameOf(b);
  $('inspectName').textContent = name;
  const lv = b.level || 1;
  let levelTxt = '';
  if (b.type === 'mine') levelTxt = (b.kind === 'iron' ? 'Iron' : 'Stone');
  else if ((b.built || 0) < 1 && b.type !== 'core') levelTxt = 'Under construction';
  else if (b.type === 'bannerSite') levelTxt = 'Plant to contest';
  else if (b.contested || (b.type === 'core' && isContested(S.regions[b.region]))) levelTxt = 'Contested';
  else if (b.owner === 'pale') levelTxt = (b.type === 'core' ? 'Pale Host' : (tierLabel(lv) + ' · Pale Host'));
  else levelTxt = tierLabel(lv) + ' · Level ' + lv;
  $('inspectLevel').textContent = levelTxt;
  const stats = $('inspectStats');
  stats.textContent = '';
  for (const row of inspectStatsOf(b)) {
    const li = document.createElement('li');
    const a = document.createElement('span'); a.textContent = row.k;
    const v = document.createElement('span'); v.textContent = row.v;
    li.appendChild(a); li.appendChild(v);
    stats.appendChild(li);
  }
  paintInspectPortrait(b);
  if (!force && sig === PUI.inspectSig) return;
  PUI.inspectSig = sig;
  const lock = $('inspectLock');
  const acts = $('inspectActions');
  acts.textContent = '';
  const addBtn = (label, act, opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.act = act;
    if (opt && opt.path) btn.dataset.path = opt.path;
    if (opt && opt.disabled) btn.disabled = true;
    if (opt && opt.cls) btn.className = opt.cls;
    btn.appendChild(document.createTextNode(label));
    if (opt && opt.sub) {
      const s = document.createElement('span');
      s.className = 'sub';
      s.textContent = opt.sub;
      btn.appendChild(s);
    }
    acts.appendChild(btn);
    return btn;
  };
  if (b.type === 'bannerSite') {
    const r = S.regions[b.region];
    const fails = (r && r.claimFails) || 0;
    const pct = Math.round((claimScaleOf(r) - 1) * 100);
    lock.hidden = false;
    lock.textContent = pct
      ? 'Plant a banner and hold it through the night to capture. This attempt is +' + pct + '% larger and stronger after ' + fails + ' failure' + (fails === 1 ? '' : 's') + '.'
      : 'Plant a banner and hold it through the night to capture. If it falls, the zone stays enemy and the next attempt is 25% larger and stronger.';
    addBtn('Plant banner', 'plant');
    return;
  }
  if (b.type === 'core' && (b.contested || isContested(S.regions[b.region]))) {
    const r = S.regions[b.region];
    lock.hidden = false;
    lock.textContent = 'Hold this banner until dawn to capture ' + ((r && r.name) || 'this land') + '. If it falls, the zone stays enemy and the next attempt is 25% larger and stronger.';
    return;
  }
  if (b.type === 'mine' || b.owner === 'pale' || ((b.built || 0) < 1 && b.type !== 'core')) {
    lock.hidden = true;
    lock.textContent = '';
    return;
  }
  if (b.tool) {
    lock.hidden = true;
    if ((b.tools || 0) >= TUNE.standMax) {
      lock.hidden = false;
      lock.textContent = 'Stand is full';
    } else {
      const remain = toolStockCost(b.tool) - (b.paid || 0);
      addBtn('Stock a ' + TOOL[b.tool].label + ' — ' + remain, 'stock');
    }
    return;
  }
  if (b.type === 'wall' && b.owner === 'player' && !hasCurse('nowalls') && !optionLocked('gate')) {
    const fee = Math.max(0, buildCost('gate') - buildCost('wall'));
    addBtn('Swap for a Gate — ' + fee, 'gate', { cls: 'alt' });
  }
  const members = upgradeMembers(b);
  const lead = members[0] || b;
  const g = lead.upgGroup;
  if (g && g.prog > 0) {
    lock.hidden = true;
    return;
  }
  if (g && g.paid > 0 && g.prog <= 0) {
    lock.hidden = true;
    addBtn('Cancel upgrade — refund ' + g.paid, 'cancel', { cls: 'ghost' });
    const remain = g.cost - g.paid;
    if (remain > 0) addBtn('Pay remaining — ' + remain, 'upgrade');
    return;
  }
  const needPath = lead.type === 'tower' && (lead.level || 1) === 1 && !lead.path;
  if (needPath) {
    const paths = [
      { path: 'cannon', label: 'Cannon', sub: 'Slow area damage' },
      { path: 'ballista', label: 'Ballista', sub: 'Long range, pierces' },
    ];
    let lockTxt = '';
    for (const pth of paths) {
      const probe = Object.assign({}, lead, { _pickPath: pth.path, path: null });
      const need = upgradeNeed(probe, 2);
      const pathLock = optionLocked('upgrade-tower-' + pth.path);
      const blocked = pathLock || (!need.ok && need.lock !== 'path');
      const why = pathLock ? 'God of Choice locked this path' : inspectReason(need);
      if (blocked && why) lockTxt = why;
      const cost = need.cost || upgradeCostTo(2, lead);
      addBtn((blocked ? why : (pth.label + ' — ' + cost)), pth.path, {
        path: pth.path, disabled: blocked, cls: 'alt', sub: pth.sub
      });
    }
    if (lockTxt && paths.every(pth => optionLocked('upgrade-tower-' + pth.path) || true)) {
      // keep a visible reason when both are blocked for the same non-path gate
      const probe = Object.assign({}, lead, { _pickPath: 'cannon' });
      const need = upgradeNeed(probe, 2);
      if (!need.ok && need.lock !== 'path') {
        lock.hidden = false;
        lock.textContent = inspectReason(need);
      } else lock.hidden = true;
    } else lock.hidden = true;
    return;
  }
  if ((lead.level || 1) >= 3) {
    lock.hidden = true;
    return;
  }
  const need = upgradeNeed(lead);
  const next = tierLabel(need.levelTo || ((lead.level || 1) + 1));
  const nLine = (lead.type === 'wall' || lead.type === 'gate') ? members.length : 0;
  if (!need.ok) {
    lock.hidden = false;
    lock.textContent = inspectReason(need);
    const label = nLine > 1 ? ('Upgrade line (' + nLine + ') to ' + next) : ('Upgrade to ' + next);
    addBtn(label, 'upgrade', { disabled: true, sub: inspectReason(need) });
    return;
  }
  lock.hidden = true;
  const label = nLine > 1
    ? ('Upgrade line (' + nLine + ') to ' + next + ' — ' + need.cost)
    : ('Upgrade to ' + next + ' — ' + need.cost);
  addBtn(label, 'upgrade');
}
function syncInspect() {
  if (!PUI.inspectId) {
    const el = $('inspect');
    if (el && !el.hidden) el.hidden = true;
    return;
  }
  if (!S || S.over) { closeInspect(); return; }
  const b = inspectTarget();
  if (!b || !buildingAlive(b) || (b.hp != null && b.type !== 'mine' && b.hp <= 0)) { closeInspect(); return; }
  const el = $('inspect');
  if (el) el.hidden = false;
  renderInspect(false);
}

function dropCoin() {
  if (!S || S.over) return false;
  const m = S.monarch;
  if (S.coins < 1) { if (S._noCoinT == null || S.t - S._noCoinT > 1.2) { toast('No coins to drop', 'bad'); S._noCoinT = S.t; } return false; }
  S.coins--; S.stats.dropped++;
  S.drops.push({ x: m.x + (Math.random() - .5) * 12, y: m.y + 10 + (Math.random() - .5) * 6, z: 34, vz: -60, landed: false, away: false, age: 0, tryT: 0 });
  floatTxt(m.x + 14, m.y - 50, '-1', '#ffb0a0');
  return true;
}
function claimTarget(d) {
  let best = null, bd = TUNE.dropRange;
  if (S.regions[0].owner === 'player') for (const st of S.stands) if (st.owner === 'player' && st.built >= 1 && st.tools < TUNE.standMax) { const dd = dist(st, d); if (dd < bd) { bd = dd; best = st; } }
  const free = workers() < housingCap();
  d.noHouse = false;
  for (const f of S.folk) if (f.role === 'vagrant') {
    const dd = dist(f, d);
    if (dd < bd) { if (free) { bd = dd; best = f; } else d.noHouse = true; }
  }
  return best;
}
function applyClaim(t) {
  if (t && (t.type === 'core' || (S.buildings.includes(t) && !t.tool))) {
    const members = upgradeMembers(t);
    const lead = members[0];
    const need = upgradeNeed(lead);
    if (!need.ok) return;
    const started = beginUpgrade(members, need.levelTo, lead.path || lead._pickPath);
    if (!started.ok) return;
    const g = started.group;
    if (g.paid < g.cost) payUpgrade(g, 1);
    return;
  }
  if (t.tool) {
    t.paid++;
    const c = toolStockCost(t.tool);
    if (t.paid >= c) {
      t.paid = 0; t.tools++; S.stats.tools++;
      floatTxt(t.x + 28, t.y - 70, TOOL[t.tool].label + ' ready!', '#d6ffb0');
      toast(`${TOOL[t.tool].label} bought — an idle villager will take it`, 'good');
    }
  } else if (decorKind(t)) {
    t.paid = (t.paid || 0) + 1;
    const c = clearCost(t), left = Math.max(0, c - t.paid);
    const drop = t.kind === 'rock' ? TUNE.rockCoin : TUNE.treeCoin;
    floatTxt(t.x, t.y - 36, left ? (t.paid + ' / ' + c) : 'Paid!', left ? '#ffd56a' : '#d6ffb0');
    if (t.paid >= c) toast(t.kind === 'rock'
      ? `Rock paid — a Builder will break it (drops ${drop} coins)`
      : `Tree paid — a Builder will chop it (drops ${drop} coins)`, 'good');
  } else {
    // Every hire path ends here (dropped coins on a vagrant, including at camp).
    if (workers() >= housingCap()) {
      toast('Build a house to hire more', 'bad');
      return;
    }
    t.role = 'villager'; t.state = 'home'; t.tx = null; S.stats.recruits++;
    floatTxt(t.x, t.y - 34, 'Recruited!', '#d6ffb0');
    toast('Vagrant recruited — walking home as a Villager', 'good');
  }
}
function updateDrops(dt) {
  const m = S.monarch;
  for (const d of S.drops) {
    d.age += dt;
    if (!d.landed) {
      d.vz += 760 * dt; d.z -= d.vz * dt;
      if (d.z <= 0) { d.z = 0; d.landed = true; d.tryT = 0; }
      continue;
    }
    if (!d.away && dist(d, m) > 34) d.away = true;
    d.tryT -= dt;
    if (d.tryT <= 0) {
      d.tryT = 0.4;
      if (!d.loot) {
        const t = claimTarget(d);
        if (t) { d.dead = true; S.fx.push({ k: 'cfly', x: d.x, y: d.y, tx: t.x, ty: t.y - 16, t: 0.32, t0: 0.32 }); applyClaim(t); continue; }
        if (d.noHouse && !d.warned) { d.warned = true; toast('Build a house to hire more', 'bad'); }
      }
    }
    if ((d.away || d.loot) && d.age > TUNE.pickupGrace && dist(d, m) < 26) { d.dead = true; S.coins++; floatTxt(m.x + 14, m.y - 50, '+1', '#ffd56a'); }
  }
  if (S.drops.some(d => d.dead)) S.drops = S.drops.filter(d => !d.dead);
}

// ---------- workers ----------
function homeCore() {
  const h = S.regions[0];
  if (h.owner === 'player' && h.core) return h.core;
  const o = owned().find(r => r.core); return o ? o.core : null;
}
function markNavDirty() { if (nav) nav.dirty = true; else nav = { dirty: true }; }
function navPad() { return TUNE.navPad == null ? 10 : TUNE.navPad; }
function navCellSize() { return TUNE.navCell || 16; }
function rebuildNav() {
  const cell = navCellSize(), gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
  const friend = new Uint8Array(gw * gh), foe = new Uint8Array(gw * gh);
  const pad = navPad();
  function stamp(buf, x, y, rad) {
    const r = rad + pad, r2 = r * r;
    const x0 = Math.max(0, Math.floor((x - r) / cell)), x1 = Math.min(gw - 1, Math.floor((x + r) / cell));
    const y0 = Math.max(0, Math.floor((y - r) / cell)), y1 = Math.min(gh - 1, Math.floor((y + r) / cell));
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const cx = (gx + 0.5) * cell - x, cy = (gy + 0.5) * cell - y;
      if (cx * cx + cy * cy < r2) buf[gy * gw + gx] = 1;
    }
  }
  if (S) {
    for (const b of S.buildings) {
      if (blocksFriend(b)) stamp(friend, b.x, b.y, b.r || 16);
      if (b.owner === 'player' && b.built >= 1 && b.type !== 'farm') stamp(foe, b.x, b.y, b.r || 16);
    }
    for (const r of S.regions) if (r.core) {
      stamp(friend, r.core.x, r.core.y, r.core.r || 20);
      stamp(foe, r.core.x, r.core.y, r.core.r || 20);
    }
    for (const m of (S.mines || [])) {
      stamp(friend, m.x, m.y, m.r || 22);
      stamp(foe, m.x, m.y, m.r || 22);
    }
  }
  const n = gw * gh;
  nav = {
    cell, gw, gh, friend, foe, dirty: false,
    stamp: (nav && nav.stamp || 0) + 1,
    cache: new Map(),
    repaths: 0,
    _g: new Float32Array(n),
    _came: new Int32Array(n),
    _closed: new Uint8Array(n),
    _open: new Int32Array(n),
    _heap: [],
  };
}
function ensureNav() {
  if (!nav || nav.dirty || !nav.friend || nav.cell !== navCellSize()) rebuildNav();
}
function navGrid(friend) { ensureNav(); return friend ? nav.friend : nav.foe; }
function navIndex(x, y) {
  const c = nav.cell, gx = Math.floor(x / c), gy = Math.floor(y / c);
  if (gx < 0 || gy < 0 || gx >= nav.gw || gy >= nav.gh) return -1;
  return gy * nav.gw + gx;
}
function navCenter(i) {
  const c = nav.cell, gx = i % nav.gw, gy = (i / nav.gw) | 0;
  return { x: (gx + 0.5) * c, y: (gy + 0.5) * c };
}
function isNavBlocked(x, y, friend) {
  const i = navIndex(x, y);
  return i < 0 || navGrid(friend)[i] !== 0;
}
function nearestWalkable(x, y, friend) {
  ensureNav();
  const grid = navGrid(friend), c = nav.cell, gw = nav.gw, gh = nav.gh;
  let gx = clamp(Math.floor(x / c), 0, gw - 1), gy = clamp(Math.floor(y / c), 0, gh - 1);
  if (grid[gy * gw + gx] === 0) return { x: (gx + 0.5) * c, y: (gy + 0.5) * c, i: gy * gw + gx };
  const maxR = 24;
  let best = null, bd = 1e9;
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x2 = gx + dx, y2 = gy + dy;
        if (x2 < 0 || y2 < 0 || x2 >= gw || y2 >= gh) continue;
        const i = y2 * gw + x2;
        if (grid[i]) continue;
        const p = navCenter(i), d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) { bd = d; best = { x: p.x, y: p.y, i }; }
      }
    }
    if (best) return best;
  }
  return { x, y, i: -1 };
}
function nearestWalkableNear(x, y, minR, maxR, fromX, fromY, friend) {
  ensureNav();
  const grid = navGrid(friend), c = nav.cell, gw = nav.gw, gh = nav.gh;
  const x0 = Math.max(0, Math.floor((x - maxR) / c)), x1 = Math.min(gw - 1, Math.floor((x + maxR) / c));
  const y0 = Math.max(0, Math.floor((y - maxR) / c)), y1 = Math.min(gh - 1, Math.floor((y + maxR) / c));
  const min2 = minR * minR, max2 = maxR * maxR;
  let best = null, bd = 1e9;
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
    const i = gy * gw + gx;
    if (grid[i]) continue;
    const p = navCenter(i);
    const d2 = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d2 < min2 || d2 > max2) continue;
    if (solidAt(p.x, p.y, 9, friend !== false)) continue;
    const d = Math.hypot(p.x - fromX, p.y - fromY);
    if (d < bd) { bd = d; best = { x: p.x, y: p.y, i }; }
  }
  return best;
}
function lineWalkable(x0, y0, x1, y1, friend) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil(d / (nav.cell * 0.45)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isNavBlocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, friend)) return false;
  }
  return true;
}
function simplifyPath(pts, friend) {
  if (!pts || pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], c = pts[i + 1];
    if (!lineWalkable(a.x, a.y, c.x, c.y, friend)) out.push(pts[i]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function astarPath(ax, ay, bx, by, friend) {
  ensureNav();
  const a = nearestWalkable(ax, ay, friend), b = nearestWalkable(bx, by, friend);
  if (a.i < 0 || b.i < 0) return null;
  const key = (friend ? 'f' : 'e') + ':' + a.i + ':' + b.i;
  const cached = nav.cache.get(key);
  if (cached) return cached;
  if (a.i === b.i) {
    const pts = [{ x: b.x, y: b.y }];
    nav.cache.set(key, pts);
    return pts;
  }
  const gw = nav.gw, gh = nav.gh, n = gw * gh, grid = navGrid(friend);
  const gScore = nav._g, came = nav._came, closed = nav._closed, heap = nav._heap;
  gScore.fill(1e9); came.fill(-1); closed.fill(0); heap.length = 0;
  const heur = (i) => {
    const gx = i % gw, gy = (i / gw) | 0, dx = Math.abs(gx - (b.i % gw)), dy = Math.abs(gy - ((b.i / gw) | 0));
    return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
  };
  gScore[a.i] = 0;
  heap.push(a.i);
  const less = (i, j) => (gScore[heap[i]] + heur(heap[i])) < (gScore[heap[j]] + heur(heap[j]));
  const siftUp = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (!less(i, p)) break; const t = heap[i]; heap[i] = heap[p]; heap[p] = t; i = p; } };
  const siftDown = (i) => {
    for (;;) {
      let s = i, l = i * 2 + 1, r = l + 1;
      if (l < heap.length && less(l, s)) s = l;
      if (r < heap.length && less(r, s)) s = r;
      if (s === i) break;
      const t = heap[i]; heap[i] = heap[s]; heap[s] = t; i = s;
    }
  };
  const ox = [1, -1, 0, 0, 1, 1, -1, -1], oy = [0, 0, 1, -1, 1, -1, 1, -1], oc = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];
  const maxIter = TUNE.navIterMax || 2500;
  let found = false, iter = 0;
  while (heap.length && iter++ < maxIter) {
    const i = heap[0]; heap[0] = heap[heap.length - 1]; heap.pop(); if (heap.length) siftDown(0);
    if (closed[i]) continue;
    closed[i] = 1;
    if (i === b.i) { found = true; break; }
    const gx = i % gw, gy = (i / gw) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = gx + ox[k], ny = gy + oy[k];
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      // no cutting through a blocked corner
      if (k >= 4 && (grid[gy * gw + nx] || grid[ny * gw + gx])) continue;
      const ni = ny * gw + nx;
      if (grid[ni] || closed[ni]) continue;
      const ng = gScore[i] + oc[k];
      if (ng >= gScore[ni]) continue;
      gScore[ni] = ng; came[ni] = i;
      heap.push(ni); siftUp(heap.length - 1);
    }
  }
  if (!found) {
    nav.cache.set(key, null);
    if (nav.cache.size > (TUNE.navCache || 96)) nav.cache.clear();
    return null;
  }
  const rev = [];
  for (let i = b.i; i >= 0; i = came[i]) { rev.push(navCenter(i)); if (i === a.i) break; }
  rev.reverse();
  // End at the exact requested walkable point
  if (rev.length) rev[rev.length - 1] = { x: b.x, y: b.y };
  const pts = simplifyPath(rev, friend);
  nav.cache.set(key, pts);
  if (nav.cache.size > (TUNE.navCache || 96)) {
    const first = nav.cache.keys().next().value;
    nav.cache.delete(first);
  }
  return pts;
}
function steerMove(e, nx, ny, friend) {
  if (tryMove(e, nx, ny, friend)) return true;
  const dx = nx - e.x, dy = ny - e.y, d = Math.hypot(dx, dy) || 1, s = d;
  const ux = dx / d, uy = dy / d;
  for (const ang of [0.6, -0.6, 1.05, -1.05, 1.57, -1.57, 2.1, -2.1]) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    if (tryMove(e, e.x + (ux * ca - uy * sa) * s, e.y + (ux * sa + uy * ca) * s, friend)) return true;
  }
  return false;
}
function followRoute(e, tx, ty, sp, dt, friend) {
  if (!e || dt <= 0) return true;
  const goal = nearestWalkable(tx, ty, friend !== false);
  const fr = friend !== false;
  const dGoal = Math.hypot(goal.x - e.x, goal.y - e.y);
  if (dGoal < 2) return true;
  // Close enough that a straight step will do (and still slide on corners)
  if (dGoal < 18 || (dGoal < 40 && lineWalkable(e.x, e.y, goal.x, goal.y, fr))) {
    const s = Math.min(dGoal, sp * dt);
    steerMove(e, e.x + (goal.x - e.x) / dGoal * s, e.y + (goal.y - e.y) / dGoal * s, fr);
    return Math.hypot(goal.x - e.x, goal.y - e.y) < 6;
  }
  ensureNav();
  const st = e._nav || (e._nav = { path: null, pi: 0, gx: 0, gy: 0, stamp: -1, lx: e.x, ly: e.y, wait: 0 });
  const goalChanged = Math.hypot((st.gx || 0) - goal.x, (st.gy || 0) - goal.y) > nav.cell;
  const need = !st.path || st.pi >= (st.path.length || 0) || goalChanged || st.stamp !== nav.stamp;
  if (need) {
    const budget = TUNE.navRepathMax == null ? 6 : TUNE.navRepathMax;
    if (nav.repaths < budget) {
      nav.repaths++;
      st.path = astarPath(e.x, e.y, goal.x, goal.y, fr);
      st.pi = 0; st.gx = goal.x; st.gy = goal.y; st.stamp = nav.stamp;
    }
  }
  const path = st.path;
  if (path && path.length) {
    // skip arrived waypoints; look ahead if the next is visible
    while (st.pi < path.length - 1 && Math.hypot(path[st.pi].x - e.x, path[st.pi].y - e.y) < 14) st.pi++;
    while (st.pi < path.length - 1 && lineWalkable(e.x, e.y, path[st.pi + 1].x, path[st.pi + 1].y, fr)) st.pi++;
    const wp = path[Math.min(st.pi, path.length - 1)];
    const d = Math.hypot(wp.x - e.x, wp.y - e.y) || 1;
    const s = Math.min(d, sp * dt);
    steerMove(e, e.x + (wp.x - e.x) / d * s, e.y + (wp.y - e.y) / d * s, fr);
  } else {
    const d = Math.hypot(goal.x - e.x, goal.y - e.y) || 1;
    const s = Math.min(d, sp * dt);
    steerMove(e, e.x + (goal.x - e.x) / d * s, e.y + (goal.y - e.y) / d * s, fr);
  }
  st.wait = (st.wait || 0) + dt;
  if (st.wait >= (TUNE.navStuckTime || 1.5)) {
    const moved = Math.hypot(e.x - st.lx, e.y - st.ly);
    if (moved < (TUNE.navStuckDist || 6)) {
      const w = nearestWalkable(e.x, e.y, fr);
      const dd = Math.hypot(w.x - e.x, w.y - e.y) || 1;
      steerMove(e, e.x + (w.x - e.x) / dd * Math.min(dd, Math.max(8, sp * dt * 4)), e.y + (w.y - e.y) / dd * Math.min(dd, Math.max(8, sp * dt * 4)), fr);
      st.path = null;
    }
    st.lx = e.x; st.ly = e.y; st.wait = 0;
  }
  return Math.hypot(goal.x - e.x, goal.y - e.y) < 6;
}
function moveTo(f, tx, ty, sp, dt) {
  return followRoute(f, tx, ty, sp, dt, true);
}
function workReach(j, f) {
  // Must reach the first walkable nav cell outside a stamped footprint (r + navPad),
  // which can sit farther out than the old +8 margin once cells are quantized.
  const extra = Math.max(8, (TUNE.navPad == null ? 10 : TUNE.navPad) + (TUNE.navCell || 16) * 0.75);
  return (j.r || 16) + (f.r || 9) + extra;
}
function workArrive(j, f) {
  // Half a cell of slack so a snapped approach cannot sit a fraction of a pixel outside reach.
  return workReach(j, f) + (TUNE.navCell || 16) * 0.5;
}
function approachSpots(j, f) {
  const reach = workReach(j, f);
  // Stay inside work reach, but outside the target itself when it blocks friends
  // (a finished house / wall / tower). A single SW point often sat inside a neighbor.
  const solidR = blocksFriend(j) ? (j.r || 16) + (f.r || 9) + 1.5 : 0;
  const rad = Math.max(solidR, reach * 0.82);
  const spots = [];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI * 0.25 + 0.3;
    spots.push({ x: j.x + Math.cos(a) * rad, y: j.y + Math.sin(a) * rad });
  }
  return spots;
}
function pickApproach(f, j) {
  const reach = workReach(j, f);
  const solidR = blocksFriend(j) ? (j.r || 16) + (f.r || 9) + 1.5 : 0;
  const spots = approachSpots(j, f);
  let best = null, bd = 1e9, fallback = spots[0], fd = 1e9;
  for (const pt of spots) {
    const w = nearestWalkable(pt.x, pt.y, true);
    const cand = (w && w.i >= 0) ? w : pt;
    const d = dist(f, cand);
    if (d < fd) { fd = d; fallback = cand; }
    if (solidAt(cand.x, cand.y, f.r, true)) continue;
    if (dist(cand, j) > reach) continue;
    if (d < bd) { bd = d; best = cand; }
  }
  if (best) return best;
  const ring = nearestWalkableNear(j.x, j.y, solidR, reach, f.x, f.y, true);
  return ring || fallback;
}
function moveToJob(f, j, sp, dt) {
  if (dist(f, j) <= workArrive(j, f)) return true;
  const pt = pickApproach(f, j);
  moveTo(f, pt.x, pt.y, sp, dt);
  return dist(f, j) <= workArrive(j, f);
}
function wanderAround(f, cx, cy, rad, dt, sp) {
  f.wt -= dt;
  if (f.wt <= 0 || f.tx == null) { f.wt = 2 + Math.random() * 3; const a = Math.random() * 6.283, r = Math.random() * rad; f.tx = cx + Math.cos(a) * r; f.ty = cy + Math.sin(a) * r * 0.7; }
  moveTo(f, f.tx, f.ty, sp * 0.45, dt);
}
function jobValid(j) {
  if (!j) return false;
  if (isUpgradeJob(j)) return true;
  if (isClearJob(j) || isDemoJob(j)) return true;
  if (j.type === 'core') { const r = S.regions[j.region]; return r.core === j && (r.owner === 'player' || r.owner === 'contested') && j.hp < j.max; }
  return S.buildings.includes(j) && j.owner === 'player' && (j.built < 1 || j.hp < j.max);
}
function pickBuildJob(f, night) {
  let best = null, bd = 1e9;
  const taken = new Set(S.folk.filter(o => o !== f && o.role === 'builder' && o.job).map(o => o.job));
  for (const b of S.buildings) if (isDemoJob(b)) {
    const d = dist(b, f) + (taken.has(b) ? 600 : 0); if (d < bd) { bd = d; best = b; }
  }
  for (const b of S.buildings) if (b.owner === 'player' && b.built < 1 && !b.demo) {
    const d = dist(b, f) + (taken.has(b) ? 600 : 0); if (d < bd) { bd = d; best = b; }
  }
  const seenG = new Set();
  for (const b of S.buildings.concat(owned().map(r => r.core).filter(Boolean))) {
    const g = b && b.upgGroup;
    if (!isUpgradeJob(g) || seenG.has(g)) continue;
    seenG.add(g);
    const d = dist(g, f) + (taken.has(g) ? 600 : 0); if (d < bd) { bd = d; best = g; }
  }
  for (const t of S.trees) if (isClearJob(t)) { const d = dist(t, f) + (taken.has(t) ? 600 : 0); if (d < bd) { bd = d; best = t; } }
  for (const rk of S.rocks) if (isClearJob(rk)) { const d = dist(rk, f) + (taken.has(rk) ? 600 : 0); if (d < bd) { bd = d; best = rk; } }
  if (best || night) return best;
  for (const b of S.buildings) if (b.owner === 'player' && b.built >= 1 && b.hp < b.max - 0.5) { const d = dist(b, f) + (taken.has(b) ? 600 : 0); if (d < bd) { bd = d; best = b; } }
  for (const c of heldCores()) if (c.hp < c.max - 0.5) { const d = dist(c, f) + (taken.has(c) ? 600 : 0); if (d < bd) { bd = d; best = c; } }
  return best;
}
function onBuilt(b) {
  markNavDirty();
  S.stats.built++;
  floatTxt(b.x, b.y - 40, NICE[b.type] + ' built', '#d6ffb0');
  if (b.type === 'house') toast(`House built — +${houseSlotsOf(b)} worker slot${houseSlotsOf(b) === 1 ? '' : 's'}`, 'good');
  else if (b.type === 'hall') {
    toast('Hall built — this land is locked against banner claims', 'good');
    if (S.regions[b.region]) S.regions[b.region].gov = true;
    const zid = b.zoneId || (b.region >= 1 && myKingdomId() ? zoneKey(myKingdomId(), b.region) : null);
    if (zid) zoneAct('gov', zid, { govHp: b.hp, govMax: b.max, buildings: (S.buildings.filter(x => x.region === b.region && x.type !== 'hall' && x.owner === 'player').map(packBldWorld)) });
    publishHomeZones();
  }
  else if (b.type === 'farm') toast('Farm built — a Farmer can work it for coins', 'good');
  else if (b.tool) toast(NICE[b.tool] + ' built — drop coins to stock tools', 'good');
  else if (b.type === 'gate') toast('Gate built — your people can pass, the Pale Host cannot', 'good');
}
function becomeRole(f, role) {
  S.stats.roles++;
  if (role === 'archer') {
    f.dead = true;
    const ahp = Math.round(40 * allyHpMul());
    S.archers.push({ type: 'archer', x: f.x, y: f.y, r: 10, hp: ahp, max: ahp, cd: 0, follow: false, post: null, slotA: Math.random() * 6.28 });
  } else { f.role = role; f.job = null; f.tx = null; }
  const nice = role === 'archer' ? 'Archer' : role === 'builder' ? 'Builder' : role === 'miner' ? 'Miner' : 'Farmer';
  floatTxt(f.x + 22, f.y - 52, 'Now a ' + nice, '#d6ffb0');
  toast(`A villager became ${role === 'archer' ? 'an Archer' : 'a ' + nice}`, 'good');
}
function updateFolk(dt) {
  if (S.camp) {
    S.vagrantT -= dt;
    if (S.vagrantT <= 0) { S.vagrantT = vagrantEvery(); if (S.folk.filter(f => f.role === 'vagrant').length < vagrantMax()) spawnVagrant(); }
  }
  const hc = homeCore(), night = S.phase === 'night', sp = TUNE.folkSpeed;
  for (const f of S.folk) {
    f.working = false;
    if (f.role === 'vagrant') { if (S.camp) wanderAround(f, S.camp.x, S.camp.y + 10, 60, dt, sp); continue; }
    if (hasCurse('death') && night) { continue; }
    if (f.send) {
      const d = dist(f, f.send);
      if (d <= 12) f.send = null;
      else { moveTo(f, f.send.x, f.send.y, sp, dt); continue; }
    }
    if (!hc) continue;
    const ix = hc.x, iy = hc.y + 58;
    if (f.role === 'villager') {
      let st = f.stand && f.stand.built >= 1 && f.stand.tools > 0 ? f.stand : null;
      if (!st) {
        f.stand = null;
        for (const s of S.stands) {
          if (s.owner !== 'player' || s.built < 1) continue;
          if (s.tools > S.folk.filter(o => o.stand === s).length) { st = s; f.stand = s; break; }
        }
      }
      if (st && TOOL[st.tool]) {
        const reach = (st.r || 16) + f.r + 10;
        if (dist(f, st) <= reach) { st.tools--; f.stand = null; becomeRole(f, TOOL[st.tool].role); continue; }
        const spots = [
          { x: st.x, y: st.y + (st.r || 16) + 8 },
          { x: st.x - (st.r || 16) - 8, y: st.y + 6 },
          { x: st.x + (st.r || 16) + 8, y: st.y + 6 },
          { x: st.x, y: st.y - (st.r || 16) - 8 },
        ];
        let best = spots[0], bd = 1e9;
        for (const pt of spots) {
          if (solidAt(pt.x, pt.y, f.r, true)) continue;
          const d = dist(f, pt);
          if (d < bd) { bd = d; best = pt; }
        }
        moveTo(f, best.x, best.y, sp, dt);
        if (dist(f, st) <= reach) { st.tools--; f.stand = null; becomeRole(f, TOOL[st.tool].role); }
        continue;
      }
      if (f.state === 'home') { if (Math.hypot(f.x - ix, f.y - iy) > 50) { moveTo(f, ix, iy, sp, dt); continue; } f.state = 'idle'; }
      wanderAround(f, ix, iy, 64, dt, sp); continue;
    }
    if (f.role === 'builder') {
      if (f.job && (!jobValid(f.job) || (night && !isClearJob(f.job) && !isDemoJob(f.job) && !isUpgradeJob(f.job) && f.job.built !== 0 && !(f.job.built < 1)))) f.job = null;
      if (!f.job) f.job = pickBuildJob(f, night);
      const j = f.job;
      if (j) {
        if (!moveToJob(f, j, sp, dt)) { /* still walking */ }
        else {
          f.working = true;
          if (isDemoJob(j)) {
            j.demoProg = Math.min(1, (j.demoProg || 0) + dt / ((TUNE.demoTime || 4) * workSpeed()));
            if (j.demoProg >= 1) { finishDemo(j); f.job = null; }
          } else if (isUpgradeJob(j)) {
            j.prog = Math.min(1, (j.prog || 0) + dt / ((TUNE.upgradeTime || 6) * workSpeed()));
            if (j.prog >= 1) { finishUpgrade(j); f.job = null; }
          } else if (isClearJob(j)) {
            const kind = decorKind(j);
            j.prog = Math.min(1, (j.prog || 0) + dt / ((TUNE.clearTime[kind] || 4) * workSpeed()));
            if (j.prog >= 1) { finishClear(j); f.job = null; }
          } else if (j.built != null && j.built < 1) {
            j.built = Math.min(1, j.built + dt / (TUNE.buildTime[j.type] * workSpeed()));
            j.hp = Math.max(j.hp, Math.ceil(j.max * Math.max(0.15, j.built)));
            if (j.built >= 1) { j.hp = j.max; onBuilt(j); f.job = null; }
          } else {
            j.hp = Math.min(j.max, j.hp + repairSpeed() * dt);
            if (j.hp >= j.max) { floatTxt(j.x, j.y - 36, 'Repaired', '#d6ffb0'); f.job = null; }
          }
        }
        continue;
      }
      wanderAround(f, ix - 30, iy, 50, dt, sp); continue;
    }
    if (f.role === 'farmer') {
      let j = f.job;
      if (j && (!S.buildings.includes(j) || j.owner !== 'player' || j.built < 1)) { if (j.farmer === f) j.farmer = null; j = f.job = null; }
      if (!j) {
        let bd = 1e9;
        for (const b of S.buildings) if (b.type === 'farm' && b.owner === 'player' && b.built >= 1 && (!b.farmer || b.farmer === f || !S.folk.includes(b.farmer))) { const d = dist(b, f); if (d < bd) { bd = d; j = b; } }
        if (j) { j.farmer = f; f.job = j; }
      }
      if (j) {
        const tx = j.x + Math.sin(S.t * 0.35 + f.ph) * 14, ty = j.y - 2;
        if (Math.hypot(f.x - j.x, f.y - j.y) > 22) moveTo(f, tx, ty, sp, dt);
        else {
          moveTo(f, tx, ty, 10, dt);
          if (!night) {
            f.working = true;
            j.prog = (j.prog || 0) + dt;
            if (j.prog >= TUNE.farmEvery) {
              const gained = farmCoinsOf(j);
              j.prog -= TUNE.farmEvery; S.coins += gained; S.stats.farmCoins += gained;
              floatTxt(j.x, j.y - 30, '+' + gained, '#ffd56a');
              S.fx.push({ k: 'coins', x: j.x, y: j.y - 10, t: 0.8, t0: 0.8, n: gained });
            }
          }
        }
        continue;
      }
      wanderAround(f, ix + 30, iy, 50, dt, sp); continue;
    }
    if (f.role === 'miner') {
      let m = f.job && f.job.type === 'mine' ? f.job : null;
      if (m && (!(S.mines || []).includes(m) || S.regions[m.region].owner !== 'player')) {
        if (m.miner === f) m.miner = null;
        m = f.job = null;
      }
      if (!m) {
        let bd = 1e9;
        for (const mine of (S.mines || [])) {
          const r = S.regions[mine.region];
          if (!r || r.owner !== 'player') continue;
          if (mine.miner && mine.miner !== f && S.folk.includes(mine.miner)) continue;
          const d = dist(mine, f);
          if (d < bd) { bd = d; m = mine; }
        }
        if (m) { m.miner = f; f.job = m; }
      }
      if (m) {
        if (m.miner && m.miner !== f && S.folk.includes(m.miner)) { f.job = null; continue; }
        m.miner = f;
        const standY = m.y + (m.r || 22) + (TUNE.navPad || 10) + 6;
        const reach = minerReach(m);
        if (dist(f, m) > reach - 8) moveTo(f, m.x, standY, sp, dt);
        else { moveTo(f, m.x + Math.sin(S.t * 0.4 + f.ph) * 8, standY, 10, dt); f.working = true; }
        continue;
      }
      wanderAround(f, ix + 20, iy, 50, dt, sp); continue;
    }
  }
  if (S.folk.some(f => f.dead)) S.folk = S.folk.filter(f => !f.dead);
}
function assignPosts() {
  const towers = [], cores = [], walls = [];
  for (const b of S.buildings) if (b.owner === 'player' && b.built >= 1) {
    if (b.type === 'tower' || b.type === 'fort') towers.push(b); else if (b.type === 'wall' || b.type === 'gate') walls.push(b);
  }
  for (const r of owned()) if (r.core) cores.push(r.core);
  const posts = towers.concat(cores, walls);
  S.archers.forEach((a, i) => {
    if (a.sendPost) return;
    const want = posts.length ? posts[i % posts.length] : null;
    if (a.post !== want) { a.post = want; a.tx = null; a.slotA = i * 2.399; }
  });
}

// ---------- phases ----------
function skipPhase() {
  if (!S || S.over) return;
  if (S.phase === 'night') startDay();
  else startNight();
}
function startNight() {
  S.chaos = false; S.leader = null; S.nightSpawned = false; S.bloodMoon = false;
  const n0 = TUNE.waveBase + TUNE.wavePerNight * S.nights + TUNE.wavePerRegion * Math.max(0, owned().length - 1);
  // Necromancer only on every 10th day (10, 20, 30…), leading a larger blood-moon wave.
  const necroNight = S.day > 0 && S.day % 10 === 0;
  let n = Math.max(0, Math.round(n0 * (necroNight ? (TUNE.necroWaveMul || 2) : 1)));
  if (hasCurse('wasp') && S.nights < (TUNE.curseWaspNights || 3)) n = Math.round(n * (TUNE.curseWaspCount || 2));
  const q = [];
  for (let i = 0; i < n; i++) q.push(Math.random() < 0.5 ? 'shambler' : 'skeleton');
  if (necroNight && q.length) {
    q.splice(Math.min(2, q.length), 0, 'necro');
    S.bloodMoon = true;
  }
  const claimQ = [];
  for (const r of S.regions) if (r) r.claimQueued = false;
  for (const r of contested()) {
    r.claimQueued = true;
    const scale = claimScaleOf(r);
    const cn = Math.max(1, Math.round(n * (TUNE.claimWaveMul || 2) * scale));
    for (let i = 0; i < cn; i++) claimQ.push({ kind: Math.random() < 0.5 ? 'shambler' : 'skeleton', claim: r.id, scale });
  }
  for (const z of WORLD.zones.values()) {
    z._queued = !!(z.state === 'contested' && z.claimerId === myKingdomId() && z._banner);
  }
  // An empty wave never starts night — stay in (or return to) day.
  if (!q.length && !claimQ.length) { S.phase = 'day'; S.phaseT = DAY; S.spawnQ = []; S.claimQ = []; return; }
  S.phase = 'night'; S.phaseT = 0;
  S.spawnQ = q; S.spawnGap = q.length ? Math.min(1.0, 16 / q.length) : 1; S.spawnT = 0.5;
  S.claimQ = claimQ; S.claimGap = claimQ.length ? Math.min(1.0, 16 / claimQ.length) : 1; S.claimT = 0.35;
  if (hasCurse('wasp') && S.nights < (TUNE.curseWaspNights || 3)) S.spawnGap /= (TUNE.curseWaspSpawn || 1.25);
  S.spawnIndex = 0; S.returnQ = [];
  snapshotNightBuildings();
  S.lastSpawnAt = S.t;
  if (isChallenge()) noteUnlock(S.nights + 1);
  pickFocus();
  pickWaveSide();
  S.waveSrc = waveEntryPoint(S.waveSide);
  if (necroNight) toast(`Night ${S.nights + 1} — the Necromancer leads a Blood Moon!`, 'bad');
  else toast(`Night ${S.nights + 1} — the Pale Host marches!`, 'bad');
  if (claimQ.length) {
    const names = contested().map(r => r.name).join(', ');
    toast(`The Pale Host counters at ${names}!`, 'bad');
  }
}
function pickWaveSide() {
  const r = rand();
  S.waveSide = r < 1 / 3 ? 'left' : r < 2 / 3 ? 'right' : 'both';
  return S.waveSide;
}
function waveEntryPoint(side) {
  // Side is fully random each wave (left / right / both). Entry is a flank of the
  // objective, close enough for the host to arrive in one night — not a far map edge.
  const fr = (S.focus != null && S.regions[S.focus]) || S.regions[0];
  const use = side === 'both' ? (rand() < 0.5 ? 'left' : 'right') : (side || 'left');
  const sign = use === 'left' ? -1 : 1;
  const pool = S.regions.filter(r => r.owner !== 'player' && r.owner !== 'contested' && r.owner !== 'rival' && (use === 'left' ? r.x < fr.x : r.x >= fr.x))
    .sort((a, b) => dist(a, fr) - dist(b, fr));
  if (pool.length && dist(pool[0], fr) < 900) return { x: pool[0].x, y: pool[0].y, side: use };
  const off = 360 + rand() * 80;
  return { x: clamp(fr.x + sign * off, 40, W - 40), y: clamp(fr.y + (rand() - 0.5) * 200, 40, H - 40), side: use };
}
function pickFocus() {
  const o = owned().filter(r => r.core); if (!o.length) { S.focus = null; return; }
  const foes = S.regions.filter(r => r.owner !== 'player' && r.owner !== 'contested' && r.owner !== 'rival');
  const exposure = r => foes.length ? Math.min(...foes.map(f => dist(f, r))) : 0;
  const score = r => r.core.hp + 0.25 * exposure(r) + (r.id === 0 ? 60 : 0);
  o.sort((a, b) => score(a) - score(b)); S.focus = o[0].id;
}
function startDay() {
  if (isChallenge()) recordNightScore();
  S.phase = 'day'; S.phaseT = DAY; S.nights++; S.day++; S.spawnQ = []; S.claimQ = []; S.nightSpawned = false;
  for (const u of S.undead) S.fx.push({ k: 'puff', x: u.x, y: u.y, t: 0.6, t0: 0.6 });
  S.undead = []; S.leader = null; S.chaos = false; S.returnQ = [];
  const heal = 40 + (hasBless('rest') ? (TUNE.blessDawnHeal || 80) : 0);
  S.monarch.hp = Math.min(S.monarch.max, S.monarch.hp + heal);
  S.bloodMoon = false;
  toast(`Dawn! Night ${S.nights} survived — the dead crumble`, 'good');
  resolveClaims();
  if (S.day % 10 === 9) toast('The Necromancer comes tomorrow night', 'bad');
  if (isChallenge()) {
    noteUnlock(S.nights);
    if (S.nights >= (TUNE.challengeNights || 20)) { challengeVictory(); return; }
  }
  if (isEndlessCloud()) { CLOUD.dirty = true; requestSaveKingdom(); }
}
function raiseDead(n) {
  const m = enemyMods('skeleton', null);
  const u = { type: 'undead', kind: 'skeleton', x: clamp(n.x + (Math.random() - .5) * 50, 10, W - 10), y: clamp(n.y + (Math.random() - .5) * 50, 10, H - 10),
    r: m.r, hp: m.hp, max: m.hp, speed: m.speed, dmg: m.dmg, coin: m.coin, cd: 0.5, tgt: null, rt: 0, jit: (Math.random() - .5), raised: true };
  S.undead.push(u); S.stats.spawned++; S.stats.raised++; S.nightSpawned = true;
  S.fx.push({ k: 'puff', x: u.x, y: u.y, t: 0.5, t0: 0.5 });
}
function claimEntryPoint(r) {
  if (!r) return waveEntryPoint(S.waveSide || pickWaveSide());
  const home = S.regions[0] || r;
  const ang = Math.atan2(r.y - home.y, r.x - home.x) || 0;
  const d = 90 + rand() * 50;
  return { x: clamp(r.x + Math.cos(ang) * d, 40, W - 40), y: clamp(r.y + Math.sin(ang) * d, 40, H - 40), side: 'claim' };
}
function spawnUndead(kind, at, returned, opts) {
  opts = opts || {};
  const src = at || (opts.claim != null && S.regions[opts.claim] ? claimEntryPoint(S.regions[opts.claim])
    : (hasCurse('chaos') ? chaosSpawnPoint() : waveEntryPoint(S.waveSide || pickWaveSide())));
  const idx = returned ? null : (S.spawnIndex++);
  const m = enemyMods(kind, idx, { claimScale: opts.scale || 1 });
  const jitter = at ? 8 : (opts.claim != null ? 70 : 120);
  const u = { type: 'undead', kind, x: clamp(src.x + (rand() - .5) * jitter, 10, W - 10), y: clamp(src.y + (rand() - .5) * jitter, 10, H - 10),
    r: m.r, hp: m.hp, max: m.hp, speed: m.speed * (0.9 + rand() * 0.2), dmg: m.dmg, coin: m.coin, elite: m.elite,
    rangeMul: m.rangeMul || 1, cdMul: m.cdMul || 1,
    cd: hasCurse('chaos') && !returned ? (TUNE.curseChaosDelay || 3) : 0,
    atkWait: hasCurse('chaos') && !returned ? (TUNE.curseChaosDelay || 3) : 0,
    tgt: null, rt: 0, jit: (rand() - .5), returned: !!returned,
    claim: opts.claim, claimScale: opts.scale || 1 };
  S.undead.push(u); S.stats.spawned++; S.nightSpawned = true;
  S.lastSpawnAt = S.t;
  if (kind === 'necro') { S.leader = u; toast('A Necromancer leads this wave!', 'bad'); }
  return u;
}

// ---------- enemies ----------
function enemiesList() {
  const l = S.undead.concat(S.guardians);
  for (const b of S.buildings) {
    if (b.owner === 'pale' && (b.type === 'tower' || b.type === 'fort')) l.push(b);
    if (b.owner === 'rival' && b.hp > 0 && (b.type === 'hall' || b.type === 'tower' || b.type === 'fort')) l.push(b);
  }
  return l;
}
function damage(e, dmg) {
  e.hp -= dmg;
  e.flash = 0.12;
  if (e.type === 'hall' && e.owner === 'rival' && e.zoneId && !e._atkPing) {
    e._atkPing = true;
    zoneAct('attack', e.zoneId);
  }
  if (e.hp > 0) return;
  if (e.type === 'undead') {
    const coin = e.coin != null ? e.coin : UNDEAD[e.kind].coin;
    S.undead.splice(S.undead.indexOf(e), 1); S.kills++; S.coins += coin;
    S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.5, t0: 0.5 });
    S.fx.push({ k: 'coins', x: e.x, y: e.y - 4, t: 0.8, t0: 0.8, n: coin });
    if (hasCurse('afterlife') && e.kind !== 'necro' && !e.returned && S.phase === 'night') {
      (S.returnQ || (S.returnQ = [])).push({ kind: e.kind, x: e.x, y: e.y, t: TUNE.curseAfterlifeDelay || 4, claim: e.claim, scale: e.claimScale });
    }
    if (e.kind === 'necro') {
      S.chaos = true; S.leader = null;
      const r = S.regions[regionIdAt(e.x, e.y)];
      const w = S.guardians.find(g => g.kind === 'warden');
      toast('Necromancer slain! The horde scatters', 'good');
      if (w && !S.regions[w.region].weakened) { S.regions[w.region].weakened = true; w.hp = Math.ceil(w.hp * 0.6); w.max = Math.ceil(w.max * 0.6); toast(`${S.regions[w.region].name} Warden weakened`, 'good'); }
      void r;
    }
  } else if (e.kind === 'guardian' || e.kind === 'warden') {
    S.guardians.splice(S.guardians.indexOf(e), 1); S.coins += e.kind === 'warden' ? 25 : 15;
    S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.8, t0: 0.8, big: 1 });
    S.fx.push({ k: 'coins', x: e.x, y: e.y - 6, t: 0.85, t0: 0.85, n: e.kind === 'warden' ? 25 : 15 });
    requestPlantBanner(e.region);
  } else if (e.type === 'core') {
    const rr = S.regions[e.region];
    if (rr && rr.owner === 'contested') failClaim(rr);
    else loseRegion(rr);
  } else if (BLD[e.type] && S.buildings.includes(e)) {
    if (hasCurse('destruction') && e.owner === 'player' && (e.built || 0) >= 1) {
      (S.rubble || (S.rubble = [])).push({ x: e.x, y: e.y, type: e.type, region: e.region, unlockDay: S.day + (TUNE.curseDestroyWait || 2), r: e.r || 16 });
    }
    S.buildings.splice(S.buildings.indexOf(e), 1);
    const si = S.stands.indexOf(e); if (si >= 0) S.stands.splice(si, 1);
    markNavDirty();
    S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.6, t0: 0.6 });
    if (e.type === 'house' && e.owner === 'player') {
      const ev = evictToCap();
      toast(ev ? `A House was destroyed — ${ev} worker${ev === 1 ? '' : 's'} evicted` : 'A House was destroyed — housing reduced', 'bad');
    }
    else if (e.tool && e.owner === 'player') toast('A tool stand was destroyed', 'bad');
    else if (e.type === 'gate' && e.owner === 'player') toast('A Gate was destroyed', 'bad');
    else if (e.type === 'hall' && e.owner === 'rival') takeZoneFromHall(e);
    else if (e.type === 'hall' && e.owner === 'player') {
      if (S.regions[e.region]) S.regions[e.region].gov = false;
      toast('Your Hall was destroyed — rivals can plant a banner here', 'bad');
      publishHomeZones();
    }
  } else if (e.type === 'archer') {
    S.archers.splice(S.archers.indexOf(e), 1); S.stats.folkLost++;
  } else if (e.type === 'folk') {
    const i = S.folk.indexOf(e); if (i >= 0) S.folk.splice(i, 1);
    if (e.job && e.job.farmer === e) e.job.farmer = null;
    if (e.role === 'miner') for (const m of (S.mines || [])) if (m.miner === e) m.miner = null;
    S.stats.folkLost++; S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.5, t0: 0.5 });
    toast(`A ${e.role} was slain`, 'bad');
  } else if (e === S.monarch) {
    gameOver('The Monarch has fallen');
  }
  if (S.monarch.target === e) S.monarch.target = null;
}

function requestPlantBanner(zoneId) {
  if (!S || S.over) return { ok: false, reason: 'No game' };
  const r = S.regions[zoneId];
  if (!r) return { ok: false, reason: 'No zone' };
  if (r.owner === 'player') return { ok: false, reason: 'Already yours' };
  if (zoneHasHall(r)) return { ok: false, reason: 'A Hall governs this land' };
  if (r.owner === 'contested' && r.core && r.core.hp > 0) return { ok: false, reason: 'A banner already stands' };
  if (S.guardians.some(g => g.region === r.id && g.hp > 0)) {
    toast('A guardian still holds this land', 'bad');
    return { ok: false, reason: 'Guardian still stands' };
  }
  const range = TUNE.bannerPlantRange || 220;
  const here = regionIdAt(S.monarch.x, S.monarch.y);
  if (here !== r.id && dist(S.monarch, r) > range) {
    toast('Move closer to plant a banner', 'bad');
    return { ok: false, reason: 'Too far' };
  }
  const from = r.owner === 'pale' ? 'pale' : (r.owner === 'rival' ? 'held' : 'wild');
  r.claimFrom = from;
  r.prevOwner = r.owner === 'rival' ? 'rival' : from;
  r.claimQueued = false;
  r.owner = 'contested';
  const hp = Math.round((TUNE.bannerHp || 200) * allyHpMul());
  r.core = mkCore(r, hp);
  r.core.contested = true;
  r.core.r = TUNE.bannerR || 18;
  S.mapDirty = true; markNavDirty();
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05 });
  const attempt = (r.claimFails || 0) + 1;
  const pct = Math.round((claimScaleOf(r) - 1) * 100);
  toast(pct
    ? `Banner planted in ${r.name} — contested! Hold it through the night. Attempt ${attempt} (+${pct}% host).`
    : `Banner planted in ${r.name} — contested! Hold it through the night to capture.`, 'good');
  refreshCamps();
  if (myKingdomId() && r.id) { const pos = worldFromLocal(r.x, r.y); zoneAct('plant', zoneKey(r.worldHomeId || myKingdomId(), r.id), { from, bannerHp: hp, wx: pos.x, wy: pos.y, name: r.name, region: r.id }); }
  if (PUI.inspectId && String(PUI.inspectId).slice(0, 5) === 'site-' && +String(PUI.inspectId).slice(5) === r.id) {
    openInspect(r.core);
  }
  return { ok: true, region: r.id, attempt };
}
function failClaim(r) {
  if (!r || r.owner !== 'contested') return;
  r.claimFails = (r.claimFails || 0) + 1;
  const from = r.claimFrom || 'wild';
  r.owner = from === 'held' ? (r.prevOwner || 'rival') : from;
  r.core = null;
  r.claimFrom = null;
  r.claimQueued = false;
  S.mapDirty = true; markNavDirty();
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05, bad: 1 });
  const pct = Math.round((claimScaleOf(r) - 1) * 100);
  const stay = from === 'held' ? 'with its owner' : (from === 'pale' ? 'Pale' : 'wild');
  toast(`${r.name} banner fell! The zone stays ${stay}. Next attempt: +${pct}% host and +${pct}% strength.`, 'bad');
  refreshCamps();
  if (myKingdomId() && r.id) { const pos = worldFromLocal(r.x, r.y); zoneAct('fail', zoneKey(r.worldHomeId || myKingdomId(), r.id), { wx: pos.x, wy: pos.y, name: r.name, region: r.id }); }
  closeInspect();
}
function completeClaim(r) {
  if (!r || r.owner !== 'contested' || !r.core || r.core.hp <= 0) return false;
  const from = r.claimFrom || 'wild';
  const banner = r.core;
  banner.contested = false;
  r.owner = 'player';
  r.claimFrom = null;
  r.claimQueued = false;
  S.mapDirty = true; markNavDirty();
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05 });
  if (from === 'pale') {
    banner.max = Math.max(banner.max, TUNE.coreRetaken);
    banner.hp = Math.min(banner.max, Math.max(banner.hp, 1));
    r.weakened = false;
    S.stats.retakes++;
    let n = 0;
    for (const b of S.buildings) if (b.region === r.id && b.owner === 'pale') { b.owner = 'player'; b.hp = Math.ceil(b.max * 0.6); n++; }
    toast(`${r.name} held through the night — retaken! ${n} building${n === 1 ? '' : 's'} returned (damaged)`, 'good');
  } else {
    banner.max = Math.max(banner.max, TUNE.coreCaptured);
    banner.hp = Math.min(banner.max, Math.max(banner.hp, 1));
    S.stats.captures++;
    let extra = '';
    if (r.bonus === 'fort') { S.buildings.push(mkBld('fort', r.x + 60, r.y + 10, r.id, 1)); extra = ' +free Encampment Fort'; }
    if (r.bonus === 'keep') { banner.keep = true; banner.level = 1; banner.max = banner.hp = TUNE.coreKeep; banner.r = TUNE.keepR[0]; extra = ' +free Ruin Keep'; }
    r.bonus = null;
    toast(`Banner held! ${r.name} is yours.${extra} Build a Hall to lock the claim.`, 'good');
  }
  refreshCamps();
  if (myKingdomId() && r.id) {
    r.worldOwnerId = myKingdomId();
    r.worldOwnerName = CLOUD.kingdom && CLOUD.kingdom.name;
    r.worldOwnerColor = kingdomColor(myKingdomId());
    const pos = worldFromLocal(r.x, r.y);
    zoneAct('claim', zoneKey(myKingdomId(), r.id), { buildings: S.buildings.filter(b => b.region === r.id && b.owner === 'player').map(packBldWorld), wx: pos.x, wy: pos.y, name: r.name, region: r.id });
    publishHomeZones();
  }
  return true;
}
function resolveClaims() {
  for (const r of S.regions.slice()) {
    if (r.owner !== 'contested') continue;
    // Planting mid-night does not count — the banner must face the counterattack night first.
    if (r.claimQueued && r.core && r.core.hp > 0) completeClaim(r);
    else if (r.claimQueued) failClaim(r);
  }
  for (const z of WORLD.zones.values()) {
    if (z.state !== 'contested' || z.claimerId !== myKingdomId() || !z._banner) continue;
    if (z._queued && z._banner.hp > 0) completeWorldClaim(z);
    else if (z._queued) {
      z.state = z.claimFrom === 'held' && z.ownerId ? 'owned' : 'unowned';
      z.claimerId = null;
      z._banner = null;
      zoneAct('fail', z.id);
    }
  }
}

function captureRegion(r) {
  r.owner = 'player'; r.core = mkCore(r, TUNE.coreCaptured); S.mapDirty = true; markNavDirty(); S.stats.captures++;
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05 });
  let extra = '';
  if (r.bonus === 'fort') { S.buildings.push(mkBld('fort', r.x + 60, r.y + 10, r.id, 1)); extra = ' +free Encampment Fort'; }
  if (r.bonus === 'keep') { r.core.keep = true; r.core.level = 1; r.core.max = r.core.hp = TUNE.coreKeep; r.core.r = TUNE.keepR[0]; extra = ' +free Ruin Keep'; }
  r.bonus = null;
  toast(`Region captured: ${r.name}!${extra}`, 'good');
  refreshCamps();
}
function loseRegion(r) {
  r.owner = 'pale'; r.core = null; S.mapDirty = true; markNavDirty(); S.stats.losses++;
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05, bad: 1 });
  S.buildings = S.buildings.filter(b => !(b.region === r.id && b.built < 1)); // unfinished scaffolds collapse
  S.stands = S.stands.filter(st => S.buildings.includes(st) || st.region !== r.id);
  for (const b of S.buildings) if (b.region === r.id) {
    b.owner = 'pale';
    if (hasCurse('range') && (b.type === 'tower' || b.type === 'fort')) {
      b.max = Math.round(b.max * (TUNE.curseRangeHp || 2));
      b.rangeMul = TUNE.curseRangeRng || 1.7;
      b.dmgMul = TUNE.curseRangeDmg || 1.4;
      b.cdMul = TUNE.curseRangeCd || 0.7;
    }
    b.hp = Math.max(b.hp, b.max * 0.5); if (b.farmer) b.farmer = null;
  }
  for (const m of (S.mines || [])) if (m.region === r.id) { if (m.miner && m.miner.job === m) m.miner.job = null; m.miner = null; }
  for (const a of S.archers.slice()) if (regionIdAt(a.x, a.y) === r.id && dist(a, S.monarch) > 300) S.archers.splice(S.archers.indexOf(a), 1);
  const hp = r.weakened ? 220 : 360;
  S.guardians.push({ kind: 'warden', name: 'Pale Warden', x: r.x, y: r.y, hx: r.x, hy: r.y, r: 24, hp, max: hp, dmg: 11, cd: 0, region: r.id });
  toast(`${r.name} lost to the Pale Host!`, 'bad');
  if (S.focus === r.id) pickFocus();
  refreshCamps();
  if (!owned().length) gameOver('All regions lost to the Pale Host');
}
function retakeRegion(r) {
  r.owner = 'player'; r.core = mkCore(r, TUNE.coreRetaken); r.weakened = false; S.mapDirty = true; markNavDirty(); S.stats.retakes++;
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05 });
  let n = 0;
  for (const b of S.buildings) if (b.region === r.id && b.owner === 'pale') { b.owner = 'player'; b.hp = Math.ceil(b.max * 0.6); n++; }
  toast(`${r.name} retaken! ${n} building${n === 1 ? '' : 's'} returned (damaged)`, 'good');
  refreshCamps();
}
function gameOver(why) {
  if (S.over) return; S.over = true;
  $('overTitle').textContent = why;
  if (isChallenge()) {
    noteUnlock(S.nights);
    syncChallengeScore();
    $('overStats').innerHTML = `Nights survived: <b>${S.nights}</b> / ${TUNE.challengeNights}<br>Regions held: <b>${owned().length}</b><br>Undead slain: <b>${S.kills}</b>`;
    paintScoreBreakdown(S.score, false);
    $('btnRestart').hidden = true;
    $('btnRetry').hidden = false;
    $('btnMenu').hidden = false;
  } else {
    $('overStats').innerHTML = `Nights survived: <b>${S.nights}</b><br>Regions held: <b>${owned().length}</b><br>Undead slain: <b>${S.kills}</b>`;
    if ($('overScore')) { $('overScore').hidden = true; $('overScore').innerHTML = ''; }
    $('btnRestart').hidden = false;
    $('btnRetry').hidden = true;
    $('btnMenu').hidden = true;
  }
  $('over').hidden = false;
  clearToasts();
  closeInspect();
  $('bar').hidden = true; showMenu(false); if (S) S.dropHold = false;
  $('hint').textContent = '';
  if (isEndlessCloud()) { CLOUD.dirty = true; requestSaveKingdom(); }
}
function challengeVictory() {
  if (!S || S.over) return;
  S.over = true;
  noteUnlock(S.nights);
  syncChallengeScore();
  $('overTitle').textContent = 'The realm stands';
  $('overStats').innerHTML = `All ${TUNE.challengeNights} nights survived.<br>Regions held: <b>${owned().length}</b><br>Undead slain: <b>${S.kills}</b>`;
  paintScoreBreakdown(S.score, true);
  $('btnRestart').hidden = true;
  $('btnRetry').hidden = false;
  $('btnMenu').hidden = false;
  $('over').hidden = false;
  clearToasts();
  closeInspect();
  $('bar').hidden = true; showMenu(false); S.dropHold = false;
  $('hint').textContent = '';
}

// ---------- update ----------
function blocksFriend(b) {
  if (!b) return false;
  if (b.type === 'core') return true;
  if (b.owner !== 'player' || b.built < 1) return false;
  if (b.type === 'farm' || b.type === 'gate' || b.tool || isStandType(b.type)) return false;
  return true;
}
function solidAt(x, y, r, friend) {
  for (const b of S.buildings) {
    if (friend && !blocksFriend(b)) continue;
    if (!friend && (b.owner !== 'player' || b.built < 1 || b.type === 'farm')) continue;
    if (Math.hypot(b.x - x, b.y - y) < b.r + r) return b;
  }
  if (S.regions) {
    for (const reg of S.regions) {
      const c = reg.core;
      if (!c) continue;
      if (Math.hypot(c.x - x, c.y - y) < (c.r || 20) + r) return c;
    }
  }
  return null;
}
function tickOverlapMon(dt) {
  if (!S || !S._olMon) return;
  if (S.phase === 'night') S._olMon.sawNight = true;
  if (S.phase === 'day' && S._olMon.sawNight) S._olMon.sawDawn = true;
  const acc = (u, friend, label) => {
    if (!u || u.hp <= 0) return;
    const hit = solidAt(u.x, u.y, u.r || 9, friend);
    if (hit) {
      u._ol = (u._ol || 0) + dt;
      if (u._ol > (S._olMon.max || 0)) S._olMon.max = u._ol;
      if (u._ol > 2 && !u._olFlag) {
        u._olFlag = true;
        if (S._olMon.hits.length < 8) S._olMon.hits.push({ label, t: +u._ol.toFixed(2), type: hit.type || hit.kind, x: u.x, y: u.y });
      }
    } else { u._ol = 0; u._olFlag = false; }
  };
  acc(S.monarch, true, 'monarch');
  for (const f of S.folk) acc(f, true, f.role || 'folk');
  for (const a of S.archers) acc(a, true, 'archer');
  for (const u of S.undead) acc(u, false, u.kind || 'undead');
}
function tryMove(e, nx, ny, friend) {
  if (S && e === S.monarch && worldInputBlocked()) return false;
  if (!(S && e === S.monarch && canWalkWorld())) {
    nx = clamp(nx, 10, W - 10); ny = clamp(ny, 10, H - 10);
  }
  if (!solidAt(nx, ny, e.r, friend) || solidAt(e.x, e.y, e.r, friend)) { e.x = nx; e.y = ny; return true; }
  if (!solidAt(nx, e.y, e.r, friend)) { e.x = nx; return true; }
  if (!solidAt(e.x, ny, e.r, friend)) { e.y = ny; return true; }
  return false;
}
function edgeScrollWall(dt) {
  if (!wallDrag || !ptr || !ptr.wall || pinch) return;
  const margin = 52, speed = 260;
  let sx = 0, sy = 0;
  if (ptr.x < margin) sx = -1;
  else if (ptr.x > vw - margin) sx = 1;
  if (ptr.y < TOP_CHROME + 8) sy = -1;
  else if (ptr.y > vh - BOT_CHROME + 8) sy = 1;
  if (!sx && !sy) return;
  lookX += sx * speed * dt;
  lookY += sy * speed * dt;
  lookFree = true;
  const w = s2w(ptr.x, ptr.y);
  wallDrag.x1 = w.x; wallDrag.y1 = w.y;
}
function update(dt) {
  if (!S || S.over) return;
  if (worldInputBlocked()) return;
  ensureNav();
  nav.repaths = 0;
  followCam(dt);
  edgeScrollWall(dt);
  S.t += dt;
  if (S.phase === 'day') {
    S.phaseT -= dt;
    if (S.phaseT <= 0) startNight();
    S.trickle += dt; if (S.trickle >= TUNE.trickleEvery) { S.trickle -= TUNE.trickleEvery; S.coins += owned().length; }
  } else if (S.phase === 'night') {
    // Dawn only when the wave has actually started (or was empty — startNight never enters)
    // and every queued and living host, including necro-raised skeletons, is gone.
    if (S.nightSpawned && !S.spawnQ.length && !(S.claimQ && S.claimQ.length) && !S.undead.length) startDay();
    if (S.spawnQ.length) { S.spawnT -= dt; if (S.spawnT <= 0) { S.spawnT = S.spawnGap; spawnUndead(S.spawnQ.shift()); } }
    if (S.claimQ && S.claimQ.length) {
      S.claimT -= dt;
      if (S.claimT <= 0) {
        S.claimT = S.claimGap;
        const item = S.claimQ.shift();
        spawnUndead(item.kind, null, false, { claim: item.claim, scale: item.scale });
      }
    }
  }
  if (S.dropHold) { S.dropT -= dt; if (S.dropT <= 0) { S.dropT = 0.22; dropCoin(); } }
  const m = S.monarch;
  // movement
  let dx = 0, dy = 0;
  if (ptr && ptr.drag && !ptr.build && !ptr.wall && !pinch && !wallDrag && !(S && S.build)) { dx = (ptr.x - ptr.sx) / 60; dy = (ptr.y - ptr.sy) / 60; }
  if (keys.w || keys.arrowup) dy -= 1; if (keys.s || keys.arrowdown) dy += 1;
  if (keys.a || keys.arrowleft) dx -= 1; if (keys.d || keys.arrowright) dx += 1;
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  if (len > 0.05) { m.face = Math.atan2(dy, dx); }
  if (len > 0.05) steerMove(m, m.x + dx * m.speed * dt, m.y + dy * m.speed * dt, true);
  // monarch attack
  m.cd -= dt;
  const enemies = enemiesList();
  let near = false;
  if (m.target && !enemies.includes(m.target)) m.target = null;
  if (m.cd <= 0) {
    let tgt = m.target && dist(m.target, m) - m.target.r <= 75 ? m.target : null;
    if (!tgt) { let bd = 75; for (const e of enemies) { const d = dist(e, m) - e.r; if (d < bd) { bd = d; tgt = e; } } }
    if (tgt) {
      const md = monarchDamage();
      m.cd = 0.45;
      if (md > 0) {
        S.fx.push({ k: 'slash', x: m.x, y: m.y, tx: tgt.x, ty: tgt.y, t: 0.18, t0: 0.18 });
        damage(tgt, md);
      }
      if (S.over) return;
    }
  }
  for (const e of enemies) if (dist(e, m) < 260) { near = true; break; }
  if (!near && S.phase === 'day') m.hp = Math.min(m.max, m.hp + TUNE.monarchRegen * dt);

  // guardians
  for (const g of S.guardians) {
    const dHome = Math.hypot(m.x - g.hx, m.y - g.hy);
    let tx = g.hx, ty = g.hy;
    if (dHome < TUNE.guardianLeash) { tx = m.x; ty = m.y; }
    else g.hp = Math.min(g.max, g.hp + 20 * dt);
    const d = Math.hypot(tx - g.x, ty - g.y);
    if (d > g.r + m.r + 4) { const sp = 85 * dt; g.x += (tx - g.x) / d * Math.min(sp, d); g.y += (ty - g.y) / d * Math.min(sp, d); }
    g.cd -= dt;
    if (dist(g, m) < g.r + m.r + 12 && g.cd <= 0) { g.cd = 0.9; damage(m, g.dmg); S.fx.push({ k: 'hit', x: m.x, y: m.y, t: 0.2, t0: 0.2 }); if (S.over) return; }
  }

  // buildings (towers, forts, keep archer)
  function fireTower(b, owner, spec) {
    b.cd -= dt; if (b.cd > 0) return;
    const shotSpr = (b.type === 'tower' && (b.level || 1) >= 2) ? getSprite('projectile-' + (b.path === 'ballista' ? 'bolt' : 'cannonball') + '-' + ((b.level || 1) >= 3 ? 'iron' : 'stone')) : null;
    const shots = (b.type === 'fort' && owner === 'player') ? (TUNE.fortArchers[(b.level || 1) - 1] || 1) : 1;
    let range = spec.range, dmg = spec.dmg, cd = spec.cd; const aoe = spec.aoe || 0, pierce = spec.pierce || 0;
    if (owner === 'player') { dmg *= allyDmgMul(); }
    else {
      if (b.rangeMul) range *= b.rangeMul;
      if (b.dmgMul) dmg *= b.dmgMul;
      if (b.cdMul) cd *= b.cdMul;
      if (!b.rangeMul && hasCurse('range')) { range *= (TUNE.curseRangeRng || 1.7); dmg *= (TUNE.curseRangeDmg || 1.4); cd *= (TUNE.curseRangeCd || 0.7); }
    }
    const ay = b.y - (b.type === 'fort' ? 40 : b.type === 'core' ? 48 : 30);
    if (owner === 'player') {
      const foes = S.undead.slice();
      if (!foes.length) return;
      foes.sort((u, v) => dist(u, b) - dist(v, b));
      const first = foes.find(u => dist(u, b) <= range);
      if (!first) return;
      b.cd = cd;
      S.stats.towerShots++;
      if (aoe > 0) {
        S.fx.push({ k: 'arrow', x: b.x, y: ay, tx: first.x, ty: first.y, t: 0.42, t0: 0.42, c: '#ffb15a', bolt: 1, spr: shotSpr });
        for (const u of foes) if (dist(u, first) <= aoe) damage(u, dmg);
      } else if (pierce > 0) {
        const ang = Math.atan2(first.y - b.y, first.x - b.x);
        const hit = [];
        for (const u of foes) {
          if (dist(u, b) > range) continue;
          const px = u.x - b.x, py = u.y - b.y;
          const along = px * Math.cos(ang) + py * Math.sin(ang);
          const side = Math.abs(px * Math.sin(ang) - py * Math.cos(ang));
          if (along > 0 && side < 22) hit.push(u);
        }
        hit.sort((u, v) => dist(u, b) - dist(v, b));
        const end = hit[Math.min(hit.length, pierce) - 1] || first;
        S.fx.push({ k: 'arrow', x: b.x, y: ay, tx: end.x, ty: end.y, t: 0.36, t0: 0.36, c: '#efe6d4', bolt: 1, spr: shotSpr });
        for (const u of hit.slice(0, pierce)) damage(u, dmg);
      } else {
        for (let s = 0; s < shots; s++) {
          const tgt = foes.filter(u => dist(u, b) <= range)[s] || first;
          S.fx.push({ k: 'arrow', x: b.x + (s ? 6 : 0), y: ay, tx: tgt.x, ty: tgt.y, t: 0.48, t0: 0.48, c: '#ffd27a', spr: shotSpr });
          damage(tgt, dmg);
        }
      }
    } else {
      let best = null, bd = range;
      for (const a of [m].concat(S.archers)) { const d = dist(a, b); if (d < bd) { bd = d; best = a; } }
      if (best) { b.cd = cd * 1.4; S.stats.paleTowerShots++; S.fx.push({ k: 'arrow', x: b.x, y: ay, tx: best.x, ty: best.y, t: 0.48, t0: 0.48, c: '#9dff7a' }); damage(best, 6); }
    }
  }
  for (const b of S.buildings) {
    if (b.built < 1) continue;
    if (b.type === 'tower') fireTower(b, b.owner, towerCombat(b));
    else if (b.type === 'fort') {
      const lv = b.level || 1;
      fireTower(b, b.owner, { range: TUNE.fortRange[lv - 1], dmg: TUNE.fortDmg[lv - 1], cd: BLD.fort.cd, aoe: 0, pierce: 0 });
    }
  }
  const hk = homeCore();
  if (hk && isPlayerKeep(hk) && (hk.level || 1) >= 2) fireTower(hk, 'player', { range: 220, dmg: 12 * allyDmgMul(), cd: 0.9, aoe: 0, pierce: 0 });

  updateDrops(dt);
  updateFolk(dt);
  // archers guard posts (towers > banners > walls); Rally makes nearby ones follow the monarch
  S.postT -= dt; if (S.postT <= 0) { S.postT = 1; assignPosts(); }
  const followers = S.archers.filter(a => a.follow);
  S.archers.forEach((a) => {
    let tx = a.x, ty = a.y, spd = 150;
    if (a.send) {
      tx = a.send.x; ty = a.send.y; spd = 150;
      if (Math.hypot(a.x - tx, a.y - ty) <= 12) a.send = null;
    } else if (a.follow) {
      const k = followers.indexOf(a);
      const ang = (k / Math.max(1, followers.length)) * Math.PI * 2 + S.t * 0.2;
      tx = m.x + Math.cos(ang) * 55; ty = m.y + Math.sin(ang) * 55; spd = 210;
    } else if (a.post) {
      const p = a.post, rr = (p.r || 16) + 16;
      const cx = p.x + Math.cos(a.slotA) * rr, cy = p.y + 10 + Math.sin(a.slotA) * rr * 0.6;
      if (S.phase === 'night') { tx = cx; ty = cy; }
      else {
        a.wt = (a.wt || 0) - dt;
        if (a.wt <= 0 || a.tx == null) { a.wt = 2.5 + Math.random() * 3; a.tx = cx + (Math.random() - .5) * 120; a.ty = cy + (Math.random() - .5) * 80; }
        tx = a.tx; ty = a.ty; spd = 55;
      }
    }
    const d = Math.hypot(tx - a.x, ty - a.y);
    if (d > 4) followRoute(a, tx, ty, spd, dt, true);
    a.cd -= dt;
    if (hasCurse('death') && S.phase === 'night') { /* archers stand down at night */ }
    else if (a.cd <= 0) {
      let best = null, bd = archerRangeOf();
      for (const e of enemies) { if (!S.undead.includes(e) && !S.guardians.includes(e) && !(e.owner === 'pale')) continue; const dd = dist(e, a); if (dd < bd) { bd = dd; best = e; } }
      if (best) { a.cd = 0.9; S.fx.push({ k: 'arrow', x: a.x, y: a.y - 8, tx: best.x, ty: best.y - 6, t: 0.22, t0: 0.22, c: '#fff6e0' }); damage(best, archerDamage()); if (S.over) return; }
    }
  });

  // undead
  const playerBlds = S.buildings.filter(b => b.owner === 'player' && b.built >= 1 && b.type !== 'farm');
  const dmgK = (!S.chaos && S.leader) ? TUNE.leaderDmg : 1;
  if (S.returnQ && S.returnQ.length && S.phase === 'night') {
    for (const r of S.returnQ.slice()) {
      r.t -= dt;
      if (r.t <= 0) {
        S.returnQ.splice(S.returnQ.indexOf(r), 1);
        const u = spawnUndead(r.kind, { x: r.x, y: r.y }, true, { claim: r.claim, scale: r.scale });
        if (u) S.fx.push({ k: 'puff', x: u.x, y: u.y, t: 0.5, t0: 0.5 });
      }
    }
  }
  for (const u of S.undead.slice()) {
    if (!S.undead.includes(u)) continue;
    if (hasCurse('phoenix') && u.kind !== 'necro' && u.hp < u.max) {
      u.hp = Math.min(u.max, u.hp + Math.min(TUNE.cursePhoenixCap || 15, u.max * (TUNE.cursePhoenixRate || 0.04)) * dt);
    }
    if (u.atkWait > 0) u.atkWait -= dt;
    u.rt -= dt;
    if (u.rt <= 0 || (u.tgt && u.tgt.hp <= 0)) { u.rt = 0.4 + Math.random() * 0.3; u.tgt = pickUndeadTarget(u, playerBlds); }
    const t = u.tgt;
    let tx, ty;
    if (!t) { tx = u.x + Math.cos(S.t + u.jit * 9) * 50; ty = u.y + Math.sin(S.t + u.jit * 9) * 50; }
    else { tx = t.x; ty = t.y; }
    if (S.chaos && u.kind !== 'necro') { const a = Math.atan2(ty - u.y, tx - u.x) + Math.sin(S.t * 1.7 + u.jit * 20) * 1.4; tx = u.x + Math.cos(a) * 100; ty = u.y + Math.sin(a) * 100; }
    const d = Math.hypot(tx - u.x, ty - u.y);
    const stopAt = u.kind === 'necro' && t !== m ? 130 : (t ? t.r + u.r + 2 : 0);
    let blocked = null;
    if (t && dist(t, u) <= t.r + u.r + 4) blocked = t;
    if (!blocked && d > stopAt) {
      followRoute(u, tx, ty, u.speed * (S.chaos ? 0.75 : 1), dt, false);
      for (const b of playerBlds) if (Math.hypot(b.x - u.x, b.y - u.y) < b.r + u.r) { blocked = b; break; }
    }
    u.cd -= dt;
    if (u.kind === 'necro' && !S.chaos) { u.raiseT = (u.raiseT == null ? TUNE.necroRaiseEvery : u.raiseT) - dt; if (u.raiseT <= 0) { u.raiseT = TUNE.necroRaiseEvery; raiseDead(u); } }
    if (blocked && u.cd <= 0 && u.kind !== 'necro' && !(u.atkWait > 0)) {
      u.cd = 1; damage(blocked, u.dmg * dmgK);
      S.fx.push({ k: 'hit', x: blocked.x, y: blocked.y, t: 0.15, t0: 0.15 });
      if ((blocked.type === 'wall' || blocked.type === 'gate') && (blocked.level || 1) >= 3 && S.undead.includes(u)) {
        damage(u, TUNE.wallSpikeDmg || 8);
        S.fx.push({ k: 'hit', x: u.x, y: u.y, t: 0.12, t0: 0.12 });
      }
      if (S.over) return;
    }
    if (u.kind === 'necro' && dist(u, m) < 140 * (u.rangeMul || 1) && u.cd <= 0) { u.cd = 1.3 * (u.cdMul || 1); S.fx.push({ k: 'arrow', x: u.x, y: u.y - 10, tx: m.x, ty: m.y - 8, t: 0.24, t0: 0.24, c: '#c6ff8a', bolt: 1 }); damage(m, u.dmg); if (S.over) return; }
  }

  const nk = S.phase === 'night' ? 1 : 0;
  S.nightK += (nk - S.nightK) * Math.min(1, dt * 1.35);
  const decay = e => { if (e.flash > 0) e.flash -= dt; };
  decay(S.monarch);
  for (const a of S.archers) decay(a);
  for (const f of S.folk) decay(f);
  for (const u of S.undead) decay(u);
  for (const g of S.guardians) decay(g);
  for (const b of S.buildings) decay(b);
  for (const r of S.regions) if (r.core) decay(r.core);
  tickOverlapMon(dt);

  for (const f of S.fx) f.t -= dt;
  S.fx = S.fx.filter(f => f.t > 0);
}

function pickUndeadTarget(u, playerBlds) {
  if (u.claim != null) {
    const cr = S.regions[u.claim];
    if (cr && cr.core && cr.core.hp > 0) return cr.core;
  }
  const m = S.monarch;
  if (dist(u, m) < 150) return m;
  for (const a of S.archers) if (dist(u, a) < 70) return a;
  for (const f of S.folk) if (f.role !== 'vagrant' && dist(u, f) < 60) return f;
  const cores = owned().filter(r => r.core).map(r => r.core);
  if (!cores.length) return m;
  if (!S.chaos && S.leader && S.focus != null && S.regions[S.focus].core) return S.regions[S.focus].core; // smart: ordered focus
  let best = null, bd = 1e9;
  for (const c of cores.concat(playerBlds)) { const d = dist(c, u) + (S.chaos ? Math.random() * 400 : 0); if (d < bd) { bd = d; best = c; } }
  return best;
}

// ---------- art (procedural, no external assets) ----------
const SPR = 3;
const Art = {};
const GSC = 1600 / W;
let groundCv = document.createElement('canvas');
let lightCv = null, lightCtx = null;

function bake(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * SPR));
  c.height = Math.max(1, Math.ceil(h * SPR));
  const g = c.getContext('2d');
  g.scale(SPR, SPR);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  fn(g);
  return { c, w, h, gy: h - 2 };
}
function ell(g, x, y, rx, ry, color, rot) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), rot || 0, 0, Math.PI * 2);
  g.fill();
}
function disc(g, x, y, r, color) { ell(g, x, y, r, r, color, 0); }
function poly(g, pts, color) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}
function rrPath(g, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

function paintShadow() {
  return bake(48, 22, g => {
    const grd = g.createRadialGradient(24, 11, 1, 24, 11, 16);
    grd.addColorStop(0, 'rgba(62,42,18,.42)');
    grd.addColorStop(1, 'rgba(62,42,18,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 48, 22);
  });
}
function paintRadial(w, h, stops) {
  return bake(w, h, g => {
    const grd = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, Math.max(w, h) / 2);
    for (const s of stops) grd.addColorStop(s[0], s[1]);
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}
function paintCoin() {
  return bake(16, 16, g => {
    disc(g, 8, 8.4, 6.2, '#a56b12');
    disc(g, 8, 7.6, 5.6, '#f0c14a');
    disc(g, 6.2, 6, 2.1, 'rgba(255,248,220,.75)');
    g.strokeStyle = '#8a5a14';
    g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(8, 5.2); g.lineTo(8, 10.4); g.stroke();
  });
}
function paintTree(kind) {
  const tall = kind === 2;
  const w = tall ? 34 : 46, h = tall ? 62 : 52;
  const spr = bake(w, h, g => {
    const cx = w / 2, base = h - 2;
    g.fillStyle = '#4a2f20';
    g.fillRect(cx - 1, base - 18, 4, 18);
    g.fillStyle = '#6b4630';
    g.fillRect(cx - 2.4, base - 18, 3.2, 18);
    if (tall) {
      ell(g, cx, base - 30, 8, 16, '#3f6a30');
      ell(g, cx - 1, base - 36, 7, 13, '#5c8a3c');
      ell(g, cx - 2, base - 44, 5, 8, '#8fb85a');
    } else {
      const r = kind === 1 ? 15 : 13;
      ell(g, cx + 6, base - 22, r * 0.85, r * 0.72, '#3f6a30');
      ell(g, cx - 5, base - 24, r, r * 0.86, '#5d8f3e');
      ell(g, cx - 1, base - 32, r * 0.78, r * 0.7, '#7eac52');
      ell(g, cx - 6, base - 34, 5, 4, 'rgba(236,244,200,.55)');
    }
  });
  spr.gy = h - 2;
  return spr;
}
function paintDeadTree() {
  const spr = bake(40, 54, g => {
    g.strokeStyle = '#6a6e62';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(20, 52); g.lineTo(20, 24);
    g.moveTo(20, 36); g.lineTo(8, 22);
    g.moveTo(20, 30); g.lineTo(32, 16);
    g.moveTo(20, 22); g.lineTo(14, 12);
    g.stroke();
    g.strokeStyle = '#8d927f';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(19, 50); g.lineTo(19, 26);
    g.moveTo(20, 36); g.lineTo(10, 24);
    g.stroke();
    ell(g, 30, 18, 3.2, 2.2, '#9aa48c');
  });
  spr.gy = 52;
  return spr;
}
function paintRock(v) {
  const spr = bake(v ? 26 : 20, 14, g => {
    const w = v ? 26 : 20;
    poly(g, [[2, 12], [4, 5], [w * 0.55, 2], [w - 2, 6], [w - 1, 12]], '#8e8578');
    poly(g, [[3, 11], [6, 6], [w * 0.5, 4], [w * 0.46, 11]], '#d4cbbd');
  });
  spr.gy = 12;
  return spr;
}
function paintWall(pale, wood) {
  const top = pale ? '#b7c0ae' : (wood ? '#d2a56c' : '#e7e2d8');
  const face = pale ? '#8d9686' : (wood ? '#b07a45' : '#c9c2b4');
  const side = pale ? '#5e675e' : (wood ? '#6e4328' : '#8f877c');
  const ink = pale ? '#3c443c' : (wood ? '#4a2e1c' : '#7a7064');
  const spr = bake(42, 30, g => {
    poly(g, [[4, 12], [36, 10], [32, 16], [2, 18]], top);
    poly(g, [[2, 18], [32, 16], [32, 28], [2, 28]], face);
    poly(g, [[32, 16], [36, 10], [36, 22], [32, 28]], side);
    g.strokeStyle = ink;
    g.globalAlpha = 0.55;
    g.lineWidth = 1;
    g.beginPath();
    if (wood) {
      for (let x = 8; x <= 30; x += 6) { g.moveTo(x + 2, 12); g.lineTo(x - 1, 28); }
    } else {
      g.moveTo(2, 22); g.lineTo(32, 21);
      g.moveTo(12, 18); g.lineTo(11, 22);
      g.moveTo(22, 17); g.lineTo(21, 21);
      g.moveTo(8, 22); g.lineTo(7, 28);
      g.moveTo(18, 22); g.lineTo(17, 28);
      g.moveTo(27, 21); g.lineTo(26, 28);
    }
    g.stroke();
    g.globalAlpha = 1;
    if (wood) {
      for (let x = 4; x <= 30; x += 6) poly(g, [[x, 12], [x + 3, 7], [x + 6, 11]], top);
    }
    if (pale) {
      disc(g, 16, 23, 3.1, '#e7ecdf');
      disc(g, 14.9, 22.5, 0.65, '#1c2418');
      disc(g, 17.1, 22.5, 0.65, '#1c2418');
      g.strokeStyle = '#9dff7a';
      g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(24, 18); g.lineTo(27, 24); g.lineTo(25, 27); g.stroke();
    } else {
      g.strokeStyle = 'rgba(255,255,255,.4)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(8, 13); g.lineTo(30, 11.4); g.stroke();
    }
  });
  spr.gy = 24;
  return spr;
}
function paintGate(open, pale) {
  const top = pale ? '#b7c0ae' : '#e7e2d8';
  const face = pale ? '#8d9686' : '#c9c2b4';
  const side = pale ? '#5e675e' : '#8f877c';
  const ink = pale ? '#3c443c' : '#7a7064';
  const wood = pale ? '#6a7062' : '#8a5a32';
  const woodL = pale ? '#8d9686' : '#c4925a';
  const spr = bake(44, 38, g => {
    // pillars
    poly(g, [[2, 14], [10, 12], [10, 34], [2, 34]], face);
    poly(g, [[34, 12], [42, 10], [42, 32], [34, 34]], side);
    poly(g, [[34, 12], [34, 34], [10, 34], [10, 12]], face);
    // lintel / arch
    poly(g, [[2, 14], [22, 4], [42, 10], [34, 12], [10, 12]], top);
    poly(g, [[10, 12], [22, 8], [34, 12], [34, 16], [22, 14], [10, 16]], top);
    g.strokeStyle = ink; g.globalAlpha = 0.55; g.lineWidth = 1;
    g.beginPath(); g.moveTo(2, 24); g.lineTo(10, 24); g.moveTo(34, 24); g.lineTo(42, 24); g.stroke();
    g.globalAlpha = 1;
    if (open && !pale) {
      // open doors swung inward, dark passage
      g.fillStyle = 'rgba(40,28,18,.78)';
      g.beginPath(); g.moveTo(12, 16); g.lineTo(32, 16); g.lineTo(32, 34); g.lineTo(12, 34); g.fill();
      poly(g, [[10, 16], [7, 14], [7, 33], [10, 34]], woodL);
      poly(g, [[34, 16], [37, 14], [37, 33], [34, 34]], wood);
      g.strokeStyle = '#5c3a24'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(8.5, 20); g.lineTo(8.5, 28); g.moveTo(35.5, 20); g.lineTo(35.5, 28); g.stroke();
    } else {
      // closed doors
      poly(g, [[11, 16], [22, 15], [22, 34], [11, 34]], woodL);
      poly(g, [[22, 15], [33, 16], [33, 34], [22, 34]], wood);
      g.strokeStyle = pale ? '#3c443c' : '#5c3a24'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(22, 15); g.lineTo(22, 34); g.stroke();
      g.fillStyle = pale ? '#9dff7a' : '#f0c14a';
      g.beginPath(); g.arc(19, 25, 1.3, 0, 7); g.arc(25, 25, 1.3, 0, 7); g.fill();
    }
    if (pale) {
      disc(g, 16, 10, 2.4, '#e7ecdf');
      disc(g, 15.3, 9.6, 0.5, '#1c2418'); disc(g, 16.7, 9.6, 0.5, '#1c2418');
    } else {
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(6, 10); g.lineTo(22, 5); g.lineTo(38, 10); g.stroke();
    }
  });
  spr.gy = 30;
  return spr;
}
function paintTower(pale) {
  const stone = pale ? '#a3ac9e' : '#f3eadc';
  const stoneD = pale ? '#7c8578' : '#d4c8b4';
  const side = pale ? '#596158' : '#a89886';
  const roof = pale ? '#6d776c' : '#d06a45';
  const roofL = pale ? '#909a88' : '#f0a07a';
  const roofD = pale ? '#465046' : '#a34c30';
  const spr = bake(50, 74, g => {
    poly(g, [[14, 56], [34, 56], [40, 50], [18, 50]], stoneD);
    poly(g, [[14, 56], [34, 56], [34, 62], [14, 62]], stone);
    poly(g, [[34, 56], [40, 50], [40, 56], [34, 62]], side);
    poly(g, [[14, 30], [34, 30], [34, 56], [14, 56]], stone);
    poly(g, [[34, 30], [42, 24], [42, 50], [34, 56]], side);
    poly(g, [[14, 30], [34, 30], [42, 24], [22, 24]], stoneD);
    g.strokeStyle = pale ? 'rgba(20,28,20,.4)' : 'rgba(80,60,40,.28)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(14, 39); g.lineTo(34, 39);
    g.moveTo(14, 48); g.lineTo(34, 48);
    g.moveTo(34, 36); g.lineTo(42, 30);
    g.moveTo(34, 46); g.lineTo(42, 40);
    g.stroke();
    poly(g, [[20, 56], [28, 56], [28, 46], [24, 43], [20, 46]], pale ? '#1a1e1a' : '#5c3a24');
    g.fillStyle = stone;
    g.fillRect(15, 24, 6, 8);
    g.fillRect(24, 24, 6, 8);
    poly(g, [[24, 4], [8, 26], [24, 34]], roof);
    poly(g, [[24, 4], [44, 24], [24, 34]], roofD);
    poly(g, [[24, 4], [8, 26], [18, 18]], roofL);
    if (!pale) {
      disc(g, 22, 44, 2.2, '#e6b898');
      g.fillStyle = '#3e74c8';
      g.fillRect(20, 45.4, 4.2, 3.2);
      g.strokeStyle = '#6b4630';
      g.lineWidth = 1.1;
      g.beginPath(); g.arc(28, 45, 3.3, -1.15, 1.05); g.stroke();
      g.strokeStyle = '#efe6d4';
      g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(31, 42.6); g.lineTo(31, 47.6); g.stroke();
    } else {
      disc(g, 22, 44, 2.5, '#e7ecdf');
      disc(g, 21.2, 43.6, 0.55, '#1c2418');
      disc(g, 22.8, 43.6, 0.55, '#1c2418');
      disc(g, 36, 40, 1.7, '#9dff7a');
    }
    g.fillStyle = '#5c4030';
    g.fillRect(23, 4, 2, 8);
  });
  spr.gy = 58;
  spr.flames = [{ dx: 11, dy: -18 }];
  spr.flag = { dx: -1, dy: -54, w: 14, h: 8 };
  return spr;
}
function paintFort(pale) {
  const stone = pale ? '#a3ac9e' : '#f4ecdf';
  const side = pale ? '#596158' : '#b3a690';
  const log = pale ? '#8a917f' : '#c4925a';
  const logD = pale ? '#5c6458' : '#7a5432';
  const roof = pale ? '#667066' : '#d06a45';
  const roofL = pale ? '#8d9786' : '#f0a07a';
  const roofD = pale ? '#465046' : '#a34c30';
  const spr = bake(78, 86, g => {
    for (let i = 0; i < 8; i++) {
      const x = 6 + i * 8.4;
      g.fillStyle = i % 2 ? logD : log;
      g.fillRect(x, 62, 6, 20);
      disc(g, x + 3, 62, 3.1, i % 2 ? logD : log);
    }
    poly(g, [[24, 58], [58, 58], [58, 78], [24, 78]], pale ? '#6e776c' : '#e7dccb');
    poly(g, [[58, 58], [66, 52], [66, 72], [58, 78]], side);
    poly(g, [[22, 36], [60, 40], [54, 58], [18, 54]], roof);
    poly(g, [[22, 36], [36, 30], [18, 48]], roofL);
    poly(g, [[36, 30], [62, 38], [54, 56], [28, 50]], roofD);
    g.fillStyle = stone;
    g.fillRect(8, 40, 16, 32);
    g.fillStyle = side;
    g.fillRect(22, 44, 5, 28);
    poly(g, [[16, 18], [30, 34], [4, 36]], roof);
    poly(g, [[16, 18], [8, 34], [4, 36]], roofL);
    g.fillStyle = pale ? '#1a1e1a' : '#5c3a24';
    g.fillRect(36, 62, 12, 16);
    disc(g, 46, 70, 1.1, '#f0c14a');
    if (!pale) {
      disc(g, 15, 48, 2.2, '#e6b898');
      g.fillStyle = '#3e74c8';
      g.fillRect(13, 49.5, 4, 3);
    } else {
      disc(g, 15, 48, 2.4, '#e7ecdf');
      disc(g, 14.2, 47.5, 0.5, '#1c2418');
      disc(g, 15.8, 47.5, 0.5, '#1c2418');
    }
    g.fillStyle = '#5c4030';
    g.fillRect(34, 22, 2.2, 14);
    g.fillStyle = pale ? '#9dff7a' : '#ffb15a';
    disc(g, 62, 64, 2, pale ? '#c6ff8a' : '#ffd27a');
  });
  spr.gy = 78;
  spr.flames = [{ dx: 23, dy: -14 }];
  spr.flag = { dx: -5, dy: -56, w: 16, h: 10 };
  spr.smoke = { dx: -23, dy: -62 };
  return spr;
}

function paintMonarch(frame) {
  const spr = bake(64, 52, g => {
    const step = frame ? 2 : 0;
    ell(g, 14, 34, 5, 3, '#8d6744');
    g.fillStyle = '#8d6744';
    g.beginPath(); g.moveTo(16, 30); g.quadraticCurveTo(4, 28 - step, 6, 38); g.quadraticCurveTo(14, 34, 18, 32); g.fill();
    g.fillStyle = '#c4a074';
    const legs = [[18, 0], [26, 1], [36, 0], [44, 1]];
    for (const [lx, ph] of legs) {
      const s = frame && ph ? -2 : (frame ? 1.5 : 0);
      g.fillRect(lx, 34 + s, 3.4, 12 - s);
      g.fillStyle = '#3a2a1c';
      g.fillRect(lx - 0.2, 44, 3.8, 2.2);
      g.fillStyle = '#c4a074';
    }
    ell(g, 32, 34, 16, 8, '#b8895c');
    ell(g, 31, 31, 15, 7.2, '#e4c49a');
    ell(g, 46, 24, 7, 4.6, '#e4c49a', 0.35);
    poly(g, [[44, 20], [46, 13], [49, 21]], '#c4a074');
    g.fillStyle = '#f6efe2';
    g.beginPath(); g.moveTo(42, 18); g.quadraticCurveTo(32, 16, 26, 26); g.quadraticCurveTo(36, 22, 44, 22); g.fill();
    disc(g, 49, 23, 0.8, '#2a1c10');
    ell(g, 32, 28, 8, 3.4, '#3e74c8');
    g.fillStyle = '#f0c14a';
    g.fillRect(25, 26, 14, 1.6);
    const cape = frame ? 3 : -1;
    g.fillStyle = '#c4473a';
    g.beginPath(); g.moveTo(30, 20); g.quadraticCurveTo(16, 22 + cape, 12, 34); g.quadraticCurveTo(24, 28, 32, 24); g.fill();
    g.fillStyle = '#9a3028';
    g.beginPath(); g.moveTo(28, 22); g.quadraticCurveTo(18, 26, 15, 33); g.quadraticCurveTo(24, 28, 28, 24); g.fill();
    ell(g, 34, 18, 5.2, 6, '#3e74c8');
    ell(g, 36.5, 19, 2.4, 4.6, '#2c5eac');
    ell(g, 40, 18, 3.6, 1.7, '#e6b898', 0.4);
    g.strokeStyle = '#e8eef4';
    g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(42, 17); g.lineTo(58, 8); g.stroke();
    g.strokeStyle = '#f0c14a';
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(40, 18.5); g.lineTo(44, 16); g.stroke();
    disc(g, 34, 10, 4.3, '#e6b898');
    poly(g, [[29, 9], [29.5, 2.4], [34, 6.2], [38.6, 1.6], [39.2, 9]], '#f0c14a');
    disc(g, 34, 4.2, 1.15, '#c4473a');
    disc(g, 35.6, 10.2, 0.55, '#2a1c10');
  });
  spr.gy = 48;
  return spr;
}
function paintArcher(frame, rally) {
  const spr = bake(30, 34, g => {
    const step = frame > 0 ? (frame === 2 ? -1.4 : 2.2) : 0;
    g.fillStyle = '#5c4030';
    g.fillRect(10, 24, 3, 8);
    g.fillRect(16, 24 - step, 3, 8 + step);
    g.fillStyle = '#3a2a1c';
    g.fillRect(10, 31, 3.2, 1.6);
    g.fillRect(16, 31, 3.2, 1.6);
    ell(g, 14, 20, 6, 6.5, '#6e9a4a');
    ell(g, 16.5, 21, 3, 5, '#4f7a34');
    g.fillStyle = '#3e74c8';
    g.fillRect(11, 18, 7, 2.2);
    if (rally) {
      g.fillStyle = '#f0c14a';
      g.beginPath(); g.moveTo(11, 16); g.lineTo(18, 22); g.lineTo(16, 23); g.lineTo(9, 17); g.fill();
      g.fillStyle = '#3e74c8';
      g.beginPath(); g.moveTo(6, 14); g.lineTo(6, 6); g.lineTo(12, 9); g.closePath(); g.fill();
      g.strokeStyle = '#6b4630'; g.lineWidth = 1; g.beginPath(); g.moveTo(6, 18); g.lineTo(6, 6); g.stroke();
    }
    g.fillStyle = '#8b5a32';
    g.fillRect(8, 15, 2.4, 7);
    g.strokeStyle = '#f0c14a';
    g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(8.6, 15); g.lineTo(7.2, 10); g.moveTo(10, 15); g.lineTo(10.6, 10); g.stroke();
    disc(g, 14, 11, 3.5, '#e6b898');
    g.fillStyle = '#5c4030';
    g.beginPath();
    g.arc(14, 11, 3.8, Math.PI * 1.05, Math.PI * 1.95);
    g.quadraticCurveTo(18.5, 6, 14, 4.2);
    g.quadraticCurveTo(9.5, 6, 10, 11);
    g.fill();
    g.strokeStyle = '#6b4630';
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(22, 18, 7.2, -1.25, 1.25); g.stroke();
    g.strokeStyle = '#f4ead8';
    g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(23.4, 12); g.lineTo(23.4, 24); g.stroke();
    disc(g, 15.3, 11.2, 0.5, '#2a1c10');
  });
  spr.gy = 33;
  return spr;
}
function paintGuardian(frame) {
  const spr = bake(46, 50, g => {
    const step = frame ? 2 : 0;
    g.fillStyle = '#8d2e2a';
    g.beginPath(); g.moveTo(16, 16); g.quadraticCurveTo(8, 28, 12, 40); g.lineTo(26, 38); g.quadraticCurveTo(20, 26, 24, 16); g.fill();
    g.fillStyle = '#6e5438';
    g.fillRect(16, 34, 5, 12);
    g.fillRect(24, 34 - step, 5, 12 + step);
    g.fillStyle = '#3a2a1c';
    g.fillRect(16, 44, 5.2, 2);
    g.fillRect(24, 44, 5.2, 2);
    ell(g, 22, 26, 10, 11, '#e6d3b0');
    poly(g, [[15, 18], [22, 36], [29, 18]], '#b8453a');
    g.fillStyle = '#f0c14a';
    g.fillRect(20.8, 18, 2.4, 14);
    poly(g, [[30, 16], [42, 18], [38, 36], [30, 28]], '#b8453a');
    poly(g, [[32, 18], [40, 20], [37, 28], [32, 26]], '#d46555');
    disc(g, 35, 24, 2.3, '#f0c14a');
    ell(g, 14, 18, 4.2, 3, '#cbb892');
    disc(g, 22, 12, 4.2, '#e6b898');
    g.fillStyle = '#d5dde4';
    g.beginPath(); g.arc(22, 11.2, 4.6, Math.PI, 0); g.fill();
    g.fillRect(17.4, 10.6, 9.2, 2.4);
    poly(g, [[18, 11], [13, 2], [21, 10]], '#f0e6d0');
    poly(g, [[26, 11], [31, 2], [23, 10]], '#f0e6d0');
    g.fillStyle = '#b8453a';
    g.beginPath(); g.moveTo(22, 8); g.quadraticCurveTo(30, 0, 25, -1); g.quadraticCurveTo(22, 4, 20, 8); g.fill();
    g.strokeStyle = '#6b4630';
    g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(10, 44); g.lineTo(6, 4); g.stroke();
    poly(g, [[6, 1], [11, 8], [2, 8]], '#e7e4dc');
    disc(g, 20.4, 12.4, 0.55, '#2a1c10');
    disc(g, 23.6, 12.4, 0.55, '#2a1c10');
  });
  spr.gy = 47;
  return spr;
}
function paintWarden(frame) {
  const spr = bake(50, 58, g => {
    const sway = frame ? 2 : 0;
    ell(g, 25, 32, 18, 22, 'rgba(190,230,170,.38)');
    g.fillStyle = '#6d7d70';
    g.beginPath(); g.moveTo(25, 18); g.lineTo(43, 46); g.quadraticCurveTo(25, 40 + sway, 7, 48); g.closePath(); g.fill();
    g.fillStyle = '#4e5c52';
    g.beginPath(); g.moveTo(25, 18); g.lineTo(38, 46); g.lineTo(24, 40); g.fill();
    g.fillStyle = '#8ea090';
    g.beginPath(); g.moveTo(16, 22); g.quadraticCurveTo(8, 28, 12, 36); g.quadraticCurveTo(18, 30, 20, 24); g.fill();
    poly(g, [[10, 42], [4, 56], [16, 46]], '#7d8e80');
    poly(g, [[38, 40], [47, 54], [30, 46]], '#7d8e80');
    poly(g, [[14, 46], [18, 54], [22, 46]], '#5c6b60');
    g.strokeStyle = '#8d887c';
    g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(40, 50); g.lineTo(42, 10); g.stroke();
    g.strokeStyle = '#e7ecdf';
    g.lineWidth = 2.1;
    g.beginPath(); g.arc(36, 14, 8, -0.3, 2.3); g.stroke();
    disc(g, 25, 16, 6.2, '#e7ecdf');
    disc(g, 22.6, 15.4, 1.35, '#1a2218');
    disc(g, 27.4, 15.4, 1.35, '#1a2218');
    disc(g, 22.6, 15.4, 0.6, '#c6ff6a');
    disc(g, 27.4, 15.4, 0.6, '#c6ff6a');
    g.strokeStyle = '#1a2218';
    g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(22.4, 18.6); g.lineTo(27.6, 18.6); g.stroke();
    g.strokeStyle = '#e7ecdf';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(21, 12); g.lineTo(14, 2); g.moveTo(16.5, 6); g.lineTo(11, 5); g.stroke();
    g.beginPath(); g.moveTo(29, 12); g.lineTo(36, 2); g.moveTo(33.5, 6); g.lineTo(39, 5); g.stroke();
  });
  spr.gy = 52;
  return spr;
}
// Pale Host. Bodies are baked once per walk frame; a dark rim is stamped
// around the alpha so the silhouette reads on day grass and on the night veil.
const HOST_PAD = 4;
function hostGait(frame) {
  const f = frame & 3;
  const s = [1, 0.22, -1, -0.18][f];
  return {
    bob: [1.15, -1.55, 1.0, -1.25][f],
    front: s * 4.4,
    back: -s * 3.7,
    arm: s * 2.6,
    blade: -s * 0.28,
    hem: s * 2.4,
    staff: s * 1.15,
  };
}
function capsule(g, x0, y0, x1, y1, r, color) {
  const len = Math.hypot(x1 - x0, y1 - y0) || 0.001;
  g.save();
  g.translate(x0, y0);
  g.rotate(Math.atan2(y1 - y0, x1 - x0));
  g.fillStyle = color;
  g.beginPath();
  g.arc(0, 0, Math.max(0.2, r), Math.PI / 2, Math.PI * 1.5);
  g.arc(len, 0, Math.max(0.2, r), Math.PI * 1.5, Math.PI / 2);
  g.closePath();
  g.fill();
  g.restore();
}
function limb(g, x0, y0, x1, y1, r, fill, shade) {
  capsule(g, x0 + 0.55, y0 + 0.75, x1 + 0.55, y1 + 0.75, r, shade);
  capsule(g, x0 - 0.25, y0 - 0.35, x1 - 0.25, y1 - 0.35, r * 0.92, fill);
}
function rimSprite(spr, color, rad) {
  const pad = HOST_PAD, ps = pad * SPR, o = rad * SPR;
  const c = document.createElement('canvas');
  c.width = spr.c.width + ps * 2;
  c.height = spr.c.height + ps * 2;
  const g = c.getContext('2d');
  const dirs = [[o, 0], [-o, 0], [0, o], [0, -o], [o * 0.72, o * 0.72], [-o * 0.72, o * 0.72], [o * 0.72, -o * 0.72], [-o * 0.72, -o * 0.72]];
  for (let i = 0; i < dirs.length; i++) g.drawImage(spr.c, ps + dirs[i][0], ps + dirs[i][1]);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(spr.c, ps, ps);
  const out = { c, w: spr.w + pad * 2, h: spr.h + pad * 2, gy: spr.gy + pad };
  if (spr.orb) out.orb = spr.orb;
  return out;
}
function paintHost(spr, fn) {
  const g = spr.c.getContext('2d');
  g.setTransform(SPR, 0, 0, SPR, 0, 0);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  fn(g, HOST_PAD);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return spr;
}
function glowEye(g, x, y, col) {
  disc(g, x, y, 2.7, 'rgba(255,250,210,.28)');
  disc(g, x, y, 1.55, col);
  disc(g, x - 0.35, y - 0.4, 0.48, '#ffffff');
}
function paintShambler(frame) {
  const p = hostGait(frame);
  const bob = p.bob;
  const spr = bake(38, 42, g => {
    const flesh = '#d7e6c4', mid = '#a9c48a', shade = '#6d8656', deep = '#4d6240';
    const rag = '#6a4e36', ragL = '#a07850', ragD = '#3e2e22';
    // long dangling arm — the low hook that keeps the silhouette from being a blob
    limb(g, 13, 22 + bob, 5.2, 35.2 + p.arm * 0.2, 2.35, mid, deep);
    disc(g, 4.8, 36.2 + p.arm * 0.2, 2.05, '#f4efe4');
    disc(g, 3.4, 37.2 + p.arm * 0.2, 1.1, '#f4efe4');
    limb(g, 15, 28 + bob, 12.2 + p.back, 37.4, 2.6, shade, deep);
    ell(g, 12.2 + p.back, 38.5, 3.2, 1.5, ragD);
    // hunched mass, back high, chest falling toward the head
    ell(g, 16.2, 24.2 + bob, 9.4, 7.2, deep, 0.85);
    ell(g, 15.4, 23.2 + bob, 8.6, 6.5, shade, 0.78);
    ell(g, 14.2, 22.2 + bob, 7.0, 5.2, mid, 0.7);
    ell(g, 12.2, 20.4 + bob, 3.1, 2.2, 'rgba(255,252,236,.4)', 0.4);
    disc(g, 11.2, 19.2 + bob, 2.15, '#efe6d4');
    // torn cloth hanging off the chest, not a pack on the back
    poly(g, [[14, 21 + bob], [22, 22 + bob], [20, 27 + bob], [13, 26 + bob]], rag);
    poly(g, [[15, 21.2 + bob], [19, 21.6 + bob], [18, 24.5 + bob], [15, 24 + bob]], ragL);
    poly(g, [[14.5, 25.5 + bob], [17.2, 26.2 + bob], [15.6, 36.2 + p.hem * 0.25], [12.4, 33]], ragD);
    poly(g, [[18.2, 26 + bob], [21.2, 27 + bob], [22.6, 35.4 + p.hem * 0.2], [17.4, 32.5]], rag);
    limb(g, 19, 29 + bob, 23 + p.front, 37.5, 2.75, mid, shade);
    ell(g, 23.2 + p.front, 38.6, 3.5, 1.65, '#2c2418');
    ell(g, 22.6 + p.front, 38.2, 2.3, 1.0, '#5c4632');
    ell(g, 26.6, 19.6 + bob, 6.0, 5.2, deep, 0.4);
    ell(g, 26.1, 18.8 + bob, 5.5, 4.7, flesh, 0.32);
    ell(g, 24.2, 17.2 + bob, 2.4, 1.6, 'rgba(255,252,236,.7)', 0.25);
    g.strokeStyle = '#3a3228';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(27.6, 21.2 + bob); g.quadraticCurveTo(29.4, 22.5 + bob, 30.8, 21.2 + bob);
    g.stroke();
    limb(g, 22, 22 + bob, 31.2, 27.2 + p.arm, 2.2, mid, shade);
    disc(g, 31.8, 27.8 + p.arm, 1.9, '#f3ecdc');
    disc(g, 33.3, 28.4 + p.arm, 1.0, '#f3ecdc');
  });
  spr.gy = 39.6;
  const out = rimSprite(spr, '#1a2414', 1.35);
  return paintHost(out, (g, pad) => {
    const y = 18.4 + bob + pad, x = 26.6 + pad;
    glowEye(g, x, y, '#e6ff66');
    glowEye(g, x + 2.7, y + 0.7, '#f4ff9a');
  });
}
function paintSkeleton(frame) {
  const p = hostGait(frame);
  const bob = p.bob;
  const spr = bake(46, 50, g => {
    g.translate(2, 1);
    const bone = '#f7f3ea', boneD = '#d9d0c0', boneS = '#b7ab98';
    const hole = '#241c16';
    limb(g, 14, 22 + bob, 7.5, 32 + p.arm * 0.45, 1.85, boneD, boneS);
    disc(g, 7.2, 33.2 + p.arm * 0.45, 1.7, bone);
    limb(g, 15, 32 + bob, 12 + p.back, 42.2, 2.05, boneD, boneS);
    disc(g, 12 + p.back, 43.2, 1.85, bone);
    ell(g, 16, 32.2 + bob, 4.6, 2.5, boneS);
    ell(g, 15.4, 31.5 + bob, 3.6, 1.8, bone);
    // ribcage as a solid bone shape, not hairline strokes
    ell(g, 16.2, 25.2 + bob, 6.0, 6.6, boneS);
    ell(g, 15.6, 24.4 + bob, 5.3, 5.8, bone);
    ell(g, 13.8, 22.6 + bob, 2.5, 2.2, 'rgba(255,255,255,.55)');
    g.strokeStyle = hole;
    g.lineWidth = 1.25;
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const y = 22.6 + bob + i * 2.35;
      g.moveTo(12.4, y); g.lineTo(19.4, y + 0.45);
    }
    g.moveTo(15.6, 20.6 + bob); g.lineTo(15.6, 30.2 + bob);
    g.stroke();
    limb(g, 17, 33 + bob, 21.5 + p.front, 42.4, 2.15, bone, boneD);
    disc(g, 21.6 + p.front, 43.4, 2.0, boneD);
    // sword arm and a chunky rusty blade — the silhouette key
    const hx = 24.2, hy = 24.6 + bob + p.arm * 0.25;
    limb(g, 19, 21.5 + bob, hx, hy, 1.9, bone, boneD);
    disc(g, hx, hy, 1.75, bone);
    g.save();
    g.translate(hx, hy);
    g.rotate(-0.62 + p.blade);
    capsule(g, -1, 0.2, -5.2, 0.6, 1.15, '#5c4030');
    g.fillStyle = '#8d6234';
    g.fillRect(-1.3, -3.3, 2.5, 6.6);
    g.fillStyle = '#e6d2b0';
    g.fillRect(-1.3, -3.3, 2.5, 1.1);
    poly(g, [[0.7, -1.55], [18.2, -0.35], [0.7, 1.55]], '#6e3018');
    poly(g, [[0.7, -1.2], [17.4, -0.28], [0.7, 0.12]], '#c4622a');
    poly(g, [[0.75, -1.0], [16.6, -0.22], [0.75, -0.12]], '#f3d7a8');
    g.restore();
    // skull
    limb(g, 16, 18.2 + bob, 16.2, 14.6 + bob, 1.7, boneD, boneS);
    disc(g, 16.2, 11.2 + bob, 6.15, boneS);
    disc(g, 15.7, 10.6 + bob, 5.7, bone);
    ell(g, 13.6, 8.8 + bob, 2.4, 1.7, 'rgba(255,255,255,.7)');
    ell(g, 13.6, 11.0 + bob, 1.85, 2.15, hole);
    ell(g, 18.0, 11.2 + bob, 1.7, 2.0, hole);
    poly(g, [[15.2, 12.6 + bob], [16.5, 14.4 + bob], [14.2, 14.3 + bob]], hole);
    g.fillStyle = hole;
    g.fillRect(13.4, 14.7 + bob, 5.2, 1.45);
    g.fillStyle = bone;
    for (let i = 0; i < 4; i++) g.fillRect(13.65 + i * 1.25, 14.85 + bob, 0.72, 1.15);
  });
  spr.gy = 45.5;
  const out = rimSprite(spr, '#3a3228', 1.3);
  return paintHost(out, (g, pad) => {
    const y = 10.7 + bob + 1 + pad;
    glowEye(g, 13.6 + 2 + pad, y, '#ffd56a');
    glowEye(g, 18.0 + 2 + pad, y + 0.2, '#ffe7a8');
  });
}
function paintNecroOrb() {
  return bake(32, 32, g => {
    const grd = g.createRadialGradient(16, 16, 0.5, 16, 16, 15);
    grd.addColorStop(0, 'rgba(255,252,255,.98)');
    grd.addColorStop(0.18, 'rgba(236,214,255,.95)');
    grd.addColorStop(0.42, 'rgba(176,120,245,.72)');
    grd.addColorStop(0.7, 'rgba(120,60,210,.28)');
    grd.addColorStop(1, 'rgba(90,40,170,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 32, 32);
  });
}
function paintNecro(frame) {
  const p = hostGait(frame);
  const bob = p.bob;
  const NX = 1, NY = 7;
  const spr = bake(44, 68, g => {
    g.translate(NX, NY);
    const robe = '#6e52a8', robeL = '#cbb8f0', robeD = '#3e2874', robeS = '#2a1a52';
    const sx = 26.2 + p.staff * 0.55;
    // cloak: narrow shoulders, wide tattered hem — not an egg
    g.fillStyle = robeS;
    g.beginPath();
    g.moveTo(20, 22 + bob);
    g.quadraticCurveTo(31, 23 + bob, 32.5, 40);
    g.quadraticCurveTo(33.5, 50, 28, 55.5 + p.hem);
    g.quadraticCurveTo(22, 51, 16.5, 56.2 - p.hem * 0.55);
    g.quadraticCurveTo(10, 52, 9.5, 38);
    g.quadraticCurveTo(9, 26 + bob, 15, 22 + bob);
    g.quadraticCurveTo(17.5, 20.5 + bob, 20, 22 + bob);
    g.closePath();
    g.fill();
    g.fillStyle = robeD;
    g.beginPath();
    g.moveTo(20, 22 + bob);
    g.quadraticCurveTo(16, 28 + bob, 12.5, 40);
    g.quadraticCurveTo(13, 50, 17, 54);
    g.quadraticCurveTo(21, 48, 20.5, 32 + bob);
    g.closePath();
    g.fill();
    g.fillStyle = robe;
    g.beginPath();
    g.moveTo(16, 23 + bob);
    g.quadraticCurveTo(13, 30 + bob, 13.5, 42);
    g.quadraticCurveTo(15, 49, 18.5, 46);
    g.quadraticCurveTo(16.5, 34 + bob, 18, 24 + bob);
    g.closePath();
    g.fill();
    ell(g, 15.2, 28 + bob, 2.6, 5.4, 'rgba(244,236,255,.38)', -0.6);
    poly(g, [[12, 52], [16, 50.6], [14.2, 57.4 + p.hem * 0.25]], robeS);
    poly(g, [[22, 52.2], [27.5, 51.2], [25.6, 57.8 - p.hem * 0.2]], robeD);
    poly(g, [[17.5, 53.2], [21, 52.2], [19.4, 57]], robeS);
    // pointed hood, separate from the shoulders
    g.fillStyle = robeS;
    g.beginPath();
    g.moveTo(15.2, 22 + bob);
    g.lineTo(20.2, 5.2 + bob);
    g.lineTo(26.8, 22 + bob);
    g.quadraticCurveTo(21, 26.5 + bob, 15.2, 22 + bob);
    g.closePath();
    g.fill();
    g.fillStyle = robeL;
    g.beginPath();
    g.moveTo(16.4, 21 + bob);
    g.lineTo(20.2, 6.4 + bob);
    g.lineTo(19.2, 20.5 + bob);
    g.closePath();
    g.fill();
    ell(g, 21.4, 17.2 + bob, 3.8, 4.2, '#140e22');
    // one clasp, not a row of buttons
    disc(g, 18.6, 30 + bob, 1.65, '#e6d6ff');
    disc(g, 18.6, 30 + bob, 0.7, '#fff8ff');
    // staff in the hand, crooked, rising above the hood
    limb(g, sx + 0.4, 50, sx - 0.6, 3.2, 1.55, '#8a6240', '#3e2a1c');
    capsule(g, sx + 0.05, 48, sx - 0.7, 6, 0.62, '#e2c49a');
    disc(g, sx - 1.2, 32 + bob, 2.05, '#f3ecdc');
    disc(g, sx + 0.4, 32.6 + bob, 1.15, '#f3ecdc');
    ell(g, 18 + p.front * 0.4, 55.4, 3.2, 1.4, '#e7dfd0');
    disc(g, sx - 0.5, 2.6, 2.7, '#2a1848');
    disc(g, sx - 0.7, 2.3, 1.7, '#f6ecff');
  });
  const orbX = (26.2 + p.staff * 0.55 - 0.7) + NX;
  const orbY = 2.3 + NY;
  spr.gy = 56 + NY;
  spr.orb = { dx: orbX - 22, dy: orbY - spr.gy };
  const out = rimSprite(spr, '#1c1030', 1.35);
  return paintHost(out, (g, pad) => {
    const y = 16.8 + bob + NY + pad;
    glowEye(g, 19.8 + NX + pad, y, '#f0dcff');
    glowEye(g, 23.0 + NX + pad, y + 0.3, '#f6e8ff');
  });
}


// ---- Kingdom workers, stands, farms, houses, scaffolds, coins, camp ----
function folkLegs(g, step) {
  g.fillStyle = '#6b4a32';
  g.fillRect(9.5, 23, 3.6, 8);
  g.fillRect(16, 23 - step, 3.6, 8 + step);
  g.fillStyle = '#2c2118';
  g.fillRect(9.2, 30.2, 4, 2);
  g.fillRect(15.7, 30.2 - Math.max(0, step) * 0.15, 4, 2);
}
function folkHood(g, x, y, col) {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, 4.3, Math.PI * 1.02, Math.PI * 1.98);
  g.quadraticCurveTo(x + 5, y - 5, x, y - 6.4);
  g.quadraticCurveTo(x - 5, y - 5, x - 4.2, y);
  g.fill();
}
function paintFolk(role, pose) {
  const spr = bake(30, 34, g => {
    const walk = pose === 'walk0' || pose === 'walk1';
    const step = pose === 'walk1' ? 2.4 : pose === 'walk0' ? -1.2 : 0;
    const hunch = role === 'vagrant' ? 2 : pose === 'pickup' ? 3 : 0;
    const work = pose === 'work0' || pose === 'work1' || pose === 'work2';
    if (role !== 'vagrant' || pose !== 'pickup') folkLegs(g, walk ? step : 0);
    if (role === 'vagrant') {
      ell(g, 15 + hunch * 0.3, 20, 6.4, 6.2, '#8a7d6c');
      ell(g, 17, 21.5, 3.2, 4.4, '#6a5e52');
      g.fillStyle = '#a89884'; g.fillRect(12, 18, 3.2, 2.6);
      disc(g, 14.5 + hunch, 12 + hunch * 0.4, 3.6, '#d7b090');
      folkHood(g, 14.2 + hunch, 11.4 + hunch * 0.3, '#6e6256');
      disc(g, 16 + hunch, 12.2, 0.55, '#2a1c10');
      const bob = pose === 'walk1' ? -1.5 : pose === 'walk0' ? 1 : 0;
      g.strokeStyle = '#5c4030'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(8, 18); g.lineTo(3, 8 + bob); g.stroke();
      ell(g, 3.2, 7.2 + bob, 3.3, 2.8, '#c45a48');
      ell(g, 2.4, 6.4 + bob, 1.2, 1, '#f0c2b4');
    } else if (role === 'villager') {
      const lean = pose === 'pickup' ? 2.2 : 0;
      ell(g, 14 + lean, 19, 6.2, 6.6, '#ead7b0');
      ell(g, 16.2 + lean, 20.4, 3, 4.6, '#c9ae82');
      g.fillStyle = '#8d6a42'; g.fillRect(11, 20, 8, 1.5);
      disc(g, 14 + lean * 0.4, 11, 3.6, '#e6b898');
      folkHood(g, 14, 10.2, '#8d5a34');
      disc(g, 15.4, 11.2, 0.55, '#2a1c10');
      if (pose === 'pickup') {
        g.strokeStyle = '#e6b898'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(12, 20); g.lineTo(8, 28); g.moveTo(18, 20); g.lineTo(16, 28); g.stroke();
        ell(g, 12, 29, 3.2, 2, '#c9a874');
      } else ell(g, 21, 21, 2.5, 2.8, '#c9a874');
    } else if (role === 'builder') {
      ell(g, 14, 19.5, 6.3, 6.5, '#e08a48');
      ell(g, 16.4, 20.6, 3, 4.6, '#b45e2c');
      g.fillStyle = '#6b4630'; g.fillRect(11, 21, 8, 1.6);
      disc(g, 14, 11, 3.5, '#e6b898');
      ell(g, 14, 8.6, 7.2, 1.7, '#e2c56a');
      ell(g, 14, 6.8, 3.6, 2.4, '#f0d48a');
      disc(g, 15.5, 11.2, 0.55, '#2a1c10');
      const ang = pose === 'work0' ? -1.1 : pose === 'work1' ? -0.2 : pose === 'work2' ? 0.9 : -0.6;
      const hx = 18 + Math.cos(ang) * 6, hy = 16 + Math.sin(ang) * 6;
      g.strokeStyle = '#6b4630'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(18, 18); g.lineTo(hx, hy); g.stroke();
      g.save(); g.translate(hx, hy); g.rotate(ang);
      g.fillStyle = '#b7bec6'; g.fillRect(-3.2, -1.8, 7.2, 3.4);
      g.fillStyle = '#e4e8ee'; g.fillRect(-3.2, -1.8, 7.2, 1.2);
      g.restore();
    } else {
      ell(g, 14, 19.5, 6.2, 6.4, '#b7c45e');
      ell(g, 16.3, 20.6, 3, 4.5, '#8a9440');
      g.fillStyle = '#6b5430'; g.fillRect(11, 21, 8, 1.5);
      disc(g, 14, 11.2, 3.5, '#e6b898');
      ell(g, 14, 8.8, 8, 1.8, '#f0d48a');
      ell(g, 14, 7, 3.4, 2.5, '#e2c56a');
      disc(g, 15.6, 11.4, 0.55, '#2a1c10');
      const sweep = pose === 'work0' ? -0.8 : pose === 'work1' ? 0.1 : pose === 'work2' ? 0.9 : -0.35;
      g.save(); g.translate(20, 18); g.rotate(sweep);
      g.strokeStyle = '#6b4630'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, 8); g.lineTo(1, -10); g.stroke();
      g.strokeStyle = '#e7eef2'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(1, -10); g.quadraticCurveTo(-6, -12, -8, -6); g.stroke();
      g.restore();
    }
  });
  spr.gy = 33;
  return spr;
}
function paintToolIcon(tool) {
  return bake(16, 18, g => {
    const ink = '#2a1c10';
    if (tool === 'bow') {
      g.strokeStyle = ink; g.lineWidth = 3.6;
      g.beginPath(); g.arc(5.4, 9, 6.1, -1.2, 1.2); g.stroke();
      g.strokeStyle = '#e2b15a'; g.lineWidth = 2.3;
      g.beginPath(); g.arc(5.4, 9, 6.1, -1.2, 1.2); g.stroke();
      g.strokeStyle = '#fff6e0'; g.lineWidth = 1.15;
      g.beginPath(); g.moveTo(6.8, 3.5); g.lineTo(6.8, 14.5); g.stroke();
      g.fillStyle = ink;
      g.beginPath(); g.moveTo(9.1, 7.15); g.lineTo(15.4, 9); g.lineTo(9.1, 10.85); g.fill();
      g.fillStyle = '#e24a38';
      g.beginPath(); g.moveTo(9.5, 7.55); g.lineTo(14.5, 9); g.lineTo(9.5, 10.45); g.fill();
      g.fillStyle = '#ffd27a';
      g.fillRect(8.6, 8.45, 2.1, 1.1);
    } else if (tool === 'hammer') {
      g.strokeStyle = ink; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(8.1, 16.7); g.lineTo(8.1, 6.4); g.stroke();
      g.strokeStyle = '#e2b15a'; g.lineWidth = 2.15;
      g.beginPath(); g.moveTo(8.1, 16.5); g.lineTo(8.1, 6.8); g.stroke();
      g.fillStyle = ink; g.beginPath();
      g.roundRect(1.5, 1.5, 13, 5.5, 1.3); g.fill();
      g.fillStyle = '#e7eef6'; g.beginPath();
      g.roundRect(2.1, 2.05, 11.8, 4.3, 1); g.fill();
      g.fillStyle = '#fff'; g.globalAlpha = 0.7;
      g.fillRect(2.5, 2.3, 8.2, 1.35);
      g.globalAlpha = 1;
      g.fillStyle = '#9aa3ae';
      g.fillRect(2.1, 5.15, 11.8, 1.15);
    } else {
      g.strokeStyle = ink; g.lineWidth = 3.3;
      g.beginPath(); g.moveTo(6.2, 16.8); g.lineTo(10.6, 4.4); g.stroke();
      g.strokeStyle = '#e2b15a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(6.1, 16.6); g.lineTo(10.3, 4.8); g.stroke();
      g.fillStyle = ink;
      g.beginPath();
      g.moveTo(10.6, 3.1); g.quadraticCurveTo(2.2, 1.4, 1.3, 7.2);
      g.quadraticCurveTo(5.2, 4.8, 8.2, 6.4); g.quadraticCurveTo(10, 4.4, 10.6, 3.1); g.fill();
      g.fillStyle = '#f4f7fb';
      g.beginPath();
      g.moveTo(10.2, 3.5); g.quadraticCurveTo(3.4, 2.2, 2.2, 6.6);
      g.quadraticCurveTo(5.4, 4.8, 7.8, 6); g.quadraticCurveTo(9.4, 4.6, 10.2, 3.5); g.fill();
      g.strokeStyle = '#fff'; g.globalAlpha = 0.7; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(8.6, 3.6); g.quadraticCurveTo(4.2, 3.2, 3, 5.6); g.stroke();
      g.globalAlpha = 1;
    }
  });
}
function paintSignTool(g, tool) {
  g.fillStyle = '#f3e6c4'; g.fillRect(14, 2.2, 12, 8);
  g.strokeStyle = '#6e4328'; g.lineWidth = 1; g.strokeRect(14, 2.2, 12, 8);
  g.save(); g.translate(16.3, 3.15); g.scale(0.58, 0.46);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (tool === 'bow') {
    g.strokeStyle = '#3a2418'; g.lineWidth = 3.2;
    g.beginPath(); g.arc(5.2, 8, 5.5, -1.15, 1.15); g.stroke();
    g.strokeStyle = '#c4843a'; g.lineWidth = 1.8;
    g.beginPath(); g.arc(5.2, 8, 5.5, -1.15, 1.15); g.stroke();
    g.strokeStyle = '#fff6e4'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(6.4, 3.4); g.lineTo(6.4, 12.6); g.stroke();
  } else if (tool === 'hammer') {
    g.strokeStyle = '#3a2418'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(7.2, 13.5); g.lineTo(7.2, 6); g.stroke();
    g.strokeStyle = '#c4843a'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7.2, 13.2); g.lineTo(7.2, 6.4); g.stroke();
    g.fillStyle = '#3a2418'; g.fillRect(1.2, 1.5, 12, 4.6);
    g.fillStyle = '#e7eef6'; g.fillRect(1.7, 1.9, 11, 3.6);
    g.fillStyle = '#fff'; g.globalAlpha = 0.75; g.fillRect(2, 2.1, 6.5, 1.1); g.globalAlpha = 1;
  } else {
    g.strokeStyle = '#3a2418'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(5.6, 14); g.lineTo(9.2, 4.2); g.stroke();
    g.strokeStyle = '#c4843a'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(5.5, 13.6); g.lineTo(8.8, 4.6); g.stroke();
    g.fillStyle = '#3a2418';
    g.beginPath(); g.moveTo(9, 3); g.quadraticCurveTo(2, 1.6, 1.2, 6.6); g.quadraticCurveTo(4.6, 4.6, 7.2, 6); g.quadraticCurveTo(8.6, 4.2, 9, 3); g.fill();
    g.fillStyle = '#f4f7fb';
    g.beginPath(); g.moveTo(8.6, 3.4); g.quadraticCurveTo(3, 2.4, 2.1, 6); g.quadraticCurveTo(4.8, 4.6, 6.8, 5.6); g.quadraticCurveTo(8, 4.4, 8.6, 3.4); g.fill();
  }
  g.restore();
}
function paintStand(tool) {
  const spr = bake(40, 36, g => {
    ell(g, 20, 32, 16, 3.2, '#c4a574');
    g.fillStyle = '#5c3a24'; g.fillRect(6, 12, 3.2, 20); g.fillRect(31, 12, 3.2, 20);
    g.fillStyle = '#a56b3e'; g.fillRect(6.4, 12, 1.3, 20); g.fillRect(31.4, 12, 1.3, 20);
    g.fillStyle = '#c4925a'; g.fillRect(4, 14, 32, 3.2);
    g.fillStyle = '#e2c49a'; g.fillRect(4, 14, 32, 1.1);
    g.fillStyle = '#b07a45'; g.fillRect(5, 26, 30, 2.6);
    g.fillStyle = '#d2a56c'; g.fillRect(5, 26, 30, 0.9);
    poly(g, [[2, 14], [20, 4], [38, 14]], '#d06a45');
    poly(g, [[20, 4], [38, 14], [28, 14]], '#a34c30');
    paintSignTool(g, tool);
  });
  spr.gy = 33;
  return spr;
}
function paintHouse(kind) {
  const pale = kind === 'pale', dmg = kind === 'dmg';
  const wall = pale ? '#9aa394' : dmg ? '#e4d3b4' : '#f6ead4';
  const wallD = pale ? '#6d756c' : dmg ? '#b7a484' : '#d9c4a2';
  const roof = pale ? '#6a7368' : '#d06a45', roofL = pale ? '#8d9788' : '#f2a27c', roofD = pale ? '#455046' : '#a34c30';
  const spr = bake(48, 52, g => {
    poly(g, [[8, 28], [34, 28], [34, 48], [8, 48]], wall);
    poly(g, [[34, 28], [43, 22], [43, 42], [34, 48]], wallD);
    g.strokeStyle = pale ? 'rgba(30,36,30,.35)' : 'rgba(120,80,40,.28)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(8, 34); g.lineTo(34, 34); g.moveTo(8, 41); g.lineTo(34, 41); g.stroke();
    g.fillStyle = pale ? '#2a3028' : '#6e4328';
    g.fillRect(12, 36, 7, 12);
    g.fillStyle = pale ? '#9dff7a' : dmg ? '#3a3028' : '#ffd27a';
    g.fillRect(24, 32, 6.5, 5.5);
    if (!dmg) {
      g.strokeStyle = pale ? '#1c2418' : '#6e4328'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(27.2, 32); g.lineTo(27.2, 37.5); g.moveTo(24, 34.6); g.lineTo(30.5, 34.6); g.stroke();
    }
    poly(g, [[4, 30], [20, 10], [36, 30]], roof);
    poly(g, [[20, 10], [44, 26], [36, 30]], roofD);
    poly(g, [[4, 30], [20, 10], [14, 22]], roofL);
    if (dmg) {
      g.fillStyle = '#8d8478'; g.beginPath(); g.moveTo(30, 18); g.lineTo(38, 24); g.lineTo(32, 26); g.fill();
      g.strokeStyle = '#5c4030'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(14, 32); g.lineTo(18, 40); g.lineTo(16, 46); g.stroke();
    }
    g.fillStyle = pale ? '#5c645c' : '#8d8478';
    g.fillRect(36, 12, 4.2, 10);
    g.fillStyle = pale ? '#3e463e' : '#6e4328';
    g.fillRect(37.2, 10, 2, 3);
    if (pale) {
      disc(g, 15.5, 40, 2.4, '#e7ecdf');
      disc(g, 14.7, 39.6, 0.5, '#1c2418');
      disc(g, 16.3, 39.6, 0.5, '#1c2418');
    }
  });
  spr.gy = 48;
  if (!pale && !dmg) spr.smoke = { dx: 14, dy: -40 };
  return spr;
}
function paintHall(kind) {
  const pale = kind === 'pale', dmg = kind === 'dmg', rival = kind === 'rival';
  const wall = pale ? '#9aa394' : rival ? '#d4b48a' : dmg ? '#e4d3b4' : '#efe4c8';
  const wallD = pale ? '#6d756c' : rival ? '#a88858' : dmg ? '#b7a484' : '#c9a36a';
  const roof = pale ? '#6a7368' : rival ? '#c45a3a' : '#3e74c8';
  const roofL = pale ? '#8d9788' : rival ? '#e89070' : '#7eb0ee';
  const roofD = pale ? '#455046' : rival ? '#8a3c28' : '#2a4e86';
  const spr = bake(56, 62, g => {
    poly(g, [[10, 30], [38, 30], [38, 54], [10, 54]], wall);
    poly(g, [[38, 30], [50, 22], [50, 46], [38, 54]], wallD);
    g.fillStyle = pale ? '#2a3028' : '#6e4328';
    g.fillRect(16, 38, 8, 16);
    g.fillStyle = pale ? '#9dff7a' : dmg ? '#3a3028' : '#ffd27a';
    g.fillRect(28, 36, 6, 7);
    poly(g, [[6, 32], [24, 8], [42, 32]], roof);
    poly(g, [[24, 8], [52, 20], [42, 32]], roofD);
    poly(g, [[6, 32], [24, 8], [16, 24]], roofL);
    g.fillStyle = pale ? '#5c645c' : '#8d8478';
    g.fillRect(44, 8, 4.4, 16);
    g.fillStyle = rival ? '#c45a3a' : pale ? '#3e463e' : '#3e74c8';
    g.beginPath(); g.moveTo(46, 10); g.lineTo(56, 14); g.lineTo(46, 18); g.closePath(); g.fill();
    if (dmg) {
      g.strokeStyle = '#5c4030'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(18, 34); g.lineTo(22, 48); g.stroke();
    }
  });
  spr.gy = 54;
  return spr;
}
function paintFarm(kind) {
  const pale = kind === 'pale', ripe = kind === 'ripe', grow = kind === 'growing' || ripe;
  const spr = bake(64, 40, g => {
    poly(g, [[6, 16], [52, 10], [60, 26], [14, 34]], pale ? '#7c8270' : '#b88858');
    poly(g, [[10, 18], [48, 13], [54, 24], [16, 30]], pale ? '#6a705f' : '#a87448');
    g.strokeStyle = pale ? '#5a6050' : '#7a5430'; g.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(12 + i * 2, 18 + i * 3.2); g.lineTo(46 + i, 14 + i * 2.6); g.stroke();
    }
    if (grow) {
      for (let i = 0; i < 16; i++) {
        const x = 14 + (i % 8) * 4.6, y = 18 + (i % 8) * 0.35 + ((i / 8) | 0) * 6;
        if (pale) {
          g.strokeStyle = '#8a8470'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + 1, y - 2); g.stroke();
        } else if (ripe) {
          ell(g, x, y, 1.5, 3.2, '#e2b14a');
          ell(g, x, y + 2.2, 1.1, 1.6, '#c4922a');
        } else {
          ell(g, x, y, 1.6, 2.4, '#7eac52');
          ell(g, x, y - 1.2, 1, 1.2, '#b6d46e');
        }
      }
    }
    g.fillStyle = pale ? '#4a5048' : '#5c3a24';
    for (const [x, y] of [[6, 16], [52, 10], [60, 26], [14, 34]]) g.fillRect(x - 1.1, y - 7, 2.4, 8);
    g.strokeStyle = pale ? '#6a7062' : '#c4925a'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(6, 12); g.lineTo(52, 6); g.lineTo(60, 22); g.lineTo(14, 30); g.stroke();
    if (pale) {
      disc(g, 20, 18, 2.3, '#e7ecdf');
      disc(g, 19.3, 17.6, 0.45, '#1c2418'); disc(g, 20.7, 17.6, 0.45, '#1c2418');
    }
  });
  spr.gy = 32;
  return spr;
}
function paintScaffold(stage) {
  const spr = bake(46, 50, g => {
    ell(g, 23, 46, 16, 3.4, 'rgba(90,60,30,.28)');
    const posts = stage === 0 ? [8, 36] : [7, 22, 37];
    g.strokeStyle = '#7a4e2e'; g.lineWidth = 2.4;
    g.beginPath();
    for (const x of posts) { g.moveTo(x, 46); g.lineTo(x, stage === 0 ? 22 : stage === 1 ? 14 : 8); }
    g.stroke();
    g.fillStyle = '#d2a56c';
    if (stage >= 0) g.fillRect(6, 30, stage === 0 ? 32 : 34, 3);
    if (stage >= 1) g.fillRect(6, 18, 34, 3);
    if (stage >= 2) {
      g.fillRect(6, 8, 34, 3);
      g.strokeStyle = '#c4925a'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(7, 46); g.lineTo(22, 30); g.moveTo(37, 46); g.lineTo(22, 18); g.stroke();
    }
    ell(g, 30, 45, 5, 2, '#cfc6b6');
  });
  spr.gy = 47;
  return spr;
}
function paintDemoMark() {
  const spr = bake(24, 34, g => {
    g.fillStyle = '#5a3824';
    g.fillRect(10.5, 12, 3.2, 20);
    g.fillStyle = '#3a2218';
    g.beginPath();
    if (g.roundRect) g.roundRect(2, 2, 20, 16, 2.2); else g.rect(2, 2, 20, 16);
    g.fill();
    g.strokeStyle = '#2a1c10'; g.lineWidth = 1.3;
    g.beginPath();
    if (g.roundRect) g.roundRect(2, 2, 20, 16, 2.2); else g.rect(2, 2, 20, 16);
    g.stroke();
    g.strokeStyle = '#7a2018'; g.lineWidth = 4.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(6, 5.2); g.lineTo(18, 14.8); g.moveTo(18, 5.2); g.lineTo(6, 14.8); g.stroke();
    g.strokeStyle = '#e15a4a'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(6, 5.2); g.lineTo(18, 14.8); g.moveTo(18, 5.2); g.lineTo(6, 14.8); g.stroke();
    g.strokeStyle = '#ffd0c8'; g.lineWidth = 1.05;
    g.beginPath(); g.moveTo(7, 6.2); g.lineTo(16.5, 13.6); g.stroke();
    ell(g, 12, 32, 6, 2.1, 'rgba(90,60,30,.35)');
  });
  spr.gy = 33;
  return spr;
}
function paintOrderMark() {
  const spr = bake(18, 28, g => {
    g.fillStyle = '#6e4328'; g.fillRect(8, 8, 2.2, 18);
    g.fillStyle = '#3e74c8';
    g.beginPath(); g.moveTo(10, 6); g.lineTo(17, 9); g.lineTo(10, 12); g.fill();
    g.fillStyle = '#f0c14a'; g.beginPath(); g.arc(10, 6, 1.4, 0, 6.3); g.fill();
    ell(g, 9, 26, 5, 2, 'rgba(90,60,30,.35)');
  });
  spr.gy = 27;
  return spr;
}
function paintCamp() {
  const spr = bake(70, 46, g => {
    ell(g, 28, 40, 22, 5, 'rgba(90,70,40,.25)');
    g.strokeStyle = '#6b4630'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(8, 40); g.lineTo(24, 14); g.moveTo(46, 40); g.lineTo(24, 14); g.stroke();
    poly(g, [[8, 40], [24, 12], [46, 40]], '#c2ae8c');
    poly(g, [[24, 12], [46, 40], [34, 40]], '#8f7d62');
    g.fillStyle = '#6a5340'; g.beginPath(); g.moveTo(18, 40); g.lineTo(24, 26); g.lineTo(30, 40); g.fill();
    g.fillStyle = '#a33b32'; g.fillRect(20, 22, 4, 3);
    g.fillStyle = '#d7c4a4'; g.beginPath(); g.moveTo(36, 28); g.lineTo(44, 24); g.lineTo(42, 32); g.fill();
    ell(g, 14, 41, 6, 2.2, '#6e5438');
    ell(g, 56, 40, 10, 3.6, '#8d8478');
    g.fillStyle = '#6e6560';
    g.beginPath(); g.ellipse(56, 39, 7, 2.4, 0, 0, 6.3); g.fill();
    g.strokeStyle = '#5c4030'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(50, 39); g.lineTo(62, 36); g.moveTo(50, 36); g.lineTo(62, 39); g.stroke();
  });
  spr.gy = 42;
  spr.fire = { dx: 56 - 35, dy: -8 };
  return spr;
}
function paintCoinFrame(i) {
  const squeeze = [1, 0.72, 0.32, 0.1, 0.32, 0.72][i];
  return bake(16, 16, g => {
    const rx = Math.max(0.7, 5.6 * squeeze);
    ell(g, 8, 8.6, rx + 0.6, 5.6, '#a56b12');
    ell(g, 8, 7.8, rx, 4.8, '#f0c14a');
    if (squeeze > 0.45) {
      ell(g, 8 - rx * 0.28, 6.4, rx * 0.35, 1.5, 'rgba(255,248,220,.75)');
      g.strokeStyle = '#8a5a14'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(8, 5.4); g.lineTo(8, 10.4); g.stroke();
    } else {
      g.fillStyle = '#ffe9a8'; g.fillRect(7.3, 3.4, 1.4, 8.4);
    }
  });
}
function paintShimmer() {
  return bake(14, 14, g => {
    g.fillStyle = 'rgba(255,236,170,.9)';
    g.beginPath();
    g.moveTo(7, 1); g.lineTo(8.2, 5.6); g.lineTo(13, 7); g.lineTo(8.2, 8.4); g.lineTo(7, 13); g.lineTo(5.8, 8.4); g.lineTo(1, 7); g.lineTo(5.8, 5.6); g.closePath();
    g.fill();
  });
}

// Placeholder upgrade sprites, keyed by art/upgrades/manifest.json ids so official art can be dropped in later.
function getSprite(id) { return (Art.sprite && Art.sprite[id]) || null; }
function setSprite(id, spr) { if (!Art.sprite) Art.sprite = {}; Art.sprite[id] = spr; return spr; }
function tierWord(lv) { return lv >= 3 ? 'iron' : lv === 2 ? 'stone' : 'wood'; }
function spriteIdFor(b) {
  const lv = b.level || 1, tier = tierWord(lv);
  if (b.type === 'core' || b.type === 'keep') return 'keep-' + tier;
  if (b.type === 'tower') {
    if (lv <= 1) return 'tower-wood';
    return 'tower-' + (b.path || 'cannon') + '-' + tier;
  }
  return (b.type || 'house') + '-' + tier;
}

function registerUpgradeSprites() {
function pal(tier) {
  if (tier >= 3) return {
    wall: '#dcd8d0', wallD: '#9a9590', side: '#6a6560',
    top: '#e4e0d8', face: '#b0aaa4', ink: '#3a3834',
    roof: '#6a6864', roofL: '#9a968e', roofD: '#3e3c38',
    metal: '#4a4e55', metalL: '#8a9098', metalD: '#2a2c30',
    door: '#3a3c42', trim: '#2a2c30', wood: '#8a5a32',
    glass: '#c8d8ef'
  };
  if (tier >= 2) return {
    wall: '#f3eadc', wallD: '#d4c8b4', side: '#a89886',
    top: '#e7e2d8', face: '#c9c2b4', ink: '#7a7064',
    roof: '#c45a3a', roofL: '#e89070', roofD: '#8a3c28',
    metal: '#8f877c', metalL: '#c9c2b4', metalD: '#5c564c',
    door: '#5c3a24', trim: '#6e6558', wood: '#c4925a',
    glass: '#ffd27a'
  };
  return {
    wall: '#f6ead4', wallD: '#d9c4a2', side: '#b07a45',
    top: '#d2a56c', face: '#b07a45', ink: '#4a2e1c',
    roof: '#d06a45', roofL: '#f2a27c', roofD: '#a34c30',
    metal: '#6e4328', metalL: '#d2a56c', metalD: '#4a2e1c',
    door: '#6e4328', trim: '#6e4328', wood: '#c4925a',
    glass: '#ffd27a'
  };
}
function rivets(g, pts, p) {
  g.fillStyle = p.metalD;
  for (const [x, y] of pts) disc(g, x, y, 0.85, p.metalD);
  g.fillStyle = p.metalL;
  for (const [x, y] of pts) disc(g, x - 0.25, y - 0.3, 0.4, p.metalL);
}
function ironBand(g, x, y, w, h, p) {
  g.fillStyle = p.metal;
  g.fillRect(x, y, w, h);
  g.fillStyle = p.metalL;
  g.fillRect(x, y, w, 1);
  g.fillStyle = p.metalD;
  g.fillRect(x, y + h - 1, w, 1);
}
function crenels(g, x, y, w, n, p, iron) {
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) {
      g.fillStyle = p.wall;
      g.fillRect(x + i * cw, y - 6, cw - 0.6, 7);
      if (iron) {
        g.fillStyle = p.metal;
        g.fillRect(x + i * cw, y - 7, cw - 0.6, 2.2);
      }
    }
  }
}
function woodPlanks(g, x, y, w, h, p) {
  g.strokeStyle = p.ink;
  g.globalAlpha = 0.45;
  g.lineWidth = 1;
  g.beginPath();
  for (let i = x + 5; i < x + w; i += 6) { g.moveTo(i, y); g.lineTo(i - 1.4, y + h); }
  g.stroke();
  g.globalAlpha = 1;
}
function stoneJoints(g, x, y, w, h, p) {
  g.strokeStyle = p.ink;
  g.globalAlpha = 0.58;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y + h * 0.45); g.lineTo(x + w, y + h * 0.45);
  g.moveTo(x + w * 0.28, y); g.lineTo(x + w * 0.24, y + h * 0.45);
  g.moveTo(x + w * 0.62, y); g.lineTo(x + w * 0.58, y + h * 0.45);
  g.moveTo(x + w * 0.18, y + h * 0.45); g.lineTo(x + w * 0.16, y + h);
  g.moveTo(x + w * 0.5, y + h * 0.45); g.lineTo(x + w * 0.48, y + h);
  g.moveTo(x + w * 0.8, y + h * 0.45); g.lineTo(x + w * 0.78, y + h);
  g.stroke();
  g.globalAlpha = 1;
}

function paintTierKeep(tier) {
  const p = pal(tier);
  const w = tier === 1 ? 78 : tier === 2 ? 94 : 110;
  const h = tier === 1 ? 100 : tier === 2 ? 120 : 140;
  const spr = bake(w, h, g => {
    const cx = w / 2, base = h - 4;
    const bw = tier === 1 ? 36 : tier === 2 ? 44 : 52;
    const bh = tier === 1 ? 44 : tier === 2 ? 54 : 64;
    const x0 = cx - bw * 0.55, y0 = base - bh;
    // mound
    ell(g, cx + 2, base + 1, bw * 0.72, 8, '#cbbda8');
    ell(g, cx - 8, base, bw * 0.42, 5.5, '#e6dcc8');
    // side hall
    const hx = x0 + bw + 2, hy = base - (tier === 1 ? 20 : tier === 2 ? 26 : 32);
    const hw = tier === 1 ? 18 : tier === 2 ? 22 : 26;
    const hh = tier === 1 ? 20 : tier === 2 ? 26 : 32;
    poly(g, [[hx, hy], [hx + hw, hy - 5], [hx + hw, hy + hh - 5], [hx, hy + hh]], p.side);
    poly(g, [[hx, hy], [hx + hw - 4, hy + 2], [hx + hw - 4, hy + hh], [hx, hy + hh]], p.wallD);
    // main body
    poly(g, [[x0, y0], [x0 + bw, y0], [x0 + bw, base], [x0, base]], p.wall);
    poly(g, [[x0 + bw, y0], [x0 + bw + 8, y0 - 6], [x0 + bw + 8, base - 6], [x0 + bw, base]], p.side);
    if (tier === 1) woodPlanks(g, x0, y0, bw, bh, p);
    else stoneJoints(g, x0, y0, bw, bh, p);
    if (tier >= 3) {
      ironBand(g, x0, y0 + 14, bw, 5, p);
      ironBand(g, x0, base - 10, bw, 5, p);
      rivets(g, [[x0 + 5, y0 + 16.5], [x0 + bw / 2, y0 + 16.5], [x0 + bw - 5, y0 + 16.5],
                 [x0 + 5, base - 7.5], [x0 + bw / 2, base - 7.5], [x0 + bw - 5, base - 7.5]], p);
    }
    // merlons / timber top
    if (tier >= 2) crenels(g, x0, y0, bw, tier === 2 ? 6 : 8, p, tier >= 3);
    else {
      g.fillStyle = p.wall;
      g.fillRect(x0, y0 - 8, 10, 9);
      g.fillRect(x0 + 14, y0 - 6, 9, 7);
    }
    // door
    g.fillStyle = p.door;
    const dw = tier === 1 ? 8 : 9, dh = tier === 1 ? 14 : 16;
    g.fillRect(x0 + bw * 0.28, base - dh, dw, dh);
    if (tier >= 3) {
      ironBand(g, x0 + bw * 0.28, base - dh + 4, dw, 2.2, p);
      disc(g, x0 + bw * 0.28 + dw - 2, base - dh / 2, 1.1, '#f0c14a');
    } else {
      disc(g, x0 + bw * 0.28 + dw - 2, base - dh / 2, 1, '#f0c14a');
    }
    // window
    g.fillStyle = p.glass;
    g.fillRect(x0 + bw * 0.62, y0 + (tier === 1 ? 16 : 18), 6, 7);
    g.strokeStyle = p.trim; g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x0 + bw * 0.62 + 3, y0 + (tier === 1 ? 16 : 18));
    g.lineTo(x0 + bw * 0.62 + 3, y0 + (tier === 1 ? 23 : 25));
    g.moveTo(x0 + bw * 0.62, y0 + (tier === 1 ? 19.5 : 21.5));
    g.lineTo(x0 + bw * 0.62 + 6, y0 + (tier === 1 ? 19.5 : 21.5));
    g.stroke();
    // roof over side hall
    const ry = hy + 2;
    poly(g, [[hx - 3, ry + 6], [hx + hw * 0.45, ry - 12], [hx + hw + 3, ry]], p.roof);
    poly(g, [[hx + hw * 0.45, ry - 12], [hx + hw + 6, ry - 6], [hx + hw + 3, ry]], p.roofD);
    poly(g, [[hx - 3, ry + 6], [hx + hw * 0.45, ry - 12], [hx + 6, ry - 2]], p.roofL);
    if (tier >= 3) {
      g.strokeStyle = p.metal; g.lineWidth = 2;
      g.beginPath(); g.moveTo(hx - 2, ry + 5); g.lineTo(hx + hw * 0.45, ry - 12); g.lineTo(hx + hw + 5, ry - 5); g.stroke();
    }
    // bushes
    ell(g, x0 - 4, base - 10, 6, 4.4, '#5f8a3c');
    ell(g, x0 + 4, base - 18, 4, 3.2, '#8fbc5a');
    ell(g, hx + hw + 2, base - 2, 5, 2.6, '#a89e90');
    // flagpole
    const fx = x0 + 8, fy = y0 - (tier >= 2 ? 22 : 18);
    g.fillStyle = '#5c4030';
    g.fillRect(fx, fy, 2.6, tier >= 2 ? 24 : 20);
    disc(g, fx + 1.3, fy, 2.2, '#f0c14a');
    // static flag
    g.fillStyle = '#3e74c8';
    g.beginPath();
    g.moveTo(fx + 2.6, fy + 1);
    g.lineTo(fx + 22, fy + 4);
    g.lineTo(fx + 20, fy + 13);
    g.lineTo(fx + 2.6, fy + 12);
    g.fill();
    disc(g, fx + 12, fy + 7.5, 1.7, '#f0c14a');
    // flame on annex
    poly(g, [[hx + 6, hy + 8], [hx + 3, hy + 1], [hx + 6, hy + 3], [hx + 8, hy - 2], [hx + 10, hy + 4], [hx + 9, hy + 8]], '#ff9a3a');
    poly(g, [[hx + 6.5, hy + 7], [hx + 5.5, hy + 3], [hx + 7, hy + 1], [hx + 8, hy + 5]], '#ffe08a');
    // archer on L2+
    if (tier >= 2) {
      const ax = x0 + bw * 0.72, ay = y0 - 2;
      g.fillStyle = '#5c4030';
      g.fillRect(ax - 3, ay - 8, 2.4, 8);
      g.fillRect(ax + 1, ay - 8, 2.4, 8);
      ell(g, ax, ay - 10, 4.2, 4.6, '#6e9a4a');
      g.fillStyle = '#3e74c8';
      g.fillRect(ax - 3, ay - 12, 6, 1.8);
      disc(g, ax, ay - 16.5, 2.5, '#e6b898');
      g.fillStyle = '#5c4030';
      g.beginPath(); g.arc(ax, ay - 16.5, 2.7, Math.PI * 1.05, Math.PI * 1.95);
      g.quadraticCurveTo(ax + 3.2, ay - 20, ax, ay - 21);
      g.quadraticCurveTo(ax - 3.2, ay - 20, ax - 2.6, ay - 16.5);
      g.fill();
      g.strokeStyle = '#6b4630'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(ax + 6, ay - 11, 5, -1.2, 1.2); g.stroke();
      g.strokeStyle = '#f4ead8'; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(ax + 7.2, ay - 15); g.lineTo(ax + 7.2, ay - 7); g.stroke();
    }
  });
  spr.gy = h - 4;
  return spr;
}

function paintTierHouse(tier) {
  const p = pal(tier);
  const w = tier === 1 ? 48 : tier === 2 ? 64 : 80;
  const h = tier === 1 ? 52 : tier === 2 ? 66 : 80;
  const spr = bake(w, h, g => {
    const base = h - 2;
    const bw = tier === 1 ? 26 : tier === 2 ? 36 : 46;
    const bh = tier === 1 ? 20 : tier === 2 ? 26 : 32;
    const x0 = tier === 1 ? 8 : 10;
    const y0 = base - bh;
    const side = tier === 1 ? 9 : 10;
    poly(g, [[x0, y0], [x0 + bw, y0], [x0 + bw, base], [x0, base]], p.wall);
    poly(g, [[x0 + bw, y0], [x0 + bw + side, y0 - 6], [x0 + bw + side, base - 6], [x0 + bw, base]], p.wallD);
    if (tier === 1) {
      g.strokeStyle = 'rgba(120,80,40,.28)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, y0 + 6); g.lineTo(x0 + bw, y0 + 6); g.moveTo(x0, y0 + 13); g.lineTo(x0 + bw, y0 + 13); g.stroke();
    } else stoneJoints(g, x0, y0, bw, bh, p);
    if (tier >= 3) {
      ironBand(g, x0, y0 + 8, bw, 4, p);
      rivets(g, [[x0 + 5, y0 + 10], [x0 + bw / 2, y0 + 10], [x0 + bw - 5, y0 + 10]], p);
    }
    // door
    g.fillStyle = p.door;
    const dw = 7, dh = tier === 1 ? 12 : 14;
    g.fillRect(x0 + 4, base - dh, dw, dh);
    // windows — 1, 2, then 3
    const wins = tier;
    const wy = y0 + (tier === 1 ? 4 : 6);
    const start = x0 + 14;
    for (let i = 0; i < wins; i++) {
      const wx = start + i * (tier === 3 ? 10 : 11);
      g.fillStyle = p.glass;
      g.fillRect(wx, wy, 6.5, 5.5);
      g.strokeStyle = p.trim; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(wx + 3.2, wy); g.lineTo(wx + 3.2, wy + 5.5); g.moveTo(wx, wy + 2.7); g.lineTo(wx + 6.5, wy + 2.7); g.stroke();
    }
    // roof
    const apexX = x0 + bw * 0.5, apexY = y0 - (tier === 1 ? 18 : tier === 2 ? 22 : 26);
    poly(g, [[x0 - 4, y0 + 2], [apexX, apexY], [x0 + bw + 2, y0 + 2]], p.roof);
    poly(g, [[apexX, apexY], [x0 + bw + side + 2, y0 - 4], [x0 + bw + 2, y0 + 2]], p.roofD);
    poly(g, [[x0 - 4, y0 + 2], [apexX, apexY], [x0 + 8, y0 - 6]], p.roofL);
    if (tier >= 3) {
      g.strokeStyle = p.metal; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(x0 - 3, y0 + 1); g.lineTo(apexX, apexY); g.lineTo(x0 + bw + side + 1, y0 - 4); g.stroke();
    }
    // chimney
    const cx = x0 + bw + 2, cy = apexY + (tier === 1 ? 8 : 10);
    g.fillStyle = tier >= 3 ? p.metal : '#8d8478';
    g.fillRect(cx, cy, 5, 12);
    g.fillStyle = tier >= 3 ? p.metalD : '#6e4328';
    g.fillRect(cx + 1, cy - 2, 3, 3);
    if (tier >= 3) rivets(g, [[cx + 2.5, cy + 4], [cx + 2.5, cy + 9]], p);
  });
  spr.gy = h - 2;
  spr.smoke = { dx: (tier === 1 ? 14 : tier === 2 ? 20 : 26), dy: -(tier === 1 ? 40 : tier === 2 ? 50 : 62) };
  return spr;
}

function paintTierWall(tier) {
  const p = pal(tier);
  const w = tier === 1 ? 42 : tier === 2 ? 46 : 52;
  const h = tier === 1 ? 30 : tier === 2 ? 36 : 46;
  const spr = bake(w, h, g => {
    const topY = tier === 1 ? 12 : tier === 2 ? 12 : 16;
    const faceB = h - 2;
    poly(g, [[4, topY], [w - 6, topY - 2], [w - 10, topY + 6], [2, topY + 6]], p.top);
    poly(g, [[2, topY + 6], [w - 10, topY + 6], [w - 10, faceB], [2, faceB]], p.face);
    poly(g, [[w - 10, topY + 6], [w - 6, topY - 2], [w - 6, faceB - 8], [w - 10, faceB]], p.side);
    g.strokeStyle = p.ink;
    g.globalAlpha = 0.55;
    g.lineWidth = 1;
    g.beginPath();
    if (tier === 1) {
      for (let x = 8; x <= w - 12; x += 6) { g.moveTo(x + 2, topY); g.lineTo(x - 1, faceB); }
    } else {
      g.moveTo(2, topY + 14); g.lineTo(w - 10, topY + 13);
      g.moveTo(12, topY + 6); g.lineTo(11, topY + 14);
      g.moveTo(22, topY + 6); g.lineTo(21, topY + 14);
      g.moveTo(8, topY + 14); g.lineTo(7, faceB);
      g.moveTo(18, topY + 14); g.lineTo(17, faceB);
      g.moveTo(28, topY + 13); g.lineTo(27, faceB);
    }
    g.stroke();
    g.globalAlpha = 1;
    if (tier === 1) {
      for (let x = 4; x <= w - 12; x += 6) poly(g, [[x, topY], [x + 3, topY - 5], [x + 6, topY - 1]], p.top);
    }
    if (tier >= 3) {
      ironBand(g, 2, topY + 7, w - 12, 3.4, p);
      // spikes
      for (let x = 6; x <= w - 14; x += 7) {
        poly(g, [[x, topY], [x + 2.3, topY - 10], [x + 4.6, topY]], p.metal);
        poly(g, [[x + 0.8, topY], [x + 2.3, topY - 8], [x + 2.8, topY]], p.metalL);
      }
      rivets(g, [[6, topY + 8.7], [16, topY + 8.7], [26, topY + 8.7], [w - 16, topY + 8.7]], p);
    }
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(8, topY + 1); g.lineTo(w - 12, topY - 0.6); g.stroke();
  });
  spr.gy = h - 4;
  return spr;
}

function paintTierGate(tier) {
  const p = pal(tier);
  const w = tier === 1 ? 44 : tier === 2 ? 54 : 64;
  const h = tier === 1 ? 38 : tier === 2 ? 50 : 62;
  const spr = bake(w, h, g => {
    const base = h - 4;
    const left = 2, right = w - 2, mid = w / 2;
    const pillarW = tier === 1 ? 8 : 10;
    const topY = tier === 1 ? 14 : tier === 2 ? 16 : 18;
    poly(g, [[left, topY], [left + pillarW, topY - 2], [left + pillarW, base], [left, base]], p.face);
    poly(g, [[right - pillarW, topY - 2], [right, topY - 4], [right, base - 2], [right - pillarW, base]], p.side);
    poly(g, [[left + pillarW, topY - 2], [right - pillarW, topY - 2], [right - pillarW, base], [left + pillarW, base]], p.face);
    poly(g, [[left, topY], [mid, topY - 10], [right, topY - 4], [right - pillarW, topY - 2], [left + pillarW, topY - 2]], p.top);
    poly(g, [[left + pillarW, topY - 2], [mid, topY - 6], [right - pillarW, topY - 2], [right - pillarW, topY + 4], [mid, topY + 2], [left + pillarW, topY + 4]], p.top);
    if (tier === 1) woodPlanks(g, left + pillarW, topY + 4, right - left - pillarW * 2, base - topY - 4, p);
    else stoneJoints(g, left, topY + 6, pillarW, base - topY - 6, p);
    if (tier >= 3) {
      ironBand(g, left, topY + 8, pillarW, 3.5, p);
      ironBand(g, right - pillarW, topY + 8, pillarW, 3.5, p);
    }
    if (tier >= 2) {
      // Flat gatehouse parapet with merlons sitting on it
      const py = topY - 6;
      poly(g, [[left, topY + 2], [right, topY], [right, py], [left, py + 2]], p.top);
      poly(g, [[right - 2, py], [right + 3, py - 3], [right + 3, topY - 3], [right, topY]], p.side);
      const n = 6, span = right - left - 4;
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;
        const x = left + 2 + i * (span / n);
        const cw = span / n - 0.8;
        g.fillStyle = p.wall;
        g.fillRect(x, py - 7, cw, 8);
        if (tier >= 3) {
          g.fillStyle = p.metal;
          g.fillRect(x, py - 8.5, cw, 2.2);
        }
      }
    }
    // doors
    const woodL = p.wood, woodR = p.door;
    const dL = left + pillarW + 1, dR = right - pillarW - 1, dT = topY + 4;
    poly(g, [[dL, dT], [mid, dT - 1], [mid, base], [dL, base]], woodL);
    poly(g, [[mid, dT - 1], [dR, dT], [dR, base], [mid, base]], woodR);
    g.strokeStyle = p.ink; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(mid, dT - 1); g.lineTo(mid, base); g.stroke();
    if (tier >= 3) {
      // portcullis + spikes
      g.strokeStyle = p.metal; g.lineWidth = 1.3;
      g.beginPath();
      for (let x = dL + 3; x < dR; x += 5) { g.moveTo(x, dT + 1); g.lineTo(x, base - 2); }
      for (let y = dT + 5; y < base - 4; y += 6) { g.moveTo(dL + 1, y); g.lineTo(dR - 1, y); }
      g.stroke();
      for (let x = dL + 3; x < dR; x += 5) {
        poly(g, [[x - 1.4, dT + 1], [x, dT - 6], [x + 1.4, dT + 1]], p.metal);
      }
    } else {
      g.fillStyle = '#f0c14a';
      g.beginPath(); g.arc(mid - 3, (dT + base) / 2, 1.3, 0, 7); g.arc(mid + 3, (dT + base) / 2, 1.3, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(left + 4, topY - 4); g.lineTo(mid, topY - 9); g.lineTo(right - 4, topY - 3); g.stroke();
  });
  spr.gy = h - 6;
  return spr;
}

function paintTierTowerWood() {
  const p = pal(1);
  const spr = bake(50, 74, g => {
    poly(g, [[14, 56], [34, 56], [40, 50], [18, 50]], p.wallD);
    poly(g, [[14, 56], [34, 56], [34, 62], [14, 62]], p.wall);
    poly(g, [[34, 56], [40, 50], [40, 56], [34, 62]], p.side);
    poly(g, [[14, 30], [34, 30], [34, 56], [14, 56]], p.wall);
    poly(g, [[34, 30], [42, 24], [42, 50], [34, 56]], p.side);
    poly(g, [[14, 30], [34, 30], [42, 24], [22, 24]], p.wallD);
    woodPlanks(g, 14, 30, 20, 26, p);
    poly(g, [[20, 56], [28, 56], [28, 46], [24, 43], [20, 46]], '#5c3a24');
    g.fillStyle = p.wall;
    g.fillRect(15, 24, 6, 8);
    g.fillRect(24, 24, 6, 8);
    poly(g, [[24, 4], [8, 26], [24, 34]], p.roof);
    poly(g, [[24, 4], [44, 24], [24, 34]], p.roofD);
    poly(g, [[24, 4], [8, 26], [18, 18]], p.roofL);
    disc(g, 22, 44, 2.2, '#e6b898');
    g.fillStyle = '#3e74c8';
    g.fillRect(20, 45.4, 4.2, 3.2);
    g.strokeStyle = '#6b4630';
    g.lineWidth = 1.1;
    g.beginPath(); g.arc(28, 45, 3.3, -1.15, 1.05); g.stroke();
    g.strokeStyle = '#efe6d4';
    g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(31, 42.6); g.lineTo(31, 47.6); g.stroke();
    g.fillStyle = '#5c4030';
    g.fillRect(23, 4, 2, 10);
    g.fillStyle = '#3e74c8';
    g.beginPath();
    g.moveTo(25, 5);
    g.lineTo(37, 7.5);
    g.lineTo(35.5, 13);
    g.lineTo(25, 12);
    g.fill();
    disc(g, 30, 9, 1.3, '#f0c14a');
    disc(g, 24, 4, 1.6, '#f0c14a');
  });
  spr.gy = 58;
  spr.flag = { dx: -1, dy: -54, w: 14, h: 8 };
  return spr;
}

function paintTierCannon(tier) {
  const p = pal(tier);
  const w = tier === 2 ? 70 : 84;
  const h = tier === 2 ? 84 : 100;
  const spr = bake(w, h, g => {
    const cx = w / 2, base = h - 4;
    const bw = tier === 2 ? 32 : 40, bh = tier === 2 ? 36 : 46;
    const x0 = cx - bw / 2 - 2, y0 = base - bh;
    ell(g, cx, base + 1, bw * 0.7, 7, '#cbbda8');
    poly(g, [[x0, y0], [x0 + bw, y0], [x0 + bw, base], [x0, base]], p.wall);
    poly(g, [[x0 + bw, y0], [x0 + bw + 8, y0 - 6], [x0 + bw + 8, base - 6], [x0 + bw, base]], p.side);
    poly(g, [[x0, y0], [x0 + bw, y0], [x0 + bw + 8, y0 - 6], [x0 + 8, y0 - 6]], p.wallD);
    stoneJoints(g, x0, y0, bw, bh, p);
    crenels(g, x0, y0, bw, tier === 2 ? 5 : 6, p, tier >= 3);
    if (tier >= 3) {
      ironBand(g, x0, y0 + 12, bw, 5, p);
      ironBand(g, x0, base - 10, bw, 5, p);
      rivets(g, [[x0 + 6, y0 + 14.5], [x0 + bw / 2, y0 + 14.5], [x0 + bw - 6, y0 + 14.5]], p);
    }
    // door
    g.fillStyle = p.door;
    g.fillRect(x0 + 6, base - 14, 8, 14);
    // cannon barrel pointing right
    const bx = x0 + bw - 2, by = y0 + bh * 0.38;
    const bl = tier === 2 ? 22 : 28;
    const thick = tier === 2 ? 7 : 9;
    const barrel = tier >= 3 ? p.metal : '#6a5a48';
    const barrelL = tier >= 3 ? p.metalL : '#8a7a64';
    poly(g, [[bx, by], [bx + bl, by - 4], [bx + bl + 2, by + thick - 2], [bx, by + thick + 2]], barrel);
    poly(g, [[bx, by], [bx + bl, by - 4], [bx + bl, by + 1], [bx, by + 3]], barrelL);
    // muzzle
    ell(g, bx + bl + 1, by + thick * 0.35, 2.4, thick * 0.55, '#1a1612');
    ell(g, bx + bl + 0.4, by + thick * 0.3, 1.2, thick * 0.28, '#4a4038');
    // trunnion / carriage
    disc(g, bx + 3, by + thick, 3.2, p.metalD);
    disc(g, bx + 3, by + thick, 2, p.metal);
    // shot pile
    const sx = x0 + (tier === 2 ? 16 : 20), sy = base - 6;
    disc(g, sx, sy, tier === 2 ? 3.2 : 4, '#5c5850');
    disc(g, sx + 6, sy - 1, tier === 2 ? 2.8 : 3.6, '#3a3834');
    if (tier >= 3) disc(g, sx + 3, sy - 5, 3.2, '#4a4e55');
    // highlight
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0 + 4, y0 + 2); g.lineTo(x0 + bw - 4, y0 + 2); g.stroke();
  });
  spr.gy = h - 4;
  return spr;
}

function paintTierBallista(tier) {
  const p = pal(tier);
  const w = tier === 2 ? 62 : 74;
  const h = tier === 2 ? 100 : 120;
  const spr = bake(w, h, g => {
    const cx = w / 2, base = h - 4;
    const bw = tier === 2 ? 22 : 26, bh = tier === 2 ? 52 : 64;
    const x0 = cx - bw / 2, y0 = base - bh;
    ell(g, cx, base + 1, bw * 0.9, 6, '#cbbda8');
    poly(g, [[x0, y0], [x0 + bw, y0], [x0 + bw, base], [x0, base]], p.wall);
    poly(g, [[x0 + bw, y0], [x0 + bw + 7, y0 - 5], [x0 + bw + 7, base - 5], [x0 + bw, base]], p.side);
    poly(g, [[x0, y0], [x0 + bw, y0], [x0 + bw + 7, y0 - 5], [x0 + 7, y0 - 5]], p.wallD);
    stoneJoints(g, x0, y0, bw, bh, p);
    if (tier >= 3) {
      ironBand(g, x0, y0 + 16, bw, 4.5, p);
      ironBand(g, x0, base - 12, bw, 4.5, p);
      rivets(g, [[x0 + 5, y0 + 18], [x0 + bw - 5, y0 + 18]], p);
    }
    g.fillStyle = p.door;
    g.fillRect(x0 + 6, base - 16, 8, 16);
    g.fillStyle = p.glass;
    g.fillRect(x0 + 7, y0 + 20, 6, 6);
    crenels(g, x0, y0, bw, 4, p, tier >= 3);
    // ballista on top
    const tx = cx, ty = y0 - 2;
    const arm = tier === 2 ? 18 : 24;
    const col = tier >= 3 ? p.metal : '#8a5a32';
    const colL = tier >= 3 ? p.metalL : '#c4925a';
    // mount
    g.fillStyle = col;
    g.fillRect(tx - 3, ty - 8, 6, 10);
    // arms
    g.strokeStyle = col; g.lineWidth = tier === 2 ? 2.4 : 3;
    g.beginPath();
    g.moveTo(tx - arm, ty - 10); g.quadraticCurveTo(tx, ty - 4, tx + arm, ty - 10);
    g.stroke();
    g.strokeStyle = colL; g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(tx - arm + 1, ty - 11); g.quadraticCurveTo(tx, ty - 5, tx + arm - 1, ty - 11);
    g.stroke();
    // bowstring
    g.strokeStyle = '#efe6d4'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(tx - arm, ty - 10); g.lineTo(tx, ty - 6); g.lineTo(tx + arm, ty - 10); g.stroke();
    // bolt
    const bl = tier === 2 ? 22 : 30;
    g.strokeStyle = tier >= 3 ? p.metalD : '#5c4030'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(tx - 4, ty - 7); g.lineTo(tx + bl, ty - 16); g.stroke();
    poly(g, [[tx + bl, ty - 16], [tx + bl - 5, ty - 19], [tx + bl - 4, ty - 13]], tier >= 3 ? p.metalL : '#d4cbbd');
    // winch
    disc(g, tx, ty - 5, 2.4, col);
    disc(g, tx, ty - 5, 1.2, colL);
  });
  spr.gy = h - 4;
  return spr;
}

function paintTierFarm(tier) {
  const p = pal(tier);
  const w = tier === 1 ? 64 : tier === 2 ? 78 : 94;
  const h = tier === 1 ? 40 : tier === 2 ? 52 : 64;
  const spr = bake(w, h, g => {
    const soil = tier >= 3 ? '#8a6238' : '#b88858';
    const soilD = tier >= 3 ? '#6e4a28' : '#a87448';
    poly(g, [[6, 16], [w - 12, 8], [w - 4, h - 14], [14, h - 6]], soil);
    poly(g, [[10, 18], [w - 16, 12], [w - 10, h - 16], [16, h - 10]], soilD);
    g.strokeStyle = '#7a5430'; g.lineWidth = 1.3;
    for (let i = 0; i < 4 + tier; i++) {
      g.beginPath(); g.moveTo(12 + i * 2, 18 + i * 3); g.lineTo(w - 18 + i, 12 + i * 2.4); g.stroke();
    }
    const rows = 2 + tier, cols = 6 + tier;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 14 + c * ((w - 28) / cols), y = 16 + r * ((h - 28) / rows) + c * 0.3;
        if (tier >= 3) {
          ell(g, x, y, 1.7, 3.6, '#e2b14a');
          ell(g, x, y + 2.4, 1.2, 1.7, '#c4922a');
        } else if (tier === 2) {
          ell(g, x, y, 1.5, 3.0, '#d4a63a');
          ell(g, x, y - 1.2, 1, 1.2, '#b6d46e');
        } else {
          ell(g, x, y, 1.6, 2.4, '#7eac52');
          ell(g, x, y - 1.2, 1, 1.2, '#b6d46e');
        }
      }
    }
    // posts
    const posts = [[6, 16], [w - 12, 8], [w - 4, h - 14], [14, h - 6]];
    for (const [x, y] of posts) {
      g.fillStyle = tier >= 3 ? p.metalD : '#5c3a24';
      g.fillRect(x - 1.2, y - (tier === 1 ? 7 : 9), tier >= 3 ? 3 : 2.4, tier === 1 ? 8 : 10);
      if (tier >= 3) {
        g.fillStyle = p.metal;
        g.fillRect(x - 1.6, y - 10, 3.8, 2.2);
      }
    }
    g.strokeStyle = tier >= 3 ? p.metal : (tier === 2 ? '#c9c2b4' : '#c4925a');
    g.lineWidth = tier >= 3 ? 1.6 : 1.2;
    g.beginPath();
    g.moveTo(6, 12); g.lineTo(w - 12, 4); g.lineTo(w - 4, h - 18); g.lineTo(14, h - 10); g.closePath();
    g.stroke();
    if (tier >= 3) {
      const sx = w - 26, sy = 28;
      poly(g, [[sx, sy], [sx + 12, sy - 2], [sx + 12, sy + 12], [sx, sy + 14]], '#c9c2b4');
      poly(g, [[sx + 12, sy - 2], [sx + 16, sy - 5], [sx + 16, sy + 9], [sx + 12, sy + 12]], '#8f877c');
      poly(g, [[sx - 2, sy], [sx + 8, sy - 8], [sx + 16, sy - 5], [sx + 12, sy - 2], [sx, sy]], '#6a6864');
      g.fillStyle = '#4a4e55';
      g.fillRect(sx + 3, sy + 4, 5, 8);
    }
  });
  spr.gy = h - 8;
  return spr;
}

function paintTierFort(tier) {
  const p = pal(tier);
  const w = tier === 1 ? 78 : tier === 2 ? 94 : 112;
  const h = tier === 1 ? 86 : tier === 2 ? 102 : 120;
  const spr = bake(w, h, g => {
    const base = h - 6;
    // palisade or stone curtain
    if (tier === 1) {
      for (let i = 0; i < 10; i++) {
        const x = 2 + i * 7.4;
        g.fillStyle = i % 2 ? '#7a5432' : '#c4925a';
        g.fillRect(x, base - 28, 6.2, 28);
        disc(g, x + 3.1, base - 28, 3.3, i % 2 ? '#7a5432' : '#c4925a');
        g.fillStyle = '#5c3a24';
        g.fillRect(x + 2, base - 28, 1.2, 28);
      }
    } else {
      const cw = w - 16;
      const ch = tier === 2 ? 28 : 32;
      poly(g, [[8, base - ch], [8 + cw - 10, base - ch], [8 + cw - 10, base], [8, base]], p.face);
      poly(g, [[8 + cw - 10, base - ch], [8 + cw, base - ch - 6], [8 + cw, base - 6], [8 + cw - 10, base]], p.side);
      stoneJoints(g, 8, base - ch, cw - 10, ch, p);
      crenels(g, 8, base - ch, cw - 10, tier === 2 ? 8 : 10, p, tier >= 3);
      if (tier >= 3) ironBand(g, 8, base - 12, cw - 10, 4, p);
    }
    const bx = tier === 1 ? 24 : 28, by = base - (tier === 1 ? 42 : 46);
    const bw = tier === 1 ? 34 : tier === 2 ? 42 : 50;
    const bh = tier === 1 ? 20 : 24;
    poly(g, [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]], p.wall);
    poly(g, [[bx + bw, by], [bx + bw + 8, by - 6], [bx + bw + 8, by + bh - 6], [bx + bw, by + bh]], p.side);
    const roofY = by - (tier === 1 ? 18 : 22);
    poly(g, [[bx - 2, by], [bx + bw * 0.45, roofY], [bx + bw + 2, by + 2]], p.roof);
    poly(g, [[bx - 2, by], [bx + bw * 0.45, roofY], [bx + 10, by - 8]], p.roofL);
    poly(g, [[bx + bw * 0.45, roofY], [bx + bw + 10, by - 4], [bx + bw + 2, by + 2]], p.roofD);
    if (tier >= 3) {
      g.strokeStyle = p.metal; g.lineWidth = 2;
      g.beginPath(); g.moveTo(bx - 1, by); g.lineTo(bx + bw * 0.45, roofY); g.lineTo(bx + bw + 8, by - 3); g.stroke();
    }
    // left tower
    const tx = 8, tw = 16, th = tier === 1 ? 32 : 40;
    g.fillStyle = p.wall;
    g.fillRect(tx, base - th, tw, th);
    g.fillStyle = p.side;
    g.fillRect(tx + tw, base - th + 4, 5, th - 4);
    poly(g, [[tx + tw / 2, base - th - 16], [tx + tw + 8, base - th + 2], [tx - 4, base - th + 2]], p.roof);
    poly(g, [[tx + tw / 2, base - th - 16], [tx - 4, base - th + 2], [tx + 4, base - th - 4]], p.roofL);
    // door + archer
    g.fillStyle = p.door;
    g.fillRect(bx + 12, by + bh - 16, 12, 16);
    disc(g, bx + 22, by + bh - 8, 1.1, '#f0c14a');
    disc(g, tx + 8, base - th + 14, 2.2, '#e6b898');
    g.fillStyle = '#3e74c8';
    g.fillRect(tx + 6, base - th + 15.5, 4, 3);
    if (tier >= 2) {
      disc(g, bx + 8, by + 8, 2.2, '#e6b898');
      g.fillStyle = '#3e74c8';
      g.fillRect(bx + 6, by + 9.5, 4, 3);
    }
    if (tier >= 3) {
      ironBand(g, tx, base - th + 10, tw, 3.5, p);
      rivets(g, [[tx + 4, base - th + 11.7], [tx + tw - 4, base - th + 11.7]], p);
    }
    g.fillStyle = '#5c4030';
    g.fillRect(bx + bw * 0.55, roofY - 6, 2.2, 14);
  });
  spr.gy = h - 8;
  return spr;
}

function paintTierMine(kind) {
  const iron = kind === 'iron';
  const w = 86, h = 70;
  const spr = bake(w, h, g => {
    const hill = iron ? '#5c534c' : '#a89886';
    const hillL = iron ? '#8a7a70' : '#d4cbbd';
    const hillD = iron ? '#3a342e' : '#6e6558';
    const ore = iron ? '#8a3c28' : '#c9c2b4';
    const oreL = iron ? '#c45a3a' : '#e7e2d8';
    // hill
    poly(g, [[4, 62], [14, 28], [40, 14], [70, 24], [82, 62]], hill);
    poly(g, [[14, 30], [40, 16], [52, 28], [28, 40]], hillL);
    if (iron) {
      // rust veins
      g.strokeStyle = oreL; g.lineWidth = 2; g.globalAlpha = 0.7;
      g.beginPath(); g.moveTo(22, 44); g.lineTo(30, 28); g.lineTo(36, 36); g.stroke();
      g.beginPath(); g.moveTo(48, 50); g.lineTo(58, 32); g.stroke();
      g.globalAlpha = 1;
    }
    // cut face / entrance
    poly(g, [[28, 62], [32, 36], [50, 34], [58, 62]], hillD);
    poly(g, [[34, 58], [36, 40], [48, 39], [52, 58]], '#1a1612');
    // headframe so it reads as a mine, not a tent
    const frame = iron ? '#4a4e55' : '#8a5a32';
    const frameL = iron ? '#8a9098' : '#c4925a';
    g.fillStyle = frame;
    g.fillRect(32, 18, 3.2, 44);
    g.fillRect(50, 18, 3.2, 44);
    g.fillRect(31, 18, 23, 4);
    g.fillStyle = frameL;
    g.fillRect(32, 18, 3.2, 1.4);
    g.fillRect(50, 18, 3.2, 1.4);
    g.fillRect(31, 18, 23, 1.4);
    // cross brace
    g.strokeStyle = frame; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(34, 22); g.lineTo(51, 40);
    g.moveTo(52, 22); g.lineTo(35, 40);
    g.stroke();
    // winch beam and bucket
    g.fillStyle = frame;
    g.fillRect(40, 14, 14, 3);
    g.strokeStyle = '#2a1c10'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(52, 17); g.lineTo(52, 28); g.stroke();
    g.fillStyle = iron ? '#6a4030' : '#c4925a';
    g.fillRect(49, 28, 6, 5);
    g.fillStyle = iron ? '#4a2e1c' : '#8a5a32';
    g.fillRect(49, 32, 6, 1.4);
    if (iron) {
      disc(g, 33.6, 20, 1.4, '#2a2c30');
      disc(g, 51.6, 20, 1.4, '#2a2c30');
      disc(g, 33.6, 40, 1.4, '#2a2c30');
      disc(g, 51.6, 40, 1.4, '#2a2c30');
    }
    // piles
    if (iron) {
      poly(g, [[60, 62], [66, 50], [76, 54], [80, 62]], '#3a342e');
      poly(g, [[64, 60], [68, 52], [74, 56]], ore);
      ell(g, 70, 58, 5, 3, oreL);
      // ingots
      g.fillStyle = '#6a4030';
      g.fillRect(62, 58, 8, 3);
      g.fillStyle = '#a34c30';
      g.fillRect(63, 55, 7, 3);
    } else {
      // cut blocks
      g.fillStyle = '#d4cbbd';
      g.fillRect(60, 52, 10, 7);
      g.fillStyle = '#e7e2d8';
      g.fillRect(62, 48, 9, 6);
      g.fillStyle = '#8f877c';
      g.fillRect(70, 54, 8, 6);
      g.fillStyle = '#c9c2b4';
      g.fillRect(72, 50, 7, 5);
    }
    // ground gravel
    ell(g, 20, 62, 8, 2.4, iron ? '#4a4038' : '#b7ad9e');
    ell(g, 48, 64, 14, 2.8, iron ? '#3a342e' : '#c9c2b4');
  });
  spr.gy = 64;
  return spr;
}

  function paintLockIcon() {
    return bake(24, 28, g => {
      g.strokeStyle = '#2a1c10'; g.lineWidth = 3.2;
      g.beginPath(); g.arc(12, 11, 5, Math.PI, 0); g.stroke();
      g.fillStyle = '#2a1c10';
      if (g.roundRect) g.roundRect(4, 11, 16, 15, 2.2); else g.fillRect(4, 11, 16, 15);
      g.fill();
      g.fillStyle = '#e6c27a';
      if (g.roundRect) { g.beginPath(); g.roundRect(5.2, 12.2, 13.6, 12.6, 1.6); g.fill(); }
      else g.fillRect(5.2, 12.2, 13.6, 12.6);
      disc(g, 12, 18, 1.8, '#2a1c10');
      g.fillStyle = '#2a1c10'; g.fillRect(11.2, 18, 1.6, 5);
    });
  }
  function paintMiner(pose) {
    const spr = bake(30, 34, g => {
      const walk = pose === 'walk-0' || pose === 'walk-1' || pose === 'walk0' || pose === 'walk1';
      const step = (pose === 'walk-1' || pose === 'walk1') ? 2.4 : (pose === 'walk-0' || pose === 'walk0') ? -1.2 : 0;
      const work = String(pose).indexOf('work') === 0;
      g.fillStyle = '#5c4030';
      g.fillRect(10, 24 + (walk && step < 0 ? -1 : 0), 3, 8);
      g.fillRect(16, 24 + (walk && step > 0 ? -1 : 0), 3, 8);
      g.fillStyle = '#3a2a1c';
      g.fillRect(10, 31, 3.2, 1.6);
      g.fillRect(16, 31, 3.2, 1.6);
      ell(g, 14, 19.5, 6.3, 6.5, '#8a9098');
      ell(g, 16.4, 20.6, 3, 4.6, '#4a4e55');
      g.fillStyle = '#2a2c30'; g.fillRect(11, 21, 8, 1.6);
      disc(g, 14, 11, 3.5, '#e6b898');
      g.fillStyle = '#4a4e55';
      g.beginPath(); g.arc(14, 11, 3.8, Math.PI * 1.05, Math.PI * 1.95);
      g.quadraticCurveTo(18, 6, 14, 5); g.quadraticCurveTo(10, 6, 10.2, 11); g.fill();
      disc(g, 15.5, 11.2, 0.55, '#2a1c10');
      const ang = pose === 'work-0' || pose === 'work0' ? -1.1 : pose === 'work-1' || pose === 'work1' ? -0.2 : pose === 'work-2' || pose === 'work2' ? 0.9 : -0.6;
      const hx = 18 + Math.cos(ang) * 6, hy = 16 + Math.sin(ang) * 6;
      g.strokeStyle = '#6b4630'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(18, 18); g.lineTo(hx, hy); g.stroke();
      g.save(); g.translate(hx, hy); g.rotate(ang);
      poly(g, [[-2, -1], [6, -3], [6, 1], [-2, 2]], '#8a9098');
      g.fillStyle = '#4a4e55'; g.fillRect(4, -4, 3.2, 6);
      g.restore();
    });
    spr.gy = 33;
    return spr;
  }
  function paintPickIcon() {
    return bake(16, 18, g => {
      g.strokeStyle = '#2a1c10'; g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(5, 16); g.lineTo(11, 5); g.stroke();
      g.strokeStyle = '#e2b15a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(5.2, 15.6); g.lineTo(10.6, 5.4); g.stroke();
      g.fillStyle = '#2a1c10';
      g.beginPath(); g.moveTo(7, 4); g.quadraticCurveTo(14, 2, 15, 8); g.quadraticCurveTo(12, 5, 9, 7); g.closePath(); g.fill();
      g.fillStyle = '#c9c2b4';
      g.beginPath(); g.moveTo(8, 4.6); g.quadraticCurveTo(13, 3.2, 13.8, 7); g.quadraticCurveTo(11.4, 5.2, 9.2, 6.4); g.closePath(); g.fill();
    });
  }
  function paintShot(kind, iron) {
    if (kind === 'cannonball') {
      return bake(12, 12, g => {
        disc(g, 6, 6.4, 4.6, iron ? '#2a2c30' : '#4a4038');
        disc(g, 6, 5.6, 4.2, iron ? '#4a4e55' : '#6a5a48');
        disc(g, 4.6, 4.6, 1.4, 'rgba(255,255,255,.35)');
      });
    }
    return bake(18, 8, g => {
      const col = iron ? '#4a4e55' : '#8a5a32';
      poly(g, [[1, 4], [14, 2.2], [17, 4], [14, 5.8]], col);
      poly(g, [[13, 1.4], [17.5, 4], [13, 6.6]], iron ? '#8a9098' : '#d4cbbd');
    });
  }

  setSprite('keep-wood', paintTierKeep(1));
  setSprite('keep-stone', paintTierKeep(2));
  setSprite('keep-iron', paintTierKeep(3));
  setSprite('house-wood', paintTierHouse(1));
  setSprite('house-stone', paintTierHouse(2));
  setSprite('house-iron', paintTierHouse(3));
  setSprite('wall-wood', paintTierWall(1));
  setSprite('wall-stone', paintTierWall(2));
  setSprite('wall-iron', paintTierWall(3));
  setSprite('gate-wood', paintTierGate(1));
  setSprite('gate-stone', paintTierGate(2));
  setSprite('gate-iron', paintTierGate(3));
  setSprite('farm-wood', paintTierFarm(1));
  setSprite('farm-stone', paintTierFarm(2));
  setSprite('farm-iron', paintTierFarm(3));
  setSprite('fort-wood', paintTierFort(1));
  setSprite('fort-stone', paintTierFort(2));
  setSprite('fort-iron', paintTierFort(3));
  setSprite('tower-wood', paintTierTowerWood());
  setSprite('tower-cannon-stone', paintTierCannon(2));
  setSprite('tower-cannon-iron', paintTierCannon(3));
  setSprite('tower-ballista-stone', paintTierBallista(2));
  setSprite('tower-ballista-iron', paintTierBallista(3));
  setSprite('projectile-cannonball-stone', paintShot('cannonball', false));
  setSprite('projectile-cannonball-iron', paintShot('cannonball', true));
  setSprite('projectile-bolt-stone', paintShot('bolt', false));
  setSprite('projectile-bolt-iron', paintShot('bolt', true));
  const ms = paintTierMine('stone'), mi = paintTierMine('iron');
  setSprite('mine-stone-idle', ms);
  setSprite('mine-stone-working', ms);
  setSprite('mine-iron-idle', mi);
  setSprite('mine-iron-working', mi);
  setSprite('miner-idle', paintMiner('idle'));
  setSprite('miner-walk-0', paintMiner('walk-0'));
  setSprite('miner-walk-1', paintMiner('walk-1'));
  setSprite('miner-work-0', paintMiner('work-0'));
  setSprite('miner-work-1', paintMiner('work-1'));
  setSprite('miner-work-2', paintMiner('work-2'));
  setSprite('icon-lock', paintLockIcon());
  Art.tool.pick = paintPickIcon();
  setSprite('tool-pickaxe', Art.tool.pick);
  Art.stand.pick = paintStand('pick');
  setSprite('stand-pickaxe', Art.stand.pick);
  Art.folk.miner = [
    getSprite('miner-idle'), getSprite('miner-walk-0'), getSprite('miner-walk-1'),
    getSprite('miner-work-0'), getSprite('miner-work-1'), getSprite('miner-work-2')
  ];
}


function buildArt() {
  Art.shadow = paintShadow();
  Art.coin = paintCoin();
  Art.tree = [0, 1, 2].map(paintTree);
  Art.dead = paintDeadTree();
  Art.rock = [0, 1].map(paintRock);
  Art.wallS = paintWall(false, false);
  Art.wallW = paintWall(false, true);
  Art.wallSP = paintWall(true, false);
  Art.wallWP = paintWall(true, true);
  Art.gateC = paintGate(false, false);
  Art.gateO = paintGate(true, false);
  Art.gateP = paintGate(false, true);
  Art.tower = paintTower(false);
  Art.towerP = paintTower(true);
  Art.fort = paintFort(false);
  Art.fortP = paintFort(true);
  Art.monarch = [0, 1].map(paintMonarch);
  Art.archer = [0, 1, 2].map(f => paintArcher(f, false));
  Art.archerRally = [0, 1, 2].map(f => paintArcher(f, true));
  Art.guardian = [0, 1].map(paintGuardian);
  Art.warden = [0, 1].map(paintWarden);
  Art.shambler = [0, 1, 2, 3].map(paintShambler);
  Art.skeleton = [0, 1, 2, 3].map(paintSkeleton);
  Art.necro = [0, 1, 2, 3].map(paintNecro);
  Art.necroOrb = paintNecroOrb();
  Art.undeadGlow = {
    shambler: paintRadial(56, 56, [[0, 'rgba(214,235,170,.5)'], [0.45, 'rgba(170,200,120,.14)'], [1, 'rgba(140,170,90,0)']]),
    skeleton: paintRadial(56, 56, [[0, 'rgba(255,244,214,.48)'], [0.45, 'rgba(230,200,150,.13)'], [1, 'rgba(230,200,150,0)']]),
    necro: paintRadial(72, 72, [[0, 'rgba(214,180,255,.72)'], [0.4, 'rgba(150,80,230,.22)'], [1, 'rgba(90,40,180,0)']]),
  };
  Art.folk = {
    vagrant: ['idle', 'walk0', 'walk1'].map(p => paintFolk('vagrant', p)),
    villager: ['idle', 'walk0', 'walk1', 'pickup'].map(p => paintFolk('villager', p)),
    builder: ['idle', 'walk0', 'walk1', 'work0', 'work1', 'work2'].map(p => paintFolk('builder', p)),
    farmer: ['idle', 'walk0', 'walk1', 'work0', 'work1', 'work2'].map(p => paintFolk('farmer', p)),
  };
  Art.tool = { bow: paintToolIcon('bow'), hammer: paintToolIcon('hammer'), scythe: paintToolIcon('scythe') };
  Art.stand = { bow: paintStand('bow'), hammer: paintStand('hammer'), scythe: paintStand('scythe') };
  Art.house = paintHouse('live'); Art.houseDmg = paintHouse('dmg'); Art.houseP = paintHouse('pale');
  Art.hall = paintHall('live'); Art.hallDmg = paintHall('dmg'); Art.hallP = paintHall('pale'); Art.hallR = paintHall('rival');
  Art.farm = { tilled: paintFarm('tilled'), growing: paintFarm('growing'), ripe: paintFarm('ripe'), pale: paintFarm('pale') };
  Art.scaffold = [0, 1, 2].map(paintScaffold);
  Art.orderMark = paintOrderMark();
  Art.demoMark = paintDemoMark();
  Art.camp = paintCamp();
  Art.coinFrames = [0, 1, 2, 3, 4, 5].map(paintCoinFrame);
  Art.coin = Art.coinFrames[0];
  Art.shimmer = paintShimmer();
  Art.flame = paintRadial(18, 22, [[0, 'rgba(255,250,220,.95)'], [0.35, 'rgba(255,170,60,.9)'], [1, 'rgba(255,120,40,0)']]);
  Art.flameG = paintRadial(18, 22, [[0, 'rgba(236,255,220,.95)'], [0.35, 'rgba(150,230,90,.9)'], [1, 'rgba(80,160,50,0)']]);
  Art.orb = paintRadial(24, 24, [[0, 'rgba(230,255,210,1)'], [0.35, 'rgba(140,255,90,.85)'], [1, 'rgba(80,180,40,0)']]);
  Art.fog = paintRadial(128, 80, [[0, 'rgba(196,204,186,.55)'], [0.5, 'rgba(170,180,160,.22)'], [1, 'rgba(170,180,160,0)']]);
  function paintBanner(flagCol, ghost) {
    return bake(40, 64, g => {
      ell(g, 20, 58, 12, 5, '#cbb892');
      ell(g, 18, 57, 8, 3.4, '#e6d3a8');
      g.fillStyle = '#5c4030';
      g.fillRect(18.7, 16, 2.6, 42);
      g.globalAlpha = ghost ? 0.4 : 1;
      g.fillStyle = flagCol;
      g.beginPath();
      g.moveTo(21.3, 18); g.lineTo(37, 24); g.lineTo(21.3, 30);
      g.closePath(); g.fill();
      g.globalAlpha = 1;
      disc(g, 20, 16, 2.2, '#f0c14a');
    });
  }
  Art.banner = paintBanner('#3e74c8', false);
  Art.bannerContest = paintBanner('#e8a83a', false);
  Art.bannerSite = paintBanner('#c9b488', true);
  Art.smoke = paintRadial(20, 20, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
  Art.glow = paintRadial(64, 64, [[0, 'rgba(255,186,90,.95)'], [0.45, 'rgba(255,140,50,.28)'], [1, 'rgba(255,120,40,0)']]);
  Art.glowG = paintRadial(64, 64, [[0, 'rgba(170,255,120,.8)'], [0.5, 'rgba(80,180,70,.2)'], [1, 'rgba(80,180,70,0)']]);
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s / 2, s / 2, 8, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.42, 'rgba(255,255,255,.62)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  Art.light = { c, w: s, h: s };
  registerUpgradeSprites();
}

function buildDecor() {
  const rnd = mulberry((S.seed ^ 0x51f00d) >>> 0);
  const ponds = [];
  for (let i = 0; i < 3; i++) {
    for (let t = 0; t < 40; t++) {
      const x = 180 + rnd() * (W - 360), y = 180 + rnd() * (H - 360);
      if (S.regions.some(r => (r.x - x) ** 2 + (r.y - y) ** 2 < 220 * 220)) continue;
      if (ponds.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < 300 * 300)) continue;
      ponds.push({ x, y, rx: 56 + rnd() * 50, ry: 34 + rnd() * 22, rot: (rnd() - 0.5) * 0.8 });
      break;
    }
  }
  const trees = [];
  const occ = new Set();
  const cell = 48;
  const blocked = (x, y) => {
    if (x < 36 || y < 36 || x > W - 36 || y > H - 36) return true;
    if (S.regions.some(r => (r.x - x) ** 2 + (r.y - y) ** 2 < 88 * 88)) return true;
    if (ponds.some(p => (p.x - x) ** 2 / ((p.rx + 20) ** 2) + (p.y - y) ** 2 / ((p.ry + 16) ** 2) < 1)) return true;
    const k = ((x / cell) | 0) + ',' + ((y / cell) | 0);
    if (occ.has(k)) return true;
    return false;
  };
  const addTree = (x, y) => {
    if (blocked(x, y)) return;
    occ.add(((x / cell) | 0) + ',' + ((y / cell) | 0));
    const s = 0.84 + rnd() * 0.42;
    trees.push({ kind: 'tree', x, y, v: (rnd() * 3) | 0, s, ph: rnd() * 6.28, rid: regionIdAt(x, y), r: 14 * s, marked: false, paid: 0, prog: 0 });
  };
  for (const r of S.regions) {
    const n = 11 + ((rnd() * 6) | 0);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = 140 + rnd() * 170;
      addTree(r.x + Math.cos(a) * d, r.y + Math.sin(a) * d);
    }
  }
  let guard = 0;
  while (trees.length < 320 && guard++ < 4000) addTree(rnd() * W, rnd() * H);
  const rocks = [];
  for (let i = 0, g = 0; i < 42 && g < 700; g++) {
    const x = rnd() * W, y = rnd() * H;
    if (x < 24 || y < 24 || x > W - 24 || y > H - 24) continue;
    if (S.regions.some(r => (r.x - x) ** 2 + (r.y - y) ** 2 < 64 * 64)) continue;
    if (ponds.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < (p.rx + 10) ** 2)) continue;
    const s = 0.75 + rnd() * 0.7;
    rocks.push({ kind: 'rock', x, y, v: (rnd() * 2) | 0, s, rid: regionIdAt(x, y), r: 10 * s, marked: false, paid: 0, prog: 0 });
    i++;
  }
  const reeds = [];
  for (let i = 0; i < 240; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (S.regions.some(r => (r.x - x) ** 2 + (r.y - y) ** 2 < 72 * 72)) continue;
    reeds.push({ x, y, h: 7 + rnd() * 9, ph: rnd() * 6.28, rid: regionIdAt(x, y) });
  }
  S.ponds = ponds; S.trees = trees; S.rocks = rocks; S.reeds = reeds;
}

function bakeGround() {
  groundCv.width = 1600; groundCv.height = 1600;
  const g = groundCv.getContext('2d');
  g.setTransform(GSC, 0, 0, GSC, 0, 0);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const rnd = mulberry((S.seed ^ 0x0d00d) >>> 0);
  g.fillStyle = '#c5cb86';
  g.fillRect(0, 0, W, H);
  const patches = ['#d8dca6', '#b4be70', '#e0e4b4', '#a3b062', '#d9cfa0', '#97ab62', '#cdd6a2', '#e7d7a4'];
  for (let i = 0; i < 56; i++) {
    const x = rnd() * W, y = rnd() * H, rad = 100 + rnd() * 280;
    const col = patches[(rnd() * patches.length) | 0];
    const grd = g.createRadialGradient(x, y, rad * 0.08, x, y, rad);
    grd.addColorStop(0, col);
    grd.addColorStop(1, 'rgba(197,203,134,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  for (const r of S.regions) {
    g.fillStyle = '#d2c094';
    g.beginPath(); g.ellipse(r.x, r.y + 8, 96, 62, r.id * 0.35, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e6d6b0';
    g.beginPath(); g.ellipse(r.x - 8, r.y, 60, 38, r.id * 0.35, 0, Math.PI * 2); g.fill();
  }
  const linked = new Set();
  for (const a of S.regions) {
    const near = S.regions.filter(b => b !== a).sort((p, q) => dist(p, a) - dist(q, a)).slice(0, 2);
    for (const b of near) {
      const key = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id;
      if (linked.has(key)) continue;
      linked.add(key);
      const mx = (a.x + b.x) / 2 + (rnd() - 0.5) * 160;
      const my = (a.y + b.y) / 2 + (rnd() - 0.5) * 160;
      g.strokeStyle = '#c9b488';
      g.lineWidth = 36;
      g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx, my, b.x, b.y); g.stroke();
      g.strokeStyle = '#e8d8b4';
      g.lineWidth = 20;
      g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx, my, b.x, b.y); g.stroke();
    }
  }
  for (const p of S.ponds) {
    g.fillStyle = '#efe3c4';
    g.beginPath(); g.ellipse(p.x, p.y, p.rx + 14, p.ry + 10, p.rot, 0, Math.PI * 2); g.fill();
    const grd = g.createRadialGradient(p.x - p.rx * 0.28, p.y - p.ry * 0.32, 4, p.x, p.y, p.rx);
    grd.addColorStop(0, '#e7f6fb');
    grd.addColorStop(0.42, '#8ec4dc');
    grd.addColorStop(1, '#4e96ba');
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, p.rot, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.42)';
    g.beginPath(); g.ellipse(p.x - p.rx * 0.28, p.y - p.ry * 0.32, p.rx * 0.24, p.ry * 0.15, p.rot, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 240; i++) {
    const x = rnd() * W, y = rnd() * H;
    g.fillStyle = rnd() < 0.5 ? '#cfc6b4' : '#aea498';
    g.beginPath(); g.ellipse(x, y, 1.6 + rnd() * 2.4, 1.1 + rnd() * 1.5, rnd() * 2, 0, Math.PI * 2); g.fill();
  }
  g.lineWidth = 1.5;
  for (let i = 0; i < 820; i++) {
    const x = rnd() * W, y = rnd() * H, h = 4 + rnd() * 7, lean = (rnd() - 0.5) * 3;
    g.strokeStyle = rnd() < 0.3 ? '#6e8c40' : '#8aa456';
    g.globalAlpha = 0.35 + rnd() * 0.45;
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x + lean, y - h);
    g.moveTo(x, y); g.lineTo(x - 1.6 + lean * 0.25, y - h * 0.72);
    g.stroke();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 160; i++) {
    const x = rnd() * W, y = rnd() * H;
    g.fillStyle = rnd() < 0.45 ? '#e08b96' : (rnd() < 0.5 ? '#f3e29a' : '#f7f4ea');
    g.beginPath(); g.arc(x, y, 1.6 + rnd() * 1.2, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(62,70,36,.28)';
  g.lineWidth = 36;
  g.strokeRect(0, 0, W, H);
}

function redrawMap() {
  const img = new ImageData(GW, GH), d = img.data;
  const border = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx, id = grid[i];
    if ((gx > 0 && grid[i - 1] !== id) || (gx < GW - 1 && grid[i + 1] !== id) || (gy > 0 && grid[i - GW] !== id) || (gy < GH - 1 && grid[i + GW] !== id)) border[i] = 1;
  }
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx, own = S.regions[grid[i]].owner, p = i * 4;
    const n = (gx * 13 + gy * 7) & 7;
    const edge = border[i];
    const near = !edge && ((gx > 0 && border[i - 1]) || (gx < GW - 1 && border[i + 1]) || (gy > 0 && border[i - GW]) || (gy < GH - 1 && border[i + GW]));
    let R = 0, G = 0, B = 0, A = 0;
    if (own === 'player') {
      if (edge) { R = 46; G = 98; B = 186; A = 235; }
      else if (near) { R = 86; G = 140; B = 206; A = S.build ? 160 : 120; }
      else { R = 214; G = 164; B = 70; A = (S.build ? 110 : 82) + (n - 4); }
    } else if (own === 'pale') {
      if (edge) { R = 214; G = 220; B = 204; A = 210; }
      else if (near) { R = 154; G = 164; B = 146; A = 160; }
      else { R = 108; G = 122; B = 104; A = 158 + (n - 4); }
    } else if (edge) { R = 96; G = 78; B = 46; A = 150; }
    else if (near) { R = 120; G = 100; B = 60; A = 46; }
    d[p] = R; d[p + 1] = G; d[p + 2] = B; d[p + 3] = A;
  }
  mapCv.getContext('2d').putImageData(img, 0, 0);
  S.mapDirty = false;
}

// ---------- draw helpers ----------
let vL = 0, vT = 0, vR = 0, vB = 0;
function beginView() {
  const c = camera();
  const hw = vw / 2 / scale + 100, hh = vh / 2 / scale + 120;
  vL = c.x - hw; vR = c.x + hw; vT = c.y - hh; vB = c.y + hh;
}
function vis(x, y) { return x > vL && x < vR && y > vT && y < vB; }
const pile = [];
let pileN = 0;
function pushP(y, k, a) {
  let o = pile[pileN];
  if (!o) pile[pileN] = o = { y: 0, k: 0, a: null };
  o.y = y; o.k = k; o.a = a;
  pileN++;
}
function shadow(x, y, rw, rh) {
  ctx.drawImage(Art.shadow.c, x - rw, y - rh * 0.45, rw * 2, rh);
}
function blit(spr, x, y, opt) {
  if (!spr || !spr.c) return;
  const gy = spr.gy != null ? spr.gy : spr.h;
  const bob = opt && opt.bob || 0;
  const sc = opt && opt.sc || 1;
  ctx.save();
  try {
    ctx.translate(x, y + bob);
    if (opt && opt.flip) ctx.scale(-1, 1);
    if (sc !== 1) ctx.scale(sc, sc);
    ctx.drawImage(spr.c, -spr.w / 2, -gy, spr.w, spr.h);
  } finally { ctx.restore(); }
}
function actorMotion(e) {
  const dx = e.x - (e._px == null ? e.x : e._px);
  const dy = e.y - (e._py == null ? e.y : e._py);
  const moved = Math.hypot(dx, dy);
  const walking = moved > 0.3 && moved < 14;
  if (dx > 0.2) e._flip = false; else if (dx < -0.2) e._flip = true;
  e._px = e.x; e._py = e.y;
  const bob = Math.sin(S.t * 2.1 + e.x) * 0.45 + (walking ? Math.sin(S.t * 10 + e.y) * 1.15 : 0);
  const fr = walking ? ((S.t * 8 + e.x) & 1) : (((S.t * 1.4 + e.x) & 1) ? 0 : 0);
  return { walking, bob, fr: walking ? ((S.t * 8) | 0) & 1 : 0, flip: !!e._flip };
}
function bar(x, y, w, frac, col) {
  const h = 5, f = clamp(frac, 0, 1);
  ctx.fillStyle = 'rgba(28,20,14,.78)';
  rrPath(ctx, x - w / 2, y, w, h, 2);
  ctx.fill();
  if (f > 0) {
    ctx.fillStyle = col;
    rrPath(ctx, x - w / 2 + 1, y + 1, Math.max(0.5, (w - 2) * f), h - 2, 1.5);
    ctx.fill();
  }
}
function tag(txt, x, y, size, col, accent) {
  ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(txt).width, h = size + 7, x0 = x - w / 2 - 7;
  rrPath(ctx, x0, y - h / 2, w + 14, h, 7);
  ctx.fillStyle = 'rgba(28,20,14,.74)';
  ctx.fill();
  if (accent) { ctx.lineWidth = 2; ctx.strokeStyle = accent; ctx.stroke(); }
  ctx.fillStyle = col;
  ctx.fillText(txt, x, y + 0.5);
}
const TOP_CHROME = 104, BOT_CHROME = 116;
function beginLabels() {
  if (!S) return;
  S._labelQ = [];
  S._choiceBtns = [];
  S._upgradeBadges = [];
  S._visibleLabels = [];
}
function labelHit(a, b, pad) {
  const p = pad || 0;
  return a.x < b.x + b.w + p && a.x + a.w + p > b.x && a.y < b.y + b.h + p && a.y + a.h + p > b.y;
}
function measureWorldTag(txt, size) {
  const fs = size * scale, padX = 7 * scale, h = (size + 7) * scale;
  ctx.font = `800 ${fs}px "Segoe UI", system-ui, sans-serif`;
  return { w: ctx.measureText(txt).width + padX * 2, h, fs, padX };
}
function queueLabel(lab) {
  if (!S || !S._labelQ) return;
  S._labelQ.push(lab);
}
function queueWorldTag(txt, wx, wy, size, col, accent, kind) {
  if (!S) return;
  const p = w2s(wx, wy);
  const m = measureWorldTag(txt, size);
  const x = p.x - m.w / 2, y = p.y - m.h / 2;
  if (y + m.h < TOP_CHROME || y > vh - BOT_CHROME) return;
  queueLabel({ kind: kind || 'tag', txt, x, y, w: m.w, h: m.h, fs: m.fs, padX: m.padX, col, accent });
}
function placeTag(txt, wx, wy, size, col, accent, kind) {
  const sh = (size + 8) * scale;
  const p = w2s(wx, wy);
  if (p.y - sh / 2 < TOP_CHROME || p.y + sh / 2 > vh - BOT_CHROME) return;
  queueWorldTag(txt, wx, wy, size, col, accent, kind);
}
function placeTagClamped(txt, wx, wy, size, col, accent, kind) {
  const m = measureWorldTag(txt, size);
  const p = w2s(wx, wy);
  p.x = clamp(p.x, m.w / 2 + 8, vw - m.w / 2 - 8);
  p.y = clamp(p.y, TOP_CHROME + m.h / 2 + 2, vh - BOT_CHROME - m.h / 2 - 2);
  queueLabel({ kind: kind || 'tag', txt, x: p.x - m.w / 2, y: p.y - m.h / 2, w: m.w, h: m.h, fs: m.fs, padX: m.padX, col, accent });
}
function paintQueuedTag(lab) {
  ctx.font = `800 ${lab.fs}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  rrPath(ctx, lab.x, lab.y, lab.w, lab.h, Math.max(5, Math.min(8, (lab.padX || 7))));
  ctx.fillStyle = 'rgba(28,20,14,.74)';
  ctx.fill();
  if (lab.accent) {
    ctx.lineWidth = Math.max(1.5, (lab.fs || 12) * 0.12);
    ctx.strokeStyle = lab.accent;
    ctx.stroke();
  }
  ctx.fillStyle = lab.col;
  ctx.fillText(lab.txt, lab.x + lab.w / 2, lab.y + lab.h / 2 + 0.5);
}
function paintQueuedBadge(lab) {
  const pad = 7, ih = 16, h = lab.h, x = lab.x, y = lab.y, w = lab.w;
  const lockSpr = lab.locked ? getSprite('icon-lock') : null;
  rrPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(28,20,14,.88)';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = lab.locked ? '#e6c27a' : ((lab.paid || 0) >= (lab.cost || 0) ? '#8ee0b0' : '#f0c14a');
  ctx.stroke();
  if (lab.locked && lockSpr && lockSpr.c) ctx.drawImage(lockSpr.c, x + pad, y + (h - ih) / 2, ih, ih);
  else if (!lab.locked && Art.coin) ctx.drawImage(Art.coin.c, x + pad, y + (h - ih) / 2, ih, ih);
  ctx.font = `800 ${lab.locked ? 13 : 16}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = lab.locked ? '#ffe6b0' : ((lab.paid || 0) >= (lab.cost || 0) ? '#e9fff2' : '#fff6e4');
  const iconW = lab.locked || Art.coin ? ih : 0;
  ctx.fillText(lab.txt, x + pad + iconW + (iconW ? 5 : 0), y + h / 2 + 0.5);
}
function paintQueuedChoice(lab) {
  const x = lab.x, y = lab.y, bw = lab.w, bh = lab.h;
  rrPath(ctx, x, y, bw, bh, 12);
  ctx.fillStyle = 'rgba(28,20,14,.96)';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = lab.locked ? '#c9b488' : '#f0c14a';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fff6e4';
  ctx.fillText(lab.label, x + bw / 2, y + 22);
  ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e6c27a';
  ctx.fillText(lab.sub, x + bw / 2, y + 40);
  if (lab.locked) {
    const lockSpr = getSprite('icon-lock');
    if (lockSpr && lockSpr.c) ctx.drawImage(lockSpr.c, x + bw - 22, y + 6, 16, 18);
  }
}
function clampLabel(lab) {
  lab.x = Math.round(clamp(lab.x, 6, vw - lab.w - 6));
  lab.y = Math.round(clamp(lab.y, TOP_CHROME + 2, vh - BOT_CHROME - lab.h - 2));
}
function flushLabels() {
  if (!S) return;
  const all = S._labelQ || [];
  const choices = all.filter(l => l.kind === 'choice');
  const others = all.filter(l => l.kind !== 'choice');
  const padChoice = 14;
  if (choices.length) {
    for (const lab of others) {
      if (lab.keepWithChoice) continue;
      if (choices.some(c => labelHit(lab, c, padChoice))) lab.hide = true;
    }
  }
  const placed = choices.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h }));
  const gap = 4;
  for (const lab of others) {
    if (lab.hide) continue;
    clampLabel(lab);
    const ox = lab.x, oy = lab.y;
    let found = false;
    for (let i = 0; i <= 10 && !found; i++) {
      const tries = i === 0 ? [{ x: ox, y: oy }] : [
        { x: ox, y: oy - i * (lab.h + gap) },
        { x: ox, y: oy + i * (lab.h + gap) },
        { x: ox + i * 18, y: oy },
        { x: ox - i * 18, y: oy },
      ];
      for (const tr of tries) {
        lab.x = tr.x; lab.y = tr.y;
        clampLabel(lab);
        if (choices.length && !lab.keepWithChoice && choices.some(c => labelHit(lab, c, padChoice))) continue;
        if (!placed.some(p => labelHit(lab, p, gap))) { found = true; break; }
      }
    }
    if (!found) {
      lab.x = ox; lab.y = oy;
      clampLabel(lab);
      if (choices.length && choices.some(c => labelHit(lab, c, padChoice))) lab.hide = true;
    }
    if (!lab.hide) placed.push({ x: lab.x, y: lab.y, w: lab.w, h: lab.h });
  }
  S._visibleLabels = [];
  S._upgradeBadges = [];
  S._choiceBtns = [];
  for (const lab of others) {
    if (lab.hide) continue;
    if (lab.kind === 'badge') {
      paintQueuedBadge(lab);
      if (lab.lead) S._upgradeBadges.push({ x: lab.x, y: lab.y, w: lab.w, h: lab.h, lead: lab.lead });
    } else {
      paintQueuedTag(lab);
    }
    S._visibleLabels.push({ x: lab.x, y: lab.y, w: lab.w, h: lab.h, kind: lab.kind || 'tag', txt: lab.txt || '' });
  }
  for (const lab of choices) {
    paintQueuedChoice(lab);
    S._choiceBtns.push({ x: lab.x, y: lab.y, w: lab.w, h: lab.h, b: lab.b, path: lab.path, locked: !!lab.locked, reason: lab.reason || '' });
    S._visibleLabels.push({ x: lab.x, y: lab.y, w: lab.w, h: lab.h, kind: 'choice', txt: lab.label || lab.path || '' });
  }
}
function nameTag(txt, x, y, size, col, accent) {
  const m = S.monarch;
  const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy), rad = 58;
  let fade = 1;
  if (d < rad) {
    if (d < 0.5) x += rad;
    else { x += dx / d * (rad - d); y += dy / d * (rad - d); }
    if (Math.hypot(x - m.x, y - m.y) < 26) fade = 0.28;
  }
  ctx.save();
  ctx.globalAlpha *= fade;
  placeTag(txt, x, y, size, col, accent);
  ctx.restore();
}
function drawFlag(x, y, fw, fh, flutter, color, skull) {
  const amp = flutter * 2.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + fw * 0.35, y + amp, x + fw * 0.7, y - amp * 0.8, x + fw, y + amp * 0.35);
  ctx.lineTo(x + fw * 0.96, y + fh + amp * 0.2);
  ctx.bezierCurveTo(x + fw * 0.62, y + fh - amp, x + fw * 0.3, y + fh + amp * 0.7, x, y + fh);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.beginPath();
  ctx.moveTo(x + fw * 0.42, y + 1);
  ctx.quadraticCurveTo(x + fw * 0.55, y + fh * 0.5, x + fw * 0.4, y + fh - 1);
  ctx.lineTo(x + fw * 0.55, y + fh - 1);
  ctx.quadraticCurveTo(x + fw * 0.68, y + fh * 0.45, x + fw * 0.55, y + 1);
  ctx.fill();
  if (skull) {
    const sx = x + fw * 0.55, sy = y + fh * 0.48 + amp * 0.1, r = fh * 0.28;
    disc(ctx, sx, sy, r, '#f4f1e4');
    disc(ctx, sx - r * 0.34, sy - r * 0.08, r * 0.22, '#243028');
    disc(ctx, sx + r * 0.34, sy - r * 0.08, r * 0.22, '#243028');
  } else {
    disc(ctx, x + fw * 0.55, y + fh * 0.5, fh * 0.16, '#f0c14a');
  }
}
function drawPennant(x, y, w, h, pale, phase) {
  ctx.fillStyle = pale ? '#3a4038' : '#5c4030';
  ctx.fillRect(x - 1, y, 2, h + 4);
  drawFlag(x + 1, y, w, h, Math.sin(S.t * 3.5 + phase), pale ? '#2c4034' : '#3e74c8', pale);
}
function flameAt(x, y, pale, seed) {
  const flick = 0.82 + Math.sin(S.t * 14 + seed) * 0.18;
  const spr = pale ? Art.flameG : Art.flame;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.translate(x, y);
  ctx.scale(flick, 0.85 + flick * 0.2);
  ctx.drawImage(spr.c, -6, -12, 12, 15);
  ctx.restore();
}
function flashAt(x, y, rx, ry, f) {
  if (!f || f <= 0) return;
  ctx.globalAlpha = Math.min(0.7, f * 6);
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTree(t) {
  const pale = S.regions[t.rid].owner === 'pale';
  const spr = pale ? Art.dead : Art.tree[t.v];
  shadow(t.x, t.y, 12 * t.s, 5.5 * t.s);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(Math.sin(S.t * 1.15 + t.ph) * (pale ? 0.015 : 0.045));
  ctx.scale(t.s, t.s);
  ctx.drawImage(spr.c, -spr.w / 2, -spr.gy, spr.w, spr.h);
  ctx.restore();
  if (t.marked) drawClearMark(t);
}
function drawRock(rk) {
  const spr = Art.rock[rk.v];
  shadow(rk.x, rk.y, 8 * rk.s, 3.5 * rk.s);
  blit(spr, rk.x, rk.y, { sc: rk.s });
  if (rk.marked) drawClearMark(rk);
}
function drawClearMark(o) {
  const lift = o.kind === 'rock' ? 22 : 36;
  const busy = S.folk.some(f => f.role === 'builder' && f.job === o && f.working);
  if (!busy) blit(Art.orderMark, o.x - 12, o.y + 2, { sc: 1 });
  // Small axe / pick (hammer tool sprite) — paid on the mark tap, no drop-coin sign.
  const ic = Art.tool && Art.tool.hammer;
  if (ic) ctx.drawImage(ic.c, o.x - 8, o.y - lift - 4, 16, 16);
  ctx.globalAlpha = 1;
  if ((o.prog || 0) > 0) bar(o.x, o.y + 10, 36, o.prog, '#8fd06a');
}
function gateOpen(b) {
  if (!b || b.owner === 'pale' || b.built < 1) return false;
  const r = (b.r || 16) + 28;
  if (dist(S.monarch, b) < r + 10) return true;
  for (const a of S.archers) if (dist(a, b) < r) return true;
  for (const f of S.folk) if (f.role !== 'vagrant' && dist(f, b) < r) return true;
  return false;
}
function buildingSpr(b) {
  const pale = b.owner === 'pale';
  if (!pale && !b.tool) {
    const spr = getSprite(spriteIdFor(b));
    if (spr) {
      if (b.type === 'gate' && gateOpen(b) && (b.level || 1) <= 1 && Art.gateO) return Art.gateO;
      return spr;
    }
  }
  if (b.type === 'wall') {
    const wood = (((b.x * 3 + b.y * 5) | 0) & 1) === 0;
    return pale ? (wood ? Art.wallWP : Art.wallSP) : (wood ? Art.wallW : Art.wallS);
  }
  if (b.type === 'gate') return pale ? Art.gateP : (gateOpen(b) ? Art.gateO : Art.gateC);
  if (b.tool) return Art.stand[b.tool] || Art.stand.bow;
  if (b.type === 'fort') return pale ? Art.fortP : Art.fort;
  if (b.type === 'house') return pale ? Art.houseP : (b.hp < b.max ? Art.houseDmg : Art.house);
  if (b.type === 'hall') return pale ? Art.hallP : (b.owner === 'rival' ? Art.hallR : (b.hp < b.max ? Art.hallDmg : Art.hall));
  if (b.type === 'farm') return pale ? Art.farm.pale : Art.farm.tilled;
  if (b.type === 'tower') return pale ? Art.towerP : Art.tower;
  return pale ? Art.towerP : Art.tower;
}
function drawScaffold(b) {
  const spr = buildingSpr(b);
  ctx.globalAlpha = 0.16 + 0.45 * b.built;
  blit(spr, b.x, b.y, { sc: (b.type === 'wall' || b.type === 'gate') ? 1.18 : 1 });
  ctx.globalAlpha = 1;
  const sc = b.type === 'farm' ? 0.72 : (b.type === 'wall' || b.type === 'gate') ? 0.78 : b.type === 'house' ? 0.92 : (b.tool ? 0.9 : 1);
  const stage = b.built < 0.33 ? 0 : b.built < 0.66 ? 1 : 2;
  shadow(b.x, b.y + 2, 16 * sc, 5);
  blit(Art.scaffold[stage], b.x, b.y + 2, { sc });
  const busy = S.folk.some(f => f.role === 'builder' && f.job === b && f.working);
  if (!busy && !b.demo) blit(Art.orderMark, b.x - 14 * sc, b.y + 2, { sc: 0.9 });
  bar(b.x, b.y + 10, 40, b.built, '#8fd06a');
  if (!S.folk.some(f => f.role === 'builder')) placeTag('Needs a Builder', b.x, b.y + 26, 11, '#ffe6b0', '#e6c27a', 'need');
  if (b.demo) drawDemoMark(b);
}
function drawDemoMark(b) {
  if (!b || !b.demo) return;
  const busy = S.folk.some(f => f.role === 'builder' && f.job === b && f.working);
  const lift = b.type === 'wall' || b.type === 'gate' ? 18 : b.type === 'farm' ? 22 : b.tool ? 28 : 30;
  if (Art.demoMark) blit(Art.demoMark, b.x + 10, b.y - lift + 16, { sc: 1.15 });
  // A second, larger X so the mark stays readable at phone distance / zoomed out.
  const s = 11;
  ctx.strokeStyle = '#7a2018'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(b.x - s, b.y - lift - s); ctx.lineTo(b.x + s, b.y - lift + s);
  ctx.moveTo(b.x + s, b.y - lift - s); ctx.lineTo(b.x - s, b.y - lift + s); ctx.stroke();
  ctx.strokeStyle = '#e15a4a'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(b.x - s, b.y - lift - s); ctx.lineTo(b.x + s, b.y - lift + s);
  ctx.moveTo(b.x + s, b.y - lift - s); ctx.lineTo(b.x - s, b.y - lift + s); ctx.stroke();
  if ((b.demoProg || 0) > 0) bar(b.x, b.y + 12, 40, b.demoProg, '#e15a4a');
  else if (!busy) { /* the red X is the mark — no extra text bubble */ }
}
function drawBuilding(b) {
  if (b.built < 1) return drawScaffold(b);
  if (b.tool) return drawStand(b);
  if (b.type === 'farm') {
    const pale = b.owner === 'pale';
    const worked = b.farmer && S.folk.includes(b.farmer);
    const prog = b.prog || 0;
    const tier = !pale && getSprite(spriteIdFor(b));
    const spr = pale ? Art.farm.pale : tier || ((worked && prog > TUNE.farmEvery * 0.55) ? Art.farm.ripe : (worked || prog > 0.8) ? Art.farm.growing : Art.farm.tilled);
    blit(spr, b.x, b.y + 6);
    if (b.hp < b.max) bar(b.x, b.y + 12, 36, b.hp / b.max, pale ? '#7dce6a' : '#e2a23a');
    if (b.upgGroup && b.upgGroup.prog > 0) bar(b.x, b.y + 20, 36, b.upgGroup.prog, '#8fd06a');
    if (!pale && !(b.farmer && S.folk.includes(b.farmer))) placeTag('Needs a Farmer', b.x, b.y + 22, 11, '#ffe6b0', '#e6c27a', 'need');
    if (b.demo) drawDemoMark(b);
    return;
  }
  const spr = buildingSpr(b);
  const pale = b.owner === 'pale';
  const sc = (b.type === 'wall' || b.type === 'gate') ? 1.18 : 1;
  shadow(b.x, b.y + 2, (b.type === 'fort' ? 24 : b.type === 'wall' || b.type === 'gate' || b.type === 'house' ? 17 : 14) * sc, (b.type === 'fort' ? 9 : 6) * sc);
  blit(spr, b.x, b.y, { sc });
  if (spr.flag) drawPennant(b.x + spr.flag.dx, b.y + spr.flag.dy, spr.flag.w, spr.flag.h, pale, b.x);
  if (spr.flames) for (const f of spr.flames) flameAt(b.x + f.dx, b.y + f.dy, pale, b.x);
  if (spr.smoke && !pale) {
    const u = (S.t * 0.35 + b.y) % 1;
    ctx.globalAlpha = 0.22 * (1 - u);
    ctx.drawImage(Art.smoke.c, b.x + spr.smoke.dx - 6, b.y + spr.smoke.dy - u * 16, 12, 12);
    ctx.globalAlpha = 1;
  }
  if (pale) {
    const ox = Math.sin(S.t * 0.8 + b.x) * 2;
    ctx.globalAlpha = 0.4;
    ctx.drawImage(Art.fog.c, b.x - 18 + ox, b.y - 8, 36, 18);
    ctx.globalAlpha = 1;
  }
  if (b.hp < b.max * 0.999) {
    ctx.strokeStyle = 'rgba(40,30,20,.65)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(b.x - 6, b.y - 16); ctx.lineTo(b.x - 1, b.y - 8); ctx.lineTo(b.x + 4, b.y - 12);
    ctx.stroke();
  }
  flashAt(b.x, b.y - 12, b.r * 0.7, b.r * 0.8, b.flash);
  if (b.hp < b.max) bar(b.x, b.y + 8, 36, b.hp / b.max, pale ? '#7dce6a' : '#e2a23a');
  if (b.upgGroup && b.upgGroup.prog > 0) bar(b.x, b.y + 16, 36, b.upgGroup.prog, '#8fd06a');
  if (b.demo) drawDemoMark(b);
}
function drawCore(k) {
  const x = k.x, y = k.y, keep = !!(k.keep || isPlayerKeep(k));
  const keepSpr = keep ? getSprite(spriteIdFor(k)) : null;
  if (keepSpr) {
    shadow(x, y + 2, k.r || 22, 8);
    blit(keepSpr, x, y);
    flashAt(x, y - 16, 12, 16, k.flash);
    bar(x, y + 12, 48, k.hp / k.max, '#5b93e0');
    if (k.upgGroup && k.upgGroup.prog > 0) bar(x, y + 20, 48, k.upgGroup.prog, '#8fd06a');
    return;
  }
  shadow(x, y + 2, keep ? 22 : 14, keep ? 8 : 5);
  if (keep) {
    ell(ctx, x + 2, y + 2, 26, 9, '#cbbda8');
    ell(ctx, x - 8, y + 1, 16, 6, '#e6dcc8');
    ctx.fillStyle = '#e7e0d2';
    ctx.fillRect(x - 20, y - 40, 26, 42);
    ctx.fillStyle = '#b7ad9e';
    ctx.fillRect(x + 2, y - 40, 6, 42);
    ctx.fillStyle = '#f4eee4';
    ctx.fillRect(x - 20, y - 48, 9, 10);
    ctx.fillRect(x - 8, y - 44, 8, 6);
    ctx.fillStyle = '#2a241c';
    ctx.fillRect(x - 14, y - 30, 3, 12);
    ctx.fillStyle = '#d06a45';
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 30); ctx.lineTo(x + 2, y - 38); ctx.lineTo(x + 6, y - 32); ctx.lineTo(x - 16, y - 24);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a34c30';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 38); ctx.lineTo(x + 6, y - 32); ctx.lineTo(x + 2, y - 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d4cbbd';
    ctx.fillRect(x + 10, y - 18, 16, 20);
    ctx.fillStyle = '#9e9486';
    ctx.fillRect(x + 22, y - 18, 5, 20);
    ell(ctx, x + 18, y + 1, 6, 3.2, '#b7ad9e');
    ell(ctx, x + 8, y + 3, 4, 2.4, '#ddd4c4');
    ell(ctx, x - 22, y + 2, 5, 2.6, '#a89e90');
    ell(ctx, x - 16, y - 18, 6, 4.5, '#5f8a3c');
    ell(ctx, x - 10, y - 28, 4, 3.2, '#8fbc5a');
    ctx.fillStyle = '#5c4030';
    ctx.fillRect(x - 16, y - 64, 2.6, 18);
    drawFlag(x - 13.4, y - 62, 22, 12, Math.sin(S.t * 3.2 + x), '#3e74c8', false);
    disc(ctx, x - 14.8, y - 64, 2.3, '#f0c14a');
    flameAt(x + 16, y - 20, false, y);
  } else {
    ell(ctx, x, y + 1, 12, 5, '#cbb892');
    ell(ctx, x - 2, y, 8, 3.4, '#e6d3a8');
    ell(ctx, x - 9, y, 3, 2, '#b7ad9e');
    ell(ctx, x + 8, y + 1, 2.6, 1.8, '#d9d0c2');
    ctx.fillStyle = '#a56b3e';
    ctx.fillRect(x + 9, y - 8, 8, 6);
    ctx.fillStyle = '#6e4328';
    ctx.fillRect(x + 9, y - 6, 8, 1.3);
    ctx.fillStyle = '#5c4030';
    ctx.fillRect(x - 1.3, y - 40, 2.6, 40);
    const flagCol = k.contested ? '#e8a83a' : '#3e74c8';
    drawFlag(x + 1.3, y - 38, 16, 10, Math.sin(S.t * 3.4 + y), flagCol, false);
    disc(ctx, x, y - 40, 2.1, '#f0c14a');
    flameAt(x - 10, y - 4, false, x);
    if (k.contested) {
      ctx.save();
      ctx.globalAlpha = 0.45 + Math.sin(S.t * 3.2) * 0.2;
      ctx.strokeStyle = '#f0c14a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y + 2, 22 + Math.sin(S.t * 2.4) * 3, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  flashAt(x, y - 16, 12, 16, k.flash);
  bar(x, y + 12, 48, k.hp / k.max, '#5b93e0');
}
function drawMonarch() {
  const m = S.monarch;
  if (Math.cos(m.face) > 0.3) m._flip = false; else if (Math.cos(m.face) < -0.3) m._flip = true;
  const mv = Math.hypot(m.vx, m.vy);
  const moving = mv > 20 || Math.hypot(m.x - (m._px == null ? m.x : m._px), m.y - (m._py == null ? m.y : m._py)) > 0.4;
  m._px = m.x; m._py = m.y;
  const fr = moving ? ((S.t * 8) | 0) & 1 : 0;
  const bob = Math.sin(S.t * (moving ? 10 : 2.2)) * (moving ? 1.1 : 0.5);
  ctx.globalAlpha = 0.22 + Math.sin(S.t * 2) * 0.05;
  ctx.fillStyle = '#f0c14a';
  ctx.beginPath(); ctx.ellipse(m.x, m.y + 2, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  shadow(m.x, m.y + 4, 18, 7);
  blit(Art.monarch[fr], m.x, m.y + 6, { flip: !!m._flip, bob, sc: 1.16 });
  flashAt(m.x, m.y - 10, 14, 16, m.flash);
}
function drawArcher(a) {
  const mot = actorMotion(a);
  const set = a.follow ? Art.archerRally : Art.archer;
  const fr = mot.walking ? 1 + (mot.fr & 1) : 0;
  shadow(a.x, a.y + 3, 8, 3.4);
  blit(set[fr], a.x, a.y + 4, { flip: mot.flip, bob: mot.bob });
  flashAt(a.x, a.y - 8, 8, 10, a.flash);
}
function drawFolk(f) {
  const mot = actorMotion(f);
  const set = Art.folk[f.role] || Art.folk.villager;
  let idx = mot.walking ? 1 + (mot.fr & 1) : 0;
  if (f.working && (f.role === 'builder' || f.role === 'farmer' || f.role === 'miner')) idx = 3 + ((S.t * (f.role === 'builder' ? 8 : f.role === 'miner' ? 7 : 6)) | 0) % 3;
  else if (f.role === 'villager' && f.stand && Math.hypot(f.x - f.stand.x, f.y - f.stand.y) < 24) idx = 3;
  let bob = mot.bob;
  if (f.working && f.role === 'builder') bob += Math.abs(Math.sin(S.t * 9)) * -1.2;
  shadow(f.x, f.y + 3, 8, 3.4);
  blit(set[idx] || set[0], f.x, f.y + 4, { flip: mot.flip, bob });
  if (f.working && f.role === 'builder' && ((S.t * 3) | 0) % 2 === 0 && Math.sin(S.t * 9) > 0.9) S.fx.push({ k: 'hit', x: f.x + (mot.flip ? -12 : 12), y: f.y - 6, t: 0.15, t0: 0.15 });
  flashAt(f.x, f.y - 8, 8, 10, f.flash);
}
function drawStand(st) {
  if (!st) return;
  if (st.built < 1) return drawScaffold(st);
  shadow(st.x, st.y + 2, 18, 5);
  blit(Art.stand[st.tool] || Art.stand.bow, st.x, st.y);
  const ic = Art.tool[st.tool];
  const n = rackedToolCount(st);
  // One tool sprite per stocked item, hanging on the rack. Empty stand = bare rack; no count bubble.
  if (ic && n) {
    const w = 16, h = 18, gap = 13;
    const x0 = st.x - ((n - 1) * gap) / 2 - w / 2;
    const y = st.y - 31;
    for (let i = 0; i < n; i++) ctx.drawImage(ic.c, x0 + i * gap, y, w, h);
  }
  st._racked = n;
  const c = toolStockCost(st.tool);
  if (st.paid > 0) for (let i = 0; i < c; i++) {
    ctx.globalAlpha = i < st.paid ? 1 : 0.3;
    ctx.drawImage(Art.coin.c, st.x - (c * 9) / 2 + i * 9, st.y - 46, 9, 9);
  }
  ctx.globalAlpha = 1;
  if (st.demo) drawDemoMark(st);
}
function drawClearBadge(o) {
  if (!o || !o.marked) return;
  const p = w2s(o.x, o.y - (o.kind === 'rock' ? 26 : 46));
  const cost = clearCost(o), paid = o.paid || 0, done = paid >= cost;
  const n = o.kind === 'rock' ? TUNE.rockCoin : TUNE.treeCoin;
  const size = 16, pad = 7, ih = 16;
  const txt = done ? '+' + n : (paid + '/' + cost);
  ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(txt).width;
  const w = pad + ih + 5 + tw + pad, h = 24;
  const x = Math.round(p.x - w / 2), y = Math.round(p.y - h / 2);
  if (y + h < TOP_CHROME - 4 || y > vh - BOT_CHROME + 4 || x + w < 4 || x > vw - 4) return;
  rrPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(28,20,14,.88)';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = done ? '#8ee0b0' : '#f0c14a';
  ctx.stroke();
  if (Art.coin) ctx.drawImage(Art.coin.c, x + pad, y + (h - ih) / 2, ih, ih);
  ctx.fillStyle = done ? '#e9fff2' : '#fff6e4';
  ctx.fillText(txt, x + pad + ih + 5, y + h / 2 + 0.5);
}
function drawWallGhosts() {
  if (!wallDrag || !S) return;
  const plan = planWallLine(wallDrag.x0, wallDrag.y0, wallDrag.x1, wallDrag.y1);
  wallDrag.plan = plan;
  const spr = Art.wallS;
  for (const pt of plan) {
    ctx.save();
    ctx.globalAlpha = pt.ok ? 0.55 : 0.28;
    ctx.translate(pt.x, pt.y);
    ctx.drawImage(spr.c, -spr.w / 2, -spr.gy, spr.w, spr.h);
    ctx.restore();
    if (!pt.ok) {
      ctx.strokeStyle = 'rgba(255,100,80,.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(pt.x, pt.y - 8, 10, 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (plan.length) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,193,74,.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(wallDrag.x0, wallDrag.y0); ctx.lineTo(wallDrag.x1, wallDrag.y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawBannerSite(site) {
  const x = site.x, y = site.y;
  const pulse = 0.55 + Math.sin(S.t * 2.8) * 0.2;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = '#f0c14a';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.ellipse(x, y + 2, 26, 11, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  ell(ctx, x, y + 1, 12, 5, '#cbb892');
  ell(ctx, x - 2, y, 8, 3.4, '#e6d3a8');
  ctx.fillStyle = '#5c4030';
  ctx.fillRect(x - 1.3, y - 36, 2.6, 36);
  ctx.globalAlpha = 0.35 + Math.sin(S.t * 2.2) * 0.1;
  drawFlag(x + 1.3, y - 34, 14, 8, Math.sin(S.t * 2.2 + y), '#c9b488', false);
  ctx.globalAlpha = 1;
  disc(ctx, x, y - 36, 2.1, '#f0c14a');
  placeTag('Plant a banner', x, y + 22, 12, '#fff6e4', '#e6c27a', 'site');
}
function drawMine(m) {
  if (!m) return;
  const working = !!minerAtMine(m);
  const id = 'mine-' + m.kind + (working ? '-working' : '-idle');
  const spr = getSprite(id);
  shadow(m.x, m.y + 2, 20, 7);
  if (spr) blit(spr, m.x, m.y);
  const r = S.regions[m.region];
  const owned = !!(r && r.owner === 'player');
  const label = (m.kind === 'stone' ? 'Stone' : 'Iron') + ' mine' + (working ? ' — working' : owned ? ' — no miner' : ' — wild');
  placeTag(label, m.x, m.y + 22, 11, working ? '#d6ffb0' : '#ffe6b0', working ? '#8fd06a' : '#e6c27a', 'mine');
}
function nearbyUpgradeTargets() {
  if (!S || !S.monarch) return [];
  const range = TUNE.upgradeMarkRange || 170;
  const m = S.monarch;
  const seen = new Set();
  const out = [];
  const consider = [];
  for (const b of S.buildings) {
    if (b.owner !== 'player' || b.built < 1 || b.tool || b.demo) continue;
    if (isStandType(b.type)) continue;
    consider.push(b);
  }
  for (const r of owned()) if (r.core && isPlayerKeep(r.core)) consider.push(r.core);
  for (const b of consider) {
    if (dist(b, m) > range + (b.r || 16)) continue;
    const members = upgradeMembers(b);
    const lead = members[0];
    if (!lead || seen.has(lead) || (lead.upgGroup && seen.has(lead.upgGroup))) continue;
    seen.add(lead);
    if (lead.upgGroup) seen.add(lead.upgGroup);
    const cx = members.reduce((s, o) => s + o.x, 0) / members.length;
    const cy = members.reduce((s, o) => s + o.y, 0) / members.length;
    out.push({ lead, members, x: cx, y: cy });
  }
  return out;
}
function queueUpgradeBadge(wx, wy, paid, cost, locked, reason, lead, extra) {
  const p = w2s(wx, wy);
  const size = 16, pad = 7, ih = 16;
  const txt = locked ? (reason || 'Locked') : ((paid || 0) + '/' + cost);
  ctx.font = `800 ${locked ? 13 : size}px "Segoe UI", system-ui, sans-serif`;
  const tw = ctx.measureText(txt).width;
  const iconW = locked || Art.coin ? ih : 0;
  const w = pad + iconW + (iconW ? 5 : 0) + tw + pad, h = 24;
  const x = Math.round(clamp(p.x - w / 2, 6, vw - w - 6));
  const y = Math.round(clamp(p.y - h / 2, TOP_CHROME + 6, vh - BOT_CHROME - h - 6));
  queueLabel(Object.assign({ kind: 'badge', txt, x, y, w, h, paid, cost, locked, reason, lead }, extra || {}));
}
function drawUpgradeBadge(wx, wy, paid, cost, locked, reason, lead) {
  queueUpgradeBadge(wx, wy, paid, cost, locked, reason, lead);
}
function drawTowerPathButtons(lead, wx, wy, gate) {
  const p = w2s(wx, wy);
  const bw = 136, bh = 58, gap = 12;
  let x0 = p.x - (bw * 2 + gap) / 2;
  let y0 = p.y - bh / 2;
  x0 = clamp(x0, 8, vw - (bw * 2 + gap) - 8);
  y0 = clamp(y0, TOP_CHROME + 8, vh - BOT_CHROME - bh - 8);
  const locked = !!(gate && !gate.ok && gate.lock !== 'path');
  const reason = locked ? gate.reason : '';
  if (reason) {
    // Keep the lock reason with the choice, stacked above the buttons — not over them.
    queueUpgradeBadge(wx, wy, 0, 0, true, reason, lead, { keepWithChoice: true });
    const q = S._labelQ[S._labelQ.length - 1];
    if (q) q.y = Math.round(clamp(y0 - q.h - 8, TOP_CHROME + 2, vh - BOT_CHROME - q.h - 2));
  }
  const paths = [
    { path: 'cannon', label: 'Cannon', sub: 'Slow area damage' },
    { path: 'ballista', label: 'Ballista', sub: 'Long range, pierces' },
  ];
  for (let i = 0; i < 2; i++) {
    const x = x0 + i * (bw + gap), y = y0;
    const pathLock = optionLocked('upgrade-tower-' + paths[i].path);
    queueLabel({ kind: 'choice', x, y, w: bw, h: bh, b: lead, path: paths[i].path, label: paths[i].label, sub: paths[i].sub, locked: !!locked || pathLock, reason: pathLock ? 'God of Choice locked this path' : reason });
  }
}
function drawUpgradeChrome() {
  return; // v22: upgrades and lock reasons live on the building screen, not the map
  if (!S || S.over || S.build) return;
  for (const t of nearbyUpgradeTargets()) {
    const lead = t.lead;
    const g = lead.upgGroup;
    const lift = lead.type === 'wall' || lead.type === 'gate' ? 28 : (lead.type === 'core' ? 70 : lead.type === 'farm' ? 40 : 52);
    if (g && g.prog > 0) continue;
    const needPath = lead.type === 'tower' && (lead.level || 1) === 1 && !lead.path;
    if (needPath) {
      const gate = upgradeNeed({ type: lead.type, level: lead.level, path: 'cannon', _pickPath: 'cannon' });
      drawTowerPathButtons(lead, t.x, t.y - lift, gate);
      continue;
    }
    if (g && g.paid > 0) {
      drawUpgradeBadge(t.x, t.y - lift, g.paid, g.cost, false, '', lead);
      continue;
    }
    const need = upgradeNeed(lead);
    if (!need.ok) {
      if (need.lock === 'max') continue;
      drawUpgradeBadge(t.x, t.y - lift, 0, 0, true, need.reason, lead);
      continue;
    }
    drawUpgradeBadge(t.x, t.y - lift, 0, need.cost, false, '', lead);
  }
}
function drawWallCostBadge() {
  if (!wallDrag || !wallDrag.plan) return;
  const plan = wallDrag.plan;
  const n = plan.filter(pt => pt.ok).length;
  const cost = n * buildCost('wall'), afford = S.coins >= cost && n > 0;
  const mid = plan[plan.length >> 1] || plan[0];
  const p = w2s(mid.x, mid.y - 36);
  const txt = n ? (n + ' wall' + (n === 1 ? '' : 's') + ' · ' + cost + ' coins') : (plan[0].why || 'Cannot place');
  ctx.font = '800 16px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(txt).width, w = tw + 22, h = 26;
  const x = clamp(p.x, 16 + w / 2, vw - 16 - w / 2), y = clamp(p.y, TOP_CHROME + 18, vh - BOT_CHROME - 18);
  rrPath(ctx, x - w / 2, y - h / 2, w, h, 10);
  ctx.fillStyle = 'rgba(28,20,14,.9)'; ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = afford ? '#8ee0b0' : '#ff8d7a'; ctx.stroke();
  ctx.fillStyle = afford ? '#e9fff2' : '#ffe8e2';
  ctx.fillText(txt, x, y + 0.5);
}
function drawDrop(d) {
  const s = 1 - Math.min(0.5, d.z / 80);
  shadow(d.x, d.y + 1, 5 * s, 2.2 * s);
  const frames = Art.coinFrames || [Art.coin];
  const fi = d.landed ? 0 : ((d.age * 12) | 0) % frames.length;
  const spr = frames[fi];
  ctx.drawImage(spr.c, d.x - 6, d.y - 12 - d.z, 12, 12);
  if (d.landed) {
    const pulse = 0.35 + Math.sin(S.t * 5 + d.x) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.drawImage(Art.shimmer.c, d.x - 5, d.y - 16, 10, 10);
    ctx.globalAlpha = 1;
  }
}
function drawCamp(c) {
  shadow(c.x, c.y + 2, 26, 7);
  blit(Art.camp, c.x, c.y);
  flameAt(c.x + Art.camp.fire.dx, c.y + Art.camp.fire.dy, false, c.x);
}
function drawGuardian(g) {
  const w = g.kind === 'warden';
  const mot = actorMotion(g);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = w ? '#b7e0a8' : '#e07a68';
  ctx.beginPath(); ctx.ellipse(g.x, g.y + 2, g.r + 4, g.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  shadow(g.x, g.y + 4, w ? 18 : 15, 6.5);
  const spr = (w ? Art.warden : Art.guardian)[mot.fr];
  const sc = w ? 1.14 : 1.05;
  blit(spr, g.x, g.y + 4, { flip: mot.flip, bob: mot.bob, sc });
  flashAt(g.x, g.y - 12, 12, 16, g.flash);
  bar(g.x, g.y + 4 - spr.gy * sc - 6, 52, g.hp / g.max, '#e15a4a');
}
function undeadFrame(u, walking) {
  if (!walking) return 0;
  const rate = u.kind === 'skeleton' ? 9 : u.kind === 'necro' ? 5.5 : 7;
  return ((S.t * rate + u.x * 0.37) | 0) & 3;
}
function undeadSet(u) {
  return u.kind === 'necro' ? Art.necro : u.kind === 'skeleton' ? Art.skeleton : Art.shambler;
}
function drawUndead(u) {
  const mot = actorMotion(u);
  const fr = undeadFrame(u, mot.walking);
  const bob = mot.walking ? Math.sin(S.t * (u.kind === 'skeleton' ? 12 : 8) + u.y) * 0.8 : Math.sin(S.t * 2 + u.x) * 0.45;
  u._fr = fr;
  u._visBob = bob;
  const spr = undeadSet(u)[fr] || undeadSet(u)[0];
  if (u.kind === 'necro') {
    ctx.save();
    ctx.translate(u.x, u.y + 3);
    const live = !S.chaos;
    ctx.strokeStyle = live ? 'rgba(186,150,255,.8)' : 'rgba(180,180,170,.4)';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 6.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = live ? 'rgba(236,220,255,.9)' : 'rgba(210,210,200,.45)';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11.5, 4.3, S.t * 0.7, 0, Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();
    const pulse = 0.92 + Math.sin(S.t * 3 + u.x) * 0.08;
    ctx.globalAlpha = 0.5;
    const gw = 34 * pulse;
    ctx.drawImage(Art.undeadGlow.necro.c, u.x - gw / 2, u.y - 30, gw, gw);
    ctx.globalAlpha = 1;
  }
  shadow(u.x + 1.5, u.y + 3, u.kind === 'necro' ? 12 : u.kind === 'skeleton' ? 8 : 10, u.kind === 'necro' ? 4.3 : 3.3);
  // Once night has settled, drawUndeadRims redraws the sprite above the veil.
  const lift = S.nightK < 0.92;
  if (lift) {
    blit(spr, u.x, u.y + 3, { flip: mot.flip, bob });
    if (u.kind === 'necro' && spr.orb && Art.necroOrb) {
      const pulse = 0.8 + Math.sin(S.t * 5 + u.x) * 0.2;
      const ox = mot.flip ? -spr.orb.dx : spr.orb.dx;
      const size = 18 * pulse;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(Art.necroOrb.c, u.x + ox - size / 2, u.y + 3 + bob + spr.orb.dy - size / 2, size, size);
      ctx.globalAlpha = 1;
    }
  }
  if (u.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.9, u.flash * 7.5);
    blit(spr, u.x, u.y + 3, { flip: mot.flip, bob });
    ctx.restore();
  }
  if (u.hp < u.max) bar(u.x, u.y + 3 - spr.gy - 6, u.kind === 'necro' ? 32 : 26, u.hp / u.max, '#e15a4a');
}
function drawReed(r) {
  const pale = S.regions[r.rid].owner === 'pale';
  const lean = Math.sin(S.t * 1.5 + r.ph) * 2.4;
  ctx.strokeStyle = pale ? '#8b9278' : (r.h > 12 ? '#5e8634' : '#7aa24a');
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y);
  ctx.quadraticCurveTo(r.x + lean * 0.6, r.y - r.h * 0.55, r.x + lean, r.y - r.h);
  ctx.moveTo(r.x, r.y);
  ctx.quadraticCurveTo(r.x - 1.2, r.y - r.h * 0.4, r.x - 2 + lean * 0.3, r.y - r.h * 0.78);
  ctx.stroke();
}
function drawFxItem(f) {
  const t0 = f.t0 || Math.max(0.05, f.t);
  const u = clamp(1 - f.t / t0, 0, 1);
  if (f.k === 'arrow') {
    const x = f.x + (f.tx - f.x) * u, y = f.y + (f.ty - f.y) * u;
    const ang = Math.atan2(f.ty - f.y, f.tx - f.x);
    const bx = f.x + (f.tx - f.x) * Math.max(0, u - 0.28), by = f.y + (f.ty - f.y) * Math.max(0, u - 0.28);
    ctx.save();
    ctx.globalAlpha = f.bolt ? 0.6 : 0.85;
    ctx.strokeStyle = f.c || '#fff1c2';
    ctx.lineWidth = f.bolt ? 3.4 : 2.8;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.translate(x, y); ctx.rotate(ang);
    if (f.spr && f.spr.c) {
      ctx.drawImage(f.spr.c, -f.spr.w / 2, -f.spr.h / 2, f.spr.w, f.spr.h);
    } else if (f.bolt) {
      ctx.fillStyle = f.c || '#c6ff8a';
      ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4fff0';
      ctx.beginPath(); ctx.arc(-1, 0, 1.7, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#fff6e0';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.fillStyle = f.c || '#e8eef2';
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -2.5); ctx.lineTo(2, 2.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c4473a';
      ctx.fillRect(-9, -1.7, 2.6, 3.4);
    }
    ctx.restore();
  } else if (f.k === 'slash') {
    const ang = Math.atan2(f.ty - f.y, f.tx - f.x);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.strokeStyle = `rgba(255,236,190,${1 - u})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 22, ang - 1.2 + u * 1.4, ang + 0.15 + u * 1.4); ctx.stroke();
    ctx.strokeStyle = `rgba(240,193,74,${0.8 * (1 - u)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 16, ang - 0.8 + u, ang + 0.3 + u); ctx.stroke();
    ctx.restore();
  } else if (f.k === 'hit') {
    ctx.save();
    ctx.translate(f.x, f.y - 4);
    ctx.rotate(u);
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, r = i % 2 ? 3 : 11 + u * 8;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (f.k === 'puff') {
    const n = f.big ? 8 : 5, rad = (f.big ? 34 : 16) * (0.25 + u);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + f.x;
      const px = f.x + Math.cos(a) * rad, py = f.y + Math.sin(a) * rad * 0.62 - u * 10;
      ctx.globalAlpha = (1 - u) * 0.75;
      ctx.fillStyle = i % 2 ? '#f4ecdf' : '#d9cbb0';
      ctx.beginPath(); ctx.arc(px, py, (f.big ? 5 : 3.2) * (1.15 - u * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (f.k === 'coins') {
    const n = f.n >= 10 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55;
      const d = 18 * Math.sin(Math.min(1, u) * Math.PI);
      const px = f.x + Math.cos(a) * d, py = f.y - u * 28 + Math.sin(a) * 3;
      ctx.globalAlpha = u < 0.72 ? 1 : (1 - u) / 0.28;
      ctx.drawImage(Art.coin.c, px - 5, py - 5, 10, 10);
    }
    ctx.globalAlpha = 1;
    if (f.n >= 10) placeTag('+' + f.n, f.x, f.y - 26 - u * 12, 12, '#ffd56a', '#e6c27a', 'loot');
  } else if (f.k === 'txt') {
    ctx.globalAlpha = u < 0.7 ? 1 : (1 - u) / 0.3;
    ctx.font = '900 17px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(28,20,14,.9)';
    ctx.strokeText(f.txt, f.x, f.y - u * 26);
    ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y - u * 26);
    ctx.globalAlpha = 1;
  } else if (f.k === 'cfly') {
    const x = f.x + (f.tx - f.x) * u, y = f.y + (f.ty - f.y) * u - Math.sin(u * Math.PI) * 26;
    ctx.drawImage(Art.coin.c, x - 6, y - 12, 12, 12);
  } else if (f.k === 'burst') {
    const col = f.bad ? '186, 196, 170' : '240, 193, 74';
    const col2 = f.bad ? '120, 150, 110' : '70, 120, 200';
    ctx.save();
    ctx.globalAlpha = 1 - u;
    ctx.lineWidth = 3 * (1 - u + 0.25);
    ctx.strokeStyle = `rgba(${col},1)`;
    ctx.beginPath(); ctx.arc(f.x, f.y, 14 + u * 78, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(${col2},.9)`;
    ctx.beginPath(); ctx.arc(f.x, f.y, 8 + u * 48, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(${col},.85)`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + u;
      ctx.beginPath();
      ctx.moveTo(f.x + Math.cos(a) * (12 + u * 18), f.y + Math.sin(a) * (12 + u * 18));
      ctx.lineTo(f.x + Math.cos(a) * (20 + u * 84), f.y + Math.sin(a) * (20 + u * 84));
      ctx.stroke();
    }
    ctx.restore();
  }
}

const lightList = [];
let lightKey = '';
function gatherLights() {
  lightList.length = 0;
  lightList.push({ x: S.monarch.x, y: S.monarch.y, r: 168, pale: false });
  for (const r of S.regions) {
    if (r.core && (r.owner === 'player' || r.owner === 'contested')) lightList.push({ x: r.core.x, y: r.core.y - 8, r: r.core.keep ? 128 : 108, pale: false });
    else if (r.owner === 'pale') lightList.push({ x: r.x, y: r.y, r: 90, pale: true });
  }
  for (const b of S.buildings) if (b.built >= 1 && b.type !== 'wall' && b.type !== 'farm') lightList.push({ x: b.x, y: b.y - 12, r: b.type === 'fort' ? 118 : 92, pale: b.owner === 'pale' });
  for (const u of S.undead) if (u.kind === 'necro') lightList.push({ x: u.x, y: u.y, r: 78, pale: true });
  return lightList;
}
function drawNight() {
  const k = S.nightK;
  if (k < 0.025) return;
  const lw = Math.max(1, (vw * 0.5) | 0), lh = Math.max(1, (vh * 0.5) | 0);
  if (!lightCv || lightCv.width !== lw || lightCv.height !== lh) {
    lightCv = document.createElement('canvas');
    lightCv.width = lw; lightCv.height = lh;
    lightCtx = lightCv.getContext('2d');
    lightKey = '';
  }
  const lights = gatherLights();
  const cam = camera();
  const q = v => (v * 0.25) | 0;
  let key = ((k * 16) | 0) + ':' + lw + ':' + q(cam.x) + ':' + q(cam.y);
  for (let i = 0; i < lights.length; i++) key += ':' + q(lights[i].x) + ',' + q(lights[i].y) + (lights[i].pale ? 'p' : '');
  if (key !== lightKey) {
    lightKey = key;
    const g = lightCtx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, lw, lh);
    g.fillStyle = `rgba(22,18,74,${(0.64 * k).toFixed(3)})`;
    g.fillRect(0, 0, lw, lh);
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = Math.min(1, 0.45 + k * 0.4);
    const inv = 0.5;
    for (let i = 0; i < lights.length; i++) {
      const L = lights[i];
      const p = w2s(L.x, L.y);
      const rad = L.r * scale * inv;
      g.drawImage(Art.light.c, p.x * inv - rad, p.y * inv - rad, rad * 2, rad * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(lightCv, 0, 0, vw, vh);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lights2 = lightList;
  for (let i = 0; i < lights2.length; i++) {
    const L = lights2[i];
    const p = w2s(L.x, L.y);
    const rad = L.r * 0.42 * scale;
    ctx.globalAlpha = 0.2 * k;
    ctx.drawImage(L.pale ? Art.glowG.c : Art.glow.c, p.x - rad, p.y - rad, rad * 2, rad * 2);
  }
  ctx.restore();
}
function drawUndeadRims() {
  const k = S.nightK;
  if (k < 0.12 || !S.undead.length) return;
  const a = Math.min(1, k);
  const list = [];
  for (const u of S.undead) if (vis(u.x, u.y)) list.push(u);
  list.sort((p, q) => p.y - q.y);
  for (const u of list) {
    const spr = undeadSet(u)[u._fr | 0] || undeadSet(u)[0];
    const bob = u._visBob || 0;
    const feet = w2s(u.x, u.y + 3 + bob);
    const glow = (Art.undeadGlow && Art.undeadGlow[u.kind]) || Art.undeadGlow.shambler;
    const hs = (u.kind === 'necro' ? 58 : 40) * scale;
    ctx.save();
    ctx.translate(feet.x, feet.y);
    if (u._flip) ctx.scale(-1, 1);
    ctx.globalAlpha = (u.kind === 'necro' ? 0.7 : 0.36) * a;
    ctx.drawImage(glow.c, -hs * 0.5, -spr.gy * scale * 0.55 - hs * 0.28, hs, hs);
    ctx.globalAlpha = a;
    ctx.drawImage(spr.c, -spr.w * scale / 2, -spr.gy * scale, spr.w * scale, spr.h * scale);
    if (u.kind === 'necro' && spr.orb && Art.necroOrb) {
      const pulse = 0.82 + Math.sin(S.t * 5 + u.x) * 0.18;
      const size = 20 * pulse * scale;
      ctx.globalAlpha = 0.95 * a;
      ctx.drawImage(Art.necroOrb.c, spr.orb.dx * scale - size / 2, spr.orb.dy * scale - size / 2, size, size);
    }
    if (u.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.9, u.flash * 7.5);
      ctx.drawImage(spr.c, -spr.w * scale / 2, -spr.gy * scale, spr.w * scale, spr.h * scale);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawEdgeArrow(ex, ey, ang, fill) {
  ctx.save();
  ctx.translate(ex, ey); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -9); ctx.lineTo(-3, 0); ctx.lineTo(-8, 9); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff6e4'; ctx.stroke();
  ctx.restore();
}
function edgeOf(wx, wy) {
  const p = w2s(wx, wy);
  const on = p.x > 18 && p.x < vw - 18 && p.y > TOP_CHROME && p.y < vh - BOT_CHROME;
  const cx = vw / 2, cy = vh / 2, ang = Math.atan2(p.y - cy, p.x - cx);
  return {
    on, ang,
    ex: clamp(cx + Math.cos(ang) * (vw * 0.5), 26, vw - 26),
    ey: clamp(cy + Math.sin(ang) * (vh * 0.5), TOP_CHROME + 14, vh - BOT_CHROME - 8),
  };
}

function render() {
  if (!S) return;
  beginLabels();
  if (S.mapDirty) redrawMap();
  beginView();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#3e4a2e';
  ctx.fillRect(0, 0, vw, vh);
  const c = camera();
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (vw / 2 - c.x * scale), dpr * (vh / 2 - c.y * scale));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(groundCv, 0, 0, W, H);
  ctx.drawImage(mapCv, 0, 0, W, H);
  for (const p of S.ponds) if (vis(p.x, p.y)) {
    const hx = p.x - p.rx * 0.22 + Math.sin(S.t * 0.7 + p.x) * 5;
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath(); ctx.ellipse(hx, p.y - p.ry * 0.28, p.rx * 0.2, p.ry * 0.12, p.rot, 0, Math.PI * 2); ctx.fill();
  }
  for (const r of S.reeds) if (vis(r.x, r.y)) drawReed(r);
  for (const r of S.regions) if (r.owner === 'pale' && vis(r.x, r.y)) {
    const ox = Math.sin(S.t * 0.22 + r.id) * 26, oy = Math.cos(S.t * 0.18 + r.id * 2) * 16;
    ctx.globalAlpha = 0.72;
    ctx.drawImage(Art.fog.c, r.x - 170 + ox, r.y - 100 + oy, 340, 200);
    ctx.drawImage(Art.fog.c, r.x - 50 - ox * 0.6, r.y + 16, 230, 140);
    ctx.globalAlpha = 1;
  }
  for (const r of S.regions) if (r.owner === 'contested' && vis(r.x, r.y)) {
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(S.t * 2.1 + r.id) * 0.06;
    ctx.fillStyle = '#f0c14a';
    ctx.beginPath(); ctx.ellipse(r.x, r.y + 6, 120, 78, r.id * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  pileN = 0;
  for (const t of S.trees) if (vis(t.x, t.y)) pushP(t.y, 'tree', t);
  for (const rk of S.rocks) if (vis(rk.x, rk.y)) pushP(rk.y, 'rock', rk);
  for (const b of S.buildings) if (vis(b.x, b.y) && !b.tool) pushP(b.type === 'farm' && b.built >= 1 ? b.y - 30 : b.y, 'bld', b);
  for (const st of S.stands) if (vis(st.x, st.y)) pushP(st.y, 'stand', st);
  for (const r of S.regions) if (r.core && vis(r.x, r.y)) pushP(r.core.y, 'core', r.core);
  for (const z of WORLD.zones.values()) if (z._banner && vis(z._banner.x, z._banner.y)) pushP(z._banner.y, 'core', z._banner);
  for (const r of S.regions) if (isClaimable(r) && vis(r.x, r.y)) pushP(r.y + 0.2, 'site', bannerSiteOf(r));
  for (const g of S.guardians) if (vis(g.x, g.y)) pushP(g.y, 'guard', g);
  for (const a of S.archers) if (vis(a.x, a.y)) pushP(a.y, 'arch', a);
  for (const f of S.folk) if (vis(f.x, f.y)) pushP(f.y, 'folk', f);
  for (const d of S.drops) if (vis(d.x, d.y)) pushP(d.y + 0.5, 'drop', d);
  if (S.camp && vis(S.camp.x, S.camp.y)) pushP(S.camp.y, 'camp', S.camp);
  for (const u of S.undead) if (vis(u.x, u.y)) pushP(u.y, 'und', u);
  for (const mine of (S.mines || [])) if (vis(mine.x, mine.y)) pushP(mine.y, 'mine', mine);
  pushP(S.monarch.y, 'mon', S.monarch);
  for (let i = 1; i < pileN; i++) {
    const it = pile[i]; let j = i - 1;
    while (j >= 0 && pile[j].y > it.y) { pile[j + 1] = pile[j]; j--; }
    pile[j + 1] = it;
  }
  for (let i = 0; i < pileN; i++) {
    const it = pile[i];
    try {
      if (it.k === 'tree') drawTree(it.a);
      else if (it.k === 'rock') drawRock(it.a);
      else if (it.k === 'bld') drawBuilding(it.a);
      else if (it.k === 'core') drawCore(it.a);
      else if (it.k === 'site') drawBannerSite(it.a);
      else if (it.k === 'guard') drawGuardian(it.a);
      else if (it.k === 'arch') drawArcher(it.a);
      else if (it.k === 'und') drawUndead(it.a);
      else if (it.k === 'folk') drawFolk(it.a);
      else if (it.k === 'stand') drawStand(it.a);
      else if (it.k === 'drop') drawDrop(it.a);
      else if (it.k === 'mine') drawMine(it.a);
      else if (it.k === 'camp') drawCamp(it.a);
      else drawMonarch();
    } catch (err) {
      try { ctx.restore(); } catch (_) {}
      if (!S._drawErr) { S._drawErr = String(err); console.error('draw error', it.k, err); }
    }
  }

  for (const r of S.regions) if (vis(r.x, r.y)) {
    let st = r.owner === 'player' ? 'YOURS' : r.owner === 'contested' ? 'CONTESTED' : r.owner === 'pale' ? 'PALE HOST' : r.owner === 'rival' ? ((r.worldOwnerName || 'RIVAL') + (r.gov ? '' : ' · no hall')) : (r.bonus === 'fort' ? 'WILD · fort' : r.bonus === 'keep' ? 'WILD · keep' : 'WILD');
    if (r.owner === 'player' && r.worldOwnerName) st = r.worldOwnerName;
    const lift = r.core && r.core.keep ? 108 : 86;
    const nameCol = r.worldOwnerColor || (r.owner === 'player' ? '#fff8ee' : '#fff8ee');
    placeTag(r.name, r.x, r.y - lift, 18, nameCol, r.worldOwnerColor || null, 'name');
    const stCol = r.owner === 'player' ? (r.worldOwnerColor || '#d6e6ff') : r.owner === 'contested' ? '#ffe6b0' : r.owner === 'pale' ? '#d7f0cc' : r.owner === 'rival' ? (r.worldOwnerColor || '#e07a5f') : '#ffe6b0';
    const stRim = r.owner === 'player' ? (r.worldOwnerColor || '#7eb0ee') : r.owner === 'contested' ? '#e8a83a' : r.owner === 'pale' ? '#9ddea8' : r.owner === 'rival' ? (r.worldOwnerColor || '#e07a5f') : '#e6c27a';
    placeTag(st, r.x, r.y - lift + 24, 12, stCol, stRim, 'status');
  }
  for (const z of WORLD.zones.values()) {
    if (z.homeId === myKingdomId()) continue;
    const loc = localFromWorld(z.wx, z.wy);
    if (!vis(loc.x, loc.y)) continue;
    const own = z.state === 'owned' ? ((z.ownerId === myKingdomId() ? 'YOURS' : (z.ownerName || 'RIVAL')) + (z.gov ? '' : ' · no hall')) : z.state === 'contested' ? 'CONTESTED' : 'WILD';
    placeTag(z.name || 'Land', loc.x, loc.y - 86, 18, z.ownerColor || '#fff8ee', z.ownerColor || null, 'name');
    placeTag(own, loc.x, loc.y - 62, 12, z.ownerColor || '#ffe6b0', z.ownerColor || '#e6c27a', 'status');
  }
  for (const g of S.guardians) {
    if (!vis(g.x, g.y) || !edgeOf(g.x, g.y).on) continue;
    nameTag(g.name, g.x, g.y + g.r + 16, 13, g.kind === 'warden' ? '#d7f0cc' : '#ffd0c8', g.kind === 'warden' ? '#9ddea8' : '#e07a68');
  }
  if (S.camp && vis(S.camp.x, S.camp.y)) placeTagClamped('Vagrant camp', S.camp.x, S.camp.y + 18, 12, '#fff6e4', '#c9b488', 'camp');
  drawWallGhosts();
  for (const a of S.archers) if (a.follow && vis(a.x, a.y)) { ctx.strokeStyle = 'rgba(240,193,74,.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(a.x, a.y + 3, 11, 4.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (S.sel && S.sel.u) {
    const u = S.sel.u;
    if (vis(u.x, u.y)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(240,193,74,.95)';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(u.x, u.y + 4, 16, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,248,220,.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(u.x, u.y + 4, 19, 8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  for (const u of hiredWorkers()) {
    if (!u.send || !vis(u.send.x, u.send.y)) continue;
    const x = u.send.x, y = u.send.y;
    ctx.save();
    ctx.fillStyle = 'rgba(28,20,14,.55)';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 22); ctx.stroke();
    ctx.strokeStyle = '#f0c14a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y - 21); ctx.stroke();
    ctx.fillStyle = '#f0c14a';
    ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + 12, y - 16); ctx.lineTo(x, y - 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.restore();
  }

  const m = S.monarch;
  if (m.target && m.target.hp > 0) {
    ctx.save();
    ctx.translate(m.target.x, m.target.y);
    ctx.rotate(S.t * 1.2);
    ctx.strokeStyle = '#f0c14a';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(0, 0, m.target.r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  for (const f of S.fx) if (f.k !== 'arrow') drawFxItem(f);

  drawRemoteRealms();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  drawNight();
  drawUndeadRims();

  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (vw / 2 - c.x * scale), dpr * (vh / 2 - c.y * scale));
  ctx.globalAlpha = 1;
  for (const f of S.fx) if (f.k === 'arrow') drawFxItem(f);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // Tool stock is shown as racked sprites on the stand, not a count bubble.
  // Payment is taken from the purse on the mark tap; no lingering 0/1 count badge.
  drawWallCostBadge();
  drawUpgradeChrome();
  flushLabels();
  for (const g of S.guardians) {
    const e = edgeOf(g.x, g.y);
    if (e.on) continue;
    drawEdgeArrow(e.ex, e.ey, e.ang, g.kind === 'warden' ? '#9ddea8' : '#e15a4a');
  }
  const waveSpots = [];
  for (const u of S.undead) {
    const e = edgeOf(u.x, u.y);
    if (e.on) continue;
    let near = null;
    for (let i = 0; i < waveSpots.length; i++) if (Math.hypot(waveSpots[i].ex - e.ex, waveSpots[i].ey - e.ey) < 34) { near = waveSpots[i]; break; }
    if (near) { if (u.kind === 'necro') near.necro = true; }
    else waveSpots.push({ ex: e.ex, ey: e.ey, ang: e.ang, necro: u.kind === 'necro' });
  }
  for (let i = 0; i < waveSpots.length; i++) {
    const s = waveSpots[i];
    drawEdgeArrow(s.ex, s.ey, s.ang, s.necro ? '#c6ff8a' : '#f4ffe8');
  }
  if (S.camp) {
    const p = w2s(S.camp.x, S.camp.y);
    if (!(p.x > 18 && p.x < vw - 18 && p.y > 100 && p.y < vh - 110)) {
      const cx = vw / 2, cy = vh / 2, a = Math.atan2(p.y - cy, p.x - cx);
      const ex = clamp(cx + Math.cos(a) * (vw * 0.5), 30, vw - 30), ey = clamp(cy + Math.sin(a) * (vh * 0.5), 140, vh - 150);
      ctx.save(); ctx.translate(ex, ey);
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fillStyle = 'rgba(28,20,14,.85)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#c9b488'; ctx.stroke();
      ctx.drawImage(Art.folk.vagrant[0].c, -9, -12, 18, 20.4);
      ctx.rotate(a); ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(16, -6); ctx.lineTo(16, 6); ctx.closePath(); ctx.fillStyle = '#c9b488'; ctx.fill();
      ctx.restore();
    }
  }
  if (ptr && ptr.drag && !ptr.build && !ptr.wall && !pinch && !wallDrag && !(S && S.build)) {
    ctx.beginPath(); ctx.arc(ptr.sx, ptr.sy, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(28,20,14,.16)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,236,200,.32)'; ctx.stroke();
    const dx = ptr.x - ptr.sx, dy = ptr.y - ptr.sy, len = Math.hypot(dx, dy) || 1, kk = Math.min(1, 18 / len);
    const kx = ptr.sx + dx * kk, ky = ptr.sy + dy * kk;
    ctx.beginPath(); ctx.arc(kx, ky, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240,193,74,.38)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(42,28,16,.4)'; ctx.stroke();
  }
}

// ---------- HUD ----------
const hud = { c: '', p: '', n: '', r: '', hp: -1, sk: '', w: '', ra: '' };
function setVal(id, key, v) {
  if (hud[key] === v) return;
  hud[key] = v;
  const n = $(id).querySelector('.val');
  if (n) n.textContent = v;
}
function drawHud() {
  if (!S) return;
  updateCloudNote();
  setVal('hCoins', 'c', String(S.coins));
  if (S.phase === 'day') {
    const t = Math.max(0, Math.ceil(S.phaseT)), mm = (t / 60) | 0, ss = String(t % 60).padStart(2, '0');
    setVal('hPhase', 'p', 'Day ' + mm + ':' + ss);
  } else {
    const left = (S.undead ? S.undead.length : 0) + (S.spawnQ ? S.spawnQ.length : 0) + (S.claimQ ? S.claimQ.length : 0);
    setVal('hPhase', 'p', (S.bloodMoon ? 'Blood Moon · ' : 'Night · ') + left);
  }
  $('hPhase').classList.toggle('night', S.phase === 'night');
  setVal('hNights', 'n', isChallenge() ? (S.nights + '/' + (TUNE.challengeNights || 20)) : String(S.nights));
  setVal('hRegions', 'r', owned().length + '/' + S.regions.length);
  const hp = Math.max(0, Math.ceil(S.monarch.hp));
  if (hud.hp !== hp) {
    hud.hp = hp;
    $('hpBar').style.width = (100 * hp / S.monarch.max) + '%';
    $('hpText').querySelector('.val').textContent = hp + ' / ' + S.monarch.max;
  }
  const wk = workers(), cap = housingCap();
  setVal('hWorkers', 'w', wk + '/' + cap);
  $('hWorkers').classList.toggle('full', wk >= cap);
  if (wallDrag && wallDrag.plan) {
    const n = wallDrag.plan.filter(pt => pt.ok).length;
    const cost = n * buildCost('wall');
    $('hint').textContent = n
      ? (`${n} wall${n === 1 ? '' : 's'} · ${cost} coins` + (S.coins < cost ? ' — not enough' : ' · release to order, Cancel to stop'))
      : ((wallDrag.plan[0] && wallDrag.plan[0].why) || 'Drag to lay a Wall · Cancel to stop');
  } else if (S.build === 'wall' && !$('hint').textContent) {
    $('hint').textContent = `Drag to lay a Wall · ${buildCost('wall')} coins each · Cancel to stop`;
  }
  if (isChallenge() && S.score) {
    $('hScore').hidden = false;
    const live = scoreBase(S.score);
    setVal('hScore', 'sc', live + ' · ' + fmtMult(S.score.multiplier || 1));
  } else {
    $('hScore').hidden = true;
  }
  const ra = S.rally ? 'on' : 'off';
  if (hud.ra !== ra) { hud.ra = ra; $('btnRally').querySelector('i').textContent = ra; }
  if (DEBUG) {
    const sk = S.phase === 'day' ? 'Night' : 'Day';
    if (hud.sk !== sk) { hud.sk = sk; $('btnSkip').querySelector('.val').textContent = sk; }
  }
}

let last = performance.now(), fps = 60;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fps = fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
  if (!S) { requestAnimationFrame(frame); return; }
  const steps = Math.max(1, Math.min(40, (window.__bc && window.__bc.timeScale) | 0));
  tickSel();
  for (let i = 0; i < steps && !S.over; i++) update(dt);
  syncInspect();
  render(); drawHud();
  maybeAutosave();
  syncWorld();
  requestAnimationFrame(frame);
}

// ---------- debug / test hooks ----------
window.__bc = {
  get S() { return S; }, get fps() { return fps; }, w2s, s2w, regionIdAt, skipPhase, newGame,
  get zoom() { return zoom; }, set zoom(z) { zoom = z; applyScale(); },
  get scale() { return scale; },
  get lookX() { return lookX; }, set lookX(v) { lookX = v; },
  get lookY() { return lookY; }, set lookY(v) { lookY = v; },
  get lookFree() { return lookFree; }, set lookFree(v) { lookFree = !!v; },
  setBuild, setZoomAt, planWallLine, commitWallLine, placeBlocked, swapWallForGate, gateOpen, solidAt, tryMove, tryPlace, placeBld, damage, onBuilt,
  decorAt, markClear, tryMarkDecor, finishClear, tryMarkDemo, finishDemo, unmarkDemo,
  get wallDrag() { return wallDrag; },
  setWallDrag(x0, y0, x1, y1) { wallDrag = { x0, y0, x1, y1, plan: planWallLine(x0, y0, x1, y1) }; return wallDrag.plan; },
  clearWallDrag() { wallDrag = null; },
  findCampSpot, nearestCampSpot, refreshCamps, settleVagrants,
  stockBadge: false, rackedToolCount,
  get sel() { return S && S.sel; }, setSel, clearSel, sendWorker, workerAt, hiredWorkers,
  markNavDirty, rebuildNav, ensureNav, nearestWalkable, astarPath, followRoute, steerMove, isNavBlocked,
  get nav() { return nav; },
  teleport(x, y) { S.monarch.x = x; S.monarch.y = y; lookX = x; lookY = y; },
  coins(n) { S.coins += n; }, heal() { S.monarch.hp = S.monarch.max; },
  forceLose(id) { const r = S.regions[id]; if (r && r.core) damage(r.core, r.core.hp + 1); },
  requestPlantBanner, failClaim, completeClaim, resolveClaims, claimScaleOf, isClaimable, contested, heldCores,
  claimWaveSize(id) {
    const r = S.regions[id]; if (!r) return 0;
    const n0 = TUNE.waveBase + TUNE.wavePerNight * S.nights + TUNE.wavePerRegion * Math.max(0, owned().length - 1);
    const necroNight = S.day > 0 && S.day % 10 === 0;
    let n = Math.max(0, Math.round(n0 * (necroNight ? (TUNE.necroWaveMul || 2) : 1)));
    if (hasCurse('wasp') && S.nights < (TUNE.curseWaspNights || 3)) n = Math.round(n * (TUNE.curseWaspCount || 2));
    return Math.max(1, Math.round(n * (TUNE.claimWaveMul || 2) * claimScaleOf(r)));
  },
  guardianOf(id) { return S.guardians.find(g => g.region === id); },
  findClear(type, cx, cy) {
    for (let rad = 70; rad <= 260; rad += 28) {
      for (let a = 0; a < 16; a++) {
        const x = cx + Math.cos(a * Math.PI / 8) * rad, y = cy + Math.sin(a * Math.PI / 8) * rad;
        if (!placeBlocked(type, x, y)) return { x, y };
      }
    }
    return null;
  },
  placeUndead(kind, x, y) {
    const m = enemyMods(kind, null);
    const u = { type: 'undead', kind, x, y, r: m.r, hp: m.hp, max: m.hp, speed: m.speed, dmg: m.dmg, coin: m.coin, elite: m.elite, cd: 0, tgt: null, rt: 0, jit: 0 };
    S.undead.push(u); S.stats.spawned++;
    return u;
  },
  timeScale: 1, TUNE, dropCoin, workers, housingCap, toggleRally, debug: DEBUG,
  rand, pickWaveSide, waveEntryPoint, startNight,
  keepLevel, isPlayerKeep, houseSlotsOf, farmCoinsOf, upgradeCostTo, materialReady, mineOwned,
  upgradeNeed, wallConnected, upgradeMembers, beginUpgrade, payUpgrade, cancelUpgrade,
  tryUpgradeTap, upgradeTargetAt, nearestPayableUpgrade, finishUpgrade, applyTier, spriteIdFor, getSprite,
  buildingAt, buildingById, openInspect, closeInspect, requestUpgrade, requestStock, requestSwapGate, requestPlantBanner, inspectTarget,
  get inspectId() { return PUI.inspectId; },
  get mines() { return S && S.mines; },
  get choiceBtns() { return S && S._choiceBtns; },
  get visibleLabels() { return S && S._visibleLabels; },
  CURSES, BLESSINGS, hasCurse, hasBless, loadoutMultiplier, fmtMult,
  timeBonus, realmBonus, scoreBase, finalScore, enemyMods, buildCost, toolStockCost,
  showTitle, openLoadout, startEndless, startChallenge, openAccount,
  requestSignUp, requestSignIn, requestSaveKingdom, requestSignOut,
  showNeedNet, worldInputBlocked, isWorldLive,
  requestCreateKingdom, snapCell, cellWorldBounds, spawnInCell,
  serializeKingdom, applyKingdomState,
  openWorld, closeWorld, lookAtRealm, connectWorld, disconnectWorld,
  get world() {
    return {
      room: WORLD.room,
      connected: !!(WORLD.ws && WORLD.ws.readyState === 1),
      blocked: worldInputBlocked(),
      ever: !!WORLD.ever,
      lastAlert: WORLD.lastAlert,
      zones: [...WORLD.zones.values()].map(z => ({
        id: z.id, homeId: z.homeId, region: z.region, wx: z.wx, wy: z.wy, name: z.name,
        ownerId: z.ownerId, ownerName: z.ownerName, ownerColor: z.ownerColor, state: z.state,
        gov: !!z.gov, govHp: z.govHp, govMax: z.govMax, underAttack: !!z.underAttack,
        buildings: z.buildings || [],
      })),
      realms: [...WORLD.realms.values()].map(r => ({
        id: r.id, name: r.name, spawn: r.spawn, nights: r.nights, online: !!r.online,
        mx: r.mx, my: r.my,
      })),
    };
  },
  kingdomColor, worldFromLocal, localFromWorld, zoneKey, publishHomeZones, applyServerZone, seedZone,
  plantWorldBanner, completeWorldClaim, isWorldClaimable, takeZoneFromHall, owningZoneAt, zoneHasHall, hallOf,
  setFakeGeo(lat, lon) { CLOUD.fakeGeo = (lat == null ? null : { lat, lon }); },
  forceGeoDenied(v) { CLOUD.forceGeoDenied = !!v; },
  get apiBase() { return apiBase(); },
  set apiBase(v) { window.__bc._apiBase = v; CLOUD.api = v; },
  forceOffline(v) {
    CLOUD.forceOffline = !!v;
    if (v) {
      CLOUD.offline = true;
      CLOUD.lastError = 'offline';
      WORLD.wanted = false;
      if (WORLD.timer) { clearTimeout(WORLD.timer); WORLD.timer = 0; }
      const ws = WORLD.ws;
      WORLD.ws = null;
      if (ws) {
        try { ws.onclose = null; ws.onerror = null; ws.onmessage = null; ws.close(); } catch (e) {}
      }
    } else {
      if (CLOUD.lastError === 'offline') CLOUD.lastError = '';
      CLOUD.offline = false;
      if (isEndlessCloud()) connectWorld();
    }
    updateCloudNote();
  },
  get cloud() {
    return {
      token: !!CLOUD.token,
      name: CLOUD.kingdom && CLOUD.kingdom.name,
      id: CLOUD.kingdom && CLOUD.kingdom.id,
      spawn: CLOUD.kingdom && CLOUD.kingdom.spawn,
      cell: CLOUD.kingdom && CLOUD.kingdom.cell,
      world: CLOUD.world,
      offline: !!CLOUD.offline,
      lastError: CLOUD.lastError,
      lastSaveOk: !!CLOUD.lastSaveOk,
      saving: !!CLOUD.saving,
    };
  },
  unlockAll, resetUnlocks, readUnlocks, writeUnlocks, noteUnlock,
  get lastChallenge() { return lastChallenge; },
  get loadout() { return { curses: [...LO.curses], blessings: [...LO.blessings] }; },
  setLoadout(curses, blessings) { LO.curses = new Set(curses || []); LO.blessings = new Set(blessings || []); renderLoadout(); },
  challengeVictory, recordNightScore, syncChallengeScore,
};

buildArt();
showTitle();
requestAnimationFrame(frame);
})();
