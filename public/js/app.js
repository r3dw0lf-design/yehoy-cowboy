import { api } from "./api.js";
import { audio, sfx, playTrack } from "./sfx.js";
import { Game } from "./game.js";
import { drawScene } from "./scene.js";
import { GUNS, GUN_ORDER, SKINS, SKIN_ORDER, MAX_LEVEL, gunStats, statBars, upgradeCost, duelCoins } from "./guns.js";
import { previewGun } from "./guns-art.js";

const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtNum = (n) => Number(n || 0).toLocaleString("en-US");
const DURATIONS = [30, 45, 60, 90, 120, 180, 240, 300];
const RANKS = [[0, "GREENHORN"], [500, "DEPUTY"], [1500, "RANGER"], [3500, "SHERIFF"], [7000, "MARSHAL"], [12000, "LEGEND"]];
const rankFor = (score) => RANKS.filter(([min]) => score >= min).pop()[1];
const fmtDur = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s}s`);

// ---------------- guns: what the player owns / has equipped ----------------
async function loadArmory() {
  try {
    S.armory = await api.armory();
    if (S.user) S.user.coins = S.armory.coins;
  } catch {}
  return S.armory;
}
function ownedGun(id) {
  return S.armory && S.armory.guns.find((g) => g.id === id);
}
const skinFor = (id) => (ownedGun(id) ? ownedGun(id).skin : "classic");
function loadout() {
  const id = S.armory && ownedGun(S.armory.equipped) ? S.armory.equipped : "rifle";
  const g = ownedGun(id) || { level: 1, skin: "classic" };
  return { id, skin: g.skin, level: g.level, stats: gunStats(id, g.level) };
}
const paintPreviews = (root = document) => root.querySelectorAll("canvas.gpv").forEach((c) => previewGun(c, c.dataset.gun, c.dataset.skin));
const barsHtml = (stats) =>
  statBars(stats).map(([n, v]) => `<div class="stat"><span>${n}</span><span class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(v) ? "on" : ""}"></i>`).join("")}</span></div>`).join("");

const S = {
  armory: null,
  user: null,
  poll: null,
  screen: "auth",
  game: null,
  timers: [],
  players: [],
  offset: 0, // serverTime - clientTime
  pollTimer: null,
};

if (location.search.includes("debug")) window.__DS = S; // test hook only

// ---------------- animated backdrop for menu screens ----------------
const bg = $("#bg");
const bgCtx = bg.getContext("2d");
let bgLast = 0;
function bgLoop(ts) {
  if (!document.body.classList.contains("in-game") && ts - bgLast > 50) {
    bgLast = ts;
    drawScene(bgCtx, ts / 1000);
  }
  requestAnimationFrame(bgLoop);
}
requestAnimationFrame(bgLoop);

// ---------------- sound buttons ----------------
function syncSoundBtns() {
  const m = $("#musicBtn"), f = $("#sfxBtn");
  m.textContent = audio.music ? "MUSIC ON" : "MUSIC OFF";
  m.classList.toggle("off", !audio.music);
  f.textContent = audio.sfx ? "SFX ON" : "SFX OFF";
  f.classList.toggle("off", !audio.sfx);
}
$("#musicBtn").onclick = () => audio.toggleMusic();
$("#sfxBtn").onclick = () => audio.toggleSfx();
audio.onChange(syncSoundBtns);
syncSoundBtns();

// ---------------- toasts ----------------
function toast(html, opts = {}) {
  const el = document.createElement("div");
  el.className = "toast" + (opts.kind ? " " + opts.kind : "");
  el.innerHTML = html;
  el.onclick = () => { el.remove(); opts.onClick && opts.onClick(); };
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), opts.ms || 7000);
}

// ---------------- navigation ----------------
function clearTimers() {
  S.timers.forEach(clearInterval);
  S.timers = [];
}
function every(fn, ms) {
  const id = setInterval(fn, ms);
  S.timers.push(id);
  return id;
}
function cleanup() {
  clearTimers();
  if (S.game) { S.game.destroy(); S.game = null; }
  if (S.lobbyId && S.lobbyReady) { api.ready(S.lobbyId, false).catch(() => {}); }
  S.lobbyId = null;
  S.lobbyReady = false;
  S.hubRefresh = null;
}

function go(screen, params) {
  cleanup();
  app.onclick = null;
  S.screen = screen;
  document.body.classList.toggle("in-game", screen === "single" || screen === "duel");
  window.scrollTo(0, 0);
  const fn = { auth: renderAuth, menu: renderMenu, single: renderSingle, hub: renderHub, lobby: renderLobby, duel: renderDuel, board: renderBoard, armory: renderArmory }[screen];
  if (["menu", "hub", "board", "auth", "armory"].includes(screen)) playTrack("menu");
  fn(params);
}

