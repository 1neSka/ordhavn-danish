import type {
  ArchiveContradiction,
  ArchiveDatum,
  ArchiveDocument,
  ArchiveEntryKind,
  ArchiveEvidence,
  ArchivePerson,
  ArchiveTimelineEvent,
  DetectiveCase,
} from "./detectiveScenarioData.ts";

export interface DetectiveSelection {
  suspectId: string;
  evidenceIds: readonly string[];
}

export interface DetectiveEvaluation {
  success: boolean;
  score: number;
  correctSuspect: boolean;
  selectedEvidenceIds: string[];
  relevantEvidenceIds: string[];
  irrelevantEvidenceIds: string[];
  exoneratingEvidenceIds: string[];
  matchedRequiredEvidenceIds: string[];
  provenContradictionIds: string[];
  evidenceCoverage: number;
  verdict: "opklaret" | "stærk hypotese" | "utilstrækkeligt belæg" | "modsagt af arkivet";
  feedback: string;
}

export interface ArchiveEntryMap {
  person: ArchivePerson;
  timeline: ArchiveTimelineEvent;
  document: ArchiveDocument;
  datum: ArchiveDatum;
  evidence: ArchiveEvidence;
}

export interface EvidenceGraphNode {
  id: string;
  kind: ArchiveEntryKind | "contradiction";
  label: string;
}

export interface EvidenceGraphEdge {
  from: string;
  to: string;
  relation: "supports" | "implicates" | "exonerates" | "contradicts";
}

const roundScore = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

const uniqueKnownEvidenceIds = (detectiveCase: DetectiveCase, evidenceIds: readonly string[]) => {
  const known = new Set(detectiveCase.evidence.map((evidence) => evidence.id));
  return [...new Set(evidenceIds)].filter((id) => known.has(id));
};

export function getArchiveEntry<K extends ArchiveEntryKind>(
  detectiveCase: DetectiveCase,
  kind: K,
  id: string,
): ArchiveEntryMap[K] | undefined {
  const entries: { [P in ArchiveEntryKind]: readonly ArchiveEntryMap[P][] } = {
    person: detectiveCase.people,
    timeline: detectiveCase.timeline,
    document: detectiveCase.documents,
    datum: detectiveCase.data,
    evidence: detectiveCase.evidence,
  };
  return entries[kind].find((entry) => entry.id === id);
}

export function getEvidenceForPerson(detectiveCase: DetectiveCase, personId: string) {
  return detectiveCase.evidence.filter(
    (evidence) => evidence.implicates.includes(personId) || evidence.exonerates.includes(personId),
  );
}

export function getProvenContradictions(
  detectiveCase: DetectiveCase,
  evidenceIds: readonly string[],
): ArchiveContradiction[] {
  const selected = new Set(uniqueKnownEvidenceIds(detectiveCase, evidenceIds));
  return detectiveCase.contradictions.filter(
    (contradiction) => selected.has(contradiction.leftEvidenceId) && selected.has(contradiction.rightEvidenceId),
  );
}

