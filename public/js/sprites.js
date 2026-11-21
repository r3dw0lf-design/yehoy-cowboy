// Pixel-art birds, painted in code (no image files needed).
// Same treatment as the guns in guns-art.js: every bird is built on a pixel grid out of
// shaded, layered parts (a far wing, fanned tail feathers, a feathered body, overlapping
// wing feathers, a detailed head with eye + beak), then outlined and cached as a canvas.
// Sprites face RIGHT; the game flips them for left-flying birds.
// The Golden Eagle is the one bird with a special metallic look (plus a shimmer, glow and
// sparkles that the game draws on top).

export const BIRD_TYPES = {
  vulture: {
    label: "Vulture", points: 20, hp: 1, minLevel: 1, weight: 4,
    speed: [26, 38], amp: [2, 6], freq: [0.8, 1.4], flap: 5,
    body: "#4d382a", belly: "#745744", head: "#e08a8c", beak: "#efe0b0", big: true,
    // shape (pixels)
    rxR: 11, rxF: 8, ry: 5.4, hr: 2.9, neck: 3.8, tail: 8, tailW: 7,
    arm: 10, hand: 9, chord: 9, fingers: true,
    cov: "#5e4533", flt: "#2f2017", tip: "#170e09", tailC: "#2f2017",
    look: { bald: true, ruff: "#f5efe0", brow: true, beakT: "raptor", legs: "#b79a88", hunch: 0.8 },
  },
  crow: {
    label: "Crow", points: 40, hp: 1, minLevel: 1, weight: 5,
    speed: [44, 62], amp: [3, 9], freq: [1.2, 2.0], flap: 8,
    body: "#2b2450", belly: "#3d3668", head: "#2b2450", beak: "#f4b942",
    rxR: 8, rxF: 6.4, ry: 4, hr: 3.2, neck: 1.8, tail: 8, tailW: 4.6,
    arm: 7, hand: 7, chord: 6, fingers: false,
    cov: "#383064", flt: "#1d1936", tip: "#0e0b1e", tailC: "#1d1936",
    look: { sheen: "#6a5cc0", beakT: "stout", legs: "#1d1936" },
  },
  hawk: {
    label: "Hawk", points: 70, hp: 1, minLevel: 2, weight: 4,
    speed: [64, 88], amp: [6, 16], freq: [1.6, 2.6], flap: 7,
    body: "#a95d1c", belly: "#f1d9a0", head: "#c98536", beak: "#f4d03f",
    rxR: 9, rxF: 7, ry: 4.6, hr: 3.6, neck: 2.4, tail: 10, tailW: 6,
    arm: 8, hand: 8, chord: 7.4, fingers: true,
    cov: "#bd6c26", flt: "#8a4513", tip: "#43200a", tailC: "#c0392b",
    look: { brow: true, stripe: true, streaks: "#a35a2a", beakT: "raptor", legs: "#f4d03f", tailBand: "#4a1d12", tailTip: "#f7e4b6" },
  },
  sparrow: {
    label: "Sparrow", points: 100, hp: 1, minLevel: 3, weight: 4,
    speed: [74, 104], amp: [5, 14], freq: [2.4, 3.6], flap: 14,
    body: "#a86b3c", belly: "#f6e7c1", head: "#9a5428", beak: "#e9b44c",
    rxR: 5.4, rxF: 4.4, ry: 3.2, hr: 2.7, neck: 1, tail: 5.5, tailW: 3.4,
    arm: 4.6, hand: 4.4, chord: 4.2, fingers: false,
    cov: "#b57a46", flt: "#7a4a24", tip: "#43240f", tailC: "#7a4a24",
    look: { bib: "#2a1a10", cheek: "#e6d0aa", streaks: "#6e4020", wingbar: "#f6e7c1", beakT: "conical", legs: "#d98a6a" },
  },
  eagle: {
    label: "Golden Eagle", points: 250, hp: 1, minLevel: 4, weight: 1, rare: true,
    speed: [96, 124], amp: [4, 10], freq: [1.4, 2.2], flap: 6,
    body: "#e2a21d", belly: "#f9dc7e", head: "#fff2c8", beak: "#ffd23a",
    rxR: 11, rxF: 8.4, ry: 5.2, hr: 3.9, neck: 3, tail: 9.5, tailW: 7,
    arm: 11, hand: 10, chord: 9, fingers: true,
    cov: "#f4bd2c", flt: "#c98712", tip: "#7a4c08", tailC: "#fff2c8",
    look: { gold: true, brow: true, crest: true, beakT: "raptor", legs: "#ffd23a", tailBand: "#e2a21d", sparkle: true },
    sparkle: true,
  },
  buzzard: {
    label: "Big Buzzard", points: 150, hp: 3, minLevel: 5, weight: 2, boss: true,
    speed: [22, 30], amp: [3, 8], freq: [0.6, 1.0], flap: 3.6,
    body: "#3f4e2c", belly: "#72834a", head: "#e08a8c", beak: "#efe0b0", big: true,
    rxR: 17, rxF: 12.5, ry: 8.4, hr: 4.4, neck: 6, tail: 12, tailW: 11,
    arm: 16, hand: 14, chord: 14, fingers: true,
    cov: "#506238", flt: "#27311b", tip: "#121809", tailC: "#27311b",
    look: { bald: true, ruff: "#f5efe0", brow: true, beakT: "raptor", legs: "#b39a8a", hunch: 0.8 },
  },
};

