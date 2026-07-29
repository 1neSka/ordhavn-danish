"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Accessibility,
  ArrowLeft,
  Bike,
  Brain,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Eye,
  Gamepad2,
  Grid3X3,
  Lightbulb,
  LockKeyhole,
  MailWarning,
  Map,
  MessageCircleMore,
  Moon,
  PackageCheck,
  RotateCcw,
  Settings,
  ShieldCheck,
  Signal,
  Smartphone,
  Sparkles,
  Sun,
  TrainFront,
  Trophy,
  X,
} from "lucide-react";
import {
  dialogueCharacters,
  metroCases,
  phoneMissions,
  phonePages,
  phoneSettings,
  postCases,
  type DialogueCharacter,
  type MetroCase,
  type PhoneMission,
  type PhoneValue,
  type PostCase,
  type ScenarioKind,
  type ScenarioLevel,
  type ScenarioRun,
} from "@/lib/scenarioData";
import { dialogueContinuationEpisodes } from "@/lib/dialogueEpisodes";
import { harborCharacters, harborScenarioCases, type HarborScenarioCase, type HarborRankId } from "@/lib/harborData";
import { cargoRoutingCases, safetyConsoleCases } from "@/lib/instructionPuzzleData";
import InstructionPuzzleHub from "./instruction-puzzle-games";
import AdvancedScenarioHub from "./advanced-scenario-games";
import { CityScenarioHub } from "./city-scenario-games";
import { LogicScenarioHub, type LogicScenarioRun } from "./logic-scenario-games";
import { advancedScenarioCards } from "@/lib/advancedScenarioData";
import { cityScenarioCards, getCityCase, type CityAttemptMetadata } from "@/lib/cityScenarioData";
import { logicScenarioCards } from "@/lib/logicScenarioData";
import { evaluateScenarioSubmission } from "@/lib/scenarioAiClient";

type ScenarioHubProps = {
  runs: ScenarioRun[];
  kroner: number;
  unlockedScenarioIds: string[];
  attemptedScenarioIds: string[];
  maritimeRankId: HarborRankId;
  relationships: Record<string, number>;
  onStartAttempt: (caseId: string) => boolean;
  onComplete: (run: ScenarioRun) => void;
  onUnlockScenario: (caseId: string, cost: number, ravCost?: number) => boolean;
  onSpendKroner: (amount: number, reason: string) => boolean;
  onUseHint: () => boolean;
};

type ActiveGame = ScenarioKind | null;

const gameCards: Array<{
  kind: ScenarioKind;
  eyebrow: string;
  title: string;
  level: string;
  levels: ScenarioLevel[];
  description: string;
  meta: string;
  icon: typeof Smartphone;
  tone: string;
}> = [
  {
    kind: "harbor",
    eyebrow: "Hverdagsboss",
    title: "Livet ved kajen",
    level: "A1–A2",
    levels: ["A1", "A2"],
    description: "Bestil, forklar et cykelproblem og brug en pakkeboks. Små danske beslutninger med konkrete konsekvenser.",
    meta: `${harborScenarioCases.length} kontrakter · flere grene`,
    icon: Coffee,
    tone: "mint",
  },
  {
    kind: "phone",
    eyebrow: "Systemjagt",
    title: "Indstillingerne",
    level: "A2–B1",
    levels: ["A2", "B1"],
    description: "Læs et rigtigt behov, find selv gennem telefonens danske menuer, og konfigurér den præcise løsning.",
    meta: `${phoneMissions.length} missioner · fri navigation`,
    icon: Smartphone,
    tone: "violet",
  },
  {
    kind: "dialogue",
    eyebrow: "Social strategi",
    title: "Mellem linjerne",
    level: "B1–B2",
    levels: ["B1", "B2"],
    description: "Læs personen, vælg svar og balancér tillid, spænding, grænser og skjulte psykologiske behov.",
    meta: `${dialogueCharacters.length + dialogueContinuationEpisodes.length} episoder · 3 psykologier`,
    icon: MessageCircleMore,
    tone: "rose",
  },
  {
    kind: "post",
    eyebrow: "Informationsdetektiv",
    title: "Den mistænkelige post",
    level: "A2–B2",
    levels: ["A2", "B1", "B2"],
    description: "Markér sproglige og kontekstuelle spor i mails, og vælg en sikker handling under tidspres.",
    meta: `${postCases.length} sager · evidensbaseret`,
    icon: MailWarning,
    tone: "amber",
  },
  {
    kind: "metro",
    eyebrow: "Dispatch-puslespil",
    title: "Sidste forbindelse",
    level: "A2–B2",
    levels: ["A2", "B1", "B2"],
    description: "Kombinér driftsmeldinger, tid, tilgængelighed og skift til én rute, der faktisk virker.",
    meta: `${metroCases.length} hændelser · flere begrænsninger`,
    icon: TrainFront,
    tone: "cyan",
  },
  {
    kind: "safety-console",
    eyebrow: "Manualprøve",
    title: "Sikkerhedskonsollen",
    level: "B1–B2",
    levels: ["B1", "B2"],
    description: "Læs en driftsmanual, kombiner serienummer, farver og symbolregler, og beregn kontroltallet før du låser rækkefølgen.",
    meta: `${safetyConsoleCases.length} sværhedsgrader · logik + matematik`,
    icon: ShieldCheck,
    tone: "violet",
  },
  {
    kind: "cargo-routing",
    eyebrow: "Tidevandspuslespil",
    title: "Tidevandscentralen",
    level: "B1–B2",
    levels: ["B1", "B2"],
    description: "Før lasten gennem havnen ved at krydslæse vind, vandstand, prioritet, brokapacitet og destination.",
    meta: `${cargoRoutingCases.length} sager · ruter + beregninger`,
    icon: PackageCheck,
    tone: "mint",
  },
  {
    kind: "advanced",
    eyebrow: "AI-hybrid efterforskning",
    title: "Sagslaboratoriet",
    level: "B1–B2",
    levels: ["B1", "B2"],
    description: "Afhør vidner, læs evidentialitet, løs entydige protokoller og skriv dansk, som vurderes uden at lade AI styre selve puslespillet.",
    meta: `${advancedScenarioCards.length} sager · kode + fri produktion`,
    icon: Brain,
    tone: "cyan",
  },
  {
    kind: "logic",
    eyebrow: "Sprog som logikmotor",
    title: "Vagtcentralen",
    level: "B1–B2",
    levels: ["B1", "B2"],
    description: "Placer hold i en entydig begrænsningsmatrix, og redigér driftsmeldinger uden at ændre betydningen af før, efter, kun og medmindre.",
    meta: `${logicScenarioCards.length} sager · gitter + betydningsredigering`,
    icon: Grid3X3,
    tone: "rose",
  },
  {
    kind: "city",
    eyebrow: "Hverdagslogik i byen",
    title: "Borgerservice & bybud",
    level: "A2–B1",
    levels: ["A2", "B1"],
    description: "Læs digital post, udfyld blanketter, beregn gebyrer og planlæg en rute med tidsvinduer, zoner og den billigste gyldige billet.",
    meta: `${cityScenarioCards.reduce((sum, card) => sum + card.caseCount, 0)} sager · dokumenter + ruter`,
    icon: Building2,
    tone: "amber",
  },
];

