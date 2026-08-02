import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/detective-scenario-game.tsx", import.meta.url), "utf8");

test("detective UI exposes four freely selectable archive tabs", () => {
  for (const tab of ["people", "timeline", "documents", "data"]) {
    assert.match(source, new RegExp(`id: "${tab}"`, "u"));
  }
  assert.match(source, /setActiveTab\(tab\.id\)/u);
  assert.match(source, /role="tablist"/u);
  assert.match(source, /aria-selected=\{activeTab === tab\.id\}/u);
  assert.doesNotMatch(source, /lockedTab|unlockTab|disabled=\{activeTab/u);
});

test("player chooses one suspect and explicit evidence chips before checking", () => {
  assert.match(source, /chooseSuspect\(person\.id\)/u);
  assert.match(source, /toggleEvidence\(id\)/u);
  assert.match(source, /current\.includes\(id\)/u);
  assert.match(source, /disabled=\{!suspectId \|\| evidenceIds\.length === 0\}/u);
  assert.match(source, /evaluateDetectiveSelection\(scenario, \{ suspectId, evidenceIds \}\)/u);
});

test("evidence graph makes source, suspicion, exoneration and contradiction links visible", () => {
  assert.match(source, /buildEvidenceGraph\(scenario\)/u);
  assert.match(source, /function EvidenceGraph/u);
  assert.match(source, /function EvidenceGraphRow/u);
  assert.match(source, /evidence\.implicates/u);
  assert.match(source, /evidence\.exonerates/u);
  assert.match(source, /contradiction\.leftEvidenceId/u);
  assert.match(source, /contradiction\.rightEvidenceId/u);
  assert.match(source, /graph-line/u);
  assert.match(source, /BEVISNET/u);
});

test("a solved archive emits a deterministic detective ScenarioRun", () => {
  assert.match(source, /kind: "detective"/u);
  assert.match(source, /score: Math\.round\(evaluation\.score \* 500\)/u);
  assert.match(source, /path: evaluation\.selectedEvidenceIds/u);
  assert.match(source, /answerId: suspectId/u);
  assert.match(source, /correct: evaluation\.correctSuspect/u);
  assert.match(source, /contradictions: evaluation\.provenContradictionIds/u);
});

test("detective UI is local, code-native and contains no AI or network grader", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(|Gemini|apiKey|onEvaluate|AI-/u);
  assert.doesNotMatch(source, /<img|background-image:\s*url/u);
  assert.match(source, /getArchiveEntry/u);
  assert.match(source, /deterministic|INGEN GÆTTE-MASKINE/u);
});
