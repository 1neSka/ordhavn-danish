"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, ExternalLink, Languages, LoaderCircle } from "lucide-react";
import {
  lookupDanishWord,
  normalizeSelectedDanishWord,
  type DictionaryLookup,
  type DanishPartOfSpeech,
} from "@/lib/dictionaryData";
import type { OnlineDictionaryLookup } from "@/lib/onlineDictionary";
import styles from "./selection-dictionary.module.css";

type AnchorRect = Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">;

type PopoverState =
  | { kind: "local"; lookup: DictionaryLookup; anchor: AnchorRect }
  | { kind: "online"; lookup: OnlineDictionaryLookup; anchor: AnchorRect }
  | { kind: "loading"; normalized: string; anchor: AnchorRect };

type OnlineDictionaryResponse =
  | { found: true; lookup: OnlineDictionaryLookup }
  | { found: false; reason?: string };

const partLabels: Readonly<Record<DanishPartOfSpeech, string>> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  pronoun: "pronoun",
  preposition: "preposition",
  conjunction: "conjunction",
  determiner: "article / determiner",
  number: "number",
  interjection: "interjection",
  "proper noun": "proper noun",
  "noun / verb": "noun / verb",
};

function nodeElement(node: Node | null): Element | null {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
}

function isEditableSelection(selection: Selection): boolean {
  const activeElement = document.activeElement;
  if (activeElement?.matches("input, textarea, [contenteditable]:not([contenteditable='false'])")) return true;
  return [selection.anchorNode, selection.focusNode].some((node) => {
    const element = nodeElement(node);
    if (!element) return false;
    return Boolean(element.closest("input, textarea, [contenteditable]:not([contenteditable='false'])"));
  });
}

function selectionRect(range: Range): DOMRect | null {
  const bounding = range.getBoundingClientRect();
  if (bounding.width > 0 || bounding.height > 0) return bounding;
  const rects = range.getClientRects();
  return rects.length ? rects[0] : null;
}