// ---------------- polling ----------------
async function pollOnce() {
  if (!S.user || document.hidden) return;
  if (S.screen === "duel" || S.screen === "single") return;
  try {
    const r = await api.poll();
    S.offset = r.serverTime - Date.now();
    S.poll = r;
    S.user = { ...S.user, ...r.me };
    if (S.armory) { S.armory.coins = r.me.coins; S.armory.equipped = r.me.equipped; }
    for (const n of r.notices) {
      if (n.type === "request")
        toast(`<b>${esc(n.from)}</b> challenges you to a <b>${fmtDur(n.duration)}</b> duel! Tap to answer.`, { onClick: () => go("hub") });
      else if (n.type === "accepted")
        toast(`<b>${esc(n.from)}</b> accepted your duel! Tap to enter the lobby.`, { onClick: () => go("lobby", { id: n.duelId }) });
      else if (n.type === "declined") toast(`<b>${esc(n.from)}</b> turned down your challenge.`, { kind: "err" });
      sfx.beep();
    }
    updateBadge();
    S.hubRefresh && S.hubRefresh();
  } catch (e) {
    if (e.status === 401) { S.user = null; go("auth"); }
  }
}
function startPolling() {
  clearInterval(S.pollTimer);
  S.pollTimer = setInterval(pollOnce, 3000);
  pollOnce();
}
function updateBadge() {
  const b = $("#mpBadge");
  if (!b || !S.poll) return;
  const n = S.poll.incoming.length + S.poll.lobbies.length;
  b.hidden = n === 0;
  b.textContent = n;
}

// ---------------- AUTH ----------------
function renderAuth(mode = "login") {
  const signup = mode === "signup";
  app.innerHTML = `
  <main class="center">
    <h1 class="title">DUSTY GULCH</h1>
    <div class="subtitle">&#9733; SHOWDOWN &#9733;</div>
    <form class="poster" id="authForm" autocomplete="on">
      <div class="tabs">
        <button type="button" class="tab ${signup ? "" : "on"}" data-m="login">SIGN IN</button>
        <button type="button" class="tab ${signup ? "on" : ""}" data-m="signup">NEW OUTLAW</button>
      </div>
      <h2>${signup ? "JOIN THE POSSE" : "WANTED: SHARPSHOOTERS"}</h2>
      <label>YOUR COWBOY NAME
        <input type="text" id="u" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" required>
      </label>
      <label>SECRET PASSWORD
        <input type="password" id="p" maxlength="100" autocomplete="${signup ? "new-password" : "current-password"}" required>
      </label>
      ${signup ? `<label>CONFIRM PASSWORD<input type="password" id="p2" maxlength="100" autocomplete="new-password" required></label>` : ""}
      <div class="error" id="err" role="alert"></div>
      <button class="btn gold block" type="submit" id="go">${signup ? "GET DEPUTIZED" : "RIDE IN"}</button>
      <p class="hint">${signup ? "3-16 letters, numbers or _ &middot; password 6+ characters. Every name is one of a kind, worldwide." : "New in town? Hit NEW OUTLAW to make an account."}</p>
    </form>
  </main>`;
  app.querySelectorAll(".tab").forEach((t) => (t.onclick = () => { sfx.click(); renderAuth(t.dataset.m); }));
  $("#authForm").onsubmit = async (e) => {
    e.preventDefault();
    const err = $("#err");
    err.textContent = "";
    const u = $("#u").value.trim(), p = $("#p").value;
    if (signup) {
      if (!/^[A-Za-z0-9_]{3,16}$/.test(u)) return (err.textContent = "Name: 3-16 letters, numbers or underscores.");
      if (p.length < 6) return (err.textContent = "Password needs at least 6 characters.");
      if (p !== $("#p2").value) return (err.textContent = "Passwords don't match.");
    }
    const btn = $("#go");
    btn.disabled = true;
    try {
      const r = signup ? await api.signup(u, p) : await api.login(u, p);
      S.user = r.user;
      await loadArmory();
      startPolling();
      go("menu");
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
    }
  };
  $("#u").focus();
}

// ---------------- MENU ----------------
function renderMenu() {
  const u = S.user;
  app.innerHTML = `
  <main class="center">
    <h1 class="title">DUSTY GULCH</h1>
    <div class="subtitle">&#9733; SHOWDOWN &#9733;</div>
    <div class="plate">HOWDY, <b>${esc(u.username)}</b>!<br>
      RANK <b>${rankFor(u.high_score)}</b><br>
      COINS <b>${fmtNum(u.coins)}</b> &nbsp;|&nbsp; GUN <b>${esc(GUNS[loadout().id].name.toUpperCase())}</b><br>
      HIGH SCORE <b>${fmtNum(u.high_score)}</b> &nbsp;|&nbsp; DUELS <b>${u.wins}W ${u.losses}L ${u.draws}D</b></div>
    <nav class="menu">
      <button class="btn gold" id="sp">SINGLE PLAYER</button>
      <button class="btn red" id="mp">MULTIPLAYER<span class="badge" id="mpBadge" hidden></span></button>
      <button class="btn green" id="gs">GUN SMITH</button>
      <button class="btn teal" id="lb">LEADERBOARD</button>
      <button class="btn" id="out">SIGN OUT</button>
    </nav>
  </main>`;
  $("#sp").onclick = () => { sfx.click(); go("single"); };
  $("#mp").onclick = () => { sfx.click(); go("hub"); };
  $("#lb").onclick = () => { sfx.click(); go("board"); };
  $("#gs").onclick = () => { sfx.click(); go("armory"); };
  $("#out").onclick = async () => {
    try { await api.logout(); } catch {}
    clearInterval(S.pollTimer);
    S.user = null; S.poll = null;
    go("auth");
  };
  updateBadge();
}

