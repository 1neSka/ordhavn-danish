import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isGeminiEvaluationRequest } from "../lib/geminiEvaluation.ts";

test("the shared Gemini contract accepts all four lesson tasks", () => {
  for (const task of ["free-rewrite", "compress", "micro-dialogue", "explain-why"]) {
    assert.equal(isGeminiEvaluationRequest({
      scenarioId: `lesson-${task}`,
      task,
      submission: "Dette er en tilstrækkelig lang dansk besvarelse til vurdering.",
      requiredFacts: ["Bevar den verificerede oplysning."],
      level: "B2",
    }), true, task);
  }
});
test("LessonPlayer skips unavailable AI work without writing a fake attempt", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../lib/lessonAiClient.ts", import.meta.url), "utf8");
  assert.match(page, /if \(!evaluation\.available\) \{\s*setAiSkipped\(true\);\s*setChecked\(true\);\s*setCorrect\(false\);\s*return;/u);
  assert.match(page, /AI-opgaven er sprunget over/u);
  assert.match(client, /evaluateScenarioSubmission/u);
  assert.doesNotMatch(client, /scoreFreeAnswer|offlineRubric|local rule|regelengine/u);
});