const dialogueEpisodeCatalog = [...dialogueCharacters, ...dialogueContinuationEpisodes];
const maritimeRankOrder: HarborRankId[] = ["skibsdreng", "letmatros", "matros", "baadsmand", "styrmand", "skipper", "lods", "havnefoged"];

function dialogueEpisodeGate(item: DialogueCharacter) {
  const owner = harborCharacters.find((character) => character.id === item.id);
  const episode = owner?.episodes.find((candidate) => candidate.scenarioId === item.case.id);
  const previousScenarioId = episode?.unlock.completedEpisodeId
    ? owner?.episodes.find((candidate) => candidate.id === episode.unlock.completedEpisodeId)?.scenarioId
    : undefined;
  return { owner, episode, previousScenarioId };
}

function runId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `scenario-${Date.now()}`;
}

function cityRunFromMetadata(metadata: CityAttemptMetadata): ScenarioRun {
  const cityCase = getCityCase(metadata.scenarioId, metadata.caseId);
  const endedAt = new Date().toISOString();
  const checksUsed = Math.max(1, metadata.attemptNumber);
  const score = Math.max(140, 320 - (checksUsed - 1) * 40);
  return {
    id: runId(),
    kind: "city",
    caseId: metadata.caseId,
    title: cityCase?.title ?? metadata.caseId,
    level: cityCase?.level === "B1" ? "B1" : "A2",
    startedAt: endedAt,
    endedAt,
    success: true,
    score,
    maxScore: 320,
    path: [metadata.scenarioId, metadata.caseId],
    decisions: [],
    metadata: {
      scenarioId: metadata.scenarioId,
      checksUsed,
      hintsUsed: 0,
      firstAttemptEligible: metadata.firstAttemptEligible,
      firstAttemptSuccess: metadata.firstAttemptSuccess,
      localScore: metadata.score,
      kronerReward: metadata.kronerEarned,
    },
  };
}

function LevelBadge({ level }: { level: string }) {
  return <span className={`scenario-level level-${level.toLowerCase().replace("–", "-")}`}>{level}</span>;
}

function ScenarioCardVisual({ kind }: { kind: ScenarioKind }) {
  if (kind === "harbor") return (
    <div className="scenario-card-visual visual-harbor" aria-hidden="true">
      <span className="mini-harbor-house house-one" /><span className="mini-harbor-house house-two" />
      <span className="mini-harbor-quay" /><span className="mini-harbor-water"><i /><i /></span>
      <span className="mini-harbor-boat"><b>Ø</b></span>
    </div>
  );
  if (kind === "phone") return (
    <div className="scenario-card-visual visual-phone" aria-hidden="true">
      <span className="mini-phone"><i /><Settings size={19} /><b /><b /><b /></span>
      <span className="mini-signal"><Signal size={17} /><em>5G</em></span>
    </div>
  );
  if (kind === "dialogue") return (
    <div className="scenario-card-visual visual-dialogue" aria-hidden="true">
      <span className="mini-avatar"><Eye size={23} /></span>
      <span className="mini-bubble bubble-one">…</span><span className="mini-bubble bubble-two">?</span>
      <span className="mini-dialogue-meter"><i /></span>
    </div>
  );
  if (kind === "post") return (
    <div className="scenario-card-visual visual-post" aria-hidden="true">
      <span className="mini-envelope"><i /><MailWarning size={22} /></span>
      <span className="mini-post-clue clue-one" /><span className="mini-post-clue clue-two" /><span className="mini-post-stamp">!</span>
    </div>
  );
  if (kind === "metro") return (
    <div className="scenario-card-visual visual-metro" aria-hidden="true">
      <span className="mini-metro-line"><i /><i /><i /><i /></span>
      <span className="mini-train"><TrainFront size={21} /></span><span className="mini-metro-time">08.21</span>
    </div>
  );
  if (kind === "safety-console") return (
    <div className="scenario-card-visual visual-console" aria-hidden="true">
      <span className="mini-console-screen"><ShieldCheck size={20} /><b>42—7</b></span>
      <span className="mini-console-keys">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</span>
    </div>
  );
  if (kind === "cargo-routing") return (
    <div className="scenario-card-visual visual-cargo" aria-hidden="true">
      <span className="mini-crate crate-one" /><span className="mini-crate crate-two" /><span className="mini-crate crate-three" />
      <span className="mini-tide"><i /><i /><i /></span><PackageCheck size={21} />
    </div>
  );
  if (kind === "advanced") return (
    <div className="scenario-card-visual visual-investigation" aria-hidden="true">
      <span className="mini-evidence evidence-one" /><span className="mini-evidence evidence-two" /><span className="mini-evidence evidence-three" />
      <span className="mini-evidence-lines"><i /><i /></span><Brain size={24} />
    </div>
  );
  if (kind === "logic") return (
    <div className="scenario-card-visual visual-logic" aria-hidden="true">
      <span className="mini-logic-grid">{Array.from({ length: 9 }, (_, index) => <i className={index === 1 || index === 5 || index === 6 ? "active" : ""} key={index} />)}</span>
      <span className="mini-logic-rule">hvis → kun hvis</span>
    </div>
  );
  return (
    <div className="scenario-card-visual visual-city" aria-hidden="true">
      <span className="mini-city-buildings"><i /><i /><i /><i /></span>
      <span className="mini-city-route"><i /><i /><i /></span><Building2 size={22} />
    </div>
  );
}

function ScenarioHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <header className="scenario-play-header">
      <button className="icon-button scenario-back" onClick={onBack} aria-label="Tilbage">
        <ArrowLeft size={20} />
      </button>
      <div>
        <p className="eyebrow">Interaktivt scenarie</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function CaseResult({
  success,
  title,
  text,
  score,
  onReplay,
  onCases,
  replayLabel = "Prøv igen",
}: {
  success: boolean;
  title: string;
  text: string;
  score: number;
  onReplay: () => void;
  onCases: () => void;
  replayLabel?: string;
}) {
  return (
    <div className={`scenario-result ${success ? "success" : "retry"}`}>
      <div className="result-orbit">{success ? <Trophy size={34} /> : <RotateCcw size={32} />}</div>
      <p className="eyebrow">{success ? "Scenariet løst" : "Ny strategi nødvendig"}</p>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="scenario-score"><Sparkles size={17} /> {score} XP</div>
      <div className="result-actions">
        <button className="secondary-button" onClick={onCases}>Vælg en anden sag</button>
        <button className="primary-button" onClick={onReplay}><RotateCcw size={16} /> {replayLabel}</button>
      </div>
    </div>
  );
}

export default function ScenarioHub({ runs, kroner, unlockedScenarioIds, attemptedScenarioIds, maritimeRankId, relationships, onStartAttempt, onComplete, onUnlockScenario, onSpendKroner, onUseHint }: ScenarioHubProps) {
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [levelFilter, setLevelFilter] = useState<"alle" | ScenarioLevel>("alle");
  const successful = useMemo(() => new Set(runs.filter((run) => run.success).map((run) => run.caseId)), [runs]);
  const visibleGames = levelFilter === "alle"
    ? gameCards
    : gameCards.filter((game) => game.levels.includes(levelFilter));

  const common = { onComplete, successful, unlockedScenarioIds, attemptedScenarioIds, maritimeRankId, relationships, onStartAttempt, onUnlockScenario, onSpendKroner, onUseHint };
  if (activeGame === "harbor") return <HarborCaseGame onExit={() => setActiveGame(null)} {...common} />;
  if (activeGame === "phone") return <PhoneGame onExit={() => setActiveGame(null)} {...common} />;
  if (activeGame === "dialogue") return <DialogueGame onExit={() => setActiveGame(null)} {...common} />;
  if (activeGame === "post") return <PostGame onExit={() => setActiveGame(null)} {...common} />;
  if (activeGame === "metro") return <MetroGame onExit={() => setActiveGame(null)} {...common} />;
  if (activeGame === "safety-console" || activeGame === "cargo-routing") {
    return <InstructionPuzzleHub
      initialMode={activeGame}
      priorRuns={runs}
      attemptedCaseIds={attemptedScenarioIds}
      onStartAttempt={onStartAttempt}
      onComplete={onComplete}
      onExit={() => setActiveGame(null)}
    />;
  }
  if (activeGame === "advanced") {
    return <AdvancedScenarioHub
      runs={runs}
      onComplete={onComplete}
      onEvaluate={evaluateScenarioSubmission}
      onStartAttempt={onStartAttempt}
      onExit={() => setActiveGame(null)}
    />;
  }
  if (activeGame === "logic") {
    return <LogicScenarioHub
      runs={runs.filter((run) => run.kind === "logic") as LogicScenarioRun[]}
      onComplete={onComplete}
      onEvaluate={evaluateScenarioSubmission}
      onStartAttempt={onStartAttempt}
      onExit={() => setActiveGame(null)}
    />;
  }
  if (activeGame === "city") {
    return <CityScenarioHub
      onExit={() => setActiveGame(null)}
      onStartAttempt={onStartAttempt}
      onComplete={(metadata) => onComplete(cityRunFromMetadata(metadata))}
    />;
  }

  return (
    <main className="scenario-hub">
      <section className="scenario-hero">
        <div>
          <p className="eyebrow"><Gamepad2 size={15} /> Scenario Lab</p>
          <h1>Dansk, når der er noget på spil.</h1>
          <p>Ikke oversæt en sætning. Forstå situationen, find signalerne og tag en beslutning, der virker i den virkelige verden.</p>
          <div className="scenario-hero-meta">
            <span><Brain size={17} /> {gameCards.length} systemer</span>
            <span><ShieldCheck size={17} /> A1 → B2</span>
            <span><Trophy size={17} /> {successful.size} løst</span>
            <span>{kroner} kr. i havnekassen</span>
          </div>
        </div>
        <div className="scenario-hero-art" aria-hidden="true">
          <div className="art-phone"><Settings size={28} /><span>Indstillinger</span></div>
          <div className="art-message">Hvad mener hun egentlig?</div>
          <div className="art-route"><TrainFront size={24} /> M3 · 08.21</div>
        </div>
      </section>

      <section className="scenario-catalog-bar" aria-label="Filtrér scenarier efter niveau">
        <div>
          <p className="eyebrow">SAGSKATALOG</p>
          <strong>{visibleGames.length} interaktive systemer</strong>
        </div>
        <div className="scenario-level-filters">
          {(["alle", "A2", "B1", "B2"] as const).map((level) => (
            <button
              key={level}
              type="button"
              className={levelFilter === level ? "active" : ""}
              aria-pressed={levelFilter === level}
              onClick={() => setLevelFilter(level)}
            >
              {level === "alle" ? "Alle" : level}
            </button>
          ))}
        </div>
      </section>

      <section className="scenario-grid" aria-label="Scenariespil">
        {visibleGames.map((game) => {
          const Icon = game.icon;
          const completed = runs.filter((run) => run.kind === game.kind && run.success).length;
          return (
            <button type="button" key={game.kind} className={`scenario-card has-scene kind-${game.kind} ${game.tone}`} onClick={() => setActiveGame(game.kind)}>
              <div className="scenario-card-top">
                <span className="scenario-card-icon"><Icon size={25} /></span>
                <LevelBadge level={game.level} />
              </div>
              <ScenarioCardVisual kind={game.kind} />
              <p className="eyebrow">{game.eyebrow}</p>
              <h2>{game.title}</h2>
              <p>{game.description}</p>
              <div className="scenario-card-foot">
                <span>{game.meta}</span>
                <span className="scenario-complete"><Check size={14} /> {completed}</span>
              </div>
            </button>
          );
        })}
      </section>
    </main>
  );
}

