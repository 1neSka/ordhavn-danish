import assert from "node:assert/strict";
import test from "node:test";

const continuation = await import("../lib/dialogueEpisodes.ts");

const expectedCaseIds = new Set([
  "dialogue-freja-boundaries",
  "dialogue-freja-weekend",
  "dialogue-maja-opening",
  "dialogue-maja-critique",
  "dialogue-nora-interview",
  "dialogue-nora-correction",
]);

function collectOutcomes(dialogue) {
  const outcomes = new Set();
  const visit = (nodeId, trust, tension, depth) => {
    assert.ok(depth <= 12, `${dialogue.id}: graph is unexpectedly deep or cyclic`);
    const node = dialogue.nodes[nodeId];
    assert.ok(node, `${dialogue.id}: missing node ${nodeId}`);
    for (const choice of node.choices) {
      const nextTrust = Math.max(0, Math.min(100, trust + choice.trust));
      const nextTension = Math.max(0, Math.min(100, tension + choice.tension));
      const danger = nextTension >= dialogue.dangerLimit;
      if (choice.next && !danger) visit(choice.next, nextTrust, nextTension, depth + 1);
      else outcomes.add(!danger && nextTrust >= dialogue.successTrust ? "success" : "failure");
    }
  };
  visit(dialogue.startNode, 50, 25, 0);
  return outcomes;
}

test("all six paid continuation IDs have playable dialogue data", () => {
  const episodes = continuation.dialogueContinuationEpisodes;
  assert.equal(episodes.length, 6);
  assert.deepEqual(new Set(episodes.map((episode) => episode.case.id)), expectedCaseIds);
  assert.equal(new Set(episodes.map((episode) => episode.case.id)).size, episodes.length);

  for (const episode of episodes) {
    const dialogue = episode.case;
    assert.ok(dialogue.nodes[dialogue.startNode], `${dialogue.id}: missing start node`);
    assert.ok(Object.keys(dialogue.nodes).length >= 3, `${dialogue.id}: needs at least three choice nodes`);
    for (const node of Object.values(dialogue.nodes)) {
      assert.ok(node.choices.length >= 2, `${dialogue.id}/${node.id}: needs meaningful alternatives`);
      for (const choice of node.choices) {
        assert.ok(choice.text.trim(), `${choice.id}: empty choice`);
        assert.ok(choice.insight.trim(), `${choice.id}: empty insight`);
        assert.ok(choice.principle.trim(), `${choice.id}: empty principle`);
        if (choice.next) assert.ok(dialogue.nodes[choice.next], `${choice.id}: missing branch ${choice.next}`);
      }
    }
    assert.deepEqual(collectOutcomes(dialogue), new Set(["success", "failure"]), `${dialogue.id}: both outcomes must be reachable`);
  }
});

test("continuation copy contains no Cyrillic text", () => {
  assert.doesNotMatch(JSON.stringify(continuation.dialogueContinuationEpisodes), /[\u0400-\u04ff]/u);
});
