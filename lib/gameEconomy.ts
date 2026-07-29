/**
 * Pure, client-safe game economy rules for Ordhavn.
 *
 * The module intentionally owns no persistence and reads no clock by itself.
 * Callers supply dates and keep the returned claim keys so every transaction is
 * deterministic, replayable and safe to rebuild from local events.
 */

export const ECONOMY_SCHEMA_VERSION = 1 as const;

export interface EconomyBalance {
  /** Activity and rank only. XP is deliberately absent from spending APIs. */
  xp: number;
  /** Soft currency earned by ordinary play. */
  kroner: number;
  /** Rare currency minted by measurement-quality achievements. */
  rav: number;
}

export interface EconomyReward {
  xp: number;
  kroner: number;
  rav: number;
}

export type ActivityRewardSource =
  | "lesson-completed"
  | "practice-completed"
  | "scenario-completed"
  | "weekly-storm-completed";

export const ACTIVITY_REWARDS: Readonly<Record<ActivityRewardSource, Readonly<EconomyReward>>> = {
  "lesson-completed": { xp: 80, kroner: 32, rav: 0 },
  "practice-completed": { xp: 35, kroner: 12, rav: 0 },
  "scenario-completed": { xp: 120, kroner: 50, rav: 0 },
  "weekly-storm-completed": { xp: 160, kroner: 70, rav: 0 },
};

export interface ScenarioKronerRewardInput {
  success: boolean;
  firstSuccess: boolean;
  contractReward?: number | null;
  explicitReward?: number | string | null;
}

/**
 * Scenario engines may calculate a local payout from puzzle quality. Keep that
 * amount authoritative so the result screen and the persisted balance agree.
 */
export function resolveScenarioKronerReward(input: ScenarioKronerRewardInput): number {
  if (!input.success) return 12;
  const explicitReward = input.explicitReward == null ? Number.NaN : Number(input.explicitReward);
  if (Number.isFinite(explicitReward) && explicitReward >= 0) return Math.round(explicitReward);
  if (!input.firstSuccess) return 36;
  const contractReward = input.contractReward ?? 90;
  return Number.isFinite(contractReward) && contractReward >= 0 ? Math.round(contractReward) : 90;
}

export const DEFAULT_BALANCE: Readonly<EconomyBalance> = {
  xp: 0,
  kroner: 120,
  rav: 0,
};

function requireNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative safe integer`);
  }
  return value;
}

function requireUnitInterval(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${fieldName} must be a finite number in [0, 1]`);
  }
  return value;
}

function validateBalance(balance: Readonly<EconomyBalance>): EconomyBalance {
  return {
    xp: requireNonNegativeInteger(balance.xp, "balance.xp"),
    kroner: requireNonNegativeInteger(balance.kroner, "balance.kroner"),
    rav: requireNonNegativeInteger(balance.rav, "balance.rav"),
  };
}

export function addReward(
  balance: Readonly<EconomyBalance>,
  reward: Readonly<EconomyReward>,
): EconomyBalance {
  const current = validateBalance(balance);
  const normalized = {
    xp: requireNonNegativeInteger(reward.xp, "reward.xp"),
    kroner: requireNonNegativeInteger(reward.kroner, "reward.kroner"),
    rav: requireNonNegativeInteger(reward.rav, "reward.rav"),
  };
  return {
    xp: current.xp + normalized.xp,
    kroner: current.kroner + normalized.kroner,
    rav: current.rav + normalized.rav,
  };
}

export function grantActivityReward(
  balance: Readonly<EconomyBalance>,
  source: ActivityRewardSource,
  multiplier = 1,
): EconomyBalance {
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new RangeError("multiplier must be a finite non-negative number");
  }
  const base = ACTIVITY_REWARDS[source];
  return addReward(balance, {
    xp: Math.round(base.xp * multiplier),
    kroner: Math.round(base.kroner * multiplier),
    rav: 0,
  });
}

/** XP cannot appear here, making it non-spendable at the type/API level. */
export type SpendableCurrency = "kroner" | "rav";

export type SpendResult =
  | { ok: true; balance: EconomyBalance; currency: SpendableCurrency; spent: number }
  | { ok: false; balance: EconomyBalance; currency: SpendableCurrency; shortfall: number };

