"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Crown,
  Flame,
  GraduationCap,
  ListChecks,
  Lock,
  LockOpen,
  MousePointerClick,
  PenLine,
  Puzzle,
  RefreshCw,
  Rows3,
  Scale,
  Search,
  Sparkles,
  Star,
  Swords,
  Target,
  TextCursorInput,
  Trophy,
  Wrench,
  X,
} from "lucide-react";

import {
  CHECKPOINT_PASS_SCORE,
  EXAM_ERRORS,
  GRAMMAR_CATALOG,
  GRAMMAR_LESSON_BY_ID,
  GRAMMAR_LESSONS,
  GRAMMAR_MODULES,
  GRAMMAR_RULE_BY_ID,
  buildCheckpointSession,
  buildLessonSession,
  buildMistakeSession,
  buildReviewSession,
  checkResponse,
  completeGrammarCheckpoint,
  completeGrammarLesson,
  countWeakItems,
  dueRuleIds,
  emptyResponse,
  grammarAccuracy,
  isCheckpointUnlocked,
  isLessonCompleted,
  isLessonUnlocked,
  isResponseReady,
  learnedRuleIds,
  markTheorySeen,
  modelAnswer,
  nextLessonId,
  parseInline,
  recordGrammarAttempt,
  rememberedRuleIds,
  setGrammarUnlockAll,
  starsForAccuracy,
  type CompiledItem,
  type GrammarCheck,
  type GrammarCourseProgress,
  type GrammarField,
  type GrammarResponse,
  type ItemKind,
  type SessionEntry,
  type TheoryCard,
} from "@/lib/grammarCourse";

import styles from "./grammar-course-game.module.css";

type SessionMode = "lesson" | "review" | "mistakes" | "boss";

interface Outcome {
  uid: string;
  correct: boolean;
  score: number;
}

interface ActiveSession {
  mode: SessionMode;
  lessonId?: string;
  moduleId?: string;
  entries: SessionEntry[];
  position: number;
  outcomes: Outcome[];
}

interface SessionSummary {
  mode: SessionMode;
  lessonId?: string;
  moduleId?: string;
  total: number;
  correct: number;
  score: number;
  mistakes: CompiledItem[];
  rules: string[];
}

type Screen =
  | { kind: "hub" }
  | { kind: "theory"; lessonId: string; card: number }
  | { kind: "session"; session: ActiveSession }
  | { kind: "results"; summary: SessionSummary };

interface GrammarCourseGameProps {
  progress: GrammarCourseProgress;
  onUpdate: (updater: (progress: GrammarCourseProgress) => GrammarCourseProgress) => void;
}

const FIELD_META: Record<GrammarField, { label: string; hint: string }> = {
  C: { label: "og/men", hint: "Forbinder: og, men, for, eller, så" },
  k: { label: "bindeord", hint: "at, fordi, hvis, om, som …" },
  F: { label: "forfelt", hint: "Ét led før verbet" },
  v: { label: "verbum", hint: "Det finitte verbum" },
  n: { label: "subjekt", hint: "Subjektet, når det ikke står i F" },
  a: { label: "ikke & co.", hint: "Sætningsadverbialer" },
  V: { label: "flere verber", hint: "Infinitiv og participium" },
  N: { label: "objekt", hint: "Objekt eller prædikat" },
  A: { label: "sted/tid/måde", hint: "Øvrige adverbialer" },
};

const KIND_LABEL: Record<ItemKind, string> = {
  choice: "Vælg",
  multi: "Vælg alle",
  tap: "Find",
  build: "Byg",
  slot: "Placér",
  type: "Skriv",
  sort: "Skemaet",
  judge: "Dommer",
  proof: "Korrektur",
};

const MODE_LABEL: Record<SessionMode, string> = {
  lesson: "Lektion",
  review: "Dagens repetition",
  mistakes: "Mine fejl",
  boss: "Bosskamp",
};

const lessonNumber = new Map(GRAMMAR_LESSONS.map((lesson, index) => [lesson.id, index + 1]));

function KindIcon({ kind, size = 16 }: { kind: ItemKind; size?: number }) {
  if (kind === "choice") return <Target size={size} />;
  if (kind === "multi") return <ListChecks size={size} />;
  if (kind === "tap") return <MousePointerClick size={size} />;
  if (kind === "build") return <Puzzle size={size} />;
  if (kind === "slot") return <ArrowRight size={size} />;
  if (kind === "type") return <TextCursorInput size={size} />;
  if (kind === "sort") return <Rows3 size={size} />;
  if (kind === "judge") return <Scale size={size} />;
  return <PenLine size={size} />;
}

function Inline({ text }: { text: string }) {
  return <>
    {parseInline(text).map((segment, index) => {
      if (segment.kind === "bold") return <strong key={index}>{segment.text}</strong>;
      if (segment.kind === "italic") return <em key={index}>{segment.text}</em>;
      if (segment.kind === "field") {
        return <span key={index} className={styles.fieldMark} data-field={segment.field} title={FIELD_META[segment.field].hint}>
          {segment.text}<sup>{segment.field}</sup>
        </span>;
      }
      return <span key={index}>{segment.text}</span>;
    })}
  </>;
}

function capitalize(text: string) {
  const index = text.search(/\p{L}/u);
  return index < 0 ? text : text.slice(0, index) + text.charAt(index).toLocaleUpperCase("da-DK") + text.slice(index + 1);
}

function Stars({ count, size = 15 }: { count: number; size?: number }) {
  return <span className={styles.stars} aria-label={`${count} af 3 stjerner`}>
    {[1, 2, 3].map((value) => <Star key={value} size={size} className={value <= count ? styles.starOn : styles.starOff} />)}
  </span>;
}

function fieldsInCard(card: TheoryCard) {
  const found = new Set<GrammarField>();
  for (const example of card.examples ?? []) {
    for (const segment of parseInline(example.da)) if (segment.kind === "field") found.add(segment.field);
  }
  return (["C", "k", "F", "v", "n", "a", "V", "N", "A"] as GrammarField[]).filter((field) => found.has(field));
}

// ---------------------------------------------------------------------------
// Task renderers. Each receives the compiled item, the current response and
// (after checking) the verdict, and renders its own review state.

interface TaskProps<T extends CompiledItem> {
  item: T;
  response: GrammarResponse;
  setResponse: (response: GrammarResponse) => void;
  check: GrammarCheck | null;
}

type ItemOf<K extends ItemKind> = Extract<CompiledItem, { kind: K }>;

