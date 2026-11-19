import { HttpError, json, readJson, randomInt31 } from "./util.js";
import { ONLINE_WINDOW_MS } from "./auth.js";

const READY_FRESH_MS = 30000; // a "ready" click stays valid this long (client re-sends it every ~10s)
const COUNTDOWN_MS = 6000; // time between both players ready and the duel starting
const FINISH_GRACE_MS = 12000; // after the clock runs out, wait this long for final scores
const PENDING_EXPIRE_MS = 3 * 86400000;
const LOBBY_EXPIRE_MS = 86400000;
export const DURATIONS = [30, 45, 60, 90, 120, 180, 240, 300];
const MAX_OPEN_OUTGOING = 10;

const DUEL_SELECT = `
  SELECT d.*, cu.username AS c_name, ou.username AS o_name,
         cu.last_seen AS c_seen, ou.last_seen AS o_seen
  FROM duels d
  JOIN users cu ON cu.id = d.challenger_id
  JOIN users ou ON ou.id = d.opponent_id`;

async function loadDuel(env, id) {
  return env.DB.prepare(`${DUEL_SELECT} WHERE d.id = ?`).bind(id).first();
}

const fresh = (ts, now) => ts > 0 && now - ts < READY_FRESH_MS;
const isOnline = (seen, now) => now - seen < ONLINE_WINDOW_MS;

// Starts the duel when both are ready, or finishes it when the time is up.
async function advance(env, d, now) {
  if (d.status === "accepted" && fresh(d.c_ready_at, now) && fresh(d.o_ready_at, now)) {
    await env.DB.prepare("UPDATE duels SET status='live', start_at=?, updated_at=? WHERE id=? AND status='accepted'")
      .bind(now + COUNTDOWN_MS, now, d.id)
      .run();
    return loadDuel(env, d.id);
  }
  if (d.status === "live") {
    const endAt = d.start_at + d.duration * 1000;
    const bothFinal = d.c_final && d.o_final;
    if (bothFinal || now > endAt + FINISH_GRACE_MS) {
      let winner = null;
      if (d.c_score > d.o_score) winner = d.challenger_id;
      else if (d.o_score > d.c_score) winner = d.opponent_id;
      const res = await env.DB.prepare(
        "UPDATE duels SET status='finished', winner_id=?, finished_at=?, updated_at=? WHERE id=? AND status='live'"
      )
        .bind(winner, now, now, d.id)
        .run();
      if (res.meta.changes === 1) {
        const stmts = [];
        const upd = (col, uid, score) =>
          env.DB.prepare(`UPDATE users SET ${col}=${col}+1, best_duel_score=MAX(best_duel_score,?) WHERE id=?`).bind(score, uid);
        if (winner === null) {
          stmts.push(upd("draws", d.challenger_id, d.c_score), upd("draws", d.opponent_id, d.o_score));
        } else {
          const loser = winner === d.challenger_id ? d.opponent_id : d.challenger_id;
          stmts.push(
            upd("wins", winner, winner === d.challenger_id ? d.c_score : d.o_score),
            upd("losses", loser, loser === d.challenger_id ? d.c_score : d.o_score)
          );
        }
        await env.DB.batch(stmts);
      }
      return loadDuel(env, d.id);
    }
  }
  return d;
}

function view(d, me, now) {
  const mine = d.challenger_id === me.id;
  const side = (p) => ({
    username: p === "c" ? d.c_name : d.o_name,
    score: p === "c" ? d.c_score : d.o_score,
    final: !!(p === "c" ? d.c_final : d.o_final),
    ready: fresh(p === "c" ? d.c_ready_at : d.o_ready_at, now),
    online: isOnline(p === "c" ? d.c_seen : d.o_seen, now),
  });
  const you = side(mine ? "c" : "o");
  const opponent = side(mine ? "o" : "c");
  let result = null;
  if (d.status === "finished") {
    result = d.winner_id === null ? "draw" : d.winner_id === me.id ? "win" : "loss";
  }
  return {
    id: d.id,
    status: d.status,
    duration: d.duration,
    seed: d.seed,
    start_at: d.start_at,
    serverTime: now,
    youAreChallenger: mine,
    you,
    opponent,
    result,
    finished_at: d.finished_at,
    created_at: d.created_at,
  };
}

function requireParticipant(d, me) {
  if (!d || (d.challenger_id !== me.id && d.opponent_id !== me.id)) throw new HttpError(404, "No such duel.");
}

