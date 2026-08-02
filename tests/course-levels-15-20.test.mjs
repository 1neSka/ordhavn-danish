import assert from "node:assert/strict";
import test from "node:test";

const levels = await Promise.all([
  import("../lib/course/levels/level-15.ts").then(({ level15 }) => level15),
  import("../lib/course/levels/level-16.ts").then(({ level16 }) => level16),
  import("../lib/course/levels/level-17.ts").then(({ level17 }) => level17),
  import("../lib/course/levels/level-18.ts").then(({ level18 }) => level18),
  import("../lib/course/levels/level-19.ts").then(({ level19 }) => level19),
  import("../lib/course/levels/level-20.ts").then(({ level20 }) => level20),
]);
const missions = levels.flatMap((level) => level.missions);
const items = missions.flatMap((mission) => mission.questions);

test("levels 15-20 keep the four-by-eight path cadence and stable ids", () => {
  assert.deepEqual(levels.map((level) => level.id), [
    "level-15", "level-16", "level-17", "level-18", "level-19", "level-20",
  ]);
  assert.deepEqual(levels.map((level) => level.unlockXp), [14500, 16800, 19400, 22300, 25500, 29000]);
  assert.equal(missions.length, 24);
  assert.equal(items.length, 192);
  assert.equal(new Set(levels.map((level) => level.color)).size, 6);

  levels.forEach((level, levelIndex) => {
    assert.equal(level.missions.length, 4, `${level.id}: mission count`);
    level.missions.forEach((mission, missionIndex) => {
      const prefix = `l${levelIndex + 15}-m${String(missionIndex + 1).padStart(2, "0")}`;
      assert.equal(mission.id, prefix);
      assert.equal(mission.questions.length, 8, `${mission.id}: question count`);
      assert.ok(mission.estimatedMinutes >= 7, `${mission.id}: later missions should be substantial`);
      assert.ok(mission.xp >= 650, `${mission.id}: expansion xp`);
      mission.questions.forEach((item, itemIndex) => {
        assert.equal(item.id, `${prefix}-q${String(itemIndex + 1).padStart(2, "0")}`);
      });
    });
  });

  const everyId = [
    ...levels.map((level) => level.id),
    ...missions.map((mission) => mission.id),
    ...items.map((item) => item.id),
  ];
  assert.equal(new Set(everyId).size, everyId.length, "expansion ids must be globally unique");
});

test("the six-level spiral covers the requested A2+-B2 themes", () => {
  assert.deepEqual(levels.map((level) => level.eyebrow.split(" · ")[0]), ["A2+", "B1", "B2", "A2+", "B1+", "B2"]);
  assert.deepEqual(levels.map((level) => level.title), [
    "Retning og rum",
    "Sagt og gengivet",
    "Ord der hører sammen",
    "Ordsmedjen",
    "Hvis det var gået anderledes",
    "Den sidste formulering",
  ]);

  const expectedSignals = [
    ["ud-ude", "jo-desto", "hen-henne"],
    ["indirekte tale", "evidentialitet", "tempusskift"],
    ["kollokationer", "styrede præpositioner", "false friends"],
    ["ordsammensætning", "fugeelementer", "afledning"],
    ["irrealis", "modal perfektum", "kontrafaktisk kæde"],
    ["nuance", "sætningskløvning", "argumentation", "syntese"],
  ];
  levels.forEach((level, index) => {
    const text = JSON.stringify(level).toLocaleLowerCase("da-DK");
    expectedSignals[index].forEach((signal) => assert.ok(text.includes(signal), `${level.id}: missing ${signal}`));
  });
});