export function spend(
  balance: Readonly<EconomyBalance>,
  currency: SpendableCurrency,
  amount: number,
): SpendResult {
  const current = validateBalance(balance);
  const cost = requireNonNegativeInteger(amount, "amount");
  if (current[currency] < cost) {
    return { ok: false, balance: current, currency, shortfall: cost - current[currency] };
  }
  return {
    ok: true,
    balance: { ...current, [currency]: current[currency] - cost },
    currency,
    spent: cost,
  };
}

export type MaritimeRankId =
  | "skibsdreng"
  | "letmatros"
  | "matros"
  | "baadsmand"
  | "styrmand"
  | "skipper"
  | "lods"
  | "havnefoged";

export type RankRetentionDay = 7 | 14;

export interface RankRetentionGate {
  day: RankRetentionDay;
  minimumRetention: number;
  minimumSamples: number;
}

export interface MaritimeRankDefinition {
  id: MaritimeRankId;
  name: string;
  description: string;
  minimumXp: number;
  retentionGates: readonly RankRetentionGate[];
}

/**
 * XP requirements express activity; retention gates express durable learning.
 * Later ranks deliberately require both day-7 and day-14 evidence.
 */
export const MARITIME_RANKS: readonly MaritimeRankDefinition[] = [
  {
    id: "skibsdreng",
    name: "Skibsdreng",
    description: "Du er gået om bord og lærer havnens første ord.",
    minimumXp: 0,
    retentionGates: [],
  },
  {
    id: "letmatros",
    name: "Letmatros",
    description: "Du kan tage en kort vagt på egen hånd.",
    minimumXp: 500,
    retentionGates: [],
  },
  {
    id: "matros",
    name: "Matros",
    description: "Din dag-7-hukommelse holder kursen.",
    minimumXp: 1_400,
    retentionGates: [{ day: 7, minimumRetention: 0.6, minimumSamples: 10 }],
  },
  {
    id: "baadsmand",
    name: "Bådsmand",
    description: "Du kan holde orden på både ord og besætning.",
    minimumXp: 3_000,
    retentionGates: [{ day: 7, minimumRetention: 0.65, minimumSamples: 12 }],
  },
  {
    id: "styrmand",
    name: "Styrmand",
    description: "Du navigerer sikkert gennem længere mellemrum.",
    minimumXp: 5_200,
    retentionGates: [{ day: 7, minimumRetention: 0.7, minimumSamples: 14 }],
  },
  {
    id: "skipper",
    name: "Skipper",
    description: "Din viden overlever både en og to uger.",
    minimumXp: 8_000,
    retentionGates: [
      { day: 7, minimumRetention: 0.72, minimumSamples: 16 },
      { day: 14, minimumRetention: 0.65, minimumSamples: 10 },
    ],
  },
  {
    id: "lods",
    name: "Lods",
    description: "Du kan føre andre sikkert ind i dansk farvand.",
    minimumXp: 12_000,
    retentionGates: [
      { day: 7, minimumRetention: 0.75, minimumSamples: 18 },
      { day: 14, minimumRetention: 0.7, minimumSamples: 14 },
    ],
  },
  {
    id: "havnefoged",
    name: "Havnefoged",
    description: "Du holder hele Ordhavn levende.",
    minimumXp: 18_000,
    retentionGates: [
      { day: 7, minimumRetention: 0.8, minimumSamples: 20 },
      { day: 14, minimumRetention: 0.75, minimumSamples: 18 },
    ],
  },
];

export interface RetentionMeasurement {
  retention: number;
  samples: number;
}

export type RankRetentionMeasurements = Partial<Record<RankRetentionDay, RetentionMeasurement>>;

export type RankGateFailureReason = "missing-measurement" | "insufficient-samples" | "low-retention";

export interface RankGateReport extends RankRetentionGate {
  actualRetention: number | null;
  actualSamples: number;
  met: boolean;
  reason: RankGateFailureReason | null;
}

export type RankStanding = "stable" | "retention-locked" | "threatened" | "demoted";

