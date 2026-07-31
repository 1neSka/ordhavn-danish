import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/dialogue-game.tsx", import.meta.url), "utf8");
const hub = await readFile(new URL("../app/scenario-games.tsx", import.meta.url), "utf8");

test("Mellem linjerne uses the redesigned campaign engine", () => {
  assert.match(hub, /import DialogueGame from "\.\/dialogue-game"/u);
  assert.match(hub, /onEvaluateTurn=\{evaluateDialogueTurn\}/u);
  assert.doesNotMatch(hub, /function DialogueGame\(/u);
});

test("the UI requires a dossier and records named endings", () => {
  assert.match(source, /phase === "briefing"/u);
  assert.match(source, /Start samtalen/u);
  assert.match(source, /endingId,/u);
  assert.match(source, /udfald opdaget/u);
  assert.match(source, /Dine valg, uden facitstempel/u);
});

test("a directly launched boss initializes its first scene before the dossier starts", () => {
  assert.match(source, /useState\(\(\) => directCharacter\?\.case\.startNode \?\? ""\)/u);
  assert.match(source, /directCharacter \? \[directCharacter\.case\.startNode\] : \[\]/u);
  assert.match(source, /if \(!nodeId \|\| !character\.case\.nodes\[nodeId\]\) resetRunState\(character\)/u);
});

test("the branch map hides unseen content and reveals only played routes", () => {
  assert.match(source, /knownNodes\.has/u);
  assert.match(source, /knownChoices\.has/u);
  assert.match(source, /knownAiRoutes\.has/u);
  assert.match(source, /Uopdaget/u);
  assert.match(source, /"\?\?\?"/u);
});

test("ELI-9 free text uses Gemini routing with a local fallback", () => {
  assert.match(source, /<textarea/u);
  assert.match(source, /onEvaluateTurn/u);
  assert.match(source, /evaluateDialogueTurnOffline/u);
  assert.match(source, /generatedBeat/u);
  assert.match(source, /freeTextTurns/u);
  assert.match(source, /aiRouteIds/u);
});
