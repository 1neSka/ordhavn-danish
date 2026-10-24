import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { courseLevels, situationalCourseLevels as levels } from "../lib/course/index.ts";
import { lookupDanishWord } from "../lib/dictionaryData.ts";
import { itemRegistry } from "../lib/itemRegistry.ts";
import { EMPTY_ITEM_RESPONSE } from "../lib/itemRuntime.ts";
import { normalizeExerciseAnswer } from "../lib/exerciseScoring.ts";

const missions = levels.flatMap((level) => level.missions);
const items = missions.flatMap((mission) => mission.questions);
const deterministic = items.filter((item) => !item.aiPolicy);

function perfectResponse(item) {
  const response = { ...EMPTY_ITEM_RESPONSE, selections: {} };
  if (item.type === "cloze-multi") {
    response.selections = Object.fromEntries(item.segments.filter((segment) => "blankId" in segment).map((segment) => [segment.blankId, segment.answer]));
  } else if (item.type === "register-match") {
    response.selections = Object.fromEntries(item.pairs.map((pair) => [pair.addressee, pair.utterance]));
  } else if (item.type === "error-hunt") {
    response.errorIndex = item.errorIndex;
    response.correction = item.correction;
  } else if (item.type === "text-order") {
    response.ordered = [...item.correctOrder];
  } else if (item.type === "order") {
    response.ordered = [...item.tokens];
  } else {
    response.selected = item.answer;
  }
  return response;
}

test("five appended chapters supply 20 substantial missions without replacing saved course IDs", () => {
  assert.deepEqual(courseLevels.slice(-5), levels);
  assert.deepEqual(courseLevels.map((level) => level.id), Array.from({ length: 25 }, (_, index) => `level-${String(index + 1).padStart(2, "0")}`));
  assert.equal(missions.length, 20);
  assert.equal(items.length, 200);
  assert.equal(missions.reduce((sum, mission) => sum + mission.estimatedMinutes, 0), 140);
  const allIds = courseLevels.flatMap((level) => [level.id, ...level.missions.flatMap((mission) => [mission.id, ...mission.questions.map((item) => item.id)])]);
  assert.equal(new Set(allIds).size, allIds.length);
  assert.equal(new Set(courseLevels.map((level) => level.color.toLowerCase())).size, courseLevels.length);
  levels.forEach((level, index) => {
    assert.equal(level.missions.length, 4);
    assert.ok(level.unlockXp > courseLevels[index + 19].unlockXp);
    level.missions.forEach((mission, missionIndex) => {
      assert.equal(mission.id, `l${index + 21}-m${String(missionIndex + 1).padStart(2, "0")}`);
      assert.equal(mission.questions.length, 10);
      assert.ok(mission.xp >= 1000);
      assert.ok(new Set(mission.questions.map((item) => item.type)).size >= 4, `${mission.id}: vary the task mechanics`);
      assert.ok(mission.questions.filter((item) => item.modality === "produce").length >= 4, `${mission.id}: require active production`);
      mission.questions.forEach((item, questionIndex) => assert.equal(item.id, `${mission.id}-q${String(questionIndex + 1).padStart(2, "0")}`));
    });
  });
});

test("every offline task is solvable, serializable and rejects an empty response", () => {
  assert.equal(deterministic.length, 195);
  for (const item of deterministic) {
    const itemModule = itemRegistry[item.type];
    const response = perfectResponse(item);
    assert.equal(itemModule.isReady(item, response), true, item.id);
    assert.equal(itemModule.score(item, response), 1, item.id);
    assert.ok(itemModule.serialize(item, response).trim(), item.id);
    assert.equal(itemModule.isReady(item, EMPTY_ITEM_RESPONSE), false, `${item.id}: an empty answer cannot be submitted`);
    assert.ok(itemModule.score(item, EMPTY_ITEM_RESPONSE) < 0.95, `${item.id}: an empty answer cannot pass`);
    if (item.options) {
      assert.equal(new Set(item.options.map(normalizeExerciseAnswer)).size, item.options.length, `${item.id}: duplicate options`);
      for (const wrong of item.options.filter((option) => option !== item.answer)) {
        assert.ok(itemModule.score(item, { ...response, selected: wrong }) < 0.95, `${item.id}: distractor is treated as correct`);
      }
    }
    if (item.type === "order") {
      assert.deepEqual(item.tokens, item.answer.split(/\s+/u), `${item.id}: use individual word tiles`);
      assert.ok(item.tokens.length >= 6, item.id);
    }
    if (item.type === "error-hunt") {
      assert.notEqual(item.sentenceTokens[item.errorIndex], item.correction, item.id);
      assert.ok(itemModule.score(item, { ...response, errorIndex: (item.errorIndex + 1) % item.sentenceTokens.length }) < 0.95, item.id);
    }
    if (item.type === "text-order") {
      assert.equal(item.sentences.length, 5);
      assert.deepEqual(new Set(item.tokens), new Set(item.correctOrder));
      assert.ok(itemModule.score(item, { ...response, ordered: [...response.ordered].reverse() }) < 0.95, item.id);
    }
  }
});

