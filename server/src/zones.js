/* Shared zone ownership for Endless. No secrets. Region 0 (the castle) is never stored. */
'use strict';

const VIEW_RADIUS = 20000;
const PAL = ['#e07a5f', '#81b29a', '#3d7ea6', '#e9c46a', '#9b5de5', '#00bbf9', '#f15bb5', '#f4a261'];

export function kingdomColor(id) {
  let h = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PAL[h % PAL.length];
}

export function publicZone(row) {
  if (!row) return null;
  let buildings = [];
  if (row.buildings) {
    try { buildings = JSON.parse(row.buildings) || []; } catch (e) { buildings = []; }
  }
  const gov = row.gov_hp != null && row.gov_max != null;
  return {
    id: row.id,
    homeId: row.home_id,
    region: row.region,
    wx: row.wx,
    wy: row.wy,
    name: row.name,
    ownerId: row.owner_id || null,
    ownerName: row.owner_name || null,
    ownerColor: row.owner_color || null,
    state: row.state || 'unowned',
    claimFrom: row.claim_from || null,
    claimFails: row.claim_fails || 0,
    claimerId: row.claimer_id || null,
    bannerHp: row.banner_hp,
    bannerMax: row.banner_max,
    gov: gov,
    govHp: gov ? row.gov_hp : null,
    govMax: gov ? row.gov_max : null,
    underAttack: !!row.under_attack,
    attackerId: row.attacker_id || null,
    buildings,
  };
}

export async function nearbyZones(db, x, y, radius) {
  const r = radius == null ? VIEW_RADIUS : radius;
  const rows = await db.prepare(
    `SELECT * FROM zones WHERE wx BETWEEN ? AND ? AND wy BETWEEN ? AND ?`
  ).bind(x - r, x + r, y - r, y + r).all();
  return ((rows && rows.results) || []).map(publicZone);
}

export async function getZone(db, id) {
  const row = await db.prepare('SELECT * FROM zones WHERE id = ?').bind(id).first();
  return row || null;
}

function packBuildings(list) {
  if (!list || !list.length) return null;
  return JSON.stringify(list.slice(0, 80).map(b => ({
    type: b.type, x: b.x, y: b.y, hp: b.hp, max: b.max, level: b.level || 1,
    path: b.path || null, built: b.built == null ? 1 : b.built, r: b.r, id: b.id || null,
  })));
}

export async function publishZones(db, king, list) {
  if (!king || !king.id || !Array.isArray(list)) return [];
  const now = Date.now();
  const out = [];
  for (const z of list) {
    if (!z || z.region == null || z.region === 0) continue;
    const rid = z.region | 0;
    if (rid < 1 || rid > 20) continue;
    const id = String(z.id || (king.id + ':' + rid));
    const wx = Number(z.wx), wy = Number(z.wy);
    if (!Number.isFinite(wx) || !Number.isFinite(wy)) continue;
    const existing = await getZone(db, id);
    if (!existing) {
      await db.prepare(
        `INSERT INTO zones (id, home_id, region, wx, wy, name, owner_id, owner_name, owner_color, state, claim_fails, buildings, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'unowned', 0, ?, ?)`
      ).bind(id, king.id, rid, wx, wy, String(z.name || ('Land ' + rid)).slice(0, 40), packBuildings(z.buildings), now).run();
    } else {
      // Positions and, if we still own it or it is unowned, our snapshot. Never steal ownership here.
      if (existing.home_id !== king.id) continue;
      const ours = !existing.owner_id || existing.owner_id === king.id;
      if (ours && existing.state === 'owned' && z.gov) {
        await db.prepare(
          `UPDATE zones SET wx=?, wy=?, name=?, gov_hp=?, gov_max=?, buildings=?, updated_at=? WHERE id=?`
        ).bind(wx, wy, existing.name || z.name, Number(z.govHp), Number(z.govMax), packBuildings(z.buildings), now, id).run();
      } else if (ours && existing.state !== 'contested') {
        await db.prepare(
          `UPDATE zones SET wx=?, wy=?, name=?, buildings=?, updated_at=? WHERE id=?`
        ).bind(wx, wy, existing.name || z.name, packBuildings(z.buildings), now, id).run();
      } else {
        await db.prepare('UPDATE zones SET wx=?, wy=?, updated_at=? WHERE id=?').bind(wx, wy, now, id).run();
      }
    }
    const row = await getZone(db, id);
    if (row) out.push(publicZone(row));
  }
  return out;
}

function hallBuilt(row) {
  return row && row.gov_hp != null && row.gov_max != null && Number(row.gov_max) > 0;
}