const INK = "#150a05";

// ---------------------------------------------------------------- colour helpers
const hex2 = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a, b, t) => {
  const A = hex2(a), B = hex2(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const WHITE = "#ffffff";
// 6-step ramp from a base colour: 0 specular, 1 light, 2 base, 3 shade, 4 dark, 5 deepest
const tone = (c) => [mix(c, WHITE, 0.5), mix(c, WHITE, 0.22), c, mix(c, INK, 0.24), mix(c, INK, 0.46), mix(c, INK, 0.68)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rad = (d) => (d * Math.PI) / 180;
const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

// ---------------------------------------------------------------- the painter
// Works in "bird space": origin = centre of the body, +x forward (right), +y down.
const GW = 190, GH = 150, OX = 95, OY = 80;

function makePainter() {
  const px = new Array(GW * GH).fill(null);
  const inb = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH;
  const at = (x, y) => (inb(x, y) ? px[y * GW + x] : null);
  const put = (c, x, y) => { if (inb(x, y)) px[y * GW + x] = c; };

  const maskPoly = (pts) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const m = [];
    for (let gy = Math.floor(y0 + OY) - 1; gy <= Math.ceil(y1 + OY) + 1; gy++)
      for (let gx = Math.floor(x0 + OX) - 1; gx <= Math.ceil(x1 + OX) + 1; gx++) {
        const cx = gx + 0.5 - OX, cy = gy + 0.5 - OY;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) m.push([gx, gy]);
      }
    return m;
  };
  const maskEll = (cx, cy, rx, ry) => {
    const m = [];
    for (let gy = Math.floor(cy - ry + OY) - 1; gy <= Math.ceil(cy + ry + OY) + 1; gy++)
      for (let gx = Math.floor(cx - rx + OX) - 1; gx <= Math.ceil(cx + rx + OX) + 1; gx++) {
        const dx = (gx + 0.5 - OX - cx) / rx, dy = (gy + 0.5 - OY - cy) / ry;
        if (dx * dx + dy * dy <= 1) m.push([gx, gy]);
      }
    return m;
  };
  const K = (x, y) => y * 1000 + x;

  // paint a mask. fn(gx, gy, t, u) -> colour|null where t = 0..1 down the column, u = 0..1 along the mask.
  // o.seam darkens the already-painted pixels that touch this shape (crisp separation line)
  function shape(mask, fn, o = {}) {
    if (!mask.length) return;
    const set = new Set(mask.map(([x, y]) => K(x, y)));
    if (o.seam) {
      for (const [x, y] of mask)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (set.has(K(nx, ny))) continue;
          const u = at(nx, ny);
          if (u && u !== INK) put(mix(u, INK, o.seam === true ? 0.42 : o.seam), nx, ny);
        }
    }
    const ext = new Map();
    let mx0 = 1e9, mx1 = -1e9;
    for (const [x, y] of mask) {
      const e = ext.get(x);
      if (!e) ext.set(x, [y, y]); else { if (y < e[0]) e[0] = y; if (y > e[1]) e[1] = y; }
      if (x < mx0) mx0 = x; if (x > mx1) mx1 = x;
    }
    for (const [x, y] of mask) {
      const e = ext.get(x);
      const t = (y - e[0] + 0.5) / (e[1] - e[0] + 1);
      const u = (x - mx0 + 0.5) / (mx1 - mx0 + 1);
      const c = fn(x, y, t, u);
      if (c) put(c, x, y);
    }
  }
  const ramped = (ramp) => (x, y, t) => ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];

  const p = {
    px, at, put, shape, ramped, maskPoly, maskEll,
    // bird-space pixel put (cell [x, x+1) x [y, y+1))
    dot: (c, x, y) => put(c, Math.floor(x + OX), Math.floor(y + OY)),
    get: (x, y) => at(Math.floor(x + OX), Math.floor(y + OY)),
    poly: (pts, fn, o) => shape(maskPoly(pts), typeof fn === "function" ? fn : ramped(fn), o),
    ell: (cx, cy, rx, ry, fn, o) => shape(maskEll(cx, cy, rx, ry), typeof fn === "function" ? fn : ramped(fn), o),
    line: (c, x0, y0, x1, y1) => {
      let a = Math.floor(x0 + OX), b = Math.floor(y0 + OY);
      const e1 = Math.floor(x1 + OX), f1 = Math.floor(y1 + OY);
      const dx = Math.abs(e1 - a), dy = -Math.abs(f1 - b), sx = a < e1 ? 1 : -1, sy = b < f1 ? 1 : -1;
      let e = dx + dy;
      for (;;) {
        put(c, a, b);
        if (a === e1 && b === f1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; a += sx; }
        if (e2 <= dx) { e += dx; b += sy; }
      }
    },
    // shade an already-painted pixel towards a colour
    tint: (x, y, c, t) => { const u = p.get(x, y); if (u && u !== INK) p.dot(mix(u, c, t), x, y); },
    // ink outline around the whole silhouette
    finish: () => {
      const out = px.slice();
      for (let y = 0; y < GH; y++)
        for (let x = 0; x < GW; x++) {
          if (at(x, y)) continue;
          if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out[y * GW + x] = INK;
        }
      return out;
    },
  };
  return p;
}

