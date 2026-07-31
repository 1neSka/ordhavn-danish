"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
  Anchor,
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudDownload,
  Code2,
  Compass,
  Download,
  Flame,
  FolderCheck,
  Gamepad2,
  Gauge,
  Gem,
  Hammer,
  Heart,
  Home,
  Keyboard,
  Languages,
  Layers3,
  Lightbulb,
  LockKeyhole,
  Map as MapIcon,
  Medal,
  MessageCircle,
  Moon,
  MoreHorizontal,
  PartyPopper,
  Play,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { courseLevels, type Challenge, type Mission } from "../lib/courseData";
import ScenarioHub from "./scenario-games";
import SelectionDictionary from "./selection-dictionary";
import WordleGame from "./wordle-game";
import { GenderBankView, HarborHome, type GenderBankOutcome } from "./harbor-game";
import type { ScenarioRun } from "../lib/scenarioData";
import { harborCharacters, scenarioBossGates, type ScenarioBossGate } from "../lib/harborData";
import {
  applyDailyHarborFee,
  createWeeklyStorm,
  evaluateMaritimeRank,
  HARBOR_BUILDINGS,
  MARITIME_RANKS,
  purchaseHarborBuilding,
  resolveScenarioKronerReward,
  type HarborBuildingId,
  type MaritimeRankId,
  type RankRetentionMeasurements,
} from "../lib/gameEconomy";
import {
  DEVELOPER_KRONER_GRANTS,
  grantDeveloperKroner,
  isDeveloperLevelOpen,
  unlockDeveloperLevel,
} from "../lib/developerMode";
import {
  assignHoldout,
  createFixedHoldoutSchedule,
  createHoldoutScheduledEvents,
  createMasteryState,
  getDueHoldoutReviews,
  getDueOperationalReviews,
  predictedRecall,
  recordHoldoutObservation,
  scheduleOperationalReview,
  type MasteryState,
  type OperationalMasteryRecord,
} from "../lib/scheduler";
import {
  WORDLE_PATH_CHECKPOINTS,
  type WordleGameSnapshot,
  type WordlePathCheckpoint,
  type WordleRun,
} from "../lib/wordle";
import { prepareProgressWrite, readProgressWithBackup } from "../lib/progressStorage";
import { nextBossScenarioLaunch, type ScenarioLaunch } from "../lib/scenarioLaunch";
import { getBossGateProgress } from "../lib/bossProgress";
import {
  clozeBlanks,
  normalizeExerciseAnswer,
  scoreClozeSelections,
  scoreFreeAnswer,
  scoreRegisterMatches,
  serializeClozeSelections,
  serializeRegisterMatches,
} from "../lib/exerciseScoring";
import { orderThreeChoiceOptions } from "../lib/optionOrder";

type View = "home" | "path" | "practice" | "wordle" | "scenarios" | "stats" | "profile" | "gender-bank";

type Attempt = {
  id: string;
  timestamp: string;
  sessionId: string;
  missionId: string;
  levelId: string;
  questionId: string;
  questionType: Challenge["type"];
  modality: Challenge["modality"];
  skill: string;
  tags: string[];
  prompt: string;
  expectedAnswer: string;
  givenAnswer: string;
  correct: boolean;
  responseMs: number;
  hintsUsed: number;
  retryNumber: number;
  confidence: number | null;
  brierScore: number | null;
  score: number;
  result: "incorrect" | "partial" | "correct";
  xpAwarded: number;
};

type StudySession = {
  id: string;
  startedAt: string;
  endedAt: string;
  missionId: string;
  levelId: string;
  correct: number;
  total: number;
  durationSeconds: number;
  xpEarned: number;
};

type ProgressState = {
  version: 3;
  xp: number;
  kroner: number;
  rav: number;
  streak: number;
  lastActiveDate: string | null;
  completedMissions: string[];
  attempts: Attempt[];
  sessions: StudySession[];
  dailyGoalMinutes: number;
  darkMode: boolean;
  mastery: MasteryState | null;
  scenarioRuns: ScenarioRun[];
  scenarioAttemptedIds: string[];
  purchasedBuildings: string[];
  unlockedScenarioIds: string[];
  relationships: Record<string, number>;
  repliedCharacterIds: string[];
  ravClaims: string[];
  hintTokens: number;
  lastHintRefillDate: string | null;
  rerolledWeakItemIds: string[];
  lastWeakRerollDate: string | null;
  lastHarborFeeDate: string | null;
  weeklyStorms: Array<{ weekId: string; completedAt: string; score: number; total: number }>;
  genderBankRuns: Array<{ id: string; completedAt: string; stake: number; payout: number; rounds: number; meanBrier?: number | null }>;
  maritimeRankId: MaritimeRankId;
  claimedBossGates: string[];
  developerMode: boolean;
  developerUnlockedLevelIndex: number;
  wordleGames: Record<string, WordleGameSnapshot>;
  wordleRuns: WordleRun[];
  completedWordleCheckpoints: string[];
};

type DirectoryHandleLike = {
  name: string;
  getFileHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>;
};

const STORAGE_KEY = "ordhavn-progress-v1";
const STORAGE_BACKUP_KEY = "ordhavn-progress-backup-v1";
const CURRENT_WEEKDAY_INDEX = (new Date().getDay() + 6) % 7;

const initialProgress: ProgressState = {
  version: 3,
  xp: 0,
  kroner: 180,
  rav: 0,
  streak: 0,
  lastActiveDate: null,
  completedMissions: [],
  attempts: [],
  sessions: [],
  dailyGoalMinutes: 15,
  darkMode: true,
  mastery: null,
  scenarioRuns: [],
  scenarioAttemptedIds: [],
  purchasedBuildings: [],
  unlockedScenarioIds: [],
  relationships: { freja: 0, maja: 0, nora: 0, eli9: 0, koret: 0 },
  repliedCharacterIds: [],
  ravClaims: [],
  hintTokens: 2,
  lastHintRefillDate: null,
  rerolledWeakItemIds: [],
  lastWeakRerollDate: null,
  lastHarborFeeDate: null,
  weeklyStorms: [],
  genderBankRuns: [],
  maritimeRankId: "skibsdreng",
  claimedBossGates: [],
  developerMode: false,
  developerUnlockedLevelIndex: 0,
  wordleGames: {},
  wordleRuns: [],
  completedWordleCheckpoints: [],
};

const iconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  compass: Compass,
  message: MessageCircle,
  layers: Layers3,
  map: MapIcon,
  sparkles: Sparkles,
  book: BookOpen,
  target: Target,
  star: Star,
  "👋": Sparkles,
  "🙂": MessageCircle,
  "🧩": Layers3,
  "🎯": Target,
  "🕒": Clock3,
  "🌅": Sparkles,
  "📅": Clock3,
  "☕": MessageCircle,
  "🛒": Compass,
  "🏷️": Target,
  "🏠": Home,
  "👨‍👩‍👧": Heart,
  "🎨": Sparkles,
  "🌦️": Compass,
  "🚲": MapIcon,
  "🩺": ShieldCheck,
  "⏪": RotateCcw,
  "⚙️": Settings,
  "🧳": Compass,
  "🧰": Settings,
  "💼": Layers3,
  "💬": MessageCircle,
  "🚀": Zap,
  "🏁": Trophy,
};

const dayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function calendarDaysBetween(from: string, to: string) {
  return Math.max(0, Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000));
}

function computeStreak(lastActiveDate: string | null, currentStreak: number) {
  if (!lastActiveDate) return 1;
  const last = new Date(`${lastActiveDate}T12:00:00`);
  const now = new Date(`${dayKey()}T12:00:00`);
  const diff = Math.round((now.getTime() - last.getTime()) / 86_400_000);
  if (diff <= 0) return currentStreak || 1;
  return diff === 1 ? currentStreak + 1 : 1;
}

function scoreAnswer(challenge: Challenge, answer: string) {
  return scoreFreeAnswer(challenge, answer);
}

function downloadFile(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} sek.`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min.`;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("da-DK", { weekday: "short" }).format(date).replace(".", "");
}

function retentionMeasurements(mastery: MasteryState | null): RankRetentionMeasurements {
  const records = Object.values(mastery?.records ?? {}).filter((record) => record?.cohort === "holdout");
  return Object.fromEntries(([7, 14] as const).map((day) => {
    const observations = records.flatMap((record) => record?.cohort === "holdout"
      ? record.checkpoints.filter((checkpoint) => checkpoint.day === day && checkpoint.observation).map((checkpoint) => checkpoint.observation!)
      : []);
    return [day, { retention: observations.length ? observations.reduce((sum, item) => sum + item.score, 0) / observations.length : 0, samples: observations.length }];
  })) as RankRetentionMeasurements;
}

function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" aria-label="Ordhavn">
      <div className="brand-mark"><span>Ø</span></div>
      {!compact && <span className="brand-name">ordhavn</span>}
    </div>
  );
}