export function evaluateDetectiveSelection(
  detectiveCase: DetectiveCase,
  selection: DetectiveSelection,
): DetectiveEvaluation {
  const selectedEvidenceIds = uniqueKnownEvidenceIds(detectiveCase, selection.evidenceIds);
  const selectedEvidence = selectedEvidenceIds
    .map((id) => detectiveCase.evidence.find((evidence) => evidence.id === id))
    .filter((evidence): evidence is ArchiveEvidence => Boolean(evidence));
  const correctSuspect = selection.suspectId === detectiveCase.culpritId;
  const relevantEvidenceIds = selectedEvidence
    .filter((evidence) => evidence.implicates.includes(selection.suspectId))
    .map((evidence) => evidence.id);
  const exoneratingEvidenceIds = selectedEvidence
    .filter((evidence) => evidence.exonerates.includes(selection.suspectId))
    .map((evidence) => evidence.id);
  const irrelevantEvidenceIds = selectedEvidence
    .filter((evidence) => (
      !evidence.implicates.includes(selection.suspectId)
      && !evidence.exonerates.includes(selection.suspectId)
    ))
    .map((evidence) => evidence.id);
  const required = new Set(detectiveCase.requiredEvidenceIds);
  const matchedRequiredEvidenceIds = selectedEvidenceIds.filter((id) => required.has(id));
  const provenContradictionIds = getProvenContradictions(detectiveCase, selectedEvidenceIds).map(({ id }) => id);
  const evidenceCoverage = matchedRequiredEvidenceIds.length / detectiveCase.requiredEvidenceIds.length;
  const relevance = selectedEvidenceIds.length === 0 ? 0 : relevantEvidenceIds.length / selectedEvidenceIds.length;
  const contradictionCoverage = detectiveCase.contradictions.length === 0
    ? 1
    : Math.min(1, provenContradictionIds.length / Math.min(2, detectiveCase.contradictions.length));
  const exonerationPenalty = Math.min(0.24, exoneratingEvidenceIds.length * 0.08);
  const score = roundScore(
    (correctSuspect ? 0.4 : 0)
    + evidenceCoverage * 0.35
    + relevance * 0.15
    + contradictionCoverage * 0.1
    - exonerationPenalty,
  );
  const enoughRequiredEvidence = matchedRequiredEvidenceIds.length >= detectiveCase.minimumEvidence;
  const success = correctSuspect && enoughRequiredEvidence && exoneratingEvidenceIds.length === 0;

  let verdict: DetectiveEvaluation["verdict"];
  let feedback: string;
  if (success) {
    verdict = "opklaret";
    feedback = provenContradictionIds.length > 0
      ? "Konklusionen forbinder den rette person med de nødvendige spor og forklarer mindst én modstrid."
      : "Konklusionen forbinder den rette person med de nødvendige spor. En dokumenteret modstrid kan gøre argumentet endnu skarpere.";
  } else if (exoneratingEvidenceIds.length > 0) {
    verdict = "modsagt af arkivet";
    feedback = "Mindst ét valgt spor taler imod den mistænkte. Kontrollér forskellen mellem adgang, motiv og dokumenteret handling.";
  } else if (correctSuspect) {
    verdict = "stærk hypotese";
    feedback = `Mistanken peger rigtigt, men arkivet kræver mindst ${detectiveCase.minimumEvidence} centrale beviser. Du har valgt ${matchedRequiredEvidenceIds.length}.`;
  } else {
    verdict = "utilstrækkeligt belæg";
    feedback = "De valgte spor danner ikke en tilstrækkelig kæde til den valgte person. Undersøg tidslinje, adgang og uafhængige kilder igen.";
  }

  return {
    success,
    score,
    correctSuspect,
    selectedEvidenceIds,
    relevantEvidenceIds,
    irrelevantEvidenceIds,
    exoneratingEvidenceIds,
    matchedRequiredEvidenceIds,
    provenContradictionIds,
    evidenceCoverage: roundScore(evidenceCoverage),
    verdict,
    feedback,
  };
}

export function createCanonicalDetectiveSelection(detectiveCase: DetectiveCase): DetectiveSelection {
  return {
    suspectId: detectiveCase.culpritId,
    evidenceIds: [...detectiveCase.requiredEvidenceIds],
  };
}

export function buildEvidenceGraph(detectiveCase: DetectiveCase) {
  const nodes: EvidenceGraphNode[] = [
    ...detectiveCase.people.map((person) => ({ id: person.id, kind: "person" as const, label: person.name })),
    ...detectiveCase.timeline.map((event) => ({ id: event.id, kind: "timeline" as const, label: `${event.time} · ${event.title}` })),
    ...detectiveCase.documents.map((document) => ({ id: document.id, kind: "document" as const, label: document.title })),
    ...detectiveCase.data.map((datum) => ({ id: datum.id, kind: "datum" as const, label: datum.label })),
    ...detectiveCase.evidence.map((evidence) => ({ id: evidence.id, kind: "evidence" as const, label: evidence.title })),
    ...detectiveCase.contradictions.map((contradiction) => ({ id: contradiction.id, kind: "contradiction" as const, label: contradiction.title })),
  ];
  const edges: EvidenceGraphEdge[] = [];
  for (const document of detectiveCase.documents) {
    for (const evidenceId of document.evidenceIds) edges.push({ from: document.id, to: evidenceId, relation: "supports" });
  }
  for (const datum of detectiveCase.data) {
    for (const evidenceId of datum.evidenceIds) edges.push({ from: datum.id, to: evidenceId, relation: "supports" });
  }
  for (const evidence of detectiveCase.evidence) {
    for (const personId of evidence.implicates) edges.push({ from: evidence.id, to: personId, relation: "implicates" });
    for (const personId of evidence.exonerates) edges.push({ from: evidence.id, to: personId, relation: "exonerates" });
  }
  for (const contradiction of detectiveCase.contradictions) {
    edges.push({ from: contradiction.leftEvidenceId, to: contradiction.rightEvidenceId, relation: "contradicts" });
  }
  return { nodes, edges };
}

