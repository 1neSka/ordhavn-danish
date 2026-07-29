import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = await import("../lib/logicScenarioData.ts");

const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

test("logic scenario package exposes two engines with five cases each", () => {
  assert.equal(data.logicScenarioEngines.length, 2);
  assert.equal(data.logicScenarios.length, 10);
  assert.equal(data.logicScenarioCards.length, 10);
  assert.deepEqual(
    new Set(data.logicScenarios.map((scenario) => scenario.engine)),
    new Set(["constraint-grid", "meaning-editor"]),
  );
  for (const engine of data.logicScenarioEngines) {
    assert.equal(engine.scenarioIds.length, 5, `${engine.id}: expected five cases`);
    assert.equal(new Set(engine.scenarioIds).size, 5);
    assert.ok(engine.scenarioIds.every((id) => data.logicScenarioRegistry[id].engine === engine.id));
  }
  for (const scenario of data.logicScenarios) {
    assert.match(scenario.id, stableId);
    assert.ok(["B1", "B2"].includes(scenario.level));
    assert.equal(data.logicScenarioRegistry[scenario.id], scenario);
    assert.ok(scenario.description.length >= 60);
    assert.ok(scenario.glossary.length >= 3);
    assert.ok(scenario.glossary.every((entry) => entry.danish && entry.english));
    assert.ok(scenario.report.minimumWords >= 24);
    assert.equal(scenario.report.requiredFacts.length, scenario.report.criteria.length);
  }
});

test("every dispatch grid has one and only one code-valid solution", () => {
  const grids = data.logicScenarios.filter((scenario) => scenario.engine === "constraint-grid");
  assert.equal(grids.length, 5);
  for (const scenario of grids) {
    assert.ok([3, 4].includes(scenario.subjects.length));
    assert.equal(scenario.slots.length, scenario.subjects.length);
    assert.equal(new Set(scenario.subjects.map((item) => item.id)).size, scenario.subjects.length);
    assert.equal(new Set(scenario.slots.map((item) => item.id)).size, scenario.slots.length);
    assert.ok(scenario.clues.length >= 3);
    assert.ok(scenario.clues.every((clue) => clue.text.length >= 24));
    const solutions = data.enumerateConstraintSolutions(scenario);
    assert.equal(solutions.length, 1, `${scenario.id}: ambiguous constraint grid`);
    assert.deepEqual(solutions[0], scenario.solution);
    assert.deepEqual(data.evaluateConstraintAssignment(scenario, scenario.solution), {
      success: true,
      correctSubjects: scenario.subjects.length,
      totalSubjects: scenario.subjects.length,
    });
    for (let index = 0; index < scenario.rules.length; index += 1) {
      const withoutRule = { ...scenario, rules: scenario.rules.filter((_, ruleIndex) => ruleIndex !== index) };
      assert.ok(
        data.enumerateConstraintSolutions(withoutRule).length > 1,
        `${scenario.id}: rule ${index} (${scenario.rules[index].type}) is not logically essential`,
      );
    }
    const reversed = Object.fromEntries(
      scenario.subjects.map((subject, index) => [subject.id, scenario.slots[scenario.slots.length - index - 1].id]),
    );
    if (JSON.stringify(reversed) !== JSON.stringify(scenario.solution)) {
      assert.equal(data.evaluateConstraintAssignment(scenario, reversed).success, false);
    }
  }
});

test("grid rules reject missing, duplicate and foreign assignments", () => {
  const scenario = data.logicScenarioRegistry["night-dispatch"];
  assert.equal(data.satisfiesConstraintRules(scenario, {}), false);
  assert.equal(data.satisfiesConstraintRules(scenario, { oest: "2210", nord: "2210", syd: "2240" }), false);
  assert.equal(data.satisfiesConstraintRules(scenario, { oest: "foreign", nord: "2225", syd: "2240" }), false);
  assert.equal(data.satisfiesConstraintRules(scenario, { oest: "2210", nord: "2225", syd: "2240" }), true);
});

test("meaning editors preserve exactly three independent semantic dimensions", () => {
  const editors = data.logicScenarios.filter((scenario) => scenario.engine === "meaning-editor");
  assert.equal(editors.length, 5);
  for (const scenario of editors) {
    assert.equal(scenario.slots.length, 3);
    assert.equal(scenario.traps.length, 3);
    assert.ok(scenario.sourceMessage.length >= 110);
    const correct = Object.fromEntries(scenario.slots.map((slot) => [slot.id, slot.correctChoiceId]));
    assert.deepEqual(data.evaluateMeaningSelection(scenario, correct), {
      success: true,
      correctSlots: 3,
      totalSlots: 3,
      assembled: scenario.assembledSolution,
    });
    for (const slot of scenario.slots) {
      assert.equal(slot.choices.length, 3);
      assert.equal(new Set(slot.choices.map((choice) => choice.id)).size, 3);
      assert.ok(slot.choices.some((choice) => choice.id === slot.correctChoiceId));
      assert.ok(slot.choices.every((choice) => choice.text.length >= 20 && choice.explanation.length >= 15));
      const oneWrong = { ...correct, [slot.id]: slot.choices.find((choice) => choice.id !== slot.correctChoiceId).id };
      assert.equal(data.evaluateMeaningSelection(scenario, oneWrong).success, false, `${scenario.id}/${slot.id}: semantic slot is not essential`);
      assert.equal(data.evaluateMeaningSelection(scenario, oneWrong).correctSlots, scenario.slots.length - 1);
    }
    const wrong = Object.fromEntries(scenario.slots.map((slot) => [slot.id, slot.choices.find((choice) => choice.id !== slot.correctChoiceId).id]));
    assert.equal(data.evaluateMeaningSelection(scenario, wrong).success, false);
    assert.equal(data.evaluateMeaningSelection(scenario, wrong).correctSlots, 0);
  }
});

