import {
  answerTerminalAssistantWithGemini,
  isTerminalAssistantRequest,
} from "@/lib/terminalAssistantAi";
import type { TerminalAssistantResponse } from "@/lib/terminalScenarioData";

export const runtime = "edge";

type GeminiBindings = {
  GEMINI_API_KEY?: string;
};

async function readApiKey() {
  let bindingKey: string | undefined;
  try {
    const { env } = await import("cloudflare:workers");
    bindingKey = (env as unknown as GeminiBindings).GEMINI_API_KEY;
  } catch {
    // Plain Node-based tests do not provide the Cloudflare runtime.
  }
  return (bindingKey ?? process.env.GEMINI_API_KEY)?.trim();
}

function unavailable(answer: string, status = 503) {
  const result: TerminalAssistantResponse = {
    available: false,
    answer,
    correctedPrompt: "",
    languageIssues: [],
    model: null,
  };
  return Response.json(result, { status });
}

export async function POST(request: Request) {
  const apiKey = await readApiKey();
  if (!apiKey) return unavailable("AI-assistenten er ikke konfigureret. Brug help eller man for at fortsætte uden AI.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return unavailable("Anmodningen kunne ikke læses.", 400);
  }
  if (!isTerminalAssistantRequest(body)) return unavailable("Assistentkonteksten er ugyldig eller ufuldstændig.", 400);

  const result = await answerTerminalAssistantWithGemini(body, apiKey);
  return result
    ? Response.json(result)
    : unavailable("AI-assistenten er midlertidigt utilgængelig. Terminalmissionen kan fortsætte uden den.");
}
