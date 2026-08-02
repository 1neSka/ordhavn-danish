import {
  evaluateWithGeminiFallback,
  isGeminiEvaluationRequest,
  type GeminiEvaluationResult,
} from "@/lib/geminiEvaluation";

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
    // Plain Node-based render tests do not provide the Cloudflare runtime.
  }
  return (bindingKey ?? process.env.GEMINI_API_KEY)?.trim();
}

function unavailable(feedback: string, status = 503) {
  const result: GeminiEvaluationResult = {
    available: false,
    score: 0,
    verdict: "revise",
    feedback,
    strengths: [],
    improvements: [],
    model: null,
  };
  return Response.json(result, { status });
}

export async function POST(request: Request) {
  const apiKey = await readApiKey();
  if (!apiKey) return unavailable("AI-vurderingen er ikke konfigureret. Opgaven kan springes over uden straf.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return unavailable("Anmodningen kunne ikke læses.", 400);
  }
  if (!isGeminiEvaluationRequest(body)) return unavailable("Besvarelsen mangler gyldige sagsoplysninger.", 400);

  const result = await evaluateWithGeminiFallback(body, apiKey);
  if (result) return Response.json(result);

  return unavailable("AI-vurderingen er midlertidigt utilgængelig. Opgaven kan springes over uden straf.");
}
