"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  FileText,
  Gavel,
  MessageSquareText,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { ScenarioRun } from "@/lib/scenarioData";
import {
  computeAuthorityMetrics,
  evaluateAuthorityScenario,
  prepareAuthorityPersuasion,
  type AuthorityAiPersuasionRequest,
  type AuthorityWorksheetSubmission,
  type AuthorityWorksheetValue,
} from "@/lib/authorityEngine";
import {
  authorityScenarioCases,
  type AuthorityScenarioCase,
  type AuthorityWorksheetField,
} from "@/lib/authorityScenarioData";

export interface AuthorityPersuasionProviderResult {
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  model?: string;
}

export interface AuthorityScenarioGameProps {
  initialCaseId?: string;
  runs: readonly ScenarioRun[];
  onStartAttempt?: (caseId: string) => boolean;
  onComplete: (run: ScenarioRun) => void;
  onExit: () => void;
  /** Omit this callback when Gemini is unavailable. The optional step then becomes a visible skip. */
  onEvaluatePersuasion?: (
    request: AuthorityAiPersuasionRequest,
  ) => Promise<AuthorityPersuasionProviderResult | null>;
}

function runId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `authority-${Date.now()}`;
}

const reliabilityLabel = {
  confirmed: "BEKRÆFTET",
  contested: "OMSTRIDT",
  interested: "PART I SAGEN",
} as const;

export default function AuthorityScenarioGame({
  initialCaseId,
  runs,
  onStartAttempt,
  onComplete,
  onExit,
  onEvaluatePersuasion,
}: AuthorityScenarioGameProps) {
  const [activeId, setActiveId] = useState<string | null>(initialCaseId ?? null);
  const solved = useMemo(
    () => new Set(runs.filter((run) => run.kind === "authority" && run.success).map((run) => run.caseId)),
    [runs],
  );

  if (!activeId) {
    return (
      <main className="authority-root">
        <style>{css}</style>
        <header className="authority-header">
          <button onClick={onExit} aria-label="Tilbage"><ArrowLeft size={19} /></button>
          <div>
            <span>MYNDIGHED MOD DATA</span>
            <h1>Modsigelseskammeret</h1>
            <p>Læs dokumenterne, gennemskue presset og træf den afgørelse, som tallene faktisk kan bære.</p>
          </div>
        </header>
        <section className="authority-catalog">
          {authorityScenarioCases.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setActiveId(scenario.id)}
              style={{ "--authority-accent": scenario.accent } as React.CSSProperties}
            >
              <div className="authority-card-seal"><Scale size={25} /></div>
              <span>NIVEAU {scenario.courseLevel} · {scenario.level}</span>
              <h2>{scenario.title}</h2>
              <p>{scenario.description}</p>
              <div className="authority-tone-row">
                {scenario.tones.map((tone) => <i key={tone}>{tone}</i>)}
              </div>
              <footer>
                {solved.has(scenario.id)
                  ? <><Check size={15} /> Afgjort</>
                  : <>Åbn sagsmappen <ChevronRight size={15} /></>}
              </footer>
            </button>
          ))}
        </section>
      </main>
    );
  }

  const scenario = authorityScenarioCases.find((candidate) => candidate.id === activeId);
  if (!scenario) return null;
  return (
    <AuthorityRunner
      key={scenario.id}
      scenario={scenario}
      onStartAttempt={onStartAttempt}
      onComplete={onComplete}
      onEvaluatePersuasion={onEvaluatePersuasion}
      onBack={() => initialCaseId ? onExit() : setActiveId(null)}
    />
  );
}

