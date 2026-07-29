export type LogicScenarioId =
  | "night-dispatch"
  | "bridge-crews"
  | "radio-allocation"
  | "lock-windows"
  | "watch-rotation"
  | "sluice-warning"
  | "water-notice"
  | "platform-change"
  | "quay-permits"
  | "medicine-recall";

export type LogicScenarioLevel = "B1" | "B2";
export type LogicScenarioEngine = "constraint-grid" | "meaning-editor";
export const LOGIC_SUBMISSION_MAX_CHARS = 4000;

export interface LogicEvaluationRequest {
  scenarioId: LogicScenarioId;
  task: "operational-note" | "public-notice";
  submission: string;
  requiredFacts: string[];
  level: LogicScenarioLevel;
}

export interface LogicEvaluationResult {
  available: boolean;
  score: number;
  verdict: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  model: string | null;
}

export interface LogicScenarioCard {
  id: LogicScenarioId;
  engine: LogicScenarioEngine;
  title: string;
  translation: string;
  level: LogicScenarioLevel;
  eyebrow: string;
  description: string;
  accent: string;
  estimatedMinutes: number;
}

export interface GlossaryEntry {
  danish: string;
  english: string;
}

export interface ConstraintSubject {
  id: string;
  label: string;
  detail: string;
}

export interface ConstraintSlot {
  id: string;
  label: string;
}

export type ConstraintRule =
  | { type: "fixed"; subject: string; slot: string }
  | { type: "not"; subject: string; slot: string }
  | { type: "before"; subject: string; other: string }
  | { type: "after"; subject: string; other: string }
  | { type: "adjacent"; subject: string; other: string }
  | { type: "not-adjacent"; subject: string; other: string }
  | { type: "immediately-before"; subject: string; other: string }
  | { type: "between"; subject: string; before: string; after: string };

export interface ConstraintClue {
  id: string;
  text: string;
  focus: "før" | "efter" | "hverken" | "fast" | "ved siden af" | "mellem";
}

export interface LogicReportTask {
  task: "operational-note" | "public-notice";
  prompt: string;
  minimumWords: number;
  requiredFacts: string[];
  criteria: Array<{ id: string; label: string; alternatives: string[][] }>;
  canonicalSubmission: string;
}

export interface ConstraintGridScenario extends LogicScenarioCard {
  engine: "constraint-grid";
  brief: string;
  subjects: ConstraintSubject[];
  slots: ConstraintSlot[];
  clues: ConstraintClue[];
  rules: ConstraintRule[];
  solution: Record<string, string>;
  report: LogicReportTask;
  glossary: GlossaryEntry[];
}

export interface MeaningChoice {
  id: string;
  text: string;
  explanation: string;
}

export interface MeaningSlot {
  id: string;
  label: string;
  question: string;
  choices: MeaningChoice[];
  correctChoiceId: string;
}

export interface MeaningEditorScenario extends LogicScenarioCard {
  engine: "meaning-editor";
  sourceMessage: string;
  sourceLabel: string;
  assignment: string;
  traps: string[];
  slots: MeaningSlot[];
  assembledSolution: string;
  report: LogicReportTask;
  glossary: GlossaryEntry[];
}

export type LogicScenario = ConstraintGridScenario | MeaningEditorScenario;

const normalize = (value: string) => value
  .toLocaleLowerCase("da-DK")
  .normalize("NFC")
  .replace(/[^a-zæøå0-9]+/gu, " ")
  .trim();

function positionOf(
  assignment: Readonly<Record<string, string>>,
  subjectId: string,
  slots: readonly ConstraintSlot[],
) {
  return slots.findIndex((slot) => slot.id === assignment[subjectId]);
}

export function satisfiesConstraintRules(
  scenario: Pick<ConstraintGridScenario, "subjects" | "slots" | "rules">,
  assignment: Readonly<Record<string, string>>,
) {
  const selected = scenario.subjects.map((subject) => assignment[subject.id]);
  if (selected.some((slot) => !slot) || new Set(selected).size !== scenario.subjects.length) return false;
  return scenario.rules.every((rule) => {
    const current = positionOf(assignment, rule.subject, scenario.slots);
    if (current < 0) return false;
    if (rule.type === "fixed") return assignment[rule.subject] === rule.slot;
    if (rule.type === "not") return assignment[rule.subject] !== rule.slot;
    if (rule.type === "between") {
      const before = positionOf(assignment, rule.before, scenario.slots);
      const after = positionOf(assignment, rule.after, scenario.slots);
      return before >= 0 && after >= 0 && before < current && current < after;
    }
    const other = positionOf(assignment, rule.other, scenario.slots);
    if (other < 0) return false;
    if (rule.type === "before") return current < other;
    if (rule.type === "after") return current > other;
    if (rule.type === "immediately-before") return current + 1 === other;
    if (rule.type === "not-adjacent") return Math.abs(current - other) !== 1;
    return Math.abs(current - other) === 1;
  });
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [Array.from(values)];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest]),
  );
}

export function enumerateConstraintSolutions(scenario: ConstraintGridScenario) {
  return permutations(scenario.slots.map((slot) => slot.id))
    .map((slots) => Object.fromEntries(scenario.subjects.map((subject, index) => [subject.id, slots[index]])))
    .filter((assignment) => satisfiesConstraintRules(scenario, assignment));
}

export function evaluateConstraintAssignment(
  scenario: ConstraintGridScenario,
  assignment: Readonly<Record<string, string>>,
) {
  const correctSubjects = scenario.subjects.filter(
    (subject) => assignment[subject.id] === scenario.solution[subject.id],
  ).length;
  return {
    success: satisfiesConstraintRules(scenario, assignment),
    correctSubjects,
    totalSubjects: scenario.subjects.length,
  };
}

