# Firmware plan

The Arduino Uno measures and decides when to report. The ESP-01 is a small Wi-Fi coprocessor that turns one serial line into one HTTPS request. Both run firmware we write, built from one PlatformIO project, and the pure logic is unit-tested on the computer.

## Hardware

| Part | Have | Role |
| --- | --- | --- |
| Arduino Uno | Yes | Sensor, button, LEDs, timing |
| ESP8266 ESP-01 (original, not the S) | Yes | Wi-Fi + HTTPS to the API. 3.3 V only: never connect it to 5 V. The original has no built-in pull-ups, so the external ones in the wiring table are required |
| HC-SR04 | Yes | Distance, about 50 cm above the kiln, pointing down |
| Push button | Yes | Take and send a reading now |
| 2 LEDs + 220 Ω resistors | Yes | Green = last send OK, red = problem |
| Resistors for a divider (1 kΩ + 2 kΩ) and pull-ups (10 kΩ) | Yes | 5 V → 3.3 V on the ESP's RX pin; boot pins |
| Wall adapter | Yes | Powers the Uno (7–12 V barrel jack, or 5 V USB) |
| Breadboard + jumper wires | Yes | Bench build. Check you have female-to-male jumpers: the ESP-01's 2×4 pin header can't plug straight into a breadboard, because facing pins would short together |
| **ESP-01 breadboard adapter with a 3.3 V regulator** (recommended), or an AMS1117-3.3 module plus female-to-male jumpers | **Buy** | The ESP-01 draws up to ~300 mA when transmitting, and the Uno's 3.3 V pin can't supply that. This is the most common cause of ESP-01 resets. The adapter also fans the 2×4 header out into a single breadboard-friendly row, and many include level shifting on RX |
| **ESP-01 USB programmer** with a PROG switch | **Buy** (recommended) | Flashing the ESP-01. The Uno can do it as a USB-serial bridge, but it is fiddly |
| 10 µF + 100 nF capacitors across the ESP-01 supply | Buy if missing | Smooth Wi-Fi current spikes |

### Why not the ESP-01 alone, or the Uno driving stock AT firmware

- **ESP-01 alone:** it has only GPIO0 and GPIO2, and both must be high at boot. The HC-SR04's echo line idles low and would stop it booting, and there are no pins left for the button and LEDs.
- **Stock AT firmware:** its TLS support is old and memory-starved. Vercel only serves HTTPS with modern TLS, so AT-command HTTPS from the Uno is unreliable. Custom ESP firmware using BearSSL handles it properly.

## Wiring

| From | To | Note |
| --- | --- | --- |
| HC-SR04 VCC / GND | Uno 5V / GND | The HC-SR04 is a 5 V part; the Uno is 5 V, so no level shifting |
| HC-SR04 TRIG | Uno D9 | |
| HC-SR04 ECHO | Uno D8 | |
| Button | Uno D4 ↔ GND | Internal pull-up |
| Green LED | Uno D6 → 220 Ω → LED → GND | |
| Red LED | Uno D7 → 220 Ω → LED → GND | |
| Regulator IN / GND | Uno 5V / GND | Regulator OUT = 3.3 V rail for the ESP-01 |
| ESP-01 VCC, EN (CH_PD) | 3.3 V rail | Capacitors across VCC/GND, close to the module |
| ESP-01 GND | Common GND | All grounds joined |
| ESP-01 GPIO0, GPIO2 | 3.3 V via 10 kΩ each | Normal boot |
| ESP-01 RST | 3.3 V via 10 kΩ, and Uno D5 | Uno pulls it low to hard-reset a stuck ESP (D5 is otherwise an input, never driven high) |
| ESP-01 TX | Uno D2 (SoftwareSerial RX) | 3.3 V reads as high on the Uno |
| Uno D3 (SoftwareSerial TX) | ESP-01 RX via divider | D3 → 1 kΩ → ESP RX → 2 kΩ → GND (5 V → 3.3 V) |

The Uno's USB serial stays free for flashing and for debug and calibration output.

## Mounting

The sensor sits on the wall, pointing roughly straight down from about 50 cm above the kiln's top.

| State | Sensor sees | Expected distance |
| --- | --- | --- |
| `CLOSED` | Lid | ≈ 500 mm |
| `OPEN_FULL` | Top of the ware | 500 mm + depth from rim to ware top |
| `OPEN_EMPTY` | Kiln floor or bottom shelf | 500 mm + kiln depth |

- **The current server thresholds won't work for this mount.** The placeholders (`T_LID` 300, `T_EMPTY` 700) would read a closed lid as "open, full". They will be calibrated from real readings. We also need the kiln's inside depth.
- **The HC-SR04 beam is a cone of about 15°.** At 50 cm it covers a circle about 13 cm across. Aim it at the middle of the kiln, away from the walls, and check that the open lid doesn't swing into it.
- **Heat:** the HC-SR04 and the boards are rated to about 70 °C, and air above a firing kiln, especially near the vent, can be hotter. Before relying on it, check the mount temperature during a firing. Keep plastic and wiring out of the vent plume, and mount slightly to one side if needed. Hot air also makes readings a few cm short.

## Software

### Layout (PlatformIO)

```
firmware/
  platformio.ini         envs: uno, esp01, native (unit tests)
  lib/
    measure/             pure C++: echo time → mm, median, spread (no Arduino headers)
    payload/             pure C++: builds the JSON body within a fixed buffer
    link/                pure C++: Uno ↔ ESP line protocol (format and parse)
    retry/               pure C++: which responses to retry, backoff delays
  src/
    uno/main.cpp         sensor, button, LEDs, schedule, talks to the ESP
    esp01/main.cpp       Wi-Fi, time sync, HTTPS POST, replies to the Uno
    esp01/secrets.example.h   template; the real secrets.h is git-ignored
  test/
    test_measure/  test_payload/  test_link/  test_retry/   (Unity, run natively)
```

