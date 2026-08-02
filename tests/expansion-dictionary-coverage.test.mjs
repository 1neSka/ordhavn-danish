import assert from "node:assert/strict";
import test from "node:test";

import { expansionCourseLevels } from "../lib/course/index.ts";
import {
  dictionaryIndexedFormCount,
  dictionarySize,
  lookupDanishWord,
} from "../lib/dictionaryData.ts";

function learnerFacingDanish(levels) {
  const strings = [];
  for (const level of levels) {
    strings.push(level.eyebrow, level.title, level.description);
    for (const mission of level.missions) {
      strings.push(mission.title, mission.subtitle);
      for (const item of mission.questions) {
        strings.push(item.prompt, item.answer, item.hint, item.explanation);
        if (item.options) strings.push(...item.options);
        if (item.tokens) strings.push(...item.tokens);
      }
    }
  }
  return strings;
}

test("the enlarged offline dictionary covers most expansion-course word occurrences", () => {
  const tokens = learnerFacingDanish(expansionCourseLevels)
    .join(" ")
    .toLocaleLowerCase("da-DK")
    .match(/[a-zæøå]+(?:-[a-zæøå]+)*/gu)
    ?.filter((token) => token.length > 1) ?? [];
  const covered = tokens.filter((token) => lookupDanishWord(token)).length;

  assert.ok(tokens.length > 6000, "coverage sample is unexpectedly small");
  assert.ok(covered / tokens.length >= 0.84, `expansion dictionary coverage regressed to ${Math.round(covered / tokens.length * 1000) / 10}%`);
  assert.ok(dictionarySize >= 1900);
  assert.ok(dictionaryIndexedFormCount >= 8500);
});

test("selection lookup understands the expansion's recurring grammar vocabulary", () => {
  for (const word of [
    "kritik", "hovedleddet", "gengivet", "kontrafaktisk", "fugeelement",
    "kollokationer", "udledt", "kildestatus", "begrænsninger",
  ]) {
    const result = lookupDanishWord(word);
    assert.ok(result, `${word}: missing dictionary card`);
    assert.ok(result.entry.english.length >= 3, `${word}: missing English gloss`);
  }
});