function ChoiceTask({ item, response, setResponse, check }: TaskProps<ItemOf<"choice">>) {
  const selected = response.kind === "choice" ? response.option : null;
  return <div className={styles.taskStack}>
    {item.sentence && <p className={styles.clozeSentence}>
      {item.sentence.split(/_{3,}/u).map((part, index, parts) => <span key={index}>{part}{index < parts.length - 1 && <b className={styles.blank}>{check ? item.correct : selected ?? "…"}</b>}</span>)}
    </p>}
    <div className={styles.optionList}>
      {item.options.map((option, index) => {
        const state = check ? option === item.correct ? styles.optionRight : option === selected ? styles.optionWrong : "" : option === selected ? styles.optionSelected : "";
        return <button className={state} disabled={Boolean(check)} key={option} onClick={() => setResponse({ kind: "choice", option })}>
          <span>{index + 1}</span><strong>{option}</strong>
        </button>;
      })}
    </div>
  </div>;
}

function MultiTask({ item, response, setResponse, check }: TaskProps<ItemOf<"multi">>) {
  const chosen = response.kind === "multi" ? response.options : [];
  const toggle = (option: string) => setResponse({ kind: "multi", options: chosen.includes(option) ? chosen.filter((value) => value !== option) : [...chosen, option] });
  return <div className={styles.taskStack}>
    <p className={styles.microInstruction}><ListChecks size={15} /> Der kan være én, to eller flere rigtige.</p>
    <div className={styles.optionList}>
      {item.options.map((option, index) => {
        const isCorrect = item.correct.includes(option);
        const isChosen = chosen.includes(option);
        const state = check ? isCorrect ? isChosen ? styles.optionRight : styles.optionMissed : isChosen ? styles.optionWrong : "" : isChosen ? styles.optionSelected : "";
        return <button className={`${styles.multiOption} ${state}`} disabled={Boolean(check)} key={option} onClick={() => toggle(option)} aria-pressed={isChosen}>
          <span>{isChosen ? <Check size={15} /> : index + 1}</span><strong>{option}</strong>
          {check && isCorrect && !isChosen && <em>mangler</em>}
        </button>;
      })}
    </div>
  </div>;
}

function TokenButton({ token, state, onClick, disabled, index }: { token: string; state: string; onClick: () => void; disabled: boolean; index: number }) {
  return <button className={`${styles.token} ${state}`} disabled={disabled} onClick={onClick} data-index={index}>{token}</button>;
}

function TapTask({ item, response, setResponse, check }: TaskProps<ItemOf<"tap">>) {
  const selected = response.kind === "tap" ? response.indices : [];
  const targets = new Set(item.groups.flat());
  const toggle = (index: number) => setResponse({ kind: "tap", indices: selected.includes(index) ? selected.filter((value) => value !== index) : [...selected, index] });
  return <div className={styles.taskStack}>
    <div className={`${styles.tokenLine} ${item.chunked ? styles.chunkLine : ""}`}>
      {item.tokens.map((token, index) => {
        const isSelected = selected.includes(index);
        const state = check ? targets.has(index) ? styles.tokenRight : isSelected ? styles.tokenWrong : styles.tokenDim : isSelected ? styles.tokenSelected : "";
        return <TokenButton key={`${token}-${index}`} index={index} token={token} state={state} disabled={Boolean(check)} onClick={() => toggle(index)} />;
      })}
    </div>
    <p className={styles.microInstruction}><MousePointerClick size={15} /> {item.groups.length === 1 ? "Der er ét svar." : `Der er ${item.groups.length} svar.`} Tryk igen for at fjerne et valg.</p>
  </div>;
}

function BuildTask({ item, response, setResponse, check }: TaskProps<ItemOf<"build">>) {
  const order = response.kind === "build" ? response.order : [];
  const add = (index: number) => {
    if (!order.includes(index) && order.length < item.size) setResponse({ kind: "build", order: [...order, index] });
  };
  const remove = (position: number) => {
    if (item.lockedIndex !== null && position === 0) return;
    setResponse({ kind: "build", order: order.filter((_, index) => index !== position) });
  };
  const complete = order.length === item.size;
  return <div className={styles.taskStack}>
    <div className={`${styles.answerRail} ${check ? check.correct ? styles.railRight : styles.railWrong : ""}`}>
      {order.length === 0 && <span className={styles.railHint}>Tryk på brikkerne i den rigtige rækkefølge …</span>}
      {order.map((chunkIndex, position) => {
        const text = position === 0 ? capitalize(item.chunks[chunkIndex]) : item.chunks[chunkIndex];
        const locked = item.lockedIndex !== null && position === 0;
        return <button className={locked ? styles.lockedChunk : ""} disabled={Boolean(check) || locked} key={`${chunkIndex}-${position}`} onClick={() => remove(position)}>
          {locked && <Lock size={12} />}{text}{complete && position === order.length - 1 ? item.finalPunct : ""}
        </button>;
      })}
    </div>
    <div className={styles.chunkBank}>
      {item.chunks.map((chunk, index) => (item.lockedIndex === index ? null : <button disabled={Boolean(check) || order.includes(index)} key={`${chunk}-${index}`} onClick={() => add(index)}>{chunk}</button>))}
    </div>
    <p className={styles.microInstruction}><Puzzle size={15} /> {item.extras ? item.extras === 1 ? "Én brik passer ikke ind." : `${item.extras} brikker passer ikke ind.` : "Alle brikker skal bruges."} Tryk på en brik i linjen for at tage den tilbage.</p>
  </div>;
}

function SlotTask({ item, response, setResponse, check }: TaskProps<ItemOf<"slot">>) {
  const gap = response.kind === "slot" ? response.gap : null;
  const gapButton = (index: number) => {
    const state = check ? item.accepted.includes(index) ? styles.gapRight : gap === index ? styles.gapWrong : "" : gap === index ? styles.gapSelected : "";
    return <button className={`${styles.gap} ${state}`} disabled={Boolean(check)} key={`gap-${index}`} onClick={() => setResponse({ kind: "slot", gap: index })} aria-label={`Placering ${index + 1}`}>
      {(check ? item.accepted.includes(index) : gap === index) ? item.word : <i>+</i>}
    </button>;
  };
  return <div className={styles.taskStack}>
    <div className={styles.floatingWord}>{item.word}</div>
    <div className={styles.slotLine}>
      {item.tokens.map((token, index) => <span key={`${token}-${index}`}>{gapButton(index)}<b>{token}</b></span>)}
      {gapButton(item.tokens.length)}
    </div>
    <p className={styles.microInstruction}><ArrowRight size={15} /> Vælg det mellemrum, hvor ordet skal stå.</p>
  </div>;
}

