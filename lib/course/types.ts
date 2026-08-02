export type Difficulty = 1 | 2 | 3;
export type Modality = "read" | "listen" | "produce";

export interface ItemAssets {
  audio: string | null;
}
export type GeminiTask = "free-rewrite" | "compress" | "micro-dialogue" | "explain-why";

export interface ItemAiPolicy {
  mode: "grade" | "assist";
  task: GeminiTask;
  /** AI work is skipped when Gemini is unavailable; no local rubric may silently replace it. */
  skipWhenUnavailable: true;
  requiredFacts?: string[];
  hiddenGoal?: string;
  persona?: string;
  maxWords?: number;
}

export interface BaseItem {
  id: string;
  prompt: string;
  answer: string;
  hint: string;
  explanation: string;
  translation?: string;
  skill: string;
  tags: string[];
  difficulty: Difficulty;
  modality: Modality;
  assets: ItemAssets;
  options?: string[];
  tokens?: string[];
  acceptedAnswers?: string[];
  aiPolicy?: ItemAiPolicy;
}

export interface ChoiceItem extends BaseItem { type: "choice"; options: string[] }
export interface OrderItem extends BaseItem { type: "order"; tokens: string[]; acceptedAnswers: string[] }
export interface InputItem extends BaseItem { type: "input"; acceptedAnswers: string[] }
export interface GenderBetItem extends BaseItem {
  type: "gender-bet";
  noun: string;
  options: ["en", "et"];
  confidenceWager: { min: 50; max: 100; step: 10; default: number };
  scoreMode: "brier";
}
export interface NumberArcadeItem extends BaseItem {
  type: "number-arcade";
  value: number;
  options: string[];
  numberSystem: "base-ten" | "vigesimal";
  breakdown: string;
}
export interface DefinitenessItem extends BaseItem {
  type: "definiteness";
  forms: { indefinite: string; definite: string; modified: string };
  targetForm: "indefinite" | "definite" | "modified";
  options: string[];
}
export interface AgreementItem extends BaseItem {
  type: "agreement";
  adjective: string;
  agreementForm: "base" | "t" | "e";
  options: string[];
}
export interface IkkePositionItem extends BaseItem {
  type: "ikke-position";
  clauseType: "main" | "subordinate";
  grammarFrame: "V2" | "subject-before-adverb";
  tokens: string[];
  acceptedAnswers: string[];
}

export type ClozeMultiSegment = { text: string } | { blankId: string; options: string[]; answer: string };
export interface ClozeMultiItem extends BaseItem { type: "cloze-multi"; segments: ClozeMultiSegment[] }
export interface RegisterMatchItem extends BaseItem {
  type: "register-match";
  intent: string;
  pairs: Array<{ addressee: string; addresseeNote: string; utterance: string }>;
}
export interface TransformItem extends BaseItem {
  type: "transform";
  sourceSentence: string;
  instruction: string;
  acceptedAnswers: string[];
}

export interface SynonymPickItem extends BaseItem {
  type: "synonym-pick";
  focusWord: string;
  context: string;
  register: "neutral" | "formal" | "informal" | "sharp" | "warm";
  options: string[];
}
export interface NuanceScaleItem extends BaseItem {
  type: "nuance-scale";
  axis: string;
  tokens: string[];
  acceptedAnswers: string[];
}
export interface OddOneOutItem extends BaseItem {
  type: "odd-one-out";
  family: string;
  options: string[];
  reason: string;
}
export interface CollocationLockItem extends BaseItem {
  type: "collocation-lock";
  anchor: string;
  options: string[];
  relation: "verb-noun" | "adjective-preposition" | "verb-preposition";
}
export interface ErrorHuntItem extends BaseItem {
  type: "error-hunt";
  sentenceTokens: string[];
  errorIndex: number;
  correction: string;
}
export interface InflectionForgeItem extends BaseItem {
  type: "inflection-forge";
  lemma: string;
  targetDescription: string;
  acceptedAnswers: string[];
}
export interface WordForgeItem extends BaseItem {
  type: "word-forge";
  morphemes: string[];
  fugeelement: "" | "s" | "e";
  acceptedAnswers: string[];
}
export interface TextOrderSentence { id: string; text: string }
export interface TextOrderItem extends BaseItem {
  type: "text-order";
  sentences: TextOrderSentence[];
  correctOrder: string[];
  tokens: string[];
  acceptedAnswers: string[];
}
export interface EvidentialTagItem extends BaseItem {
  type: "evidential-tag";
  statement: string;
  sourceStatus: "observed" | "reported" | "uncertain" | "inferred";
  options: string[];
}
export interface CounterfactualChainItem extends BaseItem {
  type: "counterfactual-chain";
  premises: string[];
  tokens: string[];
  acceptedAnswers: string[];
}

export interface AiTextItemBase extends BaseItem {
  answer: string;
  aiPolicy: ItemAiPolicy;
  minWords: number;
}
export interface FreeRewriteItem extends AiTextItemBase { type: "free-rewrite"; sourceText: string; instruction: string }
export interface CompressItem extends AiTextItemBase { type: "compress"; sourceText: string; maxWords: number; requiredFacts: string[] }
export interface MicroDialogueItem extends AiTextItemBase { type: "micro-dialogue"; persona: string; hiddenGoal: string; turns: 3 }
export interface ExplainWhyItem extends AiTextItemBase { type: "explain-why"; claim: string; requiredConcepts: string[] }

export type CourseItem =
  | ChoiceItem | OrderItem | InputItem | GenderBetItem | NumberArcadeItem
  | DefinitenessItem | AgreementItem | IkkePositionItem | ClozeMultiItem
  | RegisterMatchItem | TransformItem | SynonymPickItem | NuanceScaleItem
  | OddOneOutItem | CollocationLockItem | ErrorHuntItem | InflectionForgeItem
  | WordForgeItem | TextOrderItem | EvidentialTagItem | CounterfactualChainItem
  | FreeRewriteItem | CompressItem | MicroDialogueItem | ExplainWhyItem;

export type Challenge = CourseItem;

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  estimatedMinutes: number;
  xp: number;
  questions: CourseItem[];
}

export interface CourseLevel {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  color: string;
  unlockXp: number;
  missions: Mission[];
}