// ---------------------------------------------------------------- feathers & wings
const dirUp = (deg) => [-Math.sin(rad(deg)), -Math.cos(rad(deg))]; // deg measured from straight up, swinging backwards
const rot = (d, e, deg) => norm([d[0] * Math.cos(rad(deg)) + e[0] * Math.sin(rad(deg)), d[1] * Math.cos(rad(deg)) + e[1] * Math.sin(rad(deg))]);

// a single tapered feather from `root` along `dir`, shaded by distance along its length
function feather(p, root, dir, len, w, colorAt, o = {}) {
  const n = [-dir[1], dir[0]];
  const at = (s, k) => [root[0] + dir[0] * len * s + n[0] * w * k, root[1] + dir[1] * len * s + n[1] * w * k];
  const tw = o.tip ?? 0.18;
  const pts = [at(0, 0.5), at(0.6, 0.5), at(1, tw), at(1, -tw), at(0.6, -0.5), at(0, -0.5)];
  const mask = p.maskPoly(pts);
  p.shape(mask, (x, y) => {
    const q = ((x + 0.5 - OX - root[0]) * dir[0] + (y + 0.5 - OY - root[1]) * dir[1]) / len;
    return colorAt(clamp(q, 0, 1), x, y);
  }, { seam: o.seam });
  if (o.shaft) {
    const a = at(o.shaft[0], 0), b = at(o.shaft[1], 0);
    // dark centre line (only on pixels that belong to this feather)
    const set = new Set(mask.map(([x, y]) => y * 1000 + x));
    const x0 = Math.floor(a[0] + OX), y0 = Math.floor(a[1] + OY), x1 = Math.floor(b[0] + OX), y1 = Math.floor(b[1] + OY);
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const gx = Math.round(x0 + ((x1 - x0) * i) / steps), gy = Math.round(y0 + ((y1 - y0) * i) / steps);
      const u = p.at(gx, gy);
      if (u && set.has(gy * 1000 + gx)) p.put(mix(u, INK, o.shaftAmt ?? 0.28), gx, gy);
    }
  }
}

