import type { ComponentType } from "react";
import type { CourseItem } from "./course/types.ts";
import {
  clozeBlanks,
  scoreClozeSelections,
  scoreErrorHunt,
  scoreFreeAnswer,
  scoreOrderedSequence,
  scoreRegisterMatches,
  serializeClozeSelections,
  serializeErrorHunt,
  serializeRegisterMatches,
} from "./exerciseScoring.ts";
import {
  ChoiceItemRenderer,
  ClozeMultiRenderer,
  ErrorHuntRenderer,
  GenderBetRenderer,
  InputItemRenderer,
  OrderItemRenderer,
  RegisterMatchRenderer,
  textOrderExpected,
} from "./itemRenderers.tsx";
import type { ItemRenderProps, ItemResponseState, KeyboardContext } from "./itemRuntime.ts";
import { orderThreeChoiceOptions } from "./optionOrder.ts";

export interface ItemModule {
  type: CourseItem["type"];
  build: (item: CourseItem) => CourseItem;
  score: (item: CourseItem, response: ItemResponseState) => number;
  serialize: (item: CourseItem, response: ItemResponseState) => string;
  isReady: (item: CourseItem, response: ItemResponseState) => boolean;
  keyboard: (key: string, context: KeyboardContext) => ItemResponseState | null;
  Render: ComponentType<ItemRenderProps>;
  instruction: string;
  expectedAnswer: (item: CourseItem) => string;
  partialCredit: boolean;
}

const identity = (item: CourseItem) => item;
const textSerialize = (_item: CourseItem, response: ItemResponseState) => response.selected.trim();
const textReady = (_item: CourseItem, response: ItemResponseState) => Boolean(response.selected.trim());
const freeScore = (item: CourseItem, response: ItemResponseState) => scoreFreeAnswer(item, response.selected);
const exactExpected = (item: CourseItem) => item.answer;

function choiceKeyboard(key: string, context: KeyboardContext) {
  if (!/^[1-9]$/.test(key)) return null;
  const selected = context.displayOptions[Number(key) - 1];
  return selected ? { ...context.response, selected } : null;
}

function orderKeyboard(key: string, context: KeyboardContext) {
  if (key === "Backspace") return { ...context.response, ordered: context.response.ordered.slice(0, -1) };
  if (!/^[1-9]$/.test(key)) return null;
  const tokens = context.displayTokens;
  const index = Number(key) - 1;
  const token = tokens[index];
  const alreadyUsed = token && context.response.ordered.filter((item) => item === token).length >= tokens.slice(0, index + 1).filter((item) => item === token).length;
  return token && !alreadyUsed ? { ...context.response, ordered: [...context.response.ordered, token] } : null;
}

function clozeKeyboard(key: string, context: KeyboardContext) {
  if (!/^[1-9]$/.test(key) || context.question.type !== "cloze-multi") return null;
  const blanks = clozeBlanks(context.question.segments);
  const activeId = context.response.activeId || blanks.find((blank) => !context.response.selections[blank.blankId])?.blankId || blanks[0]?.blankId;
  const active = blanks.find((blank) => blank.blankId === activeId);
  const options = active
    ? orderThreeChoiceOptions(active.options, active.answer, `${context.sessionId}:${context.question.id}:${active.blankId}`)
    : [];
  const option = options[Number(key) - 1];
  if (!active || !option) return null;
  const selections = { ...context.response.selections, [active.blankId]: option };
  const currentIndex = blanks.findIndex((blank) => blank.blankId === active.blankId);
  const next = blanks.slice(currentIndex + 1).find((blank) => !selections[blank.blankId]);
  return { ...context.response, selections, activeId: next?.blankId ?? active.blankId };
}

function errorKeyboard(key: string, context: KeyboardContext) {
  if (!/^[1-9]$/.test(key) || context.question.type !== "error-hunt") return null;
  const errorIndex = Number(key) - 1;
  return errorIndex < context.question.sentenceTokens.length ? { ...context.response, errorIndex } : null;
}

function nuanceScaleExpected(item: Extract<CourseItem, { type: "nuance-scale" }>) {
  const ordered = item.acceptedAnswers[0] ?? item.answer;
  return ordered.split(/\s+(?:<|→)\s+/u).map((token) => token.trim()).filter(Boolean);
}

function serializeOrdered(item: CourseItem, response: ItemResponseState) {
  if (item.type === "word-forge") return response.ordered.join("");
  if (item.type === "nuance-scale") return response.ordered.join(" < ");
  if (item.type === "text-order") return response.ordered.join(">");
  return response.ordered.join(" ");
}

const noKeyboard = () => null;
const choiceTypes = ["choice", "number-arcade", "definiteness", "agreement", "synonym-pick", "odd-one-out", "collocation-lock", "evidential-tag"] as const;
const orderTypes = ["order", "ikke-position", "nuance-scale", "word-forge", "text-order", "counterfactual-chain"] as const;
const inputTypes = ["input", "transform", "inflection-forge", "free-rewrite", "compress", "micro-dialogue", "explain-why"] as const;