export function evaluateMeaningSelection(
  scenario: MeaningEditorScenario,
  selection: Readonly<Record<string, string>>,
) {
  const correctSlots = scenario.slots.filter(
    (slot) => selection[slot.id] === slot.correctChoiceId,
  ).length;
  return {
    success: correctSlots === scenario.slots.length,
    correctSlots,
    totalSlots: scenario.slots.length,
    assembled: scenario.slots
      .map((slot) => slot.choices.find((choice) => choice.id === selection[slot.id])?.text ?? "[…]")
      .join(" "),
  };
}

function criterionMet(submission: string, alternatives: string[][]) {
  const words = new Set(normalize(submission).split(" ").filter(Boolean));
  return alternatives.some((alternative) => alternative.every((word) => words.has(normalize(word))));
}

export function evaluateLogicSubmissionOffline(scenario: LogicScenario, submission: string): LogicEvaluationResult {
  const words = normalize(submission).split(" ").filter(Boolean);
  const matched = scenario.report.criteria.filter((criterion) => criterionMet(submission, criterion.alternatives));
  const factScore = matched.length / scenario.report.criteria.length;
  const lengthScore = Math.min(1, words.length / scenario.report.minimumWords);
  const score = Math.round((factScore * 0.82 + lengthScore * 0.18) * 100) / 100;
  return {
    available: false,
    score,
    verdict: score >= 0.78 ? "Driftsklar formulering" : score >= 0.5 ? "Næsten driftsklar" : "Vigtige oplysninger mangler",
    feedback: `${matched.length} af ${scenario.report.criteria.length} betydningskrav er bevaret.`,
    strengths: matched.length ? matched.map((criterion) => criterion.label) : ["Teksten er afleveret i et sammenhængende format."],
    improvements: scenario.report.criteria
      .filter((criterion) => !matched.includes(criterion))
      .map((criterion) => `Gør dette tydeligt: ${criterion.label}`)
      .concat(words.length < scenario.report.minimumWords ? [`Skriv mindst ${scenario.report.minimumWords} ord.`] : [])
      .slice(0, 4),
    model: "deterministic-logic-rubric-v1",
  };
}

export function createLogicEvaluationRequest(scenario: LogicScenario, submission: string): LogicEvaluationRequest {
  return {
    scenarioId: scenario.id,
    task: scenario.report.task,
    submission: submission.slice(0, LOGIC_SUBMISSION_MAX_CHARS),
    requiredFacts: [...scenario.report.requiredFacts],
    level: scenario.level,
  };
}

