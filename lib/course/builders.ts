import type {
  AgreementItem,
  BaseItem,
  ChoiceItem,
  ClozeMultiItem,
  CollocationLockItem,
  CompressItem,
  CounterfactualChainItem,
  CourseItem,
  DefinitenessItem,
  Difficulty,
  ErrorHuntItem,
  EvidentialTagItem,
  ExplainWhyItem,
  FreeRewriteItem,
  GenderBetItem,
  InflectionForgeItem,
  InputItem,
  ItemAssets,
  MicroDialogueItem,
  NuanceScaleItem,
  NumberArcadeItem,
  OddOneOutItem,
  OrderItem,
  RegisterMatchItem,
  SynonymPickItem,
  TextOrderItem,
  TransformItem,
  WordForgeItem,
} from "./types.ts";

export const NO_AUDIO: ItemAssets = { audio: null };

export type ItemBaseInput = Pick<BaseItem,
  "id" | "prompt" | "answer" | "hint" | "explanation" | "skill" | "tags"
> & Partial<Pick<BaseItem, "translation" | "difficulty" | "modality" | "assets" | "acceptedAnswers">>;

function withDefaults<T extends CourseItem>(item: Omit<T, "difficulty" | "assets"> & Partial<Pick<T, "difficulty" | "assets">>): T {
  return {
    difficulty: 2 as Difficulty,
    assets: NO_AUDIO,
    ...item,
  } as T;
}

export function defineItem<T extends CourseItem>(item: Omit<T, "difficulty" | "assets"> & Partial<Pick<T, "difficulty" | "assets">>): T {
  return withDefaults(item);
}

export const buildChoice = (item: Omit<ChoiceItem, "type" | "difficulty" | "assets"> & Partial<Pick<ChoiceItem, "difficulty" | "assets">>) =>
  withDefaults<ChoiceItem>({ ...item, type: "choice" });
export const buildOrder = (item: Omit<OrderItem, "type" | "difficulty" | "assets"> & Partial<Pick<OrderItem, "difficulty" | "assets">>) =>
  withDefaults<OrderItem>({ ...item, type: "order" });
export const buildInput = (item: Omit<InputItem, "type" | "difficulty" | "assets"> & Partial<Pick<InputItem, "difficulty" | "assets">>) =>
  withDefaults<InputItem>({ ...item, type: "input" });
export const buildGenderBet = (item: Omit<GenderBetItem, "type" | "difficulty" | "assets"> & Partial<Pick<GenderBetItem, "difficulty" | "assets">>) =>
  withDefaults<GenderBetItem>({ ...item, type: "gender-bet" });
export const buildNumberArcade = (item: Omit<NumberArcadeItem, "type" | "difficulty" | "assets"> & Partial<Pick<NumberArcadeItem, "difficulty" | "assets">>) =>
  withDefaults<NumberArcadeItem>({ ...item, type: "number-arcade" });
export const buildDefiniteness = (item: Omit<DefinitenessItem, "type" | "difficulty" | "assets"> & Partial<Pick<DefinitenessItem, "difficulty" | "assets">>) =>
  withDefaults<DefinitenessItem>({ ...item, type: "definiteness" });
export const buildAgreement = (item: Omit<AgreementItem, "type" | "difficulty" | "assets"> & Partial<Pick<AgreementItem, "difficulty" | "assets">>) =>
  withDefaults<AgreementItem>({ ...item, type: "agreement" });
export const buildClozeMulti = (item: Omit<ClozeMultiItem, "type" | "difficulty" | "assets"> & Partial<Pick<ClozeMultiItem, "difficulty" | "assets">>) =>
  withDefaults<ClozeMultiItem>({ ...item, type: "cloze-multi" });
export const buildRegisterMatch = (item: Omit<RegisterMatchItem, "type" | "difficulty" | "assets"> & Partial<Pick<RegisterMatchItem, "difficulty" | "assets">>) =>
  withDefaults<RegisterMatchItem>({ ...item, type: "register-match" });
export const buildTransform = (item: Omit<TransformItem, "type" | "difficulty" | "assets"> & Partial<Pick<TransformItem, "difficulty" | "assets">>) =>
  withDefaults<TransformItem>({ ...item, type: "transform" });

