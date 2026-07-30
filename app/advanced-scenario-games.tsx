"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calculator,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Languages,
  Radio,
  RotateCcw,
  Search,
  ShipWheel,
  Sparkles,
  Undo2,
  Users,
  Waves,
  X,
} from "lucide-react";
import type { ScenarioRun } from "@/lib/scenarioData";
import {
  advancedScenarioCards,
  advancedScenarioRegistry,
  composeV2Question,
  createAdvancedEvaluationRequest,
  evaluateProtocolState,
  evaluateReliabilityOrder,
  evaluateSubmissionOffline,
  evaluateTimelineOrder,
  getWitnessAnswer,
  type AdvancedEvaluationRequest,
  type AdvancedEvaluationResult,
  type AdvancedScenario,
  type AdvancedScenarioId,
  type HarborInvestigationScenario,
  type ProtocolScenario,
} from "@/lib/advancedScenarioData";

export type AdvancedEvaluationCallback = (request: AdvancedEvaluationRequest) => Promise<AdvancedEvaluationResult>;

export interface AdvancedScenarioHubProps {
  runs?: readonly ScenarioRun[];
  initialScenarioId?: AdvancedScenarioId;
  onComplete: (run: ScenarioRun) => void;
  onEvaluate?: AdvancedEvaluationCallback;
  onStartAttempt?: (caseId: string) => boolean;
  onExit?: () => void;
}

export interface AdvancedScenarioRunnerProps {
  scenarioId: AdvancedScenarioId;
  onComplete: (run: ScenarioRun) => void;
  onEvaluate?: AdvancedEvaluationCallback;
  onBack: () => void;
  english?: boolean;
  onToggleEnglish?: () => void;
  firstAttemptEligible?: boolean;
}

export const advancedScenarioIntegration = {
  cards: advancedScenarioCards,
  registry: advancedScenarioRegistry,
  ids: advancedScenarioCards.map((card) => card.id),
} as const;

const cardIcons: Record<AdvancedScenarioId, typeof Search> = {
  "harbor-investigation": Search,
  "storm-gate": Waves,
  "ferry-relay": Radio,
};

