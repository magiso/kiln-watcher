// Pins, timing and API settings. See PLAN.md#wiring.
#pragma once

#include <stdint.h>

namespace config {

constexpr uint8_t PIN_TRIG = 25;
constexpr uint8_t PIN_ECHO = 34;  // via 1k/2k divider: the HC-SR04 echo is 5 V
constexpr uint8_t PIN_BUTTON = 27;
constexpr uint8_t PIN_LED_GREEN = 26;
constexpr uint8_t PIN_LED_RED = 33;

constexpr const char* DEVICE_ID = "kiln-1";
constexpr uint32_t INTERVAL_SEC = 4 * 60 * 60;

// Set to http://<computer-ip>:3000/api/readings to test against a local dev server.
constexpr const char* API_URL = "https://part-time-kiln-watcher.vercel.app/api/readings";

}  // namespace config
