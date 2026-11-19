// Gun catalog: shared by the game (browser) and the server (Worker),
// so prices and stats can never disagree. Pure data + tiny helpers only.

export const MAX_LEVEL = 5;

export const SKINS = {
  classic: { name: "Classic", price: 0, wood: "#6b3a1c", woodHi: "#8a4f2a", metal: "#5a5f6b", metalHi: "#9aa0ad", accent: "#d9a441", glow: null },
  midnight: { name: "Midnight", price: 250, wood: "#232650", woodHi: "#454a8a", metal: "#1d1f2c", metalHi: "#6a70a8", accent: "#35d0c0", glow: null },
  gilded: { name: "Gilded", price: 600, wood: "#7a1f2a", woodHi: "#b8404e", metal: "#b8841e", metalHi: "#ffe27a", accent: "#fff4c2", glow: null },
  neon: { name: "Neon 85", price: 450, wood: "#3a1457", woodHi: "#c8317e", metal: "#1b0f3a", metalHi: "#35d0c0", accent: "#ffd75a", glow: "#ff4fd8" },
};
export const SKIN_ORDER = ["classic", "midnight", "gilded", "neon"];

// base stats at level 1
//  dmg: hit points removed per hit         cooldown: seconds between shots
//  startAmmo / maxAmmo                     pad: how forgiving the aim is (hit area, px)
//  multi: one shot hits every bird in range luck: multiplier on supply-drop size
//  scoreMult: bonus on points              killAmmoChance: chance of a free bullet per kill
export const GUNS = {
  rifle: {
    name: "Old Reliable", type: "Rifle", price: 0, upCost: 150,
    perk: "Balanced and dependable. Every cowboy starts here.",
    base: { dmg: 1, cooldown: 0.28, startAmmo: 12, maxAmmo: 20, pad: 3, multi: false, luck: 1, scoreMult: 1, killAmmoChance: 0, reloadAmmo: 5 },
  },
  revolver: {
    name: "Peacemaker", type: "Revolver", price: 500, upCost: 160,
    perk: "QUICK DRAW: the fastest trigger in town, but a small cylinder.",
    base: { dmg: 1, cooldown: 0.16, startAmmo: 9, maxAmmo: 15, pad: 2, multi: false, luck: 0.9, scoreMult: 1, killAmmoChance: 0, reloadAmmo: 4 },
  },
  lever: {
    name: "Widowmaker", type: "Lever-Action", price: 900, upCost: 270,
    perk: "HOT STREAK: quick lever action and +10% points on every kill.",
    base: { dmg: 1, cooldown: 0.2, startAmmo: 10, maxAmmo: 18, pad: 3, multi: false, luck: 1, scoreMult: 1.1, killAmmoChance: 0, reloadAmmo: 5 },
  },
  shotgun: {
    name: "Thunder Twin", type: "Shotgun", price: 1400, upCost: 420,
    perk: "SCATTERGUN: one blast hits EVERY bird in a wide area. Slow reload between shots.",
    base: { dmg: 1, cooldown: 0.5, startAmmo: 8, maxAmmo: 14, pad: 9, multi: true, luck: 1, scoreMult: 1, killAmmoChance: 0, reloadAmmo: 4 },
  },
  sniper: {
    name: "Long Tom", type: "Sharpshooter", price: 2000, upCost: 600,
    perk: "ONE SHOT: triple damage (drops a Big Buzzard in one hit) and +30% points. Tiny hit area.",
    base: { dmg: 3, cooldown: 0.6, startAmmo: 8, maxAmmo: 14, pad: 0.5, multi: false, luck: 1, scoreMult: 1.3, killAmmoChance: 0, reloadAmmo: 3 },
  },
  carbine: {
    name: "Lucky Clover", type: "Carbine", price: 3000, upCost: 900,
    perk: "LUCKY CHARM: much bigger supply drops and a 20% chance of a free bullet on every kill.",
    base: { dmg: 1, cooldown: 0.3, startAmmo: 12, maxAmmo: 22, pad: 3, multi: false, luck: 1.5, scoreMult: 1, killAmmoChance: 0.2, reloadAmmo: 6 },
  },
};
export const GUN_ORDER = ["rifle", "revolver", "lever", "shotgun", "sniper", "carbine"];

// Each upgrade level makes the gun a bit better all round.
export function gunStats(id, level = 1) {
  const b = GUNS[id].base;
  const f = Math.max(0, Math.min(MAX_LEVEL, level) - 1);
  return {
    ...b,
    cooldown: +(b.cooldown * (1 - 0.05 * f)).toFixed(3),
    startAmmo: b.startAmmo + f,
    maxAmmo: b.maxAmmo + 2 * f,
    pad: b.pad + 0.5 * f,
    scoreMult: +(b.scoreMult + 0.05 * f).toFixed(3),
    luck: +(b.luck + 0.05 * f).toFixed(3),
  };
}

export const upgradeCost = (id, level) => (level >= MAX_LEVEL ? null : GUNS[id].upCost * level);

// 0..10 bars for the shop/armory screens
const clamp = (v) => Math.max(0, Math.min(10, v));
export function statBars(s) {
  return [
    ["DAMAGE", clamp(s.dmg * 3.3)],
    ["FIRE RATE", clamp(((0.7 - s.cooldown) / 0.55) * 10)],
    ["AMMO", clamp(s.startAmmo / 2)],
    ["AIM AREA", clamp(s.pad * 1.1)],
    ["LUCK", clamp((s.luck - 0.7) * 8 + s.killAmmoChance * 10)],
    ["BONUS PTS", clamp((s.scoreMult - 0.8) * 16)],
  ];
}

// Coins: earned by playing. The server uses the same formulas.
export const singleCoins = (score) => Math.floor(Math.max(0, score) / 10);
export function duelCoins(result, score) {
  const base = result === "win" ? 150 : result === "draw" ? 75 : 50;
  return base + Math.floor(Math.max(0, score) / 20);
}
