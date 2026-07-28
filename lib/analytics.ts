/**
 * Client-safe learning analytics for the Danish learning application.
 *
 * The primary records (`attempts` and `sessions`) are the source of truth. Daily
 * and skill rollups are rebuilt after every mutation and again while loading,
 * so stale cached aggregates cannot silently become authoritative.
 */

export const ANALYTICS_SCHEMA_VERSION = 2 as const;
export const ANALYTICS_STORAGE_KEY = "dansk-laering.analytics.v2";
export const HOLDOUT_TARGET_RATE = 0.08;
export const HOLDOUT_SCHEDULE_DAYS = [1, 3, 7, 14] as const;

export type Modality = "read" | "listen" | "produce";
export type SchedulerKind = "fsrs-5" | "holdout-fixed";
export type MasteryKey = `${string}::${Modality}`;
export type HoldoutScheduleDay = (typeof HOLDOUT_SCHEDULE_DAYS)[number];
export type FSRSRating = 1 | 2 | 3 | 4;
export type FSRSCardState = 0 | 1 | 2 | 3;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface AttemptEvent {
  id: string;
  sessionId: string | null;
  timestamp: string;
  itemId: string;
  skillId: string;
  modality: Modality;
  scheduler: SchedulerKind;
  lessonId: string | null;
  levelId: string | null;
  exerciseId: string;
  exerciseType: string;
  prompt: string | null;
  userAnswer: string | null;
  expectedAnswer: string | null;
  correct: boolean;
  responseTimeMs: number;
  hintsUsed: number;
  attemptNumber: number;
  difficulty: number | null;
  errorTags: string[];
  tags: string[];
  metadata: JsonObject;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  lastActivityAt: string;
  durationMs: number;
  activeTimeMs: number;
  attemptCount: number;
  correctCount: number;
  accuracy: number;
  skillIds: string[];
  levelId: string | null;
  mode: string;
  endReason: string | null;
  metadata: JsonObject;
}

export interface DailyRollup {
  date: string;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  activeTimeMs: number;
  averageResponseTimeMs: number;
  hintsUsed: number;
  sessionsCount: number;
  skillIds: string[];
  lessonIds: string[];
  firstAttemptAt: string;
  lastAttemptAt: string;
}

export interface SkillErrorPattern {
  tag: string;
  count: number;
  shareOfIncorrectAttempts: number;
  lastSeenAt: string;
}

export interface SkillRollup {
  key: string;
  skillId: string;
  modality: Modality;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  activeTimeMs: number;
  averageResponseTimeMs: number;
  hintsUsed: number;
  sessionsCount: number;
  daysPracticed: number;
  currentCorrectStreak: number;
  bestCorrectStreak: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  errorPatterns: SkillErrorPattern[];
}

/** Mirrors the serializable card fields used by FSRS implementations. */
export interface FSRSCardSnapshot {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FSRSCardState;
  last_review: string | null;
}

export type FSRS5Weights = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * FSRS-5 configuration is stored with every mastery record so a future
 * ts-fsrs adapter can reproduce scheduling decisions without hidden defaults.
 * The analytics module intentionally does not calculate adaptive intervals.
 */
export interface FSRS5Parameters {
  version: "fsrs-5";
  request_retention: number;
  maximum_interval: number;
  enable_fuzz: boolean;
  enable_short_term: boolean;
  w: FSRS5Weights;
}

export const DEFAULT_FSRS5_PARAMETERS: FSRS5Parameters = Object.freeze({
  version: "fsrs-5",
  request_retention: 0.9,
  maximum_interval: 36_500,
  enable_fuzz: false,
  enable_short_term: true,
  w: Object.freeze([
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
    0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
    0.6621,
  ]) as FSRS5Weights,
});

export interface HoldoutFixedState {
  anchorAt: string;
  scheduleDays: readonly HoldoutScheduleDay[];
  completedDays: HoldoutScheduleDay[];
}

interface MasteryRecordBase {
  key: MasteryKey;
  itemId: string;
  skillId: string;
  modality: Modality;
  firstSeenAt: string;
  lastSeenAt: string;
  lastReviewedAt: string | null;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface OperationalMasteryRecord extends MasteryRecordBase {
  scheduler: "fsrs-5";
  /** Scheduler-produced estimate; never used as experimental retention data. */
  operationalRecall: number | null;
  fsrsCard: FSRSCardSnapshot;
  fsrsParameters: FSRS5Parameters;
  holdout: null;
}

export interface HoldoutMasteryRecord extends MasteryRecordBase {
  scheduler: "holdout-fixed";
  operationalRecall: null;
  fsrsCard: null;
  fsrsParameters: null;
  holdout: HoldoutFixedState;
}

export type MasteryRecord = OperationalMasteryRecord | HoldoutMasteryRecord;

export interface HoldoutAssignment {
  itemId: string;
  assigned: boolean;
  bucket: number;
  targetRate: number;
  scheduleDays: readonly HoldoutScheduleDay[];
  firstSeenAt: string;
}

interface ReviewEventBase {
  id: string;
  itemId: string;
  skillId: string;
  modality: Modality;
  scheduler: SchedulerKind;
  timestamp: string;
  scheduledFor: string;
  holdoutDay: HoldoutScheduleDay | null;
}

export interface ReviewScheduledEvent extends ReviewEventBase {
  type: "review_scheduled";
  sourceAttemptId: string | null;
}

export interface ReviewCompletedEvent extends ReviewEventBase {
  type: "review_completed";
  scheduledEventId: string;
  attemptId: string | null;
  correct: boolean;
  rating: FSRSRating | null;
  responseTimeMs: number;
  /** Prediction emitted by FSRS immediately before the review, if available. */
  predictedOperationalRecall: number | null;
}

export type ReviewEvent = ReviewScheduledEvent | ReviewCompletedEvent;

export interface State {
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  activeSessionId: string | null;
  attempts: AttemptEvent[];
  sessions: SessionRecord[];
  mastery: Record<MasteryKey, MasteryRecord>;
  holdoutAssignments: Record<string, HoldoutAssignment>;
  reviewEvents: ReviewEvent[];
  dailyRollups: Record<string, DailyRollup>;
  skillRollups: Record<string, SkillRollup>;
}

export type AnalyticsState = State;

export interface AttemptInput {
  id?: string;
  sessionId?: string | null;
  timestamp?: string | Date;
  itemId: string;
  skillId: string;
  modality: Modality;
  lessonId?: string | null;
  levelId?: string | null;
  exerciseId: string;
  exerciseType: string;
  prompt?: string | null;
  userAnswer?: string | null;
  expectedAnswer?: string | null;
  correct: boolean;
  responseTimeMs: number;
  hintsUsed?: number;
  attemptNumber?: number;
  difficulty?: number | null;
  errorTags?: string[];
  tags?: string[];
  metadata?: JsonObject;
}

export interface StartSessionInput {
  id?: string;
  startedAt?: string | Date;
  levelId?: string | null;
  mode?: string;
  metadata?: JsonObject;
}

export interface EndSessionInput {
  sessionId?: string;
  endedAt?: string | Date;
  reason?: string;
}

export interface MutationResult<T> {
  state: State;
  value: T;
}

export interface AccuracySummary {
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface StreakSummary {
  currentDays: number;
  longestDays: number;
  lastActiveDate: string | null;
  activeDates: string[];
}

export interface SkillTimeSummary {
  key: string;
  skillId: string;
  modality: Modality;
  activeTimeMs: number;
  attempts: number;
  averageResponseTimeMs: number;
}

export interface ErrorPattern {
  tag: string;
  count: number;
  shareOfIncorrectAttempts: number;
  shareOfAllAttempts: number;
  skillIds: string[];
  exerciseTypes: string[];
  lastSeenAt: string;
}

export interface HoldoutRetentionPoint {
  scheduledDay: HoldoutScheduleDay;
  reviews: number;
  recalled: number;
  estimate: number | null;
  meanDelayHours: number | null;
}

export interface HoldoutRetentionEstimate {
  estimate: number | null;
  reviews: number;
  recalled: number;
  curve: HoldoutRetentionPoint[];
  byModality: Record<Modality, HoldoutRetentionPoint[]>;
}

export interface OperationalRecallSummary {
  estimate: number | null;
  items: number;
  byModality: Record<Modality, { estimate: number | null; items: number }>;
}

export interface ReviewScheduledInput {
  id?: string;
  itemId: string;
  skillId: string;
  modality: Modality;
  timestamp?: string | Date;
  scheduledFor?: string | Date;
  holdoutDay?: HoldoutScheduleDay;
  sourceAttemptId?: string | null;
}

export interface ReviewCompletedInput {
  id?: string;
  scheduledEventId: string;
  completedAt?: string | Date;
  attemptId?: string | null;
  correct: boolean;
  rating?: FSRSRating | null;
  responseTimeMs: number;
  predictedOperationalRecall?: number | null;
  fsrsCardAfter?: FSRSCardSnapshot;
  fsrsParameters?: FSRS5Parameters;
  operationalRecallAfter?: number | null;
}

export interface MasteryUpdateInput {
  itemId: string;
  modality: Modality;
  skillId: string;
  updatedAt?: string | Date;
  fsrsCard: FSRSCardSnapshot;
  fsrsParameters: FSRS5Parameters;
  operationalRecall: number | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface StorageOptions {
  storage?: StorageLike | null;
  key?: string;
}

export interface AnalyticsSummary {
  generatedAt: string;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  accuracy: AccuracySummary;
  activeTimeMs: number;
  sessions: number;
  completedSessions: number;
  skillsPracticed: number;
  practiceDays: number;
  streak: StreakSummary;
  operationalRecall: OperationalRecallSummary;
  holdoutRetention: HoldoutRetentionEstimate;
}

export interface AnalyticsExportFile {
  name: string;
  mimeType: string;
  content: string;
}

export interface FileSystemWritableFileStreamLike {
  write(data: Blob | string): Promise<void>;
  close(): Promise<void>;
}

export interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
}

export interface FileSystemDirectoryHandleLike {
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemFileHandleLike>;
  getDirectoryHandle?(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemDirectoryHandleLike>;
}

interface WindowWithDirectoryPicker extends Window {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
    startIn?: string;
  }) => Promise<FileSystemDirectoryHandleLike>;
}

export interface ExportOptions {
  method?: "auto" | "directory" | "download";
  directoryHandle?: FileSystemDirectoryHandleLike;
  createSubdirectory?: boolean;
  folderPrefix?: string;
  fallbackToDownload?: boolean;
  timeZone?: string;
}

export interface ExportResult {
  method: "directory" | "download" | "cancelled";
  fileNames: string[];
  folderName: string | null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isNonNegativeNumber(value);
}

function isProbability(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isModality(value: unknown): value is Modality {
  return value === "read" || value === "listen" || value === "produce";
}

function isSchedulerKind(value: unknown): value is SchedulerKind {
  return value === "fsrs-5" || value === "holdout-fixed";
}

function isHoldoutScheduleDay(value: unknown): value is HoldoutScheduleDay {
  return typeof value === "number" && (HOLDOUT_SCHEDULE_DAYS as readonly number[]).includes(value);
}

function isFSRSRating(value: unknown): value is FSRSRating {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 20) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item, depth + 1));
  }
  if (!isRecord(value)) return false;
  return Object.values(value).every((item) => isJsonValue(item, depth + 1));
}

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value) && Object.values(value).every((item) => isJsonValue(item));
}