// ---------------- LEADERBOARD ----------------
async function renderBoard() {
  app.innerHTML = `<main class="center"><h1 class="title small">HALL OF FAME</h1><div class="board" id="bd"><div class="panel">Loading...</div></div>
    <p><button class="btn" id="back">&laquo; BACK TO TOWN</button></p></main>`;
  $("#back").onclick = () => go("menu");
  try {
    const r = await api.leaderboard();
    const me = S.user.username.toLowerCase();
    $("#bd").innerHTML = `
      <section class="panel"><h2>TOP SHARPSHOOTERS</h2>
        <table>${r.topScores.map((x, i) => `<tr class="${x.username.toLowerCase() === me ? "me" : ""}"><td>${i + 1}.</td><td>${esc(x.username)}</td><td class="num">${fmtNum(x.high_score)}</td></tr>`).join("") || `<tr><td class="empty">Nobody has scored yet.</td></tr>`}</table></section>
      <section class="panel"><h2>DUEL CHAMPIONS</h2>
        <table>${r.topDuelists.map((x, i) => `<tr class="${x.username.toLowerCase() === me ? "me" : ""}"><td>${i + 1}.</td><td>${esc(x.username)}</td><td class="num">${x.wins}W ${x.losses}L</td></tr>`).join("") || `<tr><td class="empty">No duels won yet.</td></tr>`}</table></section>`;
  } catch (e) {
    $("#bd").innerHTML = `<div class="panel">${esc(e.message)}</div>`;
  }
}

// ---------------- shared game markup ----------------
function bulletsHtml(n) {
  const total = Math.max(8, n);
  return Array.from({ length: total }, (_, i) => `<i class="bul ${i < n ? "" : "empty"}"></i>`).join("");
}

function showBanner(title, sub, kind) {
  const b = $("#banner");
  if (!b) return;
  b.innerHTML = `<div class="banner-in ${kind || ""}"><b>${esc(title)}</b><span>${esc(sub || "")}</span></div>`;
}

const LEGEND = `
  <div class="legend">
    <span>Vulture <b>20</b></span><span>Crow <b>40</b></span><span>Hawk <b>70</b></span>
    <span>Sparrow <b>100</b></span><span>Big Buzzard <b>150</b> (3 hits)</span><span>Golden Eagle <b>250</b></span>
  </div>`;

// ---------------- SINGLE PLAYER ----------------
function renderSingle() {
  playTrack("single");
  app.innerHTML = `
  <div class="game-wrap">
    <div class="hud">
      <div class="cell"><span class="k">SCORE</span><span class="v" id="hScore">0</span></div>
      <div class="cell"><span class="k">HIGH SCORE</span><span class="v hi" id="hHi">${fmtNum(S.user.high_score)}</span></div>
      <div class="cell"><span class="k">LEVEL</span><span class="v" id="hLvl">1</span></div>
      <div class="cell"><span class="k">COMBO</span><span class="v" id="hCombo">x1</span></div>
      <div class="cell"><span class="k">AMMO</span><div class="bullets" id="hAmmo"></div></div>
    </div>
    <div class="stage" id="stage">
      <canvas id="cv" width="320" height="180"></canvas>
      <div id="banner"></div>
      <div class="overlay" id="ov"></div>
    </div>
    <div class="gbar"><button class="btn small" id="back">&laquo; BACK TO TOWN</button>
      <p class="hint">Click or tap to shoot &middot; P to pause &middot; kills earn supply drops</p></div>
  </div>`;
  $("#back").onclick = () => go("menu");
  showStartOverlay();
}

function showStartOverlay() {
  const lo = loadout();
  const ov = $("#ov");
  ov.className = "overlay";
  ov.innerHTML = `<h3>BIRD HUNT</h3>
    <p>Shoot the birds out of the sky! Your bullets are limited, but every few kills a supply drop gives you more.
    Hit streaks multiply your points, and every level brings faster, bigger birds.</p>
    ${LEGEND}
    <div class="loadout"><canvas class="gpv" width="100" height="44" data-gun="${lo.id}" data-skin="${lo.skin}"></canvas>
      <div><b>${esc(GUNS[lo.id].name)}</b> <small>LV ${lo.level}</small><br><button class="btn small" id="chg">CHANGE GUN</button></div></div>
    <button class="btn gold" id="start">CLICK TO START</button>`;
  paintPreviews(ov);
  $("#chg").onclick = (e) => { e.stopPropagation(); sfx.click(); go("armory"); };
  ov.onclick = (e) => { e.stopPropagation(); startSingle(); };
}

