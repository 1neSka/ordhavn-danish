import assert from "node:assert/strict";
import test from "node:test";

import { scenarioBossGates } from "../lib/harborData.ts";
import { resolveScenarioLaunch } from "../lib/scenarioLaunch.ts";

const expansionKinds = ["terminal", "science", "authority", "detective"];

test("levels 15 through 20 each end in one multi-system boss gate", () => {
  const expansionGates = scenarioBossGates.filter((gate) => gate.afterPathLevel >= 15);
  assert.deepEqual(expansionGates.map((gate) => gate.afterPathLevel), [15, 16, 17, 18, 19, 20]);

  for (const gate of expansionGates) {
    assert.equal(gate.scenarioIds.length, 4, `${gate.id}: expected one case from each expansion system`);
    assert.ok(gate.requiredCompletions >= 2, `${gate.id}: boss must require meaningful breadth`);
    assert.ok(gate.description.length >= 70, `${gate.id}: description is too thin`);

    const launches = gate.scenarioIds.map((caseId) => resolveScenarioLaunch(caseId));
    assert.ok(launches.every(Boolean), `${gate.id}: contains an unresolved scenario`);
    assert.deepEqual(launches.map((launch) => launch.kind).sort(), [...expansionKinds].sort());
  }
});

test("the final gate demands three distinct victories", () => {
  const finalGate = scenarioBossGates.find((gate) => gate.afterPathLevel === 20);
  assert.ok(finalGate);
  assert.equal(finalGate.requiredCompletions, 3);
  assert.ok(finalGate.reward.kr >= 2000);
});

test("expansion boss copy and IDs remain stable and Danish-only", () => {
  const expansionGates = scenarioBossGates.filter((gate) => gate.afterPathLevel >= 15);
  assert.doesNotMatch(JSON.stringify(expansionGates), /[\u0400-\u04ff]/u);
  assert.equal(new Set(expansionGates.flatMap((gate) => gate.scenarioIds)).size, 24);
  assert.ok(expansionGates.every((gate) => /^boss-gate-level-(?:15|16|17|18|19|20)$/.test(gate.id)));
});
