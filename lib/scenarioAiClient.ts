import type { GeminiEvaluationRequest, GeminiEvaluationResult } from "./geminiEvaluation";

const localFallback: GeminiEvaluationResult = {
  available: false,
  score: 0,
  verdict: "revise",
  feedback: "AI-vurderingen er ikke tilgængelig. Den lokale regelmotor bruges i stedet.",
  strengths: [],
  improvements: [],
  correctedSubmission: "",
  languageIssues: [],
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
      correctedSubmission: typeof payload.correctedSubmission === "string" ? payload.correctedSubmission : "",
      languageIssues: Array.isArray(payload.languageIssues)
        ? payload.languageIssues.flatMap((issue) => {
          if (!issue || typeof issue !== "object") return [];
          const item = issue as { original?: unknown; correction?: unknown; explanation?: unknown };
          if (typeof item.original !== "string" || typeof item.correction !== "string" || typeof item.explanation !== "string") return [];
          return [{ original: item.original, correction: item.correction, explanation: item.explanation }];
        }).slice(0, 8)
        : [],
      model: typeof payload.model === "string" ? payload.model : null,
    };
  } catch {
    return localFallback;
  }
}