const gridScenarios: ConstraintGridScenario[] = [
  {
    id: "night-dispatch",
    engine: "constraint-grid",
    title: "Natbussernes tavle",
    translation: "The night-bus board",
    level: "B1",
    eyebrow: "DISPONENT · RÆKKEFØLGE",
    description: "Fordel tre busser på afgange ved at læse før, efter og umiddelbart før helt præcist.",
    accent: "#55c7b3",
    estimatedMinutes: 7,
    brief: "Tre natbusser skal af sted uden at blokere hinanden. Hver bus må kun få én afgang.",
    subjects: [
      { id: "oest", label: "Østbussen", detail: "kører via centrum" },
      { id: "nord", label: "Nordbussen", detail: "medtager kørestole" },
      { id: "syd", label: "Sydbussen", detail: "har den længste rute" },
    ],
    slots: [{ id: "2210", label: "22.10" }, { id: "2225", label: "22.25" }, { id: "2240", label: "22.40" }],
    clues: [
      { id: "nb-1", text: "Nordbussen kører umiddelbart før Sydbussen.", focus: "før" },
      { id: "nb-2", text: "Østbussen kører før Nordbussen.", focus: "før" },
      { id: "nb-3", text: "Nordbussen kører hverken først eller efter Sydbussen.", focus: "hverken" },
    ],
    rules: [
      { type: "immediately-before", subject: "nord", other: "syd" },
      { type: "before", subject: "oest", other: "nord" },
    ],
    solution: { oest: "2210", nord: "2225", syd: "2240" },
    glossary: [
      { danish: "umiddelbart før", english: "immediately before" },
      { danish: "hverken … eller", english: "neither ... nor" },
      { danish: "afgang", english: "departure" },
    ],
    report: {
      task: "operational-note",
      prompt: "Skriv en kort besked til chaufførerne. Angiv alle tre busser, tiderne og hvorfor rækkefølgen ikke må byttes.",
      minimumWords: 28,
      requiredFacts: ["Østbussen 22.10", "Nordbussen 22.25", "Sydbussen 22.40", "Nord umiddelbart før Syd"],
      criteria: [
        { id: "oest", label: "Østbussen kl. 22.10", alternatives: [["østbussen", "22", "10"], ["øst", "22", "10"]] },
        { id: "nord", label: "Nordbussen kl. 22.25", alternatives: [["nordbussen", "22", "25"], ["nord", "22", "25"]] },
        { id: "syd", label: "Sydbussen kl. 22.40", alternatives: [["sydbussen", "22", "40"], ["syd", "22", "40"]] },
        { id: "order", label: "Nord kører umiddelbart før Syd", alternatives: [["nord", "før", "syd"], ["nordbussen", "før", "sydbussen"]] },
      ],
      canonicalSubmission: "Østbussen afgår kl. 22.10. Nordbussen kører kl. 22.25 umiddelbart før Sydbussen kl. 22.40. Rækkefølgen må ikke byttes, fordi Nordbussen skal ligge direkte før Sydbussen.",
    },
  },
  {
    id: "bridge-crews",
    engine: "constraint-grid",
    title: "Broholdenes skifte",
    translation: "The bridge crews' shift",
    level: "B1",
    eyebrow: "BROVAGT · PLACERING",
    description: "Placér arbejdshold ved tre fag. Et enkelt ved siden af ændrer hele planen.",
    accent: "#f1ad62",
    estimatedMinutes: 8,
    brief: "Tre hold undersøger hver sit brofag. Numrene følger rækkefølgen fra vest mod øst.",
    subjects: [
      { id: "alfa", label: "Hold Alfa", detail: "måler vibrationer" },
      { id: "beta", label: "Hold Beta", detail: "kontrollerer bolte" },
      { id: "gamma", label: "Hold Gamma", detail: "fotograferer revner" },
    ],
    slots: [{ id: "fag1", label: "Brofag 1" }, { id: "fag2", label: "Brofag 2" }, { id: "fag3", label: "Brofag 3" }],
    clues: [
      { id: "bc-1", text: "Gamma arbejder fast ved det østligste brofag, nummer 3.", focus: "fast" },
      { id: "bc-2", text: "Alfa står vest for Beta.", focus: "før" },
      { id: "bc-3", text: "Alfa og Beta arbejder ved siden af hinanden.", focus: "ved siden af" },
    ],
    rules: [
      { type: "fixed", subject: "gamma", slot: "fag3" },
      { type: "before", subject: "alfa", other: "beta" },
    ],
    solution: { alfa: "fag1", beta: "fag2", gamma: "fag3" },
    glossary: [
      { danish: "brofag", english: "bridge span" },
      { danish: "vest for", english: "west of" },
      { danish: "ved siden af", english: "next to" },
    ],
    report: {
      task: "operational-note",
      prompt: "Send en arbejdsfordeling med alle hold og brofag. Forklar relationen mellem Alfa og Beta.",
      minimumWords: 25,
      requiredFacts: ["Alfa ved brofag 1", "Beta ved brofag 2", "Gamma ved brofag 3", "Alfa vest for Beta"],
      criteria: [
        { id: "alfa", label: "Alfa ved brofag 1", alternatives: [["alfa", "brofag", "1"]] },
        { id: "beta", label: "Beta ved brofag 2", alternatives: [["beta", "brofag", "2"]] },
        { id: "gamma", label: "Gamma ved brofag 3", alternatives: [["gamma", "brofag", "3"]] },
        { id: "relation", label: "Alfa er vest for Beta", alternatives: [["alfa", "vest", "beta"], ["alfa", "før", "beta"]] },
      ],
      canonicalSubmission: "Hold Alfa arbejder ved brofag 1, vest for Hold Beta ved brofag 2. Holdene står ved siden af hinanden. Hold Gamma arbejder ved det østligste brofag, nummer 3.",
    },
  },
  {
    id: "radio-allocation",
    engine: "constraint-grid",
    title: "Tre stemmer i tågen",
    translation: "Three voices in the fog",
    level: "B2",
    eyebrow: "RADIOVAGT · UDELUKKELSE",
    description: "Tildel kanaler uden støj ved at afkode ikke lavere end og kun hvis.",
    accent: "#7ca8ff",
    estimatedMinutes: 9,
    brief: "Tre fartøjer skal have hver sin kanal. Kanalerne står i stigende rækkefølge.",
    subjects: [
      { id: "ravn", label: "Ravn", detail: "lodsbåd" },
      { id: "sael", label: "Sæl", detail: "miljøfartøj" },
      { id: "fyr", label: "Fyr", detail: "servicebåd" },
    ],
    slots: [{ id: "k2", label: "Kanal 2" }, { id: "k5", label: "Kanal 5" }, { id: "k8", label: "Kanal 8" }],
    clues: [
      { id: "ra-1", text: "Sæl bruger hverken den laveste eller den højeste kanal.", focus: "hverken" },
      { id: "ra-2", text: "Ravns kanal er højere end Sæls.", focus: "efter" },
      { id: "ra-3", text: "Fyr må ikke ligge ved siden af Ravn i kanalrækken.", focus: "hverken" },
    ],
    rules: [
      { type: "fixed", subject: "sael", slot: "k5" },
      { type: "after", subject: "ravn", other: "sael" },
    ],
    solution: { ravn: "k8", sael: "k5", fyr: "k2" },
    glossary: [
      { danish: "højere end", english: "higher than" },
      { danish: "kanalrækken", english: "the channel sequence" },
      { danish: "fartøj", english: "vessel" },
    ],
    report: {
      task: "operational-note",
      prompt: "Bekræft kanalerne i en radiomeddelelse. Brug en sammenligning med højere end.",
      minimumWords: 24,
      requiredFacts: ["Fyr kanal 2", "Sæl kanal 5", "Ravn kanal 8", "Ravn højere end Sæl"],
      criteria: [
        { id: "fyr", label: "Fyr på kanal 2", alternatives: [["fyr", "kanal", "2"]] },
        { id: "sael", label: "Sæl på kanal 5", alternatives: [["sæl", "kanal", "5"]] },
        { id: "ravn", label: "Ravn på kanal 8", alternatives: [["ravn", "kanal", "8"]] },
        { id: "compare", label: "Ravn ligger højere end Sæl", alternatives: [["ravn", "højere", "sæl"]] },
      ],
      canonicalSubmission: "Fyr kaldes på kanal 2, Sæl på kanal 5 og Ravn på kanal 8. Ravns kanal er dermed højere end Sæls, og alle tre fartøjer har hver sin forbindelse.",
    },
  },
  {
    id: "lock-windows",
    engine: "constraint-grid",
    title: "Slusens fire vinduer",
    translation: "The lock's four windows",
    level: "B2",
    eyebrow: "SLUSELEDELSE · AFSTAND",
    description: "Planlæg fire gennemsejlinger, hvor et redningsfartøj kræver plads på begge sider af sin tidskorridor.",
    accent: "#ef7d68",
    estimatedMinutes: 10,
    brief: "Fire fartøjer skal gennem slusen. En forkert nabo kan forsinke redningsberedskabet.",
    subjects: [
      { id: "fragt", label: "Fragt 12", detail: "tungt lastfartøj" },
      { id: "redning", label: "Redning 4", detail: "akut beredskab" },
      { id: "tur", label: "Turisten", detail: "passagerbåd" },
      { id: "service", label: "Service 2", detail: "vedligeholdelse" },
    ],
    slots: [
      { id: "0640", label: "06.40" },
      { id: "0700", label: "07.00" },
      { id: "0720", label: "07.20" },
      { id: "0740", label: "07.40" },
    ],
    clues: [
      { id: "lw-1", text: "Fragt 12 sejler umiddelbart før Redning 4.", focus: "før" },
      { id: "lw-2", text: "Turisten kommer senere end Redning 4.", focus: "efter" },
      { id: "lw-3", text: "Service 2 må ikke ligge ved siden af Turisten i tidsplanen.", focus: "hverken" },
    ],
    rules: [
      { type: "immediately-before", subject: "fragt", other: "redning" },
      { type: "after", subject: "tur", other: "redning" },
      { type: "not-adjacent", subject: "service", other: "tur" },
    ],
    solution: { fragt: "0700", redning: "0720", tur: "0740", service: "0640" },
    glossary: [
      { danish: "gennemsejling", english: "passage through a lock" },
      { danish: "umiddelbart", english: "immediately" },
      { danish: "ligge ved siden af", english: "be in the adjacent slot" },
    ],
    report: {
      task: "operational-note",
      prompt: "Bekræft alle fire tider, og forklar hvorfor Service 2 ikke kan ligge ved siden af Turisten.",
      minimumWords: 34,
      requiredFacts: ["Service 2 kl. 06.40", "Fragt 12 kl. 07.00", "Redning 4 kl. 07.20", "Turisten kl. 07.40"],
      criteria: [
        { id: "service", label: "Service 2 kl. 06.40", alternatives: [["service", "06", "40"]] },
        { id: "cargo", label: "Fragt 12 kl. 07.00", alternatives: [["fragt", "07", "00"]] },
        { id: "rescue", label: "Redning 4 kl. 07.20", alternatives: [["redning", "07", "20"]] },
        { id: "tour", label: "Turisten kl. 07.40", alternatives: [["turisten", "07", "40"], ["turist", "07", "40"]] },
      ],
      canonicalSubmission: "Service 2 sejler kl. 06.40. Fragt 12 følger kl. 07.00 umiddelbart før Redning 4 kl. 07.20. Turisten sejler sidst kl. 07.40, så Service 2 ikke ligger ved siden af Turisten i tidsplanen.",
    },
  },
  {
    id: "watch-rotation",
    engine: "constraint-grid",
    title: "Nattevagtens rotation",
    translation: "The night watch rotation",
    level: "B2",
    eyebrow: "VAGTPLAN · MELLEMLED",
    description: "Byg en rotation med fire vagter, hvor mellem betyder en streng orden og ikke blot en løs placering.",
    accent: "#75c990",
    estimatedMinutes: 10,
    brief: "Fire vagter overtager kontrollen én ad gangen. Den samme person må ikke få to vagter.",
    subjects: [
      { id: "omar", label: "Omar", detail: "radar" },
      { id: "liv", label: "Liv", detail: "kajkameraer" },
      { id: "signe", label: "Signe", detail: "adgangskontrol" },
      { id: "tobias", label: "Tobias", detail: "nødradio" },
    ],
    slots: [
      { id: "v1", label: "Vagt 1" },
      { id: "v2", label: "Vagt 2" },
      { id: "v3", label: "Vagt 3" },
      { id: "v4", label: "Vagt 4" },
    ],
    clues: [
      { id: "wr-1", text: "Liv har en vagt mellem Omars og Signes vagter.", focus: "mellem" },
      { id: "wr-2", text: "Tobias må ikke overtage umiddelbart før eller efter Liv.", focus: "hverken" },
      { id: "wr-3", text: "Signe afslutter rotationen på nattens fjerde vagt.", focus: "fast" },
    ],
    rules: [
      { type: "between", subject: "liv", before: "omar", after: "signe" },
      { type: "not-adjacent", subject: "tobias", other: "liv" },
      { type: "fixed", subject: "signe", slot: "v4" },
    ],
    solution: { omar: "v2", liv: "v3", signe: "v4", tobias: "v1" },
    glossary: [
      { danish: "mellem", english: "between" },
      { danish: "overtage", english: "take over" },
      { danish: "umiddelbart efter", english: "immediately after" },
    ],
    report: {
      task: "operational-note",
      prompt: "Skriv vagtskiftet til logbogen med alle fire positioner og den strenge rækkefølge Omar–Liv–Signe.",
      minimumWords: 32,
      requiredFacts: ["Tobias vagt 1", "Omar vagt 2", "Liv vagt 3", "Signe vagt 4"],
      criteria: [
        { id: "tobias", label: "Tobias tager vagt 1", alternatives: [["tobias", "vagt", "1"]] },
        { id: "omar", label: "Omar tager vagt 2", alternatives: [["omar", "vagt", "2"]] },
        { id: "liv", label: "Liv tager vagt 3", alternatives: [["liv", "vagt", "3"]] },
        { id: "signe", label: "Signe tager vagt 4", alternatives: [["signe", "vagt", "4"]] },
      ],
      canonicalSubmission: "Tobias tager nattens vagt 1, og Omar overtager vagt 2. Liv følger på vagt 3 mellem Omar og Signe. Signe afslutter rotationen på vagt 4, så Tobias ikke står umiddelbart ved siden af Liv.",
    },
  },
];

