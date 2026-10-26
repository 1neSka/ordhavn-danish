import { GRAMMAR_LESSONS, GRAMMAR_MODULES, GRAMMAR_RULE_BY_ID } from "./grammarCourse/curriculum";
import { MAX_BOX, learnedRuleIds, type GrammarCourseProgress } from "./grammarCourse/progress";
import { filterResponseTimeOutliers } from "./responseTimeStats";

// The Statistik tab reads answers from two logs: course lessons (progress.attempts)
// and the Grammatik course (grammarCourse.attemptLog). Both are mapped onto one
// event shape so totals, charts and the skill table count them together.

export type StatSource = "lessons" | "grammar";

export const STAT_SOURCES: StatSource[] = ["lessons", "grammar"];
export const STAT_SOURCE_LABEL: Record<StatSource, string> = { lessons: "Lektioner", grammar: "Grammatik" };

export interface StatEvent {
  id: string;
  at: string;
  source: StatSource;
  correct: boolean;
  /** 0–1, partial credit included. */
  score: number;
  ms: number;
  /** Skill or grammar rule the answer counts towards. */
  skill: string;
}

export interface LessonAttemptLike {
  id: string;
  timestamp: string;
  correct: boolean;
  score: number;
  responseMs: number;
  skill: string;
}

export function lessonEvents(attempts: LessonAttemptLike[]): StatEvent[] {
  return attempts.map((attempt) => ({
    id: attempt.id,
    at: attempt.timestamp,
    source: "lessons",
    correct: attempt.correct,
    score: attempt.score,
    ms: attempt.responseMs,
    skill: attempt.skill,
  }));
}

export function grammarRuleTitle(ruleId: string) {
  return GRAMMAR_RULE_BY_ID.get(ruleId)?.title ?? ruleId;
}

export function grammarEvents(course: GrammarCourseProgress): StatEvent[] {
  return (course.attemptLog ?? []).map((entry, index) => ({
    id: `grammar-${entry.at}-${index}`,
    at: entry.at,
    source: "grammar",
    correct: entry.correct,
    score: entry.score,
    ms: entry.ms,
    // The first rule is the one the item trains; the others only support it.
    skill: grammarRuleTitle(entry.rules[0] ?? "grammatik"),
  }));
}

export function localDayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const WEEKDAY_SHORT = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];

export interface DailyPoint {
  key: string;
  label: string;
  weekday: string;
  total: number;
  correct: number;
  bySource: Record<StatSource, { total: number; correct: number }>;
}

function emptyBySource(): Record<StatSource, { total: number; correct: number }> {
  return { lessons: { total: 0, correct: 0 }, grammar: { total: 0, correct: 0 } };
}

/** One point per calendar day, oldest first, ending today. */
export function dailySeries(events: StatEvent[], days: number, now = new Date()): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>();
  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    const point: DailyPoint = {
      key: localDayKey(date),
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      weekday: WEEKDAY_SHORT[date.getDay()],
      total: 0,
      correct: 0,
      bySource: emptyBySource(),
    };
    byDay.set(point.key, point);
    return point;
  });
  events.forEach((event) => {
    const point = byDay.get(localDayKey(new Date(event.at)));
    if (!point) return;
    point.total += 1;
    point.correct += event.correct ? 1 : 0;
    point.bySource[event.source].total += 1;
    point.bySource[event.source].correct += event.correct ? 1 : 0;
  });
  return points;
}

export interface HeatmapCell {
  key: string;
  label: string;
  count: number;
  future: boolean;
}

/** Calendar grid: one column per week (Monday first), the last column is this week. */
export function activityHeatmap(events: StatEvent[], weeks: number, now = new Date()): HeatmapCell[][] {
  const counts = new Map<string, number>();
  events.forEach((event) => {
    const key = localDayKey(new Date(event.at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, week) => Array.from({ length: 7 }, (_, weekday) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + week * 7 + weekday);
    const key = localDayKey(date);
    return {
      key,
      label: `${WEEKDAY_SHORT[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`,
      count: counts.get(key) ?? 0,
      future: date.getTime() > today.getTime(),
    };
  }));
}

