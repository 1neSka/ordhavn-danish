import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeminiEvaluationPrompt } from "../lib/geminiEvaluation.ts";
import {
  buildMicroDialogueTurnPrompt,
  continueMicroDialogueWithGemini,
  isMicroDialogueTurnRequest,
  parseMicroDialogueTurn,
} from "../lib/microDialogueAi.ts";

const request = {
  scenarioId: "l16-m01-q08",
  level: "B2",
  situation: "Tal med en nervøs kollega.",
  persona: "En nervøs kollega, der frygter chefen.",
  goal: "Find ud af, hvad kollegaen så.",
  transcript: [{ role: "learner", text: "Du har dummet dig. Fortæl mig præcis, hvad du så." }],
  totalLearnerTurns: 3,
};

test("micro-dialogue turn contract accepts an awaiting character reply and rejects broken alternation", () => {
  assert.equal(isMicroDialogueTurnRequest(request), true);
  assert.equal(isMicroDialogueTurnRequest({ ...request, transcript: [...request.transcript, { role: "character", text: "Nej." }] }), false);
  assert.equal(isMicroDialogueTurnRequest({ ...request, transcript: [] }), false);
});

test("character prompt treats harsh tone as role-play with consequences instead of an invalid answer", () => {
  const prompt = buildMicroDialogueTurnPrompt(request);
  assert.match(prompt, /blunt, rude, manipulative, funny, accusatory, or unconventional/u);
  assert.match(prompt, /believable social consequences/u);
  assert.match(prompt, /not as invalid input/u);
  assert.match(prompt, /LEARNER: Du har dummet dig/u);
});

test("micro-dialogue response parser preserves the character reaction", () => {
  assert.deepEqual(parseMicroDialogueTurn({ reply: "Sådan skal du ikke tale til mig.", disposition: "hostile" }, "gemini-test"), {
    available: true,
    reply: "Sådan skal du ikke tale til mig.",
    disposition: "hostile",
    model: "gemini-test",
  });
  assert.equal(parseMicroDialogueTurn({ reply: "Hej", disposition: "happy" }, "gemini-test"), null);
});

test("micro-dialogue provider uses the shared model fallback and structured response", async () => {
  let sentBody;
  const fetcher = async (_url, init) => {
    sentBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Jeg svarer ikke på den tone.", disposition: "defensive" }) }] } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await continueMicroDialogueWithGemini(request, "test-key", fetcher);
  assert.equal(result?.available, true);
  assert.equal(result?.disposition, "defensive");
  assert.equal(sentBody.generationConfig.temperature, 0.8);
  assert.equal(sentBody.generationConfig.responseSchema.required.includes("reply"), true);
});

test("final lesson evaluation separates creative tone from strategic outcome", () => {
  const prompt = buildGeminiEvaluationPrompt({
    scenarioId: request.scenarioId,
    task: "micro-dialogue",
    submission: "LEARNER: Du er problemet.\nCHARACTER: Så går jeg.\nLEARNER: Vent, fortæl mig hvad du så.",
    requiredFacts: [request.persona, request.goal, "Only LEARNER lines belong to the learner."],
    level: "B2",
  });
  assert.match(prompt, /Never reject a response merely for being impolite or unprofessional/u);
  assert.match(prompt, /linguistically strong hostile choice/u);
  assert.match(prompt, /unstated moral or personality ideal/u);
});

test("lesson UI uses a dedicated three-turn renderer and never displays a fake canonical AI answer", async () => {
  const [renderer, registry, page, client] = await Promise.all([
    readFile(new URL("../lib/itemRenderers.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/itemRegistry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/lessonAiClient.ts", import.meta.url), "utf8"),
  ]);
  assert.match(renderer, /export function MicroDialogueRenderer/u);
  assert.match(renderer, /Du vælger selv tonen/u);
  assert.match(renderer, /continueMicroDialogue/u);
  assert.match(registry, /response\.dialogueMessages/u);
  assert.match(registry, /Samtalen er klar til vurdering|Før en samtale over tre levende replikker/u);
  assert.match(page, /question\.aiPolicy \? aiResultLabel/u);
  assert.match(page, /Vurdér samtalen/u);
  assert.match(client, /Conversational objective/u);
  assert.match(client, /Only LEARNER lines belong to the learner/u);
});
