import type { GeminiEvaluationRequest, GeminiEvaluationResult } from "./geminiEvaluation";

const localFallback: GeminiEvaluationResult = {
  available: false,
  score: 0,
  verdict: "revise",
  feedback: "AI-vurderingen er ikke tilgængelig. Den lokale regelmotor bruges i stedet.",
  strengths: [],
  improvements: [],
  model: null,
};

export async function evaluateScenarioSubmission(request: GeminiEvaluationRequest): Promise<GeminiEvaluationResult> {
  try {
    const response = await fetch("/api/gemini/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json() as Partial<GeminiEvaluationResult>;
    if (typeof payload.available !== "boolean" || typeof payload.feedback !== "string") return localFallback;
    return {
      available: payload.available,
      score: typeof payload.score === "number" ? Math.min(1, Math.max(0, payload.score)) : 0,
      verdict: payload.verdict === "accepted" ? "accepted" : "revise",
      feedback: payload.feedback,
      strengths: Array.isArray(payload.strengths) ? payload.strengths.filter((item): item is string => typeof item === "string") : [],
      improvements: Array.isArray(payload.improvements) ? payload.improvements.filter((item): item is string => typeof item === "string") : [],
      model: typeof payload.model === "string" ? payload.model : null,
    };
  } catch {
    return localFallback;
  }
}
