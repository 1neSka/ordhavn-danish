import assert from "node:assert/strict";
import test from "node:test";

const dictionary = await import("../lib/dictionaryData.ts");

test("offline dictionary has broad A0-B2 coverage and complete noun genders", () => {
  assert.ok(dictionary.dictionaryEntries.length >= 150, `only ${dictionary.dictionaryEntries.length} entries`);
  assert.equal(dictionary.dictionarySize, dictionary.dictionaryEntries.length);
  assert.equal(new Set(dictionary.dictionaryEntries.map((entry) => entry.headword)).size, dictionary.dictionaryEntries.length);
  assert.ok(dictionary.dictionaryEntries.every((entry) => entry.english.trim()));
  assert.ok(dictionary.dictionaryEntries.every((entry) => entry.partOfSpeech !== "noun" || ["en", "et"].includes(entry.gender)));
  assert.ok(dictionary.dictionaryEntries.every((entry) => entry.form || entry.note));
});

test("normalization accepts one Unicode Danish word and surrounding punctuation", () => {
  assert.equal(dictionary.normalizeSelectedDanishWord("  “Huset,”  "), "huset");
  assert.equal(dictionary.normalizeSelectedDanishWord("ÅBEN"), "åben");
  assert.equal(dictionary.normalizeSelectedDanishWord("københavn"), "københavn");
  assert.equal(dictionary.normalizeSelectedDanishWord("blå-bog"), "blå-bog");
});

test("normalization rejects phrases, empty selections and non-word content", () => {
  assert.equal(dictionary.normalizeSelectedDanishWord("det store hus"), null);
  assert.equal(dictionary.normalizeSelectedDanishWord("to\nord"), null);
  assert.equal(dictionary.normalizeSelectedDanishWord("   "), null);
  assert.equal(dictionary.normalizeSelectedDanishWord("123"), null);
  assert.equal(dictionary.normalizeSelectedDanishWord("hus/bil"), null);
});

test("lookup resolves common inflected noun, verb and adjective forms", () => {
  const house = dictionary.lookupDanishWord("hUSENE.");
  assert.equal(house?.entry.headword, "hus");
  assert.equal(house?.entry.english, "house");
  assert.equal(house?.entry.gender, "et");

  assert.equal(dictionary.lookupDanishWord("gik")?.entry.headword, "gå");
  assert.equal(dictionary.lookupDanishWord("bedre")?.entry.headword, "god");
  assert.equal(dictionary.lookupDanishWord("HØFLIGT")?.entry.headword, "høflig");
});

test("lookup stays local and returns null for unknown or multiword selections", () => {
  assert.equal(dictionary.lookupDanishWord("dashboard"), null);
  assert.equal(dictionary.lookupDanishWord("meget hyggelig"), null);
  assert.equal(dictionary.lookupDanishWord("syvoghalvtreds"), null);
});
