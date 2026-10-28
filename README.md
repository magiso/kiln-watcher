# kiln-watcher

Shows whether a top-loading kiln is closed, open and full, or open and empty. An ESP32 with an HC-SR04 ultrasonic sensor posts distance readings to a Next.js app on Vercel, which stores them in Upstash Redis and serves a status page.

The full plan (architecture, API contract, states, build order) is in [docs/PLAN.md](docs/PLAN.md).

## Status

| Build step | State |
| --- | --- |
| 1. Next.js app, Vercel project, Upstash integration | Repo scaffolded; Vercel and Upstash setup still to do (see below) |
| 2. Route handlers and shared types, tested with `curl` | Types written; routes are stubs (`/api/health` works, the others return `501`) |
| 3. Status card and history list | Placeholder page |
| 4. Calibrate thresholds after mounting | Not started; thresholds are placeholders |
| 5. Connect the ESP32 | Separate session |

## How it works

```
ESP32 + HC-SR04 --POST /api/readings--> Next.js API (Vercel) <--> Upstash Redis
                                              ^
                          Browser --GET /api/status, /api/history--+
```

The device wakes every 3–6 hours (or on a button press) and posts a median distance reading. The server timestamps it, maps it to a kiln state, and stores it in Redis as `kiln:latest`. It also pushes it onto `kiln:history`, which is capped at 500 entries. The page shows the latest state and how old it is. Only the API talks to Redis, and nothing calls the device.

### Kiln states

The sensor looks down into the kiln, so each state is a band of distance. `T_LID` and `T_EMPTY` are placeholders until real readings are taken after mounting.

| State | Sensor sees | Distance band |
| --- | --- | --- |
| `CLOSED` | The lid | `< T_LID` |
| `OPEN_FULL` | The top of the ware | `T_LID` to `T_EMPTY` |
| `OPEN_EMPTY` | The kiln floor | `≥ T_EMPTY` |
| `UNKNOWN` | Too few valid samples or too much spread | — |

A reading older than about 2× its `intervalSec` is flagged `stale` ("Sensor offline").

### API

| Endpoint | Caller | Purpose |
| --- | --- | --- |
| `POST /api/readings` | Device | Store a reading. Needs `Authorization: Bearer <DEVICE_KEY>`. Returns `204`, `401` for a bad key, `400` for a bad body |
| `GET /api/status` | Frontend | Latest reading, interpreted |
| `GET /api/history?limit=N` | Frontend | Recent readings, newest first (default 20, max 500) |
| `GET /api/health` | Monitoring | Liveness check |

Example device request:

```sh
curl -X POST http://localhost:3000/api/readings \
  -H "Authorization: Bearer $DEVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"kiln-1","distanceMm":482,"spreadMm":6,"validSamples":14,"intervalSec":14400,"trigger":"timer"}'
```

Request and response shapes are defined in [lib/types.ts](lib/types.ts).

## Layout

```
app/
  page.tsx                 status card + history list
  api/readings/route.ts    POST from device
  api/status/route.ts      GET latest status
  api/history/route.ts     GET recent readings
  api/health/route.ts      liveness check
lib/
  types.ts                 shared Reading / Status / KilnState types
  state.ts                 distance → state → message mapping
  redis.ts                 Upstash client (created on first use)
docs/
  PLAN.md                  project plan
```

## Local development

```sh
npm install
cp .env.example .env.local   # or `vercel env pull .env.local` once linked
npm run dev                  # http://localhost:3000
npm test                     # vitest
npm run lint
npm run build
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DEVICE_KEY` | Shared secret the device sends as a bearer token |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash credentials, injected by the Vercel integration (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` also work) |
| `T_LID`, `T_EMPTY` | State thresholds in mm (placeholders until calibrated) |

All are server-only. Don't prefix them with `NEXT_PUBLIC_`.

### Notes for contributors

- This is Next.js 16, and it differs from older versions. Check the bundled docs in `node_modules/next/dist/docs/` before relying on older patterns (see [AGENTS.md](AGENTS.md)).
- Cache Components is on (`next.config.ts`). A `GET` route handler that reads no request data gets prerendered at build time. Routes that must run on each request should `await connection()` from `next/server` first.

## One-time hosting setup (manual)

1. Push this repo to GitHub, then import it as a new project in Vercel (Hobby plan).
2. In the Vercel project, open **Storage** (or **Integrations**) and add **Upstash Redis**. This injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Under **Settings → Environment Variables**, add `DEVICE_KEY`, a long random string such as the output of `openssl rand -hex 32`. You can also add `T_LID` and `T_EMPTY` there.
4. Locally: `npm i -g vercel && vercel link && vercel env pull .env.local`.

## Open items

- [ ] Calibrate `T_LID` and `T_EMPTY` from real readings after mounting. The placeholders (300 / 700 mm) assume the plan's example. A sensor mounted about 50 cm above a closed lid would need a higher `T_LID`.
- [ ] Set the reliability cut-offs for `validSamples` and `spreadMm`.
- [ ] Confirm the open lid stays out of the sensor's beam.
- [ ] Settle the final wording of the state messages.
- [ ] Hot-kiln readings run a few cm short, so leave margin between thresholds.