const editorScenarios: MeaningEditorScenario[] = [
  {
    id: "sluice-warning",
    engine: "meaning-editor",
    title: "Varslet ved slusen",
    translation: "The sluice warning",
    level: "B1",
    eyebrow: "VARSLING · TID & UNDTAGELSE",
    description: "Byg et varsel, hvor først, indtil og medmindre beholder deres præcise rækkevidde.",
    accent: "#d77d9c",
    estimatedMinutes: 7,
    sourceLabel: "Driftsradio kl. 18.05",
    sourceMessage: "Gangbroen er åben nu. Den lukker først kl. 21.00. Hvis vinden overstiger 18 m/s, lukker vagten den dog tidligere.",
    assignment: "Redigér radioens oplysninger til ét offentligt varsel uden at love for meget.",
    traps: ["først betyder ikke før", "medmindre indfører en undtagelse", "åben nu er ikke det samme som åben hele aftenen"],
    slots: [
      { id: "now", label: "Nuværende status", question: "Hvad gælder lige nu?", correctChoiceId: "open", choices: [
        { id: "open", text: "Gangbroen er åben nu.", explanation: "Bevarer den bekræftede status." },
        { id: "closed", text: "Gangbroen er allerede lukket.", explanation: "Vender status om." },
        { id: "unknown", text: "Gangbroens status er ukendt.", explanation: "Fjerner en kendt oplysning." },
      ] },
      { id: "time", label: "Planlagt ændring", question: "Hvornår er den planlagte lukning?", correctChoiceId: "at21", choices: [
        { id: "before21", text: "Den lukker før kl. 21.00.", explanation: "Før ændrer tidspunktets betydning." },
        { id: "at21", text: "Den lukker først kl. 21.00.", explanation: "Først markerer, at den planlagte lukning ikke sker tidligere." },
        { id: "after21", text: "Den lukker efter kl. 21.00.", explanation: "Efter lover en senere lukning." },
      ] },
      { id: "exception", label: "Undtagelse", question: "Hvilket forbehold skal med?", correctChoiceId: "wind", choices: [
        { id: "none", text: "Tidspunktet kan ikke ændres.", explanation: "Fjerner undtagelsen." },
        { id: "rain", text: "Den kan lukke tidligere, hvis det regner.", explanation: "Opfinder en årsag." },
        { id: "wind", text: "Den kan dog lukke tidligere, hvis vinden overstiger 18 m/s.", explanation: "Bevarer både betingelse og mulighed." },
      ] },
    ],
    assembledSolution: "Gangbroen er åben nu. Den lukker først kl. 21.00. Den kan dog lukke tidligere, hvis vinden overstiger 18 m/s.",
    glossary: [{ danish: "først", english: "not until" }, { danish: "dog", english: "however" }, { danish: "overstiger", english: "exceeds" }],
    report: {
      task: "public-notice", prompt: "Skriv det endelige varsel med dine egne ord. Status, tidspunkt og vindforbehold skal være entydige.", minimumWords: 30,
      requiredFacts: ["åben nu", "lukker først kl. 21.00", "kan lukke tidligere", "vind over 18 m/s"],
      criteria: [
        { id: "open", label: "Broen er åben nu", alternatives: [["åben", "nu"]] },
        { id: "time", label: "Planlagt lukning kl. 21", alternatives: [["lukker", "21"]] },
        { id: "early", label: "Tidligere lukning er mulig", alternatives: [["lukke", "tidligere"], ["lukker", "tidligere"]] },
        { id: "wind", label: "Grænsen er vind over 18 m/s", alternatives: [["vind", "18"], ["vinden", "18"]] },
      ],
      canonicalSubmission: "Gangbroen er åben nu og lukker efter planen først kl. 21.00. Vagten kan dog lukke den tidligere, hvis vinden overstiger 18 m/s. Følg derfor de aktuelle skilte ved slusen.",
    },
  },
  {
    id: "water-notice",
    engine: "meaning-editor",
    title: "Vandet i Vestbyen",
    translation: "The water in the western district",
    level: "B2",
    eyebrow: "BEREDSKAB · NEGATION",
    description: "Undgå den farlige forskel mellem ikke sikkert og sikkert ikke.",
    accent: "#5fb8db",
    estimatedMinutes: 9,
    sourceLabel: "Laboratoriets foreløbige svar",
    sourceMessage: "Prøven udelukker ikke bakterier. Vandet må ikke drikkes uden kogning. Det kan bruges ukogt til rengøring, men ikke til tandbørstning.",
    assignment: "Lav en kort meddelelse, der hverken overdriver prøvesvaret eller skjuler forbuddet.",
    traps: ["udelukker ikke er ikke en positiv påvisning", "uden kogning hører til drikkes", "men ikke begrænser undtagelsen"],
    slots: [
      { id: "evidence", label: "Prøvesvar", question: "Hvad ved laboratoriet?", correctChoiceId: "notExcluded", choices: [
        { id: "found", text: "Laboratoriet har påvist bakterier.", explanation: "Det er stærkere end kilden." },
        { id: "notExcluded", text: "Laboratoriet kan endnu ikke udelukke bakterier.", explanation: "Bevarer usikkerheden og negationen." },
        { id: "safe", text: "Laboratoriet har udelukket bakterier.", explanation: "Vender prøvesvaret om." },
      ] },
      { id: "drink", label: "Drikkevand", question: "Hvad må borgerne gøre?", correctChoiceId: "boil", choices: [
        { id: "boil", text: "Vandet må kun drikkes efter kogning.", explanation: "Kun binder kravet til drikkevand." },
        { id: "never", text: "Vandet må under ingen omstændigheder drikkes.", explanation: "Fjerner den tilladte løsning." },
        { id: "optional", text: "Vandet kan koges, hvis man ønsker det.", explanation: "Gør et krav valgfrit." },
      ] },
      { id: "uses", label: "Andre formål", question: "Hvilken afgrænsning er korrekt?", correctChoiceId: "cleanNotTeeth", choices: [
        { id: "all", text: "Ukogt vand kan bruges til alle andre formål.", explanation: "Omfatter fejlagtigt tandbørstning." },
        { id: "none", text: "Ukogt vand må slet ikke bruges.", explanation: "Fjerner den tilladte rengøring." },
        { id: "cleanNotTeeth", text: "Ukogt vand kan bruges til rengøring, men ikke til tandbørstning.", explanation: "Bevarer den præcise kontrast." },
      ] },
    ],
    assembledSolution: "Laboratoriet kan endnu ikke udelukke bakterier. Vandet må kun drikkes efter kogning. Ukogt vand kan bruges til rengøring, men ikke til tandbørstning.",
    glossary: [{ danish: "udelukke", english: "rule out" }, { danish: "foreløbig", english: "preliminary" }, { danish: "tandbørstning", english: "tooth brushing" }],
    report: {
      task: "public-notice", prompt: "Skriv en myndighedsmeddelelse. Skeln tydeligt mellem det foreløbige prøvesvar, forbuddet og den tilladte brug.", minimumWords: 34,
      requiredFacts: ["bakterier kan ikke udelukkes", "drik kun efter kogning", "rengøring er tilladt", "tandbørstning er ikke tilladt"],
      criteria: [
        { id: "evidence", label: "Bakterier kan ikke udelukkes", alternatives: [["ikke", "udelukke", "bakterier"], ["ikke", "udelukkes", "bakterier"]] },
        { id: "boil", label: "Drikkevand skal koges", alternatives: [["drikkes", "kogning"], ["drikke", "kogt"]] },
        { id: "clean", label: "Rengøring er tilladt", alternatives: [["rengøring", "bruges"]] },
        { id: "teeth", label: "Tandbørstning er undtaget", alternatives: [["ikke", "tandbørstning"]] },
      ],
      canonicalSubmission: "Laboratoriet kan endnu ikke udelukke bakterier i vandet. Vandet må derfor kun drikkes efter kogning. Ukogt vand kan bruges til rengøring, men det må ikke bruges til tandbørstning, før kommunen melder andet ud.",
    },
  },
  {
    id: "platform-change",
    engine: "meaning-editor",
    title: "Det delte tog",
    translation: "The dividing train",
    level: "B2",
    eyebrow: "TRAFIKINFO · REFERENCE",
    description: "Red et stationsopslag fra uklare stedord og en betingelse med snæver rækkevidde.",
    accent: "#9d82eb",
    estimatedMinutes: 9,
    sourceLabel: "Besked fra trafiklederen",
    sourceMessage: "Toget mod Aalborg afgår fra spor 6, medmindre signalfejlen varer efter 17.20. I så fald flyttes kun den forreste del til spor 4; den bageste del bliver i spor 6 og kører til Aarhus.",
    assignment: "Skriv opslaget, så den, det og i så fald ikke kan misforstås.",
    traps: ["medmindre gør flytningen betinget", "kun den forreste del begrænser hvad der flyttes", "den bageste del har en anden destination"],
    slots: [
      { id: "default", label: "Normal plan", question: "Hvad gælder uden en langvarig fejl?", correctChoiceId: "six", choices: [
        { id: "four", text: "Hele toget mod Aalborg afgår fra spor 4.", explanation: "Gør undtagelsen til hovedregel." },
        { id: "six", text: "Toget mod Aalborg afgår som udgangspunkt fra spor 6.", explanation: "Marker hovedreglen uden at skjule forbeholdet." },
        { id: "cancel", text: "Toget mod Aalborg er aflyst.", explanation: "Opfinder en aflysning." },
      ] },
      { id: "condition", label: "Betingelse", question: "Hvornår ændres planen?", correctChoiceId: "after1720", choices: [
        { id: "before1720", text: "Planen ændres, hvis fejlen slutter før 17.20.", explanation: "Vender tidsbetingelsen om." },
        { id: "always", text: "Planen ændres under alle omstændigheder kl. 17.20.", explanation: "Fjerner hvis-leddet." },
        { id: "after1720", text: "Planen ændres kun, hvis signalfejlen varer efter 17.20.", explanation: "Bevarer både betingelse og tidsgrænse." },
      ] },
      { id: "split", label: "Togets dele", question: "Hvad sker der ved ændringen?", correctChoiceId: "splitExact", choices: [
        { id: "allMove", text: "Hele toget flyttes til spor 4 og kører til Aalborg.", explanation: "Flytter også den bageste del." },
        { id: "destSwap", text: "Forreste del bliver i spor 6, mens bageste del flyttes til spor 4.", explanation: "Bytter delene rundt." },
        { id: "splitExact", text: "Kun forreste del mod Aalborg flyttes til spor 4; bageste del mod Aarhus bliver i spor 6.", explanation: "Navngiver begge referenter og deres handling." },
      ] },
    ],
    assembledSolution: "Toget mod Aalborg afgår som udgangspunkt fra spor 6. Planen ændres kun, hvis signalfejlen varer efter 17.20. Kun forreste del mod Aalborg flyttes til spor 4; bageste del mod Aarhus bliver i spor 6.",
    glossary: [{ danish: "medmindre", english: "unless" }, { danish: "i så fald", english: "in that case" }, { danish: "bageste", english: "rear" }],
    report: {
      task: "public-notice", prompt: "Skriv et entydigt opslag til perronen. Nævn hovedplan, betingelse og begge togdele uden uklare stedord.", minimumWords: 38,
      requiredFacts: ["hovedplan spor 6", "signalfejl efter 17.20", "forreste del til spor 4", "bageste del til Aarhus fra spor 6"],
      criteria: [
        { id: "default", label: "Hovedplanen er spor 6", alternatives: [["udgangspunkt", "spor", "6"], ["normalt", "spor", "6"]] },
        { id: "condition", label: "Betingelsen er fejl efter 17.20", alternatives: [["signalfejl", "efter", "17", "20"], ["fejlen", "efter", "17", "20"]] },
        { id: "front", label: "Forreste del flyttes til spor 4", alternatives: [["forreste", "flyttes", "spor", "4"]] },
        { id: "rear", label: "Bageste del til Aarhus bliver i spor 6", alternatives: [["bageste", "aarhus", "spor", "6"], ["bageste", "århus", "spor", "6"]] },
      ],
      canonicalSubmission: "Toget mod Aalborg afgår som udgangspunkt fra spor 6. Hvis signalfejlen varer efter kl. 17.20, flyttes kun den forreste del mod Aalborg til spor 4. Den bageste del mod Aarhus bliver i spor 6.",
    },
  },
  {
    id: "quay-permits",
    engine: "meaning-editor",
    title: "Porten på kaj 9",
    translation: "The gate at quay 9",
    level: "B1",
    eyebrow: "ADGANG · UNDTAGELSE",
    description: "Omsæt en adgangsregel, hvor alle, bortset fra og medmindre danner et hierarki af undtagelser.",
    accent: "#dfa556",
    estimatedMinutes: 8,
    sourceLabel: "Instruks fra havnevagten",
    sourceMessage: "Alle leverandører skal registreres ved porten. Chauffører med et gyldigt årskort skal dog ikke registreres igen, medmindre kortet er udløbet. Ingen må køre ind, før vagten har bekræftet registreringen eller årskortet.",
    assignment: "Gør instruksen kortere uden at gøre undtagelsen bredere end den er.",
    traps: ["alle omfatter også faste chauffører før undtagelsen", "medmindre genaktiverer kravet ved udløb", "før gør bekræftelsen til en forudsætning"],
    slots: [
      { id: "main", label: "Hovedregel", question: "Hvem skal som udgangspunkt registreres?", correctChoiceId: "all", choices: [
        { id: "all", text: "Alle leverandører skal registreres ved porten.", explanation: "Bevarer hovedreglens universelle omfang." },
        { id: "new", text: "Kun nye leverandører skal registreres ved porten.", explanation: "Indsnævrer gruppen uden belæg." },
        { id: "drivers", text: "Alle chauffører er allerede registreret ved porten.", explanation: "Vender pligten til en påstand om status." },
      ] },
      { id: "exception", label: "Undtagelsen", question: "Hvem slipper for en ny registrering?", correctChoiceId: "valid", choices: [
        { id: "any", text: "Enhver chauffør med et årskort slipper altid for registrering.", explanation: "Ignorerer både gyldighed og udløb." },
        { id: "valid", text: "Chauffører med et gyldigt årskort skal ikke registreres igen.", explanation: "Afgrænser undtagelsen til gyldige kort." },
        { id: "expired", text: "Kun chauffører med et udløbet årskort slipper for registrering.", explanation: "Vender undtagelsens betingelse om." },
      ] },
      { id: "gate", label: "Forudsætning", question: "Hvornår må køretøjet passere?", correctChoiceId: "confirmed", choices: [
        { id: "arrival", text: "Køretøjet må passere, så snart det ankommer til porten.", explanation: "Fjerner vagtens kontrolpunkt." },
        { id: "registered", text: "Køretøjet må passere før vagten kontrollerer oplysningerne.", explanation: "Vender rækkefølgen om." },
        { id: "confirmed", text: "Køretøjet må først passere, når vagten har bekræftet registrering eller årskort.", explanation: "Bevarer kontrollen som nødvendig forudsætning." },
      ] },
    ],
    assembledSolution: "Alle leverandører skal registreres ved porten. Chauffører med et gyldigt årskort skal ikke registreres igen. Køretøjet må først passere, når vagten har bekræftet registrering eller årskort.",
    glossary: [{ danish: "bortset fra", english: "except for" }, { danish: "udløbet", english: "expired" }, { danish: "forudsætning", english: "precondition" }],
    report: {
      task: "public-notice", prompt: "Skriv portens adgangsregel til chaufførerne. Bevar hovedregel, årskortets gyldighed og vagtens bekræftelse.", minimumWords: 38,
      requiredFacts: ["alle leverandører registreres", "gyldigt årskort er undtaget", "udløbet kort kræver registrering", "vagten bekræfter før passage"],
      criteria: [
        { id: "all", label: "Alle leverandører skal registreres", alternatives: [["alle", "leverandører", "registreres"], ["alle", "leverandører", "registrering"]] },
        { id: "valid", label: "Gyldigt årskort giver undtagelse", alternatives: [["gyldigt", "årskort", "ikke"], ["gyldige", "årskort", "undtaget"], ["gyldigt", "årskort", "undtager"]] },
        { id: "expired", label: "Udløbet kort kræver registrering", alternatives: [["udløbet", "registreres"], ["udløbet", "registrering"]] },
        { id: "confirm", label: "Vagten bekræfter før passage", alternatives: [["vagten", "bekræftet", "passere"], ["vagten", "bekræfter", "køre"]] },
      ],
      canonicalSubmission: "Alle leverandører skal registreres ved porten. Et gyldigt årskort undtager chaufføren fra ny registrering, men et udløbet kort kræver registrering. Køretøjet må først passere, når vagten har bekræftet registreringen eller årskortet.",
    },
  },
  {
    id: "medicine-recall",
    engine: "meaning-editor",
    title: "Den smalle tilbagekaldelse",
    translation: "The narrow product recall",
    level: "B2",
    eyebrow: "SUNDHED · KVANTORER",
    description: "Skeln mellem ikke alle og ingen, mens to egenskaber afgrænser hvilke pakker der faktisk berøres.",
    accent: "#e37589",
    estimatedMinutes: 10,
    sourceLabel: "Foreløbig besked fra apoteket",
    sourceMessage: "Ikke alle pakker i serie K17 tilbagekaldes. Tilbagekaldelsen gælder kun pakker, der både har blåt segl og en dato før 14. maj. Pakker uden blåt segl skal ikke returneres, medmindre seglets farve ikke kan aflæses.",
    assignment: "Skriv et sikkert opslag uden at få ikke alle til at betyde ingen eller alle.",
    traps: ["ikke alle betyder at nogle, men ikke samtlige, berøres", "både … og kræver to samtidige egenskaber", "medmindre skaber en særregel for ulæselige segl"],
    slots: [
      { id: "scope", label: "Omfang", question: "Hvor bred er tilbagekaldelsen?", correctChoiceId: "some", choices: [
        { id: "none", text: "Ingen pakker i serie K17 bliver tilbagekaldt.", explanation: "Gør ikke alle til ingen." },
        { id: "all", text: "Alle pakker i serie K17 bliver tilbagekaldt.", explanation: "Fjerner kildens begrænsning." },
        { id: "some", text: "Tilbagekaldelsen omfatter nogle, men ikke alle, pakker i serie K17.", explanation: "Bevarer den negative kvantors omfang." },
      ] },
      { id: "criteria", label: "Kriterier", question: "Hvilke pakker skal returneres?", correctChoiceId: "both", choices: [
        { id: "either", text: "Pakker returneres, hvis seglet er blåt eller datoen er før 14. maj.", explanation: "Eller gør ét kriterium tilstrækkeligt." },
        { id: "both", text: "Kun pakker med både blåt segl og dato før 14. maj skal returneres.", explanation: "Kræver de to egenskaber samtidigt." },
        { id: "date", text: "Alle pakker med en dato før 14. maj skal returneres uanset seglets farve.", explanation: "Fjerner seglet som kriterium." },
      ] },
      { id: "unknown", label: "Ulæseligt segl", question: "Hvad gør kunden ved ukendt farve?", correctChoiceId: "contact", choices: [
        { id: "keep", text: "Pakker med ulæseligt segl skal altid beholdes derhjemme.", explanation: "Overser den udtrykkelige særregel." },
        { id: "return", text: "Pakker med ulæseligt segl skal automatisk returneres som blå.", explanation: "Gør usikkerhed til et positivt fund." },
        { id: "contact", text: "Hvis seglets farve ikke kan aflæses, skal kunden kontakte apoteket.", explanation: "Bevarer særreglen uden at gætte farven." },
      ] },
    ],
    assembledSolution: "Tilbagekaldelsen omfatter nogle, men ikke alle, pakker i serie K17. Kun pakker med både blåt segl og dato før 14. maj skal returneres. Hvis seglets farve ikke kan aflæses, skal kunden kontakte apoteket.",
    glossary: [{ danish: "ikke alle", english: "not all" }, { danish: "både … og", english: "both ... and" }, { danish: "aflæses", english: "be read" }],
    report: {
      task: "public-notice", prompt: "Skriv apotekets endelige opslag. Afgræns omfanget, brug begge produktkriterier, og giv en sikker handling ved ulæseligt segl.", minimumWords: 42,
      requiredFacts: ["ikke alle K17-pakker", "blåt segl og dato før 14. maj", "begge kriterier kræves", "ulæseligt segl kontaktes apoteket"],
      criteria: [
        { id: "scope", label: "Nogle, men ikke alle K17-pakker", alternatives: [["nogle", "ikke", "alle", "k17"], ["ikke", "alle", "k17"]] },
        { id: "blue", label: "Blåt segl er nødvendigt", alternatives: [["blåt", "segl"]] },
        { id: "date", label: "Datoen skal være før 14. maj", alternatives: [["dato", "før", "14", "maj"]] },
        { id: "unknown", label: "Ulæseligt segl kræver kontakt", alternatives: [["ulæseligt", "segl", "kontakte"], ["aflæses", "kontakte", "apoteket"]] },
      ],
      canonicalSubmission: "Tilbagekaldelsen gælder nogle, men ikke alle, K17-pakker. Kun pakker med både blåt segl og en dato før 14. maj skal returneres. Hvis et ulæseligt segl ikke kan aflæses, skal kunden kontakte apoteket i stedet for at gætte.",
    },
  },
];

