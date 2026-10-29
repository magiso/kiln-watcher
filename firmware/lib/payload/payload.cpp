#include "payload.h"

#include <stdio.h>

namespace payload {

namespace {

bool validDeviceId(const char* id) {
  if (id == nullptr) return false;
  size_t length = 0;
  for (const char* c = id; *c != '\0'; ++c, ++length) {
    const bool ok = (*c >= 'a' && *c <= 'z') || (*c >= 'A' && *c <= 'Z') || (*c >= '0' && *c <= '9') ||
                    *c == '-' || *c == '_';
    if (!ok || length >= 64) return false;
  }
  return length > 0;
}

}  // namespace

size_t build(const Reading& r, char* buf, size_t capacity) {
  if (!validDeviceId(r.deviceId) || r.intervalSec == 0 || buf == nullptr || capacity == 0) return 0;
  const int written = snprintf(buf, capacity,
                               "{\"deviceId\":\"%s\",\"distanceMm\":%u,\"spreadMm\":%u,\"validSamples\":%u,"
                               "\"intervalSec\":%lu,\"trigger\":\"%s\"}",
                               r.deviceId, static_cast<unsigned>(r.distanceMm), static_cast<unsigned>(r.spreadMm),
                               static_cast<unsigned>(r.validSamples), static_cast<unsigned long>(r.intervalSec),
                               r.trigger == Trigger::Button ? "button" : "timer");
  if (written < 0 || static_cast<size_t>(written) >= capacity) {
    buf[0] = '\0';
    return 0;
  }
  return static_cast<size_t>(written);
}

}  // namespace payload
