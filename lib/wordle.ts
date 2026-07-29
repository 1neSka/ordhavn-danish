import { WORDLE_ANSWERS } from "./wordleData.ts";

export type WordleTileState = "correct" | "present" | "absent";
export type WordleGameStatus = "playing" | "won" | "lost";
export type WordleGameKind = "daily" | "practice" | "path";

export interface WordleGameSnapshot {
  key: string;
  kind: WordleGameKind;
  answer: string;
  guesses: string[];
  status: WordleGameStatus;
  startedAt: string;
  updatedAt: string;
  checkpointId?: string;
}

export interface WordleRun {
  id: string;
  gameKey: string;
  kind: WordleGameKind;
  answer: string;
  success: boolean;
  attempts: number;
  completedAt: string;
  checkpointId?: string;
}

export interface WordlePathCheckpoint {
  id: string;
  afterLevelIndex: number;
  title: string;
  subtitle: string;
}

export const WORDLE_PATH_CHECKPOINTS: WordlePathCheckpoint[] = [
  { id: "ordle-a1-kajen", afterLevelIndex: 2, title: "Fem bogstaver ved kajen", subtitle: "Et kort A1-ordpuslespil mellem missionerne." },
  { id: "ordle-a2-vagten", afterLevelIndex: 5, title: "Nattevagtens kodeord", subtitle: "Find dagens havneord på højst seks forsøg." },
  { id: "ordle-a2-ordlager", afterLevelIndex: 7, title: "Ordlageret", subtitle: "Et femtegns checkpoint før B1-sejladsen." },
  { id: "ordle-b1-fyrtaarn", afterLevelIndex: 8, title: "Fyrtårnets signal", subtitle: "B1-checkpoint: brug mønstre, ikke oversættelse." },
];

const tilePriority: Record<WordleTileState, number> = { absent: 0, present: 1, correct: 2 };

export function normalizeWordleWord(value: string) {
  const normalized = value.trim().normalize("NFC").toLocaleLowerCase("da-DK");
  return /^[a-zæøå]{5}$/u.test(normalized) ? normalized : null;
}

export function scoreWordleGuess(answerValue: string, guessValue: string): WordleTileState[] {
  const answer = normalizeWordleWord(answerValue);
  const guess = normalizeWordleWord(guessValue);
  if (!answer || !guess) throw new Error("Wordle scoring requires two five-letter Danish words.");

  const answerLetters = [...answer];
  const guessLetters = [...guess];
  const states: WordleTileState[] = Array(5).fill("absent");
  const remaining = new Map<string, number>();

  for (let index = 0; index < 5; index += 1) {
    if (guessLetters[index] === answerLetters[index]) {
      states[index] = "correct";
    } else {
      remaining.set(answerLetters[index], (remaining.get(answerLetters[index]) ?? 0) + 1);
    }
  }

  for (let index = 0; index < 5; index += 1) {
    if (states[index] === "correct") continue;
    const available = remaining.get(guessLetters[index]) ?? 0;
    if (available > 0) {
      states[index] = "present";
      remaining.set(guessLetters[index], available - 1);
    }
  }
  return states;
}

export function wordleKeyboardState(answer: string, guesses: readonly string[]) {
  const keyboard: Record<string, WordleTileState> = {};
  for (const guess of guesses) {
    const states = scoreWordleGuess(answer, guess);
    [...guess].forEach((letter, index) => {
      const next = states[index];
      if (!keyboard[letter] || tilePriority[next] > tilePriority[keyboard[letter]]) keyboard[letter] = next;
    });
  }
  return keyboard;
}

export function wordleSeed(value: string) {
  let hash = 2_166_136_261;
  for (const character of value.normalize("NFC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function selectWordleAnswer(seed: string) {
  return WORDLE_ANSWERS[wordleSeed(seed) % WORDLE_ANSWERS.length];
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createWordleGame(key: string, kind: WordleGameKind, checkpointId?: string): WordleGameSnapshot {
  const now = new Date().toISOString();
  return {
    key,
    kind,
    answer: selectWordleAnswer(key),
    guesses: [],
    status: "playing",
    startedAt: now,
    updatedAt: now,
    ...(checkpointId ? { checkpointId } : {}),
  };
}
