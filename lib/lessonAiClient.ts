import type { CourseItem } from "./course/types.ts";
import { evaluateScenarioSubmission } from "./scenarioAiClient.ts";
import type { GeminiEvaluationResult } from "./geminiEvaluation.ts";

const unavailable: GeminiEvaluationResult = {
  available: false,
  score: 0,
  verdict: "revise",
  feedback: "AI-vurderingen er ikke tilgængelig. Opgaven springes over uden straf.",
  strengths: [],
  improvements: [],
  model: null,
};

export async function evaluateLessonItem(item: CourseItem, submission: string) {
  if (!item.aiPolicy) return unavailable;
  const requiredFacts = item.aiPolicy.requiredFacts
    ?? (item.type === "compress" ? item.requiredFacts : [])
    ?? [];
  return evaluateScenarioSubmission({
    scenarioId: item.id,
    task: item.aiPolicy.task,
    submission,
    requiredFacts,
    level: item.difficulty >= 3 ? "B2" : "B1",
  });
}
