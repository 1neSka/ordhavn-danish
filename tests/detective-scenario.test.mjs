import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = await import("../lib/detectiveScenarioData.ts");
const engine = await import("../lib/detectiveEngine.ts");

const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

test("detective archive maps six serious cases to path levels 15-20", () => {
  assert.equal(data.detectiveCases.length, 6);
  assert.deepEqual(data.detectiveCases.map(({ pathLevel }) => pathLevel), [15, 16, 17, 18, 19, 20]);
  assert.deepEqual(data.detectiveCases.map(({ level }) => level), ["A2+", "B1", "B2", "A2+", "B1+", "B2"]);
  assert.deepEqual(
    new Set(data.detectiveCases.map(({ crime }) => crime)),
    new Set(["theft", "cyberabuse", "fraud", "arson", "medical-diversion", "murder"]),
  );
  assert.equal(new Set(data.detectiveCases.map(({ id }) => id)).size, 6);
  for (const detectiveCase of data.detectiveCases) {
    assert.match(detectiveCase.id, stableId);
    assert.equal(data.detectiveCaseRegistry[detectiveCase.id], detectiveCase);
    assert.ok(detectiveCase.objective.length >= 100, `${detectiveCase.id}: objective is too vague`);
    assert.ok(detectiveCase.victimCare.length >= 90, `${detectiveCase.id}: victim framing is too thin`);
  }
});

test("every case is a freely navigable archive with people, time, documents and data", () => {
  for (const detectiveCase of data.detectiveCases) {
    assert.ok(detectiveCase.people.length >= 4, `${detectiveCase.id}: too few people`);
    assert.ok(detectiveCase.timeline.length >= 5, `${detectiveCase.id}: too few timeline events`);
    assert.ok(detectiveCase.documents.length >= 4, `${detectiveCase.id}: too few documents`);
    assert.ok(detectiveCase.data.length >= 3, `${detectiveCase.id}: too little structured data`);
    assert.ok(detectiveCase.evidence.length >= 5, `${detectiveCase.id}: too few evidence links`);
    assert.ok(detectiveCase.contradictions.length >= 2, `${detectiveCase.id}: too few contradictions`);
    assert.equal(engine.validateDetectiveCase(detectiveCase).length, 0, engine.validateDetectiveCase(detectiveCase).join("\n"));

    const firstPerson = detectiveCase.people[0];
    const firstDocument = detectiveCase.documents[0];
    assert.equal(engine.getArchiveEntry(detectiveCase, "person", firstPerson.id), firstPerson);
    assert.equal(engine.getArchiveEntry(detectiveCase, "document", firstDocument.id), firstDocument);
    assert.equal(engine.getArchiveEntry(detectiveCase, "evidence", "does-not-exist"), undefined);
  }
});

test("canonical accusations succeed deterministically while unsupported accusations fail", () => {
  for (const detectiveCase of data.detectiveCases) {
    const canonical = engine.createCanonicalDetectiveSelection(detectiveCase);
    const first = engine.evaluateDetectiveSelection(detectiveCase, canonical);
    const second = engine.evaluateDetectiveSelection(detectiveCase, canonical);
    assert.deepEqual(first, second);
    assert.equal(first.success, true, `${detectiveCase.id}: canonical solution failed`);
    assert.equal(first.correctSuspect, true);
    assert.equal(first.matchedRequiredEvidenceIds.length, detectiveCase.requiredEvidenceIds.length);
    assert.ok(first.score >= 0.85, `${detectiveCase.id}: canonical score ${first.score}`);

    const wrongPerson = detectiveCase.people.find(({ id }) => id !== detectiveCase.culpritId);
    assert.ok(wrongPerson);
    const wrong = engine.evaluateDetectiveSelection(detectiveCase, {
      suspectId: wrongPerson.id,
      evidenceIds: detectiveCase.requiredEvidenceIds,
    });
    assert.equal(wrong.success, false);
    assert.equal(wrong.correctSuspect, false);

    const guess = engine.evaluateDetectiveSelection(detectiveCase, {
      suspectId: detectiveCase.culpritId,
      evidenceIds: [],
    });
    assert.equal(guess.success, false);
    assert.equal(guess.verdict, "stærk hypotese");
  }
});

