import {
  MarkupError,
  capitalizeFirst,
  lowercaseFirst,
  normalizeSpacing,
  normalizeTyped,
  parseBlank,
  parseErrors,
  parseSlot,
  parseTargets,
  splitChunks,
} from "./markup";
import type { GrammarField, ItemKind, ItemLevel, ItemSpec, SortSchema } from "./types";

export const SCHEMA_FIELDS: Record<SortSchema, GrammarField[]> = {
  main: ["F", "v", "n", "a", "V", "N", "A"],
  coord: ["C", "F", "v", "n", "a", "V", "N", "A"],
  sub: ["k", "n", "a", "v", "V", "N", "A"],
};

export interface ItemOrigin {
  lessonId: string;
  moduleId: string;
  source: "lesson" | "checkpoint";
}

interface CompiledBase extends ItemOrigin {
  uid: string;
  id: string;
  kind: ItemKind;
  rules: string[];
  level: ItemLevel;
  prompt: string;
  en?: string;
  explain: string;
}

export interface CompiledChoice extends CompiledBase { kind: "choice"; sentence?: string; options: string[]; correct: string }
export interface CompiledMulti extends CompiledBase { kind: "multi"; options: string[]; correct: string[] }
export interface CompiledTap extends CompiledBase { kind: "tap"; tokens: string[]; groups: number[][]; chunked: boolean }
export interface CompiledBuild extends CompiledBase {
  kind: "build";
  chunks: string[];
  answers: string[];
  answerChunks: string[];
  finalPunct: string;
  lockedIndex: number | null;
  size: number;
  extras: number;
  correctSentence: string;
}
export interface CompiledSlot extends CompiledBase { kind: "slot"; word: string; tokens: string[]; accepted: number[]; primary: number; chunked: boolean; correctSentence: string }
export interface CompiledType extends CompiledBase { kind: "type"; before: string; after: string; accept: string[]; correctSentence: string }
export interface CompiledSort extends CompiledBase { kind: "sort"; schema: SortSchema; chunks: string[]; fields: GrammarField[]; options: GrammarField[] }
export interface CompiledJudge extends CompiledBase { kind: "judge"; tokens: string[]; errorTokens: number[]; isCorrect: boolean; wrong: string; right: string; shown: string; correctSentence: string }
export interface CompiledProof extends CompiledBase {
  kind: "proof";
  tokens: string[];
  spans: Array<{ tokens: number[]; wrong: string; right: string; note: string }>;
  shown: string;
  correctText: string;
}

export type CompiledItem =
  | CompiledChoice
  | CompiledMulti
  | CompiledTap
  | CompiledBuild
  | CompiledSlot
  | CompiledType
  | CompiledSort
  | CompiledJudge
  | CompiledProof;

export type GrammarResponse =
  | { kind: "choice"; option: string | null }
  | { kind: "multi"; options: string[] }
  | { kind: "tap"; indices: number[] }
  | { kind: "build"; order: number[] }
  | { kind: "slot"; gap: number | null }
  | { kind: "type"; text: string }
  | { kind: "sort"; fields: Array<GrammarField | null> }
  | { kind: "judge"; verdict: "ok" | "error" | null; indices: number[] }
  | { kind: "proof"; indices: number[] };

export interface GrammarCheck {
  correct: boolean;
  /** 0..1, used for partial credit in sort and proof tasks. */
  score: number;
  hits?: number[];
  falseAlarms?: number[];
  fieldResults?: boolean[];
}

