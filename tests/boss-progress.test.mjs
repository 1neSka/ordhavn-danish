import assert from "node:assert/strict";
import test from "node:test";
import { getBossGateProgress } from "../lib/bossProgress.ts";

const gate = {
  id: "gate",
  afterPathLevel: 11,
  title: "Gate",
  description: "Gate",
  scenarioIds: ["dialogue-freja-alibi", "night-dispatch"],
  requiredCompletions: 2,
  endingRequirements: [{
    caseId: "dialogue-freja-alibi",
    endingId: "freja-mutual-blackmail",
    description: "Hidden target",
  }],
  reward: { kr: 10 },
};

const run = (caseId, success, foundEnding = "") => ({
  id: `${caseId}-${foundEnding}`,
  kind: caseId.startsWith("dialogue") ? "dialogue" : "logic",
  caseId,
  title: caseId,
  level: "B2",
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T00:01:00.000Z",
  success,
  score: 200,
  maxScore: 500,
  path: [],
  decisions: [],
  metadata: { endingId: foundEnding },
});

test("a generic success does not satisfy a named ending gate", () => {
  const progress = getBossGateProgress(gate, [
    run("dialogue-freja-alibi", true, "freja-clean-exit"),
    run("night-dispatch", true),
  ]);
  assert.equal(progress.completed, 2);
  assert.equal(progress.cleared, false);
  assert.deepEqual(progress.nextScenarioIds.slice(0, 1), ["dialogue-freja-alibi"]);
});

test("the requested ending counts even when it is deliberately morally dark", () => {
  const progress = getBossGateProgress(gate, [
    run("dialogue-freja-alibi", false, "freja-mutual-blackmail"),
    run("night-dispatch", true),
  ]);
  assert.equal(progress.completed, 2);
  assert.equal(progress.endingsMet, 1);
  assert.equal(progress.cleared, true);
});
