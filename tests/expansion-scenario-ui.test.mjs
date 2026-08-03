import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveScenarioLaunch } from "../lib/scenarioLaunch.ts";
import { authorityScenarioCases } from "../lib/authorityScenarioData.ts";
import { detectiveCases } from "../lib/detectiveScenarioData.ts";
import { scienceScenarioCases } from "../lib/scienceScenarioData.ts";
import { terminalScenarioCases } from "../lib/terminalScenarioData.ts";

test("all expansion cases resolve to their direct scenario launches", () => {
  for (const item of terminalScenarioCases) assert.deepEqual(resolveScenarioLaunch(item.id), { kind: "terminal", caseId: item.id });
  for (const item of scienceScenarioCases) assert.deepEqual(resolveScenarioLaunch(item.id), { kind: "science", caseId: item.id });
  for (const item of authorityScenarioCases) assert.deepEqual(resolveScenarioLaunch(item.id), { kind: "authority", caseId: item.id });
  for (const item of detectiveCases) assert.deepEqual(resolveScenarioLaunch(item.id), { kind: "detective", caseId: item.id });
});

test("the authority and detective systems are integrated into the shared catalog", async () => {
  const source = await readFile(new URL("../app/scenario-games.tsx", import.meta.url), "utf8");
  assert.match(source, /kind: "authority"/u);
  assert.match(source, /<AuthorityScenarioGame/u);
  assert.match(source, /kind: "detective"/u);
  assert.match(source, /<DetectiveScenarioGame/u);
});

test("the terminal UI executes only the in-memory engine and exposes staged progress", async () => {
  const source = await readFile(new URL("../app/terminal-scenario-game.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../lib/terminalAiClient.ts", import.meta.url), "utf8");
  assert.match(source, /executeTerminalCommand\(session, command\)/u);
  assert.match(source, /evaluateTerminalCase\(scenario, session\)/u);
  assert.match(source, /createTerminalAssistantRequest/u);
  assert.match(source, /Terminalcoach/u);
  assert.match(source, /DANSK FEEDBACK/u);
  assert.match(source, /assistantConversation/u);
  assert.match(source, /correctedPrompt/u);
  assert.match(source, /reply\.inputLanguage === "other"/u);
  assert.match(source, /setAssistantNotice\(reply\.answer\)/u);
  assert.match(source, /terminalHistoryRef/u);
  assert.match(source, /scrollbar-gutter:stable/u);
  assert.match(source, /overflow-y:scroll/u);
  assert.doesNotMatch(source, /\.slice\(-14\)/u);
  assert.match(client, /\/api\/gemini\/terminal/u);
  assert.match(source, /kind: "terminal"/u);
  assert.doesNotMatch(source, /child_process|shell_command|execSync|spawn\(/u);
});

test("the science UI keeps instructions and a code-native workspace side by side", async () => {
  const source = await readFile(new URL("../app/science-scenario-game.tsx", import.meta.url), "utf8");
  assert.match(source, /science-lab/u);
  assert.match(source, /science-manual/u);
  assert.match(source, /WorkspaceVisual/u);
  assert.match(source, /evaluateScienceScenario/u);
  assert.match(source, /kind: "science"/u);
  assert.doesNotMatch(source, /<img|background-image:\s*url/u);
});