function wing(p, sp, S, flap, dim) {
  const A = 8 + (1 - flap) * 57;
  const B = A + 16 + (1 - flap) * 6;
  const dA = dirUp(A), dB = dirUp(B);
  const W = [S[0] + dA[0] * sp.arm, S[1] + dA[1] * sp.arm];
  const T = [W[0] + dB[0] * sp.hand, W[1] + dB[1] * sp.hand];
  const col = (c) => (dim ? mix(c, INK, dim) : c);
  const trail = (d) => norm([-1 + d[0] * d[0], d[0] * d[1]]);
  const tA = trail(dA), tB = trail(dB);
  const fl = tone(col(sp.flt)), cv = tone(col(sp.cov)), tp = col(sp.tip);
  const gold = sp.look.gold;
  const along = (u) => (u < 0.5 ? [S[0] + (W[0] - S[0]) * u * 2, S[1] + (W[1] - S[1]) * u * 2] : [W[0] + (T[0] - W[0]) * (u - 0.5) * 2, W[1] + (T[1] - W[1]) * (u - 0.5) * 2]);

  const ns = Math.max(3, Math.round(sp.arm / 2.1));
  const np = Math.max(4, Math.round(sp.hand / (sp.fingers ? 1.7 : 1.5)));
  const chord = sp.chord * (1 + 0.22 * Math.max(0, flap));

  // flight feathers: primaries at the wing tip first so the inner ones overlap them
  const feathers = [];
  for (let i = 0; i < np; i++) {
    const u = (i + 0.5) / np; // 0 = wrist, 1 = tip
    const root = along(0.5 + u * 0.5 - 0.02);
    const g = 6 + u * (sp.fingers ? 40 : 32);
    const dir = rot(tB, dB, g);
    const len = chord * (sp.fingers ? 1.02 - 0.2 * u : 1.0 - 0.38 * u) + (u > 0.85 ? 0.5 : 0);
    feathers.push({ root, dir, len, w: (sp.hand / np) * (sp.fingers ? 1.05 : 1.7), sec: false, u });
  }
  for (let i = 0; i < ns; i++) {
    const u = 1 - (i + 0.5) / ns; // 1 = near the wrist, 0 = shoulder
    const root = along(0.02 + (1 - u) * 0.46 + 0.02);
    const g = -8 + u * 10;
    const dir = rot(tA, dA, g);
    const len = chord * (0.74 + 0.26 * u);
    feathers.push({ root, dir, len, w: (sp.arm / ns) * 1.75, sec: true, u });
  }
  feathers.sort((a, b) => (a.sec === b.sec ? (a.sec ? b.u - a.u : b.u - a.u) : a.sec ? 1 : -1));
  // order: primaries (tip -> wrist), then secondaries (wrist -> shoulder)
  for (const f of feathers) {
    const ramp = [fl[1], fl[2], fl[2], fl[3], mix(fl[4], tp, 0.55)];
    feather(p, f.root, f.dir, f.len, f.w, (q) => (q < 0.34 ? ramp[0] : q < 0.62 ? ramp[1] : q < 0.8 ? ramp[2] : q < 0.92 ? ramp[3] : ramp[4]), { seam: 0.5, shaft: [0.3, 0.82], shaftAmt: 0.3, tip: sp.fingers ? 0.28 : 0.5 });
  }

  // greater + median coverts: shorter feathers laid over the feather bases
  const nc = Math.round((sp.arm + sp.hand) / 1.9);
  for (let i = nc - 1; i >= 0; i--) {
    const u = (i + 0.5) / nc;
    const root = along(u * 0.97 + 0.01);
    const d = u < 0.5 ? dA : dB, t = u < 0.5 ? tA : tB;
    const dir = rot(t, d, u < 0.5 ? -4 + u * 10 : 8 + (u - 0.5) * 50);
    const len = chord * (0.5 - 0.1 * u);
    const ramp = [cv[2], cv[2], cv[3]];
    feather(p, root, dir, len, ((sp.arm + sp.hand) / nc) * 1.8, (q) => (q < 0.35 ? cv[1] : q < 0.72 ? cv[2] : q < 0.9 ? cv[3] : cv[4]), { seam: gold ? 0.2 : 0.34, tip: 0.5 });
  }
  // lesser coverts along the leading edge (lightest, with a pale tip catching the light)
  const nl = Math.round((sp.arm + sp.hand) / 1.5);
  for (let i = nl - 1; i >= 0; i--) {
    const u = (i + 0.5) / nl;
    const root = along(u * 0.98 + 0.01);
    const d = u < 0.5 ? dA : dB, t = u < 0.5 ? tA : tB;
    const dir = rot(t, d, u < 0.5 ? 0 : 10 + (u - 0.5) * 50);
    feather(p, root, dir, chord * 0.26, ((sp.arm + sp.hand) / nl) * 1.7, (q) => (q < 0.55 ? cv[0] : q < 0.85 ? cv[1] : cv[2]), { seam: gold ? 0.15 : 0.26, tip: 0.5 });
  }

  if (sp.look.wingbar && !dim) {
    // sparrow: pale wing bar along the covert tips
    for (let i = 0; i < nc; i++) {
      const u = (i + 0.5) / nc;
      const root = along(u * 0.97 + 0.01);
      const d = u < 0.5 ? dA : dB, t = u < 0.5 ? tA : tB;
      const dir = rot(t, d, u < 0.5 ? -4 + u * 10 : 8 + (u - 0.5) * 50);
      const len = chord * (0.5 - 0.1 * u) * 0.86;
      p.dot(mix(sp.look.wingbar, WHITE, 0.1), root[0] + dir[0] * len, root[1] + dir[1] * len);
    }
  }
  // leading-edge highlight
  if (!dim) {
    const hi = gold ? "#fffbe4" : cv[0];
    const pts = [S, W, T];
    for (let k = 0; k < 2; k++) {
      const a = pts[k], b = pts[k + 1];
      const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.3);
      for (let i = 0; i <= steps; i++) {
        const x = a[0] + ((b[0] - a[0]) * i) / steps, y = a[1] + ((b[1] - a[1]) * i) / steps;
        const e = p.get(x, y);
        if (e && e !== INK) p.dot(i % (gold ? 2 : 3) === 0 ? hi : mix(hi, cv[1], 0.5), x, y);
      }
    }
    // knuckle at the wrist
    if (sp.arm > 6) p.dot(cv[0], W[0], W[1]);
  }
  return { W, T };
}

