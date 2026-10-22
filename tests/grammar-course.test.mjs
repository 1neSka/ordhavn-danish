import assert from "node:assert/strict";
import test from "node:test";

const curriculum = await import("../lib/grammarCourse/curriculum.ts");
const markup = await import("../lib/grammarCourse/markup.ts");
const compile = await import("../lib/grammarCourse/compile.ts");
const progressApi = await import("../lib/grammarCourse/progress.ts");
const sessions = await import("../lib/grammarCourse/sessions.ts");
const validate = await import("../lib/grammarCourse/validate.ts");
const content = await import("../lib/grammarCourse/content/index.ts");

const { GRAMMAR_LESSONS, GRAMMAR_MODULES, GRAMMAR_RULES, EXAM_ERRORS } = curriculum;
const catalog = sessions.buildCatalog(content.LESSON_CONTENT, content.CHECKPOINT_CONTENT);
const origin = { lessonId: "m2-v2", moduleId: "m2", source: "lesson" };
const DAY = 86_400_000;

function completeLessons(progress, count) {
  return GRAMMAR_LESSONS.slice(0, count).reduce((current, lesson) => progressApi.completeGrammarLesson(current, lesson.id, 1, new Date("2026-10-01T10:00:00Z")), progress);
}

test("the curriculum is ordered, unique and points only at real lessons", () => {
  assert.equal(new Set(GRAMMAR_RULES.map((rule) => rule.id)).size, GRAMMAR_RULES.length);
  assert.equal(new Set(GRAMMAR_LESSONS.map((lesson) => lesson.id)).size, GRAMMAR_LESSONS.length);
  const moduleOrder = GRAMMAR_MODULES.flatMap((courseModule) => courseModule.lessonIds);
  assert.deepEqual(moduleOrder, GRAMMAR_LESSONS.map((lesson) => lesson.id), "modules list the lessons in course order");
  const introduced = GRAMMAR_LESSONS.flatMap((lesson) => lesson.rules);
  assert.deepEqual([...introduced].sort(), GRAMMAR_RULES.map((rule) => rule.id).sort(), "every rule is introduced by exactly one lesson");
  for (const error of EXAM_ERRORS) assert.ok(curriculum.GRAMMAR_LESSON_BY_ID.has(error.lessonId), `${error.id} points to ${error.lessonId}`);
  assert.ok(EXAM_ERRORS.length >= 30, "the exam catalogue keeps the concrete errors from the mock exam");
});

test("every lesson and checkpoint has valid, playable content", () => {
  assert.deepEqual(content.LESSON_CONTENT.map((lesson) => lesson.lessonId), GRAMMAR_LESSONS.map((lesson) => lesson.id));
  assert.deepEqual(content.CHECKPOINT_CONTENT.map((checkpoint) => checkpoint.moduleId), GRAMMAR_MODULES.map((courseModule) => courseModule.id));
  const errors = [
    ...content.LESSON_CONTENT.flatMap((lesson) => validate.validateLessonContent(lesson).errors),
    ...content.CHECKPOINT_CONTENT.flatMap((checkpoint) => validate.validateCheckpointContent(checkpoint).errors),
  ];
  assert.deepEqual(errors, []);
});

test("the course is big enough to repeat without repeating itself", () => {
  const lessonItems = content.LESSON_CONTENT.reduce((sum, lesson) => sum + lesson.items.length, 0);
  assert.ok(lessonItems >= 31 * 12, `lesson bank has ${lessonItems} items`);
  const fingerprints = new Map();
  for (const lesson of content.LESSON_CONTENT) {
    for (const spec of lesson.items) {
      const key = `${spec.kind}:${validate.itemFingerprint(spec)}`;
      assert.ok(!fingerprints.has(key), `${lesson.lessonId}:${spec.id} duplicates ${fingerprints.get(key)}`);
      fingerprints.set(key, `${lesson.lessonId}:${spec.id}`);
    }
  }
  const cumulative = content.LESSON_CONTENT.slice(5).flatMap((lesson) => lesson.items).filter((spec) => spec.rules.length > 1).length;
  const later = content.LESSON_CONTENT.slice(5).reduce((sum, lesson) => sum + lesson.items.length, 0);
  assert.ok(cumulative / later >= 0.3, `${cumulative}/${later} later items reuse earlier rules`);
});

