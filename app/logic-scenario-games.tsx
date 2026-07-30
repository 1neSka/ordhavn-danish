"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardPen,
  Grid3X3,
  Languages,
  RadioTower,
  Send,
  Sparkles,
  TimerReset,
} from "lucide-react";
import {
  createLogicEvaluationRequest,
  evaluateConstraintAssignment,
  evaluateLogicSubmissionOffline,
  evaluateMeaningSelection,
  logicScenarioCards,
  logicScenarioEngines,
  logicScenarioRegistry,
  LOGIC_SUBMISSION_MAX_CHARS,
  type ConstraintGridScenario,
  type LogicEvaluationRequest,
  type LogicEvaluationResult,
  type LogicScenario,
  type LogicScenarioId,
  type MeaningEditorScenario,
} from "@/lib/logicScenarioData";

export interface LogicScenarioRun {
  id: string;
  kind: "logic";
  caseId: LogicScenarioId;
  title: string;
  level: "B1" | "B2";
  startedAt: string;
  endedAt: string;
  success: boolean;
  score: number;
  maxScore: number;
  path: string[];
  decisions: Array<{
    stepId: string;
    answerId: string;
    answerText: string;
    correct: boolean | null;
  }>;
  metadata: Record<string, string | number | boolean | string[]>;
}

export type LogicEvaluationCallback = (request: LogicEvaluationRequest) => Promise<LogicEvaluationResult>;

export interface LogicScenarioHubProps {
  runs?: readonly LogicScenarioRun[];
  initialScenarioId?: LogicScenarioId;
  onComplete: (run: LogicScenarioRun) => void;
  onEvaluate?: LogicEvaluationCallback;
  onStartAttempt?: (caseId: string) => boolean;
  onExit?: () => void;
}

export interface LogicScenarioRunnerProps {
  scenarioId: LogicScenarioId;
  onComplete: (run: LogicScenarioRun) => void;
  onEvaluate?: LogicEvaluationCallback;
  onBack: () => void;
  firstAttemptEligible?: boolean;
}

export const logicScenarioIntegration = {
  cards: logicScenarioCards,
  registry: logicScenarioRegistry,
  engines: logicScenarioEngines,
  ids: logicScenarioCards.map((card) => card.id),
} as const;

function makeRunId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `logic-${Date.now()}`;
}

function clampEvaluation(result: LogicEvaluationResult, fallback: LogicEvaluationResult): LogicEvaluationResult {
  if (!result.available || !Number.isFinite(result.score)) return fallback;
  return {
    available: true,
    score: Math.max(0, Math.min(1, result.score)),
    verdict: result.verdict || fallback.verdict,
    feedback: result.feedback || fallback.feedback,
    strengths: result.strengths?.length ? result.strengths : fallback.strengths,
    improvements: result.improvements?.length ? result.improvements : fallback.improvements,
    model: result.model ?? "sprogvurdering",
  };
}

async function evaluateWithFallback(
  scenario: LogicScenario,
  submission: string,
  onEvaluate?: LogicEvaluationCallback,
) {
  const fallback = evaluateLogicSubmissionOffline(scenario, submission);
  if (!onEvaluate) return fallback;
  try {
    return clampEvaluation(await onEvaluate(createLogicEvaluationRequest(scenario, submission)), fallback);
  } catch {
    return fallback;
  }
}

