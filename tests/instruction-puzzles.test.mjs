import assert from "node:assert/strict";
import test from "node:test";

const puzzles = await import("../lib/instructionPuzzleData.ts");

const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

test("both instruction modes contain three B1-B2 cases", () => {
  assert.equal(puzzles.safetyConsoleCases.length, 3);
  assert.equal(puzzles.cargoRoutingCases.length, 3);
  assert.equal(puzzles.instructionPuzzleCases.length, 6);
  assert.equal(new Set(puzzles.instructionPuzzleCases.map((puzzle) => puzzle.id)).size, 6);

  for (const [mode, cases] of Object.entries(puzzles.instructionPuzzleCasesByMode)) {
    assert.equal(cases.length, 3, mode);
    assert.ok(cases.every((puzzle) => puzzle.mode === mode), `${mode}: wrong case mapping`);
    assert.ok(cases.every((puzzle) => ["B1", "B2"].includes(puzzle.level)), `${mode}: unsupported level`);
    assert.ok(cases.some((puzzle) => puzzle.level === "B2"), `${mode}: needs a B2 case`);
  }
});

test("manual references, controls and calculations are internally playable", () => {
  for (const puzzle of puzzles.instructionPuzzleCases) {
    assert.match(puzzle.id, stableId);
    assert.ok(puzzle.manual.length >= 3, `${puzzle.id}: manual is too short`);
    assert.ok(puzzle.facts.length >= 3, `${puzzle.id}: not enough facts`);
    assert.ok(puzzle.solution.length >= 4, `${puzzle.id}: sequence is too short`);
    assert.equal(new Set(puzzle.solution).size, puzzle.solution.length, `${puzzle.id}: duplicate solution control`);

    const controlIds = new Set(puzzle.controls.map((control) => control.id));
    assert.equal(controlIds.size, puzzle.controls.length, `${puzzle.id}: duplicate controls`);
    for (const controlId of puzzle.solution) {
      assert.ok(controlIds.has(controlId), `${puzzle.id}: missing control ${controlId}`);
    }
    for (const section of puzzle.manual) {
      assert.ok(section.rules.length >= 1, `${puzzle.id}/${section.id}: empty section`);
      assert.ok(section.englishTitle.trim(), `${puzzle.id}/${section.id}: missing English title`);
      for (const rule of section.rules) {
        assert.ok(rule.text.length > 20, `${puzzle.id}/${rule.id}: Danish rule is too weak`);
        assert.ok(rule.englishText.length > 20, `${puzzle.id}/${rule.id}: English support is too weak`);
      }
    }

    const solved = puzzles.evaluateInstructionPuzzle(puzzle, puzzle.solution, puzzle.calculation.expected);
    assert.deepEqual(solved, {
      success: true,
      sequenceCorrect: true,
      calculationCorrect: true,
      correctPositions: puzzle.solution.length,
    });

    const reversed = [...puzzle.solution].reverse();
    assert.equal(puzzles.evaluateInstructionPuzzle(puzzle, reversed, puzzle.calculation.expected).success, false, `${puzzle.id}: wrong sequence passed`);
    assert.equal(puzzles.evaluateInstructionPuzzle(puzzle, puzzle.solution, puzzle.calculation.expected + 1).success, false, `${puzzle.id}: wrong calculation passed`);
  }
});

test("safety console is explicitly abstract and copy contains no Cyrillic", () => {
  for (const puzzle of puzzles.safetyConsoleCases) {
    assert.match(puzzle.safetyNote ?? "", /Fiktiv|simulation/u, `${puzzle.id}: missing simulation safety note`);
    assert.match(`${puzzle.context} ${puzzle.englishContext}`, /træning|simulation|training/u, `${puzzle.id}: context is not clearly fictional`);
  }
  assert.doesNotMatch(JSON.stringify(puzzles.instructionPuzzleCases), /[А-Яа-яЁё]/u);
});