export interface RankEvaluation {
  /** Rank shown to the player after applying the selected demotion policy. */
  rank: MaritimeRankDefinition;
  /** Highest rank currently supported by both XP and retention evidence. */
  qualifiedRank: MaritimeRankDefinition;
  /** Highest rank supported by XP alone. */
  xpRank: MaritimeRankDefinition;
  standing: RankStanding;
  /** Previous or XP-earned rank whose retention gates are currently failing. */
  rankAtRisk: MaritimeRankDefinition | null;
  fallbackRank: MaritimeRankDefinition;
  gateReports: readonly RankGateReport[];
  nextRank: MaritimeRankDefinition | null;
}

export interface EvaluateRankInput {
  xp: number;
  retention: RankRetentionMeasurements;
  previousRankId?: MaritimeRankId | null;
  /** "threaten" preserves the displayed rank; "demote" applies the fallback. */
  retentionFailurePolicy?: "threaten" | "demote";
}

function rankIndex(rankId: MaritimeRankId): number {
  const index = MARITIME_RANKS.findIndex((rank) => rank.id === rankId);
  if (index < 0) throw new RangeError(`Unknown maritime rank: ${rankId}`);
  return index;
}

function reportRetentionGates(
  definition: MaritimeRankDefinition,
  measurements: RankRetentionMeasurements,
): RankGateReport[] {
  return definition.retentionGates.map((gate) => {
    const measurement = measurements[gate.day];
    if (!measurement) {
      return { ...gate, actualRetention: null, actualSamples: 0, met: false, reason: "missing-measurement" };
    }
    requireUnitInterval(measurement.retention, `retention[${gate.day}].retention`);
    requireNonNegativeInteger(measurement.samples, `retention[${gate.day}].samples`);
    if (measurement.samples < gate.minimumSamples) {
      return {
        ...gate,
        actualRetention: measurement.retention,
        actualSamples: measurement.samples,
        met: false,
        reason: "insufficient-samples",
      };
    }
    const met = measurement.retention >= gate.minimumRetention;
    return {
      ...gate,
      actualRetention: measurement.retention,
      actualSamples: measurement.samples,
      met,
      reason: met ? null : "low-retention",
    };
  });
}

export function evaluateMaritimeRank(input: Readonly<EvaluateRankInput>): RankEvaluation {
  const xp = requireNonNegativeInteger(input.xp, "xp");
  for (const day of [7, 14] as const) {
    const measurement = input.retention[day];
    if (measurement) {
      requireUnitInterval(measurement.retention, `retention[${day}].retention`);
      requireNonNegativeInteger(measurement.samples, `retention[${day}].samples`);
    }
  }

  const xpRank = [...MARITIME_RANKS].reverse().find((rank) => xp >= rank.minimumXp) ?? MARITIME_RANKS[0];
  const qualifiedRank = [...MARITIME_RANKS]
    .reverse()
    .find((rank) => xp >= rank.minimumXp && reportRetentionGates(rank, input.retention).every((gate) => gate.met))
    ?? MARITIME_RANKS[0];

  const qualifiedIndex = rankIndex(qualifiedRank.id);
  const xpIndex = rankIndex(xpRank.id);
  const previousRank = input.previousRankId
    ? MARITIME_RANKS[rankIndex(input.previousRankId)]
    : null;
  const previousIndex = previousRank ? rankIndex(previousRank.id) : -1;
  const atRisk = previousRank && previousIndex > qualifiedIndex
    ? previousRank
    : xpIndex > qualifiedIndex
      ? xpRank
      : null;
  const policy = input.retentionFailurePolicy ?? "threaten";

  let rank = qualifiedRank;
  let standing: RankStanding = xpIndex > qualifiedIndex ? "retention-locked" : "stable";
  if (previousRank && previousIndex > qualifiedIndex) {
    if (policy === "demote") {
      standing = "demoted";
    } else {
      rank = previousRank;
      standing = "threatened";
    }
  }

  const gateTarget = atRisk ?? rank;
  const rankPosition = rankIndex(rank.id);
  return {
    rank,
    qualifiedRank,
    xpRank,
    standing,
    rankAtRisk: atRisk,
    fallbackRank: qualifiedRank,
    gateReports: reportRetentionGates(gateTarget, input.retention),
    nextRank: MARITIME_RANKS[rankPosition + 1] ?? null,
  };
}

