import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const city = await import("../lib/cityScenarioData.ts");
const logic = await import("../lib/logicScenarioData.ts");
const harbor = await import("../lib/harborData.ts");

const cityCases = city.cityScenarios.flatMap((scenario) => scenario.cases);
const logicCases = logic.logicScenarios;
const scenarioHubSource = await readFile(new URL("../app/scenario-games.tsx", import.meta.url), "utf8");
const harborSource = await readFile(new URL("../app/harbor-game.tsx", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("scenario catalog adds twenty distinct A2-B2 cases across four mechanics", () => {
  assert.equal(cityCases.length, 10);
  assert.equal(logicCases.length, 10);
  assert.deepEqual(new Set(city.cityScenarios.map((scenario) => scenario.engine)), new Set(["civic-form", "route-planner"]));
  assert.deepEqual(new Set(logic.logicScenarios.map((scenario) => scenario.engine)), new Set(["constraint-grid", "meaning-editor"]));
  assert.ok(cityCases.every((item) => item.level === "A2" || item.level === "A2+" || item.level === "B1"));
  assert.ok(logicCases.every((item) => item.level === "B1" || item.level === "B2"));
  const ids = [...cityCases.map((item) => item.id), ...logicCases.map((item) => item.id)];
  assert.equal(new Set(ids).size, 20);
});

test("new scenario packages are wired into the shared hub and evaluation route", () => {
  assert.match(scenarioHubSource, /activeGame === "city"/u);
  assert.match(scenarioHubSource, /activeGame === "logic"/u);
  assert.match(scenarioHubSource, /onStartAttempt=\{onStartAttempt\}/u);
  assert.match(scenarioHubSource, /onEvaluate=\{evaluateScenarioSubmission\}/u);
  assert.match(scenarioHubSource, /cityRunFromMetadata/u);
  assert.match(scenarioHubSource, /kronerReward: metadata\.kronerEarned/u);
  assert.match(pageSource, /resolveScenarioKronerReward/u);
});

test("levels twelve and fourteen end in scenario gates backed by real cases", () => {
  const gate12 = harbor.scenarioBossGates.find((gate) => gate.afterPathLevel === 12);
  const gate14 = harbor.scenarioBossGates.find((gate) => gate.afterPathLevel === 14);
  assert.ok(gate12);
  assert.ok(gate14);
  const cityIds = new Set(cityCases.map((item) => item.id));
  const logicIds = new Set(logicCases.map((item) => item.id));
  assert.ok([...cityIds].every((id) => gate12.scenarioIds.includes(id)));
  assert.ok([...logicIds].every((id) => gate14.scenarioIds.includes(id)));
  assert.ok(gate12.requiredCompletions >= 2);
  assert.ok(gate14.requiredCompletions >= 3);
});

test("harbor panorama contains distinct architecture and environmental layers", () => {
  for (const visual of ["clocktower", "bridge", "park", "clinic", "market", "archive", "council", "pilot-house", "station", "fyrtaarnet", "vaerftet", "toldboden"]) {
    assert.ok(harborSource.includes(`.${visual}`), visual);
  }
  for (const layer of ["harbor-gulls", "harbor-reflections", "harbor-pier-visual", "harbor-boat"]) {
    assert.match(harborSource, new RegExp(layer, "u"), layer);
  }
  assert.match(harborSource, /prefers-reduced-motion/u);
  assert.match(harborSource, /functional-building\.purchasable/u);
});

test("new learner-facing content contains no Cyrillic", () => {
  assert.doesNotMatch(JSON.stringify({ city: city.cityScenarios, logic: logic.logicScenarios }), /[\u0400-\u04ff]/u);
  assert.doesNotMatch(scenarioHubSource, /[\u0400-\u04ff]/u);
});
