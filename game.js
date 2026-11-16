/* Boundless Crown — playable core-loop prototype. Vanilla JS, no deps. */
(() => {
'use strict';
const W = 2400, H = 2400, CX = W / 2, CY = H / 2;
const DAY = 60, NIGHT = 45, CELL = 8, GW = W / CELL, GH = H / CELL;
const COST = { wall: 5, tower: 15, archer: 10 };
const NAMES = ['Crownhold', 'Ashford', 'Briarmoor', 'Coldwater', 'Duskfen', 'Elmreach', 'Frostgate', 'Gloamwood'];
const UNDEAD = {
  shambler: { hp: 30, speed: 42, dmg: 6, r: 12, coin: 2, col: '#b9c9a3' },
  skeleton: { hp: 20, speed: 64, dmg: 5, r: 11, coin: 2, col: '#f4f4ee' },
  necro:    { hp: 90, speed: 40, dmg: 8, r: 15, coin: 10, col: '#7b35a8' },
};
const BLD = {
  wall:  { hp: 160, r: 16 },
  tower: { hp: 120, r: 16, range: 230, cd: 0.7, dmg: 14 },
  fort:  { hp: 300, r: 22, range: 250, cd: 0.6, dmg: 18 },
};

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
let dpr = 1, vw = 0, vh = 0, scale = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  vw = innerWidth; vh = innerHeight;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  scale = Math.max(0.55, Math.min(1.3, vw / 560));
}
addEventListener('resize', resize); resize();

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

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
    seed, t: 0, phase: 'day', phaseT: DAY, day: 1, nights: 0, coins: 30, trickle: 0,
    regions: [], buildings: [], archers: [], undead: [], guardians: [], fx: [],
    spawnQ: [], spawnT: 0, spawnGap: 1, leader: null, chaos: false, focus: null, waveSrc: null,
    build: null, over: false, kills: 0, mapDirty: true,
    stats: { towerShots: 0, paleTowerShots: 0, spawned: 0, captures: 0, losses: 0, retakes: 0 },
    monarch: { x: 0, y: 0, r: 16, hp: 120, max: 120, cd: 0, target: null, speed: 190, vx: 0, vy: 0, face: 0 },
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
  home.core = mkCore(home, 300);
  for (const r of S.regions) {
    if (r.id === 0) continue;
    r.bonus = rnd() < 0.6 ? (rnd() < 0.5 ? 'fort' : 'keep') : null;
    const d = Math.hypot(r.x - CX, r.y - CY);
    S.guardians.push({ kind: 'guardian', name: 'Guardian', x: r.x, y: r.y, hx: r.x, hy: r.y, r: 22,
      hp: Math.round(140 + d * 0.08), max: Math.round(140 + d * 0.08), dmg: 9, cd: 0, region: r.id });
  }
  S.monarch.x = home.x; S.monarch.y = home.y + 60;
  S.focus = null;
  $('over').hidden = true;
  setBuild(null);
  toast('Capture regions by beating their Guardians', '');
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
let ptr = null; const keys = {};
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); if (ptr) return;
  ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, drag: false, t: performance.now() };
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
});
cv.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  ptr.x = e.clientX; ptr.y = e.clientY;
  if (Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy) > 14) ptr.drag = true;
});
const endPtr = e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (!ptr.drag && performance.now() - ptr.t < 600 && e.type === 'pointerup') onTap(ptr.x, ptr.y);
  ptr = null;
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === 'n') skipPhase(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

$('bar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !S || S.over) return;
  const a = b.dataset.act;
  if (a === 'cancel') return setBuild(null);
  if (a === 'archer') return recruitArcher();
  setBuild(a); // stays selected for repeat placement; Cancel exits
});
$('btnSkip').addEventListener('click', () => skipPhase());
$('btnRestart').addEventListener('click', () => newGame());

function setBuild(t) {
  if (!S) return;
  S.build = t; S.mapDirty = true;
  for (const b of document.querySelectorAll('#bar button')) b.classList.toggle('sel', !!t && b.dataset.act === t);
  $('hint').textContent = t ? `Tap inside your blue land to place a ${t} (${COST[t]}🪙)` : '';
}