function TypeTask({ item, response, setResponse, check, onEnter }: TaskProps<ItemOf<"type">> & { onEnter: () => void }) {
  const text = response.kind === "type" ? response.text : "";
  return <div className={styles.taskStack}>
    <p className={styles.typeLine}>
      <span>{item.before}</span>
      <input
        aria-label="Dit svar"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        autoFocus
        className={check ? check.correct ? styles.inputRight : styles.inputWrong : ""}
        disabled={Boolean(check)}
        onChange={(event) => setResponse({ kind: "type", text: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter();
          }
        }}
        size={Math.max(6, (item.accept[0]?.length ?? 4) + 2)}
        spellCheck={false}
        value={text}
      />
      <span>{item.after}</span>
    </p>
    {check && !check.correct && <p className={styles.typeAnswer}>Svar: <strong>{item.accept.join(" / ")}</strong></p>}
  </div>;
}

function SortTask({ item, response, setResponse, check }: TaskProps<ItemOf<"sort">>) {
  const fields = response.kind === "sort" ? response.fields : [];
  const [active, setActive] = useState(0);
  const assign = (field: GrammarField) => {
    const next = [...fields];
    next[active] = field;
    setResponse({ kind: "sort", fields: next });
    const following = next.findIndex((value, index) => value === null && index > active);
    const first = next.findIndex((value) => value === null);
    if (following >= 0) setActive(following);
    else if (first >= 0) setActive(first);
  };
  const shown = check ? item.fields : fields;
  return <div className={styles.taskStack}>
    <div className={styles.sortChunks}>
      {item.chunks.map((chunk, index) => {
        const field = fields[index];
        const verdict = check?.fieldResults?.[index];
        const state = check ? verdict ? styles.tokenRight : styles.tokenWrong : index === active ? styles.tokenSelected : "";
        return <button className={`${styles.sortChunk} ${state}`} data-field={field ?? undefined} disabled={Boolean(check)} key={`${chunk}-${index}`} onClick={() => setActive(index)}>
          {chunk}
          <sup>{check && !verdict ? `${field ?? "?"}→${item.fields[index]}` : field ?? "?"}</sup>
        </button>;
      })}
    </div>
    {!check && <div className={styles.fieldPalette}>
      {item.options.map((field) => <button data-field={field} key={field} onClick={() => assign(field)} title={FIELD_META[field].hint}><b>{field}</b><span>{FIELD_META[field].label}</span></button>)}
    </div>}
    <div className={styles.schemaBoard} aria-label="Sætningsskema">
      {item.options.map((field) => <div data-field={field} key={field}>
        <small><b>{field}</b> {FIELD_META[field].label}</small>
        {item.chunks.map((chunk, index) => (shown[index] === field ? <span key={`${chunk}-${index}`}>{chunk}</span> : null))}
      </div>)}
    </div>
    {!check && <p className={styles.microInstruction}><Rows3 size={15} /> Vælg et led, og tryk derefter på det felt, det hører til.</p>}
  </div>;
}

function JudgeTask({ item, response, setResponse, check }: TaskProps<ItemOf<"judge">>) {
  const verdict = response.kind === "judge" ? response.verdict : null;
  const selected = response.kind === "judge" ? response.indices : [];
  const errorTokens = new Set(item.errorTokens);
  const toggle = (index: number) => {
    if (verdict !== "error") return;
    setResponse({ kind: "judge", verdict, indices: selected.includes(index) ? selected.filter((value) => value !== index) : [...selected, index] });
  };
  return <div className={styles.taskStack}>
    <div className={styles.verdictRow}>
      <button className={verdict === "ok" ? styles.verdictOk : ""} disabled={Boolean(check)} onClick={() => setResponse({ kind: "judge", verdict: "ok", indices: [] })}><span>1</span><CheckCheck size={18} /> Korrekt</button>
      <button className={verdict === "error" ? styles.verdictError : ""} disabled={Boolean(check)} onClick={() => setResponse({ kind: "judge", verdict: "error", indices: selected })}><span>2</span><CircleAlert size={18} /> Der er en fejl</button>
    </div>
    <div className={`${styles.tokenLine} ${verdict === "error" && !check ? styles.tokenLineActive : ""}`}>
      {item.tokens.map((token, index) => {
        const isSelected = selected.includes(index);
        const state = check ? errorTokens.has(index) ? styles.tokenWrong : isSelected ? styles.tokenFalse : "" : isSelected ? styles.tokenSelected : "";
        return <TokenButton key={`${token}-${index}`} index={index} token={token} state={state} disabled={Boolean(check) || verdict !== "error"} onClick={() => toggle(index)} />;
      })}
    </div>
    {!check && <p className={styles.microInstruction}><Scale size={15} /> {verdict === "error" ? "Tryk på det ord (eller de ord), der er forkert." : "Halvdelen af sætningerne er faktisk korrekte. Tjek før du dømmer."}</p>}
  </div>;
}

function ProofTask({ item, response, setResponse, check }: TaskProps<ItemOf<"proof">>) {
  const selected = response.kind === "proof" ? response.indices : [];
  const spanOf = new Map(item.spans.flatMap((span, spanIndex) => span.tokens.map((token) => [token, spanIndex] as const)));
  const hits = new Set(check?.hits ?? []);
  const toggle = (index: number) => setResponse({ kind: "proof", indices: selected.includes(index) ? selected.filter((value) => value !== index) : [...selected, index] });
  return <div className={styles.taskStack}>
    <div className={styles.proofCounter}><Search size={15} /> Markeret: <strong>{selected.length}</strong> · Fejl i teksten: <strong>{item.spans.length}</strong></div>
    <div className={styles.proofText}>
      {item.tokens.map((token, index) => {
        const spanIndex = spanOf.get(index);
        const isSelected = selected.includes(index);
        const state = check
          ? spanIndex !== undefined ? hits.has(spanIndex) ? styles.tokenRight : styles.tokenWrong : isSelected ? styles.tokenFalse : ""
          : isSelected ? styles.tokenSelected : "";
        return <TokenButton key={`${token}-${index}`} index={index} token={token} state={state} disabled={Boolean(check)} onClick={() => toggle(index)} />;
      })}
    </div>
    {check && <ol className={styles.correctionList}>
      {item.spans.map((span, index) => <li className={hits.has(index) ? styles.found : styles.missed} key={`${span.wrong}-${index}`}>
        <span><s>{span.wrong}</s> → <strong>{span.right || "(slet)"}</strong></span>
        <p>{span.note}</p>
      </li>)}
    </ol>}
  </div>;
}