function AuthorityRunner({
  scenario,
  onStartAttempt,
  onComplete,
  onEvaluatePersuasion,
  onBack,
}: {
  scenario: AuthorityScenarioCase;
  onStartAttempt?: (caseId: string) => boolean;
  onComplete: (run: ScenarioRun) => void;
  onEvaluatePersuasion?: AuthorityScenarioGameProps["onEvaluatePersuasion"];
  onBack: () => void;
}) {
  const startedAt = useRef(new Date().toISOString());
  const [decisionId, setDecisionId] = useState("");
  const [worksheet, setWorksheet] = useState<Record<string, AuthorityWorksheetValue>>({});
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [monologue, setMonologue] = useState("");
  const [aiState, setAiState] = useState<"idle" | "loading" | "skipped" | "received" | "error">("idle");
  const [aiFeedback, setAiFeedback] = useState("");
  const metrics = useMemo(() => computeAuthorityMetrics(scenario), [scenario]);
  const evaluation = evaluateAuthorityScenario(scenario, {
    decisionId,
    worksheet: worksheet as AuthorityWorksheetSubmission,
  });

  useEffect(() => {
    onStartAttempt?.(scenario.id);
  }, [onStartAttempt, scenario.id]);

  function changeDecision(nextId: string) {
    setDecisionId(nextId);
    setChecked(false);
    setAiState("idle");
    setAiFeedback("");
  }

  async function askForPersuasionFeedback() {
    const prepared = prepareAuthorityPersuasion(
      scenario,
      { decisionId, worksheet },
      monologue,
      Boolean(onEvaluatePersuasion),
    );
    if (prepared.status === "skipped") {
      setAiState("skipped");
      setAiFeedback(
        prepared.reason === "ai-unavailable"
          ? "AI-forbindelsen er ikke tilgængelig. Sagen er allerede løst, så du kan springe dette over."
          : prepared.reason === "not-requested"
            ? "Skriv kun en tale, hvis du vil prøve den valgfrie overtalelse."
            : prepared.reason === "submission-too-short"
              ? `Teksten skal have mindst ${scenario.aiPolicy.minimumWords} ord for at blive sendt.`
              : "Den valgfrie tale åbner først efter en gyldig afgørelse.",
      );
      return;
    }
    if (!onEvaluatePersuasion) return;
    setAiState("loading");
    try {
      const response = await onEvaluatePersuasion(prepared.request);
      if (!response) {
        setAiState("skipped");
        setAiFeedback("AI-forbindelsen svarede ikke. Din deterministiske afgørelse er stadig godkendt.");
        return;
      }
      setAiState("received");
      setAiFeedback(response.feedback);
    } catch {
      setAiState("error");
      setAiFeedback("AI-feedback kunne ikke hentes. Det ændrer ikke sagens resultat.");
    }
  }

  function finish() {
    if (!evaluation.success || completed) return;
    const selected = scenario.decisions.find((decision) => decision.id === decisionId);
    if (!selected) return;
    const endedAt = new Date().toISOString();
    onComplete({
      id: runId(),
      kind: "authority",
      caseId: scenario.id,
      title: scenario.title,
      level: scenario.level === "A2+" ? "A2" : scenario.level,
      startedAt: startedAt.current,
      endedAt,
      success: true,
      score: 480,
      maxScore: 480,
      path: [scenario.id, decisionId],
      decisions: [{
        stepId: "authority-decision",
        answerId: selected.id,
        answerText: selected.label,
        correct: true,
      }],
      metadata: {
        pathLevel: scenario.courseLevel,
        worksheetAttempted: evaluation.worksheet.attempted,
        worksheetScore: evaluation.worksheet.score,
        persuasionStatus: aiState,
        deterministic: true,
      },
    });
    setCompleted(true);
  }

  return (
    <main className="authority-root authority-runner" style={{ "--authority-accent": scenario.accent } as React.CSSProperties}>
      <style>{css}</style>
      <header className="authority-header">
        <button onClick={onBack} aria-label="Tilbage til sager"><ArrowLeft size={19} /></button>
        <div>
          <span>{scenario.eyebrow} · {scenario.level}</span>
          <h1>{scenario.title}</h1>
          <p>{scenario.setting} · {scenario.role}</p>
        </div>
      </header>

      <div className="authority-layout">
        <aside className="authority-dossier">
          <section className="authority-objective">
            <ShieldCheck size={20} />
            <span>DIN OPGAVE</span>
            <p>{scenario.playerObjective}</p>
          </section>
          <section className="authority-pressure">
            <Gavel size={20} />
            <span>INSTITUTIONELT PRES</span>
            <p>{scenario.institutionalDemand}</p>
          </section>
          <section>
            <span>SAGSRESUMÉ</span>
            <p>{scenario.brief}</p>
          </section>
          <details>
            <summary>Miniordbog</summary>
            {scenario.glossary.map((entry) => <p key={entry.danish}><b>{entry.danish}</b> — {entry.english}</p>)}
          </details>
        </aside>

        <section className="authority-casework">
          <div className="authority-documents">
            {scenario.sourceDocuments.map((document) => (
              <article key={document.id} className={`reliability-${document.reliability}`}>
                <header><FileText size={15} /><span>{document.kind}</span><i>{reliabilityLabel[document.reliability]}</i></header>
                <h3>{document.title}</h3>
                <p>{document.body}</p>
                <small>{document.source}</small>
              </article>
            ))}
          </div>

          <details className="authority-worksheet">
            <summary><BarChart3 size={16} /> Valgfrit regneark <em>påvirker ikke godkendelsen</em></summary>
            <p>{scenario.worksheet.introduction}</p>
            <strong>{scenario.worksheet.optionalNotice}</strong>
            <div>
              {scenario.worksheet.fields.map((field) => (
                <WorksheetField
                  key={field.id}
                  field={field}
                  value={worksheet[field.id]}
                  checked={checked}
                  correct={evaluation.worksheet.fields.find((result) => result.fieldId === field.id)?.correct ?? false}
                  onChange={(value) => setWorksheet((old) => ({ ...old, [field.id]: value }))}
                />
              ))}
            </div>
          </details>

          <section className="authority-decision">
            <span>DIN AFGØRELSE</span>
            <h2>Hvad kan beviserne bære?</h2>
            <div>
              {scenario.decisions.map((decision) => (
                <button
                  key={decision.id}
                  className={decisionId === decision.id ? "selected" : ""}
                  onClick={() => changeDecision(decision.id)}
                >
                  <i>{decisionId === decision.id ? <Check size={14} /> : null}</i>
                  <span><b>{decision.label}</b><small>{decision.rationale}</small></span>
                </button>
              ))}
            </div>
            <button className="authority-check" disabled={!decisionId} onClick={() => setChecked(true)}>
              Kontrollér afgørelse
            </button>
          </section>

          {checked && (
            <section className={`authority-verdict ${evaluation.success ? "good" : "bad"}`}>
              <header>{evaluation.success ? <ShieldCheck size={23} /> : <Gavel size={23} />}<div><span>{evaluation.success ? "AFGØRELSEN HOLDER" : "AFGØRELSEN HOLDER IKKE"}</span><h2>{evaluation.success ? "Data slår pres." : "Læs nævner, grænse og konsekvens igen."}</h2></div></header>
              {evaluation.success
                ? <p>{evaluation.ruleExplanations.join(" ")}</p>
                : <p>Den valgte løsning følger ikke den autoritative beregning. Regnearket er stadig valgfrit; det er selve beslutningen, der skal stemme med dokumenterne.</p>}
              <div className="authority-metrics">
                {scenario.metrics.map((metric) => (
                  <article key={metric.id}>
                    <span>{metric.label}</span>
                    <b>{formatMetric(metrics[metric.id], metric.decimals)} {metric.unit}</b>
                    <p>{metric.explanation}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {checked && evaluation.success && (
            <section className="authority-persuasion">
              <header><MessageSquareText size={21} /><div><span>VALGFRI FINALE</span><h2>Overtal magten</h2></div></header>
              <p>Skriv en kort dansk tale til {scenario.aiPolicy.audience}. AI-feedback kan nuancere retorikken, men kan hverken ændre facit eller blokere sagen.</p>
              <small>Skjult retorisk mål: {scenario.aiPolicy.hiddenGoal}</small>
              <textarea
                value={monologue}
                onChange={(event) => setMonologue(event.target.value)}
                maxLength={scenario.aiPolicy.maximumCharacters}
                placeholder={`Mindst ${scenario.aiPolicy.minimumWords} ord · helt valgfrit`}
              />
              <footer>
                <button onClick={askForPersuasionFeedback} disabled={aiState === "loading"}>
                  {aiState === "loading" ? "Sender …" : onEvaluatePersuasion ? "Få AI-feedback" : "Kontrollér AI-status"}
                </button>
                <button className="authority-finish" onClick={finish} disabled={completed}>
                  {completed ? "Sagen er registreret" : "Afslut sag uden at vente"}
                </button>
              </footer>
              {aiFeedback && <div className={`authority-ai-feedback ${aiState}`}>{aiFeedback}</div>}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function WorksheetField({
  field,
  value,
  checked,
  correct,
  onChange,
}: {
  field: AuthorityWorksheetField;
  value: AuthorityWorksheetValue | undefined;
  checked: boolean;
  correct: boolean;
  onChange: (value: AuthorityWorksheetValue) => void;
}) {
  const className = checked && value !== undefined ? correct ? "correct" : "incorrect" : "";
  if (field.kind === "number") {
    return (
      <label className={className}>
        <span>{field.label} <em>{field.unit}</em></span>
        <input value={typeof value === "number" || typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} inputMode="decimal" />
      </label>
    );
  }
  return (
    <label className={className}>
      <span>{field.label}</span>
      <select value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Vælg …</option>
        {field.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function formatMetric(value: number, decimals = 2) {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: decimals }).format(value);
}

const css = `
.authority-root{--authority-accent:#b394ff;min-height:100%;padding:28px;background:radial-gradient(circle at 84% 3%,color-mix(in srgb,var(--authority-accent) 12%,transparent),transparent 34%),var(--paper);color:var(--ink)}
.authority-header{display:flex;align-items:center;gap:16px;max-width:1280px;margin:0 auto 24px}.authority-header>button{width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--line);border-radius:13px;background:var(--surface);color:var(--ink)}.authority-header span{font-size:9px;letter-spacing:.13em;color:var(--authority-accent);font-weight:850}.authority-header h1{margin:4px 0;font-size:30px}.authority-header p{margin:0;color:var(--muted);font-size:11px}
.authority-catalog{max-width:1200px;margin:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.authority-catalog>button{text-align:left;min-height:245px;padding:24px;border:1px solid var(--line);border-radius:21px;background:linear-gradient(135deg,var(--surface),color-mix(in srgb,var(--authority-accent) 8%,var(--surface)));color:var(--ink)}.authority-card-seal{width:47px;height:47px;display:grid;place-items:center;border-radius:14px;background:color-mix(in srgb,var(--authority-accent) 18%,var(--surface));color:var(--authority-accent)}.authority-catalog>button>span{display:block;margin:16px 0 5px;color:var(--authority-accent);font-size:8px;font-weight:800;letter-spacing:.11em}.authority-catalog h2{margin:0}.authority-catalog p{min-height:52px;color:var(--muted);font-size:10px;line-height:1.55}.authority-tone-row{display:flex;gap:5px}.authority-tone-row i{padding:4px 7px;border:1px solid var(--line);border-radius:99px;color:var(--muted);font-size:8px;font-style:normal}.authority-catalog footer{display:flex;align-items:center;gap:6px;margin-top:16px;color:var(--authority-accent);font-size:10px;font-weight:800}
.authority-layout{max-width:1380px;margin:auto;display:grid;grid-template-columns:340px minmax(0,1fr);gap:18px}.authority-dossier{display:grid;align-content:start;gap:11px;position:sticky;top:18px}.authority-dossier>section,.authority-dossier>details{padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}.authority-dossier section>svg{float:right;color:var(--authority-accent)}.authority-dossier span{font-size:8px;color:var(--authority-accent);font-weight:850;letter-spacing:.1em}.authority-dossier p{font-size:10px;line-height:1.6;color:var(--muted)}.authority-objective{border-color:color-mix(in srgb,var(--authority-accent) 45%,var(--line))!important}.authority-objective p{color:var(--ink);font-weight:700}.authority-pressure{background:linear-gradient(145deg,var(--surface),color-mix(in srgb,#e46f68 8%,var(--surface)))!important}.authority-pressure svg,.authority-pressure span{color:#e88378!important}.authority-dossier summary{cursor:pointer;font-size:10px;font-weight:800}.authority-dossier details b{color:var(--ink)}
.authority-casework{display:grid;align-content:start;gap:14px}.authority-documents{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.authority-documents article{padding:17px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.authority-documents article>header{display:flex;align-items:center;gap:6px;color:var(--authority-accent)}.authority-documents article>header span{font-size:8px;text-transform:uppercase}.authority-documents article>header i{margin-left:auto;padding:3px 6px;border-radius:5px;background:color-mix(in srgb,var(--authority-accent) 12%,var(--surface));font-size:7px;font-style:normal}.authority-documents .reliability-interested>header{color:#e88378}.authority-documents h3{margin:12px 0 7px;font-size:14px}.authority-documents p{min-height:34px;margin:0;color:var(--muted);font-size:10px;line-height:1.5}.authority-documents small{display:block;margin-top:10px;color:var(--authority-accent);font-size:8px}
.authority-worksheet{padding:16px;border:1px dashed color-mix(in srgb,var(--authority-accent) 55%,var(--line));border-radius:14px;background:color-mix(in srgb,var(--authority-accent) 4%,var(--surface))}.authority-worksheet summary{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:10px;font-weight:850}.authority-worksheet summary em{margin-left:auto;color:var(--authority-accent);font-size:8px;font-style:normal}.authority-worksheet>p,.authority-worksheet>strong{display:block;color:var(--muted);font-size:9px;line-height:1.5}.authority-worksheet>strong{color:var(--authority-accent)}.authority-worksheet>div{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:13px}.authority-worksheet label{display:grid;gap:6px}.authority-worksheet label span{font-size:9px}.authority-worksheet label em{color:var(--authority-accent)}.authority-worksheet input,.authority-worksheet select{height:42px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink)}.authority-worksheet label.correct input,.authority-worksheet label.correct select{border-color:#55c6a7}.authority-worksheet label.incorrect input,.authority-worksheet label.incorrect select{border-color:#df776e}
.authority-decision{padding:22px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.authority-decision>span,.authority-verdict header span,.authority-persuasion header span{color:var(--authority-accent);font-size:8px;font-weight:850;letter-spacing:.11em}.authority-decision h2{margin:5px 0 15px}.authority-decision>div{display:grid;gap:8px}.authority-decision>div>button{display:grid;grid-template-columns:25px 1fr;gap:10px;text-align:left;padding:13px;border:1px solid var(--line);border-radius:11px;background:var(--paper);color:var(--ink)}.authority-decision>div>button.selected{border-color:var(--authority-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--authority-accent) 17%,transparent)}.authority-decision button i{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:color-mix(in srgb,var(--authority-accent) 16%,var(--surface));color:var(--authority-accent)}.authority-decision button span{display:grid;gap:4px}.authority-decision button small{color:var(--muted);font-size:9px}.authority-check{margin-top:14px;padding:11px 15px;border:0;border-radius:9px;background:var(--authority-accent);color:#171420;font-weight:850}.authority-check:disabled{opacity:.35}
.authority-verdict,.authority-persuasion{padding:21px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.authority-verdict.good{border-color:color-mix(in srgb,#5fc7a9 50%,var(--line))}.authority-verdict.bad{border-color:color-mix(in srgb,#e77b70 50%,var(--line))}.authority-verdict>header,.authority-persuasion>header{display:flex;gap:10px;align-items:center}.authority-verdict.good>header>svg{color:#5fc7a9}.authority-verdict.bad>header>svg{color:#e77b70}.authority-verdict h2,.authority-persuasion h2{margin:3px 0}.authority-verdict>p,.authority-persuasion>p{color:var(--muted);font-size:10px;line-height:1.55}.authority-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:14px}.authority-metrics article{padding:13px;border-radius:11px;background:var(--paper)}.authority-metrics span{display:block;color:var(--muted);font-size:8px}.authority-metrics b{display:block;margin:5px 0;color:var(--authority-accent);font-size:17px}.authority-metrics p{margin:0;color:var(--muted);font-size:8px;line-height:1.45}
.authority-persuasion>header>svg{color:var(--authority-accent)}.authority-persuasion>small{display:block;color:var(--authority-accent);font-size:9px}.authority-persuasion textarea{width:100%;min-height:110px;margin:13px 0;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);resize:vertical}.authority-persuasion footer{display:flex;justify-content:space-between;gap:10px}.authority-persuasion button{padding:10px 13px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font-weight:800}.authority-persuasion .authority-finish{border:0;background:var(--authority-accent);color:#171420}.authority-persuasion button:disabled{opacity:.45}.authority-ai-feedback{margin-top:12px;padding:12px;border-radius:9px;background:var(--paper);color:var(--muted);font-size:9px;line-height:1.5}.authority-ai-feedback.received{border-left:3px solid #5fc7a9}.authority-ai-feedback.error{border-left:3px solid #e77b70}
@media(max-width:980px){.authority-layout{grid-template-columns:1fr}.authority-dossier{position:static}.authority-catalog,.authority-documents{grid-template-columns:1fr}.authority-root{padding:16px}}@media(max-width:620px){.authority-worksheet>div,.authority-metrics{grid-template-columns:1fr}.authority-persuasion footer{flex-direction:column}}
`;
