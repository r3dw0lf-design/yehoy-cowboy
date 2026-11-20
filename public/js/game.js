// The bird-shooting game. One engine for single player and duels.
// Birds move as a pure function of time, so in a duel both players see the
// exact same birds at the exact same moment (same seed + synced clock).
import { W, H, HORIZON } from "./scene.js";
import { drawBackdropGame } from "./backdrop.js";
import { BIRD_TYPES, getSprite, spriteSize, drawText, textWidth } from "./sprites.js";
import { sfx } from "./sfx.js";
import { gunStats } from "./guns.js";
import { drawGun, GUN_ART } from "./guns-art.js";

export function mulberry32(a) {
  a = a >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DUEL_RELOAD_TIME = 2;
const KILLS_PER_LEVEL = 5; // single player
const SECONDS_PER_LEVEL = 12; // duel

export const pointsMult = (level) => 1 + 0.15 * (level - 1);
const comboMult = (streak) => Math.min(5, 1 + Math.floor(streak / 3));

function pickType(rng, level) {
  const list = [];
  let total = 0;
  for (const [name, t] of Object.entries(BIRD_TYPES)) {
    if (level < t.minLevel) continue;
    let w = t.weight;
    if (t.big && !t.boss) w += level * 0.15; // bigger birds show up more as you go
    if (t.boss) w += level * 0.35;
    list.push([name, w]);
    total += w;
  }
  let r = rng() * total;
  for (const [name, w] of list) {
    r -= w;
    if (r <= 0) return name;
  }
  return list[0][0];
}

let birdSeq = 0;
function makeBird(rng, level, spawnT) {
  const type = pickType(rng, level);
  const spec = BIRD_TYPES[type];
  const { w, h } = spriteSize(type);
  const lerp = (r) => r[0] + (r[1] - r[0]) * rng();
  const speed = lerp(spec.speed) * Math.min(2.2, 1 + 0.07 * (level - 1));
  const amp = lerp(spec.amp);
  const top = 12;
  const bottom = HORIZON - 26 - h;
  return {
    id: ++birdSeq,
    type,
    spawnT,
    dir: rng() < 0.5 ? 1 : -1,
    speed,
    baseY: top + amp + rng() * Math.max(10, bottom - top - amp * 2),
    amp,
    freq: lerp(spec.freq),
    phase: rng() * Math.PI * 2,
    hp: spec.hp,
    maxHp: spec.hp,
    w,
    h,
    flashUntil: 0,
  };
}

const spawnGap = (level, rng) => Math.max(0.5, 1.7 - 0.1 * level) * (0.7 + 0.6 * rng());

export function buildSchedule(seed, duration) {
  const rng = mulberry32(seed);
  const out = [];
  let t = 0.6;
  while (t < duration + 2) {
    const level = 1 + Math.floor(t / SECONDS_PER_LEVEL);
    out.push(makeBird(rng, level, t));
    t += spawnGap(level, rng) * 0.85;
  }
  return out;
}

export function birdPos(b, t) {
  const a = t - b.spawnT;
  return {
    x: b.dir > 0 ? -b.w + b.speed * a : W + b.w - b.speed * a - b.w,
    y: b.baseY + b.amp * Math.sin(a * b.freq * 2 + b.phase),
  };
}
const birdGone = (b, t) => (t - b.spawnT) * b.speed > W + b.w * 2 + 4;

export class Game {
  /**
   * opts: { mode: 'single'|'duel', seed, duration, getClock, onHud, onBanner, onEnd, onPause }
   */
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.o = opts;
    this.mode = opts.mode;
    this.score = 0;
    this.kills = 0;
    this.streak = 0;
    this.gun = opts.gun || { id: "rifle", skin: "classic", stats: gunStats("rifle", 1) };
    this.gs = this.gun.stats; // damage, fire rate, ammo, spread... come from the equipped gun
    this.ammo = this.gs.startAmmo;
    this.level = 1;
    this.t = 0;
    this.birds = [];
    this.falling = [];
    this.particles = [];
    this.popups = [];
    this.cooldown = 0;
    this.recoil = 0;
    this.flash = 0;
    this.over = false;
    this.paused = false;
    this.reloadUntil = 0;
    this.endAt = 0;
    this.pointer = { x: W / 2, y: 50 };
    this.hudSig = "";
    this.animT = 0;
    this.shots = 0;
    this.hits = 0;
    this.bestStreak = 0;
    this.shake = 0;

    if (this.mode === "duel") {
      this.schedule = buildSchedule(opts.seed, opts.duration);
      this.schedIdx = 0;
      this.rng = mulberry32((opts.seed ^ 0x5bd1e995) >>> 0);
    } else {
      this.rng = Math.random;
      this.nextSpawnT = 0.4;
    }
    this.refillNeed = this.rollNeed();
    this.refillAmt = this.rollAmt();

    this._onMove = (e) => this.setPointer(e);
    this._onDown = (e) => {
      this.setPointer(e);
      if (this.paused) {
        this.setPaused(false);
        return;
      }
      this.shoot(this.pointer.x, this.pointer.y);
    };
    this._onKey = (e) => {
      if (this.mode === "single" && (e.key === "p" || e.key === "P" || e.key === "Escape")) this.setPaused(!this.paused);
    };
    this._onVis = () => {
      if (document.hidden && this.mode === "single" && !this.over) this.setPaused(true);
    };
    canvas.addEventListener("pointermove", this._onMove);
    canvas.addEventListener("pointerdown", this._onDown);
    window.addEventListener("keydown", this._onKey);
    document.addEventListener("visibilitychange", this._onVis);

    this.last = performance.now();
    this._raf = requestAnimationFrame((n) => this.frame(n));
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this.canvas.removeEventListener("pointermove", this._onMove);
    this.canvas.removeEventListener("pointerdown", this._onDown);
    window.removeEventListener("keydown", this._onKey);
    document.removeEventListener("visibilitychange", this._onVis);
    this.dead = true;
  }

  rollNeed() { return 2 + Math.floor(this.rng() * 3); } // 2..4 kills until a supply drop
  rollAmt() { return 3 + Math.floor(this.rng() * 3); } // 3..5 bullets

  setPaused(p) {
    if (this.over || this.mode !== "single") return;
    this.paused = p;
    this.last = performance.now();
    this.o.onPause && this.o.onPause(p);
  }

  setPointer(e) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.x = Math.max(0, Math.min(W - 1, ((e.clientX - r.left) / r.width) * W));
    this.pointer.y = Math.max(0, Math.min(H - 1, ((e.clientY - r.top) / r.height) * H));
  }

  get clock() { return this.t; }
  get reloading() { return this.mode === "duel" && this.t < this.reloadUntil; }
  get currentLevel() {
    return this.mode === "single"
      ? 1 + Math.floor(this.kills / KILLS_PER_LEVEL)
      : 1 + Math.floor(Math.max(0, this.t) / SECONDS_PER_LEVEL);
  }

  frame(now) {
    if (this.dead) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) {
      if (this.mode === "duel") this.t = this.o.getClock();
      else if (!this.over) this.t += dt;
      this.animT += dt;
      this.update(dt);
    }
    this.render();
    this.emitHud();
    this._raf = requestAnimationFrame((n) => this.frame(n));
  }

  update(dt) {
    const t = this.t;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.flash = Math.max(0, this.flash - dt);
    this.shake = Math.max(0, this.shake - dt * 8);

    if (!this.over && t >= 0) {
      // level changes
      const lvl = this.currentLevel;
      if (lvl > this.level) {
        this.level = lvl;
        sfx.level();
        const t2 = Object.entries(BIRD_TYPES).find(([, s]) => s.minLevel === lvl);
        this.o.onBanner && this.o.onBanner(`LEVEL ${lvl}`, t2 ? `${t2[1].label.toUpperCase()}S INCOMING` : "FASTER BIRDS", "level");
      }

      // spawning
      if (this.mode === "single") {
        const cap = Math.min(9, 3 + Math.floor(this.level / 2));
        if (t >= this.nextSpawnT && this.birds.length < cap) {
          this.birds.push(makeBird(this.rng, this.level, t));
          this.nextSpawnT = t + spawnGap(this.level, this.rng);
        }
      } else {
        while (this.schedIdx < this.schedule.length && this.schedule[this.schedIdx].spawnT <= t) {
          const b = { ...this.schedule[this.schedIdx++] };
          if (!birdGone(b, t)) this.birds.push(b);
        }
      }

      // duel reload finished
      if (this.mode === "duel" && this.reloadUntil && t >= this.reloadUntil) {
        this.reloadUntil = 0;
        this.ammo = this.gs.reloadAmmo;
        sfx.lever();
      }

      // single-player: out of bullets and nothing refilled = game over
      if (this.mode === "single" && this.endAt && t >= this.endAt) this.finish();
      if (this.mode === "duel" && t >= this.o.duration) this.finish();
    }
    this.birds = this.birds.filter((b) => !birdGone(b, t));

    for (const f of this.falling) {
      f.vy += 260 * dt;
      f.y += f.vy * dt;
      f.x += f.vx * dt;
      f.spin += dt * 9;
    }
    this.falling = this.falling.filter((f) => f.y < HORIZON + 50);
    for (const p of this.particles) {
      p.vy += (p.g === undefined ? 140 : p.g) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) {
      p.y -= 16 * dt;
      p.life -= dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  finish() {
    if (this.over) return;
    this.over = true;
    this.o.onEnd && this.o.onEnd({ score: this.score, kills: this.kills, level: this.level, shots: this.shots, hits: this.hits, bestStreak: this.bestStreak });
  }

  shoot(px, py) {
    if (this.over || this.paused || this.t < 0 || this.cooldown > 0 || this.reloading) return;
    if (this.ammo <= 0) {
      sfx.empty();
      return;
    }
    const t = this.t;
    const gs = this.gs;
    this.ammo--;
    this.cooldown = gs.cooldown;
    this.recoil = 1;
    this.flash = 0.08;
    sfx.shoot();
    setTimeout(() => sfx.lever(), 80);
    this.shots++;
    this.shake = gs.multi ? 1.8 : gs.dmg > 1 ? 1.5 : 1;
    this.muzzleEffects();

    // which birds did the shot hit? (shotguns hit everything in range, others the topmost bird)
    const pad = gs.pad;
    const targets = [];
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      const p = birdPos(b, t);
      if (px >= p.x - pad && px <= p.x + b.w + pad && py >= p.y - pad && py <= p.y + b.h + pad) {
        targets.push({ b, p });
        if (!gs.multi) break;
      }
    }
    if (gs.multi) this.burst(px, py, "#ffe9a0", 12, true);

    let refilled = false;
    if (targets.length) {
      this.hits++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const combo = comboMult(this.streak);
      for (const { b, p } of targets) {
        const spec = BIRD_TYPES[b.type];
        b.hp -= gs.dmg;
        if (b.hp > 0) {
          b.flashUntil = performance.now() + 120;
          sfx.hit();
          this.burst(px, py, spec.body, 4);
          continue;
        }
        this.kills++;
        const lvl = this.mode === "single" ? this.currentLevel : this.level;
        const pts = Math.round(spec.points * pointsMult(lvl) * combo * gs.scoreMult);
        this.score += pts;
        this.birds = this.birds.filter((x) => x !== b);
        this.falling.push({ type: b.type, x: p.x, y: p.y, vx: b.dir * 14, vy: -30, dir: b.dir, spin: 0, w: b.w, h: b.h });
        this.burst(p.x + b.w / 2, p.y + b.h / 2, spec.body, 10);
        this.burst(p.x + b.w / 2, p.y + b.h / 2, spec.belly, 5);
        this.popups.push({ text: `+${pts}`, x: p.x + b.w / 2 - textWidth(`+${pts}`) / 2, y: p.y - 4, life: 1.0, color: combo > 1 ? "#ffd75a" : "#ffffff" });
        if (combo > 1) this.popups.push({ text: `x${combo}`, x: p.x + b.w / 2 - 4, y: p.y - 12, life: 0.9, color: "#ff8ab0" });
        sfx.kill(combo);

        // supply drops: every few kills, random bullets (bigger with a lucky gun)
        this.refillNeed--;
        let gift = 0;
        if (this.refillNeed <= 0) {
          gift += Math.round(this.refillAmt * gs.luck);
          this.refillNeed = this.rollNeed();
          this.refillAmt = this.rollAmt();
        }
        if (spec.rare) gift += 3; // golden eagle always drops ammo
        if (gift > 0) {
          this.ammo = Math.min(gs.maxAmmo, this.ammo + gift);
          refilled = true;
          sfx.ammo();
          this.o.onBanner && this.o.onBanner(`+${gift} AMMO`, "SUPPLY DROP!", "ammo");
        }
        // lucky guns sometimes hand you a free bullet
        if (gs.killAmmoChance && Math.random() < gs.killAmmoChance && this.ammo < gs.maxAmmo) {
          this.ammo++;
          refilled = true;
          this.popups.push({ text: "+1", x: p.x + b.w / 2 + 8, y: p.y + 4, life: 0.8, color: "#9ff2a6" });
        }
      }
      const callout = { 3: ["NICE SHOT!", "3 IN A ROW"], 6: ["SHARPSHOOTER!", "6 IN A ROW"], 10: ["DEAD EYE!", "10 IN A ROW"], 15: ["LEGENDARY!", "15 IN A ROW"], 20: ["GUNSLINGER!", "20 IN A ROW"] }[this.streak];
      if (callout && this.o.onBanner) this.o.onBanner(callout[0], callout[1], "combo");
    } else {
      this.streak = 0;
      this.burst(px, py, "#f0c080", 3, true);
    }

    if (this.ammo <= 0 && !refilled) {
      if (this.mode === "single") {
        this.endAt = t + 0.9;
      } else {
        this.reloadUntil = t + DUEL_RELOAD_TIME;
        this.o.onBanner && this.o.onBanner("RELOADING", "OUT OF AMMO", "reload");
      }
    }
  }

  rifleAngle() {
    const px = W / 2, py = H + 4;
    const a = Math.atan2(this.pointer.y - py, this.pointer.x - px);
    return Math.max(-Math.PI + 0.25, Math.min(-0.25, a));
  }

  muzzleEffects() {
    const a = this.rifleAngle();
    const mz = GUN_ART[this.gun.id].muzzle;
    const tx = W / 2 + Math.cos(a) * mz, ty = H + 4 + Math.sin(a) * mz;
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x: tx + (Math.random() - 0.5) * 3, y: ty + (Math.random() - 0.5) * 3,
        vx: Math.cos(a) * (10 + Math.random() * 25) + (Math.random() - 0.5) * 14,
        vy: Math.sin(a) * (10 + Math.random() * 25) - 6, g: -8,
        life: 0.5 + Math.random() * 0.6, color: i % 2 ? "rgba(215,215,225,0.7)" : "rgba(150,150,165,0.6)", size: 2,
      });
    }
    // ejected brass casing
    this.particles.push({ x: W / 2 + 4, y: H - 14, vx: 28 + Math.random() * 22, vy: -55 - Math.random() * 20, life: 0.8, color: "#e0a82e", size: 2 });
  }

  burst(x, y, color, n, dust = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 10 + Math.random() * 40;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (dust ? 5 : 25),
        life: 0.4 + Math.random() * 0.5, color, size: dust ? 1 : Math.random() < 0.4 ? 2 : 1,
      });
    }
  }

  emitHud() {
    const timeLeft = this.mode === "duel" ? Math.max(0, Math.ceil(this.o.duration - this.t)) : null;
    const state = {
      score: this.score,
      ammo: this.ammo,
      level: this.level,
      streak: this.streak,
      mult: comboMult(this.streak),
      reloading: this.reloading,
      timeLeft,
      countdown: this.mode === "duel" && this.t < 0 ? Math.ceil(-this.t) : 0,
      draw: this.mode === "duel" && this.t >= 0 && this.t < 0.9,
    };
    const sig = JSON.stringify(state);
    if (sig !== this.hudSig) {
      this.hudSig = sig;
      this.o.onHud && this.o.onHud(state);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (this.shake > 0.05) ctx.translate(Math.round((Math.random() - 0.5) * 3 * this.shake), Math.round((Math.random() - 0.5) * 3 * this.shake));
    drawBackdropGame(ctx, this.animT, { dusk: Math.min(0.5, (this.level - 1) * 0.05) });
    const t = this.t;
    const nowMs = performance.now();

    for (const b of this.birds) {
      const spec = BIRD_TYPES[b.type];
      const p = birdPos(b, t);
      const frame = Math.floor((t - b.spawnT) * spec.flap) % 4;
      const spr = getSprite(b.type, Math.abs(frame), nowMs < b.flashUntil);
      const x = Math.round(p.x), y = Math.round(p.y);
      if (b.dir > 0) ctx.drawImage(spr, x, y);
      else {
        ctx.save();
        ctx.translate(x + spr.width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0);
        ctx.restore();
      }
      if (b.maxHp > 1) {
        ctx.fillStyle = "#150a05";
        ctx.fillRect(x + 2, y - 5, b.w - 2, 4);
        ctx.fillStyle = "#ff5a4a";
        ctx.fillRect(x + 3, y - 4, Math.round(((b.w - 4) * b.hp) / b.maxHp), 2);
      }
      if (spec.sparkle && Math.sin(this.animT * 12 + b.id) > 0.85) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(x + Math.floor(Math.random() * b.w), y + Math.floor(Math.random() * b.h), 1, 1);
      }
    }

    for (const f of this.falling) {
      const spr = getSprite(f.type, 2);
      ctx.save();
      ctx.translate(Math.round(f.x + f.w / 2), Math.round(f.y + f.h / 2));
      ctx.rotate((Math.floor(f.spin) * Math.PI) / 2 * f.dir * 0.5);
      ctx.scale(f.dir > 0 ? 1 : -1, -1);
      ctx.drawImage(spr, -Math.round(f.w / 2), -Math.round(f.h / 2));
      ctx.restore();
    }

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    for (const p of this.popups) drawText(ctx, p.text, Math.round(p.x), Math.round(p.y), p.color);

    this.drawRifle(ctx);
    ctx.restore();
    this.drawCrosshair(ctx);
  }

  drawRifle(ctx) {
    const px = W / 2, py = H + 4;
    const a = this.rifleAngle();
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.translate(-this.recoil * 4, 0);
    drawGun(ctx, this.gun.id, this.gun.skin, { flash: this.flash > 0 });
    ctx.restore();
  }

  drawCrosshair(ctx) {
    const { x, y } = this.pointer;
    const X = Math.round(x), Y = Math.round(y);
    const ready = this.cooldown <= 0 && this.ammo > 0 && !this.reloading && this.t >= 0;
    const c = ready ? "#ffffff" : "#ff7a6a";
    ctx.fillStyle = "#150a05";
    for (const [dx, dy, w, h] of [[-8, -1, 5, 3], [4, -1, 5, 3], [-1, -8, 3, 5], [-1, 4, 3, 5]]) ctx.fillRect(X + dx - 1, Y + dy - 1, w + 2, h + 2);
    ctx.fillStyle = c;
    for (const [dx, dy, w, h] of [[-8, 0, 5, 1], [4, 0, 5, 1], [0, -8, 1, 5], [0, 4, 1, 5]]) ctx.fillRect(X + dx, Y + dy, w, h);
    ctx.fillStyle = "#ff3b3b";
    ctx.fillRect(X, Y, 1, 1);
  }
}
