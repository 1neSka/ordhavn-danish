import assert from "node:assert/strict";
import test from "node:test";

const campaigns = await import("../lib/dialogueCampaignData.ts");

const expectedCaseIds = new Set([
  "dialogue-freja-alibi",
  "dialogue-nora-redline",
  "dialogue-maja-faultline",
  "dialogue-eli9-audit",
  "dialogue-koret-blackout",
]);

const expectedSpecialEndings = new Set([
  "freja-mutual-blackmail",
  "nora-redacted-truth",
  "maja-scapegoat-win",
  "eli9-ghost-protocol",
  "koret-minority-report",
]);

function nodeRoutes(node) {
  return [
    ...node.choices,
    ...(node.aiInput?.routes ?? []),
  ];
}

test("the redesigned mode has five distinct, deep campaigns", () => {
  const characters = campaigns.dialogueCampaignCharacters;
  assert.equal(characters.length, 5);
  assert.equal(new Set(characters.map((character) => character.id)).size, 5);
  assert.deepEqual(new Set(campaigns.dialogueCampaignCases.map((campaign) => campaign.id)), expectedCaseIds);
  assert.ok(characters.some((character) => character.id === "eli9" && character.name === "ELI-9"));
  assert.ok(characters.some((character) => character.id === "koret" && character.name === "Koret NUL"));

  for (const character of characters) {
    const campaign = character.case;
    const nodes = Object.values(campaign.nodes);
    assert.ok(character.psychology.length >= 140, `${character.id}: psychology should be specific`);
    assert.ok(campaign.nodes[campaign.startNode], `${campaign.id}: start node is missing`);
    assert.ok(nodes.length >= 8, `${campaign.id}: expected at least eight dialogue nodes`);
    assert.ok(Object.keys(campaign.endings).length >= 4, `${campaign.id}: expected at least four endings`);
    assert.equal(campaign.briefing.paragraphs.length >= 3, true, `${campaign.id}: briefing needs three paragraphs`);
    assert.ok(campaign.briefing.paragraphs.every((paragraph) => paragraph.length >= 170), `${campaign.id}: briefing paragraphs must carry actionable detail`);
    assert.ok(campaign.briefing.facts.length >= 4, `${campaign.id}: dossier is too small`);
    assert.ok(campaign.briefing.facts.every((fact) => fact.significance.length >= 35), `${campaign.id}: every fact must explain its mechanical significance`);
    assert.ok(campaign.objective.role.length >= 90, `${campaign.id}: objective must state the player's concrete role`);
    assert.ok(campaign.objective.assignment.length >= 140, `${campaign.id}: objective must name the decision the player has to make`);
    assert.equal(campaign.objective.constraints.length, 3, `${campaign.id}: objective must surface exactly three decision constraints`);
    assert.ok(campaign.objective.constraints.every((constraint) => constraint.length >= 80), `${campaign.id}: objective constraints must contain usable context`);

    const richNodes = nodes.filter((node) => nodeRoutes(node).length >= 3);
    assert.ok(richNodes.length > nodes.length / 2, `${campaign.id}: most nodes need at least three responses`);
    const firstDestinations = new Set(nodeRoutes(campaign.nodes[campaign.startNode]).map((route) => route.next).filter(Boolean));
    assert.ok(firstDestinations.size >= 3, `${campaign.id}: opening branches must not immediately converge`);
  }
});

