import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const responseTimeStats = await import("../lib/responseTimeStats.ts");

const samples = (times) => times.map((responseMs, index) => ({ id: `attempt-${index}`, responseMs }));
const filter = (times, options) => responseTimeStats.filterResponseTimeOutliers(samples(times), (attempt) => attempt.responseMs, options);

test("fast answers remain present and numerically unchanged", () => {
  const original = samples([0, 180, 950, 1_800, 3_200, 5_500, 7_100, 8_400]);
  const snapshot = structuredClone(original);
  const result = responseTimeStats.filterResponseTimeOutliers(original, (attempt) => attempt.responseMs);

  assert.deepEqual(result.included, original);
  assert.deepEqual(original, snapshot, "the raw attempt collection must not be changed");
  assert.equal(result.included[1], original[1], "included records should remain the original records");
  assert.equal(result.excluded.length, 0);
});

test("long inactive and alt-tab pauses cannot skew the statistical sample", () => {
  const result = filter([5_200, 5_600, 6_100, 6_400, 6_900, 7_300, 7_700, 8_200, 8_900, 9_400, 94_000, 180_000, 780_000]);

  assert.equal(result.strategy, "adaptive");
  assert.deepEqual(result.included.map((attempt) => attempt.responseMs), [5_200, 5_600, 6_100, 6_400, 6_900, 7_300, 7_700, 8_200, 8_900, 9_400, 94_000]);
  assert.deepEqual(result.excluded.map(({ responseMs, reason }) => ({ responseMs, reason })), [
    { responseMs: 180_000, reason: "adaptive-outlier" },
    { responseMs: 780_000, reason: "hard-cap" },
  ]);
  assert.ok(result.upperBoundMs > 120_000 && result.upperBoundMs < 180_000);
});

test("the personal fence preserves a consistently slower user's valid answers", () => {
  const result = filter([31_000, 34_000, 36_000, 39_000, 42_000, 46_000, 51_000, 58_000, 210_000]);

  assert.equal(result.strategy, "adaptive");
  assert.ok(result.upperBoundMs >= 210_000);
  assert.deepEqual(result.excluded, []);
  assert.equal(result.included.at(-1).responseMs, 210_000);
});

test("small histories use a predictable hard-cap fallback", () => {
  const result = filter([1_500, 182_000, 301_000]);

  assert.equal(result.strategy, "hard-cap-fallback");
  assert.equal(result.upperBoundMs, 300_000);
  assert.deepEqual(result.included.map((attempt) => attempt.responseMs), [1_500, 182_000]);
  assert.deepEqual(result.excluded.map(({ responseMs, reason }) => ({ responseMs, reason })), [
    { responseMs: 301_000, reason: "hard-cap" },
  ]);
});

test("invalid timings are excluded from aggregates without rewriting records", () => {
  const original = samples([2_000, Number.NaN, -10, Number.POSITIVE_INFINITY]);
  const result = responseTimeStats.filterResponseTimeOutliers(original, (attempt) => attempt.responseMs);

  assert.deepEqual(result.included.map((attempt) => attempt.responseMs), [2_000]);
  assert.equal(result.excluded.length, 3);
  assert.ok(result.excluded.every((entry) => entry.reason === "invalid"));
  assert.ok(Number.isNaN(original[1].responseMs));
  assert.equal(original[2].responseMs, -10);
});

test("a skill-specific sample can choose its own cap and options are validated", () => {
  const result = filter([800, 900, 1_000, 1_100, 1_200, 1_300, 20_000], {
    hardCapMs: 30_000,
    minimumHeadroomMs: 5_000,
    medianMultiplier: 4,
    madMultiplier: 8,
  });

  assert.equal(result.strategy, "adaptive");
  assert.equal(result.upperBoundMs, 6_100);
  assert.deepEqual(result.excluded.map((entry) => entry.responseMs), [20_000]);
  assert.throws(() => filter([1_000], { hardCapMs: 0 }), /hardCapMs/);
  assert.throws(() => filter([1_000], { minimumSampleSize: 2 }), /minimumSampleSize/);
});

test("the statistics view filters only time aggregates and labels excluded pauses", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /filterResponseTimeOutliers\(progress\.attempts/u);
  assert.match(pageSource, /recordedSessionMs - excludedPauseMs/u);
  assert.match(pageSource, /Sessionstid uden lange pauser/u);
  assert.match(pageSource, /lange pauser filtreret/u);
  assert.match(pageSource, /excludedResponseIds\.has\(attempt\.id\) \? "lang pause"/u);
  assert.match(pageSource, /const accuracy = progress\.attempts\.length/u, "accuracy should still use every raw attempt");
});