// ---------------------------------------------------------------- tail
function tailFan(p, sp, rootX, flap) {
  const L = sp.tail, wide = sp.tailW;
  const n = Math.max(4, Math.round(wide / 1.5));
  const tc = tone(sp.tailC);
  const spread = (Math.atan2(wide / 2, L) * 180) / Math.PI * 1.15;
  const droop = 4 + (1 - flap) * 2.5;
  const look = sp.look;
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  order.sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2)); // outer feathers first, centre on top
  for (const i of order) {
    const f = (i / (n - 1)) * 2 - 1;
    const ang = droop + f * spread;
    const dir = [-Math.cos(rad(ang)), Math.sin(rad(ang))];
    const root = [rootX, f * sp.ry * 0.28 + 0.4];
    const len = L * (1 - 0.14 * Math.abs(f)) * (sp.look.wedge ? 1 : 1);
    const w = (wide / n) * 1.7;
    feather(p, root, dir, len, w, (q) => {
      if (look.tailTip && q > 0.88) return look.tailTip;
      if (look.tailBand && q > 0.66 && q < 0.86) return look.tailBand;
      return q < 0.3 ? tc[1] : q < 0.72 ? tc[2] : tc[3];
    }, { seam: 0.5, shaft: [0.2, 0.85], shaftAmt: 0.2, tip: 0.5 });
  }
}

// ---------------------------------------------------------------- beaks (pixel templates, facing right)
// H light  M mid  D shade  K mouth line  C cere
const BEAKS = {
  raptor: { rows: [".HHHM...", "CHMMMMM.", "CMMMMMMD", "CKKKMMD.", ".DDD.MD.", ".....D.."], ey: 1 },
  stout: { rows: [".HHHM.", "HMMMMD", "KKKMMD", ".DDDD."], ey: 1 },
  conical: { rows: ["HHM.", "MMMD", "KKD."], ey: 0 },
};
function drawBeak(p, sp, hx, hy, hr) {
  const tpl = BEAKS[sp.look.beakT || "stout"];
  const bt = tone(sp.beak);
  const cere = sp.look.bald ? mix(sp.beak, "#a98a70", 0.5) : mix(sp.beak, "#e8b320", 0.5);
  const map = { H: bt[1], M: bt[2], D: bt[3], K: bt[5], C: cere };
  const bx = Math.round(hx + hr * 1.0) - 1;
  const by = Math.round(hy) - tpl.ey - 1;
  tpl.rows.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) p.dot(map[ch], bx + i, by + j); }));
  // nostril
  if (sp.look.beakT === "raptor") p.dot(bt[5], bx + 1, by + 1);
}

