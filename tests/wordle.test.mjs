import assert from "node:assert/strict";
import test from "node:test";

const data = await import("../lib/wordleData.ts");
const wordle = await import("../lib/wordle.ts");

test("answer and accepted-guess dictionaries stay deliberately asymmetric", () => {
  assert.equal(data.WORDLE_ANSWERS.length, 500);
  assert.ok(data.WORDLE_GUESSES.length >= 5_000 && data.WORDLE_GUESSES.length <= 10_000);
  assert.ok(data.WORDLE_GUESSES.length > data.WORDLE_ANSWERS.length * 10);
  assert.equal(new Set(data.WORDLE_ANSWERS).size, data.WORDLE_ANSWERS.length);
  assert.equal(new Set(data.WORDLE_GUESSES).size, data.WORDLE_GUESSES.length);
  const accepted = new Set(data.WORDLE_GUESSES);
  assert.ok(data.WORDLE_ANSWERS.every((answer) => accepted.has(answer)));
  assert.ok([...data.WORDLE_ANSWERS, ...data.WORDLE_GUESSES].every((word) => /^[a-zæøå]{5}$/u.test(word)));
  assert.equal(data.WORDLE_ANSWERS.includes("vædde"), false);
  assert.equal(data.WORDLE_ANSWERS.includes("snøft"), false);
  assert.equal(data.WORDLE_GUESSES.includes("bøger"), true);
  assert.equal(data.WORDLE_GUESSES.includes("lngen"), false);
  assert.equal(data.WORDLE_GUESSES.includes("peter"), false);
});

test("duplicate letters receive no more yellow tiles than the answer contains", () => {
  assert.deepEqual(wordle.scoreWordleGuess("kaffe", "falde"), ["present", "correct", "absent", "absent", "correct"]);
  assert.deepEqual(wordle.scoreWordleGuess("bølge", "bolle"), ["correct", "absent", "correct", "absent", "correct"]);
});

test("daily answers and path answers are deterministic", () => {
  assert.equal(wordle.selectWordleAnswer("daily:2026-07-29"), wordle.selectWordleAnswer("daily:2026-07-29"));
  assert.notEqual(wordle.createWordleGame("path:alpha", "path", "alpha").key, wordle.createWordleGame("path:beta", "path", "beta").key);
});

test("path offers four optional checkpoints up through B1", () => {
  assert.equal(wordle.WORDLE_PATH_CHECKPOINTS.length, 4);
  assert.deepEqual(wordle.WORDLE_PATH_CHECKPOINTS.map((item) => item.afterLevelIndex), [2, 5, 7, 8]);
});
