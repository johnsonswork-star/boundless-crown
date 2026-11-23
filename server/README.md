# Boundless Crown server

Cloudflare Workers + D1 backend for **Endless** (Versus) mode. Challenge stays single-player and never talks to this API.

- Free Workers plan. Live rooms use SQLite-backed Durable Objects (allowed on free). Do not upgrade the account from these files.
- Passwords are PBKDF2-SHA-256 + unique salt, hashed in the Worker. They are never stored in plaintext and must never be committed.
- No API tokens, OAuth credentials, or `.dev.vars` belong in git. The client is given only a public URL.

## Public URLs

The same Worker source and the same D1 database are served at:

- `https://boundless-crown-api.pages.dev` — the URL the game client uses (one-label `pages.dev` host, reachable from more networks).
- `https://boundless-crown.johnsonswork.workers.dev` — also deployed, same API.

## Deploy

From this folder, with wrangler already logged in on the free account:

```
export WRANGLER_CACHE_DIR=/home/box/.cache/wrangler
npx wrangler d1 execute boundless-crown --remote --file=schema.sql
npx wrangler deploy
npx wrangler pages deploy public --project-name=boundless-crown-api --commit-dirty=true --branch=main
```

`public/_worker.js` is a symlink to `src/worker.js` (Pages advanced-mode entry).

## v25 realtime and city spawn

- `RegionRoom` is a SQLite-backed Durable Object (Workers Free allows this backend). WebSockets use the hibernation API.
- Signup may include `{ cell: { lat, lon } }` already snapped to 0.2°. The Worker re-snaps and stores only that cell plus the world spawn. It ignores any other location fields. If `cell` is omitted, spawn is random and no cell is stored.
- Realm lists and WebSocket presence never include the cell or any place name.

## QA cleanup (v26)

Smoke and Playwright accounts must use the `Qa` prefix (and a far test cell, not a real city). After a run, delete them from production D1 so the shared world stays empty:

```
export WRANGLER_CACHE_DIR=/home/box/.cache/wrangler
npx wrangler d1 execute boundless-crown --remote --command "SELECT name FROM kingdoms ORDER BY name;"
# then delete matching test rows (sessions and saves for those ids too). Never delete a kingdom you can confirm is a real player.
```

There is no separate test D1 in this step; prefer deleting `Qa*` afterwards over leaving leftovers in the live world.

## Shared zones (v27)
Endless kingdoms fight over the same land parcels. The D1 `zones` table (see `schema-v27.sql`) stores ownership, banner contests, governing-building HP, and a leftover-building snapshot. Region 0 (the kingdom castle) is never stored. Region rooms include nearby zones in the `hello` payload and relay `zpub` / `zact` / `zup` over the existing WebSocket. Wild land has no Hall; a Hall is paid and builder-built after a claim. Until a Hall stands, a rival can retake the owned zone with a banner. After it stands, the Hall must be destroyed to take the zone and leftover buildings.