// ---------------------------------------------------------------- legs, body, head
function legs(p, sp) {
  if (!sp.look.legs) return;
  const c = sp.look.legs, d = mix(c, INK, 0.35);
  const len = sp.look.beakT === "conical" ? 2 : Math.max(2.5, sp.ry * 0.45 + 1.5);
  const y0 = sp.ry * 0.62;
  for (const [x0, col] of [[-2, d], [0.5, c]]) {
    const x1 = x0 - len * 1.1, y1 = y0 + len * 0.55;
    p.line(col, x0, y0, x1, y1);
    p.dot(col, x1 - 1, y1); p.dot(col, x1 - 1, y1 + 1);
    if (sp.ry > 4) p.dot(col, x1, y1 + 1);
  }
}

function body(p, sp) {
  const bt = tone(sp.body), lt = tone(sp.belly), L = sp.look;
  const rxR = sp.rxR, rxF = sp.rxF, ry = sp.ry;
  // teardrop: long tapering back half, rounder chest
  const m = [];
  for (const [gx, gy] of p.maskEll(0, 0, Math.max(rxR, rxF) + 1, ry + 1)) {
    const dx = gx + 0.5 - OX, dy = gy + 0.5 - OY;
    const rx = dx < 0 ? rxR : rxF;
    const taper = dx < 0 ? 1 - 0.28 * Math.pow(-dx / rxR, 2) : 1;
    if ((dx / rx) ** 2 + (dy / (ry * taper)) ** 2 <= 1) m.push([gx, gy]);
  }
  const gold = L.gold;
  p.shape(m, (gx, gy, t, u) => {
    const edge = 0.5 + ((gx & 1) ? 0.05 : -0.03);
    if (gold) {
      if (t < 0.12) return "#fffbe4";
      if (t < 0.3) return bt[1];
      if (t < edge - 0.08) return bt[2];
      if (t < edge + 0.02) return bt[3];
      if (t < 0.68) return lt[1];
      if (t < 0.84) return lt[2];
      return lt[3];
    }
    if (t < 0.12) return bt[1];
    if (t < edge - 0.2) return bt[2];
    if (t < edge) return bt[3];
    if (t < 0.74) return lt[1];
    if (t < 0.88) return lt[2];
    return lt[3];
  });
  // feather texture: scalloped marks on the belly, flecks on the back
  const zone = (gx, gy) => {
    const e = p.at(gx, gy);
    return e;
  };
  for (const [gx, gy] of m) {
    const e = p.at(gx, gy);
    if (!e) continue;
    const k = (gx + 2 * gy) % 5;
    if (e === lt[1] && k === 0) p.put(lt[2], gx, gy);
    else if (e === lt[2] && k === 2) p.put(lt[3], gx, gy);
    else if (e === bt[2] && k === 1) p.put(bt[3], gx, gy);
    else if (e === bt[2] && k === 4 && gy < OY) p.put(bt[1], gx, gy);
  }
  if (L.streaks) {
    for (const [gx, gy] of m) {
      const e = p.at(gx, gy);
      if ((e === lt[1] || e === lt[2]) && gx % 3 === 0 && (gy + gx) % 2 === 0) p.put(L.streaks, gx, gy);
    }
  }
  if (L.sheen) {
    for (const [gx, gy] of m) {
      const e = p.at(gx, gy);
      if ((e === bt[1] || e === bt[2]) && gy < OY - ry * 0.2 && (gx + gy) % 3 === 0) p.put(L.sheen, gx, gy);
    }
  }
}

