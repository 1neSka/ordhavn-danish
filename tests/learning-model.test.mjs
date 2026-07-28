import assert from "node:assert/strict";
import test from "node:test";

const course = await import("../lib/courseData.ts");
const scheduler = await import("../lib/scheduler.ts");

test("course contains at least one hour of unique, audio-ready Danish content", () => {
  const missions = course.courseLevels.flatMap((level) => level.missions);
  const items = missions.flatMap((mission) => mission.questions);
  assert.equal(course.courseLevels.length, 8);
  assert.equal(missions.length, 24);
  assert.equal(items.length, 192);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.ok(missions.reduce((sum, mission) => sum + mission.estimatedMinutes, 0) >= 60);
  assert.ok(items.every((item) => ["read", "produce"].includes(item.modality)));
  assert.ok(items.every((item) => item.assets.audio === null));
  assert.deepEqual(
    new Set(items.map((item) => item.type)),
    new Set(["choice", "order", "input", "gender-bet", "number-arcade", "definiteness", "agreement", "ikke-position"]),
  );
});

test("every item has a playable answer path", () => {
  const items = course.courseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions));
  for (const item of items) {
    assert.ok(item.answer.trim(), item.id);
    assert.ok(item.prompt.trim(), item.id);
    assert.ok(item.explanation.trim(), item.id);
    if (["choice", "gender-bet", "number-arcade", "definiteness", "agreement"].includes(item.type)) {
      assert.ok(item.options.includes(item.answer), `${item.id}: answer missing from options`);
    }
    if (["order", "ikke-position"].includes(item.type)) {
      assert.ok(item.tokens.length >= 2, `${item.id}: missing tokens`);
    }
  }
});

test("FSRS-5 operational scheduling stays separate from fixed holdout measurement", () => {
  const operationalId = Array.from({ length: 100 }, (_, index) => `operational-${index}`).find((id) => !scheduler.assignHoldout(id));
  const holdoutId = Array.from({ length: 100 }, (_, index) => `holdout-${index}`).find((id) => scheduler.assignHoldout(id));
  assert.ok(operationalId);
  assert.ok(holdoutId);

  const reviewedAt = new Date("2026-01-01T12:00:00.000Z");
  const scheduled = scheduler.scheduleOperationalReview({ itemId: operationalId, modality: "read", reviewedAt, score: 1, correct: true, result: "correct", confidence: 0.9, hintsUsed: 0 });
  assert.equal(scheduled.mastery.scheduler, "fsrs-5");
  assert.equal(scheduled.scheduledEvent.scheduler, "fsrs-5");
  assert.ok(Date.parse(scheduled.mastery.card.due) > reviewedAt.getTime());

  const holdout = scheduler.createFixedHoldoutSchedule(holdoutId, "produce", reviewedAt);
  assert.equal(holdout.scheduler, "holdout-fixed");
  assert.deepEqual(holdout.checkpoints.map((checkpoint) => checkpoint.day), [1, 3, 7, 14]);
  const originalDates = holdout.checkpoints.map((checkpoint) => checkpoint.dueAt);
  const result = scheduler.recordHoldoutObservation(holdout, { checkpointDay: 1, observedAt: "2026-01-02T12:05:00.000Z", score: 0.7, result: "partial", hintsUsed: 0 });
  assert.deepEqual(result.mastery.checkpoints.map((checkpoint) => checkpoint.dueAt), originalDates);
  assert.equal(result.event.scheduler, "holdout-fixed");
  assert.equal(result.event.rating, null);
});

test("holdout assignment is deterministic and near the configured eight percent", () => {
  const assignments = Array.from({ length: 10_000 }, (_, index) => scheduler.assignHoldout(`item-${index}`));
  const rate = assignments.filter(Boolean).length / assignments.length;
  assert.ok(rate >= 0.05 && rate <= 0.1, `unexpected holdout rate ${rate}`);
  assert.equal(scheduler.assignHoldout("stabil-id"), scheduler.assignHoldout("stabil-id"));
});
