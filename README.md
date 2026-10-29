# kiln-watcher

Shows whether a top-loading kiln is closed, open and full, or open and empty. An ESP32 with an HC-SR04 ultrasonic sensor posts distance readings to a Next.js app on Vercel, which stores them in Upstash Redis and serves a status page.

| Doc | Covers |
| --- | --- |
| [docs/PLAN.md](docs/PLAN.md) | Original plan: API contract, storage, build order |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | File layout, dependency rules, data flow, display states, config |
| [docs/TESTING.md](docs/TESTING.md) | Testing principles, layers and commands |
| [docs/design/README.md](docs/design/README.md) | Pastel Riso design: colours, type, copy, icons |
| [firmware/README.md](firmware/README.md) | Sensor firmware and its contract with the API |

## Status

| Build step | State |
| --- | --- |
| 1. Next.js app, Vercel project, Upstash integration | Done |
| 2. Route handlers and shared types, tested with `curl` | Done |
| 3. Status page (four display states) | Done |
| 4. Calibrate thresholds after mounting | Not started; thresholds are placeholders |
| 5. Sensor firmware (ESP32) | Planned in [firmware/PLAN.md](firmware/PLAN.md) |
| Later | History endpoint and list; reading tuning and unreliable-reading handling |

## How it works

```
ESP32 + HC-SR04 --POST /api/readings--> Next.js API (Vercel) <--> Upstash Redis
                                              ^
                          Browser --GET /api/status-------------+
```

The device wakes every 3–6 hours (or on a button press) and posts a median distance reading. The server timestamps it, maps it to a kiln state, stores it as `kiln:latest` and pushes it onto `kiln:history`, which is capped at 500 entries. The page shows the latest state and how old it is, or OFFLINE when it is stale. Only the API talks to Redis, and nothing calls the device.

### Kiln states

The sensor looks down into the kiln, so each state is a band of distance. `T_LID` and `T_EMPTY` are placeholders until real readings are taken after mounting.

| State | Sensor sees | Distance band |
| --- | --- | --- |
| `CLOSED` | The lid | `< T_LID` |
| `OPEN_FULL` | The top of the ware | `T_LID` to `T_EMPTY` |
| `OPEN_EMPTY` | The kiln floor | `≥ T_EMPTY` |

If no reading has ever arrived, or the latest is more than 24 hours old, the page shows OFFLINE. Threshold tuning and handling of unreliable readings come later; for now every reading counts. Display states and copy are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#display-states).

### API

| Endpoint | Caller | Purpose |
| --- | --- | --- |
| `POST /api/readings` | Device | Store a reading. Needs `Authorization: Bearer <DEVICE_KEY>`. Returns `204`, `401` for a bad key, `400` for a bad body, `503` if storage is down |
| `GET /api/status` | Frontend | Display state, design copy and the latest reading's details. Always `200` (OFFLINE when there is no recent reading); `503` if storage is down |
| `GET /api/history?limit=N` | Frontend | Deferred. Recent readings, newest first (default 20, max 500) |
| `GET /api/health` | Monitoring | Liveness check |

Example device request:

```sh
curl -X POST http://localhost:3000/api/readings \
  -H "Authorization: Bearer $DEVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"kiln-1","distanceMm":482,"spreadMm":6,"validSamples":14,"intervalSec":14400,"trigger":"timer"}'
```

Request and response shapes are defined in [lib/domain/types.ts](lib/domain/types.ts).

## Layout

`lib/domain` holds pure logic, `lib/server` holds I/O and wiring, and `app/` is a thin adapter layer. The full layout and import rules are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local development

```sh
npm install
cp .env.example .env.local   # or `vercel env pull .env.local` once linked
npm run dev                  # http://localhost:3000
npm test                     # unit + handler tests, offline
npm run test:coverage        # same, with the 90% gate
npm run test:integration     # store contract against real Upstash (needs .env.local)
scripts/smoke.sh http://localhost:3000 --write   # end-to-end checks against a running server
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
- [ ] Later: decide how to handle unreliable readings (`validSamples`, `spreadMm`).
- [ ] Confirm the open lid stays out of the sensor's beam.
- [ ] Hot-kiln readings run a few cm short, so leave margin between thresholds.
