// What to do with the API's answer (firmware/README.md#contract-with-the-web-app).
#pragma once

#include <stdint.h>

namespace retry {

enum class Outcome {
  Stored,        // 2xx
  Unauthorized,  // 401/403: wrong DEVICE_KEY. Never retried
  Rejected,      // other 4xx: a firmware bug. Never retried
  Transient,     // network error, timeout, 408, 429 or 5xx. Retried
};

// Total tries per reading: the first attempt plus two retries.
constexpr uint8_t MAX_ATTEMPTS = 3;

// httpStatus ≤ 0 is a client-side error (Arduino HTTPClient uses negative codes).
Outcome classify(int httpStatus);

// Whether to try again after `attemptsMade` tries ended in `outcome`.
bool shouldRetry(Outcome outcome, uint8_t attemptsMade);

// Wait before the next try: 5 s after the first, 15 s after the second.
uint32_t backoffMs(uint8_t attemptsMade);

// Red LED blinks for a failed send: 2 = wrong key, 3 = rejected body, 1 = server or network. 0 = success.
uint8_t blinkCode(Outcome outcome);

}  // namespace retry
