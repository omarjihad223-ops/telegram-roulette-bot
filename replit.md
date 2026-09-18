# Bounty Rush Roulette

An Iraqi Arabic Telegram Mini App and bot, imported from the user's existing roulette bot. The original user, prize, inventory, forced-subscription, referral, store and administration flows are retained. The design is inspired by One Piece Bounty Rush.

## Run & verify

- `pnpm --filter @workspace/api-server run dev` — API service (use its managed workflow).
- `pnpm --filter @workspace/bounty-roulette run dev` — frontend (use its managed workflow).
- `pnpm run typecheck` — workspace type checking.
- `pnpm --filter @workspace/api-server test:roulette` — focused offline roulette regressions.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate the public-preview contract.

## Existing database and bot — protect live data

- **Use the existing MongoDB in `MONGODB_URI`; do not migrate to the scaffold's PostgreSQL database.**
- `BOT_TOKEN` and `MONGODB_URI` are Replit Secrets. Never print them, Telegram initData, or connection errors containing credentials.
- Preserve the URI's database name. Do not seed, reset, deduplicate, migrate, build indexes, or change existing prizes/forced chats automatically.
- The preview is deliberately read-only. `GAMEPLAY_ENABLED`, `BOT_POLLING_ENABLED` and `BACKGROUND_JOBS_ENABLED` all default to `false`. Mongo automatic index/collection creation is disabled.
- Do not enable polling while the user's original host is still polling with this token. Do not delete webhooks, replace Telegram menus, or send test messages without agreement.
- `OWNER_ID` is the owner's numeric Telegram ID, not recoverable from the bot token. A zero/missing ID disables gameplay and does not grant ownership.
- Before activating: obtain the owner's ID, confirm the cutover from the old host, set the published HTTPS `MINI_APP_URL`, and confirm any previous `MINI_APP_SHORT_NAME`, support/delivery/escalation configuration. Then enable gameplay and, for the single bot host, polling/background jobs.
- Publishing the new code alone does not change BotFather's Mini App URL or move traffic from the original host.
- On Replit, use Reserved VM for the polling bot. Keep development gameplay/polling/background jobs disabled; enable live operation only in production. First publish to obtain the actual HTTPS URL, then configure `MINI_APP_URL` and activate the single production bot instance after the old instance stops. Republish to apply production environment changes.
- `WEBAPP_SECRET` was unused in the uploaded code. Authentication continues to verify Telegram-signed initData with the bot token; no replacement auth system is introduced.
- MongoDB transactions require a replica set or sharded cluster. Do not weaken atomic prize/cooldown updates for standalone MongoDB; return an error without consuming a spin.
- Current read-only connection verification confirmed transaction capability. No live spins or other write-based tests were run.

## Code map

- `artifacts/api-server/src/roulette/` — original bot's controllers, services and Mongo models.
- `artifacts/api-server/src/index.ts` — managed startup, read-only connectivity and explicit cutover switches.
- `artifacts/bounty-roulette/src/` — original Mini App's pages, reel logic and restyled UI.
- `artifacts/bounty-roulette/src/styles/theme.css` — visual theme.
- `lib/api-spec/openapi.yaml` — public showcase/health contract. Existing authenticated endpoints preserve the imported client/server contracts.
- `artifacts/mockup-sandbox/` — unrelated existing canvas scaffold; not the deployed Mini App.

## Product invariants

- An exhausted active prize stays visible but cannot be selected.
- The pointer, server response, inventory and history must refer to the exact same award; never substitute a different prize card or overwrite a random card.
- Persist cooldown, stock reservation, points, spin record, award and claim task atomically. Send notifications after commit.
- Preserve the existing policy that store purchases and referral rewards do not consume roulette stock.
- Preserve existing admin permissions and forced-subscription/captcha gates. Public preview must not create a fake player, bypass gates, award prizes or expose private user data.
- Do not test destructive admin actions or real prize consumption against the user's live database.