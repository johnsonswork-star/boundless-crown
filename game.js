/* Boundless Crown — playable core-loop prototype. Vanilla JS, no deps.
   Terrain is baked; units and buildings are procedural sprites. No external art. */
(() => {
'use strict';
const W = 2400, H = 2400, CX = W / 2, CY = H / 2;
const DAY = 60, NIGHT = 45, CELL = 8, GW = W / CELL, GH = H / CELL;
const COST = { wall: 4, tower: 12, farm: 8, house: 6 };
const NICE = { wall: 'Wall', tower: 'Tower', farm: 'Farm', house: 'House', fort: 'Fort', gate: 'Gate', bow: 'Bow stand', hammer: 'Hammer stand', scythe: 'Scythe stand' };
const TOOL = {
  bow:    { cost: 4, role: 'archer',  label: 'Bow' },
  hammer: { cost: 3, role: 'builder', label: 'Hammer' },
  scythe: { cost: 4, role: 'farmer',  label: 'Scythe' },
};
// Tuning knobs (Kingdom-style economy). All in one place for playtest iteration.
const TUNE = {
  startCoins: 12, keepSlots: 1, houseSlots: 2, startHouses: 1, startBuilders: 1,
  trickleEvery: 10,              // +1 coin per owned region every N s by day (small passive)
  dropRange: 64, pickupGrace: 0.6, standMax: 3,
  standCost: { bow: 5, hammer: 3, scythe: 5 }, // Build-menu price; Hammer is cheap so you can get going
  gateCost: 6, wallSpacing: 34,
  zoomMin: 0.55, zoomMax: 2.4, zoomStart: 1,
  vagrantEvery: 18, vagrantMax: 4, vagrantStart: 2,
  buildTime: { wall: 4, tower: 8, farm: 5, house: 6, bow: 5, hammer: 4, scythe: 5, gate: 5 }, repairRate: 14,
  farmEvery: 5, farmCoins: 1,    // a worked farm pays farmCoins every farmEvery s, by day
  coreHome: 280, coreCaptured: 150, coreRetaken: 130, coreKeep: 320,
  waveBase: 2, wavePerNight: 7, wavePerRegion: 2,
  necroRaiseEvery: 5, leaderDmg: 1.25,
  guardianLeash: 220, rallyRange: 280, folkSpeed: 72,
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
  bow:    { hp: 90, r: 16 },
  hammer: { hp: 90, r: 16 },
  scythe: { hp: 90, r: 16 },
  gate:   { hp: 140, r: 16 },
};
Object.assign(COST, TUNE.standCost);
COST.gate = TUNE.gateCost;

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
let dpr = 1, vw = 0, vh = 0, baseScale = 1, zoom = TUNE.zoomStart, scale = 1;
let lookX = null, lookY = null, pinch = null;
const pts = new Map();
function applyScale() {
  const zMin = TUNE.zoomMin, zMax = TUNE.zoomMax;
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
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
resize();

let S = null, grid = null, mapCv = document.createElement('canvas');
mapCv.width = GW; mapCv.height = GH;

function regionIdAt(x, y) {
  let best = 0, bd = 1e18;
  for (const r of S.regions) { const d = (r.x - x) ** 2 + (r.y - y) ** 2; if (d < bd) { bd = d; best = r.id; } }
  return best;
}

function newGame() {
  const q = new URLSearchParams(location.search);
  const seed = (+q.get('seed')) || ((Math.random() * 1e9) | 0);
  const rnd = mulberry(seed);
  S = {
    seed, t: 0, phase: 'day', phaseT: DAY, day: 1, nights: 0, coins: TUNE.startCoins, trickle: 0,
    regions: [], buildings: [], archers: [], undead: [], guardians: [], fx: [],
    folk: [], drops: [], stands: [], camp: null, vagrantT: TUNE.vagrantEvery, rally: false, dropHold: false, dropT: 0, postT: 0,
    spawnQ: [], spawnT: 0, spawnGap: 1, leader: null, chaos: false, focus: null, waveSrc: null,
    build: null, over: false, kills: 0, mapDirty: true,
    stats: { towerShots: 0, paleTowerShots: 0, spawned: 0, captures: 0, losses: 0, retakes: 0,
      dropped: 0, recruits: 0, tools: 0, roles: 0, built: 0, farmCoins: 0, raised: 0, folkLost: 0 },
    monarch: { x: 0, y: 0, r: 16, hp: 120, max: 120, cd: 0, target: null, speed: 190, vx: 0, vy: 0, face: 0 },
    nightK: 0,
  };
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
  for (const r of S.regions) {
    if (r.id === 0) continue;
    r.bonus = rnd() < 0.6 ? (rnd() < 0.5 ? 'fort' : 'keep') : null;
    const d = Math.hypot(r.x - CX, r.y - CY);
    S.guardians.push({ kind: 'guardian', name: 'Guardian', x: r.x, y: r.y, hx: r.x, hy: r.y, r: 22,
      hp: Math.round(140 + d * 0.08), max: Math.round(140 + d * 0.08), dmg: 9, cd: 0, region: r.id });
  }
  S.monarch.x = home.x; S.monarch.y = home.y + 40;
  S.focus = null;
  setupHome();
  buildDecor();
  bakeGround();
  $('over').hidden = true;
  $('bar').hidden = false;
  setBuild(null); showMenu(false);
  $('btnRally').classList.remove('sel');
  zoom = TUNE.zoomStart; applyScale();
  lookX = S.monarch.x; lookY = S.monarch.y;
  pinch = null; wallDrag = null; pts.clear(); ptr = null;
  toast('Start with your Builder and House. Order a Hammer stand, then drop coins on vagrants and stands', '');
}
function mkBld(type, x, y, rid, built) {
  const spec = BLD[type];
  return { type, x, y, r: spec.r, hp: built ? spec.hp : Math.ceil(spec.hp * 0.15), max: spec.hp, owner: 'player', region: rid, cd: 0, built: built ? 1 : 0 };
}
function mkFolk(role, x, y) {
  return { type: 'folk', role, x, y, r: 9, hp: 24, max: 24, tx: null, ty: null, wt: 0, ph: Math.random() * 6.28, job: null, stand: null, state: 'idle' };
}
function setupHome() {
  const h = S.regions[0];
  for (let i = 0; i < TUNE.startHouses; i++) S.buildings.push(mkBld('house', h.x + 100 + i * 46, h.y - 24, 0, 1));
  S.stands = [];
  for (let i = 0; i < TUNE.startBuilders; i++) S.folk.push(mkFolk('builder', h.x - 46 + i * 18, h.y + 50));
  // vagrant camp: just inside the nearest wild region, as far from its guardian as possible
  const wild = S.regions.filter(r => r.id !== 0).sort((a, b) => dist(a, h) - dist(b, h))[0];
  let camp = null;
  for (let t = 0.47; t >= 0.15; t -= 0.01) {
    const x = wild.x + (h.x - wild.x) * t, y = wild.y + (h.y - wild.y) * t;
    if (regionIdAt(x, y) === wild.id && regionIdAt(x, y + 40) === wild.id) { camp = { x, y, region: wild.id }; break; }
  }
  S.camp = camp || { x: wild.x + (h.x - wild.x) * 0.3, y: wild.y + (h.y - wild.y) * 0.3, region: wild.id };
  for (let i = 0; i < TUNE.vagrantStart; i++) spawnVagrant();
}
function spawnVagrant() {
  const c = S.camp; if (!c) return;
  S.folk.push(mkFolk('vagrant', c.x + (Math.random() - .5) * 60, c.y + 10 + (Math.random() - .5) * 40));
}
function mkRegion(id, x, y) { return { id, x, y, name: NAMES[id], owner: 'wild', core: null, bonus: null, weakened: false }; }
function mkCore(r, hp) { return { type: 'core', x: r.x, y: r.y, r: 20, hp, max: hp, region: r.id, keep: false }; }
const owned = () => S.regions.filter(r => r.owner === 'player');

// ---------- toasts / hint ----------
function toast(msg, cls) {
  const box = $('toasts');
  const el = document.createElement('div'); el.className = 'toast ' + (cls || ''); el.textContent = msg;
  box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 2600);
  (S && (S.toastLog || (S.toastLog = []))).push(msg);
}

// ---------- input ----------
let ptr = null, wallDrag = null, pinched = false; const keys = {};
function startPinch() {
  const arr = [...pts.values()];
  if (arr.length < 2) return;
  const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) || 1;
  pinch = { d0: d, z0: zoom };
  pinched = true;
  ptr = null;
  wallDrag = null; // pinch wins; do not place the wall line
}
function onWheelZoom(e) {
  e.preventDefault();
  if (!S || S.over) return;
  const factor = Math.pow(0.999, e.deltaY);
  setZoomAt(zoom * factor, e.clientX, e.clientY);
}
cv.addEventListener('wheel', onWheelZoom, { passive: false });
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  if (pts.size >= 2) { startPinch(); return; }
  if (pinch || pinched) return;
  ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, drag: false, t: performance.now(), build: !!(S && S.build) };
  if (S && !S.over && S.build === 'wall') {
    const w = s2w(e.clientX, e.clientY);
    wallDrag = { x0: w.x, y0: w.y, x1: w.x, y1: w.y };
    ptr.wall = true;
  }
});
cv.addEventListener('pointermove', e => {
  if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pts.size >= 2) {
    const arr = [...pts.values()];
    const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) || 1;
    const mx = (arr[0].x + arr[1].x) / 2, my = (arr[0].y + arr[1].y) / 2;
    setZoomAt(pinch.z0 * (d / pinch.d0), mx, my);
    return;
  }
  if (!ptr || e.pointerId !== ptr.id) return;
  ptr.x = e.clientX; ptr.y = e.clientY;
  if (Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy) > 14) ptr.drag = true;
  if (wallDrag && ptr.wall) {
    const w = s2w(ptr.x, ptr.y);
    wallDrag.x1 = w.x; wallDrag.y1 = w.y;
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
  else if (!ptr.drag && !ptr.wall && performance.now() - ptr.t < 600 && e.type === 'pointerup') onTap(ptr.x, ptr.y);
  wallDrag = null;
  ptr = null;
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape' && S && S.build) { e.preventDefault(); setBuild(null); }
  if (e.key === 'n' && DEBUG) skipPhase();
  if (e.key === ' ' && !e.repeat) dropCoin();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

$('bar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !S || S.over) return;
  const a = b.dataset.act;
  if (a === 'build') { if (S.build) setBuild(null); else showMenu($('buildMenu').hidden); return; }
  if (a === 'rally') { showMenu(false); toggleRally(); }
});
$('buildMenu').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !S || S.over) return;
  showMenu(false);
  if (b.dataset.act !== 'close') setBuild(b.dataset.act); // stays selected for repeat placement
});
const dropBtn = $('btnDrop');
dropBtn.addEventListener('pointerdown', e => {
  e.preventDefault(); if (!S || S.over) return;
  showMenu(false);
  S.dropHold = true; S.dropT = 0.4; dropCoin();
  try { dropBtn.setPointerCapture(e.pointerId); } catch (_) {}
  dropBtn.classList.add('held');
});
const dropEnd = () => { if (S) S.dropHold = false; dropBtn.classList.remove('held'); };
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) dropBtn.addEventListener(t, dropEnd);
$('btnSkip').hidden = !DEBUG;
$('btnSkip').addEventListener('click', () => { if (DEBUG) skipPhase(); });
$('btnRestart').addEventListener('click', () => newGame());

