import { GRAMMAR_LESSONS, GRAMMAR_MODULES, RULE_INTRODUCED_AT } from "./curriculum";

// Spaced repetition happens per grammar rule, not per sentence: a rule climbs a
// Leitner box only when it is due, so ten correct answers in one lesson count as
// one success, and the rule comes back tomorrow, then in 2, 4, 8 … days.
// A mistake drops the rule two boxes and makes it due immediately.

export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32] as const;
export const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;
/** A rule counts as remembered once it has survived reviews at 1 and 2 days. */
export const REMEMBERED_BOX = 3;
export const CHECKPOINT_PASS_SCORE = 0.8;

const DAY_MS = 86_400_000;
// Due a few hours early so a rule learnt at 18:00 is ready at 15:00 the next day.
const EARLY_MS = 4 * 3_600_000;

export interface GrammarRuleState {
  box: number;
  due: string;
  correct: number;
  incorrect: number;
  lastAt: string;
}

export interface GrammarItemState {
  attempts: number;
  correct: number;
  incorrect: number;
  streak: number;
  lastAt: string;
}

export interface GrammarLessonState {
  completedAt: string;
  runs: number;
  bestAccuracy: number;
  stars: number;
}

export interface GrammarCheckpointState {
  runs: number;
  bestScore: number;
  passedAt: string | null;
}

export interface GrammarCourseProgress {
  version: 1;
  totalAttempts: number;
  correctAttempts: number;
  currentStreak: number;
  bestStreak: number;
  lessons: Record<string, GrammarLessonState>;
  checkpoints: Record<string, GrammarCheckpointState>;
  rules: Record<string, GrammarRuleState>;
  items: Record<string, GrammarItemState>;
  seenTheory: string[];
  unlockAll: boolean;
}

export const EMPTY_GRAMMAR_PROGRESS: GrammarCourseProgress = {
  version: 1,
  totalAttempts: 0,
  correctAttempts: 0,
  currentStreak: 0,
  bestStreak: 0,
  lessons: {},
  checkpoints: {},
  rules: {},
  items: {},
  seenTheory: [],
  unlockAll: false,
};

export function normalizeGrammarProgress(value?: Partial<GrammarCourseProgress> | null): GrammarCourseProgress {
  return {
    ...EMPTY_GRAMMAR_PROGRESS,
    ...(value ?? {}),
    version: 1,
    lessons: value?.lessons ?? {},
    checkpoints: value?.checkpoints ?? {},
    rules: value?.rules ?? {},
    items: value?.items ?? {},
    seenTheory: Array.isArray(value?.seenTheory) ? value.seenTheory : [],
    unlockAll: Boolean(value?.unlockAll),
  };
}

export function dueAfterBox(box: number, now: Date) {
  const days = BOX_INTERVAL_DAYS[Math.max(0, Math.min(MAX_BOX, box))];
  return new Date(now.getTime() + (days ? days * DAY_MS - EARLY_MS : 0)).toISOString();
}

export function isRuleDue(state: GrammarRuleState | undefined, now: Date) {
  return !state || Date.parse(state.due) <= now.getTime();
}

function updateRule(previous: GrammarRuleState | undefined, correct: boolean, primary: boolean, now: Date): GrammarRuleState {
  const nowIso = now.toISOString();
  const state = previous ?? { box: 0, due: nowIso, correct: 0, incorrect: 0, lastAt: nowIso };
  if (correct) {
    const box = isRuleDue(state, now) ? Math.min(MAX_BOX, state.box + 1) : state.box;
    return { ...state, box, due: box === state.box ? state.due : dueAfterBox(box, now), correct: state.correct + 1, lastAt: nowIso };
  }
  // We cannot tell which rule a mixed item failed on: the main rule drops, the
  // supporting rules simply become due again.
  const box = primary ? Math.max(0, state.box - 2) : state.box;
  return { ...state, box, due: nowIso, incorrect: state.incorrect + 1, lastAt: nowIso };
}

