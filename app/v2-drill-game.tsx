"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleAlert,
  Flame,
  Gauge,
  Layers3,
  RefreshCw,
  Repeat2,
  RotateCcw,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
  Wrench,
  X,
} from "lucide-react";

import {
  V2_DRILLS,
  createV2Queue,
  isV2AnswerCorrect,
  isV2ResponseReady,
  v2FocusLabel,
  v2MechanicLabel,
  v2ProgressAccuracy,
  v2VoiceLabel,
  v2WeakItemIds,
  type V2DrillItem,
  type V2DrillProgress,
  type V2DrillResponse,
  type V2Mechanic,
} from "@/lib/v2Drill";

import styles from "./v2-drill-game.module.css";

type DrillMode = "all" | "mistakes";

interface V2DrillGameProps {
  progress: V2DrillProgress;
  onAttempt: (itemId: string, correct: boolean) => void;
  onRoundComplete: () => void;
}

const itemById = new Map(V2_DRILLS.map((item) => [item.id, item]));

function freshResponse(item: V2DrillItem): V2DrillResponse | null {
  if (item.mechanic === "swap") return { mechanic: "swap", indices: [] };
  if (item.mechanic === "order") return { mechanic: "order", indices: [] };
  return null;
}

function MechanicIcon({ mechanic, size = 20 }: { mechanic: V2Mechanic; size?: number }) {
  if (mechanic === "choice") return <Target size={size} />;
  if (mechanic === "swap") return <Repeat2 size={size} />;
  if (mechanic === "order") return <Layers3 size={size} />;
  if (mechanic === "slot") return <ArrowRight size={size} />;
  if (mechanic === "theory") return <BookOpenCheck size={size} />;
  return <CircleAlert size={size} />;
}

function Formula({ parts }: { parts: string[] }) {
  return <div className={styles.formula} aria-label={`Ordstilling: ${parts.join(", ")}`}>
    {parts.map((part, index) => <span key={`${part}-${index}`}><b>{index + 1}</b>{part}</span>)}
  </div>;
}

function ChoiceTask({ item, response, setResponse, disabled }: {
  item: Extract<V2DrillItem, { mechanic: "choice" }>;
  response: V2DrillResponse | null;
  setResponse: (response: V2DrillResponse) => void;
  disabled: boolean;
}) {
  const selected = response?.mechanic === "choice" ? response.option : "";
  return <div className={styles.choiceList}>
    {item.options.map((option, index) => <button
      className={selected === option ? styles.selected : ""}
      disabled={disabled}
      key={option}
      onClick={() => setResponse({ mechanic: "choice", option })}
    ><span>{index + 1}</span><strong>{option}</strong></button>)}
  </div>;
}

function TheoryTask({ item, response, setResponse, disabled }: {
  item: Extract<V2DrillItem, { mechanic: "theory" }>;
  response: V2DrillResponse | null;
  setResponse: (response: V2DrillResponse) => void;
  disabled: boolean;
}) {
  const selected = response?.mechanic === "theory" ? response.option : "";
  return <div className={styles.choiceList}>
    {item.options.map((option, index) => <button
      className={selected === option ? styles.selected : ""}
      disabled={disabled}
      key={option}
      onClick={() => setResponse({ mechanic: "theory", option })}
    ><span>{index + 1}</span><strong>{option}</strong></button>)}
  </div>;
}

function SwapTask({ item, response, setResponse, disabled }: {
  item: Extract<V2DrillItem, { mechanic: "swap" }>;
  response: V2DrillResponse | null;
  setResponse: (response: V2DrillResponse) => void;
  disabled: boolean;
}) {
  const selected = response?.mechanic === "swap" ? response.indices : [];
  const toggle = (index: number) => {
    const next = selected.includes(index)
      ? selected.filter((value) => value !== index)
      : selected.length < 2 ? [...selected, index] : [selected[1], index];
    setResponse({ mechanic: "swap", indices: next });
  };
  return <div className={styles.tokenTask}>
    <div className={styles.tokenSentence}>
      {item.tokens.map((token, index) => <button
        className={selected.includes(index) ? styles.selectedToken : ""}
        disabled={disabled}
        key={`${token}-${index}`}
        onClick={() => toggle(index)}
      ><small>{index + 1}</small>{token}</button>)}
    </div>
    <p className={styles.microInstruction}><Repeat2 size={15} /> Vælg præcis to ord. De bytter først plads, når du tjekker svaret.</p>
  </div>;
}

