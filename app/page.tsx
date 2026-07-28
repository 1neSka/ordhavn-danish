"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
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
import type { ScenarioRun } from "../lib/scenarioData";
import {
  assignHoldout,
  createFixedHoldoutSchedule,
  createHoldoutScheduledEvents,
  createMasteryState,
  getDueHoldoutReviews,
  predictedRecall,
  recordHoldoutObservation,
  scheduleOperationalReview,
  type MasteryState,
  type OperationalMasteryRecord,
} from "../lib/scheduler";

type View = "home" | "path" | "practice" | "scenarios" | "stats" | "profile";

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
  version: 1;
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  completedMissions: string[];
  attempts: Attempt[];
  sessions: StudySession[];
  dailyGoalMinutes: number;
  darkMode: boolean;
  mastery: MasteryState | null;
  scenarioRuns: ScenarioRun[];
};

type DirectoryHandleLike = {
  name: string;
  getFileHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>;
};

const STORAGE_KEY = "ordhavn-progress-v1";
const CURRENT_WEEKDAY_INDEX = (new Date().getDay() + 6) % 7;

const initialProgress: ProgressState = {
  version: 1,
  xp: 0,
  streak: 0,
  lastActiveDate: null,
  completedMissions: [],
  attempts: [],
  sessions: [],
  dailyGoalMinutes: 15,
  darkMode: true,
  mastery: null,
  scenarioRuns: [],
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
};

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

function computeStreak(lastActiveDate: string | null, currentStreak: number) {
  if (!lastActiveDate) return 1;
  const last = new Date(`${lastActiveDate}T12:00:00`);
  const now = new Date(`${dayKey()}T12:00:00`);
  const diff = Math.round((now.getTime() - last.getTime()) / 86_400_000);
  if (diff <= 0) return currentStreak || 1;
  return diff === 1 ? currentStreak + 1 : 1;
}

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase("da-DK").replace(/[.!?,]/g, "").replace(/\s+/g, " ");
}

function levenshteinSimilarity(leftValue: string, rightValue: string) {
  const left = normalizeAnswer(leftValue);
  const right = normalizeAnswer(rightValue);
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return Math.max(0, 1 - previous[right.length] / Math.max(left.length, right.length));
}

function scoreAnswer(challenge: Challenge, answer: string) {
  const alternatives = [challenge.answer, ...(challenge.acceptedAnswers ?? [])];
  return Math.max(...alternatives.map((item) => levenshteinSimilarity(item, answer)));
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
        <span className="top-pill flame"><Flame size={18} fill="currentColor" /> {progress.streak}</span>
        <span className="top-pill gem"><Gem size={18} fill="currentColor" /> {progress.xp}</span>
        <button className="avatar small" aria-label="Åbn profil" onClick={onProfile}>R</button>
      </div>
    </header>
  );
}

