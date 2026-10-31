// Pins, timing and API settings. See PLAN.md#wiring.
#pragma once

#include <stddef.h>
#include <stdint.h>

namespace config {

constexpr uint8_t PIN_TRIG = 25;  // D25
constexpr uint8_t PIN_ECHO = 13;  // D13. The echo is 5 V, so it should go through the 1k/2k divider

constexpr const char* DEVICE_ID = "kiln-1";
constexpr uint32_t INTERVAL_SEC = 4 * 60 * 60;

// One reading: PINGS pings, PING_GAP_MS apart, each waiting up to ECHO_TIMEOUT_US (≈ 5 m) for an echo.
constexpr size_t PINGS = 15;
constexpr uint32_t PING_GAP_MS = 60;
constexpr uint32_t ECHO_TIMEOUT_US = 30000;

constexpr uint32_t WIFI_TIMEOUT_MS = 20000;
constexpr uint32_t CLOCK_TIMEOUT_MS = 15000;
constexpr uint16_t HTTP_TIMEOUT_MS = 20000;

// The `desk` build env sets API_URL_OVERRIDE to a local dev server (see platformio.ini).
#ifdef API_URL_OVERRIDE
constexpr const char* API_URL = API_URL_OVERRIDE;
#else
constexpr const char* API_URL = "https://part-time-kiln-watcher.vercel.app/api/readings";
#endif

}  // namespace config