/** Answers per hour of the day (local time). */
export function hourOfDayCounts(events: StatEvent[]) {
  const hours = Array.from({ length: 24 }, () => 0);
  events.forEach((event) => {
    const hour = new Date(event.at).getHours();
    if (Number.isFinite(hour)) hours[hour] += 1;
  });
  return hours;
}

export interface SkillRow {
  name: string;
  source: StatSource;
  accuracy: number;
  attempts: number;
  speed: number | null;
}

export function skillRows(events: StatEvent[]): SkillRow[] {
  const groups = new Map<string, StatEvent[]>();
  events.forEach((event) => {
    const key = `${event.source}\u0000${event.skill}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });
  return [...groups.values()].map((items) => {
    const timing = filterResponseTimeOutliers(items, (item) => item.ms).included;
    return {
      name: items[0].skill,
      source: items[0].source,
      accuracy: Math.round((items.filter((item) => item.correct).length / items.length) * 100),
      attempts: items.length,
      speed: timing.length ? Math.round(timing.reduce((sum, item) => sum + item.ms, 0) / timing.length / 100) / 10 : null,
    };
  }).sort((a, b) => b.attempts - a.attempts);
}

/** How many learned grammar rules sit in each Leitner box (0 = just learnt or failed). */
export function grammarBoxDistribution(course: GrammarCourseProgress) {
  const boxes = Array.from({ length: MAX_BOX + 1 }, () => 0);
  learnedRuleIds(course).forEach((rule) => {
    boxes[Math.max(0, Math.min(MAX_BOX, course.rules[rule]?.box ?? 0))] += 1;
  });
  return boxes;
}

export interface GrammarModuleRow {
  id: string;
  title: string;
  lessonsDone: number;
  lessonsTotal: number;
  attempts: number;
  accuracy: number | null;
  checkpointPassed: boolean;
}

export function grammarModuleRows(course: GrammarCourseProgress): GrammarModuleRow[] {
  const ruleModule = new Map<string, string>();
  GRAMMAR_LESSONS.forEach((lesson) => lesson.rules.forEach((rule) => ruleModule.set(rule, lesson.moduleId)));
  const tally = new Map<string, { total: number; correct: number }>();
  (course.attemptLog ?? []).forEach((entry) => {
    const moduleId = ruleModule.get(entry.rules[0] ?? "");
    if (!moduleId) return;
    const current = tally.get(moduleId) ?? { total: 0, correct: 0 };
    current.total += 1;
    current.correct += entry.correct ? 1 : 0;
    tally.set(moduleId, current);
  });
  return GRAMMAR_MODULES.map((courseModule) => {
    const counts = tally.get(courseModule.id);
    return {
      id: courseModule.id,
      title: courseModule.title,
      lessonsDone: courseModule.lessonIds.filter((lessonId) => course.lessons[lessonId]).length,
      lessonsTotal: courseModule.lessonIds.length,
      attempts: counts?.total ?? 0,
      accuracy: counts?.total ? Math.round((counts.correct / counts.total) * 100) : null,
      checkpointPassed: Boolean(course.checkpoints[courseModule.id]?.passedAt),
    };
  });
}

/** Seconds spent in Grammatik sessions, minus answers that were really long pauses. */
export function grammarActiveSeconds(course: GrammarCourseProgress) {
  const sessionMs = (course.sessionLog ?? []).reduce((sum, session) => {
    const duration = Date.parse(session.endedAt) - Date.parse(session.startedAt);
    return sum + (Number.isFinite(duration) && duration > 0 ? duration : 0);
  }, 0);
  const pauses = filterResponseTimeOutliers(course.attemptLog ?? [], (entry) => entry.ms).excluded;
  const pauseMs = pauses.reduce((sum, item) => sum + Math.max(0, item.responseMs), 0);
  return Math.round(Math.max(0, sessionMs - pauseMs) / 1000);
}