export default function SelectionDictionary() {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const selectedWordRef = useRef<string | null>(null);
  const pendingWordRef = useRef<string | null>(null);
  const onlineCacheRef = useRef(new Map<string, OnlineDictionaryLookup | null>());

  useEffect(() => {
    const close = () => {
      requestRef.current?.abort();
      requestRef.current = null;
      pendingWordRef.current = null;
      selectedWordRef.current = null;
      setPopover(null);
    };
    const inspectSelection = () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount !== 1 || isEditableSelection(selection)) {
          close();
          return;
        }
        const normalized = normalizeSelectedDanishWord(selection.toString());
        if (!normalized) {
          close();
          return;
        }
        const rect = selectionRect(selection.getRangeAt(0));
        if (!rect) {
          close();
          return;
        }
        const anchor = {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
        const localLookup = lookupDanishWord(normalized);
        if (localLookup) {
          requestRef.current?.abort();
          requestRef.current = null;
          pendingWordRef.current = null;
          selectedWordRef.current = normalized;
          setPopover({ kind: "local", lookup: localLookup, anchor });
          return;
        }
        if (normalized.length < 4) {
          close();
          return;
        }

        selectedWordRef.current = normalized;
        if (onlineCacheRef.current.has(normalized)) {
          const cached = onlineCacheRef.current.get(normalized) ?? null;
          setPopover(cached ? { kind: "online", lookup: cached, anchor } : null);
          return;
        }
        if (pendingWordRef.current === normalized) return;

        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        pendingWordRef.current = normalized;
        setPopover({ kind: "loading", normalized, anchor });
        void fetch(`/api/dictionary/lookup?word=${encodeURIComponent(normalized)}`, { signal: controller.signal })
          .then(async (response) => {
            const payload = await response.json() as OnlineDictionaryResponse;
            if (!response.ok || !payload.found) {
              if (response.status === 404) onlineCacheRef.current.set(normalized, null);
              if (selectedWordRef.current === normalized) setPopover(null);
              return;
            }
            onlineCacheRef.current.set(normalized, payload.lookup);
            if (selectedWordRef.current === normalized) {
              setPopover({ kind: "online", lookup: payload.lookup, anchor });
            }
          })
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === "AbortError") return;
            if (selectedWordRef.current === normalized) setPopover(null);
          })
          .finally(() => {
            if (pendingWordRef.current === normalized) pendingWordRef.current = null;
            if (requestRef.current === controller) requestRef.current = null;
          });
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("selectionchange", inspectSelection);
    document.addEventListener("mouseup", inspectSelection);
    document.addEventListener("touchend", inspectSelection, { passive: true });
    const closeOutside = (event: PointerEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      close();
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("selectionchange", inspectSelection);
      document.removeEventListener("mouseup", inspectSelection);
      document.removeEventListener("touchend", inspectSelection);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      requestRef.current?.abort();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const element = popoverRef.current;
    if (!element || !popover) return;
    const margin = 10;
    const gap = 9;
    const box = element.getBoundingClientRect();
    const center = popover.anchor.left + popover.anchor.width / 2;
    const left = Math.max(margin, Math.min(window.innerWidth - box.width - margin, center - box.width / 2));
    const below = popover.anchor.bottom + gap;
    const top = below + box.height <= window.innerHeight - margin
      ? below
      : Math.max(margin, popover.anchor.top - box.height - gap);
    element.style.left = `${Math.round(left)}px`;
    element.style.top = `${Math.round(top)}px`;
    element.style.visibility = "visible";
  }, [popover]);

  if (!popover) return null;
  if (popover.kind === "loading") {
    return (
      <div className={styles.popover} ref={popoverRef} role="status" aria-live="polite">
        <div className={styles.heading}>
          <span className={styles.icon}><LoaderCircle className={styles.spinner} size={15} /></span>
          <div><strong>{popover.normalized}</strong></div>
          <span className={styles.part}>online</span>
        </div>
        <div className={styles.translation}>Searching Kaikki and Wiktionary…</div>
      </div>
    );
  }

  if (popover.kind === "online") {
    const online = popover.lookup;
    return (
      <div className={styles.popover} ref={popoverRef} role="status" aria-live="polite">
        <div className={styles.heading}>
          <span className={styles.icon}><Languages size={15} /></span>
          <div>
            <strong>{online.headword}</strong>
            {online.selectedWord !== online.headword && <small>selected: {online.selectedWord}</small>}
          </div>
          <span className={styles.part}>{online.partOfSpeech ?? "online"}</span>
        </div>
        <div className={styles.translation}>{online.english.join("; ")}</div>
        {online.formNote && <div className={styles.form}><BookOpen size={13} /><span>{online.formNote}</span></div>}
        <div className={styles.source}>
          <span>online fallback</span>
          <a href={online.sourceUrl} target="_blank" rel="noreferrer" onPointerDown={(event) => event.preventDefault()}>
            {online.sourceName} <ExternalLink size={10} />
          </a>
          <a href={online.licenseUrl} target="_blank" rel="noreferrer" onPointerDown={(event) => event.preventDefault()}>CC BY-SA 4.0</a>
        </div>
      </div>
    );
  }

  const { entry, alternatives, normalized } = popover.lookup;
  return (
    <div className={styles.popover} ref={popoverRef} role="status" aria-live="polite">
      <div className={styles.heading}>
        <span className={styles.icon}><Languages size={15} /></span>
        <div>
          <strong>{entry.headword}</strong>
          {normalized !== entry.headword && <small>selected: {normalized}</small>}
        </div>
        <span className={styles.part}>{partLabels[entry.partOfSpeech]}</span>
      </div>
      <div className={styles.translation}>{entry.english}</div>
      {(entry.gender || entry.form) && (
        <div className={styles.form}>
          <BookOpen size={13} />
          {entry.gender && <b>{entry.gender}</b>}
          {entry.form && <span>{entry.form}</span>}
        </div>
      )}
      {entry.note && <p className={styles.note}>{entry.note}</p>}
      {alternatives.length > 0 && (
        <div className={styles.alternatives}>
          <span>also</span>
          {alternatives.slice(0, 2).map((alternative) => (
            <div key={`${alternative.headword}-${alternative.partOfSpeech}`}>
              <b>{partLabels[alternative.partOfSpeech]}</b>
              <strong>{alternative.english}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