function startSingle() {
  const ov = $("#ov");
  ov.hidden = true;
  ov.onclick = null;
  if (S.game) S.game.destroy();
  let lastAmmo = -1;
  S.game = new Game($("#cv"), {
    mode: "single",
    gun: loadout(),
    onHud: (h) => {
      $("#hScore").textContent = fmtNum(h.score);
      $("#hHi").textContent = fmtNum(Math.max(S.user.high_score, h.score));
      $("#hLvl").textContent = h.level;
      $("#hCombo").textContent = "x" + h.mult;
      if (h.ammo !== lastAmmo) { lastAmmo = h.ammo; $("#hAmmo").innerHTML = bulletsHtml(h.ammo); }
    },
    onBanner: showBanner,
    onPause: (p) => {
      if (p) {
        ov.hidden = false; ov.className = "overlay";
        ov.innerHTML = `<h3>PAUSED</h3><p>Click to get back in the saddle.</p>`;
        ov.onclick = (e) => { e.stopPropagation(); S.game && S.game.setPaused(false); };
      } else { ov.hidden = true; ov.onclick = null; }
    },
    onEnd: async ({ score, kills, level, shots, hits, bestStreak }) => {
      sfx.gameOver();
      let record = false, high = S.user.high_score, coinsEarned = 0;
      try {
        const r = await api.score(score);
        record = r.newRecord; high = r.high_score;
        coinsEarned = r.coinsEarned;
        S.user.high_score = high;
        S.user.coins = r.coins;
        if (S.armory) S.armory.coins = r.coins;
      } catch {
        record = score > S.user.high_score;
        if (record) { high = score; S.user.high_score = score; }
      }
      ov.hidden = false; ov.className = "overlay noclick";
      ov.innerHTML = `<h3>OUT OF AMMO!</h3>
        <div class="score-big">${fmtNum(score)}</div>
        <p>${record ? "&#9733; NEW HIGH SCORE! &#9733;" : `HIGH SCORE: ${fmtNum(high)}`}<br>RANK: <b style="color:var(--gold);font-weight:400">${rankFor(score)}</b><br>${kills} birds downed &middot; level ${level} &middot; accuracy ${shots ? Math.round((hits / shots) * 100) : 0}% &middot; best streak ${bestStreak}<br><b style="color:var(--gold);font-weight:400">+${fmtNum(coinsEarned)} COINS</b></p>
        <div class="btns"><button class="btn gold" id="again">PLAY AGAIN</button><button class="btn" id="menuB">BACK TO TOWN</button></div>`;
      $("#again").onclick = () => { sfx.click(); go("single"); };
      $("#menuB").onclick = () => go("menu");
    },
  });
}

