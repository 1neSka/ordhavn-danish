import assert from "node:assert/strict";
import test from "node:test";

const v2 = await import("../lib/v2Drill.ts");

function correctResponse(item) {
  if (item.mechanic === "choice") return { mechanic: "choice", option: item.correctOption };
  if (item.mechanic === "theory") return { mechanic: "theory", option: item.correctOption };
  if (item.mechanic === "swap") return { mechanic: "swap", indices: item.swapIndices };
  if (item.mechanic === "order") return { mechanic: "order", indices: item.correctOrder };
  if (item.mechanic === "slot") return { mechanic: "slot", slot: item.answerSlot };
  return { mechanic: "spot", index: item.errorIndex };
}

test("the original hundred drills remain beside the practical and theory expansions", () => {
  assert.equal(v2.V2_DRILLS.length, 224);
  assert.equal(v2.V2_DRILLS.filter((item) => !item.id.startsWith("advanced-") && !item.id.startsWith("theory-")).length, 100);
  const advanced = v2.V2_DRILLS.filter((item) => item.id.startsWith("advanced-"));
  assert.equal(advanced.length, 100);
  assert.deepEqual(new Set(advanced.map((item) => item.level)), new Set(["A2+", "B1", "B2"]));
  assert.equal(advanced.some((item) => item.level === "A1" || item.level === "A2"), false);
  const theory = v2.V2_DRILLS.filter((item) => item.mechanic === "theory");
  assert.equal(theory.length, 24);
  assert.equal(theory.every((item) => ["A2+", "B1", "B2"].includes(item.level)), true);
});

test("drill ids are unique and every mechanic has a substantial bank", () => {
  assert.equal(new Set(v2.V2_DRILLS.map((item) => item.id)).size, v2.V2_DRILLS.length);
  const counts = v2.V2_DRILLS.reduce((result, item) => {
    result[item.mechanic] = (result[item.mechanic] ?? 0) + 1;
    return result;
  }, {});
  for (const mechanic of ["choice", "swap", "order", "slot", "spot", "theory"]) {
    assert.ok((counts[mechanic] ?? 0) >= 20, `${mechanic} needs at least twenty variants`);
  }
});

test("word-order tasks use enough real word tokens to avoid four-block giveaways", () => {
  const practical = v2.V2_DRILLS.filter((item) => ["swap", "order", "spot"].includes(item.mechanic));
  assert.equal(practical.length, 90);
  assert.equal(practical.every((item) => item.tokens.length >= 6), true);
  const rainy = v2.V2_DRILLS.find((item) => item.id === "a2-if-rain:swap");
  assert.deepEqual(rainy?.tokens, ["Hvis", "det", "regner,", "vi", "bliver", "hjemme."]);
});

test("the expansion includes every requested narrative voice", () => {
  const advancedVoices = new Set(
    v2.V2_DRILLS
      .filter((item) => item.id.startsWith("advanced-"))
      .map((item) => item.voice),
  );
  assert.deepEqual(advancedVoices, new Set(["satirisk", "skarp", "venlig", "filosofisk", "absurd", "formel"]));
});

test("all generated answers are playable and choice answers do not occupy one fixed slot", () => {
  for (const item of v2.V2_DRILLS) {
    const response = correctResponse(item);
    assert.equal(v2.isV2ResponseReady(item, response), true, `${item.id} should be ready`);
    assert.equal(v2.isV2AnswerCorrect(item, response), true, `${item.id} should accept its canonical answer`);
  }

  const correctPositions = new Set(
    v2.V2_DRILLS
      .filter((item) => item.mechanic === "choice" || item.mechanic === "theory")
      .map((item) => item.options.indexOf(item.correctOption)),
  );
  assert.deepEqual(correctPositions, new Set([0, 1, 2, 3]));
});

test("an endless queue contains every selected card exactly once per round", () => {
  const ids = v2.V2_DRILLS.map((item) => item.id);
  const first = v2.createV2Queue(ids, 12345);
  const second = v2.createV2Queue(ids, 67890, first.at(-1));
  assert.equal(first.length, ids.length);
  assert.equal(new Set(first).size, ids.length);
  assert.equal(second.length, ids.length);
  assert.notEqual(second[0], first.at(-1));
  assert.notDeepEqual(second, first);
});

test("mistakes remain in repair mode until two consecutive correct attempts", () => {
  const itemId = v2.V2_DRILLS[0].id;
  const failed = v2.recordV2Attempt(v2.EMPTY_V2_PROGRESS, itemId, false, "2026-08-23T10:00:00.000Z");
  assert.deepEqual(v2.v2WeakItemIds(failed), [itemId]);

  const oneRepair = v2.recordV2Attempt(failed, itemId, true, "2026-08-23T10:01:00.000Z");
  assert.deepEqual(v2.v2WeakItemIds(oneRepair), [itemId]);

  const repaired = v2.recordV2Attempt(oneRepair, itemId, true, "2026-08-23T10:02:00.000Z");
  assert.deepEqual(v2.v2WeakItemIds(repaired), []);
});
