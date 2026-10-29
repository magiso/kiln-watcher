#include <unity.h>

#include "timing.h"

using timing::Button;

void setUp() {}
void tearDown() {}

constexpr uint32_t DEBOUNCE = 30;
constexpr uint32_t COOLDOWN = 30000;

void test_elapsed() {
  TEST_ASSERT_FALSE(timing::elapsed(999, 0, 1000));
  TEST_ASSERT_TRUE(timing::elapsed(1000, 0, 1000));
  TEST_ASSERT_TRUE(timing::elapsed(5000, 0, 1000));
}

void test_elapsed_across_millis_wrap() {
  const uint32_t before = UINT32_MAX - 499;
  TEST_ASSERT_FALSE(timing::elapsed(499, before, 1000));  // 999 ms later, after the wrap
  TEST_ASSERT_TRUE(timing::elapsed(500, before, 1000));
}

void test_press_is_accepted_after_debounce() {
  Button b(DEBOUNCE, COOLDOWN);
  TEST_ASSERT_FALSE(b.update(true, 100));
  TEST_ASSERT_FALSE(b.update(true, 129));
  TEST_ASSERT_TRUE(b.update(true, 130));
  TEST_ASSERT_FALSE(b.update(true, 500));  // holding doesn't repeat
}

void test_bounce_shorter_than_debounce_is_ignored() {
  Button b(DEBOUNCE, COOLDOWN);
  TEST_ASSERT_FALSE(b.update(true, 100));
  TEST_ASSERT_FALSE(b.update(false, 110));
  TEST_ASSERT_FALSE(b.update(true, 115));
  TEST_ASSERT_FALSE(b.update(false, 120));
  TEST_ASSERT_FALSE(b.update(false, 200));
}

void test_release_is_not_a_press() {
  Button b(DEBOUNCE, COOLDOWN);
  b.update(true, 0);
  TEST_ASSERT_TRUE(b.update(true, 30));
  TEST_ASSERT_FALSE(b.update(false, 100));
  TEST_ASSERT_FALSE(b.update(false, 200));
}

void test_cooldown_between_presses() {
  Button b(DEBOUNCE, COOLDOWN);
  b.update(true, 0);
  TEST_ASSERT_TRUE(b.update(true, 30));
  b.update(false, 100);
  b.update(false, 200);
  // Second press inside the cooldown is ignored, even when held past it.
  b.update(true, 1000);
  TEST_ASSERT_FALSE(b.update(true, 1030));
  TEST_ASSERT_FALSE(b.update(true, 40000));
  b.update(false, 40100);
  b.update(false, 40200);
  // A fresh press after the cooldown is accepted.
  b.update(true, 41000);
  TEST_ASSERT_TRUE(b.update(true, 41030));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_elapsed);
  RUN_TEST(test_elapsed_across_millis_wrap);
  RUN_TEST(test_press_is_accepted_after_debounce);
  RUN_TEST(test_bounce_shorter_than_debounce_is_ignored);
  RUN_TEST(test_release_is_not_a_press);
  RUN_TEST(test_cooldown_between_presses);
  return UNITY_END();
}