function setBuild(t) {
  if (!S) return;
  wallDrag = null;
  S.build = t; S.mapDirty = true;
  const bb = $('btnBuild');
  bb.classList.toggle('sel', !!t);
  bb.querySelector('b').textContent = t ? 'Cancel' : 'Build';
  bb.querySelector('i').textContent = t ? NICE[t] : 'menu';
  if (!t) $('hint').textContent = '';
  else if (t === 'wall') $('hint').textContent = `Drag to lay a Wall · ${COST.wall} coins each · Cancel to stop`;
  else if (t === 'gate') $('hint').textContent = `Tap to place a Gate, or tap a Wall to swap · ${COST.gate} coins`;
  else $('hint').textContent = `Tap your land to order a ${NICE[t]} · ${COST[t]} coins`;
}
function isStandType(t) { return !!TOOL[t]; }
function setZoomAt(z, sx, sy) {
  const before = s2w(sx, sy);
  zoom = z;
  applyScale();
  lookX = before.x - (sx - vw / 2) / scale;
  lookY = before.y - (sy - vh / 2) / scale;
}
function followCam(dt) {
  if (!S || pinch) return;
  const m = S.monarch;
  if (lookX == null) { lookX = m.x; lookY = m.y; return; }
  const k = Math.min(1, 6 * dt);
  lookX += (m.x - lookX) * k;
  lookY += (m.y - lookY) * k;
}
function showMenu(on) {
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
  return { x: clamp(tx, Math.min(hw, CX), Math.max(W - hw, CX)), y: clamp(ty, Math.min(hh, CY), Math.max(H - hh, CY)) };
}
function s2w(sx, sy) { const c = camera(); return { x: c.x + (sx - vw / 2) / scale, y: c.y + (sy - vh / 2) / scale }; }
function w2s(wx, wy) { const c = camera(); return { x: (wx - c.x) * scale + vw / 2, y: (wy - c.y) * scale + vh / 2 }; }

function onTap(sx, sy) {
  if (S.over) return;
  const w = s2w(sx, sy);
  if (S.build) return tryPlace(S.build, w.x, w.y);
  // tap an enemy to focus it
  let best = null, bd = 45 / scale;
  for (const e of enemiesList()) { const d = dist(e, w) - e.r; if (d < bd) { bd = d; best = e; } }
  if (best) { S.monarch.target = best; if (dist(best, S.monarch) > 90) toast('Target set — move closer to strike'); }
}

function placeBlocked(type, x, y, extra) {
  if (x < 20 || y < 20 || x > W - 20 || y > H - 20) return 'Out of bounds';
  const rid = regionIdAt(x, y), r = S.regions[rid];
  if (!r || r.owner !== 'player') return 'You can only build in captured land';
  if (r.core && dist(r.core, { x, y }) < 40) return 'Too close to the banner';
  const rr = BLD[type].r;
  const ignore = extra && extra.ignore;
  for (const b of S.buildings) {
    if (b === ignore) continue;
    if (dist(b, { x, y }) < b.r + rr + 2) return 'Spot taken';
  }
  for (const s of S.stands) {
    if (s === ignore || S.buildings.includes(s)) continue;
    if (dist(s, { x, y }) < rr + 22) return 'Too close to a tool stand';
  }
  if (extra && extra.others) {
    for (const o of extra.others) if (dist(o, { x, y }) < rr + (o.r || rr) + 2) return 'Spot taken';
  }
  if (isStandType(type) && S.stands.some(st => st.tool === type && st.region === rid && st.owner === 'player')) return 'This land already has a ' + NICE[type];
  return null;
}
function swapWallForGate(wall) {
  const fee = Math.max(0, TUNE.gateCost - COST.wall);
  if (S.coins < fee) return toast(fee ? `Need ${fee} coins to swap in a Gate` : 'Cannot swap', 'bad');
  if (fee) { S.coins -= fee; floatTxt(wall.x, wall.y - 30, '-' + fee, '#ffb0a0'); }
  wall.type = 'gate';
  const ratio = wall.max ? wall.hp / wall.max : 1;
  wall.max = BLD.gate.hp; wall.r = BLD.gate.r;
  wall.hp = Math.max(1, Math.ceil(wall.max * (wall.built >= 1 ? ratio : Math.max(0.15, wall.built || 0))));
  toast(wall.built >= 1 ? 'Wall swapped for a Gate' : 'Wall order swapped for a Gate', 'good');
  return wall;
}
function placeBld(type, x, y) {
  const rid = regionIdAt(x, y);
  S.coins -= COST[type];
  const b = mkBld(type, x, y, rid, 0);
  if (isStandType(type)) { b.tool = type; b.paid = 0; b.tools = 0; S.stands.push(b); }
  S.buildings.push(b);
  floatTxt(x, y - 30, '-' + COST[type], '#ffb0a0');
  return b;
}
function tryPlace(type, x, y) {
  if (type === 'gate') {
    const hit = S.buildings.find(b => b.type === 'wall' && b.owner === 'player' && dist(b, { x, y }) < (b.r || 16) + 14);
    if (hit) return swapWallForGate(hit);
  }
  const why = placeBlocked(type, x, y);
  if (why) return toast(why, 'bad');
  if (S.coins < COST[type]) return toast(`Need ${COST[type]} coins`, 'bad');
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
    const afford = !why && S.coins >= paid + COST.wall;
    const ok = !why && afford;
    planned.push({ x: pt.x, y: pt.y, ok, why: why || (afford ? null : 'Need more coins') });
    if (ok) { others.push({ x: pt.x, y: pt.y, r: BLD.wall.r }); paid += COST.wall; }
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
    if (S.coins < COST.wall) break;
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
function floatTxt(x, y, txt, col) { S.fx.push({ k: 'txt', x, y, txt, col: col || '#ffd56a', t: 1.1, t0: 1.1 }); }
function workers() { let n = S.archers.length; for (const f of S.folk) if (f.role !== 'vagrant') n++; return n; }
function housingCap() {
  let c = S.regions[0].owner === 'player' ? TUNE.keepSlots : 0;
  for (const b of S.buildings) if (b.type === 'house' && b.owner === 'player' && b.built >= 1) c += TUNE.houseSlots;
  return c;
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
  if (t.tool) {
    t.paid++;
    const c = TOOL[t.tool].cost;
    if (t.paid >= c) {
      t.paid = 0; t.tools++; S.stats.tools++;
      floatTxt(t.x, t.y - 44, TOOL[t.tool].label + ' ready!', '#d6ffb0');
      toast(`${TOOL[t.tool].label} bought — an idle villager will take it`, 'good');
    } else floatTxt(t.x, t.y - 40, t.paid + ' / ' + c, '#ffd56a');
  } else {
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
      const t = claimTarget(d);
      if (t) { d.dead = true; S.fx.push({ k: 'cfly', x: d.x, y: d.y, tx: t.x, ty: t.y - 16, t: 0.32, t0: 0.32 }); applyClaim(t); continue; }
      if (d.noHouse && !d.warned) { d.warned = true; toast('No free housing — build a House first', 'bad'); }
    }
    if (d.away && d.age > TUNE.pickupGrace && dist(d, m) < 26) { d.dead = true; S.coins++; floatTxt(m.x + 14, m.y - 50, '+1', '#ffd56a'); }
  }
  if (S.drops.some(d => d.dead)) S.drops = S.drops.filter(d => !d.dead);
}

