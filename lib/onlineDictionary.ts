export type OnlineDictionaryProvider = "kaikki" | "wiktionary";

export interface OnlineDictionaryLookup {
  selectedWord: string;
  headword: string;
  english: readonly string[];
  partOfSpeech?: string;
  formNote?: string;
  matchKind: "exact" | "form" | "stemmed";
  provider: OnlineDictionaryProvider;
  sourceName: string;
  sourceUrl: string;
  licenseUrl: string;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface ParsedEntry {
  headword: string;
  english: string[];
  partOfSpeech?: string;
  formOf?: string;
  formNote?: string;
}

const KAIKKI_ROOT = "https://kaikki.org/dictionary/Danish/meaning";
const WIKTIONARY_API = "https://en.wiktionary.org/w/api.php";
const WIKTIONARY_LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/";
const API_USER_AGENT = "OrdhavnDanishLearning/0.1 (https://github.com/1neSka/ordhavn-danish)";
const MAX_GLOSSES = 4;
const MAX_GLOSS_LENGTH = 240;

class ProviderUnavailableError extends Error {}

function cleanText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_GLOSS_LENGTH);
}

function uniqueGlosses(values: readonly string[]): string[] {
  return [...new Set(values.map(cleanText).filter((value) => value.length >= 2))].slice(0, MAX_GLOSSES);
}

function addCandidate(candidates: string[], candidate: string) {
  const normalized = candidate.toLocaleLowerCase("da-DK").normalize("NFC");
  if (normalized.length >= 3 && !candidates.includes(normalized)) candidates.push(normalized);
}

/** Conservative guesses used only after an exact online lookup misses. */
export function danishOnlineLookupCandidates(word: string): readonly string[] {
  const normalized = word.toLocaleLowerCase("da-DK").normalize("NFC");
  const candidates = [normalized];
  if (normalized.length < 5) return candidates;

  if (normalized.endsWith("s")) addCandidate(candidates, normalized.slice(0, -1));
  if (normalized.endsWith("erne")) {
    addCandidate(candidates, `${normalized.slice(0, -4)}e`);
    addCandidate(candidates, normalized.slice(0, -4));
  } else if (normalized.endsWith("ene")) {
    addCandidate(candidates, normalized.slice(0, -3));
  }
  if (normalized.endsWith("ede")) addCandidate(candidates, normalized.slice(0, -2));
  if (normalized.endsWith("ere")) addCandidate(candidates, normalized.slice(0, -3));
  if (normalized.endsWith("te")) addCandidate(candidates, `${normalized.slice(0, -2)}e`);
  if (normalized.endsWith("et")) {
    addCandidate(candidates, normalized.slice(0, -2));
    addCandidate(candidates, normalized.slice(0, -1));
  } else if (normalized.endsWith("en")) {
    const stem = normalized.slice(0, -2);
    addCandidate(candidates, stem);
    if (stem.at(-1) === stem.at(-2)) addCandidate(candidates, stem.slice(0, -1));
  } else if (normalized.endsWith("er")) {
    addCandidate(candidates, `${normalized.slice(0, -2)}e`);
    addCandidate(candidates, normalized.slice(0, -2));
  }
  if (normalized.endsWith("t")) addCandidate(candidates, normalized.slice(0, -1));
  return candidates.slice(0, 5);
}

function kaikkiWordUrl(word: string, extension: "html" | "jsonl") {
  const first = [...word][0] ?? "_";
  const firstTwo = [...word].slice(0, 2).join("");
  return `${KAIKKI_ROOT}/${encodeURIComponent(first)}/${encodeURIComponent(firstTwo)}/${encodeURIComponent(word)}.${extension}`;
}

function wiktionaryWordUrl(word: string) {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}

function requestSignal(parent?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(4_000);
  return parent && typeof AbortSignal.any === "function" ? AbortSignal.any([parent, timeout]) : timeout;
}