export function TaskBody({ item, response, setResponse, check, onEnter }: TaskProps<CompiledItem> & { onEnter: () => void }) {
  switch (item.kind) {
    case "choice": return <ChoiceTask item={item} response={response} setResponse={setResponse} check={check} />;
    case "multi": return <MultiTask item={item} response={response} setResponse={setResponse} check={check} />;
    case "tap": return <TapTask item={item} response={response} setResponse={setResponse} check={check} />;
    case "build": return <BuildTask item={item} response={response} setResponse={setResponse} check={check} />;
    case "slot": return <SlotTask item={item} response={response} setResponse={setResponse} check={check} />;
    case "type": return <TypeTask item={item} response={response} setResponse={setResponse} check={check} onEnter={onEnter} />;
    case "sort": return <SortTask item={item} response={response} setResponse={setResponse} check={check} />;
    case "judge": return <JudgeTask item={item} response={response} setResponse={setResponse} check={check} />;
    case "proof": return <ProofTask item={item} response={response} setResponse={setResponse} check={check} />;
  }
}

function RuleChips({ item }: { item: CompiledItem }) {
  return <div className={styles.ruleChips}>
    {item.rules.map((ruleId, index) => {
      const rule = GRAMMAR_RULE_BY_ID.get(ruleId);
      return rule ? <span className={index === 0 ? styles.primaryRule : ""} key={ruleId} title={rule.summary}>{index === 0 ? <Target size={12} /> : <RefreshCw size={12} />}{rule.title}</span> : null;
    })}
  </div>;
}

export function Feedback({ item, check }: { item: CompiledItem; check: GrammarCheck }) {
  const partial = !check.correct && check.score >= 0.5;
  const answer = item.kind === "judge" && item.isCorrect ? "Sætningen var korrekt — ingen fejl." : modelAnswer(item);
  const clozeChoice = item.kind === "choice" && Boolean(item.sentence && /_{3,}/u.test(item.sentence));
  const showAnswer = item.kind === "choice" ? clozeChoice : !(item.kind === "multi" || item.kind === "sort" || item.kind === "proof" || item.kind === "tap");
  const primary = GRAMMAR_RULE_BY_ID.get(item.rules[0]);
  return <section className={`${styles.feedback} ${check.correct ? styles.feedbackRight : partial ? styles.feedbackPartial : styles.feedbackWrong}`} aria-live="polite">
    <span className={styles.feedbackIcon}>{check.correct ? <Check size={21} /> : partial ? <Sparkles size={21} /> : <RefreshCw size={21} />}</span>
    <div>
      <small>{check.correct ? "RIGTIGT" : partial ? `NÆSTEN · ${Math.round(check.score * 100)}%` : "IKKE HELT"}</small>
      {showAnswer && <h2>{answer}</h2>}
      {item.kind === "judge" && !item.isCorrect && <p className={styles.judgeFix}><s>{item.wrong}</s> → <strong>{item.right || "(slet)"}</strong></p>}
      <p>{item.explain}</p>
      {primary && <p className={styles.ruleSummary}><b>{primary.title}:</b> {primary.summary}</p>}
      <RuleChips item={item} />
    </div>
  </section>;
}

// ---------------------------------------------------------------------------

export function ItemRunner({ entry, position, total, mode, sessionCorrect, sessionAnswered, streak, onChecked, onNext, onExit }: {
  entry: SessionEntry;
  position: number;
  total: number;
  mode: SessionMode;
  sessionCorrect: number;
  sessionAnswered: number;
  streak: number;
  onChecked: (item: CompiledItem, check: GrammarCheck) => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const { item, role } = entry;
  const [response, setResponse] = useState<GrammarResponse>(() => emptyResponse(item));
  const [check, setCheck] = useState<GrammarCheck | null>(null);
  const ready = isResponseReady(item, response);
  const lesson = GRAMMAR_LESSON_BY_ID.get(item.lessonId);

  const submit = useCallback(() => {
    if (check || !isResponseReady(item, response)) return;
    const verdict = checkResponse(item, response);
    setCheck(verdict);
    onChecked(item, verdict);
  }, [check, item, onChecked, response]);

  const advance = useCallback(() => {
    if (check) onNext(); else submit();
  }, [check, onNext, submit]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "Enter") {
        event.preventDefault();
        advance();
        return;
      }
      if (event.key === "Escape") {
        onExit();
        return;
      }
      if (check || !/^[1-9]$/u.test(event.key)) return;
      const index = Number(event.key) - 1;
      if (item.kind === "choice" && item.options[index]) setResponse({ kind: "choice", option: item.options[index] });
      if (item.kind === "multi" && item.options[index] && response.kind === "multi") {
        const option = item.options[index];
        setResponse({ kind: "multi", options: response.options.includes(option) ? response.options.filter((value) => value !== option) : [...response.options, option] });
      }
      if (item.kind === "judge" && (index === 0 || index === 1)) setResponse({ kind: "judge", verdict: index === 0 ? "ok" : "error", indices: response.kind === "judge" ? response.indices : [] });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, check, item, onExit, response]);

  const done = position + (check ? 1 : 0);
  return <div className={`view ${styles.view} ${styles.activeView}`}>
    <header className={styles.sessionHeader}>
      <button className={styles.backButton} onClick={onExit}><ArrowLeft size={17} /> Oversigt</button>
      <div className={styles.track}>
        <div><span style={{ width: `${(done / total) * 100}%` }} /></div>
        <small>{position + 1} / {total}</small>
      </div>
      <span className={styles.modePill}>{mode === "boss" ? <Swords size={14} /> : mode === "mistakes" ? <Wrench size={14} /> : mode === "review" ? <CalendarClock size={14} /> : <BookOpen size={14} />}{MODE_LABEL[mode]}</span>
    </header>

    <div className={styles.sessionLayout}>
      <main className={styles.taskCard}>
        <div className={styles.taskMeta}>
          <span className={styles.kindChip}><KindIcon kind={item.kind} size={14} /> {KIND_LABEL[item.kind]}</span>
          <span>Niveau {item.level}</span>
          {role === "review" && lesson && <span className={styles.reviewChip}><RefreshCw size={13} /> Repetition · L{lessonNumber.get(lesson.id)} {lesson.title}</span>}
          {role === "repair" && <span className={styles.reviewChip}><Wrench size={13} /> Reparation</span>}
          {role === "boss" && <span className={styles.bossChip}><Swords size={13} /> Boss</span>}
        </div>
        <h1>{item.prompt}</h1>
        {item.en && <p className={styles.translation}>{item.en}</p>}
        <TaskBody item={item} response={response} setResponse={setResponse} check={check} onEnter={advance} />
        {check && <Feedback item={item} check={check} />}
      </main>

      <aside className={styles.sidePanel}>
        <div className={styles.sideScore}>
          <span><Flame size={19} /></span>
          <div><small>STRØM</small><strong>{streak}</strong></div>
        </div>
        <div className={styles.sideStats}>
          <div><span>Rigtige</span><strong>{sessionCorrect}/{sessionAnswered}</strong></div>
          <div><span>Tilbage</span><strong>{total - done}</strong></div>
        </div>
        {lesson && <div className={styles.sideLesson}>
          <small>{role === "new" ? "LEKTION" : "FRA LEKTION"}</small>
          <strong>L{lessonNumber.get(lesson.id)} · {lesson.title}</strong>
          <p>{lesson.subtitle}</p>
        </div>}
        <div className={styles.keyboardGuide}>
          <small>TASTATUR</small>
          <p><kbd>1–9</kbd> vælg · <kbd>Enter</kbd> tjek / næste · <kbd>Esc</kbd> oversigt</p>
        </div>
      </aside>
    </div>

    <footer className={styles.actionBar}>
      <span>{check ? check.correct ? <><Trophy size={16} /> Godt — reglen sidder bedre nu.</> : <><CircleAlert size={16} /> Fejlen er gemt, og reglen kommer snart igen.</> : role === "review" ? "Repetition: en regel fra en tidligere lektion." : "Svar med musen eller tastaturet."}</span>
      <button disabled={!check && !ready} onClick={advance}>
        {check ? position + 1 < total ? <>Næste <ArrowRight size={17} /></> : <>Se resultatet <Trophy size={17} /></> : <>Tjek svaret <Check size={17} /></>}
      </button>
    </footer>
  </div>;
}

