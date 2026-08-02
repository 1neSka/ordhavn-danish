import assert from "node:assert/strict";
import test from "node:test";

const course = await import("../lib/courseData.ts");
const scheduler = await import("../lib/scheduler.ts");
const scenarios = await import("../lib/scenarioData.ts");

test("course contains at least one hour of unique, audio-ready Danish content", () => {
  const missions = course.courseLevels.flatMap((level) => level.missions);
  const items = missions.flatMap((mission) => mission.questions);
  assert.ok(course.courseLevels.length >= 20);
  assert.ok(missions.length >= 74);
  assert.ok(items.length >= 592);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.ok(missions.reduce((sum, mission) => sum + mission.estimatedMinutes, 0) >= 100);
  assert.ok(items.every((item) => ["read", "produce"].includes(item.modality)));
  assert.ok(items.every((item) => item.assets.audio === null));
  assert.equal(items.filter((item) => item.type === "gender-bet").length, 10);
  assert.doesNotMatch(JSON.stringify(course.courseLevels), /[\u0400-\u04ff]/u);
  const itemTypes = new Set(items.map((item) => item.type));
  for (const type of [
    "choice",
    "order",
    "input",
    "gender-bet",
    "number-arcade",
    "definiteness",
    "agreement",
    "ikke-position",
    "cloze-multi",
    "register-match",
    "transform",
  ]) assert.ok(itemTypes.has(type), `missing legacy item type ${type}`);
  assert.ok(itemTypes.size >= 25, `only ${itemTypes.size} item mechanics`);
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

test("all scenario cases are internally playable and expandable", () => {
  assert.ok(scenarios.phoneMissions.length >= 3);
  assert.ok(scenarios.dialogueCharacters.length >= 3);
  assert.ok(scenarios.postCases.length >= 3);
  assert.ok(scenarios.metroCases.length >= 3);

  for (const mission of scenarios.phoneMissions) {
    for (const settingId of Object.keys(mission.requirements)) assert.ok(scenarios.phoneSettings[settingId], `${mission.id}: unknown setting ${settingId}`);
  }
  for (const character of scenarios.dialogueCharacters) {
    const dialogue = character.case;
    assert.ok(dialogue.nodes[dialogue.startNode], `${dialogue.id}: missing start node`);
    for (const node of Object.values(dialogue.nodes)) {
      assert.ok(node.choices.length >= 2, `${node.id}: needs a meaningful choice`);
      for (const choice of node.choices) if (choice.next) assert.ok(dialogue.nodes[choice.next], `${choice.id}: missing branch ${choice.next}`);
    }
  }
  for (const item of scenarios.postCases) assert.equal(item.actions.filter((action) => action.correct).length, 1, item.id);
  for (const item of scenarios.metroCases) assert.equal(item.routes.filter((route) => route.correct).length, 1, item.id);
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
