import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/authority-scenario-game.tsx", import.meta.url), "utf8");
const data = await import("../lib/authorityScenarioData.ts");
const engine = await import("../lib/authorityEngine.ts");

test("authority UI exposes both a six-case catalog and a direct-case launch", () => {
  assert.match(source, /initialCaseId\?: string/u);
  assert.match(source, /useState<string \| null>\(initialCaseId \?\? null\)/u);
  assert.match(source, /authorityScenarioCases\.map/u);
  assert.match(source, /scenario\.courseLevel/u);
  assert.match(source, /scenario\.level/u);
  assert.match(source, /initialCaseId \? onExit\(\) : setActiveId\(null\)/u);
  for (const scenario of data.authorityScenarioCases) {
    assert.ok(source.includes("authorityScenarioCases"), scenario.id);
  }
});

test("the rendered case surface is Danish-first and shows evidence, pressure, objective, calculations and decisions", () => {
  for (const label of [
    "DIN OPGAVE",
    "INSTITUTIONELT PRES",
    "SAGSRESUMÉ",
    "Valgfrit regneark",
    "DIN AFGØRELSE",
    "Hvad kan beviserne bære?",
    "Kontrollér afgørelse",
    "AFGØRELSEN HOLDER",
    "Data slår pres.",
  ]) {
    assert.match(source, new RegExp(label, "u"));
  }
  assert.match(source, /scenario\.sourceDocuments\.map/u);
  assert.match(source, /scenario\.decisions\.map/u);
  assert.match(source, /scenario\.metrics\.map/u);
  assert.match(source, /computeAuthorityMetrics\(scenario\)/u);
  assert.match(source, /evaluateAuthorityScenario\(scenario/u);
  assert.doesNotMatch(source, /[А-Яа-яЁё]/u);
});

test("worksheet is visibly optional and cannot alter deterministic success", () => {
  assert.match(source, /påvirker ikke godkendelsen/u);
  assert.match(source, /scenario\.worksheet\.optionalNotice/u);
  assert.match(source, /Regnearket er stadig valgfrit/u);

  for (const scenario of data.authorityScenarioCases) {
    const decisionId = engine.createAuthoritySolution(scenario).decisionId;
    const empty = engine.evaluateAuthorityScenario(scenario, { decisionId });
    const intentionallyWrongWorksheet = Object.fromEntries(
      scenario.worksheet.fields.map((field) => [field.id, field.kind === "number" ? -999999 : "wrong"]),
    );
    const wrong = engine.evaluateAuthorityScenario(scenario, {
      decisionId,
      worksheet: intentionallyWrongWorksheet,
    });
    assert.equal(empty.success, true, scenario.id);
    assert.equal(wrong.success, true, scenario.id);
    assert.equal(wrong.worksheet.score, 0, scenario.id);
  }
});

test("final persuasion is optional, provider-injected and never invents an offline grade", () => {
  assert.match(source, /onEvaluatePersuasion\?:/u);
  assert.match(source, /prepareAuthorityPersuasion/u);
  assert.match(source, /Boolean\(onEvaluatePersuasion\)/u);
  assert.match(source, /AI-forbindelsen er ikke tilgængelig/u);
  assert.match(source, /kan hverken ændre facit eller blokere sagen/u);
  assert.match(source, /Afslut sag uden at vente/u);
  assert.match(source, /Det ændrer ikke sagens resultat/u);
  assert.doesNotMatch(source, /fetch\(|\/api\/|offlineScore|offlineRubric/iu);
});

test("successful completion emits the shared ScenarioRun shape with authority kind", () => {
  assert.match(source, /onComplete\(\{/u);
  assert.match(source, /kind: "authority"/u);
  assert.match(source, /success: true/u);
  assert.match(source, /stepId: "authority-decision"/u);
  assert.match(source, /worksheetAttempted: evaluation\.worksheet\.attempted/u);
  assert.match(source, /deterministic: true/u);
  assert.match(source, /if \(!evaluation\.success \|\| completed\) return/u);
});

test("visual treatment is code-native, responsive and contains no external assets", () => {
  assert.match(source, /authority-documents/u);
  assert.match(source, /authority-metrics/u);
  assert.match(source, /reliability-/u);
  assert.match(source, /@media\(max-width:980px\)/u);
  assert.doesNotMatch(source, /<img|https?:\/\/|\.png|\.jpe?g|\.webp/iu);
});
