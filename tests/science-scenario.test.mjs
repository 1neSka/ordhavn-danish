import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = await import("../lib/scienceScenarioData.ts");
const engine = await import("../lib/scienceEngine.ts");

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("science package spans levels 15–20 in an A2+ → B1 → B2 spiral", () => {
  assert.equal(data.scienceScenarioCases.length, 6);
  assert.equal(data.scienceScenarioCards.length, 6);
  assert.deepEqual(data.scienceScenarioCases.map((scenario) => scenario.courseLevel), [15, 16, 17, 18, 19, 20]);
  assert.deepEqual(data.scienceScenarioCases.map((scenario) => scenario.level), ["A2+", "B1", "B2", "A2+", "B1", "B2"]);
  assert.deepEqual(
    new Set(data.scienceScenarioCases.map((scenario) => scenario.kind)),
    new Set([
      "resistor-code",
      "circuit-tuning",
      "measurement-uncertainty",
      "lever-balance",
      "density-lab",
      "thermal-design",
    ]),
  );
  for (const scenario of data.scienceScenarioCases) {
    assert.equal(data.scienceScenarioRegistry[scenario.id], scenario);
    assert.ok(scenario.description.length >= 90);
    assert.ok(scenario.estimatedMinutes >= 8);
    assert.ok(scenario.instructionPane.objective.length >= 55);
    assert.ok(scenario.instructionPane.context.length >= 70);
    assert.ok(scenario.instructionPane.procedure.length >= 3);
    assert.ok(scenario.instructionPane.manual.length >= 2);
    assert.ok(scenario.instructionPane.glossary.length >= 3);
    assert.ok(scenario.instructionPane.glossary.every((entry) => entry.danish && entry.english));
    assert.ok(scenario.stages.length >= 3);
    assert.ok(scenario.stages.every((stage) => stage.fields.length && stage.solutionExplanation.length >= 40));
  }
});

test("all science cases pass structural and referential validation", () => {
  for (const scenario of data.scienceScenarioCases) {
    assert.deepEqual(engine.validateScienceScenario(scenario), [], scenario.id);
    assert.equal(engine.assertScienceScenarioValid(scenario), scenario);
  }
  const broken = structuredClone(data.scienceScenarioCases[0]);
  broken.stages[1].dependsOn = ["a-future-stage"];
  broken.stages[1].fields[0].tolerance = { absolute: -1 };
  const issues = engine.validateScienceScenario(broken);
  assert.ok(issues.some((issue) => issue.includes("must reference an earlier stage")));
  assert.ok(issues.some((issue) => issue.includes("finite non-negative")));
  assert.throws(() => engine.assertScienceScenarioValid(broken), /Invalid science scenario/u);
});