// ---------------------------------------------------------------------------

export function TheoryView({ lessonId, card, progress, onCard, onStart, onExit }: {
  lessonId: string;
  card: number;
  progress: GrammarCourseProgress;
  onCard: (card: number) => void;
  onStart: () => void;
  onExit: () => void;
}) {
  const lesson = GRAMMAR_LESSON_BY_ID.get(lessonId);
  const cards = GRAMMAR_CATALOG.theory.get(lessonId) ?? [];
  const current = cards[Math.min(card, cards.length - 1)];
  const last = card >= cards.length - 1;
  const legend = current ? fieldsInCard(current) : [];
  const completed = isLessonCompleted(progress, lessonId);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        if (last) onStart(); else onCard(card + 1);
      } else if (event.key === "ArrowLeft" && card > 0) {
        onCard(card - 1);
      } else if (event.key === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [card, last, onCard, onExit, onStart]);

  if (!lesson || !current) return null;
  return <div className={`view ${styles.view} ${styles.activeView}`}>
    <header className={styles.sessionHeader}>
      <button className={styles.backButton} onClick={onExit}><ArrowLeft size={17} /> Oversigt</button>
      <div className={styles.theoryDots} aria-label={`Kort ${card + 1} af ${cards.length}`}>
        {cards.map((_, index) => <button aria-label={`Kort ${index + 1}`} className={index === card ? styles.dotActive : index < card ? styles.dotDone : ""} key={index} onClick={() => onCard(index)} />)}
      </div>
      <span className={styles.modePill}><BookOpen size={14} /> Teori</span>
    </header>

    <article className={styles.theoryCard}>
      <p className="eyebrow">LEKTION {lessonNumber.get(lesson.id)} · {lesson.title.toUpperCase()}</p>
      <h1>{current.title}</h1>
      {current.body.map((paragraph, index) => <p className={styles.theoryBody} key={index}><Inline text={paragraph} /></p>)}

      {current.formula && <div className={styles.formula}>
        {current.formula.map((part, index) => <span data-field={["C", "k", "F", "v", "n", "a", "V", "N", "A"].includes(part) ? part : undefined} key={`${part}-${index}`}>{part}</span>)}
      </div>}

      {current.examples && <div className={styles.exampleList}>
        {current.examples.map((example, index) => <div key={index}>
          <p className={styles.exampleDa}><Inline text={example.da} /></p>
          {example.en && <p className={styles.exampleEn}>{example.en}</p>}
          {example.note && <p className={styles.exampleNote}>{example.note}</p>}
        </div>)}
      </div>}

      {current.pairs && <div className={styles.pairList}>
        {current.pairs.map((pair, index) => <div key={index}>
          <p className={styles.pairWrong}><X size={15} /> <Inline text={pair.wrong} /></p>
          <p className={styles.pairRight}><Check size={15} /> <Inline text={pair.right} /></p>
          {pair.note && <small>{pair.note}</small>}
        </div>)}
      </div>}

      {current.exam && <div className={styles.examCallout}>
        <small><GraduationCap size={14} /> FRA DIN EKSAMEN</small>
        <p className={styles.pairWrong}><X size={15} /> <Inline text={current.exam.wrong} /></p>
        <p className={styles.pairRight}><Check size={15} /> <Inline text={current.exam.right} /></p>
        {current.exam.note && <span>{current.exam.note}</span>}
      </div>}

      {legend.length > 0 && <div className={styles.legend}>
        {legend.map((field) => <span data-field={field} key={field}><b>{field}</b> {FIELD_META[field].hint}</span>)}
      </div>}
    </article>

    <footer className={styles.actionBar}>
      <button className={styles.secondaryAction} disabled={card === 0} onClick={() => onCard(card - 1)}><ChevronLeft size={17} /> Forrige</button>
      <span>{completed ? "Du har klaret lektionen før — øvelserne blandes på ny." : `Kort ${card + 1} af ${cards.length}`}</span>
      <button onClick={last ? onStart : () => onCard(card + 1)}>{last ? <>Start øvelserne <ArrowRight size={17} /></> : <>Næste kort <ChevronRight size={17} /></>}</button>
    </footer>
  </div>;
}

// ---------------------------------------------------------------------------

