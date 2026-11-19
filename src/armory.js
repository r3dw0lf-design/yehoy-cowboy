import { HttpError, json, readJson } from "./util.js";
import { GUNS, GUN_ORDER, SKINS, MAX_LEVEL, upgradeCost } from "../public/js/guns.js";

async function ensureRifle(env, userId) {
  await env.DB.prepare("INSERT OR IGNORE INTO user_guns(user_id, gun_id) VALUES(?, 'rifle')").bind(userId).run();
}

async function getRows(env, userId) {
  await ensureRifle(env, userId);
  const { results } = await env.DB.prepare("SELECT * FROM user_guns WHERE user_id=?").bind(userId).all();
  return results;
}

// ids of every gun this player owns (everyone owns the rifle)
export async function ownedSet(env, userId) {
  const rows = await getRows(env, userId);
  return new Set(rows.map((r) => r.gun_id));
}

export async function armoryState(env, userId) {
  const user = await env.DB.prepare("SELECT coins, equipped FROM users WHERE id=?").bind(userId).first();
  const rows = await getRows(env, userId);
  const byId = Object.fromEntries(rows.map((r) => [r.gun_id, r]));
  return {
    coins: user.coins,
    equipped: byId[user.equipped] ? user.equipped : "rifle",
    guns: GUN_ORDER.filter((id) => byId[id]).map((id) => ({
      id,
      level: byId[id].level,
      skin: byId[id].skin,
      skins: byId[id].skins.split(","),
    })),
  };
}

async function spend(env, userId, amount) {
  if (amount <= 0) return;
  const res = await env.DB.prepare("UPDATE users SET coins=coins-? WHERE id=? AND coins>=?").bind(amount, userId, amount).run();
  if (res.meta.changes !== 1) throw new HttpError(402, "Not enough coins, partner.");
}
const refund = (env, userId, amount) =>
  env.DB.prepare("UPDATE users SET coins=coins+? WHERE id=?").bind(amount, userId).run();

function gunId(body) {
  const id = typeof body.gun === "string" ? body.gun : "";
  if (!GUNS[id]) throw new HttpError(400, "Unknown gun.");
  return id;
}

export async function getArmory(env, me) {
  return json(await armoryState(env, me.id));
}

export async function buyGun(env, request, me) {
  const id = gunId(await readJson(request));
  const price = GUNS[id].price;
  if (price <= 0) throw new HttpError(409, "You already own that one.");
  const rows = await getRows(env, me.id);
  if (rows.some((r) => r.gun_id === id)) throw new HttpError(409, "You already own that gun.");
  await spend(env, me.id, price);
  const res = await env.DB.prepare("INSERT OR IGNORE INTO user_guns(user_id, gun_id) VALUES(?, ?)").bind(me.id, id).run();
  if (res.meta.changes !== 1) {
    await refund(env, me.id, price);
    throw new HttpError(409, "You already own that gun.");
  }
  return json(await armoryState(env, me.id));
}

export async function upgradeGun(env, request, me) {
  const id = gunId(await readJson(request));
  const row = (await getRows(env, me.id)).find((r) => r.gun_id === id);
  if (!row) throw new HttpError(404, "You don't own that gun.");
  if (row.level >= MAX_LEVEL) throw new HttpError(409, "That gun is fully upgraded.");
  const cost = upgradeCost(id, row.level);
  await spend(env, me.id, cost);
  const res = await env.DB.prepare("UPDATE user_guns SET level=level+1 WHERE user_id=? AND gun_id=? AND level=?")
    .bind(me.id, id, row.level)
    .run();
  if (res.meta.changes !== 1) {
    await refund(env, me.id, cost);
    throw new HttpError(409, "Try that again.");
  }
  return json(await armoryState(env, me.id));
}

// pick a skin; if you don't own it yet it is bought first
export async function setSkin(env, request, me) {
  const body = await readJson(request);
  const id = gunId(body);
  const skin = typeof body.skin === "string" ? body.skin : "";
  if (!SKINS[skin]) throw new HttpError(400, "Unknown skin.");
  const row = (await getRows(env, me.id)).find((r) => r.gun_id === id);
  if (!row) throw new HttpError(404, "You don't own that gun.");
  const owned = row.skins.split(",");
  if (!owned.includes(skin)) {
    await spend(env, me.id, SKINS[skin].price);
    owned.push(skin);
  }
  await env.DB.prepare("UPDATE user_guns SET skin=?, skins=? WHERE user_id=? AND gun_id=?")
    .bind(skin, owned.join(","), me.id, id)
    .run();
  return json(await armoryState(env, me.id));
}

export async function equipGun(env, request, me) {
  const id = gunId(await readJson(request));
  if (!(await ownedSet(env, me.id)).has(id)) throw new HttpError(404, "You don't own that gun.");
  await env.DB.prepare("UPDATE users SET equipped=? WHERE id=?").bind(id, me.id).run();
  return json(await armoryState(env, me.id));
}
