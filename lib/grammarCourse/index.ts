import { CHECKPOINT_CONTENT, LESSON_CONTENT } from "./content";
import { buildCatalog } from "./sessions";

export * from "./compile";
export * from "./curriculum";
export * from "./progress";
export * from "./sessions";
export { parseInline, type InlineSegment } from "./markup";
export type {
  CheckpointContent,
  ExamErrorRecord,
  GrammarField,
  GrammarLessonMeta,
  GrammarModuleMeta,
  GrammarRule,
  ItemKind,
  ItemSpec,
  LessonContent,
  SortSchema,
  TheoryCard,
  TheoryExample,
  TheoryPair,
} from "./types";

export const GRAMMAR_CATALOG = buildCatalog(LESSON_CONTENT, CHECKPOINT_CONTENT);
