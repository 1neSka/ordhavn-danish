import assert from "node:assert/strict";
import test from "node:test";

const { courseLevels } = await import("../lib/courseData.ts");

const newLevels = courseLevels.filter((level) => /^level-(11|12|13|14)$/.test(level.id));
const newMissions = newLevels.flatMap((level) => level.missions);
const newItems = newMissions.flatMap((mission) => mission.questions);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsStandalonePhrase(text, phrase) {
  const normalizedPhrase = phrase.trim();
  if (!normalizedPhrase) return false;
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedPhrase)}(?=[^\\p{L}\\p{N}]|$)`,
    "iu",
  ).test(text);
}

function adjacentDuplicateWords(text) {
  const words = text.toLocaleLowerCase("da-DK").match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  return words.find((word, index) => index > 0 && words[index - 1] === word) ?? null;
}

function canComposeAnswer(answer, tokens) {
  const target = answer.trim().replace(/\s+/g, " ");
  const pieces = tokens.map((token) => token.trim().replace(/\s+/g, " "));

  function visit(remainder, remaining) {
    if (!remainder) return remaining.length === 0;
    return remaining.some((piece, index) => {
      if (remainder !== piece && !remainder.startsWith(`${piece} `)) return false;
      return visit(
        remainder.slice(piece.length).trimStart(),
        remaining.filter((_, candidateIndex) => candidateIndex !== index),
      );
    });
  }

  return visit(target, pieces);
}

test("levels 11 through 14 are appended with the requested progression", () => {
  assert.deepEqual(courseLevels.slice(-4).map((level) => level.id), [
    "level-11", "level-12", "level-13", "level-14",
  ]);
  assert.deepEqual(newLevels.map((level) => level.unlockXp), [6800, 8400, 10200, 12200]);
  assert.equal(newItems.length, 128);

  const allColors = courseLevels.map((level) => level.color.toLocaleLowerCase());
  assert.equal(new Set(allColors).size, allColors.length);
  const supportedIcons = new Set(["compass", "message", "layers", "map", "sparkles", "book", "target", "star"]);

  newLevels.forEach((level, levelOffset) => {
    assert.equal(level.missions.length, 4, `${level.id}: mission count`);
    level.missions.forEach((mission, missionOffset) => {
      const missionNumber = String(missionOffset + 1).padStart(2, "0");
      assert.equal(mission.id, `l${levelOffset + 11}-m${missionNumber}`);
      assert.ok(supportedIcons.has(mission.icon), `${mission.id}: icon must resolve through iconMap`);
      assert.equal(mission.questions.length, 8, `${mission.id}: question count`);
      assert.ok(mission.estimatedMinutes >= 5 && mission.estimatedMinutes <= 7, `${mission.id}: minutes`);
      assert.ok(mission.xp >= 480 && mission.xp <= 620, `${mission.id}: xp`);
      mission.questions.forEach((item, itemOffset) => {
        const questionNumber = String(itemOffset + 1).padStart(2, "0");
        assert.equal(item.id, `${mission.id}-q${questionNumber}`);
      });
    });
  });
});

test("new content preserves language, asset, translation, modality and id invariants", () => {
  assert.doesNotMatch(JSON.stringify(newLevels), /[\u0400-\u04ff]/u);
  assert.ok(newItems.every((item) => item.translation?.trim()), "every item has English support text");
  assert.ok(newItems.every((item) => item.assets.audio === null), "every item remains audio-ready");

  const productionTypes = new Set(["order", "input", "ikke-position", "transform"]);
  newItems.forEach((item) => {
    assert.equal(item.modality, productionTypes.has(item.type) ? "produce" : "read", `${item.id}: modality`);
  });

  const everyId = [
    ...courseLevels.map((level) => level.id),
    ...courseLevels.flatMap((level) => level.missions.map((mission) => mission.id)),
    ...courseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions.map((item) => item.id))),
  ];
  assert.equal(new Set(everyId).size, everyId.length, "all course ids are globally unique");
});

test("new input and token-bank exercises cannot leak or miscompose their answers", () => {
  for (const item of newItems.filter((candidate) => candidate.type === "input")) {
    const promptWithoutBlank = item.prompt.replace(/_+/g, " ");
    assert.equal(containsStandalonePhrase(promptWithoutBlank, item.answer), false, `${item.id}: prompt leak`);
    assert.equal(containsStandalonePhrase(item.translation ?? "", item.answer), false, `${item.id}: translation leak`);
    if (/_+/.test(item.prompt)) {
      const duplicate = adjacentDuplicateWords(item.prompt.replace(/_+/, item.answer));
      assert.equal(duplicate, null, `${item.id}: duplicated ${duplicate}`);
    }
  }

  for (const item of newItems.filter((candidate) => ["order", "ikke-position"].includes(candidate.type))) {
    assert.ok(canComposeAnswer(item.answer, item.tokens), `${item.id}: tokens cannot compose answer exactly`);
  }
});

test("the three new exercise types each provide eight valid items", () => {
  const clozeItems = newItems.filter((item) => item.type === "cloze-multi");
  const registerItems = newItems.filter((item) => item.type === "register-match");
  const transformItems = newItems.filter((item) => item.type === "transform");
  assert.equal(clozeItems.length, 8);
  assert.equal(registerItems.length, 8);
  assert.equal(transformItems.length, 8);

  for (const item of clozeItems) {
    const blanks = item.segments.filter((segment) => "blankId" in segment);
    assert.ok(blanks.length >= 2 && blanks.length <= 3, `${item.id}: blank count`);
    assert.equal(new Set(blanks.map((blank) => blank.blankId)).size, blanks.length, `${item.id}: blank ids`);
    blanks.forEach((blank) => assert.ok(blank.options.includes(blank.answer), `${item.id}:${blank.blankId}`));
    assert.equal(item.answer, blanks.map((blank) => blank.answer).join(" | "));
  }

  for (const item of registerItems) {
    assert.ok(item.intent.trim(), `${item.id}: intent`);
    assert.equal(item.pairs.length, 4, `${item.id}: pair count`);
    assert.equal(new Set(item.pairs.map((pair) => pair.addressee)).size, item.pairs.length, `${item.id}: addressees`);
    item.pairs.forEach((pair) => {
      assert.ok(pair.addresseeNote.trim(), `${item.id}: addressee note`);
      assert.ok(pair.utterance.trim(), `${item.id}: utterance`);
    });
  }

  for (const item of transformItems) {
    assert.ok(item.sourceSentence.trim(), `${item.id}: source`);
    assert.ok(item.instruction.trim(), `${item.id}: instruction`);
    assert.ok(item.acceptedAnswers.length > 0, `${item.id}: accepted answers`);
    assert.ok(item.acceptedAnswers.every((answer) => answer.trim() && answer !== item.sourceSentence), `${item.id}: unchanged answer`);
    assert.equal(item.answer, item.acceptedAnswers[0]);
  }
});
