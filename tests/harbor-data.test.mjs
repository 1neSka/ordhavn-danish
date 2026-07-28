import assert from "node:assert/strict";
import test from "node:test";

const harbor = await import("../lib/harborData.ts");

const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allIds = [];

function recordId(id, context) {
  assert.match(id, stableId, `${context}: unstable id ${id}`);
  allIds.push(id);
}

test("harbor progression data has stable references and useful mechanics", () => {
  assert.equal(harbor.harborRanks.length, 8);
  assert.ok(harbor.harborBuildings.length >= 7);

  const rankIds = new Set(harbor.harborRanks.map((rank) => rank.id));
  const buildingIds = new Set(harbor.harborBuildings.map((building) => building.id));
  for (const rank of harbor.harborRanks) recordId(rank.id, "rank");

  for (const building of harbor.harborBuildings) {
    recordId(building.id, "building");
    assert.ok(building.cost.kr > 0, building.id);
    assert.ok(building.unlock.pathLevel >= 1 && building.unlock.pathLevel <= 10, building.id);
    assert.ok(rankIds.has(building.unlock.rank), `${building.id}: unknown rank`);
    if (building.unlock.prerequisiteBuildingId) {
      assert.ok(buildingIds.has(building.unlock.prerequisiteBuildingId), `${building.id}: unknown prerequisite`);
    }
    assert.ok(building.mechanic.effect.length > 20, `${building.id}: mechanic is only decorative`);
  }
});

test("characters persist relationships, inbox, contracts and paid episode chains", () => {
  assert.deepEqual(harbor.harborCharacters.map((character) => character.id).sort(), ["freja", "maja", "nora"]);
  const buildingIds = new Set(harbor.harborBuildings.map((building) => building.id));
  const rankIds = new Set(harbor.harborRanks.map((rank) => rank.id));

  for (const character of harbor.harborCharacters) {
    recordId(character.id, "character");
    assert.equal(character.relationship.min, 0);
    assert.equal(character.relationship.max, 5);
    assert.equal(character.relationship.startingLevel, 0);
    assert.equal(character.relationship.levelLabels.length, 6);
    assert.ok(buildingIds.has(character.homeBuildingId), `${character.id}: unknown home building`);
    assert.ok(character.inboxMessages.length >= 3, `${character.id}: needs inbox cadence`);
    assert.ok(character.contracts.length >= 2, `${character.id}: needs contracts`);
    assert.ok(character.episodes.length >= 3, `${character.id}: needs an episode arc`);
    assert.ok(character.episodes.some((episode) => episode.unlock.purchase), `${character.id}: needs a paid continuation`);

    const episodeIds = new Set(character.episodes.map((episode) => episode.id));
    for (const message of character.inboxMessages) {
      recordId(message.id, `${character.id} inbox`);
      assert.ok(message.unlock.relationship >= 0 && message.unlock.relationship <= 5, message.id);
      assert.ok(message.body.length > 15 && message.englishSupport.length > 15, message.id);
    }
    for (const contract of character.contracts) {
      recordId(contract.id, `${character.id} contract`);
      assert.ok(rankIds.has(contract.unlock.rank), contract.id);
      assert.ok(contract.reward.kr > 0 && contract.reward.firstTryRav === 1, contract.id);
    }
    for (const episode of character.episodes) {
      recordId(episode.id, `${character.id} episode`);
      assert.ok(rankIds.has(episode.unlock.rank), episode.id);
      if (episode.unlock.completedEpisodeId) {
        assert.ok(episodeIds.has(episode.unlock.completedEpisodeId), `${episode.id}: unknown previous episode`);
      }
      if (episode.unlock.purchase) {
        assert.ok(episode.unlock.purchaseId, `${episode.id}: paid episode needs purchase id`);
        assert.ok(episode.unlock.purchase.kr > 0, episode.id);
      }
    }
  }

  assert.ok(harbor.paidContinuationUnlocks.length >= 6);
  assert.equal(new Set(harbor.paidContinuationUnlocks.map((unlock) => unlock.id)).size, harbor.paidContinuationUnlocks.length);
});

test("A1-A2 harbor cases form playable branching graphs", () => {
  assert.ok(harbor.harborScenarioCases.length >= 2);
  assert.ok(harbor.harborScenarioCases.some((scenario) => scenario.level === "A1"));
  assert.ok(harbor.harborScenarioCases.some((scenario) => scenario.level === "A2"));

  for (const scenario of harbor.harborScenarioCases) {
    recordId(scenario.id, "harbor scenario");
    assert.ok(scenario.nodes[scenario.startNode], `${scenario.id}: missing start node`);
    assert.ok(scenario.retryCostKr > 0, `${scenario.id}: retry must have a cost`);
    assert.equal(scenario.firstTryReward.rav, 1, `${scenario.id}: first try should mint one rav`);
    assert.ok(Object.values(scenario.nodes).some((node) => node.terminal?.success), `${scenario.id}: no success ending`);
    assert.ok(Object.values(scenario.nodes).some((node) => node.terminal?.success === false), `${scenario.id}: no failure ending`);

    for (const node of Object.values(scenario.nodes)) {
      recordId(node.id, `${scenario.id} node`);
      if (node.type === "choice") {
        assert.ok(node.choices && node.choices.length >= 2, `${node.id}: choice needs branches`);
        for (const choice of node.choices) {
          recordId(choice.id, `${node.id} choice`);
          assert.ok(scenario.nodes[choice.next], `${choice.id}: missing next node ${choice.next}`);
          assert.ok(choice.feedback.length > 10, `${choice.id}: missing learning feedback`);
        }
      } else if (node.type === "terminal") {
        assert.ok(node.terminal, `${node.id}: terminal metadata missing`);
      }
    }
  }
});

test("boss gates are ordered and connect scenarios to the learning path", () => {
  const pathLevels = harbor.scenarioBossGates.map((gate) => gate.afterPathLevel);
  assert.deepEqual(pathLevels, [...pathLevels].sort((a, b) => a - b));
  assert.equal(new Set(pathLevels).size, pathLevels.length);
  for (const gate of harbor.scenarioBossGates) {
    recordId(gate.id, "boss gate");
    assert.ok(gate.scenarioIds.length >= gate.requiredCompletions, gate.id);
    assert.ok(gate.requiredCompletions > 0, gate.id);
    assert.ok(gate.reward.kr > 0, gate.id);
  }
});

test("user-facing harbor copy contains no Russian text", () => {
  const userFacingData = JSON.stringify(harbor.harborData);
  assert.doesNotMatch(userFacingData, /[\u0400-\u04FF]/u);
});

test.after(() => {
  assert.equal(new Set(allIds).size, allIds.length, "IDs must be globally unique within harbor data");
});
