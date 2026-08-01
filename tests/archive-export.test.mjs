import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("learning progress autosaves locally without triggering an archive export", () => {
  assert.match(pageSource, /localStorage\.setItem\(STORAGE_KEY, prepared\.primary\)/u);
  assert.doesNotMatch(pageSource, /setTimeout\(\(\) => exportData\(/u);
  assert.doesNotMatch(pageSource, /exportData\("folder", next\)/u);
});

test("archive downloads and directory writes remain explicit button actions", () => {
  assert.match(pageSource, /onClick=\{\(\) => onExport\("download"\)\}/u);
  assert.match(pageSource, /onClick=\{\(\) => onExport\("folder"\)\}/u);
  assert.match(pageSource, /onExport=\{exportData\}/u);
  assert.match(pageSource, /directoryHandle\.getFileHandle\(filename, \{ create: true \}\)/u);
});