export const RAV_BRIER_THRESHOLD = 0.1 as const;

export type RavMintSignal =
  | {
      kind: "holdout";
      masteryKey: string;
      checkpointDay: 7 | 14;
      correct: boolean;
    }
  | {
      kind: "brier";
      attemptId: string;
      attemptNumber: number;
      brierScore: number;
    }
  | {
      kind: "scenario";
      runId: string;
      success: boolean;
      attemptNumber: number;
      checksUsed: number;
      hintsUsed: number;
    };

export type RavMintReason = "holdout-day-7" | "holdout-day-14" | "calibrated-brier" | "first-try-scenario";

export interface RavMintAward {
  claimKey: string;
  reason: RavMintReason;
  amount: number;
}

/**
 * Returns null for an ineligible or already claimed event. Persist claimKey,
 * not only the amount, to make rare-currency minting idempotent.
 */
export function evaluateRavMint(
  signal: Readonly<RavMintSignal>,
  claimedKeys: ReadonlySet<string> | readonly string[] = [],
): RavMintAward | null {
  const claimed = claimedKeys instanceof Set ? claimedKeys : new Set(claimedKeys);
  let award: RavMintAward | null = null;

  if (signal.kind === "holdout" && signal.correct) {
    const reason = signal.checkpointDay === 14 ? "holdout-day-14" : "holdout-day-7";
    award = {
      claimKey: `rav:holdout:${signal.masteryKey}:${signal.checkpointDay}`,
      reason,
      amount: signal.checkpointDay === 14 ? 2 : 1,
    };
  }

  if (signal.kind === "brier") {
    requireNonNegativeInteger(signal.attemptNumber, "attemptNumber");
    requireUnitInterval(signal.brierScore, "brierScore");
    if (signal.attemptNumber === 1 && signal.brierScore <= RAV_BRIER_THRESHOLD) {
      award = {
        claimKey: `rav:brier:${signal.attemptId}`,
        reason: "calibrated-brier",
        amount: signal.brierScore <= 0.04 ? 2 : 1,
      };
    }
  }

  if (signal.kind === "scenario") {
    requireNonNegativeInteger(signal.attemptNumber, "attemptNumber");
    requireNonNegativeInteger(signal.checksUsed, "checksUsed");
    requireNonNegativeInteger(signal.hintsUsed, "hintsUsed");
    if (
      signal.success
      && signal.attemptNumber === 1
      && signal.checksUsed === 1
      && signal.hintsUsed === 0
    ) {
      award = {
        claimKey: `rav:scenario:${signal.runId}`,
        reason: "first-try-scenario",
        amount: 2,
      };
    }
  }

  return award && !claimed.has(award.claimKey) ? award : null;
}

export function applyRavMint(
  balance: Readonly<EconomyBalance>,
  award: Readonly<RavMintAward>,
): EconomyBalance {
  return addReward(balance, { xp: 0, kroner: 0, rav: award.amount });
}

export type HarborBenefit =
  | { kind: "daily-hint-refill"; amount: number }
  | { kind: "weak-item-reroll"; amountPerDay: number }
  | { kind: "drifting-word-forecast"; daysAhead: number }
  | { kind: "custom-training-sets"; maximumSets: number }
  | { kind: "weekly-storm-analysis"; revealErrorPattern: boolean };

export interface HarborBuildingDefinition {
  id: "kaffebaren" | "biblioteket" | "fyrtaarnet" | "vaerftet" | "toldboden";
  name: string;
  description: string;
  costKroner: number;
  requiredRank: MaritimeRankId;
  benefit: HarborBenefit;
}

