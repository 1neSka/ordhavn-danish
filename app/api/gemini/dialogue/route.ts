import {
  evaluateDialogueTurnOffline,
  evaluateDialogueTurnWithGemini,
  isDialogueTurnEvaluationRequest,
} from "@/lib/dialogueAi";

export const runtime = "edge";

type GeminiBindings = { GEMINI_API_KEY?: string };

async function readApiKey() {
  let bindingKey: string | undefined;
  try {
    const { env } = await import("cloudflare:workers");
    bindingKey = (env as unknown as GeminiBindings).GEMINI_API_KEY;
  } catch {
    // Local Node rendering does not expose Cloudflare bindings.
  }
  return (bindingKey ?? process.env.GEMINI_API_KEY)?.trim();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ available: false, routeId: "", reaction: "Anmodningen kunne ikke læses.", analysis: "Ugyldig JSON." }, { status: 400 });
  }
  if (!isDialogueTurnEvaluationRequest(body)) {
    return Response.json({ available: false, routeId: "", reaction: "Svaret mangler nødvendig kontekst.", analysis: "Ugyldige eller for lange inputfelter." }, { status: 400 });
  }
  const apiKey = await readApiKey();
  if (!apiKey) return Response.json(evaluateDialogueTurnOffline(body));
  const result = await evaluateDialogueTurnWithGemini(body, apiKey);
  return Response.json(result ?? evaluateDialogueTurnOffline(body));
}

