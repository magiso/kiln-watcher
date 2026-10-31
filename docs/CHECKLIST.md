# Values to revisit

Placeholders and assumptions that still need a real value. Tick each one off once it's been checked and set.

## Measure at the kiln

- [ ] **Kiln inside depth.** Assumed 1 m. Decides the empty-kiln distance (≈ mount height + depth) and so `T_EMPTY`.
- [ ] **Sensor height above the kiln top.** Assumed ≈ 50 cm. Decides the closed-lid distance and so `T_LID`.
- [ ] **Usual height of a full load** (rim to the top of the ware). Decides where FULL ends and EMPTY starts.
- [ ] **Open lid stays out of the beam.** The beam is a cone of about 15° (≈ 13 cm across at 50 cm). Aim at the middle of the kiln, away from the walls and the swinging lid.
- [ ] **Temperature at the mount during a firing.** The HC-SR04 and the ESP32 board are rated to about 70–85 °C. Move the mount sideways, out of the vent plume, if it gets close.
- [ ] **Wi-Fi at the kiln.** Assumed plain WPA2 on 2.4 GHz with a usable signal there. Check that the board connects and sends from its mounted spot.

## Thresholds (Vercel environment variables)

Set these once real readings are in. Take readings with the serial `m` command for: lid closed, open and full, open and empty, and a hot (firing) reading. Put each threshold midway between the neighbouring readings. Changing them needs no code change, only a redeploy.

They live in Vercel → Settings → Environment Variables (Production).

- [ ] **`T_LID`:** now 300 mm (the default). Provisionally ≈ 650 mm.
- [ ] **`T_EMPTY`:** now 700 mm (the default). Provisionally ≈ 1350 mm.
- [ ] **`OFFLINE_AFTER_HOURS`:** now 24. Keep it, or lower it to about 9 (two missed 4-hourly readings).

Hot air makes readings a few cm short, so check that closed-while-firing still reads below `T_LID`.

## Firmware (`firmware/src/config.h`, `secrets.h`)

- [ ] **Flash the production build before mounting:** `cd firmware && pio run -e esp32 -t upload`. The board is currently running the `desk` build, which posts to the laptop's dev server.
- [ ] **`INTERVAL_SEC`:** 4 h. Shorter gives fresher status but more writes; the page's "Next check" follows whatever is set.
- [ ] **`secrets.h` Wi-Fi details**, if the kiln is on a different network from the desk test.
- [ ] **`PINGS`, `PING_GAP_MS`, `ECHO_TIMEOUT_US`** (15, 60 ms, 30 ms ≈ 5 m): revisit only if mounted readings are noisy or drop echoes.
- [ ] **Speed of sound:** fixed at 20 °C (343 m/s). Revisit if hot readings drift enough to cross a threshold.

## Page (`lib/domain`, `app/_components`)

- [ ] **"Next check" format:** relative ("in 3 h"), or a clock time ("6:15 pm") in Australian Eastern time.
- [ ] **`DUE_GRACE_SECONDS`:** 15 min of "due now" before "overdue" (`lib/domain/format.ts`).
- [ ] **Page refresh interval:** every 5 min while visible (`REFRESH_INTERVAL_MS` in `StatusView.tsx`).

## Later (deferred features)

- [ ] **Reading quality rules:** when `spreadMm` or `validSamples` mean a reading is unreliable, and the "Unclear reading" screen.
- [ ] **Button and status LEDs**, and a watchdog on the board.
- [ ] **History list:** how many readings to show. Storage keeps the latest 500.
