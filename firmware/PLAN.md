# Firmware plan

One ESP32 dev board reads the HC-SR04 and posts readings to the API over HTTPS. It is built with PlatformIO, and the pure logic is unit-tested on the computer. The Arduino Uno and ESP-01 aren't needed. An earlier version of this plan used them; see git history.

## Hardware

| Part | Role |
| --- | --- |
| ESP32 dev board: ESP32-WROOM-32, CH9102 USB-serial, headers soldered (PlatformIO `board = esp32dev`) | Everything: sensor, Wi-Fi, HTTPS |
| HC-SR04 | Distance, on the wall about 50 cm above the kiln, pointing down |
| 1 kΩ + 2 kΩ resistors | Divider on the HC-SR04 echo line (5 V → 3.3 V) |
| Breadboard + jumper wires | Bench build |
| Wall adapter | Powers the board through its USB-C port (needs 5 V USB output) |

Nothing needs to be bought, provided the wall adapter has a 5 V USB output.

## Wiring

The ESP32's pins are 3.3 V and **not 5 V tolerant**. The HC-SR04 runs on 5 V, so its echo line must go through the divider.

| From | To | Note |
| --- | --- | --- |
| HC-SR04 VCC | ESP32 `VIN` / `5V` | The 5 V from USB |
| HC-SR04 GND | ESP32 `GND` | |
| HC-SR04 TRIG | GPIO 25 (`D25`) | A 3.3 V trigger is enough for the HC-SR04 |
| HC-SR04 ECHO | 1 kΩ → GPIO 26 (`D26`), and GPIO 26 → 2 kΩ → GND | Divider: 5 V × 2/3 ≈ 3.3 V |

These avoid the boot-strapping pins (0, 2, 5, 12, 15) and the flash pins (6–11). Some boards label `VIN` as `5V`.

The button and LEDs are deferred. The serial commands below cover on-demand readings for now.

## Mounting

The sensor sits on the wall, pointing roughly straight down from about 50 cm above the kiln's top.

| State | Sensor sees | Expected distance |
| --- | --- | --- |
| `CLOSED` | Lid | ≈ 500 mm |
| `OPEN_FULL` | Top of the ware | 500 mm + depth from rim to ware top |
| `OPEN_EMPTY` | Kiln floor or bottom shelf | 500 mm + kiln depth (≈ 1500 mm, assuming 1 m depth) |

- **The current server thresholds won't work for this mount.** The placeholders (`T_LID` 300, `T_EMPTY` 700) would read a closed lid as "open, full". They will be calibrated from real readings. We also need the kiln's inside depth.
- **The HC-SR04 beam is a cone of about 15°.** At 50 cm it covers a circle about 13 cm across. Aim it at the middle of the kiln, away from the walls, and check that the open lid doesn't swing into it.
- **Heat:** the HC-SR04 and the ESP32 board are rated to about 70–85 °C, and air above a firing kiln, especially near the vent, can be hotter. Before relying on it, check the mount temperature during a firing. Keep plastic and wiring out of the vent plume, and mount slightly to one side if needed. Hot air also makes readings a few cm short.

## Software

### Layout (PlatformIO)

```
firmware/
  platformio.ini         envs: esp32 (the device), native (unit tests on the computer)
  lib/
    measure/             pure C++: echo time → mm, median, spread (no Arduino headers)
    payload/             pure C++: builds the JSON body within a fixed buffer
    retry/               pure C++: which responses to retry, backoff delays, LED blink codes
    timing/              pure C++: wrap-safe intervals, debounced button with cooldown
  src/
    main.cpp             setup/loop: schedule, sensor, Wi-Fi, clock, HTTPS, serial commands
    config.h             pins, interval, API URL
    secrets.example.h    template; the real secrets.h is git-ignored
  test/
    fixtures/reading.json   request body shared with the web app's tests
    test_measure/  test_payload/  test_retry/  test_timing/   (Unity, run natively)
```

The `lib/` code has no hardware dependencies, so it is the part we unit-test. `main.cpp` stays thin wiring around it, mirroring the web app's domain/server split.

### Behaviour

