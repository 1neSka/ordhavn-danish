import type {
  AuthorityAiPersuasionPolicy,
  AuthorityCondition,
  AuthorityDecisionRule,
  AuthorityDerivedMetric,
  AuthorityOperand,
  AuthorityScenarioCase,
  AuthorityWorksheetField,
} from "./authorityScenarioData.ts";

export type AuthorityWorksheetValue = number | string;
export type AuthorityWorksheetSubmission = Readonly<Record<string, AuthorityWorksheetValue>>;

export interface AuthoritySubmission {
  decisionId: string;
  worksheet?: AuthorityWorksheetSubmission;
}

export interface AuthorityWorksheetFieldEvaluation {
  fieldId: string;
  submitted: boolean;
  correct: boolean;
  parsedNumber?: number;
}

export interface AuthorityWorksheetEvaluation {
  attempted: boolean;
  score: number;
  fields: AuthorityWorksheetFieldEvaluation[];
}

export interface AuthorityScenarioEvaluation {
  scenarioId: string;
  selectedDecisionId: string;
  knownDecision: boolean;
  validDecisionIds: string[];
  success: boolean;
  metricValues: Record<string, number>;
  ruleExplanations: string[];
  worksheet: AuthorityWorksheetEvaluation;
  /** AI persuasion is optional and is deliberately excluded from this authoritative result. */
  aiRequired: false;
}

export interface AuthorityAiPersuasionRequest {
  task: "authority-persuasion";
  language: "da";
  scenarioId: string;
  scenarioTitle: string;
  level: AuthorityScenarioCase["level"];
  audience: string;
  hiddenGoal: string;
  chosenDecision: { id: string; label: string };
  authoritativeMetrics: Array<{ id: string; label: string; value: number; unit: string }>;
  sourceDocuments: Array<{ title: string; body: string; reliability: string }>;
  submission: string;
  systemInstruction: string;
  rubric: AuthorityAiPersuasionPolicy["rubric"];
}

export type AuthorityAiPreparation =
  | { status: "ready"; request: AuthorityAiPersuasionRequest }
  | {
      status: "skipped";
      reason: "not-requested" | "ai-unavailable" | "decision-not-authoritative" | "submission-too-short";
    };

const EPSILON = 1e-9;

function parseDanishNumber(value: AuthorityWorksheetValue | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const match = value.trim().replace(/−/gu, "-").match(/^([+-]?[\d\s.,]+)(?:\s*[^\d\s.,]+.*)?$/u);
  if (!match) return null;
  let token = match[1].replace(/\s+/gu, "");
  if (token.includes(",") && token.includes(".")) {
    token = token.lastIndexOf(",") > token.lastIndexOf(".")
      ? token.replace(/\./gu, "").replace(",", ".")
      : token.replace(/,/gu, "");
  } else if (/^[+-]?[1-9]\d{0,2}(?:\.\d{3})+$/u.test(token)) {
    token = token.replace(/\./gu, "");
  } else {
    token = token.replace(",", ".");
  }
  const result = Number(token);
  return Number.isFinite(result) ? result : null;
}

function calculateMetric(metric: AuthorityDerivedMetric, values: Readonly<Record<string, number>>) {
  const inputs = metric.inputs.map((id) => values[id]);
  if (inputs.some((value) => value === undefined || !Number.isFinite(value))) {
    throw new Error(`Metric ${metric.id} references a missing or non-finite input.`);
  }
  switch (metric.operation) {
    case "sum":
      return inputs.reduce((sum, value) => sum + value, 0);
    case "difference":
      return inputs[0] - inputs[1];
    case "product":
      return inputs.reduce((product, value) => product * value, 1);
    case "ratio":
      if (Math.abs(inputs[1]) <= EPSILON) throw new Error(`Metric ${metric.id} divides by zero.`);
      return inputs[0] / inputs[1];
    case "percentage":
      if (Math.abs(inputs[1]) <= EPSILON) throw new Error(`Metric ${metric.id} divides by zero.`);
      return inputs[0] / inputs[1] * 100;
  }
}