function head(p, sp) {
  const L = sp.look, hr = sp.hr, ry = sp.ry;
  const hx = sp.rxF * 0.78 + sp.neck * 0.55;
  const hy = (L.hunch ? -ry * 0.12 : -ry * 0.55) - sp.neck * 0.1;
  const ht = tone(sp.head), bt = tone(sp.body), lt = tone(sp.belly);
  const bald = L.bald;
  const neckC = bald ? ht : sp.head === sp.body ? bt : ht;

  // neck
  p.poly([[sp.rxF * 0.1, -ry * 0.95], [hx - hr * 0.3, hy - hr * 0.9], [hx + hr * 0.45, hy + hr * 0.7], [sp.rxF * 0.75, ry * 0.5], [sp.rxF * 0.1, ry * 0.45]],
    (x, y, t) => (t < 0.18 ? neckC[1] : t < 0.62 ? neckC[2] : neckC[3]));

  // ruff / collar of pale feathers
  if (L.ruff) {
    const rt = tone(L.ruff);
    const cx = sp.rxF * 0.55 + sp.neck * 0.1, top = hy + hr * 0.6, bot = ry * 0.55;
    const n = Math.max(3, Math.round((bot - top) / 2.2));
    for (let i = n - 1; i >= 0; i--) {
      const f = i / (n - 1);
      const y = top + (bot - top) * f;
      const dir = norm([-0.8, -0.3 + f * 1.1]);
      feather(p, [cx + 1.6, y], dir, hr * 1.05, (bot - top) / n * 1.9, (q) => (q < 0.4 ? rt[1] : q < 0.8 ? rt[2] : rt[3]), { seam: 0.35, tip: 0.3 });
    }
    // front of the collar
    p.ell(cx + 1.2, (top + bot) / 2, hr * 0.4, (bot - top) / 2, (x, y, t) => (t < 0.3 ? rt[1] : t < 0.7 ? rt[2] : rt[3]), { seam: 0.3 });
  }

  // head
  p.ell(hx, hy, hr * 1.12, hr, (x, y, t) => (t < 0.16 ? ht[0] : t < 0.34 ? ht[1] : t < 0.7 ? ht[2] : ht[3]), { seam: 0.35 });
  if (L.cap) p.ell(hx - 0.2, hy - hr * 0.35, hr * 1.0, hr * 0.62, (x, y, t) => (t < 0.4 ? mix(L.cap, WHITE, 0.15) : L.cap));
  if (L.cheek) p.ell(hx - hr * 0.1, hy + hr * 0.45, hr * 0.8, hr * 0.42, (x, y, t) => (t < 0.5 ? L.cheek : mix(L.cheek, INK, 0.15)));
  if (L.bib) p.ell(hx + hr * 0.45, hy + hr * 0.95, hr * 0.7, hr * 0.78, (x, y, t) => (t < 0.5 ? L.bib : mix(L.bib, INK, 0.3)));
  if (bald) {
    // wrinkles and a darker flush on the bare skin
    for (const [dx, dy] of [[-0.9, 0.9], [-0.2, 1.2], [0.4, 1.6], [-1.5, 0.2], [-0.3, -1.3]])
      p.tint(hx + dx * hr * 0.5, hy + dy * hr * 0.5, "#8a3a48", 0.38);
  }
  if (L.stripe) for (let i = 0; i < hr * 1.8; i++) p.dot(ht[4], hx + hr * 0.4 - i, hy + (i > 2 ? 0.3 : -0.1) + 0.5 * (i % 2 ? 0 : 0));
  // crest of little feathers
  if (L.crest) {
    const ct = tone(sp.body);
    for (let i = 0; i < 3; i++) {
      const bx = hx - hr * 0.2 - i * 1.4, by = hy - hr * 0.8 + i * 0.3;
      feather(p, [bx, by], norm([-0.55 - i * 0.12, -0.85 + i * 0.05]), 3.4 - i * 0.4, 1.7, (q) => (q < 0.5 ? "#fff6d0" : q < 0.85 ? ct[1] : ct[2]), { tip: 0.2 });
    }
  }
  // brow, eye
  const ex = Math.round(hx + hr * 0.38), ey = Math.round(hy - hr * 0.1);
  if (L.brow) for (let i = -1; i <= 2; i++) p.dot(L.gold ? "#b98a2a" : mix(sp.head, INK, bald ? 0.5 : 0.6), ex + i, ey - 1 + (i > 1 ? 0.4 : 0));
  const iris = L.gold ? "#ff9d1c" : L.brow ? (bald ? "#7a3b22" : "#f2c14e") : null;
  if (hr >= 3.2) {
    p.dot(INK, ex, ey);
    if (iris) p.dot(iris, ex - 1, ey);
    p.dot(INK, ex, ey + 1 > hy + hr ? ey : ey);
    if (hr >= 4.4) { p.dot(INK, ex, ey + 1); p.dot(WHITE, ex - 1, ey - 0.0 - 0.0); p.dot(iris || INK, ex - 1, ey + 1); }
  } else p.dot(INK, ex, ey);
  drawBeak(p, sp, hx, hy, hr);
  return { hx, hy };
}