// ---------- workers ----------
function homeCore() {
  const h = S.regions[0];
  if (h.owner === 'player' && h.core) return h.core;
  const o = owned().find(r => r.core); return o ? o.core : null;
}
function moveTo(f, tx, ty, sp, dt) {
  const d = Math.hypot(tx - f.x, ty - f.y);
  if (d < 1.5) return true;
  const s = Math.min(d, sp * dt);
  const nx = f.x + (tx - f.x) / d * s, ny = f.y + (ty - f.y) / d * s;
  if (f.role === 'vagrant') { f.x = nx; f.y = ny; }
  else tryMove(f, nx, ny, true);
  return d < 6;
}
function wanderAround(f, cx, cy, rad, dt, sp) {
  f.wt -= dt;
  if (f.wt <= 0 || f.tx == null) { f.wt = 2 + Math.random() * 3; const a = Math.random() * 6.283, r = Math.random() * rad; f.tx = cx + Math.cos(a) * r; f.ty = cy + Math.sin(a) * r * 0.7; }
  moveTo(f, f.tx, f.ty, sp * 0.45, dt);
}
function jobValid(j) {
  if (!j) return false;
  if (j.type === 'core') { const r = S.regions[j.region]; return r.core === j && r.owner === 'player' && j.hp < j.max; }
  return S.buildings.includes(j) && j.owner === 'player' && (j.built < 1 || j.hp < j.max);
}
function pickBuildJob(f, night) {
  let best = null, bd = 1e9;
  const taken = new Set(S.folk.filter(o => o !== f && o.role === 'builder' && o.job).map(o => o.job));
  for (const b of S.buildings) if (b.owner === 'player' && b.built < 1) {
    const d = dist(b, f) + (taken.has(b) ? 600 : 0); if (d < bd) { bd = d; best = b; }
  }
  if (best || night) return best;
  for (const b of S.buildings) if (b.owner === 'player' && b.built >= 1 && b.hp < b.max - 0.5) { const d = dist(b, f) + (taken.has(b) ? 600 : 0); if (d < bd) { bd = d; best = b; } }
  for (const r of owned()) if (r.core && r.core.hp < r.core.max - 0.5) { const d = dist(r.core, f) + (taken.has(r.core) ? 600 : 0); if (d < bd) { bd = d; best = r.core; } }
  return best;
}
function onBuilt(b) {
  S.stats.built++;
  floatTxt(b.x, b.y - 40, NICE[b.type] + ' built', '#d6ffb0');
  if (b.type === 'house') toast(`House built — +${TUNE.houseSlots} worker slots`, 'good');
  else if (b.type === 'farm') toast('Farm built — a Farmer can work it for coins', 'good');
  else if (b.tool) toast(NICE[b.tool] + ' built — drop coins to stock tools', 'good');
  else if (b.type === 'gate') toast('Gate built — your people can pass, the Pale Host cannot', 'good');
}
function becomeRole(f, role) {
  S.stats.roles++;
  if (role === 'archer') {
    f.dead = true;
    S.archers.push({ type: 'archer', x: f.x, y: f.y, r: 10, hp: 40, max: 40, cd: 0, follow: false, post: null, slotA: Math.random() * 6.28 });
  } else { f.role = role; f.job = null; f.tx = null; }
  floatTxt(f.x, f.y - 34, 'Now a ' + (role === 'archer' ? 'Archer' : role === 'builder' ? 'Builder' : 'Farmer'), '#d6ffb0');
  toast(`A villager became ${role === 'archer' ? 'an Archer' : 'a ' + (role === 'builder' ? 'Builder' : 'Farmer')}`, 'good');
}
function updateFolk(dt) {
  if (S.camp) {
    S.vagrantT -= dt;
    if (S.vagrantT <= 0) { S.vagrantT = TUNE.vagrantEvery; if (S.folk.filter(f => f.role === 'vagrant').length < TUNE.vagrantMax) spawnVagrant(); }
  }
  const hc = homeCore(), night = S.phase === 'night', sp = TUNE.folkSpeed;
  for (const f of S.folk) {
    f.working = false;
    if (f.role === 'vagrant') { if (S.camp) wanderAround(f, S.camp.x, S.camp.y + 10, 60, dt, sp); continue; }
    if (!hc) continue;
    const ix = hc.x, iy = hc.y + 58;
    if (f.role === 'villager') {
      let st = f.stand && f.stand.tools > 0 ? f.stand : null;
      if (!st) {
        f.stand = null;
        for (const s of S.stands) if (s.tools > S.folk.filter(o => o.stand === s).length) { st = s; f.stand = s; break; }
      }
      if (st) { if (moveTo(f, st.x, st.y + (st.r || 14) + 6, sp, dt)) { st.tools--; f.stand = null; becomeRole(f, TOOL[st.tool].role); } continue; }
      if (f.state === 'home') { if (Math.hypot(f.x - ix, f.y - iy) > 50) { moveTo(f, ix, iy, sp, dt); continue; } f.state = 'idle'; }
      wanderAround(f, ix, iy, 64, dt, sp); continue;
    }
    if (f.role === 'builder') {
      if (f.job && (!jobValid(f.job) || (night && f.job.built !== 0 && !(f.job.built < 1)))) f.job = null;
      if (!f.job) f.job = pickBuildJob(f, night);
      const j = f.job;
      if (j) {
        const reach = (j.r || 16) + 12;
        if (dist(f, j) > reach) moveTo(f, j.x - reach * 0.7, j.y + 6, sp, dt);
        else {
          f.working = true;
          if (j.built != null && j.built < 1) {
            j.built = Math.min(1, j.built + dt / TUNE.buildTime[j.type]);
            j.hp = Math.max(j.hp, Math.ceil(j.max * Math.max(0.15, j.built)));
            if (j.built >= 1) { j.hp = j.max; onBuilt(j); f.job = null; }
          } else {
            j.hp = Math.min(j.max, j.hp + TUNE.repairRate * dt);
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
              j.prog -= TUNE.farmEvery; S.coins += TUNE.farmCoins; S.stats.farmCoins += TUNE.farmCoins;
              floatTxt(j.x, j.y - 30, '+' + TUNE.farmCoins, '#ffd56a');
              S.fx.push({ k: 'coins', x: j.x, y: j.y - 10, t: 0.8, t0: 0.8, n: TUNE.farmCoins });
            }
          }
        }
        continue;
      }
      wanderAround(f, ix + 30, iy, 50, dt, sp); continue;
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
    const want = posts.length ? posts[i % posts.length] : null;
    if (a.post !== want) { a.post = want; a.tx = null; a.slotA = i * 2.399; }
  });
}