// ---------------- MULTIPLAYER HUB ----------------
function renderHub() {
  let selected = 60;
  app.innerHTML = `
  <main class="center">
    <h1 class="title small">SALOON DUELS</h1>
    <div class="hub">
      <section class="panel">
        <h2>CALL OUT A GUNSLINGER</h2>
        <span class="lbl">WHO'S IT GONNA BE?</span>
        <div class="combo">
          <input type="text" class="txt" id="opp" placeholder="Pick or type a name" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="16">
          <button type="button" class="caret" id="caret" aria-label="Show all players">&#9660;</button>
          <ul id="oppList" hidden></ul>
        </div>
        <span class="lbl">DUEL LENGTH <small>(they must agree to it)</small></span>
        <div class="chips" id="chips">${DURATIONS.map((d) => `<button type="button" class="chip ${d === selected ? "on" : ""}" data-d="${d}">${fmtDur(d)}</button>`).join("")}</div>
        <p style="margin-top:20px"><button class="btn gold block" id="send">SEND REQUEST</button></p>
        <div class="msg" id="sendMsg" role="status"></div>
      </section>
      <div class="stack">
        <section class="panel"><h2>CHALLENGES FOR YOU</h2><div id="inc"></div></section>
        <section class="panel"><h2>READY TO RIDE</h2><div id="lob"></div></section>
        <section class="panel"><h2>REQUESTS YOU SENT</h2><div id="outg"></div></section>
        <section class="panel"><h2>RECENT DUELS</h2><div id="hist"></div></section>
      </div>
    </div>
    <p><button class="btn" id="back">&laquo; BACK TO TOWN</button></p>
  </main>`;
  $("#back").onclick = () => go("menu");

  // --- combobox: pick from everyone or type a name ---
  const input = $("#opp"), list = $("#oppList");
  const renderList = () => {
    const q = input.value.trim().toLowerCase();
    const items = S.players.filter((p) => !q || p.username.toLowerCase().includes(q));
    items.sort((a, b) => (b.online - a.online) || a.username.localeCompare(b.username));
    list.innerHTML = items.length
      ? items.map((p) => `<li data-n="${esc(p.username)}"><i class="dot ${p.online ? "on" : ""}"></i>${esc(p.username)}<small style="margin-left:auto;opacity:.6;font-size:8px">${p.online ? "ONLINE" : "AWAY"}</small></li>`).join("")
      : `<li class="none">${S.players.length ? "No match - you can still type a full name." : "No other players yet. Invite a friend to sign up!"}</li>`;
  };
  const open = () => { renderList(); list.hidden = false; };
  input.onfocus = open;
  input.oninput = open;
  $("#caret").onclick = () => { if (list.hidden) { open(); input.focus(); } else list.hidden = true; };
  list.onmousedown = (e) => {
    const li = e.target.closest("li[data-n]");
    if (li) { e.preventDefault(); input.value = li.dataset.n; list.hidden = true; }
  };
  list.ontouchstart = (e) => {
    const li = e.target.closest("li[data-n]");
    if (li) { e.preventDefault(); input.value = li.dataset.n; list.hidden = true; }
  };
  input.onblur = () => setTimeout(() => (list.hidden = true), 120);
  const loadPlayers = async () => { try { S.players = (await api.players()).players; if (!list.hidden) renderList(); } catch {} };
  loadPlayers();
  every(loadPlayers, 15000);

  $("#chips").onclick = (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    selected = +c.dataset.d;
    document.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c));
  };

  const msg = (t, cls = "") => { const m = $("#sendMsg"); m.className = "msg " + cls; m.textContent = t; };
  $("#send").onclick = async () => {
    const name = input.value.trim();
    if (!name) return msg("Pick a player first, partner.", "err");
    const btn = $("#send");
    btn.disabled = true;
    try {
      const r = await api.createDuel(name, selected);
      sfx.click();
      msg(r.opponentOnline
        ? `Request sent! ${r.opponent} is in town and will see it right away.`
        : `Request sent! ${r.opponent} is out of town right now - it'll be waiting when they ride back in.`, "ok");
      input.value = "";
      pollOnce();
    } catch (e) { msg(e.message, "err"); }
    btn.disabled = false;
  };

  // --- right-hand lists, refreshed by polling (never touches the form) ---
  const draw = () => {
    const p = S.poll;
    if (!p) return;
    const none = (t) => `<div class="empty">${t}</div>`;
    $("#inc").innerHTML = p.incoming.map((d) => `
      <div class="row"><span><span class="who">${esc(d.from)}</span> wants a <b>${fmtDur(d.duration)}</b> duel</span>
        <span class="acts"><button class="btn small green" data-a="acc" data-id="${d.id}">ACCEPT</button><button class="btn small red" data-a="dec" data-id="${d.id}">DECLINE</button></span></div>`).join("") || none("No challenges right now.");
    $("#lob").innerHTML = p.lobbies.map((d) => `
      <div class="row"><span>vs <span class="who">${esc(d.opponent.username)}</span> &middot; ${fmtDur(d.duration)}<br>
        <small>${d.status === "live" ? "DUEL IN PROGRESS!" : d.opponent.ready ? "They're ready!" : d.opponent.online ? "They're in town" : "They're away"}</small></span>
        <span class="acts"><button class="btn small gold" data-a="enter" data-id="${d.id}">${d.status === "live" ? "JOIN" : "ENTER LOBBY"}</button>
        ${d.status === "accepted" ? `<button class="btn small red" data-a="cancel" data-id="${d.id}">CALL OFF</button>` : ""}</span></div>`).join("") || none("No accepted duels yet.");
    $("#outg").innerHTML = p.outgoing.map((d) => `
      <div class="row"><span>to <span class="who">${esc(d.to)}</span> &middot; ${fmtDur(d.duration)}<br><small>${d.online ? "Online - waiting for answer" : "Away - will see it when back"}</small></span>
        <span class="acts"><button class="btn small red" data-a="cancel" data-id="${d.id}">CANCEL</button></span></div>`).join("") || none("Nothing pending.");
    $("#hist").innerHTML = p.recent.map((d) => `
      <div class="row"><span>vs <span class="who">${esc(d.opponent)}</span> &middot; ${fmtDur(d.duration)}</span>
        <span class="res-${d.result}">${d.result === "win" ? "WON" : d.result === "loss" ? "LOST" : "DRAW"} ${fmtNum(d.yourScore)} - ${fmtNum(d.theirScore)} <small>(+${fmtNum(d.coins)}c)</small></span></div>`).join("") || none("No duels yet.");
  };
  S.hubRefresh = draw;
  draw();
  pollOnce();

  app.onclick = async (e) => {
    const b = e.target.closest("button[data-a]");
    if (!b) return;
    const id = +b.dataset.id;
    b.disabled = true;
    try {
      if (b.dataset.a === "acc") { await api.respond(id, true); sfx.click(); go("lobby", { id }); return; }
      if (b.dataset.a === "dec") await api.respond(id, false);
      if (b.dataset.a === "cancel") await api.cancel(id);
      if (b.dataset.a === "enter") { go("lobby", { id }); return; }
      await pollOnce();
    } catch (ex) { toast(esc(ex.message), { kind: "err" }); await pollOnce(); }
  };
}

// ---------------- DUEL LOBBY ----------------
async function fetchDuel(id) {
  const t0 = Date.now();
  const r = await api.duel(id);
  const t1 = Date.now();
  S.offset = r.duel.serverTime - (t0 + t1) / 2;
  return r.duel;
}

