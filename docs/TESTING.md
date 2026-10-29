# Testing

Most of the confidence comes from fast unit tests of pure domain logic, plus handler tests that run real `Request` objects through an in-memory store. A small number of opt-in checks talk to real Redis or a running server. `npm test` never touches the network or production data.

## Principles

1. **Test behaviour through public functions.** Assert on what a caller sees: a return value, a `Response` status and body, or rendered text. Don't assert on internals or private helpers.
2. **Deterministic by construction.** Time comes in as `now`, config as an object and storage as a `ReadingStore`. No test reads `process.env`, calls `Date.now()`, sleeps or depends on test order.
3. **No network in `npm test`.** Anything that needs Redis or a server runs under a separate script and is skipped by default.
4. **Production data is never written by tests or local development.** Local runs use `KEY_PREFIX=dev:kiln:`. Integration tests use a unique `test:<random>:` prefix and delete their keys afterwards. Checks against the deployed site are read-only, or send requests that are rejected before anything is stored.
5. **Boundaries are tested as tables.** Every threshold gets a value just below it, exactly on it and just above it. That covers `T_LID`, `T_EMPTY` and the 24-hour offline limit. Use `test.each`.
6. **Every bug fix starts with a failing test** that reproduces it.
7. **Thresholds are placeholders, so tests don't hard-code them.** Tests build their own config, such as `{ tLid: 300, tEmpty: 700, … }`. Calibrating the real values later changes no tests.
8. **Tests sit next to the code they cover:** `lib/domain/state.ts` → `lib/domain/state.test.ts`.
9. **At least 90% coverage.** Lines, branches, functions and statements are each held at 90% or more by `npm run test:coverage`, which fails below that. Coverage is a floor, not the goal. A test that runs code without asserting its behaviour doesn't count.
10. **Keep tests small and readable.** Use one behaviour per test, a name that states it ("returns OFFLINE when the last reading is older than 2× interval"), and builders such as `makeReading({ distanceMm: 482 })` instead of repeated literals.

## Layers

| Layer | What it covers | Tools | Runs in |
| --- | --- | --- | --- |
| Unit (domain) | `parseReadingInput`, `classify`, `toStatus` (never, fresh, exactly 24 h, older), `toDisplayState`, copy table | Vitest, node environment | `npm test` |
| Handler | `postReading` and `getStatus`: auth (`401`), validation (`400`), `204` on success, which keys are written, OFFLINE with no data, status JSON shape | Vitest, real `Request`, in-memory store, fixed clock | `npm test` |
| Component | `StatusCard` renders the right word, line, colour and icon for each display state. `StatusView` switches to OFFLINE when stale | Vitest with jsdom and Testing Library (added in step 3) | `npm test` |
| Store integration | The Redis `ReadingStore` matches the in-memory one: round trip, `LPUSH`/`LTRIM` cap | Vitest with real Upstash and a unique key prefix | `npm run test:integration` (needs `.env.local`) |
| Smoke | A running server answers correctly end to end | `scripts/smoke.sh <base-url>` using `curl` | By hand: locally after changes, against production after deploys |
| Visual | The page matches `docs/design/screens/*.png` | Manual comparison at 390 px and 1280 px wide | By hand in step 3 |

### Store contract

The in-memory and Redis stores must behave identically. One shared test suite, `store.contract.ts`, runs against both. The in-memory version runs in `npm test` and the Redis version in `npm run test:integration`. That way the fast tests aren't relying on a fake that has drifted from Redis.

### Smoke checks

| Target | Checks |
| --- | --- |
| Local (`http://localhost:3000`, `KEY_PREFIX=dev:kiln:`) | `GET /api/health` is 200. `POST` without a key is 401. `POST` with a bad body is 400. `POST` with a valid reading is 204. `GET /api/status` reflects that reading |
| Production | `GET /api/health` is 200. `POST` without a key is 401. `POST` with the key and an invalid body is 400 (nothing is stored). `GET /api/status` is 200. **Never a valid reading**, because that would change what visitors see |

## Coverage

Coverage is measured with V8 over `app/**` and `lib/**`. A few files are excluded because they hold no logic or are covered by a different layer.

| Excluded | Why |
| --- | --- |
| `**/*.test.*`, `**/*.contract.ts` | Test code |
| `lib/domain/types.ts` | Types only; no runtime code |
| `app/api/**/route.ts` | One-line adapters to tested handlers; covered by smoke checks |
| `app/layout.tsx` | Font and metadata wiring only |
| `lib/server/redis.ts` | Real client and Redis store; covered by `test:integration` |
| `lib/server/deps.ts` | Production wiring (env, Redis, real clock); covered by smoke checks |

Adding to this list needs a reason in the table. Don't add a file to it just to get the build passing.

## Commands

| Command | Does |
| --- | --- |
| `npm test` | Unit, handler and component tests. Offline and fast |
| `npm run test:coverage` | The same tests with the 90% coverage gate |
| `npm run test:integration` | Store contract against real Upstash (opt-in) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Production build. Also catches `server-only` import mistakes |

**Before every push:** `npm run lint && npm run typecheck && npm run test:coverage && npm run build`. Vercel runs only the build, so the other checks are on us. Add a GitHub Actions workflow running the same four commands once there is enough code to make it worthwhile.

## Out of scope for now

- **Browser end-to-end tests** (Playwright). This is a one-page app with one interaction, so smoke checks plus component tests cover it. Revisit if the page grows.
- **Device firmware tests.** These belong to the ESP32 session.