export function LogicScenarioHub({
  runs = [],
  initialScenarioId,
  onComplete,
  onEvaluate,
  onStartAttempt,
  onExit,
}: LogicScenarioHubProps) {
  const [activeId, setActiveId] = useState<LogicScenarioId | null>(initialScenarioId ?? null);
  const [firstAttemptEligible, setFirstAttemptEligible] = useState(
    initialScenarioId ? !runs.some((run) => run.caseId === initialScenarioId) : false,
  );
  const directAttemptClaimed = useRef(false);
  const completed = useMemo(() => new Set(runs.filter((run) => run.success).map((run) => run.caseId)), [runs]);
  const attempted = useMemo(() => new Set(runs.map((run) => run.caseId)), [runs]);

  useEffect(() => {
    if (!initialScenarioId || directAttemptClaimed.current) return;
    directAttemptClaimed.current = true;
    setFirstAttemptEligible(onStartAttempt?.(initialScenarioId) ?? !attempted.has(initialScenarioId));
  }, [attempted, initialScenarioId, onStartAttempt]);

  if (activeId) {
    return (
      <LogicScenarioRunner
        scenarioId={activeId}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
        firstAttemptEligible={firstAttemptEligible}
        onBack={() => initialScenarioId ? onExit?.() : setActiveId(null)}
      />
    );
  }

  return (
    <main className="logic-root">
      <style>{logicScenarioCss}</style>
      <header className="logic-topbar">
        <div>
          {onExit && <button onClick={onExit} aria-label="Tilbage"><ArrowLeft size={19} /></button>}
          <span><strong>Logiklaboratoriet</strong><small>Dansk som arbejdsredskab · B1–B2</small></span>
        </div>
        <span className="logic-counter"><Braces size={16} /> 2 motorer · {logicScenarioCards.length} sager</span>
      </header>

      <section className="logic-hero">
        <span>SPROGET STYRER SYSTEMET</span>
        <h1>Læs som en operatør.<br />Beslut som en detektiv.</h1>
        <p>Her er dansk ikke pynt omkring en gåde. Et lille ord som <b>medmindre</b>, <b>først</b> eller <b>kun</b> ændrer selve løsningen.</p>
      </section>

      {logicScenarioEngines.map((engine, engineIndex) => (
        <section className="logic-engine" key={engine.id}>
          <div className="logic-engine-heading">
            <span>{engineIndex === 0 ? <Grid3X3 /> : <ClipboardPen />}</span>
            <div><small>MOTOR {engineIndex + 1}</small><h2>{engine.title}</h2><p>{engine.description}</p></div>
          </div>
          <div className="logic-card-grid">
            {engine.scenarioIds.map((id, index) => {
              const card = logicScenarioRegistry[id];
              const solved = completed.has(id);
              return (
                <button
                  className="logic-card"
                  key={id}
                  style={{ "--logic-accent": card.accent } as React.CSSProperties}
                  onClick={() => {
                    setFirstAttemptEligible(onStartAttempt?.(id) ?? !attempted.has(id));
                    setActiveId(id);
                  }}
                >
                  <span className="logic-card-index">0{index + 1}</span>
                  <span className="logic-pill">{card.level}</span>
                  <small>{card.eyebrow}</small>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <footer><span><TimerReset size={15} /> {card.estimatedMinutes} min.</span><strong>{solved ? <><Check size={15} /> Løst</> : <>Åbn <ChevronRight size={15} /></>}</strong></footer>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

export function LogicScenarioRunner({
  scenarioId,
  onComplete,
  onEvaluate,
  onBack,
  firstAttemptEligible = false,
}: LogicScenarioRunnerProps) {
  const scenario = logicScenarioRegistry[scenarioId];
  const [phase, setPhase] = useState<"logic" | "report" | "result">("logic");
  const [logicAttempts, setLogicAttempts] = useState(0);
  const [logicSolved, setLogicSolved] = useState(false);
  const [submission, setSubmission] = useState("");
  const [evaluation, setEvaluation] = useState<LogicEvaluationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());

  async function submitReport() {
    if (busy || submission.trim().length < 12) return;
    setBusy(true);
    const result = await evaluateWithFallback(scenario, submission, onEvaluate);
    setEvaluation(result);
    setPhase("result");
    setBusy(false);
  }

  function finishRun() {
    if (!evaluation) return;
    const firstAttemptSuccess = firstAttemptEligible && logicAttempts === 1 && evaluation.score >= 0.72;
    onComplete({
      id: makeRunId(), kind: "logic", caseId: scenario.id, title: scenario.title, level: scenario.level,
      startedAt, endedAt: new Date().toISOString(), success: logicSolved && evaluation.score >= 0.62,
      score: Math.round(400 + evaluation.score * 600), maxScore: 1000,
      path: [scenario.engine, "logik", "formulering"],
      decisions: [{ stepId: "logic", answerId: logicSolved ? "solved" : "unsolved", answerText: `${logicAttempts} forsøg`, correct: logicSolved }],
      metadata: {
        engine: scenario.engine,
        logicAttempts,
        firstAttemptEligible,
        firstAttemptSuccess,
        evaluationModel: evaluation.model ?? "lokal",
        evaluationAvailable: evaluation.available,
        reportScore: evaluation.score,
      },
    });
  }

  return (
    <main className="logic-root logic-runner-root">
      <style>{logicScenarioCss}</style>
      <header className="logic-topbar">
        <div><button onClick={onBack} aria-label="Tilbage"><ArrowLeft size={19} /></button><span><strong>{scenario.title}</strong><small>{scenario.eyebrow}</small></span></div>
        <span className="logic-counter">{scenario.level} · {phase === "logic" ? "Logik" : phase === "report" ? "Formulering" : "Resultat"}</span>
      </header>
      <div className="logic-progress" aria-label="Fremskridt"><i className={phase !== "logic" ? "done" : "active"}>1</i><span /><i className={phase === "result" ? "done" : phase === "report" ? "active" : ""}>2</i><span /><i className={phase === "result" ? "active" : ""}>3</i></div>

      {phase === "logic" && scenario.engine === "constraint-grid" && (
        <ConstraintGridPlayer scenario={scenario} onSolved={(attempts) => { setLogicAttempts(attempts); setLogicSolved(true); setPhase("report"); }} />
      )}
      {phase === "logic" && scenario.engine === "meaning-editor" && (
        <MeaningEditorPlayer scenario={scenario} onSolved={(attempts) => { setLogicAttempts(attempts); setLogicSolved(true); setPhase("report"); }} />
      )}
      {phase === "report" && (
        <ReportEditor scenario={scenario} submission={submission} onChange={setSubmission} onSubmit={submitReport} busy={busy} />
      )}
      {phase === "result" && evaluation && (
        <ResultPanel scenario={scenario} evaluation={evaluation} firstAttempt={firstAttemptEligible && logicAttempts === 1} onFinish={finishRun} />
      )}
    </main>
  );
}

function Glossary({ scenario }: { scenario: LogicScenario }) {
  return (
    <details className="logic-glossary">
      <summary><Languages size={16} /> Ordliste / translation</summary>
      <p className="logic-translation"><b>{scenario.title}</b> — {scenario.translation}</p>
      <dl>{scenario.glossary.map((entry) => <div key={entry.danish}><dt>{entry.danish}</dt><dd>{entry.english}</dd></div>)}</dl>
    </details>
  );
}

function ConstraintGridPlayer({ scenario, onSolved }: { scenario: ConstraintGridScenario; onSolved: (attempts: number) => void }) {
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [activeSubject, setActiveSubject] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");

  function selectSlot(slotId: string) {
    const subject = scenario.subjects[activeSubject];
    setAssignment((current) => {
      const next = { ...current };
      for (const [otherSubject, selectedSlot] of Object.entries(next)) if (selectedSlot === slotId) delete next[otherSubject];
      next[subject.id] = slotId;
      return next;
    });
    setActiveSubject((current) => Math.min(scenario.subjects.length - 1, current + 1));
    setMessage("");
  }

  function check() {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const result = evaluateConstraintAssignment(scenario, assignment);
    if (result.success) onSolved(nextAttempts);
    else setMessage(`${result.correctSubjects} af ${result.totalSubjects} placeringer passer. Læs især relationsordene igen.`);
  }

  function keyboard(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key >= "1" && event.key <= String(scenario.slots.length)) {
      event.preventDefault(); selectSlot(scenario.slots[Number(event.key) - 1].id);
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault(); setActiveSubject((current) => (current + 1) % scenario.subjects.length);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault(); setActiveSubject((current) => (current - 1 + scenario.subjects.length) % scenario.subjects.length);
    } else if (event.key === "Enter") {
      event.preventDefault(); check();
    }
  }

  return (
    <section className="logic-stage" tabIndex={0} onKeyDown={keyboard} aria-label="Fordelingsmatrix">
      <div className="logic-brief"><span><RadioTower size={22} /></span><div><small>OPGAVE</small><h1>{scenario.brief}</h1><p>Vælg en række og tildel en plads. Hver plads må kun bruges én gang.</p></div></div>
      <div className="logic-workspace">
        <aside className="logic-clues"><h2>Driftsmeldinger</h2>{scenario.clues.map((clue, index) => <article key={clue.id}><b>{index + 1}</b><p>{clue.text}</p><span>{clue.focus}</span></article>)}<Glossary scenario={scenario} /></aside>
        <div className="logic-grid-panel">
          <div className="logic-subject-tabs" style={{ "--logic-columns": scenario.subjects.length } as React.CSSProperties}>{scenario.subjects.map((subject, index) => <button className={activeSubject === index ? "active" : ""} onClick={() => setActiveSubject(index)} key={subject.id}><b>{subject.label}</b><small>{subject.detail}</small></button>)}</div>
          <div className="logic-matrix" style={{ "--logic-columns": scenario.slots.length } as React.CSSProperties}>
            <span />{scenario.slots.map((slot, index) => <b key={slot.id}>{index + 1}<small>{slot.label}</small></b>)}
            {scenario.subjects.map((subject) => <div className="logic-matrix-row" key={subject.id}><strong>{subject.label}</strong>{scenario.slots.map((slot) => <button key={slot.id} aria-label={`${subject.label}: ${slot.label}`} className={assignment[subject.id] === slot.id ? "selected" : ""} onClick={() => { setActiveSubject(scenario.subjects.findIndex((item) => item.id === subject.id)); selectSlotForSubject(subject.id, slot.id, setAssignment); }}><i /></button>)}</div>)}
          </div>
          <p className="logic-keyhint">Tast 1–{scenario.slots.length} for plads · piletaster for række · Enter for kontrol</p>
          {message && <p className="logic-error"><CircleAlert size={17} /> {message}</p>}
          <button className="logic-primary" disabled={Object.keys(assignment).length !== scenario.subjects.length} onClick={check}>Kontrollér fordelingen <ArrowRight size={18} /></button>
        </div>
      </div>
    </section>
  );
}

function selectSlotForSubject(subjectId: string, slotId: string, setter: React.Dispatch<React.SetStateAction<Record<string, string>>>) {
  setter((current) => {
    const next = { ...current };
    for (const [otherSubject, selectedSlot] of Object.entries(next)) if (selectedSlot === slotId) delete next[otherSubject];
    next[subjectId] = slotId;
    return next;
  });
}

function MeaningEditorPlayer({ scenario, onSolved }: { scenario: MeaningEditorScenario; onSolved: (attempts: number) => void }) {
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [activeSlot, setActiveSlot] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);
  const result = evaluateMeaningSelection(scenario, selection);

  function choose(choiceId: string) {
    setSelection((current) => ({ ...current, [scenario.slots[activeSlot].id]: choiceId }));
    setActiveSlot((current) => Math.min(scenario.slots.length - 1, current + 1));
    setChecked(false);
  }

  function check() {
    const nextAttempts = attempts + 1; setAttempts(nextAttempts); setChecked(true);
    if (result.success) onSolved(nextAttempts);
  }

  function keyboard(event: React.KeyboardEvent<HTMLElement>) {
    const choices = scenario.slots[activeSlot].choices;
    if (event.key >= "1" && event.key <= String(choices.length)) {
      event.preventDefault(); choose(choices[Number(event.key) - 1].id);
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault(); setActiveSlot((current) => (current + 1) % scenario.slots.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault(); setActiveSlot((current) => (current - 1 + scenario.slots.length) % scenario.slots.length);
    } else if (event.key === "Enter") { event.preventDefault(); check(); }
  }

  const slot = scenario.slots[activeSlot];
  return (
    <section className="logic-stage" tabIndex={0} onKeyDown={keyboard} aria-label="Betydningsredaktør">
      <div className="logic-source"><small>{scenario.sourceLabel}</small><blockquote>{scenario.sourceMessage}</blockquote><p>{scenario.assignment}</p></div>
      <div className="logic-editor-layout">
        <aside className="logic-traps"><h2>Betydningsfælder</h2>{scenario.traps.map((trap) => <p key={trap}><CircleAlert size={15} /> {trap}</p>)}<Glossary scenario={scenario} /></aside>
        <div className="logic-editor">
          <nav>{scenario.slots.map((candidate, index) => <button className={activeSlot === index ? "active" : selection[candidate.id] ? "filled" : ""} onClick={() => setActiveSlot(index)} key={candidate.id}><span>{index + 1}</span>{candidate.label}</button>)}</nav>
          <small>REDAKTØRSPØRGSMÅL</small><h2>{slot.question}</h2>
          <div className="logic-choice-list">{slot.choices.map((choice, index) => {
            const selected = selection[slot.id] === choice.id;
            return <button key={choice.id} className={selected ? "selected" : ""} onClick={() => choose(choice.id)}><kbd>{index + 1}</kbd><span>{choice.text}{checked && selected && <small>{choice.explanation}</small>}</span></button>;
          })}</div>
          <div className="logic-preview"><small>DIT UDKAST</small><p>{result.assembled}</p></div>
          {checked && !result.success && <p className="logic-error"><CircleAlert size={17} /> {result.correctSlots} af {result.totalSlots} betydningsled er bevaret. Se forklaringen under dine valg.</p>}
          <p className="logic-keyhint">Tast 1–3 for formulering · piletaster for led · Enter for kontrol</p>
          <button className="logic-primary" disabled={Object.keys(selection).length !== scenario.slots.length} onClick={check}>Kontrollér betydningen <ArrowRight size={18} /></button>
        </div>
      </div>
    </section>
  );
}

function ReportEditor({ scenario, submission, onChange, onSubmit, busy }: { scenario: LogicScenario; submission: string; onChange: (value: string) => void; onSubmit: () => void; busy: boolean }) {
  const words = submission.trim().split(/\s+/u).filter(Boolean).length;
  return (
    <section className="logic-stage logic-report">
      <div className="logic-report-copy"><span><Sparkles size={24} /></span><small>FRI PRODUKTION</small><h1>Logikken holder. Kan sproget også holde?</h1><p>{scenario.report.prompt}</p><ul>{scenario.report.requiredFacts.map((fact) => <li key={fact}><Check size={15} /> {fact}</li>)}</ul><Glossary scenario={scenario} /></div>
      <div className="logic-paper"><label htmlFor="logic-report">Din danske tekst</label><textarea id="logic-report" autoFocus maxLength={LOGIC_SUBMISSION_MAX_CHARS} value={submission} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") onSubmit(); }} placeholder="Skriv en præcis meddelelse…" /><footer><span className={words >= scenario.report.minimumWords ? "ready" : ""}>{words} / {scenario.report.minimumWords} ord</span><button className="logic-primary" disabled={busy || words < 12} onClick={onSubmit}>{busy ? "Vurderer…" : "Send til vurdering"} <Send size={17} /></button></footer><p className="logic-keyhint">Ctrl + Enter sender teksten</p></div>
    </section>
  );
}

function ResultPanel({ scenario, evaluation, firstAttempt, onFinish }: { scenario: LogicScenario; evaluation: LogicEvaluationResult; firstAttempt: boolean; onFinish: () => void }) {
  return (
    <section className="logic-result">
      <div className="logic-score-ring" style={{ "--logic-score": `${Math.round(evaluation.score * 360)}deg`, "--logic-accent": scenario.accent } as React.CSSProperties}><span>{Math.round(evaluation.score * 100)}<small>/100</small></span></div>
      <small>{evaluation.model === "deterministic-logic-rubric-v1" ? "LOKAL VURDERING" : "SPROGVURDERING"}</small><h1>{evaluation.verdict}</h1><p>{evaluation.feedback}</p>
      {firstAttempt && evaluation.score >= 0.72 && <div className="logic-first"><Sparkles size={17} /> Første forsøg bevaret — kvalificeret til førstegangsbonus.</div>}
      <div className="logic-feedback-grid"><article><h2>Det virker</h2>{evaluation.strengths.map((item) => <p key={item}><Check size={15} /> {item}</p>)}</article><article><h2>Næste forbedring</h2>{evaluation.improvements.length ? evaluation.improvements.map((item) => <p key={item}><CircleAlert size={15} /> {item}</p>) : <p><Check size={15} /> Alle betydningskrav er tydelige.</p>}</article></div>
      <button className="logic-primary" onClick={onFinish}>Afslut sagen <ArrowRight size={18} /></button>
    </section>
  );
}

const logicScenarioCss = String.raw`
.logic-root{--l-bg:#0d1019;--l-panel:#151a27;--l-panel2:#1c2232;--l-line:#2a3246;--l-text:#f4f1eb;--l-muted:#9aa4b8;min-height:100vh;background:radial-gradient(circle at 84% 3%,#243151 0,transparent 29%),var(--l-bg);color:var(--l-text);font-family:Inter,ui-sans-serif,system-ui,sans-serif}.logic-root *{box-sizing:border-box}.logic-root button,.logic-root textarea{font:inherit}.logic-topbar{height:76px;padding:0 clamp(18px,5vw,72px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--l-line);background:#0d1019d9;backdrop-filter:blur(14px);position:relative;z-index:2}.logic-topbar>div{display:flex;align-items:center;gap:15px}.logic-topbar button{width:40px;height:40px;border:1px solid var(--l-line);border-radius:12px;color:var(--l-text);background:var(--l-panel);display:grid;place-items:center;cursor:pointer}.logic-topbar span{display:flex;flex-direction:column}.logic-topbar strong{font-size:15px}.logic-topbar small{font-size:11px;color:var(--l-muted);margin-top:2px}.logic-counter{border:1px solid var(--l-line);border-radius:999px;padding:9px 13px;display:flex!important;flex-direction:row!important;align-items:center;gap:7px;font-size:12px;color:var(--l-muted)}
.logic-hero{max-width:1180px;margin:auto;padding:72px 28px 48px}.logic-hero>span{color:#72d8c4;font-size:11px;font-weight:800;letter-spacing:.18em}.logic-hero h1{font-size:clamp(39px,6vw,72px);line-height:.98;letter-spacing:-.055em;margin:16px 0 22px;max-width:850px}.logic-hero p{color:var(--l-muted);font-size:17px;line-height:1.65;max-width:750px}.logic-hero b{color:#d8d1ff;font-weight:650}.logic-engine{max-width:1180px;margin:0 auto;padding:30px 28px 52px}.logic-engine-heading{display:grid;grid-template-columns:56px 1fr;gap:18px;align-items:start;margin-bottom:22px}.logic-engine-heading>span{height:56px;border-radius:16px;background:var(--l-panel2);border:1px solid var(--l-line);display:grid;place-items:center;color:#8f83ff}.logic-engine-heading small,.logic-card>small{font-size:10px;letter-spacing:.14em;font-weight:800;color:var(--l-muted)}.logic-engine-heading h2{margin:4px 0;font-size:26px}.logic-engine-heading p{margin:0;color:var(--l-muted);line-height:1.55}.logic-card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.logic-card{--logic-accent:#8f83ff;position:relative;text-align:left;min-height:258px;padding:25px;border:1px solid var(--l-line);border-radius:20px;background:linear-gradient(145deg,color-mix(in srgb,var(--logic-accent) 9%,var(--l-panel)),var(--l-panel));color:var(--l-text);cursor:pointer;overflow:hidden;transition:.2s transform,.2s border-color}.logic-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--logic-accent)}.logic-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--logic-accent) 55%,var(--l-line))}.logic-card-index{position:absolute;right:18px;top:13px;font-size:43px;font-weight:800;color:#ffffff0b}.logic-pill{display:inline-flex;border:1px solid color-mix(in srgb,var(--logic-accent) 50%,transparent);color:var(--logic-accent);border-radius:999px;padding:4px 8px;font-size:10px;font-weight:800;margin-bottom:33px}.logic-card h3{font-size:23px;margin:7px 0 10px}.logic-card p{color:var(--l-muted);line-height:1.5;margin:0}.logic-card footer{position:absolute;left:25px;right:25px;bottom:20px;display:flex;justify-content:space-between;color:var(--l-muted);font-size:12px}.logic-card footer span,.logic-card footer strong{display:flex;align-items:center;gap:6px}.logic-card footer strong{color:var(--logic-accent)}
.logic-progress{width:min(520px,70vw);display:flex;align-items:center;margin:24px auto 0}.logic-progress i{width:28px;height:28px;border:1px solid var(--l-line);border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:11px;color:var(--l-muted)}.logic-progress i.active{border-color:#8f83ff;color:white;box-shadow:0 0 0 5px #8f83ff1a}.logic-progress i.done{background:#62cdb7;border-color:#62cdb7;color:#07130f}.logic-progress span{height:1px;background:var(--l-line);flex:1}.logic-stage{max-width:1180px;margin:auto;padding:36px 28px 80px;outline:none}.logic-brief{display:flex;gap:18px;align-items:flex-start;max-width:900px;margin-bottom:30px}.logic-brief>span,.logic-report-copy>span{width:50px;height:50px;display:grid;place-items:center;border-radius:15px;background:#62cdb71b;color:#62cdb7}.logic-brief small,.logic-report-copy>small,.logic-editor>small,.logic-preview small,.logic-source small{font-size:10px;letter-spacing:.15em;font-weight:800;color:#70d4c0}.logic-brief h1{font-size:24px;line-height:1.35;margin:4px 0}.logic-brief p{color:var(--l-muted);margin:0}.logic-workspace,.logic-editor-layout{display:grid;grid-template-columns:minmax(250px,330px) 1fr;gap:18px}.logic-clues,.logic-traps{border:1px solid var(--l-line);background:var(--l-panel);border-radius:19px;padding:20px}.logic-clues h2,.logic-traps h2{font-size:14px;margin:0 0 15px}.logic-clues article{display:grid;grid-template-columns:25px 1fr;gap:9px;padding:13px 0;border-top:1px solid var(--l-line)}.logic-clues article>b{width:23px;height:23px;display:grid;place-items:center;border-radius:7px;background:#ffffff0a;font-size:10px;color:#70d4c0}.logic-clues article p{font-size:13px;line-height:1.55;margin:0}.logic-clues article span{grid-column:2;color:#8f83ff;font-size:10px;font-weight:800;text-transform:uppercase}.logic-glossary{margin-top:18px;border-top:1px solid var(--l-line);padding-top:15px}.logic-glossary summary{display:flex;align-items:center;gap:7px;color:var(--l-muted);font-size:12px;cursor:pointer}.logic-glossary dl{margin:12px 0 0}.logic-glossary dl div{display:flex;justify-content:space-between;gap:10px;padding:6px 0;font-size:11px}.logic-glossary dt{color:#d9d2ff}.logic-glossary dd{margin:0;color:var(--l-muted);text-align:right}.logic-translation{font-size:11px!important;color:var(--l-muted)!important}.logic-grid-panel,.logic-editor,.logic-paper{border:1px solid var(--l-line);background:var(--l-panel);border-radius:19px;padding:22px}.logic-subject-tabs{display:grid;grid-template-columns:repeat(var(--logic-columns,3),1fr);gap:8px;margin-bottom:20px}.logic-subject-tabs button{background:#111622;border:1px solid var(--l-line);color:var(--l-muted);padding:12px;border-radius:12px;text-align:left;cursor:pointer}.logic-subject-tabs button b,.logic-subject-tabs button small{display:block}.logic-subject-tabs button small{font-size:10px;margin-top:3px}.logic-subject-tabs button.active{border-color:#8f83ff;background:#8f83ff14;color:white}.logic-matrix{display:grid;grid-template-columns:minmax(100px,1.2fr) repeat(var(--logic-columns,3),1fr);align-items:stretch}.logic-matrix>b{padding:8px;text-align:center;font-size:11px;color:#8f83ff}.logic-matrix>b small{display:block;color:var(--l-muted);margin-top:3px}.logic-matrix-row{display:contents}.logic-matrix-row>strong{display:flex;align-items:center;padding:13px;border-top:1px solid var(--l-line);font-size:12px}.logic-matrix-row>button{min-height:58px;border:solid var(--l-line);border-width:1px 0 0 1px;background:transparent;display:grid;place-items:center;cursor:pointer}.logic-matrix-row>button i{width:22px;height:22px;border:1px solid #4a546c;border-radius:50%}.logic-matrix-row>button.selected{background:#62cdb710}.logic-matrix-row>button.selected i{border:6px solid #62cdb7}.logic-keyhint{font-size:10px;color:#737f95;text-align:center}.logic-error{display:flex;gap:8px;align-items:center;color:#f0a57f;font-size:12px;background:#ef855b12;border:1px solid #ef855b2f;border-radius:10px;padding:10px}.logic-primary{border:0;border-radius:12px;padding:13px 17px;background:#775ee9;color:#fff;font-weight:750;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;margin-left:auto}.logic-primary:disabled{opacity:.38;cursor:not-allowed}
.logic-source{max-width:950px;border-left:3px solid #d77d9c;padding:12px 22px;margin-bottom:24px;background:#d77d9c0a}.logic-source blockquote{font-size:20px;line-height:1.5;margin:8px 0}.logic-source p{color:var(--l-muted);margin:8px 0 0}.logic-traps>p{display:flex;align-items:flex-start;gap:8px;color:var(--l-muted);font-size:12px;line-height:1.5;border-top:1px solid var(--l-line);padding-top:11px}.logic-editor nav{display:flex;gap:7px;margin-bottom:25px}.logic-editor nav button{border:1px solid var(--l-line);background:#111622;color:var(--l-muted);padding:9px 12px;border-radius:10px;cursor:pointer}.logic-editor nav button span{display:inline-grid;place-items:center;width:19px;height:19px;border-radius:50%;background:#ffffff0c;font-size:9px;margin-right:6px}.logic-editor nav button.active{border-color:#8f83ff;color:#fff}.logic-editor nav button.filled{color:#62cdb7}.logic-editor h2{font-size:20px;margin:7px 0 16px}.logic-choice-list{display:grid;gap:8px}.logic-choice-list>button{display:flex;gap:12px;text-align:left;align-items:flex-start;padding:13px;border:1px solid var(--l-line);border-radius:12px;background:#111622;color:var(--l-text);cursor:pointer}.logic-choice-list>button.selected{border-color:#8f83ff;background:#8f83ff12}.logic-choice-list kbd{width:23px;height:23px;border:1px solid var(--l-line);border-radius:6px;display:grid;place-items:center;font-size:10px}.logic-choice-list span{line-height:1.45}.logic-choice-list span small{display:block;color:#f0a57f;margin-top:7px}.logic-preview{background:#0e1320;border-radius:12px;padding:14px;margin-top:15px}.logic-preview p{font-size:13px;line-height:1.5;margin:5px 0}.logic-report{display:grid;grid-template-columns:.85fr 1.15fr;gap:28px;align-items:start}.logic-report-copy h1{font-size:32px;line-height:1.15}.logic-report-copy p{color:var(--l-muted);line-height:1.6}.logic-report-copy ul{list-style:none;padding:0}.logic-report-copy li{display:flex;align-items:center;gap:7px;margin:8px 0;color:#c9d1df;font-size:13px}.logic-paper label{display:block;font-size:12px;font-weight:700;margin-bottom:10px}.logic-paper textarea{width:100%;min-height:290px;resize:vertical;border:1px solid var(--l-line);background:#0e1320;color:var(--l-text);border-radius:13px;padding:17px;line-height:1.65;outline:none}.logic-paper textarea:focus{border-color:#8f83ff;box-shadow:0 0 0 3px #8f83ff17}.logic-paper footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px}.logic-paper footer>span{font-size:11px;color:var(--l-muted)}.logic-paper footer>span.ready{color:#62cdb7}.logic-result{text-align:center;max-width:760px;margin:auto;padding:55px 28px 90px}.logic-score-ring{--logic-score:0deg;width:140px;height:140px;margin:auto;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--logic-accent) var(--logic-score),#252c3d 0);position:relative}.logic-score-ring:after{content:"";position:absolute;inset:9px;background:var(--l-bg);border-radius:50%}.logic-score-ring span{position:relative;z-index:1;font-size:36px;font-weight:800}.logic-score-ring small{font-size:11px;color:var(--l-muted)}.logic-result>small{display:block;color:#8f83ff;letter-spacing:.14em;font-weight:800;margin-top:22px}.logic-result h1{font-size:34px;margin:8px}.logic-result>p{color:var(--l-muted)}.logic-first{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid #d6a95855;color:#efc878;border-radius:999px;font-size:11px;margin-top:10px}.logic-feedback-grid{display:grid;grid-template-columns:1fr 1fr;text-align:left;gap:12px;margin:25px 0}.logic-feedback-grid article{background:var(--l-panel);border:1px solid var(--l-line);border-radius:15px;padding:17px}.logic-feedback-grid h2{font-size:13px}.logic-feedback-grid p{display:flex;gap:8px;color:var(--l-muted);font-size:12px;line-height:1.5}.logic-result>.logic-primary{margin:auto}
@media(max-width:800px){.logic-counter{display:none!important}.logic-card-grid{grid-template-columns:1fr}.logic-card{min-height:235px}.logic-workspace,.logic-editor-layout,.logic-report{grid-template-columns:1fr}.logic-clues,.logic-traps{order:2}.logic-grid-panel,.logic-editor{padding:14px}.logic-subject-tabs{grid-template-columns:1fr}.logic-matrix{overflow-x:auto}.logic-editor nav{overflow-x:auto}.logic-feedback-grid{grid-template-columns:1fr}.logic-hero{padding-top:45px}.logic-topbar{padding:0 16px}}
@media(prefers-reduced-motion:reduce){.logic-card{transition:none}}
`;
