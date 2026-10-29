#include "retry.h"

namespace retry {

Outcome classify(int status) {
  if (status >= 200 && status < 300) return Outcome::Stored;
  if (status == 401 || status == 403) return Outcome::Unauthorized;
  if (status == 408 || status == 429) return Outcome::Transient;
  if (status >= 400 && status < 500) return Outcome::Rejected;
  return Outcome::Transient;  // ≤ 0, 1xx, 3xx and 5xx
}

bool shouldRetry(Outcome outcome, uint8_t attemptsMade) {
  return outcome == Outcome::Transient && attemptsMade < MAX_ATTEMPTS;
}

uint32_t backoffMs(uint8_t attemptsMade) {
  switch (attemptsMade) {
    case 1: return 5000;
    case 2: return 15000;
    default: return 0;
  }
}

uint8_t blinkCode(Outcome outcome) {
  switch (outcome) {
    case Outcome::Stored: return 0;
    case Outcome::Unauthorized: return 2;
    case Outcome::Rejected: return 3;
    case Outcome::Transient: return 1;
  }
  return 1;
}

}  // namespace retry
