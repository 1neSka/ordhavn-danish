import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  danishOnlineLookupCandidates,
  lookupOnlineDanishWord,
  parseKaikkiJsonl,
  parseWiktionaryDanishHtml,
} from "../lib/onlineDictionary.ts";

const directKaikki = JSON.stringify({
  word: "hundesnor",
  lang: "Danish",
  lang_code: "da",
  pos: "noun",
  senses: [{ glosses: ["dog leash"], tags: ["common-gender"] }],
});

test("Kaikki JSONL yields bounded English glosses only for Danish rows", () => {
  const unrelated = JSON.stringify({ word: "hundesnor", lang_code: "de", pos: "noun", senses: [{ glosses: ["wrong language"] }] });
  const parsed = parseKaikkiJsonl(`${unrelated}\n${directKaikki}\n`, "hundesnor");
  assert.deepEqual(parsed, {
    headword: "hundesnor",
    english: ["dog leash"],
    partOfSpeech: "noun",
    formOf: undefined,
    formNote: undefined,
  });
});

test("conservative Danish suffix candidates recover common lemmas without replacing the exact word", () => {
  assert.deepEqual(danishOnlineLookupCandidates("referatet").slice(0, 2), ["referatet", "referat"]);
  assert.ok(danishOnlineLookupCandidates("møderne").includes("møde"));
  assert.ok(danishOnlineLookupCandidates("katten").includes("kat"));
  assert.deepEqual(danishOnlineLookupCandidates("hus"), ["hus"]);
});

test("the online lookup follows a Kaikki form-of record to its translated lemma", async () => {
  const form = JSON.stringify({
    word: "huset",
    lang_code: "da",
    pos: "noun",
    senses: [{ glosses: ["definite neuter singular of hus"], tags: ["form-of"], form_of: [{ word: "hus" }] }],
  });
  const lemma = JSON.stringify({
    word: "hus",
    lang_code: "da",
    pos: "noun",
    senses: [{ glosses: ["house", "building"] }],
  });
  const fetcher = async (input) => {
    const url = String(input);
    if (url.endsWith("/huset.jsonl")) return new Response(form);
    if (url.endsWith("/hus.jsonl")) return new Response(lemma);
    return new Response("", { status: 404 });
  };

  const result = await lookupOnlineDanishWord("huset", fetcher);
  assert.equal(result?.headword, "hus");
  assert.deepEqual(result?.english, ["house", "building"]);
  assert.equal(result?.formNote, "definite neuter singular of hus");
  assert.equal(result?.matchKind, "form");
  assert.equal(result?.provider, "kaikki");
});

test("Wiktionary HTML is used when the structured provider has no entry", async () => {
  const html = `<div><h2 id="English">English</h2><ol><li>wrong language</li></ol><h2 id="Danish">Danish</h2><h3 id="Noun">Noun</h3><ol><li><a href="/wiki/dog_leash">dog leash</a></li></ol><h2 id="Dutch">Dutch</h2><ol><li>wrong section</li></ol></div>`;
  assert.deepEqual(parseWiktionaryDanishHtml(html, "hundesnor"), {
    headword: "hundesnor",
    english: ["dog leash"],
    partOfSpeech: "noun",
    formOf: undefined,
    formNote: undefined,
  });

  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes("kaikki.org")) return new Response("", { status: 404 });
    return Response.json({ parse: { text: html } });
  };
  const result = await lookupOnlineDanishWord("hundesnor", fetcher);
  assert.equal(result?.english[0], "dog leash");
  assert.equal(result?.provider, "wiktionary");
});

test("selection dictionary calls the network only after a local one-word miss and attributes the source", async () => {
  const source = await readFile(new URL("../app/selection-dictionary.tsx", import.meta.url), "utf8");
  const localLookup = source.indexOf("lookupDanishWord(normalized)");
  const onlineFetch = source.indexOf("fetch(`/api/dictionary/lookup?word=");
  assert.ok(localLookup >= 0 && onlineFetch > localLookup);
  assert.match(source, /normalizeSelectedDanishWord/u);
  assert.match(source, /onlineCacheRef/u);
  assert.match(source, /CC BY-SA 4\.0/u);
  assert.match(source, /online fallback/u);
});
