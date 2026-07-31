import { advancedScenarioCards } from "./advancedScenarioData.ts";
import {
  cityScenarioRegistry,
  type CityScenarioId,
} from "./cityScenarioData.ts";
import { dialogueCampaignCharacters } from "./dialogueCampaignData.ts";
import { harborScenarioCases } from "./harborData.ts";
import { logicScenarioCards } from "./logicScenarioData.ts";
import {
  metroCases,
  phoneMissions,
  postCases,
  type ScenarioKind,
} from "./scenarioData.ts";

export type ScenarioLaunch = {
  kind: ScenarioKind;
  caseId: string;
  cityScenarioId?: CityScenarioId;
  forceDirect?: boolean;
};

const directCollections = [
  { kind: "harbor" as const, cases: harborScenarioCases },
  { kind: "phone" as const, cases: phoneMissions },
  { kind: "dialogue" as const, cases: dialogueCampaignCharacters.map((item) => item.case) },
  { kind: "post" as const, cases: postCases },
  { kind: "metro" as const, cases: metroCases },
];

export function resolveScenarioLaunch(caseId: string): ScenarioLaunch | null {
  for (const collection of directCollections) {
    if (collection.cases.some((item) => item.id === caseId)) return { kind: collection.kind, caseId };
  }
  if (advancedScenarioCards.some((item) => item.id === caseId)) return { kind: "advanced", caseId };
  if (logicScenarioCards.some((item) => item.id === caseId)) return { kind: "logic", caseId };
  for (const [scenarioId, scenario] of Object.entries(cityScenarioRegistry) as Array<[CityScenarioId, (typeof cityScenarioRegistry)[CityScenarioId]]>) {
    if (scenario.cases.some((item) => item.id === caseId)) return { kind: "city", caseId, cityScenarioId: scenarioId };
  }
  return null;
}

export function isScenarioLaunchAccessible(
  launch: ScenarioLaunch,
  successfulCaseIds: ReadonlySet<string>,
  unlockedScenarioIds: readonly string[],
) {
  if (successfulCaseIds.has(launch.caseId) || unlockedScenarioIds.includes(launch.caseId)) return true;
  if (["advanced", "logic", "city"].includes(launch.kind)) return true;
  if (launch.kind === "dialogue") {
    return dialogueCampaignCharacters.some((item) => item.case.id === launch.caseId);
  }
  const collection = directCollections.find((item) => item.kind === launch.kind);
  return collection?.cases[0]?.id === launch.caseId;
}

export function nextBossScenarioLaunch(
  caseIds: readonly string[],
  successfulCaseIds: ReadonlySet<string>,
  unlockedScenarioIds: readonly string[],
) {
  const launches = caseIds
    .filter((caseId) => !successfulCaseIds.has(caseId))
    .map(resolveScenarioLaunch)
    .filter((launch): launch is ScenarioLaunch => Boolean(launch));
  const fallback = launches.length > 0
    ? launches
    : caseIds.map(resolveScenarioLaunch).filter((launch): launch is ScenarioLaunch => Boolean(launch));
  const launch = fallback.find((candidate) => isScenarioLaunchAccessible(candidate, successfulCaseIds, unlockedScenarioIds))
    ?? fallback[0]
    ?? null;
  return launch ? { ...launch, forceDirect: true } : null;
}
