import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const ui = await import("../app/grammar-course-game.tsx");
const course = await import("../lib/grammarCourse/index.ts");

const noop = () => {};
const entries = [...course.GRAMMAR_CATALOG.byUid.values()];

test("the hub renders the whole path from an empty save", () => {
  const html = renderToString(createElement(ui.default, { progress: course.EMPTY_GRAMMAR_PROGRESS, onUpdate: noop }));
  assert.match(html, /Din eksamen er pensum\./u);
  assert.match(html, /Start fra bunden/u);
  for (const lesson of course.GRAMMAR_LESSONS) assert.ok(html.includes(lesson.title.replaceAll("&", "&amp;")), `${lesson.id} is listed`);
  for (const courseModule of course.GRAMMAR_MODULES) assert.ok(html.includes(courseModule.title), `${courseModule.id} is listed`);
  assert.match(html, /Slå fri navigation til/u);
  assert.match(html, /FRA DIN TALE/u);
});

test("the hub reflects progress: stars, next lesson and open bosses", () => {
  const firstModule = course.GRAMMAR_MODULES[0];
  const progress = firstModule.lessonIds.reduce((current, lessonId) => course.completeGrammarLesson(current, lessonId, 0.95), course.EMPTY_GRAMMAR_PROGRESS);
  const html = renderToString(createElement(ui.default, { progress, onUpdate: noop }));
  assert.match(html, /Fortsæt/u);
  assert.match(html, /3 af 3 stjerner/u);
  assert.match(html, /Klar til kamp/u);
});

test("every item renders unanswered, answered and with feedback", () => {
  assert.ok(entries.length > 400, `catalog has ${entries.length} items`);
  for (const entry of entries) {
    const item = course.compileItem(entry.spec, entry.origin, "ui");
    const props = { item, setResponse: noop, onEnter: noop };
    const blank = renderToString(createElement(ui.TaskBody, { ...props, response: course.emptyResponse(item), check: null }));
    assert.ok(blank.length > 50, `${item.uid} renders`);
    const response = course.canonicalResponse(item);
    const check = course.checkResponse(item, response);
    assert.equal(check.correct, true, `${item.uid} accepts its own answer`);
    renderToString(createElement(ui.TaskBody, { ...props, response, check }));
    const feedback = renderToString(createElement(ui.Feedback, { item, check }));
    assert.match(feedback, /RIGTIGT/u, `${item.uid} shows positive feedback`);
  }
});

test("a full session card renders for every mode", () => {
  const entry = { item: course.compileItem(entries[0].spec, entries[0].origin), role: "review" };
  for (const mode of ["lesson", "review", "mistakes", "boss"]) {
    const html = renderToString(createElement(ui.ItemRunner, { entry, position: 0, total: 9, mode, sessionCorrect: 0, sessionAnswered: 0, streak: 2, onChecked: noop, onNext: noop, onExit: noop }));
    assert.match(html, /Tjek svaret/u);
    assert.match(html, /Repetition/u);
  }
});

test("theory renders every card of every lesson", () => {
  for (const lesson of course.GRAMMAR_LESSONS) {
    const cards = course.GRAMMAR_CATALOG.theory.get(lesson.id) ?? [];
    assert.ok(cards.length >= 2, `${lesson.id} has theory`);
    cards.forEach((_, card) => {
      const html = renderToString(createElement(ui.TheoryView, { lessonId: lesson.id, card, progress: course.EMPTY_GRAMMAR_PROGRESS, onCard: noop, onStart: noop, onExit: noop }));
      assert.match(html, /LEKTION/u);
    });
  }
});
