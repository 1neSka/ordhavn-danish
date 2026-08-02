import type { TerminalAssistantRequest } from "./terminalScenarioData.ts";
import { terminalAssistantPolicy } from "./terminalScenarioData.ts";
import { evaluateScenarioSubmission } from "./scenarioAiClient.ts";
import type {
  GeminiEvaluationRequest,
  GeminiEvaluationResult,
} from "./geminiEvaluation.ts";

type TerminalEvaluator = (request: GeminiEvaluationRequest) => Promise<GeminiEvaluationResult>;

export function terminalAssistantEvaluationRequest(
  request: TerminalAssistantRequest,
): GeminiEvaluationRequest {
  return {
    scenarioId: request.caseId,
    task: "terminal-assistant",
    submission: request.prompt,
    level: "B1",
    requiredFacts: [
      terminalAssistantPolicy.systemInstruction,
      `Nuværende mappe: ${request.cwd}`,
      `Seneste kommandoer: ${request.recentCommands.join(" | ") || "ingen"}`.slice(0, 300),
    ],
  };
}

/** Returns one Danish hint, or null when the provider is absent or exhausted. */
export async function askTerminalAssistant(
  request: TerminalAssistantRequest,
  evaluator: TerminalEvaluator = evaluateScenarioSubmission,
) {
  const result = await evaluator(terminalAssistantEvaluationRequest(request));
  return result.available ? result.feedback : null;
}