export async function listPlayers(env, me, now) {
  const { results } = await env.DB.prepare(
    "SELECT username, last_seen FROM users WHERE id != ? ORDER BY last_seen DESC, username_lower LIMIT 1000"
  )
    .bind(me.id)
    .all();
  return json({
    players: results.map((r) => ({ username: r.username, online: isOnline(r.last_seen, now) })),
  });
}

export async function createDuel(env, request, me, now) {
  const body = await readJson(request);
  const name = typeof body.opponent === "string" ? body.opponent.trim() : "";
  const duration = Number(body.duration);
  if (!name) throw new HttpError(400, "Pick who you want to duel.");
  if (!DURATIONS.includes(duration)) throw new HttpError(400, "Pick a duel length from the list.");

  const opp = await env.DB.prepare("SELECT id, username, last_seen FROM users WHERE username_lower=?")
    .bind(name.toLowerCase())
    .first();
  if (!opp) throw new HttpError(404, "No gunslinger by that name in these parts.");
  if (opp.id === me.id) throw new HttpError(400, "You can't duel yourself, partner.");

  const open = await env.DB.prepare(
    `SELECT id FROM duels WHERE status IN ('pending','accepted','live')
       AND ((challenger_id=?1 AND opponent_id=?2) OR (challenger_id=?2 AND opponent_id=?1)) LIMIT 1`
  )
    .bind(me.id, opp.id)
    .first();
  if (open) throw new HttpError(409, `You already have an open duel with ${opp.username}.`);

  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM duels WHERE challenger_id=? AND status='pending'"
  )
    .bind(me.id)
    .first();
  if (count.n >= MAX_OPEN_OUTGOING) throw new HttpError(429, "Too many open challenges. Cancel a few first.");

  const res = await env.DB.prepare(
    `INSERT INTO duels(challenger_id,opponent_id,duration,status,seed,c_notified,o_notified,created_at,updated_at)
     VALUES(?,?,?,?,?,1,0,?,?)`
  )
    .bind(me.id, opp.id, duration, "pending", randomInt31(), now, now)
    .run();
  return json(
    { id: res.meta.last_row_id, opponent: opp.username, opponentOnline: isOnline(opp.last_seen, now), duration },
    201
  );
}

export async function respondDuel(env, request, me, id, now) {
  const body = await readJson(request);
  const d = await loadDuel(env, id);
  requireParticipant(d, me);
  if (d.opponent_id !== me.id) throw new HttpError(403, "That challenge isn't for you.");
  if (d.status !== "pending") throw new HttpError(409, "That challenge isn't open any more.");
  const accept = body.accept === true;
  await env.DB.prepare("UPDATE duels SET status=?, c_notified=0, updated_at=? WHERE id=? AND status='pending'")
    .bind(accept ? "accepted" : "declined", now, id)
    .run();
  return json({ duel: view(await loadDuel(env, id), me, now) });
}

export async function cancelDuel(env, me, id, now) {
  const d = await loadDuel(env, id);
  requireParticipant(d, me);
  const okPending = d.status === "pending" && d.challenger_id === me.id;
  const okAccepted = d.status === "accepted";
  if (!okPending && !okAccepted) throw new HttpError(409, "This duel can't be called off now.");
  await env.DB.prepare("UPDATE duels SET status='cancelled', updated_at=? WHERE id=? AND status IN ('pending','accepted')")
    .bind(now, id)
    .run();
  return json({ ok: true });
}

export async function setReady(env, request, me, id, now) {
  const body = await readJson(request);
  let d = await loadDuel(env, id);
  requireParticipant(d, me);
  if (d.status === "accepted") {
    const col = d.challenger_id === me.id ? "c_ready_at" : "o_ready_at";
    await env.DB.prepare(`UPDATE duels SET ${col}=?, updated_at=? WHERE id=? AND status='accepted'`)
      .bind(body.ready === false ? 0 : now, now, id)
      .run();
    d = await advance(env, await loadDuel(env, id), now);
  }
  return json({ duel: view(d, me, now) });
}

export async function getDuel(env, me, id, now) {
  let d = await loadDuel(env, id);
  requireParticipant(d, me);
  d = await advance(env, d, now);
  return json({ duel: view(d, me, now) });
}

