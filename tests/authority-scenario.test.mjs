import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = await import("../lib/authorityScenarioData.ts");
const engine = await import("../lib/authorityEngine.ts");

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("authority package spans levels 15–20 in the intended A2+ → B1 → B2 spiral", () => {
  assert.equal(data.authorityScenarioCases.length, 6);
  assert.equal(data.authorityScenarioCards.length, 6);
  assert.deepEqual(data.authorityScenarioCases.map((scenario) => scenario.courseLevel), [15, 16, 17, 18, 19, 20]);
  assert.deepEqual(data.authorityScenarioCases.map((scenario) => scenario.level), ["A2+", "B1", "B2", "A2+", "B1", "B2"]);
  assert.equal(new Set(data.authorityScenarioCases.map((scenario) => scenario.id)).size, 6);

  const representedTones = new Set(data.authorityScenarioCases.flatMap((scenario) => scenario.tones));
  assert.deepEqual(representedTones, new Set(["strict", "cynical", "warm", "noble", "absurd", "biting"]));

  for (const scenario of data.authorityScenarioCases) {
    assert.equal(data.authorityScenarioRegistry[scenario.id], scenario);
    assert.ok(scenario.description.length >= 120, `${scenario.id}: description is too thin`);
    assert.ok(scenario.brief.length >= 180, `${scenario.id}: brief is too thin`);
    assert.ok(scenario.institutionalDemand.length >= 70, `${scenario.id}: pressure is too thin`);
    assert.ok(scenario.playerObjective.length >= 80, `${scenario.id}: objective is too thin`);
    assert.ok(scenario.sourceDocuments.length >= 3, `${scenario.id}: missing evidence`);
    assert.ok(scenario.facts.length >= 2, `${scenario.id}: missing facts`);
    assert.ok(scenario.metrics.length >= 2, `${scenario.id}: missing derived metrics`);
    assert.ok(scenario.decisions.length >= 3, `${scenario.id}: missing decisions`);
    assert.ok(scenario.glossary.length >= 3, `${scenario.id}: missing language support`);
    assert.equal(scenario.worksheet.optionalNotice.includes("spærrer aldrig"), true);
    assert.equal(scenario.aiPolicy.mode, "optional-final-persuasion");
    assert.equal(scenario.aiPolicy.offlineBehavior, "skip");
  }
});

test("all cases pass structural, referential and deterministic validation", () => {
  for (const scenario of data.authorityScenarioCases) {
    assert.deepEqual(engine.validateAuthorityScenario(scenario), [], scenario.id);
    assert.equal(engine.assertAuthorityScenarioValid(scenario), scenario);
    const solution = engine.createAuthoritySolution(scenario);
    const first = engine.evaluateAuthorityScenario(scenario, solution);
    const second = engine.evaluateAuthorityScenario(scenario, solution);
    assert.deepEqual(first, second);
    assert.equal(first.success, true, scenario.id);
    assert.equal(first.validDecisionIds.length, 1, scenario.id);
    assert.equal(first.aiRequired, false);
  }

  const broken = structuredClone(data.authorityScenarioCases[0]);
  broken.metrics[0].inputs = ["ghost", "capacity"];
  broken.decisionRules[0].decisionId = "nonexistent";
  broken.aiPolicy.offlineBehavior = "grade";
  const issues = engine.validateAuthorityScenario(broken);
  assert.ok(issues.some((issue) => issue.includes("input ghost")));
  assert.ok(issues.some((issue) => issue.includes("unknown decision")));
  assert.ok(issues.some((issue) => issue.includes("must be skip")));
  assert.throws(() => engine.assertAuthorityScenarioValid(broken), /Invalid authority scenario/u);
});

test("the worksheet is genuinely optional and never gates the authoritative decision", () => {
  for (const scenario of data.authorityScenarioCases) {
    const decisionId = engine.createAuthoritySolution(scenario).decisionId;
    const withoutWorksheet = engine.evaluateAuthorityScenario(scenario, { decisionId });
    assert.equal(withoutWorksheet.success, true, scenario.id);
    assert.equal(withoutWorksheet.worksheet.attempted, false, scenario.id);
    assert.equal(withoutWorksheet.worksheet.score, 0, scenario.id);

    const wrongWorksheet = Object.fromEntries(scenario.worksheet.fields.map((field) => [
      field.id,
      field.kind === "number" ? -999_999 : "deliberately-wrong",
    ]));
    const withWrongWorksheet = engine.evaluateAuthorityScenario(scenario, { decisionId, worksheet: wrongWorksheet });
    assert.equal(withWrongWorksheet.success, true, scenario.id);
    assert.equal(withWrongWorksheet.worksheet.attempted, true, scenario.id);
    assert.equal(withWrongWorksheet.worksheet.score, 0, scenario.id);
  }
});

test("wrong or unknown institutional decisions fail even when the worksheet is perfect", () => {
  const scenario = data.authorityScenarioRegistry["myndighed-faergen-15"];
  const perfectWorksheet = { "ws-excess": "8 personer", "ws-load": "105,0 %" };
  const pressured = engine.evaluateAuthorityScenario(scenario, { decisionId: "sail", worksheet: perfectWorksheet });
  assert.equal(pressured.worksheet.score, 1);
  assert.equal(pressured.success, false);
  const unknown = engine.evaluateAuthorityScenario(scenario, { decisionId: "the-mayor-decides", worksheet: perfectWorksheet });
  assert.equal(unknown.knownDecision, false);
  assert.equal(unknown.success, false);
});

