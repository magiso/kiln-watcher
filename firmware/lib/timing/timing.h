// Scheduling and button handling on top of millis(). Pure C++, so wrap-around is testable.
#pragma once

#include <stdint.h>

namespace timing {

// True once `intervalMs` has passed since `sinceMs`. Correct across the 49-day millis() wrap.
inline bool elapsed(uint32_t nowMs, uint32_t sinceMs, uint32_t intervalMs) { return nowMs - sinceMs >= intervalMs; }

// Debounced push button with a cooldown between accepted presses.
class Button {
 public:
  Button(uint32_t debounceMs, uint32_t cooldownMs) : debounceMs_(debounceMs), cooldownMs_(cooldownMs) {}

  // Feed the raw pin state every loop. Returns true once per accepted press.
  bool update(bool pressed, uint32_t nowMs);

 private:
  uint32_t debounceMs_;
  uint32_t cooldownMs_;
  bool raw_ = false;
  bool stable_ = false;
  uint32_t changedAt_ = 0;
  bool accepted_ = false;  // has any press been accepted yet
  uint32_t acceptedAt_ = 0;
};

}  // namespace timing
