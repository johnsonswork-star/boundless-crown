/* Boundless Crown Endless API. Passwords are hashed here; never log or return them. */
'use strict';

import { RegionRoom } from './room.js';
export { RegionRoom };
import { nearbyZones } from './zones.js';

const ITERS = 4000; // PBKDF2-SHA-256; kept modest so we stay under the 10 ms free CPU cap
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
// Rooms are aligned to the city-cell grid (CELL_WORLD) so neighbors in one city share a room.
const REGION_SIZE = 8000;
const VIEW_RADIUS = 20000; // snapshot of realms to load around the player
// City-level geolocation: snap to this grid, then place a random offset in the cell.
// 0.2 deg is roughly city/town sized. Never store or send unsnapped coordinates.
const CELL_DEG = 0.2;
const CELL_WORLD = 8000; // world units across one city cell
const MIN_SPAWN_DIST = 2800; // keep starting keeps from stacking
const STATE_MAX = 1_500_000;
const NAME_MIN = 3;
const NAME_MAX = 24;
const PASS_MIN = 6;
const PASS_MAX = 72;

const CORS_ALLOW = [
  'https://johnsonswork-star.github.io',
  'http://127.0.0.1:8765',
  'http://localhost:8765',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
];

function corsHeaders(req) {
  const origin = req.headers.get('Origin') || '';
  const allow = CORS_ALLOW.includes(origin) || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)
    ? origin
    : CORS_ALLOW[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(req) },
  });
}

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytes(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  return hex(await crypto.subtle.digest('SHA-256', enc));
}

async function pbkdf2(password, saltBytes, iters) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: iters },
    key,
    256
  );
  return hex(bits);
}

function normalizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ');
}

function nameKey(name) {
  return name.toLowerCase();
}

