import assert from "node:assert/strict";
import test from "node:test";

import { askTerminalAssistant, terminalAssistantEvaluationRequest } from "../lib/terminalAiClient.ts";
import { isGeminiEvaluationRequest } from "../lib/geminiEvaluation.ts";
import { createTerminalAssistantRequest, createTerminalSession } from "../lib/terminalEngine.ts";
import { terminalScenarioCases } from "../lib/terminalScenarioData.ts";

function assistantRequest() {
  const session = createTerminalSession(terminalScenarioCases[0]);
  const prepared = createTerminalAssistantRequest(session, "Hvordan bruger jeg grep til at finde en tekst?");
  assert.equal(prepared.accepted, true);
  return prepared.request;
}

test("a Danish terminal question maps to the shared Gemini endpoint", () => {
  const request = terminalAssistantEvaluationRequest(assistantRequest());
  assert.equal(request.task, "terminal-assistant");
  assert.equal(request.level, "B1");
  assert.equal(isGeminiEvaluationRequest(request), true);
  assert.ok(request.requiredFacts.some((fact) => fact.includes("Svar kun på dansk")));
});

test("assistant answers when available and skips cleanly when unavailable", async () => {
  const request = assistantRequest();
  const skipped = await askTerminalAssistant(request, async () => ({
    available: false, score: 0, verdict: "revise", feedback: "", strengths: [], improvements: [], model: null,
  }));
  assert.equal(skipped, null);

  const answer = await askTerminalAssistant(request, async () => ({
    available: true, score: 1, verdict: "accepted", feedback: "Prøv grep MØNSTER FIL og læs først manualen.", strengths: [], improvements: [], model: "test",
  }));
  assert.equal(answer, "Prøv grep MØNSTER FIL og læs først manualen.");
});