function ResultsView({ summary, progress, onHub, onRetry, onNextLesson, onRepair }: {
  summary: SessionSummary;
  progress: GrammarCourseProgress;
  onHub: () => void;
  onRetry: () => void;
  onNextLesson: (lessonId: string) => void;
  onRepair: () => void;
}) {
  const accuracy = summary.total ? summary.correct / summary.total : 0;
  const lesson = summary.lessonId ? GRAMMAR_LESSON_BY_ID.get(summary.lessonId) : undefined;
  const courseModule = summary.moduleId ? GRAMMAR_MODULES.find((candidate) => candidate.id === summary.moduleId) : undefined;
  const passed = summary.mode === "boss" && summary.score >= CHECKPOINT_PASS_SCORE;
  const upcoming = nextLessonId(progress);
  const upcomingLesson = upcoming ? GRAMMAR_LESSON_BY_ID.get(upcoming) : undefined;
  const title = summary.mode === "boss"
    ? passed ? "Bossen er besejret!" : "Bossen overlevede — denne gang."
    : summary.mode === "lesson" ? accuracy >= 0.9 ? "Fejlfrit håndværk." : accuracy >= 0.7 ? "Lektionen sidder." : "Godt begyndt."
      : summary.mistakes.length ? "Repetitionen er gemt." : "Alt sad stadig.";

  return <div className={`view ${styles.view}`}>
    <section className={`${styles.resultHero} ${summary.mode === "boss" ? passed ? styles.resultWin : styles.resultLose : ""}`}>
      <div className={styles.resultScore}>
        <strong>{Math.round((summary.mode === "boss" ? summary.score : accuracy) * 100)}%</strong>
        <span>{summary.correct} af {summary.total} rigtige</span>
      </div>
      <div>
        <p className="eyebrow">{MODE_LABEL[summary.mode].toUpperCase()}{lesson ? ` · ${lesson.title.toUpperCase()}` : courseModule ? ` · ${courseModule.title.toUpperCase()}` : ""}</p>
        <h1>{title}</h1>
        {summary.mode === "lesson" && <Stars count={starsForAccuracy(accuracy)} size={22} />}
        {summary.mode === "boss" && <p>{passed ? "Modulet er lukket og låst — eksamensfejlen er officielt besejret." : `Du skal have ${Math.round(CHECKPOINT_PASS_SCORE * 100)}% for at vinde. Delvise point tæller.`}</p>}
        {summary.mode !== "boss" && <p>{summary.rules.length} regler øvet. Hver regel kommer igen om 1, 2, 4, 8 … dage — og med det samme, hvis den drillede.</p>}
      </div>
    </section>

    <div className={styles.resultActions}>
      {summary.mode === "lesson" && upcomingLesson && upcomingLesson.id !== summary.lessonId && isLessonUnlocked(progress, upcomingLesson.id) && <button className={styles.primaryAction} onClick={() => onNextLesson(upcomingLesson.id)}>Næste: L{lessonNumber.get(upcomingLesson.id)} {upcomingLesson.title} <ArrowRight size={17} /></button>}
      {summary.mistakes.length > 0 && <button className={styles.secondaryAction} onClick={onRepair}><Wrench size={16} /> Reparér fejlene nu</button>}
      <button className={styles.secondaryAction} onClick={onRetry}><RefreshCw size={16} /> {summary.mode === "boss" ? "Kæmp igen" : "Ny runde"}</button>
      <button className={styles.secondaryAction} onClick={onHub}><ArrowLeft size={16} /> Oversigt</button>
    </div>

    {summary.mistakes.length > 0 && <section className={styles.mistakeList}>
      <h2>Det skal du tage med</h2>
      {summary.mistakes.map((item) => <article key={item.uid}>
        <small><KindIcon kind={item.kind} size={13} /> {item.prompt}</small>
        <p className={styles.mistakeAnswer}>{item.kind === "judge" && item.isCorrect ? `»${item.correctSentence}« var korrekt.` : modelAnswer(item)}</p>
        <p>{item.explain}</p>
        <RuleChips item={item} />
      </article>)}
    </section>}
  </div>;
}

// ---------------------------------------------------------------------------

