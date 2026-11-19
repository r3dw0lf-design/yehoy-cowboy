async function req(method, path, body) {
  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    const e = new Error("Can't reach the server. Check your connection.");
    e.status = 0;
    throw e;
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const e = new Error((data && data.error) || "Request failed");
    e.status = res.status;
    throw e;
  }
  return data;
}

export const api = {
  signup: (username, password) => req("POST", "/signup", { username, password }),
  login: (username, password) => req("POST", "/login", { username, password }),
  logout: () => req("POST", "/logout"),
  me: () => req("GET", "/me"),
  score: (score) => req("POST", "/score", { score }),
  leaderboard: () => req("GET", "/leaderboard"),
  players: () => req("GET", "/players"),
  poll: () => req("GET", "/poll"),
  createDuel: (opponent, duration) => req("POST", "/duels", { opponent, duration }),
  respond: (id, accept) => req("POST", `/duels/${id}/respond`, { accept }),
  cancel: (id) => req("POST", `/duels/${id}/cancel`),
  ready: (id, ready) => req("POST", `/duels/${id}/ready`, { ready }),
  duel: (id) => req("GET", `/duels/${id}`),
  armory: () => req("GET", "/armory"),
  buy: (gun) => req("POST", "/shop/buy", { gun }),
  upgrade: (gun) => req("POST", "/shop/upgrade", { gun }),
  skin: (gun, skin) => req("POST", "/armory/skin", { gun, skin }),
  equip: (gun) => req("POST", "/armory/equip", { gun }),
  duelGun: (id, gun) => req("POST", `/duels/${id}/gun`, { gun }),
  duelScore: (id, score, final = false) => req("POST", `/duels/${id}/score`, { score, final }),
};
