// Authoring types for Grammatikskolen. Content files describe exercises with a
// small inline markup (see markup.ts) instead of token indices, so sentences can
// be written and reviewed as plain Danish and the engine derives the rest.

/**
 * Fields of the Danish sentence schema (Diderichsen's sætningsskema).
 * C = coordinating connector (og/men/for/eller/så), k = subordinator,
 * F = front field, v = finite verb, n = subject, a = sentence adverbial,
 * V = non-finite verbs, N = objects/predicatives, A = other adverbials.
 */
export type GrammarField = "C" | "k" | "F" | "v" | "n" | "a" | "V" | "N" | "A";

/** main = F v n a V N A · coord = C F v n a V N A · sub = k n a v V N A */
export type SortSchema = "main" | "coord" | "sub";

export type ItemLevel = 1 | 2 | 3;

export type ItemKind = "choice" | "multi" | "tap" | "build" | "slot" | "type" | "sort" | "judge" | "proof";

interface ItemSpecBase {
  /** Unique inside its lesson, e.g. "v2-07". */
  id: string;
  /** First entry = the rule the item mainly trains; later entries = earlier rules it also needs. */
  rules: string[];
  level: ItemLevel;
  /** Short Danish instruction. */
  prompt: string;
  /** Optional English help line: translation of the sentence or of the task. */
  en?: string;
  /** English explanation shown after answering. Danish words in quotes or italics are fine. */
  explain: string;
}

/** One correct option among 2–3 plausible wrong ones. */
export interface ChoiceSpec extends ItemSpecBase {
  kind: "choice";
  /** Optional context line shown above the options, e.g. a cloze "Jeg ved ikke, ___ han kommer." */
  sentence?: string;
  correct: string;
  wrong: string[];
}

/** Select every correct option (1–3 correct, 4–5 options in total). */
export interface MultiSpec extends ItemSpecBase {
  kind: "multi";
  correct: string[];
  wrong: string[];
}

/** Tap the [bracketed] targets. Words are split on spaces; use " | " to define multi-word chunks. */
export interface TapSpec extends ItemSpecBase {
  kind: "tap";
  text: string;
}

/** Order chunks separated by " | ". `alt` lists other correct orders of the same chunks. */
export interface BuildSpec extends ItemSpecBase {
  kind: "build";
  answer: string;
  alt?: string[];
  /** Distractor chunks that do not belong in the sentence. */
  extra?: string[];
  /** Pre-place the first chunk of `answer` (for "Begynd med …" tasks). */
  lockFirst?: boolean;
  /** Keep the capital letter of the first chunk (proper nouns, the pronoun I). */
  keepCase?: boolean;
}

/** Insert `word` where the ^ marker is. ~ marks other acceptable positions. */
export interface SlotSpec extends ItemSpecBase {
  kind: "slot";
  word: string;
  text: string;
}

/** Type the word(s) for the ___ blank. */
export interface TypeSpec extends ItemSpecBase {
  kind: "type";
  text: string;
  accept: string[];
}

/** Assign each " | " chunk to a field of the schema. */
export interface SortSpec extends ItemSpecBase {
  kind: "sort";
  schema: SortSchema;
  text: string;
  fields: GrammarField[];
}

/** Correct or not? Mark at most one error as [wrong]{right}; no markup means the sentence is correct. */
export interface JudgeSpec extends ItemSpecBase {
  kind: "judge";
  text: string;
}

/** Proofread a short text with 2–5 [wrong]{right} errors; one English note per error, in order. */
export interface ProofSpec extends ItemSpecBase {
  kind: "proof";
  text: string;
  notes: string[];
}

export type ItemSpec = ChoiceSpec | MultiSpec | TapSpec | BuildSpec | SlotSpec | TypeSpec | SortSpec | JudgeSpec | ProofSpec;

export interface TheoryExample {
  /** Danish example. May colour fields inline: "{F:I dag} {v:arbejder} {n:jeg} {a:ikke}." */
  da: string;
  en?: string;
  note?: string;
}

export interface TheoryPair {
  wrong: string;
  right: string;
  note?: string;
}

export interface TheoryCard {
  title: string;
  /** English paragraphs. **bold** marks key terms, *italic* marks Danish words. */
  body: string[];
  examples?: TheoryExample[];
  pairs?: TheoryPair[];
  /** Chips shown as a formula, e.g. ["F", "v", "n", "a"] or ["at", "subjekt", "ikke", "verbum"]. */
  formula?: string[];
  /** A sentence from the learner's own mock exam, with its correction. */
  exam?: TheoryPair;
}

export interface LessonContent {
  lessonId: string;
  theory: TheoryCard[];
  items: ItemSpec[];
}

export interface CheckpointContent {
  moduleId: string;
  /** One or two English sentences shown before the boss round. */
  intro: string;
  items: ItemSpec[];
}

export type GrammarTrack = "order" | "choice" | "noun";

export interface GrammarRule {
  id: string;
  /** Danish title. */
  title: string;
  /** One-line English summary. */
  summary: string;
}

export interface GrammarLessonMeta {
  id: string;
  moduleId: string;
  title: string;
  subtitle: string;
  rules: string[];
}

export interface GrammarModuleMeta {
  id: string;
  title: string;
  subtitle: string;
  track: GrammarTrack;
  /** The checkpoint is named after a real mistake from the mock exam. */
  bossTitle: string;
  bossQuote: string;
  lessonIds: string[];
}

export interface ExamErrorRecord {
  id: string;
  wrong: string;
  right: string;
  note: string;
  lessonId: string;
}
