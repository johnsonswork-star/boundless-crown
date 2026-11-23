-- v27 shared zones. Region 0 (the kingdom castle) is never stored here.
-- Unowned land has no governing building; A hall is not auto-placed on claim; gov_hp/gov_max stay null until the owner pays and a builder finishes a Hall.

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
