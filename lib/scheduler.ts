import {
  FSRSVersion,
  Rating,
  State,
  createEmptyCard,
  fsrs,
  type Card,
  type CardInput,
  type Grade,
} from "ts-fsrs";

/**
 * Local-first review scheduling.
 *
 * Operational cards are scheduled exclusively by ts-fsrs (FSRS-5 in the
 * pinned 4.7.1 package). The holdout cohort deliberately has no FSRS card: it
 * follows fixed 1/3/7/14-day checkpoints so retention estimates are not
 * conditioned on decisions made by the operational scheduler.
 */

export const MASTERY_SCHEMA_VERSION = 1 as const;
export const MASTERY_STORAGE_KEY = "dansk-laering.mastery.v1";
export const FSRS_ENGINE_VERSION = FSRSVersion;
export const HOLDOUT_PERCENT = 8 as const;
export const HOLDOUT_DAYS = [1, 3, 7, 14] as const;

export type Modality = "read" | "listen" | "produce";
export type MasteryKey = `${string}::${Modality}`;
export type MasteryCohort = "operational" | "holdout";
export type HoldoutDay = (typeof HOLDOUT_DAYS)[number];
export type IsoDateString = string;

export interface SerializableFsrsCard {
  due: IsoDateString;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: State;
  last_review: IsoDateString | null;
}

export interface OperationalMasteryRecord {
  key: MasteryKey;
  itemId: string;
  modality: Modality;
  cohort: "operational";
  scheduler: "fsrs-5";
  card: SerializableFsrsCard;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  lastRating: Grade | null;
}

export interface ExerciseReviewOutcome {
  /** Binary correctness remains useful for reporting, while score drives FSRS grading. */
  correct?: boolean;
  /** Partial-credit score in [0, 1], e.g. normalized Levenshtein similarity. */
  score?: number;
  result?: "incorrect" | "partial" | "correct";
  /** Probability in [0, 1] or percentage in [50, 100]. */
  confidence?: number;
  hintsUsed?: number;
}

export interface NormalizedReviewOutcome {
  correct: boolean;
  score: number;
  confidence: number | null;
  hintsUsed: number;
  result: "incorrect" | "partial" | "correct";
}

export interface HoldoutObservation extends NormalizedReviewOutcome {
  checkpointDay: HoldoutDay;
  dueAt: IsoDateString;
  observedAt: IsoDateString;
  delayMs: number;
}

export interface HoldoutCheckpoint {
  day: HoldoutDay;
  dueAt: IsoDateString;
  observation: HoldoutObservation | null;
}

