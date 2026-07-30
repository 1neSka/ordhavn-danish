import assert from "node:assert/strict";
import test from "node:test";
import {
  nextBossScenarioLaunch,
  resolveScenarioLaunch,
} from "../lib/scenarioLaunch.ts";

test("boss links resolve directly to the correct scenario engine", () => {
  assert.deepEqual(resolveScenarioLaunch("phone-sleep"), { kind: "phone", caseId: "phone-sleep" });
  assert.deepEqual(resolveScenarioLaunch("night-dispatch"), { kind: "logic", caseId: "night-dispatch" });
  assert.deepEqual(resolveScenarioLaunch("storskrald"), {
    kind: "city",
    caseId: "storskrald",
    cityScenarioId: "borgerpost",
  });
});

test("boss links prefer an unfinished scenario that can start immediately", () => {
  const launch = nextBossScenarioLaunch(
    ["harbor-bike-chain", "harbor-parcel-locker", "phone-sleep"],
    new Set(),
    [],
  );
  assert.deepEqual(launch, { kind: "phone", caseId: "phone-sleep" });
});

test("boss links advance past successful cases", () => {
  const launch = nextBossScenarioLaunch(
    ["metro-wheelchair", "post-deposit", "dialogue-maja-pitch"],
    new Set(["metro-wheelchair"]),
    [],
  );
  assert.deepEqual(launch, { kind: "dialogue", caseId: "dialogue-maja-pitch" });
});
