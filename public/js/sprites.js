// Pixel-art birds, generated in code (no image files needed).
// Every bird is drawn from simple shapes onto a tiny grid, outlined, then
// cached as a canvas per wing-flap frame. Sprites face RIGHT; flip for left.

export const BIRD_TYPES = {
  vulture: {
    label: "Vulture", points: 20, w: 27, h: 17, hp: 1, minLevel: 1, weight: 4,
    speed: [26, 38], amp: [2, 6], freq: [0.8, 1.4], flap: 5,
    body: "#4a3426", belly: "#6b4c38", wing: "#2c1d14", wingTip: "#1a110c",
    head: "#d9777a", beak: "#f2e3b3", tail: "#2c1d14", ring: "#f5efe0", big: true,
  },
  crow: {
    label: "Crow", points: 40, w: 17, h: 12, hp: 1, minLevel: 1, weight: 5,
    speed: [44, 62], amp: [3, 9], freq: [1.2, 2.0], flap: 8,
    body: "#2a2347", belly: "#3d3563", wing: "#1d1833", wingTip: "#120f22",
    head: "#2a2347", beak: "#f4b942", tail: "#1d1833",
  },
  hawk: {
    label: "Hawk", points: 70, w: 19, h: 13, hp: 1, minLevel: 2, weight: 4,
    speed: [64, 88], amp: [6, 16], freq: [1.6, 2.6], flap: 7,
    body: "#b5651d", belly: "#f1d9a0", wing: "#8a4513", wingTip: "#4a2209",
    head: "#d28a3c", beak: "#f4d03f", tail: "#c0392b",
  },
  sparrow: {
    label: "Sparrow", points: 100, w: 11, h: 8, hp: 1, minLevel: 3, weight: 4,
    speed: [74, 104], amp: [5, 14], freq: [2.4, 3.6], flap: 14,
    body: "#a86b3c", belly: "#f6e7c1", wing: "#7a4a24", wingTip: "#4a2a12",
    head: "#8d5a2e", beak: "#f4b942", tail: "#7a4a24",
  },
  eagle: {
    label: "Golden Eagle", points: 250, w: 25, h: 16, hp: 1, minLevel: 4, weight: 1, rare: true,
    speed: [96, 124], amp: [4, 10], freq: [1.4, 2.2], flap: 6,
    body: "#e0a020", belly: "#f7d774", wing: "#b87a10", wingTip: "#6b4408",
    head: "#fff4d0", beak: "#f4d03f", tail: "#fff4d0", sparkle: true,
  },
  buzzard: {
    label: "Big Buzzard", points: 150, w: 37, h: 23, hp: 3, minLevel: 5, weight: 2, boss: true,
    speed: [22, 30], amp: [3, 8], freq: [0.6, 1.0], flap: 3.6,
    body: "#3c4a2a", belly: "#6b7a45", wing: "#26301a", wingTip: "#141a0d",
    head: "#d9777a", beak: "#f2e3b3", tail: "#26301a", ring: "#f5efe0", big: true,
  },
};

const OUTLINE = "#150a05";

function makeGrid(w, h) {
  return { w, h, px: new Array(w * h).fill(null) };
}
function put(g, x, y, c) {
  x |= 0; y |= 0;
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.px[y * g.w + x] = c;
}
function ellipse(g, cx, cy, rx, ry, c) {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(g, x, y, c);
    }
}
function poly(g, pts, c) {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) put(g, x, y, c);
    }
}

