import {
  evaluateDialogueTurnOffline,
  type DialogueTurnEvaluationRequest,
  type DialogueTurnEvaluationResult,
} from "./dialogueAi";

export async function evaluateDialogueTurn(request: DialogueTurnEvaluationRequest): Promise<DialogueTurnEvaluationResult> {
  try {
    const response = await fetch("/api/gemini/dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json() as Partial<DialogueTurnEvaluationResult>;
    if (typeof payload.routeId !== "string" || typeof payload.reaction !== "string" || typeof payload.analysis !== "string") {
      return evaluateDialogueTurnOffline(request);
    }
    return {
      available: payload.available === true,
      routeId: payload.routeId,
      reaction: payload.reaction.slice(0, 700),
      analysis: payload.analysis.slice(0, 700),
      generatedBeat: payload.generatedBeat,
      model: typeof payload.model === "string" ? payload.model : null,
    };
  } catch {
    return evaluateDialogueTurnOffline(request);
  }
}

