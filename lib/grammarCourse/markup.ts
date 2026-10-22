import type { GrammarField } from "./types";

// Inline markup used by the content files:
//   " | "            chunk separator (otherwise tokens are words split on spaces)
//   [target]         tap target, may span several words
//   [wrong]{right}   an error and its correction (judge/proof)
//   ^  ~             correct / also acceptable insertion point (slot)
//   ___              the blank of a typed cloze
//   {F:I dag}        field colouring in theory examples
//   **bold** *italic* emphasis in theory text (italic is used for Danish words)

export const FIELD_IDS: readonly GrammarField[] = ["C", "k", "F", "v", "n", "a", "V", "N", "A"];

export class MarkupError extends Error {}

export function usesChunks(text: string) {
  return text.includes("|");
}

export function splitChunks(text: string) {
  return text.split("|").map((chunk) => chunk.trim()).filter(Boolean);
}

export function normalizeSpacing(text: string) {
  return text
    .replace(/\s+/gu, " ")
    .replace(/\s+([,.;:!?…])/gu, "$1")
    .trim();
}

/** Lowercase, trimmed, without surrounding punctuation or quotes — for typed answers. */
export function normalizeTyped(text: string) {
  return normalizeSpacing(text)
    .toLocaleLowerCase("da-DK")
    .replace(/^[\s"'“”„»«(]+|[\s"'“”„»«).,;:!?…]+$/gu, "");
}

export function capitalizeFirst(text: string) {
  const index = text.search(/\p{L}/u);
  if (index < 0) return text;
  return text.slice(0, index) + text.charAt(index).toLocaleUpperCase("da-DK") + text.slice(index + 1);
}

export function lowercaseFirst(text: string) {
  const index = text.search(/\p{L}/u);
  if (index < 0) return text;
  return text.slice(0, index) + text.charAt(index).toLocaleLowerCase("da-DK") + text.slice(index + 1);
}

interface ScannedToken {
  text: string;
  group: number | null;
}

interface ScanResult {
  tokens: ScannedToken[];
  corrections: Array<string | undefined>;
  chunked: boolean;
}

function scanBrackets(text: string, withCorrections: boolean): ScanResult {
  const chunked = usesChunks(text);
  const tokens: ScannedToken[] = [];
  const corrections: Array<string | undefined> = [];
  let current = "";
  let currentGroup: number | null = null;
  let openGroup: number | null = null;

  const flush = () => {
    const value = current.trim();
    if (value) tokens.push({ text: value, group: currentGroup });
    current = "";
    currentGroup = null;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "[") {
      if (openGroup !== null) throw new MarkupError(`Nested [ in: ${text}`);
      openGroup = corrections.length;
      corrections.push(undefined);
      continue;
    }
    if (char === "]") {
      if (openGroup === null) throw new MarkupError(`Unmatched ] in: ${text}`);
      if (text[index + 1] === "{") {
        if (!withCorrections) throw new MarkupError(`Corrections {…} are not allowed here: ${text}`);
        const close = text.indexOf("}", index + 2);
        if (close < 0) throw new MarkupError(`Unclosed { in: ${text}`);
        corrections[openGroup] = text.slice(index + 2, close);
        index = close;
      } else if (withCorrections) {
        throw new MarkupError(`[wrong] must be followed by {right}: ${text}`);
      }
      openGroup = null;
      continue;
    }
    if (char === "{" || char === "}") throw new MarkupError(`Stray brace in: ${text}`);
    const separator = chunked ? char === "|" : /\s/u.test(char);
    if (separator) {
      if (chunked && openGroup !== null) throw new MarkupError(`A [target] may not cross a | boundary: ${text}`);
      flush();
      continue;
    }
    current += char;
    if (openGroup !== null && !/\s/u.test(char)) currentGroup = openGroup;
  }
  if (openGroup !== null) throw new MarkupError(`Unclosed [ in: ${text}`);
  flush();
  return { tokens, corrections, chunked };
}

function groupIndices(tokens: ScannedToken[], groupCount: number) {
  const groups = Array.from({ length: groupCount }, () => [] as number[]);
  tokens.forEach((token, index) => {
    if (token.group !== null) groups[token.group].push(index);
  });
  return groups;
}

export interface ParsedTargets {
  tokens: string[];
  groups: number[][];
  chunked: boolean;
}

export function parseTargets(text: string): ParsedTargets {
  const scanned = scanBrackets(text, false);
  const groups = groupIndices(scanned.tokens, scanned.corrections.length);
  if (!groups.length) throw new MarkupError(`No [target] in: ${text}`);
  if (groups.some((group) => group.length === 0)) throw new MarkupError(`Empty [target] in: ${text}`);
  return { tokens: scanned.tokens.map((token) => token.text), groups, chunked: scanned.chunked };
}

export interface ParsedErrorSpan {
  tokens: number[];
  wrong: string;
  right: string;
}

export interface ParsedErrors {
  tokens: string[];
  spans: ParsedErrorSpan[];
  /** The text as the learner sees it (with the errors). */
  shown: string;
  /** The text with every correction applied. */
  corrected: string;
}

const ERROR_PATTERN = /\[([^\]]*)\]\{([^}]*)\}/gu;

