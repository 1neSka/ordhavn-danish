"use client";

import { type CSSProperties, useMemo, useState } from "react";
import Image from "next/image";
import {
  Anchor,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Compass,
  Gem,
  Hammer,
  Lightbulb,
  LockKeyhole,
  MessageCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { courseLevels, type GenderBetItem, type Mission } from "@/lib/courseData";
import {
  HARBOR_BUILDINGS,
  evaluateMaritimeRank,
  genderConfidenceMultiplier,
  getWeeklyStormMonday,
  settleGenderWager,
  type HarborBenefit,
  type HarborBuildingId,
  type RankRetentionMeasurements,
} from "@/lib/gameEconomy";
import type { ScenarioRun } from "@/lib/scenarioData";

export type HarborDestination = "path" | "practice" | "scenarios" | "stats";

export interface HarborAttempt {
  questionId?: string;
  missionId?: string;
  skill?: string;
  tags?: readonly string[];
  correct: boolean;
  brierScore?: number | null;
  timestamp?: string;
}

export interface HarborHomeProps {
  xp: number;
  kroner: number;
  rav: number;
  streak: number;
  completedMissions: readonly string[];
  attempts: readonly HarborAttempt[];
  scenarioRuns: readonly ScenarioRun[];
  weeklyStorms: readonly { weekId: string; completedAt: string; score: number; total: number }[];
  purchasedBuildings: readonly string[];
  relationships: Readonly<Record<string, number>>;
  repliedCharacterIds: readonly string[];
  retention: RankRetentionMeasurements;
  dueCount: number;
  forecastCount: number;
  maritimeRankId: import("@/lib/gameEconomy").MaritimeRankId;
  nextMission: Mission | null;
  onStartNext: (mission: Mission) => void;
  onStartReview: () => void;
  onReplyCharacter: (characterId: string) => void;
  onNavigate: (destination: HarborDestination) => void;
  onBuyBuilding: (buildingId: HarborBuildingId, costKroner: number) => boolean | void;
  onOpenGenderBank: () => void;
  onStartStorm: () => void;
}

type HarborCharacter = {
  id: "freja" | "maja" | "nora";
  name: string;
  portrait: string;
  accent: string;
};

const harborCharacters: readonly HarborCharacter[] = [
  { id: "freja", name: "Freja", portrait: "/characters/freja.png", accent: "rose" },
  { id: "maja", name: "Maja", portrait: "/characters/maja.png", accent: "mint" },
  { id: "nora", name: "Nora", portrait: "/characters/nora.png", accent: "blue" },
];

const buildingIcons: Readonly<Record<HarborBuildingId, typeof Coffee>> = {
  kaffebaren: Coffee,
  biblioteket: BookOpen,
  fyrtaarnet: Lightbulb,
  vaerftet: Hammer,
  toldboden: BarChart3,
};

function describeBenefit(benefit: HarborBenefit): string {
  switch (benefit.kind) {
    case "daily-hint-refill":
      return `+${benefit.amount} ledetråd hver dag`;
    case "weak-item-reroll":
      return `${benefit.amountPerDay} omvalg af et svagt kort om dagen`;
    case "drifting-word-forecast":
      return `Se drivende ord ${benefit.daysAhead} dage frem`;
    case "custom-training-sets":
      return `Byg op til ${benefit.maximumSets} egne træningssæt`;
    case "weekly-storm-analysis":
      return benefit.revealErrorPattern ? "Vis fejlmønsteret efter stormen" : "Stormanalyse";
  }
}

function characterMessage(
  characterId: HarborCharacter["id"],
  relationship: number,
  attempts: readonly HarborAttempt[],
  runs: readonly ScenarioRun[],
): { eyebrow: string; text: string; action: string } {
  const brierAttempts = attempts.filter((attempt) => attempt.brierScore !== null && attempt.brierScore !== undefined);
  const meanBrier = brierAttempts.length
    ? brierAttempts.reduce((sum, attempt) => sum + (attempt.brierScore ?? 0), 0) / brierAttempts.length
    : null;
  const politeness = attempts.filter((attempt) => {
    const searchable = `${attempt.skill ?? ""} ${(attempt.tags ?? []).join(" ")}`.toLocaleLowerCase("da-DK");
    return searchable.includes("høflig") || searchable.includes("hedg") || searchable.includes("dialog");
  });
  const politenessAccuracy = politeness.length
    ? politeness.filter((attempt) => attempt.correct).length / politeness.length
    : null;
  const successfulCases = new Set(runs.filter((run) => run.success).map((run) => run.caseId));

  if (characterId === "freja") {
    if (meanBrier !== null && meanBrier > 0.18) {
      return {
        eyebrow: "Freja bemærkede noget",
        text: "Du lød meget sikker i Kønsbanken. Var du sikker — eller håbede du bare?",
        action: "Kalibrér dit instinkt",
      };
    }
    return successfulCases.has("phone-roaming")
      ? {
          eyebrow: `Forhold ${relationship}/5`,
          text: "Telefonen virker på rejsen. Jeg har en sværere indstilling til dig, hvis du tør.",
          action: "Læs Frejas kontrakt",
        }
      : {
          eyebrow: "Ny besked fra Freja",
          text: "Mit internet skal virke i Sverige uden at alle apps bruger data. Kan du ordne det?",
          action: "Åbn telefonkontrakten",
        };
  }

  if (characterId === "maja") {
    return relationship >= 3
      ? {
          eyebrow: `Forhold ${relationship}/5`,
          text: "Tak fordi du ikke overtog præsentationen. Vil du øve den næste samtale med mig?",
          action: "Mød Maja på kajen",
        }
      : {
          eyebrow: "Maja venter ved caféen",
          text: "Jeg har fundet en fejl før mødet. Hjælp mig med en plan — ikke med at skjule den.",
          action: "Tag samtalen",
        };
  }

  if (politenessAccuracy !== null && politenessAccuracy < 0.65) {
    return {
      eyebrow: "Nora læste dine svar",
      text: "Dine fakta er klare, men tonen er for hård. Et præcist forbehold er ikke det samme som usikkerhed.",
      action: "Træn nuancer",
    };
  }
  return {
    eyebrow: `Forhold ${relationship}/5`,
    text: "Der er to kilder og kun én troværdig tidslinje. Kom til redaktionen, når du er klar.",
    action: "Undersøg Noras sag",
  };
}

function nextGateText(
  retention: RankRetentionMeasurements,
  day: 7 | 14,
  minimumRetention: number,
  minimumSamples: number,
): string {
  const measurement = retention[day];
  if (!measurement) return `Dag ${day}: 0/${minimumSamples} målinger`;
  const retentionPercent = Math.round(measurement.retention * 100);
  return `Dag ${day}: ${retentionPercent}% · ${measurement.samples}/${minimumSamples} målinger`;
}

export function HarborHome({
  xp,
  kroner,
  rav,
  streak,
  completedMissions,
  attempts,
  scenarioRuns,
  weeklyStorms,
  purchasedBuildings,
  relationships,
  repliedCharacterIds,
  retention,
  dueCount,
  forecastCount,
  maritimeRankId,
  nextMission,
  onStartNext,
  onStartReview,
  onReplyCharacter,
  onNavigate,
  onBuyBuilding,
  onOpenGenderBank,
  onStartStorm,
}: HarborHomeProps) {
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const rank = useMemo(() => evaluateMaritimeRank({ xp, retention, previousRankId: maritimeRankId, retentionFailurePolicy: "threaten" }), [xp, retention, maritimeRankId]);
  const owned = useMemo(() => new Set(purchasedBuildings), [purchasedBuildings]);
  const rankTarget = rank.rankAtRisk ?? rank.nextRank;
  const rankStartXp = rank.rank.minimumXp;
  const rankEndXp = rankTarget?.minimumXp ?? rank.rank.minimumXp;
  const rankProgress = rankTarget
    ? Math.max(0, Math.min(100, ((xp - rankStartXp) / Math.max(1, rankEndXp - rankStartXp)) * 100))
    : 100;
  const tidePercent = Math.min(96, 24 + streak * 9);
  const tideLabel = tidePercent >= 80 ? "Højvande" : tidePercent >= 50 ? "Stigende tidevand" : "Lavvande";
  const uniqueWeakItems = new Set(attempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.questionId).filter(Boolean));
  const currentStormPrefix = `storm:${getWeeklyStormMonday(new Date())}:`;
  const currentStormCompleted = weeklyStorms.some((storm) => storm.weekId.startsWith(currentStormPrefix));
  const lastStorm = weeklyStorms.at(-1);
  const lastStormMistakes = lastStorm ? attempts.filter((attempt) => attempt.missionId === lastStorm.weekId && !attempt.correct) : [];
  const stormPattern = [...lastStormMistakes.reduce((counts, attempt) => {
    const skill = attempt.skill ?? "blandede færdigheder";
    counts.set(skill, (counts.get(skill) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  const completedLevelCount = courseLevels.filter((level) => level.missions.every((mission) => completedMissions.includes(mission.id))).length;
  const builtMilestones = [
    { id: "bro", label: "Velkomstbro", visible: completedLevelCount >= 1, className: "house" },
    { id: "ur", label: "Havneuret", visible: completedLevelCount >= 2, className: "station" },
    { id: "smag", label: "Smag på dansk", visible: completedLevelCount >= 3, className: "cafe" },
    { id: "bolig", label: "Havnehus", visible: completedLevelCount >= 4, className: "house" },
    { id: "park", label: "Kajparken", visible: completedLevelCount >= 5, className: "cafe" },
    { id: "klinik", label: "Klinik", visible: completedLevelCount >= 6, className: "clinic" },
    { id: "torv", label: "Havnetorvet", visible: completedLevelCount >= 7, className: "house" },
    { id: "arkiv", label: "Søarkivet", visible: completedLevelCount >= 8, className: "clinic" },
    { id: "raad", label: "Havnerådet", visible: completedLevelCount >= 9, className: "station" },
    { id: "lods", label: "Lodshuset", visible: completedLevelCount >= 10, className: "cafe" },
    {
      id: "station",
      label: "Havnestation",
      visible: scenarioRuns.some((run) => run.kind === "metro" && run.success),
      className: "station",
    },
  ].filter((milestone) => milestone.visible);

  const handlePurchase = (buildingId: HarborBuildingId, cost: number, name: string) => {
    const accepted = onBuyBuilding(buildingId, cost);
    setPurchaseMessage(accepted === false ? "Købet kunne ikke gennemføres." : `${name} er bestilt til havnen.`);
  };

  return (
    <main className="harbor-home">
      <header className="harbor-heading">
        <div>
          <span className="eyebrow"><Anchor size={15} /> ORDHAVN</span>
          <h1>God vagt, {rank.rank.name}</h1>
          <p>Din hukommelse bygger havnen. Din indsats holder vandet højt.</p>
        </div>
        <div className="harbor-wallet" aria-label="Din beholdning">
          <span><Trophy size={17} /><strong>{xp.toLocaleString("da-DK")}</strong> XP</span>
          <span><span className="kr-symbol">kr.</span><strong>{kroner.toLocaleString("da-DK")}</strong></span>
          <span><Gem size={17} /><strong>{rav}</strong> rav</span>
        </div>
      </header>

      <section
        className={`harbor-scene ${tidePercent >= 80 ? "high-tide" : tidePercent >= 50 ? "rising-tide" : "low-tide"}`}
        style={{ "--tide-level": `${tidePercent}%` } as CSSProperties}
        aria-label="Din voksende ordhavn"
      >
        <div className="harbor-sky">
          <div className="harbor-cloud cloud-one" />
          <div className="harbor-cloud cloud-two" />
          <div className="harbor-sun"><Sparkles size={20} /></div>
        </div>
        <div className="harbor-horizon">
          <span className="tide-chip"><Waves size={16} /> {tideLabel} · {streak} dages rytme</span>
          <div className="harbor-town">
            {builtMilestones.map((milestone) => (
              <div className={`scene-building ${milestone.className}`} key={milestone.id}>
                <i />
                <strong>{milestone.label}</strong>
              </div>
            ))}
            {HARBOR_BUILDINGS.filter((building) => owned.has(building.id)).map((building) => {
              const Icon = buildingIcons[building.id];
              return (
                <button
                  className={`scene-building purchased ${building.id}`}
                  key={building.id}
                  title={describeBenefit(building.benefit)}
                  onClick={() => document.getElementById("harbor-shop")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Icon size={22} />
                  <strong>{building.name}</strong>
                </button>
              );
            })}
          </div>
        </div>
        <div className="harbor-water">
          <div className="wave wave-one" />
          <div className="wave wave-two" />
          <div className="harbor-boat boat-one"><span>Ø</span></div>
          <div className="harbor-boat boat-two"><span /></div>
        </div>
        <div className="harbor-quay">
          <button className="quay-action next-berth" disabled={!nextMission} onClick={() => nextMission && onStartNext(nextMission)}>
            <span className="quay-icon"><Play size={21} /></span>
            <span>
              <small>NÆSTE AFGANG</small>
              <strong>{nextMission?.title ?? "Alle aktuelle missioner klaret"}</strong>
              <em>{nextMission ? `${nextMission.estimatedMinutes} min · +${nextMission.xp} XP` : "Se efter nye kontrakter"}</em>
            </span>
            <ChevronRight size={20} />
          </button>
          <button className="quay-action review-berth" onClick={onStartReview} disabled={dueCount === 0}>
            <span className="quay-icon"><Clock3 size={21} /></span>
            <span><small>{owned.has("fyrtaarnet") ? "FYRTÅRNET KALDER" : "DAGENS GENTAGELSER"}</small><strong>{dueCount ? `${dueCount} ord er klar` : "Roligt farvand"}</strong><em>{owned.has("fyrtaarnet") ? `${forecastCount} ekstra ord driver ind de næste syv dage` : "Faste holdout-tider og FSRS"}</em></span>
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      <section className={`rank-gate-card ${rank.standing}`}>
        <div className="rank-seal"><Compass size={27} /></div>
        <div className="rank-gate-copy">
          <span className="eyebrow">
            {rank.standing === "retention-locked" ? "RETENTIONSPORTEN" : rank.standing === "threatened" ? "RANG UNDER PRES" : "SØKORTET"}
          </span>
          <h2>{rank.rank.name}{rankTarget ? <><ArrowRight size={18} /> {rankTarget.name}</> : " · højeste rang"}</h2>
          <p>
            {rank.standing === "retention-locked"
              ? "Du har XP nok. Nu skal holdout-ordene bevise, at kursen holder."
              : rank.standing === "threatened"
                ? "Rangen består indtil næste måling, men retentionen skal genoprettes."
                : rank.rank.description}
          </p>
        </div>
        <div className="rank-gate-progress">
          <div className="rank-progress-label"><span>{xp.toLocaleString("da-DK")} XP</span><strong>{rankTarget ? `${rankTarget.minimumXp.toLocaleString("da-DK")} XP` : "FULDFØRT"}</strong></div>
          <div className="rank-progress-track"><i style={{ width: `${rankProgress}%` }} /></div>
          {rankTarget?.retentionGates.map((gate) => (
            <span className={`retention-gate ${retention[gate.day] && retention[gate.day]!.samples >= gate.minimumSamples && retention[gate.day]!.retention >= gate.minimumRetention ? "met" : "waiting"}`} key={gate.day}>
              <ShieldCheck size={14} /> {nextGateText(retention, gate.day, gate.minimumRetention, gate.minimumSamples)} · krav {Math.round(gate.minimumRetention * 100)}%
            </span>
          ))}
        </div>
      </section>

      <section className="harbor-section contracts-section">
        <div className="section-heading">
          <div><span className="eyebrow">INDGÅENDE POST</span><h2>Folk i havnen</h2><p>De husker dine valg — og hvordan du bruger dansk.</p></div>
          <button className="text-button" onClick={() => onNavigate("scenarios")}>Alle kontrakter <ArrowRight size={16} /></button>
        </div>
        <div className="harbor-contracts">
          {harborCharacters.map((character) => {
            const level = Math.max(0, Math.min(5, relationships[character.id] ?? 0));
            const message = characterMessage(character.id, level, attempts, scenarioRuns);
            return (
              <article className={`contract-card ${character.accent}`} key={character.id}>
                <div className="contract-portrait">
                  <Image unoptimized src={character.portrait} alt={character.name} fill sizes="96px" />
                  <span>{level}/5</span>
                </div>
                <div className="contract-message">
                  <span className="eyebrow"><MessageCircle size={13} /> {message.eyebrow}</span>
                  <h3>{character.name}</h3>
                  <p>“{message.text}”</p>
                  <div className="relationship-meter" aria-label={`Forhold til ${character.name}: ${level} af 5`}><i style={{ width: `${level * 20}%` }} /></div>
                  <div className="contract-actions"><button onClick={() => onNavigate("scenarios")}>{message.action}<ChevronRight size={15} /></button><button className="reply-message" disabled={repliedCharacterIds.includes(character.id)} onClick={() => onReplyCharacter(character.id)}>{repliedCharacterIds.includes(character.id) ? "Besked besvaret" : "Svar på dansk · +forhold"}</button></div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="harbor-game-row">
        <article className="weekly-storm-card">
          <div className="storm-cloud"><Zap size={32} /><i /><i /><i /></div>
          <div className="storm-copy">
            <span className="eyebrow">ÉN CHANCE · DENNE UGE</span>
            <h2>Ugens storm</h2>
            <p>Syv opgaver fra dine svageste ord. Resultatet bliver liggende på søkortet til næste mandag.</p>
            <div className="storm-meta">
              <span><Target size={15} /> {Math.min(7, uniqueWeakItems.size)} svage ord fundet</span>
              <span><Trophy size={15} /> +160 XP · +70 kr.</span>
            </div>
            {weeklyStorms.length > 0 && <div className="storm-history" aria-label="Historik for ugens storm">
              {weeklyStorms.slice(-8).map((storm) => <span key={storm.weekId} title={`${storm.score}/${storm.total}`}><i style={{ height: `${Math.max(12, storm.total ? storm.score / storm.total * 100 : 0)}%` }} /></span>)}
            </div>}
            {owned.has("toldboden") && lastStorm && <p className="storm-analysis"><BarChart3 size={14} /> {stormPattern ? `Toldboden fandt dit vigtigste fejlmønster: ${stormPattern}.` : "Toldboden fandt ingen gentagen fejl i sidste storm."}</p>}
          </div>
          <button className="storm-start" onClick={onStartStorm} disabled={attempts.length === 0 || currentStormCompleted}>
            {currentStormCompleted ? "Stormen er sejlet" : "Tag udfordringen"} <ArrowRight size={17} />
          </button>
        </article>

        <article className="gender-bank-teaser">
          <div className="bank-vault"><span>en</span><strong>et</strong></div>
          <span className="eyebrow">KØNSBANKEN</span>
          <h2>Sæt kroner på dit instinkt</h2>
          <p>Jo sikrere du påstår at være, desto højere bliver gevinsten — og desto dyrere bliver overmod.</p>
          <div className="bank-odds"><span>50%<strong>1,2×</strong></span><i /><span>100%<strong>3×</strong></span></div>
          <button onClick={onOpenGenderBank} disabled={kroner < 10}>Gå i banken <ArrowRight size={17} /></button>
        </article>
      </section>

      <section className="harbor-section harbor-shop" id="harbor-shop">
        <div className="section-heading">
          <div><span className="eyebrow">BYG MED KRONER</span><h2>Udvid Ordhavn</h2><p>Hvert byggeri ændrer, hvad du kan gøre — ikke kun hvordan havnen ser ud.</p></div>
          <span className="shop-balance"><span className="kr-symbol">kr.</span> {kroner.toLocaleString("da-DK")}</span>
        </div>
        {purchaseMessage && <div className="purchase-notice"><Check size={15} /> {purchaseMessage}<button aria-label="Luk besked" onClick={() => setPurchaseMessage(null)}><X size={14} /></button></div>}
        <div className="building-shop-grid">
          {HARBOR_BUILDINGS.map((building) => {
            const Icon = buildingIcons[building.id];
            const isOwned = owned.has(building.id);
            const rankOrder = ["skibsdreng", "letmatros", "matros", "baadsmand", "styrmand", "skipper", "lods", "havnefoged"];
            const rankLocked = rankOrder.indexOf(rank.rank.id) < rankOrder.indexOf(building.requiredRank);
            const cannotAfford = kroner < building.costKroner;
            return (
              <article className={`building-card ${isOwned ? "owned" : rankLocked ? "locked" : ""}`} key={building.id}>
                <div className="building-card-icon"><Icon size={25} /></div>
                <span className="building-rank">{building.requiredRank}</span>
                <h3>{building.name}</h3>
                <p>{building.description}</p>
                <strong className="building-benefit"><Sparkles size={14} /> {describeBenefit(building.benefit)}</strong>
                {isOwned ? (
                  <button disabled><Check size={16} /> Bygget</button>
                ) : rankLocked ? (
                  <button disabled><LockKeyhole size={15} /> Kræver {building.requiredRank}</button>
                ) : (
                  <button disabled={cannotAfford} onClick={() => handlePurchase(building.id, building.costKroner, building.name)}>
                    {cannotAfford ? `${building.costKroner - kroner} kr. mangler` : `Byg for ${building.costKroner} kr.`}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="harbor-shortcuts">
        <button onClick={() => onNavigate("path")}><Compass size={17} /> Se hele søkortet</button>
        <button onClick={() => onNavigate("stats")}><BarChart3 size={17} /> Åbn logbogen</button>
        <span><Waves size={16} /> Havneafgift stopper altid ved sikkerhedsgrænsen.</span>
      </footer>
    </main>
  );
}

const genderBankItems: readonly GenderBetItem[] = courseLevels
  .flatMap((level) => level.missions)
  .flatMap((mission) => mission.questions)
  .filter((item): item is GenderBetItem => item.type === "gender-bet")
  .slice(0, 10);

export interface GenderBankAnswer {
  itemId: string;
  noun: string;
  selectedArticle: "en" | "et";
  correctArticle: "en" | "et";
  confidencePercent: number;
  correct: boolean;
  multiplier: number;
  bankBefore: number;
  bankAfter: number;
}

export interface GenderBankOutcome {
  id: string;
  completedAt: string;
  stake: number;
  payout: number;
  rounds: number;
  correctRounds: number;
  cashedOut: boolean;
  meanBrier: number | null;
  answers: readonly GenderBankAnswer[];
}

export interface GenderBankViewProps {
  kroner: number;
  onDeductStake: (amount: number) => boolean;
  /** The parent records the run and credits outcome.payout exactly once. */
  onRecordOutcome: (outcome: GenderBankOutcome) => void;
  onClose: () => void;
  playedToday: boolean;
}

type BankPhase = "lobby" | "question" | "decision" | "finished";

export function GenderBankView({ kroner, onDeductStake, onRecordOutcome, onClose, playedToday }: GenderBankViewProps) {
  const maximumStake = Math.max(10, Math.min(500, kroner));
  const [stake, setStake] = useState(Math.min(50, maximumStake));
  const [phase, setPhase] = useState<BankPhase>("lobby");
  const [runId, setRunId] = useState("");
  const [itemIndex, setItemIndex] = useState(0);
  const [bank, setBank] = useState(0);
  const [selected, setSelected] = useState<"en" | "et" | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [answers, setAnswers] = useState<GenderBankAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finalOutcome, setFinalOutcome] = useState<GenderBankOutcome | null>(null);
  const currentItem = genderBankItems[itemIndex];
  const multiplier = genderConfidenceMultiplier(confidence);
  const lastAnswer = answers.at(-1) ?? null;

  const recordFinalOutcome = (payout: number, nextAnswers: readonly GenderBankAnswer[], cashedOut: boolean) => {
    const meanBrier = nextAnswers.length
      ? nextAnswers.reduce((sum, answer) => sum + Math.pow(answer.confidencePercent / 100 - (answer.correct ? 1 : 0), 2), 0) / nextAnswers.length
      : null;
    const outcome: GenderBankOutcome = {
      id: runId,
      completedAt: new Date().toISOString(),
      stake,
      payout,
      rounds: nextAnswers.length,
      correctRounds: nextAnswers.filter((answer) => answer.correct).length,
      cashedOut,
      meanBrier,
      answers: [...nextAnswers],
    };
    setFinalOutcome(outcome);
    setPhase("finished");
    onRecordOutcome(outcome);
  };

  const startRun = () => {
    if (playedToday) {
      setError("Dagens bankrunde er allerede afsluttet. En ny serie åbner i morgen.");
      return;
    }
    if (genderBankItems.length < 10) {
      setError("Banken mangler ord til en fuld serie.");
      return;
    }
    if (!onDeductStake(stake)) {
      setError("Der er ikke nok kroner til den indsats.");
      return;
    }
    setRunId(globalThis.crypto?.randomUUID?.() ?? `bank-${new Date().getTime()}`);
    setBank(stake);
    setItemIndex(0);
    setAnswers([]);
    setSelected(null);
    setConfidence(70);
    setError(null);
    setPhase("question");
  };

  const answerQuestion = () => {
    if (!currentItem || !selected) return;
    const correctArticle = currentItem.answer as "en" | "et";
    const correct = selected === correctArticle;
    const settlement = settleGenderWager(bank, confidence, correct);
    const cappedBank = Math.min(settlement.returnedKroner, stake * 5);
    const answer: GenderBankAnswer = {
      itemId: currentItem.id,
      noun: currentItem.noun,
      selectedArticle: selected,
      correctArticle,
      confidencePercent: confidence,
      correct,
      multiplier: settlement.multiplier,
      bankBefore: bank,
      bankAfter: cappedBank,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setBank(cappedBank);
    if (!correct) {
      recordFinalOutcome(0, nextAnswers, false);
      return;
    }
    if (itemIndex === 9) {
      recordFinalOutcome(cappedBank, nextAnswers, true);
      return;
    }
    setPhase("decision");
  };

  const pushOn = () => {
    setItemIndex((current) => current + 1);
    setSelected(null);
    setConfidence(70);
    setPhase("question");
  };

  const cashOut = () => recordFinalOutcome(bank, answers, true);

  const resetToLobby = () => {
    setPhase("lobby");
    setRunId("");
    setItemIndex(0);
    setBank(0);
    setSelected(null);
    setConfidence(70);
    setAnswers([]);
    setFinalOutcome(null);
    setError(null);
    setStake(Math.min(50, Math.max(10, Math.min(500, kroner))));
  };

  return (
    <main className="gender-bank-view">
      <header className="bank-header">
        <button className="icon-button" aria-label="Luk Kønsbanken" onClick={phase === "question" || phase === "decision" ? undefined : onClose} disabled={phase === "question" || phase === "decision"}>
          <X size={19} />
        </button>
        <div><span className="eyebrow">ORDHAVN · KØNSBANKEN</span><h1>en eller et?</h1></div>
        <span className="bank-balance"><span className="kr-symbol">kr.</span>{kroner.toLocaleString("da-DK")}</span>
      </header>

      {phase === "lobby" && (
        <section className="bank-lobby">
          <div className="bank-sign">
            <span>en</span><i>?</i><strong>et</strong>
          </div>
          <span className="eyebrow">10 ORD · TAG BANKEN ELLER PRES VIDERE</span>
          <h2>Selvsikkerhed har en pris</h2>
          <p>Vælg artiklen og fortæl banken, hvor sikker du er. Et rigtigt svar vokser banken. Ét forkert svar tager hele indsatsen.</p>
          <div className="bank-rule-grid">
            <div><ShieldCheck size={19} /><strong>50% sikker</strong><span>Forsigtig gevinst · 1,2×</span></div>
            <div><Zap size={19} /><strong>100% sikker</strong><span>Maksimal risiko · 3×</span></div>
            <div><Anchor size={19} /><strong>Tag banken</strong><span>Stop efter ethvert rigtigt svar</span></div>
          </div>
          <label className="stake-control">
            <span><strong>Din indsats</strong><em>Mindst 10 kr. · højst 500 kr.</em></span>
            <output>{stake} kr.</output>
            <input
              type="range"
              min={10}
              max={maximumStake}
              step={10}
              value={stake}
              onChange={(event) => setStake(Number(event.target.value))}
              disabled={kroner < 10}
            />
          </label>
          {error && <p className="bank-error">{error}</p>}
          <button className="primary bank-enter" onClick={startRun} disabled={playedToday || kroner < 10 || genderBankItems.length < 10}>
            {playedToday ? "Ny serie åbner i morgen" : `Sæt ${stake} kr.`} <ArrowRight size={18} />
          </button>
          <small className="bank-disclaimer">Én serie om dagen · gevinsten stopper ved 5× indsatsen · XP og rav kan aldrig sættes på spil.</small>
        </section>
      )}

      {phase === "question" && currentItem && (
        <section className="bank-table">
          <div className="bank-run-status">
            <span>ORD {itemIndex + 1}/10</span>
            <div className="bank-round-pips">{genderBankItems.map((item, index) => <i key={item.id} className={index < itemIndex ? "passed" : index === itemIndex ? "current" : ""} />)}</div>
            <strong>{bank.toLocaleString("da-DK")} kr. i banken</strong>
          </div>
          <div className="noun-vault">
            <span>Vælg den danske artikel</span>
            <h2>___ {currentItem.noun}</h2>
          </div>
          <div className="article-choice" role="group" aria-label="Vælg en eller et">
            {(["en", "et"] as const).map((article) => (
              <button className={selected === article ? "selected" : ""} key={article} onClick={() => setSelected(article)}>
                {article}<span>{article} {currentItem.noun}</span>
              </button>
            ))}
          </div>
          <label className="confidence-wager">
            <span><strong>Hvor sikker er du?</strong><output>{confidence}%</output></span>
            <input type="range" min={50} max={100} step={10} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
            <div className="confidence-scale"><span>50% · 1,2×</span><strong>Mulig bank: {Math.min(Math.floor(bank * multiplier), stake * 5).toLocaleString("da-DK")} kr.</strong><span>100% · 3×</span></div>
          </label>
          <button className="primary lock-wager" disabled={!selected} onClick={answerQuestion}>
            Lås svar · {confidence}% <LockKeyhole size={17} />
          </button>
        </section>
      )}

      {phase === "decision" && lastAnswer && (
        <section className="bank-decision">
          <div className="decision-success"><Check size={31} /></div>
          <span className="eyebrow">KORREKT · {lastAnswer.correctArticle} {lastAnswer.noun}</span>
          <h2>{lastAnswer.bankBefore.toLocaleString("da-DK")} kr. blev til {lastAnswer.bankAfter.toLocaleString("da-DK")} kr.</h2>
          <p>{lastAnswer.confidencePercent}% sikker gav koefficient {lastAnswer.multiplier.toLocaleString("da-DK")}×. Næste ord sætter hele banken på spil igen.</p>
          <div className="bank-decision-actions">
            <button className="secondary" onClick={cashOut}><Anchor size={17} /> Tag {bank.toLocaleString("da-DK")} kr.</button>
            <button className="primary" onClick={pushOn}>Pres videre til ord {itemIndex + 2}<ArrowRight size={17} /></button>
          </div>
        </section>
      )}

      {phase === "finished" && finalOutcome && (
        <section className={`bank-finished ${finalOutcome.payout > 0 ? "won" : "lost"}`}>
          <div className="finish-emblem">{finalOutcome.payout > 0 ? <Trophy size={38} /> : <Waves size={38} />}</div>
          <span className="eyebrow">SERIEN ER LUKKET</span>
          <h2>{finalOutcome.payout > 0 ? `${finalOutcome.payout.toLocaleString("da-DK")} kr. udbetalt` : "Banken gik tabt"}</h2>
          <p>
            {finalOutcome.payout > 0
              ? `Du stoppede efter ${finalOutcome.rounds} korrekte ${finalOutcome.rounds === 1 ? "svar" : "svar"}. Gevinsten er sendt tilbage til havnen.`
              : `Det rigtige svar var ${finalOutcome.answers.at(-1)?.correctArticle}. Høj sikkerhed er værdifuld, når den er kalibreret.`}
          </p>
          <div className="finish-ledger">
            <span><small>Indsats</small><strong>{finalOutcome.stake} kr.</strong></span>
            <span><small>Runder</small><strong>{finalOutcome.rounds}/10</strong></span>
            <span><small>Netto</small><strong>{finalOutcome.payout - finalOutcome.stake >= 0 ? "+" : ""}{finalOutcome.payout - finalOutcome.stake} kr.</strong></span>
          </div>
          <div className="finish-actions">
            <button className="secondary" onClick={onClose}>Tilbage til havnen</button>
            <button className="primary" onClick={resetToLobby}>Ny serie <ArrowRight size={17} /></button>
          </div>
        </section>
      )}
    </main>
  );
}

export default HarborHome;
