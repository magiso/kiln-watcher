#include <stdio.h>
#include <unity.h>

#include "retry.h"

using retry::Outcome;

void setUp() {}
void tearDown() {}

void test_classify() {
  const struct {
    int status;
    Outcome expected;
  } cases[] = {
      {200, Outcome::Stored},       {204, Outcome::Stored},       {299, Outcome::Stored},
      {401, Outcome::Unauthorized}, {403, Outcome::Unauthorized}, {400, Outcome::Rejected},
      {404, Outcome::Rejected},     {413, Outcome::Rejected},     {408, Outcome::Transient},
      {429, Outcome::Transient},    {500, Outcome::Transient},    {503, Outcome::Transient},
      {0, Outcome::Transient},      {-1, Outcome::Transient},     {-11, Outcome::Transient},
      {301, Outcome::Transient},    {100, Outcome::Transient},
  };
  for (const auto& c : cases) {
    char message[16];
    snprintf(message, sizeof message, "status %d", c.status);
    TEST_ASSERT_EQUAL_MESSAGE(static_cast<int>(c.expected), static_cast<int>(retry::classify(c.status)), message);
  }
}

void test_should_retry_only_transient_until_max_attempts() {
  TEST_ASSERT_TRUE(retry::shouldRetry(Outcome::Transient, 1));
  TEST_ASSERT_TRUE(retry::shouldRetry(Outcome::Transient, 2));
  TEST_ASSERT_FALSE(retry::shouldRetry(Outcome::Transient, retry::MAX_ATTEMPTS));
  TEST_ASSERT_FALSE(retry::shouldRetry(Outcome::Stored, 1));
  TEST_ASSERT_FALSE(retry::shouldRetry(Outcome::Unauthorized, 1));
  TEST_ASSERT_FALSE(retry::shouldRetry(Outcome::Rejected, 1));
}

void test_backoff() {
  TEST_ASSERT_EQUAL_UINT32(0, retry::backoffMs(0));
  TEST_ASSERT_EQUAL_UINT32(5000, retry::backoffMs(1));
  TEST_ASSERT_EQUAL_UINT32(15000, retry::backoffMs(2));
  TEST_ASSERT_EQUAL_UINT32(0, retry::backoffMs(3));
}

void test_blink_codes() {
  TEST_ASSERT_EQUAL_UINT8(0, retry::blinkCode(Outcome::Stored));
  TEST_ASSERT_EQUAL_UINT8(1, retry::blinkCode(Outcome::Transient));
  TEST_ASSERT_EQUAL_UINT8(2, retry::blinkCode(Outcome::Unauthorized));
  TEST_ASSERT_EQUAL_UINT8(3, retry::blinkCode(Outcome::Rejected));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_classify);
  RUN_TEST(test_should_retry_only_transient_until_max_attempts);
  RUN_TEST(test_backoff);
  RUN_TEST(test_blink_codes);
  return UNITY_END();
}
