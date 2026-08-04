import assert from "node:assert/strict";
import test from "node:test";

const gemini = await import("../lib/geminiEvaluation.ts");

test("Gemini fallback moves from capable Flash models to stable lighter models", () => {
  assert.deepEqual(gemini.GEMINI_MODEL_FALLBACK, [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ]);
  assert.equal(new Set(gemini.GEMINI_MODEL_FALLBACK).size, gemini.GEMINI_MODEL_FALLBACK.length);
});

test("evaluation requests are bounded before any external request", () => {
  const request = {
    scenarioId: "harbor-investigation",
    task: "formal-report",
    submission: "Anlægget standsede klokken 06.42, hvorefter vagten tilkaldte assistance.",
    requiredFacts: ["Kranen standsede klokken 06.42."],
    level: "B2",
  };
  assert.equal(gemini.isGeminiEvaluationRequest(request), true);
  assert.equal(gemini.isGeminiEvaluationRequest({ ...request, task: "operational-note" }), true);
  assert.equal(gemini.isGeminiEvaluationRequest({ ...request, task: "public-notice" }), true);
  assert.equal(gemini.isGeminiEvaluationRequest({ ...request, submission: "kort" }), false);
  assert.equal(gemini.isGeminiEvaluationRequest({ ...request, requiredFacts: Array(21).fill("x") }), false);
});

test("structured Gemini output is clamped and sanitized", () => {
  const parsed = gemini.parseGeminiEvaluation({
    score: 1.4,
    verdict: "accepted",
    feedback: "  God kronologi.  ",
    strengths: ["Præcis tid", 42, "Formelt register"],
    improvements: ["Mere forsigtig evidentialitet"],
    correctedSubmission: "Anlægget standsede klokken 06.42.",
    languageIssues: [{ original: "klokken 6.42", correction: "klokken 06.42", explanation: "Brug samme tidsformat konsekvent." }],
  }, "gemini-test");
  assert.equal(parsed?.score, 1);
  assert.equal(parsed?.feedback, "God kronologi.");
  assert.deepEqual(parsed?.strengths, ["Præcis tid", "Formelt register"]);
  assert.equal(parsed?.languageIssues[0].correction, "klokken 06.42");
  assert.equal(gemini.parseGeminiEvaluation({ score: "1" }, "gemini-test"), null);
});

test("a quota failure falls through to the next model", async () => {
  const calls = [];
  const request = {
    scenarioId: "harbor-investigation",
    task: "formal-report",
    submission: "Anlægget standsede klokken 06.42, hvorefter vagten tilkaldte assistance.",
    requiredFacts: ["Kranen standsede klokken 06.42."],
    level: "B2",
  };
  const fetcher = async (url) => {
    calls.push(url);
    if (calls.length === 1) return new Response("quota", { status: 429 });
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      score: 0.8,
      verdict: "accepted",
      feedback: "Klar rapport.",
      strengths: ["Kronologi"],
      improvements: [],
      correctedSubmission: "Anlægget standsede klokken 06.42.",
      languageIssues: [],
    }) }] } }] });
  };
  const result = await gemini.evaluateWithGeminiFallback(request, "hidden-test-key", fetcher, 100);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /gemini-3\.6-flash/u);
  assert.match(calls[1], /gemini-3\.5-flash/u);
  assert.equal(result?.model, "gemini-3.5-flash");
});

test("dialogue language feedback can quote only learner turns", () => {
  const request = {
    scenarioId: "dialogue-language",
    task: "micro-dialogue",
    submission: [
      "LEARNER: Jeg vil bare sende besked anonymt.",
      "CHARACTER: Hvis du lover, kan jeg måske hjælpe.",
      "LEARNER: Det betyder at chefen kan ikke se mig.",
    ].join("\n"),
    requiredFacts: ["Only LEARNER lines belong to the learner."],
    level: "B2",
  };
  const parsed = gemini.parseGeminiEvaluation({
    score: 0.75,
    verdict: "revise",
    feedback: "Strategien lykkes.",
    strengths: ["Målet nås"],
    improvements: ["Ret ledsætningsordstillingen"],
    correctedSubmission: "1. Jeg vil bare sende en besked anonymt.\n2. Det betyder, at chefen ikke kan se mig.",
    languageIssues: [
      { original: "sende besked", correction: "sende en besked", explanation: "Det tællelige substantiv kræver en artikel." },
      { original: "kan jeg måske hjælpe", correction: "jeg måske kan hjælpe", explanation: "Denne tekst tilhører karakteren." },
    ],
  }, "gemini-test", request);
  assert.equal(parsed?.languageIssues.length, 1);
  assert.equal(parsed?.languageIssues[0].original, "sende besked");
});
