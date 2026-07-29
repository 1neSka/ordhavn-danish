import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = await import("../lib/cityScenarioData.ts");

test("city registry exposes two thematic engines with five difficulty cases each", () => {
  assert.equal(data.cityScenarios.length, 2);
  assert.equal(data.cityScenarioCards.length, 2);
  assert.deepEqual(new Set(data.cityScenarios.map((scenario) => scenario.engine)), new Set(["civic-form", "route-planner"]));
  for (const scenario of data.cityScenarios) {
    assert.equal(scenario.kind, "city");
    assert.equal(scenario.cases.length, 5);
    assert.equal(scenario.caseCount, 5);
    assert.deepEqual(new Set(scenario.cases.map((cityCase) => cityCase.level)), new Set(["A2", "A2+", "B1"]));
    assert.equal(data.cityScenarioRegistry[scenario.id], scenario);
  }
  assert.equal(data.cityScenarioIntegration.component, "CityScenarioHub");
  assert.equal(data.cityScenarioIntegration.cards, data.cityScenarioCards);
});

test("civic form cases combine document extraction, calculation, and ordered action planning", () => {
  const scenario = data.cityScenarioRegistry.borgerpost;
  assert.equal(scenario.engine, "civic-form");
  for (const cityCase of scenario.cases) {
    assert.ok(cityCase.document.paragraphs.length >= 3);
    assert.equal(cityCase.document.paragraphs.length, cityCase.document.englishParagraphs.length);
    assert.ok(cityCase.fields.length >= 3);
    assert.ok(cityCase.workflowSolution.length >= 4);
    for (const field of cityCase.fields) {
      assert.ok(field.options.some((option) => option.id === field.correctOptionId));
      assert.ok(field.options.length >= 3);
    }
    assert.ok(cityCase.workflowSolution.every((id) => cityCase.workflowOptions.some((option) => option.id === id)));

    const canonical = data.evaluateCivicForm(cityCase, {
      selections: Object.fromEntries(cityCase.fields.map((field) => [field.id, field.correctOptionId])),
      calculation: cityCase.calculation.expected,
      workflow: cityCase.workflowSolution,
    });
    assert.equal(canonical.success, true);
    assert.equal(canonical.score, 1);

    const broken = data.evaluateCivicForm(cityCase, { selections: {}, calculation: null, workflow: [] });
    assert.equal(broken.success, false);
    assert.equal(broken.score, 0);
    assert.ok(broken.feedback.length >= 3);
  }
});

test("route cases have exactly one feasible ordering and derive the cheapest valid ticket", () => {
  const scenario = data.cityScenarioRegistry.byruten;
  assert.equal(scenario.engine, "route-planner");
  for (const cityCase of scenario.cases) {
    const feasible = data.findFeasibleRoutes(cityCase);
    assert.deepEqual(feasible, [cityCase.solutionRoute], `${cityCase.id}: expected one deterministic route`);
    const ticket = data.findCheapestValidTicket(cityCase, cityCase.solutionRoute);
    assert.equal(ticket?.id, cityCase.solutionTicketId);
    const result = data.evaluateRoute(cityCase, cityCase.solutionRoute, cityCase.solutionTicketId);
    assert.equal(result.success, true);
    assert.equal(result.score, 1);
    assert.equal(result.timeline.length, cityCase.stops.length);
    assert.ok(result.timeline.every((entry) => entry.withinWindow));

    const reversed = data.evaluateRoute(cityCase, [...cityCase.solutionRoute].reverse(), cityCase.solutionTicketId);
    assert.equal(reversed.success, false);
  }
});

test("first-attempt metadata mints rav once and scales kroner locally", () => {
  const cityCase = data.cityScenarioRegistry.borgerpost.cases[0];
  const result = data.evaluateCivicForm(cityCase, {
    selections: Object.fromEntries(cityCase.fields.map((field) => [field.id, field.correctOptionId])),
    calculation: cityCase.calculation.expected,
    workflow: cityCase.workflowSolution,
  });
  const first = data.createCityAttemptMetadata("borgerpost", cityCase, result, 1);
  assert.equal(first.firstAttemptEligible, true);
  assert.equal(first.firstAttemptSuccess, true);
  assert.equal(first.ravEarned, 1);
  assert.equal(first.kronerEarned, cityCase.rewardKroner);
  const replay = data.createCityAttemptMetadata("borgerpost", cityCase, result, 2);
  assert.equal(replay.firstAttemptEligible, false);
  assert.equal(replay.ravEarned, 0);
  const deniedByPersistentHistory = data.createCityAttemptMetadata("borgerpost", cityCase, result, 1, false);
  assert.equal(deniedByPersistentHistory.firstAttemptEligible, false);
  assert.equal(deniedByPersistentHistory.firstAttemptSuccess, false);
  assert.equal(deniedByPersistentHistory.ravEarned, 0);
});

test("all learner content is Danish with English support and no Cyrillic", () => {
  const serialized = JSON.stringify(data.cityScenarios);
  assert.doesNotMatch(serialized, /[А-Яа-яЁё]/u);
  assert.match(serialized, /[æøå]/iu);
  assert.equal(new Set(data.cityScenarios.flatMap((scenario) => scenario.cases.map((cityCase) => cityCase.id))).size, 10);
  for (const scenario of data.cityScenarios) {
    assert.ok(scenario.englishDescription.length > 30);
    for (const cityCase of scenario.cases) {
      assert.ok(cityCase.title.length > 10);
      assert.ok(cityCase.brief.length > 45);
      assert.ok(cityCase.englishBrief.length > 30);
      assert.ok(cityCase.glossary.length >= 3);
      assert.ok(cityCase.glossary.every((entry) => entry.english.length > 2 && entry.note.length > 10));
      if (cityCase.engine === "civic-form") {
        assert.ok(cityCase.document.paragraphs.every((paragraph) => paragraph.length > 45));
        assert.ok(cityCase.document.englishParagraphs.every((paragraph) => paragraph.length > 40));
      } else {
        assert.ok(cityCase.dispatch.every((message) => message.length >= 45));
        assert.ok(cityCase.englishDispatch.every((message) => message.length > 40));
      }
    }
  }
});

test("city UI exports hub, runner, integration helpers, and accessible interaction hooks", async () => {
  const component = await readFile(new URL("../app/city-scenario-games.tsx", import.meta.url), "utf8");
  assert.match(component, /export function CityScenarioHub/u);
  assert.match(component, /export function CityScenarioRunner/u);
  assert.match(component, /export const cityScenarioGameApi/u);
  assert.match(component, /aria-live=/u);
  assert.match(component, /onKeyDown=/u);
  assert.match(component, /onStartAttempt\?: \(caseId: CityCaseId\) => boolean/u);
  assert.match(component, /attemptEligibility\.current/u);
  assert.match(component, /@media\(max-width:720px\)/u);
  assert.doesNotMatch(component, /[А-Яа-яЁё]/u);
  assert.doesNotMatch(component, /AIza[0-9A-Za-z_-]+/u);
});
