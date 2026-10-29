# Firmware plan

One ESP32 dev board reads the HC-SR04, handles the button and LEDs, and posts readings to the API over HTTPS. It is built with PlatformIO, and the pure logic is unit-tested on the computer. The Arduino Uno and ESP-01 aren't needed. An earlier version of this plan used them; see git history.

## Hardware

| Part | Role |
| --- | --- |
| ESP32 dev board: ESP32-WROOM-32, CH9102 USB-serial, headers soldered (PlatformIO `board = esp32dev`) | Everything: sensor, button, LEDs, Wi-Fi, HTTPS |
| HC-SR04 | Distance, on the wall about 50 cm above the kiln, pointing down |
| Push button | Take and send a reading now |
| 2 LEDs + 2 × 220 Ω | Green = last send OK, red = problem |
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
| HC-SR04 TRIG | GPIO 25 | A 3.3 V trigger is enough for the HC-SR04 |
| HC-SR04 ECHO | 1 kΩ → GPIO 34, and GPIO 34 → 2 kΩ → GND | Divider: 5 V × 2/3 ≈ 3.3 V. GPIO 34 is input-only, which is fine |
| Button | GPIO 27 ↔ GND | Internal pull-up |
| Green LED | GPIO 26 → 220 Ω → LED → GND | |
| Red LED | GPIO 33 → 220 Ω → LED → GND | |

These pins avoid the ESP32's boot-strapping pins (0, 2, 5, 12, 15) and the flash pins (6–11). Some boards label `VIN` as `5V`.

## Mounting

The sensor sits on the wall, pointing roughly straight down from about 50 cm above the kiln's top.

| State | Sensor sees | Expected distance |
| --- | --- | --- |
| `CLOSED` | Lid | ≈ 500 mm |
| `OPEN_FULL` | Top of the ware | 500 mm + depth from rim to ware top |
| `OPEN_EMPTY` | Kiln floor or bottom shelf | 500 mm + kiln depth |

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
    retry/               pure C++: which responses to retry, backoff delays
  src/
    main.cpp             setup/loop: schedule, button, LEDs, Wi-Fi, HTTPS
    config.h             pins, interval, API URL
    secrets.example.h    template; the real secrets.h is git-ignored
  test/
    test_measure/  test_payload/  test_retry/   (Unity, run natively)
```

The `lib/` code has no hardware dependencies, so it is the part we unit-test. `main.cpp` stays thin wiring around it, mirroring the web app's domain/server split.

### Behaviour

1. **On boot:** connect to Wi-Fi, sync time over NTP (needed to check certificate dates), then take and send a first reading (`trigger: "timer"`).
2. **Every `intervalSec`** (default 4 h = 14400 s) it takes and sends a reading. There's no deep sleep, because it's on wall power.
3. **Button:** after debouncing, it takes and sends a reading now (`trigger: "button"`). There's a 30 s cooldown so repeated presses don't spam the server.
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
7. **LEDs:**
   - green on: last send succeeded
   - red on: last send failed
   - both blinking: working
   - red blink code: 2 blinks = 401 (wrong key), 3 blinks = 400 (bad body)
8. **Resilience:** it reconnects Wi-Fi when the link drops. A task watchdog restarts the board if the loop hangs.
9. **USB serial (115200 baud):** it logs each reading and response. A `CAL` command prints a reading every 2 s without sending, for calibration.

### Secrets

`src/secrets.h` holds the Wi-Fi SSID and password and `DEVICE_KEY`. It is git-ignored; `secrets.example.h` is committed. To test against a local dev server, set `KILN_API_URL` in `config.h` to `http://<computer-ip>:3000`.

### Flashing

Connect the USB-C cable and run `pio run -e esp32 -t upload`, then `pio device monitor` for logs.

The CH9102 chip usually works with macOS's built-in driver. If no `/dev/cu.wchusbserial*` or `/dev/cu.usbserial*` port appears, install WCH's CH9102 driver. If an upload stalls at "Connecting…", hold the board's BOOT button until it starts.

## Testing

This follows [docs/TESTING.md](../docs/TESTING.md) where it applies to firmware.

| Layer | What | How |
| --- | --- | --- |
| Unit | `measure`, `payload`, `retry`: medians with outliers and timeouts, IQR, mm conversion, JSON exactly matching `parseReadingInput`, retry decisions | `pio test -e native` (Unity), on the computer, no hardware |
| Bench | The board on a breadboard posting to the local dev server (`KEY_PREFIX=dev:kiln:`) | Manual checklist: boot, timer, button, wrong key → 401 blink, Wi-Fi off → red LED and recovery |
| Mounted | Real readings for closed, open full and open empty, cold and hot | `CAL` mode output, then set `T_LID` and `T_EMPTY` on Vercel |

Every branch of the pure libraries should be covered. The 90% gate is enforced only for the web app.

## Build order

1. **Scaffold:** set up PlatformIO (`esp32`, `native`), `secrets.example.h`, `.gitignore`, and install the PlatformIO CLI.
2. **Pure libraries:** write `measure`, `payload` and `retry` test-first.
3. **Device firmware:** Wi-Fi, NTP, HTTPS POST with retries, sensor, button, LEDs, `CAL` mode.
4. **Bench test:** wire it on the breadboard and post to the local dev server.
5. **Mount and calibrate:** collect readings, set the thresholds and switch to production.

## Open questions

- [ ] Inside depth of the kiln, and the usual height of a full load (for threshold placeholders)
- [ ] Does the wall adapter have a 5 V USB output? If it's a barrel plug, use a USB phone charger instead
- [ ] Wi-Fi at the kiln: plain WPA2, or a network with a login page (a login page needs a different approach). The ESP32 only supports 2.4 GHz
