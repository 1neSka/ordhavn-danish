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
  Home,
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

const maritimeRankOrder = ["skibsdreng", "letmatros", "matros", "baadsmand", "styrmand", "skipper", "lods", "havnefoged"] as const;

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

const HARBOR_SCENE_STYLES = `
  .harbor-scene.harbor-v2 {
    --harbor-sky-top: #9ed8ee;
    --harbor-sky-bottom: #f4d7aa;
    --harbor-haze: rgba(255, 244, 218, .78);
    --harbor-water-top: #318aa0;
    --harbor-water-bottom: #15546c;
    --harbor-window: #ffe7a7;
    --harbor-window-off: #6d8790;
    --harbor-ink: #183b47;
    min-height: 590px;
    border-color: rgba(39, 91, 105, .35);
    background: #204d60;
    box-shadow: 0 28px 70px rgba(25, 66, 79, .22);
  }
  .harbor-scene.harbor-v2 .harbor-sky {
    inset: 0 0 35%;
    background:
      linear-gradient(180deg, transparent 68%, var(--harbor-haze)),
      linear-gradient(180deg, var(--harbor-sky-top), var(--harbor-sky-bottom));
  }
  .harbor-scene.harbor-v2 .harbor-sky::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0;
    background-image:
      radial-gradient(circle at 13% 14%, #fff 0 1px, transparent 1.7px),
      radial-gradient(circle at 34% 23%, #fff 0 1px, transparent 1.8px),
      radial-gradient(circle at 55% 11%, #fff 0 1.2px, transparent 1.9px),
      radial-gradient(circle at 82% 28%, #fff 0 1px, transparent 1.8px),
      radial-gradient(circle at 69% 7%, #fff 0 1px, transparent 1.8px);
  }
  .harbor-scene.harbor-v2 .harbor-sun {
    right: 8%;
    top: 12%;
    width: 66px;
    height: 66px;
    color: #ffb12f;
    background: #fff5bd;
    box-shadow: 0 0 0 16px rgba(255, 239, 166, .2), 0 0 55px rgba(255, 207, 90, .38);
  }
  .harbor-scene.harbor-v2 .harbor-cloud { background: rgba(255,255,255,.42); filter: blur(.2px); }
  .harbor-scene.harbor-v2 .harbor-gulls { position: absolute; left: 57%; top: 23%; display: flex; gap: 22px; }
  .harbor-scene.harbor-v2 .harbor-gulls i { width: 17px; height: 8px; border-top: 2px solid rgba(34,66,76,.5); border-radius: 50%; transform: rotate(8deg); animation: harbor-gull 8s ease-in-out infinite; }
  .harbor-scene.harbor-v2 .harbor-gulls i:nth-child(2) { transform: translateY(13px) scale(.75) rotate(-7deg); animation-delay: -2.4s; }
  .harbor-scene.harbor-v2 .harbor-gulls i:nth-child(3) { transform: translateY(-8px) scale(.55); animation-delay: -4.7s; }
  @keyframes harbor-gull { 50% { translate: 20px -5px; } }
  .harbor-scene.harbor-v2 .harbor-horizon {
    inset: 66px 0 30%;
    z-index: 2;
    align-items: flex-end;
    padding: 0;
    overflow: hidden;
    background: linear-gradient(180deg, transparent 62%, rgba(42,79,78,.12));
  }
  .harbor-scene.harbor-v2 .tide-chip {
    z-index: 6;
    left: 23px;
    top: 17px;
    color: #174758;
    border-color: rgba(255,255,255,.55);
    background: rgba(255,255,255,.58);
    box-shadow: 0 8px 26px rgba(21,73,87,.12);
  }
  .harbor-scene.harbor-v2 .harbor-scene-notice { position:absolute;z-index:7;right:23px;top:17px;display:flex;align-items:center;gap:6px;max-width:280px;padding:8px 10px;border:1px solid rgba(255,255,255,.55);border-radius:9px;color:#185b4d;background:rgba(230,255,246,.88);box-shadow:0 8px 26px rgba(21,73,87,.14);font-size:8px;font-weight:800;animation:harbor-notice-in .25s ease both; }
  @keyframes harbor-notice-in { from { opacity:0;translate:0 -7px; } }
  .harbor-scene.harbor-v2 .harbor-town {
    width: 100%;
    min-height: 262px;
    justify-content: flex-start;
    gap: 9px;
    padding: 45px 24px 9px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(28,74,84,.35) transparent;
    scroll-padding-inline: 24px;
    mask-image: linear-gradient(90deg, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%);
  }
  .harbor-scene.harbor-v2 .harbor-town::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 15px;
    background: linear-gradient(#c7a675 0 27%, #8c693f 28% 52%, #5b4634 53%);
    box-shadow: 0 -3px rgba(249,223,170,.45), 0 8px 18px rgba(28,42,45,.2);
  }
  .harbor-scene.harbor-v2 .scene-building {
    --facade: #d96f54;
    --facade-dark: #9c493b;
    --roof: #5c6571;
    --trim: #f4e9d2;
    flex: 0 0 105px;
    width: 105px;
    min-width: 105px;
    height: 154px;
    min-height: 0;
    display: block;
    padding: 0;
    color: #203b43;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    position: relative;
    cursor: default;
    isolation: isolate;
    animation: harbor-building-rise .55s cubic-bezier(.2,.8,.2,1) both;
    animation-delay: calc(var(--building-order, 0) * 35ms);
  }
  .harbor-scene.harbor-v2 .scene-building::before,
  .harbor-scene.harbor-v2 .scene-building::after { content: none; }
  .harbor-scene.harbor-v2 .building-facade {
    position: absolute;
    inset: 35px 6px 25px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-content: start;
    gap: 12px 8px;
    padding: 17px 10px 0;
    border: 1px solid rgba(42,46,48,.2);
    border-bottom: 3px solid var(--facade-dark);
    background:
      linear-gradient(90deg, transparent 47%, rgba(255,255,255,.12) 48% 52%, transparent 53%),
      var(--facade);
    box-shadow: inset 0 0 0 2px rgba(255,255,255,.1), 0 8px 14px rgba(31,63,67,.18);
  }
  .harbor-scene.harbor-v2 .building-facade i {
    width: 15px;
    height: 23px;
    border: 2px solid var(--trim);
    border-radius: 2px;
    background: linear-gradient(90deg, transparent 44%, rgba(255,255,255,.45) 45% 53%, transparent 54%), var(--harbor-window);
    box-shadow: none;
    position: static;
  }
  .harbor-scene.harbor-v2 .building-facade b {
    position: absolute;
    left: calc(50% - 10px);
    bottom: 0;
    width: 20px;
    height: 31px;
    border-radius: 7px 7px 0 0;
    background: #365463;
    box-shadow: inset 4px 0 rgba(255,255,255,.1);
  }
  .harbor-scene.harbor-v2 .building-roof {
    position: absolute;
    z-index: 2;
    left: 0;
    right: 0;
    top: 17px;
    height: 34px;
    border-radius: 5px 5px 2px 2px;
    background: var(--roof);
    clip-path: polygon(12% 0, 88% 0, 100% 100%, 0 100%);
    box-shadow: inset 0 -5px rgba(0,0,0,.13);
  }
  .harbor-scene.harbor-v2 .building-sign {
    position: absolute;
    z-index: 4;
    left: 50%;
    bottom: 16px;
    translate: -50% 0;
    width: max-content;
    max-width: 96px;
    min-height: 23px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 6px;
    border: 1px solid rgba(48,42,34,.18);
    border-radius: 5px;
    color: #382f27;
    background: #fff6dc;
    box-shadow: 0 3px 7px rgba(30,42,42,.2);
  }
  .harbor-scene.harbor-v2 .building-sign strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 7px; }
  .harbor-scene.harbor-v2 .clocktower { flex-basis: 73px; min-width: 73px; height: 187px; --facade: #d8aa65; --facade-dark: #997044; --roof: #405e68; }
  .harbor-scene.harbor-v2 .clocktower .building-roof { top: 3px; height: 48px; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
  .harbor-scene.harbor-v2 .clocktower .building-facade { inset: 43px 12px 25px; grid-template-columns: 1fr; justify-items: center; }
  .harbor-scene.harbor-v2 .clocktower .building-facade i:nth-child(n+2) { display: none; }
  .harbor-scene.harbor-v2 .clocktower .building-facade i:first-child { width: 27px; height: 27px; border-radius: 50%; background: #f7eed6; }
  .harbor-scene.harbor-v2 .cafe { --facade: #d88b87; --facade-dark: #985653; --roof: #356d68; }
  .harbor-scene.harbor-v2 .cafe .building-facade::after,
  .harbor-scene.harbor-v2 .market .building-facade::after,
  .harbor-scene.harbor-v2 .kaffebaren .building-facade::after {
    content: "";
    position: absolute;
    left: 4px;
    right: 4px;
    top: 7px;
    height: 12px;
    background: repeating-linear-gradient(90deg, #fff0d4 0 10px, #d4594d 10px 20px);
    clip-path: polygon(0 0, 100% 0, 95% 100%, 89% 65%, 83% 100%, 77% 65%, 71% 100%, 65% 65%, 59% 100%, 53% 65%, 47% 100%, 41% 65%, 35% 100%, 29% 65%, 23% 100%, 17% 65%, 11% 100%, 5% 65%);
  }
  .harbor-scene.harbor-v2 .townhouse { flex-basis: 83px; min-width: 83px; height: 169px; --facade: #c58653; --facade-dark: #865333; --roof: #573f44; }
  .harbor-scene.harbor-v2 .townhouse .building-facade { grid-template-columns: repeat(2,1fr); }
  .harbor-scene.harbor-v2 .townhouse .building-facade i:nth-child(3) { display: none; }
  .harbor-scene.harbor-v2 .bridge { flex-basis: 146px; min-width: 146px; height: 96px; --facade: #8c6541; --facade-dark: #58452e; }
  .harbor-scene.harbor-v2 .bridge .building-roof { display: none; }
  .harbor-scene.harbor-v2 .bridge .building-facade { inset: 52px 3px 25px; display: block; padding: 0; border-radius: 4px; background: repeating-linear-gradient(90deg,#9b7148 0 20px,#6f5037 20px 24px); }
  .harbor-scene.harbor-v2 .bridge .building-facade i,
  .harbor-scene.harbor-v2 .bridge .building-facade b { display: none; }
  .harbor-scene.harbor-v2 .bridge .building-facade::after { content: ""; position:absolute; inset:14px 11px -1px; background:var(--harbor-sky-bottom); clip-path:polygon(0 100%,7% 38%,15% 0,23% 38%,30% 100%,38% 38%,46% 0,54% 38%,62% 100%,70% 38%,78% 0,86% 38%,94% 100%); }
  .harbor-scene.harbor-v2 .park { flex-basis: 117px; min-width: 117px; height: 103px; --facade: #65a36c; --facade-dark: #3d724b; }
  .harbor-scene.harbor-v2 .park .building-roof { top: 22px; left: 17px; right: 17px; height: 67px; border-radius: 50% 50% 20% 20%; background: radial-gradient(circle at 70% 35%,#8fc878 0 23%,transparent 24%),radial-gradient(circle at 37% 43%,#71b56b 0 38%,transparent 39%),#4b8f61; clip-path:none; }
  .harbor-scene.harbor-v2 .park .building-facade { inset:auto 52px 22px; height:55px; display:block; padding:0; border:0; background:#765339; box-shadow:none; }
  .harbor-scene.harbor-v2 .park .building-facade i,
  .harbor-scene.harbor-v2 .park .building-facade b { display:none; }
  .harbor-scene.harbor-v2 .clinic { flex-basis: 119px; min-width:119px; --facade:#e7e4da; --facade-dark:#aaa89f; --roof:#4d7b76; }
  .harbor-scene.harbor-v2 .clinic .building-facade::after { content:"+"; position:absolute;top:41px;left:calc(50% - 10px);color:#d75d58;font:900 24px/1 sans-serif; }
  .harbor-scene.harbor-v2 .market { --facade:#deb05e; --facade-dark:#99733a; --roof:#a84b43; }
  .harbor-scene.harbor-v2 .archive { --facade:#7fa1a7; --facade-dark:#516e74; --roof:#415965; }
  .harbor-scene.harbor-v2 .council { flex-basis:138px; min-width:138px; height:174px; --facade:#d4c39a; --facade-dark:#948461; --roof:#4d5969; }
  .harbor-scene.harbor-v2 .council .building-roof { height:37px; clip-path:polygon(50% 0,100% 100%,0 100%); }
  .harbor-scene.harbor-v2 .pilot-house { flex-basis:89px;min-width:89px;height:181px;--facade:#8d6446;--facade-dark:#5a3f31;--roof:#2e5966; }
  .harbor-scene.harbor-v2 .station { flex-basis:151px;min-width:151px;height:132px;--facade:#c65d4e;--facade-dark:#873f38;--roof:#314e5d; }
  .harbor-scene.harbor-v2 .station .building-roof { border-radius: 50% 50% 3px 3px; clip-path:none; }
  .harbor-scene.harbor-v2 .functional-building { cursor: pointer; transition: filter .18s ease, transform .18s ease; }
  .harbor-scene.harbor-v2 .functional-building.owned:hover,
  .harbor-scene.harbor-v2 .functional-building.purchasable:hover,
  .harbor-scene.harbor-v2 .functional-building.owned:focus-visible,
  .harbor-scene.harbor-v2 .functional-building.purchasable:focus-visible { z-index:8; transform:translateY(-7px) scale(1.035); filter:brightness(1.07); outline:none; }
  .harbor-scene.harbor-v2 .functional-building:focus-visible .building-facade { box-shadow:0 0 0 4px #fff,0 0 0 7px #775ee2,0 10px 20px rgba(30,52,54,.24); }
  .harbor-scene.harbor-v2 .functional-building.owned .building-state { color:#195f4f;background:#d8f5e9; }
  .harbor-scene.harbor-v2 .functional-building.purchasable { filter:drop-shadow(0 0 9px rgba(255,213,104,.72)); animation:harbor-building-rise .55s both, harbor-purchasable 2.8s ease-in-out infinite 1s; }
  .harbor-scene.harbor-v2 .functional-building.purchasable .building-state { color:#65440c;background:#ffe7a3; }
  .harbor-scene.harbor-v2 .functional-building.locked,
  .harbor-scene.harbor-v2 .functional-building.shortfall { filter:saturate(.3) contrast(.85); opacity:.68; cursor:not-allowed; }
  .harbor-scene.harbor-v2 .building-state { position:absolute;z-index:5;top:28px;right:0;min-width:23px;height:22px;display:flex;align-items:center;justify-content:center;padding:0 5px;border-radius:7px;color:#5b6170;background:#e8e8e3;box-shadow:0 3px 7px rgba(0,0,0,.15);font-size:7px;font-weight:850; }
  @keyframes harbor-purchasable { 50% { filter:drop-shadow(0 0 15px rgba(255,213,104,.9)); } }
  @keyframes harbor-building-rise { from { opacity:0; transform:translateY(24px) scale(.96); } to { opacity:1; transform:none; } }
  .harbor-scene.harbor-v2 .kaffebaren { --facade:#c95c57;--facade-dark:#87403c;--roof:#305e5c; }
  .harbor-scene.harbor-v2 .biblioteket { flex-basis:128px;min-width:128px;height:176px;--facade:#d1b876;--facade-dark:#8d7848;--roof:#4a566a; }
  .harbor-scene.harbor-v2 .biblioteket .building-facade { border-left-width:7px;border-right-width:7px; }
  .harbor-scene.harbor-v2 .fyrtaarnet { flex-basis:76px;min-width:76px;height:220px;--facade:#f1eee1;--facade-dark:#a7a298;--roof:#bd4e43; }
  .harbor-scene.harbor-v2 .fyrtaarnet .building-facade { inset:47px 17px 25px;display:block;padding:0;clip-path:polygon(22% 0,78% 0,100% 100%,0 100%);background:repeating-linear-gradient(180deg,#f0eee4 0 28px,#c64f46 28px 48px); }
  .harbor-scene.harbor-v2 .fyrtaarnet .building-facade i,
  .harbor-scene.harbor-v2 .fyrtaarnet .building-facade b { display:none; }
  .harbor-scene.harbor-v2 .fyrtaarnet .building-roof { left:14px;right:14px;top:23px;height:34px;clip-path:polygon(50% 0,100% 48%,85% 100%,15% 100%,0 48%); }
  .harbor-scene.harbor-v2 .fyrtaarnet .building-special-detail { position:absolute;z-index:1;top:36px;left:39px;width:150px;height:18px;transform-origin:left;background:linear-gradient(90deg,rgba(255,235,144,.72),transparent);clip-path:polygon(0 36%,100% 0,100% 100%,0 64%);animation:harbor-beacon 5s ease-in-out infinite;pointer-events:none; }
  @keyframes harbor-beacon { 50% { transform:rotate(-9deg);opacity:.42; } }
  .harbor-scene.harbor-v2 .vaerftet { flex-basis:157px;min-width:157px;height:128px;--facade:#66878a;--facade-dark:#3d5b60;--roof:#3c4b56; }
  .harbor-scene.harbor-v2 .vaerftet .building-special-detail { position:absolute;z-index:3;left:18px;top:-15px;width:4px;height:76px;background:#e09b3f;box-shadow:51px 0 #e09b3f; }
  .harbor-scene.harbor-v2 .vaerftet .building-special-detail::before { content:"";position:absolute;left:0;top:0;width:56px;height:4px;background:#e09b3f;transform:rotate(-9deg);transform-origin:left; }
  .harbor-scene.harbor-v2 .vaerftet .building-special-detail::after { content:"";position:absolute;left:47px;top:3px;width:2px;height:31px;background:#554b42;box-shadow:0 28px 0 3px #c88337; }
  .harbor-scene.harbor-v2 .toldboden { flex-basis:142px;min-width:142px;height:137px;--facade:#9c765a;--facade-dark:#654c3b;--roof:#4d5760; }
  .harbor-scene.harbor-v2 .toldboden .building-roof { clip-path:polygon(0 40%,17% 0,34% 40%,51% 0,68% 40%,85% 0,100% 40%,100% 100%,0 100%); }
  .harbor-scene.harbor-v2 .harbor-water {
    z-index: 1;
    height: 34%;
    background:
      linear-gradient(90deg, transparent 0 8%, rgba(255,255,255,.08) 8.5% 9%, transparent 9.5% 31%, rgba(255,255,255,.06) 31.5% 33%, transparent 34%),
      linear-gradient(180deg,var(--harbor-water-top),var(--harbor-water-bottom));
    box-shadow: inset 0 7px 15px rgba(255,255,255,.08);
  }
  .harbor-scene.harbor-v2.low-tide .harbor-water { height:29%; }
  .harbor-scene.harbor-v2.high-tide .harbor-water { height:41%; }
  .harbor-scene.harbor-v2 .wave { border-top-color:rgba(203,245,241,.3); }
  .harbor-scene.harbor-v2 .harbor-reflections { position:absolute;inset:0;display:flex;gap:8%;padding:0 8%;opacity:.28;filter:blur(2px); }
  .harbor-scene.harbor-v2 .harbor-reflections i { flex:1;height:62%;background:linear-gradient(180deg,rgba(255,215,135,.55),transparent);clip-path:polygon(28% 0,70% 0,100% 100%,0 100%);animation:harbor-reflection 4s ease-in-out infinite alternate; }
  .harbor-scene.harbor-v2 .harbor-reflections i:nth-child(even){height:39%;animation-delay:-2s;}
  @keyframes harbor-reflection { to { transform:skewX(9deg) scaleX(.78);opacity:.5; } }
  .harbor-scene.harbor-v2 .harbor-boat { z-index:2;background:linear-gradient(#f0eee8 0 24%,#cc554c 25% 45%,#253e4b 46%);box-shadow:0 9px 14px rgba(10,43,55,.27); }
  .harbor-scene.harbor-v2 .harbor-boat::before { background:#5b5144; }
  .harbor-scene.harbor-v2 .harbor-boat::after { border-color:transparent transparent rgba(255,248,221,.92) transparent; }
  .harbor-scene.harbor-v2 .boat-cabin { position:absolute;left:20px;bottom:25px;width:25px;height:13px;border-radius:6px 6px 1px 1px;background:#f2d9a7;box-shadow:inset 7px 0 #7eb2bd; }
  .harbor-scene.harbor-v2 .boat-name { position:absolute;left:15px;bottom:5px;color:#f4ead7;font-size:9px;font-weight:900; }
  .harbor-scene.harbor-v2 .harbor-pier-visual { position:absolute;z-index:3;left:0;right:0;bottom:0;height:116px;border-top:7px solid #d3ad72;background:repeating-linear-gradient(90deg,#987147 0 43px,#765536 44px 48px);box-shadow:0 -8px 18px rgba(30,46,45,.22); }
  .harbor-scene.harbor-v2 .harbor-pier-visual::before { content:"";position:absolute;left:0;right:0;top:9px;height:3px;background:rgba(255,229,179,.23); }
  .harbor-scene.harbor-v2 .harbor-pier-visual span { position:absolute;top:-16px;width:9px;height:35px;border-radius:3px 3px 0 0;background:#5c4937;box-shadow:inset 2px 0 rgba(255,255,255,.12); }
  .harbor-scene.harbor-v2 .harbor-pier-visual span:nth-child(1){left:5%}.harbor-scene.harbor-v2 .harbor-pier-visual span:nth-child(2){left:27%}.harbor-scene.harbor-v2 .harbor-pier-visual span:nth-child(3){left:50%}.harbor-scene.harbor-v2 .harbor-pier-visual span:nth-child(4){left:73%}.harbor-scene.harbor-v2 .harbor-pier-visual span:nth-child(5){right:5%}
  .harbor-scene.harbor-v2 .harbor-quay { z-index:5; }
  .harbor-scene.harbor-v2 .quay-action { border-color:rgba(255,255,255,.2);background:rgba(30,38,40,.84);box-shadow:0 10px 25px rgba(28,38,38,.22);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease; }
  .harbor-scene.harbor-v2 .quay-action:focus-visible { outline:3px solid #ffe295;outline-offset:2px; }
  .app-shell.dark .harbor-scene.harbor-v2 {
    --harbor-sky-top:#10172b;
    --harbor-sky-bottom:#303550;
    --harbor-haze:rgba(91,84,102,.38);
    --harbor-water-top:#174c68;
    --harbor-water-bottom:#0c2e48;
    --harbor-window:#ffd879;
    --harbor-window-off:#445460;
    border-color:#3f485d;
    box-shadow:0 28px 70px rgba(0,0,0,.34);
  }
  .app-shell.dark .harbor-scene.harbor-v2 .harbor-sky::before { opacity:.62; }
  .app-shell.dark .harbor-scene.harbor-v2 .harbor-sun { color:#dce9ff;background:#cddbf1;box-shadow:0 0 0 16px rgba(196,215,240,.08),0 0 45px rgba(190,215,245,.2); }
  .app-shell.dark .harbor-scene.harbor-v2 .harbor-sun svg { opacity:.5; }
  .app-shell.dark .harbor-scene.harbor-v2 .harbor-cloud { background:rgba(180,193,220,.08); }
  .app-shell.dark .harbor-scene.harbor-v2 .harbor-gulls i { border-color:rgba(205,214,230,.36); }
  .app-shell.dark .harbor-scene.harbor-v2 .tide-chip { color:#d8e2eb;border-color:rgba(255,255,255,.12);background:rgba(13,18,31,.52); }
  .app-shell.dark .harbor-scene.harbor-v2 .harbor-scene-notice { color:#83dbc7;border-color:#31594f;background:rgba(25,55,49,.9); }
  .app-shell.dark .harbor-scene.harbor-v2 .building-facade i:nth-child(even) { background:var(--harbor-window-off); }
  @media (max-width: 760px) {
    .harbor-scene.harbor-v2 { min-height:650px; }
    .harbor-scene.harbor-v2 .harbor-horizon { inset:62px 0 38%; }
    .harbor-scene.harbor-v2 .harbor-town { min-height:245px;padding-inline:14px;mask-image:linear-gradient(90deg,transparent,#000 12px,#000 calc(100% - 12px),transparent); }
    .harbor-scene.harbor-v2 .scene-building { transform:scale(.9);transform-origin:bottom center;margin-inline:-4px; }
    .harbor-scene.harbor-v2 .harbor-water { height:36%!important; }
    .harbor-scene.harbor-v2 .harbor-pier-visual { height:190px; }
    .harbor-scene.harbor-v2 .boat-two { display:none; }
    .harbor-scene.harbor-v2 .harbor-scene-notice { left:13px;right:13px;top:56px;max-width:none; }
  }
  @media (max-width: 440px) {
    .harbor-scene.harbor-v2 .harbor-horizon { inset:57px 0 42%; }
    .harbor-scene.harbor-v2 .harbor-town { padding-top:31px; }
    .harbor-scene.harbor-v2 .scene-building:nth-child(n+4) { display:block; }
    .harbor-scene.harbor-v2 .tide-chip { max-width:calc(100% - 26px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  }
  @media (prefers-reduced-motion: reduce) {
    .harbor-scene.harbor-v2 *,
    .harbor-scene.harbor-v2 *::before,
    .harbor-scene.harbor-v2 *::after { animation-duration:.001ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.001ms!important; }
  }
`;

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
    { id: "bro", label: "Velkomstbro", visible: completedLevelCount >= 1, className: "bridge", Icon: Anchor },
    { id: "ur", label: "Havneuret", visible: completedLevelCount >= 2, className: "clocktower", Icon: Clock3 },
    { id: "smag", label: "Smag på dansk", visible: completedLevelCount >= 3, className: "cafe", Icon: Coffee },
    { id: "bolig", label: "Havnehus", visible: completedLevelCount >= 4, className: "townhouse", Icon: Home },
    { id: "park", label: "Kajparken", visible: completedLevelCount >= 5, className: "park", Icon: Sparkles },
    { id: "klinik", label: "Klinik", visible: completedLevelCount >= 6, className: "clinic", Icon: ShieldCheck },
    { id: "torv", label: "Havnetorvet", visible: completedLevelCount >= 7, className: "market", Icon: MessageCircle },
    { id: "arkiv", label: "Søarkivet", visible: completedLevelCount >= 8, className: "archive", Icon: BookOpen },
    { id: "raad", label: "Havnerådet", visible: completedLevelCount >= 9, className: "council", Icon: Compass },
    { id: "lods", label: "Lodshuset", visible: completedLevelCount >= 10, className: "pilot-house", Icon: Waves },
    {
      id: "station",
      label: "Havnestation",
      visible: scenarioRuns.some((run) => run.kind === "metro" && run.success),
      className: "station",
      Icon: Play,
    },
  ].filter((milestone) => milestone.visible);

  const handlePurchase = (buildingId: HarborBuildingId, cost: number, name: string) => {
    const accepted = onBuyBuilding(buildingId, cost);
    setPurchaseMessage(accepted === false ? "Købet kunne ikke gennemføres." : `${name} er bestilt til havnen.`);
  };

  return (
    <main className="harbor-home">
      <style>{HARBOR_SCENE_STYLES}</style>
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
        className={`harbor-scene harbor-v2 ${tidePercent >= 80 ? "high-tide" : tidePercent >= 50 ? "rising-tide" : "low-tide"}`}
        style={{ "--tide-level": `${tidePercent}%` } as CSSProperties}
        aria-label="Din voksende ordhavn"
      >
        <div className="harbor-sky">
          <div className="harbor-cloud cloud-one" />
          <div className="harbor-cloud cloud-two" />
          <div className="harbor-gulls" aria-hidden="true"><i /><i /><i /></div>
          <div className="harbor-sun"><Sparkles size={20} /></div>
        </div>
        <div className="harbor-horizon">
          <span className="tide-chip"><Waves size={16} /> {tideLabel} · {streak} dages rytme</span>
          {purchaseMessage && <span className="harbor-scene-notice" role="status"><Check size={13} /> {purchaseMessage}</span>}
          <div className="harbor-town" aria-label="Bygninger langs kajen">
            {builtMilestones.map((milestone, milestoneIndex) => {
              const MilestoneIcon = milestone.Icon;
              return (
                <div
                  className={`scene-building milestone-building ${milestone.className}`}
                  key={milestone.id}
                  role="img"
                  aria-label={`${milestone.label}, bygget efter niveau ${milestoneIndex + 1}`}
                  style={{ "--building-order": milestoneIndex } as CSSProperties}
                >
                  <span className="building-roof" aria-hidden="true" />
                  <span className="building-facade" aria-hidden="true"><i /><i /><i /><b /></span>
                  <span className="building-sign"><MilestoneIcon size={14} /><strong>{milestone.label}</strong></span>
                </div>
              );
            })}
            {HARBOR_BUILDINGS.map((building, buildingIndex) => {
              const Icon = buildingIcons[building.id];
              const isOwned = owned.has(building.id);
              const rankLocked = maritimeRankOrder.indexOf(rank.rank.id) < maritimeRankOrder.indexOf(building.requiredRank);
              const cannotAfford = kroner < building.costKroner;
              const state = isOwned ? "owned" : rankLocked ? "locked" : cannotAfford ? "shortfall" : "purchasable";
              const stateLabel = isOwned
                ? "bygget"
                : rankLocked
                  ? `låst indtil ${building.requiredRank}`
                  : cannotAfford
                    ? `${building.costKroner - kroner} kroner mangler`
                    : `kan bygges for ${building.costKroner} kroner`;
              return (
                <button
                  className={`scene-building functional-building ${building.id} ${state}`}
                  key={building.id}
                  type="button"
                  aria-disabled={rankLocked || (!isOwned && cannotAfford)}
                  title={`${describeBenefit(building.benefit)} · ${stateLabel}`}
                  aria-label={`${building.name}, ${stateLabel}. ${describeBenefit(building.benefit)}`}
                  style={{ "--building-order": builtMilestones.length + buildingIndex } as CSSProperties}
                  onClick={() => isOwned || rankLocked || cannotAfford
                    ? document.getElementById("harbor-shop")?.scrollIntoView({ behavior: "smooth" })
                    : handlePurchase(building.id, building.costKroner, building.name)}
                >
                  <span className="building-roof" aria-hidden="true" />
                  <span className="building-facade" aria-hidden="true"><i /><i /><i /><b /></span>
                  <span className="building-special-detail" aria-hidden="true" />
                  <span className="building-sign"><Icon size={14} /><strong>{building.name}</strong></span>
                  <span className="building-state" aria-hidden="true">{isOwned ? <Check size={12} /> : rankLocked ? <LockKeyhole size={11} /> : cannotAfford ? `${building.costKroner - kroner} kr.` : `${building.costKroner} kr.`}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="harbor-water">
          <div className="wave wave-one" />
          <div className="wave wave-two" />
          <div className="harbor-reflections" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="harbor-boat boat-one" aria-label="Sejlbåden Ordhavn"><span className="boat-name">Ø</span><span className="boat-cabin" /></div>
          <div className="harbor-boat boat-two" aria-hidden="true"><span className="boat-cabin" /></div>
        </div>
        <div className="harbor-pier-visual" aria-hidden="true"><span /><span /><span /><span /><span /></div>
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
            const rankLocked = maritimeRankOrder.indexOf(rank.rank.id) < maritimeRankOrder.indexOf(building.requiredRank);
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