function renderLobby({ id }) {
  playTrack("duel");
  S.lobbyId = id;
  S.lobbyReady = false;
  app.innerHTML = `
  <main class="center">
    <h1 class="title small">SALOON LOBBY</h1>
    <section class="panel lobby">
      <div class="big-info" id="info">Loading...</div>
      <div class="vs">
        <div class="gunner" id="gMe"></div><div class="vs-badge">VS</div><div class="gunner" id="gOpp"></div>
      </div>
      <div class="gunpick">
        <span class="lbl">DUEL GUN <small>(only guns you BOTH own)</small></span>
        <div class="gp-row"><select id="gunSel" aria-label="Duel gun"></select>
          <canvas class="gpv" id="gpv" width="100" height="44"></canvas></div>
        <div class="hint" id="gunNote">Same gun for both gunslingers at level-1 stats, so it's a fair fight. Your skin stays yours.</div>
      </div>
      <p class="hint" style="text-align:center" id="tip">Both gunslingers hit READY and the duel starts after a short countdown.</p>
      <div class="acts">
        <button class="btn green" id="rdy">READY!</button>
        <button class="btn" id="leave">&laquo; LEAVE LOBBY</button>
        <button class="btn red" id="callOff">CALL OFF DUEL</button>
      </div>
    </section>
  </main>`;
  let started = false, lastGun = null, lastSig = "";
  const sel = $("#gunSel");

  const paint = (d) => {
    // gun picker: options are the guns both players own
    const common = d.commonGuns || ["rifle"];
    const sig = common.join(",");
    if (sig !== lastSig) {
      lastSig = sig;
      sel.innerHTML = common.map((g) => `<option value="${g}">${esc(GUNS[g].name)} (${esc(GUNS[g].type)})</option>`).join("");
    }
    if (lastGun !== null && d.gun !== lastGun) toast(`The duel gun is now <b>${esc(GUNS[d.gun].name)}</b>. Everyone has to hit READY again.`);
    lastGun = d.gun;
    if (document.activeElement !== sel) sel.value = d.gun;
    const pv = $("#gpv");
    if (pv.dataset.gun !== d.gun) {
      pv.dataset.gun = d.gun; pv.dataset.skin = skinFor(d.gun);
      previewGun(pv, d.gun, pv.dataset.skin);
    }
    $("#gunNote").textContent = `${GUNS[d.gun].perk}`;
    $("#info").innerHTML = `${fmtDur(d.duration)} DUEL &middot; MOST POINTS WINS`;
    const card = (p, you) => `<div class="nm">${esc(p.username)}${you ? " (YOU)" : ""}</div>
      <div><i class="dot ${p.online ? "on" : ""}"></i></div>
      <div class="st">${p.ready ? "&#9733; READY" : p.online ? "NOT READY" : "AWAY FROM TOWN"}</div>`;
    $("#gMe").innerHTML = card(d.you, true);
    $("#gMe").classList.toggle("ready", d.you.ready);
    $("#gOpp").innerHTML = card(d.opponent, false);
    $("#gOpp").classList.toggle("ready", d.opponent.ready);
    S.lobbyReady = d.you.ready;
    $("#rdy").textContent = d.you.ready ? "NOT READY" : "READY!";
    $("#rdy").classList.toggle("green", !d.you.ready);
    $("#rdy").classList.toggle("gold", d.you.ready);
    $("#tip").textContent = !d.opponent.online && !d.opponent.ready
      ? `${d.opponent.username} isn't in town right now. Stay ready, or leave and come back later - the duel stays open.`
      : "Both gunslingers hit READY and the duel starts after a short countdown.";
  };

  const handle = (d) => {
    if (started) return;
    if (d.status === "live") {
      started = true;
      S.lobbyReady = false; // don't un-ready on the way into the duel
      go("duel", { duel: d });
      return;
    }
    if (d.status !== "accepted") {
      started = true;
      toast("That duel was called off.", { kind: "err" });
      go("hub");
      return;
    }
    paint(d);
  };

  const refresh = async () => { try { handle(await fetchDuel(id)); } catch (e) { if (e.status === 404) go("hub"); } };
  refresh();
  every(refresh, 1200);
  every(() => { if (S.lobbyReady && !started) api.ready(id, true).catch(() => {}); }, 10000); // keep "ready" fresh

  $("#rdy").onclick = async () => {
    sfx.click();
    try { const r = await api.ready(id, !S.lobbyReady); handle(r.duel); } catch (e) { toast(esc(e.message), { kind: "err" }); }
  };
  sel.onchange = async () => {
    sfx.click();
    lastGun = sel.value;
    try { handle((await api.duelGun(id, sel.value)).duel); } catch (e) { toast(esc(e.message), { kind: "err" }); }
  };
  $("#leave").onclick = () => go("hub");
  $("#callOff").onclick = async () => {
    try { await api.cancel(id); } catch {}
    S.lobbyReady = false;
    go("hub");
  };
}