/** Computes every authored metric from source facts. No worksheet or AI output enters this calculation. */
export function computeAuthorityMetrics(scenario: AuthorityScenarioCase) {
  const values: Record<string, number> = Object.fromEntries(
    scenario.facts.map((fact) => [fact.id, fact.value]),
  );
  for (const metric of scenario.metrics) {
    values[metric.id] = calculateMetric(metric, values);
  }
  return Object.fromEntries(scenario.metrics.map((metric) => [metric.id, values[metric.id]]));
}

function createAllNumericValues(scenario: AuthorityScenarioCase) {
  return {
    ...Object.fromEntries(scenario.facts.map((fact) => [fact.id, fact.value])),
    ...computeAuthorityMetrics(scenario),
  };
}

function resolveOperand(operand: AuthorityOperand, values: Readonly<Record<string, number>>) {
  if (operand.kind === "constant") return operand.value;
  const value = values[operand.id];
  if (value === undefined) throw new Error(`Condition references unknown value ${operand.id}.`);
  return value;
}

export function evaluateAuthorityCondition(
  condition: AuthorityCondition,
  values: Readonly<Record<string, number>>,
): boolean {
  if (condition.kind === "all") {
    return condition.conditions.every((child) => evaluateAuthorityCondition(child, values));
  }
  if (condition.kind === "any") {
    return condition.conditions.some((child) => evaluateAuthorityCondition(child, values));
  }
  if (condition.kind === "not") return !evaluateAuthorityCondition(condition.condition, values);
  const left = resolveOperand(condition.left, values);
  const right = resolveOperand(condition.right, values);
  switch (condition.operator) {
    case "<": return left < right - EPSILON;
    case "<=": return left <= right + EPSILON;
    case "=": return Math.abs(left - right) <= EPSILON;
    case ">=": return left >= right - EPSILON;
    case ">": return left > right + EPSILON;
  }
}

export function resolveAuthorityDecisionRules(scenario: AuthorityScenarioCase): AuthorityDecisionRule[] {
  const values = createAllNumericValues(scenario);
  return scenario.decisionRules.filter((rule) => evaluateAuthorityCondition(rule.when, values));
}

function evaluateWorksheetField(
  field: AuthorityWorksheetField,
  value: AuthorityWorksheetValue | undefined,
  metrics: Readonly<Record<string, number>>,
): AuthorityWorksheetFieldEvaluation {
  if (field.kind === "choice") {
    return {
      fieldId: field.id,
      submitted: value !== undefined,
      correct: typeof value === "string" && value === field.expectedOptionId,
    };
  }
  const parsedNumber = parseDanishNumber(value);
  const expected = metrics[field.metricId];
  return {
    fieldId: field.id,
    submitted: value !== undefined,
    correct: parsedNumber !== null
      && expected !== undefined
      && Math.abs(parsedNumber - expected) <= field.tolerance + EPSILON,
    ...(parsedNumber === null ? {} : { parsedNumber }),
  };
}

export function evaluateAuthorityWorksheet(
  scenario: AuthorityScenarioCase,
  submission?: AuthorityWorksheetSubmission,
): AuthorityWorksheetEvaluation {
  const metrics = computeAuthorityMetrics(scenario);
  const fields = scenario.worksheet.fields.map((field) => evaluateWorksheetField(field, submission?.[field.id], metrics));
  const attempted = fields.some((field) => field.submitted);
  return {
    attempted,
    score: attempted && fields.length ? fields.filter((field) => field.correct).length / fields.length : 0,
    fields,
  };
}

/**
 * Grades the institutional decision. The worksheet is intentionally advisory: its score is reported,
 * but it never changes `success`, including when it is empty or entirely wrong.
 */
