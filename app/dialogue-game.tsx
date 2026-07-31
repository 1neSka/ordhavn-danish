"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  LockKeyhole,
  Map as MapIcon,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  dialogueCampaignCharacters,
  type DialogueCampaignCharacter,
} from "@/lib/dialogueCampaignData";
import {
  evaluateDialogueTurnOffline,
  type DialogueTurnEvaluationRequest,
  type DialogueTurnEvaluationResult,
} from "@/lib/dialogueAi";
import type { ScenarioRun } from "@/lib/scenarioData";
import styles from "./dialogue-game.module.css";

type DialogueGameProps = {
  runs: ScenarioRun[];
  initialCaseId?: string;
  onExit: () => void;
  onComplete: (run: ScenarioRun) => void;
  onStartAttempt: (caseId: string) => boolean;
  onEvaluateTurn?: (request: DialogueTurnEvaluationRequest) => Promise<DialogueTurnEvaluationResult>;
};

type CampaignCase = DialogueCampaignCharacter["case"];
type CampaignNode = CampaignCase["nodes"][string];
type CampaignChoice = CampaignNode["choices"][number];
type CampaignEnding = CampaignCase["endings"][string];
type CampaignAiRoute = NonNullable<CampaignNode["aiInput"]>["routes"][number];
type MeterState = Record<string, number>;
type Phase = "catalog" | "briefing" | "playing" | "result";

type DecisionDebrief = {
  nodeId: string;
  speaker: string;
  choiceText: string;
  insight: string;
  principle: string;
  moralTone: string;
};

type TerminalResult = {
  ending: CampaignEnding;
  run: ScenarioRun;
  debrief: DecisionDebrief[];
};

type PendingAiTurn = {
  evaluation: DialogueTurnEvaluationResult;
  route: CampaignAiRoute;
  userText: string;
  nextMeters: MeterState;
  nextFlags: string[];
  nextDecisions: ScenarioRun["decisions"];
  nextDebrief: DecisionDebrief[];
  nextFreeTextTurns: string[];
  nextAiRouteIds: string[];
};

const rarityScore: Record<string, number> = {
  almindelig: 230,
  common: 230,
  usædvanlig: 315,
  uncommon: 315,
  sjælden: 395,
  rare: 395,
  hemmelig: 470,
  secret: 470,
  legendarisk: 500,
  legendary: 500,
};

const moralToneLabels: Record<string, string> = {
  open: "åben",
  pragmatic: "pragmatisk",
  deceptive: "vildledende",
  ruthless: "hensynsløs",
  protective: "beskyttende",
};

const rarityLabels: Record<string, string> = {
  common: "almindeligt",
  uncommon: "usædvanligt",
  rare: "sjældent",
  secret: "hemmeligt",
};

