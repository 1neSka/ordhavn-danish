"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, RotateCcw, Sparkles, Trophy } from "lucide-react";

import { lookupDanishWord } from "@/lib/dictionaryData";
import { WORDLE_DATA_META, WORDLE_GUESSES } from "@/lib/wordleData";
import {
  createWordleGame,
  localDateKey,
  normalizeWordleWord,
  scoreWordleGuess,
  wordleKeyboardState,
  type WordleGameKind,
  type WordleGameSnapshot,
  type WordlePathCheckpoint,
  type WordleRun,
} from "@/lib/wordle";

import styles from "./wordle-game.module.css";

export type WordleLaunch =
  | { kind: "daily" }
  | { kind: "path"; checkpoint: WordlePathCheckpoint };

interface WordleGameProps {
  launch: WordleLaunch;
  savedGames: Record<string, WordleGameSnapshot>;
  runs: WordleRun[];
  onSave: (game: WordleGameSnapshot) => void;
  onComplete: (run: WordleRun) => void;
  onExitPath: () => void;
}

const acceptedGuesses = new Set(WORDLE_GUESSES);
const keyboardRows = ["qwertyuiopå", "asdfghjklæø", "zxcvbnm"];

function runId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ordle-${Date.now()}`;
}

export default function WordleGame({ launch, savedGames, runs, onSave, onComplete, onExitPath }: WordleGameProps) {
  const [practiceKey, setPracticeKey] = useState<string | null>(null);
  const [pathRetryKey, setPathRetryKey] = useState<string | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState("");

  const kind: WordleGameKind = launch.kind === "path" ? "path" : practiceKey ? "practice" : "daily";
  const gameKey = launch.kind === "path"
    ? pathRetryKey ?? `path:${launch.checkpoint.id}`
    : practiceKey ?? `daily:${localDateKey()}`;
  const checkpointId = launch.kind === "path" ? launch.checkpoint.id : undefined;
  const [game, setGame] = useState<WordleGameSnapshot>(() => savedGames[gameKey] ?? createWordleGame(gameKey, kind, checkpointId));

  useEffect(() => {
    setGame(savedGames[gameKey] ?? createWordleGame(gameKey, kind, checkpointId));
    setCurrentGuess("");
    setMessage("");
  }, [checkpointId, gameKey, kind, savedGames]);

  const keyboardState = useMemo(() => wordleKeyboardState(game.answer, game.guesses), [game.answer, game.guesses]);
  const answerLookup = game.status === "playing" ? null : lookupDanishWord(game.answer);
  const wins = runs.filter((run) => run.success).length;
  const completedRuns = runs.length;

  const submitGuess = useCallback(() => {
    if (game.status !== "playing") return;
    const guess = normalizeWordleWord(currentGuess);
    if (!guess) {
      setMessage("Ordet skal have præcis fem bogstaver.");
      return;
    }
    if (!acceptedGuesses.has(guess)) {
      setMessage("Ordet findes ikke i den store gætteliste.");
      return;
    }

    const guesses = [...game.guesses, guess];
    const success = guess === game.answer;
    const status = success ? "won" : guesses.length >= 6 ? "lost" : "playing";
    const completedAt = new Date().toISOString();
    const next: WordleGameSnapshot = { ...game, guesses, status, updatedAt: completedAt };
    setGame(next);
    onSave(next);
    setCurrentGuess("");
    setMessage(success ? "Du fandt havneordet!" : status === "lost" ? `Ordet var ${game.answer.toLocaleUpperCase("da-DK")}.` : "");

    if (status !== "playing") {
      onComplete({
        id: runId(),
        gameKey: game.key,
        kind: game.kind,
        answer: game.answer,
        success,
        attempts: guesses.length,
        completedAt,
        ...(game.checkpointId ? { checkpointId: game.checkpointId } : {}),
      });
    }
  }, [currentGuess, game, onComplete, onSave]);

  const typeLetter = useCallback((letter: string) => {
    if (game.status !== "playing") return;
    setMessage("");
    if (letter === "enter") {
      submitGuess();
    } else if (letter === "backspace") {
      setCurrentGuess((value) => value.slice(0, -1));
    } else if (/^[a-zæøå]$/u.test(letter)) {
      setCurrentGuess((value) => value.length < 5 ? value + letter : value);
    }
  }, [game.status, submitGuess]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLocaleLowerCase("da-DK");
      if (key === "enter" || key === "backspace" || /^[a-zæøå]$/u.test(key)) {
        event.preventDefault();
        typeLetter(key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [typeLetter]);

  const startPractice = () => {
    setPracticeKey(`practice:${Date.now()}`);
    setPathRetryKey(null);
  };

  const retryPath = () => {
    if (launch.kind !== "path") return;
    setPathRetryKey(`path:${launch.checkpoint.id}:retry:${Date.now()}`);
  };

  const title = launch.kind === "path" ? launch.checkpoint.title : kind === "practice" ? "Fri Ordle-træning" : "Dagens Ordle";
  const subtitle = launch.kind === "path"
    ? launch.checkpoint.subtitle
    : kind === "practice"
      ? "Et nyt ord uden dagsbegrænsning."
      : `${localDateKey()} · samme ord hele dagen`;

  return (
    <div className={`view ${styles.view}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          {launch.kind === "path" && <button className={styles.backButton} onClick={onExitPath}><ArrowLeft size={17} /> Tilbage til stien</button>}
          <p className="eyebrow">ORDHAVN · FEM BOGSTAVER</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className={styles.stats}>
          <div><strong>{completedRuns}</strong><span>spil</span></div>
          <div><strong>{completedRuns ? Math.round((wins / completedRuns) * 100) : 0}%</strong><span>vundet</span></div>
          <div><strong>{WORDLE_DATA_META.answerCount}</strong><span>sikre svar</span></div>
        </div>
      </section>

      <div className={styles.layout}>
        <section className={styles.gamePanel} aria-label="Dansk Ordle">
          <div className={styles.board}>
            {Array.from({ length: 6 }, (_, rowIndex) => {
              const submitted = game.guesses[rowIndex];
              const letters = submitted ? [...submitted] : rowIndex === game.guesses.length ? [...currentGuess.padEnd(5, " ")] : Array(5).fill(" ");
              const states = submitted ? scoreWordleGuess(game.answer, submitted) : [];
              return (
                <div className={styles.row} key={rowIndex}>
                  {letters.map((letter, letterIndex) => (
                    <span
                      className={`${styles.tile} ${letter.trim() ? styles.filled : ""} ${states[letterIndex] ? styles[states[letterIndex]] : ""}`}
                      style={{ animationDelay: submitted ? `${letterIndex * 70}ms` : "0ms" }}
                      key={letterIndex}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>

          <div className={`${styles.message} ${message ? styles.visible : ""}`} role="status">{message || "Fem danske bogstaver"}</div>

          <div className={styles.keyboard} aria-label="Skærmtastatur">
            {keyboardRows.map((row) => (
              <div className={styles.keyboardRow} key={row}>
                {row === keyboardRows[2] && <button className={styles.wideKey} onClick={() => typeLetter("enter")}>ENTER</button>}
                {[...row].map((letter) => <button className={keyboardState[letter] ? styles[keyboardState[letter]] : ""} key={letter} onClick={() => typeLetter(letter)}>{letter.toLocaleUpperCase("da-DK")}</button>)}
                {row === keyboardRows[2] && <button className={styles.wideKey} onClick={() => typeLetter("backspace")} aria-label="Slet sidste bogstav">⌫</button>}
              </div>
            ))}
          </div>

          {game.status !== "playing" && <div className={`${styles.result} ${game.status === "won" ? styles.win : styles.loss}`}>
            <span className={styles.resultIcon}>{game.status === "won" ? <Trophy size={25} /> : <Sparkles size={25} />}</span>
            <div>
              <p>{game.status === "won" ? "LØST" : "AFSLØRET"}</p>
              <h2>{game.answer.toLocaleUpperCase("da-DK")}</h2>
              {answerLookup && <span>{answerLookup.entry.english} · {answerLookup.entry.partOfSpeech}</span>}
            </div>
            {launch.kind === "path"
              ? game.status === "won"
                ? <button className="primary-button" onClick={onExitPath}><Check size={16} /> Tilbage til stien</button>
                : <button className="primary-button" onClick={retryPath}><RotateCcw size={16} /> Nyt checkpointord</button>
              : <button className="primary-button" onClick={startPractice}><RotateCcw size={16} /> Nyt øveord</button>}
          </div>}
        </section>

        <aside className={styles.guide}>
          <p className="eyebrow">SÅDAN LÆSER DU FELTET</p>
          <h2>Tre signaler. Seks forsøg.</h2>
          <p>Hvert gæt skal være et dansk ord på fem bogstaver. Æ, Ø og Å har deres egne taster.</p>
          <div className={styles.example}><span className={styles.correct}>K</span><span>A</span><span>F</span><span>F</span><span>E</span><p><strong>K</strong> står rigtigt.</p></div>
          <div className={styles.example}><span>H</span><span className={styles.present}>A</span><span>V</span><span>N</span><span>E</span><p><strong>A</strong> findes, men står forkert.</p></div>
          <div className={styles.example}><span>S</span><span>K</span><span className={styles.absent}>I</span><span>B</span><span>E</span><p><strong>I</strong> er ikke med i ordet.</p></div>
          <div className={styles.listNote}>
            <strong>To ordlister</strong>
            <span>{WORDLE_DATA_META.answerCount} hyppige svar · {WORDLE_DATA_META.guessCount.toLocaleString("da-DK")} accepterede gæt</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