export const buildSynonymPick = (item: Omit<SynonymPickItem, "type" | "difficulty" | "assets"> & Partial<Pick<SynonymPickItem, "difficulty" | "assets">>) =>
  withDefaults<SynonymPickItem>({ ...item, type: "synonym-pick" });
export const buildNuanceScale = (item: Omit<NuanceScaleItem, "type" | "difficulty" | "assets"> & Partial<Pick<NuanceScaleItem, "difficulty" | "assets">>) =>
  withDefaults<NuanceScaleItem>({ ...item, type: "nuance-scale" });
export const buildOddOneOut = (item: Omit<OddOneOutItem, "type" | "difficulty" | "assets"> & Partial<Pick<OddOneOutItem, "difficulty" | "assets">>) =>
  withDefaults<OddOneOutItem>({ ...item, type: "odd-one-out" });
export const buildCollocationLock = (item: Omit<CollocationLockItem, "type" | "difficulty" | "assets"> & Partial<Pick<CollocationLockItem, "difficulty" | "assets">>) =>
  withDefaults<CollocationLockItem>({ ...item, type: "collocation-lock" });
export const buildErrorHunt = (item: Omit<ErrorHuntItem, "type" | "difficulty" | "assets"> & Partial<Pick<ErrorHuntItem, "difficulty" | "assets">>) =>
  withDefaults<ErrorHuntItem>({ ...item, type: "error-hunt" });
export const buildInflectionForge = (item: Omit<InflectionForgeItem, "type" | "difficulty" | "assets"> & Partial<Pick<InflectionForgeItem, "difficulty" | "assets">>) =>
  withDefaults<InflectionForgeItem>({ ...item, type: "inflection-forge" });
export const buildWordForge = (item: Omit<WordForgeItem, "type" | "difficulty" | "assets"> & Partial<Pick<WordForgeItem, "difficulty" | "assets">>) =>
  withDefaults<WordForgeItem>({
    ...item,
    type: "word-forge",
    tokens: item.tokens ?? [item.morphemes[0], ...(item.fugeelement ? [item.fugeelement] : []), ...item.morphemes.slice(1)],
  });
export const buildTextOrder = (item: Omit<TextOrderItem, "type" | "difficulty" | "assets"> & Partial<Pick<TextOrderItem, "difficulty" | "assets">>) =>
  withDefaults<TextOrderItem>({ ...item, type: "text-order" });
export const buildEvidentialTag = (item: Omit<EvidentialTagItem, "type" | "difficulty" | "assets"> & Partial<Pick<EvidentialTagItem, "difficulty" | "assets">>) =>
  withDefaults<EvidentialTagItem>({ ...item, type: "evidential-tag" });
export const buildCounterfactualChain = (item: Omit<CounterfactualChainItem, "type" | "difficulty" | "assets"> & Partial<Pick<CounterfactualChainItem, "difficulty" | "assets">>) =>
  withDefaults<CounterfactualChainItem>({ ...item, type: "counterfactual-chain" });
export const buildFreeRewrite = (item: Omit<FreeRewriteItem, "type" | "difficulty" | "assets"> & Partial<Pick<FreeRewriteItem, "difficulty" | "assets">>) =>
  withDefaults<FreeRewriteItem>({ ...item, type: "free-rewrite" });
export const buildCompress = (item: Omit<CompressItem, "type" | "difficulty" | "assets"> & Partial<Pick<CompressItem, "difficulty" | "assets">>) =>
  withDefaults<CompressItem>({ ...item, type: "compress" });
export const buildMicroDialogue = (item: Omit<MicroDialogueItem, "type" | "difficulty" | "assets"> & Partial<Pick<MicroDialogueItem, "difficulty" | "assets">>) =>
  withDefaults<MicroDialogueItem>({ ...item, type: "micro-dialogue" });
export const buildExplainWhy = (item: Omit<ExplainWhyItem, "type" | "difficulty" | "assets"> & Partial<Pick<ExplainWhyItem, "difficulty" | "assets">>) =>
  withDefaults<ExplainWhyItem>({ ...item, type: "explain-why" });