function Hub({ progress, onLesson, onTheory, onReview, onMistakes, onBoss, onToggleUnlock, notice, onDismissNotice, now }: {
  progress: GrammarCourseProgress;
  onLesson: (lessonId: string) => void;
  onTheory: (lessonId: string) => void;
  onReview: () => void;
  onMistakes: () => void;
  onBoss: (moduleId: string) => void;
  onToggleUnlock: () => void;
  notice: string;
  onDismissNotice: () => void;
  now: number;
}) {
  const [examIndex, setExamIndex] = useState(0);
  const [showAllExam, setShowAllExam] = useState(false);
  const completed = GRAMMAR_LESSONS.filter((lesson) => isLessonCompleted(progress, lesson.id)).length;
  const learned = learnedRuleIds(progress).length;
  const remembered = rememberedRuleIds(progress).length;
  const due = dueRuleIds(progress, new Date(now)).length;
  const weak = countWeakItems(GRAMMAR_CATALOG, progress);
  const upcoming = nextLessonId(progress);
  const upcomingLesson = upcoming ? GRAMMAR_LESSON_BY_ID.get(upcoming) : undefined;
  const exam = EXAM_ERRORS[examIndex % EXAM_ERRORS.length];
  const examLesson = GRAMMAR_LESSON_BY_ID.get(exam.lessonId);
  const examList = showAllExam ? EXAM_ERRORS : EXAM_ERRORS.slice(0, 6);

  return <div className={`view ${styles.view}`}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className="eyebrow">ORDHAVN · GRAMMATIKSKOLEN</p>
        <h1>Din eksamen er pensum.</h1>
        <p>{GRAMMAR_LESSONS.length} korte lektioner fra »hvad er et verbum?« til V2, ledsætninger, hvis/om og præpositioner — bygget på fejlene i din Paper 1-tale. Gamle regler vender tilbage, lige før du glemmer dem.</p>
        <div className={styles.heroActions}>
          {upcomingLesson
            ? <button className={styles.heroButton} onClick={() => onLesson(upcomingLesson.id)}>{completed ? "Fortsæt" : "Start fra bunden"}: L{lessonNumber.get(upcomingLesson.id)} {upcomingLesson.title} <ArrowRight size={17} /></button>
            : <button className={styles.heroButton} onClick={onReview}>Alle lektioner klaret — repetér <ArrowRight size={17} /></button>}
          {due > 0 && <button className={styles.heroGhost} onClick={onReview}><CalendarClock size={16} /> {due} regler klar</button>}
        </div>
      </div>
      <div className={styles.heroExam}>
        <small><GraduationCap size={14} /> FRA DIN TALE · {examIndex % EXAM_ERRORS.length + 1}/{EXAM_ERRORS.length}</small>
        <p className={styles.heroWrong}>{exam.wrong}</p>
        <p className={styles.heroRight}>{exam.right}</p>
        <span>{exam.note}</span>
        <div>
          {examLesson && <em>Repareres i L{lessonNumber.get(examLesson.id)} · {examLesson.title}</em>}
          <button onClick={() => setExamIndex((value) => value + 1)} aria-label="Næste eksamensfejl">Næste fejl <ChevronRight size={15} /></button>
        </div>
      </div>
    </section>

    <section className={styles.statStrip}>
      <div><BookOpen size={18} /><span><strong>{completed}/{GRAMMAR_LESSONS.length}</strong> lektioner</span></div>
      <div><Target size={18} /><span><strong>{grammarAccuracy(progress)}%</strong> præcision</span></div>
      <div><Sparkles size={18} /><span><strong>{remembered}/{learned}</strong> regler i hukommelsen</span></div>
      <div><Flame size={18} /><span><strong>{progress.bestStreak}</strong> bedste strøm</span></div>
    </section>

    {notice && <div className={styles.notice}><Sparkles size={17} /><span>{notice}</span><button onClick={onDismissNotice} aria-label="Luk besked"><X size={15} /></button></div>}

    <div className={styles.modeGrid}>
      <button className={`${styles.modeCard} ${styles.modeReview}`} disabled={!learned} onClick={onReview}>
        <span className={styles.modeIcon}><CalendarClock size={23} /></span>
        <p className="eyebrow">SPACED REPETITION</p>
        <h2>Dagens repetition</h2>
        <p>{learned ? due ? `${due} regler er klar til gentagelse. Regler, du har klaret ved et tidligere besøg, rykker op: 1 → 2 → 4 → 8 → 16 dage.` : "Alle lærte regler sidder lige nu. En blandet runde holder dem varme." : "Klar efter din første lektion."}</p>
        <strong>{learned ? "Start blandet runde" : "Låst"} <ChevronRight size={16} /></strong>
      </button>
      <button className={`${styles.modeCard} ${styles.modeMistakes}`} disabled={!weak} onClick={onMistakes}>
        <span className={styles.modeIcon}><Wrench size={23} /></span>
        <p className="eyebrow">PERSONLIG REPARATION</p>
        <h2>Mine fejl</h2>
        <p>{weak ? `${weak} opgaver venter. En opgave forlader listen efter to rigtige svar i træk.` : "Ingen fejl gemt. Forkerte svar lander automatisk her."}</p>
        <strong>{weak ? "Reparér" : "Tom"} <ChevronRight size={16} /></strong>
      </button>
    </div>

    <section className={styles.examSection}>
      <div className={styles.sectionHeading}>
        <div><p className="eyebrow">PAPER 1 · {EXAM_ERRORS.length} KONKRETE FEJL</p><h2>Fejlene, kurset er bygget på</h2></div>
        <button className={styles.textButton} onClick={() => setShowAllExam((value) => !value)}>{showAllExam ? "Vis færre" : `Vis alle ${EXAM_ERRORS.length}`}</button>
      </div>
      <div className={styles.examGrid}>
        {examList.map((error) => {
          const lesson = GRAMMAR_LESSON_BY_ID.get(error.lessonId);
          const fixed = isLessonCompleted(progress, error.lessonId);
          const unlocked = isLessonUnlocked(progress, error.lessonId);
          return <button className={fixed ? styles.examFixed : ""} disabled={!unlocked} key={error.id} onClick={() => onLesson(error.lessonId)}>
            <s>{error.wrong}</s>
            <strong>{error.right}</strong>
            <small>{fixed ? <Check size={13} /> : unlocked ? <ArrowRight size={13} /> : <Lock size={13} />} L{lessonNumber.get(error.lessonId)} · {lesson?.title}</small>
          </button>;
        })}
      </div>
    </section>

    <section className={styles.path}>
      {GRAMMAR_MODULES.map((courseModule, moduleIndex) => {
        const done = courseModule.lessonIds.filter((lessonId) => isLessonCompleted(progress, lessonId)).length;
        const boss = progress.checkpoints[courseModule.id];
        const bossOpen = isCheckpointUnlocked(progress, courseModule.id);
        return <div className={styles.moduleBlock} key={courseModule.id} data-track={courseModule.track}>
          <div className={styles.moduleHead}>
            <span className={styles.moduleNumber}>{moduleIndex + 1}</span>
            <div>
              <p className="eyebrow">MODUL {moduleIndex + 1} · {courseModule.track === "order" ? "ORDSTILLING" : courseModule.track === "choice" ? "ORDVALG" : "NAVNEORD"}</p>
              <h2>{courseModule.title}</h2>
              <p>{courseModule.subtitle}</p>
            </div>
            <div className={styles.moduleMeter}><span>{done}/{courseModule.lessonIds.length}</span><div><i style={{ width: `${(done / courseModule.lessonIds.length) * 100}%` }} /></div></div>
          </div>
          <div className={styles.lessonGrid}>
            {courseModule.lessonIds.map((lessonId) => {
              const lesson = GRAMMAR_LESSON_BY_ID.get(lessonId);
              if (!lesson) return null;
              const state = progress.lessons[lessonId];
              const unlocked = isLessonUnlocked(progress, lessonId);
              const isNext = lessonId === upcoming;
              return <div className={`${styles.lessonCard} ${state ? styles.lessonDone : ""} ${isNext ? styles.lessonNext : ""} ${unlocked ? "" : styles.lessonLocked}`} key={lessonId}>
                <button className={styles.lessonMain} disabled={!unlocked} onClick={() => onLesson(lessonId)}>
                  <span className={styles.lessonNumber}>{unlocked ? lessonNumber.get(lessonId) : <Lock size={14} />}</span>
                  <span className={styles.lessonText}><strong>{lesson.title}</strong><small>{lesson.subtitle}</small></span>
                  {state ? <Stars count={state.stars} size={13} /> : isNext ? <em>Næste</em> : null}
                </button>
                {unlocked && <button className={styles.theoryButton} onClick={() => onTheory(lessonId)} aria-label={`Teori: ${lesson.title}`} title="Læs teorien"><BookOpen size={15} /></button>}
              </div>;
            })}
            <button className={`${styles.bossCard} ${boss?.passedAt ? styles.bossBeaten : ""}`} disabled={!bossOpen} onClick={() => onBoss(courseModule.id)}>
              <span>{boss?.passedAt ? <Crown size={20} /> : bossOpen ? <Swords size={20} /> : <Lock size={18} />}</span>
              <div>
                <small>{boss?.passedAt ? "BESEJRET" : "FEJLBOSS"} · {courseModule.bossTitle}</small>
                <strong>»{courseModule.bossQuote}«</strong>
                <em>{boss ? `Bedste: ${Math.round(boss.bestScore * 100)}%` : bossOpen ? "Klar til kamp · 80% for at vinde" : "Åbner, når modulets lektioner er klaret"}</em>
              </div>
            </button>
          </div>
        </div>;
      })}
    </section>

    <footer className={styles.hubFooter}>
      <button className={styles.textButton} onClick={onToggleUnlock}>{progress.unlockAll ? <LockOpen size={15} /> : <Lock size={15} />} {progress.unlockAll ? "Fri navigation er slået til" : "Slå fri navigation til (åbn alle lektioner)"}</button>
      <span>Teori på engelsk · opgaver på dansk · {GRAMMAR_CATALOG.byUid.size} opgaver i alt</span>
    </footer>
  </div>;
}

