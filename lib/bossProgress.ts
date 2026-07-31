import type { ScenarioBossGate } from "./harborData.ts";
import type { ScenarioRun } from "./scenarioData.ts";

function endingId(run: ScenarioRun) {
  return typeof run.metadata.endingId === "string" ? run.metadata.endingId : "";
}

export function getBossGateProgress(gate: ScenarioBossGate, runs: readonly ScenarioRun[]) {
  const matchingRuns = runs.filter((run) => gate.scenarioIds.includes(run.caseId));
  const metEndingRequirements = (gate.endingRequirements ?? []).filter((requirement) =>
    matchingRuns.some((run) => run.caseId === requirement.caseId && endingId(run) === requirement.endingId),
  );
  const completedScenarioIds = new Set(
    matchingRuns
      .filter((run) => run.success || (gate.endingRequirements ?? []).some((requirement) =>
        requirement.caseId === run.caseId && requirement.endingId === endingId(run)))
      .map((run) => run.caseId),
  );
  const unmetEndingRequirements = (gate.endingRequirements ?? []).filter((requirement) =>
    !metEndingRequirements.includes(requirement),
  );
  const cleared = completedScenarioIds.size >= gate.requiredCompletions && unmetEndingRequirements.length === 0;
  const nextScenarioIds = [
    ...unmetEndingRequirements.map((requirement) => requirement.caseId),
    ...gate.scenarioIds.filter((caseId) => !completedScenarioIds.has(caseId)),
    ...gate.scenarioIds,
  ].filter((caseId, index, values) => values.indexOf(caseId) === index);

  return {
    cleared,
    completed: Math.min(completedScenarioIds.size, gate.requiredCompletions),
    required: gate.requiredCompletions,
    endingsMet: metEndingRequirements.length,
    endingsRequired: gate.endingRequirements?.length ?? 0,
    unmetEndingRequirements,
    nextScenarioIds,
  };
}

