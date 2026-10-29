#include "measure.h"

#include <algorithm>

namespace measure {

namespace {

// Median of sorted[from, to), rounded to the nearest mm (halves round up).
uint32_t medianOf(const uint32_t* sorted, size_t from, size_t to) {
  const size_t n = to - from;
  const size_t mid = from + n / 2;
  if (n % 2 == 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid] + 1) / 2;
}

uint16_t clampMm(uint32_t mm) { return mm > UINT16_MAX ? UINT16_MAX : static_cast<uint16_t>(mm); }

}  // namespace

uint32_t echoToMm(uint32_t echoUs) {
  // mm = µs × 0.343 / 2 = µs × 343 / 2000, using 64-bit maths so long timeouts can't overflow.
  return static_cast<uint32_t>((static_cast<uint64_t>(echoUs) * 343 + 1000) / 2000);
}

Summary summarize(const uint32_t* echoUs, size_t count) {
  uint32_t mm[MAX_SAMPLES];
  size_t valid = 0;
  for (size_t i = 0; i < count && i < MAX_SAMPLES; ++i) {
    if (echoUs[i] > 0) mm[valid++] = echoToMm(echoUs[i]);
  }
  if (valid == 0) return {0, 0, 0};

  std::sort(mm, mm + valid);
  // Quartiles are the medians of the lower and upper halves, excluding the middle sample when
  // the count is odd (Tukey's hinges).
  const size_t half = valid / 2;
  const uint32_t q1 = medianOf(mm, 0, half == 0 ? 1 : half);
  const uint32_t q3 = medianOf(mm, valid - (half == 0 ? 1 : half), valid);
  return {clampMm(medianOf(mm, 0, valid)), clampMm(q3 - q1), static_cast<uint8_t>(valid)};
}

}  // namespace measure
