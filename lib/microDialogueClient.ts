import type { MicroDialogueTurnRequest, MicroDialogueTurnResult } from "./microDialogueAi.ts";

const unavailable: MicroDialogueTurnResult = {
  available: false,
  reply: "",
  disposition: "guarded",
  model: null,
};

export async function continueMicroDialogue(request: MicroDialogueTurnRequest): Promise<MicroDialogueTurnResult> {
  try {
    const response = await fetch("/api/gemini/micro-dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json() as Partial<MicroDialogueTurnResult>;
    if (!payload.available || typeof payload.reply !== "string" || !payload.reply.trim()) return unavailable;
    const disposition = ["open", "guarded", "defensive", "hostile"].includes(payload.disposition ?? "")
      ? payload.disposition as MicroDialogueTurnResult["disposition"]
      : "guarded";
    return {
      available: true,
      reply: payload.reply.trim(),
      disposition,
      model: typeof payload.model === "string" ? payload.model : null,
    };
  } catch {
    return unavailable;
  }
}
