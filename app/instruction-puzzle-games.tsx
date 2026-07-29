"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  Check,
  ChevronRight,
  Container,
  CornerDownLeft,
  Keyboard,
  Languages,
  RotateCcw,
  ShieldCheck,
  ShipWheel,
  Undo2,
  Waves,
  X,
} from "lucide-react";
import type { ScenarioRun } from "@/lib/scenarioData";
import {
  evaluateInstructionPuzzle,
  instructionPuzzleCasesByMode,
  type InstructionPuzzleCase,
  type InstructionPuzzleMode,
} from "@/lib/instructionPuzzleData";
import styles from "./instruction-puzzle-games.module.css";

export interface InstructionPuzzleHubProps {
  onComplete: (run: ScenarioRun) => void;
  priorRuns?: readonly ScenarioRun[];
  attemptedCaseIds?: readonly string[];
  initialMode?: InstructionPuzzleMode;
  onStartAttempt?: (caseId: string) => boolean;
  onExit?: () => void;
}

type ActiveAttempt = {
  puzzle: InstructionPuzzleCase;
  startedAt: string;
  firstAttempt: boolean;
  nonce: number;
};

const modeCopy: Record<InstructionPuzzleMode, {
  eyebrow: string;
  title: string;
  englishTitle: string;
  description: string;
  icon: typeof ShieldCheck;
}> = {
  "safety-console": {
    eyebrow: "MANUAL · SYMBOLER · LOGIK",
    title: "Havnens sikkerhedskonsol",
    englishTitle: "Harbor safety console",
    description: "En tydeligt fiktiv lyssimulation. Læs reglerne, beregn kontroltallet og byg signalrækken.",
    icon: ShieldCheck,
  },
  "cargo-routing": {
    eyebrow: "TIDEVAND · LAST · RUTE",
    title: "Tidevandscentralen",
    englishTitle: "Tide and cargo routing",
    description: "Før lasten til den rigtige kaj ved at kombinere vind, vandstand, prioritet og manualens rækkefølge.",
    icon: Container,
  },
};

function makeRunId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `instruction-puzzle-${Date.now()}`;
}

