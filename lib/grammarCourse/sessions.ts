import { compileItem, seededRandom, type CompiledItem, type ItemOrigin } from "./compile";
import { GRAMMAR_LESSONS, GRAMMAR_MODULES } from "./curriculum";
import { isLessonCompleted, isRuleDue, learnedRuleIds, weakItemUids, type GrammarCourseProgress } from "./progress";
import type { CheckpointContent, ItemSpec, LessonContent, TheoryCard } from "./types";

export interface CatalogEntry {
  spec: ItemSpec;
  origin: ItemOrigin;
  uid: string;
  lessonIndex: number;
}

export interface GrammarCatalog {
  lessonEntries: Map<string, CatalogEntry[]>;
  checkpointEntries: Map<string, CatalogEntry[]>;
  theory: Map<string, TheoryCard[]>;
  checkpointIntro: Map<string, string>;
  byUid: Map<string, CatalogEntry>;
}

export type SessionRole = "new" | "review" | "repair" | "boss";

export interface SessionEntry {
  item: CompiledItem;
  role: SessionRole;
}

export const LESSON_NEW_ITEMS = 9;

const lessonIndexById = new Map(GRAMMAR_LESSONS.map((lesson, index) => [lesson.id, index]));
const moduleIdByLesson = new Map(GRAMMAR_LESSONS.map((lesson) => [lesson.id, lesson.moduleId]));

export function buildCatalog(lessons: LessonContent[], checkpoints: CheckpointContent[]): GrammarCatalog {
  const lessonEntries = new Map<string, CatalogEntry[]>();
  const checkpointEntries = new Map<string, CatalogEntry[]>();
  const byUid = new Map<string, CatalogEntry>();
  for (const lesson of lessons) {
    const moduleId = moduleIdByLesson.get(lesson.lessonId) ?? "unknown";
    const lessonIndex = lessonIndexById.get(lesson.lessonId) ?? -1;
    const entries = lesson.items.map((spec) => {
      const origin: ItemOrigin = { lessonId: lesson.lessonId, moduleId, source: "lesson" };
      return { spec, origin, uid: `${lesson.lessonId}:${spec.id}`, lessonIndex };
    });
    lessonEntries.set(lesson.lessonId, entries);
    entries.forEach((entry) => byUid.set(entry.uid, entry));
  }
  for (const checkpoint of checkpoints) {
    const courseModule = GRAMMAR_MODULES.find((candidate) => candidate.id === checkpoint.moduleId);
    const lastLesson = courseModule?.lessonIds.at(-1) ?? "";
    const lessonIndex = lessonIndexById.get(lastLesson) ?? -1;
    const entries = checkpoint.items.map((spec) => {
      const origin: ItemOrigin = { lessonId: lastLesson, moduleId: checkpoint.moduleId, source: "checkpoint" };
      return { spec, origin, uid: `${checkpoint.moduleId}-boss:${spec.id}`, lessonIndex };
    });
    checkpointEntries.set(checkpoint.moduleId, entries);
    entries.forEach((entry) => byUid.set(entry.uid, entry));
  }
  return {
    lessonEntries,
    checkpointEntries,
    theory: new Map(lessons.map((lesson) => [lesson.lessonId, lesson.theory])),
    checkpointIntro: new Map(checkpoints.map((checkpoint) => [checkpoint.moduleId, checkpoint.intro])),
    byUid,
  };
}

function compileEntry(entry: CatalogEntry, seed: number) {
  return compileItem(entry.spec, entry.origin, String(seed));
}

