# Kiln Watcher plan

Oct 28, 2026 · Miso · source: [Claude Doc](https://claude.ai/artifact/GAEp17qGUhpAcWm39gBmhq)

## Architecture

The device pushes readings and the site pulls the latest one; the site never calls the Arduino directly. The ESP32 wakes every 3–6 hours (or on a button press) and POSTs a median reading to the API. The API stores it in Upstash Redis. Visitors load a Next.js page that fetches the latest status from the same app and shows it with its age.

```
ESP32 + HC-SR04 --POST /api/readings--> Next.js API (Vercel) <--> Upstash Redis
                                              ^
                          Browser --GET /api/status, /api/history--+
```

Only the device writes and only the API touches Redis; the browser never talks to the device or the database.

## Stack and hosting

Everything is one TypeScript repo, one deploy and one origin (no CORS), with no card required.

| Layer | Choice | Host / cost |
| --- | --- | --- |
| Frontend | Next.js (React + TypeScript), responsive, mobile-first | Vercel Hobby, free (personal, non-commercial use) |
| Backend | Next.js route handlers in the same app | Vercel, free |
| Datastore | Upstash Redis, added via Vercel's integration | Upstash free tier |
| Device | ESP32 + HC‑SR04, about 50 cm from the kiln | Details in a separate session |

## Kiln states

The kiln is a top-loader, so the sensor looks down at it and each state is a band of distance. Thresholds are placeholders until real readings are taken after mounting.

| State | `state` value | What the sensor sees | Distance band (placeholder) | Message (draft) |
| --- | --- | --- | --- | --- |
| Closed | `CLOSED` | The lid (nearest surface) | distance < `T_LID` | Kiln closed |
| Open, full | `OPEN_FULL` | The top of the ware | `T_LID` ≤ distance < `T_EMPTY` | Kiln open — loaded |
| Open, empty | `OPEN_EMPTY` | The kiln floor (farthest surface) | distance ≥ `T_EMPTY` | Kiln open — empty |

The backend also returns two non-kiln outcomes: `UNKNOWN` when the reading is unreliable ("Unclear reading") and a `stale` flag when the sensor has gone quiet ("Sensor offline").

Open question: where the hinged lid sits when open. If it stands upright under the sensor's beam, the mount position needs to avoid it.

## API contract

Four endpoints, all in the Next.js app. The server adds every timestamp, since the device has no reliable clock.

| Endpoint | Caller | Purpose | Responses |
| --- | --- | --- | --- |
| `POST /api/readings` | Device | Store a new reading | `204`; `401` bad key; `400` invalid body |
| `GET /api/status` | Frontend | Latest reading, interpreted | `200` with status JSON |
| `GET /api/history?limit=N` | Frontend | Recent readings, newest first | `200` with a list |
| `GET /api/health` | Monitoring | Liveness check | `200` |

**`POST /api/readings`** — header `Authorization: Bearer <DEVICE_KEY>`:

```json
{ "deviceId": "kiln-1", "distanceMm": 482, "spreadMm": 6, "validSamples": 14,
  "intervalSec": 14400, "trigger": "timer" }
```

`trigger` is `"timer"` or `"button"`.

**`GET /api/status`**:

```json
{ "message": "Kiln open — loaded", "state": "OPEN_FULL", "distanceMm": 482,
  "measuredAt": "2026-10-28T05:40:00Z", "ageSeconds": 5400, "stale": false,
  "reliable": true, "trigger": "timer" }
```

**`GET /api/history?limit=N`** — default 20, max 500:

```json
{ "readings": [
  { "state": "OPEN_FULL", "distanceMm": 482, "reliable": true,
    "measuredAt": "2026-10-28T05:40:00Z", "trigger": "timer" } ] }
```

History entries carry the state computed when the reading arrived. If thresholds change later, old entries keep their original state; the raw `distanceMm` stays available to recompute.

## Storage, configuration and repo layout

Each POST makes three Redis commands, so a few hundred commands a month at 4–8 readings a day — far inside Upstash's free tier.

| Key | Type | Contents |
| --- | --- | --- |
| `kiln:latest` | String (JSON) | The newest reading plus its computed state |
| `kiln:history` | List | Readings newest first, written with `LPUSH` then `LTRIM 0 499` (about 2–4 months at this interval) |

| Environment variable | Purpose |
| --- | --- |
| `DEVICE_KEY` | Shared secret the device sends as a bearer token |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash credentials, injected by the Vercel integration |
| `T_LID`, `T_EMPTY` | State thresholds in mm (placeholders until calibrated) |

```
app/
  page.tsx                status card + history list
  api/readings/route.ts   POST from device
  api/status/route.ts     GET latest status
  api/history/route.ts    GET recent readings
  api/health/route.ts
lib/
  types.ts                shared Reading / Status / KilnState types
  state.ts                distance → state → message mapping
  redis.ts                Upstash client
```

## Backend logic and frontend behaviour

The backend turns raw readings into a ready-to-show status; the frontend only displays it.

**Backend**

- **State mapping** in `lib/state.ts` compares `distanceMm` with `T_LID` and `T_EMPTY`, so thresholds change by config, not by reflashing the device.
- **Reliability**: too few `validSamples` or too large a `spreadMm` sets `reliable: false` and state `UNKNOWN`. Exact cut-offs are set during calibration.
- **Staleness**: no reading within about 2× `intervalSec` sets `stale: true`.
- **History**: every accepted reading is pushed to `kiln:history` with its computed state.

**Frontend**

- One status card: message, distance, and "Measured 2 h ago" (or "Updated manually" for button readings).
- A short history list under the card, showing recent readings with state and time.
- Fetches on load and refreshes every few minutes while the tab is visible.
- Clear loading, "Sensor offline" and "Unclear reading" states.
- Single-column layout that works from phone to desktop.

## Flags, open items and build order

Two device facts shape the webapp; everything else about the Arduino is deferred to a separate session.

- **Hot-kiln readings**: with no temperature compensation, hot air makes readings a few cm short. Leave margin between `T_LID` and `T_EMPTY`. When the lid is closed during firing, the lid band should still hold.
- **Device timeout**: the device should allow a 15–30 s HTTP timeout to cover the occasional cold start.

**Open items**

- [ ] Calibrate `T_LID` and `T_EMPTY` from real readings after mounting
- [ ] Set the reliability cut-offs for `validSamples` and `spreadMm`
- [ ] Confirm the open lid stays out of the sensor's beam
- [ ] Final wording of the state messages

**Build order**

1. Create the Next.js app on Vercel and add Upstash through the integration.
2. Write the route handlers and shared types, then test with `curl` and fake readings.
3. Build the status card and history list, including the offline and unclear states.
4. Calibrate thresholds once the sensor is mounted.
5. Connect the ESP32 (separate session).