test("judge items are balanced and choice answers move around", () => {
  const compiled = [...catalog.byUid.values()].map((entry) => compile.compileItem(entry.spec, entry.origin, "positions"));
  const judges = compiled.filter((item) => item.kind === "judge");
  const correctShare = judges.filter((item) => item.isCorrect).length / judges.length;
  assert.ok(correctShare > 0.3 && correctShare < 0.7, `judge correct share ${correctShare}`);
  const positions = new Set(compiled.filter((item) => item.kind === "choice").map((item) => item.options.indexOf(item.correct)));
  assert.ok(positions.size >= 3, "the correct choice is not stuck in one position");
});

test("markup: errors, deletions, alternatives and chunks parse into indices", () => {
  const parsed = markup.parseErrors("Fordi det regner, [så]{} skal vi blive [hjemme]{inde}.");
  assert.deepEqual(parsed.spans.map((span) => span.tokens), [[3], [7]]);
  assert.equal(parsed.corrected, "Fordi det regner, skal vi blive inde.");
  assert.equal(parsed.shown, "Fordi det regner, så skal vi blive hjemme.");

  const slot = markup.parseSlot("Han kommer ~ nok ^ i morgen.");
  assert.deepEqual(slot.tokens, ["Han", "kommer", "nok", "i", "morgen."]);
  assert.equal(slot.primary, 3);
  assert.deepEqual(slot.accepted, [2, 3]);

  const chunks = markup.parseTargets("[På grund af regnen] | blev | [vi] | hjemme.");
  assert.deepEqual(chunks.tokens, ["På grund af regnen", "blev", "vi", "hjemme."]);
  assert.deepEqual(chunks.groups, [[0], [2]]);

  assert.throws(() => markup.parseErrors("Han [kommer ikke."), /Unclosed/u);
  assert.throws(() => markup.parseSlot("Han kommer i morgen."), /No \^/u);
  assert.deepEqual(markup.parseInline("{F:I dag} er **vigtigt** og *dansk*").map((segment) => segment.kind), ["field", "text", "bold", "text", "italic"]);
});

test("build items accept every listed order and reject the distractor chunk", () => {
  const item = compile.compileItem({
    id: "t-01", kind: "build", rules: ["v2"], level: 1, prompt: "Byg.", explain: "Two orders are both fine here.",
    answer: "I dag | arbejder | jeg | hjemme.",
    alt: ["Jeg | arbejder | hjemme | i dag."],
    extra: ["at"],
  }, origin, "seed");
  assert.equal(item.size, 4);
  assert.equal(item.chunks.length, 5);
  const orderFor = (...texts) => texts.map((text) => item.chunks.indexOf(text));
  assert.equal(compile.checkResponse(item, { kind: "build", order: orderFor("i dag", "arbejder", "jeg", "hjemme") }).correct, true);
  assert.equal(compile.checkResponse(item, { kind: "build", order: orderFor("jeg", "arbejder", "hjemme", "i dag") }).correct, true);
  assert.equal(compile.checkResponse(item, { kind: "build", order: orderFor("i dag", "jeg", "arbejder", "hjemme") }).correct, false);
  assert.equal(compile.checkResponse(item, { kind: "build", order: orderFor("i dag", "arbejder", "jeg", "at") }).correct, false);
  assert.equal(item.correctSentence, "I dag arbejder jeg hjemme.");
  assert.throws(() => compile.compileItem({ id: "t-02", kind: "build", rules: ["v2"], level: 1, prompt: "Byg.", explain: "Mismatched alternative chunks.", answer: "Jeg | kommer | i dag.", alt: ["I dag | kommer | du."] }, origin), /other chunks/u);
});

