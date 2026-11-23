/* Region-sharded Endless room. SQLite-backed Durable Object (Workers Free).
   Uses the WebSocket Hibernation API so idle rooms do not burn duration. */
'use strict';

export class RegionRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(req) {
    if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    let join = {};
    try { join = JSON.parse(req.headers.get('X-BC-Join') || '{}'); } catch (e) { join = {}; }
    if (!join.id || !join.name || !join.spawn) {
      return new Response('missing join', { status: 400 });
    }
    const pair = new WebSocketPair();
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === server) continue;
      const a = ws.deserializeAttachment() || {};
      if (a.id === join.id) {
        try { ws.close(1000, 'replaced'); } catch (e) {}
      }
    }
    const att = {
      id: join.id,
      name: join.name,
      spawn: join.spawn,
      nights: join.nights || 0,
      day: join.day || 1,
      phase: 'day',
      mx: null,
      my: null,
      hp: null,
      max: null,
      over: false,
      lastSeen: Date.now(),
    };
    server.serializeAttachment(att);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}')
    );
    const realms = this.snapshot(join.nearby || [], join.id);
    server.send(JSON.stringify({
      t: 'hello',
      room: join.room || '',
      you: { id: att.id, name: att.name, spawn: att.spawn },
      realms,
    }));
    this.broadcast({ t: 'join', realm: this.publicRealm(att, true) }, att.id);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  publicRealm(a, online) {
    return {
      id: a.id,
      name: a.name,
      spawn: a.spawn,
      nights: a.nights || 0,
      day: a.day || 1,
      phase: a.phase || 'day',
      mx: a.mx,
      my: a.my,
      hp: a.hp,
      max: a.max,
      over: !!a.over,
      online: !!online,
      lastSeen: a.lastSeen || 0,
    };
  }

  snapshot(nearby, selfId) {
    const live = new Map();
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() || {};
      if (!a.id || a.id === selfId) continue;
      live.set(a.id, this.publicRealm(a, true));
    }
    const out = [];
    const seen = new Set();
    for (const r of nearby) {
      if (!r || !r.id || r.id === selfId) continue;
      out.push(live.get(r.id) || { ...r, online: false });
      seen.add(r.id);
    }
    for (const [id, r] of live) if (!seen.has(id)) out.push(r);
    return out;
  }

  broadcast(msg, exceptId) {
    const raw = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() || {};
      if (exceptId && a.id === exceptId) continue;
      try { ws.send(raw); } catch (e) {}
    }
  }

  webSocketMessage(ws, data) {
    let msg;
    try { msg = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); } catch (e) { return; }
    if (!msg || msg.t !== 'st') return;
    const a = Object.assign({}, ws.deserializeAttachment() || {});
    if (!a.id) return;
    if (typeof msg.nights === 'number') a.nights = Math.max(0, Math.min(9999, msg.nights | 0));
    if (typeof msg.day === 'number') a.day = Math.max(1, Math.min(9999, msg.day | 0));
    if (msg.phase === 'day' || msg.phase === 'night') a.phase = msg.phase;
    if (typeof msg.mx === 'number' && Number.isFinite(msg.mx)) a.mx = Math.max(-2e7, Math.min(2e7, msg.mx));
    if (typeof msg.my === 'number' && Number.isFinite(msg.my)) a.my = Math.max(-2e7, Math.min(2e7, msg.my));
    if (typeof msg.hp === 'number') a.hp = Math.max(0, Math.min(9999, msg.hp));
    if (typeof msg.max === 'number') a.max = Math.max(1, Math.min(9999, msg.max));
    a.over = !!msg.over;
    a.lastSeen = Date.now();
    ws.serializeAttachment(a);
    this.broadcast({
      t: 'upd',
      id: a.id,
      nights: a.nights,
      day: a.day,
      phase: a.phase,
      mx: a.mx,
      my: a.my,
      hp: a.hp,
      max: a.max,
      over: a.over,
    }, a.id);
  }

  webSocketClose(ws, code) {
    const a = ws.deserializeAttachment() || {};
    try { ws.close(code || 1000, 'ok'); } catch (e) {}
    if (a.id) this.broadcast({ t: 'leave', id: a.id });
  }

  webSocketError(ws) {
    this.webSocketClose(ws, 1011);
  }
}