export interface HoldoutMasteryRecord {
  key: MasteryKey;
  itemId: string;
  modality: Modality;
  cohort: "holdout";
  scheduler: "holdout-fixed";
  anchorAt: IsoDateString;
  checkpoints: HoldoutCheckpoint[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type MasteryRecord = OperationalMasteryRecord | HoldoutMasteryRecord;
export type MasteryRecords = Partial<Record<MasteryKey, MasteryRecord>>;

export interface MasteryState {
  schemaVersion: typeof MASTERY_SCHEMA_VERSION;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  records: MasteryRecords;
  events: ReviewEvent[];
}

interface ReviewEventBase {
  schemaVersion: typeof MASTERY_SCHEMA_VERSION;
  id: string;
  masteryKey: MasteryKey;
  itemId: string;
  modality: Modality;
  cohort: MasteryCohort;
  timestamp: IsoDateString;
}

export interface ReviewScheduledEvent extends ReviewEventBase {
  type: "review_scheduled";
  scheduler: "fsrs-5" | "holdout-fixed";
  scheduledFor: IsoDateString;
  checkpointDay: HoldoutDay | null;
  /** The FSRS probability immediately after scheduling; null for holdout. */
  predictedRecall: number | null;
}

export interface ReviewCompletedEvent extends ReviewEventBase {
  type: "review_completed";
  scheduler: "fsrs-5" | "holdout-fixed";
  scheduledFor: IsoDateString;
  completedAt: IsoDateString;
  delayMs: number;
  correct: boolean;
  score: number;
  confidence: number | null;
  hintsUsed: number;
  result: "incorrect" | "partial" | "correct";
  rating: Grade | null;
  checkpointDay: HoldoutDay | null;
  /** Probability before the answer; null for the fixed holdout cohort. */
  predictedRecallBefore: number | null;
}

export type ReviewEvent = ReviewScheduledEvent | ReviewCompletedEvent;

export interface ScheduleOperationalReviewInput extends ExerciseReviewOutcome {
  itemId: string;
  modality: Modality;
  mastery?: OperationalMasteryRecord | null;
  reviewedAt?: Date | string | number;
  completedEventId?: string;
  scheduledEventId?: string;
}

export interface ScheduleOperationalReviewResult {
  mastery: OperationalMasteryRecord;
  rating: Grade;
  completedEvent: ReviewCompletedEvent;
  scheduledEvent: ReviewScheduledEvent;
  events: [ReviewCompletedEvent, ReviewScheduledEvent];
}

export interface HoldoutDueReview {
  masteryKey: MasteryKey;
  itemId: string;
  modality: Modality;
  checkpointDay: HoldoutDay;
  dueAt: IsoDateString;
  overdueMs: number;
}

export interface RecordHoldoutObservationInput extends ExerciseReviewOutcome {
  checkpointDay: HoldoutDay;
  observedAt?: Date | string | number;
  completedEventId?: string;
}

export interface RecordHoldoutObservationResult {
  mastery: HoldoutMasteryRecord;
  observation: HoldoutObservation;
  completedEvent: ReviewCompletedEvent;
  event: ReviewCompletedEvent;
}

type RecordCollection<T> =
  | readonly T[]
  | Readonly<Record<string, T | undefined>>;

const DAY_MS = 24 * 60 * 60 * 1000;
const MODALITIES: readonly Modality[] = ["read", "listen", "produce"];
const fsrsEngine = fsrs();
let fallbackEventSequence = 0;

function asDate(value: Date | string | number, fieldName: string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError(`${fieldName} must be a valid date`);
  }
  return date;
}

function toIso(value: Date | string | number, fieldName: string): IsoDateString {
  return asDate(value, fieldName).toISOString();
}

function requireItemId(itemId: string): string {
  const normalized = itemId.trim();
  if (!normalized) {
    throw new TypeError("itemId must not be empty");
  }
  return normalized;
}

function requireModality(modality: Modality): Modality {
  if (!MODALITIES.includes(modality)) {
    throw new TypeError(`Unsupported modality: ${String(modality)}`);
  }
  return modality;
}

function requireUnitInterval(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${fieldName} must be a finite number in [0, 1]`);
  }
  return value;
}

function normalizeConfidence(value: number | undefined): number | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value)) {
    throw new RangeError("confidence must be finite");
  }
  if (value >= 0 && value <= 1) return value;
  if (value >= 50 && value <= 100) return value / 100;
  throw new RangeError("confidence must be a probability in [0, 1] or percentage in [50, 100]");
}

function normalizedOutcome(outcome: ExerciseReviewOutcome): NormalizedReviewOutcome {
  const hintsUsed = outcome.hintsUsed ?? 0;
  if (!Number.isInteger(hintsUsed) || hintsUsed < 0) {
    throw new RangeError("hintsUsed must be a non-negative integer");
  }

  let score: number;
  if (outcome.score !== undefined) {
    score = requireUnitInterval(outcome.score, "score");
  } else if (outcome.result !== undefined) {
    score = outcome.result === "correct" ? 1 : outcome.result === "partial" ? 0.7 : 0;
  } else if (outcome.correct !== undefined) {
    score = outcome.correct ? 1 : 0;
  } else {
    throw new TypeError("An exercise outcome needs score, result, or correct");
  }

  const result =
    outcome.result ?? (score >= 0.95 ? "correct" : score > 0 ? "partial" : "incorrect");
  const correct = outcome.correct ?? result === "correct";

  return {
    correct,
    score,
    confidence: normalizeConfidence(outcome.confidence),
    hintsUsed,
    result,
  };
}

function eventId(prefix: "scheduled" | "completed", key: MasteryKey, at: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}:${globalThis.crypto.randomUUID()}`;
  }
  fallbackEventSequence += 1;
  return `${prefix}:${fnv1a32(`${key}:${at}:${fallbackEventSequence}`).toString(16)}`;
}