test("judge, proof and sort give fair partial credit", () => {
  const judge = compile.compileItem({ id: "t-03", kind: "judge", rules: ["v2"], level: 1, prompt: "Korrekt?", explain: "Inversion after a fronted adverbial.", text: "I dag [jeg arbejder]{arbejder jeg} hjemme." }, origin);
  assert.equal(compile.checkResponse(judge, { kind: "judge", verdict: "ok", indices: [] }).correct, false);
  assert.equal(compile.checkResponse(judge, { kind: "judge", verdict: "error", indices: [2] }).correct, true);
  assert.equal(compile.checkResponse(judge, { kind: "judge", verdict: "error", indices: [0] }).correct, false);

  const proof = compile.compileItem({ id: "t-04", kind: "proof", rules: ["v2"], level: 3, prompt: "Find 2 fejl.", explain: "Two inversions are missing.", text: "I dag [vi tager]{tager vi} toget. Bagefter [vi spiser]{spiser vi} frokost.", notes: ["F → verb.", "F → verb."] }, origin);
  const half = compile.checkResponse(proof, { kind: "proof", indices: [2] });
  assert.equal(half.correct, false);
  assert.ok(half.score > 0.4 && half.score < 0.6);
  assert.equal(compile.checkResponse(proof, { kind: "proof", indices: [2, 7] }).correct, true);
  assert.equal(compile.checkResponse(proof, { kind: "proof", indices: [2, 7, 0] }).correct, false);

  const sort = compile.compileItem({ id: "t-05", kind: "sort", rules: ["schema-main"], level: 1, prompt: "Sortér.", explain: "Subject-first clause with a sentence adverbial.", schema: "main", text: "Jeg | arbejder | ikke | i dag.", fields: ["F", "v", "a", "A"] }, origin);
  const partial = compile.checkResponse(sort, { kind: "sort", fields: ["F", "v", "a", "N"] });
  assert.equal(partial.correct, false);
  assert.equal(partial.score, 0.75);
  assert.deepEqual(partial.fieldResults, [true, true, true, false]);
});

test("rules climb a Leitner box only when due and drop on a mistake", () => {
  const start = new Date("2026-10-22T18:00:00Z");
  const item = { uid: "m2-v2:v2-01", rules: ["v2", "subject"] };
  let state = progressApi.recordGrammarAttempt(progressApi.EMPTY_GRAMMAR_PROGRESS, item, true, start);
  assert.equal(state.rules.v2.box, 1);
  assert.equal(state.rules.subject.box, 1);
  state = progressApi.recordGrammarAttempt(state, item, true, new Date(start.getTime() + 60_000));
  assert.equal(state.rules.v2.box, 1, "a second success the same evening does not promote again");
  assert.equal(progressApi.isRuleDue(state.rules.v2, new Date(start.getTime() + DAY - 5 * 3_600_000)), false);
  assert.equal(progressApi.isRuleDue(state.rules.v2, new Date(start.getTime() + DAY - 3 * 3_600_000)), true, "due a few hours early the next day");

  state = progressApi.recordGrammarAttempt(state, item, true, new Date(start.getTime() + DAY));
  assert.equal(state.rules.v2.box, 2);
  state = progressApi.recordGrammarAttempt(state, item, false, new Date(start.getTime() + DAY + 60_000));
  assert.equal(state.rules.v2.box, 0, "the main rule drops two boxes");
  assert.equal(state.rules.subject.box, 2, "the supporting rule keeps its box …");
  assert.equal(progressApi.isRuleDue(state.rules.subject, new Date(start.getTime() + DAY + 120_000)), true, "… but becomes due again");
  assert.equal(state.currentStreak, 0);
  assert.equal(state.bestStreak, 3);
  assert.deepEqual(progressApi.weakItemUids(state), ["m2-v2:v2-01"]);
});