function camera() {
  const m = S.monarch, hw = vw / 2 / scale, hh = vh / 2 / scale;
  return { x: clamp(m.x, Math.min(hw, CX), Math.max(W - hw, CX)), y: clamp(m.y, Math.min(hh, CY), Math.max(H - hh, CY)) };
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

function tryPlace(type, x, y) {
  const rid = regionIdAt(x, y), r = S.regions[rid];
  if (r.owner !== 'player') return toast('You can only build in captured land', 'bad');
  if (x < 20 || y < 20 || x > W - 20 || y > H - 20) return;
  if (S.coins < COST[type]) return toast(`Need ${COST[type]} coins`, 'bad');
  if (r.core && dist(r.core, { x, y }) < 40) return toast('Too close to the banner', 'bad');
  for (const b of S.buildings) if (dist(b, { x, y }) < b.r + 16) return toast('Spot taken', 'bad');
  S.coins -= COST[type];
  const spec = BLD[type];
  const b = { type, x, y, r: spec.r, hp: spec.hp, max: spec.hp, owner: 'player', region: rid, cd: 0 };
  S.buildings.push(b);
  return b;
}

function recruitArcher() {
  if (S.coins < COST.archer) return toast(`Need ${COST.archer} coins`, 'bad');
  const r = S.regions[regionIdAt(S.monarch.x, S.monarch.y)];
  if (r.owner !== 'player') return toast('Recruit inside your own land', 'bad');
  S.coins -= COST.archer;
  const a = { type: 'archer', x: S.monarch.x + (Math.random() - .5) * 40, y: S.monarch.y + 30, r: 10, hp: 40, max: 40, cd: 0,
    slot: S.archers.length };
  S.archers.push(a);
  toast('Archer recruited — they follow you', 'good');
}

// ---------- phases ----------
function skipPhase() { if (!S || S.over) return; S.phaseT = 0; }
function startNight() {
  S.phase = 'night'; S.phaseT = NIGHT; S.chaos = false; S.leader = null;
  const n = 6 + 3 * S.nights + owned().length;
  const q = [];
  for (let i = 0; i < n; i++) q.push(Math.random() < 0.5 ? 'shambler' : 'skeleton');
  q.splice(Math.min(2, q.length), 0, 'necro');
  S.spawnQ = q; S.spawnGap = Math.min(1.1, 22 / q.length); S.spawnT = 0.5;
  // ordered wave: one main source (farthest non-owned region or a map edge)
  const srcs = S.regions.filter(r => r.owner !== 'player').map(r => ({ x: r.x, y: r.y }));
  const edges = [{ x: 40, y: Math.random() * H }, { x: W - 40, y: Math.random() * H }, { x: Math.random() * W, y: 40 }, { x: Math.random() * W, y: H - 40 }];
  const all = srcs.concat(edges);
  S.waveSrc = all[(Math.random() * all.length) | 0];
  pickFocus();
  toast(`Night ${S.nights + 1} — the Pale Host marches!`, 'bad');
}
function pickFocus() {
  const o = owned().filter(r => r.core); if (!o.length) { S.focus = null; return; }
  const src = S.waveSrc || { x: CX, y: CY };
  o.sort((a, b) => dist(a, src) - dist(b, src)); S.focus = o[0].id;
}
function startDay() {
  S.phase = 'day'; S.phaseT = DAY; S.nights++; S.day++; S.spawnQ = [];
  for (const u of S.undead) S.fx.push({ k: 'puff', x: u.x, y: u.y, t: 0.6 });
  S.undead = []; S.leader = null; S.chaos = false;
  S.monarch.hp = Math.min(S.monarch.max, S.monarch.hp + 40);
  toast(`Dawn! Night ${S.nights} survived — the dead crumble`, 'good');
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
  for (const b of S.buildings) if (b.owner === 'pale' && b.type !== 'wall') l.push(b);
  return l;
}
function damage(e, dmg) {
  e.hp -= dmg;
  if (e.hp > 0) return;
  if (e.type === 'undead') {
    S.undead.splice(S.undead.indexOf(e), 1); S.kills++; S.coins += UNDEAD[e.kind].coin;
    S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.5 });
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
    S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.8, big: 1 });
    if (e.kind === 'guardian') captureRegion(S.regions[e.region]); else retakeRegion(S.regions[e.region]);
  } else if (e.type === 'core') {
    loseRegion(S.regions[e.region]);
  } else if (e.type === 'wall' || e.type === 'tower' || e.type === 'fort') {
    S.buildings.splice(S.buildings.indexOf(e), 1); S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0.6 });
  } else if (e.type === 'archer') {
    S.archers.splice(S.archers.indexOf(e), 1);
  } else if (e === S.monarch) {
    gameOver('The Monarch has fallen');
  }
  if (S.monarch.target === e) S.monarch.target = null;
}