// ---------------- DUEL GAME ----------------
function renderDuel({ duel }) {
  playTrack("duel");
  const id = duel.id;
  const offset = S.offset;
  const getClock = () => (Date.now() + offset - duel.start_at) / 1000;
  let lastAmmo = -1, rivalScore = 0, ended = false;

  app.innerHTML = `
  <div class="game-wrap">
    <div class="hud">
      <div class="cell"><span class="k">YOU &middot; ${esc(duel.you.username)}</span><span class="v" id="hScore">0</span></div>
      <div class="cell"><span class="k">TIME</span><span class="v timer" id="hTime">${duel.duration}</span></div>
      <div class="cell rival"><span class="k">RIVAL &middot; ${esc(duel.opponent.username)}</span><span class="v" id="hRival">0</span></div>
      <div class="cell"><span class="k">LEVEL</span><span class="v" id="hLvl">1</span></div>
      <div class="cell"><span class="k">COMBO</span><span class="v" id="hCombo">x1</span></div>
      <div class="cell"><span class="k">AMMO</span><div class="bullets" id="hAmmo"></div></div>
    </div>
    <div class="stage">
      <canvas id="cv" width="320" height="180"></canvas>
      <div id="banner"></div>
      <div class="overlay noclick" id="ov" hidden></div>
    </div>
    <div class="gbar"><span></span><p class="hint">Duel gun: ${esc(GUNS[duel.gun].name)} (equal stats for both) &middot; out of ammo = 2s reload &middot; most points wins</p></div>
  </div>`;

  const ov = $("#ov");
  let lastCount = -1, drawShown = false;

  S.game = new Game($("#cv"), {
    mode: "duel",
    gun: { id: duel.gun, skin: skinFor(duel.gun), stats: gunStats(duel.gun, 1) },
    seed: duel.seed,
    duration: duel.duration,
    getClock,
    onBanner: showBanner,
    onHud: (h) => {
      $("#hScore").textContent = fmtNum(h.score);
      $("#hLvl").textContent = h.level;
      $("#hCombo").textContent = "x" + h.mult;
      const tm = $("#hTime");
      tm.textContent = `${Math.floor(h.timeLeft / 60)}:${String(h.timeLeft % 60).padStart(2, "0")}`;
      tm.classList.toggle("low", h.timeLeft <= 10 && h.timeLeft > 0);
      if (h.ammo !== lastAmmo) { lastAmmo = h.ammo; $("#hAmmo").innerHTML = bulletsHtml(h.ammo); }
      if (h.countdown > 0 && !ended) {
        ov.hidden = false;
        ov.innerHTML = `<div class="countdown">${h.countdown <= 5 ? h.countdown : ""}</div><p>${h.countdown > 5 ? "GET READY..." : "STEADY..."}</p>`;
        if (h.countdown !== lastCount) { lastCount = h.countdown; if (h.countdown <= 5) sfx.beep(); }
      } else if (h.draw && !drawShown && !ended) {
        drawShown = true;
        ov.hidden = false;
        ov.innerHTML = `<div class="countdown draw">DRAW!</div>`;
        sfx.draw();
      } else if (!h.draw && !ended && h.countdown === 0) {
        ov.hidden = true;
      }
    },
    onEnd: async ({ score }) => {
      ended = true;
      clearInterval(scoreTimer);
      sfx.beep();
      ov.hidden = false;
      ov.innerHTML = `<h3>TIME!</h3><div class="score-big">${fmtNum(score)}</div><p>Waiting for ${esc(duel.opponent.username)} to finish...</p>`;
      await finishDuel(score);
    },
  });

  const post = async (final) => {
    try {
      const r = await api.duelScore(id, S.game ? S.game.score : 0, final);
      rivalScore = r.duel.opponent.score;
      $("#hRival") && ($("#hRival").textContent = fmtNum(rivalScore));
      return r.duel;
    } catch { return null; }
  };
  const scoreTimer = setInterval(() => { if (S.game && !ended && S.game.t >= 0) post(false); }, 1000);
  S.timers.push(scoreTimer);

  async function finishDuel(score) {
    let d = null;
    for (let i = 0; i < 4 && !d; i++) { d = await post(true); if (!d) await new Promise((r) => setTimeout(r, 800)); }
    // wait for the rival's final score (server also settles on its own after a short grace period)
    const t0 = Date.now();
    while ((!d || d.status !== "finished") && Date.now() - t0 < 30000) {
      await new Promise((r) => setTimeout(r, 1000));
      try { d = await fetchDuel(id); $("#hRival").textContent = fmtNum(d.opponent.score); } catch {}
      if (S.screen !== "duel") return;
    }
    showResult(d, score);
  }

  function showResult(d, myScore) {
    S.game && S.game.destroy();
    const res = d ? d.result : null;
    const mine = d ? d.you.score : myScore, theirs = d ? d.opponent.score : rivalScore;
    if (res === "win") sfx.win(); else if (res === "loss") sfx.lose(); else sfx.draw();
    const heading = res === "win" ? "YOU WIN!" : res === "loss" ? "YOU LOSE" : res === "draw" ? "DRAW!" : "DUEL OVER";
    ov.hidden = false;
    ov.innerHTML = `<h3>${heading}</h3>
      <div class="score-big">${fmtNum(mine)} - ${fmtNum(theirs)}</div>
      <p>${esc(duel.you.username)} vs ${esc(duel.opponent.username)}<br>${res === "win" ? "Fastest gun in Dusty Gulch!" : res === "loss" ? "Better luck next sundown, partner." : res === "draw" ? "Dead even. Call for a rematch!" : "Couldn't confirm the final result."}<br><b style="color:var(--gold);font-weight:400">+${fmtNum(res ? duelCoins(res, mine) : 0)} COINS</b></p>
      <div class="btns"><button class="btn gold" id="rematch">REMATCH</button><button class="btn" id="toHub">BACK TO SALOON</button></div>`;
    $("#toHub").onclick = () => { go("hub"); startPolling(); };
    $("#rematch").onclick = async () => {
      try {
        await api.createDuel(duel.opponent.username, duel.duration);
        toast(`Rematch request sent to <b>${esc(duel.opponent.username)}</b>!`);
      } catch (e) { toast(esc(e.message), { kind: "err" }); }
      go("hub"); startPolling();
    };
    pollOnce();
  }
}


