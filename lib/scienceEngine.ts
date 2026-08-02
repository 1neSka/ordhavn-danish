import type {
  ScienceAnswerField,
  ScienceNumericAnswerField,
  ScienceScenarioCase,
  ScienceSelectionAnswerField,
  ScienceStage,
} from "./scienceScenarioData";

export type ScienceAnswerValue = number | string | readonly string[];
export type ScienceStageSubmission = Readonly<Record<string, ScienceAnswerValue>>;
export type ScienceScenarioSubmission = Readonly<Record<string, ScienceStageSubmission>>;

export interface ScienceFieldEvaluation {
  fieldId: string;
  kind: ScienceAnswerField["kind"];
  submitted: boolean;
  correct: boolean;
  score: number;
  parsedNumber?: number;
  delta?: number;
  tolerance?: number;
}

export interface ScienceStageEvaluation {
  stageId: string;
  locked: boolean;
  missingDependencies: string[];
  success: boolean;
  score: number;
  earnedWeight: number;
  totalWeight: number;
  fields: ScienceFieldEvaluation[];
}

export interface ScienceScenarioEvaluation {
  scenarioId: string;
  success: boolean;
  score: number;
  earnedWeight: number;
  totalWeight: number;
  completedStageIds: string[];
  nextStageId: string | null;
  stages: ScienceStageEvaluation[];
}

const normalizedId = (value: string) => value.trim();

const normalizedUnit = (value: string) => value
  .normalize("NFC")
  .toLocaleLowerCase("da-DK")
  .replace(/\s+/gu, "")
  .replace(/ohm/gu, "ω");

function parseDecimalToken(value: string) {
  let normalized = value.replace(/\s+/gu, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
      ? normalized.replace(/\./gu, "").replace(",", ".")
      : normalized.replace(/,/gu, "");
  } else if (/^[+-]?[1-9]\d{0,2}(?:\.\d{3})+$/u.test(normalized)) {
    // Danish grouping uses a point: "1.000 Ω" means one thousand ohms.
    normalized = normalized.replace(/\./gu, "");
  } else {
    normalized = normalized.replace(",", ".");
  }
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

/** Parses Danish decimal commas and optional declared units into the field's base unit. */
export function parseScienceNumber(value: ScienceAnswerValue | undefined, field: ScienceNumericAnswerField) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const match = value
    .trim()
    .replace(/−/gu, "-")
    .match(/^([+-]?(?:(?:\d[\d\s.,]*\d)|\d|[.,]\d+)(?:e[+-]?\d+)?)\s*(.*?)$/iu);
  if (!match) return null;
  const numeric = parseDecimalToken(match[1]);
  if (numeric === null) return null;
  const submittedUnit = normalizedUnit(match[2]);
  if (!submittedUnit) return numeric;
  const units = field.acceptedUnits ?? [{ unit: field.unit, factor: 1 }];
  const unit = units.find((candidate) => normalizedUnit(candidate.unit) === submittedUnit);
  return unit ? numeric * unit.factor : null;
}

export function resolveScienceTolerance(field: ScienceNumericAnswerField) {
  return Math.max(
    field.tolerance.absolute ?? 0,
    Math.abs(field.expected) * (field.tolerance.relative ?? 0),
  );
}

function evaluateSelection(field: ScienceSelectionAnswerField, submitted: readonly string[]) {
  const expected = field.expectedOptionIds;
  if (field.orderMatters) {
    const correctPositions = expected.reduce(
      (count, optionId, index) => count + (submitted[index] === optionId ? 1 : 0),
      0,
    );
    return {
      correct: submitted.length === expected.length && correctPositions === expected.length,
      score: correctPositions / Math.max(expected.length, submitted.length, 1),
    };
  }
  const expectedSet = new Set(expected);
  const submittedSet = new Set(submitted);
  const intersection = [...submittedSet].filter((optionId) => expectedSet.has(optionId)).length;
  const union = new Set([...expectedSet, ...submittedSet]).size;
  return {
    correct: submitted.length === expected.length
      && submittedSet.size === expectedSet.size
      && intersection === expectedSet.size,
    score: union ? intersection / union : 0,
  };
}

export function evaluateScienceField(
  field: ScienceAnswerField,
  value: ScienceAnswerValue | undefined,
): ScienceFieldEvaluation {
  if (field.kind === "number") {
    const parsedNumber = parseScienceNumber(value, field);
    const tolerance = resolveScienceTolerance(field);
    const delta = parsedNumber === null ? undefined : Math.abs(parsedNumber - field.expected);
    const correct = delta !== undefined && delta <= tolerance + Number.EPSILON;
    return {
      fieldId: field.id,
      kind: field.kind,
      submitted: value !== undefined,
      correct,
      score: correct ? 1 : 0,
      ...(parsedNumber === null ? {} : { parsedNumber, delta }),
      tolerance,
    };
  }

  if (field.kind === "choice") {
    const submitted = typeof value === "string" ? normalizedId(value) : "";
    const correct = submitted === field.expectedOptionId;
    return {
      fieldId: field.id,
      kind: field.kind,
      submitted: value !== undefined,
      correct,
      score: correct ? 1 : 0,
    };
  }

  const submitted = Array.isArray(value)
    ? value.filter((option): option is string => typeof option === "string").map(normalizedId)
    : [];
  const result = evaluateSelection(field, submitted);
  return {
    fieldId: field.id,
    kind: field.kind,
    submitted: value !== undefined,
    ...result,
  };
}

