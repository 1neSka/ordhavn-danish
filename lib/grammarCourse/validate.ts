import { canonicalResponse, checkResponse, compileItem, SCHEMA_FIELDS, type CompiledItem, type ItemOrigin } from "./compile";
import { GRAMMAR_LESSON_BY_ID, GRAMMAR_LESSONS, GRAMMAR_MODULE_BY_ID, GRAMMAR_RULE_BY_ID, RULE_INTRODUCED_AT } from "./curriculum";
import { normalizeSpacing, parseInline, stripInline } from "./markup";
import type { CheckpointContent, ItemKind, ItemSpec, LessonContent, TheoryCard } from "./types";

// Shared by tests/grammar-course.test.mjs and scripts/validate-grammar-content.mjs.
// Errors break the build; warnings are advice for content authors.

export interface ValidationReport {
  errors: string[];
  warnings: string[];
  stats: {
    items: number;
    kinds: Partial<Record<ItemKind, number>>;
    levels: Record<1 | 2 | 3, number>;
    judgeCorrect: number;
    judgeTotal: number;
    cumulative: number;
  };
}

export const MIN_LESSON_ITEMS = 12;
export const MIN_CHECKPOINT_ITEMS = 6;

function emptyReport(): ValidationReport {
  return { errors: [], warnings: [], stats: { items: 0, kinds: {}, levels: { 1: 0, 2: 0, 3: 0 }, judgeCorrect: 0, judgeTotal: 0, cumulative: 0 } };
}

function plainSentence(value: string) {
  return normalizeSpacing(value.replace(/[[\]|^~]/gu, " ").replace(/\{[^}]*\}/gu, " ")).toLocaleLowerCase("da-DK");
}

/** The visible sentence(s) of an item, used for duplicate detection. */
export function itemFingerprint(spec: ItemSpec) {
  switch (spec.kind) {
    case "choice": return plainSentence(`${spec.sentence ?? ""} ${spec.correct}`);
    case "multi": return plainSentence(spec.correct.join(" "));
    case "build": return plainSentence(spec.answer);
    case "type": return plainSentence(`${spec.text} ${spec.accept[0] ?? ""}`);
    case "judge": case "proof": return plainSentence(spec.text.replace(/\[([^\]]*)\]\{[^}]*\}/gu, "$1"));
    default: return plainSentence(spec.text);
  }
}

