/* Upgrade sprites for Boundless Crown.
   Procedural, same bake scale as the game (SPR 3). Not loaded by game.js.
   Gameplay swaps the matching PNG by the id in manifest.json. */
const SPR = 3;
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

function paintKeep(tier) {
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

function paintHouse(tier) {
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

function paintWallSeg(tier) {
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

function paintGate(tier) {
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

function paintTowerWood() {
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

function paintCannon(tier) {
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

function paintBallista(tier) {
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

function paintFarm(tier) {
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

function paintFort(tier) {
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

function paintMine(kind, working) {
  const iron = kind === 'iron';
  const w = 86, h = 70;
  const spr = bake(w, h, g => {
    const hill = iron ? '#5c534c' : '#a89886';
    const hillL = iron ? '#8a7a70' : '#d4cbbd';
    const hillD = iron ? '#3a342e' : '#6e6558';
    const ore = iron ? '#8a3c28' : '#c9c2b4';
    const oreL = iron ? '#c45a3a' : '#e7e2d8';
    poly(g, [[4, 62], [14, 28], [40, 14], [70, 24], [82, 62]], hill);
    poly(g, [[14, 30], [40, 16], [52, 28], [28, 40]], hillL);
    if (iron) {
      g.strokeStyle = oreL; g.lineWidth = 2; g.globalAlpha = 0.7;
      g.beginPath(); g.moveTo(22, 44); g.lineTo(30, 28); g.lineTo(36, 36); g.stroke();
      g.beginPath(); g.moveTo(48, 50); g.lineTo(58, 32); g.stroke();
      g.globalAlpha = 1;
    }
    poly(g, [[28, 62], [32, 36], [50, 34], [58, 62]], hillD);
    poly(g, [[34, 58], [36, 40], [48, 39], [52, 58]], '#1a1612');
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
    g.strokeStyle = frame; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(34, 22); g.lineTo(51, 40);
    g.moveTo(52, 22); g.lineTo(35, 40);
    g.stroke();
    g.fillStyle = frame;
    g.fillRect(40, 14, 14, 3);
    const bucketY = working ? 46 : 28;
    g.strokeStyle = '#2a1c10'; g.lineWidth = 1.15;
    g.beginPath(); g.moveTo(52, 17); g.lineTo(52, bucketY); g.stroke();
    g.fillStyle = iron ? '#6a4030' : '#c4925a';
    g.fillRect(49, bucketY, 6, 5);
    g.fillStyle = iron ? '#4a2e1c' : '#8a5a32';
    g.fillRect(49, bucketY + 4, 6, 1.4);
    if (working) {
      g.fillStyle = iron ? '#a34c30' : '#e7e2d8';
      g.fillRect(50.2, bucketY + 1.1, 3.6, 2.2);
      disc(g, 41, 20, 2.3, frameL);
      disc(g, 41, 20, 1.1, frame);
      ell(g, 43, 56, 7, 3.2, iron ? 'rgba(90,60,40,.55)' : 'rgba(232,220,200,.55)');
      ell(g, 38, 52, 4, 2.2, 'rgba(255,248,230,.35)');
      poly(g, [[36, 48], [38, 44], [40, 49]], oreL);
      poly(g, [[44, 46], [47, 41], [48, 47]], ore);
      poly(g, [[30, 50], [32, 45], [34, 51]], oreL);
    }
    if (iron) {
      disc(g, 33.6, 20, 1.4, '#2a2c30');
      disc(g, 51.6, 20, 1.4, '#2a2c30');
      disc(g, 33.6, 40, 1.4, '#2a2c30');
      disc(g, 51.6, 40, 1.4, '#2a2c30');
    }
    if (iron) {
      poly(g, [[60, 62], [66, 50], [76, 54], [80, 62]], '#3a342e');
      poly(g, [[64, 60], [68, 52], [74, 56]], ore);
      ell(g, 70, 58, 5, 3, oreL);
      g.fillStyle = '#6a4030';
      g.fillRect(62, 58, 8, 3);
      g.fillStyle = '#a34c30';
      g.fillRect(63, 55, 7, 3);
    } else {
      g.fillStyle = '#d4cbbd';
      g.fillRect(60, 52, 10, 7);
      g.fillStyle = '#e7e2d8';
      g.fillRect(62, 48, 9, 6);
      g.fillStyle = '#8f877c';
      g.fillRect(70, 54, 8, 6);
      g.fillStyle = '#c9c2b4';
      g.fillRect(72, 50, 7, 5);
    }
    ell(g, 20, 62, 8, 2.4, iron ? '#4a4038' : '#b7ad9e');
    ell(g, 48, 64, 14, 2.8, iron ? '#3a342e' : '#c9c2b4');
  });
  spr.gy = 64;
  return spr;
}

function paintCannonball(tier) {
  const iron = tier >= 3;
  const r = iron ? 6.8 : 5.2;
  const s = Math.ceil(r * 2 + 2);
  const spr = bake(s, s, g => {
    const c = s / 2;
    disc(g, c, c, r, iron ? '#3a4048' : '#5a4634');
    disc(g, c - 0.35, c - 0.45, r * 0.9, iron ? '#7a8490' : '#9a7a58');
    disc(g, c - r * 0.32, c - r * 0.36, r * 0.36, iron ? '#eef2f6' : '#f3e2c4');
  });
  spr.gy = s / 2;
  return spr;
}

function paintBolt(tier) {
  const iron = tier >= 3;
  const len = iron ? 36 : 28;
  const h = 12;
  const spr = bake(len, h, g => {
    const y = h / 2;
    g.strokeStyle = '#2a1c10';
    g.lineWidth = iron ? 3.1 : 2.6;
    g.beginPath(); g.moveTo(6, y); g.lineTo(len - 9, y); g.stroke();
    g.strokeStyle = iron ? '#8a9098' : '#c4925a';
    g.lineWidth = iron ? 1.7 : 1.5;
    g.beginPath(); g.moveTo(6, y - 0.4); g.lineTo(len - 9, y - 0.4); g.stroke();
    poly(g, [[len - 11, y - 3.2], [len - 1.2, y], [len - 11, y + 3.2]], iron ? '#e4e8ee' : '#f4efe4');
    poly(g, [[len - 11, y - 3.2], [len - 1.2, y], [len - 11, y - 0.2]], iron ? '#fff' : '#fff6e0');
    poly(g, [[7, y], [1.2, y - 4.2], [10, y - 0.4]], '#c4473a');
    poly(g, [[7, y], [1.2, y + 4.2], [10, y + 0.4]], '#8a3028');
  });
  spr.gy = h / 2;
  return spr;
}

function folkLegs(g, step) {
  g.fillStyle = '#6b4a32';
  g.fillRect(14.5, 23, 3.6, 8);
  g.fillRect(21, 23 - step, 3.6, 8 + step);
  g.fillStyle = '#2c2118';
  g.fillRect(14.2, 30.2, 4, 2);
  g.fillRect(20.7, 30.2 - Math.max(0, step) * 0.15, 4, 2);
}
function folkHood(g, x, y, col) {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, 4.3, Math.PI * 1.02, Math.PI * 1.98);
  g.quadraticCurveTo(x + 5, y - 5, x, y - 6.4);
  g.quadraticCurveTo(x - 5, y - 5, x - 4.2, y);
  g.fill();
}
function paintPickHead(g, x, y, ang, sc) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(sc || 1, sc || 1);
  g.fillStyle = '#2a1c10';
  g.beginPath();
  g.moveTo(-2.4, -2.6); g.lineTo(8.2, 0); g.lineTo(-2.4, 2.6); g.closePath(); g.fill();
  g.fillStyle = '#e7eef6';
  g.beginPath();
  g.moveTo(-1.6, -1.5); g.lineTo(6.4, -0.15); g.lineTo(-1.6, 0.35); g.fill();
  g.fillStyle = '#9aa3ae';
  g.fillRect(-3.1, -1.5, 2.2, 3);
  g.restore();
}
function paintMiner(pose) {
  const spr = bake(40, 40, g => {
    const walk = pose === 'walk0' || pose === 'walk1';
    const step = pose === 'walk1' ? 2.4 : pose === 'walk0' ? -1.2 : 0;
    const work = pose === 'work0' || pose === 'work1' || pose === 'work2';
    folkLegs(g, walk ? step : 0);
    ell(g, 19, 19.5, 6.3, 6.5, '#7a8ea8');
    ell(g, 21.4, 20.6, 3, 4.6, '#54687c');
    g.fillStyle = '#5c4030';
    g.fillRect(16, 21, 8, 1.6);
    disc(g, 19, 11, 3.5, '#e6b898');
    folkHood(g, 19, 10.2, '#6b5344');
    ell(g, 19, 8.4, 6.4, 1.5, '#8a9098');
    disc(g, 20.5, 11.2, 0.55, '#2a1c10');
    let ang = -0.7;
    if (pose === 'work0') ang = -1.25;
    else if (pose === 'work1') ang = -0.15;
    else if (pose === 'work2') ang = 0.85;
    else if (pose === 'walk1') ang = -0.45;
    else if (pose === 'walk0') ang = -0.95;
    const hx = 23 + Math.cos(ang) * 7;
    const hy = 16 + Math.sin(ang) * 7;
    g.strokeStyle = '#2a1c10'; g.lineWidth = 2.3;
    g.beginPath(); g.moveTo(22, 17); g.lineTo(hx, hy); g.stroke();
    g.strokeStyle = '#c4925a'; g.lineWidth = 1.35;
    g.beginPath(); g.moveTo(22, 16.6); g.lineTo(hx - 0.3, hy - 0.3); g.stroke();
    paintPickHead(g, hx, hy, ang, work ? 1.05 : 0.92);
  });
  spr.gy = 33;
  return spr;
}

function paintPickaxeIcon() {
  return bake(16, 18, g => {
    g.strokeStyle = '#2a1c10'; g.lineWidth = 3.3;
    g.beginPath(); g.moveTo(4.2, 15.6); g.lineTo(11.4, 5.4); g.stroke();
    g.strokeStyle = '#e2b15a'; g.lineWidth = 1.9;
    g.beginPath(); g.moveTo(4.4, 15.2); g.lineTo(11, 5.8); g.stroke();
    paintPickHead(g, 11.2, 5.2, -0.55, 1.15);
  });
}

function paintPickStand() {
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
    g.fillStyle = '#f3e6c4'; g.fillRect(14, 2.2, 12, 8);
    g.strokeStyle = '#6e4328'; g.lineWidth = 1; g.strokeRect(14, 2.2, 12, 8);
    g.save();
    g.translate(17.2, 3.3); g.scale(0.42, 0.34);
    g.strokeStyle = '#3a2418'; g.lineWidth = 2.8;
    g.beginPath(); g.moveTo(4, 14); g.lineTo(12, 3.5); g.stroke();
    g.strokeStyle = '#c4843a'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(4.2, 13.4); g.lineTo(11.4, 4.2); g.stroke();
    paintPickHead(g, 12, 3.6, -0.6, 1.3);
    g.restore();
  });
  spr.gy = 33;
  return spr;
}

function paintLock() {
  const spr = bake(16, 18, g => {
    g.strokeStyle = '#2a2c30'; g.lineWidth = 2.6;
    g.beginPath(); g.arc(8, 7.1, 4.1, Math.PI, 0); g.stroke();
    g.strokeStyle = '#c5ccd4'; g.lineWidth = 1.15;
    g.beginPath(); g.arc(7.6, 6.7, 4.1, Math.PI * 1.08, Math.PI * 1.72); g.stroke();
    g.fillStyle = '#8a5a14';
    g.beginPath(); g.roundRect(3.1, 8.3, 9.8, 8.2, 1.4); g.fill();
    g.fillStyle = '#f0c14a';
    g.beginPath(); g.roundRect(3.6, 8.7, 8.8, 7.3, 1.2); g.fill();
    g.fillStyle = 'rgba(255,248,220,.8)';
    g.fillRect(4.3, 9.3, 4.4, 1.5);
    disc(g, 8, 12.3, 1.25, '#2a1c10');
    g.fillStyle = '#2a1c10';
    g.fillRect(7.45, 12.2, 1.15, 2.3);
  });
  spr.gy = 16;
  return spr;
}

const TIER = { 1: 'wood', 2: 'stone', 3: 'iron' };
function entry(id, kind, spr, extra) {
  return Object.assign({
    id, kind, file: id + '.png',
    tier: extra && extra.tier || null,
    tierLevel: extra && extra.tierLevel || null,
    state: (extra && extra.state) || 'built',
    anchor: (extra && extra.anchor) || 'feet',
    w: spr.w, h: spr.h, gy: spr.gy,
    spr
  }, extra || {});
}

const UPGRADE_SPRITES = [
  entry('keep-wood', 'keep', paintKeep(1), { tier: 'wood', tierLevel: 1 }),
  entry('keep-stone', 'keep', paintKeep(2), { tier: 'stone', tierLevel: 2, state: 'archer' }),
  entry('keep-iron', 'keep', paintKeep(3), { tier: 'iron', tierLevel: 3, state: 'archer' }),
  entry('house-wood', 'house', paintHouse(1), { tier: 'wood', tierLevel: 1 }),
  entry('house-stone', 'house', paintHouse(2), { tier: 'stone', tierLevel: 2 }),
  entry('house-iron', 'house', paintHouse(3), { tier: 'iron', tierLevel: 3 }),
  entry('wall-wood', 'wall', paintWallSeg(1), { tier: 'wood', tierLevel: 1 }),
  entry('wall-stone', 'wall', paintWallSeg(2), { tier: 'stone', tierLevel: 2 }),
  entry('wall-iron', 'wall', paintWallSeg(3), { tier: 'iron', tierLevel: 3, state: 'spikes' }),
  entry('gate-wood', 'gate', paintGate(1), { tier: 'wood', tierLevel: 1 }),
  entry('gate-stone', 'gate', paintGate(2), { tier: 'stone', tierLevel: 2 }),
  entry('gate-iron', 'gate', paintGate(3), { tier: 'iron', tierLevel: 3, state: 'portcullis' }),
  entry('farm-wood', 'farm', paintFarm(1), { tier: 'wood', tierLevel: 1 }),
  entry('farm-stone', 'farm', paintFarm(2), { tier: 'stone', tierLevel: 2 }),
  entry('farm-iron', 'farm', paintFarm(3), { tier: 'iron', tierLevel: 3 }),
  entry('fort-wood', 'fort', paintFort(1), { tier: 'wood', tierLevel: 1 }),
  entry('fort-stone', 'fort', paintFort(2), { tier: 'stone', tierLevel: 2 }),
  entry('fort-iron', 'fort', paintFort(3), { tier: 'iron', tierLevel: 3 }),
  entry('tower-wood', 'tower', paintTowerWood(), { tier: 'wood', tierLevel: 1, state: 'archer' }),
  entry('tower-cannon-stone', 'tower', paintCannon(2), { tier: 'stone', tierLevel: 2, state: 'cannon', path: 'cannon' }),
  entry('tower-cannon-iron', 'tower', paintCannon(3), { tier: 'iron', tierLevel: 3, state: 'cannon', path: 'cannon' }),
  entry('tower-ballista-stone', 'tower', paintBallista(2), { tier: 'stone', tierLevel: 2, state: 'ballista', path: 'ballista' }),
  entry('tower-ballista-iron', 'tower', paintBallista(3), { tier: 'iron', tierLevel: 3, state: 'ballista', path: 'ballista' }),
  entry('projectile-cannonball-stone', 'projectile', paintCannonball(2), { tier: 'stone', tierLevel: 2, state: 'cannonball', anchor: 'center', path: 'cannon' }),
  entry('projectile-cannonball-iron', 'projectile', paintCannonball(3), { tier: 'iron', tierLevel: 3, state: 'cannonball', anchor: 'center', path: 'cannon' }),
  entry('projectile-bolt-stone', 'projectile', paintBolt(2), { tier: 'stone', tierLevel: 2, state: 'bolt', anchor: 'center', path: 'ballista' }),
  entry('projectile-bolt-iron', 'projectile', paintBolt(3), { tier: 'iron', tierLevel: 3, state: 'bolt', anchor: 'center', path: 'ballista' }),
  entry('mine-stone-idle', 'mine', paintMine('stone', false), { tier: 'stone', tierLevel: 2, state: 'idle' }),
  entry('mine-stone-working', 'mine', paintMine('stone', true), { tier: 'stone', tierLevel: 2, state: 'working' }),
  entry('mine-iron-idle', 'mine', paintMine('iron', false), { tier: 'iron', tierLevel: 3, state: 'idle' }),
  entry('mine-iron-working', 'mine', paintMine('iron', true), { tier: 'iron', tierLevel: 3, state: 'working' }),
  entry('miner-idle', 'miner', paintMiner('idle'), { state: 'idle', pose: 'idle' }),
  entry('miner-walk-0', 'miner', paintMiner('walk0'), { state: 'walk', pose: 'walk0' }),
  entry('miner-walk-1', 'miner', paintMiner('walk1'), { state: 'walk', pose: 'walk1' }),
  entry('miner-work-0', 'miner', paintMiner('work0'), { state: 'working', pose: 'work0' }),
  entry('miner-work-1', 'miner', paintMiner('work1'), { state: 'working', pose: 'work1' }),
  entry('miner-work-2', 'miner', paintMiner('work2'), { state: 'working', pose: 'work2' }),
  entry('stand-pickaxe', 'stand', paintPickStand(), { state: 'built', tool: 'pickaxe' }),
  entry('tool-pickaxe', 'tool', paintPickaxeIcon(), { state: 'racked', tool: 'pickaxe', anchor: 'center' }),
  entry('icon-lock', 'icon', paintLock(), { state: 'locked', anchor: 'center' })
];
window.UPGRADE_SPRITES = UPGRADE_SPRITES;

