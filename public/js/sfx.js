// Background music + synthesized sound effects (no extra audio files needed).
const TRACKS = {
  menu: "/audio/menu.mp3",
  single: "/audio/single.mp3",
  duel: "/audio/duel.mp3",
};

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

let musicOn = store.get("ds_music", "1") === "1";
let sfxOn = store.get("ds_sfx", "1") === "1";
const MUSIC_VOL = 0.45;

const audios = {};
let current = null; // name of track that should be playing
let unlocked = false;
let ctx = null;
const listeners = new Set();

function getAudio(name) {
  if (!audios[name]) {
    const a = new Audio(TRACKS[name]);
    a.loop = true;
    a.preload = name === "menu" ? "auto" : "none";
    a.volume = 0;
    audios[name] = a;
  }
  return audios[name];
}

function fadeTo(a, target, ms, then) {
  const start = a.volume, t0 = performance.now();
  clearInterval(a._fade);
  a._fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = Math.max(0, Math.min(1, start + (target - start) * k));
    if (k >= 1) { clearInterval(a._fade); then && then(); }
  }, 40);
}

function apply() {
  for (const [name, a] of Object.entries(audios)) {
    if (name !== current || !musicOn) {
      if (!a.paused) fadeTo(a, 0, 500, () => a.pause());
    }
  }
  if (!current || !musicOn || !unlocked) return;
  const a = getAudio(current);
  if (a.paused) {
    a.play().then(() => fadeTo(a, MUSIC_VOL, 900)).catch(() => { unlocked = false; });
  } else {
    fadeTo(a, MUSIC_VOL, 600);
  }
}

export function playTrack(name) {
  current = name;
  apply();
}

function ensureCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Browsers only allow sound after a click/tap/key, so start on the first one.
function unlock() {
  ensureCtx();
  if (!unlocked) {
    unlocked = true;
    apply();
  }
}
for (const ev of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(ev, unlock, { passive: true });

export const audio = {
  get music() { return musicOn; },
  get sfx() { return sfxOn; },
  toggleMusic() { musicOn = !musicOn; store.set("ds_music", musicOn ? "1" : "0"); unlocked = true; apply(); listeners.forEach((f) => f()); },
  toggleSfx() { sfxOn = !sfxOn; store.set("ds_sfx", sfxOn ? "1" : "0"); listeners.forEach((f) => f()); },
  onChange(f) { listeners.add(f); },
};

// ---------- sound effects ----------
function noiseBuffer(c, secs) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  return buf;
}

function tone(freq, start, dur, type = "square", vol = 0.12, slideTo = null) {
  const c = ensureCtx();
  if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  const t = c.currentTime + start;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  shoot() {
    if (!sfxOn) return;
    const c = ensureCtx();
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.35);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(5000, c.currentTime);
    f.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.3);
    const g = c.createGain();
    g.gain.value = 0.55;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
    tone(120, 0, 0.18, "triangle", 0.3, 40);
  },
  empty() { if (sfxOn) tone(900, 0, 0.04, "square", 0.08); },
  lever() { if (sfxOn) { tone(420, 0.12, 0.04, "square", 0.05); tone(300, 0.2, 0.05, "square", 0.05); } },
  hit() { if (sfxOn) { tone(520, 0, 0.08, "square", 0.1, 180); } },
  kill(combo = 1) {
    if (!sfxOn) return;
    const base = 440 * Math.pow(1.0595, Math.min(combo, 8) * 2);
    tone(base, 0, 0.07, "square", 0.1);
    tone(base * 1.5, 0.07, 0.1, "square", 0.1);
  },
  ammo() {
    if (!sfxOn) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.12, "square", 0.09));
  },
  level() {
    if (!sfxOn) return;
    [392, 392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.14, "triangle", 0.14));
  },
  gameOver() {
    if (!sfxOn) return;
    [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.22, 0.3, "triangle", 0.16));
  },
  beep() { if (sfxOn) tone(660, 0, 0.12, "square", 0.1); },
  draw() { if (sfxOn) { tone(880, 0, 0.5, "square", 0.12); tone(1320, 0, 0.5, "triangle", 0.08); } },
  win() {
    if (!sfxOn) return;
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.16, "square", 0.11));
  },
  lose() { gameOverSfx(); },
  click() { if (sfxOn) tone(700, 0, 0.03, "square", 0.05); },
};
function gameOverSfx() { sfx.gameOver(); }