export const HARBOR_BUILDINGS: readonly HarborBuildingDefinition[] = [
  {
    id: "kaffebaren",
    name: "Kaffebaren",
    description: "En varm kop giver én ny ledetråd hver dag.",
    costKroner: 350,
    requiredRank: "letmatros",
    benefit: { kind: "daily-hint-refill", amount: 1 },
  },
  {
    id: "biblioteket",
    name: "Biblioteket",
    description: "Finder fejlmønstre og lader dig skifte ét svagt kort om dagen.",
    costKroner: 650,
    requiredRank: "matros",
    benefit: { kind: "weak-item-reroll", amountPerDay: 1 },
  },
  {
    id: "fyrtaarnet",
    name: "Fyrtårnet",
    description: "Lyser på ord, der driver tilbage mod FSRS-køen.",
    costKroner: 900,
    requiredRank: "baadsmand",
    benefit: { kind: "drifting-word-forecast", daysAhead: 7 },
  },
  {
    id: "vaerftet",
    name: "Værftet",
    description: "Byg dine egne målrettede træningssæt.",
    costKroner: 1_300,
    requiredRank: "styrmand",
    benefit: { kind: "custom-training-sets", maximumSets: 12 },
  },
  {
    id: "toldboden",
    name: "Toldboden",
    description: "Analyserer fejlen efter ugens stormforsøg.",
    costKroner: 1_750,
    requiredRank: "skipper",
    benefit: { kind: "weekly-storm-analysis", revealErrorPattern: true },
  },
];

export type HarborBuildingId = (typeof HARBOR_BUILDINGS)[number]["id"];

export type PurchaseBuildingResult =
  | { ok: true; balance: EconomyBalance; building: HarborBuildingDefinition; owned: HarborBuildingId[] }
  | {
      ok: false;
      balance: EconomyBalance;
      building: HarborBuildingDefinition;
      owned: HarborBuildingId[];
      reason: "already-owned" | "rank-locked" | "insufficient-kroner";
      shortfall?: number;
    };

export function purchaseHarborBuilding(
  balance: Readonly<EconomyBalance>,
  buildingId: HarborBuildingId,
  ownedBuildingIds: readonly HarborBuildingId[],
  rankId: MaritimeRankId,
): PurchaseBuildingResult {
  const current = validateBalance(balance);
  const building = HARBOR_BUILDINGS.find((candidate) => candidate.id === buildingId);
  if (!building) throw new RangeError(`Unknown harbor building: ${buildingId}`);
  const owned = [...new Set(ownedBuildingIds)];
  if (owned.includes(buildingId)) {
    return { ok: false, balance: current, building, owned, reason: "already-owned" };
  }
  if (rankIndex(rankId) < rankIndex(building.requiredRank)) {
    return { ok: false, balance: current, building, owned, reason: "rank-locked" };
  }
  const payment = spend(current, "kroner", building.costKroner);
  if (!payment.ok) {
    return {
      ok: false,
      balance: current,
      building,
      owned,
      reason: "insufficient-kroner",
      shortfall: payment.shortfall,
    };
  }
  return { ok: true, balance: payment.balance, building, owned: [...owned, buildingId] };
}

export const DEFAULT_DAILY_HARBOR_FEE = 8 as const;
export const DEFAULT_HARBOR_BALANCE_FLOOR = 50 as const;

export interface ApplyHarborFeeInput {
  balance: Readonly<EconomyBalance>;
  /** YYYY-MM-DD; null means the account is being initialized today. */
  lastChargedOn: string | null;
  throughDate: string;
  dailyFeeKroner?: number;
  balanceFloorKroner?: number;
}

export interface HarborFeeStatement {
  balance: EconomyBalance;
  previousBalance: EconomyBalance;
  lastChargedOn: string;
  chargedDays: number;
  nominalFee: number;
  chargedKroner: number;
  protectedByFloor: number;
}