function OrderTask({ item, response, setResponse, disabled }: {
  item: Extract<V2DrillItem, { mechanic: "order" }>;
  response: V2DrillResponse | null;
  setResponse: (response: V2DrillResponse) => void;
  disabled: boolean;
}) {
  const ordered = response?.mechanic === "order" ? response.indices : [];
  const add = (index: number) => {
    if (!ordered.includes(index)) setResponse({ mechanic: "order", indices: [...ordered, index] });
  };
  const remove = (position: number) => setResponse({ mechanic: "order", indices: ordered.filter((_, index) => index !== position) });
  return <div className={styles.orderTask}>
    <div className={`${styles.answerRail} ${ordered.length ? styles.hasAnswer : ""}`}>
      {ordered.length === 0 && <span>Klik på ordene i den rigtige rækkefølge …</span>}
      {ordered.map((sourceIndex, position) => <button disabled={disabled} key={`${sourceIndex}-${position}`} onClick={() => remove(position)}>{item.tokens[sourceIndex]}</button>)}
    </div>
    <div className={styles.tokenBank}>
      {item.tokens.map((token, index) => <button disabled={disabled || ordered.includes(index)} key={`${token}-${index}`} onClick={() => add(index)}><small>{index + 1}</small>{token}</button>)}
    </div>
  </div>;
}

function SlotTask({ item, response, setResponse, disabled }: {
  item: Extract<V2DrillItem, { mechanic: "slot" }>;
  response: V2DrillResponse | null;
  setResponse: (response: V2DrillResponse) => void;
  disabled: boolean;
}) {
  const selected = response?.mechanic === "slot" ? response.slot : -1;
  return <div className={styles.slotTask}>
    <div className={styles.floatingToken}>{item.token}</div>
    <div className={styles.slotSentence}>
      {item.segments.map((segment, index) => <span key={`${segment}-${index}`}>
        <button className={selected === index ? styles.selectedSlot : ""} disabled={disabled} onClick={() => setResponse({ mechanic: "slot", slot: index })} aria-label={`Placering ${index + 1}`}><i>{index + 1}</i></button>
        <b>{segment}</b>
      </span>)}
      <button className={selected === item.segments.length ? styles.selectedSlot : ""} disabled={disabled} onClick={() => setResponse({ mechanic: "slot", slot: item.segments.length })} aria-label={`Placering ${item.segments.length + 1}`}><i>{item.segments.length + 1}</i></button>
    </div>
    <p className={styles.microInstruction}>Vælg den åbning, hvor det lilla ord skal sættes ind.</p>
  </div>;
}

function SpotTask({ item, response, setResponse, disabled }: {
  item: Extract<V2DrillItem, { mechanic: "spot" }>;
  response: V2DrillResponse | null;
  setResponse: (response: V2DrillResponse) => void;
  disabled: boolean;
}) {
  const selected = response?.mechanic === "spot" ? response.index : -1;
  return <div className={styles.spotTask}>
    <div className={styles.spotSentence}>
      {item.tokens.map((token, index) => <button className={selected === index ? styles.selectedSpot : ""} disabled={disabled} key={`${token}-${index}`} onClick={() => setResponse({ mechanic: "spot", index })}><small>{index + 1}</small>{token}</button>)}
    </div>
    <p className={styles.microInstruction}><CircleAlert size={15} /> Klik på det første ord, der afslører den forkerte rækkefølge.</p>
  </div>;
}

function DrillTask({ item, response, setResponse, disabled }: {
  item: V2DrillItem;
  response: V2DrillResponse | null;
  setResponse: (response: V2DrillResponse) => void;
  disabled: boolean;
}) {
  if (item.mechanic === "choice") return <ChoiceTask item={item} response={response} setResponse={setResponse} disabled={disabled} />;
  if (item.mechanic === "swap") return <SwapTask item={item} response={response} setResponse={setResponse} disabled={disabled} />;
  if (item.mechanic === "order") return <OrderTask item={item} response={response} setResponse={setResponse} disabled={disabled} />;
  if (item.mechanic === "slot") return <SlotTask item={item} response={response} setResponse={setResponse} disabled={disabled} />;
  if (item.mechanic === "theory") return <TheoryTask item={item} response={response} setResponse={setResponse} disabled={disabled} />;
  return <SpotTask item={item} response={response} setResponse={setResponse} disabled={disabled} />;
}