export async function postScore(env, request, me, id, now) {
  const body = await readJson(request);
  let d = await loadDuel(env, id);
  requireParticipant(d, me);
  const score = Math.floor(Number(body.score));
  if (!Number.isFinite(score) || score < 0 || score > 5000000) throw new HttpError(400, "Bad score.");
  const wantsFinal = body.final === true;

  if (d.status === "live") {
    const endAt = d.start_at + d.duration * 1000;
    if (now >= d.start_at - 2000 && now <= endAt + FINISH_GRACE_MS - 2000) {
      const cs = d.challenger_id === me.id ? "c_score" : "o_score";
      const cf = d.challenger_id === me.id ? "c_final" : "o_final";
      await env.DB.prepare(
        `UPDATE duels SET ${cs}=MAX(${cs},?), ${cf}=MAX(${cf},?), updated_at=? WHERE id=? AND status='live'`
      )
        .bind(score, wantsFinal ? 1 : 0, now, id)
        .run();
    }
    d = await advance(env, await loadDuel(env, id), now);
  }
  return json({ duel: view(d, me, now) });
}

export async function poll(env, me, now) {
  // tidy up stale things that involve this player
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE duels SET status='expired', updated_at=?1 WHERE status='pending' AND created_at<?2 AND (challenger_id=?3 OR opponent_id=?3)"
    ).bind(now, now - PENDING_EXPIRE_MS, me.id),
    env.DB.prepare(
      "UPDATE duels SET status='expired', updated_at=?1 WHERE status='accepted' AND updated_at<?2 AND (challenger_id=?3 OR opponent_id=?3)"
    ).bind(now, now - LOBBY_EXPIRE_MS, me.id),
  ]);

  const { results } = await env.DB.prepare(
    `${DUEL_SELECT}
     WHERE (d.challenger_id=?1 OR d.opponent_id=?1) AND d.status IN ('pending','accepted','live')
     ORDER BY d.id DESC LIMIT 50`
  )
    .bind(me.id)
    .all();

  const incoming = [];
  const outgoing = [];
  const lobbies = [];
  const notices = [];
  const noticeIds = [];

  for (let d of results) {
    if (d.status === "live") d = await advance(env, d, now);
    if (d.status === "accepted") d = await advance(env, d, now);
    const mine = d.challenger_id === me.id;
    const v = view(d, me, now);
    if (d.status === "pending") {
      if (mine) {
        outgoing.push({ id: d.id, to: d.o_name, duration: d.duration, online: v.opponent.online, created_at: d.created_at });
      } else {
        incoming.push({ id: d.id, from: d.c_name, duration: d.duration, online: v.opponent.online, created_at: d.created_at });
        if (!d.o_notified) {
          notices.push({ type: "request", duelId: d.id, from: d.c_name, duration: d.duration });
          noticeIds.push(["o_notified", d.id]);
        }
      }
    } else if (d.status === "accepted" || d.status === "live") {
      if (d.status === "live") {
        const endAt = d.start_at + d.duration * 1000;
        if (now > endAt + FINISH_GRACE_MS) continue;
      }
      lobbies.push(v);
    }
  }

  // answers to challenges I sent (accepted / declined) that I haven't been told about yet
  const answers = await env.DB.prepare(
    `${DUEL_SELECT} WHERE d.challenger_id=? AND d.c_notified=0 AND d.status IN ('accepted','declined','live','finished') LIMIT 20`
  )
    .bind(me.id)
    .all();
  for (const d of answers.results) {
    notices.push({
      type: d.status === "declined" ? "declined" : "accepted",
      duelId: d.id,
      from: d.o_name,
      duration: d.duration,
    });
    noticeIds.push(["c_notified", d.id]);
  }

  if (noticeIds.length) {
    await env.DB.batch(noticeIds.map(([col, id]) => env.DB.prepare(`UPDATE duels SET ${col}=1 WHERE id=?`).bind(id)));
  }

  const recent = await env.DB.prepare(
    `${DUEL_SELECT}
     WHERE (d.challenger_id=?1 OR d.opponent_id=?1) AND d.status='finished'
     ORDER BY d.finished_at DESC LIMIT 8`
  )
    .bind(me.id)
    .all();

  const fresh_me = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(me.id).first();

  return json({
    serverTime: now,
    me: {
      username: fresh_me.username,
      high_score: fresh_me.high_score,
      best_duel_score: fresh_me.best_duel_score,
      wins: fresh_me.wins,
      losses: fresh_me.losses,
      draws: fresh_me.draws,
    },
    incoming,
    outgoing,
    lobbies,
    notices,
    recent: recent.results.map((d) => {
      const v = view(d, me, now);
      return {
        id: d.id,
        opponent: v.opponent.username,
        yourScore: v.you.score,
        theirScore: v.opponent.score,
        result: v.result,
        duration: d.duration,
        finished_at: d.finished_at,
      };
    }),
  });
}