function Navigation({ view, setView }: { view: View; setView: (view: View) => void }) {
  const items = [
    { id: "home" as View, label: "Hjem", icon: Home },
    { id: "path" as View, label: "Læringssti", icon: MapIcon },
    { id: "practice" as View, label: "Træning", icon: BrainCircuit },
    { id: "wordle" as View, label: "Ordle", icon: Keyboard },
    { id: "scenarios" as View, label: "Scenarier", icon: Gamepad2 },
    { id: "stats" as View, label: "Statistik", icon: BarChart3 },
  ];
  return (
    <>
      <aside className="sidebar">
        <AppLogo />
        <nav className="side-nav" aria-label="Hovednavigation">
          {items.map((item) => (
            <button
              className={`nav-item ${view === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              <item.icon size={20} strokeWidth={2.2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setView("profile")}>
            <Settings size={20} />
            <span>Indstillinger</span>
          </button>
          <div className="mini-profile">
            <div className="avatar">R</div>
            <div><strong>Dansk elev</strong><span>Gratis profil</span></div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
      <nav className="mobile-nav" aria-label="Mobilnavigation">
        {items.map((item) => (
          <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

function Topbar({ progress, onProfile, onToggleTheme }: { progress: ProgressState; onProfile: () => void; onToggleTheme: () => void }) {
  return (
    <header className="topbar">
      <div className="mobile-brand"><AppLogo /></div>
      <div className="topbar-spacer" />
      <div className="top-stats">
        <button className="theme-button" aria-label={progress.darkMode ? "Skift til lyst tema" : "Skift til mørkt tema"} onClick={onToggleTheme}>
          {progress.darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <span className="top-pill xp"><Trophy size={17} /> {progress.xp} XP</span>
        <span className="top-pill kroner">{progress.kroner} kr.</span>
        <span className="top-pill rav"><Gem size={17} fill="currentColor" /> {progress.rav}</span>
        <button className="avatar small" aria-label="Åbn profil" onClick={onProfile}>R</button>
      </div>
    </header>
  );
}

export function HomeView({
  progress,
  onNavigate,
  onStart,
}: {
  progress: ProgressState;
  onNavigate: (view: View) => void;
  onStart: (mission: Mission, levelId: string) => void;
}) {
  const next = (() => {
    for (const level of courseLevels) {
      const mission = level.missions.find((item) => !progress.completedMissions.includes(item.id));
      if (mission) return { level, mission };
    }
    return { level: courseLevels[0], mission: courseLevels[0].missions[0] };
  })();

  const todaySeconds = progress.sessions
    .filter((session) => session.endedAt.startsWith(dayKey()))
    .reduce((sum, session) => sum + session.durationSeconds, 0);
  const goalPercent = Math.min(100, Math.round((todaySeconds / 60 / progress.dailyGoalMinutes) * 100));
  const accuracy = progress.attempts.length
    ? Math.round((progress.attempts.filter((attempt) => attempt.correct).length / progress.attempts.length) * 100)
    : 0;

  return (
    <div className="view home-view">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">I DAG · DIN REJSE</p>
          <h1>Godt at se dig!</h1>
          <p>Et lille dansk skridt i dag gør ordene lettere i morgen.</p>
        </div>
        <div className="week-strip" aria-label="Ugens aktivitet">
          {["M", "T", "O", "T", "F", "L", "S"].map((day, index) => (
            <div key={`${day}-${index}`} className={index === CURRENT_WEEKDAY_INDEX ? "today" : ""}>
              <span>{day}</span><i>{index === CURRENT_WEEKDAY_INDEX && <Flame size={14} fill="currentColor" />}</i>
            </div>
          ))}
        </div>
      </section>

      <section className="continue-card">
        <div className="continue-copy">
          <div className="lesson-kicker"><span>FORTSÆT HER</span><span>+{next.mission.xp} XP</span></div>
          <h2>{next.mission.title}</h2>
          <p>{next.mission.subtitle}</p>
          <div className="mission-meta">
            <span><Clock3 size={16} /> {next.mission.estimatedMinutes} min.</span>
            <span><Target size={16} /> {next.mission.questions.length} opgaver</span>
            <span><Layers3 size={16} /> {next.level.eyebrow}</span>
          </div>
          <button className="primary-button light" onClick={() => onStart(next.mission, next.level.id)}>
            <Play size={18} fill="currentColor" /> Start lektionen
          </button>
        </div>
        <div className="continue-art" aria-hidden="true">
          <div className="sun-orbit" />
          <div className="danish-card card-one"><span>hej</span><small>hello</small></div>
          <div className="danish-card card-two"><span>tak</span><small>thanks</small></div>
          <div className="art-badge"><Sparkles size={19} /> <strong>Næste stop</strong><span>{next.level.title}</span></div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel daily-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">DAGENS MÅL</p><h3>{Math.round(todaySeconds / 60)} af {progress.dailyGoalMinutes} minutter</h3></div>
            <span className="icon-box coral"><Target size={20} /></span>
          </div>
          <div className="goal-track"><span style={{ width: `${goalPercent}%` }} /></div>
          <p className="muted">{goalPercent >= 100 ? "Flot! Dagens mål er nået." : `${progress.dailyGoalMinutes - Math.round(todaySeconds / 60)} minutter tilbage — du er godt på vej.`}</p>
        </section>

        <section className="panel streak-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">DIN STIME</p><h3>{progress.streak} {progress.streak === 1 ? "dag" : "dage"}</h3></div>
            <span className="icon-box amber"><Flame size={22} fill="currentColor" /></span>
          </div>
          <div className="streak-days">
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <div key={index} className={index < Math.min(progress.streak, 7) ? "done" : ""}>
                <span>{["M", "T", "O", "T", "F", "L", "S"][index]}</span>
                <i>{index < Math.min(progress.streak, 7) ? <Check size={14} /> : index + 1}</i>
              </div>
            ))}
          </div>
        </section>

        <section className="panel progress-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">OVERBLIK</p><h3>Din fremgang</h3></div>
            <button className="text-button" onClick={() => onNavigate("stats")}>Se detaljer <ChevronRight size={16} /></button>
          </div>
          <div className="quick-stats">
            <div><strong>{progress.xp}</strong><span>Samlet XP</span></div>
            <div><strong>{progress.completedMissions.length}</strong><span>Lektioner</span></div>
            <div><strong>{accuracy}%</strong><span>Præcision</span></div>
          </div>
        </section>

        <section className="panel word-panel">
          <div className="word-head"><span>DAGENS ORD</span><BookOpen size={18} /></div>
          <div className="word-body">
            <small>substantiv · fælleskøn</small>
            <h3>nysgerrighed</h3>
            <p>curiosity</p>
            <blockquote>“Nysgerrighed åbner nye døre.”</blockquote>
          </div>
        </section>
      </div>

      <section className="section-head">
        <div><p className="eyebrow">VÆLG DIN VEJ</p><h2>Træn på din måde</h2></div>
        <button className="text-button" onClick={() => onNavigate("practice")}>Alle træninger <ArrowRight size={16} /></button>
      </section>
      <div className="training-cards">
        <button className="training-card mint" onClick={() => onNavigate("practice")}>
          <span className="training-icon"><Zap size={22} /></span><div><h3>Lynrunde</h3><p>Hurtige spørgsmål. Ren fokus. Slå din rekord.</p></div><ChevronRight />
        </button>
        <button className="training-card lavender" onClick={() => onNavigate("practice")}>
          <span className="training-icon"><BrainCircuit size={22} /></span><div><h3>Fejl-laboratoriet</h3><p>Gør dine sværeste ord til dine stærkeste.</p></div><ChevronRight />
        </button>
        <button className="training-card peach" onClick={() => onNavigate("path")}>
          <span className="training-icon"><Compass size={22} /></span><div><h3>Hverdagsmissioner</h3><p>Små historier fra et ægte dansk hverdagsliv.</p></div><ChevronRight />
        </button>
        <button className="training-card blue" onClick={() => onNavigate("scenarios")}>
          <span className="training-icon"><Gamepad2 size={22} /></span><div><h3>Scenario Lab</h3><p>Løs telefoner, dialoger, svindel og trafik på dansk.</p></div><ChevronRight />
        </button>
      </div>
    </div>
  );
}

function PathView({
  progress,
  onStart,
  onOpenScenarios,
  onOpenWordleCheckpoint,
  onDeveloperUnlockLevel,
}: {
  progress: ProgressState;
  onStart: (mission: Mission, levelId: string) => void;
  onOpenScenarios: (gate: ScenarioBossGate) => void;
  onOpenWordleCheckpoint: (checkpoint: WordlePathCheckpoint) => void;
  onDeveloperUnlockLevel: (levelIndex: number) => void;
}) {
  const missionCount = courseLevels.reduce((sum, level) => sum + level.missions.length, 0);
  const minuteCount = courseLevels.reduce((sum, level) => sum + level.missions.reduce((levelSum, mission) => levelSum + mission.estimatedMinutes, 0), 0);
  return (
    <div className="view path-view">
      <section className="page-intro">
        <div><p className="eyebrow">FRA FØRSTE HEJ TIL SIKKERT DANSK</p><h1>Din læringssti</h1><p>{missionCount} håndlavede missioner · {minuteCount} minutters aktiv træning · op til B2</p></div>
        <div className="path-score"><Trophy size={22} /><span><strong>{progress.xp} XP</strong>{progress.completedMissions.length} missioner klaret</span></div>
      </section>
      <div className="level-list">
        {courseLevels.map((level, levelIndex) => {
          const previousBossGate = scenarioBossGates.find((gate) => gate.afterPathLevel === levelIndex);
          const previousBossCleared = !previousBossGate || getBossGateProgress(previousBossGate, progress.scenarioRuns).cleared;
          const developerOpen = isDeveloperLevelOpen(progress.developerMode, progress.developerUnlockedLevelIndex, levelIndex);
          const previousComplete = developerOpen || levelIndex === 0 || (courseLevels[levelIndex - 1].missions.every((m) => progress.completedMissions.includes(m.id)) && previousBossCleared);
          const levelComplete = level.missions.filter((m) => progress.completedMissions.includes(m.id)).length;
          const LevelIcon = iconMap[level.missions[0]?.icon] ?? Compass;
          const bossGate = scenarioBossGates.find((gate) => gate.afterPathLevel === levelIndex + 1);
          const bossProgress = bossGate ? getBossGateProgress(bossGate, progress.scenarioRuns) : null;
          const wordleCheckpoint = WORDLE_PATH_CHECKPOINTS.find((checkpoint) => checkpoint.afterLevelIndex === levelIndex);
          const wordleComplete = wordleCheckpoint ? progress.completedWordleCheckpoints.includes(wordleCheckpoint.id) : false;
          const wordleAvailable = developerOpen || (previousComplete && levelComplete === level.missions.length);
          return (
            <section className={`level-section ${!previousComplete ? "locked" : ""}`} key={level.id} style={{ "--level-color": level.color } as React.CSSProperties}>
              <div className="level-marker">
                <span>{levelIndex + 1}</span>
                {levelIndex < courseLevels.length - 1 && <i />}
              </div>
              <div className="level-content">
                <div className="level-heading">
                  <div className="level-icon"><LevelIcon size={24} /></div>
                  <div><p className="eyebrow">{level.eyebrow}</p><h2>{level.title}</h2><p>{level.description}</p></div>
                  <div className="level-heading-actions">
                    <span className="level-counter">{levelComplete}/{level.missions.length}</span>
                    {progress.developerMode && <button className={`developer-skip ${developerOpen ? "open" : ""}`} onClick={() => onDeveloperUnlockLevel(levelIndex)} disabled={developerOpen}>
                      <Zap size={13} /> {developerOpen ? "Åbnet" : "Hop hertil"}
                    </button>}
                  </div>
                </div>
                <div className="mission-row">
                  {level.missions.map((mission, missionIndex) => {
                    const completed = progress.completedMissions.includes(mission.id);
                    const available = developerOpen || (previousComplete && (missionIndex === 0 || progress.completedMissions.includes(level.missions[missionIndex - 1].id)));
                    return (
                      <button
                        className={`mission-card ${completed ? "completed" : ""} ${!available ? "disabled" : ""}`}
                        key={mission.id}
                        onClick={() => available && onStart(mission, level.id)}
                        disabled={!available}
                      >
                        <div className="mission-number">{completed ? <Check size={18} /> : available ? missionIndex + 1 : <LockKeyhole size={16} />}</div>
                        <div><span>{mission.estimatedMinutes} MIN · {mission.questions.length} OPGAVER</span><h3>{mission.title}</h3><p>{mission.subtitle}</p></div>
                        <ChevronRight size={20} />
                      </button>
                    );
                  })}
                </div>
                {bossGate && bossProgress && <button disabled={levelComplete < level.missions.length} className={`path-boss-card ${bossProgress.cleared ? "cleared" : ""} ${levelComplete < level.missions.length ? "locked" : ""}`} onClick={() => onOpenScenarios(bossGate)}>
                  <span className="boss-seal">{bossProgress.cleared ? <Check size={20} /> : <Anchor size={20} />}</span>
                  <div><p className="eyebrow">HAVNEPRØVE · BOSS</p><h3>{bossGate.title}</h3><span>{bossGate.description}</span>{bossProgress.unmetEndingRequirements[0] && <small className="boss-ending-clue">Skjult udfald · {bossProgress.unmetEndingRequirements[0].description}</small>}</div>
                  <strong>{bossProgress.completed}/{bossProgress.required}{bossProgress.endingsRequired > 0 ? ` · ${bossProgress.endingsMet}/${bossProgress.endingsRequired} ◆` : ""}</strong><ChevronRight size={19} />
                </button>}
                {wordleCheckpoint && <button
                  className={`path-wordle-card ${wordleComplete ? "completed" : ""} ${!wordleAvailable ? "locked" : ""}`}
                  disabled={!wordleAvailable}
                  onClick={() => onOpenWordleCheckpoint(wordleCheckpoint)}
                >
                  <span className="wordle-mini-grid" aria-hidden="true">{["O", "R", "D", "L", "E"].map((letter, letterIndex) => <i key={letter} className={letterIndex < (wordleComplete ? 5 : 2) ? "lit" : ""}>{letter}</i>)}</span>
                  <span className="path-wordle-copy"><span className="eyebrow">ORDLE · VALGFRIT CHECKPOINT</span><strong>{wordleCheckpoint.title}</strong><small>{wordleCheckpoint.subtitle}</small></span>
                  <span className="path-wordle-status">{wordleComplete ? <><Check size={17} /> Klaret</> : wordleAvailable ? "6 forsøg" : <LockKeyhole size={17} />}</span>
                  <ChevronRight size={19} />
                </button>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PracticeView({
  progress,
  onStart,
  onRerollWeakItem,
}: {
  progress: ProgressState;
  onStart: (mission: Mission, levelId: string) => void;
  onRerollWeakItem: (questionId: string) => void;
}) {
  type PracticeFocus = "vocabulary" | "order" | "spelling" | "dialogue";
  const [yardFocuses, setYardFocuses] = useState<PracticeFocus[]>(["vocabulary", "order"]);
  const [yardSize, setYardSize] = useState(10);
  const allQuestions = courseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions));
  const weakIds = [...progress.attempts]
    .filter((attempt) => !attempt.correct)
    .reverse()
    .map((attempt) => attempt.questionId)
    .filter((id) => !progress.rerolledWeakItemIds.includes(id));
  const weakQuestions = weakIds
    .map((id) => allQuestions.find((question) => question.id === id))
    .filter((question): question is Challenge => Boolean(question));

  const matchesFocus = (question: Challenge, focus: PracticeFocus) => {
    if (focus === "order") return ["order", "ikke-position"].includes(question.type) || question.tags.includes("ordstilling") || question.tags.includes("V2");
    if (focus === "spelling") return question.type === "input" || question.tags.includes("stavning");
    if (focus === "dialogue") return question.skill.includes("samtale") || question.skill.includes("høfl") || question.tags.some((tag) => ["dialog", "samtale", "høflighed", "pragmatik"].includes(tag));
    return question.skill.includes("ord") || question.tags.some((tag) => ["basisord", "ordforråd", "mad", "ting", "familie"].includes(tag));
  };

  const makePractice = (kind: "speed" | "errors" | "mix", focus?: PracticeFocus | PracticeFocus[], customSize?: number) => {
    let questions: Challenge[];
    const focuses = focus ? (Array.isArray(focus) ? focus : [focus]) : [];
    const focused = focuses.length ? allQuestions.filter((question) => focuses.some((item) => matchesFocus(question, item))) : allQuestions;
    const pool = focused.length >= 8 ? focused : allQuestions;
    const questionCount = customSize ?? (kind === "speed" ? 12 : 10);
    if (kind === "errors" && weakQuestions.length) questions = weakQuestions.slice(0, 10);
    else questions = [...pool].sort(() => Math.random() - 0.5).slice(0, questionCount);
    onStart({
      id: `practice-${kind}-${Date.now()}`,
      title: kind === "speed" ? "Lynrunde" : kind === "errors" ? "Fejl-laboratoriet" : Array.isArray(focus) ? "Værftets eget togt" : focus === "vocabulary" ? "Ordforråd" : focus === "order" ? "Ordstilling" : focus === "spelling" ? "Stavning" : focus === "dialogue" ? "Dialog" : "Blandet træning",
      subtitle: "En personlig træning bygget af dit ordforråd.",
      icon: "target",
      estimatedMinutes: kind === "speed" ? 4 : 7,
      xp: kind === "speed" ? 60 : 80,
      questions,
    }, "practice");
  };

  return (
    <div className="view practice-view">
      <section className="page-intro">
        <div><p className="eyebrow">PERSONLIG TRÆNING</p><h1>Træn det, der flytter dig</h1><p>Korte formater, tydelig feedback og ingen spildtid.</p></div>
      </section>
      <div className="practice-hero-grid">
        <button className="practice-feature speed" onClick={() => makePractice("speed")}>
          <span className="feature-icon"><Zap size={27} fill="currentColor" /></span>
          <div><p className="eyebrow">4 MINUTTER</p><h2>Lynrunde</h2><p>12 hurtige opgaver. Bonus-XP for hver stime af rigtige svar.</p></div>
          <span className="feature-action">Start nu <ArrowRight size={18} /></span>
          <div className="feature-orbit" />
        </button>
        <button className="practice-feature mistakes" disabled={!weakQuestions.length} onClick={() => makePractice("errors")}>
          <span className="feature-icon"><BrainCircuit size={27} /></span>
          <div><p className="eyebrow">TILPASSET DIG</p><h2>Fejl-laboratoriet</h2><p>{weakQuestions.length ? `${weakQuestions.length} svære ord venter på et comeback.` : "Laboratoriet vågner, når du har lavet din første fejl."}</p></div>
          <span className="feature-action">Åbn laboratoriet <ArrowRight size={18} /></span>
        </button>
      </div>

      {progress.purchasedBuildings.includes("biblioteket") && <section className="library-tool panel">
        <div><p className="eyebrow">BIBLIOTEKET</p><h3>Byt dagens svageste kort</h3><p>{weakQuestions[0] ? `“${weakQuestions[0].answer}” står øverst i fejlarkivet.` : "Der er ikke et svagt kort at bytte endnu."}</p></div>
        <button className="secondary-button" disabled={!weakQuestions[0] || progress.lastWeakRerollDate === dayKey()} onClick={() => weakQuestions[0] && onRerollWeakItem(weakQuestions[0].id)}><RotateCcw size={16} /> {progress.lastWeakRerollDate === dayKey() ? "Dagens omvalg er brugt" : "Byt kortet"}</button>
      </section>}

      {progress.purchasedBuildings.includes("vaerftet") && <section className="yard-builder panel">
        <div className="yard-builder-heading"><div><p className="eyebrow">VÆRFTET</p><h3>Byg dit eget træningstogt</h3><p>Kombinér færdigheder og vælg længden selv.</p></div><output>{yardSize} opgaver</output></div>
        <div className="yard-focuses">{(["vocabulary", "order", "spelling", "dialogue"] as PracticeFocus[]).map((focus) => <button key={focus} className={yardFocuses.includes(focus) ? "selected" : ""} onClick={() => setYardFocuses((items) => items.includes(focus) ? items.filter((item) => item !== focus) : [...items, focus])}>{focus === "vocabulary" ? "Ordforråd" : focus === "order" ? "Ordstilling" : focus === "spelling" ? "Stavning" : "Dialog"}</button>)}</div>
        <input type="range" min={6} max={16} step={2} value={yardSize} onChange={(event) => setYardSize(Number(event.target.value))} />
        <button className="primary-button" disabled={!yardFocuses.length} onClick={() => makePractice("mix", yardFocuses, yardSize)}><Hammer size={17} /> Søsæt træningen</button>
      </section>}

      <section className="section-head practice-section-head"><div><p className="eyebrow">TRÆN EN FÆRDIGHED</p><h2>Vælg dit fokus</h2></div></section>
      <div className="focus-grid">
        {[
          { icon: Languages, title: "Ordforråd", copy: "Genkend ord i en ægte sammenhæng", color: "mint", focus: "vocabulary" as const },
          { icon: Layers3, title: "Ordstilling", copy: "Byg sætninger, der føles naturlige", color: "lavender", focus: "order" as const },
          { icon: Keyboard, title: "Stavning", copy: "Skriv de ord, du vil huske", color: "peach", focus: "spelling" as const },
          { icon: MessageCircle, title: "Dialog", copy: "Vælg det rigtige svar i hverdagen", color: "blue", focus: "dialogue" as const },
        ].map((item) => (
          <button className={`focus-card ${item.color}`} key={item.title} onClick={() => makePractice("mix", item.focus)}>
            <span><item.icon size={23} /></span><h3>{item.title}</h3><p>{item.copy}</p><ArrowRight size={18} />
          </button>
        ))}
      </div>
      <section className="tip-card"><Lightbulb size={24} /><div><strong>Et lille læringstrick</strong><p>Det er bedre at huske et ord i en sætning end alene. Derfor møder du “hyggelig” sammen med kaffe, venner og regnvejr.</p></div></section>
    </div>
  );
}

function StatsView({
  progress,
  directoryHandle,
  onConnectDirectory,
  onExport,
}: {
  progress: ProgressState;
  directoryHandle: DirectoryHandleLike | null;
  onConnectDirectory: () => void;
  onExport: (mode: "download" | "folder") => void;
}) {
  const correct = progress.attempts.filter((attempt) => attempt.correct).length;
  const accuracy = progress.attempts.length ? Math.round((correct / progress.attempts.length) * 100) : 0;
  const totalSeconds = progress.sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const avgResponse = progress.attempts.length
    ? Math.round(progress.attempts.reduce((sum, attempt) => sum + attempt.responseMs, 0) / progress.attempts.length / 100) / 10
    : 0;
  const skillMap = new Map<string, { correct: number; total: number; responseMs: number }>();
  progress.attempts.forEach((attempt) => {
    const current = skillMap.get(attempt.skill) ?? { correct: 0, total: 0, responseMs: 0 };
    current.total += 1;
    current.correct += attempt.correct ? 1 : 0;
    current.responseMs += attempt.responseMs;
    skillMap.set(attempt.skill, current);
  });
  const skills = [...skillMap.entries()].map(([name, value]) => ({
    name,
    accuracy: Math.round((value.correct / value.total) * 100),
    attempts: value.total,
    speed: Math.round(value.responseMs / value.total / 100) / 10,
  })).sort((a, b) => b.attempts - a.attempts);

  const lastSeven = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dayKey(date);
    const attempts = progress.attempts.filter((attempt) => attempt.timestamp.startsWith(key));
    return { label: formatDayLabel(date), count: attempts.length, correct: attempts.filter((attempt) => attempt.correct).length };
  });
  const maxDaily = Math.max(5, ...lastSeven.map((day) => day.count));
  const recentErrors = [...progress.attempts].filter((attempt) => !attempt.correct).reverse().slice(0, 5);
  const masteryRecords = Object.values(progress.mastery?.records ?? {}).filter(Boolean);
  const operationalRecords = masteryRecords.filter((record): record is OperationalMasteryRecord => record?.cohort === "operational");
  const operationalRecall = operationalRecords.length
    ? Math.round(operationalRecords.reduce((sum, record) => sum + predictedRecall(record), 0) / operationalRecords.length * 100)
    : 0;
  const holdoutRetention = ([1, 3, 7, 14] as const).map((day) => {
    const observations = masteryRecords.flatMap((record) => record?.cohort === "holdout"
      ? record.checkpoints.filter((checkpoint) => checkpoint.day === day && checkpoint.observation).map((checkpoint) => checkpoint.observation!)
      : []);
    return {
      day,
      samples: observations.length,
      retention: observations.length ? Math.round(observations.reduce((sum, item) => sum + item.score, 0) / observations.length * 100) : null,
    };
  });
  const modalityStats = (["read", "listen", "produce"] as const).map((modality) => {
    const items = progress.attempts.filter((attempt) => attempt.modality === modality);
    return { modality, attempts: items.length, accuracy: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length * 100) : 0 };
  });
  const brierAttempts = progress.attempts.filter((attempt) => attempt.brierScore !== null);
  const meanBrier = brierAttempts.length ? Math.round(brierAttempts.reduce((sum, item) => sum + (item.brierScore ?? 0), 0) / brierAttempts.length * 100) / 100 : null;

  return (
    <div className="view stats-view">
      <section className="page-intro stats-intro">
        <div><p className="eyebrow">DIT LÆRINGSKOMPAS</p><h1>Statistik</h1><p>Se ikke bare hvor meget du træner — se præcis hvordan du lærer.</p></div>
        <button className="secondary-button" onClick={() => onExport("download")}><Download size={18} /> Hent alle data</button>
      </section>

      <div className="metric-grid">
        <article className="metric-card"><span className="icon-box violet"><Target size={20} /></span><div><p>Præcision</p><strong>{accuracy}%</strong><small>{correct} af {progress.attempts.length} svar</small></div></article>
        <article className="metric-card"><span className="icon-box mint"><Clock3 size={20} /></span><div><p>Aktiv tid</p><strong>{formatDuration(totalSeconds)}</strong><small>Kun tid i opgaver</small></div></article>
        <article className="metric-card"><span className="icon-box amber"><Flame size={20} /></span><div><p>Nuværende stime</p><strong>{progress.streak} dage</strong><small>Bedste vane lige nu</small></div></article>
        <article className="metric-card"><span className="icon-box blue"><Gauge size={20} /></span><div><p>Svartid</p><strong>{avgResponse} sek.</strong><small>Gennemsnit pr. opgave</small></div></article>
        <article className="metric-card"><span className="icon-box violet"><Gamepad2 size={20} /></span><div><p>Scenarier</p><strong>{new Set(progress.scenarioRuns.filter((run) => run.success).map((run) => run.caseId)).size}</strong><small>{progress.scenarioRuns.length} gennemførte forsøg</small></div></article>
      </div>

      <div className="stats-main-grid">
        <section className="panel activity-chart">
          <div className="panel-heading"><div><p className="eyebrow">SENESTE 7 DAGE</p><h3>Aktivitet</h3></div><span className="chart-legend"><i /> Opgaver</span></div>
          <div className="bar-chart" aria-label="Opgaver per dag">
            {lastSeven.map((day) => (
              <div className="bar-column" key={day.label}>
                <span>{day.count || ""}</span><div className="bar-shell"><i style={{ height: `${Math.max(day.count ? 12 : 2, (day.count / maxDaily) * 100)}%` }} /></div><small>{day.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel mastery-card">
          <div className="panel-heading"><div><p className="eyebrow">MESTRING</p><h3>Din dansk-profil</h3></div><BrainCircuit size={21} /></div>
          <div className="mastery-ring" style={{ "--value": `${operationalRecall * 3.6}deg` } as React.CSSProperties}>
            <div><strong>{operationalRecall}%</strong><span>FSRS recall</span></div>
          </div>
          <p>{operationalRecords.length ? `${operationalRecords.length} kort i arbejdsbunken · estimeret med FSRS-5.` : "Tag din første mission for at tegne din profil."}</p>
        </section>
      </div>

      <section className="panel retention-panel">
        <div className="panel-heading"><div><p className="eyebrow">UVILDIG RETENTION</p><h3>Husker du det efter 1, 3, 7 og 14 dage?</h3></div><span className="holdout-badge">8% holdout · fast plan</span></div>
        <p className="retention-note">Kun den tilfældigt fastlåste holdout-gruppe tæller her. FSRS vælger ikke disse tidspunkter, så kurven bliver ikke kunstigt pæn af schedulerens eget udvalg.</p>
        <div className="retention-grid">
          {holdoutRetention.map((point) => <div key={point.day}><span>{point.day} DAG{point.day > 1 ? "E" : ""}</span><strong>{point.retention === null ? "—" : `${point.retention}%`}</strong><small>{point.samples ? `${point.samples} målinger` : "venter på data"}</small><i style={{ height: `${Math.max(4, point.retention ?? 0)}%` }} /></div>)}
        </div>
        <div className="modality-grid">
          {modalityStats.map((item) => <div key={item.modality}><span>{item.modality === "read" ? "Læsning" : item.modality === "listen" ? "Lytning" : "Produktion"}</span><strong>{item.accuracy}%</strong><small>{item.attempts ? `${item.attempts} forsøg` : item.modality === "listen" ? "skema klar · intet audioasset" : "ingen data"}</small></div>)}
          <div><span>en/et-kalibrering</span><strong>{meanBrier === null ? "—" : meanBrier}</strong><small>Brier · lavere er bedre</small></div>
        </div>
      </section>

      <section className="panel skills-panel">
        <div className="panel-heading"><div><p className="eyebrow">FÆRDIGHEDER</p><h3>Styrker og næste fokus</h3></div><span className="muted">Baseret på alle forsøg</span></div>
        {skills.length ? (
          <div className="skill-table">
            <div className="skill-row table-head"><span>Færdighed</span><span>Mestring</span><span>Forsøg</span><span>Tempo</span></div>
            {skills.slice(0, 8).map((skill) => (
              <div className="skill-row" key={skill.name}>
                <strong>{skill.name}</strong><div className="skill-meter"><i style={{ width: `${skill.accuracy}%` }} /><span>{skill.accuracy}%</span></div><span>{skill.attempts}</span><span>{skill.speed} sek.</span>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Activity} title="Din profil er klar til data" copy="Efter din første lektion viser vi præcision, tempo og mønstre for hver færdighed." />}
      </section>

      <div className="stats-bottom-grid">
        <section className="panel error-panel">
          <div className="panel-heading"><div><p className="eyebrow">FEJLMØNSTRE</p><h3>Ord der fortjener et comeback</h3></div><RotateCcw size={20} /></div>
          {recentErrors.length ? recentErrors.map((attempt) => (
            <div className="error-row" key={attempt.id}><span className="error-type">{attempt.questionType}</span><div><strong>{attempt.prompt}</strong><span>Du skrev: {attempt.givenAnswer || "—"}</span></div><small>{Math.round(attempt.responseMs / 1000)} sek.</small></div>
          )) : <EmptyState icon={ShieldCheck} title="Ingen fejl endnu" copy="Når et svar driller, gemmer vi mønsteret her — uden at dømme." />}
        </section>

        <section className="panel export-panel">
          <div className="panel-heading"><div><p className="eyebrow">DATAKONTROL</p><h3>Dit læringsarkiv</h3></div><Code2 size={20} /></div>
          <p>Få den dybe data opdelt i separate filer: forsøg, sessioner, dage, færdigheder, fejl og et læsbart resumé.</p>
          <div className={`folder-status ${directoryHandle ? "connected" : ""}`}>
            {directoryHandle ? <FolderCheck size={20} /> : <CloudDownload size={20} />}
            <div><strong>{directoryHandle ? directoryHandle.name : "Ingen projektmappe valgt"}</strong><span>{directoryHandle ? "Klar til direkte eksport" : "Vælg projektets data-exports-mappe én gang"}</span></div>
          </div>
          <div className="export-actions">
            <button className="secondary-button" onClick={onConnectDirectory}><FolderCheck size={17} /> {directoryHandle ? "Skift mappe" : "Vælg mappe"}</button>
            <button className="primary-button" disabled={!directoryHandle} onClick={() => onExport("folder")}><Download size={17} /> Eksportér til mappe</button>
          </div>
          <small className="privacy-note"><ShieldCheck size={14} /> Alt er local-first. Ingen læringsdata sendes til en ekstern server.</small>
        </section>
      </div>
    </div>
  );
}

function ProfileView({ progress, setProgress }: { progress: ProgressState; setProgress: React.Dispatch<React.SetStateAction<ProgressState>> }) {
  const rankName = MARITIME_RANKS.find((rank) => rank.id === progress.maritimeRankId)?.name ?? progress.maritimeRankId;
  return (
    <div className="view profile-view">
      <section className="page-intro"><div><p className="eyebrow">PERSONLIGT</p><h1>Indstillinger</h1><p>Gør Ordhavn til din rolige, faste danskerutine.</p></div></section>
      <div className="settings-grid">
        <section className="panel profile-card"><div className="large-avatar">R</div><h2>Dansk elev</h2><p>På vej fra første “hej” til et sikkert hverdagsdansk.</p><div className="profile-badges"><span><Gem size={16} /> {progress.rav} rav</span><span><Anchor size={16} /> {progress.kroner} kr.</span><span><Medal size={16} /> {rankName}</span></div></section>
        <section className="panel settings-card">
          <div className="setting-row"><span className="icon-box violet"><Target size={20} /></span><div><strong>Dagligt mål</strong><p>Hvor længe vil du træne?</p></div><select value={progress.dailyGoalMinutes} onChange={(event) => setProgress((old) => ({ ...old, dailyGoalMinutes: Number(event.target.value) }))}><option value={5}>5 min.</option><option value={10}>10 min.</option><option value={15}>15 min.</option><option value={20}>20 min.</option><option value={30}>30 min.</option></select></div>
          <div className="setting-row"><span className="icon-box blue"><Moon size={20} /></span><div><strong>Mørkt tema</strong><p>Blødere farver om aftenen.</p></div><button className={`toggle ${progress.darkMode ? "on" : ""}`} onClick={() => setProgress((old) => ({ ...old, darkMode: !old.darkMode }))}><span /></button></div>
          <div className="setting-row"><span className="icon-box mint"><ShieldCheck size={20} /></span><div><strong>Privat som standard</strong><p>Dine svar bliver kun på denne enhed.</p></div><span className="status-tag">Aktiv</span></div>
          <div className="setting-row"><span className="icon-box amber"><Code2 size={20} /></span><div><strong>Developer mode</strong><p>Test økonomien og åbn senere niveauer uden at ændre rigtige læringsresultater.</p></div><button aria-label="Developer mode" aria-pressed={progress.developerMode} className={`toggle ${progress.developerMode ? "on" : ""}`} onClick={() => setProgress((old) => ({ ...old, developerMode: !old.developerMode }))}><span /></button></div>
        </section>
      </div>
      {progress.developerMode && <section className="panel developer-panel">
        <div><span className="icon-box amber"><Hammer size={20} /></span><div><p className="eyebrow">DEVELOPER MODE</p><h3>Testkasse</h3><p>Kroner til køb og retries. Brug “Hop hertil” på Læringssti for at åbne et bestemt niveau.</p></div></div>
        <div className="developer-actions">
          {DEVELOPER_KRONER_GRANTS.map((amount) => <button className="secondary-button" key={amount} onClick={() => setProgress((old) => ({ ...old, kroner: grantDeveloperKroner(old.kroner, amount) }))}>+{amount.toLocaleString("da-DK")} kr.</button>)}
        </div>
      </section>}
      <section className="panel about-panel"><AppLogo /><div><strong>Ordhavn · Første udgave</strong><p>Bygget med fokus på aktive svar, tydelig statistik og små sejre. Ingen mikrofon, taleoptagelse eller stemmedata.</p></div></section>
    </div>
  );
}

function EmptyState({ icon: Icon, title, copy }: { icon: React.ComponentType<{ size?: number }>; title: string; copy: string }) {
  return <div className="empty-state"><span><Icon size={24} /></span><div><strong>{title}</strong><p>{copy}</p></div></div>;
}

function LessonPlayer({
  mission,
  levelId,
  sessionId,
  startedAtIso,
  startedAtMs,
  priorAttempts,
  currentXp,
  mastery,
  maritimeRankId,
  hintTokens,
  onUseHint,
  onExit,
  onComplete,
}: {
  mission: Mission;
  levelId: string;
  sessionId: string;
  startedAtIso: string;
  startedAtMs: number;
  priorAttempts: Attempt[];
  currentXp: number;
  mastery: MasteryState | null;
  maritimeRankId: MaritimeRankId;
  hintTokens: number;
  onUseHint: () => boolean;
  onExit: () => void;
  onComplete: (attempts: Attempt[], session: StudySession) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [clozeSelections, setClozeSelections] = useState<Record<string, string>>({});
  const [registerMatches, setRegisterMatches] = useState<Record<string, string>>({});
  const [activeClozeBlankId, setActiveClozeBlankId] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [genderConfidence, setGenderConfidence] = useState<50 | 60 | 70 | 80 | 90 | 100>(70);
  const [combo, setCombo] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [animatedXp, setAnimatedXp] = useState(0);
  const [localAttempts, setLocalAttempts] = useState<Attempt[]>([]);
  const [finished, setFinished] = useState(false);
  const questionStartedAt = useRef(startedAtMs);
  const question = mission.questions[index];
  const tokens = question?.tokens ?? [];
  const displayOptions = question?.options
    ? orderThreeChoiceOptions(question.options, question.answer, `${sessionId}:${question.id}`)
    : [];
  const clozeSegments = question?.type === "cloze-multi" ? question.segments : [];
  const currentClozeBlanks = clozeBlanks(clozeSegments);
  const registerPairs = question?.type === "register-match" ? question.pairs : [];
  const answer = question?.type === "order" || question?.type === "ikke-position"
    ? ordered.join(" ")
    : question?.type === "cloze-multi"
      ? serializeClozeSelections(clozeSegments, clozeSelections)
      : question?.type === "register-match"
        ? serializeRegisterMatches(registerPairs, registerMatches)
        : selected;
  const answerReady = question?.type === "cloze-multi"
    ? currentClozeBlanks.length > 0 && currentClozeBlanks.every((blank) => Boolean(clozeSelections[blank.blankId]))
    : question?.type === "register-match"
      ? registerPairs.length > 0 && registerPairs.every((pair) => Boolean(registerMatches[pair.addressee]))
      : Boolean(answer.trim());
  const focusedClozeBlankId = activeClozeBlankId
    || currentClozeBlanks.find((blank) => !clozeSelections[blank.blankId])?.blankId
    || currentClozeBlanks[0]?.blankId
    || "";
  const progressPercent = ((index + (checked ? 1 : 0)) / mission.questions.length) * 100;
  const latestAttempt = localAttempts.at(-1);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      const isFormControl = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement;
      if (event.key === "Escape") onExit();
      if (event.key === "Enter" && !finished && !isFormControl) {
        if (!checked && answerReady) checkAnswer();
        else if (checked) nextQuestion();
      }
      if (question && ["choice", "number-arcade", "definiteness", "agreement"].includes(question.type) && !checked && /^[1-9]$/.test(event.key)) {
        const option = displayOptions[Number(event.key) - 1];
        if (option) setSelected(option);
      }
      if (question && ["gender-bet"].includes(question.type) && !checked && /^[12]$/.test(event.key)) {
        const option = question.options?.[Number(event.key) - 1];
        if (option) setSelected(option);
      }
      if (question && ["order", "ikke-position"].includes(question.type) && !checked && /^[1-9]$/.test(event.key)) {
        const tokenIndex = Number(event.key) - 1;
        const token = tokens[tokenIndex];
        const alreadyUsed = token && ordered.filter((item) => item === token).length >= tokens.slice(0, tokenIndex + 1).filter((item) => item === token).length;
        if (token && !alreadyUsed) setOrdered((items) => [...items, token]);
      }
      if (question && ["order", "ikke-position"].includes(question.type) && !checked && event.key === "Backspace") {
        setOrdered((items) => items.slice(0, -1));
      }
      if (question?.type === "cloze-multi" && !checked && /^[1-9]$/.test(event.key)) {
        const activeBlank = currentClozeBlanks.find((blank) => blank.blankId === focusedClozeBlankId);
        const activeBlankOptions = activeBlank
          ? orderThreeChoiceOptions(activeBlank.options, activeBlank.answer, `${sessionId}:${question.id}:${activeBlank.blankId}`)
          : [];
        const option = activeBlankOptions[Number(event.key) - 1];
        if (activeBlank && option) {
          event.preventDefault();
          setClozeSelections((old) => ({ ...old, [activeBlank.blankId]: option }));
          const activeIndex = currentClozeBlanks.findIndex((blank) => blank.blankId === activeBlank.blankId);
          const nextBlank = currentClozeBlanks.slice(activeIndex + 1).find((blank) => !clozeSelections[blank.blankId]);
          if (nextBlank) setActiveClozeBlankId(nextBlank.blankId);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  useEffect(() => {
    if (!finished) return;
    const step = Math.max(1, Math.ceil(earnedXp / 32));
    const interval = window.setInterval(() => {
      setAnimatedXp((value) => {
        const next = Math.min(earnedXp, value + step);
        if (next >= earnedXp) window.clearInterval(interval);
        return next;
      });
    }, 24);
    return () => window.clearInterval(interval);
  }, [earnedXp, finished]);

  if (!question && !finished) return null;

  function checkAnswer() {
    if (!answerReady || checked) return;
    const score = question.type === "cloze-multi"
      ? scoreClozeSelections(question.segments, clozeSelections)
      : question.type === "register-match"
        ? scoreRegisterMatches(question.pairs, registerMatches)
        : scoreAnswer(question, answer);
    const wasCorrect = score >= 0.95;
    const supportsDiscretePartialCredit = question.type === "cloze-multi" || question.type === "register-match";
    const result: Attempt["result"] = wasCorrect ? "correct" : score > 0 && (supportsDiscretePartialCredit || score >= 0.5) ? "partial" : "incorrect";
    const nextCombo = wasCorrect ? combo + 1 : 0;
    const brierScore = question.type === "gender-bet"
      ? Math.round(Math.pow(genderConfidence / 100 - (wasCorrect ? 1 : 0), 2) * 1000) / 1000
      : null;
    const calibrationBonus = brierScore === null ? 0 : Math.round((1 - brierScore) * 5);
    const xp = wasCorrect ? 10 + Math.min(5, nextCombo) + calibrationBonus : result === "partial" ? 5 : Math.max(1, calibrationBonus);
    const attempt: Attempt = {
      id: `attempt-${Date.now()}-${index}`,
      timestamp: new Date().toISOString(),
      sessionId,
      missionId: mission.id,
      levelId,
      questionId: question.id,
      questionType: question.type,
      modality: question.modality,
      skill: question.skill,
      tags: question.tags,
      prompt: question.prompt,
      expectedAnswer: question.answer,
      givenAnswer: answer,
      correct: wasCorrect,
      responseMs: Date.now() - questionStartedAt.current,
      hintsUsed,
      retryNumber: 0,
      confidence: question.type === "gender-bet" ? genderConfidence / 100 : null,
      brierScore,
      score,
      result,
      xpAwarded: xp,
    };
    setCorrect(wasCorrect);
    setChecked(true);
    setCombo(nextCombo);
    setEarnedXp((value) => value + xp);
    setLocalAttempts((items) => [...items, attempt]);
  }

  function nextQuestion() {
    if (index >= mission.questions.length - 1) {
      const endedAt = new Date();
      const totalAttempts = localAttempts;
      const session: StudySession = {
        id: sessionId,
        startedAt: startedAtIso,
        endedAt: endedAt.toISOString(),
        missionId: mission.id,
        levelId,
        correct: totalAttempts.filter((attempt) => attempt.correct).length,
        total: totalAttempts.length,
        durationSeconds: Math.max(1, Math.round((endedAt.getTime() - startedAtMs) / 1000)),
        xpEarned: earnedXp,
      };
      onComplete(totalAttempts, session);
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelected("");
    setOrdered([]);
    setClozeSelections({});
    setRegisterMatches({});
    setActiveClozeBlankId("");
    setChecked(false);
    setCorrect(false);
    setHintsUsed(0);
    setGenderConfidence(70);
    questionStartedAt.current = Date.now();
  }

  if (finished) {
    const right = localAttempts.filter((attempt) => attempt.correct).length;
    const percentage = Math.round((right / Math.max(1, localAttempts.length)) * 100);
    const bestCombo = localAttempts.reduce((best, attempt) => {
      const next = attempt.correct ? best.current + 1 : 0;
      return { current: next, maximum: Math.max(best.maximum, next) };
    }, { current: 0, maximum: 0 }).maximum;
    const returnItem = mission.questions
      .map((item) => {
        const record = mastery?.records[`${item.id}::${item.modality}`];
        const dueAt = record?.cohort === "operational"
          ? record.card.due
          : record?.checkpoints.find((checkpoint) => checkpoint.observation === null)?.dueAt;
        return { item, dueAt, seen: [...priorAttempts, ...localAttempts].filter((attempt) => attempt.questionId === item.id).length };
      })
      .filter((item): item is typeof item & { dueAt: string } => Boolean(item.dueAt))
      .sort((left, rightItem) => Date.parse(left.dueAt) - Date.parse(rightItem.dueAt))[0];
    const returnDays = returnItem ? calendarDaysBetween(dayKey(), dayKey(new Date(returnItem.dueAt))) : null;
    const rank = evaluateMaritimeRank({
      xp: currentXp,
      retention: retentionMeasurements(mastery),
      previousRankId: maritimeRankId,
      retentionFailurePolicy: "threaten",
    });
    const rankTarget = rank.rankAtRisk ?? rank.nextRank;
    const rankPercent = rankTarget
      ? Math.max(0, Math.min(100, (currentXp - rank.rank.minimumXp) / Math.max(1, rankTarget.minimumXp - rank.rank.minimumXp) * 100))
      : 100;
    return (
      <div className="lesson-overlay completion-screen">
        <div className="completion-confetti" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="completion-card">
          <div className="completion-icon"><PartyPopper size={36} /></div>
          <p className="eyebrow">MISSION FULDFØRT</p>
          <h1>Det sad godt!</h1>
          <p>Du har gjort dansk en lille smule mere automatisk.</p>
          <div className="completion-stats"><div><Gem size={21} /><strong>+{animatedXp}</strong><span>XP</span></div><div><Target size={21} /><strong>{percentage}%</strong><span>præcision</span></div><div><Anchor size={21} /><strong>{bestCombo}</strong><span>bedste strøm</span></div></div>
          <div className="completion-rank"><div><span>{rank.rank.name}</span><strong>{rankTarget ? rankTarget.name : "Havnefoged"}</strong></div><div className="completion-rank-track"><i style={{ width: `${rankPercent}%` }} /></div><small>{rank.standing === "retention-locked" ? "XP er på plads — retention åbner den næste rang." : rankTarget ? `${currentXp.toLocaleString("da-DK")} / ${rankTarget.minimumXp.toLocaleString("da-DK")} XP` : "Højeste maritime rang nået"}</small></div>
          {returnItem && <div className="next-review-note"><RotateCcw size={18} /><p><strong>“{returnItem.item.answer}” er mødt {returnItem.seen} {returnItem.seen === 1 ? "gang" : "gange"}</strong><span>{returnDays === 0 ? "Det er allerede klar til repetition i dag." : `Det vender tilbage om ${returnDays} ${returnDays === 1 ? "dag" : "dage"}.`}</span></p></div>}
          <button className="primary-button wide" onClick={onExit}>Tilbage til din sti <ArrowRight size={18} /></button>
        </div>
      </div>
    );
  }

  const expectedAnswerLabel = question.type === "cloze-multi"
    ? question.segments.map((segment) => "text" in segment ? segment.text : segment.answer).join("").trim()
    : question.type === "register-match"
      ? "de korrekte forbindelser, som nu er markeret"
      : question.answer;
  const partialFeedback = latestAttempt?.result === "partial"
    ? question.type === "cloze-multi"
      ? `Næsten — ${Math.round(latestAttempt.score * currentClozeBlanks.length)} af ${currentClozeBlanks.length} felter er rigtige`
      : question.type === "register-match"
        ? `Næsten — ${Math.round(latestAttempt.score * registerPairs.length)} af ${registerPairs.length} forbindelser er rigtige`
        : `Næsten — ${Math.round(latestAttempt.score * 100)}% match`
    : "";
  const showsSentenceCorrection = !correct && ["order", "ikke-position", "transform", "cloze-multi"].includes(question.type);

  return (
    <div className="lesson-overlay">
      <header className="lesson-header">
        <button className="icon-button" onClick={onExit} aria-label="Luk lektionen"><X size={23} /></button>
        <div className="lesson-progress"><span style={{ width: `${progressPercent}%` }} /></div>
        <div className="lesson-hearts"><Anchor size={20} /><span>Havnepas</span></div>
      </header>
      <main className="lesson-main">
        <div className="question-meta"><span>{question.skill}</span><span>Opgave {index + 1} af {mission.questions.length}</span></div>
        <p className="question-instruction">{
          question.type === "choice" ? "Vælg det bedste svar" :
          question.type === "order" ? "Byg sætningen" :
          question.type === "gender-bet" ? "Vælg en eller et — og sats på din sikkerhed" :
          question.type === "number-arcade" ? "Knæk det danske tal" :
          question.type === "definiteness" ? "Vælg den rigtige bestemthed" :
          question.type === "agreement" ? "Få tillægsordet til at passe" :
          question.type === "ikke-position" ? "Sæt ‘ikke’ på den danske plads" :
          question.type === "cloze-multi" ? "Udfyld alle led, så de passer sammen" :
          question.type === "register-match" ? "Forbind hver person med den rigtige tone" :
          question.type === "transform" ? "Skriv sætningen om efter instruktionen" :
          "Skriv det manglende"
        }</p>
        <h1 className="question-prompt">{question.prompt}</h1>
        {question.translation && <p className="question-translation">{question.translation}</p>}

        {question.type === "number-arcade" && <div className="number-arcade-display"><span>{question.value}</span><div><strong>Vigesimalt værksted</strong><small>{checked ? question.breakdown : "Find talordet før maskinen køler af"}</small></div></div>}
        {question.type === "definiteness" && <div className="grammar-transform"><span>{question.forms.indefinite}</span><ArrowRight size={16} /><span>{question.forms.definite}</span><ArrowRight size={16} /><span>{question.forms.modified}</span></div>}
        {question.type === "agreement" && <div className="grammar-rule"><Layers3 size={18} /><span>grundform</span><i>→</i><strong>{question.agreementForm === "t" ? "-t ved et-ord" : question.agreementForm === "e" ? "-e i bestemt/flertal" : "ingen endelse ved en-ord"}</strong></div>}
        {question.type === "ikke-position" && <div className={`field-model ${checked ? "resolved" : ""}`}><span>{question.clauseType === "main" ? "Hovedsætning · V2" : "Ledsætning"}</span><div>{question.clauseType === "main" ? <><i>forfelt</i><i>verbum</i><i>subjekt</i><i className="ikke">ikke</i></> : <><i>bindeord</i><i>subjekt</i><i className="ikke">ikke</i><i>verbum</i></>}</div>{checked && <p className="field-answer-flight">{question.answer}</p>}</div>}
        {question.type === "cloze-multi" && (
          <div className="cloze-multi-area">
            <div className="cloze-sentence" aria-label="Sætning med flere tomme felter">
              {question.segments.map((segment, segmentIndex) => "text" in segment
                ? <span key={`text-${segmentIndex}`}>{segment.text}</span>
                : <button
                    key={segment.blankId}
                    type="button"
                    disabled={checked}
                    aria-label={`Vælg ord til felt ${segmentIndex + 1}`}
                    className={`${focusedClozeBlankId === segment.blankId ? "active" : ""} ${clozeSelections[segment.blankId] ? "filled" : ""} ${checked && clozeSelections[segment.blankId] === segment.answer ? "answer-correct" : ""} ${checked && clozeSelections[segment.blankId] !== segment.answer ? "answer-wrong" : ""}`}
                    onClick={() => setActiveClozeBlankId(segment.blankId)}
                  >{clozeSelections[segment.blankId] || "___"}</button>
              )}
            </div>
            <div className="cloze-option-groups">
              {currentClozeBlanks.map((blank, blankIndex) => (
                <section className={focusedClozeBlankId === blank.blankId ? "active" : ""} key={blank.blankId} onClick={() => !checked && setActiveClozeBlankId(blank.blankId)}>
                  <div><strong>Felt {blankIndex + 1}</strong><span>{clozeSelections[blank.blankId] || "Vælg en form"}</span></div>
                  <div>
                    {orderThreeChoiceOptions(blank.options, blank.answer, `${sessionId}:${question.id}:${blank.blankId}`).map((option, optionIndex) => <button
                      type="button"
                      key={option}
                      disabled={checked}
                      className={`${clozeSelections[blank.blankId] === option ? "selected" : ""} ${checked && option === blank.answer ? "answer-correct" : ""} ${checked && clozeSelections[blank.blankId] === option && option !== blank.answer ? "answer-wrong" : ""}`}
                      onClick={() => setClozeSelections((old) => ({ ...old, [blank.blankId]: option }))}
                    >{focusedClozeBlankId === blank.blankId && <kbd>{optionIndex + 1}</kbd>}{option}</button>)}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
        {question.type === "register-match" && (
          <div className="register-match-area">
            <div className="register-intent"><MessageCircle size={20} /><div><span>Intention</span><strong>{question.intent}</strong></div></div>
            <div className="register-pairs">
              {question.pairs.map((pair) => {
                const chosen = registerMatches[pair.addressee] ?? "";
                const rowCorrect = normalizeExerciseAnswer(chosen) === normalizeExerciseAnswer(pair.utterance);
                return (
                  <label className={checked ? rowCorrect ? "answer-correct" : "answer-wrong" : ""} key={pair.addressee}>
                    <span className="register-addressee"><strong>{pair.addressee}</strong><small>{pair.addresseeNote}</small></span>
                    <span className="register-arrow"><ArrowRight size={17} /></span>
                    <select
                      aria-label={`Formulering til ${pair.addressee}`}
                      disabled={checked}
                      value={chosen}
                      onChange={(event) => setRegisterMatches((old) => ({ ...old, [pair.addressee]: event.target.value }))}
                    >
                      <option value="">Vælg formulering …</option>
                      {[...question.pairs].map((option) => option.utterance).sort((left, right) => left.localeCompare(right, "da-DK")).map((utterance) => (
                        <option
                          key={utterance}
                          value={utterance}
                          disabled={Object.entries(registerMatches).some(([addressee, value]) => addressee !== pair.addressee && value === utterance)}
                        >{utterance}</option>
                      ))}
                    </select>
                    {checked && !rowCorrect && <small className="register-correction">Rigtigt: {pair.utterance}</small>}
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {question.type === "transform" && <div className="transform-display"><div><span>Udgangspunkt</span><strong>{question.sourceSentence}</strong></div><ArrowRight size={20} /><div><span>Ændring</span><strong>{question.instruction}</strong></div></div>}

        {(question.type === "choice" || question.type === "number-arcade" || question.type === "definiteness" || question.type === "agreement") && (
          <div className="option-list">
            {displayOptions.map((option, optionIndex) => (
              <button
                className={`answer-option ${selected === option ? "selected" : ""} ${checked && option === question.answer ? "answer-correct" : ""} ${checked && selected === option && !correct ? "answer-wrong" : ""}`}
                key={option}
                onClick={() => !checked && setSelected(option)}
              ><span>{optionIndex + 1}</span><strong>{option}</strong>{checked && option === question.answer && <Check size={19} />}</button>
            ))}
          </div>
        )}

        {question.type === "gender-bet" && (
          <div className="gender-bet-area">
            <div className="gender-options">
              {(question.options ?? ["en", "et"]).map((option) => (
                <button
                  className={`gender-card ${selected === option ? "selected" : ""} ${checked && option === question.answer ? "answer-correct" : ""} ${checked && selected === option && !correct ? "answer-wrong" : ""}`}
                  key={option}
                  disabled={checked}
                  onClick={() => setSelected(option)}
                ><strong>{option}</strong><span>{option === "en" ? "fælleskøn" : "intetkøn"}</span></button>
              ))}
            </div>
            <div className="confidence-wager">
              <div><span>Sikkerhedsindsats</span><strong>{genderConfidence}%</strong></div>
              <input
                type="range"
                min="50"
                max="100"
                step="10"
                value={genderConfidence}
                disabled={checked}
                onChange={(event) => setGenderConfidence(Number(event.target.value) as 50 | 60 | 70 | 80 | 90 | 100)}
                aria-label="Hvor sikker er du?"
              />
              <p>Høj sikkerhed giver flere point, men koster ved et sikkert forkert svar. Kalibrering måles med Brier-score.</p>
            </div>
          </div>
        )}

        {(question.type === "order" || question.type === "ikke-position") && (
          <div className="order-area">
            <div className="order-answer">
              {ordered.length ? ordered.map((token, tokenIndex) => <button key={`${token}-${tokenIndex}`} onClick={() => !checked && setOrdered((items) => items.filter((_, i) => i !== tokenIndex))}>{token}</button>) : <span>Klik på ordene nedenfor …</span>}
            </div>
            <div className="token-bank">
              {tokens.map((token, tokenIndex) => {
                const used = ordered.filter((item) => item === token).length >= tokens.slice(0, tokenIndex + 1).filter((item) => item === token).length;
                return <button key={`${token}-${tokenIndex}`} disabled={used || checked} onClick={() => setOrdered((items) => [...items, token])}><kbd>{tokenIndex + 1}</kbd>{token}</button>;
              })}
            </div>
          </div>
        )}

        {(question.type === "input" || question.type === "transform") && (
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); checkAnswer(); }} className="input-answer-wrap">
            <input autoFocus value={selected} disabled={checked} onChange={(event) => setSelected(event.target.value)} placeholder={question.type === "transform" ? "Skriv hele den nye sætning …" : "Skriv på dansk …"} aria-label="Dit svar" autoComplete="off" />
            <Keyboard size={20} />
          </form>
        )}

        {!checked && (
          <button className="hint-button" disabled={!hintsUsed && hintTokens <= 0} onClick={() => {
            if (!hintsUsed && onUseHint()) setHintsUsed(1);
          }}><CircleHelp size={17} /> {hintsUsed ? question.hint : hintTokens > 0 ? `Brug 1 hint-token · ${hintTokens} tilbage` : "Ingen hint-tokens"}</button>
        )}
      </main>
      <footer className={`lesson-footer ${checked ? (correct ? "correct" : latestAttempt?.result === "partial" ? "partial" : "wrong") : ""}`}>
        {checked ? (
          <div className="feedback-content">
            <div className="feedback-icon">{correct ? <Check size={24} /> : <Lightbulb size={24} />}</div>
            <div className="feedback-copy">
              <strong>{correct ? "Præcis!" : latestAttempt?.result === "partial" ? partialFeedback : showsSentenceCorrection ? "Ikke helt endnu" : `Det rigtige svar er “${expectedAnswerLabel}”`}</strong>
              {showsSentenceCorrection && <div className="correct-sentence" role="status"><span>Korrekt sætning</span><b lang="da">{expectedAnswerLabel}</b></div>}
              <p>{question.explanation}</p>
            </div>
            <div className="confidence-picker">{question.type === "gender-bet" ? <><span>Kalibrering</span><strong>Brier {Math.round(Math.pow(genderConfidence / 100 - (correct ? 1 : 0), 2) * 100) / 100}</strong></> : <><span>Hukommelsesspor</span><strong>{question.modality === "produce" ? "Produktion" : question.modality === "listen" ? "Lytning" : "Læsning"}</strong></>}</div>
            <button className="primary-button next" onClick={nextQuestion}>Fortsæt <ArrowRight size={18} /></button>
          </div>
        ) : (
          <div className="lesson-actions"><span className="keyboard-tip"><Keyboard size={15} /> Enter for at fortsætte</span><button className="primary-button next" disabled={!answerReady} onClick={checkAnswer}>Tjek svar</button></div>
        )}
      </footer>
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [wordleCheckpoint, setWordleCheckpoint] = useState<WordlePathCheckpoint | null>(null);
  const [scenarioLaunch, setScenarioLaunch] = useState<ScenarioLaunch | null>(null);
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [hydrated, setHydrated] = useState(false);
  const [activeLesson, setActiveLesson] = useState<{ mission: Mission; levelId: string; sessionId: string; startedAtIso: string; startedAtMs: number } | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<DirectoryHandleLike | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const parsed = readProgressWithBackup(
          localStorage.getItem(STORAGE_KEY),
          localStorage.getItem(STORAGE_BACKUP_KEY),
        ) as Partial<ProgressState> | null;
        if (parsed) {
          const today = dayKey();
          const migrated: ProgressState = {
            ...initialProgress,
            ...parsed,
            version: 3,
            relationships: { ...initialProgress.relationships, ...(parsed.relationships ?? {}) },
            repliedCharacterIds: parsed.repliedCharacterIds ?? [],
            scenarioRuns: parsed.scenarioRuns ?? [],
            scenarioAttemptedIds: parsed.scenarioAttemptedIds ?? [...new Set((parsed.scenarioRuns ?? []).map((run) => run.caseId))],
            purchasedBuildings: parsed.purchasedBuildings ?? [],
            unlockedScenarioIds: parsed.unlockedScenarioIds ?? [],
            ravClaims: parsed.ravClaims ?? [],
            rerolledWeakItemIds: parsed.rerolledWeakItemIds ?? [],
            weeklyStorms: parsed.weeklyStorms ?? [],
            genderBankRuns: parsed.genderBankRuns ?? [],
            claimedBossGates: parsed.claimedBossGates ?? [],
            wordleGames: parsed.wordleGames ?? {},
            wordleRuns: parsed.wordleRuns ?? [],
            completedWordleCheckpoints: parsed.completedWordleCheckpoints ?? [],
          };
          if (migrated.lastActiveDate && calendarDaysBetween(migrated.lastActiveDate, today) > 1) migrated.streak = 0;
          if (migrated.lastWeakRerollDate !== today) migrated.rerolledWeakItemIds = [];
          const fee = applyDailyHarborFee({
            balance: { xp: migrated.xp, kroner: migrated.kroner, rav: migrated.rav },
            lastChargedOn: migrated.lastHarborFeeDate,
            throughDate: today,
          });
          migrated.kroner = fee.balance.kroner;
          migrated.lastHarborFeeDate = fee.lastChargedOn;
          if (migrated.purchasedBuildings.includes("kaffebaren")) {
            const refillDays = migrated.lastHintRefillDate ? calendarDaysBetween(migrated.lastHintRefillDate, today) : 1;
            if (refillDays > 0) migrated.hintTokens = Math.min(5, migrated.hintTokens + Math.min(3, refillDays));
            migrated.lastHintRefillDate = today;
          }
          migrated.maritimeRankId = evaluateMaritimeRank({
            xp: migrated.xp,
            retention: retentionMeasurements(migrated.mastery),
            previousRankId: migrated.maritimeRankId,
            retentionFailurePolicy: "threaten",
          }).rank.id;
          setProgress(migrated);
        } else {
          setProgress({ ...initialProgress, lastHarborFeeDate: dayKey() });
        }
      } catch {
        setProgress({ ...initialProgress, lastHarborFeeDate: dayKey() });
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const serialized = JSON.stringify(progress);
      const prepared = prepareProgressWrite(localStorage.getItem(STORAGE_KEY), serialized);
      if (prepared.backup) localStorage.setItem(STORAGE_BACKUP_KEY, prepared.backup);
      localStorage.setItem(STORAGE_KEY, prepared.primary);
    } catch {
      // A storage quota or privacy setting must never crash the learning UI.
    }
    document.documentElement.dataset.theme = progress.darkMode ? "dark" : "light";
  }, [progress, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const interval = window.setInterval(() => {
      setClockNowMs(Date.now());
      const today = dayKey();
      setProgress((old) => {
        if (old.lastHarborFeeDate === today) return old;
        const fee = applyDailyHarborFee({
          balance: { xp: old.xp, kroner: old.kroner, rav: old.rav },
          lastChargedOn: old.lastHarborFeeDate,
          throughDate: today,
        });
        return { ...old, kroner: fee.balance.kroner, lastHarborFeeDate: fee.lastChargedOn };
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [hydrated]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const startLesson = (mission: Mission, levelId: string) => {
    const startedAtMs = Date.now();
    const unique = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${startedAtMs}-${Math.random().toString(36).slice(2, 8)}`;
    setActiveLesson({ mission, levelId, sessionId: `session-${unique}`, startedAtIso: new Date(startedAtMs).toISOString(), startedAtMs });
  };

  const startWeeklyStorm = () => {
    const allQuestions = courseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions));
    const candidates = allQuestions.map((question) => {
      const attempts = progress.attempts.filter((attempt) => attempt.questionId === question.id);
      const accuracy = attempts.length ? attempts.filter((attempt) => attempt.correct).length / attempts.length : 0.55;
      return { itemId: question.id, weakness: Math.min(1, Math.max(0, 1 - accuracy + (attempts.length === 0 ? 0.12 : 0))), skill: question.skill };
    });
    const storm = createWeeklyStorm({ profileId: "local-harbor", date: new Date(), candidates });
    if (progress.weeklyStorms.some((attempt) => attempt.weekId === storm.id)) {
      notify("Denne uges storm er allerede sejlet. Næste storm kommer mandag.");
      return;
    }
    const byId = new Map(allQuestions.map((question) => [question.id, question]));
    const questions = storm.itemIds.map((id) => byId.get(id)).filter((item): item is Challenge => Boolean(item));
    setProgress((old) => old.weeklyStorms.some((attempt) => attempt.weekId === storm.id)
      ? old
      : { ...old, weeklyStorms: [...old.weeklyStorms, { weekId: storm.id, completedAt: new Date().toISOString(), score: 0, total: questions.length }] });
    startLesson({ id: storm.id, title: "Ugens storm", subtitle: "Syv svage punkter. Én sejlads. Ingen omveje.", icon: "target", estimatedMinutes: 6, xp: 160, questions }, "storm");
  };

  const startDueReview = () => {
    const records = progress.mastery?.records ?? {};
    const dueIds = [
      ...getDueHoldoutReviews(records, new Date(), 10).map((review) => review.itemId),
      ...getDueOperationalReviews(records, new Date(), 10).map((review) => review.itemId),
    ];
    const uniqueDueIds = [...new Set(dueIds)].slice(0, 10);
    const itemById = new Map(courseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions)).map((question) => [question.id, question]));
    const questions = uniqueDueIds.map((id) => itemById.get(id)).filter((item): item is Challenge => Boolean(item));
    if (!questions.length) {
      notify("Ingen gentagelser er klar endnu. Fyrtårnet holder øje med horisonten.");
      return;
    }
    startLesson({
      id: `practice-review-${dayKey()}`,
      title: "Dagens gentagelser",
      subtitle: "Holdout-tiderne ligger fast; resten følger FSRS-5.",
      icon: "lighthouse",
      estimatedMinutes: Math.max(2, Math.ceil(questions.length * 0.6)),
      xp: questions.length * 10,
      questions,
    }, "review");
  };

  const buildExportFiles = (state = progress) => {
    const daily = new Map<string, { date: string; attempts: number; correct: number; seconds: number; xp: number }>();
    state.attempts.forEach((attempt) => {
      const date = attempt.timestamp.slice(0, 10);
      const row = daily.get(date) ?? { date, attempts: 0, correct: 0, seconds: 0, xp: 0 };
      row.attempts += 1; row.correct += attempt.correct ? 1 : 0; row.seconds += Math.round(attempt.responseMs / 1000); row.xp += attempt.xpAwarded;
      daily.set(date, row);
    });
    const skill = new Map<string, { skill: string; attempts: number; correct: number; responseMs: number; hints: number }>();
    state.attempts.forEach((attempt) => {
      const row = skill.get(attempt.skill) ?? { skill: attempt.skill, attempts: 0, correct: 0, responseMs: 0, hints: 0 };
      row.attempts += 1; row.correct += attempt.correct ? 1 : 0; row.responseMs += attempt.responseMs; row.hints += attempt.hintsUsed;
      skill.set(attempt.skill, row);
    });
    const skillRows = [...skill.values()].map((row) => ({ ...row, accuracyPercent: row.attempts ? Math.round(row.correct / row.attempts * 100) : 0, avgResponseMs: row.attempts ? Math.round(row.responseMs / row.attempts) : 0 }));
    const errors = state.attempts.filter((attempt) => !attempt.correct);
    const masteryRecords = Object.values(state.mastery?.records ?? {}).filter(Boolean);
    const holdoutRows = ([1, 3, 7, 14] as const).map((day) => {
      const observations = masteryRecords.flatMap((record) => record?.cohort === "holdout"
        ? record.checkpoints.filter((checkpoint) => checkpoint.day === day && checkpoint.observation).map((checkpoint) => checkpoint.observation!)
        : []);
      return { checkpointDay: day, samples: observations.length, meanScore: observations.length ? observations.reduce((sum, value) => sum + value.score, 0) / observations.length : null, correct: observations.filter((value) => value.correct).length };
    });
    const modalityRows = (["read", "listen", "produce"] as const).map((modality) => {
      const attempts = state.attempts.filter((attempt) => attempt.modality === modality);
      return { modality, attempts: attempts.length, meanScore: attempts.length ? attempts.reduce((sum, value) => sum + value.score, 0) / attempts.length : null, correct: attempts.filter((value) => value.correct).length };
    });
    const contentProgress = courseLevels.map((level) => ({ levelId: level.id, title: level.title, missions: level.missions.map((mission) => ({ id: mission.id, title: mission.title, completed: state.completedMissions.includes(mission.id), estimatedMinutes: mission.estimatedMinutes, itemCount: mission.questions.length })) }));
    const itemCatalog = courseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions.map((item) => ({ id: item.id, levelId: level.id, missionId: mission.id, type: item.type, modality: item.modality, assets: item.assets, skill: item.skill, tags: item.tags, answer: item.answer }))));
    const dataFiles = {
      "attempts.json": JSON.stringify(state.attempts, null, 2),
      "sessions.json": JSON.stringify(state.sessions, null, 2),
      "daily.csv": toCsv([...daily.values()]),
      "skills.csv": toCsv(skillRows),
      "errors.json": JSON.stringify(errors, null, 2),
      "mastery.json": JSON.stringify(masteryRecords, null, 2),
      "review-events.json": JSON.stringify(state.mastery?.events ?? [], null, 2),
      "holdout-retention.csv": toCsv(holdoutRows),
      "modality.csv": toCsv(modalityRows),
      "content-progress.json": JSON.stringify(contentProgress, null, 2),
      "item-catalog.json": JSON.stringify(itemCatalog, null, 2),
      "scenario-runs.json": JSON.stringify(state.scenarioRuns, null, 2),
      "economy.json": JSON.stringify({
        xp: state.xp,
        kroner: state.kroner,
        rav: state.rav,
        maritimeRankId: state.maritimeRankId,
        purchasedBuildings: state.purchasedBuildings,
        unlockedScenarioIds: state.unlockedScenarioIds,
        scenarioAttemptedIds: state.scenarioAttemptedIds,
        relationships: state.relationships,
        repliedCharacterIds: state.repliedCharacterIds,
        hintTokens: state.hintTokens,
        rerolledWeakItemIds: state.rerolledWeakItemIds,
        lastWeakRerollDate: state.lastWeakRerollDate,
        lastHarborFeeDate: state.lastHarborFeeDate,
        ravClaims: state.ravClaims,
      }, null, 2),
      "weekly-storms.json": JSON.stringify(state.weeklyStorms, null, 2),
      "gender-bank-runs.json": JSON.stringify(state.genderBankRuns, null, 2),
    };
    const summary = {
      exportedAt: new Date().toISOString(),
      app: "Ordhavn",
      dataVersion: state.version,
      totals: {
        xp: state.xp,
        kroner: state.kroner,
        rav: state.rav,
        maritimeRankId: state.maritimeRankId,
        purchasedBuildings: state.purchasedBuildings.length,
        streak: state.streak,
        missions: state.completedMissions.length,
        attempts: state.attempts.length,
        sessions: state.sessions.length,
        scenarioRuns: state.scenarioRuns.length,
      },
      privacy: "Generated locally. Contains learning responses; handle as personal data.",
      scheduler: { operational: "FSRS-5 via ts-fsrs 4.7.1", holdout: "fixed 1/3/7/14 days", holdoutPercent: 8 },
      modalities: ["read", "listen", "produce"],
      files: [...Object.keys(dataFiles), "summary.json"],
    };
    return {
      ...dataFiles,
      "summary.json": JSON.stringify(summary, null, 2),
    };
  };

  const exportData = async (mode: "download" | "folder", state = progress) => {
    const files = buildExportFiles(state);
    if (mode === "folder" && directoryHandle) {
      try {
        for (const [filename, content] of Object.entries(files)) {
          const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
          const writer = await fileHandle.createWritable();
          await writer.write(content);
          await writer.close();
        }
        notify(`${Object.keys(files).length} filer gemt i ${directoryHandle.name}`);
      } catch {
        notify("Mappen gav ikke adgang. Prøv at vælge den igen.");
      }
      return;
    }
    Object.entries(files).forEach(([filename, content], index) => window.setTimeout(() => downloadFile(filename, content, filename.endsWith(".csv") ? "text/csv" : "application/json"), index * 140));
    notify(`${Object.keys(files).length} separate datafiler hentes nu`);
  };

  const connectDirectory = async () => {
    const picker = (window as typeof window & { showDirectoryPicker?: () => Promise<DirectoryHandleLike> }).showDirectoryPicker;
    if (!picker) {
      notify("Din browser understøtter ikke direkte mapper. Brug ‘Hent alle data’ i stedet.");
      return;
    }
    try {
      const handle = await picker();
      setDirectoryHandle(handle);
      notify(`Forbundet til ${handle.name}`);
    } catch {
      // The user can safely cancel the native directory dialog.
    }
  };

  const completeLesson = (attempts: Attempt[], session: StudySession) => {
    setProgress((old) => {
      const isStorm = session.missionId.startsWith("storm:");
      const firstCompletion = !old.completedMissions.includes(session.missionId) && !session.missionId.startsWith("practice-") && !isStorm;
      const xpEarned = isStorm ? 160 : attempts.reduce((sum, attempt) => sum + attempt.xpAwarded, 0) + (firstCompletion ? 25 : 0);
      const kronerEarned = isStorm ? 70 : (firstCompletion ? 32 : 8) + attempts.filter((attempt) => attempt.correct).length * 2;
      let ravEarned = 0;
      const nextRavClaims = [...old.ravClaims];
      const previouslySeenItems = new Set(old.attempts.map((attempt) => attempt.questionId));
      let mastery: MasteryState = old.mastery ?? createMasteryState(session.startedAt);
      for (const attempt of attempts) {
        const key = `${attempt.questionId}::${attempt.modality}` as const;
        const existing = mastery.records[key];
        if (assignHoldout(attempt.questionId)) {
          if (!existing) {
            const holdout = createFixedHoldoutSchedule(attempt.questionId, attempt.modality, attempt.timestamp);
            mastery = {
              ...mastery,
              updatedAt: attempt.timestamp,
              records: { ...mastery.records, [holdout.key]: holdout },
              events: [...mastery.events, ...createHoldoutScheduledEvents(holdout)],
            };
          } else if (existing.cohort === "holdout") {
            const due = getDueHoldoutReviews([existing], attempt.timestamp, 1)[0];
            if (due) {
              const holdoutClaim = `holdout:${key}:${due.checkpointDay}`;
              if (attempt.correct && (due.checkpointDay === 7 || due.checkpointDay === 14) && !nextRavClaims.includes(holdoutClaim)) {
                ravEarned += due.checkpointDay === 14 ? 3 : 1;
                nextRavClaims.push(holdoutClaim);
              }
              const observation = recordHoldoutObservation(existing, {
                checkpointDay: due.checkpointDay,
                observedAt: attempt.timestamp,
                score: attempt.score,
                correct: attempt.correct,
                result: attempt.result,
                confidence: attempt.confidence ?? undefined,
                hintsUsed: attempt.hintsUsed,
              });
              mastery = {
                ...mastery,
                updatedAt: attempt.timestamp,
                records: { ...mastery.records, [observation.mastery.key]: observation.mastery },
                events: [...mastery.events, observation.event],
              };
            }
          }
        } else {
          const scheduled = scheduleOperationalReview({
            itemId: attempt.questionId,
            modality: attempt.modality,
            mastery: existing?.cohort === "operational" ? existing : null,
            reviewedAt: attempt.timestamp,
            score: attempt.score,
            correct: attempt.correct,
            result: attempt.result,
            confidence: attempt.confidence ?? undefined,
            hintsUsed: attempt.hintsUsed,
          });
          mastery = {
            ...mastery,
            updatedAt: attempt.timestamp,
            records: { ...mastery.records, [scheduled.mastery.key]: scheduled.mastery },
            events: [...mastery.events, ...scheduled.events],
          };
        }
        const brierClaim = `brier:${attempt.questionId}`;
        if (!previouslySeenItems.has(attempt.questionId) && attempt.brierScore !== null && attempt.brierScore <= 0.05 && !nextRavClaims.includes(brierClaim)) {
          ravEarned += 1;
          nextRavClaims.push(brierClaim);
        }
        previouslySeenItems.add(attempt.questionId);
      }
      const completedMissions = firstCompletion ? [...old.completedMissions, session.missionId] : old.completedMissions;
      const newlyClearedBosses = scenarioBossGates.filter((gate) => {
        const pathLevel = courseLevels[gate.afterPathLevel - 1];
        return pathLevel?.missions.every((mission) => completedMissions.includes(mission.id))
          && !old.claimedBossGates.includes(gate.id)
          && getBossGateProgress(gate, old.scenarioRuns).cleared;
      });
      const bossKroner = newlyClearedBosses.reduce((sum, gate) => sum + gate.reward.kr, 0);
      const next: ProgressState = {
        ...old,
        xp: old.xp + xpEarned,
        kroner: old.kroner + kronerEarned + bossKroner,
        rav: old.rav + ravEarned,
        ravClaims: nextRavClaims,
        streak: computeStreak(old.lastActiveDate, old.streak),
        lastActiveDate: dayKey(),
        completedMissions,
        attempts: [...old.attempts, ...attempts],
        sessions: [...old.sessions, { ...session, xpEarned }],
        weeklyStorms: isStorm
          ? old.weeklyStorms.map((storm) => storm.weekId === session.missionId ? { ...storm, completedAt: session.endedAt, score: session.correct, total: session.total } : storm)
          : old.weeklyStorms,
        claimedBossGates: [...old.claimedBossGates, ...newlyClearedBosses.map((gate) => gate.id)],
        mastery,
        maritimeRankId: evaluateMaritimeRank({
          xp: old.xp + xpEarned,
          retention: retentionMeasurements(mastery),
          previousRankId: old.maritimeRankId,
          retentionFailurePolicy: "threaten",
        }).rank.id,
      };
      if (directoryHandle) window.setTimeout(() => exportData("folder", next), 300);
      return next;
    });
  };

  const completeScenario = (run: ScenarioRun) => {
    setProgress((old) => {
      const firstSuccess = run.success && !old.scenarioRuns.some((item) => item.caseId === run.caseId && item.success);
      const xpEarned = run.score;
      const contractOwner = harborCharacters.find((character) => character.contracts.some((contract) => contract.scenarioId === run.caseId));
      const contract = contractOwner?.contracts.find((item) => item.scenarioId === run.caseId);
      const kronerEarned = resolveScenarioKronerReward({
        success: run.success,
        firstSuccess,
        contractReward: contract?.reward.kr,
        explicitReward: typeof run.metadata.kronerReward === "string" || typeof run.metadata.kronerReward === "number"
          ? run.metadata.kronerReward
          : null,
      });
      const rareClaim = `scenario:${run.caseId}`;
      const checksUsed = Number(run.metadata.checksUsed ?? run.metadata.checks ?? 1);
      const hintsUsed = Number(run.metadata.hintsUsed ?? (run.metadata.usedHint ? 1 : 0));
      const firstTryMastery = run.metadata.firstAttemptEligible === true && run.success && checksUsed === 1 && hintsUsed === 0;
      const earnsRav = firstTryMastery && !old.ravClaims.includes(rareClaim);
      const relationshipId = run.kind === "dialogue"
        ? String(run.metadata.characterId ?? run.metadata.character ?? "").toLocaleLowerCase("da-DK")
        : contractOwner?.id ?? "";
      const newlyClearedBosses = scenarioBossGates.filter((gate) => {
        const pathLevel = courseLevels[gate.afterPathLevel - 1];
        const pathReady = Boolean(pathLevel) && pathLevel.missions.every((mission) => old.completedMissions.includes(mission.id));
        const candidateRuns = [...old.scenarioRuns, run];
        return pathReady && !old.claimedBossGates.includes(gate.id) && getBossGateProgress(gate, candidateRuns).cleared;
      });
      const bossKroner = newlyClearedBosses.reduce((sum, gate) => sum + gate.reward.kr, 0);
      const next: ProgressState = {
        ...old,
        xp: old.xp + xpEarned,
        kroner: old.kroner + kronerEarned + bossKroner,
        rav: old.rav + (earnsRav ? 1 : 0),
        ravClaims: earnsRav ? [...old.ravClaims, rareClaim] : old.ravClaims,
        relationships: relationshipId && Object.prototype.hasOwnProperty.call(old.relationships, relationshipId)
          ? { ...old.relationships, [relationshipId]: Math.min(5, old.relationships[relationshipId] + (firstSuccess ? 1 : 0)) }
          : old.relationships,
        claimedBossGates: [...old.claimedBossGates, ...newlyClearedBosses.map((gate) => gate.id)],
        streak: computeStreak(old.lastActiveDate, old.streak),
        lastActiveDate: dayKey(),
        scenarioRuns: [...old.scenarioRuns, run],
        maritimeRankId: evaluateMaritimeRank({
          xp: old.xp + xpEarned,
          retention: retentionMeasurements(old.mastery),
          previousRankId: old.maritimeRankId,
          retentionFailurePolicy: "threaten",
        }).rank.id,
      };
      if (directoryHandle) window.setTimeout(() => exportData("folder", next), 300);
      return next;
    });
    notify(run.success ? `Scenarie løst · +${run.score} XP · havnen betaler` : `Forsøget er gemt · +${run.score} XP`);
  };

  const startScenarioAttempt = (caseId: string) => {
    const eligible = !progress.scenarioAttemptedIds.includes(caseId);
    setProgress((old) => old.scenarioAttemptedIds.includes(caseId)
      ? old
      : { ...old, scenarioAttemptedIds: [...old.scenarioAttemptedIds, caseId] });
    return eligible;
  };

  const spendKroner = (amount: number, reason: string) => {
    if (progress.kroner < amount) {
      notify(`Du mangler ${amount - progress.kroner} kr. til ${reason}.`);
      return false;
    }
    setProgress((old) => ({ ...old, kroner: Math.max(0, old.kroner - amount) }));
    return true;
  };

  const unlockScenario = (caseId: string, cost: number, ravCost = 0) => {
    if (progress.unlockedScenarioIds.includes(caseId)) return true;
    if (progress.kroner < cost || progress.rav < ravCost) {
      notify(progress.kroner < cost ? `Du mangler ${cost - progress.kroner} kr. til fortsættelsen.` : `Du mangler ${ravCost - progress.rav} rav til fortsættelsen.`);
      return false;
    }
    setProgress((old) => ({
      ...old,
      kroner: old.kroner - cost,
      rav: old.rav - ravCost,
      unlockedScenarioIds: [...old.unlockedScenarioIds, caseId],
    }));
    notify(`Ny kontrakt åbnet for ${cost} kr.${ravCost ? ` og ${ravCost} rav.` : "."}`);
    return true;
  };

  const useHintToken = () => {
    if (progress.hintTokens <= 0) {
      notify("Ingen hint-tokens. Kaffebaren fylder dem op hver dag.");
      return false;
    }
    setProgress((old) => ({ ...old, hintTokens: Math.max(0, old.hintTokens - 1) }));
    return true;
  };

  const rerollWeakItem = (questionId: string) => {
    const today = dayKey();
    if (!progress.purchasedBuildings.includes("biblioteket") || progress.lastWeakRerollDate === today) return;
    setProgress((old) => ({ ...old, rerolledWeakItemIds: [...old.rerolledWeakItemIds, questionId], lastWeakRerollDate: today }));
    notify("Biblioteket har flyttet kortet ud af dagens fejltræning.");
  };

  const replyToCharacter = (characterId: string) => {
    if (progress.repliedCharacterIds.includes(characterId)) return;
    setProgress((old) => ({
      ...old,
      repliedCharacterIds: [...old.repliedCharacterIds, characterId],
      relationships: Object.prototype.hasOwnProperty.call(old.relationships, characterId)
        ? { ...old.relationships, [characterId]: Math.min(5, old.relationships[characterId] + 1) }
        : old.relationships,
    }));
    notify("Dit svar ligger nu i havnens indbakke.");
  };

  const buyHarborBuilding = (buildingId: HarborBuildingId) => {
    const rank = evaluateMaritimeRank({
      xp: progress.xp,
      retention: retentionMeasurements(progress.mastery),
      previousRankId: progress.maritimeRankId,
      retentionFailurePolicy: "threaten",
    });
    const purchase = purchaseHarborBuilding(
      { xp: progress.xp, kroner: progress.kroner, rav: progress.rav },
      buildingId,
      progress.purchasedBuildings as HarborBuildingId[],
      rank.rank.id,
    );
    if (!purchase.ok) {
      const building = HARBOR_BUILDINGS.find((item) => item.id === buildingId)!;
      notify(purchase.reason === "rank-locked" ? `${building.name} kræver rang ${building.requiredRank}.` : purchase.reason === "insufficient-kroner" ? `Du mangler ${purchase.shortfall} kr.` : `${building.name} er allerede bygget.`);
      return false;
    }
    setProgress((old) => ({ ...old, kroner: purchase.balance.kroner, purchasedBuildings: purchase.owned }));
    notify(`${purchase.building.name} er nu en del af Ordhavn.`);
    return true;
  };

  const developerUnlockLevel = (levelIndex: number) => {
    setProgress((old) => ({
      ...old,
      developerUnlockedLevelIndex: unlockDeveloperLevel(old.developerUnlockedLevelIndex, levelIndex, courseLevels.length),
    }));
    notify(`${courseLevels[levelIndex]?.title ?? "Niveauet"} er åbnet i Developer mode.`);
  };

  const recordGenderBankOutcome = (outcome: GenderBankOutcome) => {
    setProgress((old) => {
      if (old.genderBankRuns.some((run) => run.id === outcome.id)) return old;
      const calibrated = outcome.rounds >= 5 && outcome.meanBrier !== null && outcome.meanBrier <= 0.1;
      const ravClaim = `brier-bank:${outcome.id}`;
      return {
        ...old,
        kroner: old.kroner + outcome.payout,
        rav: old.rav + (calibrated ? 1 : 0),
        ravClaims: calibrated ? [...old.ravClaims, ravClaim] : old.ravClaims,
        genderBankRuns: [...old.genderBankRuns, { id: outcome.id, completedAt: outcome.completedAt, stake: outcome.stake, payout: outcome.payout, rounds: outcome.rounds, meanBrier: outcome.meanBrier }],
      };
    });
  };

  const navigate = (nextView: View) => {
    setWordleCheckpoint(null);
    setScenarioLaunch(null);
    setView(nextView);
  };

  const openBossScenario = (gate: ScenarioBossGate) => {
    const successfulCaseIds = new Set(progress.scenarioRuns.filter((run) => run.success).map((run) => run.caseId));
    const bossProgress = getBossGateProgress(gate, progress.scenarioRuns);
    bossProgress.unmetEndingRequirements.forEach((requirement) => successfulCaseIds.delete(requirement.caseId));
    setScenarioLaunch(nextBossScenarioLaunch(bossProgress.nextScenarioIds, successfulCaseIds, progress.unlockedScenarioIds));
    setWordleCheckpoint(null);
    setView("scenarios");
  };

  const openWordleCheckpoint = (checkpoint: WordlePathCheckpoint) => {
    setWordleCheckpoint(checkpoint);
    setView("wordle");
  };

  const saveWordleGame = (game: WordleGameSnapshot) => {
    setProgress((old) => ({
      ...old,
      wordleGames: { ...old.wordleGames, [game.key]: game },
    }));
  };

  const completeWordleRun = (run: WordleRun) => {
    setProgress((old) => {
      if (old.wordleRuns.some((existing) => existing.id === run.id)) return old;
      const checkpointFirstWin = Boolean(run.success && run.checkpointId && !old.completedWordleCheckpoints.includes(run.checkpointId));
      const gameFirstWin = Boolean(run.success && !old.wordleRuns.some((existing) => existing.gameKey === run.gameKey && existing.success));
      const rewardEligible = run.kind === "path" ? checkpointFirstWin : gameFirstWin;
      const xpReward = rewardEligible ? run.kind === "path" ? 80 : run.kind === "daily" ? 45 : 15 : 0;
      const kronerReward = rewardEligible ? run.kind === "path" ? 35 : run.kind === "daily" ? 20 : 8 : 0;
      return {
        ...old,
        xp: old.xp + xpReward,
        kroner: old.kroner + kronerReward,
        wordleRuns: [...old.wordleRuns, run],
        completedWordleCheckpoints: checkpointFirstWin && run.checkpointId
          ? [...old.completedWordleCheckpoints, run.checkpointId]
          : old.completedWordleCheckpoints,
      };
    });
    notify(run.success
      ? run.kind === "path" ? "Ordle-checkpoint klaret · +80 XP · +35 kr." : "Havneordet er fundet."
      : "Ordle-runden er gemt — næste ord venter.");
  };

  const nextHarborMission = courseLevels.flatMap((level) => level.missions).find((mission) => !progress.completedMissions.includes(mission.id)) ?? null;
  const reviewRecords = progress.mastery?.records ?? {};
  const dueNowIds = new Set([
    ...getDueHoldoutReviews(reviewRecords, new Date(clockNowMs)).map((review) => review.itemId),
    ...getDueOperationalReviews(reviewRecords, new Date(clockNowMs)).map((review) => review.itemId),
  ]);
  const forecastIds = progress.purchasedBuildings.includes("fyrtaarnet")
    ? new Set(getDueOperationalReviews(reviewRecords, new Date(clockNowMs + 7 * 86_400_000)).map((review) => review.itemId))
    : new Set<string>();
  const dueHarborCount = dueNowIds.size;
  const forecastHarborCount = [...forecastIds].filter((id) => !dueNowIds.has(id)).length;

  return (
    <div className={`app-shell ${progress.darkMode ? "dark" : ""}`}>
      <Navigation view={view} setView={navigate} />
      <div className="app-main">
        <Topbar progress={progress} onProfile={() => navigate("profile")} onToggleTheme={() => setProgress((old) => ({ ...old, darkMode: !old.darkMode }))} />
        {view === "home" && <HarborHome
          xp={progress.xp}
          kroner={progress.kroner}
          rav={progress.rav}
          streak={progress.streak}
          completedMissions={progress.completedMissions}
          attempts={progress.attempts}
          scenarioRuns={progress.scenarioRuns}
          weeklyStorms={progress.weeklyStorms}
          purchasedBuildings={progress.purchasedBuildings}
          relationships={progress.relationships}
          repliedCharacterIds={progress.repliedCharacterIds}
          retention={retentionMeasurements(progress.mastery)}
          dueCount={dueHarborCount}
          forecastCount={forecastHarborCount}
          maritimeRankId={progress.maritimeRankId}
          nextMission={nextHarborMission}
          onStartNext={(mission) => {
            const level = courseLevels.find((item) => item.missions.some((candidate) => candidate.id === mission.id));
            startLesson(mission, level?.id ?? "harbor");
          }}
          onStartReview={startDueReview}
          onReplyCharacter={replyToCharacter}
          onNavigate={navigate}
          onBuyBuilding={buyHarborBuilding}
          onOpenGenderBank={() => navigate("gender-bank")}
          onStartStorm={startWeeklyStorm}
        />}
        {view === "path" && <PathView progress={progress} onStart={startLesson} onOpenScenarios={openBossScenario} onOpenWordleCheckpoint={openWordleCheckpoint} onDeveloperUnlockLevel={developerUnlockLevel} />}
        {view === "practice" && <PracticeView progress={progress} onStart={startLesson} onRerollWeakItem={rerollWeakItem} />}
        {view === "wordle" && <WordleGame
          launch={wordleCheckpoint ? { kind: "path", checkpoint: wordleCheckpoint } : { kind: "daily" }}
          savedGames={progress.wordleGames}
          runs={progress.wordleRuns}
          onSave={saveWordleGame}
          onComplete={completeWordleRun}
          onExitPath={() => navigate("path")}
        />}
        {view === "scenarios" && <ScenarioHub initialLaunch={scenarioLaunch} runs={progress.scenarioRuns} kroner={progress.kroner} unlockedScenarioIds={progress.unlockedScenarioIds} attemptedScenarioIds={progress.scenarioAttemptedIds} maritimeRankId={progress.maritimeRankId} relationships={progress.relationships} onStartAttempt={startScenarioAttempt} onComplete={completeScenario} onUnlockScenario={unlockScenario} onSpendKroner={spendKroner} onUseHint={useHintToken} onExitDirectLaunch={() => navigate("path")} />}
        {view === "stats" && <StatsView progress={progress} directoryHandle={directoryHandle} onConnectDirectory={connectDirectory} onExport={exportData} />}
        {view === "profile" && <ProfileView progress={progress} setProgress={setProgress} />}
        {view === "gender-bank" && <GenderBankView kroner={progress.kroner} playedToday={progress.genderBankRuns.some((run) => dayKey(new Date(run.completedAt)) === dayKey())} onDeductStake={(amount) => spendKroner(amount, "Kønsbanken")} onRecordOutcome={recordGenderBankOutcome} onClose={() => navigate("home")} />}
      </div>
      {activeLesson && <LessonPlayer mission={activeLesson.mission} levelId={activeLesson.levelId} sessionId={activeLesson.sessionId} startedAtIso={activeLesson.startedAtIso} startedAtMs={activeLesson.startedAtMs} priorAttempts={progress.attempts} currentXp={progress.xp} mastery={progress.mastery} maritimeRankId={progress.maritimeRankId} hintTokens={progress.hintTokens} onUseHint={useHintToken} onExit={() => setActiveLesson(null)} onComplete={completeLesson} />}
      <SelectionDictionary />
      {toast && <div className="toast"><Check size={18} /> {toast}</div>}
    </div>
  );
}
