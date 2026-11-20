// Pixel-art guns drawn in code, with the same treatment as the birds in sprites.js:
// every gun is built on a small pixel grid out of shaded parts (round steel barrels,
// grained wood, brass, engraving, screws), outlined, then cached as a canvas.
// Guns point RIGHT (+x) from the origin so the game can rotate them to follow the
// crosshair. Skins just swap the palette; every shade is derived from it.
import { SKINS } from "./guns.js";

const INK = "#150a05";

// x0/x1 = extent (used by previews), muzzle = where the flash and smoke come out
export const GUN_ART = {
  rifle: { x0: -24, x1: 47, muzzle: 49 },
  revolver: { x0: -14, x1: 40, muzzle: 42 },
  lever: { x0: -22, x1: 57, muzzle: 59 },
  shotgun: { x0: -25, x1: 45, muzzle: 47 },
  sniper: { x0: -24, x1: 70, muzzle: 72 },
  carbine: { x0: -20, x1: 43, muzzle: 45 },
};

// ---------------------------------------------------------------- colour helpers
const hex2 = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a, b, t) => {
  const A = hex2(a), B = hex2(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

const lum = (c) => { const [r, g, b] = hex2(c); return 0.3 * r + 0.59 * g + 0.11 * b; };

function palette(P) {
  // very dark skins (Midnight, Neon) get lifted mid-tones so the shading doesn't sink into the outline
  const dM = lum(P.metal) < 70, dW = lum(P.wood) < 70;
  return {
    ink: INK,
    ws: mix(P.woodHi, "#ffffff", 0.2), wh: P.woodHi,
    wm: dW ? mix(P.wood, P.woodHi, 0.3) : P.wood,
    wd: dW ? P.wood : mix(P.wood, INK, 0.42),
    wk: mix(P.wood, INK, dW ? 0.4 : 0.7),
    ms: mix(P.metalHi, "#ffffff", 0.6), mh: P.metalHi,
    mm: dM ? mix(P.metal, P.metalHi, 0.24) : P.metal,
    ml: dM ? P.metal : mix(P.metal, INK, 0.28),
    md: mix(P.metal, INK, dM ? 0.3 : 0.55),
    ah: mix(P.accent, "#ffffff", 0.55), am: P.accent, ad: mix(P.accent, INK, 0.45), ak: mix(P.accent, INK, 0.7),
  };
}

// vertical shading ramps (top -> bottom). Light comes from above.
function ramps(p) {
  return {
    wood: [p.wh, p.wh, p.wm, p.wm, p.wm, p.wd, p.wd],
    woodDk: [p.wm, p.wm, p.wd, p.wd, p.wk],
    tube: [p.ms, p.mh, p.mh, p.mm, p.mm, p.ml, p.md], // round steel
    flat: [p.mh, p.mm, p.mm, p.ml],
    dark: [p.mm, p.ml, p.md],
    brass: [p.ah, p.am, p.am, p.ad, p.ad],
    brassFlat: [p.am, p.am, p.ad],
  };
}

// ---------------------------------------------------------------- the pixel grid
const GX = -30, GY = -22, GW = 118, GH = 48; // window of gun space covered by a sprite
const K = (x, y) => (y + 200) * 1000 + (x + 200);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBuilder(p) {
  const px = new Array(GW * GH).fill(null);
  const inb = (x, y) => x >= GX && y >= GY && x < GX + GW && y < GY + GH;
  const at = (x, y) => (inb(x, y) ? px[(y - GY) * GW + (x - GX)] : null);
  const put = (c, x, y) => { if (inb(x, y)) px[(y - GY) * GW + (x - GX)] = c; };

  const maskPoly = (pts) => {
    const m = [];
    for (let y = GY; y < GY + GH; y++)
      for (let x = GX; x < GX + GW; x++) {
        const cx = x + 0.5, cy = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) m.push([x, y]);
      }
    return m;
  };
  const maskBox = (x, y, w, h) => {
    const m = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m.push([x + i, y + j]);
    return m;
  };
  const maskEll = (cx, cy, rx, ry) => {
    const m = [];
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) m.push([x, y]);
      }
    return m;
  };

  // paint a mask with a shading ramp. o.dir: "y" shades top->bottom (default), "x" left->right.
  // o.seam darkens whatever is already drawn next to the part (a crisp dark separation line)
  // o.grain adds wood-grain streaks
  function shape(mask, ramp, o = {}) {
    const dir = o.dir || "y";
    const set = new Set(mask.map(([x, y]) => K(x, y)));
    if (o.seam) {
      for (const [x, y] of mask)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (set.has(K(nx, ny))) continue;
          const u = at(nx, ny);
          if (u && u !== INK) put(mix(u, INK, o.seam === true ? 0.5 : o.seam), nx, ny);
        }
    }
    const ext = new Map();
    for (const [x, y] of mask) {
      const k = dir === "y" ? x : y, v = dir === "y" ? y : x;
      const e = ext.get(k);
      if (!e) ext.set(k, [v, v]);
      else { if (v < e[0]) e[0] = v; if (v > e[1]) e[1] = v; }
    }
    for (const [x, y] of mask) {
      const k = dir === "y" ? x : y, v = dir === "y" ? y : x;
      const e = ext.get(k);
      const t = (v - e[0] + 0.5) / (e[1] - e[0] + 1);
      put(ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))], x, y);
    }
    if (o.grain) {
      const r = rng(o.seed || 11);
      const n = Math.floor(mask.length / (o.grain === true ? 7 : o.grain));
      for (let i = 0; i < n; i++) {
        const [x, y] = mask[Math.floor(r() * mask.length)];
        const len = 2 + Math.floor(r() * 5), dark = r() < 0.62;
        for (let j = 0; j < len; j++) {
          if (!set.has(K(x + j, y))) break;
          const u = at(x + j, y);
          put(dark ? mix(u, INK, 0.26) : mix(u, "#ffffff", 0.14), x + j, y);
        }
      }
    }
  }

  const g = {
    at, put,
    px: (c, x, y) => put(c, x, y),
    rect: (c, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(c, x + i, y + j); },
    line: (c, x0, y0, x1, y1) => {
      let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
      for (;;) {
        put(c, x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    },
    poly: (pts, ramp, o) => shape(maskPoly(pts), ramp, o),
    box: (x, y, w, h, ramp, o) => shape(maskBox(x, y, w, h), ramp, o),
    ell: (cx, cy, rx, ry, ramp, o) => shape(maskEll(cx, cy, rx, ry), ramp, o),
    // punch a hole (shows the background)
    hole: (pts) => { for (const [x, y] of maskPoly(pts)) put(null, x, y); },
    holeBox: (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(null, x + i, y + j); },
    // darken / lighten what is already drawn
    tint: (x, y, c, t) => { const u = at(x, y); if (u) put(mix(u, c, t), x, y); },
  };

  // 1px ink outline around the whole silhouette, like the birds
  g.finish = () => {
    const out = px.slice();
    for (let y = GY; y < GY + GH; y++)
      for (let x = GX; x < GX + GW; x++) {
        if (at(x, y)) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out[(y - GY) * GW + (x - GX)] = INK;
      }
    return out;
  };
  return g;
}

// ---------------------------------------------------------------- shared detail helpers
const scroll = (g, c, x0, x1, y) => {
  for (let x = x0; x <= x1; x += 3) { g.px(c, x, y); g.px(c, x + 1, y - 1); g.px(c, x + 2, y); }
};
const screw = (g, p, x, y) => { g.px(p.md, x, y); g.px(p.ms, x - 1, y - 1); };
// light catching the top edge of whatever is drawn in columns x0..x1
const rim = (g, x0, x1, c, only) => {
  for (let x = x0; x <= x1; x++)
    for (let y = GY; y < GY + GH; y++) {
      const u = g.at(x, y);
      if (!u) continue;
      if (!only || only.includes(u)) g.px(c, x, y);
      break;
    }
};
// checkering / stippling on the parts that are already drawn
const checker = (g, c, x0, x1, y0, y1) => {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if ((x + y) % 2 === 0 && g.at(x, y)) g.px(c, x, y);
};
// a proper curved hammer with a knurled spur, sitting on the receiver corner (rx, ry)
function hammer(g, p, r, rx, ry) {
  const P = [[-6, -6], [-2, -6], [0, -4], [1, -2], [1, 1], [-4, 1], [-4, -1], [-5, -3], [-6, -4]];
  g.poly(P.map(([x, y]) => [rx + x, ry + y]), r.tube, { dir: "x", seam: true });
  g.px(p.ms, rx - 5, ry - 6); g.px(p.mh, rx - 4, ry - 6);
  g.px(p.md, rx - 4, ry - 5); g.px(p.md, rx - 3, ry - 4); g.px(p.md, rx - 2, ry - 3); // knurling
  g.px(p.md, rx - 1, ry - 1); g.px(p.ms, rx - 2, ry - 1); // pivot screw
}
// four-leaf clover, 7x7 with a little stem
function clover(g, p, x, y) {
  const K = "#0b4a25", G = "#2fbf6b", H = "#b9ffd3";
  const map = [".KK.KK.", "KHGKHGK", "KGGGGGK", ".KGYGK.", "KGGGGGK", "KHGKHGK", ".KK.KK."];
  map.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === ".") return;
    g.px(ch === "K" ? K : ch === "G" ? G : ch === "H" ? H : p.ah, x + i, y + j);
  }));
  g.px(K, x + 3, y + 7); g.px(K, x + 4, y + 8);
}

