"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, Languages } from "lucide-react";
import { lookupDanishWord, type DictionaryLookup, type DanishPartOfSpeech } from "@/lib/dictionaryData";
import styles from "./selection-dictionary.module.css";

type AnchorRect = Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">;

type PopoverState = {
  lookup: DictionaryLookup;
  anchor: AnchorRect;
};

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

  useEffect(() => {
    const close = () => setPopover(null);
    const inspectSelection = () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount !== 1 || isEditableSelection(selection)) {
          close();
          return;
        }
        const lookup = lookupDanishWord(selection.toString());
        if (!lookup) {
          close();
          return;
        }
        const rect = selectionRect(selection.getRangeAt(0));
        if (!rect) {
          close();
          return;
        }
        setPopover({
          lookup,
          anchor: {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        });
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("selectionchange", inspectSelection);
    document.addEventListener("mouseup", inspectSelection);
    document.addEventListener("touchend", inspectSelection, { passive: true });
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("selectionchange", inspectSelection);
      document.removeEventListener("mouseup", inspectSelection);
      document.removeEventListener("touchend", inspectSelection);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
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
  const { entry, normalized } = popover.lookup;
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
    </div>
  );
}