function stageWeight(stage: ScienceStage) {
  return stage.fields.reduce((sum, field) => sum + (field.weight ?? 1), 0);
}

export function evaluateScienceStage(
  stage: ScienceStage,
  submission: ScienceStageSubmission | undefined,
  completedStageIds: ReadonlySet<string> = new Set(),
): ScienceStageEvaluation {
  const missingDependencies = (stage.dependsOn ?? []).filter((stageId) => !completedStageIds.has(stageId));
  const locked = missingDependencies.length > 0;
  const fields = stage.fields.map((field) => evaluateScienceField(field, submission?.[field.id]));
  const totalWeight = stageWeight(stage);
  const earnedWeight = locked
    ? 0
    : fields.reduce((sum, evaluation, index) => sum + evaluation.score * (stage.fields[index].weight ?? 1), 0);
  const success = !locked && fields.length > 0 && fields.every((field) => field.correct);
  return {
    stageId: stage.id,
    locked,
    missingDependencies,
    success,
    score: totalWeight ? earnedWeight / totalWeight : 0,
    earnedWeight,
    totalWeight,
    fields,
  };
}

export function getUnlockedScienceStageIds(
  scenario: ScienceScenarioCase,
  completedStageIds: ReadonlySet<string>,
) {
  return scenario.stages
    .filter((stage) => (stage.dependsOn ?? []).every((stageId) => completedStageIds.has(stageId)))
    .map((stage) => stage.id);
}

export function evaluateScienceScenario(
  scenario: ScienceScenarioCase,
  submission: ScienceScenarioSubmission,
): ScienceScenarioEvaluation {
  const completed = new Set<string>();
  const stages = scenario.stages.map((stage) => {
    const evaluation = evaluateScienceStage(stage, submission[stage.id], completed);
    if (evaluation.success) completed.add(stage.id);
    return evaluation;
  });
  const totalWeight = stages.reduce((sum, stage) => sum + stage.totalWeight, 0);
  const earnedWeight = stages.reduce((sum, stage) => sum + stage.earnedWeight, 0);
  const nextStage = scenario.stages.find((stage) => {
    if (completed.has(stage.id)) return false;
    return (stage.dependsOn ?? []).every((dependency) => completed.has(dependency));
  });
  return {
    scenarioId: scenario.id,
    success: completed.size === scenario.stages.length,
    score: totalWeight ? earnedWeight / totalWeight : 0,
    earnedWeight,
    totalWeight,
    completedStageIds: [...completed],
    nextStageId: nextStage?.id ?? null,
    stages,
  };
}

export function createScienceSolution(scenario: ScienceScenarioCase): Record<string, Record<string, ScienceAnswerValue>> {
  return Object.fromEntries(scenario.stages.map((stage) => [
    stage.id,
    Object.fromEntries(stage.fields.map((field) => [
      field.id,
      field.kind === "number"
        ? field.expected
        : field.kind === "choice"
          ? field.expectedOptionId
          : [...field.expectedOptionIds],
    ])),
  ]));
}

const hasDuplicate = (values: readonly string[]) => new Set(values).size !== values.length;

function validateField(field: ScienceAnswerField, prefix: string, issues: string[]) {
  if (!field.id.trim()) issues.push(`${prefix}: field id is empty`);
  if (!field.label.trim()) issues.push(`${prefix}/${field.id}: label is empty`);
  if (field.weight !== undefined && (!Number.isFinite(field.weight) || field.weight <= 0)) {
    issues.push(`${prefix}/${field.id}: weight must be positive`);
  }
  if (field.kind === "number") {
    if (!Number.isFinite(field.expected)) issues.push(`${prefix}/${field.id}: expected number is not finite`);
    const tolerances = [field.tolerance.absolute, field.tolerance.relative].filter(
      (value): value is number => value !== undefined,
    );
    if (!tolerances.length || tolerances.some((value) => !Number.isFinite(value) || value < 0)) {
      issues.push(`${prefix}/${field.id}: tolerance must contain finite non-negative values`);
    }
    const units = field.acceptedUnits ?? [];
    if (hasDuplicate(units.map((unit) => normalizedUnit(unit.unit)))) {
      issues.push(`${prefix}/${field.id}: accepted units are duplicated`);
    }
    if (units.some((unit) => !unit.unit.trim() || !Number.isFinite(unit.factor) || unit.factor <= 0)) {
      issues.push(`${prefix}/${field.id}: accepted-unit factors must be positive`);
    }
    return;
  }

  const optionIds = field.options.map((option) => option.id);
  if (!optionIds.length || hasDuplicate(optionIds)) issues.push(`${prefix}/${field.id}: option ids must be unique`);
  if (field.options.some((option) => !option.id.trim() || !option.label.trim())) {
    issues.push(`${prefix}/${field.id}: options need ids and labels`);
  }
  if (field.kind === "choice") {
    if (!optionIds.includes(field.expectedOptionId)) issues.push(`${prefix}/${field.id}: expected option is missing`);
    return;
  }
  if (!field.expectedOptionIds.length || hasDuplicate(field.expectedOptionIds)) {
    issues.push(`${prefix}/${field.id}: expected selection must be non-empty and unique`);
  }
  if (field.expectedOptionIds.some((optionId) => !optionIds.includes(optionId))) {
    issues.push(`${prefix}/${field.id}: expected selection contains an unknown option`);
  }
}

