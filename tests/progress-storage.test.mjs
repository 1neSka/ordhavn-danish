import assert from "node:assert/strict";
import test from "node:test";

const storage = await import("../lib/progressStorage.ts");

test("a malformed primary save falls back to the previous valid backup", () => {
  assert.deepEqual(
    storage.readProgressWithBackup("{broken", JSON.stringify({ version: 2, xp: 420 })),
    { version: 2, xp: 420 },
  );
});

test("updates retain the prior primary snapshot as a recovery copy", () => {
  const oldSave = JSON.stringify({ version: 2, xp: 100 });
  const newSave = JSON.stringify({ version: 3, xp: 180 });
  assert.deepEqual(storage.prepareProgressWrite(oldSave, newSave), { primary: newSave, backup: oldSave });
  assert.equal(storage.prepareProgressWrite(newSave, newSave).backup, null);
});

test("a malformed primary never replaces an existing good backup", () => {
  const write = storage.prepareProgressWrite("{broken", JSON.stringify({ version: 3 }));
  assert.equal(write.backup, null);
});