test("stored conclusions follow independently recomputed math and logic", () => {
  const ferry = engine.computeAuthorityMetrics(data.authorityScenarioRegistry["myndighed-faergen-15"]);
  assert.equal(ferry.excess, 168 - 160);
  assert.equal(ferry["load-percent"], 168 / 160 * 100);

  const damp = engine.computeAuthorityMetrics(data.authorityScenarioRegistry["myndighed-fugtproeven-16"]);
  assert.equal(damp.prevalence, 18 / 120 * 100);
  assert.equal(damp["above-threshold"], 5);

  const filter = engine.computeAuthorityMetrics(data.authorityScenarioRegistry["myndighed-ansigtsfilteret-17"]);
  closeTo(filter.precision, 18 / 218 * 100);
  closeTo(filter["false-share"], 200 / 218 * 100);
  assert.ok(filter.precision < 50);

  const lift = engine.computeAuthorityMetrics(data.authorityScenarioRegistry["myndighed-elevatoren-18"]);
  assert.deepEqual(lift, { "crates-total": 9 * 58, "one-trip": 9 * 58 + 143, "over-limit": 65 });

  const hospital = engine.computeAuthorityMetrics(data.authorityScenarioRegistry["myndighed-noedstroemmen-19"]);
  assert.deepEqual(hospital, { "essential-load": 42 + 36, "all-load": 42 + 36 + 18, reserve: 2 });

  const suppliers = engine.computeAuthorityMetrics(data.authorityScenarioRegistry["myndighed-leverandoeren-20"]);
  assert.equal(suppliers["north-overall"], 5);
  closeTo(suppliers["south-overall"], 3.4);
  assert.equal(suppliers["north-high"], 9);
  assert.equal(suppliers["south-high"], 10);
  assert.equal(suppliers["north-normal"], 1);
  closeTo(suppliers["south-normal"], 3.125);
  assert.ok(suppliers["north-overall"] > suppliers["south-overall"]);
  assert.ok(suppliers["north-high"] < suppliers["south-high"]);
  assert.ok(suppliers["north-normal"] < suppliers["south-normal"]);
});

test("conditions are evaluated from numeric evidence instead of worksheet or AI state", () => {
  const values = { measured: 15, threshold: 10, reserve: 2 };
  const condition = {
    kind: "all",
    conditions: [
      { kind: "compare", left: { kind: "reference", id: "measured" }, operator: ">=", right: { kind: "reference", id: "threshold" } },
      { kind: "not", condition: { kind: "compare", left: { kind: "reference", id: "reserve" }, operator: ">", right: { kind: "constant", value: 5 } } },
    ],
  };
  assert.equal(engine.evaluateAuthorityCondition(condition, values), true);
  assert.equal(engine.evaluateAuthorityCondition({ kind: "compare", left: { kind: "constant", value: 1 }, operator: "=", right: { kind: "constant", value: 1 + 1e-10 } }, values), true);
});

test("optional AI persuasion has a provider-only request contract and skips cleanly offline", () => {
  const scenario = data.authorityScenarioRegistry["myndighed-leverandoeren-20"];
  const solution = engine.createAuthoritySolution(scenario);
  const longDanishSubmission = Array.from(
    { length: scenario.aiPolicy.minimumWords },
    (_, index) => index % 2 ? "revisionen" : "risikogrupperne",
  ).join(" ");

  assert.deepEqual(
    engine.prepareAuthorityPersuasion(scenario, solution, longDanishSubmission, false),
    { status: "skipped", reason: "ai-unavailable" },
  );
  assert.deepEqual(
    engine.prepareAuthorityPersuasion(scenario, solution, "", true),
    { status: "skipped", reason: "not-requested" },
  );
  assert.deepEqual(
    engine.prepareAuthorityPersuasion(scenario, { decisionId: "exclude-north" }, longDanishSubmission, true),
    { status: "skipped", reason: "decision-not-authoritative" },
  );
  assert.deepEqual(
    engine.prepareAuthorityPersuasion(scenario, solution, "For kort.", true),
    { status: "skipped", reason: "submission-too-short" },
  );

  const prepared = engine.prepareAuthorityPersuasion(scenario, solution, longDanishSubmission, true);
  assert.equal(prepared.status, "ready");
  if (prepared.status === "ready") {
    assert.equal(prepared.request.task, "authority-persuasion");
    assert.equal(prepared.request.language, "da");
    assert.equal(prepared.request.chosenDecision.id, "stratified-audit");
    assert.equal(prepared.request.authoritativeMetrics.length, scenario.metrics.length);
    assert.match(prepared.request.systemInstruction, /modellen må aldrig ændre facit/u);
    assert.match(prepared.request.systemInstruction, /Fortæl aldrig spilleren, at vedkommende skal lyve/u);
    assert.match(prepared.request.systemInstruction, /strategisk udeladelse/u);
    assert.equal("offlineScore" in prepared.request, false);
  }
});

test("scenario foundation is data-only and has no network, image or UI dependency", async () => {
  const dataSource = await readFile(new URL("../lib/authorityScenarioData.ts", import.meta.url), "utf8");
  const engineSource = await readFile(new URL("../lib/authorityEngine.ts", import.meta.url), "utf8");
  assert.doesNotMatch(`${dataSource}\n${engineSource}`, /fetch\(|<img|react|\.png|\.jpe?g|\.webp/iu);
  assert.doesNotMatch(dataSource, /[А-Яа-яЁё]/u);
});
