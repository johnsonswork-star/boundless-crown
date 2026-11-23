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
  updated_at INTEGER NOT NULL,
  last_nights INTEGER NOT NULL DEFAULT 0,
  last_day INTEGER NOT NULL DEFAULT 1,
  last_seen INTEGER NOT NULL DEFAULT 0,
  cell_lat REAL,
  cell_lon REAL
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


-- Shared land parcels (v27). Region 0 (kingdom castle) is never stored here.
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL,
  region INTEGER NOT NULL,
  wx REAL NOT NULL,
  wy REAL NOT NULL,
  name TEXT,
  owner_id TEXT,
  owner_name TEXT,
  owner_color TEXT,
  state TEXT NOT NULL DEFAULT 'unowned',
  claim_from TEXT,
  claim_fails INTEGER NOT NULL DEFAULT 0,
  claimer_id TEXT,
  banner_hp REAL,
  banner_max REAL,
  gov_hp REAL,
  gov_max REAL,
  under_attack INTEGER NOT NULL DEFAULT 0,
  attacker_id TEXT,
  buildings TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS zones_home ON zones(home_id);
CREATE INDEX IF NOT EXISTS zones_pos ON zones(wx, wy);
