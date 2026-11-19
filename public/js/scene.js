// The desert town backdrop, drawn at 320x180 and scaled up with crisp pixels.
import { drawText } from "./sprites.js";

export const W = 320;
export const H = 180;
export const HORIZON = 120;

const SKY = [
  [0, "#12082b"], [12, "#1c0c3f"], [26, "#2b1155"], [40, "#45206e"], [54, "#6b2a7e"],
  [66, "#9a3280"], [78, "#c43f78"], [88, "#e2536a"], [98, "#f2704f"], [106, "#f98f3f"], [113, "#fcb54a"],
];

function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rect(ctx, c, x, y, w, h) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

function mesa(ctx, color, x, base, w, h, step) {
  // stepped, flat-topped rock formation
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const inset = i === 0 ? 0 : Math.round((i * step) / 2);
    const lh = Math.round(h / layers);
    rect(ctx, color, x + inset, base - lh * (i + 1), w - inset * 2 - (i % 2) * 2, lh + 1);
  }
}

function saguaro(ctx, x, base, h, dark, light) {
  const trunkW = 5;
  rect(ctx, dark, x, base - h, trunkW, h);
  rect(ctx, light, x + 1, base - h + 1, 1, h - 2);
  // arms
  const armY = base - Math.round(h * 0.62);
  rect(ctx, dark, x - 6, armY, 7, 4);
  rect(ctx, dark, x - 6, armY - 9, 4, 10);
  rect(ctx, light, x - 5, armY - 8, 1, 8);
  const armY2 = base - Math.round(h * 0.45);
  rect(ctx, dark, x + trunkW - 1, armY2, 7, 4);
  rect(ctx, dark, x + trunkW + 2, armY2 - 8, 4, 9);
  rect(ctx, light, x + trunkW + 3, armY2 - 7, 1, 7);
  // rounded top
  rect(ctx, "#12082b", x, base - h, 1, 1);
  rect(ctx, "#12082b", x + trunkW - 1, base - h, 1, 1);
}

function saloon(ctx, x, base) {
  const wood = "#8a4f2a", woodD = "#5e3418", woodL = "#b06a38", roof = "#3f2012";
  const w = 76;
  // false front
  rect(ctx, woodD, x + 6, base - 58, w - 12, 20);
  rect(ctx, wood, x + 7, base - 57, w - 14, 18);
  for (let i = 0; i < 6; i++) rect(ctx, woodD, x + 12 + i * 11, base - 57, 1, 18);
  // sign
  rect(ctx, "#2a150a", x + 14, base - 54, w - 28, 12);
  rect(ctx, "#f9c55b", x + 15, base - 53, w - 30, 10);
  drawText(ctx, "SALOON", x + 22, base - 51, "#6b1f1f", "#f2a03a");
  // top trim
  rect(ctx, roof, x + 4, base - 61, w - 8, 3);
  // main building
  rect(ctx, woodD, x, base - 38, w, 38);
  rect(ctx, wood, x + 1, base - 37, w - 2, 36);
  for (let i = 0; i < w - 2; i += 6) rect(ctx, woodL, x + 2 + i, base - 36, 1, 34);
  // porch roof
  rect(ctx, roof, x - 4, base - 40, w + 8, 4);
  rect(ctx, "#5e3418", x - 4, base - 36, w + 8, 1);
  // windows
  for (const wx of [x + 8, x + w - 22]) {
    rect(ctx, "#2a150a", wx, base - 30, 14, 14);
    rect(ctx, "#fcc35a", wx + 1, base - 29, 12, 12);
    rect(ctx, "#2a150a", wx + 6, base - 29, 2, 12);
    rect(ctx, "#2a150a", wx + 1, base - 24, 12, 1);
  }
  // swinging doors
  rect(ctx, "#2a150a", x + w / 2 - 9, base - 28, 18, 28);
  rect(ctx, "#a35a2a", x + w / 2 - 8, base - 22, 7, 14);
  rect(ctx, "#a35a2a", x + w / 2 + 1, base - 22, 7, 14);
  rect(ctx, "#fcc35a", x + w / 2 - 8, base - 27, 16, 5);
  // porch posts
  rect(ctx, woodD, x - 2, base - 36, 3, 36);
  rect(ctx, woodD, x + w - 1, base - 36, 3, 36);
}

function fence(ctx, x0, x1, base) {
  for (let x = x0; x < x1; x += 14) {
    rect(ctx, "#5e3418", x, base - 11, 3, 11);
    rect(ctx, "#8a4f2a", x, base - 11, 1, 11);
  }
  rect(ctx, "#6e4020", x0, base - 9, x1 - x0, 2);
  rect(ctx, "#6e4020", x0, base - 4, x1 - x0, 2);
}

function barrel(ctx, x, base) {
  rect(ctx, "#6b3a1c", x, base - 12, 10, 12);
  rect(ctx, "#8a4f2a", x + 1, base - 11, 2, 10);
  rect(ctx, "#2a150a", x, base - 9, 10, 1);
  rect(ctx, "#2a150a", x, base - 4, 10, 1);
}

function telegraph(ctx, x, base) {
  rect(ctx, "#3f2012", x, base - 50, 2, 50);
  rect(ctx, "#3f2012", x - 7, base - 48, 16, 2);
  rect(ctx, "#3f2012", x - 5, base - 43, 12, 2);
}

let bgCache = null;