test("all authored mechanics render in the existing lesson player", () => {
  for (const item of items) {
    const html = renderToStaticMarkup(createElement(itemRegistry[item.type].Render, {
      question: item, response: { ...EMPTY_ITEM_RESPONSE, selections: {} },
      setResponse() {}, checked: false, correct: false, displayOptions: item.options ?? [],
      displayTokens: item.tokens ?? [], onSubmit() {}, sessionId: "situational-render-test",
    }));
    assert.ok(html.length > 40, item.id);
    assert.doesNotMatch(html, /\[object Object\]|undefined|NaN/u, item.id);
  }
});

test("Danish content has English support, explicit feedback and only five optional AI finales", () => {
  assert.doesNotMatch(JSON.stringify(levels), /[\u0400-\u04ff]|TODO|TBD|redigeres|erstattes ved redaktion|Uv ist/u);
  assert.equal(new Set(items.map((item) => `${item.prompt}\n${item.answer}`)).size, 200, "do not recycle the same prompt and answer");
  assert.ok(new Set(items.map((item) => item.type)).size >= 12);
  for (const item of items) {
    for (const field of ["prompt", "answer", "translation", "hint", "explanation"]) assert.ok(item[field]?.trim(), `${item.id}: missing ${field}`);
    assert.ok(item.explanation.length >= 45, item.id);
    assert.ok(["read", "produce"].includes(item.modality));
    assert.equal(item.assets.audio, null);
  }
  const aiItems = items.filter((item) => item.aiPolicy);
  assert.equal(aiItems.length, 5);
  for (const level of levels) {
    const finale = level.missions[3].questions[9];
    assert.ok(finale.aiPolicy, level.id);
    assert.equal(finale.aiPolicy.skipWhenUnavailable, true);
    assert.ok(finale.aiPolicy.requiredFacts.length >= 4);
    assert.ok(finale.minWords >= 15);
    assert.equal(level.missions.flatMap((mission) => mission.questions).filter((item) => item.aiPolicy).length, 1);
  }
});

test("numerical reading answers respect units, comparison bases and simultaneous constraints", () => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const cases = [
    ["l21-m01-q01", `${6200 + 400}`.replace(/(\d)(\d{3})$/u, "$1.$2") + " kr."],
    ["l21-m04-q01", "Fire"],
    ["l23-m03-q01", "Kl. 10.10"],
    ["l24-m02-q01", `${(120 - 100) / 100 * 100} procent`],
    ["l24-m02-q02", `${50 - 40} procentpoint`],
    ["l24-m02-q05", `${18 / 60 * 100} procent`],
    ["l24-m02-q08", `${(20 + 10) / 2} varer`],
    ["l25-m02-q01", `${600 - (12 * 35 + 80)} kr.`],
    ["l25-m02-q04", `Tilbud B er ${420 + 80 - 470} kr. billigere.`],
    ["l25-m02-q09", `Nej, så bliver der kun ${100 - 70} kr. tilbage.`],
    ["l25-m03-q01", "Festen udsættes."],
  ];
  for (const [id, answer] of cases) assert.equal(byId.get(id)?.answer, answer, id);
});

test("the new themes work with the selection dictionary, including actual inflected forms", () => {
  for (const word of [
    "indflytning", "husleje", "nøglerne", "overtagelsesnotat", "viceværten", "drypper",
    "kundekontakt", "tilbagemelding", "afventer", "beklager", "vagtplanen", "overholde",
    "tidsbestilling", "receptionisten", "hovedindgangen", "sovet", "gentage", "medbring",
    "procentpoint", "stigningen", "journalisten", "kampagnen", "referatet", "rettet",
    "reserveplan", "leveringen", "invitationen", "arrangementet", "maden", "hensyn",
  ]) assert.ok(lookupDanishWord(word)?.entry.english, word);
  const text = items.flatMap((item) => [item.prompt, item.answer, item.hint, item.explanation, ...(item.options ?? []), ...(item.tokens ?? [])]).join(" ");
  const tokens = text.toLocaleLowerCase("da-DK").match(/[a-zæøå]+(?:-[a-zæøå]+)*/gu).filter((token) => token.length > 1);
  const coverage = tokens.filter((token) => lookupDanishWord(token)).length / tokens.length;
  assert.ok(coverage >= 0.89, `new course dictionary coverage: ${(coverage * 100).toFixed(1)}%`);
});