function valuesOf<T>(collection: RecordCollection<T>): T[] {
  return Array.isArray(collection)
    ? [...collection]
    : Object.values(collection).filter((value): value is T => value !== undefined);
}

function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function masteryKey(itemId: string, modality: Modality): MasteryKey {
  return `${requireItemId(itemId)}::${requireModality(modality)}`;
}

/** Deterministic item-level assignment: every modality of an item shares a cohort. */
export function assignHoldout(itemId: string): boolean {
  return fnv1a32(requireItemId(itemId)) % 100 < HOLDOUT_PERCENT;
}

export function serializeFsrsCard(card: Card): SerializableFsrsCard {
  return {
    due: toIso(card.due, "card.due"),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? toIso(card.last_review, "card.last_review") : null,
  };
}

export function deserializeFsrsCard(card: SerializableFsrsCard): CardInput {
  return {
    due: asDate(card.due, "card.due"),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? asDate(card.last_review, "card.last_review") : null,
  };
}

export function createMasteryState(
  now: Date | string | number = new Date(),
): MasteryState {
  const timestamp = toIso(now, "now");
  return {
    schemaVersion: MASTERY_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    records: {},
    events: [],
  };
}

export function createOperationalMastery(
  itemId: string,
  modality: Modality,
  now: Date | string | number = new Date(),
): OperationalMasteryRecord {
  const normalizedItemId = requireItemId(itemId);
  if (assignHoldout(normalizedItemId)) {
    throw new Error(`Holdout item ${normalizedItemId} cannot be assigned an FSRS card`);
  }
  const timestamp = toIso(now, "now");
  return {
    key: masteryKey(normalizedItemId, modality),
    itemId: normalizedItemId,
    modality: requireModality(modality),
    cohort: "operational",
    scheduler: "fsrs-5",
    card: serializeFsrsCard(createEmptyCard(timestamp)),
    createdAt: timestamp,
    updatedAt: timestamp,
    lastRating: null,
  };
}

/**
 * Converts exercise evidence to the four FSRS grades. A supplied partial score
 * is authoritative, so listening/production exercises are not collapsed to a
 * binary result. Hints and low confidence can lower a passing answer but can
 * never turn an incorrect answer into a higher grade.
 */
export function gradeExerciseResult(outcome: ExerciseReviewOutcome): Grade {
  const normalized = normalizedOutcome(outcome);
  if (normalized.score < 0.5) return Rating.Again;
  if (
    normalized.score < 0.85 ||
    normalized.hintsUsed > 0 ||
    (normalized.confidence !== null && normalized.confidence < 0.65)
  ) {
    return Rating.Hard;
  }
  if (
    normalized.score >= 0.98 &&
    normalized.hintsUsed === 0 &&
    normalized.confidence !== null &&
    normalized.confidence >= 0.9
  ) {
    return Rating.Easy;
  }
  return Rating.Good;
}

export const mapExerciseResultToRating = gradeExerciseResult;

export function predictedRecall(
  masteryOrCard: OperationalMasteryRecord | SerializableFsrsCard,
  now: Date | string | number = new Date(),
): number {
  const serialized = "card" in masteryOrCard ? masteryOrCard.card : masteryOrCard;
  const probability = fsrsEngine.get_retrievability(
    deserializeFsrsCard(serialized),
    asDate(now, "now"),
    false,
  );
  return Math.min(1, Math.max(0, probability));
}

