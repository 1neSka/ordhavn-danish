import assert from "node:assert/strict";
import test from "node:test";
import {
  activityHeatmap,
  dailySeries,
  grammarActiveSeconds,
  grammarBoxDistribution,
  grammarEvents,
  grammarModuleRows,
  hourOfDayCounts,
  lessonEvents,
  skillRows,
} from "../lib/learningStats.ts";
import { completeGrammarLesson, EMPTY_GRAMMAR_PROGRESS, logGrammarSession, recordGrammarAttempt } from "../lib/grammarCourse/progress.ts";

const now = new Date(2026, 9, 26, 16, 0, 0);
const details = (ms) => ({ kind: "choice", level: 1, mode: "lesson", role: "new", sessionId: "s1", score: 1, ms, answer: "x" });

function grammarCourse() {
  let course = EMPTY_GRAMMAR_PROGRESS;
  course = recordGrammarAttempt(course, { uid: "a", rules: ["v2"] }, true, new Date(2026, 9, 26, 9), details(4000));
  course = recordGrammarAttempt(course, { uid: "b", rules: ["v2", "subject"] }, false, new Date(2026, 9, 25, 21), { ...details(6000), score: 0 });
  course = completeGrammarLesson(course, "m2-v2", 0.5, now);
  return logGrammarSession(course, {
    id: "s1", mode: "lesson", lessonId: "m2-v2", moduleId: "m2",
    startedAt: new Date(2026, 9, 26, 9).toISOString(), endedAt: new Date(2026, 9, 26, 9, 10).toISOString(),
    finished: true, total: 2, correct: 1, score: 0.5,
  });
}

const lessons = lessonEvents([
  { id: "l1", timestamp: new Date(2026, 9, 26, 9, 30).toISOString(), correct: true, score: 1, responseMs: 3000, skill: "danske tal" },
]);

test("Grammatik attempts become statistics events next to lesson attempts", () => {
  const events = [...lessons, ...grammarEvents(grammarCourse())];
  assert.equal(events.length, 3);
  const days = dailySeries(events, 7, now);
  assert.equal(days.at(-1).total, 2);
  assert.deepEqual(days.at(-1).bySource.grammar, { total: 1, correct: 1 });
  assert.deepEqual(days.at(-1).bySource.lessons, { total: 1, correct: 1 });
  assert.equal(days.at(-2).bySource.grammar.total, 1);
});

test("skill rows keep lesson skills and grammar rules apart and name rules by title", () => {
  const rows = skillRows([...lessons, ...grammarEvents(grammarCourse())]);
  const v2 = rows.find((row) => row.source === "grammar");
  assert.equal(v2.name, "V2 og inversion");
  assert.equal(v2.attempts, 2);
  assert.equal(v2.accuracy, 50);
  assert.ok(rows.some((row) => row.source === "lessons" && row.name === "danske tal"));
});

test("heatmap, hours, boxes and modules summarise the logs", () => {
  const course = grammarCourse();
  const events = [...lessons, ...grammarEvents(course)];
  const weeks = activityHeatmap(events, 4, now);
  assert.equal(weeks.length, 4);
  assert.equal(weeks.flat().find((cell) => cell.key === "2026-10-26").count, 2);
  const hours = hourOfDayCounts(events);
  assert.equal(hours[9], 2);
  assert.equal(hours[21], 1);
  assert.equal(grammarBoxDistribution(course).reduce((sum, count) => sum + count, 0), 1);
  const m2 = grammarModuleRows(course).find((row) => row.id === "m2");
  assert.equal(m2.lessonsDone, 1);
  assert.equal(m2.attempts, 2);
  assert.equal(m2.accuracy, 50);
  assert.equal(grammarActiveSeconds(course), 600);
});