export default function V2DrillGame({ progress, onAttempt, onRoundComplete }: V2DrillGameProps) {
  const [mode, setMode] = useState<DrillMode | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [position, setPosition] = useState(0);
  const [round, setRound] = useState(1);
  const [response, setResponse] = useState<V2DrillResponse | null>(null);
  const [checked, setChecked] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [notice, setNotice] = useState("");

  const weakIds = useMemo(() => v2WeakItemIds(progress), [progress]);
  const current = mode && queue[position] ? itemById.get(queue[position]) ?? null : null;
  const ready = current ? isV2ResponseReady(current, response) : false;
  const currentItemProgress = current ? progress.items[current.id] : null;

  const startMode = useCallback((nextMode: DrillMode) => {
    const ids = nextMode === "all" ? V2_DRILLS.map((item) => item.id) : weakIds;
    if (!ids.length) {
      setNotice("Fejlstrømmen er tom. Lav en blandet runde først — nye fejl lander her automatisk.");
      return;
    }
    const nextQueue = createV2Queue(ids, Date.now());
    const first = itemById.get(nextQueue[0]);
    setMode(nextMode);
    setQueue(nextQueue);
    setPosition(0);
    setRound(1);
    setResponse(first ? freshResponse(first) : null);
    setChecked(false);
    setWasCorrect(false);
    setNotice("");
  }, [weakIds]);

  const chooseByNumber = useCallback((number: number) => {
    if (!current || checked || number < 0) return;
    if (current.mechanic === "choice" && current.options[number]) setResponse({ mechanic: "choice", option: current.options[number] });
    if (current.mechanic === "theory" && current.options[number]) setResponse({ mechanic: "theory", option: current.options[number] });
    if (current.mechanic === "swap" && current.tokens[number]) {
      const selected = response?.mechanic === "swap" ? response.indices : [];
      const next = selected.includes(number) ? selected.filter((value) => value !== number) : selected.length < 2 ? [...selected, number] : [selected[1], number];
      setResponse({ mechanic: "swap", indices: next });
    }
    if (current.mechanic === "order" && current.tokens[number]) {
      const selected = response?.mechanic === "order" ? response.indices : [];
      if (!selected.includes(number)) setResponse({ mechanic: "order", indices: [...selected, number] });
    }
    if (current.mechanic === "slot" && number <= current.segments.length) setResponse({ mechanic: "slot", slot: number });
    if (current.mechanic === "spot" && current.tokens[number]) setResponse({ mechanic: "spot", index: number });
  }, [checked, current, response]);

  const check = useCallback(() => {
    if (!current || !response || checked || !isV2ResponseReady(current, response)) return;
    const correct = isV2AnswerCorrect(current, response);
    setWasCorrect(correct);
    setChecked(true);
    onAttempt(current.id, correct);
  }, [checked, current, onAttempt, response]);

  const next = useCallback(() => {
    if (!current || !mode) return;
    if (position < queue.length - 1) {
      const nextItem = itemById.get(queue[position + 1]);
      setPosition((value) => value + 1);
      setResponse(nextItem ? freshResponse(nextItem) : null);
      setChecked(false);
      setWasCorrect(false);
      return;
    }

    onRoundComplete();
    const sourceIds = mode === "all" ? V2_DRILLS.map((item) => item.id) : v2WeakItemIds(progress);
    if (!sourceIds.length) {
      setMode(null);
      setQueue([]);
      setNotice("Fejlstrømmen er ryddet. To korrekte svar i træk har repareret hvert svagt mønster.");
      return;
    }
    const nextQueue = createV2Queue(sourceIds, Date.now() + round, current.id);
    const first = itemById.get(nextQueue[0]);
    setQueue(nextQueue);
    setPosition(0);
    setRound((value) => value + 1);
    setResponse(first ? freshResponse(first) : null);
    setChecked(false);
    setWasCorrect(false);
  }, [current, mode, onRoundComplete, position, progress, queue, round]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!mode || !current || event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^[1-9]$/u.test(event.key)) {
        event.preventDefault();
        chooseByNumber(Number(event.key) - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (checked) next(); else check();
      } else if (event.key === "Backspace" && current.mechanic === "order" && response?.mechanic === "order" && !checked) {
        event.preventDefault();
        setResponse({ mechanic: "order", indices: response.indices.slice(0, -1) });
      } else if (event.key === "Escape") {
        setMode(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [check, checked, chooseByNumber, current, mode, next, response]);

  if (!mode || !current) {
    const mechanicCounts = V2_DRILLS.reduce<Record<V2Mechanic, number>>((counts, item) => ({ ...counts, [item.mechanic]: counts[item.mechanic] + 1 }), { choice: 0, swap: 0, order: 0, slot: 0, spot: 0, theory: 0 });
    return <div className={`view ${styles.view}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className="eyebrow">ORDHAVN · ORDSTILLINGSVÆRFTET</p>
          <h1>V2 skal ned i hænderne.</h1>
          <p>Ingen AI og ingen lange lektioner. Kun korte, blandede reaktioner på dansk ordstilling — indtil verbet lander rigtigt uden tænkepause.</p>
          <button className={styles.heroButton} onClick={() => startMode("all")}><Shuffle size={18} /> Start blandet strøm <ArrowRight size={17} /></button>
        </div>
        <div className={styles.heroVisual} aria-label="V2-formel">
          <div className={styles.v2Badge}>V2</div>
          <div className={styles.fieldRow}><span>1</span><b>I dag</b></div>
          <div className={`${styles.fieldRow} ${styles.verbField}`}><span>2</span><b>arbejder</b></div>
          <div className={styles.fieldRow}><span>3</span><b>jeg</b></div>
          <div className={styles.fieldTail}>ikke hjemme</div>
        </div>
      </section>

      <section className={styles.statStrip}>
        <div><Target size={19} /><span><strong>{progress.totalAttempts}</strong> svar</span></div>
        <div><Gauge size={19} /><span><strong>{v2ProgressAccuracy(progress)}%</strong> præcision</span></div>
        <div><Flame size={19} /><span><strong>{progress.bestStreak}</strong> bedste strøm</span></div>
        <div><Wrench size={19} /><span><strong>{weakIds.length}</strong> mønstre i fejlstrømmen</span></div>
      </section>

      {notice && <div className={styles.notice}><Sparkles size={18} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Luk besked"><X size={16} /></button></div>}

      <div className={styles.modeGrid}>
        <button className={`${styles.modeCard} ${styles.mixed}`} onClick={() => startMode("all")}>
          <span className={styles.modeIcon}><Shuffle size={25} /></span>
          <p className="eyebrow">UENDELIG · ALLE NIVEAUER</p>
          <h2>Blandet strøm</h2>
          <p>{V2_DRILLS.length} opgaver: praktiske V2-reaktioner plus en lille teoribank til at forstå hvorfor rækkefølgen virker. Hver opgave vises én gang pr. runde.</p>
          <strong>Start en ny runde <ChevronRight size={17} /></strong>
        </button>
        <button className={`${styles.modeCard} ${styles.mistakes}`} onClick={() => startMode("mistakes")} disabled={!weakIds.length}>
          <span className={styles.modeIcon}><Wrench size={25} /></span>
          <p className="eyebrow">PERSONLIG REPARATION</p>
          <h2>Mine fejl</h2>
          <p>{weakIds.length ? `${weakIds.length} svage mønstre venter. Et mønster forlader strømmen efter to korrekte svar i træk.` : "Ingen fejl gemt endnu. De dukker automatisk op her efter en blandet runde."}</p>
          <strong>{weakIds.length ? "Reparér mine mønstre" : "Fejlstrømmen er tom"} <ChevronRight size={17} /></strong>
        </button>
      </div>

      <section className={styles.mechanicSection}>
        <div className={styles.sectionHeading}><div><p className="eyebrow">SEKS REAKTIONER · SYV STEMMER</p><h2>Brug reglen — og forstå den.</h2></div><span>Praksis + teori fra A2+ → B2</span></div>
        <div className={styles.mechanicGrid}>
          {(Object.entries(mechanicCounts) as Array<[V2Mechanic, number]>).map(([mechanic, count]) => {
            return <article key={mechanic}><span><MechanicIcon mechanic={mechanic} /></span><div><strong>{v2MechanicLabel(mechanic)}</strong><p>{count} variationer</p></div></article>;
          })}
        </div>
      </section>

      <section className={styles.ruleMap}>
        <div><small>HEL­SÆTNING</small><Formula parts={["forfelt", "verbum", "subjekt", "ikke"]} /></div>
        <div><small>LED­SÆTNING</small><Formula parts={["at/fordi", "subjekt", "ikke", "verbum"]} /></div>
      </section>
    </div>;
  }

  const accuracy = progress.totalAttempts ? v2ProgressAccuracy(progress) : 0;
  const repairStreak = currentItemProgress?.currentCorrectStreak ?? 0;
  return <div className={`view ${styles.view} ${styles.activeView}`}>
    <header className={styles.drillHeader}>
      <button className={styles.backButton} onClick={() => setMode(null)}><ArrowLeft size={18} /> Oversigt</button>
      <div className={styles.roundTrack}>
        <div><span style={{ width: `${((position + (checked ? 1 : 0)) / queue.length) * 100}%` }} /></div>
        <small>Runde {round} · {position + 1}/{queue.length}</small>
      </div>
      <span className={styles.modePill}>{mode === "mistakes" ? <Wrench size={15} /> : <Shuffle size={15} />}{mode === "mistakes" ? "Mine fejl" : "Blandet"}</span>
    </header>

    <div className={styles.drillLayout}>
      <main className={styles.taskCard}>
        <div className={styles.taskMeta}>
          <span><MechanicIcon mechanic={current.mechanic} size={16} /> {v2MechanicLabel(current.mechanic)}</span>
          <span>{current.level}</span>
          <span>{v2FocusLabel(current.focus)}</span>
          <span>{v2VoiceLabel(current.voice)}</span>
        </div>
        <h1>{current.prompt}</h1>
        <p className={styles.translation}>{current.translation}</p>
        <DrillTask item={current} response={response} setResponse={setResponse} disabled={checked} />

        {checked && <section className={`${styles.feedback} ${wasCorrect ? styles.correct : styles.wrong}`} aria-live="polite">
          <span className={styles.feedbackIcon}>{wasCorrect ? <Check size={21} /> : <RefreshCw size={21} />}</span>
          <div>
            <small>{current.mechanic === "theory" ? wasCorrect ? "REGEL FORSTÅET" : "DEN KORREKTE REGEL" : wasCorrect ? "RIGTIG RÆKKEFØLGE" : "SE HVOR VERBET LANDER"}</small>
            <h2>{current.correctSentence}</h2>
            <p>{current.explanation}</p>
            <Formula parts={current.formula} />
          </div>
        </section>}
      </main>

      <aside className={styles.sidePanel}>
        <div className={styles.liveScore}>
          <span><Flame size={20} /></span>
          <div><small>NUVÆRENDE STRØM</small><strong>{progress.currentStreak}</strong></div>
        </div>
        <div className={styles.sideStats}><div><span>Præcision</span><strong>{accuracy}%</strong></div><div><span>Bedste</span><strong>{progress.bestStreak}</strong></div></div>
        {mode === "mistakes" && <div className={styles.repairMeter}>
          <div><span>Reparation</span><strong>{Math.min(2, repairStreak)}/2</strong></div>
          <div><i className={repairStreak >= 1 ? styles.filled : ""} /><i className={repairStreak >= 2 ? styles.filled : ""} /></div>
          <p>To korrekte svar i træk fjerner mønsteret fra fejlstrømmen.</p>
        </div>}
        <div className={styles.keyboardGuide}><small>TASTATUR</small><p><kbd>1–9</kbd> vælg · <kbd>Enter</kbd> tjek/næste</p>{current.mechanic === "order" && <p><kbd>⌫</kbd> fjern sidste led</p>}</div>
        <div className={styles.roundNote}><RotateCcw size={17} /><p><strong>Ingen slutskærm.</strong><br />Efter sidste kort blandes strømmen automatisk igen.</p></div>
      </aside>
    </div>

    <footer className={styles.actionBar}>
      <span>{checked ? wasCorrect ? <><Trophy size={17} /> Godt. Gem rækkefølgen.</> : <><CircleAlert size={17} /> Fejlen er gemt til reparation.</> : "Svar med musen eller taltasterne."}</span>
      <button disabled={!checked && !ready} onClick={checked ? next : check}>{checked ? <>Næste drill <ArrowRight size={18} /></> : <>{current.mechanic === "theory" ? "Tjek reglen" : "Tjek rækkefølgen"} <Check size={18} /></>}</button>
    </footer>
  </div>;
}