test("lessons unlock in order, and fri navigation opens everything", () => {
  const empty = progressApi.EMPTY_GRAMMAR_PROGRESS;
  assert.equal(progressApi.isLessonUnlocked(empty, "m1-verb"), true);
  assert.equal(progressApi.isLessonUnlocked(empty, "m1-subject"), false);
  const one = completeLessons(empty, 1);
  assert.equal(progressApi.isLessonUnlocked(one, "m1-subject"), true);
  assert.equal(progressApi.nextLessonId(one), "m1-subject");
  assert.equal(progressApi.isCheckpointUnlocked(one, "m1"), false);
  assert.equal(progressApi.isCheckpointUnlocked(completeLessons(empty, 5), "m1"), true);
  assert.equal(progressApi.isLessonUnlocked(progressApi.setGrammarUnlockAll(empty, true), "m6-agreement"), true);
  const stars = progressApi.completeGrammarLesson(empty, "m1-verb", 0.95);
  assert.equal(stars.lessons["m1-verb"].stars, 3);
  assert.equal(progressApi.completeGrammarLesson(stars, "m1-verb", 0.4).lessons["m1-verb"].stars, 3, "stars never go down");
  const boss = progressApi.completeGrammarCheckpoint(empty, "m1", 0.82);
  assert.ok(boss.checkpoints.m1.passedAt);
  assert.equal(progressApi.completeGrammarCheckpoint(empty, "m1", 0.6).checkpoints.m1.passedAt, null);
});

test("a lesson session mixes in earlier rules — and only earlier ones", () => {
  const first = sessions.buildLessonSession(catalog, "m1-verb", progressApi.EMPTY_GRAMMAR_PROGRESS, 7);
  assert.equal(first.length, sessions.LESSON_NEW_ITEMS);
  assert.ok(first.every((entry) => entry.role === "new"));
  assert.equal(first[0].item.level, 1);

  const lessonIndex = GRAMMAR_LESSONS.findIndex((lesson) => lesson.id === "m3-order");
  const progress = completeLessons(progressApi.EMPTY_GRAMMAR_PROGRESS, lessonIndex);
  const session = sessions.buildLessonSession(catalog, "m3-order", progress, 11, new Date("2026-10-22T10:00:00Z"));
  const reviews = session.filter((entry) => entry.role === "review");
  assert.equal(reviews.length, sessions.lessonReviewCount(lessonIndex));
  assert.equal(new Set(session.map((entry) => entry.item.uid)).size, session.length, "no duplicates");
  for (const entry of reviews) {
    const index = GRAMMAR_LESSONS.findIndex((lesson) => lesson.id === entry.item.lessonId);
    assert.ok(index < lessonIndex, `${entry.item.uid} comes from an earlier lesson`);
  }
  assert.equal(session[0].role, "new");
  assert.equal(session[1].role, "new");
});

test("review sessions prioritise due and weak rules from completed lessons", () => {
  const now = new Date("2026-10-22T10:00:00Z");
  const settled = Object.fromEntries(GRAMMAR_LESSONS.slice(0, 8).flatMap((lesson) => lesson.rules).map((rule) => [rule, { box: 4, due: new Date(now.getTime() + 5 * DAY).toISOString(), correct: 5, incorrect: 0, lastAt: now.toISOString() }]));
  const completed = completeLessons(progressApi.EMPTY_GRAMMAR_PROGRESS, 8);
  const progress = { ...completed, rules: { ...settled, "front-comma": { box: 1, due: new Date(now.getTime() - DAY).toISOString(), correct: 1, incorrect: 2, lastAt: now.toISOString() } } };
  const review = sessions.buildReviewSession(catalog, progress, 3, now);
  assert.ok(review.length >= 10);
  assert.equal(review.filter((entry) => entry.item.rules[0] === "front-comma").length, 2, "the due rule gets two items");
  const allowed = new Set(GRAMMAR_LESSONS.slice(0, 8).map((lesson) => lesson.id));
  assert.ok(review.every((entry) => allowed.has(entry.item.lessonId)));
  assert.deepEqual(sessions.buildReviewSession(catalog, progressApi.EMPTY_GRAMMAR_PROGRESS, 3, now), []);

  const uid = review[0].item.uid;
  const failed = progressApi.recordGrammarAttempt(progress, review[0].item, false, now);
  const repair = sessions.buildMistakeSession(catalog, failed, 5);
  assert.deepEqual(repair.map((entry) => entry.item.uid), [uid]);
  assert.equal(repair[0].role, "repair");
});