const modules: ItemModule[] = [
  ...choiceTypes.map((type): ItemModule => ({
    type, build: identity, score: freeScore, serialize: textSerialize, isReady: textReady,
    keyboard: choiceKeyboard, Render: ChoiceItemRenderer,
    instruction: type === "synonym-pick" ? "Vælg ordet, der passer til tone og kontekst" : type === "odd-one-out" ? "Find ordet, der bryder mønsteret" : type === "collocation-lock" ? "Lås den naturlige ordforbindelse" : type === "evidential-tag" ? "Markér hvordan vi ved det" : "Vælg det bedste svar",
    expectedAnswer: exactExpected, partialCredit: false,
  })),
  {
    type: "gender-bet", build: identity, score: freeScore, serialize: textSerialize, isReady: textReady,
    keyboard: choiceKeyboard, Render: GenderBetRenderer, instruction: "Vælg en eller et — og sats på din sikkerhed",
    expectedAnswer: exactExpected, partialCredit: false,
  },
  ...orderTypes.map((type): ItemModule => ({
    type, build: identity,
    score: (item, response) => item.type === "text-order"
      ? scoreOrderedSequence(item.correctOrder, response.ordered)
      : item.type === "nuance-scale"
        ? scoreOrderedSequence(nuanceScaleExpected(item), response.ordered)
        : item.type === "word-forge"
          ? scoreFreeAnswer(item, response.ordered.join(""))
          : scoreFreeAnswer(item, response.ordered.join(" ")),
    serialize: serializeOrdered,
    isReady: (item, response) => response.ordered.length === (item.tokens?.length ?? 0),
    keyboard: orderKeyboard, Render: OrderItemRenderer,
    instruction: type === "text-order" ? "Sæt afsnittet i en sammenhængende rækkefølge" : type === "nuance-scale" ? "Placér ordene fra svagest til stærkest" : type === "word-forge" ? "Smed et ord af morfemerne" : type === "counterfactual-chain" ? "Byg den kontrafaktiske årsagskæde" : type === "ikke-position" ? "Sæt ‘ikke’ på den danske plads" : "Byg sætningen",
    expectedAnswer: (item) => item.type === "text-order" ? textOrderExpected(item) : item.answer,
    partialCredit: type === "text-order" || type === "nuance-scale",
  })),
  {
    type: "cloze-multi", build: identity,
    score: (item, response) => item.type === "cloze-multi" ? scoreClozeSelections(item.segments, response.selections) : 0,
    serialize: (item, response) => item.type === "cloze-multi" ? serializeClozeSelections(item.segments, response.selections) : "",
    isReady: (item, response) => item.type === "cloze-multi" && clozeBlanks(item.segments).every((blank) => Boolean(response.selections[blank.blankId])),
    keyboard: clozeKeyboard, Render: ClozeMultiRenderer, instruction: "Udfyld alle led, så de passer sammen",
    expectedAnswer: (item) => item.type === "cloze-multi" ? item.segments.map((segment) => "text" in segment ? segment.text : segment.answer).join("").trim() : item.answer,
    partialCredit: true,
  },
  {
    type: "register-match", build: identity,
    score: (item, response) => item.type === "register-match" ? scoreRegisterMatches(item.pairs, response.selections) : 0,
    serialize: (item, response) => item.type === "register-match" ? serializeRegisterMatches(item.pairs, response.selections) : "",
    isReady: (item, response) => item.type === "register-match" && item.pairs.every((pair) => Boolean(response.selections[pair.addressee])),
    keyboard: noKeyboard, Render: RegisterMatchRenderer, instruction: "Forbind hver person med den rigtige tone",
    expectedAnswer: () => "de korrekte forbindelser, som nu er markeret", partialCredit: true,
  },
  {
    type: "error-hunt", build: identity,
    score: (item, response) => item.type === "error-hunt" ? scoreErrorHunt(item.errorIndex, item.correction, response.errorIndex, response.correction) : 0,
    serialize: (_item, response) => serializeErrorHunt(response.errorIndex, response.correction),
    isReady: (_item, response) => response.errorIndex !== null && Boolean(response.correction.trim()),
    keyboard: errorKeyboard, Render: ErrorHuntRenderer, instruction: "Find fejlen, og ret den",
    expectedAnswer: (item) => item.type === "error-hunt" ? `${item.sentenceTokens[item.errorIndex]} → ${item.correction}` : item.answer,
    partialCredit: true,
  },
  ...inputTypes.map((type): ItemModule => ({
    type, build: identity, score: freeScore, serialize: textSerialize,
    isReady: (item, response) => {
      const minimum = "minWords" in item ? item.minWords : 1;
      return response.selected.trim().split(/\s+/u).filter(Boolean).length >= minimum;
    },
    keyboard: noKeyboard, Render: InputItemRenderer,
    instruction: type === "free-rewrite" ? "Omskriv frit med samme betydning" : type === "compress" ? "Bevar fakta med færre ord" : type === "micro-dialogue" ? "Før en kort samtale med et skjult mål" : type === "explain-why" ? "Forklar hvorfor på præcist dansk" : type === "inflection-forge" ? "Bøj ordet til den krævede form" : type === "transform" ? "Skriv sætningen om efter instruktionen" : "Skriv det manglende",
    expectedAnswer: exactExpected, partialCredit: type === "input" || type === "transform" || type === "inflection-forge",
  })),
];

export const itemRegistry = Object.fromEntries(modules.map((module) => [module.type, module])) as Record<CourseItem["type"], ItemModule>;

export function getItemModule(item: CourseItem) {
  return itemRegistry[item.type];
}

export const registeredItemTypes = modules.map((module) => module.type);
