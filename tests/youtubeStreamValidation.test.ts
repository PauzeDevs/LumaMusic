import test from "node:test";
import assert from "node:assert/strict";
import {
  boundedExpiry,
  safeBitrate,
  safeDuration,
  validateStreamUrl
} from "../services/youtubeStreamValidation";

test("accepts HTTPS YouTube and googlevideo stream hosts", () => {
  assert.equal(validateStreamUrl("https://rr1---sn.googlevideo.com/audio", "test"), "https://rr1---sn.googlevideo.com/audio");
  assert.equal(validateStreamUrl("https://youtube.com/audio", "test"), "https://youtube.com/audio");
});

test("rejects insecure, deceptive, credentialed, malformed and oversized URLs", () => {
  for (const url of [
    "http://rr1.googlevideo.com/audio",
    "https://googlevideo.com.attacker.example/audio",
    "https://user:pass@googlevideo.com/audio",
    "not a URL",
    `https://googlevideo.com/${"x".repeat(16_400)}`
  ]) assert.throws(() => validateStreamUrl(url, "test"));
});

test("bounds stream duration and uses fallback for invalid values", () => {
  assert.equal(safeDuration("123.6"), 124);
  assert.equal(safeDuration(0, 42), 42);
  assert.equal(safeDuration(-1, 42), 42);
  assert.equal(safeDuration(86_401, 42), 42);
  assert.equal(safeDuration(Infinity, 42), 42);
});

test("bounds expiry to a safe future window", () => {
  // Freeze the clock so the test does not race Date.now() across calls.
  // Without this, the expected timestamp can drift by 1 ms on CI runners.
  const originalNow = Date.now;
  const now = 1_800_000_000_000;
  Date.now = () => now;
  try {
    assert.equal(boundedExpiry(now + 10_000), now + 30 * 60 * 1000);
    assert.equal(boundedExpiry(now + 48 * 60 * 60 * 1000), now + 24 * 60 * 60 * 1000);
    assert.equal(boundedExpiry(now + 5 * 60 * 1000), now + 5 * 60 * 1000);
  } finally {
    Date.now = originalNow;
  }
});

test("accepts only finite, positive, bounded bitrates", () => {
  assert.equal(safeBitrate(128_000.4), 128_000);
  assert.equal(safeBitrate(0), undefined);
  assert.equal(safeBitrate(-1), undefined);
  assert.equal(safeBitrate(1_000_001), undefined);
  assert.equal(safeBitrate(NaN), undefined);
});
