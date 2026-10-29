#include <unity.h>

#include "measure.h"

using measure::summarize;

void setUp() {}
void tearDown() {}

static uint32_t usFor(uint32_t mm) { return mm * 2000 / 343; }  // inverse of echoToMm, truncated

void test_echo_to_mm() {
  TEST_ASSERT_EQUAL_UINT32(0, measure::echoToMm(0));
  TEST_ASSERT_EQUAL_UINT32(500, measure::echoToMm(2915));    // 2915 µs × 0.1715 = 499.9
  TEST_ASSERT_EQUAL_UINT32(1500, measure::echoToMm(8746));   // 1499.9
  TEST_ASSERT_EQUAL_UINT32(5145, measure::echoToMm(30000));  // the 30 ms timeout ≈ 5.1 m
}

void test_echo_to_mm_does_not_overflow() {
  TEST_ASSERT_EQUAL_UINT32(736586891, measure::echoToMm(UINT32_MAX));  // (2^32 − 1) × 343 / 2000
}

void test_no_valid_samples() {
  const uint32_t echoes[] = {0, 0, 0};
  const auto s = summarize(echoes, 3);
  TEST_ASSERT_EQUAL_UINT8(0, s.validSamples);
  TEST_ASSERT_EQUAL_UINT16(0, s.distanceMm);
  TEST_ASSERT_EQUAL_UINT16(0, s.spreadMm);
  TEST_ASSERT_EQUAL_UINT8(0, summarize(nullptr, 0).validSamples);
}

void test_single_sample() {
  const uint32_t echoes[] = {usFor(500) + 1};
  const auto s = summarize(echoes, 1);
  TEST_ASSERT_EQUAL_UINT8(1, s.validSamples);
  TEST_ASSERT_UINT16_WITHIN(1, 500, s.distanceMm);
  TEST_ASSERT_EQUAL_UINT16(0, s.spreadMm);
}

void test_median_ignores_outliers_and_timeouts() {
  // Unsorted, with two echo timeouts (0) and two wild outliers.
  const uint32_t mm[] = {505, 0, 498, 3000, 500, 502, 0, 40, 501};
  uint32_t echoes[9];
  for (int i = 0; i < 9; ++i) echoes[i] = mm[i] == 0 ? 0 : usFor(mm[i]) + 1;
  const auto s = summarize(echoes, 9);
  TEST_ASSERT_EQUAL_UINT8(7, s.validSamples);
  TEST_ASSERT_UINT16_WITHIN(1, 501, s.distanceMm);
}

void test_even_count_median_rounds_half_up() {
  const uint32_t echoes[] = {2915, 2921};  // 500 mm and 501 mm
  TEST_ASSERT_EQUAL_UINT16(501, summarize(echoes, 2).distanceMm);
}

void test_spread_is_interquartile_range() {
  // Sorted mm: 100 200 300 400 | 500 | 600 700 800 900 → Q1 = 250, Q3 = 750.
  uint32_t echoes[9];
  for (int i = 0; i < 9; ++i) echoes[i] = usFor((i + 1) * 100) + 1;
  const auto s = summarize(echoes, 9);
  TEST_ASSERT_UINT16_WITHIN(1, 500, s.distanceMm);
  TEST_ASSERT_UINT16_WITHIN(1, 500, s.spreadMm);
}

void test_spread_with_two_and_four_samples() {
  const uint32_t two[] = {usFor(400) + 1, usFor(600) + 1};
  TEST_ASSERT_UINT16_WITHIN(1, 200, summarize(two, 2).spreadMm);
  const uint32_t four[] = {usFor(100) + 1, usFor(200) + 1, usFor(300) + 1, usFor(400) + 1};
  TEST_ASSERT_UINT16_WITHIN(1, 200, summarize(four, 4).spreadMm);  // Q1 150, Q3 350
}

void test_ignores_samples_beyond_max() {
  uint32_t echoes[measure::MAX_SAMPLES + 5];
  for (auto& e : echoes) e = 2915;
  TEST_ASSERT_EQUAL_UINT8(measure::MAX_SAMPLES, summarize(echoes, measure::MAX_SAMPLES + 5).validSamples);
}

void test_clamps_huge_distances() {
  const uint32_t echoes[] = {UINT32_MAX};
  TEST_ASSERT_EQUAL_UINT16(UINT16_MAX, summarize(echoes, 1).distanceMm);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_echo_to_mm);
  RUN_TEST(test_echo_to_mm_does_not_overflow);
  RUN_TEST(test_no_valid_samples);
  RUN_TEST(test_single_sample);
  RUN_TEST(test_median_ignores_outliers_and_timeouts);
  RUN_TEST(test_even_count_median_rounds_half_up);
  RUN_TEST(test_spread_is_interquartile_range);
  RUN_TEST(test_spread_with_two_and_four_samples);
  RUN_TEST(test_ignores_samples_beyond_max);
  RUN_TEST(test_clamps_huge_distances);
  return UNITY_END();
}