function validateTheory(cards: TheoryCard[], label: string, report: ValidationReport) {
  if (cards.length < 2 || cards.length > 4) report.errors.push(`${label}: theory needs 2–4 cards (has ${cards.length})`);
  cards.forEach((card, index) => {
    const where = `${label} theory[${index}]`;
    if (!card.title?.trim()) report.errors.push(`${where}: missing title`);
    if (!card.body?.length) report.errors.push(`${where}: missing body`);
    const words = card.body.join(" ").split(/\s+/u).length;
    if (words > 140) report.warnings.push(`${where}: body is long (${words} words) — aim for ≤ 110`);
    for (const example of card.examples ?? []) {
      if (!example.da?.trim()) report.errors.push(`${where}: example without da`);
      if (/\{[^}]*$/u.test(example.da) || /\{(?![CkFvnaVNA]:)/u.test(example.da)) report.errors.push(`${where}: malformed {F:…} markup in "${example.da}"`);
      parseInline(example.da);
    }
    for (const pair of [...(card.pairs ?? []), ...(card.exam ? [card.exam] : [])]) {
      if (!pair.wrong?.trim() || !pair.right?.trim()) report.errors.push(`${where}: pair needs wrong and right`);
      if (stripInline(pair.wrong) === stripInline(pair.right)) report.errors.push(`${where}: pair wrong equals right`);
    }
  });
}

function validateItem(spec: ItemSpec, origin: ItemOrigin, maxLessonIndex: number, report: ValidationReport): CompiledItem | null {
  const where = `${origin.source === "checkpoint" ? `${origin.moduleId}-boss` : origin.lessonId}:${spec.id}`;
  const fail = (message: string) => report.errors.push(`${where}: ${message}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(spec.id)) fail("id must be kebab-case");
  if (!spec.prompt?.trim()) fail("missing prompt");
  if (!spec.explain?.trim() || spec.explain.trim().length < 20) fail("explain must be a real explanation (≥ 20 characters)");
  if (![1, 2, 3].includes(spec.level)) fail("level must be 1, 2 or 3");
  if (!spec.rules?.length) fail("needs at least one rule");
  for (const rule of spec.rules ?? []) {
    if (!GRAMMAR_RULE_BY_ID.has(rule)) fail(`unknown rule "${rule}"`);
    else if ((RULE_INTRODUCED_AT.get(rule) ?? 99) > maxLessonIndex) fail(`rule "${rule}" is taught later than this item`);
  }
  if (new Set(spec.rules).size !== spec.rules.length) fail("duplicate rule ids");

  switch (spec.kind) {
    case "choice": {
      if (spec.wrong.length < 2 || spec.wrong.length > 3) fail("choice needs 2–3 wrong options");
      const all = [spec.correct, ...spec.wrong].map((option) => option.trim());
      if (new Set(all).size !== all.length) fail("choice options must be unique");
      if (spec.sentence && !/_{3,}/u.test(spec.sentence) && spec.sentence.length < 3) fail("sentence is too short");
      break;
    }
    case "multi": {
      if (spec.correct.length < 1 || spec.correct.length > 3) fail("multi needs 1–3 correct options");
      const total = spec.correct.length + spec.wrong.length;
      if (total < 4 || total > 5) fail("multi needs 4–5 options in total");
      if (spec.wrong.length < 1) fail("multi needs at least one wrong option");
      const all = [...spec.correct, ...spec.wrong].map((option) => option.trim());
      if (new Set(all).size !== all.length) fail("multi options must be unique");
      break;
    }
    case "build":
      if ((spec.extra ?? []).length > 2) fail("at most two extra chunks");
      if (spec.answer.split("|").length < 3) fail("build needs at least three chunks");
      if ((spec.alt ?? []).some((alt) => normalizeSpacing(alt) === normalizeSpacing(spec.answer))) fail("alt repeats the answer");
      break;
    case "sort": {
      const chunks = spec.text.split("|").map((chunk) => chunk.trim()).filter(Boolean);
      if (chunks.length !== spec.fields.length) fail(`sort has ${chunks.length} chunks but ${spec.fields.length} fields`);
      const allowed = SCHEMA_FIELDS[spec.schema];
      if (!allowed) fail(`unknown schema ${spec.schema}`);
      else spec.fields.forEach((field) => { if (!allowed.includes(field)) fail(`field ${field} is not in the ${spec.schema} schema`); });
      if (spec.schema === "sub" && spec.fields[0] !== "k") fail("a sub-schema sentence starts with its subordinator (k)");
      if (spec.schema === "coord" && spec.fields[0] !== "C") fail("a coord-schema sentence starts with its connector (C)");
      if (spec.schema === "main" && !["F", "v"].includes(spec.fields[0])) fail("a main clause starts with F (or v in a question)");
      if (spec.fields.filter((field) => field === "v").length !== 1) fail("a sorted clause has exactly one finite verb (v)");
      if (spec.fields.filter((field) => field === "F").length > 1) fail("F holds exactly one constituent");
      break;
    }
    case "proof": {
      const errors = (spec.text.match(/\]\{/gu) ?? []).length;
      if (errors < 2 || errors > 5) fail(`proof needs 2–5 errors (has ${errors})`);
      break;
    }
    case "type":
      if (!spec.accept.length) fail("type needs accepted answers");
      break;
    default:
      break;
  }

  try {
    const compiled = compileItem(spec, origin);
    const verdict = checkResponse(compiled, canonicalResponse(compiled));
    if (!verdict.correct) fail("the canonical answer is not accepted — check the markup");
    if (compiled.kind === "slot" && compiled.tokens.length < 3) fail("slot sentence is too short");
    if (compiled.kind === "slot" && compiled.accepted.length > 2) report.warnings.push(`${where}: slot accepts ${compiled.accepted.length} positions — is it really unambiguous?`);
    if (compiled.kind === "tap" && compiled.tokens.length < 3) fail("tap sentence is too short");
    if (compiled.kind === "judge" && compiled.tokens.length < 4) fail("judge sentence is too short");
    return compiled;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return null;
  }
}

function tally(items: ItemSpec[], compiled: Array<CompiledItem | null>, report: ValidationReport) {
  report.stats.items += items.length;
  items.forEach((spec, index) => {
    report.stats.kinds[spec.kind] = (report.stats.kinds[spec.kind] ?? 0) + 1;
    if (spec.level in report.stats.levels) report.stats.levels[spec.level] += 1;
    if (spec.rules.length > 1) report.stats.cumulative += 1;
    const item = compiled[index];
    if (item?.kind === "judge") {
      report.stats.judgeTotal += 1;
      if (item.isCorrect) report.stats.judgeCorrect += 1;
    }
  });
}

function checkDuplicates(items: ItemSpec[], label: string, report: ValidationReport) {
  const ids = new Set<string>();
  const seen = new Map<string, string>();
  for (const spec of items) {
    if (ids.has(spec.id)) report.errors.push(`${label}: duplicate item id ${spec.id}`);
    ids.add(spec.id);
    const fingerprint = itemFingerprint(spec);
    const previous = seen.get(fingerprint);
    if (previous && spec.kind === items.find((candidate) => candidate.id === previous)?.kind) report.warnings.push(`${label}: ${spec.id} repeats the sentence of ${previous}`);
    seen.set(fingerprint, spec.id);
  }
}

export function validateLessonContent(content: LessonContent): ValidationReport {
  const report = emptyReport();
  const meta = GRAMMAR_LESSON_BY_ID.get(content.lessonId);
  if (!meta) {
    report.errors.push(`Unknown lessonId ${content.lessonId}`);
    return report;
  }
  const lessonIndex = GRAMMAR_LESSONS.findIndex((lesson) => lesson.id === meta.id);
  const origin: ItemOrigin = { lessonId: meta.id, moduleId: meta.moduleId, source: "lesson" };
  validateTheory(content.theory ?? [], meta.id, report);
  if (content.items.length < MIN_LESSON_ITEMS) report.errors.push(`${meta.id}: needs at least ${MIN_LESSON_ITEMS} items (has ${content.items.length})`);
  checkDuplicates(content.items, meta.id, report);
  const compiled = content.items.map((spec) => {
    if (spec.rules?.[0] && !meta.rules.includes(spec.rules[0])) report.errors.push(`${meta.id}:${spec.id}: the first rule must be one of this lesson's rules (${meta.rules.join(", ")})`);
    return validateItem(spec, origin, lessonIndex, report);
  });
  tally(content.items, compiled, report);

  const kinds = Object.keys(report.stats.kinds).length;
  if (kinds < 4) report.errors.push(`${meta.id}: use at least 4 different mechanics (uses ${kinds})`);
  if (report.stats.judgeTotal >= 3) {
    const share = report.stats.judgeCorrect / report.stats.judgeTotal;
    if (share < 0.3 || share > 0.7) report.errors.push(`${meta.id}: ${report.stats.judgeCorrect}/${report.stats.judgeTotal} judge items are correct — keep it between 30% and 70% so guessing never pays`);
  }
  if (lessonIndex >= 5) {
    const share = report.stats.cumulative / Math.max(1, content.items.length);
    if (share < 0.3) report.errors.push(`${meta.id}: only ${report.stats.cumulative}/${content.items.length} items also use earlier rules — at least 30% must be cumulative`);
  }
  for (const level of [1, 2, 3] as const) {
    if (!report.stats.levels[level]) report.warnings.push(`${meta.id}: no level-${level} items`);
  }
  return report;
}