// ---------------------------------------------------------------- one full bird frame
function drawBird(sp, flap) {
  const p = makePainter();
  const S = [sp.rxF * 0.08, -sp.ry * 0.6];
  // far wing: darker, a little further forward and raised
  wing(p, sp, [S[0] + 2, S[1] - 0.8], Math.min(1, flap + 0.28), 0.45);
  tailFan(p, sp, -sp.rxR * 0.6, flap);
  legs(p, sp);
  body(p, sp);
  const h = head(p, sp);
  wing(p, sp, S, flap, 0);
  const out = p.finish();
  return { px: out, hx: h.hx, hy: h.hy };
}

const FLAPS = [1, 0.3, -1, 0.3]; // wing cycle: up, mid, down, mid
const store = {};
function built(typeName) {
  if (store[typeName]) return store[typeName];
  const sp = BIRD_TYPES[typeName];
  const raw = FLAPS.slice(0, 3).map((f) => drawBird(sp, f));
  raw.push(raw[1]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of raw) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (r.px[y * GW + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const frames = raw.map((r) => {
    const px = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = r.px[(y + y0) * GW + (x + x0)];
    return px;
  });
  // forgiving hitbox: body + head + tail (wings flap too much to be part of it)
  const hxr = raw[0].hx;
  const bx0 = -(sp.rxR + sp.tail * 0.5) - 1.5, bx1 = hxr + sp.hr + 2.5;
  const by0 = Math.min(-sp.ry, raw[0].hy - sp.hr) - 1.5, by1 = sp.ry + 2;
  const cl = (v, m) => Math.max(0, Math.min(m, v));
  const hx = cl(Math.floor(bx0 + OX - x0), w - 1), hy = cl(Math.floor(by0 + OY - y0), h - 1);
  const hw = cl(Math.ceil(bx1 + OX - x0) - hx, w - hx), hh = cl(Math.ceil(by1 + OY - y0) - hy, h - hy);
  return (store[typeName] = { w, h, frames, hit: { x: hx, y: hy, w: hw, h: hh } });
}

export function buildGrid(typeName, frame) {
  const b = built(typeName);
  return { w: b.w, h: b.h, px: b.frames[frame % 4] };
}

function gridToCanvas(g, tint, shine) {
  const c = document.createElement("canvas");
  c.width = g.w; c.height = g.h;
  const ctx = c.getContext("2d");
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      let col = g.px[y * g.w + x];
      if (!col) continue;
      if (tint && col !== INK) col = tint;
      else if (shine >= 0 && col !== INK) {
        const d = Math.abs(x + y * 0.55 - shine);
        if (d < 1.6) col = mix(col, "#ffffff", 0.78);
        else if (d < 3.2) col = mix(col, "#fff6c8", 0.38);
      }
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  return c;
}

const cache = {};
// shine: -1 = none, otherwise the position of a diagonal glint sweeping across the sprite
export function getSprite(typeName, frame, white = false, shine = -1) {
  const key = `${typeName}:${frame}:${white ? 1 : 0}:${white ? -1 : shine}`;
  if (!cache[key]) cache[key] = gridToCanvas(buildGrid(typeName, frame % 4), white ? "#ffffff" : null, shine);
  return cache[key];
}

// size of the sprite + the (unflipped) box that counts as "hit"
export function spriteSize(typeName) {
  const b = built(typeName);
  return { w: b.w, h: b.h, hx: b.hit.x, hy: b.hit.y, hw: b.hit.w, hh: b.hit.h };
}

// ---- tiny 3x5 pixel font for score popups drawn on the game canvas ----
const FONT = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111",
  "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001",
  "8": "111101111101111", "9": "111101111001111", "+": "000010111010000", "x": "000101010101000",
  A: "010101111101101", L: "100100100100111", O: "111101101101111", N: "111101101101101", S: "111100111001111",
  E: "111100111100111", D: "110101101101110", "!": "010010010000010",
};
export function drawText(ctx, text, x, y, color, shadow = "#150a05") {
  const w = 4;
  const pass = (ox, oy, col) => {
    ctx.fillStyle = col;
    let cx = x + ox;
    for (const ch of String(text)) {
      const g = FONT[ch];
      if (g) {
        for (let i = 0; i < 15; i++) if (g[i] === "1") ctx.fillRect(cx + (i % 3), y + oy + ((i / 3) | 0), 1, 1);
      }
      cx += w;
    }
  };
  pass(1, 1, shadow);
  pass(0, 0, color);
}
export function textWidth(text) {
  return String(text).length * 4 - 1;
}
