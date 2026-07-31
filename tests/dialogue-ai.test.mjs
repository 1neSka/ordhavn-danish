import assert from "node:assert/strict";
import test from "node:test";
import * as dialogueAi from "../lib/dialogueAi.ts";

const aiCharacter = (await import("../lib/dialogueCampaignData.ts")).dialogueCampaignCharacters?.find((item) => item.id === "eli9");

test("dialogue AI requests are bounded and tied to a real AI node", () => {
  const aiNode = aiCharacter && Object.values(aiCharacter.case.nodes).find((node) => node.aiInput);
  assert.ok(aiNode, "ELI-9 needs at least one free-text node");
  const request = {
    caseId: aiCharacter.case.id,
    nodeId: aiNode.id,
    userText: "Jeg vil skelne mellem revisionssporet og den operative kopi, før jeg svarer kategorisk.",
    flags: [],
    meters: Object.fromEntries(aiCharacter.case.meters.map((meter) => [meter.id, meter.start])),
    visitedNodeIds: [aiNode.id],
  };
  assert.equal(dialogueAi.isDialogueTurnEvaluationRequest(request), true);
  assert.equal(dialogueAi.isDialogueTurnEvaluationRequest({ ...request, userText: "kort" }), false);
  assert.equal(dialogueAi.isDialogueTurnEvaluationRequest({ ...request, userText: "x".repeat(1_501) }), false);
  assert.ok(dialogueAi.buildDialogueTurnPrompt(request).includes("Full fixed tree"));
});

test("Gemini may only select a route that exists in the fixed scenario graph", () => {
  const aiNode = Object.values(aiCharacter.case.nodes).find((node) => node.aiInput);
  const request = {
    caseId: aiCharacter.case.id,
    nodeId: aiNode.id,
    userText: "Jeg bruger den skjulte kopi som presmiddel og lader auditten fokusere på originalen.",
    flags: [],
    meters: {},
    visitedNodeIds: [aiNode.id],
  };
  const validRoute = aiNode.aiInput.routes[0].id;
  assert.equal(dialogueAi.parseDialogueTurnEvaluation({ routeId: "invented", reaction: "x", analysis: "y" }, request, "test"), null);
  assert.equal(dialogueAi.parseDialogueTurnEvaluation({ routeId: validRoute, reaction: "ELI-9 nikker.", analysis: "Ruten matcher presset." }, request, "test")?.routeId, validRoute);
});

test("offline interpretation always returns one of the authored routes", () => {
  const aiNode = Object.values(aiCharacter.case.nodes).find((node) => node.aiInput);
  const request = {
    caseId: aiCharacter.case.id,
    nodeId: aiNode.id,
    userText: "Jeg vil beskytte koordinaten, men give auditten en verificerbar forklaring på afvigelsen.",
    flags: [],
    meters: {},
    visitedNodeIds: [aiNode.id],
  };
  const result = dialogueAi.evaluateDialogueTurnOffline(request);
  assert.ok(aiNode.aiInput.routes.some((route) => route.id === result.routeId));
  assert.equal(result.available, false);
});

test("Gemini routing accepts structured reactions but cannot escape the authored graph", async () => {
  const aiNode = Object.values(aiCharacter.case.nodes).find((node) => node.aiInput);
  const request = {
    caseId: aiCharacter.case.id,
    nodeId: aiNode.id,
    userText: "Jeg skjuler kopiens navn, men giver auditten en efterprøvbar teknisk forklaring.",
    flags: [],
    meters: {},
    visitedNodeIds: [aiNode.id],
  };
  const routeId = aiNode.aiInput.routes[0].id;
  const fetcher = async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
    routeId,
    reaction: "ELI-9 sammenholder dit svar med revisionsloggen.",
    analysis: "Svaret beskytter identiteten uden at opgive en kontrollerbar forklaring.",
    generatedBeat: { speaker: "ELI-9", line: "Så lader vi kontrollen måle skyggen.", stage: "Statuslyset bliver ravgult." },
  }) }] } }] });
  const result = await dialogueAi.evaluateDialogueTurnWithGemini(request, "test-key", fetcher, 100);
  assert.equal(result?.routeId, routeId);
  assert.equal(result?.available, true);
  assert.equal(result?.generatedBeat?.speaker, "ELI-9");
});