function runId() {
  return `dialogue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asStringList(value: ScenarioRun["metadata"][string] | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function clampMeter(value: number, meter: CampaignCase["meters"][number]) {
  return Math.max(meter.min, Math.min(meter.max, value));
}

function endingEntries(item: DialogueCampaignCharacter) {
  return Object.entries(item.case.endings) as Array<[string, CampaignEnding]>;
}

function openedEndingIds(runs: ScenarioRun[], caseId: string) {
  return new Set(
    runs
      .filter((run) => run.kind === "dialogue" && run.caseId === caseId)
      .map((run) => run.metadata.endingId)
      .filter((value): value is string => typeof value === "string"),
  );
}

function toneProfile(debrief: DecisionDebrief[]) {
  const counts = new Map<string, number>();
  debrief.forEach(({ moralTone }) => {
    const tone = moralToneLabels[moralTone] ?? (moralTone.trim() || "uafklaret");
    counts.set(tone, (counts.get(tone) ?? 0) + 1);
  });
  const ordered = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  return ordered.length ? ordered.slice(0, 2).map(([tone]) => tone).join(" + ") : "uafklaret";
}

function scoreForEnding(ending: CampaignEnding, decisionCount: number) {
  const rarity = String(ending.rarity).toLowerCase();
  const base = rarityScore[rarity] ?? 280;
  return Math.max(180, Math.min(500, base + Math.min(45, decisionCount * 9)));
}

function hasRequirements(choice: CampaignChoice, flags: string[]) {
  return (choice.requiresFlags ?? []).every((flag) => flags.includes(flag));
}

function accentStyle(character: DialogueCampaignCharacter) {
  return { "--dialogue-accent": character.color } as CSSProperties;
}

function ScenarioHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <button className={styles.iconButton} onClick={onBack} aria-label="Gå tilbage">
        <ArrowLeft size={20} />
      </button>
      <div className={styles.headerCopy}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {action}
    </header>
  );
}

function LevelBadge({ level }: { level: CampaignCase["level"] }) {
  return <span className={styles.levelBadge}>{level}</span>;
}

function BranchMap({
  character,
  runs,
  currentNodeIds = [],
  currentChoiceIds = [],
  currentAiRouteIds = [],
  currentEndingId,
  onClose,
}: {
  character: DialogueCampaignCharacter;
  runs: ScenarioRun[];
  currentNodeIds?: string[];
  currentChoiceIds?: string[];
  currentAiRouteIds?: string[];
  currentEndingId?: string;
  onClose: () => void;
}) {
  const caseRuns = runs.filter((run) => run.kind === "dialogue" && run.caseId === character.case.id);
  const knownNodes = new Set([
    ...caseRuns.flatMap((run) => asStringList(run.metadata.visitedNodeIds)),
    ...currentNodeIds,
  ]);
  const knownChoices = new Set([
    ...caseRuns.flatMap((run) => asStringList(run.metadata.choiceIds)),
    ...currentChoiceIds,
  ]);
  const knownAiRoutes = new Set([
    ...caseRuns.flatMap((run) => asStringList(run.metadata.aiRouteIds)),
    ...currentAiRouteIds,
  ]);
  const knownEndings = openedEndingIds(runs, character.case.id);
  if (currentEndingId) knownEndings.add(currentEndingId);
  const nodes = Object.values(character.case.nodes);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className={styles.mapBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className={styles.mapDialog} style={accentStyle(character)} role="dialog" aria-modal="true" aria-labelledby="branch-map-title">
        <div className={styles.mapHead}>
          <div>
            <span className={styles.eyebrow}><MapIcon size={14} /> Forløbskort</span>
            <h2 id="branch-map-title">Det, du faktisk har set</h2>
            <p>Ukendte scener og udfald afsløres først, når du når dem.</p>
          </div>
          <button className={styles.iconButton} onClick={onClose} aria-label="Luk forløbskort">
            <X size={20} />
          </button>
        </div>

        <div className={styles.branchLegend}>
          <span><i className={styles.seenDot} /> Set</span>
          <span><i className={styles.unknownDot} /> Ukendt</span>
          <strong>{knownEndings.size}/{endingEntries(character).length} udfald</strong>
        </div>

        <div className={styles.branchScroller}>
          <div className={styles.branchNodes}>
            {nodes.map((node, index) => {
              const seen = knownNodes.has(node.id);
              const followedChoices = node.choices.filter((choice) => knownChoices.has(choice.id));
              const followedAiRoutes = node.aiInput?.routes.filter((route) => knownAiRoutes.has(route.id)) ?? [];
              return (
                <article className={`${styles.branchNode} ${seen ? styles.branchNodeSeen : styles.branchNodeUnknown}`} key={node.id}>
                  <span className={styles.branchIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <small>{seen ? node.speaker : "Ukendt scene"}</small>
                  <strong>{seen ? node.stage : "???"}</strong>
                  {seen && (followedChoices.length > 0 || followedAiRoutes.length > 0) ? (
                    <div className={styles.branchEdges}>
                      {followedChoices.map((choice) => {
                        const targetIndex = choice.next ? nodes.findIndex((candidate) => candidate.id === choice.next) : -1;
                        const targetEnding = choice.endingId ? character.case.endings[choice.endingId] : null;
                        const targetSeen = choice.next ? knownNodes.has(choice.next) : Boolean(choice.endingId && knownEndings.has(choice.endingId));
                        const targetLabel = !targetSeen
                          ? "???"
                          : targetIndex >= 0
                            ? `Scene ${String(targetIndex + 1).padStart(2, "0")}`
                            : targetEnding?.title ?? "Udfald";
                        return (
                          <span key={choice.id}>
                            <ChevronRight size={12} />
                            <span>{choice.text}<em>→ {targetLabel}</em></span>
                          </span>
                        );
                      })}
                      {followedAiRoutes.map((route) => {
                        const targetIndex = route.next ? nodes.findIndex((candidate) => candidate.id === route.next) : -1;
                        const targetEnding = route.endingId ? character.case.endings[route.endingId] : null;
                        const targetSeen = route.next ? knownNodes.has(route.next) : Boolean(route.endingId && knownEndings.has(route.endingId));
                        const targetLabel = !targetSeen
                          ? "???"
                          : targetIndex >= 0
                            ? `Scene ${String(targetIndex + 1).padStart(2, "0")}`
                            : targetEnding?.title ?? "Udfald";
                        return (
                          <span key={route.id}>
                            <ChevronRight size={12} />
                            <span>Frit svar · {route.label}<em>→ {targetLabel}</em></span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className={styles.hiddenEdge}>···</span>
                  )}
                </article>
              );
            })}
          </div>

          <div className={styles.endingLane}>
            {endingEntries(character).map(([id, ending]) => {
              const seen = knownEndings.has(id);
              return (
                <article className={`${styles.endingNode} ${seen ? styles.endingNodeSeen : ""}`} key={id}>
                  <Sparkles size={15} />
                  <small>{seen ? (rarityLabels[String(ending.rarity)] ?? String(ending.rarity)) : "Uopdaget"}</small>
                  <strong>{seen ? ending.title : "???"}</strong>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DialogueGame({ runs, initialCaseId, onExit, onComplete, onStartAttempt, onEvaluateTurn }: DialogueGameProps) {
  const directCharacter = useMemo(
    () => initialCaseId
      ? dialogueCampaignCharacters.find((item) => item.case.id === initialCaseId) ?? null
      : null,
    [initialCaseId],
  );
  const [phase, setPhase] = useState<Phase>(directCharacter ? "briefing" : "catalog");
  const [character, setCharacter] = useState<DialogueCampaignCharacter | null>(directCharacter);
  const [nodeId, setNodeId] = useState("");
  const [meters, setMeters] = useState<MeterState>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [path, setPath] = useState<string[]>([]);
  const [choiceIds, setChoiceIds] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<ScenarioRun["decisions"]>([]);
  const [debrief, setDebrief] = useState<DecisionDebrief[]>([]);
  const [freeTextTurns, setFreeTextTurns] = useState<string[]>([]);
  const [aiRouteIds, setAiRouteIds] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [pendingAiTurn, setPendingAiTurn] = useState<PendingAiTurn | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [terminal, setTerminal] = useState<TerminalResult | null>(null);
  const [mapCharacter, setMapCharacter] = useState<DialogueCampaignCharacter | null>(null);
  const [firstAttemptEligible, setFirstAttemptEligible] = useState(false);
  const attemptClaimed = useRef(false);

  const resetRunState = useCallback((item: DialogueCampaignCharacter) => {
    setNodeId(item.case.startNode);
    setMeters(Object.fromEntries(item.case.meters.map((meter) => [meter.id, meter.start])));
    setFlags([]);
    setPath([item.case.startNode]);
    setChoiceIds([]);
    setDecisions([]);
    setDebrief([]);
    setFreeTextTurns([]);
    setAiRouteIds([]);
    setFreeText("");
    setAiLoading(false);
    setAiError("");
    setPendingAiTurn(null);
    setTerminal(null);
    setStartedAt("");
    setFirstAttemptEligible(false);
    attemptClaimed.current = false;
  }, []);

  const openDossier = useCallback((item: DialogueCampaignCharacter) => {
    setCharacter(item);
    resetRunState(item);
    setPhase("briefing");
  }, [resetRunState]);

  const start = useCallback(() => {
    if (!character || attemptClaimed.current) return;
    attemptClaimed.current = true;
    setFirstAttemptEligible(onStartAttempt(character.case.id));
    setStartedAt(new Date().toISOString());
    setPhase("playing");
  }, [character, onStartAttempt]);

  const returnToCatalog = useCallback(() => {
    setMapCharacter(null);
    setTerminal(null);
    setCharacter(null);
    setPhase("catalog");
  }, []);

  const leaveCurrent = useCallback(() => {
    if (initialCaseId) onExit();
    else returnToCatalog();
  }, [initialCaseId, onExit, returnToCatalog]);

  const finish = useCallback((
    activeCharacter: DialogueCampaignCharacter,
    endingId: string,
    nextMeters: MeterState,
    nextFlags: string[],
    nextChoiceIds: string[],
    nextDecisions: ScenarioRun["decisions"],
    nextDebrief: DecisionDebrief[],
    nextFreeTextTurns: string[],
    nextAiRouteIds: string[],
  ) => {
    const ending = activeCharacter.case.endings[endingId];
    if (!ending) return;
    const score = scoreForEnding(ending, nextDecisions.length);
    const meterSummary = activeCharacter.case.meters.map((meter) => `${meter.label}: ${nextMeters[meter.id] ?? meter.start}`);
    const run: ScenarioRun = {
      id: runId(),
      kind: "dialogue",
      caseId: activeCharacter.case.id,
      title: activeCharacter.case.title,
      level: activeCharacter.case.level,
      startedAt: startedAt || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      success: ending.success,
      score,
      maxScore: 500,
      path: [...path],
      decisions: nextDecisions,
      metadata: {
        endingId,
        endingTitle: ending.title,
        characterId: activeCharacter.id,
        visitedNodeIds: [...path],
        choiceIds: nextChoiceIds,
        flags: nextFlags,
        meterSummary,
        firstAttemptEligible,
        moralProfile: toneProfile(nextDebrief),
        freeTextTurns: nextFreeTextTurns.slice(-6).map((text) => text.slice(0, 600)),
        aiRouteIds: nextAiRouteIds,
      },
    };
    setTerminal({ ending, run, debrief: nextDebrief });
    setPhase("result");
    onComplete(run);
  }, [firstAttemptEligible, onComplete, path, startedAt]);

  const choose = useCallback((choice: CampaignChoice) => {
    if (!character || phase !== "playing" || !hasRequirements(choice, flags)) return;
    const node = character.case.nodes[nodeId];
    if (!node) return;

    const nextMeters = { ...meters };
    character.case.meters.forEach((meter) => {
      const delta = choice.effects[meter.id] ?? 0;
      nextMeters[meter.id] = clampMeter((nextMeters[meter.id] ?? meter.start) + delta, meter);
    });
    const nextFlags = [...new Set([...flags, ...(choice.flags ?? [])])];
    const nextChoiceIds = [...choiceIds, choice.id];
    const nextDecisions: ScenarioRun["decisions"] = [
      ...decisions,
      {
        stepId: node.id,
        answerId: choice.id,
        answerText: choice.text,
        correct: null,
        delta: { ...choice.effects },
      },
    ];
    const nextDebrief = [
      ...debrief,
      {
        nodeId: node.id,
        speaker: node.speaker,
        choiceText: choice.text,
        insight: choice.insight,
        principle: choice.principle,
        moralTone: choice.moralTone,
      },
    ];

    setMeters(nextMeters);
    setFlags(nextFlags);
    setChoiceIds(nextChoiceIds);
    setDecisions(nextDecisions);
    setDebrief(nextDebrief);

    if (choice.endingId) {
      finish(character, choice.endingId, nextMeters, nextFlags, nextChoiceIds, nextDecisions, nextDebrief, freeTextTurns, aiRouteIds);
      return;
    }
    if (choice.next) {
      setNodeId(choice.next);
      setPath((current) => [...current, choice.next!]);
      setFreeText("");
      setAiError("");
    }
  }, [aiRouteIds, character, choiceIds, debrief, decisions, finish, flags, freeTextTurns, meters, nodeId, phase]);

  const submitFreeText = useCallback(async () => {
    if (!character || !nodeId || phase !== "playing" || aiLoading || pendingAiTurn) return;
    const activeNode = character.case.nodes[nodeId];
    const aiInput = activeNode?.aiInput;
    if (!activeNode || !aiInput) return;
    const userText = freeText.trim();
    if (userText.length < aiInput.minimumChars) {
      setAiError(`Skriv mindst ${aiInput.minimumChars} tegn, så svaret kan vurderes.`);
      return;
    }

    const request: DialogueTurnEvaluationRequest = {
      caseId: character.case.id,
      nodeId: activeNode.id,
      userText,
      flags,
      meters,
      visitedNodeIds: path,
    };
    setAiLoading(true);
    setAiError("");
    try {
      let evaluation: DialogueTurnEvaluationResult;
      try {
        evaluation = onEvaluateTurn
          ? await onEvaluateTurn(request)
          : await evaluateDialogueTurnOffline(request);
      } catch {
        evaluation = await evaluateDialogueTurnOffline(request);
      }

      let route = aiInput.routes.find((candidate) => candidate.id === evaluation.routeId);
      if (!route && onEvaluateTurn) {
        evaluation = await evaluateDialogueTurnOffline(request);
        route = aiInput.routes.find((candidate) => candidate.id === evaluation.routeId);
      }
      if (!route) throw new Error("route-not-found");

      const nextMeters = { ...meters };
      character.case.meters.forEach((meter) => {
        const delta = route.effects[meter.id] ?? 0;
        nextMeters[meter.id] = clampMeter((nextMeters[meter.id] ?? meter.start) + delta, meter);
      });
      const nextFlags = [...new Set([...flags, ...(route.flags ?? [])])];
      const nextDecisions: ScenarioRun["decisions"] = [
        ...decisions,
        {
          stepId: activeNode.id,
          answerId: route.id,
          answerText: userText,
          correct: null,
          delta: { ...route.effects },
        },
      ];
      const nextDebrief: DecisionDebrief[] = [
        ...debrief,
        {
          nodeId: activeNode.id,
          speaker: activeNode.speaker,
          choiceText: userText,
          insight: evaluation.analysis,
          principle: `Fortolket som: ${route.label}`,
          moralTone: route.moralTone,
        },
      ];
      setPendingAiTurn({
        evaluation,
        route,
        userText,
        nextMeters,
        nextFlags,
        nextDecisions,
        nextDebrief,
        nextFreeTextTurns: [...freeTextTurns, userText],
        nextAiRouteIds: [...aiRouteIds, route.id],
      });
    } catch {
      setAiError("Svaret kunne ikke læses. Prøv at formulere beslutningen lidt mere konkret.");
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, aiRouteIds, character, debrief, decisions, flags, freeText, freeTextTurns, meters, nodeId, onEvaluateTurn, path, pendingAiTurn, phase]);

  const continueAfterAi = useCallback(() => {
    if (!character || !pendingAiTurn) return;
    const turn = pendingAiTurn;
    setMeters(turn.nextMeters);
    setFlags(turn.nextFlags);
    setDecisions(turn.nextDecisions);
    setDebrief(turn.nextDebrief);
    setFreeTextTurns(turn.nextFreeTextTurns);
    setAiRouteIds(turn.nextAiRouteIds);
    setFreeText("");
    setPendingAiTurn(null);
    setAiError("");

    if (turn.route.endingId) {
      finish(
        character,
        turn.route.endingId,
        turn.nextMeters,
        turn.nextFlags,
        choiceIds,
        turn.nextDecisions,
        turn.nextDebrief,
        turn.nextFreeTextTurns,
        turn.nextAiRouteIds,
      );
      return;
    }
    if (turn.route.next) {
      setNodeId(turn.route.next);
      setPath((current) => [...current, turn.route.next!]);
    }
  }, [character, choiceIds, finish, pendingAiTurn]);

  const node = character && nodeId ? character.case.nodes[nodeId] : null;
  const availableChoices = useMemo(
    () => node?.choices.filter((choice) => hasRequirements(choice, flags)) ?? [],
    [flags, node],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < 4 && availableChoices[index]) {
        event.preventDefault();
        choose(availableChoices[index]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [availableChoices, choose, phase]);

  if (phase === "catalog" || !character) {
    return (
      <main className={styles.shell}>
        <ScenarioHeader title="Mellem linjerne" subtitle="Fem sind. Ingen universel rigtig strategi." onBack={onExit} />
        <section className={styles.catalogHero}>
          <div>
            <span className={styles.eyebrow}><Eye size={14} /> Social efterforskning</span>
            <h1>Læs situationen,<br />ikke facitlisten.</h1>
            <p>Detaljer fra dossiet ændrer, hvilke løgne, indrømmelser og alliancer der overhovedet kan holde. Hvert valg åbner én vej og lukker en anden.</p>
          </div>
          <div className={styles.heroConstellation} aria-hidden="true">
            <i /><i /><i /><i /><i />
            <span>5 sager</span>
          </div>
        </section>

        <section className={styles.catalogGrid} aria-label="Sager">
          {dialogueCampaignCharacters.map((item, index) => {
            const opened = openedEndingIds(runs, item.case.id).size;
            const total = endingEntries(item).length;
            const attempts = runs.filter((run) => run.kind === "dialogue" && run.caseId === item.case.id).length;
            return (
              <article className={styles.characterCard} key={item.id} style={accentStyle(item)}>
                <div className={styles.characterImage}>
                  <Image unoptimized src={item.portrait} alt={`Portræt af ${item.name}`} fill sizes="(max-width: 760px) 100vw, 33vw" />
                  <div className={styles.imageVeil} />
                  <span className={styles.caseNumber}>SAG {String(index + 1).padStart(2, "0")}</span>
                  <LevelBadge level={item.case.level} />
                </div>
                <div className={styles.characterCopy}>
                  <div>
                    <p className={styles.archetype}>{item.archetype}</p>
                    <h2>{item.name}</h2>
                    <span className={styles.age}>{item.ageLabel}</span>
                  </div>
                  <p>{item.psychology}</p>
                  <div className={styles.cardMeta}>
                    <span><strong>{opened}/{total}</strong> udfald</span>
                    <span><strong>{attempts}</strong> forsøg</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.primaryAction} onClick={() => openDossier(item)}>
                      Åbn dossier <ChevronRight size={17} />
                    </button>
                    <button className={styles.secondaryAction} onClick={() => setMapCharacter(item)} aria-label={`Se forløbskort for ${item.name}`}>
                      <MapIcon size={17} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
        {mapCharacter && <BranchMap character={mapCharacter} runs={runs} onClose={() => setMapCharacter(null)} />}
      </main>
    );
  }

  if (phase === "briefing") {
    const dossier = character.case.briefing;
    const opened = openedEndingIds(runs, character.case.id).size;
    return (
      <main className={styles.shell} style={accentStyle(character)}>
        <ScenarioHeader title="Fortroligt dossier" subtitle={`${character.name} · ${character.case.location}`} onBack={leaveCurrent} action={<LevelBadge level={character.case.level} />} />
        <section className={styles.dossier}>
          <aside className={styles.dossierPortrait}>
            <Image unoptimized src={character.portrait} alt={`Portræt af ${character.name}`} fill priority sizes="(max-width: 850px) 100vw, 38vw" />
            <div className={styles.imageVeil} />
            <div className={styles.identityPlate}>
              <span>{character.archetype}</span>
              <h1>{character.name}</h1>
              <p>{character.ageLabel}</p>
            </div>
          </aside>

          <article className={styles.dossierPaper}>
            <div className={styles.fileStamp}>FORTROLIGT · {character.case.level}</div>
            <span className={styles.eyebrow}>{character.case.location}</span>
            <h2>{character.case.title}</h2>
            <p className={styles.premise}>{character.case.premise}</p>
            <p className={styles.lead}>{dossier.lead}</p>
            <div className={styles.briefingText}>
              {dossier.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>

            <div className={styles.factGrid}>
              {dossier.facts.map((fact) => (
                <section key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                  <p>{fact.significance}</p>
                </section>
              ))}
            </div>

            <div className={styles.warning}><LockKeyhole size={17} /><p><strong>Vær opmærksom</strong>{dossier.warning}</p></div>
            <div className={styles.objectiveBox}>
              <span>Din opgave</span>
              <p>{character.case.objective}</p>
            </div>

            <div className={styles.briefingFooter}>
              <div><strong>{opened}/{endingEntries(character).length}</strong><span>udfald opdaget</span></div>
              <button className={styles.mapAction} onClick={() => setMapCharacter(character)}><MapIcon size={17} /> Forløbskort</button>
              <button className={styles.startAction} onClick={start}><Play size={18} fill="currentColor" /> Start samtalen</button>
            </div>
          </article>
        </section>
        {mapCharacter && <BranchMap character={mapCharacter} runs={runs} onClose={() => setMapCharacter(null)} />}
      </main>
    );
  }

  if (phase === "result" && terminal) {
    const endingId = String(terminal.run.metadata.endingId);
    const openedBefore = openedEndingIds(runs, character.case.id);
    openedBefore.add(endingId);
    const totalEndings = endingEntries(character).length;
    return (
      <main className={styles.shell} style={accentStyle(character)}>
        <ScenarioHeader title={character.case.title} subtitle="Sagen er afsluttet" onBack={leaveCurrent} action={<span className={styles.score}>{terminal.run.score} XP</span>} />
        <section className={styles.resultHero}>
          <div className={styles.resultPortrait}>
            <Image unoptimized src={character.portrait} alt={`Portræt af ${character.name}`} fill priority sizes="(max-width: 800px) 100vw, 42vw" />
            <div className={styles.imageVeil} />
          </div>
          <article className={styles.resultCopy}>
            <span className={styles.endingKicker}>{terminal.ending.kicker}</span>
            <p className={styles.rarity}>{rarityLabels[String(terminal.ending.rarity)] ?? String(terminal.ending.rarity)} udfald</p>
            <h1>{terminal.ending.title}</h1>
            <p className={styles.endingDescription}>{terminal.ending.description}</p>
            <div className={styles.epilogue}>
              <span>Senere</span>
              <p>{terminal.ending.epilogue}</p>
            </div>
            <div className={styles.resultStats}>
              <span><strong>{openedBefore.size}/{totalEndings}</strong> udfald opdaget</span>
              <span><strong>{terminal.run.decisions.length}</strong> beslutninger</span>
              <span><strong>{String(terminal.run.metadata.moralProfile)}</strong> strategi</span>
            </div>
            <div className={styles.resultActions}>
              <button className={styles.primaryAction} onClick={() => setMapCharacter(character)}><MapIcon size={17} /> Se forløbskort</button>
              <button className={styles.secondaryTextAction} onClick={() => openDossier(character)}><RotateCcw size={16} /> Prøv igen</button>
              <button className={styles.secondaryTextAction} onClick={returnToCatalog}>Andre sager</button>
            </div>
          </article>
        </section>

        <section className={styles.debriefSection}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}><Eye size={14} /> Efteranalyse</span>
            <h2>Dine valg, uden facitstempel</h2>
            <p>Et valg kan virke og stadig koste noget. Her er signalerne, du aktiverede undervejs.</p>
          </div>
          <div className={styles.debriefList}>
            {terminal.debrief.map((item, index) => (
              <article key={`${item.nodeId}-${index}`}>
                <span className={styles.debriefIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <small>{item.speaker}</small>
                  <blockquote>“{item.choiceText}”</blockquote>
                  <p><strong>{item.principle}</strong>{item.insight}</p>
                </div>
                <span className={styles.toneTag}>{moralToneLabels[item.moralTone] ?? item.moralTone}</span>
              </article>
            ))}
          </div>
        </section>
        {mapCharacter && (
          <BranchMap
            character={mapCharacter}
            runs={runs}
            currentNodeIds={path}
            currentChoiceIds={choiceIds}
            currentAiRouteIds={aiRouteIds}
            currentEndingId={endingId}
            onClose={() => setMapCharacter(null)}
          />
        )}
      </main>
    );
  }

  if (!node) {
    return (
      <main className={styles.shell} style={accentStyle(character)}>
        <ScenarioHeader title={character.case.title} subtitle="Samtalen kunne ikke fortsætte" onBack={leaveCurrent} />
        <section className={styles.missingState}>
          <h1>En scene mangler</h1>
          <p>Denne gren peger på en scene, der ikke findes i sagen endnu.</p>
          <button className={styles.primaryAction} onClick={() => openDossier(character)}>Tilbage til dossieret</button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.playShell} style={accentStyle(character)}>
      <ScenarioHeader
        title={character.case.title}
        subtitle={`${character.name} · ${character.case.location}`}
        onBack={leaveCurrent}
        action={<button className={styles.headerMapButton} onClick={() => setMapCharacter(character)}><MapIcon size={16} /> Spor</button>}
      />
      <section className={styles.scene}>
        <div className={styles.scenePortrait}>
          <Image unoptimized src={character.portrait} alt={`${character.name} i scenen`} fill priority sizes="(max-width: 850px) 100vw, 50vw" />
          <div className={styles.sceneLight} />
          <div className={styles.sceneIdentity}>
            <span>{character.archetype}</span>
            <strong>{character.name}</strong>
          </div>
        </div>

        <div className={styles.sceneInterface}>
          <div className={styles.sceneObjective}>
            <span>Aktiv opgave</span>
            <p>{character.case.objective}</p>
          </div>

          <div className={styles.meters} aria-label="Situationsmålinger">
            {character.case.meters.map((meter) => {
              const value = meters[meter.id] ?? meter.start;
              const range = Math.max(1, meter.max - meter.min);
              const percent = ((value - meter.min) / range) * 100;
              return (
                <div className={`${styles.meter} ${meter.inverse ? styles.inverseMeter : ""}`} key={meter.id}>
                  <label><span>{meter.label}</span><strong>{value}</strong></label>
                  <i><b style={{ width: `${percent}%`, background: meter.color }} /></i>
                </div>
              );
            })}
          </div>

          <article className={styles.dialoguePanel}>
            <p className={styles.stageNote}>{node.stage}</p>
            <span className={styles.speaker}>{node.speaker}</span>
            <blockquote>“{node.line}”</blockquote>
            {node.aiInput ? (
              pendingAiTurn ? (
                <div className={styles.aiReaction} aria-live="polite">
                  <span className={styles.aiSignal}>ELI‑9 behandler svaret</span>
                  <p>{pendingAiTurn.evaluation.reaction}</p>
                  {pendingAiTurn.evaluation.generatedBeat && (
                    <blockquote className={styles.generatedBeat}>
                      <small>{pendingAiTurn.evaluation.generatedBeat.stage}</small>
                      <strong>{pendingAiTurn.evaluation.generatedBeat.speaker}</strong>
                      <span>“{pendingAiTurn.evaluation.generatedBeat.line}”</span>
                    </blockquote>
                  )}
                  <button className={styles.aiContinue} onClick={continueAfterAi}>
                    Fortsæt <ChevronRight size={17} />
                  </button>
                </div>
              ) : (
                <form className={styles.freeTextForm} onSubmit={(event) => {
                  event.preventDefault();
                  void submitFreeText();
                }}>
                  <label htmlFor={`dialogue-free-${node.id}`}>{node.aiInput.prompt}</label>
                  <textarea
                    id={`dialogue-free-${node.id}`}
                    value={freeText}
                    onChange={(event) => {
                      setFreeText(event.target.value);
                      if (aiError) setAiError("");
                    }}
                    placeholder={node.aiInput.placeholder}
                    minLength={node.aiInput.minimumChars}
                    maxLength={900}
                    rows={4}
                    disabled={aiLoading}
                  />
                  <div className={styles.freeTextFooter}>
                    <span className={freeText.trim().length >= node.aiInput.minimumChars ? styles.readyCount : ""}>
                      {freeText.trim().length}/{node.aiInput.minimumChars} min.
                    </span>
                    {aiError && <p role="alert">{aiError}</p>}
                    <button type="submit" disabled={aiLoading || freeText.trim().length < node.aiInput.minimumChars}>
                      {aiLoading ? "Læser svaret…" : "Send dit svar"}<ChevronRight size={17} />
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className={styles.choiceList}>
                {availableChoices.map((choice, index) => (
                  <button key={choice.id} onClick={() => choose(choice)}>
                    <kbd>{index + 1}</kbd>
                    <span>{choice.text}</span>
                    <ChevronRight size={18} />
                  </button>
                ))}
                {node.choices.some((choice) => !hasRequirements(choice, flags)) && (
                  <div className={styles.lockedChoice} aria-label="En mulighed er låst af et tidligere valg">
                    <LockKeyhole size={15} /><span>En mulighed kræver et spor fra en tidligere scene.</span>
                  </div>
                )}
              </div>
            )}
          </article>

          <div className={styles.runStatus}>
            <span>{path.length} scener set</span>
            <span>{flags.length} spor aktiveret</span>
            <span>{node.aiInput ? "Frit svar ændrer ruten" : "Taster 1–4 vælger"}</span>
          </div>
        </div>
      </section>
      {mapCharacter && (
        <BranchMap
          character={mapCharacter}
          runs={runs}
          currentNodeIds={path}
          currentChoiceIds={choiceIds}
          currentAiRouteIds={aiRouteIds}
          onClose={() => setMapCharacter(null)}
        />
      )}
    </main>
  );
}