function captureRegion(r) {
  r.owner = 'player'; r.core = mkCore(r, 250); S.mapDirty = true; S.stats.captures++;
  let extra = '';
  if (r.bonus === 'fort') { S.buildings.push({ type: 'fort', x: r.x + 60, y: r.y + 10, r: BLD.fort.r, hp: BLD.fort.hp, max: BLD.fort.hp, owner: 'player', region: r.id, cd: 0 }); extra = ' +free Encampment Fort'; }
  if (r.bonus === 'keep') { r.core.keep = true; r.core.max = r.core.hp = 450; extra = ' +free Ruin Keep'; }
  r.bonus = null;
  toast(`Region captured: ${r.name}!${extra}`, 'good');
}
function loseRegion(r) {
  r.owner = 'pale'; r.core = null; S.mapDirty = true; S.stats.losses++;
  for (const b of S.buildings) if (b.region === r.id) { b.owner = 'pale'; b.hp = Math.max(b.hp, b.max * 0.5); }
  for (const a of S.archers.slice()) if (regionIdAt(a.x, a.y) === r.id && dist(a, S.monarch) > 300) S.archers.splice(S.archers.indexOf(a), 1);
  const hp = r.weakened ? 220 : 360;
  S.guardians.push({ kind: 'warden', name: 'Pale Warden', x: r.x, y: r.y, hx: r.x, hy: r.y, r: 24, hp, max: hp, dmg: 11, cd: 0, region: r.id });
  toast(`${r.name} lost to the Pale Host!`, 'bad');
  if (S.focus === r.id) pickFocus();
  if (!owned().length) gameOver('All regions lost to the Pale Host');
}
function retakeRegion(r) {
  r.owner = 'player'; r.core = mkCore(r, 180); r.weakened = false; S.mapDirty = true; S.stats.retakes++;
  let n = 0;
  for (const b of S.buildings) if (b.region === r.id && b.owner === 'pale') { b.owner = 'player'; b.hp = Math.ceil(b.max * 0.6); n++; }
  toast(`${r.name} retaken! ${n} building${n === 1 ? '' : 's'} returned (damaged)`, 'good');
}
function gameOver(why) {
  if (S.over) return; S.over = true;
  $('overTitle').textContent = why;
  $('overStats').innerHTML = `Nights survived: <b>${S.nights}</b><br>Regions held: <b>${owned().length}</b><br>Undead slain: <b>${S.kills}</b>`;
  $('over').hidden = false;
}