function HomeView({
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
            <p>curiosity · любопытство</p>
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
}: {
  progress: ProgressState;
  onStart: (mission: Mission, levelId: string) => void;
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
          const previousComplete = levelIndex === 0 || courseLevels[levelIndex - 1].missions.every((m) => progress.completedMissions.includes(m.id));
          const levelComplete = level.missions.filter((m) => progress.completedMissions.includes(m.id)).length;
          const LevelIcon = iconMap[level.missions[0]?.icon] ?? Compass;
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
                  <span className="level-counter">{levelComplete}/{level.missions.length}</span>
                </div>
                <div className="mission-row">
                  {level.missions.map((mission, missionIndex) => {
                    const completed = progress.completedMissions.includes(mission.id);
                    const available = previousComplete && (missionIndex === 0 || progress.completedMissions.includes(level.missions[missionIndex - 1].id));
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
}: {
  progress: ProgressState;
  onStart: (mission: Mission, levelId: string) => void;
}) {
  const allQuestions = courseLevels.flatMap((level) => level.missions.flatMap((mission) => mission.questions));
  const weakIds = [...progress.attempts]
    .filter((attempt) => !attempt.correct)
    .reverse()
    .map((attempt) => attempt.questionId);
  const weakQuestions = weakIds
    .map((id) => allQuestions.find((question) => question.id === id))
    .filter((question): question is Challenge => Boolean(question));

  const makePractice = (kind: "speed" | "errors" | "mix") => {
    let questions: Challenge[];
    if (kind === "errors" && weakQuestions.length) questions = weakQuestions.slice(0, 10);
    else if (kind === "speed") questions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 12);
    else questions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 10);
    onStart({
      id: `practice-${kind}-${Date.now()}`,
      title: kind === "speed" ? "Lynrunde" : kind === "errors" ? "Fejl-laboratoriet" : "Blandet træning",
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
        <button className="practice-feature mistakes" onClick={() => makePractice("errors")}>
          <span className="feature-icon"><BrainCircuit size={27} /></span>
          <div><p className="eyebrow">TILPASSET DIG</p><h2>Fejl-laboratoriet</h2><p>{weakQuestions.length ? `${weakQuestions.length} svære ord venter på et comeback.` : "Laboratoriet vågner, når du har lavet din første fejl."}</p></div>
          <span className="feature-action">Åbn laboratoriet <ArrowRight size={18} /></span>
        </button>
      </div>

      <section className="section-head practice-section-head"><div><p className="eyebrow">TRÆN EN FÆRDIGHED</p><h2>Vælg dit fokus</h2></div></section>
      <div className="focus-grid">
        {[
          { icon: Languages, title: "Ordforråd", copy: "Genkend ord i en ægte sammenhæng", color: "mint" },
          { icon: Layers3, title: "Ordstilling", copy: "Byg sætninger, der føles naturlige", color: "lavender" },
          { icon: Keyboard, title: "Stavning", copy: "Skriv de ord, du vil huske", color: "peach" },
          { icon: MessageCircle, title: "Dialog", copy: "Vælg det rigtige svar i hverdagen", color: "blue" },
        ].map((item) => (
          <button className={`focus-card ${item.color}`} key={item.title} onClick={() => makePractice("mix")}>
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
  return (
    <div className="view profile-view">
      <section className="page-intro"><div><p className="eyebrow">PERSONLIGT</p><h1>Indstillinger</h1><p>Gør Ordhavn til din rolige, faste danskerutine.</p></div></section>
      <div className="settings-grid">
        <section className="panel profile-card"><div className="large-avatar">R</div><h2>Dansk elev</h2><p>På vej fra første “hej” til et sikkert hverdagsdansk.</p><div className="profile-badges"><span><Gem size={16} /> {progress.xp} XP</span><span><Medal size={16} /> {progress.completedMissions.length} missioner</span></div></section>
        <section className="panel settings-card">
          <div className="setting-row"><span className="icon-box violet"><Target size={20} /></span><div><strong>Dagligt mål</strong><p>Hvor længe vil du træne?</p></div><select value={progress.dailyGoalMinutes} onChange={(event) => setProgress((old) => ({ ...old, dailyGoalMinutes: Number(event.target.value) }))}><option value={5}>5 min.</option><option value={10}>10 min.</option><option value={15}>15 min.</option><option value={20}>20 min.</option><option value={30}>30 min.</option></select></div>
          <div className="setting-row"><span className="icon-box blue"><Moon size={20} /></span><div><strong>Mørkt tema</strong><p>Blødere farver om aftenen.</p></div><button className={`toggle ${progress.darkMode ? "on" : ""}`} onClick={() => setProgress((old) => ({ ...old, darkMode: !old.darkMode }))}><span /></button></div>
          <div className="setting-row"><span className="icon-box mint"><ShieldCheck size={20} /></span><div><strong>Privat som standard</strong><p>Dine svar bliver kun på denne enhed.</p></div><span className="status-tag">Aktiv</span></div>
        </section>
      </div>
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
  onExit,
  onComplete,
}: {
  mission: Mission;
  levelId: string;
  sessionId: string;
  startedAtIso: string;
  startedAtMs: number;
  onExit: () => void;
  onComplete: (attempts: Attempt[], session: StudySession) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [genderConfidence, setGenderConfidence] = useState<50 | 60 | 70 | 80 | 90 | 100>(70);
  const [combo, setCombo] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [localAttempts, setLocalAttempts] = useState<Attempt[]>([]);
  const [finished, setFinished] = useState(false);
  const questionStartedAt = useRef(startedAtMs);
  const question = mission.questions[index];
  const tokens = question?.tokens ?? [];
  const answer = question?.type === "order" || question?.type === "ikke-position" ? ordered.join(" ") : selected;
  const progressPercent = ((index + (checked ? 1 : 0)) / mission.questions.length) * 100;
  const latestAttempt = localAttempts.at(-1);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
      if (event.key === "Enter" && !finished) {
        if (!checked && answer.trim()) checkAnswer();
        else if (checked) nextQuestion();
      }
      if (question && ["choice", "number-arcade", "definiteness", "agreement"].includes(question.type) && !checked && /^[1-9]$/.test(event.key)) {
        const option = question.options?.[Number(event.key) - 1];
        if (option) setSelected(option);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!question && !finished) return null;

  function checkAnswer() {
    if (!answer.trim() || checked) return;
    const score = scoreAnswer(question, answer);
    const wasCorrect = score >= 0.95;
    const result: Attempt["result"] = wasCorrect ? "correct" : score >= 0.5 ? "partial" : "incorrect";
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
    setChecked(false);
    setCorrect(false);
    setHintsUsed(0);
    setGenderConfidence(70);
    questionStartedAt.current = Date.now();
  }

  if (finished) {
    const right = localAttempts.filter((attempt) => attempt.correct).length;
    const percentage = Math.round((right / Math.max(1, localAttempts.length)) * 100);
    return (
      <div className="lesson-overlay completion-screen">
        <div className="completion-confetti" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="completion-card">
          <div className="completion-icon"><PartyPopper size={36} /></div>
          <p className="eyebrow">MISSION FULDFØRT</p>
          <h1>Det sad godt!</h1>
          <p>Du har gjort dansk en lille smule mere automatisk.</p>
          <div className="completion-stats"><div><Gem size={21} /><strong>+{earnedXp}</strong><span>XP</span></div><div><Target size={21} /><strong>{percentage}%</strong><span>præcision</span></div><div><Flame size={21} /><strong>{Math.max(combo, 1)}</strong><span>bedste combo</span></div></div>
          <button className="primary-button wide" onClick={onExit}>Tilbage til din sti <ArrowRight size={18} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-overlay">
      <header className="lesson-header">
        <button className="icon-button" onClick={onExit} aria-label="Luk lektionen"><X size={23} /></button>
        <div className="lesson-progress"><span style={{ width: `${progressPercent}%` }} /></div>
        <div className="lesson-hearts"><Heart size={20} fill="currentColor" /><span>Rolig tilstand</span></div>
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
          "Skriv det manglende"
        }</p>
        <h1 className="question-prompt">{question.prompt}</h1>
        {question.translation && <p className="question-translation">{question.translation}</p>}

        {question.type === "number-arcade" && <div className="number-arcade-display"><span>{question.value}</span><div><strong>Vigesimalt værksted</strong><small>{checked ? question.breakdown : "Find talordet før maskinen køler af"}</small></div></div>}
        {question.type === "definiteness" && <div className="grammar-transform"><span>{question.forms.indefinite}</span><ArrowRight size={16} /><span>{question.forms.definite}</span><ArrowRight size={16} /><span>{question.forms.modified}</span></div>}
        {question.type === "agreement" && <div className="grammar-rule"><Layers3 size={18} /><span>grundform</span><i>→</i><strong>{question.agreementForm === "t" ? "-t ved et-ord" : question.agreementForm === "e" ? "-e i bestemt/flertal" : "ingen endelse ved en-ord"}</strong></div>}
        {question.type === "ikke-position" && <div className="field-model"><span>{question.clauseType === "main" ? "Hovedsætning · V2" : "Ledsætning"}</span><div>{question.clauseType === "main" ? <><i>forfelt</i><i>verbum</i><i>subjekt</i><i className="ikke">ikke</i></> : <><i>bindeord</i><i>subjekt</i><i className="ikke">ikke</i><i>verbum</i></>}</div></div>}

        {(question.type === "choice" || question.type === "number-arcade" || question.type === "definiteness" || question.type === "agreement") && (
          <div className="option-list">
            {question.options?.map((option, optionIndex) => (
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
                return <button key={`${token}-${tokenIndex}`} disabled={used || checked} onClick={() => setOrdered((items) => [...items, token])}>{token}</button>;
              })}
            </div>
          </div>
        )}

        {question.type === "input" && (
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); checkAnswer(); }} className="input-answer-wrap">
            <input autoFocus value={selected} disabled={checked} onChange={(event) => setSelected(event.target.value)} placeholder="Skriv på dansk …" aria-label="Dit svar" autoComplete="off" />
            <Keyboard size={20} />
          </form>
        )}

        {!checked && (
          <button className="hint-button" onClick={() => setHintsUsed(1)}><CircleHelp size={17} /> {hintsUsed ? question.hint : "Vis et lille hint"}</button>
        )}
      </main>
      <footer className={`lesson-footer ${checked ? (correct ? "correct" : latestAttempt?.result === "partial" ? "partial" : "wrong") : ""}`}>
        {checked ? (
          <div className="feedback-content">
            <div className="feedback-icon">{correct ? <Check size={24} /> : <Lightbulb size={24} />}</div>
            <div className="feedback-copy"><strong>{correct ? "Præcis!" : latestAttempt?.result === "partial" ? `Næsten — ${Math.round((latestAttempt?.score ?? 0) * 100)}% match` : `Det rigtige svar er “${question.answer}”`}</strong><p>{question.explanation}</p></div>
            <div className="confidence-picker">{question.type === "gender-bet" ? <><span>Kalibrering</span><strong>Brier {Math.round(Math.pow(genderConfidence / 100 - (correct ? 1 : 0), 2) * 100) / 100}</strong></> : <><span>Hukommelsesspor</span><strong>{question.modality === "produce" ? "Produktion" : question.modality === "listen" ? "Lytning" : "Læsning"}</strong></>}</div>
            <button className="primary-button next" onClick={nextQuestion}>Fortsæt <ArrowRight size={18} /></button>
          </div>
        ) : (
          <div className="lesson-actions"><span className="keyboard-tip"><Keyboard size={15} /> Enter for at fortsætte</span><button className="primary-button next" disabled={!answer.trim()} onClick={checkAnswer}>Tjek svar</button></div>
        )}
      </footer>
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [hydrated, setHydrated] = useState(false);
  const [activeLesson, setActiveLesson] = useState<{ mission: Mission; levelId: string; sessionId: string; startedAtIso: string; startedAtMs: number } | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<DirectoryHandleLike | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setProgress({ ...initialProgress, ...JSON.parse(stored) });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    document.documentElement.dataset.theme = progress.darkMode ? "dark" : "light";
  }, [progress, hydrated]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const startLesson = (mission: Mission, levelId: string) => {
    const startedAtMs = Date.now();
    const unique = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${startedAtMs}-${Math.random().toString(36).slice(2, 8)}`;
    setActiveLesson({ mission, levelId, sessionId: `session-${unique}`, startedAtIso: new Date(startedAtMs).toISOString(), startedAtMs });
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
    };
    const summary = {
      exportedAt: new Date().toISOString(),
      app: "Ordhavn",
      dataVersion: state.version,
      totals: { xp: state.xp, streak: state.streak, missions: state.completedMissions.length, attempts: state.attempts.length, sessions: state.sessions.length, scenarioRuns: state.scenarioRuns.length },
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
      const firstCompletion = !old.completedMissions.includes(session.missionId) && !session.missionId.startsWith("practice-");
      const xpEarned = attempts.reduce((sum, attempt) => sum + attempt.xpAwarded, 0) + (firstCompletion ? 25 : 0);
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
      }
      const next: ProgressState = {
        ...old,
        xp: old.xp + xpEarned,
        streak: computeStreak(old.lastActiveDate, old.streak),
        lastActiveDate: dayKey(),
        completedMissions: firstCompletion ? [...old.completedMissions, session.missionId] : old.completedMissions,
        attempts: [...old.attempts, ...attempts],
        sessions: [...old.sessions, { ...session, xpEarned }],
        mastery,
      };
      if (directoryHandle) window.setTimeout(() => exportData("folder", next), 300);
      return next;
    });
  };

  const completeScenario = (run: ScenarioRun) => {
    setProgress((old) => {
      const firstSuccess = run.success && !old.scenarioRuns.some((item) => item.caseId === run.caseId && item.success);
      const xpEarned = run.score + (firstSuccess ? 75 : 0);
      const next: ProgressState = {
        ...old,
        xp: old.xp + xpEarned,
        streak: computeStreak(old.lastActiveDate, old.streak),
        lastActiveDate: dayKey(),
        scenarioRuns: [...old.scenarioRuns, run],
      };
      if (directoryHandle) window.setTimeout(() => exportData("folder", next), 300);
      return next;
    });
    const bonus = run.success && !progress.scenarioRuns.some((item) => item.caseId === run.caseId && item.success) ? 75 : 0;
    notify(run.success ? `Scenarie løst · +${run.score + bonus} XP` : `Forsøget er gemt · +${run.score} XP`);
  };

  return (
    <div className={`app-shell ${progress.darkMode ? "dark" : ""}`}>
      <Navigation view={view} setView={setView} />
      <div className="app-main">
        <Topbar progress={progress} onProfile={() => setView("profile")} onToggleTheme={() => setProgress((old) => ({ ...old, darkMode: !old.darkMode }))} />
        {view === "home" && <HomeView progress={progress} onNavigate={setView} onStart={startLesson} />}
        {view === "path" && <PathView progress={progress} onStart={startLesson} />}
        {view === "practice" && <PracticeView progress={progress} onStart={startLesson} />}
        {view === "scenarios" && <ScenarioHub runs={progress.scenarioRuns} onComplete={completeScenario} />}
        {view === "stats" && <StatsView progress={progress} directoryHandle={directoryHandle} onConnectDirectory={connectDirectory} onExport={exportData} />}
        {view === "profile" && <ProfileView progress={progress} setProgress={setProgress} />}
      </div>
      {activeLesson && <LessonPlayer mission={activeLesson.mission} levelId={activeLesson.levelId} sessionId={activeLesson.sessionId} startedAtIso={activeLesson.startedAtIso} startedAtMs={activeLesson.startedAtMs} onExit={() => setActiveLesson(null)} onComplete={completeLesson} />}
      {toast && <div className="toast"><Check size={18} /> {toast}</div>}
    </div>
  );
}