test("workspaces are code-native, typed visual models rather than image dependencies", async () => {
  const expectedWorkspaceKinds = [
    "resistor-board",
    "circuit",
    "measurement-bench",
    "lever",
    "density-tank",
    "thermal-section",
  ];
  assert.deepEqual(data.scienceScenarioCases.map((scenario) => scenario.workspace.kind), expectedWorkspaceKinds);
  const circuit = data.scienceScenarioRegistry["fyrlysets-stroemkreds"].workspace;
  const nodeIds = new Set(circuit.nodes.map((node) => node.id));
  assert.ok(circuit.components.every((component) => nodeIds.has(component.from) && nodeIds.has(component.to)));
  const resistor = data.scienceScenarioRegistry["farvekoden-paa-broen"].workspace;
  assert.ok(resistor.resistors.every((component) => component.bands.length === 4));
  const source = await readFile(new URL("../lib/scienceScenarioData.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.(?:png|jpe?g|webp|gif)|<img|fetch\(|gemini/iu);
});

test("canonical submissions complete every multi-stage case deterministically", () => {
  for (const scenario of data.scienceScenarioCases) {
    const solution = engine.createScienceSolution(scenario);
    const first = engine.evaluateScienceScenario(scenario, solution);
    const second = engine.evaluateScienceScenario(scenario, solution);
    assert.deepEqual(first, second);
    assert.equal(first.success, true, scenario.id);
    assert.equal(first.score, 1, scenario.id);
    assert.equal(first.completedStageIds.length, scenario.stages.length);
    assert.equal(first.nextStageId, null);
    assert.ok(first.stages.every((stage) => stage.success && !stage.locked));
  }
});

test("stage dependencies prevent skipping the scientific derivation", () => {
  const scenario = data.scienceScenarioRegistry["fyrlysets-stroemkreds"];
  const solution = engine.createScienceSolution(scenario);
  const skipped = engine.evaluateScienceScenario(scenario, {
    "build-network": solution["build-network"],
    "verify-current": solution["verify-current"],
    "verify-power": solution["verify-power"],
  });
  assert.equal(skipped.success, false);
  assert.equal(skipped.completedStageIds.length, 0);
  assert.equal(skipped.nextStageId, "ideal-resistance");
  assert.equal(skipped.stages[1].locked, true);
  assert.deepEqual(skipped.stages[1].missingDependencies, ["ideal-resistance"]);
  assert.equal(skipped.stages[1].earnedWeight, 0);

  const firstOnly = engine.evaluateScienceScenario(scenario, {
    "ideal-resistance": solution["ideal-resistance"],
  });
  assert.deepEqual(firstOnly.completedStageIds, ["ideal-resistance"]);
  assert.equal(firstOnly.nextStageId, "build-network");
  assert.ok(engine.getUnlockedScienceStageIds(scenario, new Set(firstOnly.completedStageIds)).includes("build-network"));
});

test("numeric grading accepts Danish decimals, declared units and configured tolerances", () => {
  const resistorField = data.scienceScenarioRegistry["farvekoden-paa-broen"].stages[0].fields[0];
  assert.equal(engine.evaluateScienceField(resistorField, "1 kΩ").correct, true);
  assert.equal(engine.evaluateScienceField(resistorField, "1.000 Ω").correct, true);
  assert.equal(engine.evaluateScienceField(resistorField, "0,9996 kΩ").correct, true);
  assert.equal(engine.evaluateScienceField(resistorField, "0,998 kΩ").correct, false);
  assert.equal(engine.evaluateScienceField(resistorField, "1 kV").correct, false);

  const currentField = data.scienceScenarioRegistry["fyrlysets-stroemkreds"].stages[2].fields[0];
  assert.equal(engine.evaluateScienceField(currentField, "0,013944 A").correct, true);
  const uncertaintyField = data.scienceScenarioRegistry["maalingen-der-ikke-er-et-punkt"].stages[2].fields[0];
  assert.equal(engine.evaluateScienceField(uncertaintyField, "0,47 %").correct, true);

  const relativeField = {
    kind: "number",
    id: "relative",
    label: "Relativ prøve",
    expected: 100,
    unit: "N",
    tolerance: { relative: 0.02 },
  };
  assert.equal(engine.resolveScienceTolerance(relativeField), 2);
  assert.equal(engine.evaluateScienceField(relativeField, 101.9).correct, true);
  assert.equal(engine.evaluateScienceField(relativeField, 102.1).correct, false);
});

test("unordered component selection earns deterministic partial credit without becoming correct", () => {
  const field = data.scienceScenarioRegistry["fyrlysets-stroemkreds"].stages[1].fields[0];
  const reordered = engine.evaluateScienceField(field, ["r22", "r330", "r150"]);
  assert.equal(reordered.correct, true);
  assert.equal(reordered.score, 1);
  const partial = engine.evaluateScienceField(field, ["r330", "r150", "r100"]);
  assert.equal(partial.correct, false);
  assert.ok(partial.score > 0 && partial.score < 1);
  const duplicate = engine.evaluateScienceField(field, ["r330", "r150", "r150", "r22"]);
  assert.equal(duplicate.correct, false);
});

test("stored answers follow independently recomputed physical relationships", () => {
  const resistor = data.scienceScenarioRegistry["farvekoden-paa-broen"];
  const digits = { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, grey: 8, white: 9 };
  const multipliers = { black: 1, brown: 10, red: 100, orange: 1_000 };
  const decoded = Object.fromEntries(resistor.workspace.resistors.map((item) => [
    item.id,
    (digits[item.bands[0]] * 10 + digits[item.bands[1]]) * multipliers[item.bands[2]],
  ]));
  assert.deepEqual(decoded, { r1: 1_000, r2: 27_000, r3: 470 });

  const circuit = data.scienceScenarioRegistry["fyrlysets-stroemkreds"];
  const actualCurrentMa = (9 - 2) / (330 + 150 + 22) * 1_000;
  closeTo(circuit.stages[2].fields[0].expected, actualCurrentMa, 1e-9);
  closeTo(circuit.stages[3].fields[0].expected, (actualCurrentMa / 1_000) ** 2 * 502, 1e-9);

  const measurement = data.scienceScenarioRegistry["maalingen-der-ikke-er-et-punkt"];
  const readings = measurement.workspace.readings;
  const mean = readings.reduce((sum, reading) => sum + reading, 0) / readings.length;
  const halfRange = (Math.max(...readings) - Math.min(...readings)) / 2;
  closeTo(measurement.stages[0].fields[0].expected, mean);
  closeTo(measurement.stages[1].fields[0].expected, halfRange);

  const lever = data.scienceScenarioRegistry["kranen-i-balance"];
  const [load, counterweight] = lever.workspace.loads;
  const balanceDistance = load.massKg * Math.abs(load.positionM) / counterweight.massKg;
  closeTo(lever.stages[2].fields[0].expected, balanceDistance);

  const density = data.scienceScenarioRegistry["tre-proever-i-saltvand"];
  density.workspace.samples.forEach((sample, index) => {
    closeTo(density.stages[0].fields[index].expected, sample.massG / sample.volumeCm3);
  });

  const thermal = data.scienceScenarioRegistry["kuldebroens-regnskab"];
  const thermalResistance = thermal.workspace.layers.reduce(
    (sum, layer) => sum + layer.thicknessM / (layer.conductivity * thermal.workspace.areaM2),
    0,
  );
  const deltaTemperature = thermal.workspace.insideTemperatureC - thermal.workspace.outsideTemperatureC;
  const power = deltaTemperature / thermalResistance;
  const woolUpgrade = thermal.workspace.upgrades.find((upgrade) => upgrade.id === "extra-wool");
  const upgradedResistance = thermalResistance
    + woolUpgrade.thicknessM / (woolUpgrade.conductivity * thermal.workspace.areaM2);
  const upgradedPower = deltaTemperature / upgradedResistance;
  closeTo(thermal.stages[1].fields[0].expected, thermalResistance, 1e-9);
  closeTo(thermal.stages[1].fields[1].expected, power, 1e-9);
  closeTo(thermal.stages[2].fields[0].expected, power * thermal.workspace.durationHours / 1_000, 1e-9);
  closeTo(thermal.stages[3].fields[0].expected, upgradedPower, 1e-9);
  closeTo(thermal.stages[3].fields[1].expected, (power - upgradedPower) / power * 100, 1e-9);
});
