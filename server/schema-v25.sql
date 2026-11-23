-- Additive v25 columns for nearby-realm summaries. Safe to re-run? SQLite may error if they exist.
ALTER TABLE kingdoms ADD COLUMN last_nights INTEGER NOT NULL DEFAULT 0;
ALTER TABLE kingdoms ADD COLUMN last_day INTEGER NOT NULL DEFAULT 1;
ALTER TABLE kingdoms ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0;

-- Rounded city-level cell only (never exact coordinates). Nullable when location was denied.
ALTER TABLE kingdoms ADD COLUMN cell_lat REAL;
ALTER TABLE kingdoms ADD COLUMN cell_lon REAL;