/** Applies a completed operational review using FSRS-5 and no custom intervals. */
export function scheduleOperationalReview(
  input: ScheduleOperationalReviewInput,
): ScheduleOperationalReviewResult {
  const itemId = requireItemId(input.itemId);
  const modality = requireModality(input.modality);
  if (assignHoldout(itemId)) {
    throw new Error(`Holdout item ${itemId} must use the fixed holdout schedule, not FSRS`);
  }

  const reviewedAt = asDate(input.reviewedAt ?? new Date(), "reviewedAt");
  const reviewedAtIso = reviewedAt.toISOString();
  const key = masteryKey(itemId, modality);
  const existing = input.mastery ?? createOperationalMastery(itemId, modality, reviewedAt);
  if (
    existing.key !== key ||
    existing.itemId !== itemId ||
    existing.modality !== modality ||
    existing.cohort !== "operational"
  ) {
    throw new Error(`Mastery record does not match ${key}`);
  }

  const outcome = normalizedOutcome(input);
  const rating = gradeExerciseResult(input);
  const cardBefore = deserializeFsrsCard(existing.card);
  const recallBefore = predictedRecall(existing, reviewedAt);
  const scheduledFor = existing.card.due;
  const next = fsrsEngine.next(cardBefore, reviewedAt, rating);
  const nextCard = serializeFsrsCard(next.card);
  const mastery: OperationalMasteryRecord = {
    ...existing,
    card: nextCard,
    updatedAt: reviewedAtIso,
    lastRating: rating,
  };

  const completedEvent: ReviewCompletedEvent = {
    schemaVersion: MASTERY_SCHEMA_VERSION,
    id: input.completedEventId ?? eventId("completed", key, reviewedAtIso),
    type: "review_completed",
    masteryKey: key,
    itemId,
    modality,
    cohort: "operational",
    scheduler: "fsrs-5",
    timestamp: reviewedAtIso,
    scheduledFor,
    completedAt: reviewedAtIso,
    delayMs: Math.max(0, reviewedAt.getTime() - Date.parse(scheduledFor)),
    ...outcome,
    rating,
    checkpointDay: null,
    predictedRecallBefore: recallBefore,
  };
  const scheduledEvent: ReviewScheduledEvent = {
    schemaVersion: MASTERY_SCHEMA_VERSION,
    id: input.scheduledEventId ?? eventId("scheduled", key, reviewedAtIso),
    type: "review_scheduled",
    masteryKey: key,
    itemId,
    modality,
    cohort: "operational",
    scheduler: "fsrs-5",
    timestamp: reviewedAtIso,
    scheduledFor: nextCard.due,
    checkpointDay: null,
    predictedRecall: predictedRecall(mastery, reviewedAt),
  };

  return {
    mastery,
    rating,
    completedEvent,
    scheduledEvent,
    events: [completedEvent, scheduledEvent],
  };
}

export function getDueOperationalReviews(
  records: RecordCollection<MasteryRecord>,
  now: Date | string | number = new Date(),
  limit = Number.POSITIVE_INFINITY,
): OperationalMasteryRecord[] {
  if (!(limit === Number.POSITIVE_INFINITY || (Number.isInteger(limit) && limit >= 0))) {
    throw new RangeError("limit must be a non-negative integer or Infinity");
  }
  const nowMs = asDate(now, "now").getTime();
  return valuesOf(records)
    .filter((record): record is OperationalMasteryRecord => record.cohort === "operational")
    .filter((record) => Date.parse(record.card.due) <= nowMs)
    .sort(
      (left, right) =>
        Date.parse(left.card.due) - Date.parse(right.card.due) ||
        left.key.localeCompare(right.key),
    )
    .slice(0, limit);
}

