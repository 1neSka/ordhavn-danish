import assert from "node:assert/strict";
import test from "node:test";

const dictionary = await import("../lib/dictionaryData.ts");

test("offline dictionary has broad A0-B2 coverage and complete noun genders", () => {
  assert.ok(dictionary.dictionaryEntries.length >= 693, `only ${dictionary.dictionaryEntries.length} entries`);
  assert.ok(dictionary.scenarioDictionaryEntries.length >= 230, `only ${dictionary.scenarioDictionaryEntries.length} scenario entries`);
  assert.ok(dictionary.coreGameDictionaryEntries.length >= 140, `only ${dictionary.coreGameDictionaryEntries.length} core game entries`);
  assert.equal(dictionary.dictionarySize, dictionary.dictionaryEntries.length);
  assert.ok(dictionary.dictionaryAliasCount >= 1_350, `only ${dictionary.dictionaryAliasCount} aliases`);
  assert.ok(dictionary.dictionaryIndexedFormCount >= 3_290, `only ${dictionary.dictionaryIndexedFormCount} indexed forms`);
  assert.equal(
    dictionary.dictionaryAliasCount,
    dictionary.dictionaryEntries.reduce((total, entry) => total + (entry.aliases?.length ?? 0), 0),
  );
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
  assert.equal(dictionary.normalizeSelectedDanishWord("cafe\u0301"), "café");
  assert.equal(dictionary.normalizeSelectedDanishWord("ikke‑position"), "ikke-position");
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

test("lookup infers frequent imperatives, passive forms and noun genitives", () => {
  assert.equal(dictionary.lookupDanishWord("byg")?.entry.headword, "bygge");
  assert.equal(dictionary.lookupDanishWord("vælg")?.entry.headword, "vælge");
  assert.equal(dictionary.lookupDanishWord("kontrollér")?.entry.headword, "kontrollere");
  assert.equal(dictionary.lookupDanishWord("bruges")?.entry.headword, "bruge");
  assert.equal(dictionary.lookupDanishWord("dagens")?.entry.headword, "dag");
  assert.equal(dictionary.lookupDanishWord("caféen")?.entry.headword, "café");
});

test("lookup preserves alternate senses for single-word homographs", () => {
  const bothOrBoats = dictionary.lookupDanishWord("både");
  assert.equal(bothOrBoats?.entry.headword, "båd");
  assert.ok(bothOrBoats?.alternatives.some((entry) => entry.headword === "både" && entry.english === "both"));
  const seaOrHave = dictionary.lookupDanishWord("have");
  assert.equal(seaOrHave?.entry.headword, "hav");
  assert.ok(seaOrHave?.alternatives.some((entry) => entry.headword === "have"));
});

test("lookup covers concrete B1-B2 scenario nouns and their real inflections", () => {
  const forms = {
    fartøjerne: ["fartøj", "et"],
    leverandørerne: ["leverandør", "en"],
    myndighederne: ["myndighed", "en"],
    rækkefølgen: ["rækkefølge", "en"],
    signalfejlene: ["signalfejl", "en"],
    årskortene: ["årskort", "et"],
    sluserne: ["sluse", "en"],
    seglene: ["segl", "et"],
    køretøjer: ["køretøj", "et"],
    brofaget: ["brofag", "et"],
  };
  for (const [selected, [headword, gender]] of Object.entries(forms)) {
    const result = dictionary.lookupDanishWord(selected);
    assert.equal(result?.entry.headword, headword, selected);
    assert.equal(result?.entry.gender, gender, selected);
  }
});

test("lookup resolves B1-B2 operational verb forms without online stemming", () => {
  const forms = {
    overskredet: "overskride",
    udelukkes: "udelukke",
    tilbagekaldte: "tilbagekalde",
    afgået: "afgå",
    overtog: "overtage",
    gjaldt: "gælde",
    planlagde: "planlægge",
    bekræftede: "bekræfte",
    undersøgte: "undersøge",
    aflæst: "aflæse",
    afbrudt: "afbryde",
    offentliggjort: "offentliggøre",
    tilkaldte: "tilkalde",
    trukket: "trække",
  };
  for (const [selected, headword] of Object.entries(forms)) {
    assert.equal(dictionary.lookupDanishWord(selected)?.entry.headword, headword, selected);
  }
});

test("lookup covers advanced harbor, storm and ferry scenario forms", () => {
  const forms = {
    vandstanden: "vandstand",
    cyklisterne: "cyklist",
    inspektørerne: "inspektør",
    tærsklerne: "tærskel",
    beregningerne: "beregning",
    sensorerne: "sensor",
    hændelsen: "hændelse",
    kompasset: "kompas",
  };
  for (const [selected, headword] of Object.entries(forms)) {
    assert.equal(dictionary.lookupDanishWord(selected)?.entry.headword, headword, selected);
  }
  assert.equal(dictionary.lookupDanishWord("såfremt")?.entry.partOfSpeech, "conjunction");
  assert.equal(dictionary.lookupDanishWord("hvorefter")?.entry.english, "after which");
});

test("lookup covers semantic traps, quantifiers and compound Danish numbers", () => {
  assert.equal(dictionary.lookupDanishWord("ulæseligt")?.entry.headword, "ulæselig");
  assert.equal(dictionary.lookupDanishWord("gyldige")?.entry.headword, "gyldig");
  assert.equal(dictionary.lookupDanishWord("højere")?.entry.headword, "høj");
  assert.equal(dictionary.lookupDanishWord("medmindre")?.entry.partOfSpeech, "conjunction");
  assert.equal(dictionary.lookupDanishWord("alle")?.entry.partOfSpeech, "determiner");
  assert.equal(dictionary.lookupDanishWord("kun")?.entry.note.includes("position"), true);
  assert.equal(dictionary.lookupDanishWord("syvoghalvtreds")?.entry.english, "fifty-seven");
  assert.equal(dictionary.lookupDanishWord("nioghalvfjerds")?.entry.note, "79; 9 + 3½ × 20");
});

test("combined prøve entry keeps noun gender and verbal inflections", () => {
  const nounForm = dictionary.lookupDanishWord("prøven");
  const verbForm = dictionary.lookupDanishWord("prøvede");
  assert.equal(nounForm?.entry.headword, "prøve");
  assert.equal(nounForm?.entry.partOfSpeech, "noun / verb");
  assert.equal(nounForm?.entry.gender, "en");
  assert.equal(verbForm?.entry.headword, "prøve");
});

test("lookup stays local and returns null for unknown or multiword selections", () => {
  assert.equal(dictionary.lookupDanishWord("dashboard"), null);
  assert.equal(dictionary.lookupDanishWord("meget hyggelig"), null);
  assert.equal(dictionary.lookupDanishWord("kvantekompas"), null);
});