1. **On boot:** connect to Wi-Fi, sync time over NTP (needed to check certificate dates), then take and send a first reading (`trigger: "timer"`).
2. **Every `intervalSec`** (default 4 h = 14400 s) it takes and sends a reading. There's no deep sleep, because it's on wall power.
3. **Button (deferred):** after debouncing, it will take and send a reading now (`trigger: "button"`), with a 30 s cooldown. `timing::Button` is ready for it.
4. **Measurement:** 15 pings, 60 ms apart, each with a 30 ms echo timeout.
   - Pings with no echo are discarded. `validSamples` is the count that remain.
   - `distanceMm` is the median.
   - `spreadMm` is the interquartile range.
   - Echo time is converted at 0.343 mm/µs ÷ 2, the speed of sound at 20 °C.
5. **Sending:**
   - HTTPS POST to `https://part-time-kiln-watcher.vercel.app/api/readings` with the bearer key and a 20 s timeout.
   - Retry network errors, timeouts, `500` and `503` twice, with 5 s and 15 s backoff.
   - `400` and `401` are never retried.
6. **TLS:** the server certificate is verified with the Arduino-ESP32 core's built-in root CA bundle (`setCACertBundle`). That keeps working if Vercel changes certificate authority. Skipping verification (`setInsecure`) would leave the device key open to anyone on the network, so it is not used.
7. **LEDs (deferred):** green = last send succeeded, red = failed, red blink code 2 = 401 (wrong key), 3 = 400 (bad body). `retry::blinkCode` is ready for it.
8. **Resilience:** it reconnects Wi-Fi before each send if the link has dropped, and a reading with no echoes is not sent. A watchdog is still to do.
9. **USB serial (115200 baud):** it logs each reading, each attempt and its HTTP status. Type `m` to measure without sending (for calibration) or `s` to measure and send now (`trigger: "button"`, the on-demand trigger).

### Secrets

`src/secrets.h` holds the Wi-Fi SSID and password and `DEVICE_KEY`. It is git-ignored; `secrets.example.h` is committed. To test against a local dev server, flash the `desk` env: `DEV_HOST=<computer-ip> pio run -e desk -t upload`, with `npm run dev -- -H 0.0.0.0` running. It posts to the `dev:kiln:` keys.

### Flashing

Connect the USB-C cable and run `pio run -e esp32 -t upload`, then `pio device monitor` for logs.

The CH9102 chip usually works with macOS's built-in driver. If no `/dev/cu.wchusbserial*` or `/dev/cu.usbserial*` port appears, install WCH's CH9102 driver. If an upload stalls at "Connecting…", hold the board's BOOT button until it starts.

## Testing

This follows [docs/TESTING.md](../docs/TESTING.md) where it applies to firmware.

| Layer | What | How |
| --- | --- | --- |
| Unit | `measure`, `payload`, `retry`, `timing`: medians with outliers and timeouts, IQR, mm conversion, JSON matching the shared fixture, retry decisions, millis() wrap, debounce and cooldown | `pio test -e native` (Unity), on the computer, no hardware |
| Bench | The board on a breadboard posting to the local dev server (`KEY_PREFIX=dev:kiln:`) | Manual checklist: boot, first reading stored, `s` stored, wrong key → 401 logged and not retried, Wi-Fi off → retries then recovery on the next reading |
| Mounted | Real readings for closed, open full and open empty, cold and hot | Serial `m` output, then set `T_LID` and `T_EMPTY` on Vercel |

Every branch of the pure libraries should be covered. The 90% gate is enforced only for the web app.

## Build order

1. **Scaffold** (done): PlatformIO (`esp32` pinned to espressif32 8.0.0 / Arduino core 3.3, `native`), `secrets.example.h`, `.gitignore`. Install the CLI with `brew install platformio`.
2. **Pure libraries** (done): `measure`, `payload`, `retry` and `timing`, with 26 native tests.
3. **Device firmware** (done, not yet run on the board): Wi-Fi, NTP, HTTPS POST with retries, sensor, serial `m`/`s` commands. Button, LEDs and watchdog deferred.
4. **Bench test:** wire it on the breadboard and post to the local dev server.
5. **Mount and calibrate:** collect readings, set the thresholds and switch to production.

## Open questions

- [ ] Inside depth of the kiln. **Assumed 1 m for now**, so closed ≈ 500 mm and empty ≈ 1500 mm. Provisional thresholds once mounted are about `T_LID` 650 and `T_EMPTY` 1350; these aren't applied to Vercel yet
- [ ] Usual height of a full load
- [ ] Wi-Fi at the kiln: **assumed plain WPA2** on 2.4 GHz. A network with a login page needs a different approach
- [x] Wall adapter: 5 V USB output
