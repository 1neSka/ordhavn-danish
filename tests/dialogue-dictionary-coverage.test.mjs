import assert from "node:assert/strict";
import test from "node:test";

const dictionary = await import("../lib/dictionaryData.ts");
const { dialogueCampaignCharacters } = await import("../lib/dialogueCampaignData.ts");

const properNames = new Set([
  "birk", "eli", "eli-9", "elias", "freja", "frejas", "havn", "havns", "holm",
  "kajhotellet", "kasper", "kaspers", "koret", "københavn", "lavkajen", "lavkajens",
  "lind", "linds", "lund", "maja", "møllegrund", "nora", "noras", "nordkajens",
  "vestlås", "voss",
]);

const spelledNumbers = new Set(["toogfyrre"]);

function campaignTexts() {
  const texts = [];
  const push = (...values) => texts.push(...values.filter((value) => typeof value === "string"));

  for (const character of dialogueCampaignCharacters) {
    const campaign = character.case;
    push(
      character.archetype,
      character.psychology,
      campaign.title,
      campaign.location,
      campaign.premise,
      campaign.objective.role,
      campaign.objective.assignment,
      ...campaign.objective.constraints,
      campaign.briefing.lead,
      ...campaign.briefing.paragraphs,
      campaign.briefing.warning,
    );
    for (const fact of campaign.briefing.facts) push(fact.label, fact.value, fact.significance);
    for (const meter of campaign.meters) push(meter.label);
    for (const node of Object.values(campaign.nodes)) {
      push(node.line, node.stage);
      for (const choice of node.choices) push(choice.text, choice.insight, choice.principle);
    }
    for (const ending of Object.values(campaign.endings)) {
      push(ending.title, ending.kicker, ending.description, ending.epilogue);
      if (ending.bossObjective) push(ending.bossObjective.headline, ending.bossObjective.briefing, ...ending.bossObjective.criteria);
    }
  }
  return texts;
}

function uniqueDanishVocabulary(texts) {
  const vocabulary = new Set();
  for (const text of texts) {
    const tokens = text.normalize("NFC").match(/\p{Script=Latin}+(?:[-‐‑’']\p{Script=Latin}+)*/giu) ?? [];
    for (const token of tokens) {
      const normalized = dictionary.normalizeSelectedDanishWord(token);
      if (!normalized || normalized.length === 1 || properNames.has(normalized) || spelledNumbers.has(normalized)) continue;
      if (dictionary.lookupDanishWord(normalized)?.entry.partOfSpeech === "number") continue;
      vocabulary.add(normalized);
    }
  }
  return vocabulary;
}

test("local dictionary covers at least ninety percent of unique Mellem linjerne vocabulary", () => {
  const vocabulary = uniqueDanishVocabulary(campaignTexts());
  const covered = [...vocabulary].filter((token) => dictionary.lookupDanishWord(token));
  const coverage = covered.length / vocabulary.size;

  assert.ok(vocabulary.size >= 2_000, `campaign corpus unexpectedly small: ${vocabulary.size}`);
  assert.ok(
    coverage >= 0.9,
    `dialogue dictionary type coverage ${(coverage * 100).toFixed(2)}% (${covered.length}/${vocabulary.size})`,
  );
});

test("campaign-specific dictionary resolves representative B1-B2 forms", () => {
  const expected = {
    adgangsloggen: "adgangslog",
    afstemningstallene: "afstemningstal",
    blindpassagerens: "blindpassager",
    dokumenteres: "dokumentere",
    efterprøves: "efterprøve",
    kompromitteret: "kompromitteret",
    mindretalsrapporten: "mindretalsrapport",
    uafhængige: "uafhængig",
    versionsloggen: "versionslog",
  };
  for (const [form, headword] of Object.entries(expected)) {
    assert.equal(dictionary.lookupDanishWord(form)?.entry.headword, headword, form);
  }
});

test("campaign dictionary and learner-facing dialogue contain no Cyrillic", () => {
  assert.doesNotMatch(JSON.stringify(dictionary.dialogueCampaignDictionaryEntries), /[\u0400-\u04ff]/u);
  assert.doesNotMatch(campaignTexts().join("\n"), /[\u0400-\u04ff]/u);
});
