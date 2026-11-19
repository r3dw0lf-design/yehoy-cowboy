# Dusty Gulch Showdown

Retro 80s cowboy bird-shooting game. Global accounts, high scores and live 1v1 duels.
Runs entirely on Cloudflare: a Worker (the server) + D1 (the global database) + static files.

## Deploy (about 5 minutes)

You need Node.js 18+ and a free Cloudflare account.

```bash
npm install
npx wrangler login
npx wrangler d1 create dusty-gulch-db
```

The last command prints a `database_id`. Paste it into `wrangler.jsonc`
(replace `PASTE-YOUR-DATABASE-ID-HERE`), then:

```bash
npx wrangler deploy
```

That's it. Wrangler prints your live URL (`https://dusty-gulch-showdown.<you>.workers.dev`).
The database tables are created automatically the first time anyone opens the site.

Try it locally first with `npx wrangler dev` (uses a local test database).

## How it works

| Piece | File |
|---|---|
| Router + static site fallthrough | `src/worker.js` |
| Sign up / login / sessions | `src/auth.js` |
| Duels (requests, lobby, live scores) | `src/duels.js` |
| Database tables (auto-created) | `src/db.js` |
| Game engine | `public/js/game.js` |
| Birds + desert scene (drawn in code) | `public/js/sprites.js`, `scene.js` |
| Music + sound effects | `public/js/sfx.js`, `public/audio/*.mp3` |
| Screens and flow | `public/js/app.js` |

- **Usernames are globally unique** (case-insensitive): enforced by a database UNIQUE constraint.
- **Passwords** are salted + hashed (PBKDF2). Logins are rate-limited. Sessions are HttpOnly cookies.
- **Music**: `menu.mp3` = menus, `single.mp3` = single player, `duel.mp3` = lobby + duels.
  Swap the files in `public/audio/` to change tracks (keep the names).
- **Duels** use the same random bird pattern for both players (shared seed + synced clock), poll the server about once a second for the rival's live score, and the server decides the winner.

## Notes

- If sign-up/login ever shows Cloudflare error 1102 on the free Workers plan, lower
  `PBKDF2_ITERATIONS` in `src/auth.js` (e.g. to 50000).
- Scores are reported by the player's browser, so a determined cheater could fake one.
  Fine for a friends game; a competitive public game would need server-side validation.
- The page uses Google Fonts (Press Start 2P, Rye) for the retro look; it falls back to a monospace font if blocked.
