import type { AuthorityAiPersuasionRequest } from "./authorityEngine.ts";
import {
  evaluateScenarioSubmission,
} from "./scenarioAiClient.ts";
import type {
  GeminiEvaluationRequest,
  GeminiEvaluationResult,
} from "./geminiEvaluation.ts";

type AuthorityEvaluator = (request: GeminiEvaluationRequest) => Promise<GeminiEvaluationResult>;

export function authorityPersuasionEvaluationRequest(
  request: AuthorityAiPersuasionRequest,
): GeminiEvaluationRequest {
  const metricFacts = request.authoritativeMetrics.map((metric) =>
    `${metric.label}: ${metric.value} ${metric.unit}`,
  );
  const documentFacts = request.sourceDocuments.map((document) =>
    `${document.title} (${document.reliability}): ${document.body}`.slice(0, 300),
  );
  return {
    scenarioId: request.scenarioId,
    task: "authority-persuasion",
    submission: request.submission,
    level: request.level === "B2" ? "B2" : "B1",
    requiredFacts: [
      `Gyldig afgørelse: ${request.chosenDecision.label}`,
      `Modtager: ${request.audience}`,
      `Skjult kommunikativt mål: ${request.hiddenGoal}`,
      ...metricFacts,
      ...documentFacts,
    ].slice(0, 20),
  };
}

/** Calls Gemini when available; a missing key, quota error or malformed response is a clean skip. */
export async function evaluateAuthorityPersuasion(
  request: AuthorityAiPersuasionRequest,
  evaluator: AuthorityEvaluator = evaluateScenarioSubmission,
) {
  const result = await evaluator(authorityPersuasionEvaluationRequest(request));
  if (!result.available) return null;
  return {
    feedback: result.feedback,
    strengths: result.strengths,
    improvements: result.improvements,
    model: result.model ?? undefined,
  };
}
