import { ensureSchema } from "./db.js";
import { HttpError, json, readJson } from "./util.js";
import { signup, login, logout, authenticate, publicUser } from "./auth.js";
import { listPlayers, createDuel, respondDuel, cancelDuel, setReady, getDuel, postScore, poll } from "./duels.js";

async function handleApi(request, env, url) {
  const now = Date.now();
  const method = request.method;
  const path = url.pathname.replace(/\/+$/, "");

  // Basic CSRF guard: state-changing requests must come from our own site
  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== url.host) throw new HttpError(403, "Bad origin.");
  }

  // ---- public routes ----
  if (path === "/api/signup" && method === "POST") return signup(env, request, now);
  if (path === "/api/login" && method === "POST") return login(env, request, now);
  if (path === "/api/logout" && method === "POST") return logout(env, request);

  // ---- everything below needs a logged-in player ----
  const me = await authenticate(env, request, now);
  if (!me) throw new HttpError(401, "Please sign in.");

  if (path === "/api/me" && method === "GET") return json({ user: publicUser(me), serverTime: now });

  if (path === "/api/score" && method === "POST") {
    const body = await readJson(request);
    const score = Math.floor(Number(body.score));
    if (!Number.isFinite(score) || score < 0 || score > 10000000) throw new HttpError(400, "Bad score.");
    await env.DB.prepare("UPDATE users SET high_score=MAX(high_score,?) WHERE id=?").bind(score, me.id).run();
    return json({ high_score: Math.max(me.high_score, score), newRecord: score > me.high_score });
  }

  if (path === "/api/leaderboard" && method === "GET") {
    const top = await env.DB.prepare(
      "SELECT username, high_score FROM users WHERE high_score > 0 ORDER BY high_score DESC LIMIT 10"
    ).all();
    const duelists = await env.DB.prepare(
      "SELECT username, wins, losses, draws, best_duel_score FROM users WHERE wins > 0 ORDER BY wins DESC, losses ASC LIMIT 10"
    ).all();
    return json({ topScores: top.results, topDuelists: duelists.results });
  }

  if (path === "/api/players" && method === "GET") return listPlayers(env, me, now);
  if (path === "/api/poll" && method === "GET") return poll(env, me, now);
  if (path === "/api/duels" && method === "POST") return createDuel(env, request, me, now);

  const m = path.match(/^\/api\/duels\/(\d+)(?:\/(respond|cancel|ready|score))?$/);
  if (m) {
    const id = parseInt(m[1], 10);
    const action = m[2];
    if (!action && method === "GET") return getDuel(env, me, id, now);
    if (action === "respond" && method === "POST") return respondDuel(env, request, me, id, now);
    if (action === "cancel" && method === "POST") return cancelDuel(env, me, id, now);
    if (action === "ready" && method === "POST") return setReady(env, request, me, id, now);
    if (action === "score" && method === "POST") return postScore(env, request, me, id, now);
  }

  throw new HttpError(404, "Nothing here.");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        await ensureSchema(env.DB);
        return await handleApi(request, env, url);
      } catch (e) {
        if (e instanceof HttpError) return json({ error: e.message }, e.status);
        console.error("API error:", e);
        return json({ error: "Something went wrong on the ranch. Try again." }, 500);
      }
    }
    // everything else is the static site
    return env.ASSETS.fetch(request);
  },
};