export function validateDetectiveCase(detectiveCase: DetectiveCase): string[] {
  const issues: string[] = [];
  const groups = [
    ["person", detectiveCase.people],
    ["timeline", detectiveCase.timeline],
    ["document", detectiveCase.documents],
    ["datum", detectiveCase.data],
    ["evidence", detectiveCase.evidence],
    ["contradiction", detectiveCase.contradictions],
  ] as const;
  const allIds = new Set<string>();
  for (const [kind, entries] of groups) {
    for (const entry of entries) {
      if (allIds.has(entry.id)) issues.push(`duplicate ${kind} id: ${entry.id}`);
      allIds.add(entry.id);
    }
  }
  const personIds = new Set(detectiveCase.people.map(({ id }) => id));
  const timelineIds = new Set(detectiveCase.timeline.map(({ id }) => id));
  const documentIds = new Set(detectiveCase.documents.map(({ id }) => id));
  const datumIds = new Set(detectiveCase.data.map(({ id }) => id));
  const sourceIds = new Set([...timelineIds, ...documentIds, ...datumIds]);
  const evidenceIds = new Set(detectiveCase.evidence.map(({ id }) => id));
  const checkPeople = (owner: string, ids: readonly string[]) => {
    for (const id of ids) if (!personIds.has(id)) issues.push(`${owner}: unknown person ${id}`);
  };
  const checkSources = (owner: string, ids: readonly string[]) => {
    for (const id of ids) if (!sourceIds.has(id)) issues.push(`${owner}: unknown source ${id}`);
  };
  const checkEvidence = (owner: string, ids: readonly string[]) => {
    for (const id of ids) if (!evidenceIds.has(id)) issues.push(`${owner}: unknown evidence ${id}`);
  };

  if (!personIds.has(detectiveCase.culpritId)) issues.push(`unknown culprit: ${detectiveCase.culpritId}`);
  for (const event of detectiveCase.timeline) {
    checkPeople(event.id, event.personIds);
    checkSources(event.id, event.sourceIds);
  }
  for (const document of detectiveCase.documents) {
    checkPeople(document.id, document.personIds);
    checkEvidence(document.id, document.evidenceIds);
  }
  for (const datum of detectiveCase.data) {
    checkPeople(datum.id, datum.personIds);
    checkSources(datum.id, datum.sourceIds);
    checkEvidence(datum.id, datum.evidenceIds);
  }
  for (const evidence of detectiveCase.evidence) {
    checkPeople(evidence.id, [...evidence.implicates, ...evidence.exonerates]);
    checkSources(evidence.id, evidence.sourceIds);
  }
  for (const contradiction of detectiveCase.contradictions) {
    checkEvidence(contradiction.id, [contradiction.leftEvidenceId, contradiction.rightEvidenceId]);
    checkPeople(contradiction.id, contradiction.personIds);
  }
  checkEvidence("requiredEvidenceIds", detectiveCase.requiredEvidenceIds);
  for (const id of detectiveCase.requiredEvidenceIds) {
    const evidence = detectiveCase.evidence.find((entry) => entry.id === id);
    if (evidence && !evidence.implicates.includes(detectiveCase.culpritId)) {
      issues.push(`required evidence ${id} does not implicate culprit`);
    }
  }
  if (detectiveCase.minimumEvidence < 1 || detectiveCase.minimumEvidence > detectiveCase.requiredEvidenceIds.length) {
    issues.push("minimumEvidence must fit requiredEvidenceIds");
  }
  return issues;
}