export function hashString(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export function seededShuffle<T>(values: readonly T[], seed: string) {
  const result = [...values];
  const random = seededRandom(hashString(seed));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

const FINAL_PUNCTUATION = /[.!?…]+$/u;

function prepareAnswerChunks(answer: string, keepCase: boolean) {
  const chunks = splitChunks(answer);
  if (chunks.length < 2) throw new MarkupError(`A build answer needs at least two chunks: ${answer}`);
  const last = chunks.length - 1;
  const finalPunct = chunks[last].match(FINAL_PUNCTUATION)?.[0] ?? "";
  chunks[last] = chunks[last].replace(FINAL_PUNCTUATION, "").trim();
  if (!keepCase) chunks[0] = lowercaseFirst(chunks[0]);
  return { chunks, finalPunct };
}

function sameMultiset(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function joinChunks(chunks: string[]) {
  return normalizeSpacing(chunks.join(" "));
}

export function compileItem(spec: ItemSpec, origin: ItemOrigin, seed = ""): CompiledItem {
  const uid = `${origin.source === "checkpoint" ? `${origin.moduleId}-boss` : origin.lessonId}:${spec.id}`;
  const base = {
    ...origin,
    uid,
    id: spec.id,
    rules: spec.rules,
    level: spec.level,
    prompt: spec.prompt,
    en: spec.en,
    explain: spec.explain,
  };
  const shuffleSeed = `${uid}:${seed}`;

  switch (spec.kind) {
    case "choice": {
      const options = [spec.correct, ...spec.wrong];
      return { ...base, kind: "choice", sentence: spec.sentence, correct: spec.correct, options: seededShuffle(options, shuffleSeed) };
    }
    case "multi": {
      const options = [...spec.correct, ...spec.wrong];
      return { ...base, kind: "multi", correct: [...spec.correct], options: seededShuffle(options, shuffleSeed) };
    }
    case "tap": {
      const parsed = parseTargets(spec.text);
      return { ...base, kind: "tap", tokens: parsed.tokens, groups: parsed.groups, chunked: parsed.chunked };
    }
    case "build": {
      const keepCase = Boolean(spec.keepCase);
      const main = prepareAnswerChunks(spec.answer, keepCase);
      const alternatives = (spec.alt ?? []).map((alt) => {
        const prepared = prepareAnswerChunks(alt, keepCase);
        if (!sameMultiset(prepared.chunks, main.chunks)) throw new MarkupError(`Alternative answer uses other chunks: ${alt}`);
        return prepared.chunks;
      });
      const extras = (spec.extra ?? []).map((chunk) => chunk.trim()).filter(Boolean);
      const answers = [main.chunks, ...alternatives].map(joinChunks);
      const locked = spec.lockFirst ? main.chunks[0] : null;
      const pool = [...(locked === null ? main.chunks : main.chunks.slice(1)), ...extras];
      let shuffled = seededShuffle(pool, shuffleSeed);
      const startsCorrect = (order: string[]) => answers.includes(joinChunks(locked === null ? order.slice(0, main.chunks.length) : [locked, ...order.slice(0, main.chunks.length - 1)]));
      for (let attempt = 1; attempt < 6 && pool.length > 1 && startsCorrect(shuffled); attempt += 1) {
        shuffled = seededShuffle(pool, `${shuffleSeed}:${attempt}`);
      }
      if (pool.length > 1 && startsCorrect(shuffled)) shuffled = [...shuffled.slice(1), shuffled[0]];
      const chunks = locked === null ? shuffled : [locked, ...shuffled];
      return {
        ...base,
        kind: "build",
        chunks,
        answers,
        answerChunks: main.chunks,
        finalPunct: main.finalPunct,
        lockedIndex: locked === null ? null : 0,
        size: main.chunks.length,
        extras: extras.length,
        correctSentence: capitalizeFirst(joinChunks(main.chunks)) + main.finalPunct,
      };
    }
    case "slot": {
      const parsed = parseSlot(spec.text);
      const words = [...parsed.tokens];
      words.splice(parsed.primary, 0, spec.word);
      const sentence = normalizeSpacing(words.join(" "));
      return {
        ...base,
        kind: "slot",
        word: spec.word,
        tokens: parsed.tokens,
        accepted: parsed.accepted,
        primary: parsed.primary,
        chunked: parsed.chunked,
        correctSentence: parsed.primary === 0 ? capitalizeFirst(sentence) : sentence,
      };
    }
    case "type": {
      const blank = parseBlank(spec.text);
      if (!spec.accept.length) throw new MarkupError(`A typed item needs at least one accepted answer: ${spec.text}`);
      return {
        ...base,
        kind: "type",
        before: blank.before,
        after: blank.after,
        accept: spec.accept,
        correctSentence: normalizeSpacing(`${blank.before}${spec.accept[0]}${blank.after}`),
      };
    }
    case "sort": {
      const chunks = splitChunks(spec.text);
      return { ...base, kind: "sort", schema: spec.schema, chunks, fields: spec.fields, options: SCHEMA_FIELDS[spec.schema] };
    }
    case "judge": {
      const parsed = parseErrors(spec.text);
      if (parsed.spans.length > 1) throw new MarkupError(`A judge item may contain at most one error: ${spec.text}`);
      const span = parsed.spans[0];
      return {
        ...base,
        kind: "judge",
        tokens: parsed.tokens,
        errorTokens: span?.tokens ?? [],
        isCorrect: !span,
        wrong: span?.wrong ?? "",
        right: span?.right ?? "",
        shown: parsed.shown,
        correctSentence: parsed.corrected,
      };
    }
    case "proof": {
      const parsed = parseErrors(spec.text);
      if (parsed.spans.length !== spec.notes.length) throw new MarkupError(`A proof item needs one note per error (${parsed.spans.length} errors, ${spec.notes.length} notes): ${spec.text}`);
      return {
        ...base,
        kind: "proof",
        tokens: parsed.tokens,
        spans: parsed.spans.map((span, index) => ({ ...span, note: spec.notes[index] })),
        shown: parsed.shown,
        correctText: parsed.corrected,
      };
    }
  }
}

export function emptyResponse(item: CompiledItem): GrammarResponse {
  switch (item.kind) {
    case "choice": return { kind: "choice", option: null };
    case "multi": return { kind: "multi", options: [] };
    case "tap": return { kind: "tap", indices: [] };
    case "build": return { kind: "build", order: item.lockedIndex === null ? [] : [item.lockedIndex] };
    case "slot": return { kind: "slot", gap: null };
    case "type": return { kind: "type", text: "" };
    case "sort": return { kind: "sort", fields: item.chunks.map(() => null) };
    case "judge": return { kind: "judge", verdict: null, indices: [] };
    case "proof": return { kind: "proof", indices: [] };
  }
}

export function isResponseReady(item: CompiledItem, response: GrammarResponse | null) {
  if (!response || response.kind !== item.kind) return false;
  switch (response.kind) {
    case "choice": return response.option !== null;
    case "multi": return response.options.length > 0;
    case "tap": return response.indices.length > 0;
    case "build": return item.kind === "build" && response.order.length === item.size;
    case "slot": return response.gap !== null;
    case "type": return normalizeTyped(response.text).length > 0;
    case "sort": return response.fields.every((field) => field !== null);
    case "judge": return response.verdict === "ok" || (response.verdict === "error" && response.indices.length > 0);
    case "proof": return response.indices.length > 0;
  }
}

function spanCheck(spans: number[][], indices: number[]) {
  const selected = new Set(indices);
  const hits = spans.map((span, index) => (span.some((token) => selected.has(token)) ? index : -1)).filter((index) => index >= 0);
  const inside = new Set(spans.flat());
  const falseAlarms = [...selected].filter((index) => !inside.has(index));
  return { hits, falseAlarms };
}

export function checkResponse(item: CompiledItem, response: GrammarResponse): GrammarCheck {
  if (response.kind !== item.kind) return { correct: false, score: 0 };
  switch (item.kind) {
    case "choice": {
      const correct = response.kind === "choice" && response.option === item.correct;
      return { correct, score: correct ? 1 : 0 };
    }
    case "multi": {
      if (response.kind !== "multi") return { correct: false, score: 0 };
      const chosen = new Set(response.options);
      const correct = chosen.size === item.correct.length && item.correct.every((option) => chosen.has(option));
      return { correct, score: correct ? 1 : 0 };
    }
    case "tap": {
      if (response.kind !== "tap") return { correct: false, score: 0 };
      const { hits, falseAlarms } = spanCheck(item.groups, response.indices);
      const correct = hits.length === item.groups.length && falseAlarms.length === 0;
      return { correct, score: correct ? 1 : 0, hits, falseAlarms };
    }
    case "build": {
      if (response.kind !== "build") return { correct: false, score: 0 };
      const sentence = joinChunks(response.order.map((index) => item.chunks[index] ?? ""));
      const correct = response.order.length === item.size && item.answers.includes(sentence);
      return { correct, score: correct ? 1 : 0 };
    }
    case "slot": {
      const correct = response.kind === "slot" && response.gap !== null && item.accepted.includes(response.gap);
      return { correct, score: correct ? 1 : 0 };
    }
    case "type": {
      const typed = response.kind === "type" ? normalizeTyped(response.text) : "";
      const correct = item.accept.some((answer) => normalizeTyped(answer) === typed);
      return { correct, score: correct ? 1 : 0 };
    }
    case "sort": {
      if (response.kind !== "sort") return { correct: false, score: 0 };
      const fieldResults = item.fields.map((field, index) => response.fields[index] === field);
      const right = fieldResults.filter(Boolean).length;
      return { correct: right === item.fields.length, score: right / item.fields.length, fieldResults };
    }
    case "judge": {
      if (response.kind !== "judge") return { correct: false, score: 0 };
      if (item.isCorrect) {
        const correct = response.verdict === "ok";
        return { correct, score: correct ? 1 : 0 };
      }
      if (response.verdict !== "error") return { correct: false, score: 0 };
      const { hits, falseAlarms } = spanCheck([item.errorTokens], response.indices);
      const correct = hits.length === 1 && falseAlarms.length === 0;
      return { correct, score: correct ? 1 : hits.length ? 0.5 : 0, hits, falseAlarms };
    }
    case "proof": {
      if (response.kind !== "proof") return { correct: false, score: 0 };
      const { hits, falseAlarms } = spanCheck(item.spans.map((span) => span.tokens), response.indices);
      const correct = hits.length === item.spans.length && falseAlarms.length === 0;
      const score = Math.max(0, (hits.length - falseAlarms.length * 0.5) / item.spans.length);
      return { correct, score: correct ? 1 : Math.min(score, 0.99), hits, falseAlarms };
    }
  }
}

/** The response a perfect learner would give — used by tests and the validator. */
export function canonicalResponse(item: CompiledItem): GrammarResponse {
  switch (item.kind) {
    case "choice": return { kind: "choice", option: item.correct };
    case "multi": return { kind: "multi", options: [...item.correct] };
    case "tap": return { kind: "tap", indices: item.groups.map((group) => group[0]) };
    case "build": {
      const used = new Set<number>();
      const order = item.answerChunks.map((chunk, position) => {
        if (position === 0 && item.lockedIndex !== null) {
          used.add(item.lockedIndex);
          return item.lockedIndex;
        }
        const index = item.chunks.findIndex((candidate, candidateIndex) => candidate === chunk && !used.has(candidateIndex) && candidateIndex !== item.lockedIndex);
        used.add(index);
        return index;
      });
      return { kind: "build", order };
    }
    case "slot": return { kind: "slot", gap: item.primary };
    case "type": return { kind: "type", text: item.accept[0] };
    case "sort": return { kind: "sort", fields: [...item.fields] };
    case "judge": return item.isCorrect ? { kind: "judge", verdict: "ok", indices: [] } : { kind: "judge", verdict: "error", indices: [item.errorTokens[0]] };
    case "proof": return { kind: "proof", indices: item.spans.map((span) => span.tokens[0]) };
  }
}

/** The sentence (or text) to show as the model answer after checking. */
export function modelAnswer(item: CompiledItem) {
  switch (item.kind) {
    case "choice": return item.sentence && /_{3,}/u.test(item.sentence) ? item.sentence.replace(/_{3,}/u, item.correct) : item.correct;
    case "multi": return item.correct.join(" · ");
    case "tap": return item.tokens.map((token, index) => (item.groups.some((group) => group.includes(index)) ? `[${token}]` : token)).join(" ");
    case "build": return item.correctSentence;
    case "slot": return item.correctSentence;
    case "type": return item.correctSentence;
    case "sort": return item.chunks.join(" ");
    case "judge": return item.correctSentence;
    case "proof": return item.correctText;
  }
}