export function InstructionPuzzleHub({ onComplete, priorRuns = [], attemptedCaseIds = [], initialMode, onStartAttempt, onExit }: InstructionPuzzleHubProps) {
  const [mode, setMode] = useState<InstructionPuzzleMode | null>(initialMode ?? null);
  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [english, setEnglish] = useState(false);
  const [locallyAttempted, setLocallyAttempted] = useState<Set<string>>(() => new Set());

  const attemptedIds = useMemo(
    () => new Set([
      ...priorRuns.map((run) => run.caseId),
      ...attemptedCaseIds,
      ...locallyAttempted,
    ]),
    [priorRuns, attemptedCaseIds, locallyAttempted],
  );
  const successfulIds = useMemo(
    () => new Set(priorRuns.filter((run) => run.success).map((run) => run.caseId)),
    [priorRuns],
  );

  const markAttempted = useCallback((caseId: string) => {
    setLocallyAttempted((current) => {
      const next = new Set(current);
      next.add(caseId);
      return next;
    });
  }, []);

  const startPuzzle = useCallback((puzzle: InstructionPuzzleCase, forceReplay = false) => {
    const firstAttempt = !forceReplay && (onStartAttempt ? onStartAttempt(puzzle.id) : !attemptedIds.has(puzzle.id));
    markAttempted(puzzle.id);
    setAttempt({
      puzzle,
      startedAt: new Date().toISOString(),
      firstAttempt,
      nonce: Date.now(),
    });
  }, [attemptedIds, markAttempted, onStartAttempt]);

  if (attempt) {
    return (
      <PuzzlePlayer
        key={`${attempt.puzzle.id}-${attempt.nonce}`}
        puzzle={attempt.puzzle}
        startedAt={attempt.startedAt}
        firstAttempt={attempt.firstAttempt}
        english={english}
        onToggleEnglish={() => setEnglish((current) => !current)}
        onComplete={(run) => {
          markAttempted(attempt.puzzle.id);
          onComplete(run);
        }}
        onReplay={() => startPuzzle(attempt.puzzle, true)}
        onBack={() => setAttempt(null)}
      />
    );
  }

  if (mode) {
    const copy = modeCopy[mode];
    const Icon = copy.icon;
    const cases = instructionPuzzleCasesByMode[mode];
    return (
      <main className={`${styles.root} ${styles[mode]}`}>
        <Header
          title={copy.title}
          subtitle={copy.englishTitle}
          english={english}
          onToggleEnglish={() => setEnglish((current) => !current)}
          onBack={() => initialMode ? onExit?.() : setMode(null)}
        />
        <section className={styles.caseIntro}>
          <span className={styles.modeIcon}><Icon size={28} /></span>
          <div><p>{copy.eyebrow}</p><h1>{copy.title}</h1><span>{copy.description}</span></div>
        </section>
        <section className={styles.caseGrid} aria-label="Vælg en manualopgave">
          {cases.map((puzzle, index) => {
            const solved = successfulIds.has(puzzle.id);
            const tried = attemptedIds.has(puzzle.id);
            return (
              <button className={styles.caseCard} key={puzzle.id} onClick={() => startPuzzle(puzzle)}>
                <span className={styles.caseIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.level}>{puzzle.level}</span>
                <h2>{puzzle.title}</h2>
                {english && <p className={styles.english}>{puzzle.englishTitle}</p>}
                <p>{puzzle.objective}</p>
                <span className={styles.caseLocation}>{puzzle.location}</span>
                <span className={`${styles.caseState} ${solved ? styles.solved : ""}`}>
                  {solved ? <><Check size={15} /> Løst</> : tried ? <><RotateCcw size={15} /> Nyt forsøg</> : <><ChevronRight size={15} /> Start</>}
                </span>
              </button>
            );
          })}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <Header
        title="Manualværkstedet"
        subtitle="Read, calculate, deduce"
        english={english}
        onToggleEnglish={() => setEnglish((current) => !current)}
        onBack={onExit}
      />
      <section className={styles.hero}>
        <p>NYE HAVNEPRØVER · B1–B2</p>
        <h1>Læs manualen.<br />Find den eneste rute, der holder.</h1>
        <span>Reglerne er synlige hele tiden. Udfordringen er at forstå dansk præcist nok til at kombinere dem.</span>
        {english && <span className={styles.english}>The rules remain visible. Your task is to combine them precisely.</span>}
      </section>
      <section className={styles.modeGrid}>
        {(Object.keys(modeCopy) as InstructionPuzzleMode[]).map((modeId) => {
          const copy = modeCopy[modeId];
          const Icon = copy.icon;
          return (
            <button className={`${styles.modeCard} ${styles[modeId]}`} key={modeId} onClick={() => setMode(modeId)}>
              <span className={styles.modeIcon}><Icon size={30} /></span>
              <p>{copy.eyebrow}</p>
              <h2>{copy.title}</h2>
              {english && <span className={styles.english}>{copy.englishTitle}</span>}
              <span>{copy.description}</span>
              <strong>{instructionPuzzleCasesByMode[modeId].length} sager <ChevronRight size={17} /></strong>
            </button>
          );
        })}
      </section>
    </main>
  );
}

function Header({
  title,
  subtitle,
  english,
  onToggleEnglish,
  onBack,
}: {
  title: string;
  subtitle: string;
  english: boolean;
  onToggleEnglish: () => void;
  onBack?: () => void;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTitle}>
        {onBack && <button onClick={onBack} aria-label="Tilbage"><ArrowLeft size={20} /></button>}
        <span><strong>{title}</strong><small>{subtitle}</small></span>
      </div>
      <button className={`${styles.languageButton} ${english ? styles.active : ""}`} onClick={onToggleEnglish} aria-pressed={english}>
        <Languages size={17} /> English support
      </button>
    </header>
  );
}