test("scoring ignores unknown and duplicate evidence, and exonerating evidence is costly", () => {
  let testedExonerationPenalties = 0;
  for (const detectiveCase of data.detectiveCases) {
    const canonical = engine.createCanonicalDetectiveSelection(detectiveCase);
    const clean = engine.evaluateDetectiveSelection(detectiveCase, canonical);
    const noisy = engine.evaluateDetectiveSelection(detectiveCase, {
      ...canonical,
      evidenceIds: [...canonical.evidenceIds, canonical.evidenceIds[0], "fabricated-evidence"],
    });
    assert.deepEqual(noisy, clean);

    for (const person of detectiveCase.people) {
      const implicating = detectiveCase.evidence.filter((evidence) => evidence.implicates.includes(person.id));
      const exonerating = detectiveCase.evidence.find((evidence) => evidence.exonerates.includes(person.id));
      if (implicating.length > 0 && exonerating) {
        const suspicion = engine.evaluateDetectiveSelection(detectiveCase, {
          suspectId: person.id,
          evidenceIds: implicating.map(({ id }) => id),
        });
        const contradicted = engine.evaluateDetectiveSelection(detectiveCase, {
          suspectId: person.id,
          evidenceIds: [...implicating.map(({ id }) => id), exonerating.id],
        });
        assert.ok(contradicted.score < suspicion.score);
        assert.deepEqual(contradicted.exoneratingEvidenceIds, [exonerating.id]);
        testedExonerationPenalties += 1;
        break;
      }
    }
  }
  assert.ok(testedExonerationPenalties >= 3);
});

test("contradictions are proven only when both linked evidence nodes are selected", () => {
  for (const detectiveCase of data.detectiveCases) {
    const contradiction = detectiveCase.contradictions[0];
    assert.deepEqual(engine.getProvenContradictions(detectiveCase, [contradiction.leftEvidenceId]), []);
    assert.deepEqual(
      engine.getProvenContradictions(detectiveCase, [contradiction.leftEvidenceId, contradiction.rightEvidenceId]),
      [contradiction],
    );
  }
});

test("evidence graph exposes source, suspicion, exoneration and contradiction edges", () => {
  for (const detectiveCase of data.detectiveCases) {
    const graph = engine.buildEvidenceGraph(detectiveCase);
    const nodeIds = new Set(graph.nodes.map(({ id }) => id));
    assert.equal(nodeIds.size, graph.nodes.length, `${detectiveCase.id}: duplicate graph node`);
    assert.ok(graph.edges.some(({ relation }) => relation === "supports"));
    assert.ok(graph.edges.some(({ relation }) => relation === "implicates"));
    assert.ok(graph.edges.some(({ relation }) => relation === "exonerates"));
    assert.ok(graph.edges.some(({ relation }) => relation === "contradicts"));
    for (const edge of graph.edges) {
      assert.ok(nodeIds.has(edge.from), `${detectiveCase.id}: missing edge source ${edge.from}`);
      assert.ok(nodeIds.has(edge.to), `${detectiveCase.id}: missing edge target ${edge.to}`);
    }
  }
});

test("detective archive is Danish-first, deterministic and contains no network-backed grading", async () => {
  const source = [
    await readFile(new URL("../lib/detectiveScenarioData.ts", import.meta.url), "utf8"),
    await readFile(new URL("../lib/detectiveEngine.ts", import.meta.url), "utf8"),
  ].join("\n");
  assert.doesNotMatch(source, /[\u0400-\u04ff]/u);
  assert.doesNotMatch(source, /\bfetch\s*\(|Gemini|apiKey|model:/u);
  assert.match(source, /æ|ø|å/u);
});
