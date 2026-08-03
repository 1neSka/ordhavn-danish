import assert from "node:assert/strict";
import test from "node:test";

import { askTerminalAssistant } from "../lib/terminalAiClient.ts";
import {
  answerTerminalAssistantWithGemini,
  buildTerminalAssistantPrompt,
  isTerminalAssistantRequest,
} from "../lib/terminalAssistantAi.ts";
import { createTerminalAssistantRequest, createTerminalSession, executeTerminalCommand } from "../lib/terminalEngine.ts";
import { terminalScenarioCases } from "../lib/terminalScenarioData.ts";

function assistantRequest() {
  let session = createTerminalSession(terminalScenarioCases[0]);
  session = executeTerminalCommand(session, "cd /home/elev/arbejde").session;
  session = executeTerminalCommand(session, "ls -a").session;
  const prepared = createTerminalAssistantRequest(
    session,
    "Jeg har allerede prøvet ls -a. Hvorfor viser mappen ikke noget nyt?",
    [
      { role: "learner", content: "Hvad gør ls -a?" },
      { role: "assistant", content: "Den viser også skjulte poster." },
    ],
  );
  assert.equal(prepared.accepted, true);
  return prepared.request;
}

test("a terminal follow-up carries the full observable state without hidden answers", () => {
  const request = assistantRequest();
  assert.equal(isTerminalAssistantRequest(request), true);
  assert.deepEqual(request.transcript.map((entry) => entry.line), ["cd /home/elev/arbejde", "ls -a"]);
  assert.equal(request.transcript[1].stdout, ".  ..\n");
  assert.equal(request.transcript[1].stderr, "");
  assert.equal(request.transcript[1].exitCode, 0);
  assert.equal(request.conversation.length, 2);
  assert.ok(request.stage?.instruction);
  assert.equal("referenceCommands" in request, false);
  assert.equal("finalAnswer" in request, false);
});

test("the dedicated prompt uses outputs and conversation before offering one non-spoiling experiment", () => {
  const prompt = buildTerminalAssistantPrompt(assistantRequest());
  assert.match(prompt, /stdout:\n\.  \.\./u);
  assert.match(prompt, /Hvad gør ls -a\?/u);
  assert.match(prompt, /må du ikke bare foreslå den igen/u);
  assert.match(prompt, /afvig.*rigtig Linux/iu);
  assert.match(prompt, /languageIssues/u);
  assert.doesNotMatch(prompt, /pakke=207|grep '\^pakke='/u);
});

test("the client uses the dedicated endpoint and returns answer plus Danish corrections", async () => {
  let capturedUrl = "";
  let capturedBody = null;
  const result = await askTerminalAssistant(assistantRequest(), async (url, init) => {
    capturedUrl = url;
    capturedBody = JSON.parse(init.body);
    return Response.json({
      available: true,
      answer: "Du har allerede kørt kommandoen korrekt.",
      correctedPrompt: "Jeg har allerede prøvet ls -a.",
      languageIssues: [{ original: "har prøvede", correction: "har prøvet", explanation: "Efter har bruges perfektum participium." }],
      model: "test-model",
    });
  });
  assert.equal(capturedUrl, "/api/gemini/terminal");
  assert.equal(capturedBody.transcript.length, 2);
  assert.equal(result.answer, "Du har allerede kørt kommandoen korrekt.");
  assert.equal(result.languageIssues[0].correction, "har prøvet");

  const unavailable = await askTerminalAssistant(assistantRequest(), async () => Response.json({
    available: false, answer: "offline", correctedPrompt: "", languageIssues: [], model: null,
  }));
  assert.equal(unavailable, null);
});

test("the terminal provider falls back and parses its structured coaching response", async () => {
  const calls = [];
  const result = await answerTerminalAssistantWithGemini(assistantRequest(), "test-key", async (url) => {
    calls.push(url);
    if (calls.length === 1) return new Response("quota", { status: 429 });
    return Response.json({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        answer: "`ls -a` virkede. Mappen indeholder kun de virtuelle poster `.` og `..`.",
        correctedPrompt: "Hvorfor viser mappen ikke noget nyt?",
        languageIssues: [],
      }) }] } }],
    });
  }, 100);
  assert.equal(calls.length, 2);
  assert.match(result.answer, /virkede/u);
  assert.equal(result.available, true);
  assert.ok(result.model);
});
