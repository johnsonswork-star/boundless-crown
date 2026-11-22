-- Boundless Crown shared world + kingdom accounts. The world row is never deleted.

CREATE TABLE IF NOT EXISTS world (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  created_at INTEGER NOT NULL,
  spawn_count INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO world (id, created_at, spawn_count) VALUES (1, 0, 0);

CREATE TABLE IF NOT EXISTS kingdoms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  pass_salt TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  pass_iters INTEGER NOT NULL,
  spawn_x REAL NOT NULL,
  spawn_y REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  kingdom_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_kingdom ON sessions(kingdom_id);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS saves (
  kingdom_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
