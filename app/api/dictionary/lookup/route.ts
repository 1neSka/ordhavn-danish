import { normalizeSelectedDanishWord } from "@/lib/dictionaryData";
import { lookupOnlineDanishWord, type OnlineDictionaryLookup } from "@/lib/onlineDictionary";

export const runtime = "edge";

type CacheEntry = {
  expiresAt: number;
  lookup: OnlineDictionaryLookup | null;
};

const onlineDictionaryCache = new Map<string, CacheEntry>();
const SUCCESS_TTL = 7 * 24 * 60 * 60 * 1_000;
const MISS_TTL = 60 * 60 * 1_000;
const MAX_CACHE_ENTRIES = 500;

function cacheLookup(word: string, lookup: OnlineDictionaryLookup | null) {
  if (onlineDictionaryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = onlineDictionaryCache.keys().next().value;
    if (oldest) onlineDictionaryCache.delete(oldest);
  }
  onlineDictionaryCache.set(word, {
    lookup,
    expiresAt: Date.now() + (lookup ? SUCCESS_TTL : MISS_TTL),
  });
}

export async function GET(request: Request) {
  const rawWord = new URL(request.url).searchParams.get("word") ?? "";
  const word = normalizeSelectedDanishWord(rawWord);
  if (!word || word.length < 4 || word.length > 64) {
    return Response.json({ found: false, reason: "invalid-word" }, { status: 400 });
  }

  const cached = onlineDictionaryCache.get(word);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json(
      cached.lookup ? { found: true, lookup: cached.lookup, cached: true } : { found: false, cached: true },
      { status: cached.lookup ? 200 : 404 },
    );
  }
  if (cached) onlineDictionaryCache.delete(word);

  try {
    const lookup = await lookupOnlineDanishWord(word, fetch, request.signal);
    cacheLookup(word, lookup);
    return Response.json(
      lookup ? { found: true, lookup } : { found: false },
      {
        status: lookup ? 200 : 404,
        headers: { "Cache-Control": lookup ? "public, max-age=86400, stale-while-revalidate=604800" : "public, max-age=3600" },
      },
    );
  } catch {
    return Response.json(
      { found: false, reason: "provider-unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
