# Boundless Crown server

Cloudflare Workers + D1 backend for **Endless** (Versus) mode. Challenge stays single-player and never talks to this API.

- Free Workers plan only (no Durable Objects, no paid features).
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