test("all deterministic registry exercise types and every AI task are mixed into the expansion", () => {
  const types = new Set(items.map((item) => item.type));
  const legacyTypes = ["choice", "order", "input", "transform"];
  const deterministicTypes = [
    "synonym-pick", "nuance-scale", "odd-one-out", "collocation-lock", "error-hunt",
    "inflection-forge", "word-forge", "text-order", "evidential-tag", "counterfactual-chain",
  ];
  const aiTypes = ["free-rewrite", "compress", "micro-dialogue", "explain-why"];
  [...legacyTypes, ...deterministicTypes, ...aiTypes].forEach((type) => {
    assert.ok(types.has(type), `missing exercise type ${type}`);
  });

  const aiItems = items.filter((item) => aiTypes.includes(item.type));
  assert.ok(aiItems.length >= 12, "AI work should recur without dominating the path");
  assert.ok(aiItems.length < items.length / 5, "deterministic work remains the core path");
  assert.deepEqual(new Set(aiItems.map((item) => item.aiPolicy.task)), new Set(aiTypes));
  aiItems.forEach((item) => {
    assert.equal(item.aiPolicy.skipWhenUnavailable, true, `${item.id}: unavailable AI must skip`);
    assert.ok(["grade", "assist"].includes(item.aiPolicy.mode), `${item.id}: AI mode`);
    assert.equal("offlineRubric" in item.aiPolicy, false, `${item.id}: no offline AI fallback rubric`);
    assert.ok(item.minWords > 0, `${item.id}: minimum production length`);
  });
});

test("new complex exercise payloads are internally playable", () => {
  for (const item of items.filter((candidate) => candidate.type === "error-hunt")) {
    assert.ok(item.errorIndex >= 0 && item.errorIndex < item.sentenceTokens.length, `${item.id}: error index`);
    assert.equal(item.answer, item.correction, `${item.id}: correction is the canonical answer`);
    assert.notEqual(item.sentenceTokens[item.errorIndex], item.correction, `${item.id}: correction changes the token`);
  }
  for (const item of items.filter((candidate) => candidate.type === "text-order")) {
    assert.ok(item.sentences.length >= 5 && item.sentences.length <= 6, `${item.id}: long sequence length`);
    assert.deepEqual(new Set(item.correctOrder), new Set(item.sentences.map((sentence) => sentence.id)), `${item.id}: sentence ids`);
    assert.equal(item.answer, item.correctOrder.join(">"), `${item.id}: canonical order`);
    assert.ok(item.acceptedAnswers.includes(item.answer), `${item.id}: accepted canonical order`);
  }
  for (const item of items.filter((candidate) => ["synonym-pick", "odd-one-out", "collocation-lock"].includes(candidate.type))) {
    assert.ok(item.options.includes(item.answer), `${item.id}: answer appears in options`);
  }
  for (const item of items.filter((candidate) => candidate.type === "nuance-scale")) {
    assert.ok(item.tokens.length >= 4, `${item.id}: scale length`);
    assert.ok(item.acceptedAnswers.includes(item.answer), `${item.id}: accepted scale answer`);
  }
  for (const item of items.filter((candidate) => candidate.type === "counterfactual-chain")) {
    assert.ok(item.premises.length >= 3, `${item.id}: chain premises`);
    assert.ok(item.tokens.length >= 3, `${item.id}: chain tokens`);
    assert.ok(item.acceptedAnswers.includes(item.answer), `${item.id}: accepted chain answer`);
  }
});

test("content is Danish-first, English-supported, audio-ready and free of Russian", () => {
  assert.doesNotMatch(JSON.stringify(levels), /[\u0400-\u04ff]/u);
  for (const item of items) {
    assert.ok(item.prompt.trim(), `${item.id}: prompt`);
    assert.ok(item.answer.trim(), `${item.id}: answer`);
    assert.ok(item.hint.trim(), `${item.id}: hint`);
    assert.ok(item.explanation.trim(), `${item.id}: explanation`);
    assert.ok(item.translation?.trim(), `${item.id}: English support text`);
    assert.ok(["read", "produce"].includes(item.modality), `${item.id}: supported no-audio modality`);
    assert.equal(item.assets.audio, null, `${item.id}: audio-ready asset placeholder`);
  }

  const toneText = JSON.stringify(levels).toLocaleLowerCase("da-DK");
  ["optimist", "bidende", "nobel", "varme", "fjollet", "idiot", "streng"].forEach((signal) => {
    assert.ok(toneText.includes(signal), `tone range should include ${signal}`);
  });
});
