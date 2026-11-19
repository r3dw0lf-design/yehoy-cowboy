import { HttpError, b64, unb64, hex, safeEqual, json, readJson } from "./util.js";

// Cloudflare Workers caps PBKDF2 at 100,000 iterations.
// If you ever see error 1102 (CPU limit) on the free plan during sign-up/login,
// lower this number (stored hashes remember the count they were made with).
const PBKDF2_ITERATIONS = 100000;

const SESSION_COOKIE = "ds_session";
const SESSION_DAYS = 30;
export const ONLINE_WINDOW_MS = 45000;

const enc = new TextEncoder();

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const hash = await derive(password, unb64(saltB64), parseInt(iter, 10));
  return safeEqual(hash, unb64(hashB64));
}

let dummyHash = null;

async function sha256Hex(text) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text))));
}

function parseCookies(request) {
  const out = {};
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function cookieHeader(request, value, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    high_score: u.high_score,
    best_duel_score: u.best_duel_score,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
  };
}

// ---- tiny rate limiter (stored in D1 so it works across all edge locations) ----
async function rateExceeded(db, key, max, windowMs, now) {
  const row = await db.prepare("SELECT count, window_start FROM rate_limits WHERE key=?").bind(key).first();
  if (!row) return false;
  if (now - row.window_start > windowMs) return false;
  return row.count >= max;
}

async function rateHit(db, key, windowMs, now) {
  await db
    .prepare(
      `INSERT INTO rate_limits(key,count,window_start) VALUES(?,1,?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN ?2 - window_start > ?3 THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN ?2 - window_start > ?3 THEN ?2 ELSE window_start END`
    )
    .bind(key, now, windowMs)
    .run();
}

async function createSession(env, request, userId, now) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").bind(
      tokenHash,
      userId,
      now + SESSION_DAYS * 86400000
    ),
  ]);
  return cookieHeader(request, token, SESSION_DAYS * 86400);
}

export async function authenticate(env, request, now) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token || token.length !== 64) return null;
  const tokenHash = await sha256Hex(token);
  const user = await env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(tokenHash, now)
    .first();
  if (!user) return null;
  // "online" presence, refreshed at most every 20s to keep database writes low
  if (now - user.last_seen > 20000) {
    await env.DB.prepare("UPDATE users SET last_seen=? WHERE id=?").bind(now, user.id).run();
    user.last_seen = now;
  }
  return user;
}

export function validateUsername(raw) {
  const username = typeof raw === "string" ? raw.trim() : "";
  if (username.length < 3 || username.length > 16)
    throw new HttpError(400, "Names must be 3 to 16 characters long.");
  if (!/^[A-Za-z0-9_]+$/.test(username))
    throw new HttpError(400, "Use only letters, numbers and underscores in your name.");
  return username;
}

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || "local";
}

export async function signup(env, request, now) {
  const body = await readJson(request);
  const username = validateUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 6) throw new HttpError(400, "Password needs at least 6 characters.");
  if (password.length > 100) throw new HttpError(400, "Password is too long (100 max).");

  const ipKey = `signup:${clientIp(request)}`;
  if (await rateExceeded(env.DB, ipKey, 10, 3600000, now))
    throw new HttpError(429, "Too many new accounts from your camp. Try again later.");

  const lower = username.toLowerCase();
  const taken = await env.DB.prepare("SELECT 1 AS x FROM users WHERE username_lower=?").bind(lower).first();
  if (taken) throw new HttpError(409, "That name's already taken. Pick another, partner.");

  const passHash = await hashPassword(password);
  let id;
  try {
    const res = await env.DB.prepare(
      "INSERT INTO users(username,username_lower,pass_hash,created_at,last_seen) VALUES(?,?,?,?,?)"
    )
      .bind(username, lower, passHash, now, now)
      .run();
    id = res.meta.last_row_id;
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message))) throw new HttpError(409, "That name's already taken. Pick another, partner.");
    throw e;
  }
  await rateHit(env.DB, ipKey, 3600000, now);
  const cookie = await createSession(env, request, id, now);
  const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
  return json({ user: publicUser(user) }, 201, { "set-cookie": cookie });
}

export async function login(env, request, now) {
  const body = await readJson(request);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) throw new HttpError(400, "Enter your name and password.");
  if (password.length > 100) throw new HttpError(401, "Wrong name or password.");

  const lower = username.toLowerCase();
  const key = `login:${clientIp(request)}:${lower}`;
  if (await rateExceeded(env.DB, key, 8, 600000, now))
    throw new HttpError(429, "Too many wrong tries. Cool your spurs for a few minutes.");

  const user = await env.DB.prepare("SELECT * FROM users WHERE username_lower=?").bind(lower).first();
  let ok = false;
  if (user) {
    ok = await verifyPassword(password, user.pass_hash);
  } else {
    // spend the same time whether or not the name exists
    dummyHash ||= await hashPassword("dummy-password");
    await verifyPassword(password, dummyHash);
  }
  if (!ok) {
    await rateHit(env.DB, key, 600000, now);
    throw new HttpError(401, "Wrong name or password.");
  }
  await env.DB.prepare("DELETE FROM rate_limits WHERE key=?").bind(key).run();
  const cookie = await createSession(env, request, user.id, now);
  await env.DB.prepare("UPDATE users SET last_seen=? WHERE id=?").bind(now, user.id).run();
  return json({ user: publicUser(user) }, 200, { "set-cookie": cookie });
}

export async function logout(env, request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(tokenHash).run();
  }
  return json({ ok: true }, 200, { "set-cookie": cookieHeader(request, "", 0) });
}