function validateWorkspace(scenario: ScienceScenarioCase, issues: string[]) {
  const workspace = scenario.workspace;
  const expectedWorkspace: Record<ScienceScenarioCase["kind"], ScienceScenarioCase["workspace"]["kind"]> = {
    "resistor-code": "resistor-board",
    "circuit-tuning": "circuit",
    "measurement-uncertainty": "measurement-bench",
    "lever-balance": "lever",
    "density-lab": "density-tank",
    "thermal-design": "thermal-section",
  };
  if (workspace.kind !== expectedWorkspace[scenario.kind]) {
    issues.push(`${scenario.id}: workspace ${workspace.kind} does not match ${scenario.kind}`);
  }
  if (workspace.kind === "resistor-board") {
    if (workspace.resistors.length < 2 || hasDuplicate(workspace.resistors.map((item) => item.id))) {
      issues.push(`${scenario.id}: resistor board needs unique components`);
    }
  } else if (workspace.kind === "circuit") {
    const nodeIds = workspace.nodes.map((node) => node.id);
    if (hasDuplicate(nodeIds)) issues.push(`${scenario.id}: circuit node ids are duplicated`);
    if (workspace.components.some((component) => !nodeIds.includes(component.from) || !nodeIds.includes(component.to))) {
      issues.push(`${scenario.id}: circuit component references an unknown node`);
    }
  } else if (workspace.kind === "measurement-bench") {
    if (workspace.readings.length < 3 || workspace.readings.some((reading) => !Number.isFinite(reading))) {
      issues.push(`${scenario.id}: measurement bench needs at least three finite readings`);
    }
    if (!(workspace.instrument.resolution > 0)) issues.push(`${scenario.id}: instrument resolution must be positive`);
  } else if (workspace.kind === "lever") {
    if (!workspace.loads.length || !(workspace.gravity > 0)) issues.push(`${scenario.id}: lever model is incomplete`);
  } else if (workspace.kind === "density-tank") {
    if (!(workspace.fluid.density > 0) || workspace.samples.some((sample) => !(sample.massG > 0 && sample.volumeCm3 > 0))) {
      issues.push(`${scenario.id}: density model requires positive masses, volumes and fluid density`);
    }
  } else if (
    !(workspace.areaM2 > 0)
    || workspace.layers.some((layer) => !(layer.thicknessM > 0 && layer.conductivity > 0))
  ) {
    issues.push(`${scenario.id}: thermal model requires positive geometry and conductivity`);
  }
}

export function validateScienceScenario(scenario: ScienceScenarioCase) {
  const issues: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(scenario.id)) issues.push(`${scenario.id}: id is not stable kebab-case`);
  if (!scenario.title.trim() || !scenario.description.trim()) issues.push(`${scenario.id}: title and description are required`);
  if (scenario.instructionPane.procedure.length < 3) issues.push(`${scenario.id}: procedure needs at least three steps`);
  if (scenario.instructionPane.manual.length < 2) issues.push(`${scenario.id}: manual needs at least two sections`);
  if (scenario.instructionPane.glossary.length < 3) issues.push(`${scenario.id}: glossary needs at least three entries`);
  if (scenario.stages.length < 3) issues.push(`${scenario.id}: scenario needs at least three stages`);
  if (hasDuplicate(scenario.stages.map((stage) => stage.id))) issues.push(`${scenario.id}: stage ids are duplicated`);
  const priorStageIds = new Set<string>();
  for (const stage of scenario.stages) {
    const prefix = `${scenario.id}/${stage.id}`;
    if (!stage.id.trim() || !stage.title.trim() || !stage.instruction.trim() || !stage.solutionExplanation.trim()) {
      issues.push(`${prefix}: stage copy is incomplete`);
    }
    if (!stage.fields.length || hasDuplicate(stage.fields.map((field) => field.id))) {
      issues.push(`${prefix}: field ids must be non-empty and unique`);
    }
    for (const dependency of stage.dependsOn ?? []) {
      if (!priorStageIds.has(dependency)) issues.push(`${prefix}: dependency ${dependency} must reference an earlier stage`);
    }
    for (const field of stage.fields) validateField(field, prefix, issues);
    priorStageIds.add(stage.id);
  }
  validateWorkspace(scenario, issues);
  return issues;
}

export function assertScienceScenarioValid(scenario: ScienceScenarioCase) {
  const issues = validateScienceScenario(scenario);
  if (issues.length) throw new Error(`Invalid science scenario:\n${issues.join("\n")}`);
  return scenario;
}
