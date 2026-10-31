// Device wiring: Wi-Fi, clock, the HC-SR04 and the HTTPS POST around the tested lib/ code.
#include <Arduino.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <WiFi.h>
#include <string.h>
#include <time.h>

#include "config.h"
#include "measure.h"
#include "payload.h"
#include "retry.h"
#include "secrets.h"
#include "timing.h"

static_assert(config::PINGS <= measure::MAX_SAMPLES, "too many pings per reading");

namespace {

const bool USE_TLS = strncmp(config::API_URL, "https://", 8) == 0;

uint32_t lastReadingMs = 0;

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.printf("Wi-Fi: connecting to %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (timing::elapsed(millis(), start, config::WIFI_TIMEOUT_MS)) {
      Serial.println("Wi-Fi: timed out");
      return false;
    }
    delay(250);
  }
  Serial.printf("Wi-Fi: connected, IP %s\n", WiFi.localIP().toString().c_str());
  return true;
}

// TLS checks certificate dates, so the clock must be set before the first HTTPS request.
// SNTP keeps it in sync after that.
bool clockReady() {
  constexpr time_t AFTER_2024 = 1704067200;
  if (time(nullptr) > AFTER_2024) return true;
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  const uint32_t start = millis();
  while (time(nullptr) <= AFTER_2024) {
    if (timing::elapsed(millis(), start, config::CLOCK_TIMEOUT_MS)) {
      Serial.println("Clock: NTP timed out");
      return false;
    }
    delay(250);
  }
  Serial.println("Clock: set from NTP");
  return true;
}

uint32_t ping() {
  digitalWrite(config::PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(config::PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(config::PIN_TRIG, LOW);
  return pulseIn(config::PIN_ECHO, HIGH, config::ECHO_TIMEOUT_US);  // 0 = no echo
}

measure::Summary measureDistance() {
  uint32_t echoUs[config::PINGS];
  for (size_t i = 0; i < config::PINGS; i++) {
    if (i > 0) delay(config::PING_GAP_MS);
    echoUs[i] = ping();
  }
  const measure::Summary s = measure::summarize(echoUs, config::PINGS);
  Serial.printf("Reading: %u mm, spread %u mm, %u/%u echoes\n", s.distanceMm, s.spreadMm, s.validSamples,
                static_cast<unsigned>(config::PINGS));
  return s;
}

// Returns the HTTP status, or ≤ 0 for a network or TLS error (HTTPClient's codes).
int post(char* body, size_t length) {  // non-const: HTTPClient::POST takes uint8_t*
  if (!connectWifi()) return -1;
  if (USE_TLS && !clockReady()) return -1;

  NetworkClientSecure tls;
  NetworkClient plain;
  if (USE_TLS) tls.useBuiltinCACertBundle();  // verifies the server; never setInsecure()

  HTTPClient http;
  if (!http.begin(USE_TLS ? static_cast<NetworkClient&>(tls) : plain, config::API_URL)) return -1;
  http.setConnectTimeout(config::HTTP_TIMEOUT_MS);
  http.setTimeout(config::HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " DEVICE_KEY);
  const int status = http.POST(reinterpret_cast<uint8_t*>(body), length);
  http.end();
  return status;
}

const char* describe(retry::Outcome outcome) {
  switch (outcome) {
    case retry::Outcome::Stored: return "stored";
    case retry::Outcome::Unauthorized: return "unauthorized: check DEVICE_KEY in secrets.h";
    case retry::Outcome::Rejected: return "rejected: the server refused the body";
    case retry::Outcome::Transient: return "failed: network or server error";
  }
  return "unknown";
}

void sendReading(payload::Trigger trigger) {
  const measure::Summary s = measureDistance();
  if (s.validSamples == 0) {
    Serial.println("Send: no echoes, nothing sent");
    return;
  }

  char body[payload::MAX_LENGTH];
  const payload::Reading reading{config::DEVICE_ID, s.distanceMm, s.spreadMm, s.validSamples, config::INTERVAL_SEC,
                                 trigger};
  const size_t length = payload::build(reading, body, sizeof body);
  if (length == 0) {
    Serial.println("Send: could not build the body");
    return;
  }

  for (uint8_t attempts = 1;; attempts++) {
    const int status = post(body, length);
    const retry::Outcome outcome = retry::classify(status);
    Serial.printf("Send: attempt %u, HTTP %d, %s\n", attempts, status, describe(outcome));
    if (!retry::shouldRetry(outcome, attempts)) return;
    delay(retry::backoffMs(attempts));
  }
}

// Serial commands for bench testing and calibration: m = measure only, s = send a reading now.
void handleSerial() {
  while (Serial.available()) {
    switch (Serial.read()) {
      case 'm': measureDistance(); break;
      case 's': sendReading(payload::Trigger::Button); break;  // "button" is the on-demand trigger
      default: break;
    }
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.printf("kiln-watcher %s: posting to %s\n", config::DEVICE_ID, config::API_URL);

  pinMode(config::PIN_TRIG, OUTPUT);
  digitalWrite(config::PIN_TRIG, LOW);
  pinMode(config::PIN_ECHO, INPUT);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

  lastReadingMs = millis();
  sendReading(payload::Trigger::Timer);
}

void loop() {
  if (timing::elapsed(millis(), lastReadingMs, config::INTERVAL_SEC * 1000)) {
    lastReadingMs = millis();
    sendReading(payload::Trigger::Timer);
  }
  handleSerial();
  delay(50);
}
