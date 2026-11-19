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

## Guns, shop and coins

- **Coins** come from playing: 1 coin per 10 points in single player; duels pay 50 (loss), 75 (draw) or 150 (win) plus points/20.
- **6 guns** (Old Reliable, Peacemaker, Widowmaker, Thunder Twin, Long Tom, Lucky Clover), each with its own design, stats and perk.
  Buy them in the GUN SHOP. Every player starts with Old Reliable.
- **Upgrade** each gun to level 5 (more fire rate, ammo, aim area, bonus points) and buy **skins** (Classic, Midnight, Gilded, Neon 85).
- **Duels:** in the lobby, a dropdown lists only the guns BOTH players own. Everyone uses the chosen gun at level-1 stats
  (fair fight); each player keeps their own skin.
- Prices, stats and perks all live in `public/js/guns.js` (shared by the game and the server). Edit it to rebalance.
- **Updating an existing deployment:** just redeploy. The database upgrades itself (adds `coins`, `equipped` and the gun tables)
  the first time someone opens the site. Existing accounts and scores are kept.

## How it works

| Piece | File |
|---|---|
| Router + static site fallthrough | `src/worker.js` |
| Sign up / login / sessions | `src/auth.js` |
| Duels (requests, lobby, live scores) | `src/duels.js` |
| Database tables (auto-created) | `src/db.js` |
| Gun shop / inventory / duel gun rules | `src/armory.js`, `src/duels.js` |
| Gun catalog (prices, stats, perks) | `public/js/guns.js` |
| Gun art + skins (drawn in code) | `public/js/guns-art.js` |
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
