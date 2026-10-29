// Device wiring: schedule, button, LEDs, Wi-Fi and HTTPS around the tested lib/ code.
// Placeholder until build step 3 (PLAN.md#build-order).
#include <Arduino.h>

#include "config.h"

void setup() {
  Serial.begin(115200);
  Serial.println("kiln-watcher firmware: scaffold");
}

void loop() { delay(1000); }