// ---------- update ----------
function update(dt) {
  if (S.over) return;
  S.t += dt; S.phaseT -= dt;
  if (S.phaseT <= 0) { if (S.phase === 'day') startNight(); else startDay(); }
  if (S.phase === 'day') { S.trickle += dt; if (S.trickle >= 3) { S.trickle -= 3; S.coins += owned().length; } }
  if (S.phase === 'night' && S.spawnQ.length) { S.spawnT -= dt; if (S.spawnT <= 0) { S.spawnT = S.spawnGap; spawnUndead(S.spawnQ.shift()); } }
  const m = S.monarch;
  // movement
  let dx = 0, dy = 0;
  if (ptr && ptr.drag) { dx = (ptr.x - ptr.sx) / 60; dy = (ptr.y - ptr.sy) / 60; }
  if (keys.w || keys.arrowup) dy -= 1; if (keys.s || keys.arrowdown) dy += 1;
  if (keys.a || keys.arrowleft) dx -= 1; if (keys.d || keys.arrowright) dx += 1;
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  if (len > 0.05) { m.face = Math.atan2(dy, dx); }
  m.x = clamp(m.x + dx * m.speed * dt, 10, W - 10); m.y = clamp(m.y + dy * m.speed * dt, 10, H - 10);
  // monarch attack
  m.cd -= dt;
  const enemies = enemiesList();
  let near = false;
  if (m.target && !enemies.includes(m.target)) m.target = null;
  if (m.cd <= 0) {
    let tgt = m.target && dist(m.target, m) - m.target.r <= 75 ? m.target : null;
    if (!tgt) { let bd = 75; for (const e of enemies) { const d = dist(e, m) - e.r; if (d < bd) { bd = d; tgt = e; } } }
    if (tgt) { m.cd = 0.45; S.fx.push({ k: 'slash', x: m.x, y: m.y, tx: tgt.x, ty: tgt.y, t: 0.15 }); damage(tgt, 22); if (S.over) return; }
  }
  for (const e of enemies) if (dist(e, m) < 260) { near = true; break; }
  if (!near) m.hp = Math.min(m.max, m.hp + 4 * dt);

  // guardians
  for (const g of S.guardians) {
    const dHome = Math.hypot(m.x - g.hx, m.y - g.hy);
    let tx = g.hx, ty = g.hy;
    if (dHome < 300) { tx = m.x; ty = m.y; }
    else g.hp = Math.min(g.max, g.hp + 20 * dt);
    const d = Math.hypot(tx - g.x, ty - g.y);
    if (d > g.r + m.r + 4) { const sp = 85 * dt; g.x += (tx - g.x) / d * Math.min(sp, d); g.y += (ty - g.y) / d * Math.min(sp, d); }
    g.cd -= dt;
    if (dist(g, m) < g.r + m.r + 12 && g.cd <= 0) { g.cd = 0.9; damage(m, g.dmg); S.fx.push({ k: 'hit', x: m.x, y: m.y, t: 0.2 }); if (S.over) return; }
  }

  // buildings (towers)
  for (const b of S.buildings) {
    const spec = BLD[b.type]; if (!spec.range) continue;
    b.cd -= dt; if (b.cd > 0) continue;
    if (b.owner === 'player') {
      let best = null, bd = spec.range;
      for (const u of S.undead) { const d = dist(u, b); if (d < bd) { bd = d; best = u; } }
      if (best) { b.cd = spec.cd; S.stats.towerShots++; S.fx.push({ k: 'arrow', x: b.x, y: b.y - 14, tx: best.x, ty: best.y, t: 0.18, c: '#ffe14d' }); damage(best, spec.dmg); }
    } else {
      let best = null, bd = spec.range;
      for (const a of [m].concat(S.archers)) { const d = dist(a, b); if (d < bd) { bd = d; best = a; } }
      if (best) { b.cd = spec.cd * 1.4; S.stats.paleTowerShots++; S.fx.push({ k: 'arrow', x: b.x, y: b.y - 14, tx: best.x, ty: best.y, t: 0.18, c: '#6dff7a' }); damage(best, 6); if (S.over) return; }
    }
  }

  // archers follow the monarch and shoot
  S.archers.forEach((a, i) => {
    const ang = (i / Math.max(1, S.archers.length)) * Math.PI * 2 + S.t * 0.2;
    const tx = m.x + Math.cos(ang) * 55, ty = m.y + Math.sin(ang) * 55;
    const d = Math.hypot(tx - a.x, ty - a.y);
    if (d > 4) { const sp = Math.min(d, 210 * dt); a.x += (tx - a.x) / d * sp; a.y += (ty - a.y) / d * sp; }
    a.cd -= dt;
    if (a.cd <= 0) {
      let best = null, bd = 210;
      for (const e of enemies) { if (!S.undead.includes(e) && !S.guardians.includes(e) && !(e.owner === 'pale')) continue; const dd = dist(e, a); if (dd < bd) { bd = dd; best = e; } }
      if (best) { a.cd = 0.9; S.fx.push({ k: 'arrow', x: a.x, y: a.y, tx: best.x, ty: best.y, t: 0.15, c: '#fff' }); damage(best, 9); if (S.over) return; }
    }
  });

  // undead
  const playerBlds = S.buildings.filter(b => b.owner === 'player');
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
    if (blocked && u.cd <= 0 && u.kind !== 'necro') { u.cd = 1; damage(blocked, u.dmg); S.fx.push({ k: 'hit', x: blocked.x, y: blocked.y, t: 0.15 }); if (S.over) return; }
    if (u.kind === 'necro' && dist(u, m) < 140 && u.cd <= 0) { u.cd = 1.3; S.fx.push({ k: 'arrow', x: u.x, y: u.y, tx: m.x, ty: m.y, t: 0.2, c: '#c07bff' }); damage(m, u.dmg); if (S.over) return; }
  }

  for (const f of S.fx) f.t -= dt;
  S.fx = S.fx.filter(f => f.t > 0);
}