// ---------------------------------------------------------------- the designs
const DESIGNS = {
  // ======================= Old Reliable: classic wooden single-shot rifle
  rifle(g, p, r) {
    // stock: drooping comb, slim wrist, curved belly
    g.poly([[-22, -1], [-16, -3], [-8, -4], [8, -4], [8, 3], [1, 3], [-3, 4], [-7, 5], [-12, 8], [-18, 11], [-22, 12]], r.wood, { grain: 6, seed: 3 });
    rim(g, -16, -5, p.ws, [p.wh]);
    checker(g, p.wd, -10, -4, 0, 4);
    g.px(p.wk, -11, 6); // cartridge-trap pin
    g.line(p.wd, -19, 3, -14, 3); // cheek groove
    // brass butt plate
    g.poly([[-24, -1], [-21, -1], [-21, 12], [-24, 13]], r.brass, { dir: "x", seam: true });
    g.px(p.ad, -22, 3); g.px(p.ad, -22, 9); g.px(p.ms, -23, -1);
    // forend with ramrod
    g.poly([[10, 0], [38, 0], [38, 6], [12, 6], [10, 5]], r.wood, { grain: 6, seed: 5 });
    g.line(p.mh, 12, 3, 35, 3); g.line(p.md, 12, 4, 35, 4);
    g.box(36, 2, 2, 3, r.dark); // ramrod pipe cap
    g.box(38, 0, 1, 7, r.brass, { dir: "x" }); // brass forend tip
    // barrel
    g.box(8, -2, 39, 4, r.tube);
    // barrel bands
    g.box(19, -3, 2, 10, r.brass, { dir: "x", seam: true });
    g.box(31, -3, 2, 10, r.brass, { dir: "x", seam: true });
    g.px(p.ad, 19, 5); g.px(p.ad, 31, 5);
    // muzzle crown + front sight
    g.box(45, -3, 2, 6, r.tube, { seam: true }); g.px(p.md, 46, 0);
    g.box(42, -4, 4, 1, r.flat);
    g.box(43, -6, 2, 2, r.dark); g.px(p.ah, 44, -6);
    // rear sight (ladder)
    g.box(11, -3, 7, 1, r.flat, { seam: true });
    g.box(13, -6, 3, 3, r.flat, { seam: true });
    g.px(p.md, 14, -6); g.line(p.am, 13, -4, 15, -4);
    // receiver
    g.box(-3, -4, 13, 8, r.flat, { seam: true });
    g.line(p.mh, -3, -4, 9, -4);
    g.line(p.ml, -2, 2, 8, 2);
    scroll(g, p.md, -1, 7, 0);
    screw(g, p, 8, -2); screw(g, p, -1, -2);
    hammer(g, p, r, -3, -4);
    // brass trigger guard + trigger
    g.poly([[-2, 3], [10, 3], [10, 6], [8, 9], [1, 9], [-1, 6]], r.brass);
    g.hole([[0, 4], [8, 4], [8, 6], [7, 8], [2, 8], [1, 6]]);
    g.line(p.md, 4, 4, 5, 6); g.px(p.mh, 4, 4);
  },

  // ======================= Peacemaker: six-shooter
  revolver(g, p, r) {
    // grip with brass backstrap, medallion and butt cap
    g.poly([[-6, 0], [3, 0], [2, 5], [0, 11], [-1, 17], [-12, 17], [-13, 14], [-11, 7], [-8, 2]], r.wood, { grain: 5, seed: 9, dir: "x" });
    g.line(p.ah, -8, 2, -11, 7); g.line(p.am, -11, 8, -13, 14); g.line(p.ad, -9, 3, -12, 8);
    g.box(-13, 16, 12, 2, r.brass, { seam: true });
    g.ell(-5, 9, 2.2, 2.2, r.brass, { seam: true }); g.px(p.ak, -5, 9); // grip medallion
    g.px(p.wd, 1, 6); g.px(p.wd, 0, 10); g.px(p.wd, -3, 13);
    g.px(p.mh, -14, 16); g.px(p.mm, -14, 17); // lanyard ring
    // frame
    g.box(-6, -5, 16, 9, r.flat, { seam: true });
    g.line(p.ms, -6, -5, 9, -5);
    g.line(p.ml, -5, 2, 8, 2);
    scroll(g, p.md, -4, 5, 0);
    screw(g, p, -3, 3);
    // cylinder
    g.box(9, -4, 12, 9, r.tube, { seam: true });
    for (const fx of [12, 15, 18]) { g.rect(p.md, fx, -3, 1, 7); g.rect(p.mh, fx + 1, -3, 1, 4); }
    g.rect(p.ml, 20, -3, 1, 7); g.rect(p.md, 9, -3, 1, 7);
    g.px(p.am, 10, -1); g.px(p.ah, 10, -2); // cylinder pin
    // top strap + rear sight notch
    g.box(-2, -7, 24, 2, [p.ms, p.mm], { seam: true });
    g.px(p.md, -1, -7); g.line(p.md, 4, -6, 6, -6); g.px(p.md, 18, -6);
    // loading gate
    g.box(6, -2, 3, 5, r.dark, { seam: true }); g.px(p.mh, 7, -1);
    // barrel + ejector rod housing
    g.box(21, -2, 19, 4, r.tube);
    g.box(21, 2, 14, 2, r.dark, { seam: true });
    g.box(34, 2, 3, 3, r.tube, { seam: true }); g.px(p.md, 35, 3);
    g.box(38, -3, 2, 6, r.tube, { seam: true }); g.px(p.md, 39, 0);
    // front sight
    g.box(36, -5, 3, 2, r.dark, { seam: true }); g.px(p.ah, 37, -5);
    hammer(g, p, r, -6, -5);
    // brass trigger guard + trigger
    g.poly([[1, 4], [12, 4], [12, 7], [10, 10], [3, 10], [1, 8]], r.brass);
    g.hole([[3, 5], [10, 5], [10, 7], [9, 9], [4, 9], [3, 7]]);
    g.line(p.md, 6, 4, 7, 6); g.px(p.mh, 6, 4);
  },

  // ======================= Widowmaker: brass-receiver lever-action
  lever(g, p, r) {
    // stock
    g.poly([[-21, -3], [-14, -4], [-6, -5], [6, -5], [6, 3], [-1, 3], [-4, 4], [-8, 5], [-13, 8], [-18, 10], [-21, 11]], r.wood, { grain: 6, seed: 21 });
    rim(g, -14, -6, p.ws, [p.wh]);
    checker(g, p.wd, -9, -4, 0, 4);
    g.line(p.wd, -18, 3, -12, 3);
    g.poly([[-22, -3], [-20, -3], [-20, 11], [-22, 12]], r.flat, { dir: "x", seam: true }); g.px(p.ms, -22, -3); // steel butt plate
    g.px(p.md, -21, 0); g.px(p.md, -21, 8);
    // magazine tube
    g.box(16, 2, 40, 3, r.tube);
    // forend
    g.poly([[15, 2], [39, 2], [39, 8], [16, 8]], r.wood, { grain: 6, seed: 23 });
    g.box(39, 2, 1, 7, r.brass, { dir: "x" });
    g.line(p.wd, 17, 5, 37, 5);
    // barrel
    g.box(14, -2, 43, 4, r.tube);
    // bands
    g.box(29, -3, 2, 12, r.brass, { dir: "x", seam: true });
    g.box(49, -3, 2, 9, r.brass, { dir: "x", seam: true });
    // muzzle + sights
    g.box(55, -3, 2, 6, r.tube, { seam: true }); g.px(p.md, 56, 0);
    g.box(52, -4, 4, 1, r.flat);
    g.box(53, -6, 2, 2, r.dark); g.px(p.ah, 54, -6);
    g.box(19, -3, 7, 1, r.flat, { seam: true });
    g.box(21, -5, 3, 2, r.flat, { seam: true }); g.px(p.md, 22, -5);
    // brass receiver
    g.box(-1, -4, 16, 8, r.brass, { seam: true });
    g.line(p.ah, -1, -4, 14, -4);
    g.box(7, -2, 6, 4, r.brassFlat, { seam: true }); g.rect(p.ak, 8, -1, 4, 1); g.px(p.ah, 8, 0); // loading gate
    scroll(g, p.ak, 0, 5, 2);
    screw(g, p, 14, -2); screw(g, p, 0, -2);
    // saddle ring
    g.px(p.mh, 3, -1); g.px(p.mm, 2, 0); g.px(p.md, 3, 1); g.px(p.mh, 4, 0);
    hammer(g, p, r, -1, -4);
    // lever loop
    g.poly([[3, 4], [18, 4], [21, 6], [22, 8], [22, 11], [20, 12], [6, 12], [3, 10]], r.brass, { seam: true });
    g.hole([[5, 6], [17, 6], [19, 8], [19, 10], [6, 10], [5, 8]]);
    g.line(p.md, 9, 4, 10, 8); g.px(p.mh, 9, 4);
    g.px(p.ad, 4, 8); g.px(p.ad, 21, 8);
  },

  // ======================= Thunder Twin: double-barrel coach gun
  shotgun(g, p, r) {
    // stock
    g.poly([[-23, -3], [-14, -5], [-5, -6], [8, -6], [8, 5], [1, 5], [-3, 6], [-8, 7], [-14, 10], [-20, 13], [-23, 14]], r.wood, { grain: 6, seed: 31 });
    rim(g, -14, -6, p.ws, [p.wh]);
    checker(g, p.wd, -10, -4, 0, 6);
    g.line(p.wd, -20, 4, -13, 4);
    g.poly([[-25, -3], [-22, -3], [-22, 14], [-25, 15]], r.dark, { dir: "x", seam: true }); g.px(p.mh, -24, -3); // butt pad
    g.px(p.md, -23, 3); g.px(p.md, -23, 10);
    // forend
    g.poly([[9, 4], [27, 4], [27, 8], [26, 9], [11, 9], [9, 7]], r.wood, { grain: 6, seed: 33 });
    g.box(27, 4, 1, 5, r.brass, { dir: "x" });
    g.line(p.wd, 11, 8, 25, 8);
    // barrels (over/under) with a rib between them
    g.box(8, -5, 37, 4, r.tube);
    g.box(8, 1, 36, 4, r.tube);
    g.rect(p.ml, 8, -1, 37, 1); g.rect(p.md, 8, 0, 36, 1);
    // brass bands
    g.box(24, -6, 2, 12, r.brass, { dir: "x", seam: true });
    g.box(36, -6, 2, 12, r.brass, { dir: "x", seam: true });
    // muzzles + bead
    g.box(43, -6, 2, 6, r.tube, { seam: true }); g.px(p.md, 44, -3);
    g.box(42, 0, 2, 6, r.tube, { seam: true }); g.px(p.md, 43, 3);
    g.px(p.ah, 44, -7);
    // receiver
    g.box(-4, -6, 13, 13, r.flat, { seam: true });
    g.line(p.ms, -4, -6, 8, -6);
    g.line(p.ml, -3, 5, 7, 5);
    scroll(g, p.md, -2, 6, 3); scroll(g, p.md, -2, 6, -3);
    g.px(p.ah, 2, 0); g.px(p.am, 1, 0); g.px(p.am, 3, 0); g.px(p.am, 2, 1); g.px(p.am, 2, -1); // brass star inlay
    screw(g, p, 7, 0); screw(g, p, -2, 0);
    // twin hammers (far one drawn first, slightly darker)
    hammer(g, p, r, 1, -6);
    for (let y = -12; y <= -6; y++) for (let x = -4; x <= 2; x++) if (g.at(x, y) && y < -6) g.tint(x, y, "#150a05", 0.22);
    hammer(g, p, r, -3, -6);
    // trigger guard with two triggers
    g.poly([[-2, 7], [11, 7], [11, 10], [9, 13], [1, 13], [-1, 10]], r.brass);
    g.hole([[0, 8], [9, 8], [9, 10], [8, 12], [2, 12], [1, 10]]);
    g.line(p.md, 3, 8, 4, 10); g.line(p.md, 6, 8, 7, 10); g.px(p.mh, 3, 8); g.px(p.mh, 6, 8);
  },

  // ======================= Long Tom: scoped sharpshooter rifle
  sniper(g, p, r) {
    // stock with a raised cheek piece
    g.poly([[-22, -3], [-16, -6], [-9, -7], [-3, -6], [2, -5], [2, 4], [-3, 4], [-7, 6], [-13, 9], [-19, 12], [-22, 13]], r.wood, { grain: 6, seed: 41 });
    rim(g, -16, -4, p.ws, [p.wh]);
    checker(g, p.wd, -9, -4, 0, 4);
    g.line(p.wk, -18, -2, -10, -3); // cheek-piece seam
    g.poly([[-24, -3], [-21, -3], [-21, 13], [-24, 14]], r.dark, { dir: "x", seam: true }); g.px(p.mh, -23, -3);
    // forend
    g.poly([[18, 0], [42, 0], [42, 5], [20, 5]], r.wood, { grain: 6, seed: 43 });
    g.box(42, 0, 1, 6, r.brass, { dir: "x" });
    // heavy barrel: thick breech, long taper
    g.box(14, -3, 14, 6, r.tube);
    g.box(28, -2, 38, 4, r.tube);
    // barrel band
    g.box(31, -3, 2, 9, r.brass, { dir: "x", seam: true });
    // muzzle brake
    g.box(62, -5, 8, 10, r.tube, { seam: true });
    for (const bx of [64, 66, 68]) g.rect(p.md, bx, -4, 1, 8);
    g.line(p.ms, 62, -5, 69, -5);
    // folding bipod: two splayed legs with feet
    g.line(p.md, 48, 3, 53, 10); g.line(p.ml, 47, 3, 52, 10); g.box(51, 10, 4, 1, r.dark);
    g.line(p.ml, 45, 3, 41, 10); g.line(p.mm, 44, 3, 40, 10); g.box(38, 10, 4, 1, r.dark);
    g.box(43, 2, 6, 2, r.brass, { seam: true }); // bipod clamp
    // scope: mounts, tube, turrets, lens
    g.box(13, -7, 3, 5, r.brass, { dir: "x", seam: true });
    g.box(29, -7, 3, 5, r.brass, { dir: "x", seam: true });
    g.box(6, -12, 5, 7, r.tube, { seam: true }); // eyepiece
    g.box(10, -11, 24, 5, r.tube, { seam: true }); // tube
    g.box(33, -12, 6, 7, r.tube, { seam: true }); // objective bell
    g.box(12, -12, 3, 7, r.brass, { dir: "x", seam: true }); // rings
    g.box(29, -12, 3, 7, r.brass, { dir: "x", seam: true });
    g.box(20, -14, 4, 3, r.brass, { seam: true }); // elevation turret
    g.px(p.ak, 21, -13); g.px(p.ak, 22, -13);
    g.box(17, -10, 2, 3, r.dark); g.px(p.mh, 17, -10); // windage knob
    g.rect("#8be4ff", 38, -11, 1, 5); g.px("#ffffff", 38, -11); g.px("#ffffff", 38, -10); // lens glint
    g.line(p.ms, 7, -12, 10, -12); g.line(p.ms, 34, -12, 37, -12);
    // action
    g.box(2, -5, 14, 9, r.flat, { seam: true });
    g.line(p.mh, 2, -5, 15, -5); g.line(p.ml, 3, 2, 14, 2);
    scroll(g, p.md, 4, 12, 0);
    screw(g, p, 14, -3); screw(g, p, 4, -3);
    g.box(9, -5, 3, 2, r.dark); // ejection port
    hammer(g, p, r, 2, -5);
    // lever / guard + set triggers
    g.poly([[1, 4], [15, 4], [18, 8], [18, 11], [3, 11], [0, 8]], r.flat, { seam: true });
    g.hole([[3, 6], [14, 6], [16, 8], [16, 10], [4, 10], [3, 8]]);
    g.line(p.md, 6, 6, 7, 8); g.line(p.md, 10, 6, 11, 8); g.px(p.mh, 6, 6); g.px(p.mh, 10, 6);
  },

  // ======================= Lucky Clover: gold-trimmed carbine with a clover inlay
  carbine(g, p, r) {
    const G = "#3fd47a", GH = "#b9ffd3", GD = "#16803f", GK = "#0b4a25";
    // stock
    g.poly([[-19, -2], [-13, -4], [-6, -5], [5, -5], [5, 3], [-2, 3], [-4, 4], [-8, 6], [-14, 8], [-19, 10]], r.wood, { grain: 6, seed: 51 });
    rim(g, -13, -6, p.ws, [p.wh]);
    clover(g, p, -16, -1); // four-leaf clover inlay
    g.poly([[-20, -2], [-18, -2], [-18, 10], [-20, 11]], r.brass, { dir: "x", seam: true }); g.px(p.ah, -20, -2); // gold butt plate
    // forend
    g.poly([[14, 0], [31, 0], [31, 6], [15, 6]], r.wood, { grain: 6, seed: 53 });
    g.box(31, 0, 1, 7, r.brass, { dir: "x" });
    g.line(p.wd, 16, 4, 29, 4);
    // barrel
    g.box(10, -2, 33, 4, r.tube);
    // gold bands
    g.box(17, -3, 3, 9, r.brass, { dir: "x", seam: true });
    g.box(26, -3, 2, 9, r.brass, { dir: "x", seam: true });
    g.box(36, -3, 2, 5, r.brass, { dir: "x", seam: true });
    // muzzle + sights
    g.box(41, -3, 2, 6, r.tube, { seam: true }); g.px(p.md, 42, 0);
    g.box(38, -4, 4, 1, r.flat);
    g.box(39, -6, 2, 2, r.dark); g.px(G, 40, -6);
    g.box(11, -3, 6, 1, r.flat, { seam: true });
    g.box(13, -5, 3, 2, r.flat, { seam: true }); g.px(p.md, 14, -5);
    // receiver with an emerald
    g.box(-2, -4, 13, 8, r.brass, { seam: true });
    g.line(p.ah, -2, -4, 10, -4);
    scroll(g, p.ak, 0, 8, 2);
    g.rect(GK, 3, -2, 5, 4); g.rect(GD, 4, -1, 3, 2); g.px(GH, 4, -1); g.px(G, 5, -1); g.px(G, 4, 0); g.px(GD, 6, 0); g.px(GH, 3, -2);
    screw(g, p, 9, -2); screw(g, p, -1, -2);
    hammer(g, p, r, -2, -4);
    // gold lever loop
    g.poly([[2, 4], [13, 4], [16, 7], [16, 11], [4, 11], [2, 8]], r.brass, { seam: true });
    g.hole([[4, 6], [12, 6], [14, 8], [14, 10], [5, 10], [4, 8]]);
    g.line(p.md, 7, 4, 8, 7); g.px(p.mh, 7, 4);
  },
};