// ---------- phases ----------
function skipPhase() { if (!S || S.over) return; S.phaseT = 0; }
function startNight() {
  S.phase = 'night'; S.phaseT = NIGHT; S.chaos = false; S.leader = null;
  const n = TUNE.waveBase + TUNE.wavePerNight * S.nights + TUNE.wavePerRegion * Math.max(0, owned().length - 1);
  const q = [];
  for (let i = 0; i < n; i++) q.push(Math.random() < 0.5 ? 'shambler' : 'skeleton');
  q.splice(Math.min(2, q.length), 0, 'necro');
  S.spawnQ = q; S.spawnGap = Math.min(1.0, 16 / q.length); S.spawnT = 0.5;
  // smart wave: the necromancer picks the weakest, most exposed banner, and marches from the nearest Pale/wild land
  pickFocus();
  const fr = S.focus != null ? S.regions[S.focus] : S.regions[0];
  const srcs = S.regions.filter(r => r.owner !== 'player').sort((a, b) => dist(a, fr) - dist(b, fr));
  const edges = [{ x: 40, y: Math.random() * H }, { x: W - 40, y: Math.random() * H }, { x: Math.random() * W, y: 40 }, { x: Math.random() * W, y: H - 40 }];
  S.waveSrc = srcs.length ? { x: srcs[0].x, y: srcs[0].y } : edges[(Math.random() * 4) | 0];
  toast(`Night ${S.nights + 1} — the Pale Host marches!`, 'bad');
}
function pickFocus() {
  const o = owned().filter(r => r.core); if (!o.length) { S.focus = null; return; }
  const foes = S.regions.filter(r => r.owner !== 'player');
  const exposure = r => foes.length ? Math.min(...foes.map(f => dist(f, r))) : 0;
  const score = r => r.core.hp + 0.25 * exposure(r) + (r.id === 0 ? 60 : 0);
  o.sort((a, b) => score(a) - score(b)); S.focus = o[0].id;
}
function startDay() {
  S.phase = 'day'; S.phaseT = DAY; S.nights++; S.day++; S.spawnQ = [];
  for (const u of S.undead) S.fx.push({ k: 'puff', x: u.x, y: u.y, t: 0.6, t0: 0.6 });
  S.undead = []; S.leader = null; S.chaos = false;
  S.monarch.hp = Math.min(S.monarch.max, S.monarch.hp + 40);
  toast(`Dawn! Night ${S.nights} survived — the dead crumble`, 'good');
}
function raiseDead(n) {
  const s = UNDEAD.skeleton;
  const u = { type: 'undead', kind: 'skeleton', x: clamp(n.x + (Math.random() - .5) * 50, 10, W - 10), y: clamp(n.y + (Math.random() - .5) * 50, 10, H - 10),
    r: s.r, hp: s.hp, max: s.hp, speed: s.speed, dmg: s.dmg, cd: 0.5, tgt: null, rt: 0, jit: (Math.random() - .5) };
  S.undead.push(u); S.stats.spawned++; S.stats.raised++;
  S.fx.push({ k: 'puff', x: u.x, y: u.y, t: 0.5, t0: 0.5 });
}
function spawnUndead(kind) {
  const src = Math.random() < 0.75 && S.waveSrc ? S.waveSrc : (() => {
    const c = S.regions.filter(r => r.owner !== 'player'); const r = c.length ? c[(Math.random() * c.length) | 0] : { x: 40, y: 40 }; return r;
  })();
  const s = UNDEAD[kind];
  const u = { type: 'undead', kind, x: clamp(src.x + (Math.random() - .5) * 120, 10, W - 10), y: clamp(src.y + (Math.random() - .5) * 120, 10, H - 10),
    r: s.r, hp: s.hp, max: s.hp, speed: s.speed * (0.9 + Math.random() * 0.2), dmg: s.dmg, cd: 0, tgt: null, rt: 0, jit: (Math.random() - .5) };
  S.undead.push(u); S.stats.spawned++;
  if (kind === 'necro') { S.leader = u; toast('A Necromancer leads this wave!', 'bad'); }
}

// ---------- enemies ----------
function enemiesList() {
  const l = S.undead.concat(S.guardians);
  for (const b of S.buildings) if (b.owner === 'pale' && (b.type === 'tower' || b.type === 'fort')) l.push(b);
  return l;
}
function damage(e, dmg) {
  e.hp -= dmg;
  e.flash = 0.12;
  if (e.hp > 0) return;
  if (e.type === 'undead') {
    S.undead.splice(S.undead.indexOf(e), 1); S.kills++; S.coins += UNDEAD[e.kind].coin;
    S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.5, t0: 0.5 });
    S.fx.push({ k: 'coins', x: e.x, y: e.y - 4, t: 0.8, t0: 0.8, n: UNDEAD[e.kind].coin });
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
    if (e.kind === 'guardian') captureRegion(S.regions[e.region]); else retakeRegion(S.regions[e.region]);
  } else if (e.type === 'core') {
    loseRegion(S.regions[e.region]);
  } else if (BLD[e.type] && S.buildings.includes(e)) {
    S.buildings.splice(S.buildings.indexOf(e), 1);
    const si = S.stands.indexOf(e); if (si >= 0) S.stands.splice(si, 1);
    S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.6, t0: 0.6 });
    if (e.type === 'house' && e.owner === 'player') toast('A House was destroyed — housing reduced', 'bad');
    else if (e.tool && e.owner === 'player') toast('A tool stand was destroyed', 'bad');
    else if (e.type === 'gate' && e.owner === 'player') toast('A Gate was destroyed', 'bad');
  } else if (e.type === 'archer') {
    S.archers.splice(S.archers.indexOf(e), 1); S.stats.folkLost++;
  } else if (e.type === 'folk') {
    const i = S.folk.indexOf(e); if (i >= 0) S.folk.splice(i, 1);
    if (e.job && e.job.farmer === e) e.job.farmer = null;
    S.stats.folkLost++; S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.5, t0: 0.5 });
    toast(`A ${e.role} was slain`, 'bad');
  } else if (e === S.monarch) {
    gameOver('The Monarch has fallen');
  }
  if (S.monarch.target === e) S.monarch.target = null;
}

function captureRegion(r) {
  r.owner = 'player'; r.core = mkCore(r, TUNE.coreCaptured); S.mapDirty = true; S.stats.captures++;
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05 });
  let extra = '';
  if (r.bonus === 'fort') { S.buildings.push(mkBld('fort', r.x + 60, r.y + 10, r.id, 1)); extra = ' +free Encampment Fort'; }
  if (r.bonus === 'keep') { r.core.keep = true; r.core.max = r.core.hp = TUNE.coreKeep; extra = ' +free Ruin Keep'; }
  r.bonus = null;
  toast(`Region captured: ${r.name}!${extra}`, 'good');
}
function loseRegion(r) {
  r.owner = 'pale'; r.core = null; S.mapDirty = true; S.stats.losses++;
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05, bad: 1 });
  S.buildings = S.buildings.filter(b => !(b.region === r.id && b.built < 1)); // unfinished scaffolds collapse
  S.stands = S.stands.filter(st => S.buildings.includes(st) || st.region !== r.id);
  for (const b of S.buildings) if (b.region === r.id) { b.owner = 'pale'; b.hp = Math.max(b.hp, b.max * 0.5); if (b.farmer) b.farmer = null; }
  for (const a of S.archers.slice()) if (regionIdAt(a.x, a.y) === r.id && dist(a, S.monarch) > 300) S.archers.splice(S.archers.indexOf(a), 1);
  const hp = r.weakened ? 220 : 360;
  S.guardians.push({ kind: 'warden', name: 'Pale Warden', x: r.x, y: r.y, hx: r.x, hy: r.y, r: 24, hp, max: hp, dmg: 11, cd: 0, region: r.id });
  toast(`${r.name} lost to the Pale Host!`, 'bad');
  if (S.focus === r.id) pickFocus();
  if (!owned().length) gameOver('All regions lost to the Pale Host');
}
function retakeRegion(r) {
  r.owner = 'player'; r.core = mkCore(r, TUNE.coreRetaken); r.weakened = false; S.mapDirty = true; S.stats.retakes++;
  S.fx.push({ k: 'burst', x: r.x, y: r.y, t: 1.05, t0: 1.05 });
  let n = 0;
  for (const b of S.buildings) if (b.region === r.id && b.owner === 'pale') { b.owner = 'player'; b.hp = Math.ceil(b.max * 0.6); n++; }
  toast(`${r.name} retaken! ${n} building${n === 1 ? '' : 's'} returned (damaged)`, 'good');
}
function gameOver(why) {
  if (S.over) return; S.over = true;
  $('overTitle').textContent = why;
  $('overStats').innerHTML = `Nights survived: <b>${S.nights}</b><br>Regions held: <b>${owned().length}</b><br>Undead slain: <b>${S.kills}</b>`;
  $('over').hidden = false;
  const box = $('toasts');
  while (box.firstChild) box.firstChild.remove();
  $('bar').hidden = true; showMenu(false); if (S) S.dropHold = false;
  $('hint').textContent = '';
}