async function fetchText(fetcher: FetchLike, url: string, parentSignal?: AbortSignal): Promise<{ status: number; text: string }> {
  const response = await fetcher(url, {
    headers: {
      "Api-User-Agent": API_USER_AGENT,
      "User-Agent": API_USER_AGENT,
    },
    signal: requestSignal(parentSignal),
  });
  if (response.status === 404) return { status: 404, text: "" };
  if (!response.ok) throw new ProviderUnavailableError(`Dictionary provider returned ${response.status}.`);
  return { status: response.status, text: await response.text() };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function parseKaikkiJsonl(jsonl: string, expectedWord: string): ParsedEntry | null {
  const directGlosses: string[] = [];
  const formGlosses: string[] = [];
  let partOfSpeech: string | undefined;
  let formOf: string | undefined;

  for (const line of jsonl.split(/\r?\n/gu)) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (row.lang_code !== "da" || typeof row.word !== "string") continue;
    if (row.word.toLocaleLowerCase("da-DK").normalize("NFC") !== expectedWord) continue;
    if (!partOfSpeech && typeof row.pos === "string") partOfSpeech = cleanText(row.pos);
    const senses = Array.isArray(row.senses) ? row.senses : [];
    for (const rawSense of senses) {
      if (!rawSense || typeof rawSense !== "object") continue;
      const sense = rawSense as Record<string, unknown>;
      const tags = stringArray(sense.tags);
      const glosses = stringArray(sense.glosses);
      const forms = Array.isArray(sense.form_of) ? sense.form_of : [];
      const lemma = forms
        .map((item) => item && typeof item === "object" ? (item as Record<string, unknown>).word : undefined)
        .find((item): item is string => typeof item === "string" && item.length > 0);
      if (tags.includes("form-of") || lemma) {
        formGlosses.push(...glosses);
        if (!formOf && lemma) formOf = lemma.toLocaleLowerCase("da-DK").normalize("NFC");
      } else {
        directGlosses.push(...glosses);
      }
    }
  }

  const english = uniqueGlosses(directGlosses.length ? directGlosses : formGlosses);
  if (!english.length) return null;
  return {
    headword: expectedWord,
    english,
    partOfSpeech,
    formOf,
    formNote: formOf ? uniqueGlosses(formGlosses)[0] : undefined,
  };
}

async function fetchKaikkiEntry(word: string, fetcher: FetchLike, signal?: AbortSignal): Promise<ParsedEntry | null> {
  const response = await fetchText(fetcher, kaikkiWordUrl(word, "jsonl"), signal);
  return response.status === 404 ? null : parseKaikkiJsonl(response.text, word);
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/giu, (entity, key: string) => {
    if (key.startsWith("#x")) return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
    if (key.startsWith("#")) return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
    return named[key.toLowerCase()] ?? entity;
  });
}

function stripHtml(value: string): string {
  return cleanText(decodeHtmlEntities(value.replace(/<[^>]*>/gu, " ")));
}

const WIKTIONARY_POS = new Set([
  "adjective", "adverb", "conjunction", "determiner", "interjection", "noun", "numeral",
  "particle", "preposition", "pronoun", "proper noun", "verb",
]);

