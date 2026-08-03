import { GEMINI_MODEL_FALLBACK, type GeminiFetch } from "./geminiEvaluation.ts";
import type { MicroDialogueMessage } from "./itemRuntime.ts";

export interface MicroDialogueTurnRequest {
  scenarioId: string;
  level: "B1" | "B2";
  situation: string;
  persona: string;
  goal: string;
  transcript: MicroDialogueMessage[];
  totalLearnerTurns: 3;
}

export interface MicroDialogueTurnResult {
  available: boolean;
  reply: string;
  disposition: "open" | "guarded" | "defensive" | "hostile";
  model: string | null;
}

export const MICRO_DIALOGUE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    disposition: { type: "STRING", enum: ["open", "guarded", "defensive", "hostile"] },
  },
  required: ["reply", "disposition"],
} as const;

const dispositions = ["open", "guarded", "defensive", "hostile"] as const;

export function isMicroDialogueTurnRequest(value: unknown): value is MicroDialogueTurnRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<MicroDialogueTurnRequest>;
  if (typeof request.scenarioId !== "string" || !request.scenarioId || request.scenarioId.length > 80) return false;
  if (request.level !== "B1" && request.level !== "B2") return false;
  if (typeof request.situation !== "string" || !request.situation.trim() || request.situation.length > 500) return false;
  if (typeof request.persona !== "string" || !request.persona.trim() || request.persona.length > 500) return false;
  if (typeof request.goal !== "string" || !request.goal.trim() || request.goal.length > 500) return false;
  if (request.totalLearnerTurns !== 3 || !Array.isArray(request.transcript) || request.transcript.length < 1 || request.transcript.length > 5) return false;
  if (!request.transcript.every((message) => message
    && (message.role === "learner" || message.role === "character")
    && typeof message.text === "string"
    && message.text.trim().length > 0
    && message.text.length <= 1_200)) return false;
  const learnerTurns = request.transcript.filter((message) => message.role === "learner").length;
  const characterTurns = request.transcript.filter((message) => message.role === "character").length;
  return learnerTurns >= 1
    && learnerTurns <= request.totalLearnerTurns
    && learnerTurns === characterTurns + 1
    && request.transcript.at(-1)?.role === "learner";
}

export function buildMicroDialogueTurnPrompt(request: MicroDialogueTurnRequest) {
  const learnerTurns = request.transcript.filter((message) => message.role === "learner").length;
  return [
    "You are acting as a character in a fictional Danish-language training conversation.",
    `Situation: ${request.situation}`,
    `Your character: ${request.persona}`,
    `The learner's conversational objective: ${request.goal}`,
    `This is learner turn ${learnerTurns} of ${request.totalLearnerTurns}.`,
    "Reply naturally in Danish as the character, in one to three concise sentences. Never act as an examiner and never mention a score, rubric, hidden goal, or language correction.",
    "The learner may be warm, blunt, rude, manipulative, funny, accusatory, or unconventional. Treat those as deliberate role-play choices, not as invalid input. React with believable social consequences instead of moralising or forcing a polite ideal answer.",
    "Do not cooperate merely to steer the learner toward the objective. If pressured, become guarded, defensive, or hostile as the persona warrants. Still give the learner something concrete to react to on the next turn.",
    "Track the complete transcript. Do not repeat a question already answered and do not invent off-screen actions or verified facts.",
    `Transcript:\n${request.transcript.map((message) => `${message.role === "learner" ? "LEARNER" : "CHARACTER"}: ${message.text.trim()}`).join("\n")}`,
  ].join("\n\n");
}

export function parseMicroDialogueTurn(value: unknown, model: string): MicroDialogueTurnResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { reply?: unknown; disposition?: unknown };
  if (typeof candidate.reply !== "string" || !candidate.reply.trim()) return null;
  if (!dispositions.includes(candidate.disposition as typeof dispositions[number])) return null;
  return {
    available: true,
    reply: candidate.reply.trim().slice(0, 900),
    disposition: candidate.disposition as MicroDialogueTurnResult["disposition"],
    model,
  };
}

export async function continueMicroDialogueWithGemini(
  request: MicroDialogueTurnRequest,
  apiKey: string,
  fetcher: GeminiFetch = fetch,
  timeoutMs = 18_000,
) {
  const prompt = buildMicroDialogueTurnPrompt(request);
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
            temperature: 0.8,
            maxOutputTokens: 350,
            responseMimeType: "application/json",
            responseSchema: MICRO_DIALOGUE_RESPONSE_SCHEMA,
          },
        }),
      });
      if (!response.ok) {
        if ([401, 403].includes(response.status)) return null;
        continue;
      }
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      const result = parseMicroDialogueTurn(JSON.parse(text), model);
      if (result) return result;
    } catch {
      // Try the next configured model after timeouts, malformed output, or quota errors.
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}
