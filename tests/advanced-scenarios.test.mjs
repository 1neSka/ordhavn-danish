import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = await import("../lib/advancedScenarioData.ts");

const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

test("advanced registry exposes three distinct B1-B2 hybrid scenarios", () => {
  assert.equal(data.advancedScenarios.length, 3);
  assert.equal(data.advancedScenarioCards.length, 3);
  assert.deepEqual(
    new Set(data.advancedScenarios.map((scenario) => scenario.task)),
    new Set(["formal-report", "risk-briefing", "public-message"]),
  );
  assert.equal(new Set(data.advancedScenarios.map((scenario) => scenario.id)).size, 3);
  for (const scenario of data.advancedScenarios) {
    assert.match(scenario.id, stableId);
    assert.ok(["B1", "B2"].includes(scenario.level));
    assert.equal(scenario.phases.length, 4);
    assert.equal(data.advancedScenarioRegistry[scenario.id], scenario);
    assert.equal(scenario.report.requiredFacts.length, scenario.report.criteria.length);
    assert.ok(scenario.report.minimumWords >= 40);
  }
});

test("Havnefogedens sag has a strict V2 builder and deterministic answer records", () => {
  const scenario = data.advancedScenarioRegistry["harbor-investigation"];
  assert.equal(scenario.kind, "investigation");
  assert.equal(scenario.questionBudget, 8);
  assert.equal(scenario.witnesses.length, 3);
  assert.equal(scenario.documents.length, 3);
  assert.equal(new Set(scenario.witnesses.map((witness) => witness.register)).size, 3);

  const documentIds = new Set(scenario.documents.map((document) => document.id));
  assert.equal(documentIds.size, scenario.documents.length);
  assert.ok(scenario.documents.some((document) => document.contradicts.length > 0));
  for (const document of scenario.documents) {
    assert.ok(document.excerpt.length > 25);
    assert.ok(document.englishExcerpt.length > 25);
    assert.ok(document.contradicts.every((id) => documentIds.has(id)));
  }

  const correct = data.composeV2Question({ hvWord: "hvornår", finiteVerb: "så", subject: "du", object: "båden", order: "verb-subject" });
  assert.equal(correct.valid, true);
  assert.equal(correct.question, "Hvornår så du båden?");
  const broken = data.composeV2Question({ hvWord: "hvornår", finiteVerb: "så", subject: "du", object: "båden", order: "subject-verb" });
  assert.equal(broken.valid, false);
  assert.equal(broken.question, "Hvornår du så båden?");

  for (const witness of scenario.witnesses) {
    assert.equal(Object.keys(witness.answers).length, 8, `${witness.id}: incomplete answer record`);
    for (const [key, answer] of Object.entries(witness.answers)) {
      assert.equal(key.split("|").length, 3, `${witness.id}: invalid normalized key`);
      assert.ok(answer.text.length > 18, `${witness.id}/${key}: weak Danish answer`);
      assert.ok(answer.englishText.length > 18, `${witness.id}/${key}: weak English support`);
    }
  }
  const exact = data.getWitnessAnswer(scenario, "mikkel", "hvornår", "see", "baaden");
  assert.equal(exact.precision, "exact");
  assert.match(exact.text, /06\.38/u);
  const unknown = data.getWitnessAnswer(scenario, "mikkel", "hvem", "see", "logbogen");
  assert.equal(unknown.precision, "broad");
  assert.deepEqual(unknown.factIds, []);
});

test("reliability sorting depends on grammatical distance", () => {
  const scenario = data.advancedScenarioRegistry["harbor-investigation"];
  const expected = ["direct", "reported", "hedged", "distanced"];
  assert.deepEqual(data.evaluateReliabilityOrder(scenario, expected), {
    success: true,
    correctPositions: 4,
    expected,
  });
  assert.equal(data.evaluateReliabilityOrder(scenario, [...expected].reverse()).success, false);
  assert.deepEqual(
    [...scenario.reliabilityStatements].sort((a, b) => b.reliability - a.reliability).map((item) => item.reliability),
    [4, 3, 2, 1],
  );
});

test("the investigation timeline has exactly one consistent arrangement", () => {
  const scenario = data.advancedScenarioRegistry["harbor-investigation"];
  assert.equal(data.countTimelineSolutions(scenario), 1);
  assert.equal(data.evaluateTimelineOrder(scenario, scenario.timelineSolution).success, true);
  assert.equal(data.evaluateTimelineOrder(scenario, [...scenario.timelineSolution].reverse()).success, false);
  const eventIds = new Set(scenario.timelineEvents.map((event) => event.id));
  for (const constraint of scenario.timelineConstraints) {
    assert.ok(eventIds.has(constraint.before));
    assert.ok(eventIds.has(constraint.after));
    assert.ok(constraint.text.length > 25);
  }
});

test("both protocol puzzles have deterministic calculations and exact control sequences", () => {
  const protocols = data.advancedScenarios.filter((scenario) => scenario.kind === "protocol");
  assert.equal(protocols.length, 2);
  for (const scenario of protocols) {
    assert.ok(scenario.manual.length >= 3);
    assert.ok(scenario.facts.length >= 4);
    assert.ok(scenario.solution.length >= 6);
    const controlIds = new Set(scenario.controls.map((control) => control.id));
    assert.equal(controlIds.size, scenario.controls.length);
    assert.equal(new Set(scenario.solution).size, scenario.solution.length);
    assert.ok(scenario.solution.every((id) => controlIds.has(id)));
    assert.deepEqual(data.evaluateProtocolState(scenario, scenario.solution, scenario.calculation.expected), {
      success: true,
      sequenceCorrect: true,
      calculationCorrect: true,
      correctPositions: scenario.solution.length,
    });
    assert.equal(data.evaluateProtocolState(scenario, [...scenario.solution].reverse(), scenario.calculation.expected).success, false);
    assert.equal(data.evaluateProtocolState(scenario, scenario.solution, scenario.calculation.expected + 1).success, false);
  }
});

test("offline evaluation is usable and AI request contract is exact", () => {
  for (const scenario of data.advancedScenarios) {
    const result = data.evaluateSubmissionOffline(scenario, scenario.report.canonicalSubmission);
    assert.equal(result.available, false);
    assert.ok(result.score >= 0.72, `${scenario.id}: canonical report scored ${result.score}`);
    assert.equal(result.model, "deterministic-offline-rubric-v1");
    assert.equal(result.improvements.length >= 1, true);

    const request = data.createAdvancedEvaluationRequest(scenario, "Et lokalt udkast");
    assert.deepEqual(Object.keys(request).sort(), ["level", "requiredFacts", "scenarioId", "submission", "task"]);
    assert.equal(request.scenarioId, scenario.id);
    assert.equal(request.task, scenario.task);
    assert.deepEqual(request.requiredFacts, scenario.report.requiredFacts);
  }
});

test("all scenario copy contains Danish and English only, with no Cyrillic", () => {
  assert.doesNotMatch(JSON.stringify(data.advancedScenarios), /[А-Яа-яЁё]/u);
});

test("advanced scenario UI contains no Cyrillic or embedded API secret", async () => {
  const component = await readFile(new URL("../app/advanced-scenario-games.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(component, /[А-Яа-яЁё]/u);
  assert.doesNotMatch(component, /AIza[0-9A-Za-z_-]+/u);
});
