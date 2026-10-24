import { legacyCourseLevels } from "./legacyLevels.ts";
import { level15 } from "./levels/level-15.ts";
import { level16 } from "./levels/level-16.ts";
import { level17 } from "./levels/level-17.ts";
import { level18 } from "./levels/level-18.ts";
import { level19 } from "./levels/level-19.ts";
import { level20 } from "./levels/level-20.ts";
import { level21 } from "./levels/level-21.ts";
import { level22 } from "./levels/level-22.ts";
import { level23 } from "./levels/level-23.ts";
import { level24 } from "./levels/level-24.ts";
import { level25 } from "./levels/level-25.ts";
import type { CourseLevel } from "./types.ts";

export * from "./types.ts";
export * from "./builders.ts";
export { legacyCourseLevels } from "./legacyLevels.ts";
export { level15 } from "./levels/level-15.ts";
export { level16 } from "./levels/level-16.ts";
export { level17 } from "./levels/level-17.ts";
export { level18 } from "./levels/level-18.ts";
export { level19 } from "./levels/level-19.ts";
export { level20 } from "./levels/level-20.ts";
export { level21 } from "./levels/level-21.ts";
export { level22 } from "./levels/level-22.ts";
export { level23 } from "./levels/level-23.ts";
export { level24 } from "./levels/level-24.ts";
export { level25 } from "./levels/level-25.ts";

export const situationalCourseLevels: readonly CourseLevel[] = [
  level21, level22, level23, level24, level25,
];

/** Stable append-only order: persisted level and mission IDs never move. */
export const expansionCourseLevels: readonly CourseLevel[] = [
  level15,
  level16,
  level17,
  level18,
  level19,
  level20,
  ...situationalCourseLevels,
];

export const courseLevels: CourseLevel[] = [
  ...legacyCourseLevels,
  ...expansionCourseLevels,
];