/** Builds the measurement schedule from one immutable exposure anchor. */
export function createFixedHoldoutSchedule(
  itemId: string,
  modality: Modality,
  anchorAt: Date | string | number = new Date(),
): HoldoutMasteryRecord {
  const normalizedItemId = requireItemId(itemId);
  const normalizedModality = requireModality(modality);
  const anchor = asDate(anchorAt, "anchorAt");
  const timestamp = anchor.toISOString();
  return {
    key: masteryKey(normalizedItemId, normalizedModality),
    itemId: normalizedItemId,
    modality: normalizedModality,
    cohort: "holdout",
    scheduler: "holdout-fixed",
    anchorAt: timestamp,
    checkpoints: HOLDOUT_DAYS.map((day) => ({
      day,
      dueAt: new Date(anchor.getTime() + day * DAY_MS).toISOString(),
      observation: null,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Creates the four review_scheduled events to persist beside a new holdout record. */
export function createHoldoutScheduledEvents(
  mastery: HoldoutMasteryRecord,
): ReviewScheduledEvent[] {
  return mastery.checkpoints.map((checkpoint) => ({
    schemaVersion: MASTERY_SCHEMA_VERSION,
    id: eventId("scheduled", mastery.key, checkpoint.dueAt),
    type: "review_scheduled",
    masteryKey: mastery.key,
    itemId: mastery.itemId,
    modality: mastery.modality,
    cohort: "holdout",
    scheduler: "holdout-fixed",
    timestamp: mastery.anchorAt,
    scheduledFor: checkpoint.dueAt,
    checkpointDay: checkpoint.day,
    predictedRecall: null,
  }));
}

export function getDueHoldoutReviews(
  records: RecordCollection<MasteryRecord>,
  now: Date | string | number = new Date(),
  limit = Number.POSITIVE_INFINITY,
): HoldoutDueReview[] {
  if (!(limit === Number.POSITIVE_INFINITY || (Number.isInteger(limit) && limit >= 0))) {
    throw new RangeError("limit must be a non-negative integer or Infinity");
  }
  const nowMs = asDate(now, "now").getTime();
  return valuesOf(records)
    .filter((record): record is HoldoutMasteryRecord => record.cohort === "holdout")
    .flatMap((record) =>
      record.checkpoints
        .filter(
          (checkpoint) =>
            checkpoint.observation === null && Date.parse(checkpoint.dueAt) <= nowMs,
        )
        .map((checkpoint) => ({
          masteryKey: record.key,
          itemId: record.itemId,
          modality: record.modality,
          checkpointDay: checkpoint.day,
          dueAt: checkpoint.dueAt,
          overdueMs: Math.max(0, nowMs - Date.parse(checkpoint.dueAt)),
        })),
    )
    .sort(
      (left, right) =>
        Date.parse(left.dueAt) - Date.parse(right.dueAt) ||
        left.masteryKey.localeCompare(right.masteryKey),
    )
    .slice(0, limit);
}

/** Records an observation without moving any of the remaining fixed checkpoints. */
export function recordHoldoutObservation(
  mastery: HoldoutMasteryRecord,
  input: RecordHoldoutObservationInput,
): RecordHoldoutObservationResult {
  const observedAt = asDate(input.observedAt ?? new Date(), "observedAt");
  const observedAtIso = observedAt.toISOString();
  const checkpointIndex = mastery.checkpoints.findIndex(
    (checkpoint) => checkpoint.day === input.checkpointDay,
  );
  if (checkpointIndex === -1) {
    throw new RangeError(`Unknown holdout checkpoint: ${input.checkpointDay}`);
  }
  const checkpoint = mastery.checkpoints[checkpointIndex];
  if (checkpoint.observation !== null) {
    throw new Error(`Holdout checkpoint ${input.checkpointDay}d has already been observed`);
  }
  const dueMs = Date.parse(checkpoint.dueAt);
  if (observedAt.getTime() < dueMs) {
    throw new Error(`Holdout checkpoint ${input.checkpointDay}d is not due yet`);
  }

  const outcome = normalizedOutcome(input);
  const observation: HoldoutObservation = {
    checkpointDay: checkpoint.day,
    dueAt: checkpoint.dueAt,
    observedAt: observedAtIso,
    delayMs: observedAt.getTime() - dueMs,
    ...outcome,
  };
  const checkpoints = mastery.checkpoints.map((candidate, index) =>
    index === checkpointIndex ? { ...candidate, observation } : { ...candidate },
  );
  const nextMastery: HoldoutMasteryRecord = {
    ...mastery,
    checkpoints,
    updatedAt: observedAtIso,
  };
  const completedEvent: ReviewCompletedEvent = {
    schemaVersion: MASTERY_SCHEMA_VERSION,
    id: input.completedEventId ?? eventId("completed", mastery.key, observedAtIso),
    type: "review_completed",
    masteryKey: mastery.key,
    itemId: mastery.itemId,
    modality: mastery.modality,
    cohort: "holdout",
    scheduler: "holdout-fixed",
    timestamp: observedAtIso,
    scheduledFor: checkpoint.dueAt,
    completedAt: observedAtIso,
    delayMs: observation.delayMs,
    ...outcome,
    rating: null,
    checkpointDay: checkpoint.day,
    predictedRecallBefore: null,
  };

  return {
    mastery: nextMastery,
    observation,
    completedEvent,
    event: completedEvent,
  };
}
