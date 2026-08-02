import assert from "node:assert/strict";
import test from "node:test";

import { expansionCourseLevels } from "../lib/course/index.ts";
import { itemRegistry } from "../lib/itemRegistry.ts";
import { EMPTY_ITEM_RESPONSE } from "../lib/itemRuntime.ts";

const aiTypes = new Set(["free-rewrite", "compress", "micro-dialogue", "explain-why"]);
const choiceTypes = new Set([
  "choice", "gender-bet", "number-arcade", "definiteness", "agreement",
  "synonym-pick", "odd-one-out", "collocation-lock", "evidential-tag",
]);

function canonicalResponse(item) {
  const response = { ...EMPTY_ITEM_RESPONSE, selections: {} };
  if (choiceTypes.has(item.type) || ["input", "transform", "inflection-forge"].includes(item.type)) {
    response.selected = item.answer;
  } else if (item.type === "cloze-multi") {
    response.selections = Object.fromEntries(item.segments.filter((segment) => "blankId" in segment).map((segment) => [segment.blankId, segment.answer]));
  } else if (item.type === "register-match") {
    response.selections = Object.fromEntries(item.pairs.map((pair) => [pair.addressee, pair.utterance]));
  } else if (item.type === "error-hunt") {
    response.errorIndex = item.errorIndex;
    response.correction = item.correction;
  } else if (item.type === "text-order") {
    response.ordered = [...item.correctOrder];
  } else if (item.type === "nuance-scale") {
    response.ordered = item.answer.split(/\s+<\s+/u);
  } else {
    response.ordered = [...(item.tokens ?? [])];
  }
  return response;
}

test("every deterministic expansion item has a reachable perfect answer", () => {
  const items = expansionCourseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions));
  for (const item of items.filter((candidate) => !aiTypes.has(candidate.type))) {
    const response = canonicalResponse(item);
    assert.equal(itemRegistry[item.type].isReady(item, response), true, `${item.id}: canonical response is not submittable`);
    assert.equal(itemRegistry[item.type].score(item, response), 1, `${item.id}: canonical response is not perfect`);
  }
});

test("all word-forge games expose the linker and both stems", () => {
  const forges = expansionCourseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions)).filter((item) => item.type === "word-forge");
  assert.ok(forges.length >= 6);
  for (const item of forges) {
    assert.ok(item.tokens.length >= 2, item.id);
    if (item.fugeelement) assert.ok(item.tokens.includes(item.fugeelement), `${item.id}: hidden fugeelement`);
  }
});
