#include "timing.h"

namespace timing {

bool Button::update(bool pressed, uint32_t nowMs) {
  if (pressed != raw_) {
    raw_ = pressed;
    changedAt_ = nowMs;
  }
  if (raw_ == stable_ || !elapsed(nowMs, changedAt_, debounceMs_)) return false;

  stable_ = raw_;
  if (!stable_) return false;  // a release
  if (accepted_ && !elapsed(nowMs, acceptedAt_, cooldownMs_)) return false;
  accepted_ = true;
  acceptedAt_ = nowMs;
  return true;
}

}  // namespace timing
