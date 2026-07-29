import assert from "node:assert/strict";
import test from "node:test";

const developer = await import("../lib/developerMode.ts");

test("developer kroner grants are additive and reject invalid values", () => {
  assert.equal(developer.grantDeveloperKroner(180, 500), 680);
  assert.equal(developer.grantDeveloperKroner(680, 5_000), 5_680);
  assert.equal(developer.grantDeveloperKroner(680, -10), 680);
});

test("developer level access opens the selected path prefix only while enabled", () => {
  const unlocked = developer.unlockDeveloperLevel(0, 8, 10);
  assert.equal(unlocked, 8);
  assert.equal(developer.isDeveloperLevelOpen(true, unlocked, 8), true);
  assert.equal(developer.isDeveloperLevelOpen(true, unlocked, 9), false);
  assert.equal(developer.isDeveloperLevelOpen(false, unlocked, 8), false);
  assert.equal(developer.unlockDeveloperLevel(8, 99, 10), 9);
});
