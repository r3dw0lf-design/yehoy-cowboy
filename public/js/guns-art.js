// Pixel-art guns drawn in code. Every gun is drawn pointing RIGHT (+x) from the
// origin, so the game can rotate it to follow the crosshair. Skins just swap the palette.
import { SKINS } from "./guns.js";

const INK = "#150a05";

// x0/x1 = extent (used to centre previews), muzzle = where the flash and smoke come out
export const GUN_ART = {
  rifle: { x0: -16, x1: 47, muzzle: 49 },
  revolver: { x0: -13, x1: 39, muzzle: 41 },
  lever: { x0: -16, x1: 57, muzzle: 59 },
  shotgun: { x0: -18, x1: 44, muzzle: 46 },
  sniper: { x0: -18, x1: 69, muzzle: 71 },
  carbine: { x0: -14, x1: 42, muzzle: 44 },
};

const DESIGNS = {
  // Old Reliable: classic wooden rifle
  rifle(R, P) {
    R(INK, -16, -5, 24, 10); R(P.wood, -15, -4, 22, 8); R(P.woodHi, -15, -4, 22, 2);
    R(INK, 6, -4, 41, 8); R(P.metal, 7, -2, 39, 4); R(P.metalHi, 7, -2, 39, 1);
    R(P.woodHi, 7, 1, 14, 2); R(P.accent, 20, -3, 2, 1); R(P.accent, 9, 2, 3, 3);
    R(P.accent, 44, -3, 2, 1); // front sight
  },

  // Peacemaker: six-shooter with a big cylinder and a pistol grip
  revolver(R, P) {
    R(INK, -12, 0, 9, 13); R(P.wood, -11, 1, 7, 11); R(P.woodHi, -11, 1, 2, 11); // grip
    R(INK, -5, -6, 16, 11); R(P.metal, -4, -5, 14, 8); R(P.metalHi, -4, -5, 14, 1); // frame
    R(INK, -7, -8, 4, 4); R(P.metalHi, -6, -7, 2, 2); // hammer
    R(INK, 8, -7, 11, 13); R(P.metalHi, 9, -6, 9, 11); // cylinder
    R(INK, 11, -4, 2, 2); R(INK, 14, -4, 2, 2); R(INK, 11, 0, 2, 2); R(INK, 14, 0, 2, 2); // chambers
    R(INK, 18, -5, 22, 7); R(P.metal, 19, -4, 20, 4); R(P.metalHi, 19, -4, 20, 1); // barrel
    R(P.accent, 37, -6, 2, 2); R(P.accent, -2, 4, 6, 2); // sight + trigger guard
  },

  // Widowmaker: brass receiver, tube magazine, big lever loop
  lever(R, P) {
    R(INK, -16, -5, 22, 10); R(P.wood, -15, -4, 20, 8); R(P.woodHi, -15, -4, 20, 2);
    R(INK, 4, -5, 14, 10); R(P.accent, 5, -4, 12, 8); R(P.metalHi, 5, -4, 12, 1); // brass receiver
    R(INK, 16, -4, 42, 7); R(P.metal, 17, -3, 40, 4); R(P.metalHi, 17, -3, 40, 1); // barrel
    R(INK, 18, 2, 32, 5); R(P.metal, 19, 3, 30, 3); R(P.woodHi, 19, 3, 14, 2); // magazine + forend
    R(INK, 6, 4, 13, 10); R(P.accent, 7, 5, 11, 8); R(INK, 9, 7, 6, 4); // lever loop
    R(P.accent, 55, -3, 2, 1);
  },

  // Thunder Twin: fat double barrel
  shotgun(R, P) {
    R(INK, -18, -6, 18, 13); R(P.wood, -17, -5, 16, 11); R(P.woodHi, -17, -5, 16, 2); // stock
    R(INK, -2, -6, 12, 12); R(P.metal, -1, -5, 10, 10); R(P.metalHi, -1, -5, 10, 1); // receiver
    R(INK, 8, -6, 37, 13);
    R(P.metal, 9, -5, 35, 4); R(P.metalHi, 9, -5, 35, 1); // upper barrel
    R(P.metal, 9, 1, 35, 4); R(P.metalHi, 9, 1, 35, 1); // lower barrel
    R(INK, 9, -1, 35, 2);
    R(P.accent, 24, -5, 2, 10); R(P.accent, 38, -5, 2, 10); // brass bands
    R(P.woodHi, 12, 5, 11, 2);
    R(INK, -4, -10, 5, 5); R(P.metalHi, -3, -9, 3, 3); // hammers
  },

  // Long Tom: long barrel, scope on top, muzzle brake
  sniper(R, P) {
    R(INK, -18, -5, 20, 11); R(P.wood, -17, -4, 18, 9); R(P.woodHi, -17, -4, 18, 2); // stock
    R(INK, 2, -4, 16, 8); R(P.metal, 3, -3, 14, 6); R(P.metalHi, 3, -3, 14, 1); // action
    R(INK, 16, -3, 53, 6); R(P.metal, 17, -2, 51, 4); R(P.metalHi, 17, -2, 51, 1); // long barrel
    R(INK, 65, -5, 5, 10); R(P.metalHi, 66, -4, 3, 8); R(INK, 67, -4, 1, 8); // muzzle brake
    R(INK, 14, -6, 3, 3); R(INK, 28, -6, 3, 3); // scope mounts
    R(INK, 8, -12, 28, 7); R(P.metal, 9, -11, 26, 5); R(P.metalHi, 9, -11, 26, 1); // scope
    R(P.accent, 9, -11, 2, 5); R(P.accent, 33, -11, 2, 5); // scope rings
    R(P.metal, 42, 3, 2, 7); // bipod leg
  },

  // Lucky Clover: short gold-trimmed carbine with a four-leaf clover on the stock
  carbine(R, P) {
    R(INK, -14, -5, 20, 10); R(P.wood, -13, -4, 18, 8); R(P.woodHi, -13, -4, 18, 2);
    const g = "#4fe08a";
    R(g, -9, -2, 2, 2); R(g, -6, -2, 2, 2); R(g, -9, 1, 2, 2); R(g, -6, 1, 2, 2); R(P.accent, -8, 0, 1, 1); // clover
    R(INK, 4, -4, 39, 8); R(P.metal, 5, -3, 37, 5); R(P.metalHi, 5, -3, 37, 1);
    R(P.accent, 14, -4, 3, 8); R(P.accent, 30, -4, 2, 8); // gold bands
    R(g, 8, -2, 2, 2); // gem
    R(P.woodHi, 18, 1, 12, 3);
    R(INK, 6, 4, 9, 6); R(P.accent, 7, 5, 7, 4); R(INK, 9, 6, 3, 2); // lever loop
  },
};

export function drawGun(ctx, id, skinId, opts = {}) {
  const P = SKINS[skinId] || SKINS.classic;
  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  ctx.save();
  if (P.glow) { ctx.shadowColor = P.glow; ctx.shadowBlur = 6; }
  (DESIGNS[id] || DESIGNS.rifle)(R, P);
  ctx.restore();
  if (opts.flash) {
    const m = GUN_ART[id].muzzle;
    R("#fff7c2", m - 2, -3, 6, 6); R("#ffb347", m + 4, -2, 4, 4); R("#ff6a2a", m + 8, -1, 3, 2);
  }
}

// small picture of a gun for the shop / armory cards
export function previewGun(canvas, id, skinId) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const a = GUN_ART[id];
  ctx.save();
  ctx.translate(Math.round(canvas.width / 2 - (a.x0 + a.x1) / 2), Math.round(canvas.height / 2));
  drawGun(ctx, id, skinId);
  ctx.restore();
}
