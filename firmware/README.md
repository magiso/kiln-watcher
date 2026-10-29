# Sensor firmware

Code for the device that measures the kiln: an ESP32 with an HC-SR04 ultrasonic sensor, mounted about 50 cm from the top-loading kiln. It wakes every 3–6 hours, or when its button is pressed, takes a median distance reading and POSTs it to the web app.

The firmware is planned but not written yet. The hardware inventory, toolchain and file layout are decided in the hardware planning session.

## Contract with the web app

The device must follow this contract. The server side is defined in [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and [lib/domain/reading.ts](../lib/domain/reading.ts).

**Request:** `POST https://part-time-kiln-watcher.vercel.app/api/readings`, with `Authorization: Bearer <DEVICE_KEY>` and `Content-Type: application/json`.

```json
{ "deviceId": "kiln-1", "distanceMm": 482, "spreadMm": 6, "validSamples": 14,
  "intervalSec": 14400, "trigger": "timer" }
```

| Field | Rule |
| --- | --- |
| `deviceId` | String, 1–64 characters |
| `distanceMm` | Median distance in mm, 0–10000 |
| `spreadMm` | Spread of the samples in mm, ≥ 0 (stored; used later for reliability) |
| `validSamples` | Integer ≥ 0: samples that got an echo |
| `intervalSec` | Integer > 0: the device's current wake interval |
| `trigger` | `"timer"` or `"button"` |

**Responses:**

| Status | Meaning | Device should |
| --- | --- | --- |
| `204` | Stored | Sleep |
| `400` | Invalid body; `details` lists the problems | Log it. It's a firmware bug, so don't retry |
| `401` | Wrong or missing key | Log it, don't retry |
| `500`, `503` or a timeout | Server or storage problem | Retry a couple of times with backoff, then sleep |

The server adds the timestamp, so the device needs no clock.

**Constraints:**

- **HTTP timeout:** allow 15–30 s, to cover the occasional cold start.
- **OFFLINE rule:** the site shows OFFLINE if no reading arrives for 24 hours, so the wake interval must stay well under that.
- **Hot kiln:** readings run a few cm short while the kiln is hot, because there's no temperature compensation.
- **Secrets:** `DEVICE_KEY` and Wi-Fi credentials must never be committed. Keep them in a git-ignored secrets file.

## Testing locally

Point the device at a local server, `http://<your-computer-ip>:3000` (run `npm run dev -- -H 0.0.0.0`). With `KEY_PREFIX=dev:kiln:`, its readings stay out of production.
