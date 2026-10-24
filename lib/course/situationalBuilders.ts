import {
  buildChoice, buildClozeMulti, buildCollocationLock, buildCompress, buildErrorHunt,
  buildEvidentialTag, buildFreeRewrite, buildInflectionForge, buildInput,
  buildRegisterMatch, buildTextOrder, buildTransform, buildWordOrder,
} from "./builders.ts";
import type { BaseItem, ClozeMultiSegment, CourseItem, Difficulty, Mission, RegisterMatchItem } from "./types.ts";

/** Authoring helpers for the situational spiral. IDs are allocated in lesson order. */
export function situationalItems(missionId: string, skill: string, tags: string[], difficulty: Difficulty = 3) {
  let questionNumber = 0;
  function base(prompt: string, answer: string, translation: string, hint: string, explanation: string, produce = false): Omit<BaseItem, "assets"> {
    questionNumber += 1;
    return {
      id: `${missionId}-q${String(questionNumber).padStart(2, "0")}`,
      prompt, answer, translation, hint, explanation, skill, tags: [...tags], difficulty,
      modality: produce ? "produce" : "read",
    };
  }
  return {
    choice(prompt: string, options: [string, string, string], translation: string, hint: string, explanation: string) {
      return buildChoice({ ...base(prompt, options[0], translation, hint, explanation), options });
    },
    input(prompt: string, answer: string, translation: string, hint: string, explanation: string, alternatives: string[] = []) {
      return buildInput({ ...base(prompt, answer, translation, hint, explanation, true), acceptedAnswers: [answer, ...alternatives] });
    },
    order(prompt: string, answer: string, translation: string, hint: string, explanation: string, alternatives: string[] = []) {
      return buildWordOrder({ ...base(prompt, answer, translation, hint, explanation, true), tokens: answer.split(/\s+/u), acceptedAnswers: [answer, ...alternatives] });
    },
    repair(prompt: string, sentence: string, wrong: string, correction: string, translation: string, hint: string, explanation: string) {
      const sentenceTokens = sentence.split(/\s+/u);
      const errorIndex = sentenceTokens.indexOf(wrong);
      if (errorIndex < 0 || sentenceTokens.lastIndexOf(wrong) !== errorIndex) throw new Error(`${missionId}: ambiguous error token ${wrong}`);
      return buildErrorHunt({ ...base(prompt, correction, translation, hint, explanation, true), sentenceTokens, errorIndex, correction });
    },
    inflect(prompt: string, lemma: string, targetDescription: string, answer: string, translation: string, hint: string, explanation: string) {
      return buildInflectionForge({ ...base(prompt, answer, translation, hint, explanation, true), lemma, targetDescription, acceptedAnswers: [answer] });
    },
    cloze(prompt: string, segments: ClozeMultiSegment[], translation: string, hint: string, explanation: string) {
      const answer = segments.map((segment) => "text" in segment ? segment.text : segment.answer).join("");
      return buildClozeMulti({ ...base(prompt, answer, translation, hint, explanation, true), segments });
    },
    link(prompt: string, anchor: string, options: [string, string, string], relation: "verb-noun" | "adjective-preposition" | "verb-preposition", translation: string, hint: string, explanation: string) {
      return buildCollocationLock({ ...base(prompt, options[0], translation, hint, explanation), anchor, options, relation });
    },
    evidence(prompt: string, statement: string, sourceStatus: "observed" | "reported" | "uncertain" | "inferred", translation: string, hint: string, explanation: string) {
      const answers = { observed: "observeret", reported: "gengivet", uncertain: "usikker", inferred: "udledt" };
      return buildEvidentialTag({ ...base(prompt, answers[sourceStatus], translation, hint, explanation), statement, sourceStatus, options: Object.values(answers) });
    },
    paragraph(prompt: string, sentences: [string, string, string, string, string], translation: string, hint: string, explanation: string) {
      const rows = sentences.map((text, index) => ({ id: `s${index + 1}`, text }));
      const correctOrder = rows.map((row) => row.id);
      const answer = correctOrder.join(">");
      return buildTextOrder({ ...base(prompt, answer, translation, hint, explanation, true), sentences: rows, correctOrder, tokens: [...correctOrder], acceptedAnswers: [answer] });
    },
    transform(prompt: string, sourceSentence: string, instruction: string, answer: string, translation: string, hint: string, explanation: string, alternatives: string[] = []) {
      return buildTransform({ ...base(prompt, answer, translation, hint, explanation, true), sourceSentence, instruction, acceptedAnswers: [answer, ...alternatives] });
    },
    match(prompt: string, intent: string, pairs: RegisterMatchItem["pairs"], translation: string, hint: string, explanation: string) {
      return buildRegisterMatch({ ...base(prompt, pairs.map((pair) => pair.utterance).join(" | "), translation, hint, explanation), intent, pairs });
    },
    rewrite(prompt: string, sourceText: string, instruction: string, requiredFacts: string[], translation: string, hint: string, explanation: string, minWords = 35) {
      return buildFreeRewrite({ ...base(prompt, "AI-bedømt omskrivning", translation, hint, explanation, true), sourceText, instruction, minWords, aiPolicy: { mode: "grade", task: "free-rewrite", skipWhenUnavailable: true, requiredFacts } });
    },
    compress(prompt: string, sourceText: string, requiredFacts: string[], maxWords: number, translation: string, hint: string, explanation: string) {
      return buildCompress({ ...base(prompt, "AI-bedømt resumé", translation, hint, explanation, true), sourceText, requiredFacts, maxWords, minWords: 15, aiPolicy: { mode: "grade", task: "compress", skipWhenUnavailable: true, requiredFacts, maxWords } });
    },
  };
}

export function situationalMission(id: string, title: string, subtitle: string, icon: string, xp: number, questions: CourseItem[]): Mission {
  return { id, title, subtitle, icon, estimatedMinutes: 7, xp, questions };
}