function shuffleWith<T>(values: T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

/** Keeps the order but swaps neighbours so the same mechanic rarely appears twice in a row. */
function spreadKinds(entries: CatalogEntry[]) {
  const result = [...entries];
  for (let index = 1; index < result.length; index += 1) {
    if (result[index].spec.kind !== result[index - 1].spec.kind) continue;
    const swap = result.findIndex((candidate, candidateIndex) => candidateIndex > index
      && candidate.spec.kind !== result[index - 1].spec.kind
      && candidate.spec.level <= result[index].spec.level + 1);
    if (swap > index) [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function itemPriority(progress: GrammarCourseProgress, uid: string) {
  const state = progress.items[uid];
  if (!state) return 0;
  if (state.incorrect > 0 && state.streak < 2) return 1;
  return 2;
}

function lastSeen(progress: GrammarCourseProgress, uid: string) {
  const state = progress.items[uid];
  return state ? Date.parse(state.lastAt) : 0;
}

function pickFresh(entries: CatalogEntry[], progress: GrammarCourseProgress, random: () => number) {
  return entries
    .map((entry) => ({ entry, priority: itemPriority(progress, entry.uid), seen: lastSeen(progress, entry.uid), noise: random() }))
    .sort((left, right) => left.priority - right.priority || left.seen - right.seen || left.noise - right.noise)
    .map((candidate) => candidate.entry);
}

function rankRulesForReview(progress: GrammarCourseProgress, rules: string[], now: Date, random: () => number) {
  return rules
    .map((rule) => {
      const state = progress.rules[rule];
      const attempts = state ? state.correct + state.incorrect : 0;
      const errorRate = attempts ? (state?.incorrect ?? 0) / attempts : 0;
      const tier = state && isRuleDue(state, now) ? 0 : errorRate >= 0.25 ? 1 : !state ? 2 : 3;
      return { rule, tier, box: state?.box ?? 0, errorRate, noise: random() };
    })
    .sort((left, right) => left.tier - right.tier || left.box - right.box || right.errorRate - left.errorRate || left.noise - right.noise)
    .map((candidate) => candidate.rule);
}

function reviewPicks(
  pool: CatalogEntry[],
  rankedRules: string[],
  count: number,
  progress: GrammarCourseProgress,
  random: () => number,
  perRule = 1,
) {
  const picked: CatalogEntry[] = [];
  const used = new Set<string>();
  for (let round = 0; round < perRule && picked.length < count; round += 1) {
    for (const rule of rankedRules) {
      if (picked.length >= count) break;
      const candidates = pickFresh(pool.filter((entry) => entry.spec.rules[0] === rule && !used.has(entry.uid) && entry.spec.kind !== "proof"), progress, random);
      if (!candidates.length) continue;
      picked.push(candidates[0]);
      used.add(candidates[0].uid);
    }
  }
  if (picked.length < count) {
    for (const entry of pickFresh(pool.filter((candidate) => !used.has(candidate.uid) && candidate.spec.kind !== "proof"), progress, random)) {
      if (picked.length >= count) break;
      picked.push(entry);
      used.add(entry.uid);
    }
  }
  return picked;
}

export function lessonReviewCount(lessonIndex: number) {
  if (lessonIndex <= 0) return 0;
  return lessonIndex < 5 ? 2 : 3;
}

export function buildLessonSession(
  catalog: GrammarCatalog,
  lessonId: string,
  progress: GrammarCourseProgress,
  seed: number,
  now = new Date(),
): SessionEntry[] {
  const random = seededRandom(seed);
  const lessonIndex = lessonIndexById.get(lessonId) ?? 0;
  const bank = catalog.lessonEntries.get(lessonId) ?? [];

  let proofs = 0;
  const fresh = pickFresh(bank, progress, random).filter((entry) => {
    if (entry.spec.kind !== "proof") return true;
    proofs += 1;
    return proofs <= 1;
  });
  const chosen = fresh.slice(0, LESSON_NEW_ITEMS);
  // Always open with an easy warm-up item when the lesson has one.
  const warmUp = fresh.find((entry) => entry.spec.level === 1);
  if (warmUp && !chosen.some((entry) => entry.spec.level === 1)) chosen[chosen.length - 1] = warmUp;
  const noise = new Map(chosen.map((entry) => [entry.uid, random()]));
  const ordered = spreadKinds([...chosen].sort((left, right) => left.spec.level - right.spec.level || (noise.get(left.uid) ?? 0) - (noise.get(right.uid) ?? 0)));

  const earlierLessons = GRAMMAR_LESSONS.slice(0, lessonIndex);
  const pool = earlierLessons.flatMap((lesson) => catalog.lessonEntries.get(lesson.id) ?? []);
  const earlierRules = earlierLessons.flatMap((lesson) => lesson.rules);
  const reviews = reviewPicks(pool, rankRulesForReview(progress, earlierRules, now, random), Math.min(lessonReviewCount(lessonIndex), pool.length), progress, random);

  const session: SessionEntry[] = ordered.map((entry) => ({ item: compileEntry(entry, seed), role: "new" }));
  const total = session.length + reviews.length;
  reviews.forEach((entry, index) => {
    const position = Math.max(2, Math.round(((index + 1) * total) / (reviews.length + 1)));
    session.splice(Math.min(position, session.length), 0, { item: compileEntry(entry, seed), role: "review" });
  });
  return session;
}

export function buildReviewSession(
  catalog: GrammarCatalog,
  progress: GrammarCourseProgress,
  seed: number,
  now = new Date(),
  size = 12,
): SessionEntry[] {
  const random = seededRandom(seed);
  const pool = GRAMMAR_LESSONS
    .filter((lesson) => isLessonCompleted(progress, lesson.id))
    .flatMap((lesson) => catalog.lessonEntries.get(lesson.id) ?? []);
  if (!pool.length) return [];
  const ranked = rankRulesForReview(progress, learnedRuleIds(progress), now, random);
  const picks = reviewPicks(pool, ranked, Math.min(size, pool.length), progress, random, 2);
  const result: CatalogEntry[] = [];
  const remaining = shuffleWith(picks, random);
  while (remaining.length) {
    const previousRule = result.at(-1)?.spec.rules[0];
    const index = remaining.findIndex((entry) => entry.spec.rules[0] !== previousRule);
    result.push(...remaining.splice(index >= 0 ? index : 0, 1));
  }
  return result.map((entry) => ({ item: compileEntry(entry, seed), role: "review" }));
}

export function buildMistakeSession(catalog: GrammarCatalog, progress: GrammarCourseProgress, seed: number, size = 12): SessionEntry[] {
  const random = seededRandom(seed);
  const entries = weakItemUids(progress)
    .map((uid) => catalog.byUid.get(uid))
    .filter((entry): entry is CatalogEntry => Boolean(entry))
    .slice(0, size);
  return shuffleWith(entries, random).map((entry) => ({ item: compileEntry(entry, seed), role: "repair" }));
}

export function buildCheckpointSession(catalog: GrammarCatalog, moduleId: string, seed: number): SessionEntry[] {
  return (catalog.checkpointEntries.get(moduleId) ?? []).map((entry) => ({ item: compileEntry(entry, seed), role: "boss" }));
}

export function countWeakItems(catalog: GrammarCatalog, progress: GrammarCourseProgress) {
  return weakItemUids(progress).filter((uid) => catalog.byUid.has(uid)).length;
}
