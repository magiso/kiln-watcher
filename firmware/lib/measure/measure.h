// Turns raw HC-SR04 echo times into one reading. Pure C++: no Arduino headers.
#pragma once

#include <stddef.h>
#include <stdint.h>

namespace measure {

// Most pings per reading; extra samples are ignored.
constexpr size_t MAX_SAMPLES = 32;

struct Summary {
  uint16_t distanceMm;    // median of the valid samples
  uint16_t spreadMm;      // interquartile range of the valid samples
  uint8_t validSamples;   // pings that got an echo
};

// Round-trip echo time (µs) → distance (mm), at 343 m/s (20 °C), rounded to the nearest mm.
uint32_t echoToMm(uint32_t echoUs);

// Summarises up to MAX_SAMPLES echo times. 0 means "no echo" and is skipped.
// With no valid samples, every field is 0 and the reading must not be sent.
Summary summarize(const uint32_t* echoUs, size_t count);

}  // namespace measure
