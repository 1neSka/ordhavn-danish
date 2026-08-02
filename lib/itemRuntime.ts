import type { Dispatch, SetStateAction } from "react";
import type { CourseItem } from "./course/types.ts";

export interface ItemResponseState {
  selected: string;
  ordered: string[];
  selections: Record<string, string>;
  activeId: string;
  errorIndex: number | null;
  correction: string;
  confidence: 50 | 60 | 70 | 80 | 90 | 100;
}

export const EMPTY_ITEM_RESPONSE: ItemResponseState = {
  selected: "",
  ordered: [],
  selections: {},
  activeId: "",
  errorIndex: null,
  correction: "",
  confidence: 70,
};

export interface ItemRenderProps {
  question: CourseItem;
  response: ItemResponseState;
  setResponse: Dispatch<SetStateAction<ItemResponseState>>;
  checked: boolean;
  correct: boolean;
  sessionId: string;
  displayOptions: string[];
  displayTokens: string[];
  onSubmit: () => void;
}

export interface KeyboardContext {
  question: CourseItem;
  response: ItemResponseState;
  displayOptions: string[];
  displayTokens: string[];
  checked: boolean;
  sessionId: string;
}
