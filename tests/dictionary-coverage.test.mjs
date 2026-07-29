import assert from "node:assert/strict";
import test from "node:test";

const dictionary = await import("../lib/dictionaryData.ts");
const course = await import("../lib/courseData.ts");
const harbor = await import("../lib/harborData.ts");
const scenarios = await import("../lib/scenarioData.ts");
const advanced = await import("../lib/advancedScenarioData.ts");
const city = await import("../lib/cityScenarioData.ts");
const logic = await import("../lib/logicScenarioData.ts");

const excludedKeys = new Set([
  "id", "type", "kind", "engine", "level", "accent", "color", "icon", "image", "avatar", "portrait",
  "audio", "modality", "difficulty", "assets", "note", "model", "component", "scoreMode", "task",
  "clauseType", "grammarFrame", "intent", "skill", "tags", "owner", "href",
]);

function skipKey(key) {
  return excludedKeys.has(key) || /english|translation/iu.test(key) || /(?:Id|Ids)$/u.test(key);
}

function textTokens(text) {
  return (text.normalize("NFC").match(/\p{Script=Latin}+(?:[-‐‑’']\p{Script=Latin}+)*/giu) ?? [])
    .map((token) => dictionary.normalizeSelectedDanishWord(token))
    .filter(Boolean);
}

function collectVocabulary(value, vocabulary, key = "") {
  if (typeof value === "string") {
    if (skipKey(key)) return;
    for (const token of textTokens(value)) vocabulary.set(token, (vocabulary.get(token) ?? 0) + 1);
    return;
  }
  if (Array.isArray(value)) {
    for (const child of value) collectVocabulary(child, vocabulary, key);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [childKey, child] of Object.entries(value)) {
    if (!skipKey(childKey)) collectVocabulary(child, vocabulary, childKey);
  }
}

const learnerFacingRoots = [
  course.courseLevels,
  [harbor.harborRanks, harbor.harborBuildings, harbor.harborCharacters, harbor.scenarioBossGates, harbor.harborScenarioCases],
  [scenarios.phoneSettings, scenarios.phonePages, scenarios.phoneMissions, scenarios.dialogueCharacters, scenarios.postCases, scenarios.metroCases],
  advanced.advancedScenarios,
  city.cityScenarios,
  logic.logicScenarios,
];

test("dictionary covers most word occurrences in learner-facing game data", () => {
  const vocabulary = new Map();
  for (const root of learnerFacingRoots) collectVocabulary(root, vocabulary);
  const rows = [...vocabulary];
  const coveredRows = rows.filter(([token]) => dictionary.lookupDanishWord(token));
  const totalOccurrences = rows.reduce((total, [, count]) => total + count, 0);
  const coveredOccurrences = coveredRows.reduce((total, [, count]) => total + count, 0);
  const typeCoverage = coveredRows.length / rows.length;
  const occurrenceCoverage = coveredOccurrences / totalOccurrences;

  assert.ok(typeCoverage >= 0.28, `type coverage ${(typeCoverage * 100).toFixed(1)}%`);
  assert.ok(occurrenceCoverage >= 0.69, `occurrence coverage ${(occurrenceCoverage * 100).toFixed(1)}%`);
});