test("checkpoint sessions play every boss item", () => {
  for (const courseModule of GRAMMAR_MODULES) {
    const boss = sessions.buildCheckpointSession(catalog, courseModule.id, 9);
    assert.equal(boss.length, catalog.checkpointEntries.get(courseModule.id).length);
    assert.ok(boss.some((entry) => entry.item.kind === "proof"), `${courseModule.id} has an exam-style proofreading text`);
  }
});

test("progress from older saves is normalised safely", () => {
  const normalised = progressApi.normalizeGrammarProgress({ totalAttempts: 4, lessons: { "m1-verb": { completedAt: "2026-10-01T00:00:00Z", runs: 1, bestAccuracy: 0.8, stars: 2 } } });
  assert.equal(normalised.totalAttempts, 4);
  assert.deepEqual(normalised.rules, {});
  assert.deepEqual(normalised.seenTheory, []);
  assert.equal(normalised.unlockAll, false);
  assert.deepEqual(progressApi.normalizeGrammarProgress(null), progressApi.EMPTY_GRAMMAR_PROGRESS);
});

test("the attempt log records what was answered, how fast, and stays capped", () => {
  const judge = compile.compileItem({ id: "t-06", kind: "judge", rules: ["v2", "subject"], level: 2, prompt: "Korrekt?", explain: "Inversion after a fronted adverbial.", text: "I dag [jeg arbejder]{arbejder jeg} hjemme." }, origin);
  const response = { kind: "judge", verdict: "error", indices: [3] };
  assert.equal(compile.describeResponse(judge, response), "fejl: arbejder");
  const build = compile.compileItem({ id: "t-07", kind: "build", rules: ["v2"], level: 1, prompt: "Byg.", explain: "Fronted time phrase, then the verb.", answer: "I dag | arbejder | jeg | hjemme." }, origin, "log");
  const order = ["i dag", "jeg", "arbejder", "hjemme"].map((text) => build.chunks.indexOf(text));
  assert.equal(compile.describeResponse(build, { kind: "build", order }), "i dag jeg arbejder hjemme");

  const details = { kind: "judge", level: 2, mode: "lesson", role: "new", sessionId: "s1", score: 0, ms: 4200, answer: "fejl: arbejder" };
  const logged = progressApi.recordGrammarAttempt(progressApi.EMPTY_GRAMMAR_PROGRESS, judge, false, new Date("2026-10-23T10:00:00Z"), details);
  assert.deepEqual(logged.attemptLog, [{ at: "2026-10-23T10:00:00.000Z", uid: judge.uid, rules: ["v2", "subject"], correct: false, ...details }]);
  assert.deepEqual(progressApi.recordGrammarAttempt(progressApi.EMPTY_GRAMMAR_PROGRESS, judge, true).attemptLog, [], "no details, no log line");

  const full = { ...progressApi.EMPTY_GRAMMAR_PROGRESS, attemptLog: Array.from({ length: progressApi.MAX_ATTEMPT_LOG }, (_, index) => ({ ...details, at: String(index), uid: `u${index}`, rules: [], correct: true })) };
  const capped = progressApi.recordGrammarAttempt(full, judge, true, new Date(), details);
  assert.equal(capped.attemptLog.length, progressApi.MAX_ATTEMPT_LOG);
  assert.equal(capped.attemptLog[0].uid, "u1", "the oldest line is dropped");
  assert.equal(capped.attemptLog.at(-1).uid, judge.uid);

  const session = progressApi.logGrammarSession(progressApi.EMPTY_GRAMMAR_PROGRESS, { id: "s1", mode: "lesson", lessonId: "m2-v2", moduleId: null, startedAt: "a", endedAt: "b", finished: false, total: 3, correct: 2, score: 0.7 });
  assert.equal(session.sessionLog.length, 1);
  assert.deepEqual(progressApi.normalizeGrammarProgress({ totalAttempts: 1 }).attemptLog, []);
});
