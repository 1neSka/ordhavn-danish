import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/dialogue-game.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/dialogue-game.module.css", import.meta.url), "utf8");
const hub = await readFile(new URL("../app/scenario-games.tsx", import.meta.url), "utf8");

test("Mellem linjerne uses the redesigned campaign engine", () => {
  assert.match(hub, /import DialogueGame from "\.\/dialogue-game"/u);
  assert.match(hub, /onEvaluateTurn=\{evaluateDialogueTurn\}/u);
  assert.doesNotMatch(hub, /function DialogueGame\(/u);
});

test("the UI requires a dossier and records named endings", () => {
  assert.match(source, /phase === "briefing"/u);
  assert.match(source, /Start samtalen/u);
  assert.match(source, /character\.case\.objective\.role/u);
  assert.match(source, /character\.case\.objective\.assignment/u);
  assert.match(source, /character\.case\.objective\.constraints\.map/u);
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
  assert.match(source, /knownChoices/u);
  assert.match(source, /knownAiRoutes/u);
  assert.match(source, /knownRouteIds\.has/u);
  assert.match(source, /"Låst"/u);
  assert.match(source, /"\?\?\?"/u);
});

test("the branch map renders the authored graph instead of a flat card grid", () => {
  assert.match(source, /function buildBranchGraph/u);
  assert.match(source, /sourceKey: `scene:/u);
  assert.match(source, /targetKey/u);
  assert.match(source, /graph\.edges\.map/u);
  assert.match(source, /styles\.edgeLead/u);
  assert.match(source, /styles\.edgeDrop/u);
  assert.match(source, /styles\.edgeTail/u);
  assert.match(source, /styles\.edgeArrow/u);
  assert.match(styles, /\.graphEdgeKnown/u);
  assert.match(styles, /\.graphEdgeUnknown/u);
});

test("the graph distinguishes current, visited, ending and unknown nodes", () => {
  assert.match(source, /styles\.branchNodeCurrent/u);
  assert.match(source, /styles\.branchNodeSeen/u);
  assert.match(source, /styles\.branchNodeUnknown/u);
  assert.match(source, /styles\.branchEndingNode/u);
  assert.match(source, /currentEndingId \? `ending:/u);
  assert.match(styles, /\.currentPulse/u);
  assert.match(styles, /\.branchNodeUnknown[^}]*border-style:\s*dashed/su);
});

test("the graph viewport supports horizontal exploration on narrow screens", () => {
  assert.match(styles, /\.branchScroller[^}]*overflow:\s*auto/su);
  assert.match(styles, /overscroll-behavior:\s*contain/u);
  assert.match(styles, /scrollbar-color/u);
  assert.match(source, /Træk vandret for at følge forløbet/u);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/u);
});

test("ELI-9 free text uses Gemini routing with a local fallback", () => {
  assert.match(source, /<textarea/u);
  assert.match(source, /onEvaluateTurn/u);
  assert.match(source, /evaluateDialogueTurnOffline/u);
  assert.match(source, /generatedBeat/u);
  assert.match(source, /freeTextTurns/u);
  assert.match(source, /aiRouteIds/u);
});
