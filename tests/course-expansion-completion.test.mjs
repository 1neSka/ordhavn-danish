import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

const { courseLevels } = await import("../lib/courseData.ts");

const legacyLevels = courseLevels.slice(0, 10);
const newLevels = courseLevels.filter((level) => /^level-(11|12|13|14)$/u.test(level.id));
const newMissions = newLevels.flatMap((level) => level.missions);
const newItems = newMissions.flatMap((mission) => mission.questions);

function normalized(value) {
  return value.trim().toLocaleLowerCase("da-DK").replace(/\s+/gu, " ");
}

function canComposeExactly(answer, tokens) {
  const target = answer.trim().replace(/\s+/gu, " ");
  const pieces = tokens.map((token) => token.trim().replace(/\s+/gu, " "));
  function visit(remainder, remaining) {
    if (!remainder) return remaining.length === 0;
    return remaining.some((piece, index) => {
      if (remainder !== piece && !remainder.startsWith(`${piece} `)) return false;
      return visit(remainder.slice(piece.length).trimStart(), remaining.filter((_, candidate) => candidate !== index));
    });
  }
  return visit(target, pieces);
}

test("levels 11-14 are appended without changing any persisted legacy id", () => {
  const legacyIds = legacyLevels.flatMap((level) => [
    level.id,
    ...level.missions.flatMap((mission) => [mission.id, ...mission.questions.map((item) => item.id)]),
  ]);
  const digest = createHash("sha256").update(legacyIds.join("\n")).digest("hex");
  assert.equal(digest, "83d3944fd0432aab6395dbde684b01e107875223efb9fbbc472de05fe0420f5a");
  assert.deepEqual(newLevels.map((level) => level.id), ["level-11", "level-12", "level-13", "level-14"]);
  assert.deepEqual(newLevels.map((level) => level.unlockXp), [6_800, 8_400, 10_200, 12_200]);
});

test("the levels 11-14 expansion keeps its requested 4 x 4 x 8 structure as later levels are appended", () => {
  assert.ok(courseLevels.length >= 14);
  assert.ok(courseLevels.flatMap((level) => level.missions).length >= 50);
  assert.ok(courseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions)).length >= 400);
  assert.equal(newMissions.length, 16);
  assert.equal(newItems.length, 128);
  assert.equal(new Set(newItems.map((item) => item.id)).size, 128);
  const allIds = courseLevels.flatMap((level) => [
    level.id,
    ...level.missions.flatMap((mission) => [mission.id, ...mission.questions.map((item) => item.id)]),
  ]);
  assert.equal(new Set(allIds).size, allIds.length, "every persisted course id must be globally unique");

  newLevels.forEach((level, levelOffset) => {
    const levelNumber = levelOffset + 11;
    assert.equal(level.missions.length, 4, `${level.id}: mission count`);
    assert.ok(!courseLevels.slice(0, 10).some((legacy) => legacy.color === level.color), `${level.id}: color must be new`);
    level.missions.forEach((mission, missionOffset) => {
      const missionNumber = missionOffset + 1;
      assert.equal(mission.id, `l${levelNumber}-m${String(missionNumber).padStart(2, "0")}`);
      assert.equal(mission.questions.length, 8, `${mission.id}: question count`);
      assert.ok(mission.estimatedMinutes >= 5 && mission.estimatedMinutes <= 7, `${mission.id}: duration`);
      assert.ok(mission.xp >= 480 && mission.xp <= 620, `${mission.id}: xp`);
      mission.questions.forEach((item, itemOffset) => {
        assert.equal(item.id, `${mission.id}-q${String(itemOffset + 1).padStart(2, "0")}`);
      });
    });
  });
  assert.equal(new Set(courseLevels.map((level) => level.color)).size, courseLevels.length);
});

test("all 128 new items preserve course-wide language and asset invariants", () => {
  assert.doesNotMatch(JSON.stringify(newLevels), /[\u0400-\u04ff]/u);
  for (const item of newItems) {
    assert.equal(item.assets.audio, null, `${item.id}: audio placeholder`);
    assert.ok(item.translation.trim(), `${item.id}: English translation`);
    const expectedModality = ["order", "input", "ikke-position", "transform"].includes(item.type) ? "produce" : "read";
    assert.equal(item.modality, expectedModality, `${item.id}: modality`);
    if (item.type === "order" || item.type === "ikke-position") {
      assert.ok(canComposeExactly(item.answer, item.tokens), `${item.id}: tokens cannot compose exact answer`);
    }
  }
});

test("each new exercise type appears exactly eight times with valid internal data", () => {
  const clozeItems = newItems.filter((item) => item.type === "cloze-multi");
  const registerItems = newItems.filter((item) => item.type === "register-match");
  const transformItems = newItems.filter((item) => item.type === "transform");
  assert.equal(clozeItems.length, 8);
  assert.equal(registerItems.length, 8);
  assert.equal(transformItems.length, 8);

  for (const item of clozeItems) {
    const blanks = item.segments.filter((segment) => "blankId" in segment);
    assert.ok(blanks.length >= 2 && blanks.length <= 3, `${item.id}: blank count`);
    assert.equal(new Set(blanks.map((blank) => blank.blankId)).size, blanks.length, `${item.id}: duplicate blank id`);
    blanks.forEach((blank) => assert.ok(blank.options.includes(blank.answer), `${item.id}:${blank.blankId}: answer missing from options`));
  }

  for (const item of registerItems) {
    assert.equal(item.pairs.length, 4, `${item.id}: four addressees required`);
    assert.equal(new Set(item.pairs.map((pair) => pair.addressee)).size, 4, `${item.id}: addressees must be unique`);
    assert.equal(new Set(item.pairs.map((pair) => pair.utterance)).size, 4, `${item.id}: utterances must be unique`);
    item.pairs.forEach((pair) => {
      assert.ok(pair.addresseeNote.trim(), `${item.id}: missing addressee note`);
      assert.ok(pair.utterance.trim(), `${item.id}: missing utterance`);
    });
  }

  for (const item of transformItems) {
    assert.ok(item.acceptedAnswers.length > 0, `${item.id}: acceptedAnswers`);
    assert.ok(item.acceptedAnswers.every((answer) => normalized(answer) !== normalized(item.sourceSentence)), `${item.id}: transform repeats source`);
  }
});
