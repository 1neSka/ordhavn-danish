export const GEMINI_MODEL_FALLBACK = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

export type GeminiEvaluationTask =
  | "formal-report"
  | "risk-briefing"
  | "public-message"
  | "operational-note"
  | "public-notice"
  | "free-rewrite"
  | "compress"
  | "micro-dialogue"
  | "explain-why"
  | "authority-persuasion"
  | "terminal-assistant";

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
  "operational-note": "Evaluate concise Danish operational language, exact ordering, temporal connectors, unambiguous references, and coverage of verified facts.",
  "public-notice": "Evaluate accessible Danish public information, preserved meaning, actionable instructions, calm register, and coverage of verified facts.",
  "free-rewrite": "Evaluate whether the Danish rewrite preserves the full meaning while genuinely changing syntax, wording, and information structure.",
  "compress": "Evaluate whether the Danish compression stays within the stated limit, preserves every required fact, and avoids unsupported claims.",
  "micro-dialogue": "Evaluate the complete role-labelled conversation. Judge only LEARNER lines for Danish quality, and use CHARACTER lines as interaction context. Weight Danish clarity and expressiveness, coherent adaptation to the character, and the actual conversational outcome. The learner may deliberately be warm, blunt, rude, manipulative, funny, accusatory, or unconventional. Never reject a response merely for being impolite or unprofessional unless the stated situation explicitly requires that register. Let harsh tactics have believable strategic consequences; distinguish a linguistically strong hostile choice from successful progress toward the objective. Full acceptance requires strong Danish, coherent interaction, and meaningful completion of the stated objective, but a creative strategic failure can still receive substantial credit.",
  "explain-why": "Evaluate the causal explanation for Danish precision, explicit logical links, correct concepts, and justified rather than circular reasoning.",
  "authority-persuasion": "Evaluate a Danish persuasion monologue for valid use of the authoritative evidence, logical control, audience awareness, strategic framing, register, and progress toward the hidden goal. Reward selective emphasis and psychological timing, but reject invented data or invalid inference. Never advise the learner to lie and never alter the deterministic decision.",
  "terminal-assistant": "Answer the learner's Danish terminal question in Danish. Explain one Linux principle and suggest at most one small next experiment. Do not reveal the complete scenario solution, a full command chain, hidden required files, or a grading verdict. Put the useful answer in feedback.",
};

export function isGeminiEvaluationRequest(value: unknown): value is GeminiEvaluationRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<GeminiEvaluationRequest>;
  return typeof request.scenarioId === "string"
    && request.scenarioId.length > 0
    && request.scenarioId.length <= 80
    && ["formal-report", "risk-briefing", "public-message", "operational-note", "public-notice", "free-rewrite", "compress", "micro-dialogue", "explain-why", "authority-persuasion", "terminal-assistant"].includes(request.task ?? "")
    && typeof request.submission === "string"
    && request.submission.trim().length >= (request.task === "terminal-assistant" ? 4 : 20)
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
    "Evaluate the submitted solution rather than conformity to an unstated moral or personality ideal. Accept creative, adversarial, humorous, blunt, or unconventional approaches when they satisfy the explicit task; require a particular tone only when the task or rubric actually states it.",
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