export function validateCheckpointContent(content: CheckpointContent): ValidationReport {
  const report = emptyReport();
  const courseModule = GRAMMAR_MODULE_BY_ID.get(content.moduleId);
  if (!courseModule) {
    report.errors.push(`Unknown moduleId ${content.moduleId}`);
    return report;
  }
  const lastLessonId = courseModule.lessonIds.at(-1) ?? "";
  const lessonIndex = GRAMMAR_LESSONS.findIndex((lesson) => lesson.id === lastLessonId);
  const origin: ItemOrigin = { lessonId: lastLessonId, moduleId: courseModule.id, source: "checkpoint" };
  if (!content.intro?.trim()) report.errors.push(`${courseModule.id}-boss: missing intro`);
  if (content.items.length < MIN_CHECKPOINT_ITEMS) report.errors.push(`${courseModule.id}-boss: needs at least ${MIN_CHECKPOINT_ITEMS} items (has ${content.items.length})`);
  checkDuplicates(content.items, `${courseModule.id}-boss`, report);
  const moduleRules = new Set(courseModule.lessonIds.flatMap((lessonId) => GRAMMAR_LESSON_BY_ID.get(lessonId)?.rules ?? []));
  const compiled = content.items.map((spec) => validateItem(spec, origin, lessonIndex, report));
  tally(content.items, compiled, report);
  const touched = new Set(content.items.flatMap((spec) => spec.rules).filter((rule) => moduleRules.has(rule)));
  const missing = [...moduleRules].filter((rule) => !touched.has(rule));
  if (missing.length) report.warnings.push(`${courseModule.id}-boss: does not test ${missing.join(", ")}`);
  if (!content.items.some((spec) => spec.kind === "proof")) report.errors.push(`${courseModule.id}-boss: needs at least one proof (exam-style text) item`);
  return report;
}
