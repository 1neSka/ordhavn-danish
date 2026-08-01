/**
 * Builds a statistical view of response times without changing source attempts.
 *
 * The adaptive fence is intentionally one-sided: very fast answers are never
 * trimmed or winsorized. Long pauses are removed first by an absolute cap and,
 * once enough observations exist, by a generous median/MAD fence derived from
 * the current sample (normally one user's attempts or one skill's attempts).
 */

export const DEFAULT_RESPONSE_TIME_HARD_CAP_MS = 300_000;
export const DEFAULT_RESPONSE_TIME_MINIMUM_SAMPLE_SIZE = 7;

export type ResponseTimeExclusionReason = "invalid" | "hard-cap" | "adaptive-outlier";

export interface ResponseTimeFilterOptions {
  /** Absolute ceiling used even before enough personal observations exist. */
  hardCapMs?: number;
  /** Number of usable observations required before applying a personal fence. */
  minimumSampleSize?: number;
  /** Minimum room above the median, preserving legitimately careful answers. */
  minimumHeadroomMs?: number;
  /** The adaptive fence is never lower than this multiple of the median. */
  medianMultiplier?: number;
  /** Number of scaled median absolute deviations allowed above the median. */
  madMultiplier?: number;
}

export interface ExcludedResponseTimeSample<T> {
  sample: T;
  responseMs: number;
  reason: ResponseTimeExclusionReason;
}

export interface ResponseTimeFilterResult<T> {
  /** Original samples whose response time is suitable for averages. */
  included: T[];
  /** Original samples excluded from response-time aggregates, with a reason. */
  excluded: Array<ExcludedResponseTimeSample<T>>;
  /** Inclusive upper bound used for valid response times. */
  upperBoundMs: number;
  /** Median of the usable personal reference sample, when adaptive logic ran. */
  referenceMedianMs: number | null;
  /** Median absolute deviation of the reference sample, when available. */
  referenceMadMs: number | null;
  strategy: "adaptive" | "hard-cap-fallback";
}

interface ResolvedResponseTimeFilterOptions {
  hardCapMs: number;
  minimumSampleSize: number;
  minimumHeadroomMs: number;
  medianMultiplier: number;
  madMultiplier: number;
}

const DEFAULT_OPTIONS: ResolvedResponseTimeFilterOptions = {
  hardCapMs: DEFAULT_RESPONSE_TIME_HARD_CAP_MS,
  minimumSampleSize: DEFAULT_RESPONSE_TIME_MINIMUM_SAMPLE_SIZE,
  minimumHeadroomMs: 120_000,
  medianMultiplier: 6,
  madMultiplier: 12,
};

function requirePositiveFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
  return value;
}

function resolveOptions(options: ResponseTimeFilterOptions): ResolvedResponseTimeFilterOptions {
  const hardCapMs = requirePositiveFinite(options.hardCapMs ?? DEFAULT_OPTIONS.hardCapMs, "hardCapMs");
  const minimumSampleSize = options.minimumSampleSize ?? DEFAULT_OPTIONS.minimumSampleSize;
  if (!Number.isInteger(minimumSampleSize) || minimumSampleSize < 3) {
    throw new RangeError("minimumSampleSize must be an integer of at least 3");
  }

  return {
    hardCapMs,
    minimumSampleSize,
    minimumHeadroomMs: requirePositiveFinite(options.minimumHeadroomMs ?? DEFAULT_OPTIONS.minimumHeadroomMs, "minimumHeadroomMs"),
    medianMultiplier: requirePositiveFinite(options.medianMultiplier ?? DEFAULT_OPTIONS.medianMultiplier, "medianMultiplier"),
    madMultiplier: requirePositiveFinite(options.madMultiplier ?? DEFAULT_OPTIONS.madMultiplier, "madMultiplier"),
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Returns a non-mutating subset for response-time statistics.
 *
 * Call this separately for populations with materially different task shapes
 * (for example, once for all attempts and once per skill). Accuracy, attempts,
 * error history, and persisted `responseMs` should continue to use raw records.
 */
export function filterResponseTimeOutliers<T>(
  samples: readonly T[],
  getResponseMs: (sample: T) => number,
  options: ResponseTimeFilterOptions = {},
): ResponseTimeFilterResult<T> {
  const resolved = resolveOptions(options);
  const measured = samples.map((sample) => ({ sample, responseMs: getResponseMs(sample) }));
  const usableReference = measured
    .map(({ responseMs }) => responseMs)
    .filter((responseMs) => Number.isFinite(responseMs) && responseMs >= 0 && responseMs <= resolved.hardCapMs);

  let upperBoundMs = resolved.hardCapMs;
  let referenceMedianMs: number | null = null;
  let referenceMadMs: number | null = null;
  let strategy: ResponseTimeFilterResult<T>["strategy"] = "hard-cap-fallback";

  if (usableReference.length >= resolved.minimumSampleSize) {
    referenceMedianMs = median(usableReference);
    referenceMadMs = median(usableReference.map((responseMs) => Math.abs(responseMs - referenceMedianMs!)));
    const scaledMad = referenceMadMs * 1.4826;
    const adaptiveFence = Math.max(
      referenceMedianMs + resolved.minimumHeadroomMs,
      referenceMedianMs * resolved.medianMultiplier,
      referenceMedianMs + scaledMad * resolved.madMultiplier,
    );
    upperBoundMs = Math.min(resolved.hardCapMs, adaptiveFence);
    strategy = "adaptive";
  }

  const included: T[] = [];
  const excluded: Array<ExcludedResponseTimeSample<T>> = [];

  for (const measurement of measured) {
    const { responseMs, sample } = measurement;
    if (!Number.isFinite(responseMs) || responseMs < 0) {
      excluded.push({ sample, responseMs, reason: "invalid" });
    } else if (responseMs > resolved.hardCapMs) {
      excluded.push({ sample, responseMs, reason: "hard-cap" });
    } else if (responseMs > upperBoundMs) {
      excluded.push({ sample, responseMs, reason: "adaptive-outlier" });
    } else {
      included.push(sample);
    }
  }

  return {
    included,
    excluded,
    upperBoundMs,
    referenceMedianMs,
    referenceMadMs,
    strategy,
  };
}
