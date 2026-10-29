#include <stdio.h>
#include <string.h>
#include <unity.h>

#include "payload.h"

using payload::Reading;
using payload::Trigger;

void setUp() {}
void tearDown() {}

static Reading sample() { return {"kiln-1", 482, 6, 14, 14400, Trigger::Timer}; }

// The same body the web app's tests parse (lib/domain/reading.test.ts), keeping both sides in step.
void test_matches_shared_fixture() {
  FILE* f = fopen("test/fixtures/reading.json", "r");
  TEST_ASSERT_NOT_NULL_MESSAGE(f, "run from firmware/ (pio test does)");
  char expected[256] = {0};
  const size_t n = fread(expected, 1, sizeof expected - 1, f);
  fclose(f);
  TEST_ASSERT_GREATER_THAN(0, n);

  char buf[payload::MAX_LENGTH];
  TEST_ASSERT_EQUAL(strlen(expected), payload::build(sample(), buf, sizeof buf));
  TEST_ASSERT_EQUAL_STRING(expected, buf);
}

void test_button_trigger() {
  Reading r = sample();
  r.trigger = Trigger::Button;
  char buf[payload::MAX_LENGTH];
  payload::build(r, buf, sizeof buf);
  TEST_ASSERT_NOT_NULL(strstr(buf, "\"trigger\":\"button\""));
}

void test_largest_values_fit_max_length() {
  char id[65];
  memset(id, 'x', 64);
  id[64] = '\0';
  const Reading r{id, UINT16_MAX, UINT16_MAX, UINT8_MAX, UINT32_MAX, Trigger::Button};
  char buf[payload::MAX_LENGTH];
  const size_t length = payload::build(r, buf, sizeof buf);
  TEST_ASSERT_GREATER_THAN(0, length);
  TEST_ASSERT_LESS_THAN(payload::MAX_LENGTH, length);
}

void test_rejects_invalid_device_ids() {
  char buf[payload::MAX_LENGTH];
  char tooLong[66];
  memset(tooLong, 'x', 65);
  tooLong[65] = '\0';
  const char* bad[] = {"", "has space", "quote\"", "slash/", tooLong};
  for (const char* id : bad) {
    Reading r = sample();
    r.deviceId = id;
    TEST_ASSERT_EQUAL_MESSAGE(0, payload::build(r, buf, sizeof buf), id);
  }
  Reading r = sample();
  r.deviceId = nullptr;
  TEST_ASSERT_EQUAL(0, payload::build(r, buf, sizeof buf));
  r.deviceId = "Kiln_2-B";
  TEST_ASSERT_GREATER_THAN(0, payload::build(r, buf, sizeof buf));
}

void test_rejects_zero_interval() {
  Reading r = sample();
  r.intervalSec = 0;
  char buf[payload::MAX_LENGTH];
  TEST_ASSERT_EQUAL(0, payload::build(r, buf, sizeof buf));
}

void test_buffer_too_small() {
  char buf[20] = "untouched";
  TEST_ASSERT_EQUAL(0, payload::build(sample(), buf, sizeof buf));
  TEST_ASSERT_EQUAL_STRING("", buf);
  TEST_ASSERT_EQUAL(0, payload::build(sample(), buf, 0));
  TEST_ASSERT_EQUAL(0, payload::build(sample(), nullptr, 100));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_matches_shared_fixture);
  RUN_TEST(test_button_trigger);
  RUN_TEST(test_largest_values_fit_max_length);
  RUN_TEST(test_rejects_invalid_device_ids);
  RUN_TEST(test_rejects_zero_interval);
  RUN_TEST(test_buffer_too_small);
  return UNITY_END();
}
