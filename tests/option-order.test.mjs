import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { orderThreeChoiceOptions } from "../lib/optionOrder.ts";

test("three-choice order is stable within one attempt and never mutates source data", () => {
  const source = ["for tidligt", "korrekt", "for sent"];
  const first = orderThreeChoiceOptions(source, "korrekt", "session-a:question-1");
  const second = orderThreeChoiceOptions(source, "korrekt", "session-a:question-1");

  assert.deepEqual(first, second);
  assert.deepEqual(source, ["for tidligt", "korrekt", "for sent"]);
  assert.deepEqual([...first].sort(), [...source].sort());
});

test("new session seeds distribute the correct answer across all three positions", () => {
  const positions = Array.from({ length: 300 }, (_, index) =>
    orderThreeChoiceOptions(["forkert A", "korrekt", "forkert B"], "korrekt", `session-${index}:question-1`).indexOf("korrekt"),
  );
  const counts = [0, 1, 2].map((position) => positions.filter((item) => item === position).length);

  assert.ok(counts.every((count) => count >= 80 && count <= 120), `unexpected distribution: ${counts.join("/")}`);
});

test("non-three-choice mechanics keep their intentional order", () => {
  assert.deepEqual(orderThreeChoiceOptions(["en", "et"], "et", "session"), ["en", "et"]);
});

test("lesson UI uses the same stable order for clicks, number keys, and cloze blanks", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /const displayOptions = question\?\.options/u);
  assert.match(source, /const option = displayOptions\[Number\(event\.key\) - 1\]/u);
  assert.match(source, /orderThreeChoiceOptions\(blank\.options, blank\.answer/u);
  assert.match(source, /\{displayOptions\.map\(\(option, optionIndex\)/u);
});