export function evaluateAuthorityScenario(
  scenario: AuthorityScenarioCase,
  submission: AuthoritySubmission,
): AuthorityScenarioEvaluation {
  const metricValues = computeAuthorityMetrics(scenario);
  const matchingRules = resolveAuthorityDecisionRules(scenario);
  const validDecisionIds = [...new Set(matchingRules.map((rule) => rule.decisionId))];
  const knownDecision = scenario.decisions.some((decision) => decision.id === submission.decisionId);
  return {
    scenarioId: scenario.id,
    selectedDecisionId: submission.decisionId,
    knownDecision,
    validDecisionIds,
    success: knownDecision && validDecisionIds.includes(submission.decisionId),
    metricValues,
    ruleExplanations: matchingRules.map((rule) => rule.explanation),
    worksheet: evaluateAuthorityWorksheet(scenario, submission.worksheet),
    aiRequired: false,
  };
}

const countWords = (value: string) => value.trim().split(/\s+/u).filter(Boolean).length;

/**
 * Builds an optional provider request only. It never fabricates an offline score: unavailable AI is a skip,
 * and the deterministic scenario remains complete once the correct decision has been selected.
 */
export function prepareAuthorityPersuasion(
  scenario: AuthorityScenarioCase,
  submission: AuthoritySubmission,
  monologue: string,
  aiAvailable: boolean,
): AuthorityAiPreparation {
  if (!monologue.trim()) return { status: "skipped", reason: "not-requested" };
  if (!aiAvailable) return { status: "skipped", reason: "ai-unavailable" };
  const evaluation = evaluateAuthorityScenario(scenario, submission);
  if (!evaluation.success) return { status: "skipped", reason: "decision-not-authoritative" };
  const bounded = monologue.trim().slice(0, scenario.aiPolicy.maximumCharacters);
  if (countWords(bounded) < scenario.aiPolicy.minimumWords) {
    return { status: "skipped", reason: "submission-too-short" };
  }
  const selected = scenario.decisions.find((decision) => decision.id === submission.decisionId);
  if (!selected) return { status: "skipped", reason: "decision-not-authoritative" };
  return {
    status: "ready",
    request: {
      task: scenario.aiPolicy.task,
      language: scenario.aiPolicy.language,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      level: scenario.level,
      audience: scenario.aiPolicy.audience,
      hiddenGoal: scenario.aiPolicy.hiddenGoal,
      chosenDecision: { id: selected.id, label: selected.label },
      authoritativeMetrics: scenario.metrics.map((metric) => ({
        id: metric.id,
        label: metric.label,
        value: evaluation.metricValues[metric.id],
        unit: metric.unit,
      })),
      sourceDocuments: scenario.sourceDocuments.map((document) => ({
        title: document.title,
        body: document.body,
        reliability: document.reliability,
      })),
      submission: bounded,
      systemInstruction: scenario.aiPolicy.systemInstruction,
      rubric: scenario.aiPolicy.rubric,
    },
  };
}

export function createAuthoritySolution(scenario: AuthorityScenarioCase): AuthoritySubmission {
  const rule = resolveAuthorityDecisionRules(scenario)[0];
  if (!rule) throw new Error(`Authority scenario ${scenario.id} has no valid deterministic decision.`);
  return { decisionId: rule.decisionId };
}

function collectConditionReferences(condition: AuthorityCondition, references: string[]) {
  if (condition.kind === "all" || condition.kind === "any") {
    condition.conditions.forEach((child) => collectConditionReferences(child, references));
    return;
  }
  if (condition.kind === "not") {
    collectConditionReferences(condition.condition, references);
    return;
  }
  if (condition.left.kind === "reference") references.push(condition.left.id);
  if (condition.right.kind === "reference") references.push(condition.right.id);
}

const duplicates = (values: readonly string[]) => values.filter((value, index) => values.indexOf(value) !== index);

