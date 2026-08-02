import assert from "node:assert/strict";
import test from "node:test";
import {
  nextBossScenarioLaunch,
  resolveScenarioLaunch,
} from "../lib/scenarioLaunch.ts";
import { scenarioBossGates } from "../lib/harborData.ts";

test("boss links resolve directly to the correct scenario engine", () => {
  assert.deepEqual(resolveScenarioLaunch("phone-sleep"), { kind: "phone", caseId: "phone-sleep" });
  assert.deepEqual(resolveScenarioLaunch("dialogue-eli9-audit"), { kind: "dialogue", caseId: "dialogue-eli9-audit" });
  assert.deepEqual(resolveScenarioLaunch("night-dispatch"), { kind: "logic", caseId: "night-dispatch" });
  assert.deepEqual(resolveScenarioLaunch("storskrald"), {
    kind: "city",
    caseId: "storskrald",
    cityScenarioId: "borgerpost",
  });
});

test("every learning-path boss target still resolves to a playable engine", () => {
  for (const gate of scenarioBossGates) {
    for (const caseId of gate.scenarioIds) assert.ok(resolveScenarioLaunch(caseId), `${gate.id}: unresolved ${caseId}`);
  }
});

test("boss links prefer an unfinished scenario that can start immediately", () => {
  const launch = nextBossScenarioLaunch(
    ["harbor-bike-chain", "harbor-parcel-locker", "phone-sleep"],
    new Set(),
    [],
  );
  assert.deepEqual(launch, { kind: "phone", caseId: "phone-sleep", forceDirect: true });
});

test("boss links advance past successful cases", () => {
  const launch = nextBossScenarioLaunch(
    ["metro-wheelchair", "post-deposit", "dialogue-maja-faultline"],
    new Set(["metro-wheelchair"]),
    [],
  );
  assert.deepEqual(launch, { kind: "dialogue", caseId: "dialogue-maja-faultline", forceDirect: true });
});

test("boss links explicitly bypass the scenario catalog", () => {
  const launch = nextBossScenarioLaunch(["harbor-bike-chain"], new Set(), []);
  assert.equal(launch?.caseId, "harbor-bike-chain");
  assert.equal(launch?.forceDirect, true);
});

test("an unfinished ending requirement follows a direct dialogue boss launch", () => {
  const launch = nextBossScenarioLaunch(
    ["dialogue-eli9-audit", "storskrald"],
    new Set(),
    [],
    [{ caseId: "dialogue-eli9-audit", endingId: "eli9-ghost-protocol" }],
  );

  assert.deepEqual(launch, {
    kind: "dialogue",
    caseId: "dialogue-eli9-audit",
    forceDirect: true,
    targetEndingId: "eli9-ghost-protocol",
  });
});

test("ordinary direct scenarios do not inherit an unrelated ending target", () => {
  const launch = nextBossScenarioLaunch(
    ["storskrald"],
    new Set(),
    [],
    [{ caseId: "dialogue-eli9-audit", endingId: "eli9-ghost-protocol" }],
  );

  assert.equal(launch?.targetEndingId, undefined);
});