export function parseWiktionaryDanishHtml(html: string, expectedWord: string): ParsedEntry | null {
  const danishHeading = /<h2\b[^>]*\bid=["']Danish["'][^>]*>/iu.exec(html);
  if (!danishHeading || danishHeading.index === undefined) return null;
  const start = danishHeading.index + danishHeading[0].length;
  const following = html.slice(start);
  const nextLanguage = /<h2\b[^>]*\bid=/iu.exec(following);
  const section = nextLanguage?.index === undefined ? following : following.slice(0, nextLanguage.index);
  const blockPattern = /<h3\b[^>]*>([\s\S]*?)<\/h3>|<ol\b[^>]*>([\s\S]*?)<\/ol>/giu;
  const directGlosses: string[] = [];
  const formGlosses: string[] = [];
  let currentPart: string | undefined;
  let partOfSpeech: string | undefined;
  let formOf: string | undefined;
  let block: RegExpExecArray | null;

  while ((block = blockPattern.exec(section)) !== null) {
    if (block[1] !== undefined) {
      const heading = stripHtml(block[1]).toLowerCase();
      currentPart = WIKTIONARY_POS.has(heading) ? heading : undefined;
      continue;
    }
    if (!currentPart || block[2] === undefined) continue;
    if (!partOfSpeech) partOfSpeech = currentPart;
    const listItems = block[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/giu);
    for (const item of listItems) {
      const itemHtml = item[1].replace(/<(?:dl|ol|ul)\b[\s\S]*$/iu, "");
      const gloss = stripHtml(itemHtml);
      if (!gloss) continue;
      const lemmaMatch = /class=["'][^"']*form-of-definition-link[^"']*["'][\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/iu.exec(itemHtml);
      if (lemmaMatch) {
        formGlosses.push(gloss);
        if (!formOf) formOf = stripHtml(lemmaMatch[1]).toLocaleLowerCase("da-DK").normalize("NFC");
      } else {
        directGlosses.push(gloss);
      }
    }
  }

  const english = uniqueGlosses(directGlosses.length ? directGlosses : formGlosses);
  if (!english.length) return null;
  return {
    headword: expectedWord,
    english,
    partOfSpeech,
    formOf,
    formNote: formOf ? uniqueGlosses(formGlosses)[0] : undefined,
  };
}

async function fetchWiktionaryEntry(word: string, fetcher: FetchLike, signal?: AbortSignal): Promise<ParsedEntry | null> {
  const url = new URL(WIKTIONARY_API);
  url.search = new URLSearchParams({
    action: "parse",
    page: word,
    prop: "text",
    format: "json",
    formatversion: "2",
    redirects: "1",
    maxlag: "5",
  }).toString();
  const response = await fetchText(fetcher, url.toString(), signal);
  if (response.status === 404) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(response.text);
  } catch {
    throw new ProviderUnavailableError("Wiktionary returned invalid JSON.");
  }
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { parse?: { text?: unknown }; error?: unknown };
  if (root.error || typeof root.parse?.text !== "string") return null;
  return parseWiktionaryDanishHtml(root.parse.text, word);
}

function toLookup(
  selectedWord: string,
  candidate: string,
  entry: ParsedEntry,
  provider: OnlineDictionaryProvider,
  followedLemma?: ParsedEntry,
): OnlineDictionaryLookup {
  const resolved = followedLemma ?? entry;
  const isForm = Boolean(followedLemma);
  return {
    selectedWord,
    headword: resolved.headword,
    english: resolved.english,
    partOfSpeech: resolved.partOfSpeech,
    formNote: isForm ? entry.formNote : candidate !== selectedWord ? `possible base form of ${selectedWord}` : undefined,
    matchKind: isForm ? "form" : candidate === selectedWord ? "exact" : "stemmed",
    provider,
    sourceName: provider === "kaikki" ? "Kaikki · English Wiktionary" : "English Wiktionary",
    sourceUrl: provider === "kaikki" ? kaikkiWordUrl(resolved.headword, "html") : wiktionaryWordUrl(resolved.headword),
    licenseUrl: WIKTIONARY_LICENSE,
  };
}

async function lookupWithProvider(
  selectedWord: string,
  candidates: readonly string[],
  provider: OnlineDictionaryProvider,
  fetcher: FetchLike,
  signal?: AbortSignal,
): Promise<OnlineDictionaryLookup | null> {
  const fetchEntry = provider === "kaikki" ? fetchKaikkiEntry : fetchWiktionaryEntry;
  for (const candidate of candidates) {
    const entry = await fetchEntry(candidate, fetcher, signal);
    if (!entry) continue;
    let followedLemma: ParsedEntry | undefined;
    if (entry.formOf && entry.formOf !== candidate) {
      followedLemma = await fetchEntry(entry.formOf, fetcher, signal) ?? undefined;
    }
    return toLookup(selectedWord, candidate, entry, provider, followedLemma);
  }
  return null;
}

/** Queries Kaikki first, then the official English Wiktionary API. */
export async function lookupOnlineDanishWord(
  word: string,
  fetcher: FetchLike = fetch,
  signal?: AbortSignal,
): Promise<OnlineDictionaryLookup | null> {
  const candidates = danishOnlineLookupCandidates(word);
  try {
    const kaikki = await lookupWithProvider(word, candidates, "kaikki", fetcher, signal);
    if (kaikki) return kaikki;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (!(error instanceof ProviderUnavailableError) && !(error instanceof TypeError)) throw error;
  }
  return lookupWithProvider(word, candidates, "wiktionary", fetcher, signal);
}