function HarborCaseGame({ onExit, onComplete, successful, unlockedScenarioIds, attemptedScenarioIds, onStartAttempt, onUnlockScenario, onSpendKroner }: GameCommonProps) {
  const [currentCase, setCurrentCase] = useState<HarborScenarioCase | null>(null);
  const [nodeId, setNodeId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [path, setPath] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<ScenarioRun["decisions"]>([]);
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<{ success: boolean; score: number; text: string } | null>(null);
  const [firstAttemptEligible, setFirstAttemptEligible] = useState(false);

  const start = (item: HarborScenarioCase) => {
    setFirstAttemptEligible(onStartAttempt(item.id));
    setCurrentCase(item); setNodeId(item.startNode); setStartedAt(new Date().toISOString()); setPath([item.startNode]); setDecisions([]); setFeedback(""); setResult(null);
  };

  const pickCase = (item: HarborScenarioCase) => {
    if (attemptedScenarioIds.includes(item.id) && !onSpendKroner(item.retryCostKr, "et nyt kontraktforsøg")) return;
    start(item);
  };

  const choose = (choiceId: string) => {
    if (!currentCase || feedback || result) return;
    const node = currentCase.nodes[nodeId];
    const choice = node.choices?.find((item) => item.id === choiceId);
    if (!choice) return;
    const nextDecisions = [...decisions, { stepId: node.id, answerId: choice.id, answerText: choice.text, correct: choice.correct }];
    const nextPath = [...path, choice.next];
    setDecisions(nextDecisions); setPath(nextPath); setFeedback(choice.feedback);
    const nextNode = currentCase.nodes[choice.next];
    if (nextNode.type === "terminal" && nextNode.terminal) {
      const success = nextNode.terminal.success;
      const correctChoices = nextDecisions.filter((item) => item.correct).length;
      const score = success ? Math.min(320, 180 + correctChoices * 45) : Math.max(60, 90 + correctChoices * 20);
      setResult({ success, score, text: nextNode.terminal.summary });
      onComplete({
        id: runId(), kind: "harbor", caseId: currentCase.id, title: currentCase.title, level: currentCase.level,
        startedAt, endedAt: new Date().toISOString(), success, score, maxScore: 320, path: nextPath, decisions: nextDecisions,
        metadata: { checksUsed: 1, hintsUsed: 0, firstAttemptEligible, location: currentCase.location, skills: currentCase.skills },
      });
      return;
    }
    window.setTimeout(() => { setNodeId(choice.next); setFeedback(""); }, 520);
  };

  if (!currentCase) return <main className="scenario-play-page"><ScenarioHeader title="Livet ved kajen" subtitle="A1–A2-kontrakter fra Ordhavns beboere." onBack={onExit} /><CasePicker cases={harborScenarioCases} successful={successful} unlockedScenarioIds={unlockedScenarioIds} onUnlock={onUnlockScenario} onPick={pickCase} renderDescription={(item) => `${item.location} · ${item.objective}`} /></main>;
  if (result) return <main className="scenario-play-page"><ScenarioHeader title="Livet ved kajen" subtitle={currentCase.title} onBack={() => setCurrentCase(null)} /><CaseResult success={result.success} title={result.success ? "Kontrakten er løst" : "Opgaven skal prøves igen"} text={result.text} score={result.score} replayLabel={`Prøv igen · ${currentCase.retryCostKr} kr.`} onReplay={() => { if (onSpendKroner(currentCase.retryCostKr, "et nyt kontraktforsøg")) start(currentCase); }} onCases={() => setCurrentCase(null)} /></main>;

  const node = currentCase.nodes[nodeId];
  return (
    <main className="scenario-play-page">
      <ScenarioHeader title={currentCase.title} subtitle={`${currentCase.level} · ${currentCase.location}`} onBack={() => setCurrentCase(null)} />
      <div className={`harbor-case-stage case-${currentCase.icon}`}>
        <div className="harbor-case-icon">{currentCase.icon === "coffee" ? <Coffee size={32} /> : currentCase.icon === "bike" ? <Bike size={32} /> : <PackageCheck size={32} />}</div>
        <p className="eyebrow">KONTRAKTENS MÅL</p><h2>{currentCase.objective}</h2>
        {node.speaker && <span className="harbor-speaker">{node.speaker}</span>}
        <blockquote>“{node.text}”</blockquote>
        {node.englishSupport && <p className="english-support">{node.englishSupport}</p>}
        <div className="harbor-case-choices">{node.choices?.map((choice, index) => <button key={choice.id} disabled={Boolean(feedback)} onClick={() => choose(choice.id)}><span>{String.fromCharCode(65 + index)}</span>{choice.text}</button>)}</div>
        {feedback && <div className="harbor-choice-feedback"><Lightbulb size={17} />{feedback}</div>}
      </div>
    </main>
  );
}

type GameCommonProps = {
  onExit: () => void;
  onComplete: (run: ScenarioRun) => void;
  successful: Set<string>;
  unlockedScenarioIds: string[];
  attemptedScenarioIds: string[];
  maritimeRankId: HarborRankId;
  relationships: Record<string, number>;
  onStartAttempt: (caseId: string) => boolean;
  onUnlockScenario: (caseId: string, cost: number, ravCost?: number) => boolean;
  onSpendKroner: (amount: number, reason: string) => boolean;
  onUseHint: () => boolean;
};

function continuationCost(level: string, index: number) {
  if (index === 0) return 0;
  return level === "B2" ? 240 : level === "B1" ? 160 : 100;
}

function CasePicker<T extends { id: string; title: string; level: string }>({
  cases,
  successful,
  onPick,
  renderDescription,
  unlockedScenarioIds,
  onUnlock,
}: {
  cases: T[];
  successful: Set<string>;
  onPick: (item: T) => void;
  renderDescription: (item: T) => string;
  unlockedScenarioIds: string[];
  onUnlock: (caseId: string, cost: number) => boolean;
}) {
  return (
    <div className="case-picker">
      {cases.map((item, index) => {
        const cost = continuationCost(item.level, index);
        const locked = cost > 0 && !successful.has(item.id) && !unlockedScenarioIds.includes(item.id);
        return (
        <button className={`case-pick-card ${locked ? "case-locked" : ""}`} key={item.id} onClick={() => {
          if (!locked || onUnlock(item.id, cost)) onPick(item);
        }}>
          <div className="case-number">{String(index + 1).padStart(2, "0")}</div>
          <div>
            <div className="case-title-row"><h3>{item.title}</h3><LevelBadge level={item.level} /></div>
            <p>{renderDescription(item)}</p>
          </div>
          <span className={`case-status ${successful.has(item.id) ? "done" : locked ? "priced" : ""}`}>
            {successful.has(item.id) ? <Check size={18} /> : locked ? <><LockKeyhole size={13} />{cost}</> : <ChevronRight size={18} />}
          </span>
        </button>
      )})}
    </div>
  );
}

function PhoneGame({ onExit, onComplete, successful, unlockedScenarioIds, onStartAttempt, onUnlockScenario, onSpendKroner, onUseHint }: GameCommonProps) {
  const [mission, setMission] = useState<PhoneMission | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [page, setPage] = useState("root");
  const [values, setValues] = useState<Record<string, PhoneValue>>({});
  const [path, setPath] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<ScenarioRun["decisions"]>([]);
  const [checks, setChecks] = useState(0);
  const [hint, setHint] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<{ score: number } | null>(null);
  const [firstAttemptEligible, setFirstAttemptEligible] = useState(false);

  const startMission = (next: PhoneMission) => {
    setFirstAttemptEligible(onStartAttempt(next.id));
    const defaults = Object.fromEntries(Object.values(phoneSettings).map((setting) => {
      if (setting.type === "toggle") return [setting.id, false];
      if (setting.type === "slider") return [setting.id, setting.min ?? 1];
      return [setting.id, setting.options?.[0]?.value ?? ""];
    }));
    setMission(next);
    setStartedAt(new Date().toISOString());
    setPage("root");
    setValues({ ...defaults, ...next.initialState });
    setPath(["root"]);
    setDecisions([]);
    setChecks(0);
    setHint(false);
    setMissing([]);
    setResult(null);
  };

  const visit = (nextPage: string) => {
    setPage(nextPage);
    setPath((current) => [...current, nextPage]);
  };

  const changeSetting = (id: string, value: PhoneValue) => {
    setValues((current) => ({ ...current, [id]: value }));
    setDecisions((current) => [...current, {
      stepId: page,
      answerId: id,
      answerText: `${phoneSettings[id].label}: ${String(value)}`,
      correct: Object.prototype.hasOwnProperty.call(mission?.requirements ?? {}, id) ? mission?.requirements[id] === value : null,
    }]);
    setMissing((current) => current.filter((item) => item !== id));
  };

  const checkSolution = () => {
    if (!mission) return;
    if (!onSpendKroner(12, "systemkontrol")) return;
    const unmet = Object.entries(mission.requirements).filter(([id, required]) => values[id] !== required).map(([id]) => id);
    const nextChecks = checks + 1;
    setChecks(nextChecks);
    setMissing(unmet);
    if (unmet.length === 0) {
      const score = Math.max(140, 320 - (nextChecks - 1) * 35 - (hint ? 45 : 0) - Math.max(0, decisions.length - 5) * 3);
      setResult({ score });
      onComplete({
        id: runId(), kind: "phone", caseId: mission.id, title: mission.title, level: mission.level,
        startedAt, endedAt: new Date().toISOString(), success: true, score, maxScore: 320,
        path, decisions, metadata: { checks: nextChecks, usedHint: hint, firstAttemptEligible, settingChanges: decisions.length },
      });
    }
  };

  if (!mission) {
    return (
      <main className="scenario-play-page">
        <ScenarioHeader title="Indstillingerne" subtitle="Find løsningen i en telefon, der kun taler dansk." onBack={onExit} />
        <CasePicker cases={phoneMissions} successful={successful} unlockedScenarioIds={unlockedScenarioIds} onUnlock={onUnlockScenario} onPick={startMission} renderDescription={(item) => item.brief} />
      </main>
    );
  }

  if (result) {
    return <main className="scenario-play-page"><ScenarioHeader title="Indstillingerne" subtitle={mission.title} onBack={() => setMission(null)} /><CaseResult success title={mission.title} text={mission.successText} score={result.score} onReplay={() => startMission(mission)} onCases={() => setMission(null)} /></main>;
  }

  const currentPage = phonePages[page];
  return (
    <main className="scenario-play-page">
      <ScenarioHeader title="Indstillingerne" subtitle={`${mission.level} · ${mission.title}`} onBack={() => setMission(null)} />
      <div className="phone-game-layout">
        <aside className="mission-brief-card">
          <div className="mission-brief-top"><span>MISSION</span><Clock3 size={16} /> ca. {mission.timeLimitMinutes} min</div>
          <h3>{mission.title}</h3>
          <p>{mission.brief}</p>
          <blockquote>{mission.message}</blockquote>
          <button className="hint-button" onClick={() => {
            if (hint) setHint(false);
            else if (onUseHint()) setHint(true);
          }}><Lightbulb size={17} /> {hint ? mission.hint : "Brug 1 hint-token"}</button>
          {checks > 0 && missing.length > 0 && <div className="check-feedback"><X size={17} /> Ikke helt endnu. {missing.length} indstilling{missing.length === 1 ? "" : "er"} mangler.</div>}
          <button className="primary-button phone-check" onClick={checkSolution}><Check size={17} /> Kontrollér · 12 kr.</button>
        </aside>

        <div className="phone-device" aria-label="Danske telefonindstillinger">
          <div className="phone-speaker" />
          <div className="phone-status"><span>09.41</span><span><Signal size={14} /> 5G · 87%</span></div>
          <div className="phone-screen">
            <div className="phone-page-head" style={{ "--phone-accent": currentPage.accent } as React.CSSProperties}>
              {currentPage.parent && <button onClick={() => visit(currentPage.parent!)} aria-label="Tilbage"><ArrowLeft size={18} /></button>}
              <div><h3>{currentPage.title}</h3><p>{currentPage.subtitle}</p></div>
            </div>
            <div className="phone-list">
              {currentPage.links?.map((link) => (
                <button className="phone-link" key={link.pageId} onClick={() => visit(link.pageId)}>
                  <span className="phone-link-icon">{link.icon === "moon" ? <Moon /> : link.icon === "signal" ? <Signal /> : link.icon === "sun" ? <Sun /> : link.icon === "accessibility" ? <Accessibility /> : link.icon === "shield" ? <LockKeyhole /> : <Settings />}</span>
                  <span><strong>{link.label}</strong><small>{link.description}</small></span><ChevronRight size={17} />
                </button>
              ))}
              {currentPage.settings?.map((id) => {
                const setting = phoneSettings[id];
                const isMissing = missing.includes(id);
                return (
                  <div className={`phone-setting ${isMissing ? "missing" : ""}`} key={id}>
                    <div><strong>{setting.label}</strong><small>{setting.description}</small></div>
                    {setting.type === "toggle" && <button className={`phone-toggle ${values[id] ? "on" : ""}`} onClick={() => changeSetting(id, !values[id])} aria-label={`Skift ${setting.label}`}><span /></button>}
                    {setting.type === "choice" && <select value={String(values[id])} onChange={(event) => changeSetting(id, event.target.value)}>{setting.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
                    {setting.type === "slider" && <div className="phone-slider"><input type="range" min={setting.min} max={setting.max} step={setting.step} value={Number(values[id])} onChange={(event) => changeSetting(id, Number(event.target.value))} /><span>{String(values[id])}{setting.unit}</span></div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="phone-home-bar" />
        </div>
      </div>
    </main>
  );
}

function DialogueGame({ onExit, onComplete, successful, unlockedScenarioIds, maritimeRankId, relationships, onStartAttempt, onUnlockScenario }: GameCommonProps) {
  const [character, setCharacter] = useState<DialogueCharacter | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [trust, setTrust] = useState(50);
  const [tension, setTension] = useState(25);
  const [path, setPath] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<ScenarioRun["decisions"]>([]);
  const [feedback, setFeedback] = useState<{ insight: string; principle: string; next: string | null; trust: number; tension: number } | null>(null);
  const [result, setResult] = useState<{ success: boolean; score: number; text: string } | null>(null);
  const [firstAttemptEligible, setFirstAttemptEligible] = useState(false);

  const start = (next: DialogueCharacter) => {
    setFirstAttemptEligible(onStartAttempt(next.case.id));
    setCharacter(next);
    setStartedAt(new Date().toISOString());
    setNodeId(next.case.startNode);
    setTrust(50); setTension(25); setPath([next.case.startNode]); setDecisions([]); setFeedback(null); setResult(null);
  };

  const choose = (choiceId: string) => {
    if (!character || feedback) return;
    const node = character.case.nodes[nodeId];
    const choice = node.choices.find((item) => item.id === choiceId)!;
    const nextTrust = Math.max(0, Math.min(100, trust + choice.trust));
    const nextTension = Math.max(0, Math.min(100, tension + choice.tension));
    setTrust(nextTrust); setTension(nextTension);
    setDecisions((current) => [...current, { stepId: node.id, answerId: choice.id, answerText: choice.text, correct: choice.trust > 0 && choice.tension <= 0, delta: { trust: choice.trust, tension: choice.tension } }]);
    setFeedback({ insight: choice.insight, principle: choice.principle, next: choice.next, trust: nextTrust, tension: nextTension });
  };

  const continueDialogue = () => {
    if (!character || !feedback) return;
    const danger = feedback.tension >= character.case.dangerLimit;
    if (feedback.next && !danger) {
      setNodeId(feedback.next);
      setPath((current) => [...current, feedback.next!]);
      setFeedback(null);
      return;
    }
    const success = !danger && feedback.trust >= character.case.successTrust;
    const score = Math.min(500, Math.max(80, Math.round(220 + feedback.trust * 3 - feedback.tension * 2)));
    const text = success
      ? `Du læste ${character.name}s behov uden at opgive dine egne grænser. Samtalen endte med en konkret vej videre.`
      : danger
        ? "Spændingen blev for høj. Du afsluttede samtalen og forlod situationen; prøv en roligere, tydeligere strategi næste gang."
        : "Samtalen sluttede uden en stabil aftale. Se især på forskellen mellem kortvarig beroligelse og langsigtet tillid.";
    setResult({ success, score, text });
    onComplete({
      id: runId(), kind: "dialogue", caseId: character.case.id, title: character.case.title, level: character.case.level,
      startedAt, endedAt: new Date().toISOString(), success, score, maxScore: 500,
      path, decisions: [...decisions], metadata: { character: character.name, firstAttemptEligible, finalTrust: feedback.trust, finalTension: feedback.tension, dangerLimit: character.case.dangerLimit },
    });
  };

  if (!character) {
    return (
      <main className="scenario-play-page">
        <ScenarioHeader title="Mellem linjerne" subtitle="Tre personer. Tre helt forskellige psykologiske regler." onBack={onExit} />
        <div className="character-grid">
          {dialogueEpisodeCatalog.map((item) => {
            const { episode, previousScenarioId } = dialogueEpisodeGate(item);
            const rankLocked = Boolean(episode) && maritimeRankOrder.indexOf(maritimeRankId) < maritimeRankOrder.indexOf(episode!.unlock.rank);
            const relationshipLocked = Boolean(episode) && (relationships[item.id] ?? 0) < episode!.unlock.relationship;
            const previousLocked = Boolean(previousScenarioId) && !successful.has(previousScenarioId!);
            const progressionLocked = rankLocked || relationshipLocked || previousLocked;
            const purchase = episode?.unlock.purchase;
            const purchaseLocked = Boolean(purchase) && !unlockedScenarioIds.includes(item.case.id);
            const price = purchase ? `${purchase.kr} kr.${purchase.rav ? ` + ${purchase.rav} rav` : ""}` : "";
            const lockLabel = rankLocked ? episode?.unlock.rank : relationshipLocked ? `forhold ${relationships[item.id] ?? 0}/${episode?.unlock.relationship}` : previousLocked ? "forrige episode" : "";
            return (
            <button key={item.case.id} className={`character-card ${progressionLocked || purchaseLocked ? "case-locked" : ""}`} onClick={() => {
              if (progressionLocked) return;
              if (purchaseLocked && purchase && !onUnlockScenario(item.case.id, purchase.kr, purchase.rav ?? 0)) return;
              start(item);
            }} style={{ "--character-color": item.color } as React.CSSProperties}>
              <div className="character-portrait"><Image unoptimized src={item.portrait} alt={`${item.name}, animeportræt`} width={640} height={900} sizes="(max-width: 760px) 100vw, 33vw" /></div>
              <div className="character-card-copy">
                <div className="case-title-row"><h3>{item.name}, {item.age}</h3><LevelBadge level={item.case.level} /></div>
                <p className="character-type">{item.archetype}</p>
                <p><strong>{item.case.title}</strong> · {item.case.premise}</p>
                <span className="character-rule"><Eye size={15} /> {item.rule}</span>
                <span className={`case-status ${successful.has(item.case.id) ? "done" : purchaseLocked ? "priced" : ""}`}>{successful.has(item.case.id) ? <Check size={18} /> : progressionLocked ? <><LockKeyhole size={13} />{lockLabel}</> : purchaseLocked ? price : <ChevronRight size={18} />}</span>
              </div>
            </button>
          )})}
        </div>
      </main>
    );
  }

  if (result) {
    return <main className="scenario-play-page"><ScenarioHeader title="Mellem linjerne" subtitle={`${character.name} · ${character.case.title}`} onBack={() => setCharacter(null)} /><CaseResult {...result} title={result.success ? "Du fandt balancen" : "Samtalen gled af sporet"} onReplay={() => start(character)} onCases={() => setCharacter(null)} /></main>;
  }

  const node = character.case.nodes[nodeId];
  return (
    <main className="dialogue-stage" style={{ "--character-color": character.color } as React.CSSProperties}>
      <div className="dialogue-topbar">
        <button className="icon-button" onClick={() => setCharacter(null)} aria-label="Tilbage"><ArrowLeft size={20} /></button>
        <div><strong>{character.case.title}</strong><span>{character.case.location}</span></div>
        <LevelBadge level={character.case.level} />
      </div>
      <div className="dialogue-scene">
        <Image unoptimized src={character.portrait} alt={`${character.name} i scenariet`} fill priority sizes="(max-width: 760px) 100vw, 1080px" />
        <div className="scene-gradient" />
        <div className="dialogue-objective"><span>DIT MÅL</span>{character.case.objective}</div>
        <div className="dialogue-meters">
          <label>Tillid <span>{trust}</span><i><b style={{ width: `${trust}%` }} /></i></label>
          <label>Spænding <span>{tension}</span><i className="tension"><b style={{ width: `${tension}%` }} /></i></label>
        </div>
        <div className="dialogue-box">
          <p className="dialogue-stage-note">{node.stage}</p>
          <h3>{node.speaker}</h3>
          <blockquote>“{node.line}”</blockquote>
          {!feedback ? (
            <div className="dialogue-choices">{node.choices.map((choice, index) => <button key={choice.id} onClick={() => choose(choice.id)}><span>{String.fromCharCode(65 + index)}</span>{choice.text}</button>)}</div>
          ) : (
            <div className="dialogue-feedback">
              <div><Lightbulb size={18} /><p><strong>{feedback.principle}</strong>{feedback.insight}</p></div>
              <button className="primary-button" onClick={continueDialogue}>{feedback.next && feedback.tension < character.case.dangerLimit ? "Fortsæt samtalen" : "Se udfald"}<ChevronRight size={17} /></button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function PostGame({ onExit, onComplete, successful, unlockedScenarioIds, onStartAttempt, onUnlockScenario }: GameCommonProps) {
  const [currentCase, setCurrentCase] = useState<PostCase | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [clues, setClues] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [result, setResult] = useState<{ success: boolean; score: number } | null>(null);
  const [firstAttemptEligible, setFirstAttemptEligible] = useState(false);

  const start = (item: PostCase) => { setFirstAttemptEligible(onStartAttempt(item.id)); setCurrentCase(item); setStartedAt(new Date().toISOString()); setClues([]); setAction(""); setResult(null); };
  const inspect = () => {
    if (!currentCase || !action || result) return;
    const trueClues = currentCase.clues.filter((item) => item.correct).map((item) => item.id);
    const selectedCorrect = clues.filter((id) => trueClues.includes(id)).length;
    const falseMarks = clues.filter((id) => !trueClues.includes(id)).length;
    const actionCorrect = currentCase.actions.find((item) => item.id === action)?.correct ?? false;
    const success = selectedCorrect >= Math.max(2, trueClues.length - 1) && falseMarks === 0 && actionCorrect;
    const score = Math.max(70, 160 + selectedCorrect * 45 - falseMarks * 35 + (actionCorrect ? 90 : 0));
    setResult({ success, score });
    onComplete({
      id: runId(), kind: "post", caseId: currentCase.id, title: currentCase.title, level: currentCase.level,
      startedAt, endedAt: new Date().toISOString(), success, score, maxScore: 430,
      path: [currentCase.id, ...clues, action],
      decisions: [
        ...clues.map((id) => { const clue = currentCase.clues.find((item) => item.id === id)!; return { stepId: "clues", answerId: id, answerText: clue.text, correct: clue.correct }; }),
        { stepId: "action", answerId: action, answerText: currentCase.actions.find((item) => item.id === action)?.label ?? action, correct: actionCorrect },
      ],
      metadata: { firstAttemptEligible, selectedClues: clues.length, correctClues: selectedCorrect, falseMarks },
    });
  };

  if (!currentCase) return <main className="scenario-play-page"><ScenarioHeader title="Den mistænkelige post" subtitle="Find signalerne, før du handler." onBack={onExit} /><CasePicker cases={postCases} successful={successful} unlockedScenarioIds={unlockedScenarioIds} onUnlock={onUnlockScenario} onPick={start} renderDescription={(item) => `${item.subject} · ${item.context}`} /></main>;
  if (result) return <main className="scenario-play-page"><ScenarioHeader title="Den mistænkelige post" subtitle={currentCase.title} onBack={() => setCurrentCase(null)} /><CaseResult success={result.success} title={result.success ? "God efterforskning" : "Et signal blev overset"} text={currentCase.explanation} score={result.score} onReplay={() => start(currentCase)} onCases={() => setCurrentCase(null)} /></main>;

  return (
    <main className="scenario-play-page">
      <ScenarioHeader title="Den mistænkelige post" subtitle={`${currentCase.level} · ${currentCase.title}`} onBack={() => setCurrentCase(null)} />
      <div className="post-layout">
        <section className="mail-window">
          <div className="mail-toolbar"><MailWarning size={20} /><span>Indbakke / ukendt afsender</span><time>{currentCase.received}</time></div>
          <div className="mail-head"><p>Fra: <strong>{currentCase.sender}</strong></p><h2>{currentCase.subject}</h2></div>
          <div className="mail-body">{currentCase.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <div className="mail-context"><Eye size={18} /><p><strong>Kontekst uden for mailen</strong>{currentCase.context}</p></div>
        </section>
        <aside className="evidence-panel">
          <p className="eyebrow">Trin 1 · Markér stærke signaler</p>
          <h3>Hvad er relevant evidens?</h3>
          <div className="clue-list">{currentCase.clues.map((clue) => <label key={clue.id} className={clues.includes(clue.id) ? "selected" : ""}><input type="checkbox" checked={clues.includes(clue.id)} onChange={() => setClues((current) => current.includes(clue.id) ? current.filter((id) => id !== clue.id) : [...current, clue.id])} /><span>{clue.text}</span></label>)}</div>
          <p className="eyebrow evidence-step">Trin 2 · Vælg handling</p>
          <div className="action-list">{currentCase.actions.map((item) => <label key={item.id} className={action === item.id ? "selected" : ""}><input type="radio" name="post-action" checked={action === item.id} onChange={() => setAction(item.id)} /><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)}</div>
          <button className="primary-button" disabled={!action} onClick={inspect}><ShieldCheck size={17} /> Afgiv vurdering</button>
        </aside>
      </div>
    </main>
  );
}

function MetroGame({ onExit, onComplete, successful, unlockedScenarioIds, onStartAttempt, onUnlockScenario }: GameCommonProps) {
  const [currentCase, setCurrentCase] = useState<MetroCase | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [route, setRoute] = useState("");
  const [result, setResult] = useState<{ success: boolean; score: number; explanation: string } | null>(null);
  const [firstAttemptEligible, setFirstAttemptEligible] = useState(false);
  const start = (item: MetroCase) => { setFirstAttemptEligible(onStartAttempt(item.id)); setCurrentCase(item); setStartedAt(new Date().toISOString()); setRoute(""); setResult(null); };
  const dispatch = () => {
    if (!currentCase || !route || result) return;
    const selected = currentCase.routes.find((item) => item.id === route)!;
    const success = selected.correct;
    const score = success ? 380 : 120;
    setResult({ success, score, explanation: selected.explanation });
    onComplete({
      id: runId(), kind: "metro", caseId: currentCase.id, title: currentCase.title, level: currentCase.level,
      startedAt, endedAt: new Date().toISOString(), success, score, maxScore: 380,
      path: [currentCase.start, route, currentCase.destination],
      decisions: [{ stepId: "route", answerId: route, answerText: selected.label, correct: success }],
      metadata: { firstAttemptEligible, duration: selected.duration, changes: selected.changes, accessible: selected.accessible, incident: currentCase.incident },
    });
  };

  if (!currentCase) return <main className="scenario-play-page"><ScenarioHeader title="Sidste forbindelse" subtitle="Driftsmeldinger er kun nyttige, hvis du læser dem rigtigt." onBack={onExit} /><CasePicker cases={metroCases} successful={successful} unlockedScenarioIds={unlockedScenarioIds} onUnlock={onUnlockScenario} onPick={start} renderDescription={(item) => `${item.start} → ${item.destination} · ${item.incident}`} /></main>;
  if (result) return <main className="scenario-play-page"><ScenarioHeader title="Sidste forbindelse" subtitle={currentCase.title} onBack={() => setCurrentCase(null)} /><CaseResult success={result.success} title={result.success ? "Passageren når frem" : "Ruten holder ikke"} text={result.explanation} score={result.score} onReplay={() => start(currentCase)} onCases={() => setCurrentCase(null)} /></main>;

  return (
    <main className="scenario-play-page">
      <ScenarioHeader title="Sidste forbindelse" subtitle={`${currentCase.level} · ${currentCase.title}`} onBack={() => setCurrentCase(null)} />
      <div className="metro-layout">
        <section className="dispatch-board">
          <div className="dispatch-time"><span>NU</span><strong>{currentCase.now}</strong><i /><span>SENEST</span><strong>{currentCase.deadline}</strong></div>
          <div className="route-title"><Map size={20} /><div><strong>{currentCase.start}</strong><span>til</span><strong>{currentCase.destination}</strong></div></div>
          <div className="metro-line-map" aria-hidden="true"><span className="station active" /><i /><span className="station change" /><i /><span className="station destination" /></div>
          <div className="incident-banner"><Signal size={18} /><div><strong>Driftsmelding</strong><p>{currentCase.incident}</p></div></div>
          <div className="passenger-card"><Accessibility size={19} /><p><strong>{currentCase.passenger}</strong>{currentCase.constraints.join(" · ")}</p></div>
        </section>
        <aside className="route-options">
          <p className="eyebrow">Vælg én anbefaling</p>
          <h3>Hvilken rute opfylder alt?</h3>
          {currentCase.routes.map((item) => (
            <label key={item.id} className={route === item.id ? "selected" : ""}>
              <input type="radio" name="metro-route" checked={route === item.id} onChange={() => setRoute(item.id)} />
              <span className="route-copy"><strong>{item.label}</strong><small>{item.steps.join(" → ")}</small></span>
              <span className="route-metrics"><b>{item.duration} min</b><small>{item.changes} skift</small></span>
            </label>
          ))}
          <button className="primary-button" disabled={!route} onClick={dispatch}><TrainFront size={17} /> Send ruten</button>
        </aside>
      </div>
    </main>
  );
}
