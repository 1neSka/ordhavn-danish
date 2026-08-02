import assert from "node:assert/strict";
import test from "node:test";

import {
  authorityPersuasionEvaluationRequest,
  evaluateAuthorityPersuasion,
} from "../lib/authorityAiClient.ts";
import {
  createAuthoritySolution,
  prepareAuthorityPersuasion,
} from "../lib/authorityEngine.ts";
import { authorityScenarioRegistry } from "../lib/authorityScenarioData.ts";
import { isGeminiEvaluationRequest } from "../lib/geminiEvaluation.ts";

function preparedRequest() {
  const scenario = authorityScenarioRegistry["myndighed-leverandoeren-20"];
  const submission = Array.from({ length: scenario.aiPolicy.minimumWords }, () => "argumentet").join(" ");
  const prepared = prepareAuthorityPersuasion(scenario, createAuthoritySolution(scenario), submission, true);
  assert.equal(prepared.status, "ready");
  return prepared.request;
}

test("authority persuasion maps to the shared server-side Gemini contract", () => {
  const mapped = authorityPersuasionEvaluationRequest(preparedRequest());
  assert.equal(mapped.task, "authority-persuasion");
  assert.equal(mapped.level, "B2");
  assert.ok(mapped.requiredFacts.some((fact) => fact.startsWith("Gyldig afgørelse:")));
  assert.ok(mapped.requiredFacts.some((fact) => fact.startsWith("Skjult kommunikativt mål:")));
  assert.equal(isGeminiEvaluationRequest(mapped), true);
});

test("unavailable Gemini becomes null while available feedback reaches the UI", async () => {
  const request = preparedRequest();
  const unavailable = await evaluateAuthorityPersuasion(request, async () => ({
    available: false, score: 0, verdict: "revise", feedback: "skip", strengths: [], improvements: [], model: null,
  }));
  assert.equal(unavailable, null);

  const available = await evaluateAuthorityPersuasion(request, async (mapped) => ({
    available: true, score: 0.9, verdict: "accepted", feedback: `God framing: ${mapped.task}`, strengths: ["data"], improvements: [], model: "test-model",
  }));
  assert.deepEqual(available, {
    feedback: "God framing: authority-persuasion",
    strengths: ["data"],
    improvements: [],
    model: "test-model",
  });
});
