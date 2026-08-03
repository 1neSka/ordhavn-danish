import {
  continueMicroDialogueWithGemini,
  isMicroDialogueTurnRequest,
  type MicroDialogueTurnResult,
} from "@/lib/microDialogueAi";

export const runtime = "edge";

type GeminiBindings = { GEMINI_API_KEY?: string };

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

function unavailable(status = 503) {
  const result: MicroDialogueTurnResult = {
    available: false,
    reply: "",
    disposition: "guarded",
    model: null,
  };
  return Response.json(result, { status });
}

export async function POST(request: Request) {
  const apiKey = await readApiKey();
  if (!apiKey) return unavailable();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return unavailable(400);
  }
  if (!isMicroDialogueTurnRequest(body)) return unavailable(400);
  const result = await continueMicroDialogueWithGemini(body, apiKey);
  return result ? Response.json(result) : unavailable();
}
