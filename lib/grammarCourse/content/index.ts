import type { CheckpointContent, LessonContent } from "../types";
import m1Verb from "./m1-verb";
import m1Subject from "./m1-subject";
import m1Led from "./m1-led";
import m1Adverbial from "./m1-adverbial";
import m1Clauses from "./m1-clauses";
import m1Boss from "./m1-boss";
import m2Schema from "./m2-schema";
import m2V2 from "./m2-v2";
import m2Front from "./m2-front";
import m2Adverb from "./m2-adverb";
import m2Chain from "./m2-chain";
import m2Coord from "./m2-coord";
import m2Questions from "./m2-questions";
import m2Boss from "./m2-boss";
import m3Order from "./m3-order";
import m3Front from "./m3-front";
import m3Connectors from "./m3-connectors";
import m3Indirect from "./m3-indirect";
import m3Relative from "./m3-relative";
import m3Boss from "./m3-boss";
import m4Content from "./m4-content";
import m4DerDet from "./m4-der-det";
import m4Shift from "./m4-shift";
import m4Complex from "./m4-complex";
import m4Boss from "./m4-boss";
import m5HvisOm from "./m5-hvis-om";
import m5Hvilket from "./m5-hvilket";
import m5At from "./m5-at";
import m5Place from "./m5-place";
import m5Time from "./m5-time";
import m5Fixed from "./m5-fixed";
import m5Small from "./m5-small";
import m5Boss from "./m5-boss";
import m6Definite from "./m6-definite";
import m6When from "./m6-when";
import m6Agreement from "./m6-agreement";
import m6Boss from "./m6-boss";

export const LESSON_CONTENT: LessonContent[] = [
  m1Verb, m1Subject, m1Led, m1Adverbial, m1Clauses,
  m2Schema, m2V2, m2Front, m2Adverb, m2Chain, m2Coord, m2Questions,
  m3Order, m3Front, m3Connectors, m3Indirect, m3Relative,
  m4Content, m4DerDet, m4Shift, m4Complex,
  m5HvisOm, m5Hvilket, m5At, m5Place, m5Time, m5Fixed, m5Small,
  m6Definite, m6When, m6Agreement,
];

export const CHECKPOINT_CONTENT: CheckpointContent[] = [m1Boss, m2Boss, m3Boss, m4Boss, m5Boss, m6Boss];