// ---------------------------------------------------------------------------

export default function GrammarCourseGame({ progress, onUpdate }: GrammarCourseGameProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "hub" });
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const goHub = useCallback(() => {
    setNow(Date.now());
    setScreen({ kind: "hub" });
  }, []);

  const startSession = useCallback((mode: SessionMode, entries: SessionEntry[], extra: { lessonId?: string; moduleId?: string } = {}) => {
    if (!entries.length) {
      setNotice(mode === "mistakes" ? "Fejllisten er tom — flot." : "Der er ingen opgaver klar her endnu.");
      setScreen({ kind: "hub" });
      return;
    }
    setNotice("");
    setScreen({ kind: "session", session: { mode, entries, position: 0, outcomes: [], ...extra } });
  }, []);

  const startLessonPractice = useCallback((lessonId: string) => {
    onUpdate((current) => markTheorySeen(current, lessonId));
    startSession("lesson", buildLessonSession(GRAMMAR_CATALOG, lessonId, progress, Date.now(), new Date()), { lessonId });
  }, [onUpdate, progress, startSession]);

  const openLesson = useCallback((lessonId: string) => {
    if (!isLessonUnlocked(progress, lessonId)) return;
    if (!progress.seenTheory.includes(lessonId) && (GRAMMAR_CATALOG.theory.get(lessonId)?.length ?? 0) > 0) {
      setScreen({ kind: "theory", lessonId, card: 0 });
      return;
    }
    startLessonPractice(lessonId);
  }, [progress, startLessonPractice]);

  const startReview = useCallback(() => startSession("review", buildReviewSession(GRAMMAR_CATALOG, progress, Date.now(), new Date())), [progress, startSession]);
  const startMistakes = useCallback(() => startSession("mistakes", buildMistakeSession(GRAMMAR_CATALOG, progress, Date.now())), [progress, startSession]);
  const startBoss = useCallback((moduleId: string) => startSession("boss", buildCheckpointSession(GRAMMAR_CATALOG, moduleId, Date.now()), { moduleId }), [startSession]);

  const session = screen.kind === "session" ? screen.session : null;

  const onChecked = useCallback((item: CompiledItem, verdict: GrammarCheck) => {
    onUpdate((current) => recordGrammarAttempt(current, item, verdict.correct));
    setScreen((value) => value.kind === "session"
      ? { kind: "session", session: { ...value.session, outcomes: [...value.session.outcomes, { uid: item.uid, correct: verdict.correct, score: verdict.score }] } }
      : value);
  }, [onUpdate]);

  const onNext = useCallback(() => {
    if (!session) return;
    if (session.position + 1 < session.entries.length) {
      setScreen({ kind: "session", session: { ...session, position: session.position + 1 } });
      return;
    }
    const total = session.outcomes.length;
    const correct = session.outcomes.filter((outcome) => outcome.correct).length;
    const score = total ? session.outcomes.reduce((sum, outcome) => sum + outcome.score, 0) / total : 0;
    const wrongIds = new Set(session.outcomes.filter((outcome) => !outcome.correct).map((outcome) => outcome.uid));
    const summary: SessionSummary = {
      mode: session.mode,
      lessonId: session.lessonId,
      moduleId: session.moduleId,
      total,
      correct,
      score,
      mistakes: session.entries.map((entry) => entry.item).filter((item) => wrongIds.has(item.uid)),
      rules: [...new Set(session.entries.flatMap((entry) => entry.item.rules))],
    };
    if (session.mode === "lesson" && session.lessonId) {
      const lessonId = session.lessonId;
      onUpdate((current) => completeGrammarLesson(current, lessonId, total ? correct / total : 0));
    }
    if (session.mode === "boss" && session.moduleId) {
      const moduleId = session.moduleId;
      onUpdate((current) => completeGrammarCheckpoint(current, moduleId, score));
    }
    setScreen({ kind: "results", summary });
  }, [onUpdate, session]);

  const retry = useCallback((summary: SessionSummary) => {
    if (summary.mode === "lesson" && summary.lessonId) startLessonPractice(summary.lessonId);
    else if (summary.mode === "boss" && summary.moduleId) startBoss(summary.moduleId);
    else if (summary.mode === "mistakes") startMistakes();
    else startReview();
  }, [startBoss, startLessonPractice, startMistakes, startReview]);

  const sessionStats = useMemo(() => ({
    correct: session?.outcomes.filter((outcome) => outcome.correct).length ?? 0,
    answered: session?.outcomes.length ?? 0,
  }), [session]);

  if (screen.kind === "theory") {
    return <TheoryView
      card={screen.card}
      lessonId={screen.lessonId}
      onCard={(card) => setScreen({ kind: "theory", lessonId: screen.lessonId, card })}
      onExit={goHub}
      onStart={() => startLessonPractice(screen.lessonId)}
      progress={progress}
    />;
  }

  if (screen.kind === "session" && session) {
    const entry = session.entries[session.position];
    return <ItemRunner
      entry={entry}
      key={`${session.position}:${entry.item.uid}`}
      mode={session.mode}
      onChecked={onChecked}
      onExit={goHub}
      onNext={onNext}
      position={session.position}
      sessionAnswered={sessionStats.answered}
      sessionCorrect={sessionStats.correct}
      streak={progress.currentStreak}
      total={session.entries.length}
    />;
  }

  if (screen.kind === "results") {
    return <ResultsView
      onHub={goHub}
      onNextLesson={openLesson}
      onRepair={startMistakes}
      onRetry={() => retry(screen.summary)}
      progress={progress}
      summary={screen.summary}
    />;
  }

  return <Hub
    notice={notice}
    now={now}
    onBoss={startBoss}
    onDismissNotice={() => setNotice("")}
    onLesson={openLesson}
    onMistakes={startMistakes}
    onReview={startReview}
    onTheory={(lessonId) => setScreen({ kind: "theory", lessonId, card: 0 })}
    onToggleUnlock={() => onUpdate((current) => setGrammarUnlockAll(current, !current.unlockAll))}
    progress={progress}
  />;
}