export function isAttemptEvent(value: unknown): value is AttemptEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isNullableString(value.sessionId) &&
    isTimestamp(value.timestamp) &&
    typeof value.itemId === "string" &&
    value.itemId.trim() !== "" &&
    typeof value.skillId === "string" &&
    isModality(value.modality) &&
    isSchedulerKind(value.scheduler) &&
    value.scheduler === schedulerForItem(value.itemId) &&
    isNullableString(value.lessonId) &&
    isNullableString(value.levelId) &&
    typeof value.exerciseId === "string" &&
    typeof value.exerciseType === "string" &&
    isNullableString(value.prompt) &&
    isNullableString(value.userAnswer) &&
    isNullableString(value.expectedAnswer) &&
    typeof value.correct === "boolean" &&
    isNonNegativeNumber(value.responseTimeMs) &&
    isNonNegativeInteger(value.hintsUsed) &&
    isNonNegativeInteger(value.attemptNumber) &&
    (value.difficulty === null || isFiniteNumber(value.difficulty)) &&
    isStringArray(value.errorTags) &&
    isStringArray(value.tags) &&
    isJsonObject(value.metadata)
  );
}

export function isSessionRecord(value: unknown): value is SessionRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isTimestamp(value.startedAt) &&
    (value.endedAt === null || isTimestamp(value.endedAt)) &&
    isTimestamp(value.lastActivityAt) &&
    isNonNegativeNumber(value.durationMs) &&
    isNonNegativeNumber(value.activeTimeMs) &&
    isNonNegativeInteger(value.attemptCount) &&
    isNonNegativeInteger(value.correctCount) &&
    isProbability(value.accuracy) &&
    isStringArray(value.skillIds) &&
    isNullableString(value.levelId) &&
    typeof value.mode === "string" &&
    isNullableString(value.endReason) &&
    isJsonObject(value.metadata)
  );
}

function isSkillErrorPattern(value: unknown): value is SkillErrorPattern {
  if (!isRecord(value)) return false;
  return (
    typeof value.tag === "string" &&
    isNonNegativeInteger(value.count) &&
    isProbability(value.shareOfIncorrectAttempts) &&
    isTimestamp(value.lastSeenAt)
  );
}

export function isDailyRollup(value: unknown): value is DailyRollup {
  if (!isRecord(value)) return false;
  return (
    typeof value.date === "string" &&
    isNonNegativeInteger(value.attempts) &&
    isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.incorrect) &&
    isProbability(value.accuracy) &&
    isNonNegativeNumber(value.activeTimeMs) &&
    isNonNegativeNumber(value.averageResponseTimeMs) &&
    isNonNegativeInteger(value.hintsUsed) &&
    isNonNegativeInteger(value.sessionsCount) &&
    isStringArray(value.skillIds) &&
    isStringArray(value.lessonIds) &&
    isTimestamp(value.firstAttemptAt) &&
    isTimestamp(value.lastAttemptAt)
  );
}

export function isSkillRollup(value: unknown): value is SkillRollup {
  if (!isRecord(value)) return false;
  return (
    typeof value.key === "string" &&
    typeof value.skillId === "string" &&
    isModality(value.modality) &&
    value.key === `${value.skillId}::${value.modality}` &&
    isNonNegativeInteger(value.attempts) &&
    isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.incorrect) &&
    isProbability(value.accuracy) &&
    isNonNegativeNumber(value.activeTimeMs) &&
    isNonNegativeNumber(value.averageResponseTimeMs) &&
    isNonNegativeInteger(value.hintsUsed) &&
    isNonNegativeInteger(value.sessionsCount) &&
    isNonNegativeInteger(value.daysPracticed) &&
    isNonNegativeInteger(value.currentCorrectStreak) &&
    isNonNegativeInteger(value.bestCorrectStreak) &&
    isTimestamp(value.firstAttemptAt) &&
    isTimestamp(value.lastAttemptAt) &&
    Array.isArray(value.errorPatterns) &&
    value.errorPatterns.every(isSkillErrorPattern)
  );
}

export function isFSRSCardSnapshot(value: unknown): value is FSRSCardSnapshot {
  if (!isRecord(value)) return false;
  return (
    isTimestamp(value.due) &&
    isNonNegativeNumber(value.stability) &&
    isNonNegativeNumber(value.difficulty) &&
    isNonNegativeNumber(value.elapsed_days) &&
    isNonNegativeNumber(value.scheduled_days) &&
    isNonNegativeInteger(value.reps) &&
    isNonNegativeInteger(value.lapses) &&
    (value.state === 0 || value.state === 1 || value.state === 2 || value.state === 3) &&
    (value.last_review === null || isTimestamp(value.last_review))
  );
}

