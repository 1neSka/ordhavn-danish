import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  LEXICAL_BANK_COUNTS,
  LEXICAL_BANKS,
  assertLexicalBanksValid,
  buildCollocationLock,
  buildInflectionForge,
  buildOddOneOut,
  buildSynonymPick,
  buildWordForge,
  getSynonymGroup,
  validateLexicalBanks,
} from "../lib/lexicalBanks.ts";

function allTopLevelEntries() {
  return Object.values(LEXICAL_BANKS).flat();
}

test("lexical banks provide substantial A2+ through B2 source material", () => {
  assert.ok(LEXICAL_BANK_COUNTS.synonymGroups >= 12);
  assert.ok(LEXICAL_BANK_COUNTS.synonymCandidates >= 48);
  assert.ok(LEXICAL_BANK_COUNTS.nuanceEntries >= 60);
  assert.ok(LEXICAL_BANK_COUNTS.collocations >= 40);
  assert.ok(LEXICAL_BANK_COUNTS.governedPrepositions >= 35);
  assert.ok(LEXICAL_BANK_COUNTS.falseFriends >= 30);
  assert.ok(LEXICAL_BANK_COUNTS.compoundPatterns >= 30);
  assert.ok(LEXICAL_BANK_COUNTS.semanticTerms >= 100);
  assert.ok(LEXICAL_BANK_COUNTS.inflectionTargets >= 50);

  const meaningfulEntries = Object.values(LEXICAL_BANK_COUNTS).reduce((sum, count) => sum + count, 0);
  assert.ok(meaningfulEntries >= 500, `expected at least 500 authored lexical units, got ${meaningfulEntries}`);

  for (const level of ["A2+", "B1", "B2"]) {
    assert.ok(allTopLevelEntries().some((entry) => entry.level === level), `missing level ${level}`);
  }
});

test("validation is deterministic and all IDs and references are valid", () => {
  assert.deepEqual(validateLexicalBanks(), []);
  assert.deepEqual(validateLexicalBanks(), []);
  assert.doesNotThrow(() => assertLexicalBanksValid());

  const ids = allTopLevelEntries().map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-z0-9-]+$/u.test(id)));
});

test("every contextual synonym group has one referenced and one fitting answer", () => {
  const candidateIds = [];
  for (const group of LEXICAL_BANKS.synonymGroups) {
    const referenced = group.candidates.filter((candidate) => candidate.id === group.correctCandidateId);
    const fitting = group.candidates.filter((candidate) => candidate.fitsContext);
    assert.equal(referenced.length, 1, group.id);
    assert.equal(fitting.length, 1, group.id);
    assert.equal(referenced[0].id, fitting[0].id, group.id);
    assert.match(group.contextDa, /___/u, group.id);
    candidateIds.push(...group.candidates.map((candidate) => candidate.id));
  }
  assert.equal(new Set(candidateIds).size, candidateIds.length);
});

test("nuance scales are strictly ordered and lexical choice mechanics expose unique answers", () => {
  for (const scale of LEXICAL_BANKS.nuanceScales) {
    assert.ok(scale.entries.length >= 4);
    const strengths = scale.entries.map((entry) => entry.strength);
    assert.ok(strengths.every((strength, index) => index === 0 || strengths[index - 1] < strength), scale.id);
  }

  for (const item of LEXICAL_BANKS.collocations) {
    assert.equal(new Set([item.verbDa, ...item.distractorVerbsDa]).size, item.distractorVerbsDa.length + 1, item.id);
  }
  for (const item of LEXICAL_BANKS.governedPrepositions) {
    assert.equal(new Set([item.prepositionDa, ...item.distractorsDa]).size, item.distractorsDa.length + 1, item.id);
  }
  for (const item of LEXICAL_BANKS.semanticFields) {
    assert.ok(!item.membersDa.includes(item.intruderDa), item.id);
  }
});

test("projection APIs are stable and ready for the five deterministic mechanics", () => {
  const synonym = buildSynonymPick("syn-show-evidence");
  assert.deepEqual(synonym, buildSynonymPick("syn-show-evidence"));
  assert.equal(synonym.mechanic, "synonym-pick");
  assert.equal(synonym.answerDa, "indikerer");
  assert.equal(synonym.optionsDa.length, 4);

  const oddOneOut = buildOddOneOut("field-statistics");
  assert.equal(oddOneOut.mechanic, "odd-one-out");
  assert.equal(oddOneOut.answerDa, "metafor");
  assert.equal(oddOneOut.optionsDa.length, 5);

  const collocation = buildCollocationLock("col-traeffe-beslutning");
  assert.equal(collocation.mechanic, "collocation-lock");
  assert.equal(collocation.answerDa, "træffe");
  assert.equal(collocation.completedPhraseDa, "træffe en beslutning");

  const inflection = buildInflectionForge("inf-risiko-indef-pl");
  assert.equal(inflection.mechanic, "inflection-forge");
  assert.deepEqual(inflection.acceptableAnswersDa, ["risici", "risikoer"]);

  const compound = buildWordForge("cmp-arbejdsloes");
  assert.equal(compound.mechanic, "word-forge");
  assert.equal(compound.correctLinkerDa, "s");
  assert.equal(compound.answerDa, "arbejdsløs");
  assert.equal(new Set(compound.linkerOptionsDa).size, compound.linkerOptionsDa.length);
});

test("unknown source IDs fail loudly instead of generating malformed items", () => {
  assert.throws(() => getSynonymGroup("syn-does-not-exist"), /Unknown synonym group id/u);
  assert.throws(() => buildOddOneOut("field-does-not-exist"), /Unknown semantic field id/u);
  assert.throws(() => buildCollocationLock("col-does-not-exist"), /Unknown collocation id/u);
  assert.throws(() => buildInflectionForge("inf-does-not-exist"), /Unknown inflection target id/u);
  assert.throws(() => buildWordForge("cmp-does-not-exist"), /Unknown compound pattern id/u);
});

test("lexical copy is Danish and English only and contains no Cyrillic", async () => {
  const source = await readFile(new URL("../lib/lexicalBanks.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /[\u0400-\u04ff]/u);
  assert.ok(LEXICAL_BANKS.synonymGroups.every((group) => group.promptDa.length > 20 && group.conceptEn.length > 0));
  assert.ok(LEXICAL_BANKS.falseFriends.every((entry) => entry.exampleDa.length > 10 && entry.trapEn.length > 10));
});

test("compound and inflection answer references are internally consistent", () => {
  for (const item of LEXICAL_BANKS.compoundPatterns) {
    assert.equal(`${item.firstStemDa}${item.linkerDa}${item.headDa}`, item.compoundDa, item.id);
    assert.ok(!item.distractorLinkersDa.includes(item.linkerDa), item.id);
  }
  for (const item of LEXICAL_BANKS.inflectionTargets) {
    assert.ok(item.acceptableAnswersDa.includes(item.answerDa), item.id);
    assert.equal(new Set(item.acceptableAnswersDa).size, item.acceptableAnswersDa.length, item.id);
  }
});
