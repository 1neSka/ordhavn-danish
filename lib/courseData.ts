/**
 * Compatibility barrel. The real course is split under lib/course; consumers can
 * keep this stable import while persisted IDs and the legacy level order remain frozen.
 */
export * from "./course/index.ts";