// ---------------- GUN SMITH: armory + shop ----------------
async function renderArmory({ tab = "armory" } = {}) {
  app.innerHTML = `
  <main class="center">
    <h1 class="title small">GUN SMITH</h1>
    <div class="plate" id="coinBar"></div>
    <div class="tabs2">
      <button class="btn small ${tab === "armory" ? "gold" : ""}" id="tA">MY ARMORY</button>
      <button class="btn small ${tab === "shop" ? "gold" : ""}" id="tS">GUN SHOP</button>
    </div>
    <div class="guncards" id="cards"><div class="panel">Loading...</div></div>
    <p><button class="btn" id="back">&laquo; BACK TO TOWN</button></p>
  </main>`;
  $("#back").onclick = () => go("menu");
  $("#tA").onclick = () => { sfx.click(); go("armory", { tab: "armory" }); };
  $("#tS").onclick = () => { sfx.click(); go("armory", { tab: "shop" }); };
  await loadArmory();
  if (!S.armory) { $("#cards").innerHTML = `<div class="panel">Couldn't load your guns. Try again.</div>`; return; }

  const draw = () => {
    const A = S.armory;
    $("#coinBar").innerHTML = `YOUR COINS <b>${fmtNum(A.coins)}</b><br><small>Earn coins: 1 per 10 points in single player &middot; duels pay 50-150 + points/20</small>`;
    let html = "";
    if (tab === "armory") {
      html = A.guns.map((g) => {
        const def = GUNS[g.id], eq = A.equipped === g.id, next = upgradeCost(g.id, g.level);
        return `<article class="gun-card ${eq ? "eq" : ""}">
          ${eq ? `<div class="ribbon">EQUIPPED</div>` : ""}
          <canvas class="gpv" width="100" height="44" data-gun="${g.id}" data-skin="${g.skin}"></canvas>
          <h3>${esc(def.name)} <small>${esc(def.type)}</small></h3>
          <div class="lvl">LEVEL ${g.level} / ${MAX_LEVEL} <span class="pips">${Array.from({ length: MAX_LEVEL }, (_, i) => `<i class="${i < g.level ? "on" : ""}"></i>`).join("")}</span></div>
          <p class="perk">${esc(def.perk)}</p>
          ${barsHtml(gunStats(g.id, g.level))}
          <span class="lbl">SKINS</span>
          <div class="chips">${SKIN_ORDER.map((s) => {
            const own = g.skins.includes(s);
            return `<button class="chip ${g.skin === s ? "on" : ""}" data-act="skin" data-gun="${g.id}" data-skin="${s}">${esc(SKINS[s].name)}${own ? "" : ` &middot; ${SKINS[s].price}c`}</button>`;
          }).join("")}</div>
          <div class="gc-acts">
            <button class="btn small ${eq ? "" : "green"}" data-act="equip" data-gun="${g.id}" ${eq ? "disabled" : ""}>${eq ? "EQUIPPED" : "EQUIP"}</button>
            <button class="btn small gold" data-act="upgrade" data-gun="${g.id}" ${next === null ? "disabled" : ""}>${next === null ? "MAX LEVEL" : `UPGRADE &middot; ${fmtNum(next)}c`}</button>
          </div></article>`;
      }).join("");
    } else {
      const forSale = GUN_ORDER.filter((id) => !ownedGun(id));
      html = forSale.map((id) => {
        const def = GUNS[id];
        return `<article class="gun-card">
          <canvas class="gpv" width="100" height="44" data-gun="${id}" data-skin="classic"></canvas>
          <h3>${esc(def.name)} <small>${esc(def.type)}</small></h3>
          <p class="perk">${esc(def.perk)}</p>
          ${barsHtml(gunStats(id, 1))}
          <div class="gc-acts"><button class="btn small ${A.coins >= def.price ? "gold" : ""}" data-act="buy" data-gun="${id}">BUY &middot; ${fmtNum(def.price)}c</button></div>
        </article>`;
      }).join("") || `<div class="panel">You own every gun in town. Now go upgrade them!</div>`;
    }
    $("#cards").innerHTML = html;
    paintPreviews($("#cards"));
  };
  draw();

  $("#cards").onclick = async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b || b.disabled) return;
    const act = b.dataset.act, gun = b.dataset.gun;
    try {
      if (act === "buy") {
        if (S.armory.coins < GUNS[gun].price) return toast(`You need <b>${fmtNum(GUNS[gun].price - S.armory.coins)}</b> more coins for the ${esc(GUNS[gun].name)}.`, { kind: "err" });
        S.armory = await api.buy(gun); sfx.ammo();
        toast(`You bought the <b>${esc(GUNS[gun].name)}</b>! Find it in your armory.`, { ms: 3000 });
      } else if (act === "upgrade") {
        S.armory = await api.upgrade(gun); sfx.level();
      } else if (act === "equip") {
        S.armory = await api.equip(gun); sfx.click();
      } else if (act === "skin") {
        const g = ownedGun(gun), skin = b.dataset.skin;
        if (!g.skins.includes(skin)) {
          if (S.armory.coins < SKINS[skin].price) return toast(`You need <b>${fmtNum(SKINS[skin].price - S.armory.coins)}</b> more coins for that skin.`, { kind: "err" });
          if (!confirm(`Buy the ${SKINS[skin].name} skin for ${SKINS[skin].price} coins?`)) return;
          sfx.ammo();
        } else sfx.click();
        S.armory = await api.skin(gun, skin);
      }
      S.user.coins = S.armory.coins;
      draw();
    } catch (ex) {
      toast(esc(ex.message), { kind: "err" });
      await loadArmory(); draw();
    }
  };
}

// ---------------- boot ----------------
(async function boot() {
  try {
    const r = await api.me();
    S.user = r.user;
    S.offset = r.serverTime - Date.now();
    await loadArmory();
    startPolling();
    go("menu");
  } catch {
    go("auth");
  }
})();