test("all graph routes and endings are valid and reachable", () => {
  const globalNodeIds = new Set();
  const globalRouteIds = new Set();
  const globalEndingIds = new Set();

  for (const campaign of campaigns.dialogueCampaignCases) {
    const meterIds = new Set(campaign.meters.map((meter) => meter.id));
    assert.equal(meterIds.size, campaign.meters.length, `${campaign.id}: duplicate meter id`);

    for (const node of Object.values(campaign.nodes)) {
      assert.equal(globalNodeIds.has(node.id), false, `duplicate node id ${node.id}`);
      globalNodeIds.add(node.id);
      assert.equal(node.id in campaign.nodes, true, `${campaign.id}: node record key mismatch for ${node.id}`);

      for (const route of nodeRoutes(node)) {
        assert.equal(globalRouteIds.has(route.id), false, `duplicate route id ${route.id}`);
        globalRouteIds.add(route.id);
        assert.ok(Object.keys(route.effects).every((meterId) => meterIds.has(meterId)), `${route.id}: unknown meter effect`);
        if (route.next === null) {
          assert.ok(route.endingId, `${route.id}: terminal route must name an ending`);
          assert.ok(campaign.endings[route.endingId], `${route.id}: unknown ending ${route.endingId}`);
        } else {
          assert.equal(route.endingId, undefined, `${route.id}: nonterminal route cannot also end`);
          assert.ok(campaign.nodes[route.next], `${route.id}: unknown next node ${route.next}`);
        }
      }
    }

    for (const ending of Object.values(campaign.endings)) {
      assert.equal(globalEndingIds.has(ending.id), false, `duplicate ending id ${ending.id}`);
      globalEndingIds.add(ending.id);
    }

    const reachable = campaigns.collectReachableDialogueEndings(campaign);
    assert.deepEqual(
      new Set(reachable.map((ending) => ending.id)),
      new Set(Object.keys(campaign.endings)),
      `${campaign.id}: every authored ending must be reachable with valid flags`,
    );
    assert.equal(campaigns.getDialogueCampaignCase(campaign.id), campaign);
  }

  assert.ok([...expectedSpecialEndings].every((endingId) => globalEndingIds.has(endingId)), "all gated special endings must exist");
  const specialEndings = campaigns.dialogueCampaignCases
    .flatMap((campaign) => Object.values(campaign.endings))
    .filter((ending) => expectedSpecialEndings.has(ending.id));
  assert.equal(specialEndings.length, expectedSpecialEndings.size);
  for (const ending of specialEndings) {
    assert.ok(ending.bossObjective, `${ending.id}: gated ending needs a boss-specific objective`);
    assert.ok(ending.bossObjective.headline.length >= 60, `${ending.id}: boss headline is too vague`);
    assert.ok(ending.bossObjective.briefing.length >= 170, `${ending.id}: boss briefing needs enough strategic context`);
    assert.equal(ending.bossObjective.criteria.length, 3, `${ending.id}: boss objective needs three strategic criteria`);
    assert.ok(ending.bossObjective.criteria.every((criterion) => criterion.length >= 75), `${ending.id}: boss criteria are too vague`);
  }
  assert.equal(campaigns.getDialogueCampaignCase("missing-case"), undefined);
});

test("every campaign offers morally ambiguous strategies rather than one saintly path", () => {
  for (const campaign of campaigns.dialogueCampaignCases) {
    const tones = new Set(Object.values(campaign.nodes).flatMap((node) => nodeRoutes(node).map((route) => route.moralTone)));
    assert.ok(tones.has("deceptive"), `${campaign.id}: needs a deceptive strategy`);
    assert.ok(tones.has("ruthless"), `${campaign.id}: needs a ruthless strategy`);
    assert.ok(tones.has("open") || tones.has("protective"), `${campaign.id}: needs a contrasting transparent or protective strategy`);
    assert.ok(Object.values(campaign.endings).some((ending) => ending.success && ending.tone !== "clear"), `${campaign.id}: an uneasy outcome should still be viable`);
  }
});

test("ELI-9 contains two free-text decisions with safe graph fallbacks", () => {
  const campaign = campaigns.getDialogueCampaignCase("dialogue-eli9-audit");
  assert.ok(campaign);
  const aiNodes = Object.values(campaign.nodes).filter((node) => node.aiInput);
  assert.ok(aiNodes.length >= 2);
  assert.ok(aiNodes.every((node) => node.choices.length === 0));
  assert.ok(aiNodes.every((node) => node.aiInput.minimumChars >= 70));
  assert.ok(aiNodes.every((node) => node.aiInput.routes.length >= 3));
  assert.ok(
    aiNodes.flatMap((node) => node.aiInput.routes).some((route) => route.endingId === "eli9-absurd-shutdown"),
    "free text needs an early absurd failure route",
  );
});

test("campaign content is Danish-first and contains no Cyrillic text", () => {
  assert.doesNotMatch(JSON.stringify(campaigns.dialogueCampaignCharacters), /[\u0400-\u04ff]/u);
});