`build_src_filter` gives each environment only its own `src/` folder. The `lib/` code is shared and has no hardware dependencies, so it is the part we unit-test.

### Uno ↔ ESP-01 protocol

The two boards exchange newline-terminated text lines over SoftwareSerial at 9600 baud.

| Direction | Line | Meaning |
| --- | --- | --- |
| ESP → Uno | `READY` | Booted and connected to Wi-Fi |
| Uno → ESP | `POST {"deviceId":…}` | Send this body to `/api/readings` |
| ESP → Uno | `RESULT 204` | Stored |
| ESP → Uno | `RESULT 400` / `RESULT 401` | Rejected. Don't retry; the red LED blinks a code |
| ESP → Uno | `RESULT ERR wifi` / `ERR tls` / `ERR timeout` / `RESULT 503` | Failed after the ESP's own retries |

The Uno doesn't know the Wi-Fi password or `DEVICE_KEY`; only the ESP-01 holds them. If no `RESULT` arrives within 90 s, the Uno resets the ESP through RST and counts it as a failure.

### Uno behaviour

1. **On boot:** wait up to 30 s for `READY`, then take and send a first reading (`trigger: "timer"`).
2. **Every `intervalSec`** (default 4 h = 14400 s) it takes and sends a reading. There's no deep sleep, because it's on wall power.
3. **Button:** after debouncing, it takes and sends a reading now (`trigger: "button"`). There's a 30 s cooldown so repeated presses don't spam the server.
4. **Measurement:** 15 pings, 60 ms apart, each with a 30 ms echo timeout.
   - Pings with no echo are discarded. `validSamples` is the count that remain.
   - `distanceMm` is the median.
   - `spreadMm` is the interquartile range.
   - Echo time is converted at 0.343 mm/µs ÷ 2, the speed of sound at 20 °C.
5. **LEDs:**
   - green on: last send succeeded
   - red on: last send failed
   - both blinking: working
   - red blink code: 2 blinks = 401 (wrong key), 3 blinks = 400 (bad body)
6. **USB serial debug:** it prints each reading. A `CAL` command over USB prints a reading every 2 s without sending, for calibration.

### ESP-01 behaviour

1. **On boot:** connect to Wi-Fi, sync time over NTP, then print `READY`.
2. **On `POST`:**
   - Reconnect if needed.
   - Send the HTTPS POST to `https://part-time-kiln-watcher.vercel.app/api/readings` with the bearer key and a 20 s timeout.
   - Retry network errors, timeouts, `500` and `503` twice, with 5 s and 15 s backoff.
   - Reply with `RESULT`.
3. **TLS:** it verifies the server certificate against a small set of root CAs embedded in the firmware. That's why it needs NTP time. We check Vercel's current chain with `openssl s_client` when implementing, and include the matching roots plus a backup. Skipping verification (`setInsecure`) would leave the device key open to anyone on the network, so it is not the default.

### Secrets

`src/esp01/secrets.h` holds the Wi-Fi SSID and password and `DEVICE_KEY`. It is git-ignored; `secrets.example.h` is committed. To test against a local dev server, the ESP can also use a `KILN_API_URL` override, `http://<computer-ip>:3000`.

## Testing

This follows [docs/TESTING.md](../docs/TESTING.md) where it applies to firmware.

| Layer | What | How |
| --- | --- | --- |
| Unit | `measure`, `payload`, `link`, `retry`: medians with outliers and timeouts, IQR, mm conversion, JSON exactly matching `parseReadingInput`, protocol parsing including garbage lines, retry decisions | `pio test -e native` (Unity), on the computer, no hardware |
| Bench | The Uno and ESP-01 on a breadboard posting to the local dev server (`KEY_PREFIX=dev:kiln:`) | Manual checklist: boot, timer, button, wrong key → 401 blink, Wi-Fi off → red LED and recovery, ESP hang → Uno resets it |
| Mounted | Real readings for closed, open full and open empty, cold and hot | `CAL` mode output, then set `T_LID` and `T_EMPTY` on Vercel |

Every branch of the pure libraries should be covered. The 90% gate is enforced only for the web app.

## Build order

1. **Scaffold:** set up PlatformIO with the `uno`, `esp01` and `native` environments, `secrets.example.h` and `.gitignore`.
2. **Pure libraries:** write `measure`, `payload`, `link` and `retry` test-first.
3. **ESP-01 firmware:** Wi-Fi, NTP, TLS roots, POST and retries. Flash it and test it alone from a USB serial terminal by typing `POST …` lines.
4. **Uno firmware:** sensor, button, LEDs, schedule and the ESP link. Test it on the bench against the local dev server.
5. **Mount and calibrate:** collect readings, set the thresholds and switch to production.

## Open questions

- [ ] Inside depth of the kiln, and the usual height of a full load (for threshold placeholders)
- [ ] Flash size of the ESP-01: a blue board usually has 512 KB, a black one 1 MB. PlatformIO uses `board = esp01` (512 KB) or `esp01_1m`. The HTTPS firmware should fit in 512 KB but leaves no room for over-the-air updates
- [ ] Wall adapter voltage (barrel 7–12 V, or 5 V USB)
- [ ] Wi-Fi at the kiln: plain WPA2, or a network with a login page (a login page needs a different approach)
- [ ] Buy the ESP-01 breadboard adapter with regulator (and ideally the ESP-01 USB programmer) before step 3