test("Danish logic markers are mechanically essential rather than decorative", () => {
  const allClues = data.logicScenarios
    .filter((scenario) => scenario.engine === "constraint-grid")
    .flatMap((scenario) => scenario.clues.map((clue) => clue.text.toLocaleLowerCase("da-DK")))
    .join(" ");
  assert.match(allClues, /før/u);
  assert.match(allClues, /hverken/u);
  assert.match(allClues, /ved siden af/u);
  assert.match(allClues, /mellem/u);

  const editorCopy = data.logicScenarios
    .filter((scenario) => scenario.engine === "meaning-editor")
    .map((scenario) => `${scenario.sourceMessage} ${scenario.traps.join(" ")}`.toLocaleLowerCase("da-DK"))
    .join(" ");
  assert.match(editorCopy, /medmindre/u);
  assert.match(editorCopy, /udelukker ikke/u);
  assert.match(editorCopy, /kun/u);
  assert.match(editorCopy, /først/u);
  assert.match(editorCopy, /ikke alle/u);
  assert.match(editorCopy, /både … og/u);
});

test("offline free-text rubric is deterministic and AI request is bounded to the public contract", () => {
  for (const scenario of data.logicScenarios) {
    const first = data.evaluateLogicSubmissionOffline(scenario, scenario.report.canonicalSubmission);
    const second = data.evaluateLogicSubmissionOffline(scenario, scenario.report.canonicalSubmission);
    assert.deepEqual(first, second);
    assert.equal(first.available, false);
    assert.equal(first.model, "deterministic-logic-rubric-v1");
    assert.ok(first.score >= 0.78, `${scenario.id}: canonical submission scored ${first.score}`);
    const empty = data.evaluateLogicSubmissionOffline(scenario, "");
    assert.ok(empty.score < first.score);
    const request = data.createLogicEvaluationRequest(scenario, "En afgrænset prøvebesked");
    assert.deepEqual(Object.keys(request).sort(), ["level", "requiredFacts", "scenarioId", "submission", "task"]);
    assert.equal(request.scenarioId, scenario.id);
    assert.equal(request.level, scenario.level);
    assert.equal(request.submission, "En afgrænset prøvebesked");
    assert.notEqual(request.requiredFacts, scenario.report.requiredFacts);
    assert.deepEqual(request.requiredFacts, scenario.report.requiredFacts);
    const bounded = data.createLogicEvaluationRequest(scenario, "x".repeat(data.LOGIC_SUBMISSION_MAX_CHARS + 50));
    assert.equal(bounded.submission.length, data.LOGIC_SUBMISSION_MAX_CHARS);
  }
});

test("scenario data is Danish with English confined to translation and glossary fields", () => {
  assert.doesNotMatch(JSON.stringify(data.logicScenarios), /[А-Яа-яЁё]/u);
  for (const scenario of data.logicScenarios) {
    assert.ok(scenario.translation.length > 8);
    assert.ok(scenario.glossary.every((entry) => /^[\x00-\x7F]+$/u.test(entry.english)));
    assert.doesNotMatch(scenario.title + scenario.description + scenario.report.prompt, /\b(the|and|with|from|only|before)\b/iu);
  }
});

test("UI exports hub and runner with keyboard, mobile and first-attempt support", async () => {
  const component = await readFile(new URL("../app/logic-scenario-games.tsx", import.meta.url), "utf8");
  assert.match(component, /export function LogicScenarioHub/u);
  assert.match(component, /export function LogicScenarioRunner/u);
  assert.match(component, /export const logicScenarioIntegration/u);
  assert.match(component, /firstAttemptEligible/u);
  assert.match(component, /firstAttemptSuccess/u);
  assert.match(component, /event\.key === "Arrow/u);
  assert.match(component, /event\.key === "Enter"/u);
  assert.match(component, /event\.ctrlKey \|\| event\.metaKey/u);
  assert.match(component, /@media\(max-width:800px\)/u);
  assert.match(component, /onEvaluate/u);
  assert.match(component, /evaluateWithFallback/u);
  assert.doesNotMatch(component, /[А-Яа-яЁё]/u);
  assert.doesNotMatch(component, /AIza[0-9A-Za-z_-]+/u);
  assert.doesNotMatch(component, /NEXT_PUBLIC_/u);
});
