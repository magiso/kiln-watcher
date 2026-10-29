// Builds the JSON body for POST /api/readings (docs: firmware/README.md#contract-with-the-web-app).
#pragma once

#include <stddef.h>
#include <stdint.h>

namespace payload {

enum class Trigger { Timer, Button };

struct Reading {
  const char* deviceId;  // 1–64 characters of [A-Za-z0-9_-], so it never needs JSON escaping
  uint16_t distanceMm;
  uint16_t spreadMm;
  uint8_t validSamples;
  uint32_t intervalSec;  // must be > 0
  Trigger trigger;
};

// Big enough for any valid Reading.
constexpr size_t MAX_LENGTH = 192;

// Writes the JSON body into buf. Returns its length, or 0 if the reading is invalid or buf is too small.
size_t build(const Reading& reading, char* buf, size_t capacity);

}  // namespace payload
