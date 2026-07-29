export const GEMINI_MODEL_FALLBACK = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

export type GeminiEvaluationTask = "formal-report" | "risk-briefing" | "public-message";

export interface GeminiEvaluationRequest {
  scenarioId: string;
  task: GeminiEvaluationTask;
  submission: string;
  requiredFacts: string[];
  level: "B1" | "B2";
}

export interface GeminiEvaluationResult {
  available: boolean;
  score: number;
  verdict: "accepted" | "revise";
  feedback: string;
  strengths: string[];
  improvements: string[];
  model: string | null;
}

export type GeminiFetch = (input: string, init?: RequestInit) => Promise<Response>;

export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "NUMBER" },
    verdict: { type: "STRING", enum: ["accepted", "revise"] },
    feedback: { type: "STRING" },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    improvements: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["score", "verdict", "feedback", "strengths", "improvements"],
} as const;

const taskRubrics: Record<GeminiEvaluationTask, string> = {
  "formal-report": "Evaluate formal Danish administrative register, chronology, evidential caution, cohesion, and coverage of verified facts.",
  "risk-briefing": "Evaluate concise Danish operational language, prioritisation, modal precision, risk communication, and coverage of verified facts.",
  "public-message": "Evaluate clear Danish public-facing language, tone, factual restraint, useful instructions, and coverage of verified facts.",
};

export function isGeminiEvaluationRequest(value: unknown): value is GeminiEvaluationRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<GeminiEvaluationRequest>;
  return typeof request.scenarioId === "string"
    && request.scenarioId.length > 0
    && request.scenarioId.length <= 80
    && ["formal-report", "risk-briefing", "public-message"].includes(request.task ?? "")
    && typeof request.submission === "string"
    && request.submission.trim().length >= 20
    && request.submission.length <= 4_000
    && Array.isArray(request.requiredFacts)
    && request.requiredFacts.length <= 20
    && request.requiredFacts.every((fact) => typeof fact === "string" && fact.length <= 300)
    && (request.level === "B1" || request.level === "B2");
}

export function buildGeminiEvaluationPrompt(request: GeminiEvaluationRequest) {
  return [
    "You are a strict but constructive Danish-language examiner.",
    taskRubrics[request.task],
    `Target CEFR level: ${request.level}.`,
    "Do not invent facts. Treat the required facts as the only authoritative case record.",
    "Minor spelling errors should reduce the language score without erasing correct reasoning.",
    "Return concise feedback in Danish. The score must be between 0 and 1.",
    `Required facts:\n${request.requiredFacts.map((fact, index) => `${index + 1}. ${fact}`).join("\n")}`,
    `Learner submission:\n${request.submission.trim()}`,
  ].join("\n\n");
}

export function parseGeminiEvaluation(value: unknown, model: string): GeminiEvaluationResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<GeminiEvaluationResult>;
  if (typeof candidate.score !== "number" || !Number.isFinite(candidate.score)) return null;
  if (candidate.verdict !== "accepted" && candidate.verdict !== "revise") return null;
  if (typeof candidate.feedback !== "string" || !candidate.feedback.trim()) return null;
  const strengths = Array.isArray(candidate.strengths) ? candidate.strengths.filter((item): item is string => typeof item === "string").slice(0, 4) : [];
  const improvements = Array.isArray(candidate.improvements) ? candidate.improvements.filter((item): item is string => typeof item === "string").slice(0, 4) : [];
  return {
    available: true,
    score: Math.min(1, Math.max(0, candidate.score)),
    verdict: candidate.verdict,
    feedback: candidate.feedback.trim().slice(0, 1_200),
    strengths,
    improvements,
    model,
  };
}

export async function evaluateWithGeminiFallback(
  request: GeminiEvaluationRequest,
  apiKey: string,
  fetcher: GeminiFetch = fetch,
  timeoutMs = 18_000,
) {
  const prompt = buildGeminiEvaluationPrompt(request);
  for (const model of GEMINI_MODEL_FALLBACK) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 700,
            responseMimeType: "application/json",
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        }),
      });
      if (!response.ok) {
        if ([401, 403].includes(response.status)) return null;
        continue;
      }
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      const result = parseGeminiEvaluation(JSON.parse(text), model);
      if (result) return result;
    } catch {
      // Timeouts, malformed output, quota errors, and transient failures continue down the model ladder.
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}
