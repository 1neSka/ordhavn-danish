import assert from "node:assert/strict";
import test from "node:test";

const { courseLevels } = await import("../lib/courseData.ts");

const allMissions = courseLevels.flatMap((level) => level.missions);
const allItems = allMissions.flatMap((mission) => mission.questions);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsStandalonePhrase(text, phrase) {
  const normalizedPhrase = phrase.trim();
  if (!normalizedPhrase) return false;
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedPhrase)}(?=[^\\p{L}\\p{N}]|$)`,
    "iu",
  );
  return pattern.test(text);
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
      const next = remainder.slice(piece.length).trimStart();
      return visit(next, remaining.filter((_, candidateIndex) => candidateIndex !== index));
    });
  }

  return visit(target, pieces);
}

test("input prompts never expose the literal answer or create duplicated fill text", () => {
  const inputItems = allItems.filter((item) => item.type === "input");

  for (const item of inputItems) {
    const promptWithoutBlank = item.prompt.replace(/_+/g, " ");
    assert.equal(
      containsStandalonePhrase(promptWithoutBlank, item.answer),
      false,
      `${item.id}: answer is already visible in the prompt`,
    );
    assert.equal(
      containsStandalonePhrase(item.translation ?? "", item.answer),
      false,
      `${item.id}: Danish answer leaks through the English support text`,
    );

    if (/_+/.test(item.prompt)) {
      const reconstructed = item.prompt.replace(/_+/, item.answer);
      const duplicate = adjacentDuplicateWords(reconstructed);
      assert.equal(duplicate, null, `${item.id}: filling the blank creates duplicated “${duplicate}”`);
    }
  }
});

test("levels seven through ten contain four new, audio-ready production missions", () => {
  const missionIds = ["l07-m04", "l08-m04", "l09-m04", "l10-m04"];
  const missions = missionIds.map((id) => allMissions.find((mission) => mission.id === id));
  missions.forEach((mission, index) => assert.ok(mission, `${missionIds[index]} is missing`));

  const newItems = missions.flatMap((mission) => mission.questions);
  assert.equal(newItems.length, 32);
  assert.equal(new Set(newItems.map((item) => item.id)).size, 32);
  assert.ok(newItems.every((item) => item.assets.audio === null));
  assert.ok(newItems.every((item) => item.translation?.trim()));
  assert.doesNotMatch(JSON.stringify(newItems), /[\u0400-\u04ff]/u);

  const productionTypes = new Set(["order", "input", "ikke-position"]);
  for (const item of newItems) {
    assert.equal(item.modality, productionTypes.has(item.type) ? "produce" : "read", `${item.id}: wrong modality`);
  }

  assert.ok(newItems.filter((item) => ["order", "ikke-position"].includes(item.type)).length >= 16);
  assert.ok(newItems.filter((item) => item.type === "input").length >= 8);
});

test("every new sentence-building item can be composed from its token bank", () => {
  const newMissionIds = new Set(["l07-m04", "l08-m04", "l09-m04", "l10-m04"]);
  const sentenceItems = allMissions
    .filter((mission) => newMissionIds.has(mission.id))
    .flatMap((mission) => mission.questions)
    .filter((item) => ["order", "ikke-position"].includes(item.type));

  for (const item of sentenceItems) {
    assert.ok(canComposeAnswer(item.answer, item.tokens), `${item.id}: token bank cannot build the expected answer`);
  }
});