// flap: 1 = wings fully up, 0 = level, -1 = wings down
function drawBirdGrid(t, flap) {
  const PAD = 1;
  const g = makeGrid(t.w + PAD * 2, t.h + PAD * 2);
  const W = t.w, H = t.h;
  const ox = PAD, oy = PAD;
  const cx = ox + W * 0.5, cy = oy + H * 0.55;
  const rx = W * 0.3, ry = Math.max(2, H * 0.2);

  // wing: swings from straight up (flap=1) to down-and-back (flap<0)
  const L = Math.max(H * 0.5, W * 0.32);
  const sx = cx + rx * 0.1, sy = cy - ry * 0.3;
  const ang = ((25 + (1 - flap) * 62) * Math.PI) / 180; // angle back from vertical-up
  const tipX = sx - L * Math.sin(ang);
  const tipY = sy - L * Math.cos(ang);
  const wingPts = [
    [sx - rx * 0.9, sy],
    [sx + rx * 0.7, sy + ry * 0.2],
    [tipX + 1.2, tipY - 0.4],
    [tipX - 1.2, tipY + 0.4],
  ];

  // tail
  const tailLen = W * 0.2;
  poly(g, [
    [cx - rx * 0.7, cy - ry * 0.5],
    [cx - rx - tailLen, cy - ry * 0.1],
    [cx - rx - tailLen, cy + ry * 0.8],
    [cx - rx * 0.6, cy + ry * 0.55],
  ], t.tail);

  // body + belly
  ellipse(g, cx, cy, rx, ry, t.body);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (g.px[y * g.w + x] === t.body && y + 0.5 > cy + ry * 0.25) put(g, x, y, t.belly);

  // wing over body
  poly(g, wingPts, t.wing);
  // wing tip shade
  const shade = [
    [tipX + 1.2, tipY - 0.4],
    [tipX - 1.2, tipY + 0.4],
    [(tipX * 2 + sx) / 3, (tipY * 2 + sy) / 3],
  ];
  poly(g, shade, t.wingTip);

  // head + beak + eye
  const hr = Math.max(1.6, ry * 0.95);
  const hx = cx + rx * 0.95, hy = cy - ry * 0.55;
  ellipse(g, hx, hy, hr, hr, t.head);
  if (t.ring) {
    // vulture-style pale neck ring
    for (let x = Math.floor(hx - hr - 1); x <= Math.floor(hx - hr + 0.5); x++)
      for (let y = Math.floor(hy); y <= Math.floor(hy + hr * 0.8); y++) put(g, x, y, t.ring);
  }
  const bl = Math.max(2, Math.round(W * 0.12));
  const bx = Math.floor(hx + hr * 0.6);
  for (let i = 0; i < bl; i++) {
    put(g, bx + i, Math.floor(hy) + (i > bl - 2 && bl > 3 ? 1 : 0), t.beak);
    if (i < bl - 1) put(g, bx + i, Math.floor(hy) + 1, t.beak);
  }
  put(g, Math.floor(hx + hr * 0.2), Math.floor(hy - hr * 0.2), "#ffffff");

  // outline
  const out = g.px.slice();
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (g.px[y * g.w + x]) continue;
      const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < g.w && yy < g.h && g.px[yy * g.w + xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y * g.w + x] = OUTLINE;
    }
  g.px = out;
  return g;
}

function gridToCanvas(g, tint) {
  const c = document.createElement("canvas");
  c.width = g.w; c.height = g.h;
  const ctx = c.getContext("2d");
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const col = g.px[y * g.w + x];
      if (!col) continue;
      ctx.fillStyle = tint && col !== OUTLINE ? tint : col;
      ctx.fillRect(x, y, 1, 1);
    }
  return c;
}

const cache = {};
const FLAPS = [1, 0.3, -1, 0.3]; // wing cycle: up, mid, down, mid

export function getSprite(typeName, frame, white = false) {
  const key = `${typeName}:${frame}:${white ? 1 : 0}`;
  if (!cache[key]) {
    const t = BIRD_TYPES[typeName];
    cache[key] = gridToCanvas(drawBirdGrid(t, FLAPS[frame % FLAPS.length]), white ? "#ffffff" : null);
  }
  return cache[key];
}

export function spriteSize(typeName) {
  const t = BIRD_TYPES[typeName];
  return { w: t.w + 2, h: t.h + 2 };
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
