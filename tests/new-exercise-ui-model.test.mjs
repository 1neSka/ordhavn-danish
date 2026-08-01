import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  levenshteinSimilarity,
  scoreClozeSelections,
  scoreFreeAnswer,
  scoreRegisterMatches,
  serializeClozeSelections,
  serializeRegisterMatches,
} from "../lib/exerciseScoring.ts";

test("cloze-multi serializes blank order and keeps fractional credit", () => {
  const segments = [
    { text: "Hun bor i " },
    { blankId: "article", options: ["en", "et"], answer: "et" },
    { text: " " },
    { blankId: "adjective", options: ["gammel", "gammelt"], answer: "gammelt" },
    { text: " hus med " },
    { blankId: "garden", options: ["stor", "stor en"], answer: "stor" },
    { text: " have." },
  ];
  const selections = { article: "et", adjective: "gammel", garden: "stor" };

  assert.equal(serializeClozeSelections(segments, selections), "et | gammel | stor");
  assert.equal(scoreClozeSelections(segments, selections), 2 / 3);
});

test("register-match scores each addressee independently", () => {
  const pairs = [
    { addressee: "chef", addresseeNote: "formelt", utterance: "Kunne vi flytte mødet?" },
    { addressee: "ven", addresseeNote: "uformelt", utterance: "Kan vi rykke det?" },
    { addressee: "læge", addresseeNote: "høfligt", utterance: "Er det muligt at ændre tiden?" },
    { addressee: "nabo", addresseeNote: "venligt", utterance: "Passer en anden dag bedre?" },
  ];
  const matches = {
    chef: pairs[0].utterance,
    ven: pairs[1].utterance,
    læge: pairs[3].utterance,
    nabo: pairs[2].utterance,
  };

  assert.equal(serializeRegisterMatches(pairs, matches), `${pairs[0].utterance} | ${pairs[1].utterance} | ${pairs[3].utterance} | ${pairs[2].utterance}`);
  assert.equal(scoreRegisterMatches(pairs, matches), 0.5);
});

test("transform/free input uses the best Levenshtein score without making it boolean", () => {
  const challenge = {
    answer: "Brevet bliver sendt i morgen",
    acceptedAnswers: ["Brevet sendes i morgen"],
  };

  assert.equal(scoreFreeAnswer(challenge, "Brevet sendes i morgen"), 1);
  const partial = scoreFreeAnswer(challenge, "Brevet sendes morgen");
  assert.ok(partial > 0.5 && partial < 1);
  assert.equal(partial, levenshteinSimilarity("Brevet sendes i morgen", "Brevet sendes morgen"));
});

test("sentence-building feedback always reveals the complete correct sentence after an error", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /\["order", "ikke-position", "transform", "cloze-multi"\]\.includes\(question\.type\)/u);
  assert.match(source, /Korrekt sætning/u);
  assert.match(source, /<b lang="da">\{expectedAnswerLabel\}<\/b>/u);
});

test("hovering an answer cannot create a horizontal lesson scrollbar", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(styles, /\.lesson-main \{[^}]*overflow-x: hidden;/u);
  assert.doesNotMatch(styles, /\.answer-option:hover[^}]*translateX/u);
});