function pickUndeadTarget(u, playerBlds) {
  const m = S.monarch;
  if (dist(u, m) < 150) return m;
  for (const a of S.archers) if (dist(u, a) < 70) return a;
  const cores = owned().filter(r => r.core).map(r => r.core);
  if (!cores.length) return m;
  if (!S.chaos && S.leader && S.focus != null && S.regions[S.focus].core) return S.regions[S.focus].core; // smart: ordered focus
  let best = null, bd = 1e9;
  for (const c of cores.concat(playerBlds)) { const d = dist(c, u) + (S.chaos ? Math.random() * 400 : 0); if (d < bd) { bd = d; best = c; } }
  return best;
}

// ---------- render ----------
const COL = { player: [86, 140, 230], playerB: [120, 175, 255], wild: [126, 176, 84], pale: [150, 162, 140] };
function redrawMap() {
  const img = new ImageData(GW, GH), d = img.data;
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx, id = grid[i], r = S.regions[id];
    let c = r.owner === 'player' ? (S.build ? COL.playerB : COL.player) : COL[r.owner];
    const border = (gx < GW - 1 && grid[i + 1] !== id) || (gy < GH - 1 && grid[i + GW] !== id) || (gx > 0 && grid[i - 1] !== id) || (gy > 0 && grid[i - GW] !== id);
    const n = ((gx * 73856093) ^ (gy * 19349663)) & 15;
    const p = i * 4;
    if (border) { d[p] = 25; d[p + 1] = 25; d[p + 2] = 25; }
    else { d[p] = c[0] - n; d[p + 1] = c[1] - n; d[p + 2] = c[2] - n; }
    d[p + 3] = 255;
  }
  mapCv.getContext('2d').putImageData(img, 0, 0);
  S.mapDirty = false;
}
function bar(x, y, w, frac, col) {
  ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 9);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * clamp(frac, 0, 1), 5);
}
function circ(x, y, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw || 3; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function label(txt, x, y, size, col) {
  ctx.font = `900 ${size}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(txt, x, y); ctx.fillStyle = col || '#fff'; ctx.fillText(txt, x, y);
}
function render() {
  if (S.mapDirty) redrawMap();
  const c = camera();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b0e12'; ctx.fillRect(0, 0, vw, vh);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (vw / 2 - c.x * scale), dpr * (vh / 2 - c.y * scale));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapCv, 0, 0, W, H);
  ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeRect(0, 0, W, H);

  // region labels & cores
  for (const r of S.regions) {
    const st = r.owner === 'player' ? 'YOURS' : r.owner === 'pale' ? 'PALE HOST' : (r.bonus === 'fort' ? 'WILD · fort' : r.bonus === 'keep' ? 'WILD · keep' : 'WILD');
    label(r.name, r.x, r.y - 70, 22, '#fff');
    label(st, r.x, r.y - 48, 15, r.owner === 'player' ? '#bcd6ff' : r.owner === 'pale' ? '#9dff9d' : '#ffe48a');
    if (r.core) {
      const k = r.core;
      if (k.keep) { ctx.fillStyle = '#6d6a63'; ctx.fillRect(k.x - 22, k.y - 22, 44, 44); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(k.x - 22, k.y - 22, 44, 44); }
      ctx.fillStyle = '#3b2a1a'; ctx.fillRect(k.x - 2, k.y - 30, 4, 40);
      ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.moveTo(k.x + 2, k.y - 30); ctx.lineTo(k.x + 26, k.y - 22); ctx.lineTo(k.x + 2, k.y - 14); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      circ(k.x, k.y + 10, 8, '#ffd34d', '#000', 2);
      bar(k.x, k.y + 24, 50, k.hp / k.max, '#5fa8ff');
    }
  }
  // buildings
  for (const b of S.buildings) {
    const pale = b.owner === 'pale';
    if (b.type === 'wall') {
      ctx.fillStyle = pale ? '#7d9a7a' : '#8b5a2b'; ctx.fillRect(b.x - 16, b.y - 16, 32, 32);
      ctx.strokeStyle = pale ? '#2dff5a' : '#2a1a0a'; ctx.lineWidth = 3; ctx.strokeRect(b.x - 16, b.y - 16, 32, 32);
      ctx.strokeStyle = pale ? '#3c5a3a' : '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x - 16, b.y); ctx.lineTo(b.x + 16, b.y); ctx.moveTo(b.x, b.y - 16); ctx.lineTo(b.x, b.y); ctx.stroke();
    } else {
      const R = b.r;
      circ(b.x, b.y, R, pale ? '#87a585' : '#8c8c8c', pale ? '#2dff5a' : '#222', 3);
      circ(b.x, b.y - 6, R * 0.55, pale ? '#3ccf55' : (b.type === 'fort' ? '#d64545' : '#2f6fd6'), '#000', 2);
      if (b.type === 'fort') label('FORT', b.x, b.y + R + 10, 12, '#fff');
    }
    if (pale) label('☠', b.x, b.y - b.r - 12, 16, '#9dff9d');
    if (b.hp < b.max) bar(b.x, b.y + b.r + 4, 34, b.hp / b.max, pale ? '#6dff7a' : '#ffb44d');
  }
  // guardians
  for (const g of S.guardians) {
    const w = g.kind === 'warden';
    circ(g.x, g.y, g.r + 6, 'rgba(0,0,0,.25)');
    circ(g.x, g.y, g.r, w ? '#4f8a52' : '#a8322a', '#000', 3);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(g.x - 14, g.y - 14); ctx.lineTo(g.x - 22, g.y - 32); ctx.lineTo(g.x - 6, g.y - 20); ctx.moveTo(g.x + 14, g.y - 14); ctx.lineTo(g.x + 22, g.y - 32); ctx.lineTo(g.x + 6, g.y - 20); ctx.fill();
    circ(g.x - 7, g.y - 3, 3.5, w ? '#6dff7a' : '#ffe14d'); circ(g.x + 7, g.y - 3, 3.5, w ? '#6dff7a' : '#ffe14d');
    bar(g.x, g.y - g.r - 16, 56, g.hp / g.max, '#ff4d4d');
    label(g.name, g.x, g.y + g.r + 14, 14, w ? '#9dff9d' : '#ffb2aa');
  }
  // archers
  for (const a of S.archers) { circ(a.x, a.y, a.r, '#2e8b57', '#fff', 2); ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x + 6, a.y, 8, -1.2, 1.2); ctx.stroke(); }
  // undead
  for (const u of S.undead) {
    const s = UNDEAD[u.kind];
    if (u.kind === 'necro') circ(u.x, u.y, u.r + 8, null, S.chaos ? '#555' : '#c07bff', 2);
    circ(u.x, u.y, u.r, s.col, '#1a1a1a', 2);
    circ(u.x - 4, u.y - 2, 2.4, u.kind === 'necro' ? '#6dff7a' : '#111'); circ(u.x + 4, u.y - 2, 2.4, u.kind === 'necro' ? '#6dff7a' : '#111');
    if (u.hp < u.max) bar(u.x, u.y - u.r - 9, 24, u.hp / u.max, '#ff4d4d');
  }
  // monarch
  const m = S.monarch;
  circ(m.x, m.y, m.r + 5, 'rgba(255,211,77,.25)');
  circ(m.x, m.y, m.r, '#ffd34d', '#000', 3);
  ctx.fillStyle = '#ff9d00'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(m.x - 12, m.y - 12); ctx.lineTo(m.x - 12, m.y - 26); ctx.lineTo(m.x - 6, m.y - 18); ctx.lineTo(m.x, m.y - 28); ctx.lineTo(m.x + 6, m.y - 18); ctx.lineTo(m.x + 12, m.y - 26); ctx.lineTo(m.x + 12, m.y - 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(m.face) * 22, m.y + Math.sin(m.face) * 22); ctx.stroke();
  if (m.target) circ(m.target.x, m.target.y, m.target.r + 7, null, '#ffd34d', 3);
  // fx
  for (const f of S.fx) {
    if (f.k === 'arrow' || f.k === 'slash') { ctx.strokeStyle = f.k === 'slash' ? '#fff' : f.c; ctx.lineWidth = f.k === 'slash' ? 4 : 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.tx, f.ty); ctx.stroke(); }
    else if (f.k === 'hit') circ(f.x, f.y, 18 * (1 - f.t), null, '#ff4d4d', 3);
    else if (f.k === 'puff') circ(f.x, f.y, (f.big ? 40 : 20) * (1.2 - f.t), 'rgba(220,255,220,' + (f.t).toFixed(2) + ')');
  }
  // night overlay with light around monarch
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (S.phase === 'night' || S.phaseT < 6) {
    const k = S.phase === 'night' ? Math.min(1, (NIGHT - S.phaseT) / 3, S.phaseT / 3 + 0.2) : (6 - S.phaseT) / 6 * 0.6;
    const p = w2s(m.x, m.y);
    const g = ctx.createRadialGradient(p.x, p.y, 60 * scale, p.x, p.y, 420 * scale);
    g.addColorStop(0, `rgba(8,12,40,${(0.12 * k).toFixed(3)})`); g.addColorStop(1, `rgba(8,12,40,${(0.55 * k).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
  }
  // off-screen arrows to guardians / wardens
  for (const g of S.guardians) {
    const p = w2s(g.x, g.y);
    if (p.x > 0 && p.x < vw && p.y > 90 && p.y < vh - 100) continue;
    const cx = vw / 2, cy = vh / 2, a = Math.atan2(p.y - cy, p.x - cx);
    const ex = clamp(cx + Math.cos(a) * vw, 22, vw - 22), ey = clamp(cy + Math.sin(a) * vh, 110, vh - 120);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath();
    ctx.fillStyle = g.kind === 'warden' ? '#6dff7a' : '#ff5a4d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.restore();
  }
  // joystick
  if (ptr && ptr.drag) {
    circ(ptr.sx, ptr.sy, 60, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.6)', 3);
    const dx = ptr.x - ptr.sx, dy = ptr.y - ptr.sy, l = Math.hypot(dx, dy), k = l > 60 ? 60 / l : 1;
    circ(ptr.sx + dx * k, ptr.sy + dy * k, 24, 'rgba(255,211,77,.8)', '#000', 2);
  }
}

// ---------- HUD ----------
const hud = { c: '', p: '', n: '', r: '', hp: -1 };
function setT(el, key, v) { if (hud[key] !== v) { hud[key] = v; $(el).textContent = v; } }
function drawHud() {
  setT('hCoins', 'c', '🪙 ' + S.coins);
  const t = Math.max(0, Math.ceil(S.phaseT)), mm = (t / 60) | 0, ss = String(t % 60).padStart(2, '0');
  setT('hPhase', 'p', (S.phase === 'day' ? '☀ Day ' : '🌙 Night ') + mm + ':' + ss);
  $('hPhase').classList.toggle('night', S.phase === 'night');
  setT('hNights', 'n', '🌙 ' + S.nights);
  setT('hRegions', 'r', '🏰 ' + owned().length + '/' + S.regions.length);
  const hp = Math.max(0, Math.ceil(S.monarch.hp));
  if (hud.hp !== hp) { hud.hp = hp; $('hpBar').style.width = (100 * hp / S.monarch.max) + '%'; $('hpText').textContent = '♛ ' + hp + ' / ' + S.monarch.max; }
  $('btnSkip').textContent = S.phase === 'day' ? '⏭ Night' : '⏭ Day';
}

let last = performance.now(), fps = 60;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fps = fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
  update(dt); render(); drawHud();
  requestAnimationFrame(frame);
}

// ---------- debug / test hooks ----------
window.__bc = {
  get S() { return S; }, get fps() { return fps; }, w2s, s2w, regionIdAt, skipPhase, newGame,
  teleport(x, y) { S.monarch.x = x; S.monarch.y = y; },
  coins(n) { S.coins += n; }, heal() { S.monarch.hp = S.monarch.max; },
  forceLose(id) { const r = S.regions[id]; if (r && r.core) damage(r.core, r.core.hp + 1); },
  guardianOf(id) { return S.guardians.find(g => g.region === id); },
};

newGame();
requestAnimationFrame(frame);
})();