export function getBackground() {
  if (bgCache) return bgCache;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const r = rnd(1985);

  // sky with dithered band edges
  for (let i = 0; i < SKY.length; i++) {
    const y0 = SKY[i][0];
    const y1 = i + 1 < SKY.length ? SKY[i + 1][0] : HORIZON;
    rect(ctx, SKY[i][1], 0, y0, W, y1 - y0);
    if (i + 1 < SKY.length) {
      for (let y = y1 - 3; y < y1; y++)
        for (let x = (y % 2) * 1; x < W; x += 2) rect(ctx, SKY[i + 1][1], x, y, 1, 1);
    }
  }
  // stars
  for (let i = 0; i < 46; i++) rect(ctx, "#ffe9b8", r() * W, r() * 42, 1, 1);

  // retro sun with horizontal slits
  const sx = 226, sy = 112, sr = 34;
  for (let y = -sr; y <= 0; y++) {
    const half = Math.floor(Math.sqrt(sr * sr - y * y));
    const yy = sy + y;
    // slits grow towards the horizon
    const fromBottom = -y;
    const slit = fromBottom < 26 && ((fromBottom % 7) < Math.floor((26 - fromBottom) / 6) + 0);
    if (slit && fromBottom < 24) continue;
    const t = (sy - yy) / sr;
    const col = t > 0.7 ? "#fff0a8" : t > 0.4 ? "#ffd75a" : t > 0.18 ? "#ffb347" : "#ff8a3d";
    rect(ctx, col, sx - half, yy, half * 2, 1);
  }

  // distant mesas then nearer mesas
  mesa(ctx, "#6a2a74", 8, HORIZON, 78, 34, 8);
  mesa(ctx, "#6a2a74", 118, HORIZON, 62, 24, 6);
  mesa(ctx, "#6a2a74", 262, HORIZON, 70, 38, 8);
  mesa(ctx, "#4a1c5c", 70, HORIZON + 2, 56, 20, 6);
  mesa(ctx, "#4a1c5c", 132, HORIZON + 2, 60, 24, 8);
  mesa(ctx, "#4a1c5c", -10, HORIZON + 2, 42, 18, 6);

  // ground, banded like old arcade art
  const GROUND = ["#e6a45a", "#dd9650", "#d28a48", "#c77e40", "#bb7239", "#ad6733", "#9f5c2d"];
  const gh = H - HORIZON;
  for (let i = 0; i < GROUND.length; i++) {
    rect(ctx, GROUND[i], 0, HORIZON + Math.floor((gh * i) / GROUND.length), W, Math.ceil(gh / GROUND.length) + 1);
  }
  rect(ctx, "#f4c27a", 0, HORIZON, W, 1);
  // sand speckles
  for (let i = 0; i < 160; i++) {
    const x = r() * W, y = HORIZON + 4 + r() * (gh - 6);
    rect(ctx, r() > 0.5 ? "#f0b66e" : "#8e5228", x, y, r() > 0.7 ? 2 : 1, 1);
  }
  // dirt road
  for (let i = 0; i < 26; i++) {
    const y = HORIZON + 10 + i * 2;
    const w = 40 + i * 9;
    rect(ctx, "#c98b4c", W / 2 - w / 2 + 20, y, w, 2);
  }

  // town and scenery
  telegraph(ctx, 112, HORIZON + 24);
  saloon(ctx, 18, HORIZON + 34);
  fence(ctx, 96, 150, HORIZON + 44);
  barrel(ctx, 100, HORIZON + 34);
  barrel(ctx, 112, HORIZON + 34);
  saguaro(ctx, 262, HORIZON + 52, 44, "#2f6b3a", "#4f9a55");
  saguaro(ctx, 298, HORIZON + 46, 30, "#2f6b3a", "#4f9a55");
  saguaro(ctx, 214, HORIZON + 30, 20, "#3a7a45", "#5aa862");
  // rocks
  for (const [rx, ry, rw] of [[170, 168, 9], [60, 172, 7], [232, 170, 6]]) {
    rect(ctx, "#6a4a38", rx, ry, rw, 4);
    rect(ctx, "#8a6650", rx + 1, ry - 1, rw - 2, 2);
  }
  bgCache = c;
  return c;
}

const clouds = [
  { x: 20, y: 20, w: 30 }, { x: 150, y: 34, w: 40 }, { x: 260, y: 14, w: 26 }, { x: 90, y: 52, w: 22 },
];

export function drawScene(ctx, t, opts = {}) {
  ctx.drawImage(getBackground(), 0, 0);
  // twinkle
  const r = rnd(7);
  for (let i = 0; i < 10; i++) {
    const x = r() * W, y = r() * 40;
    if (Math.sin(t * 2 + i * 1.7) > 0.4) rect(ctx, "#ffffff", x, y, 1, 1);
  }
  // drifting pixel clouds
  for (const cl of clouds) {
    const x = ((cl.x + t * (4 + cl.w * 0.15)) % (W + 80)) - 40;
    rect(ctx, "rgba(255,170,200,0.55)", x, cl.y, cl.w, 3);
    rect(ctx, "rgba(255,170,200,0.55)", x + 4, cl.y - 2, cl.w - 12, 2);
    rect(ctx, "rgba(255,230,200,0.5)", x + 6, cl.y + 1, cl.w - 16, 1);
  }
  // tumbleweed rolling along the dirt
  if (opts.tumbleweed !== false) {
    const tx = ((t * 24) % (W + 40)) - 20;
    const ty = 168 + Math.sin(t * 6) * 0.5;
    const spin = Math.floor(t * 8) % 2;
    rect(ctx, "#8a5a2a", tx, ty - 6, 8, 7);
    rect(ctx, "#b98340", tx + 1, ty - 5, 6, 5);
    rect(ctx, "#6a3f1c", tx + 3 + spin, ty - 6, 1, 7);
    rect(ctx, "#6a3f1c", tx, ty - 3 + spin, 8, 1);
  }
}