// ---------------------------------------------------------------- build + cache
const gridCache = {};
export function buildGunGrid(id, skinId) {
  const key = id + ":" + skinId;
  if (gridCache[key]) return gridCache[key];
  const P = SKINS[skinId] || SKINS.classic;
  const p = palette(P);
  const g = makeBuilder(p);
  (DESIGNS[id] || DESIGNS.rifle)(g, p, ramps(p));
  const px = g.finish();
  // tight bounding box (used to centre previews)
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (px[y * GW + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return (gridCache[key] = { px, GW, GH, GX, GY, bbox: { x0: x0 + GX, y0: y0 + GY, x1: x1 + GX, y1: y1 + GY } });
}

const spriteCache = {};
function gunCanvas(id, skinId, S) {
  const key = `${id}:${skinId}:${S}`;
  if (spriteCache[key]) return spriteCache[key];
  const g = buildGunGrid(id, skinId);
  const c = document.createElement("canvas");
  c.width = GW * S; c.height = GH * S;
  const ctx = c.getContext("2d");
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const col = g.px[y * GW + x];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * S, y * S, S, S);
    }
  return (spriteCache[key] = c);
}

// muzzle flash: a jagged tongue of fire (white core -> yellow -> orange -> red)
function drawFlash(ctx, m) {
  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  for (let dy = -6; dy <= 6; dy++) {
    const a = Math.abs(dy);
    const len = Math.round(15 * Math.pow(1 - a / 7, 1.2)) - (a % 2 ? 2 : 0);
    for (let dx = -2; dx <= len; dx++) {
      const t = (dx + 2) / (len + 2);
      R(t < 0.2 ? "#ffffff" : t < 0.42 ? "#fff7c2" : t < 0.7 ? "#ffb347" : "#ff6a2a", m + dx, dy, 1, 1);
    }
  }
  R("#ff4a1c", m + 12, -1, 2, 2);
  for (const [sx, sy] of [[9, -8], [12, 7], [17, -3], [16, 4], [6, 9], [7, -9]]) R("#ffd75a", m + sx, sy, 1, 1);
  R("#ffffff", m - 3, -2, 3, 4);
}

