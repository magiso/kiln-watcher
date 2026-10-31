// Pins, timing and API settings. See PLAN.md#wiring.
#pragma once

#include <stddef.h>
#include <stdint.h>

namespace config {

constexpr uint8_t PIN_TRIG = 12;  // D12. A strapping pin, but the HC-SR04 TRIG input doesn't pull it high at boot
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

// Set to http://<computer-ip>:3000/api/readings to test against a local dev server.
constexpr const char* API_URL = "https://part-time-kiln-watcher.vercel.app/api/readings";

}  // namespace config
