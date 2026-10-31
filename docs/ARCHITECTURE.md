# Architecture

Kiln Watcher is a single Next.js app that serves both the API and the frontend from one deploy and one origin. Pure decision logic sits in `lib/domain`, everything that touches the outside world sits in `lib/server`, and `app/` is a thin layer that wires the two to HTTP and the browser. The rules below say what goes where and which way imports may point.

## Where the frontend lives

The frontend is the Next.js App Router UI in `app/`. There is no separate frontend project.

- `app/page.tsx` is the single page. It wraps `LiveStatus` in `<Suspense>`, as Cache Components requires for request-time data. `LiveStatus` reads the status through `lib/server` on the server, so the first paint already shows the right card without a client fetch. If storage is down, it renders OFFLINE with "Couldn't refresh".
- `app/_components/` holds the React components. The leading underscore makes it a private folder that Next.js never turns into a route.
- `StatusView` is the only client component. It re-fetches `/api/status` every 5 minutes while the tab is visible, and when the tab becomes visible again. There is no refresh button: readings only arrive every few hours, and the design dropped it. A failed refresh keeps the last status and shows "Couldn't refresh".
- `app/globals.css` holds the Tailwind setup and colour tokens. `app/layout.tsx` loads the fonts.

The API routes sit beside it in `app/api/`.

## File layout

```
app/
  layout.tsx                 fonts (Anton, DM Sans), metadata
  globals.css                Tailwind + Pastel Riso colour tokens
  page.tsx                   Suspense boundary around <LiveStatus>
  _components/
    LiveStatus.tsx           server: reads the status at request time (falls back to a retry state)
    StatusView.tsx           client: polling every 5 min while visible, refresh on tab return
    StatusCard.tsx           presentational: the card for a display state, mobile and desktop (props only)
    KilnIcon.tsx             inline SVG per display state (inline so multiply blend works)
  api/
    readings/route.ts        POST, device → server (thin adapter)
    status/route.ts          GET, page → server (thin adapter)
    health/route.ts          GET, liveness
    history/route.ts         deferred (stub)
lib/
  domain/                    pure: no I/O, no env, no clock, no Next.js imports
    types.ts                 ReadingInput, StoredReading, Status, KilnState, DisplayState
    reading.ts               parseReadingInput(unknown) → ok | error list
    state.ts                 classify(distanceMm, config) → KilnState
    status.ts                toStatus(latest | null, now, config) → Status (display state, copy, age)
    copy.ts                  design copy per display state
    format.ts                formatAge(seconds) → "3 h ago"
  server/                    I/O and wiring; starts with `import "server-only"`
    config.ts                reads and validates env once (thresholds, offline window, key prefix)
    auth.ts                  bearer token check (constant-time compare)
    store.ts                 ReadingStore interface + in-memory implementation
    store.contract.ts        shared behaviour tests for every ReadingStore
    redis.ts                 Upstash client (lazy) + Redis ReadingStore
    handlers.ts              postReading / getStatus / loadStatus (request, deps)
    deps.ts                  production wiring: config, Redis store, real clock
docs/                        plan, architecture, testing, design reference
firmware/                    ESP32 sensor code, PlatformIO (not deployed to Vercel)
public/icons/                design SVG exports (reference; the app inlines them)
scripts/
  smoke.sh                   curl checks against a running server
```

Tests sit next to the code they cover as `*.test.ts(x)`. See [TESTING.md](TESTING.md).

## Dependency rules

```
app/api/*/route.ts ──> lib/server ──> lib/domain
app/page.tsx ─────────> lib/server ──> lib/domain
app/_components ──────────────────────> lib/domain   (types and copy only)
```

1. **`lib/domain` imports nothing from the project.** It has no access to `process.env`, `Date.now()`, Redis or `fetch`. Inputs come in as arguments and outputs go out as return values. That makes it trivially testable.
2. **`lib/server` owns all I/O and configuration.** Each file starts with `import "server-only"`, so an accidental import from a client component fails the build.
3. **Route handlers are adapters.** A `route.ts` file only calls a handler with the default dependencies: `export const POST = (req: Request) => postReading(req, deps())`. The handler does parse → domain → store → respond. It never reads env or creates clients itself.
4. **Handlers take their dependencies as an argument:** `{ store, config, now }`. Production code passes the Redis store and `() => new Date()`. Tests pass an in-memory store and a fixed clock.
5. **Components are presentational.** `StatusCard` and `KilnIcon` render from props. Only `StatusView` holds state (polling and refresh). Components never fetch from Redis; they get data from `page.tsx` or `/api/status`.

## Data flow

1. The device sends `POST /api/readings`. The handler checks the bearer token (`401` on failure), parses the body (`400` on failure), stamps `measuredAt = now()`, classifies the reading and stores it.
2. **Storing a reading:** every accepted reading replaces `kiln:latest` and goes to the front of `kiln:history`, capped at 500 entries. `spreadMm` and `validSamples` are stored but not used yet.
3. `GET /api/status` reads `kiln:latest` and always returns `200` with `toStatus(latest, now)`. When there has never been a reading, it reports `OFFLINE` with null reading fields.
4. **Display state:**
   - No reading has ever arrived, or the latest is more than 24 hours old (`OFFLINE_AFTER_HOURS`) → `OFFLINE`.
   - Otherwise → the kiln state (`CLOSED`, `OPEN_FULL` or `OPEN_EMPTY`).

   The page renders the matching card, colour, icon and copy.

## Display states

| Display state | When | Card colour | Word | Line |
| --- | --- | --- | --- | --- |
| `CLOSED` | Fresh reading, distance `< T_LID` | `closed` | HOT. | The kiln is closed and firing. Look, don't touch. |
| `OPEN_FULL` | Fresh reading, `T_LID ≤ distance < T_EMPTY` | `full` | FULL. | The kiln is open and full. It'll be unloaded soon! |
| `OPEN_EMPTY` | Fresh reading, distance `≥ T_EMPTY` | `empty` | EMPTY. | All clear and ready for the next load. Shelve your pieces! |
| `OFFLINE` | No reading ever, or the latest is more than 24 h old | `offline` | OFFLINE. | Engineering troubleshooting required! |

`message` in the status API uses this design copy. The plan's draft messages are superseded.

## Configuration

All configuration is read and validated in `lib/server/config.ts`. Domain functions receive it as a plain object.

| Variable | Default | Meaning |
| --- | --- | --- |
| `DEVICE_KEY` | (required) | Bearer token the device sends |
| `KILN_STORAGE_KV_REST_API_URL` / `_TOKEN` | (required at runtime) | Upstash credentials. `KV_*` and `UPSTASH_REDIS_*` are also accepted |
| `T_LID`, `T_EMPTY` | 300, 700 | Thresholds in mm (placeholders) |
| `OFFLINE_AFTER_HOURS` | 24 | Show OFFLINE when the latest reading is older than this |
| `KEY_PREFIX` | `kiln:` | Redis key prefix. Set to `dev:kiln:` in `.env.local` so local runs never touch production keys |

## Deferred

These are not built yet. The structure above leaves room for each.

- **History endpoint and history list.** Readings are still written to `kiln:history`, so data accumulates. `GET /api/history` stays a stub and the page shows no list.
- **Reading quality and tuning.** Threshold calibration, reliability rules using `spreadMm` and `validSamples`, and the "Unclear reading" (`UNKNOWN`) display all come later. For now every accepted reading is treated as valid.
