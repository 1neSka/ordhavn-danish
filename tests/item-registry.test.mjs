import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { scoreErrorHunt, scoreOrderedSequence } from "../lib/exerciseScoring.ts";
import { itemRegistry } from "../lib/itemRegistry.ts";
import { EMPTY_ITEM_RESPONSE } from "../lib/itemRuntime.ts";

const expectedTypes = [
  "choice", "order", "input", "gender-bet", "number-arcade", "definiteness", "agreement",
  "ikke-position", "cloze-multi", "register-match", "transform",
  "synonym-pick", "nuance-scale", "odd-one-out", "collocation-lock", "error-hunt",
  "inflection-forge", "word-forge", "text-order", "evidential-tag", "counterfactual-chain",
  "free-rewrite", "compress", "micro-dialogue", "explain-why",
];

test("the lesson registry owns every authored item mechanic", async () => {
  const source = await readFile(new URL("../lib/itemRegistry.ts", import.meta.url), "utf8");
  for (const type of expectedTypes) {
    assert.ok(source.includes(type), type);
  }
  for (const member of ["build", "score", "serialize", "isReady", "keyboard", "Render"]) assert.match(source, new RegExp(`${member}:`, "u"), member);
  assert.match(source, /Object\.fromEntries\(modules\.map/u);
});

test("text-order uses LCS credit instead of an all-or-nothing sentence comparison", () => {
  assert.equal(scoreOrderedSequence(["a", "b", "c", "d", "e"], ["a", "c", "b", "d", "e"]), 0.8);
  assert.equal(scoreOrderedSequence(["a", "b", "c"], ["c", "b", "a"]), 1 / 3);
});

test("error-hunt awards one half for locating and one half for correcting", () => {
  assert.equal(scoreErrorHunt(2, "havde", 2, "har"), 0.5);
  assert.equal(scoreErrorHunt(2, "havde", 1, "havde"), 0.5);
  assert.equal(scoreErrorHunt(2, "havde", 2, "havde"), 1);
});

test("AI production can be submitted without reaching an authored word target", () => {
  const item = {
    type: "free-rewrite",
    id: "short-ai-answer",
    prompt: "Skriv en rute.",
    answer: "",
    minWords: 24,
    sourceText: "Enter and wait.",
    instruction: "Omskriv ruten.",
    aiPolicy: { mode: "grade", task: "free-rewrite", skipWhenUnavailable: true },
  };

  assert.equal(itemRegistry["free-rewrite"].isReady(item, EMPTY_ITEM_RESPONSE), false);
  assert.equal(itemRegistry["free-rewrite"].isReady(item, { ...EMPTY_ITEM_RESPONSE, selected: "Gå ind og vent." }), true);
});

test("ordered mechanics score semantic order and compound spelling", () => {
  const nuance = {
    type: "nuance-scale",
    id: "nuance-test",
    prompt: "Ordne",
    answer: "måske < sandsynligvis < helt sikkert",
    acceptedAnswers: ["måske < sandsynligvis < helt sikkert"],
    tokens: ["helt sikkert", "måske", "sandsynligvis"],
  };
  const wordForge = {
    type: "word-forge",
    id: "forge-test",
    prompt: "Byg",
    answer: "arbejdsløs",
    acceptedAnswers: ["arbejdsløs"],
    tokens: ["arbejd", "s", "løs"],
    morphemes: ["arbejd", "løs"],
    fugeelement: "s",
  };

  assert.equal(itemRegistry["nuance-scale"].score(nuance, { ...EMPTY_ITEM_RESPONSE, ordered: ["måske", "sandsynligvis", "helt sikkert"] }), 1);
  assert.ok(itemRegistry["nuance-scale"].score(nuance, { ...EMPTY_ITEM_RESPONSE, ordered: nuance.tokens }) < 1);
  assert.equal(itemRegistry["word-forge"].score(wordForge, { ...EMPTY_ITEM_RESPONSE, ordered: ["arbejd", "s", "løs"] }), 1);
  assert.equal(itemRegistry["word-forge"].serialize(wordForge, { ...EMPTY_ITEM_RESPONSE, ordered: ["arbejd", "s", "løs"] }), "arbejdsløs");
});

test("word-forge builders expose every morpheme and fugeelement to the token bank", async () => {
  const { buildWordForge } = await import("../lib/course/builders.ts");
  const item = buildWordForge({
    id: "forge-builder-test",
    prompt: "Byg ordet",
    answer: "arbejdsløs",
    hint: "Brug fuge-s.",
    explanation: "Arbejd + s + løs.",
    skill: "compound",
    tags: ["forge"],
    modality: "produce",
    morphemes: ["arbejd", "løs"],
    fugeelement: "s",
    acceptedAnswers: ["arbejdsløs"],
  });
  assert.deepEqual(item.tokens, ["arbejd", "s", "løs"]);
});

test("LessonPlayer delegates item behavior and rendering to the registry", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const itemModule = question \? getItemModule\(question\) : null/u);
  assert.match(source, /itemModule\.serialize\(question, response\)/u);
  assert.match(source, /itemModule\?\.isReady\(question, response\)/u);
  assert.match(source, /itemModule\.keyboard\(event\.key/u);
  assert.match(source, /<ItemRenderer question=\{question\}/u);
  assert.doesNotMatch(source, /question\.type === "choice" \? "Vælg det bedste svar"/u);
});
