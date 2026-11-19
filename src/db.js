// Creates the tables the first time the Worker runs (safe to run every time).
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    username_lower TEXT NOT NULL UNIQUE,
    pass_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL DEFAULT 0,
    high_score INTEGER NOT NULL DEFAULT 0,
    best_duel_score INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    window_start INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS duels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenger_id INTEGER NOT NULL,
    opponent_id INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL,
    seed INTEGER NOT NULL,
    c_ready_at INTEGER NOT NULL DEFAULT 0,
    o_ready_at INTEGER NOT NULL DEFAULT 0,
    start_at INTEGER NOT NULL DEFAULT 0,
    c_score INTEGER NOT NULL DEFAULT 0,
    o_score INTEGER NOT NULL DEFAULT 0,
    c_final INTEGER NOT NULL DEFAULT 0,
    o_final INTEGER NOT NULL DEFAULT 0,
    winner_id INTEGER,
    c_notified INTEGER NOT NULL DEFAULT 1,
    o_notified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    finished_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_duels_challenger ON duels(challenger_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_duels_opponent ON duels(opponent_id, status)`,
];

let ready = null;

export function ensureSchema(db) {
  if (!ready) {
    ready = db
      .batch(SCHEMA.map((s) => db.prepare(s)))
      .catch((e) => {
        ready = null; // try again next request
        throw e;
      });
  }
  return ready;
}

export function resetSchemaCache() {
  ready = null;
}