export async function actZone(db, king, msg) {
  if (!king || !king.id || !msg || !msg.act || !msg.id) return { ok: false, error: 'bad_act' };
  let row = await getZone(db, String(msg.id));
  if (!row) {
    const parts = String(msg.id).split(':');
    const rid = parts.length > 1 ? (parts[parts.length - 1] | 0) : 0;
    const home = parts.length > 1 ? parts.slice(0, -1).join(':') : '';
    const wx = Number(msg.wx), wy = Number(msg.wy);
    if (home === king.id && rid >= 1 && Number.isFinite(wx) && Number.isFinite(wy)) {
      const now0 = Date.now();
      await db.prepare(
        `INSERT INTO zones (id, home_id, region, wx, wy, name, owner_id, owner_name, owner_color, state, claim_fails, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'unowned', 0, ?)`
      ).bind(String(msg.id), king.id, rid, wx, wy, String(msg.name || ('Land ' + rid)).slice(0, 40), now0).run();
      row = await getZone(db, String(msg.id));
    }
  }
  if (!row) return { ok: false, error: 'no_zone' };
  const now = Date.now();
  const act = msg.act;
  const color = kingdomColor(king.id);

  if (act === 'plant') {
    if (row.owner_id === king.id) return { ok: false, error: 'already_yours' };
    if (hallBuilt(row)) return { ok: false, error: 'has_hall' };
    if (row.state === 'contested' && row.claimer_id && row.claimer_id !== king.id) return { ok: false, error: 'contested' };
    const from = row.state === 'owned' ? 'held' : (msg.from === 'pale' ? 'pale' : 'wild');
    const hp = Number(msg.bannerHp) || 200;
    // Conditional write so a late plant cannot clobber a claim that already landed on the primary.
    const pres = await db.prepare(
      `UPDATE zones SET state='contested', claim_from=?, claimer_id=?, banner_hp=?, banner_max=?, under_attack=0, attacker_id=NULL, updated_at=?
       WHERE id=? AND (owner_id IS NULL OR owner_id != ?) AND (gov_max IS NULL OR gov_max = 0)
         AND (state != 'contested' OR claimer_id IS NULL OR claimer_id = ?)`
    ).bind(from, king.id, hp, hp, now, row.id, king.id, king.id).run();
    if (pres && pres.meta && pres.meta.changes === 0) {
      const fresh = await getZone(db, row.id);
      if (fresh && fresh.owner_id === king.id) return { ok: false, error: 'already_yours' };
      if (hallBuilt(fresh)) return { ok: false, error: 'has_hall' };
      return { ok: false, error: 'contested' };
    }
  } else if (act === 'claim') {
    // Accept a claim that arrives before the plant write. Do not reset an already-owned hall.
    if (row.owner_id === king.id && row.state === 'owned') {
      /* already ours */
    } else if (hallBuilt(row) && row.owner_id && row.owner_id !== king.id) {
      return { ok: false, error: 'has_hall' };
    } else if (row.state === 'contested' && row.claimer_id && row.claimer_id !== king.id) {
      return { ok: false, error: 'not_claimer' };
    } else {
      await db.prepare(
        `UPDATE zones SET state='owned', owner_id=?, owner_name=?, owner_color=?, claim_from=NULL, claimer_id=NULL,
          banner_hp=NULL, banner_max=NULL, gov_hp=NULL, gov_max=NULL, under_attack=0, attacker_id=NULL, buildings=?, updated_at=? WHERE id=?
          AND (owner_id IS NULL OR owner_id = ? OR (gov_max IS NULL OR gov_max = 0))`
      ).bind(king.id, king.name, color, packBuildings(msg.buildings), now, row.id, king.id).run();
    }
  } else if (act === 'fail') {
    if (row.state !== 'contested') return { ok: false, error: 'not_contested' };
    const fails = (row.claim_fails || 0) + 1;
    if (row.claim_from === 'held' && row.owner_id) {
      await db.prepare(
        `UPDATE zones SET state='owned', claimer_id=NULL, claim_from=NULL, claim_fails=?, banner_hp=NULL, banner_max=NULL, updated_at=? WHERE id=?`
      ).bind(fails, now, row.id).run();
    } else {
      await db.prepare(
        `UPDATE zones SET state='unowned', owner_id=NULL, owner_name=NULL, owner_color=NULL, claimer_id=NULL, claim_from=NULL, claim_fails=?, banner_hp=NULL, banner_max=NULL, gov_hp=NULL, gov_max=NULL, updated_at=? WHERE id=?`
      ).bind(fails, now, row.id).run();
    }
  } else if (act === 'attack') {
    if (row.state !== 'owned' || !hallBuilt(row)) return { ok: false, error: 'no_hall' };
    if (row.owner_id === king.id) return { ok: false, error: 'already_yours' };
    await db.prepare(
      `UPDATE zones SET under_attack=1, attacker_id=?, updated_at=? WHERE id=?`
    ).bind(king.id, now, row.id).run();
  } else if (act === 'gov') {
    if (row.owner_id !== king.id || row.state !== 'owned') return { ok: false, error: 'not_owner' };
    const hp = Math.max(1, Number(msg.govHp) || 0);
    const mx = Math.max(hp, Number(msg.govMax) || hp);
    await db.prepare(
      `UPDATE zones SET gov_hp=?, gov_max=?, buildings=?, updated_at=? WHERE id=?`
    ).bind(hp, mx, packBuildings(msg.buildings), now, row.id).run();
  } else if (act === 'take') {
    if (row.state !== 'owned' || !hallBuilt(row)) return { ok: false, error: 'no_hall' };
    if (row.owner_id === king.id) return { ok: false, error: 'already_yours' };
    // Hall is gone; leftover buildings transfer; the new owner must build their own hall.
    await db.prepare(
      `UPDATE zones SET owner_id=?, owner_name=?, owner_color=?, gov_hp=NULL, gov_max=NULL,
        under_attack=0, attacker_id=NULL, buildings=?, updated_at=? WHERE id=?`
    ).bind(king.id, king.name, color, packBuildings(msg.buildings), now, row.id).run();
  } else {
    return { ok: false, error: 'bad_act' };
  }
  const next = await getZone(db, row.id);
  return { ok: true, zone: publicZone(next) };
}