export function isFSRS5Parameters(value: unknown): value is FSRS5Parameters {
  if (!isRecord(value)) return false;
  return (
    value.version === "fsrs-5" &&
    isProbability(value.request_retention) &&
    value.request_retention > 0 &&
    isNonNegativeInteger(value.maximum_interval) &&
    value.maximum_interval > 0 &&
    typeof value.enable_fuzz === "boolean" &&
    typeof value.enable_short_term === "boolean" &&
    Array.isArray(value.w) &&
    value.w.length === 19 &&
    value.w.every(isFiniteNumber)
  );
}

function isHoldoutFixedState(value: unknown): value is HoldoutFixedState {
  if (!isRecord(value)) return false;
  return (
    isTimestamp(value.anchorAt) &&
    Array.isArray(value.scheduleDays) &&
    value.scheduleDays.length === HOLDOUT_SCHEDULE_DAYS.length &&
    value.scheduleDays.every((day, index) => day === HOLDOUT_SCHEDULE_DAYS[index]) &&
    Array.isArray(value.completedDays) &&
    value.completedDays.every(isHoldoutScheduleDay)
  );
}

export function isMasteryRecord(value: unknown): value is MasteryRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.key === "string" &&
    typeof value.itemId === "string" &&
    value.itemId.trim() !== "" &&
    typeof value.skillId === "string" &&
    isModality(value.modality) &&
    value.key === `${value.itemId}::${value.modality}` &&
    isSchedulerKind(value.scheduler) &&
    value.scheduler === schedulerForItem(value.itemId) &&
    isTimestamp(value.firstSeenAt) &&
    isTimestamp(value.lastSeenAt) &&
    (value.lastReviewedAt === null || isTimestamp(value.lastReviewedAt)) &&
    isNonNegativeInteger(value.attempts) &&
    isNonNegativeInteger(value.correct) &&
    isProbability(value.accuracy) &&
    (value.operationalRecall === null || isProbability(value.operationalRecall)) &&
    ((value.scheduler === "holdout-fixed" &&
      value.fsrsCard === null &&
      value.fsrsParameters === null &&
      value.operationalRecall === null &&
      isHoldoutFixedState(value.holdout)) ||
      (value.scheduler === "fsrs-5" &&
        isFSRSCardSnapshot(value.fsrsCard) &&
        isFSRS5Parameters(value.fsrsParameters) &&
        value.holdout === null))
  );
}

export function isHoldoutAssignment(value: unknown): value is HoldoutAssignment {
  if (!isRecord(value)) return false;
  return (
    typeof value.itemId === "string" &&
    value.itemId.trim() !== "" &&
    typeof value.assigned === "boolean" &&
    isNonNegativeInteger(value.bucket) &&
    value.bucket < 100 &&
    value.targetRate === HOLDOUT_TARGET_RATE &&
    value.bucket === holdoutBucket(value.itemId) &&
    value.assigned === isHoldoutItem(value.itemId) &&
    Array.isArray(value.scheduleDays) &&
    value.scheduleDays.length === HOLDOUT_SCHEDULE_DAYS.length &&
    value.scheduleDays.every((day, index) => day === HOLDOUT_SCHEDULE_DAYS[index]) &&
    isTimestamp(value.firstSeenAt)
  );
}

export function isReviewEvent(value: unknown): value is ReviewEvent {
  if (!isRecord(value)) return false;
  const common =
    typeof value.id === "string" &&
    typeof value.itemId === "string" &&
    value.itemId.trim() !== "" &&
    typeof value.skillId === "string" &&
    isModality(value.modality) &&
    isSchedulerKind(value.scheduler) &&
    value.scheduler === schedulerForItem(value.itemId) &&
    isTimestamp(value.timestamp) &&
    isTimestamp(value.scheduledFor) &&
    (value.holdoutDay === null || isHoldoutScheduleDay(value.holdoutDay)) &&
    ((value.scheduler === "holdout-fixed" && value.holdoutDay !== null) ||
      (value.scheduler === "fsrs-5" && value.holdoutDay === null));
  if (!common) return false;
  if (value.type === "review_scheduled") {
    return isNullableString(value.sourceAttemptId);
  }
  if (value.type === "review_completed") {
    return (
      typeof value.scheduledEventId === "string" &&
      isNullableString(value.attemptId) &&
      typeof value.correct === "boolean" &&
      ((value.scheduler === "fsrs-5" && isFSRSRating(value.rating)) ||
        (value.scheduler === "holdout-fixed" && value.rating === null)) &&
      isNonNegativeNumber(value.responseTimeMs) &&
      (value.predictedOperationalRecall === null ||
        isProbability(value.predictedOperationalRecall))
    );
  }
  return false;
}

function isRecordOf<T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
): value is Record<string, T> {
  return isRecord(value) && Object.values(value).every(predicate);
}

function isMasteryMap(value: unknown): value is Record<MasteryKey, MasteryRecord> {
  return (
    isRecord(value) &&
    Object.entries(value).every(([key, record]) => isMasteryRecord(record) && record.key === key)
  );
}

export function isAnalyticsState(value: unknown): value is State {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === ANALYTICS_SCHEMA_VERSION &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    isNullableString(value.activeSessionId) &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isAttemptEvent) &&
    Array.isArray(value.sessions) &&
    value.sessions.every(isSessionRecord) &&
    isMasteryMap(value.mastery) &&
    isRecordOf(value.holdoutAssignments, isHoldoutAssignment) &&
    Array.isArray(value.reviewEvents) &&
    value.reviewEvents.every(isReviewEvent) &&
    isRecordOf(value.dailyRollups, isDailyRollup) &&
    isRecordOf(value.skillRollups, isSkillRollup)
  );
}

function toIso(value: string | Date | undefined, fallback = new Date()): string {
  const date = value === undefined ? fallback : value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("Invalid date or timestamp");
  return date.toISOString();
}

function requireText(value: string, field: string): string {
  const result = value.trim();
  if (!result) throw new TypeError(`${field} must be a non-empty string`);
  return result;
}

function requireNonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${field} must be a finite, non-negative number`);
  }
  return value;
}

function requireNonNegativeInteger(value: number, field: string): number {
  requireNonNegative(value, field);
  if (!Number.isInteger(value)) throw new TypeError(`${field} must be an integer`);
  return value;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueHoldoutDays(values: readonly HoldoutScheduleDay[]): HoldoutScheduleDay[] {
  return HOLDOUT_SCHEDULE_DAYS.filter((day) => values.includes(day));
}

function cloneJsonObject(value: JsonObject | undefined): JsonObject {
  if (value === undefined) return {};
  if (!isJsonObject(value)) throw new TypeError("metadata must contain JSON-safe values");
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function createId(prefix: string): string {
  const cryptoObject = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return `${prefix}_${cryptoObject.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

export function makeMasteryKey(itemId: string, modality: Modality): MasteryKey {
  if (!isModality(modality)) throw new TypeError("Invalid modality");
  return `${requireText(itemId, "itemId")}::${modality}`;
}

/** Stable FNV-1a bucket; assignment never depends on user progress or outcomes. */
export function holdoutBucket(itemId: string): number {
  const text = requireText(itemId, "itemId");
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function isHoldoutItem(itemId: string): boolean {
  return holdoutBucket(itemId) < Math.round(HOLDOUT_TARGET_RATE * 100);
}

export function schedulerForItem(itemId: string): SchedulerKind {
  return isHoldoutItem(itemId) ? "holdout-fixed" : "fsrs-5";
}

function addUtcDays(timestamp: string, days: number): string {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function cloneFSRSParameters(parameters: FSRS5Parameters): FSRS5Parameters {
  if (!isFSRS5Parameters(parameters)) throw new TypeError("Invalid FSRS-5 parameters");
  return { ...parameters, w: [...parameters.w] as FSRS5Weights };
}

function cloneFSRSCard(card: FSRSCardSnapshot): FSRSCardSnapshot {
  if (!isFSRSCardSnapshot(card)) throw new TypeError("Invalid FSRS card snapshot");
  return { ...card };
}

function emptyFSRSCard(now: string): FSRSCardSnapshot {
  return {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    last_review: null,
  };
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? clampProbability(numerator / denominator) : 0;
}

function compareTimestamps(a: { timestamp: string }, b: { timestamp: string }): number {
  return Date.parse(a.timestamp) - Date.parse(b.timestamp);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDayKey(value: string | Date, timeZone?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("Invalid date or timestamp");
  if (!timeZone) return localDateKey(date);

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (values.year && values.month && values.day) {
      return `${values.year}-${values.month}-${values.day}`;
    }
  } catch {
    // An invalid/unsupported time zone should not make analytics unusable.
  }
  return localDateKey(date);
}

function dayNumber(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function sortedAttempts(attempts: readonly AttemptEvent[]): AttemptEvent[] {
  return [...attempts].sort(compareTimestamps);
}

export function calculateAccuracy(
  attempts: readonly AttemptEvent[],
  predicate?: (attempt: AttemptEvent) => boolean,
): AccuracySummary {
  const selected = predicate ? attempts.filter(predicate) : attempts;
  const correct = selected.reduce((sum, attempt) => sum + Number(attempt.correct), 0);
  return {
    attempts: selected.length,
    correct,
    incorrect: selected.length - correct,
    accuracy: ratio(correct, selected.length),
  };
}

export function calculateStreak(
  attempts: readonly AttemptEvent[],
  referenceDate: string | Date = new Date(),
  timeZone?: string,
): StreakSummary {
  const activeDates = uniqueStrings(attempts.map((attempt) => toDayKey(attempt.timestamp, timeZone))).sort();
  if (activeDates.length === 0) {
    return { currentDays: 0, longestDays: 0, lastActiveDate: null, activeDates: [] };
  }

  let longestDays = 1;
  let run = 1;
  for (let index = 1; index < activeDates.length; index += 1) {
    if (dayNumber(activeDates[index]) - dayNumber(activeDates[index - 1]) === 1) {
      run += 1;
      longestDays = Math.max(longestDays, run);
    } else {
      run = 1;
    }
  }

  const today = dayNumber(toDayKey(referenceDate, timeZone));
  const last = dayNumber(activeDates[activeDates.length - 1]);
  const currentDays = today - last <= 1 && today - last >= 0 ? run : 0;
  return {
    currentDays,
    longestDays,
    lastActiveDate: activeDates[activeDates.length - 1],
    activeDates,
  };
}

export function calculateTimePerSkill(
  attempts: readonly AttemptEvent[],
): Record<string, SkillTimeSummary> {
  const buckets = new Map<
    string,
    { skillId: string; modality: Modality; activeTimeMs: number; attempts: number }
  >();
  for (const attempt of attempts) {
    const key = `${attempt.skillId}::${attempt.modality}`;
    const bucket = buckets.get(key) ?? {
      skillId: attempt.skillId,
      modality: attempt.modality,
      activeTimeMs: 0,
      attempts: 0,
    };
    bucket.activeTimeMs += attempt.responseTimeMs;
    bucket.attempts += 1;
    buckets.set(key, bucket);
  }
  return Object.fromEntries(
    [...buckets.entries()].map(([key, bucket]) => [
      key,
      {
        key,
        skillId: bucket.skillId,
        modality: bucket.modality,
        activeTimeMs: bucket.activeTimeMs,
        attempts: bucket.attempts,
        averageResponseTimeMs: bucket.attempts ? bucket.activeTimeMs / bucket.attempts : 0,
      },
    ]),
  );
}

export function calculateErrorPatterns(attempts: readonly AttemptEvent[]): ErrorPattern[] {
  const incorrect = attempts.filter((attempt) => !attempt.correct);
  const buckets = new Map<
    string,
    { count: number; skills: Set<string>; exerciseTypes: Set<string>; lastSeenAt: string }
  >();

  for (const attempt of incorrect) {
    const tags = attempt.errorTags.length ? uniqueStrings(attempt.errorTags) : ["unclassified"];
    for (const tag of tags) {
      const bucket = buckets.get(tag) ?? {
        count: 0,
        skills: new Set<string>(),
        exerciseTypes: new Set<string>(),
        lastSeenAt: attempt.timestamp,
      };
      bucket.count += 1;
      bucket.skills.add(attempt.skillId);
      bucket.exerciseTypes.add(attempt.exerciseType);
      if (Date.parse(attempt.timestamp) > Date.parse(bucket.lastSeenAt)) {
        bucket.lastSeenAt = attempt.timestamp;
      }
      buckets.set(tag, bucket);
    }
  }

  return [...buckets.entries()]
    .map(([tag, bucket]) => ({
      tag,
      count: bucket.count,
      shareOfIncorrectAttempts: ratio(bucket.count, incorrect.length),
      shareOfAllAttempts: ratio(bucket.count, attempts.length),
      skillIds: [...bucket.skills].sort(),
      exerciseTypes: [...bucket.exerciseTypes].sort(),
      lastSeenAt: bucket.lastSeenAt,
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function retentionPoint(
  events: readonly ReviewCompletedEvent[],
  scheduledDay: HoldoutScheduleDay,
): HoldoutRetentionPoint {
  const selected = events.filter((event) => event.holdoutDay === scheduledDay);
  const recalled = selected.reduce((sum, event) => sum + Number(event.correct), 0);
  const delayTotal = selected.reduce(
    (sum, event) => sum + (Date.parse(event.timestamp) - Date.parse(event.scheduledFor)) / 3_600_000,
    0,
  );
  return {
    scheduledDay,
    reviews: selected.length,
    recalled,
    estimate: selected.length ? clampProbability(recalled / selected.length) : null,
    meanDelayHours: selected.length ? delayTotal / selected.length : null,
  };
}

/**
 * Unbiased experimental estimate. Adaptive FSRS reviews are excluded by type,
 * not merely labelled differently, so they cannot leak into the curve.
 */
export function calculateHoldoutRetention(
  reviewEvents: readonly ReviewEvent[],
): HoldoutRetentionEstimate {
  const completed = reviewEvents.filter(
    (event): event is ReviewCompletedEvent =>
      event.type === "review_completed" &&
      event.scheduler === "holdout-fixed" &&
      event.holdoutDay !== null,
  );
  const recalled = completed.reduce((sum, event) => sum + Number(event.correct), 0);
  const modalities: Modality[] = ["read", "listen", "produce"];
  return {
    estimate: completed.length ? clampProbability(recalled / completed.length) : null,
    reviews: completed.length,
    recalled,
    curve: HOLDOUT_SCHEDULE_DAYS.map((day) => retentionPoint(completed, day)),
    byModality: Object.fromEntries(
      modalities.map((modality) => [
        modality,
        HOLDOUT_SCHEDULE_DAYS.map((day) =>
          retentionPoint(
            completed.filter((event) => event.modality === modality),
            day,
          ),
        ),
      ]),
    ) as Record<Modality, HoldoutRetentionPoint[]>,
  };
}

export function calculateOperationalRecall(
  mastery: Readonly<Record<string, MasteryRecord>> | readonly MasteryRecord[],
): OperationalRecallSummary {
  const records = Array.isArray(mastery) ? mastery : Object.values(mastery);
  const eligible = records.filter(
    (record) => record.scheduler === "fsrs-5" && record.operationalRecall !== null,
  );
  const summarize = (items: readonly MasteryRecord[]) => ({
    estimate: items.length
      ? items.reduce((sum, item) => sum + (item.operationalRecall ?? 0), 0) / items.length
      : null,
    items: items.length,
  });
  const modalities: Modality[] = ["read", "listen", "produce"];
  return {
    ...summarize(eligible),
    byModality: Object.fromEntries(
      modalities.map((modality) => [
        modality,
        summarize(eligible.filter((record) => record.modality === modality)),
      ]),
    ) as Record<Modality, { estimate: number | null; items: number }>,
  };
}

export function calculateDailyHistory(
  attempts: readonly AttemptEvent[],
  timeZone?: string,
): Record<string, DailyRollup> {
  const buckets = new Map<string, AttemptEvent[]>();
  for (const attempt of sortedAttempts(attempts)) {
    const key = toDayKey(attempt.timestamp, timeZone);
    const bucket = buckets.get(key) ?? [];
    bucket.push(attempt);
    buckets.set(key, bucket);
  }

  return Object.fromEntries(
    [...buckets.entries()].map(([date, dayAttempts]) => {
      const accuracy = calculateAccuracy(dayAttempts);
      const activeTimeMs = dayAttempts.reduce((sum, attempt) => sum + attempt.responseTimeMs, 0);
      const value: DailyRollup = {
        date,
        ...accuracy,
        activeTimeMs,
        averageResponseTimeMs: dayAttempts.length ? activeTimeMs / dayAttempts.length : 0,
        hintsUsed: dayAttempts.reduce((sum, attempt) => sum + attempt.hintsUsed, 0),
        sessionsCount: new Set(
          dayAttempts.map((attempt) => attempt.sessionId).filter((id): id is string => id !== null),
        ).size,
        skillIds: uniqueStrings(dayAttempts.map((attempt) => attempt.skillId)).sort(),
        lessonIds: uniqueStrings(
          dayAttempts.map((attempt) => attempt.lessonId).filter((id): id is string => id !== null),
        ).sort(),
        firstAttemptAt: dayAttempts[0].timestamp,
        lastAttemptAt: dayAttempts[dayAttempts.length - 1].timestamp,
      };
      return [date, value];
    }),
  );
}

function correctStreaks(attempts: readonly AttemptEvent[]): { current: number; best: number } {
  let current = 0;
  let best = 0;
  for (const attempt of sortedAttempts(attempts)) {
    current = attempt.correct ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { current, best };
}

export function calculateSkillRollups(
  attempts: readonly AttemptEvent[],
  timeZone?: string,
): Record<string, SkillRollup> {
  const buckets = new Map<string, AttemptEvent[]>();
  for (const attempt of sortedAttempts(attempts)) {
    const key = `${attempt.skillId}::${attempt.modality}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(attempt);
    buckets.set(key, bucket);
  }

  return Object.fromEntries(
    [...buckets.entries()].map(([key, skillAttempts]) => {
      const { skillId, modality } = skillAttempts[0];
      const accuracy = calculateAccuracy(skillAttempts);
      const activeTimeMs = skillAttempts.reduce((sum, attempt) => sum + attempt.responseTimeMs, 0);
      const streaks = correctStreaks(skillAttempts);
      const patterns = calculateErrorPatterns(skillAttempts).map<SkillErrorPattern>((pattern) => ({
        tag: pattern.tag,
        count: pattern.count,
        shareOfIncorrectAttempts: pattern.shareOfIncorrectAttempts,
        lastSeenAt: pattern.lastSeenAt,
      }));
      const value: SkillRollup = {
        key,
        skillId,
        modality,
        ...accuracy,
        activeTimeMs,
        averageResponseTimeMs: skillAttempts.length ? activeTimeMs / skillAttempts.length : 0,
        hintsUsed: skillAttempts.reduce((sum, attempt) => sum + attempt.hintsUsed, 0),
        sessionsCount: new Set(
          skillAttempts.map((attempt) => attempt.sessionId).filter((id): id is string => id !== null),
        ).size,
        daysPracticed: new Set(
          skillAttempts.map((attempt) => toDayKey(attempt.timestamp, timeZone)),
        ).size,
        currentCorrectStreak: streaks.current,
        bestCorrectStreak: streaks.best,
        firstAttemptAt: skillAttempts[0].timestamp,
        lastAttemptAt: skillAttempts[skillAttempts.length - 1].timestamp,
        errorPatterns: patterns,
      };
      return [key, value];
    }),
  );
}

function withDerivedState(
  state: Omit<State, "dailyRollups" | "skillRollups">,
  timeZone?: string,
): State {
  return {
    ...state,
    dailyRollups: calculateDailyHistory(state.attempts, timeZone),
    skillRollups: calculateSkillRollups(state.attempts, timeZone),
  };
}

export function createEmptyAnalyticsState(now: string | Date = new Date()): State {
  const timestamp = toIso(now instanceof Date ? now : now);
  return {
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    activeSessionId: null,
    attempts: [],
    sessions: [],
    mastery: {},
    holdoutAssignments: {},
    reviewEvents: [],
    dailyRollups: {},
    skillRollups: {},
  };
}

export const createInitialAnalyticsState = createEmptyAnalyticsState;

function normalizedLoadedState(value: unknown): State | null {
  if (!isRecord(value)) return null;
  if (
    value.schemaVersion !== ANALYTICS_SCHEMA_VERSION ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    !isNullableString(value.activeSessionId) ||
    !Array.isArray(value.attempts) ||
    !value.attempts.every(isAttemptEvent) ||
    !Array.isArray(value.sessions) ||
    !value.sessions.every(isSessionRecord) ||
    !isMasteryMap(value.mastery) ||
    !isRecordOf(value.holdoutAssignments, isHoldoutAssignment) ||
    !Array.isArray(value.reviewEvents) ||
    !value.reviewEvents.every(isReviewEvent)
  ) {
    return null;
  }

  const sessions = value.sessions as SessionRecord[];
  const activeSessionId =
    value.activeSessionId &&
    sessions.some((session) => session.id === value.activeSessionId && session.endedAt === null)
      ? value.activeSessionId
      : null;

  return withDerivedState({
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    activeSessionId,
    attempts: [...(value.attempts as AttemptEvent[])],
    sessions: [...sessions],
    mastery: { ...(value.mastery as Record<MasteryKey, MasteryRecord>) },
    holdoutAssignments: {
      ...(value.holdoutAssignments as Record<string, HoldoutAssignment>),
    },
    reviewEvents: [...(value.reviewEvents as ReviewEvent[])],
  });
}

export function parseAnalyticsState(serialized: string): State | null {
  try {
    return normalizedLoadedState(JSON.parse(serialized) as unknown);
  } catch {
    return null;
  }
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadAnalyticsState(options: StorageOptions = {}): State {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const key = options.key ?? ANALYTICS_STORAGE_KEY;
  if (!storage) return createEmptyAnalyticsState();
  try {
    const serialized = storage.getItem(key);
    return serialized ? parseAnalyticsState(serialized) ?? createEmptyAnalyticsState() : createEmptyAnalyticsState();
  } catch {
    return createEmptyAnalyticsState();
  }
}

export function saveAnalyticsState(state: State, options: StorageOptions = {}): boolean {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  if (!storage) return false;
  const normalized = normalizedLoadedState(state);
  if (!normalized) return false;
  try {
    storage.setItem(options.key ?? ANALYTICS_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function clearAnalyticsState(options: StorageOptions = {}): boolean {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  if (!storage?.removeItem) return false;
  try {
    storage.removeItem(options.key ?? ANALYTICS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export const loadState = loadAnalyticsState;
export const saveState = saveAnalyticsState;

export function startSession(state: State, input: StartSessionInput = {}): MutationResult<SessionRecord> {
  const startedAt = toIso(input.startedAt);
  let baseState = state;

  if (state.activeSessionId) {
    baseState = endSession(state, {
      sessionId: state.activeSessionId,
      endedAt: startedAt,
      reason: "superseded",
    }).state;
  }

  const session: SessionRecord = {
    id: input.id ? requireText(input.id, "id") : createId("session"),
    startedAt,
    endedAt: null,
    lastActivityAt: startedAt,
    durationMs: 0,
    activeTimeMs: 0,
    attemptCount: 0,
    correctCount: 0,
    accuracy: 0,
    skillIds: [],
    levelId: input.levelId ?? null,
    mode: input.mode?.trim() || "practice",
    endReason: null,
    metadata: cloneJsonObject(input.metadata),
  };
  if (baseState.sessions.some((item) => item.id === session.id)) {
    throw new Error(`Session id already exists: ${session.id}`);
  }

  return {
    state: withDerivedState({
      ...baseState,
      updatedAt: startedAt,
      activeSessionId: session.id,
      sessions: [...baseState.sessions, session],
    }),
    value: session,
  };
}

export function endSession(state: State, input: EndSessionInput = {}): MutationResult<SessionRecord> {
  const sessionId = input.sessionId ?? state.activeSessionId;
  if (!sessionId) throw new Error("There is no active session to end");
  const index = state.sessions.findIndex((session) => session.id === sessionId);
  if (index < 0) throw new Error(`Unknown session: ${sessionId}`);

  const original = state.sessions[index];
  if (original.endedAt) {
    return { state, value: original };
  }
  const endedAt = toIso(input.endedAt);
  const durationMs = Math.max(0, Date.parse(endedAt) - Date.parse(original.startedAt));
  const session: SessionRecord = {
    ...original,
    endedAt,
    lastActivityAt:
      Date.parse(original.lastActivityAt) > Date.parse(endedAt) ? original.lastActivityAt : endedAt,
    durationMs,
    endReason: input.reason?.trim() || "completed",
  };
  const sessions = [...state.sessions];
  sessions[index] = session;
  return {
    state: withDerivedState({
      ...state,
      updatedAt: endedAt,
      activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      sessions,
    }),
    value: session,
  };
}

function createMasteryRecord(event: AttemptEvent): MasteryRecord {
  const key = makeMasteryKey(event.itemId, event.modality);
  const common: MasteryRecordBase = {
    key,
    itemId: event.itemId,
    skillId: event.skillId,
    modality: event.modality,
    firstSeenAt: event.timestamp,
    lastSeenAt: event.timestamp,
    lastReviewedAt: null,
    attempts: 1,
    correct: Number(event.correct),
    accuracy: Number(event.correct),
  };
  if (event.scheduler === "holdout-fixed") {
    return {
      ...common,
      scheduler: "holdout-fixed",
      operationalRecall: null,
      fsrsCard: null,
      fsrsParameters: null,
      holdout: {
        anchorAt: event.timestamp,
        scheduleDays: [...HOLDOUT_SCHEDULE_DAYS],
        completedDays: [],
      },
    };
  }
  return {
    ...common,
    scheduler: "fsrs-5",
    operationalRecall: null,
    fsrsCard: emptyFSRSCard(event.timestamp),
    fsrsParameters: cloneFSRSParameters(DEFAULT_FSRS5_PARAMETERS),
    holdout: null,
  };
}

function createFixedScheduleEvents(event: AttemptEvent): ReviewScheduledEvent[] {
  if (event.scheduler !== "holdout-fixed") return [];
  return HOLDOUT_SCHEDULE_DAYS.map((holdoutDay) => ({
    id: createId("review"),
    type: "review_scheduled",
    itemId: event.itemId,
    skillId: event.skillId,
    modality: event.modality,
    scheduler: "holdout-fixed",
    timestamp: event.timestamp,
    scheduledFor: addUtcDays(event.timestamp, holdoutDay),
    holdoutDay,
    sourceAttemptId: event.id,
  }));
}

export function updateMastery(
  state: State,
  input: MasteryUpdateInput,
): MutationResult<MasteryRecord> {
  const key = makeMasteryKey(input.itemId, input.modality);
  const original = state.mastery[key];
  if (!original) throw new Error(`Unknown mastery item: ${key}`);
  if (original.scheduler !== "fsrs-5") {
    throw new Error("Holdout mastery cannot be updated by the operational FSRS scheduler");
  }
  if (original.skillId !== input.skillId) {
    throw new Error(`Mastery skill mismatch for ${key}`);
  }
  const updatedAt = toIso(input.updatedAt);
  const operationalRecall = input.operationalRecall;
  if (operationalRecall !== null && !isProbability(operationalRecall)) {
    throw new TypeError("operationalRecall must be null or between 0 and 1");
  }
  const value: MasteryRecord = {
    ...original,
    lastSeenAt:
      Date.parse(updatedAt) > Date.parse(original.lastSeenAt) ? updatedAt : original.lastSeenAt,
    operationalRecall,
    fsrsCard: cloneFSRSCard(input.fsrsCard),
    fsrsParameters: cloneFSRSParameters(input.fsrsParameters),
  };
  return {
    state: {
      ...state,
      updatedAt,
      mastery: { ...state.mastery, [key]: value },
    },
    value,
  };
}

export function recordReviewScheduled(
  state: State,
  input: ReviewScheduledInput,
): MutationResult<ReviewScheduledEvent> {
  const itemId = requireText(input.itemId, "itemId");
  const skillId = requireText(input.skillId, "skillId");
  const key = makeMasteryKey(itemId, input.modality);
  const mastery = state.mastery[key];
  if (!mastery) throw new Error(`Unknown mastery item: ${key}`);
  if (mastery.skillId !== skillId) throw new Error(`Mastery skill mismatch for ${key}`);
  const scheduler = schedulerForItem(itemId);
  const timestamp = toIso(input.timestamp);

  let scheduledFor: string;
  let holdoutDay: HoldoutScheduleDay | null = null;
  if (scheduler === "holdout-fixed") {
    if (!input.holdoutDay || !isHoldoutScheduleDay(input.holdoutDay)) {
      throw new Error("A holdout review must use one of the fixed 1/3/7/14-day points");
    }
    holdoutDay = input.holdoutDay;
    scheduledFor = addUtcDays(mastery.firstSeenAt, holdoutDay);
    if (input.scheduledFor && toIso(input.scheduledFor) !== scheduledFor) {
      throw new Error("Holdout review time is fixed relative to the first exposure");
    }
  } else {
    if (!input.scheduledFor) {
      throw new Error("FSRS review time must be supplied by the external FSRS-5 scheduler");
    }
    scheduledFor = toIso(input.scheduledFor);
  }

  const duplicate = state.reviewEvents.some(
    (event) =>
      event.type === "review_scheduled" &&
      event.itemId === itemId &&
      event.modality === input.modality &&
      event.scheduler === scheduler &&
      event.scheduledFor === scheduledFor,
  );
  if (duplicate) throw new Error(`Review is already scheduled for ${key} at ${scheduledFor}`);
  if (input.sourceAttemptId) {
    const source = state.attempts.find((attempt) => attempt.id === input.sourceAttemptId);
    if (!source || source.itemId !== itemId || source.modality !== input.modality) {
      throw new Error("sourceAttemptId must reference the same item and modality");
    }
  }

  const value: ReviewScheduledEvent = {
    id: input.id ? requireText(input.id, "id") : createId("review"),
    type: "review_scheduled",
    itemId,
    skillId,
    modality: input.modality,
    scheduler,
    timestamp,
    scheduledFor,
    holdoutDay,
    sourceAttemptId: input.sourceAttemptId ?? null,
  };
  if (state.reviewEvents.some((event) => event.id === value.id)) {
    throw new Error(`Review event id already exists: ${value.id}`);
  }
  return {
    state: { ...state, updatedAt: timestamp, reviewEvents: [...state.reviewEvents, value] },
    value,
  };
}

export function recordReviewCompleted(
  state: State,
  input: ReviewCompletedInput,
): MutationResult<ReviewCompletedEvent> {
  const scheduled = state.reviewEvents.find(
    (event): event is ReviewScheduledEvent =>
      event.id === input.scheduledEventId && event.type === "review_scheduled",
  );
  if (!scheduled) throw new Error(`Unknown scheduled review: ${input.scheduledEventId}`);
  if (
    state.reviewEvents.some(
      (event) =>
        event.type === "review_completed" && event.scheduledEventId === input.scheduledEventId,
    )
  ) {
    throw new Error(`Scheduled review is already completed: ${input.scheduledEventId}`);
  }
  let rating: FSRSRating | null = null;
  if (scheduled.scheduler === "fsrs-5") {
    if (!isFSRSRating(input.rating)) {
      throw new TypeError("An FSRS review rating must be 1, 2, 3, or 4");
    }
    rating = input.rating;
  } else if (input.rating !== undefined && input.rating !== null) {
    throw new Error("Holdout outcomes must not be converted into FSRS ratings");
  }
  const completedAt = toIso(input.completedAt);
  if (
    scheduled.scheduler === "holdout-fixed" &&
    Date.parse(completedAt) < Date.parse(scheduled.scheduledFor)
  ) {
    throw new Error("A holdout review cannot be completed before its fixed due time");
  }
  const predicted = input.predictedOperationalRecall ?? null;
  if (predicted !== null && !isProbability(predicted)) {
    throw new TypeError("predictedOperationalRecall must be null or between 0 and 1");
  }

  const value: ReviewCompletedEvent = {
    id: input.id ? requireText(input.id, "id") : createId("review"),
    type: "review_completed",
    itemId: scheduled.itemId,
    skillId: scheduled.skillId,
    modality: scheduled.modality,
    scheduler: scheduled.scheduler,
    timestamp: completedAt,
    scheduledFor: scheduled.scheduledFor,
    holdoutDay: scheduled.holdoutDay,
    scheduledEventId: scheduled.id,
    attemptId: input.attemptId ?? null,
    correct: input.correct,
    rating,
    responseTimeMs: requireNonNegative(input.responseTimeMs, "responseTimeMs"),
    predictedOperationalRecall: scheduled.scheduler === "fsrs-5" ? predicted : null,
  };
  if (state.reviewEvents.some((event) => event.id === value.id)) {
    throw new Error(`Review event id already exists: ${value.id}`);
  }
  if (input.attemptId) {
    const attempt = state.attempts.find((candidate) => candidate.id === input.attemptId);
    if (
      !attempt ||
      attempt.itemId !== scheduled.itemId ||
      attempt.modality !== scheduled.modality
    ) {
      throw new Error("attemptId must reference the same reviewed item and modality");
    }
  }

  const key = makeMasteryKey(scheduled.itemId, scheduled.modality);
  const original = state.mastery[key];
  if (!original) throw new Error(`Unknown mastery item: ${key}`);
  if (
    original.scheduler === "holdout-fixed" &&
    (input.fsrsCardAfter !== undefined ||
      input.fsrsParameters !== undefined ||
      input.operationalRecallAfter !== undefined)
  ) {
    throw new Error("Holdout reviews cannot update operational FSRS state");
  }
  const holdout =
    original.holdout && scheduled.holdoutDay !== null
      ? {
          ...original.holdout,
          completedDays: uniqueHoldoutDays([
            ...original.holdout.completedDays,
            scheduled.holdoutDay,
          ]),
        }
      : original.holdout;
  const operationalRecallAfter =
    input.operationalRecallAfter === undefined
      ? original.operationalRecall
      : input.operationalRecallAfter;
  if (operationalRecallAfter !== null && !isProbability(operationalRecallAfter)) {
    throw new TypeError("operationalRecallAfter must be null or between 0 and 1");
  }
  const lastSeenAt =
    Date.parse(completedAt) > Date.parse(original.lastSeenAt)
      ? completedAt
      : original.lastSeenAt;
  const mastery: MasteryRecord =
    original.scheduler === "holdout-fixed"
      ? {
          ...original,
          lastReviewedAt: completedAt,
          lastSeenAt,
          holdout: holdout ?? original.holdout,
        }
      : {
          ...original,
          lastReviewedAt: completedAt,
          lastSeenAt,
          operationalRecall: operationalRecallAfter,
          fsrsCard: input.fsrsCardAfter
            ? cloneFSRSCard(input.fsrsCardAfter)
            : original.fsrsCard,
          fsrsParameters: input.fsrsParameters
            ? cloneFSRSParameters(input.fsrsParameters)
            : original.fsrsParameters,
        };
  return {
    state: {
      ...state,
      updatedAt: completedAt,
      mastery: { ...state.mastery, [key]: mastery },
      reviewEvents: [...state.reviewEvents, value],
    },
    value,
  };
}

export function recordAttempt(state: State, input: AttemptInput): MutationResult<AttemptEvent> {
  const timestamp = toIso(input.timestamp);
  const sessionId = input.sessionId === undefined ? state.activeSessionId : input.sessionId;
  const sessionIndex = sessionId
    ? state.sessions.findIndex((session) => session.id === sessionId)
    : -1;
  if (sessionId && sessionIndex < 0) throw new Error(`Unknown session: ${sessionId}`);
  if (sessionIndex >= 0 && state.sessions[sessionIndex].endedAt) {
    throw new Error(`Cannot record an attempt in ended session: ${sessionId}`);
  }

  const itemId = requireText(input.itemId, "itemId");
  if (!isModality(input.modality)) throw new TypeError("Invalid modality");
  const event: AttemptEvent = {
    id: input.id ? requireText(input.id, "id") : createId("attempt"),
    sessionId,
    timestamp,
    itemId,
    skillId: requireText(input.skillId, "skillId"),
    modality: input.modality,
    scheduler: schedulerForItem(itemId),
    lessonId: input.lessonId ?? null,
    levelId: input.levelId ?? null,
    exerciseId: requireText(input.exerciseId, "exerciseId"),
    exerciseType: requireText(input.exerciseType, "exerciseType"),
    prompt: input.prompt ?? null,
    userAnswer: input.userAnswer ?? null,
    expectedAnswer: input.expectedAnswer ?? null,
    correct: input.correct,
    responseTimeMs: requireNonNegative(input.responseTimeMs, "responseTimeMs"),
    hintsUsed: requireNonNegativeInteger(input.hintsUsed ?? 0, "hintsUsed"),
    attemptNumber: requireNonNegativeInteger(input.attemptNumber ?? 1, "attemptNumber"),
    difficulty:
      input.difficulty === undefined || input.difficulty === null
        ? null
        : requireNonNegative(input.difficulty, "difficulty"),
    errorTags: uniqueStrings(input.errorTags ?? []),
    tags: uniqueStrings(input.tags ?? []),
    metadata: cloneJsonObject(input.metadata),
  };
  if (state.attempts.some((attempt) => attempt.id === event.id)) {
    throw new Error(`Attempt id already exists: ${event.id}`);
  }

  const key = makeMasteryKey(event.itemId, event.modality);
  const previousMastery = state.mastery[key];
  if (previousMastery && previousMastery.skillId !== event.skillId) {
    throw new Error(`Mastery skill mismatch for ${key}`);
  }
  const masteryRecord = previousMastery
    ? {
        ...previousMastery,
        lastSeenAt: event.timestamp,
        attempts: previousMastery.attempts + 1,
        correct: previousMastery.correct + Number(event.correct),
        accuracy: ratio(
          previousMastery.correct + Number(event.correct),
          previousMastery.attempts + 1,
        ),
      }
    : createMasteryRecord(event);
  const assignment: HoldoutAssignment = state.holdoutAssignments[event.itemId] ?? {
    itemId: event.itemId,
    assigned: event.scheduler === "holdout-fixed",
    bucket: holdoutBucket(event.itemId),
    targetRate: HOLDOUT_TARGET_RATE,
    scheduleDays: [...HOLDOUT_SCHEDULE_DAYS],
    firstSeenAt: event.timestamp,
  };
  const fixedEvents = previousMastery ? [] : createFixedScheduleEvents(event);

  const sessions = [...state.sessions];
  if (sessionIndex >= 0) {
    const original = sessions[sessionIndex];
    const attemptCount = original.attemptCount + 1;
    const correctCount = original.correctCount + Number(event.correct);
    sessions[sessionIndex] = {
      ...original,
      lastActivityAt:
        Date.parse(event.timestamp) > Date.parse(original.lastActivityAt)
          ? event.timestamp
          : original.lastActivityAt,
      activeTimeMs: original.activeTimeMs + event.responseTimeMs,
      attemptCount,
      correctCount,
      accuracy: ratio(correctCount, attemptCount),
      skillIds: uniqueStrings([...original.skillIds, event.skillId]).sort(),
    };
  }

  return {
    state: withDerivedState({
      ...state,
      updatedAt: timestamp,
      attempts: [...state.attempts, event],
      sessions,
      mastery: { ...state.mastery, [key]: masteryRecord },
      holdoutAssignments: {
        ...state.holdoutAssignments,
        [event.itemId]: assignment,
      },
      reviewEvents: [...state.reviewEvents, ...fixedEvents],
    }),
    value: event,
  };
}

export function startStoredSession(
  input: StartSessionInput = {},
  options: StorageOptions = {},
): MutationResult<SessionRecord> {
  const result = startSession(loadAnalyticsState(options), input);
  saveAnalyticsState(result.state, options);
  return result;
}

export function recordStoredAttempt(
  input: AttemptInput,
  options: StorageOptions = {},
): MutationResult<AttemptEvent> {
  const result = recordAttempt(loadAnalyticsState(options), input);
  saveAnalyticsState(result.state, options);
  return result;
}

export function endStoredSession(
  input: EndSessionInput = {},
  options: StorageOptions = {},
): MutationResult<SessionRecord> {
  const result = endSession(loadAnalyticsState(options), input);
  saveAnalyticsState(result.state, options);
  return result;
}

export function buildAnalyticsSummary(
  state: State,
  timeZone?: string,
  generatedAt: string | Date = new Date(),
): AnalyticsSummary {
  const attempts = sortedAttempts(state.attempts);
  return {
    generatedAt: toIso(generatedAt instanceof Date ? generatedAt : generatedAt),
    firstAttemptAt: attempts[0]?.timestamp ?? null,
    lastAttemptAt: attempts[attempts.length - 1]?.timestamp ?? null,
    accuracy: calculateAccuracy(attempts),
    activeTimeMs: attempts.reduce((sum, attempt) => sum + attempt.responseTimeMs, 0),
    sessions: state.sessions.length,
    completedSessions: state.sessions.filter((session) => session.endedAt !== null).length,
    skillsPracticed: new Set(attempts.map((attempt) => attempt.skillId).filter(Boolean)).size,
    practiceDays: new Set(attempts.map((attempt) => toDayKey(attempt.timestamp, timeZone))).size,
    streak: calculateStreak(attempts, generatedAt, timeZone),
    operationalRecall: calculateOperationalRecall(state.mastery),
    holdoutRetention: calculateHoldoutRetention(state.reviewEvents),
  };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T extends object>(rows: readonly T[], columns?: readonly (keyof T)[]): string {
  const selectedColumns = columns
    ? [...columns]
    : (uniqueStrings(rows.flatMap((row) => Object.keys(row))) as (keyof T)[]);
  const lines = [selectedColumns.map((column) => csvCell(String(column))).join(",")];
  for (const row of rows) {
    lines.push(selectedColumns.map((column) => csvCell(row[column])).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function buildAnalyticsExportFiles(
  state: State,
  options: Pick<ExportOptions, "timeZone"> = {},
): AnalyticsExportFile[] {
  const attempts = sortedAttempts(state.attempts);
  const sessions = [...state.sessions].sort(
    (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt),
  );
  const dailyRollups = Object.values(calculateDailyHistory(attempts, options.timeZone)).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const skillRollups = Object.values(calculateSkillRollups(attempts, options.timeZone)).sort((a, b) =>
    a.skillId.localeCompare(b.skillId),
  );
  const errorPatterns = calculateErrorPatterns(attempts);
  const mastery = Object.values(state.mastery).sort((a, b) => a.key.localeCompare(b.key));
  const assignments = Object.values(state.holdoutAssignments).sort((a, b) =>
    a.itemId.localeCompare(b.itemId),
  );
  const reviews = [...state.reviewEvents].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  const holdoutReviews = reviews.filter((event) => event.scheduler === "holdout-fixed");
  const holdoutRetention = calculateHoldoutRetention(holdoutReviews);
  const holdoutCurveRows = [
    ...holdoutRetention.curve.map((point) => ({ modality: "all", ...point })),
    ...(["read", "listen", "produce"] as const).flatMap((modality) =>
      holdoutRetention.byModality[modality].map((point) => ({ modality, ...point })),
    ),
  ];
  const summary = buildAnalyticsSummary(state, options.timeZone);

  const json = "application/json;charset=utf-8";
  const csv = "text/csv;charset=utf-8";
  return [
    { name: "summary.json", mimeType: json, content: prettyJson(summary) },
    { name: "attempts.json", mimeType: json, content: prettyJson(attempts) },
    { name: "attempts.csv", mimeType: csv, content: toCsv(attempts) },
    { name: "sessions.json", mimeType: json, content: prettyJson(sessions) },
    { name: "sessions.csv", mimeType: csv, content: toCsv(sessions) },
    { name: "daily-history.json", mimeType: json, content: prettyJson(dailyRollups) },
    { name: "daily-history.csv", mimeType: csv, content: toCsv(dailyRollups) },
    { name: "skill-rollups.json", mimeType: json, content: prettyJson(skillRollups) },
    { name: "skill-rollups.csv", mimeType: csv, content: toCsv(skillRollups) },
    { name: "error-patterns.json", mimeType: json, content: prettyJson(errorPatterns) },
    { name: "error-patterns.csv", mimeType: csv, content: toCsv(errorPatterns) },
    { name: "mastery.json", mimeType: json, content: prettyJson(mastery) },
    { name: "mastery.csv", mimeType: csv, content: toCsv(mastery) },
    { name: "reviews.json", mimeType: json, content: prettyJson(reviews) },
    { name: "reviews.csv", mimeType: csv, content: toCsv(reviews) },
    {
      name: "holdout-assignments.json",
      mimeType: json,
      content: prettyJson(assignments),
    },
    { name: "holdout-assignments.csv", mimeType: csv, content: toCsv(assignments) },
    { name: "holdout-reviews.json", mimeType: json, content: prettyJson(holdoutReviews) },
    { name: "holdout-reviews.csv", mimeType: csv, content: toCsv(holdoutReviews) },
    {
      name: "holdout-retention.json",
      mimeType: json,
      content: prettyJson(holdoutRetention),
    },
    { name: "holdout-retention.csv", mimeType: csv, content: toCsv(holdoutCurveRows) },
  ];
}

export function canUseDirectoryExport(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as WindowWithDirectoryPicker).showDirectoryPicker === "function";
}

function exportFolderName(prefix: string): string {
  const safePrefix = prefix.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${safePrefix || "analytics"}-${timestamp}`;
}

export async function saveAnalyticsFilesToDirectory(
  files: readonly AnalyticsExportFile[],
  directoryHandle?: FileSystemDirectoryHandleLike,
  options: Pick<ExportOptions, "createSubdirectory" | "folderPrefix"> = {},
): Promise<{ fileNames: string[]; folderName: string | null }> {
  let root = directoryHandle;
  if (!root) {
    if (typeof window === "undefined") throw new Error("Directory export requires a browser");
    const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
    if (!picker) throw new Error("File System Access API is not available in this browser");
    root = await picker({ id: "dansk-analytics-export", mode: "readwrite" });
  }

  let target = root;
  let folderName: string | null = null;
  if (options.createSubdirectory !== false && root.getDirectoryHandle) {
    folderName = exportFolderName(options.folderPrefix ?? "dansk-analytics");
    target = await root.getDirectoryHandle(folderName, { create: true });
  }

  for (const file of files) {
    const handle = await target.getFileHandle(file.name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(new Blob([file.content], { type: file.mimeType }));
    await writable.close();
  }
  return { fileNames: files.map((file) => file.name), folderName };
}

export function downloadAnalyticsFiles(files: readonly AnalyticsExportFile[]): string[] {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("File downloads require a browser");
  }
  const names: string[] = [];
  for (const file of files) {
    const url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    names.push(file.name);
  }
  return names;
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
    (isRecord(error) && error.name === "AbortError")
  );
}

export async function exportDetailedAnalytics(
  state: State,
  options: ExportOptions = {},
): Promise<ExportResult> {
  const files = buildAnalyticsExportFiles(state, options);
  const method = options.method ?? "auto";
  const useDirectory =
    method === "directory" ||
    (method === "auto" && (Boolean(options.directoryHandle) || canUseDirectoryExport()));

  if (useDirectory) {
    try {
      const result = await saveAnalyticsFilesToDirectory(files, options.directoryHandle, options);
      return { method: "directory", ...result };
    } catch (error) {
      if (isAbortError(error)) {
        return { method: "cancelled", fileNames: [], folderName: null };
      }
      if (options.fallbackToDownload === false) throw error;
    }
  }

  return {
    method: "download",
    fileNames: downloadAnalyticsFiles(files),
    folderName: null,
  };
}