function makeRunId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}`;
}

function clampEvaluation(result: AdvancedEvaluationResult, fallback: AdvancedEvaluationResult): AdvancedEvaluationResult {
  if (!result.available || !Number.isFinite(result.score)) return fallback;
  return {
    available: true,
    score: Math.max(0, Math.min(1, result.score)),
    verdict: result.verdict || fallback.verdict,
    feedback: result.feedback || fallback.feedback,
    strengths: result.strengths?.length ? result.strengths : fallback.strengths,
    improvements: result.improvements?.length ? result.improvements : fallback.improvements,
    model: result.model ?? "Gemini",
  };
}

async function evaluateWithFallback(
  scenario: AdvancedScenario,
  submission: string,
  onEvaluate?: AdvancedEvaluationCallback,
) {
  const fallback = evaluateSubmissionOffline(scenario, submission);
  if (!onEvaluate) return fallback;
  try {
    const remote = await onEvaluate(createAdvancedEvaluationRequest(scenario, submission));
    return clampEvaluation(remote, fallback);
  } catch {
    return fallback;
  }
}

export function AdvancedScenarioHub({
  runs = [],
  initialScenarioId,
  onComplete,
  onEvaluate,
  onStartAttempt,
  onExit,
}: AdvancedScenarioHubProps) {
  const [activeId, setActiveId] = useState<AdvancedScenarioId | null>(initialScenarioId ?? null);
  const [english, setEnglish] = useState(false);
  const [firstAttemptEligible, setFirstAttemptEligible] = useState(false);
  const directAttemptClaimed = useRef(false);
  const successfulIds = useMemo(
    () => new Set(runs.filter((run) => run.success).map((run) => run.caseId)),
    [runs],
  );
  const attemptedIds = useMemo(() => new Set(runs.map((run) => run.caseId)), [runs]);

  useEffect(() => {
    if (!initialScenarioId || directAttemptClaimed.current) return;
    directAttemptClaimed.current = true;
    setFirstAttemptEligible(onStartAttempt?.(initialScenarioId) ?? !attemptedIds.has(initialScenarioId));
  }, [attemptedIds, initialScenarioId, onStartAttempt]);

  if (activeId) {
    return (
      <AdvancedScenarioRunner
        scenarioId={activeId}
        english={english}
        onToggleEnglish={() => setEnglish((current) => !current)}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
        firstAttemptEligible={firstAttemptEligible}
        onBack={() => initialScenarioId ? onExit?.() : setActiveId(null)}
      />
    );
  }

  return (
    <main className="advanced-scenario-root">
      <style>{advancedScenarioCss}</style>
      <AdvancedHeader
        title="Sagslaboratoriet"
        subtitle="Code, language, evidence"
        english={english}
        onToggleEnglish={() => setEnglish((current) => !current)}
        onBack={onExit}
      />
      <section className="advanced-hero">
        <span>AI-HYBRIDE HAVNEPRØVER · B1–B2</span>
        <h1>Sproget er en del af maskinen.</h1>
        <p>Hver sag har én kodekontrolleret løsning. Først når logikken holder, vurderes din frie danske tekst.</p>
        {english && <p className="advanced-english">Every case has one code-validated solution. Your free Danish production is evaluated only after the logic holds.</p>}
      </section>
      <section className="advanced-card-grid" aria-label="Vælg en avanceret sag">
        {advancedScenarioCards.map((card, index) => {
          const Icon = cardIcons[card.id];
          const solved = successfulIds.has(card.id);
          const attempted = attemptedIds.has(card.id);
          return (
            <button
              key={card.id}
              className="advanced-card"
              style={{ "--case-accent": card.accent } as React.CSSProperties}
              onClick={() => {
                setFirstAttemptEligible(onStartAttempt?.(card.id) ?? false);
                setActiveId(card.id);
              }}
            >
              <span className="advanced-card-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="advanced-card-icon"><Icon size={25} /></span>
              <span className="advanced-level">{card.level}</span>
              <small>{card.eyebrow}</small>
              <h2>{card.title}</h2>
              {english && <em>{card.englishTitle}</em>}
              <p>{card.description}</p>
              {english && <p className="advanced-english">{card.englishDescription}</p>}
              <footer>
                <span>{card.location}</span>
                <strong>{solved ? <><Check size={15} /> Løst</> : attempted ? <><RotateCcw size={15} /> Nyt forsøg</> : <>Start <ChevronRight size={15} /></>}</strong>
              </footer>
            </button>
          );
        })}
      </section>
    </main>
  );
}

export function AdvancedScenarioRunner({
  scenarioId,
  onComplete,
  onEvaluate,
  onBack,
  english = false,
  onToggleEnglish,
  firstAttemptEligible = false,
}: AdvancedScenarioRunnerProps) {
  const scenario = advancedScenarioRegistry[scenarioId];
  return (
    <main className="advanced-scenario-root">
      <style>{advancedScenarioCss}</style>
      <AdvancedHeader
        title={scenario.title}
        subtitle={scenario.englishTitle}
        english={english}
        onToggleEnglish={onToggleEnglish}
        onBack={onBack}
      />
      {scenario.kind === "investigation" ? (
        <InvestigationPlayer
          scenario={scenario}
          english={english}
          onEvaluate={onEvaluate}
          onComplete={onComplete}
          firstAttemptEligible={firstAttemptEligible}
        />
      ) : (
        <ProtocolPlayer
          scenario={scenario}
          english={english}
          onEvaluate={onEvaluate}
          onComplete={onComplete}
          firstAttemptEligible={firstAttemptEligible}
        />
      )}
    </main>
  );
}

function AdvancedHeader({
  title,
  subtitle,
  english,
  onToggleEnglish,
  onBack,
}: {
  title: string;
  subtitle: string;
  english: boolean;
  onToggleEnglish?: () => void;
  onBack?: () => void;
}) {
  return (
    <header className="advanced-header">
      <div>
        {onBack && <button onClick={onBack} aria-label="Tilbage"><ArrowLeft size={20} /></button>}
        <span><strong>{title}</strong><small>{subtitle}</small></span>
      </div>
      {onToggleEnglish && (
        <button className={english ? "active" : ""} onClick={onToggleEnglish} aria-pressed={english}>
          <Languages size={17} /> English support
        </button>
      )}
    </header>
  );
}

function PhaseRail({ phases, active }: { phases: readonly string[]; active: number }) {
  return (
    <nav className="advanced-phase-rail" aria-label="Sagens faser">
      {phases.map((phase, index) => (
        <span key={phase} className={index === active ? "active" : index < active ? "done" : ""}>
          <i>{index < active ? <Check size={13} /> : index + 1}</i>{phase}
        </span>
      ))}
    </nav>
  );
}

type TranscriptEntry = {
  witnessId: string;
  question: string;
  answer: string;
  englishAnswer: string;
  factIds: string[];
};

function InvestigationPlayer({
  scenario,
  english,
  onEvaluate,
  onComplete,
  firstAttemptEligible,
}: {
  scenario: HarborInvestigationScenario;
  english: boolean;
  onEvaluate?: AdvancedEvaluationCallback;
  onComplete: (run: ScenarioRun) => void;
  firstAttemptEligible: boolean;
}) {
  const [phase, setPhase] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());
  const [questionsLeft, setQuestionsLeft] = useState(scenario.questionBudget);
  const [witnessId, setWitnessId] = useState(scenario.witnesses[0].id);
  const [hvWord, setHvWord] = useState("hvornår");
  const [verbId, setVerbId] = useState("see");
  const [objectId, setObjectId] = useState("baaden");
  const [wordOrder, setWordOrder] = useState<"verb-subject" | "subject-verb">("verb-subject");
  const [builderFeedback, setBuilderFeedback] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [reliabilityOrder, setReliabilityOrder] = useState<string[]>([]);
  const [reliabilityFeedback, setReliabilityFeedback] = useState<string | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<string[]>([]);
  const [timelineFeedback, setTimelineFeedback] = useState<string | null>(null);
  const [submission, setSubmission] = useState("");
  const [evaluation, setEvaluation] = useState<AdvancedEvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const selectedVerb = scenario.questionOptions.verbs.find((verb) => verb.id === verbId) ?? scenario.questionOptions.verbs[0];
  const selectedObject = scenario.questionOptions.objects.find((object) => object.id === objectId) ?? scenario.questionOptions.objects[0];
  const selectedHv = scenario.questionOptions.hvWords.find((item) => item.id === hvWord) ?? scenario.questionOptions.hvWords[0];
  const discoveredFacts = useMemo(() => new Set(transcript.flatMap((entry) => entry.factIds)), [transcript]);

  const askQuestion = () => {
    const built = composeV2Question({
      hvWord: selectedHv.label,
      finiteVerb: selectedVerb.finite,
      subject: "du",
      object: selectedObject.label,
      order: wordOrder,
    });
    setBuilderFeedback(built.reason);
    if (!built.valid || questionsLeft <= 0) return;
    const answer = getWitnessAnswer(scenario, witnessId, hvWord, verbId, objectId);
    if (!answer) return;
    setTranscript((current) => [...current, {
      witnessId,
      question: built.question,
      answer: answer.text,
      englishAnswer: answer.englishText,
      factIds: answer.factIds,
    }]);
    setQuestionsLeft((current) => current - 1);
  };

  const checkReliability = () => {
    const result = evaluateReliabilityOrder(scenario, reliabilityOrder);
    setReliabilityFeedback(result.success
      ? "Korrekt. Grammatisk distance svækker afsenderens ansvar for udsagnet."
      : `${result.correctPositions} af ${result.expected.length} står korrekt. Se især på mener og efter sigende.`);
    if (result.success) setPhase(2);
  };

  const checkTimeline = () => {
    const result = evaluateTimelineOrder(scenario, timelineOrder);
    setTimelineFeedback(result.success
      ? "Tidslinjen er entydig. Pluskvamperfektum markerer de tidligere hændelser."
      : `${result.correctPositions} af ${result.expected.length} hændelser står korrekt. Læs inden og efter at igen.`);
    if (result.success) setPhase(3);
  };

  const submitReport = async () => {
    if (!submission.trim() || evaluating || evaluation) return;
    setEvaluating(true);
    const result = await evaluateWithFallback(scenario, submission, onEvaluate);
    setEvaluation(result);
    setEvaluating(false);
    const success = result.score >= 0.72;
    onComplete({
      id: makeRunId("advanced-investigation"),
      kind: "advanced",
      caseId: scenario.id,
      title: scenario.title,
      level: scenario.level,
      startedAt,
      endedAt: new Date().toISOString(),
      success,
      score: Math.round(result.score * 600),
      maxScore: 600,
      path: ["interrogation", "reliability", "timeline", "formal-report"],
      decisions: [
        { stepId: "question-budget", answerId: String(transcript.length), answerText: `${transcript.length}/${scenario.questionBudget}`, correct: transcript.length <= scenario.questionBudget },
        { stepId: "reliability", answerId: reliabilityOrder.join("|"), answerText: reliabilityOrder.join(" → "), correct: true },
        { stepId: "timeline", answerId: timelineOrder.join("|"), answerText: timelineOrder.join(" → "), correct: true },
        { stepId: "report", answerId: result.model ?? "offline", answerText: submission, correct: success },
      ],
      metadata: {
        advancedScenarioId: scenario.id,
        discoveredFacts: [...discoveredFacts],
        questionsUsed: transcript.length,
        evaluationModel: result.model ?? "unavailable",
        evaluationAvailable: result.available,
        firstAttemptEligible,
        checksUsed: 1,
        hintsUsed: 0,
      },
    });
  };

  return (
    <div className="advanced-game-shell" style={{ "--case-accent": scenario.accent } as React.CSSProperties}>
      <PhaseRail phases={scenario.phases} active={phase} />
      {phase === 0 && (
        <section className="advanced-investigation-layout">
          <div className="advanced-main-panel">
            <SectionHeading icon={Users} eyebrow={`FASE 1 · ${questionsLeft} AF ${scenario.questionBudget} SPØRGSMÅL TILBAGE`} title="Konstruér dit spørgsmål" />
            <p className="advanced-lead">Vælg en kilde, byg et hv-spørgsmål, og hold det finitte verbum på anden plads. En ugyldig V2-form koster ikke af budgettet.</p>
            <div className="advanced-witness-tabs">
              {scenario.witnesses.map((witness) => (
                <button key={witness.id} className={witnessId === witness.id ? "active" : ""} onClick={() => setWitnessId(witness.id)}>
                  <strong>{witness.name}</strong><span>{witness.role}</span>
                </button>
              ))}
            </div>
            <div className="advanced-builder" aria-label="Byg et V2-spørgsmål">
              <select value={hvWord} onChange={(event) => setHvWord(event.target.value)} aria-label="Hv-ord">
                {scenario.questionOptions.hvWords.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              {wordOrder === "verb-subject" ? <>
                <select value={verbId} onChange={(event) => setVerbId(event.target.value)} aria-label="Verbum">
                  {scenario.questionOptions.verbs.map((item) => <option key={item.id} value={item.id}>{item.finite}</option>)}
                </select>
                <button className="advanced-slot fixed" onClick={() => setWordOrder("subject-verb")}>du</button>
              </> : <>
                <button className="advanced-slot fixed" onClick={() => setWordOrder("verb-subject")}>du</button>
                <select value={verbId} onChange={(event) => setVerbId(event.target.value)} aria-label="Verbum">
                  {scenario.questionOptions.verbs.map((item) => <option key={item.id} value={item.id}>{item.finite}</option>)}
                </select>
              </>}
              <select value={objectId} onChange={(event) => setObjectId(event.target.value)} aria-label="Objekt eller adverbial">
                {scenario.questionOptions.objects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <b>?</b>
            </div>
            <div className="advanced-action-row">
              <button className="advanced-primary" onClick={askQuestion} disabled={questionsLeft === 0}><Search size={17} /> Stil spørgsmålet</button>
              {transcript.length >= 3 && <button className="advanced-secondary" onClick={() => setPhase(1)}>Vurdér udsagn <ChevronRight size={16} /></button>}
            </div>
            {builderFeedback && <p className={`advanced-feedback ${wordOrder === "verb-subject" ? "good" : "bad"}`}>{builderFeedback}</p>}
          </div>
          <aside className="advanced-side-panel">
            <h3>Afhøringslog</h3>
            <p>{discoveredFacts.size} faktaspor fundet</p>
            <div className="advanced-transcript">
              {transcript.length === 0 && <span>Ingen spørgsmål stillet endnu.</span>}
              {[...transcript].reverse().map((entry, index) => {
                const witness = scenario.witnesses.find((item) => item.id === entry.witnessId);
                return <article key={`${entry.question}-${index}`}><small>{witness?.name}</small><strong>{entry.question}</strong><p>{entry.answer}</p>{english && <em>{entry.englishAnswer}</em>}</article>;
              })}
            </div>
          </aside>
        </section>
      )}
      {phase === 1 && (
        <section className="advanced-single-panel">
          <SectionHeading icon={ClipboardCheck} eyebrow="FASE 2 · STÆRKEST TIL SVAGEST" title="Sortér efter evidential reliability" />
          <p className="advanced-lead">Klik i rækkefølge. Vurdér ikke indholdet; læs hvordan taleren grammatisk tager ansvar for udsagnet.</p>
          <div className="advanced-document-grid">
            {scenario.documents.map((document) => (
              <article key={document.id}>
                <small>{document.source}</small>
                <h3>{document.title}</h3>
                <blockquote>{document.excerpt}</blockquote>
                <p>{document.reliabilityNote}</p>
                {english && <em>{document.englishExcerpt} {document.englishReliabilityNote}</em>}
              </article>
            ))}
          </div>
          <div className="advanced-order-bank">
            {scenario.reliabilityStatements.filter((item) => !reliabilityOrder.includes(item.id)).map((item) => (
              <button key={item.id} onClick={() => setReliabilityOrder((current) => [...current, item.id])}>
                <span>{item.text}</span>{english && <em>{item.englishText}</em>}
              </button>
            ))}
          </div>
          <OrderedTray
            ids={reliabilityOrder}
            labels={Object.fromEntries(scenario.reliabilityStatements.map((item) => [item.id, item.text]))}
            onUndo={() => setReliabilityOrder((current) => current.slice(0, -1))}
            onClear={() => setReliabilityOrder([])}
          />
          <div className="advanced-action-row"><button className="advanced-primary" disabled={reliabilityOrder.length !== scenario.reliabilityStatements.length} onClick={checkReliability}>Kontrollér rækkefølgen</button></div>
          {reliabilityFeedback && <p className="advanced-feedback">{reliabilityFeedback}</p>}
        </section>
      )}
      {phase === 2 && (
        <section className="advanced-investigation-layout">
          <div className="advanced-main-panel">
            <SectionHeading icon={ShipWheel} eyebrow="FASE 3 · KUN ÉN LØSNING" title="Byg den sammenhængende tidslinje" />
            <div className="advanced-constraint-list">
              {scenario.timelineConstraints.map((constraint) => <article key={constraint.id}><p>{constraint.text}</p>{english && <em>{constraint.englishText}</em>}</article>)}
            </div>
            <div className="advanced-event-bank">
              {scenario.timelineEvents.filter((event) => !timelineOrder.includes(event.id)).map((event) => (
                <button key={event.id} onClick={() => setTimelineOrder((current) => [...current, event.id])}>{event.title}</button>
              ))}
            </div>
            <OrderedTray
              ids={timelineOrder}
              labels={Object.fromEntries(scenario.timelineEvents.map((event) => [event.id, event.title]))}
              onUndo={() => setTimelineOrder((current) => current.slice(0, -1))}
              onClear={() => setTimelineOrder([])}
            />
            <div className="advanced-action-row"><button className="advanced-primary" disabled={timelineOrder.length !== scenario.timelineEvents.length} onClick={checkTimeline}>Lås tidslinjen</button></div>
            {timelineFeedback && <p className="advanced-feedback">{timelineFeedback}</p>}
          </div>
          <aside className="advanced-side-panel advanced-language-note">
            <h3>Tidslige markører</h3>
            <dl><dt>inden</dt><dd>den første handling ligger før den næste</dd><dt>efter at</dt><dd>handlingen i ledsætningen er allerede sket</dd><dt>havde + participium</dt><dd>pluskvamperfektum flytter en hændelse bagud</dd><dt>først da</dt><dd>noget bliver muligt netop på det tidspunkt</dd></dl>
          </aside>
        </section>
      )}
      {phase === 3 && (
        <ReportPanel
          scenario={scenario}
          english={english}
          submission={submission}
          setSubmission={setSubmission}
          evaluation={evaluation}
          evaluating={evaluating}
          onSubmit={submitReport}
        />
      )}
    </div>
  );
}

function ProtocolPlayer({
  scenario,
  english,
  onEvaluate,
  onComplete,
  firstAttemptEligible,
}: {
  scenario: ProtocolScenario;
  english: boolean;
  onEvaluate?: AdvancedEvaluationCallback;
  onComplete: (run: ScenarioRun) => void;
  firstAttemptEligible: boolean;
}) {
  const [phase, setPhase] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());
  const [calculation, setCalculation] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);
  const [protocolFeedback, setProtocolFeedback] = useState<string | null>(null);
  const [submission, setSubmission] = useState("");
  const [evaluation, setEvaluation] = useState<AdvancedEvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const checkProtocol = () => {
    const result = evaluateProtocolState(scenario, sequence, Number(calculation.replace(",", ".")));
    setProtocolFeedback(result.success
      ? "Kontrolkoden er gyldig. Alle betingelser og rækkefølgekrav er opfyldt."
      : `${result.correctPositions} af ${scenario.solution.length} positioner er korrekte. Beregning: ${result.calculationCorrect ? "korrekt" : "forkert"}.`);
    if (result.success) setPhase(3);
  };

  const submitReport = async () => {
    if (!submission.trim() || evaluating || evaluation) return;
    setEvaluating(true);
    const result = await evaluateWithFallback(scenario, submission, onEvaluate);
    setEvaluation(result);
    setEvaluating(false);
    const success = result.score >= 0.72;
    onComplete({
      id: makeRunId("advanced-protocol"),
      kind: "advanced",
      caseId: scenario.id,
      title: scenario.title,
      level: scenario.level,
      startedAt,
      endedAt: new Date().toISOString(),
      success,
      score: Math.round(result.score * 560),
      maxScore: 560,
      path: ["situation", "manual", "control-code", scenario.report.task],
      decisions: [
        { stepId: "calculation", answerId: calculation, answerText: calculation, correct: true },
        { stepId: "control-code", answerId: sequence.join("|"), answerText: sequence.join(" → "), correct: true },
        { stepId: scenario.report.task, answerId: result.model ?? "offline", answerText: submission, correct: success },
      ],
      metadata: {
        advancedScenarioId: scenario.id,
        calculation: Number(calculation.replace(",", ".")),
        evaluationModel: result.model ?? "unavailable",
        evaluationAvailable: result.available,
        firstAttemptEligible,
        checksUsed: 1,
        hintsUsed: 0,
      },
    });
  };

  return (
    <div className="advanced-game-shell" style={{ "--case-accent": scenario.accent } as React.CSSProperties}>
      <PhaseRail phases={scenario.phases} active={phase} />
      {phase === 0 && (
        <section className="advanced-single-panel">
          <SectionHeading icon={AlertTriangle} eyebrow="FASE 1 · LÆS FØR DU HANDLER" title={scenario.phases[0]} />
          <p className="advanced-lead">{scenario.brief}</p>
          {english && <p className="advanced-english block">{scenario.englishBrief}</p>}
          <div className="advanced-fact-grid">
            {scenario.facts.map((fact) => <article key={fact.id}><small>{fact.label}</small><strong>{fact.value}</strong>{english && <em>{fact.englishLabel}</em>}</article>)}
          </div>
          <div className="advanced-action-row"><button className="advanced-primary" onClick={() => setPhase(1)}>Åbn manualen <ChevronRight size={16} /></button></div>
        </section>
      )}
      {phase === 1 && (
        <section className="advanced-single-panel">
          <SectionHeading icon={BookOpen} eyebrow="FASE 2 · BETINGELSER OG RÆKKEFØLGE" title="Driftsmanual" />
          <div className="advanced-manual">
            {scenario.manual.map((section) => <article key={section.id}><h3>{section.title}</h3>{english && <em>{section.englishTitle}</em>}<ol>{section.rules.map((rule) => <li key={rule.id}><p>{rule.text}</p>{english && <span>{rule.englishText}</span>}</li>)}</ol></article>)}
          </div>
          <div className="advanced-action-row"><button className="advanced-primary" onClick={() => setPhase(2)}>Byg kontrolkoden <ChevronRight size={16} /></button></div>
        </section>
      )}
      {phase === 2 && (
        <section className="advanced-code-layout">
          <div className="advanced-main-panel">
            <SectionHeading icon={Calculator} eyebrow="FASE 3 · OFFLINE VALIDERING" title="Beregning og kontrolkode" />
            <label className="advanced-calculation">
              <span>{scenario.calculation.label}</span>
              <strong>{scenario.calculation.expression} =</strong>
              <input inputMode="decimal" value={calculation} onChange={(event) => setCalculation(event.target.value)} placeholder="?" />
              <i>{scenario.calculation.unit}</i>
            </label>
            <div className="advanced-control-bank">
              {scenario.controls.filter((control) => !sequence.includes(control.id)).map((control) => (
                <button key={control.id} onClick={() => setSequence((current) => [...current, control.id])}><i>{control.symbol}</i><span>{control.label}</span>{english && <em>{control.englishLabel}</em>}</button>
              ))}
            </div>
            <OrderedTray
              ids={sequence}
              labels={Object.fromEntries(scenario.controls.map((control) => [control.id, control.label]))}
              onUndo={() => setSequence((current) => current.slice(0, -1))}
              onClear={() => setSequence([])}
            />
            <div className="advanced-action-row"><button className="advanced-primary" disabled={sequence.length !== scenario.solution.length || !calculation} onClick={checkProtocol}>Validér koden</button></div>
            {protocolFeedback && <p className="advanced-feedback">{protocolFeedback}</p>}
          </div>
          <aside className="advanced-side-panel">
            <h3>Manualen er stadig aktiv</h3>
            {scenario.manual.flatMap((section) => section.rules).map((rule) => <p key={rule.id} className="advanced-rule-summary">{rule.text}</p>)}
          </aside>
        </section>
      )}
      {phase === 3 && (
        <ReportPanel
          scenario={scenario}
          english={english}
          submission={submission}
          setSubmission={setSubmission}
          evaluation={evaluation}
          evaluating={evaluating}
          onSubmit={submitReport}
        />
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: typeof Search; eyebrow: string; title: string }) {
  return <div className="advanced-section-heading"><span><Icon size={22} /></span><div><small>{eyebrow}</small><h2>{title}</h2></div></div>;
}

function OrderedTray({
  ids,
  labels,
  onUndo,
  onClear,
}: {
  ids: string[];
  labels: Record<string, string>;
  onUndo: () => void;
  onClear: () => void;
}) {
  return (
    <div className="advanced-ordered-tray">
      <header><strong>Din rækkefølge</strong><span><button onClick={onUndo} disabled={!ids.length} aria-label="Fortryd sidste"><Undo2 size={15} /></button><button onClick={onClear} disabled={!ids.length} aria-label="Ryd rækkefølge"><X size={15} /></button></span></header>
      <ol>{ids.length === 0 ? <li className="empty">Klik på elementerne ovenfor</li> : ids.map((id) => <li key={id}>{labels[id]}</li>)}</ol>
    </div>
  );
}

function ReportPanel({
  scenario,
  english,
  submission,
  setSubmission,
  evaluation,
  evaluating,
  onSubmit,
}: {
  scenario: AdvancedScenario;
  english: boolean;
  submission: string;
  setSubmission: (value: string) => void;
  evaluation: AdvancedEvaluationResult | null;
  evaluating: boolean;
  onSubmit: () => void;
}) {
  const words = submission.trim() ? submission.trim().split(/\s+/u).length : 0;
  return (
    <section className="advanced-report-layout">
      <div className="advanced-main-panel">
        <SectionHeading icon={FileText} eyebrow={`FASE 4 · ${scenario.report.task.toLocaleUpperCase("da-DK")}`} title="Skriv den endelige tekst" />
        <p className="advanced-lead">{scenario.report.prompt}</p>
        {english && <p className="advanced-english block">{scenario.report.englishPrompt}</p>}
        <label className="advanced-report-input">
          <textarea value={submission} disabled={Boolean(evaluation)} onChange={(event) => { setSubmission(event.target.value); }} placeholder="Skriv på dansk…" rows={9} />
          <span className={words < scenario.report.minimumWords ? "short" : ""}>{words} ord · mindst {scenario.report.minimumWords}</span>
        </label>
        <div className="advanced-action-row">
          <button className="advanced-primary" onClick={onSubmit} disabled={Boolean(evaluation) || evaluating || words < 12}>
            {evaluation ? <><Check size={17} /> Vurderet</> : evaluating ? <><Sparkles size={17} /> Vurderer…</> : <><ClipboardCheck size={17} /> Vurdér teksten</>}
          </button>
        </div>
        {evaluation && <EvaluationCard evaluation={evaluation} />}
      </div>
      <aside className="advanced-side-panel">
        <h3>Fakta, som skal dækkes</h3>
        <ul className="advanced-required-facts">{scenario.report.requiredFacts.map((fact) => <li key={fact}><Check size={14} />{fact}</li>)}</ul>
        <p className="advanced-ai-note"><Sparkles size={16} /> AI vurderer register og formulering. Hvis tjenesten ikke er tilgængelig, overtager den lokale rubric automatisk.</p>
      </aside>
    </section>
  );
}

function EvaluationCard({ evaluation }: { evaluation: AdvancedEvaluationResult }) {
  return (
    <article className={`advanced-evaluation ${evaluation.score >= 0.72 ? "passed" : "needs-work"}`}>
      <header><span>{evaluation.score >= 0.72 ? <Check size={20} /> : <AlertTriangle size={20} />}</span><div><small>{evaluation.available ? `AI · ${evaluation.model ?? "Gemini"}` : "OFFLINE FALLBACK"}</small><h3>{evaluation.verdict}</h3></div><strong>{Math.round(evaluation.score * 100)}%</strong></header>
      <p>{evaluation.feedback}</p>
      <div><section><h4>Styrker</h4><ul>{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h4>Næste forbedring</h4><ul>{evaluation.improvements.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
    </article>
  );
}

const advancedScenarioCss = String.raw`
.advanced-document-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:20px 0}.advanced-document-grid article{padding:14px;border:1px solid var(--adv-line);border-radius:12px;background:var(--adv-panel-2)}.advanced-document-grid small{font-size:8px;color:var(--case-accent)}.advanced-document-grid h3{font-size:12px;margin:5px 0}.advanced-document-grid blockquote{margin:10px 0;padding-left:10px;border-left:2px solid var(--case-accent);font-size:10px;line-height:1.45}.advanced-document-grid p,.advanced-document-grid em{display:block;font-size:8px;line-height:1.45;color:var(--adv-muted)}@media(max-width:780px){.advanced-document-grid{grid-template-columns:1fr}}
.advanced-scenario-root{--adv-bg:#10151d;--adv-panel:#171e28;--adv-panel-2:#1d2632;--adv-line:#2a3644;--adv-text:#edf4f6;--adv-muted:#95a6b5;--case-accent:#66b69b;min-height:calc(100vh - 68px);background:radial-gradient(circle at 85% 0%,color-mix(in srgb,var(--case-accent) 12%,transparent),transparent 34%),var(--adv-bg);color:var(--adv-text);font-family:var(--font-sans,"Segoe UI",sans-serif);padding-bottom:64px}.advanced-scenario-root *{box-sizing:border-box}.advanced-scenario-root button,.advanced-scenario-root select,.advanced-scenario-root input,.advanced-scenario-root textarea{font:inherit}.advanced-header{height:70px;padding:0 clamp(18px,5vw,72px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--adv-line);background:rgba(16,21,29,.84);backdrop-filter:blur(16px);position:sticky;top:0;z-index:5}.advanced-header>div{display:flex;align-items:center;gap:13px}.advanced-header span{display:grid;gap:2px}.advanced-header strong{font-size:14px}.advanced-header small{font-size:10px;color:var(--adv-muted)}.advanced-header button{border:1px solid var(--adv-line);border-radius:10px;background:var(--adv-panel);color:var(--adv-muted);padding:9px 12px;display:flex;align-items:center;gap:7px;cursor:pointer}.advanced-header button:hover,.advanced-header button.active{color:var(--adv-text);border-color:var(--case-accent)}.advanced-hero{max-width:1160px;margin:0 auto;padding:70px 24px 38px}.advanced-hero>span{font-size:10px;font-weight:850;letter-spacing:.13em;color:#76c7ad}.advanced-hero h1{font-size:clamp(36px,5vw,66px);line-height:1;margin:14px 0 18px;max-width:760px;letter-spacing:-.045em}.advanced-hero p{max-width:680px;color:var(--adv-muted);font-size:14px;line-height:1.7}.advanced-english{color:#78909f!important;font-style:italic}.advanced-english.block{padding:11px 14px;border-left:2px solid var(--case-accent);background:color-mix(in srgb,var(--case-accent) 7%,transparent);font-size:12px}.advanced-card-grid{max-width:1160px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.advanced-card{position:relative;min-height:370px;padding:26px;border:1px solid var(--adv-line);border-radius:22px;background:linear-gradient(160deg,color-mix(in srgb,var(--case-accent) 9%,var(--adv-panel)),var(--adv-panel) 50%);color:var(--adv-text);text-align:left;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;transition:.22s ease;overflow:hidden}.advanced-card:after{content:"";position:absolute;width:170px;height:170px;border-radius:50%;right:-70px;top:-70px;background:color-mix(in srgb,var(--case-accent) 14%,transparent)}.advanced-card:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--case-accent) 65%,var(--adv-line));box-shadow:0 22px 48px rgba(0,0,0,.22)}.advanced-card-number{font:800 11px ui-monospace,monospace;color:var(--adv-muted)}.advanced-card-icon{width:49px;height:49px;margin:38px 0 25px;border-radius:15px;display:grid;place-items:center;background:color-mix(in srgb,var(--case-accent) 18%,var(--adv-panel));color:var(--case-accent)}.advanced-card>.advanced-level{position:absolute;right:24px;top:24px;padding:6px 9px;border-radius:8px;background:color-mix(in srgb,var(--case-accent) 15%,transparent);color:var(--case-accent);font-size:10px;font-weight:850}.advanced-card>small{color:var(--case-accent);font-size:9px;font-weight:850;letter-spacing:.09em}.advanced-card h2{font-size:24px;margin:7px 0 3px}.advanced-card>em{font-size:11px;color:var(--adv-muted)}.advanced-card>p{font-size:12px;color:var(--adv-muted);line-height:1.6}.advanced-card footer{margin-top:auto;width:100%;padding-top:18px;border-top:1px solid var(--adv-line);display:flex;justify-content:space-between;gap:12px;font-size:9px;color:var(--adv-muted)}.advanced-card footer strong{display:flex;align-items:center;gap:5px;color:var(--case-accent)}.advanced-game-shell{max-width:1240px;margin:0 auto;padding:28px 24px}.advanced-phase-rail{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--adv-line);border-radius:15px;overflow:hidden;margin-bottom:22px;background:var(--adv-panel)}.advanced-phase-rail span{min-height:52px;padding:10px 14px;display:flex;align-items:center;gap:8px;border-right:1px solid var(--adv-line);font-size:10px;color:var(--adv-muted)}.advanced-phase-rail span:last-child{border:0}.advanced-phase-rail i{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:var(--adv-panel-2);font-style:normal}.advanced-phase-rail .active{color:var(--adv-text);background:color-mix(in srgb,var(--case-accent) 8%,var(--adv-panel))}.advanced-phase-rail .active i,.advanced-phase-rail .done i{background:var(--case-accent);color:#08130f}.advanced-investigation-layout,.advanced-code-layout,.advanced-report-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,.8fr);gap:18px}.advanced-main-panel,.advanced-side-panel,.advanced-single-panel{border:1px solid var(--adv-line);border-radius:20px;background:var(--adv-panel);padding:clamp(20px,3vw,32px)}.advanced-single-panel{max-width:950px;margin:0 auto}.advanced-section-heading{display:flex;align-items:center;gap:13px;margin-bottom:14px}.advanced-section-heading>span{width:43px;height:43px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--case-accent) 17%,var(--adv-panel));color:var(--case-accent)}.advanced-section-heading small{font-size:9px;font-weight:850;letter-spacing:.1em;color:var(--case-accent)}.advanced-section-heading h2{font-size:24px;margin:4px 0 0}.advanced-lead{color:var(--adv-muted);font-size:13px;line-height:1.65;max-width:760px}.advanced-witness-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:24px 0}.advanced-witness-tabs button{padding:12px;border:1px solid var(--adv-line);border-radius:12px;background:var(--adv-panel-2);color:var(--adv-muted);display:grid;gap:3px;text-align:left;cursor:pointer}.advanced-witness-tabs button.active{border-color:var(--case-accent);color:var(--adv-text);box-shadow:inset 0 0 0 1px var(--case-accent)}.advanced-witness-tabs span{font-size:9px}.advanced-builder{display:grid;grid-template-columns:1.1fr 1.1fr .7fr 1.5fr auto;gap:8px;align-items:center;padding:18px;border:1px solid var(--adv-line);border-radius:15px;background:#111821}.advanced-builder select,.advanced-slot{min-width:0;padding:12px 10px;border:1px solid var(--adv-line);border-radius:10px;background:var(--adv-panel-2);color:var(--adv-text)}.advanced-slot.fixed{cursor:pointer}.advanced-builder b{color:var(--case-accent);font-size:22px}.advanced-action-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.advanced-primary,.advanced-secondary{padding:11px 15px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-size:11px;font-weight:800}.advanced-primary{border:0;background:var(--case-accent);color:#08130f}.advanced-secondary{border:1px solid var(--adv-line);background:var(--adv-panel-2);color:var(--adv-text)}.advanced-primary:disabled,.advanced-secondary:disabled{opacity:.42;cursor:not-allowed}.advanced-feedback{padding:12px 14px;border-radius:11px;background:#111821;color:#b6c5d0;font-size:11px;line-height:1.5}.advanced-feedback.good{border-left:3px solid #63bd9c}.advanced-feedback.bad{border-left:3px solid #e58272}.advanced-side-panel h3{font-size:14px;margin:0 0 6px}.advanced-side-panel>p{font-size:10px;color:var(--adv-muted)}.advanced-transcript{display:grid;gap:10px;max-height:570px;overflow:auto;margin-top:16px}.advanced-transcript>span{color:var(--adv-muted);font-size:10px}.advanced-transcript article{padding:13px;border:1px solid var(--adv-line);border-radius:12px;background:var(--adv-panel-2);display:grid;gap:5px}.advanced-transcript small{color:var(--case-accent);font-weight:800}.advanced-transcript strong{font-size:11px}.advanced-transcript p{font-size:10px;line-height:1.45;color:#c2ced7;margin:0}.advanced-transcript em{font-size:9px;color:var(--adv-muted)}.advanced-order-bank,.advanced-event-bank{display:grid;gap:9px;margin:24px 0}.advanced-order-bank button,.advanced-event-bank button{padding:14px;border:1px solid var(--adv-line);border-radius:12px;background:var(--adv-panel-2);color:var(--adv-text);text-align:left;cursor:pointer;display:grid;gap:4px}.advanced-order-bank button:hover,.advanced-event-bank button:hover{border-color:var(--case-accent)}.advanced-order-bank em{font-size:9px;color:var(--adv-muted)}.advanced-ordered-tray{border:1px dashed color-mix(in srgb,var(--case-accent) 60%,var(--adv-line));border-radius:14px;padding:14px;background:color-mix(in srgb,var(--case-accent) 4%,transparent)}.advanced-ordered-tray header{display:flex;justify-content:space-between;align-items:center;font-size:10px}.advanced-ordered-tray header span{display:flex;gap:6px}.advanced-ordered-tray button{width:29px;height:29px;border:1px solid var(--adv-line);border-radius:8px;background:var(--adv-panel-2);color:var(--adv-muted);display:grid;place-items:center;cursor:pointer}.advanced-ordered-tray ol{margin:12px 0 0;padding-left:27px;display:grid;gap:7px}.advanced-ordered-tray li{padding:9px 11px;border-radius:9px;background:var(--adv-panel-2);font-size:10px}.advanced-ordered-tray li.empty{list-style:none;color:var(--adv-muted);background:transparent}.advanced-constraint-list{display:grid;gap:8px;margin:20px 0}.advanced-constraint-list article{padding:12px 14px;border-left:3px solid var(--case-accent);background:var(--adv-panel-2)}.advanced-constraint-list p{font-size:11px;margin:0}.advanced-constraint-list em{display:block;color:var(--adv-muted);font-size:9px;margin-top:5px}.advanced-language-note dl{display:grid;grid-template-columns:auto 1fr;gap:10px;margin-top:18px}.advanced-language-note dt{color:var(--case-accent);font-size:10px;font-weight:850}.advanced-language-note dd{margin:0;color:var(--adv-muted);font-size:9px;line-height:1.4}.advanced-fact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:25px 0}.advanced-fact-grid article{padding:15px;border:1px solid var(--adv-line);border-radius:13px;background:var(--adv-panel-2);display:grid;gap:5px}.advanced-fact-grid small{color:var(--adv-muted);font-size:9px}.advanced-fact-grid strong{font-size:18px;color:var(--case-accent)}.advanced-fact-grid em{font-size:8px;color:var(--adv-muted)}.advanced-manual{display:grid;gap:14px;margin-top:24px}.advanced-manual>article{padding:18px;border:1px solid var(--adv-line);border-radius:14px;background:var(--adv-panel-2)}.advanced-manual h3{margin:0;font-size:14px}.advanced-manual>article>em{color:var(--adv-muted);font-size:9px}.advanced-manual ol{padding-left:20px;margin:12px 0 0}.advanced-manual li{padding:5px 0;color:var(--case-accent)}.advanced-manual li p{margin:0;color:var(--adv-text);font-size:11px;line-height:1.55}.advanced-manual li span{font-size:9px;color:var(--adv-muted)}.advanced-calculation{display:grid;grid-template-columns:1fr auto 100px auto;align-items:center;gap:12px;padding:16px;border:1px solid var(--adv-line);border-radius:13px;background:#111821;margin:22px 0}.advanced-calculation span{font-size:10px;color:var(--adv-muted)}.advanced-calculation strong{font:700 14px ui-monospace,monospace}.advanced-calculation input{width:100%;padding:10px;border:1px solid var(--adv-line);border-radius:9px;background:var(--adv-panel-2);color:var(--adv-text);text-align:center}.advanced-calculation i{font-style:normal;color:var(--adv-muted);font-size:10px}.advanced-control-bank{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:16px}.advanced-control-bank button{min-height:86px;padding:11px;border:1px solid var(--adv-line);border-radius:12px;background:var(--adv-panel-2);color:var(--adv-text);cursor:pointer;display:grid;place-items:center;gap:3px}.advanced-control-bank button:hover{border-color:var(--case-accent)}.advanced-control-bank i{width:27px;height:27px;border-radius:8px;background:color-mix(in srgb,var(--case-accent) 17%,transparent);color:var(--case-accent);display:grid;place-items:center;font-style:normal;font-weight:900}.advanced-control-bank span{font-size:9px}.advanced-control-bank em{font-size:8px;color:var(--adv-muted)}.advanced-rule-summary{padding:10px;border-left:2px solid var(--case-accent);background:var(--adv-panel-2);line-height:1.45!important}.advanced-report-input{display:grid;gap:7px;margin-top:20px}.advanced-report-input textarea{resize:vertical;padding:16px;border:1px solid var(--adv-line);border-radius:14px;background:#111821;color:var(--adv-text);line-height:1.6;outline:none}.advanced-report-input textarea:focus{border-color:var(--case-accent)}.advanced-report-input>span{justify-self:end;font-size:9px;color:#65bd9d}.advanced-report-input>span.short{color:#d6a05e}.advanced-required-facts{list-style:none;padding:0;margin:18px 0;display:grid;gap:10px}.advanced-required-facts li{display:grid;grid-template-columns:18px 1fr;gap:7px;color:#bac8d2;font-size:10px;line-height:1.45}.advanced-required-facts svg{color:var(--case-accent)}.advanced-ai-note{display:flex;gap:8px;padding:13px;border:1px solid var(--adv-line);border-radius:12px;background:var(--adv-panel-2);line-height:1.5!important}.advanced-ai-note svg{flex:0 0 auto;color:var(--case-accent)}.advanced-evaluation{margin-top:20px;padding:18px;border:1px solid var(--adv-line);border-radius:15px;background:var(--adv-panel-2)}.advanced-evaluation.passed{border-color:#397d67}.advanced-evaluation.needs-work{border-color:#8b633d}.advanced-evaluation>header{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center}.advanced-evaluation>header>span{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--case-accent) 15%,transparent);color:var(--case-accent)}.advanced-evaluation small{font-size:8px;color:var(--case-accent)}.advanced-evaluation h3{margin:2px 0 0;font-size:15px}.advanced-evaluation>header>strong{font-size:20px}.advanced-evaluation>p{font-size:10px;color:var(--adv-muted);line-height:1.55}.advanced-evaluation>div{display:grid;grid-template-columns:1fr 1fr;gap:15px}.advanced-evaluation section{padding:11px;border-radius:10px;background:#111821}.advanced-evaluation h4{font-size:9px;margin:0 0 7px;color:var(--case-accent)}.advanced-evaluation ul{padding-left:15px;margin:0;display:grid;gap:5px}.advanced-evaluation li{font-size:9px;color:#b9c7d0}.advanced-scenario-root button:focus-visible,.advanced-scenario-root select:focus-visible,.advanced-scenario-root input:focus-visible,.advanced-scenario-root textarea:focus-visible{outline:2px solid var(--case-accent);outline-offset:2px}@media(max-width:900px){.advanced-card-grid{grid-template-columns:1fr}.advanced-card{min-height:300px}.advanced-investigation-layout,.advanced-code-layout,.advanced-report-layout{grid-template-columns:1fr}.advanced-phase-rail span{justify-content:center}.advanced-phase-rail span:not(.active) {font-size:0}.advanced-builder{grid-template-columns:1fr 1fr}.advanced-builder b{display:none}.advanced-fact-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.advanced-header{padding:0 12px}.advanced-header>button{font-size:0}.advanced-game-shell{padding:14px 10px}.advanced-main-panel,.advanced-side-panel,.advanced-single-panel{padding:17px;border-radius:15px}.advanced-witness-tabs{grid-template-columns:1fr}.advanced-builder{grid-template-columns:1fr}.advanced-control-bank{grid-template-columns:repeat(2,1fr)}.advanced-calculation{grid-template-columns:1fr auto}.advanced-calculation span{grid-column:1/-1}.advanced-fact-grid{grid-template-columns:1fr}.advanced-evaluation>div{grid-template-columns:1fr}}
`;

export default AdvancedScenarioHub;