export const logicScenarios: LogicScenario[] = [...gridScenarios, ...editorScenarios];

export const logicScenarioRegistry = Object.fromEntries(
  logicScenarios.map((scenario) => [scenario.id, scenario]),
) as Record<LogicScenarioId, LogicScenario>;

export const logicScenarioCards: LogicScenarioCard[] = logicScenarios.map((scenario) => ({
  id: scenario.id,
  engine: scenario.engine,
  title: scenario.title,
  translation: scenario.translation,
  level: scenario.level,
  eyebrow: scenario.eyebrow,
  description: scenario.description,
  accent: scenario.accent,
  estimatedMinutes: scenario.estimatedMinutes,
}));

export const logicScenarioEngines = [
  {
    id: "constraint-grid" as const,
    title: "Disponentens logiknet",
    translation: "The dispatcher's logic grid",
    description: "Sæt danske relationer om rækkefølge og placering ind i en levende fordelingsmatrix.",
    scenarioIds: gridScenarios.map((scenario) => scenario.id),
  },
  {
    id: "meaning-editor" as const,
    title: "Betydningsredaktøren",
    translation: "The meaning editor",
    description: "Bevar sandhed, forbehold og negation, når rå driftsbeskeder bliver til offentlige varsler.",
    scenarioIds: editorScenarios.map((scenario) => scenario.id),
  },
] as const;