export function drawGun(ctx, id, skinId, opts = {}) {
  const P = SKINS[skinId] || SKINS.classic;
  const S = 3; // sprites are cached at 3x and drawn back down, so rotated guns stay smooth
  ctx.save();
  if (P.glow) { ctx.shadowColor = P.glow; ctx.shadowBlur = 6; }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(1 / S, 1 / S);
  ctx.drawImage(gunCanvas(id, skinId, S), GX * S, GY * S);
  ctx.restore();
  if (opts.flash) drawFlash(ctx, GUN_ART[id].muzzle);
}

// Picture of a gun for the shop / armory cards. The canvas is sized to the pixels it is
// really shown at (retina included) and the gun is drawn to fill it, so the new detail
// stays sharp instead of being stretched up from a tiny 100x44 bitmap.
export const PREVIEW_W = 112, PREVIEW_H = 48;
export function previewGun(canvas, id, skinId) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 160;
  const W = Math.max(PREVIEW_W * 2, Math.round(cssW * dpr)), H = Math.round((W * PREVIEW_H) / PREVIEW_W);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const S = 4, f = W / PREVIEW_W; // sprite is cached at 4x, then scaled to fit
  const g = buildGunGrid(id, skinId), b = g.bbox;
  const cx = (b.x0 + b.x1 + 1) / 2, cy = (b.y0 + b.y1 + 1) / 2;
  const spr = gunCanvas(id, skinId, S), k = f / S;
  ctx.drawImage(spr, Math.round(W / 2 - cx * f + GX * f), Math.round(H / 2 - cy * f + GY * f), Math.round(spr.width * k), Math.round(spr.height * k));
}