function PuzzlePlayer({
  puzzle,
  startedAt,
  firstAttempt,
  english,
  onToggleEnglish,
  onComplete,
  onReplay,
  onBack,
}: {
  puzzle: InstructionPuzzleCase;
  startedAt: string;
  firstAttempt: boolean;
  english: boolean;
  onToggleEnglish: () => void;
  onComplete: (run: ScenarioRun) => void;
  onReplay: () => void;
  onBack: () => void;
}) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [calculation, setCalculation] = useState("");
  const [result, setResult] = useState<ReturnType<typeof evaluateInstructionPuzzle> & { score: number } | null>(null);

  const selectControl = useCallback((controlId: string) => {
    setSequence((current) => {
      if (current.length >= puzzle.solution.length || current.includes(controlId)) return current;
      return [...current, controlId];
    });
  }, [puzzle.solution.length]);

  const removeLast = useCallback(() => {
    setSequence((current) => current.slice(0, -1));
  }, []);

  const submit = useCallback(() => {
    if (result || sequence.length !== puzzle.solution.length || calculation.trim() === "") return;
    const numericCalculation = Number(calculation);
    if (!Number.isFinite(numericCalculation)) return;
    const evaluation = evaluateInstructionPuzzle(puzzle, sequence, numericCalculation);
    const score = evaluation.success
      ? puzzle.maxScore
      : Math.max(80, 65 + evaluation.correctPositions * 34 + (evaluation.calculationCorrect ? 25 : 0));
    setResult({ ...evaluation, score });
    onComplete({
      id: makeRunId(),
      kind: puzzle.mode,
      caseId: puzzle.id,
      title: puzzle.title,
      level: puzzle.level,
      startedAt,
      endedAt: new Date().toISOString(),
      success: evaluation.success,
      score,
      maxScore: puzzle.maxScore,
      path: [puzzle.mode, ...sequence, `calc:${numericCalculation}`],
      decisions: [
        ...sequence.map((controlId, index) => {
          const control = puzzle.controls.find((candidate) => candidate.id === controlId)!;
          return {
            stepId: `sequence-${index + 1}`,
            answerId: controlId,
            answerText: control.label,
            correct: puzzle.solution[index] === controlId,
          };
        }),
        {
          stepId: "calculation",
          answerId: String(numericCalculation),
          answerText: `${puzzle.calculation.expression} = ${numericCalculation}`,
          correct: evaluation.calculationCorrect,
        },
      ],
      metadata: {
        scenarioFamily: "instruction-puzzle",
        puzzleMode: puzzle.mode,
        firstAttempt,
        firstAttemptEligible: firstAttempt && evaluation.success,
        checksUsed: 1,
        hintsUsed: 0,
        calculationAnswer: numericCalculation,
        correctPositions: evaluation.correctPositions,
        sequenceLength: sequence.length,
        selectedSequence: sequence,
      },
    });
  }, [calculation, firstAttempt, onComplete, puzzle, result, sequence, startedAt]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (event.key === "Escape") {
        event.preventDefault();
        onBack();
        return;
      }
      if (typing || result) return;
      if (/^[1-9]$/.test(event.key)) {
        const control = puzzle.controls[Number(event.key) - 1];
        if (control) {
          event.preventDefault();
          selectControl(control.id);
        }
      } else if (event.key === "Backspace") {
        event.preventDefault();
        removeLast();
      } else if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack, puzzle.controls, removeLast, result, selectControl, submit]);

  if (result) {
    return (
      <main className={`${styles.root} ${styles[puzzle.mode]}`}>
        <Header title={puzzle.title} subtitle={puzzle.englishTitle} english={english} onToggleEnglish={onToggleEnglish} onBack={onBack} />
        <section className={`${styles.result} ${result.success ? styles.success : styles.failure}`}>
          <span className={styles.resultIcon}>{result.success ? <Check size={34} /> : <X size={34} />}</span>
          <p>{result.success ? "RUTEN HOLDER" : "MANUALEN SKAL LÆSES IGEN"}</p>
          <h1>{result.success ? "Korrekt deduktion" : "En regel blev overset"}</h1>
          <span>{result.correctPositions}/{puzzle.solution.length} positioner · {result.calculationCorrect ? "beregningen er korrekt" : "beregningen er forkert"}</span>
          {english && <span className={styles.english}>{result.success ? "Correct deduction" : "One or more rules were missed"}</span>}
          <div className={styles.derivation}>
            <h2>Sådan følger løsningen manualen</h2>
            {puzzle.derivation.map((line, index) => <p key={line}><b>{index + 1}</b>{line}</p>)}
          </div>
          <div className={styles.resultActions}>
            <button className={styles.secondaryButton} onClick={onBack}>Vælg en anden sag</button>
            <button className={styles.primaryButton} onClick={onReplay}><RotateCcw size={17} /> {result.success ? "Spil igen" : "Nyt forsøg"}</button>
          </div>
        </section>
      </main>
    );
  }

  const ready = sequence.length === puzzle.solution.length && calculation.trim() !== "";
  const modeIcon = puzzle.mode === "safety-console" ? ShieldCheck : ShipWheel;
  const ModeIcon = modeIcon;
  return (
    <main className={`${styles.root} ${styles[puzzle.mode]}`}>
      <Header title={puzzle.title} subtitle={`${puzzle.level} · ${puzzle.location}`} english={english} onToggleEnglish={onToggleEnglish} onBack={onBack} />
      <section className={styles.puzzleHeading}>
        <span className={styles.modeIcon}><ModeIcon size={25} /></span>
        <div>
          <p>{puzzle.mode === "safety-console" ? "ABSTRAKT TRÆNINGSKONSOL" : "TIDEVANDS- OG LASTCENTRAL"}</p>
          <h1>{puzzle.objective}</h1>
          {english && <span className={styles.english}>{puzzle.englishObjective}</span>}
        </div>
        {firstAttempt && <span className={styles.firstAttempt}>FØRSTE FORSØG</span>}
      </section>

      <div className={styles.playLayout}>
        <aside className={styles.manualPanel} aria-label="Manual">
          <div className={styles.panelTitle}><BookOpen size={20} /><div><strong>Driftsmanual</strong><span>Alle nødvendige regler</span></div></div>
          {puzzle.safetyNote && <p className={styles.safetyNote}><ShieldCheck size={15} />{puzzle.safetyNote}</p>}
          {puzzle.manual.map((section) => (
            <section className={styles.manualSection} key={section.id}>
              <h2>{section.title}</h2>
              {english && <span className={styles.english}>{section.englishTitle}</span>}
              {section.rules.map((rule) => (
                <div className={styles.rule} key={rule.id}>
                  <i />
                  <p>{rule.text}{english && <small>{rule.englishText}</small>}</p>
                </div>
              ))}
            </section>
          ))}
        </aside>

        <section className={styles.workPanel}>
          <div className={styles.contextCard}>
            <p>{puzzle.context}</p>
            {english && <span className={styles.english}>{puzzle.englishContext}</span>}
          </div>
          <div className={styles.factGrid}>
            {puzzle.facts.map((fact) => <div key={fact.id}><span>{fact.label}{english && <small>{fact.englishLabel}</small>}</span><strong>{fact.value}</strong></div>)}
          </div>

          <section className={styles.calculationCard}>
            <div><Calculator size={21} /><span><strong>{puzzle.calculation.label}</strong>{english && <small>{puzzle.calculation.englishLabel}</small>}</span></div>
            <label>
              <code>{puzzle.calculation.expression}</code>
              <span>=</span>
              <input
                inputMode="numeric"
                type="number"
                value={calculation}
                onChange={(event) => setCalculation(event.target.value)}
                aria-label={puzzle.calculation.label}
                placeholder="?"
              />
              <small>{puzzle.calculation.unit}</small>
            </label>
          </section>

          <section className={styles.sequenceBuilder}>
            <div className={styles.builderTitle}>
              <div><Waves size={20} /><span><strong>Din rækkefølge</strong><small>{sequence.length}/{puzzle.solution.length} signaler</small></span></div>
              <button onClick={removeLast} disabled={sequence.length === 0}><Undo2 size={15} /> Fortryd</button>
            </div>
            <div className={styles.sequenceSlots}>
              {Array.from({ length: puzzle.solution.length }, (_, index) => {
                const selected = puzzle.controls.find((control) => control.id === sequence[index]);
                return <span className={selected ? styles.filled : ""} key={index}>{selected ? <><b>{selected.symbol}</b><small>{selected.label}</small></> : index + 1}</span>;
              })}
            </div>
            <div className={styles.controlGrid}>
              {puzzle.controls.map((control, index) => {
                const used = sequence.includes(control.id);
                return (
                  <button key={control.id} disabled={used || sequence.length >= puzzle.solution.length} onClick={() => selectControl(control.id)}>
                    <kbd>{index + 1}</kbd><b>{control.symbol}</b><span>{control.label}<small>{english ? control.englishLabel : control.description}</small></span>
                  </button>
                );
              })}
            </div>
          </section>

          <footer className={styles.submitBar}>
            <span><Keyboard size={16} /> 1–9 vælger · Backspace fortryder · Enter kontrollerer</span>
            <button className={styles.primaryButton} disabled={!ready} onClick={submit}>Kontrollér rækkefølge <CornerDownLeft size={17} /></button>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default InstructionPuzzleHub;
