import assert from "node:assert/strict";
import test from "node:test";

const { scenarioBossGates } = await import("../lib/harborData.ts");

const newDialogueCaseIds = [
  "dialogue-freja-alibi",
  "dialogue-nora-redline",
  "dialogue-maja-faultline",
  "dialogue-eli9-audit",
  "dialogue-koret-blackout",
];

const rareEndingIds = [
  "eli9-ghost-protocol",
  "freja-mutual-blackmail",
  "koret-minority-report",
  "maja-scapegoat-win",
  "nora-redacted-truth",
];

test("every path level from ten through fourteen has exactly one boss gate", () => {
  const lateGates = scenarioBossGates.filter((gate) => gate.afterPathLevel >= 10 && gate.afterPathLevel <= 14);
  assert.deepEqual(lateGates.map((gate) => gate.afterPathLevel), [10, 11, 12, 13, 14]);
  assert.equal(new Set(lateGates.map((gate) => gate.afterPathLevel)).size, 5);
  assert.deepEqual(
    scenarioBossGates.filter((gate) => gate.afterPathLevel < 10).map((gate) => gate.afterPathLevel),
    [2, 4, 6, 8],
  );
});

test("late gates reference the five new dialogue cases as stable string IDs", () => {
  const lateScenarioIds = scenarioBossGates
    .filter((gate) => gate.afterPathLevel >= 10 && gate.afterPathLevel <= 14)
    .flatMap((gate) => gate.scenarioIds);

  for (const caseId of newDialogueCaseIds) {
    assert.equal(typeof caseId, "string");
    assert.ok(lateScenarioIds.includes(caseId), `${caseId} is not attached to a late boss gate`);
  }
  assert.ok(lateScenarioIds.every((caseId) => typeof caseId === "string" && caseId.length > 0));
});

test("ending challenges are valid alternatives within their own gate", () => {
  const endingChallenges = scenarioBossGates
    .filter((gate) => gate.afterPathLevel >= 10 && gate.afterPathLevel <= 14)
    .flatMap((gate) => (gate.endingRequirements ?? []).map((requirement) => ({ gate, requirement })));

  assert.ok(endingChallenges.length >= 2);
  assert.deepEqual(
    endingChallenges.map(({ requirement }) => requirement.endingId).sort(),
    rareEndingIds,
  );
  for (const { gate, requirement } of endingChallenges) {
    assert.ok(gate.scenarioIds.includes(requirement.caseId), `${gate.id}: ending case is not playable from this gate`);
    assert.equal(typeof requirement.endingId, "string");
    assert.ok(requirement.endingId.length > 0);
    assert.ok(requirement.description.length >= 25, `${gate.id}: ending clue is too revealing or too thin`);
  }
});

test("boss gates have coherent completion counts and unique IDs", () => {
  assert.equal(new Set(scenarioBossGates.map((gate) => gate.id)).size, scenarioBossGates.length);
  for (const gate of scenarioBossGates) {
    assert.ok(gate.requiredCompletions > 0, gate.id);
    assert.ok(gate.requiredCompletions <= gate.scenarioIds.length, gate.id);
    assert.ok(gate.requiredCompletions >= (gate.endingRequirements?.length ?? 0), gate.id);
    assert.equal(new Set(gate.scenarioIds).size, gate.scenarioIds.length, `${gate.id}: duplicate scenario ID`);
    assert.equal(new Set((gate.endingRequirements ?? []).map((item) => item.caseId)).size, gate.endingRequirements?.length ?? 0);
  }
});

test("boss-gate learner copy remains Danish-only", () => {
  assert.doesNotMatch(JSON.stringify(scenarioBossGates), /[\u0400-\u04ff]/u);
});