export function parseErrors(text: string): ParsedErrors {
  const scanned = scanBrackets(text, true);
  const groups = groupIndices(scanned.tokens, scanned.corrections.length);
  const wrongParts = [...text.matchAll(ERROR_PATTERN)].map((match) => match[1].trim());
  if (wrongParts.length !== groups.length) throw new MarkupError(`Malformed [wrong]{right} markup: ${text}`);
  const spans = groups.map((tokens, index) => {
    if (!tokens.length || !wrongParts[index]) throw new MarkupError(`An error span needs at least one visible word: ${text}`);
    const right = (scanned.corrections[index] ?? "").trim();
    if (normalizeSpacing(right) === normalizeSpacing(wrongParts[index])) throw new MarkupError(`Correction equals the error: ${text}`);
    return { tokens, wrong: wrongParts[index], right };
  });
  const plain = (value: string) => normalizeSpacing(value.replaceAll("|", " "));
  return {
    tokens: scanned.tokens.map((token) => token.text),
    spans,
    shown: plain(text.replace(ERROR_PATTERN, "$1")),
    corrected: plain(text.replace(ERROR_PATTERN, "$2")),
  };
}

export interface ParsedSlot {
  tokens: string[];
  primary: number;
  accepted: number[];
  chunked: boolean;
}

export function parseSlot(text: string): ParsedSlot {
  const chunked = usesChunks(text);
  const raw = chunked ? splitChunks(text) : text.trim().split(/\s+/u);
  const tokens: string[] = [];
  let primary = -1;
  const accepted = new Set<number>();
  for (const token of raw) {
    if (token === "^") {
      if (primary >= 0) throw new MarkupError(`More than one ^ in: ${text}`);
      primary = tokens.length;
      accepted.add(tokens.length);
    } else if (token === "~") {
      accepted.add(tokens.length);
    } else if (token.includes("^") || token.includes("~")) {
      throw new MarkupError(`^ and ~ must stand alone, separated by spaces: ${text}`);
    } else {
      tokens.push(token);
    }
  }
  if (primary < 0) throw new MarkupError(`No ^ in: ${text}`);
  return { tokens, primary, accepted: [...accepted].sort((left, right) => left - right), chunked };
}

export function parseBlank(text: string) {
  const parts = text.split(/_{3,}/u);
  if (parts.length !== 2) throw new MarkupError(`Exactly one ___ blank is required: ${text}`);
  return { before: parts[0], after: parts[1] };
}

export type InlineSegment =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "field"; text: string; field: GrammarField };

const INLINE_PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*|\{([CkFvnaVNA]):([^}]*)\}/gu;

export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ kind: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) segments.push({ kind: "bold", text: match[1] });
    else if (match[2] !== undefined) segments.push({ kind: "italic", text: match[2] });
    else segments.push({ kind: "field", field: match[3] as GrammarField, text: match[4] });
    last = index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

/** Plain text of inline markup, e.g. for aria labels and duplicate checks. */
export function stripInline(text: string) {
  return parseInline(text).map((segment) => segment.text).join("");
}