export function validateAuthorityScenario(scenario: AuthorityScenarioCase) {
  const issues: string[] = [];
  const documentIds = scenario.sourceDocuments.map((document) => document.id);
  const factIds = scenario.facts.map((fact) => fact.id);
  const metricIds = scenario.metrics.map((metric) => metric.id);
  const numericIds = new Set([...factIds]);
  const decisionIds = scenario.decisions.map((decision) => decision.id);
  const worksheetIds = scenario.worksheet.fields.map((field) => field.id);

  if (duplicates(documentIds).length) issues.push("source document ids must be unique");
  if (duplicates([...factIds, ...metricIds]).length) issues.push("fact and metric ids must be globally unique");
  if (duplicates(decisionIds).length) issues.push("decision ids must be unique");
  if (duplicates(worksheetIds).length) issues.push("worksheet field ids must be unique");
  if (scenario.sourceDocuments.length < 3) issues.push("at least three source documents are required");
  if (scenario.decisions.length < 3) issues.push("at least three decision options are required");
  if (!scenario.playerObjective.trim()) issues.push("player objective is missing");

  for (const fact of scenario.facts) {
    if (!Number.isFinite(fact.value)) issues.push(`${fact.id}: fact must be finite`);
    if (!documentIds.includes(fact.sourceDocumentId)) issues.push(`${fact.id}: source document is missing`);
  }
  for (const metric of scenario.metrics) {
    const requiredInputs = metric.operation === "sum" || metric.operation === "product" ? 2 : 2;
    if (metric.inputs.length < requiredInputs) issues.push(`${metric.id}: too few inputs`);
    if ((metric.operation === "difference" || metric.operation === "ratio" || metric.operation === "percentage") && metric.inputs.length !== 2) {
      issues.push(`${metric.id}: operation requires exactly two inputs`);
    }
    for (const input of metric.inputs) {
      if (!numericIds.has(input)) issues.push(`${metric.id}: input ${input} must reference a fact or earlier metric`);
    }
    numericIds.add(metric.id);
  }
  for (const rule of scenario.decisionRules) {
    if (!decisionIds.includes(rule.decisionId)) issues.push(`${rule.decisionId}: rule references unknown decision`);
    const references: string[] = [];
    collectConditionReferences(rule.when, references);
    for (const reference of references) {
      if (!numericIds.has(reference)) issues.push(`${rule.decisionId}: condition references unknown value ${reference}`);
    }
  }
  for (const field of scenario.worksheet.fields) {
    if (field.kind === "number" && !metricIds.includes(field.metricId)) issues.push(`${field.id}: worksheet metric is missing`);
    if (field.kind === "number" && (!Number.isFinite(field.tolerance) || field.tolerance < 0)) issues.push(`${field.id}: worksheet tolerance must be non-negative`);
    if (field.kind === "choice") {
      const optionIds = field.options.map((option) => option.id);
      if (!optionIds.includes(field.expectedOptionId)) issues.push(`${field.id}: expected worksheet option is missing`);
      if (duplicates(optionIds).length) issues.push(`${field.id}: worksheet options must be unique`);
    }
  }
  const rubricWeight = scenario.aiPolicy.rubric.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (scenario.aiPolicy.offlineBehavior !== "skip") issues.push("AI offline behavior must be skip");
  if (Math.abs(rubricWeight - 1) > EPSILON) issues.push("AI rubric weights must sum to one");

  if (!issues.length) {
    try {
      const valid = resolveAuthorityDecisionRules(scenario);
      if (!valid.length) issues.push("decision rules do not resolve to an authoritative decision");
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "metric calculation failed");
    }
  }
  return issues;
}

export function assertAuthorityScenarioValid(scenario: AuthorityScenarioCase) {
  const issues = validateAuthorityScenario(scenario);
  if (issues.length) throw new Error(`Invalid authority scenario ${scenario.id}: ${issues.join("; ")}`);
  return scenario;
}