function validName(name) {
  if (name.length < NAME_MIN || name.length > NAME_MAX) return false;
  return /^[A-Za-z0-9][A-Za-z0-9 '\-]*[A-Za-z0-9]$/.test(name) || /^[A-Za-z0-9]{3,24}$/.test(name);
}

function validPass(pw) {
  return typeof pw === 'string' && pw.length >= PASS_MIN && pw.length <= PASS_MAX;
}

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

function rand01() {
  const u = crypto.getRandomValues(new Uint32Array(1))[0];
  return u / 0x100000000;
}

function randInCell(cell) {
  const c = cellCenter(cell);
  const pad = 400;
  const span = CELL_WORLD - pad * 2;
  return {
    x: Math.round(c.x - CELL_WORLD / 2 + pad + rand01() * span),
    y: Math.round(c.y - CELL_WORLD / 2 + pad + rand01() * span),
  };
}

function parseOfferedCell(body) {
  // Accept only a snapped cell object. Ignore any exact/raw coordinate fields.
  if (!body || !body.cell || typeof body.cell !== 'object') return null;
  return snapCell(body.cell.lat, body.cell.lon);
}

async function pickSpawn(db, cell) {
  if (!cell) {
    const iLat = Math.floor(rand01() * 901) - 450;
    const iLon = Math.floor(rand01() * 1801) - 900;
    cell = snapCell(iLat * CELL_DEG, iLon * CELL_DEG);
    const placed = await placeInCell(db, cell);
    return { spawn: placed, cell: null }; // denied/unavailable: random spawn, no cell stored
  }
  const placed = await placeInCell(db, cell);
  return { spawn: placed, cell };
}

async function placeInCell(db, cell) {
  const c = cellCenter(cell);
  const rows = await db.prepare(
    `SELECT spawn_x, spawn_y FROM kingdoms
     WHERE spawn_x BETWEEN ? AND ? AND spawn_y BETWEEN ? AND ?`
  ).bind(c.x - CELL_WORLD, c.x + CELL_WORLD, c.y - CELL_WORLD, c.y + CELL_WORLD).all();
  const existing = (rows && rows.results) || [];
  const clear = (p) => existing.every(e => Math.hypot(e.spawn_x - p.x, e.spawn_y - p.y) >= MIN_SPAWN_DIST);
  for (let i = 0; i < 48; i++) {
    const p = randInCell(cell);
    if (clear(p)) return p;
  }
  for (let k = 1; k <= 48; k++) {
    const ang = k * 2.399963229728653;
    const dist = 500 + k * 350;
    const p = { x: Math.round(c.x + Math.cos(ang) * dist), y: Math.round(c.y + Math.sin(ang) * dist) };
    if (clear(p)) return p;
  }
  return randInCell(cell);
}

function bearer(req) {
  const h = req.headers.get('Authorization') || '';
  const m = /^Bearer\s+(\S+)/i.exec(h);
  return m ? m[1] : '';
}

async function ensureWorld(db) {
  const now = Date.now();
  await db.prepare('INSERT OR IGNORE INTO world (id, created_at, spawn_count) VALUES (1, ?, 0)').bind(now).run();
}

async function authKingdom(db, req) {
  const token = bearer(req);
  if (!token) return null;
  const hash = await sha256Hex(token);
  const now = Date.now();
  const row = await db.prepare(
    `SELECT k.id, k.name, k.spawn_x, k.spawn_y, k.cell_lat, k.cell_lon
     FROM sessions s JOIN kingdoms k ON k.id = s.kingdom_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(hash, now).first();
  return row || null;
}

async function issueSession(db, kingdomId) {
  const token = hex(bytes(32));
  const hash = await sha256Hex(token);
  const now = Date.now();
  await db.prepare(
    'INSERT INTO sessions (token_hash, kingdom_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(hash, kingdomId, now, now + SESSION_MS).run();
  return token;
}

function kingdomPublic(row, opts) {
  const o = { id: row.id, name: row.name, spawn: { x: row.spawn_x, y: row.spawn_y } };
  // Rounded cell is owner-only. Never sent in realm lists or WebSocket presence.
  if (opts && opts.includeCell) {
    o.cell = (row.cell_lat != null && row.cell_lon != null)
      ? { lat: row.cell_lat, lon: row.cell_lon }
      : null;
  }
  return o;
}

function regionKey(x, y) {
  // Shift by half a cell so room boundaries match city-cell edges (centers at i*CELL_WORLD).
  const ix = Math.floor((Number(x) + CELL_WORLD / 2) / CELL_WORLD);
  const iy = Math.floor((Number(y) + CELL_WORLD / 2) / CELL_WORLD);
  return ix + ':' + iy;
}

// Prefer the stored city cell so a keep nudged just outside the cell still shares its city room.
function roomForKingdom(k) {
  if (k && k.cell_lat != null && k.cell_lon != null) {
    const cell = snapCell(k.cell_lat, k.cell_lon);
    if (cell) {
      const c = cellCenter(cell);
      return regionKey(c.x, c.y);
    }
  }
  return regionKey((k && k.spawn_x) || 0, (k && k.spawn_y) || 0);
}

function realmPublic(row, online) {
  return {
    id: row.id,
    name: row.name,
    spawn: { x: row.spawn_x, y: row.spawn_y },
    nights: row.last_nights || 0,
    day: row.last_day || 1,
    lastSeen: row.last_seen || 0,
    online: !!online,
  };
}

async function nearbyKingdoms(db, x, y, radius) {
  const r = radius == null ? VIEW_RADIUS : radius;
  const rows = await db.prepare(
    `SELECT id, name, spawn_x, spawn_y, last_nights, last_day, last_seen
     FROM kingdoms
     WHERE spawn_x BETWEEN ? AND ? AND spawn_y BETWEEN ? AND ?`
  ).bind(x - r, x + r, y - r, y + r).all();
  return (rows && rows.results) ? rows.results.map(row => realmPublic(row, false)) : [];
}

async function authByToken(db, token) {
  if (!token) return null;
  const hash = await sha256Hex(token);
  const now = Date.now();
  const row = await db.prepare(
    `SELECT k.id, k.name, k.spawn_x, k.spawn_y, k.last_nights, k.last_day, k.last_seen, k.cell_lat, k.cell_lon
     FROM sessions s JOIN kingdoms k ON k.id = s.kingdom_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(hash, now).first();
  return row || null;
}

async function readSave(db, kingdomId) {
  const row = await db.prepare('SELECT state, updated_at FROM saves WHERE kingdom_id = ?').bind(kingdomId).first();
  if (!row) return null;
  let state = null;
  try { state = JSON.parse(row.state); } catch (e) { return null; }
  return { state, updatedAt: row.updated_at };
}

async function worldInfo(db) {
  const w = await db.prepare('SELECT created_at, spawn_count FROM world WHERE id = 1').first();
  return {
    id: 1,
    createdAt: (w && w.created_at) || 0,
    kingdoms: (w && w.spawn_count) || 0,
  };
}

async function handleSignup(req, db) {
  let body;
  try { body = await req.json(); } catch (e) { return json(req, { ok: false, error: 'bad_request' }, 400); }
  const name = normalizeName(body && body.name);
  const password = body && body.password;
  if (!validName(name)) return json(req, { ok: false, error: 'bad_name', hint: 'Use 3–24 letters or numbers.' }, 400);
  if (!validPass(password)) return json(req, { ok: false, error: 'bad_password', hint: 'Password must be at least 6 characters.' }, 400);
  const key = nameKey(name);
  const exists = await db.prepare('SELECT id FROM kingdoms WHERE name_key = ?').bind(key).first();
  if (exists) return json(req, { ok: false, error: 'name_taken' }, 409);
  await ensureWorld(db);
  const now = Date.now();
  await db.prepare('UPDATE world SET spawn_count = spawn_count + 1, created_at = CASE WHEN created_at = 0 THEN ? ELSE created_at END WHERE id = 1').bind(now).run();
  const offered = parseOfferedCell(body);
  const placed = await pickSpawn(db, offered);
  const spawn = placed.spawn;
  const cell = placed.cell;
  const salt = bytes(16);
  const hash = await pbkdf2(password, salt, ITERS);
  const id = crypto.randomUUID();
  try {
    await db.prepare(
      `INSERT INTO kingdoms (id, name, name_key, pass_salt, pass_hash, pass_iters, spawn_x, spawn_y, created_at, updated_at, cell_lat, cell_lon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, key, hex(salt), hash, ITERS, spawn.x, spawn.y, now, now, cell ? cell.lat : null, cell ? cell.lon : null).run();
  } catch (e) {
    const msg = String(e && e.message || e);
    if (/UNIQUE|constraint/i.test(msg)) {
      await db.prepare('UPDATE world SET spawn_count = MAX(0, spawn_count - 1) WHERE id = 1').run();
      return json(req, { ok: false, error: 'name_taken' }, 409);
    }
    throw e;
  }
  const token = await issueSession(db, id);
  const world = await worldInfo(db);
  return json(req, {
    ok: true,
    token,
    kingdom: { id, name, spawn, cell: cell ? { lat: cell.lat, lon: cell.lon } : null },
    world,
    save: null,
  });
}

async function handleSignin(req, db) {
  let body;
  try { body = await req.json(); } catch (e) { return json(req, { ok: false, error: 'bad_request' }, 400); }
  const name = normalizeName(body && body.name);
  const password = body && body.password;
  if (!name || !validPass(password)) return json(req, { ok: false, error: 'bad_credentials' }, 401);
  const row = await db.prepare(
    'SELECT id, name, name_key, pass_salt, pass_hash, pass_iters, spawn_x, spawn_y, cell_lat, cell_lon FROM kingdoms WHERE name_key = ?'
  ).bind(nameKey(name)).first();
  if (!row) return json(req, { ok: false, error: 'bad_credentials' }, 401);
  const saltBytes = new Uint8Array((row.pass_salt.match(/.{2}/g) || []).map(h => parseInt(h, 16)));
  const got = await pbkdf2(password, saltBytes, row.pass_iters || ITERS);
  // Constant-time-ish compare
  if (got.length !== row.pass_hash.length || !timingSafeEqual(got, row.pass_hash)) {
    return json(req, { ok: false, error: 'bad_credentials' }, 401);
  }
  const token = await issueSession(db, row.id);
  const save = await readSave(db, row.id);
  const world = await worldInfo(db);
  return json(req, { ok: true, token, kingdom: kingdomPublic(row, { includeCell: true }), world, save });
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

async function handleMe(req, db, k) {
  const save = await readSave(db, k.id);
  const world = await worldInfo(db);
  return json(req, { ok: true, kingdom: kingdomPublic(k, { includeCell: true }), world, save });
}

async function handleGetKingdom(req, db, k) {
  const save = await readSave(db, k.id);
  return json(req, { ok: true, kingdom: kingdomPublic(k, { includeCell: true }), save });
}

async function handlePutKingdom(req, db, k) {
  let body;
  try { body = await req.json(); } catch (e) { return json(req, { ok: false, error: 'bad_request' }, 400); }
  const state = body && body.state;
  if (!state || typeof state !== 'object') return json(req, { ok: false, error: 'bad_state' }, 400);
  const raw = JSON.stringify(state);
  if (raw.length > STATE_MAX) return json(req, { ok: false, error: 'state_too_large' }, 413);
  const now = Date.now();
  await db.prepare(
    `INSERT INTO saves (kingdom_id, state, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(kingdom_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`
  ).bind(k.id, raw, now).run();
  const nights = (state && typeof state.nights === 'number') ? Math.max(0, Math.min(9999, state.nights | 0)) : 0;
  const day = (state && typeof state.day === 'number') ? Math.max(1, Math.min(9999, state.day | 0)) : 1;
  await db.prepare(
    'UPDATE kingdoms SET updated_at = ?, last_nights = ?, last_day = ?, last_seen = ? WHERE id = ?'
  ).bind(now, nights, day, now, k.id).run();
  return json(req, { ok: true, updatedAt: now });
}

async function handleRealms(req, db, k) {
  const list = await nearbyKingdoms(db, k.spawn_x, k.spawn_y, VIEW_RADIUS);
  return json(req, {
    ok: true,
    room: roomForKingdom(k),
    spawn: { x: k.spawn_x, y: k.spawn_y },
    realms: list.filter(r => r.id !== k.id),
  });
}

async function handleWs(req, env) {
  if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
    return json(req, { ok: false, error: 'expected_websocket' }, 426);
  }
  if (!env.ROOMS) {
    return json(req, { ok: false, error: 'realtime_unavailable' }, 503);
  }
  const url = new URL(req.url);
  const token = bearer(req) || url.searchParams.get('access_token') || '';
  const k = await authByToken(env.DB, token);
  if (!k) return json(req, { ok: false, error: 'unauthorized' }, 401);
  const nearby = await nearbyKingdoms(env.DB, k.spawn_x, k.spawn_y, VIEW_RADIUS);
  const zones = await nearbyZones(env.DB, k.spawn_x, k.spawn_y, VIEW_RADIUS);
  const room = roomForKingdom(k);
  const id = env.ROOMS.idFromName('room:' + room);
  const stub = env.ROOMS.get(id);
  const headers = new Headers(req.headers);
  headers.set('X-BC-Join', JSON.stringify({
    id: k.id,
    name: k.name,
    spawn: { x: k.spawn_x, y: k.spawn_y },
    nights: k.last_nights || 0,
    day: k.last_day || 1,
    room,
    nearby,
    zones,
  }));
  return stub.fetch(new Request(req, { headers }));
}

async function handleWorld(req, db) {
  await ensureWorld(db);
  const world = await worldInfo(db);
  return json(req, { ok: true, world });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path === '/' || path === '/v1/health') {
        return json(req, { ok: true, service: 'boundless-crown', plan: 'free', realtime: !!env.ROOMS });
      }
      if (path === '/v1/world' && req.method === 'GET') return handleWorld(req, env.DB);
      if (path === '/v1/ws') return handleWs(req, env);
      if (path === '/v1/signup' && req.method === 'POST') return handleSignup(req, env.DB);
      if (path === '/v1/signin' && req.method === 'POST') return handleSignin(req, env.DB);
      if (path === '/v1/signout' && req.method === 'POST') {
        const token = bearer(req);
        if (token) {
          const hash = await sha256Hex(token);
          await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
        }
        return json(req, { ok: true });
      }
      const needAuth = (path === '/v1/me' && req.method === 'GET')
        || (path === '/v1/kingdom' && (req.method === 'GET' || req.method === 'PUT'))
        || (path === '/v1/realms' && req.method === 'GET');
      if (needAuth) {
        const k = await authKingdom(env.DB, req);
        if (!k) return json(req, { ok: false, error: 'unauthorized' }, 401);
        if (path === '/v1/me') return handleMe(req, env.DB, k);
        if (path === '/v1/realms') return handleRealms(req, env.DB, k);
        if (req.method === 'GET') return handleGetKingdom(req, env.DB, k);
        return handlePutKingdom(req, env.DB, k);
      }
      return json(req, { ok: false, error: 'not_found' }, 404);
    } catch (err) {
      // Do not include request bodies or passwords.
      console.error('worker error', String(err && err.message || err));
      return json(req, { ok: false, error: 'server_error' }, 500);
    }
  },
};
