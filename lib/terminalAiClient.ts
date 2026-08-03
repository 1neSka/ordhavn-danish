import type {
  TerminalAssistantRequest,
  TerminalAssistantResponse,
} from "./terminalScenarioData.ts";

type TerminalAssistantFetch = (input: string, init?: RequestInit) => Promise<Response>;

function parseClientResponse(value: unknown): TerminalAssistantResponse | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<TerminalAssistantResponse>;
  if (payload.available !== true || typeof payload.answer !== "string" || !payload.answer.trim()) return null;
  if (payload.inputLanguage === "other") {
    return {
      available: true,
      inputLanguage: "other",
      answer: payload.answer.trim(),
      correctedPrompt: "",
      languageIssues: [],
      stageComplete: false,
      stageEvidence: "",
      evidenceCommand: "",
      evidenceOutput: "",
      model: typeof payload.model === "string" ? payload.model : null,
    };
  }
  const stageComplete = payload.stageComplete === true
    && typeof payload.stageEvidence === "string"
    && Boolean(payload.stageEvidence.trim())
    && typeof payload.evidenceCommand === "string"
    && Boolean(payload.evidenceCommand.trim())
    && typeof payload.evidenceOutput === "string"
    && Boolean(payload.evidenceOutput.trim());
  return {
    available: true,
    inputLanguage: "da",
    answer: payload.answer.trim(),
    correctedPrompt: typeof payload.correctedPrompt === "string" ? payload.correctedPrompt.trim() : "",
    languageIssues: Array.isArray(payload.languageIssues)
      ? payload.languageIssues.filter((issue) => issue
        && typeof issue.original === "string"
        && typeof issue.correction === "string"
        && typeof issue.explanation === "string")
      : [],
    stageComplete,
    stageEvidence: stageComplete ? payload.stageEvidence!.trim() : "",
    evidenceCommand: stageComplete ? payload.evidenceCommand!.trim() : "",
    evidenceOutput: stageComplete ? payload.evidenceOutput!.trim() : "",
    model: typeof payload.model === "string" ? payload.model : null,
  };
}

export async function askTerminalAssistant(
  request: TerminalAssistantRequest,
  fetcher: TerminalAssistantFetch = fetch,
) {
  try {
    const response = await fetcher("/api/gemini/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return parseClientResponse(await response.json());
  } catch {
    return null;
  }
}