const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string, fieldName: string): number {
  if (!DATE_ONLY.test(value)) throw new TypeError(`${fieldName} must use YYYY-MM-DD`);
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${fieldName} must be a valid calendar date`);
  }
  return timestamp;
}

export function applyDailyHarborFee(input: Readonly<ApplyHarborFeeInput>): HarborFeeStatement {
  const previousBalance = validateBalance(input.balance);
  const throughTimestamp = parseDateOnly(input.throughDate, "throughDate");
  const dailyFee = requireNonNegativeInteger(input.dailyFeeKroner ?? DEFAULT_DAILY_HARBOR_FEE, "dailyFeeKroner");
  const floor = requireNonNegativeInteger(input.balanceFloorKroner ?? DEFAULT_HARBOR_BALANCE_FLOOR, "balanceFloorKroner");

  if (input.lastChargedOn === null) {
    return {
      balance: previousBalance,
      previousBalance,
      lastChargedOn: input.throughDate,
      chargedDays: 0,
      nominalFee: 0,
      chargedKroner: 0,
      protectedByFloor: 0,
    };
  }

  const previousTimestamp = parseDateOnly(input.lastChargedOn, "lastChargedOn");
  if (throughTimestamp < previousTimestamp) {
    throw new RangeError("throughDate cannot precede lastChargedOn");
  }
  const chargedDays = Math.floor((throughTimestamp - previousTimestamp) / DAY_MS);
  const nominalFee = chargedDays * dailyFee;
  const availableAboveFloor = Math.max(0, previousBalance.kroner - floor);
  const chargedKroner = Math.min(nominalFee, availableAboveFloor);
  return {
    balance: { ...previousBalance, kroner: previousBalance.kroner - chargedKroner },
    previousBalance,
    lastChargedOn: input.throughDate,
    chargedDays,
    nominalFee,
    chargedKroner,
    protectedByFloor: nominalFee - chargedKroner,
  };
}

export function genderConfidenceMultiplier(confidencePercent: number): number {
  if (!Number.isInteger(confidencePercent) || confidencePercent < 50 || confidencePercent > 100) {
    throw new RangeError("confidencePercent must be an integer in [50, 100]");
  }
  return Math.round((1.2 + ((confidencePercent - 50) / 50) * 1.8) * 100) / 100;
}

export interface GenderWagerSettlement {
  stake: number;
  confidencePercent: number;
  multiplier: number;
  correct: boolean;
  returnedKroner: number;
  profitKroner: number;
}

export function settleGenderWager(
  stake: number,
  confidencePercent: number,
  correct: boolean,
): GenderWagerSettlement {
  const normalizedStake = requireNonNegativeInteger(stake, "stake");
  const multiplier = genderConfidenceMultiplier(confidencePercent);
  const returnedKroner = correct ? Math.floor(normalizedStake * multiplier) : 0;
  return {
    stake: normalizedStake,
    confidencePercent,
    multiplier,
    correct,
    returnedKroner,
    profitKroner: returnedKroner - normalizedStake,
  };
}

export type KonsbankenRunStatus = "active" | "cashout-ready" | "lost" | "cashed-out";

export interface KonsbankenRun {
  id: string;
  initialStake: number;
  bankKroner: number;
  completedRounds: number;
  maximumRounds: 10;
  status: KonsbankenRunStatus;
  settlements: readonly GenderWagerSettlement[];
}

export type StartKonsbankenResult =
  | { ok: true; balance: EconomyBalance; run: KonsbankenRun }
  | { ok: false; balance: EconomyBalance; shortfall: number };

export function startKonsbankenRun(
  balance: Readonly<EconomyBalance>,
  stake: number,
  runId: string,
): StartKonsbankenResult {
  const normalizedId = runId.trim();
  if (!normalizedId) throw new TypeError("runId must not be empty");
  const normalizedStake = requireNonNegativeInteger(stake, "stake");
  if (normalizedStake < 10) throw new RangeError("Kønsbanken stake must be at least 10 kroner");
  const payment = spend(balance, "kroner", normalizedStake);
  if (!payment.ok) return { ok: false, balance: payment.balance, shortfall: payment.shortfall };
  return {
    ok: true,
    balance: payment.balance,
    run: {
      id: normalizedId,
      initialStake: normalizedStake,
      bankKroner: normalizedStake,
      completedRounds: 0,
      maximumRounds: 10,
      status: "active",
      settlements: [],
    },
  };
}

export function playKonsbankenRound(
  run: Readonly<KonsbankenRun>,
  confidencePercent: number,
  correct: boolean,
): KonsbankenRun {
  if (run.status !== "active") throw new Error("Kønsbanken run is not active");
  if (run.completedRounds >= run.maximumRounds) throw new Error("Kønsbanken run already has ten rounds");
  const settlement = settleGenderWager(run.bankKroner, confidencePercent, correct);
  const completedRounds = run.completedRounds + 1;
  return {
    ...run,
    bankKroner: settlement.returnedKroner,
    completedRounds,
    status: correct
      ? completedRounds === run.maximumRounds ? "cashout-ready" : "active"
      : "lost",
    settlements: [...run.settlements, settlement],
  };
}

export interface CashOutKonsbankenResult {
  balance: EconomyBalance;
  run: KonsbankenRun;
  paidKroner: number;
}

export function cashOutKonsbanken(
  balance: Readonly<EconomyBalance>,
  run: Readonly<KonsbankenRun>,
): CashOutKonsbankenResult {
  if (run.status !== "active" && run.status !== "cashout-ready") {
    throw new Error("Only an active winning Kønsbanken run can be cashed out");
  }
  const nextBalance = addReward(balance, { xp: 0, kroner: run.bankKroner, rav: 0 });
  return {
    balance: nextBalance,
    run: { ...run, status: "cashed-out", settlements: [...run.settlements] },
    paidKroner: run.bankKroner,
  };
}

export interface WeeklyStormCandidate {
  itemId: string;
  /** 0 means mastered, 1 means maximally weak. */
  weakness: number;
  skill?: string;
}

export interface WeeklyStormChallenge {
  id: string;
  weekStartsOn: string;
  seed: number;
  itemIds: readonly string[];
  attemptLimit: 1;
}

export interface CreateWeeklyStormInput {
  profileId: string;
  date: Date | string | number;
  candidates: readonly WeeklyStormCandidate[];
  itemCount?: number;
}

function asValidDate(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("date must be valid");
  return date;
}

/** UTC Monday for stable offline generation across locale settings. */
export function getWeeklyStormMonday(value: Date | string | number): string {
  const date = asValidDate(value);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = new Date(midnight).getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return new Date(midnight - daysSinceMonday * DAY_MS).toISOString().slice(0, 10);
}

/** Stable unsigned FNV-1a hash. */
export function deterministicSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededUnit(seed: number, key: string): number {
  return deterministicSeed(`${seed}:${key}`) / 0x1_0000_0000;
}

export function createWeeklyStorm(input: Readonly<CreateWeeklyStormInput>): WeeklyStormChallenge {
  const profileId = input.profileId.trim();
  if (!profileId) throw new TypeError("profileId must not be empty");
  const itemCount = input.itemCount ?? 7;
  if (!Number.isSafeInteger(itemCount) || itemCount < 1) {
    throw new RangeError("itemCount must be a positive safe integer");
  }
  const weekStartsOn = getWeeklyStormMonday(input.date);
  const seed = deterministicSeed(`${profileId}:${weekStartsOn}`);
  const uniqueCandidates = new Map<string, WeeklyStormCandidate>();
  for (const candidate of input.candidates) {
    const itemId = candidate.itemId.trim();
    if (!itemId) throw new TypeError("candidate.itemId must not be empty");
    requireUnitInterval(candidate.weakness, `candidate[${itemId}].weakness`);
    const previous = uniqueCandidates.get(itemId);
    if (!previous || candidate.weakness > previous.weakness) {
      uniqueCandidates.set(itemId, { ...candidate, itemId });
    }
  }
  const ranked = [...uniqueCandidates.values()].sort((left, right) => {
    // Weakness dominates; seeded variation keeps adjacent weeks from becoming identical.
    const leftScore = left.weakness * 0.8 + seededUnit(seed, left.itemId) * 0.2;
    const rightScore = right.weakness * 0.8 + seededUnit(seed, right.itemId) * 0.2;
    return rightScore - leftScore || left.itemId.localeCompare(right.itemId);
  });
  return {
    id: `storm:${weekStartsOn}:${seed.toString(16).padStart(8, "0")}`,
    weekStartsOn,
    seed,
    itemIds: ranked.slice(0, itemCount).map((candidate) => candidate.itemId),
    attemptLimit: 1,
  };
}

export interface WeeklyStormAttemptRef {
  stormId: string;
  completedAt: string;
  score: number;
}

export function canAttemptWeeklyStorm(
  storm: Readonly<WeeklyStormChallenge>,
  attempts: readonly WeeklyStormAttemptRef[],
): boolean {
  return !attempts.some((attempt) => attempt.stormId === storm.id);
}