// ---------- update ----------
function blocksFriend(b) {
  if (!b || b.owner !== 'player' || b.built < 1) return false;
  if (b.type === 'farm' || b.type === 'gate' || b.tool || isStandType(b.type)) return false;
  return true;
}
function solidAt(x, y, r, friend) {
  for (const b of S.buildings) {
    if (friend && !blocksFriend(b)) continue;
    if (!friend && (b.owner !== 'player' || b.built < 1 || b.type === 'farm')) continue;
    if (Math.hypot(b.x - x, b.y - y) < b.r + r) return b;
  }
  return null;
}
function tryMove(e, nx, ny, friend) {
  nx = clamp(nx, 10, W - 10); ny = clamp(ny, 10, H - 10);
  if (!solidAt(nx, ny, e.r, friend) || solidAt(e.x, e.y, e.r, friend)) { e.x = nx; e.y = ny; return true; }
  if (!solidAt(nx, e.y, e.r, friend)) { e.x = nx; return true; }
  if (!solidAt(e.x, ny, e.r, friend)) { e.y = ny; return true; }
  return false;
}
function update(dt) {
  if (S.over) return;
  followCam(dt);
  S.t += dt; S.phaseT -= dt;
  if (S.phaseT <= 0) { if (S.phase === 'day') startNight(); else startDay(); }
  if (S.phase === 'day') { S.trickle += dt; if (S.trickle >= TUNE.trickleEvery) { S.trickle -= TUNE.trickleEvery; S.coins += owned().length; } }
  if (S.dropHold) { S.dropT -= dt; if (S.dropT <= 0) { S.dropT = 0.22; dropCoin(); } }
  if (S.phase === 'night' && S.spawnQ.length) { S.spawnT -= dt; if (S.spawnT <= 0) { S.spawnT = S.spawnGap; spawnUndead(S.spawnQ.shift()); } }
  const m = S.monarch;
  // movement
  let dx = 0, dy = 0;
  if (ptr && ptr.drag && !ptr.build && !ptr.wall && !pinch && !wallDrag && !(S && S.build)) { dx = (ptr.x - ptr.sx) / 60; dy = (ptr.y - ptr.sy) / 60; }
  if (keys.w || keys.arrowup) dy -= 1; if (keys.s || keys.arrowdown) dy += 1;
  if (keys.a || keys.arrowleft) dx -= 1; if (keys.d || keys.arrowright) dx += 1;
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  if (len > 0.05) { m.face = Math.atan2(dy, dx); }
  tryMove(m, m.x + dx * m.speed * dt, m.y + dy * m.speed * dt, true);
  // monarch attack
  m.cd -= dt;
  const enemies = enemiesList();
  let near = false;
  if (m.target && !enemies.includes(m.target)) m.target = null;
  if (m.cd <= 0) {
    let tgt = m.target && dist(m.target, m) - m.target.r <= 75 ? m.target : null;
    if (!tgt) { let bd = 75; for (const e of enemies) { const d = dist(e, m) - e.r; if (d < bd) { bd = d; tgt = e; } } }
    if (tgt) { m.cd = 0.45; S.fx.push({ k: 'slash', x: m.x, y: m.y, tx: tgt.x, ty: tgt.y, t: 0.18, t0: 0.18 }); damage(tgt, 22); if (S.over) return; }
  }
  for (const e of enemies) if (dist(e, m) < 260) { near = true; break; }
  if (!near) m.hp = Math.min(m.max, m.hp + 4 * dt);

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

  // buildings (towers)
  for (const b of S.buildings) {
    const spec = BLD[b.type]; if (!spec.range || b.built < 1) continue;
    b.cd -= dt; if (b.cd > 0) continue;
    if (b.owner === 'player') {
      let best = null, bd = spec.range;
      for (const u of S.undead) { const d = dist(u, b); if (d < bd) { bd = d; best = u; } }
      if (best) { b.cd = spec.cd; S.stats.towerShots++; const ay = b.y - (b.type === 'fort' ? 40 : 30); S.fx.push({ k: 'arrow', x: b.x, y: ay, tx: best.x, ty: best.y, t: 0.48, t0: 0.48, c: '#ffd27a' }); damage(best, spec.dmg); }
    } else {
      let best = null, bd = spec.range;
      for (const a of [m].concat(S.archers)) { const d = dist(a, b); if (d < bd) { bd = d; best = a; } }
      if (best) { b.cd = spec.cd * 1.4; S.stats.paleTowerShots++; const ay = b.y - (b.type === 'fort' ? 40 : 30); S.fx.push({ k: 'arrow', x: b.x, y: ay, tx: best.x, ty: best.y, t: 0.48, t0: 0.48, c: '#9dff7a' }); damage(best, 6); if (S.over) return; }
    }
  }

  updateDrops(dt);
  updateFolk(dt);
  // archers guard posts (towers > banners > walls); Rally makes nearby ones follow the monarch
  S.postT -= dt; if (S.postT <= 0) { S.postT = 1; assignPosts(); }
  const followers = S.archers.filter(a => a.follow);
  S.archers.forEach((a) => {
    let tx = a.x, ty = a.y, spd = 150;
    if (a.follow) {
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
    if (d > 4) { const sp = Math.min(d, spd * dt); tryMove(a, a.x + (tx - a.x) / d * sp, a.y + (ty - a.y) / d * sp, true); }
    a.cd -= dt;
    if (a.cd <= 0) {
      let best = null, bd = 210;
      for (const e of enemies) { if (!S.undead.includes(e) && !S.guardians.includes(e) && !(e.owner === 'pale')) continue; const dd = dist(e, a); if (dd < bd) { bd = dd; best = e; } }
      if (best) { a.cd = 0.9; S.fx.push({ k: 'arrow', x: a.x, y: a.y - 8, tx: best.x, ty: best.y - 6, t: 0.22, t0: 0.22, c: '#fff6e0' }); damage(best, 9); if (S.over) return; }
    }
  });

  // undead
  const playerBlds = S.buildings.filter(b => b.owner === 'player' && b.built >= 1 && b.type !== 'farm');
  const dmgK = (!S.chaos && S.leader) ? TUNE.leaderDmg : 1;
  for (const u of S.undead.slice()) {
    if (!S.undead.includes(u)) continue;
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
      const sp = u.speed * (S.chaos ? 0.75 : 1) * dt;
      const nx = u.x + (tx - u.x) / d * sp, ny = u.y + (ty - u.y) / d * sp;
      for (const b of playerBlds) if (Math.hypot(b.x - nx, b.y - ny) < b.r + u.r) { blocked = b; break; }
      if (!blocked) { u.x = nx; u.y = ny; }
    }
    u.cd -= dt;
    if (u.kind === 'necro' && !S.chaos) { u.raiseT = (u.raiseT == null ? TUNE.necroRaiseEvery : u.raiseT) - dt; if (u.raiseT <= 0) { u.raiseT = TUNE.necroRaiseEvery; raiseDead(u); } }
    if (blocked && u.cd <= 0 && u.kind !== 'necro') { u.cd = 1; damage(blocked, u.dmg * dmgK); S.fx.push({ k: 'hit', x: blocked.x, y: blocked.y, t: 0.15, t0: 0.15 }); if (S.over) return; }
    if (u.kind === 'necro' && dist(u, m) < 140 && u.cd <= 0) { u.cd = 1.3; S.fx.push({ k: 'arrow', x: u.x, y: u.y - 10, tx: m.x, ty: m.y - 8, t: 0.24, t0: 0.24, c: '#c6ff8a', bolt: 1 }); damage(m, u.dmg); if (S.over) return; }
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

  for (const f of S.fx) f.t -= dt;
  S.fx = S.fx.filter(f => f.t > 0);
}

function pickUndeadTarget(u, playerBlds) {
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
function paintShambler(frame) {
  const spr = bake(32, 34, g => {
    const step = frame ? 3 : 0;
    g.fillStyle = '#6d7a58';
    g.fillRect(10, 24, 4, 8);
    g.fillRect(18, 22 - step * 0.3, 3.4, 10);
    ell(g, 16, 20, 8, 7, '#9aaa78');
    ell(g, 18, 22, 5, 5, '#7d8c64');
    ell(g, 8, 18, 3.2, 2.2, '#9aaa78', 0.4);
    g.strokeStyle = '#7d8c64';
    g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(8, 18); g.quadraticCurveTo(2, 24, 4, 30); g.stroke();
    disc(g, 4, 30, 1.6, '#c5d0a4');
    ell(g, 20, 12, 5, 4.6, '#c5d0a4', 0.4);
    disc(g, 18.2, 11.6, 0.7, '#1c2418');
    disc(g, 21.2, 12.2, 0.7, '#1c2418');
    g.fillStyle = '#5c6848';
    g.fillRect(12, 16, 8, 3);
  });
  spr.gy = 32;
  return spr;
}
function paintSkeleton(frame) {
  const spr = bake(28, 36, g => {
    const step = frame ? 2 : 0;
    g.strokeStyle = '#e7e0d4';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(11, 24); g.lineTo(10, 33);
    g.moveTo(17, 24); g.lineTo(18 + step, 33);
    g.moveTo(8, 18); g.lineTo(3, 26);
    g.moveTo(18, 16); g.lineTo(24, 22);
    g.stroke();
    ell(g, 14, 20, 5, 6, '#e7e0d4');
    g.strokeStyle = '#b7ad9e';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(11, 18); g.lineTo(17, 18);
    g.moveTo(11.5, 20.5); g.lineTo(16.5, 20.5);
    g.moveTo(12, 23); g.lineTo(16, 23);
    g.stroke();
    disc(g, 14, 10, 4.4, '#f4f0e8');
    disc(g, 12.4, 9.6, 1, '#2a241c');
    disc(g, 15.8, 9.6, 1, '#2a241c');
    poly(g, [[12, 12.2], [14, 13.6], [16, 12.2]], '#2a241c');
    g.strokeStyle = '#d9d0c2';
    g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(22, 20); g.lineTo(26, 8); g.stroke();
  });
  spr.gy = 34;
  return spr;
}
function paintNecro(frame) {
  const spr = bake(34, 52, g => {
    const sway = frame ? 2 : -1;
    g.fillStyle = '#241c38';
    g.beginPath(); g.moveTo(17, 16); g.lineTo(30, 46); g.quadraticCurveTo(17, 42 + sway, 4, 48); g.closePath(); g.fill();
    g.fillStyle = '#3a3058';
    g.beginPath(); g.moveTo(17, 16); g.lineTo(8, 46); g.quadraticCurveTo(14, 36, 17, 22); g.fill();
    g.fillStyle = '#4a4068';
    poly(g, [[6, 40], [2, 50], [12, 44]], '#4a4068');
    disc(g, 17, 14, 5, '#d9d3c4');
    g.fillStyle = '#241c38';
    g.beginPath(); g.arc(17, 13, 5.4, Math.PI * 0.95, Math.PI * 2.05); g.quadraticCurveTo(24, 4, 17, 2); g.quadraticCurveTo(10, 4, 11, 13); g.fill();
    disc(g, 15.4, 14, 0.7, '#9dff7a');
    disc(g, 18.6, 14, 0.7, '#9dff7a');
    g.strokeStyle = '#6b5a3a';
    g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(26, 46); g.lineTo(28, 6); g.stroke();
    disc(g, 28, 6, 2.4, '#1a2218');
  });
  spr.gy = 48;
  spr.orb = { dx: 28 - 17, dy: 6 - 48 };
  return spr;
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
    if (tool === 'bow') {
      g.strokeStyle = '#6b4630'; g.lineWidth = 2; g.beginPath(); g.arc(5, 9, 6.4, -1.15, 1.15); g.stroke();
      g.strokeStyle = '#f6efe2'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(7.2, 3.2); g.lineTo(7.2, 14.8); g.stroke();
      g.fillStyle = '#c4473a'; g.beginPath(); g.moveTo(12, 8); g.lineTo(15.5, 9); g.lineTo(12, 10); g.fill();
    } else if (tool === 'hammer') {
      g.strokeStyle = '#6b4630'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(8, 16.5); g.lineTo(8, 6); g.stroke();
      g.fillStyle = '#9aa3ad'; g.fillRect(2.4, 2.2, 11, 4.6);
      g.fillStyle = '#e4e8ee'; g.fillRect(2.4, 2.2, 11, 1.5);
    } else {
      g.strokeStyle = '#6b4630'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(11, 16.5); g.lineTo(12, 3); g.stroke();
      g.strokeStyle = '#e7eef4'; g.lineWidth = 2; g.beginPath(); g.moveTo(12, 3.2); g.quadraticCurveTo(4, 1.2, 1.4, 7); g.stroke();
    }
  });
}
function paintSignTool(g, tool) {
  g.fillStyle = '#f3e6c4'; g.fillRect(14, 2.2, 12, 8);
  g.strokeStyle = '#6e4328'; g.lineWidth = 1; g.strokeRect(14, 2.2, 12, 8);
  g.save(); g.translate(16.2, 3.2); g.scale(0.55, 0.42);
  if (tool === 'bow') {
    g.strokeStyle = '#6b4630'; g.lineWidth = 2.4; g.beginPath(); g.arc(6, 8, 6, -1.1, 1.1); g.stroke();
  } else if (tool === 'hammer') {
    g.fillStyle = '#8d96a0'; g.fillRect(2, 2, 10, 4); g.strokeStyle = '#6b4630'; g.lineWidth = 2; g.beginPath(); g.moveTo(7, 6); g.lineTo(7, 14); g.stroke();
  } else {
    g.strokeStyle = '#d5dde4'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(12, 3); g.quadraticCurveTo(4, 2, 2, 8); g.stroke();
    g.strokeStyle = '#6b4630'; g.beginPath(); g.moveTo(10, 4); g.lineTo(8, 14); g.stroke();
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
  Art.shambler = [0, 1].map(paintShambler);
  Art.skeleton = [0, 1].map(paintSkeleton);
  Art.necro = [0, 1].map(paintNecro);
  Art.folk = {
    vagrant: ['idle', 'walk0', 'walk1'].map(p => paintFolk('vagrant', p)),
    villager: ['idle', 'walk0', 'walk1', 'pickup'].map(p => paintFolk('villager', p)),
    builder: ['idle', 'walk0', 'walk1', 'work0', 'work1', 'work2'].map(p => paintFolk('builder', p)),
    farmer: ['idle', 'walk0', 'walk1', 'work0', 'work1', 'work2'].map(p => paintFolk('farmer', p)),
  };
  Art.tool = { bow: paintToolIcon('bow'), hammer: paintToolIcon('hammer'), scythe: paintToolIcon('scythe') };
  Art.stand = { bow: paintStand('bow'), hammer: paintStand('hammer'), scythe: paintStand('scythe') };
  Art.house = paintHouse('live'); Art.houseDmg = paintHouse('dmg'); Art.houseP = paintHouse('pale');
  Art.farm = { tilled: paintFarm('tilled'), growing: paintFarm('growing'), ripe: paintFarm('ripe'), pale: paintFarm('pale') };
  Art.scaffold = [0, 1, 2].map(paintScaffold);
  Art.orderMark = paintOrderMark();
  Art.camp = paintCamp();
  Art.coinFrames = [0, 1, 2, 3, 4, 5].map(paintCoinFrame);
  Art.coin = Art.coinFrames[0];
  Art.shimmer = paintShimmer();
  Art.flame = paintRadial(18, 22, [[0, 'rgba(255,250,220,.95)'], [0.35, 'rgba(255,170,60,.9)'], [1, 'rgba(255,120,40,0)']]);
  Art.flameG = paintRadial(18, 22, [[0, 'rgba(236,255,220,.95)'], [0.35, 'rgba(150,230,90,.9)'], [1, 'rgba(80,160,50,0)']]);
  Art.orb = paintRadial(24, 24, [[0, 'rgba(230,255,210,1)'], [0.35, 'rgba(140,255,90,.85)'], [1, 'rgba(80,180,40,0)']]);
  Art.fog = paintRadial(128, 80, [[0, 'rgba(196,204,186,.55)'], [0.5, 'rgba(170,180,160,.22)'], [1, 'rgba(170,180,160,0)']]);
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
    trees.push({ x, y, v: (rnd() * 3) | 0, s: 0.84 + rnd() * 0.42, ph: rnd() * 6.28, rid: regionIdAt(x, y) });
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
    rocks.push({ x, y, v: (rnd() * 2) | 0, s: 0.75 + rnd() * 0.7, rid: regionIdAt(x, y) });
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
function placeTag(txt, wx, wy, size, col, accent) {
  const sh = (size + 8) * scale;
  const p = w2s(wx, wy);
  if (p.y - sh / 2 < TOP_CHROME || p.y + sh / 2 > vh - BOT_CHROME) return;
  tag(txt, wx, wy, size, col, accent);
}
function placeTagClamped(txt, wx, wy, size, col, accent) {
  ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
  const sh = (size + 8) * scale;
  const tw = (ctx.measureText(txt).width + 16) * scale;
  const p = w2s(wx, wy);
  p.x = clamp(p.x, tw / 2 + 8, vw - tw / 2 - 8);
  p.y = clamp(p.y, TOP_CHROME + sh / 2 + 2, vh - BOT_CHROME - sh / 2 - 2);
  const w = s2w(p.x, p.y);
  tag(txt, w.x, w.y, size, col, accent);
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
}
function drawRock(rk) {
  const spr = Art.rock[rk.v];
  shadow(rk.x, rk.y, 8 * rk.s, 3.5 * rk.s);
  blit(spr, rk.x, rk.y, { sc: rk.s });
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
  if (b.type === 'wall') {
    const wood = (((b.x * 3 + b.y * 5) | 0) & 1) === 0;
    return pale ? (wood ? Art.wallWP : Art.wallSP) : (wood ? Art.wallW : Art.wallS);
  }
  if (b.type === 'gate') return pale ? Art.gateP : (gateOpen(b) ? Art.gateO : Art.gateC);
  if (b.tool) return Art.stand[b.tool] || Art.stand.bow;
  if (b.type === 'fort') return pale ? Art.fortP : Art.fort;
  if (b.type === 'house') return pale ? Art.houseP : (b.hp < b.max ? Art.houseDmg : Art.house);
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
  if (!busy) blit(Art.orderMark, b.x - 14 * sc, b.y + 2, { sc: 0.9 });
  bar(b.x, b.y + 10, 40, b.built, '#8fd06a');
  if (!S.folk.some(f => f.role === 'builder')) placeTag('Needs a Builder', b.x, b.y + 26, 11, '#ffe6b0', '#e6c27a');
  else if (!busy) placeTag(NICE[b.type] + ' · waiting', b.x, b.y + 26, 11, '#fff6e4', null);
}
function drawBuilding(b) {
  if (b.built < 1) return drawScaffold(b);
  if (b.tool) return drawStand(b);
  if (b.type === 'farm') {
    const pale = b.owner === 'pale';
    const worked = b.farmer && S.folk.includes(b.farmer);
    const prog = b.prog || 0;
    const spr = pale ? Art.farm.pale : (worked && prog > TUNE.farmEvery * 0.55) ? Art.farm.ripe : (worked || prog > 0.8) ? Art.farm.growing : Art.farm.tilled;
    blit(spr, b.x, b.y + 6);
    if (b.hp < b.max) bar(b.x, b.y + 12, 36, b.hp / b.max, pale ? '#7dce6a' : '#e2a23a');
    if (!pale && !(b.farmer && S.folk.includes(b.farmer))) placeTag('Needs a Farmer', b.x, b.y + 22, 11, '#ffe6b0', '#e6c27a');
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
  if (b.type === 'fort') placeTag('FORT', b.x, b.y + 18, 11, '#fff6e4', pale ? '#9ddea8' : '#e6c27a');
}
function drawCore(k) {
  const x = k.x, y = k.y, keep = !!k.keep;
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
    drawFlag(x + 1.3, y - 38, 16, 10, Math.sin(S.t * 3.4 + y), '#3e74c8', false);
    disc(ctx, x, y - 40, 2.1, '#f0c14a');
    flameAt(x - 10, y - 4, false, x);
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
  if (f.working && (f.role === 'builder' || f.role === 'farmer')) idx = 3 + ((S.t * (f.role === 'builder' ? 8 : 6)) | 0) % 3;
  else if (f.role === 'villager' && f.stand && Math.hypot(f.x - f.stand.x, f.y - f.stand.y) < 24) idx = 3;
  let bob = mot.bob;
  if (f.working && f.role === 'builder') bob += Math.abs(Math.sin(S.t * 9)) * -1.2;
  shadow(f.x, f.y + 3, 8, 3.4);
  blit(set[idx] || set[0], f.x, f.y + 4, { flip: mot.flip, bob });
  if (f.working && f.role === 'builder' && ((S.t * 3) | 0) % 2 === 0 && Math.sin(S.t * 9) > 0.9) S.fx.push({ k: 'hit', x: f.x + (mot.flip ? -12 : 12), y: f.y - 6, t: 0.15, t0: 0.15 });
  flashAt(f.x, f.y - 8, 8, 10, f.flash);
}
function drawStand(st) {
  shadow(st.x, st.y + 2, 18, 5);
  blit(Art.stand[st.tool] || Art.stand.bow, st.x, st.y);
  const ic = Art.tool[st.tool];
  for (let i = 0; i < st.tools; i++) ctx.drawImage(ic.c, st.x - 15 + i * 10, st.y - 22, 12, 13.5);
  const c = TOOL[st.tool].cost;
  if (st.paid > 0) for (let i = 0; i < c; i++) {
    ctx.globalAlpha = i < st.paid ? 1 : 0.3;
    ctx.drawImage(Art.coin.c, st.x - (c * 9) / 2 + i * 9, st.y - 46, 9, 9);
  }
  ctx.globalAlpha = 1;
}
function drawStockBadge(st) {
  if (!st || st.built < 1) return;
  const p = w2s(st.x, st.y - 28);
  const size = 16, pad = 7, ih = 16;
  const txt = String(st.tools);
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
  ctx.strokeStyle = st.tools ? '#8ee0b0' : '#e6c27a';
  ctx.stroke();
  const ic = Art.tool[st.tool];
  if (ic) ctx.drawImage(ic.c, x + pad, y + (h - ih) / 2, ih, ih);
  ctx.fillStyle = st.tools ? '#e9fff2' : '#fff6e4';
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
function drawWallCostBadge() {
  if (!wallDrag || !wallDrag.plan) return;
  const plan = wallDrag.plan;
  const n = plan.filter(pt => pt.ok).length;
  const cost = n * COST.wall, afford = S.coins >= cost && n > 0;
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
function drawUndead(u) {
  const mot = actorMotion(u);
  if (u.kind === 'necro') {
    ctx.save();
    ctx.translate(u.x, u.y + 2);
    ctx.strokeStyle = S.chaos ? 'rgba(140,140,140,.55)' : 'rgba(170,255,140,.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, S.t * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  shadow(u.x, u.y + 3, u.kind === 'necro' ? 10 : 8, 3.6);
  const set = u.kind === 'necro' ? Art.necro : u.kind === 'skeleton' ? Art.skeleton : Art.shambler;
  const spr = set[mot.fr];
  blit(spr, u.x, u.y + 3, mot);
  if (u.kind === 'necro') {
    const pulse = 0.85 + Math.sin(S.t * 5) * 0.2;
    const ox = mot.flip ? -spr.orb.dx : spr.orb.dx;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(Art.orb.c, u.x + ox - 7 * pulse, u.y + 3 + mot.bob + spr.orb.dy - 7 * pulse, 14 * pulse, 14 * pulse);
    ctx.globalAlpha = 1;
  }
  flashAt(u.x, u.y - 8, 8, 10, u.flash);
  if (u.hp < u.max) bar(u.x, u.y - 20, 26, u.hp / u.max, '#e15a4a');
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
    if (f.bolt) {
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
    if (f.n >= 10) placeTag('+' + f.n, f.x, f.y - 26 - u * 12, 12, '#ffd56a', '#e6c27a');
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
    if (r.core && r.owner === 'player') lightList.push({ x: r.core.x, y: r.core.y - 8, r: r.core.keep ? 128 : 108, pale: false });
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
  if (k < 0.12) return;
  const a = Math.min(1, k);
  for (const u of S.undead) {
    if (!vis(u.x, u.y)) continue;
    const p = w2s(u.x, u.y - 10);
    const big = u.kind === 'necro';
    const rx = (big ? 18 : 13) * scale, ry = (big ? 24 : 16) * scale;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = big ? `rgba(186,255,150,${0.55 * a})` : `rgba(244,255,232,${0.62 * a})`;
    ctx.fill();
    ctx.strokeStyle = big ? `rgba(198,255,138,${0.95 * a})` : `rgba(240,255,226,${0.95 * a})`;
    ctx.lineWidth = big ? 2.4 : 2;
    ctx.stroke();
    ctx.fillStyle = big ? '#d6ff8a' : '#f7fff2';
    const eye = Math.max(1.7, 2.15 * scale);
    const flip = u._flip ? -1 : 1;
    ctx.beginPath(); ctx.arc(p.x + flip * rx * 0.2, p.y - ry * 0.12, eye, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + flip * rx * 0.46, p.y - ry * 0.06, eye, 0, 6.3); ctx.fill();
  }
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

  pileN = 0;
  for (const t of S.trees) if (vis(t.x, t.y)) pushP(t.y, 'tree', t);
  for (const rk of S.rocks) if (vis(rk.x, rk.y)) pushP(rk.y, 'rock', rk);
  for (const b of S.buildings) if (vis(b.x, b.y)) pushP(b.type === 'farm' && b.built >= 1 ? b.y - 30 : b.y, 'bld', b);
  for (const r of S.regions) if (r.core && vis(r.x, r.y)) pushP(r.core.y, 'core', r.core);
  for (const g of S.guardians) if (vis(g.x, g.y)) pushP(g.y, 'guard', g);
  for (const a of S.archers) if (vis(a.x, a.y)) pushP(a.y, 'arch', a);
  for (const f of S.folk) if (vis(f.x, f.y)) pushP(f.y, 'folk', f);
  for (const d of S.drops) if (vis(d.x, d.y)) pushP(d.y + 0.5, 'drop', d);
  if (S.camp && vis(S.camp.x, S.camp.y)) pushP(S.camp.y, 'camp', S.camp);
  for (const u of S.undead) if (vis(u.x, u.y)) pushP(u.y, 'und', u);
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
      else if (it.k === 'guard') drawGuardian(it.a);
      else if (it.k === 'arch') drawArcher(it.a);
      else if (it.k === 'und') drawUndead(it.a);
      else if (it.k === 'folk') drawFolk(it.a);
      else if (it.k === 'stand') drawStand(it.a);
      else if (it.k === 'drop') drawDrop(it.a);
      else if (it.k === 'camp') drawCamp(it.a);
      else drawMonarch();
    } catch (err) {
      try { ctx.restore(); } catch (_) {}
      if (!S._drawErr) { S._drawErr = String(err); console.error('draw error', it.k, err); }
    }
  }

  for (const r of S.regions) if (vis(r.x, r.y)) {
    const st = r.owner === 'player' ? 'YOURS' : r.owner === 'pale' ? 'PALE HOST' : (r.bonus === 'fort' ? 'WILD · fort' : r.bonus === 'keep' ? 'WILD · keep' : 'WILD');
    const lift = r.core && r.core.keep ? 108 : 86;
    placeTag(r.name, r.x, r.y - lift, 18, '#fff8ee', null);
    placeTag(st, r.x, r.y - lift + 24, 12, r.owner === 'player' ? '#d6e6ff' : r.owner === 'pale' ? '#d7f0cc' : '#ffe6b0', r.owner === 'player' ? '#7eb0ee' : r.owner === 'pale' ? '#9ddea8' : '#e6c27a');
    if (r.core && r.core.keep) placeTag('KEEP', r.x, r.y + 22, 11, '#fff6e4', '#e6c27a');
  }
  for (const g of S.guardians) {
    if (!vis(g.x, g.y) || !edgeOf(g.x, g.y).on) continue;
    nameTag(g.name, g.x, g.y + g.r + 16, 13, g.kind === 'warden' ? '#d7f0cc' : '#ffd0c8', g.kind === 'warden' ? '#9ddea8' : '#e07a68');
  }
  if (S.camp && vis(S.camp.x, S.camp.y)) placeTagClamped('Vagrant camp', S.camp.x, S.camp.y + 18, 12, '#fff6e4', '#c9b488');
  drawWallGhosts();
  for (const a of S.archers) if (a.follow && vis(a.x, a.y)) { ctx.strokeStyle = 'rgba(240,193,74,.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(a.x, a.y + 3, 11, 4.5, 0, 0, Math.PI * 2); ctx.stroke(); }

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
  for (const st of S.stands) if (st.built >= 1) drawStockBadge(st);
  drawWallCostBadge();
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
  setVal('hCoins', 'c', String(S.coins));
  const t = Math.max(0, Math.ceil(S.phaseT)), mm = (t / 60) | 0, ss = String(t % 60).padStart(2, '0');
  setVal('hPhase', 'p', (S.phase === 'day' ? 'Day ' : 'Night ') + mm + ':' + ss);
  $('hPhase').classList.toggle('night', S.phase === 'night');
  setVal('hNights', 'n', String(S.nights));
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
    const cost = n * COST.wall;
    $('hint').textContent = n
      ? (`${n} wall${n === 1 ? '' : 's'} · ${cost} coins` + (S.coins < cost ? ' — not enough' : ' · release to order, Cancel to stop'))
      : ((wallDrag.plan[0] && wallDrag.plan[0].why) || 'Drag to lay a Wall · Cancel to stop');
  } else if (S.build === 'wall' && !$('hint').textContent) {
    $('hint').textContent = `Drag to lay a Wall · ${COST.wall} coins each · Cancel to stop`;
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
  const steps = Math.max(1, Math.min(40, (window.__bc && window.__bc.timeScale) | 0));
  for (let i = 0; i < steps && !S.over; i++) update(dt);
  render(); drawHud();
  requestAnimationFrame(frame);
}

// ---------- debug / test hooks ----------
window.__bc = {
  get S() { return S; }, get fps() { return fps; }, w2s, s2w, regionIdAt, skipPhase, newGame,
  get zoom() { return zoom; }, set zoom(z) { zoom = z; applyScale(); },
  get scale() { return scale; },
  setZoomAt, planWallLine, commitWallLine, placeBlocked, swapWallForGate, gateOpen, solidAt, tryMove,
  get wallDrag() { return wallDrag; },
  setWallDrag(x0, y0, x1, y1) { wallDrag = { x0, y0, x1, y1, plan: planWallLine(x0, y0, x1, y1) }; return wallDrag.plan; },
  clearWallDrag() { wallDrag = null; },
  teleport(x, y) { S.monarch.x = x; S.monarch.y = y; lookX = x; lookY = y; },
  coins(n) { S.coins += n; }, heal() { S.monarch.hp = S.monarch.max; },
  forceLose(id) { const r = S.regions[id]; if (r && r.core) damage(r.core, r.core.hp + 1); },
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
    const spec = UNDEAD[kind] || UNDEAD.shambler;
    const u = { type: 'undead', kind, x, y, r: spec.r, hp: spec.hp, max: spec.hp, speed: spec.speed, dmg: spec.dmg, cd: 0, tgt: null, rt: 0, jit: 0 };
    S.undead.push(u); S.stats.spawned++;
    return u;
  },
  timeScale: 1, TUNE, dropCoin, workers, housingCap, toggleRally, debug: DEBUG,
};

buildArt();
newGame();
requestAnimationFrame(frame);
})();