export function recordGrammarAttempt(
  progress: GrammarCourseProgress,
  item: { uid: string; rules: string[] },
  correct: boolean,
  now = new Date(),
): GrammarCourseProgress {
  const nowIso = now.toISOString();
  const previousItem = progress.items[item.uid];
  const rules = { ...progress.rules };
  item.rules.forEach((rule, index) => {
    rules[rule] = updateRule(rules[rule], correct, index === 0, now);
  });
  const currentStreak = correct ? progress.currentStreak + 1 : 0;
  return {
    ...progress,
    totalAttempts: progress.totalAttempts + 1,
    correctAttempts: progress.correctAttempts + (correct ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(progress.bestStreak, currentStreak),
    rules,
    items: {
      ...progress.items,
      [item.uid]: {
        attempts: (previousItem?.attempts ?? 0) + 1,
        correct: (previousItem?.correct ?? 0) + (correct ? 1 : 0),
        incorrect: (previousItem?.incorrect ?? 0) + (correct ? 0 : 1),
        streak: correct ? (previousItem?.streak ?? 0) + 1 : 0,
        lastAt: nowIso,
      },
    },
  };
}

export function starsForAccuracy(accuracy: number) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

export function completeGrammarLesson(progress: GrammarCourseProgress, lessonId: string, accuracy: number, now = new Date()): GrammarCourseProgress {
  const previous = progress.lessons[lessonId];
  return {
    ...progress,
    lessons: {
      ...progress.lessons,
      [lessonId]: {
        completedAt: previous?.completedAt ?? now.toISOString(),
        runs: (previous?.runs ?? 0) + 1,
        bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy),
        stars: Math.max(previous?.stars ?? 0, starsForAccuracy(accuracy)),
      },
    },
  };
}

export function completeGrammarCheckpoint(progress: GrammarCourseProgress, moduleId: string, score: number, now = new Date()): GrammarCourseProgress {
  const previous = progress.checkpoints[moduleId];
  return {
    ...progress,
    checkpoints: {
      ...progress.checkpoints,
      [moduleId]: {
        runs: (previous?.runs ?? 0) + 1,
        bestScore: Math.max(previous?.bestScore ?? 0, score),
        passedAt: previous?.passedAt ?? (score >= CHECKPOINT_PASS_SCORE ? now.toISOString() : null),
      },
    },
  };
}

export function markTheorySeen(progress: GrammarCourseProgress, lessonId: string): GrammarCourseProgress {
  if (progress.seenTheory.includes(lessonId)) return progress;
  return { ...progress, seenTheory: [...progress.seenTheory, lessonId] };
}

export function setGrammarUnlockAll(progress: GrammarCourseProgress, unlockAll: boolean): GrammarCourseProgress {
  return { ...progress, unlockAll };
}

export function isLessonCompleted(progress: GrammarCourseProgress, lessonId: string) {
  return Boolean(progress.lessons[lessonId]);
}

export function isLessonUnlocked(progress: GrammarCourseProgress, lessonId: string) {
  if (progress.unlockAll) return true;
  const index = GRAMMAR_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return index === 0;
  return isLessonCompleted(progress, GRAMMAR_LESSONS[index - 1].id);
}

export function isCheckpointUnlocked(progress: GrammarCourseProgress, moduleId: string) {
  if (progress.unlockAll) return true;
  const courseModule = GRAMMAR_MODULES.find((candidate) => candidate.id === moduleId);
  return Boolean(courseModule?.lessonIds.every((lessonId) => isLessonCompleted(progress, lessonId)));
}

export function nextLessonId(progress: GrammarCourseProgress) {
  return GRAMMAR_LESSONS.find((lesson) => !isLessonCompleted(progress, lesson.id))?.id ?? null;
}

/** Rules whose lesson is completed — the pool for spaced review. */
export function learnedRuleIds(progress: GrammarCourseProgress) {
  return GRAMMAR_LESSONS.filter((lesson) => isLessonCompleted(progress, lesson.id)).flatMap((lesson) => lesson.rules);
}

export function dueRuleIds(progress: GrammarCourseProgress, now = new Date()) {
  return learnedRuleIds(progress).filter((rule) => isRuleDue(progress.rules[rule], now));
}

export function rememberedRuleIds(progress: GrammarCourseProgress) {
  return learnedRuleIds(progress).filter((rule) => (progress.rules[rule]?.box ?? 0) >= REMEMBERED_BOX);
}

export function weakItemUids(progress: GrammarCourseProgress) {
  return Object.entries(progress.items)
    .filter(([, state]) => state.incorrect > 0 && state.streak < 2)
    .sort(([, left], [, right]) => left.correct / left.attempts - right.correct / right.attempts || Date.parse(left.lastAt) - Date.parse(right.lastAt))
    .map(([uid]) => uid);
}

export function grammarAccuracy(progress: GrammarCourseProgress) {
  return progress.totalAttempts ? Math.round((progress.correctAttempts / progress.totalAttempts) * 100) : 0;
}

export function ruleIntroducedAt(ruleId: string) {
  return RULE_INTRODUCED_AT.get(ruleId) ?? -1;
}
