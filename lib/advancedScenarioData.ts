export type AdvancedScenarioId = "harbor-investigation" | "storm-gate" | "ferry-relay";
export type AdvancedScenarioLevel = "B1" | "B2";
export type AdvancedEvaluationTask = "formal-report" | "risk-briefing" | "public-message";

export interface AdvancedEvaluationRequest {
  scenarioId: string;
  task: AdvancedEvaluationTask;
  submission: string;
  requiredFacts: string[];
  level: AdvancedScenarioLevel;
}

export interface AdvancedEvaluationResult {
  available: boolean;
  score: number;
  verdict: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  model: string | null;
}

export interface AdvancedScenarioCard {
  id: AdvancedScenarioId;
  title: string;
  englishTitle: string;
  eyebrow: string;
  level: AdvancedScenarioLevel;
  description: string;
  englishDescription: string;
  location: string;
  accent: string;
  task: AdvancedEvaluationTask;
}

export interface ReportCriterion {
  id: string;
  label: string;
  englishLabel: string;
  alternatives: string[][];
}

export interface ReportTask {
  task: AdvancedEvaluationTask;
  prompt: string;
  englishPrompt: string;
  requiredFacts: string[];
  criteria: ReportCriterion[];
  canonicalSubmission: string;
  minimumWords: number;
}

export interface QuestionVerb {
  id: string;
  infinitive: string;
  finite: string;
  english: string;
}

export interface InterrogationOptions {
  hvWords: Array<{ id: string; label: string; english: string }>;
  verbs: QuestionVerb[];
  objects: Array<{ id: string; label: string; english: string }>;
}

export interface WitnessAnswer {
  text: string;
  englishText: string;
  factIds: string[];
  precision: "broad" | "focused" | "exact";
}

export interface Witness {
  id: string;
  name: string;
  role: string;
  englishRole: string;
  register: string;
  englishRegister: string;
  answers: Record<string, WitnessAnswer>;
  unknownAnswer: string;
  englishUnknownAnswer: string;
}

export interface ReliabilityStatement {
  id: string;
  text: string;
  englishText: string;
  signal: string;
  englishSignal: string;
  reliability: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  englishTitle: string;
  revealedTime: string;
}

export interface TimelineConstraint {
  id: string;
  before: string;
  after: string;
  text: string;
  englishText: string;
}

export interface CaseDocument {
  id: string;
  title: string;
  englishTitle: string;
  source: string;
  excerpt: string;
  englishExcerpt: string;
  reliabilityNote: string;
  englishReliabilityNote: string;
  contradicts: string[];
}

export interface HarborInvestigationScenario extends AdvancedScenarioCard {
  kind: "investigation";
  phases: readonly [string, string, string, string];
  questionBudget: number;
  questionOptions: InterrogationOptions;
  witnesses: Witness[];
  documents: CaseDocument[];
  reliabilityStatements: ReliabilityStatement[];
  timelineEvents: TimelineEvent[];
  timelineConstraints: TimelineConstraint[];
  timelineSolution: string[];
  report: ReportTask;
}

export interface ProtocolFact {
  id: string;
  label: string;
  englishLabel: string;
  value: string;
}

export interface ProtocolRule {
  id: string;
  text: string;
  englishText: string;
}

export interface ProtocolSection {
  id: string;
  title: string;
  englishTitle: string;
  rules: ProtocolRule[];
}

export interface ProtocolControl {
  id: string;
  label: string;
  englishLabel: string;
  symbol: string;
}

export interface ProtocolScenario extends AdvancedScenarioCard {
  kind: "protocol";
  phases: readonly [string, string, string, string];
  brief: string;
  englishBrief: string;
  facts: ProtocolFact[];
  manual: ProtocolSection[];
  calculation: {
    label: string;
    englishLabel: string;
    expression: string;
    expected: number;
    unit: string;
  };
  controls: ProtocolControl[];
  solution: string[];
  derivation: string[];
  report: ReportTask;
}

export type AdvancedScenario = HarborInvestigationScenario | ProtocolScenario;

export interface V2QuestionParts {
  hvWord: string;
  finiteVerb: string;
  subject: string;
  object: string;
  order: "verb-subject" | "subject-verb";
}

export interface V2QuestionResult {
  valid: boolean;
  question: string;
  reason: string;
}

const normalize = (value: string) => value
  .toLocaleLowerCase("da-DK")
  .normalize("NFC")
  .replace(/[^a-zæøå0-9]+/gu, " ")
  .trim();

export function makeQuestionKey(hvWord: string, infinitive: string, objectId: string) {
  return [hvWord, infinitive, objectId].map(normalize).join("|");
}

export function composeV2Question(parts: V2QuestionParts): V2QuestionResult {
  const middle = parts.order === "verb-subject"
    ? `${parts.finiteVerb} ${parts.subject}`
    : `${parts.subject} ${parts.finiteVerb}`;
  const question = `${parts.hvWord} ${middle} ${parts.object}?`.replace(/\s+/g, " ");
  return {
    valid: parts.order === "verb-subject",
    question: `${question.charAt(0).toLocaleUpperCase("da-DK")}${question.slice(1)}`,
    reason: parts.order === "verb-subject"
      ? "V2 er korrekt: det finitte verbum står før subjektet efter hv-leddet."
      : "Jeg forstår ikke spørgsmålet. Efter et hv-led skal det finitte verbum stå før subjektet.",
  };
}

export function getWitnessAnswer(
  scenario: HarborInvestigationScenario,
  witnessId: string,
  hvWord: string,
  verbId: string,
  objectId: string,
) {
  const witness = scenario.witnesses.find((candidate) => candidate.id === witnessId);
  const verb = scenario.questionOptions.verbs.find((candidate) => candidate.id === verbId);
  if (!witness || !verb) return null;
  return witness.answers[makeQuestionKey(hvWord, verb.infinitive, objectId)] ?? {
    text: witness.unknownAnswer,
    englishText: witness.englishUnknownAnswer,
    factIds: [],
    precision: "broad" as const,
  };
}

export function evaluateReliabilityOrder(scenario: HarborInvestigationScenario, order: readonly string[]) {
  const expected = [...scenario.reliabilityStatements]
    .sort((left, right) => right.reliability - left.reliability)
    .map((statement) => statement.id);
  const correctPositions = expected.filter((id, index) => order[index] === id).length;
  return {
    success: order.length === expected.length && correctPositions === expected.length,
    correctPositions,
    expected,
  };
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [Array.from(items)];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

export function satisfiesTimelineConstraints(order: readonly string[], constraints: readonly TimelineConstraint[]) {
  if (new Set(order).size !== order.length) return false;
  const positions = new Map(order.map((id, index) => [id, index]));
  return constraints.every((constraint) => {
    const before = positions.get(constraint.before);
    const after = positions.get(constraint.after);
    return before !== undefined && after !== undefined && before < after;
  });
}

export function countTimelineSolutions(scenario: HarborInvestigationScenario) {
  return permutations(scenario.timelineEvents.map((event) => event.id))
    .filter((order) => satisfiesTimelineConstraints(order, scenario.timelineConstraints)).length;
}

export function evaluateTimelineOrder(scenario: HarborInvestigationScenario, order: readonly string[]) {
  const validIds = new Set(scenario.timelineEvents.map((event) => event.id));
  const complete = order.length === validIds.size && order.every((id) => validIds.has(id));
  const correctPositions = scenario.timelineSolution.filter((id, index) => order[index] === id).length;
  return {
    success: complete && correctPositions === scenario.timelineSolution.length && satisfiesTimelineConstraints(order, scenario.timelineConstraints),
    correctPositions,
    expected: scenario.timelineSolution,
  };
}

export function evaluateProtocolState(scenario: ProtocolScenario, sequence: readonly string[], calculation: number) {
  const controlIds = new Set(scenario.controls.map((control) => control.id));
  const sequenceIsPlayable = sequence.length === scenario.solution.length
    && new Set(sequence).size === sequence.length
    && sequence.every((id) => controlIds.has(id));
  const correctPositions = scenario.solution.filter((id, index) => sequence[index] === id).length;
  const calculationCorrect = Number.isFinite(calculation) && Math.abs(calculation - scenario.calculation.expected) < 0.0001;
  return {
    success: sequenceIsPlayable && correctPositions === scenario.solution.length && calculationCorrect,
    sequenceCorrect: sequenceIsPlayable && correctPositions === scenario.solution.length,
    calculationCorrect,
    correctPositions,
  };
}

const fallbackStopWords = new Set([
  "af", "at", "de", "den", "der", "det", "efter", "en", "er", "et", "for", "fra", "i", "med", "og", "om", "på", "som", "til", "var", "ved",
]);

function criterionMatches(submission: string, criterion: ReportCriterion) {
  const normalizedSubmission = normalize(submission);
  return criterion.alternatives.some((alternative) => alternative.every((token) => normalizedSubmission.includes(normalize(token))));
}

export function evaluateSubmissionOffline(scenario: AdvancedScenario, submission: string): AdvancedEvaluationResult {
  const words = normalize(submission).split(" ").filter(Boolean);
  const matched = scenario.report.criteria.filter((criterion) => criterionMatches(submission, criterion));
  const factScore = matched.length / scenario.report.criteria.length;
  const lengthScore = Math.min(1, words.length / scenario.report.minimumWords);
  const connectorTokens = ["derfor", "desuden", "dog", "efter", "hvorefter", "mens", "således", "grundet", "fordi"];
  const connectorScore = connectorTokens.some((token) => words.includes(token)) ? 1 : 0.45;
  const meaningfulWords = words.filter((word) => !fallbackStopWords.has(word));
  const lexicalVariety = meaningfulWords.length === 0 ? 0 : new Set(meaningfulWords).size / meaningfulWords.length;
  const score = Math.max(0, Math.min(1, factScore * 0.68 + lengthScore * 0.17 + connectorScore * 0.08 + lexicalVariety * 0.07));
  const missing = scenario.report.criteria.filter((criterion) => !matched.includes(criterion));
  return {
    available: false,
    score,
    verdict: score >= 0.72 ? "Godkendt af offline-kontrollen" : score >= 0.5 ? "Næsten klar" : "Rapporten mangler afgørende oplysninger",
    feedback: score >= 0.72
      ? "Teksten dækker sagens centrale fakta og bruger en sammenhængende skriftlig form."
      : "Tilføj de manglende fakta, og bind hændelserne sammen med præcise tids- eller årsagsmarkører.",
    strengths: matched.length > 0 ? matched.map((criterion) => criterion.label) : ["Du har skrevet et selvstændigt udkast."],
    improvements: missing.length > 0 ? missing.map((criterion) => criterion.label) : ["Kontrollér tegnsætning og register én gang til."],
    model: "deterministic-offline-rubric-v1",
  };
}

const hvOptions = [
  { id: "hvornår", label: "Hvornår", english: "When" },
  { id: "hvor", label: "Hvor", english: "Where" },
  { id: "hvad", label: "Hvad", english: "What" },
  { id: "hvorfor", label: "Hvorfor", english: "Why" },
  { id: "hvordan", label: "Hvordan", english: "How" },
  { id: "hvem", label: "Hvem", english: "Who" },
];

const questionVerbs: QuestionVerb[] = [
  { id: "see", infinitive: "se", finite: "så", english: "see" },
  { id: "hear", infinitive: "høre", finite: "hørte", english: "hear" },
  { id: "stand", infinitive: "stå", finite: "stod", english: "stand" },
  { id: "do", infinitive: "gøre", finite: "gjorde", english: "do" },
  { id: "check", infinitive: "kontrollere", finite: "kontrollerede", english: "check" },
  { id: "call", infinitive: "ringe", finite: "ringede", english: "call" },
  { id: "work", infinitive: "virke", finite: "virkede", english: "work" },
  { id: "notice", infinitive: "bemærke", finite: "bemærkede", english: "notice" },
];

const questionObjects = [
  { id: "baaden", label: "båden", english: "the boat" },
  { id: "alarmen", label: "alarmen", english: "the alarm" },
  { id: "under-standsningen", label: "under standsningen", english: "during the stoppage" },
  { id: "bagefter", label: "bagefter", english: "afterwards" },
  { id: "logbogen", label: "logbogen", english: "the logbook" },
  { id: "til", label: "til", english: "to" },
  { id: "foer-standsningen", label: "før standsningen", english: "before the stoppage" },
  { id: "ved-kajen", label: "ved kajen", english: "at the quay" },
];

const interrogationKeys = {
  boat: makeQuestionKey("hvornår", "se", "baaden"),
  alarm: makeQuestionKey("hvornår", "høre", "alarmen"),
  position: makeQuestionKey("hvor", "stå", "under-standsningen"),
  aftermath: makeQuestionKey("hvad", "gøre", "bagefter"),
  log: makeQuestionKey("hvorfor", "kontrollere", "logbogen"),
  call: makeQuestionKey("hvem", "ringe", "til"),
  crane: makeQuestionKey("hvordan", "virke", "foer-standsningen"),
  quay: makeQuestionKey("hvad", "bemærke", "ved-kajen"),
};

const harborInvestigation: HarborInvestigationScenario = {
  id: "harbor-investigation",
  kind: "investigation",
  title: "Havnefogedens sag",
  englishTitle: "The harbor master's case",
  eyebrow: "AFHØRING · EVIDENTIALITET · TIDSLINJE",
  level: "B2",
  description: "Byg V2-spørgsmål, vurder sproglig distance, løs den eneste tidslinje og skriv et officielt hændelsesforløb.",
  englishDescription: "Build V2 questions, assess evidential distance, solve the only valid timeline, and write an official incident report.",
  location: "Nordkajen · Sag 06.42",
  accent: "#e39b43",
  task: "formal-report",
  phases: ["Afhøring", "Troværdighed", "Tidslinje", "Rapport"],
  questionBudget: 8,
  questionOptions: { hvWords: hvOptions, verbs: questionVerbs, objects: questionObjects },
  witnesses: [
    {
      id: "mikkel",
      name: "Mikkel",
      role: "Kranfører",
      englishRole: "Crane operator",
      register: "Mundtligt, direkte, med modalpartikler",
      englishRegister: "Colloquial, direct, with modal particles",
      unknownAnswer: "Det ved jeg altså ikke. Spørg mere præcist, så prøver jeg igen.",
      englishUnknownAnswer: "I honestly do not know. Ask more precisely and I will try again.",
      answers: {
        [interrogationKeys.boat]: { text: "Jeg så båden klokken 06.38, lige da jeg gik ud på kajen.", englishText: "I saw the boat at 06:38, just as I walked onto the quay.", factIds: ["boat-0638"], precision: "exact" },
        [interrogationKeys.alarm]: { text: "Alarmen lød jo først et par minutter efter, at kranen gik i stå.", englishText: "The alarm only sounded a couple of minutes after the crane stopped.", factIds: ["alarm-after-stop"], precision: "focused" },
        [interrogationKeys.position]: { text: "Jeg stod i førerhuset. Derfor kunne jeg se panelet direkte.", englishText: "I was in the cab, so I could see the panel directly.", factIds: ["mikkel-cab"], precision: "focused" },
        [interrogationKeys.aftermath]: { text: "Jeg trykkede på nødstop og ringede så til vagten.", englishText: "I pressed the emergency stop and then called the duty officer.", factIds: ["emergency-stop", "call-duty"], precision: "focused" },
        [interrogationKeys.log]: { text: "Jeg tjekkede den ikke selv; det gjorde inspektøren vist bagefter.", englishText: "I did not check it myself; I think the inspector did that later.", factIds: ["inspector-log"], precision: "broad" },
        [interrogationKeys.call]: { text: "Jeg ringede til vagten, som tilkaldte assistance.", englishText: "I called the duty officer, who requested assistance.", factIds: ["assistance-called"], precision: "exact" },
        [interrogationKeys.crane]: { text: "Den kørte normalt, men sensorlampen blinkede nok én gang.", englishText: "It ran normally, but the sensor light may have flashed once.", factIds: ["sensor-warning"], precision: "focused" },
        [interrogationKeys.quay]: { text: "Der lå et kabel løst ved skabet, men jeg rørte det ikke.", englishText: "A cable was loose near the cabinet, but I did not touch it.", factIds: ["loose-cable"], precision: "focused" },
      },
    },
    {
      id: "ida",
      name: "Ida",
      role: "Sikkerhedsinspektør",
      englishRole: "Safety inspector",
      register: "Formelt, passivt og dokumentbaseret",
      englishRegister: "Formal, passive, and document-based",
      unknownAnswer: "Det spørgsmål kan ikke besvares på det foreliggende grundlag.",
      englishUnknownAnswer: "That question cannot be answered on the available evidence.",
      answers: {
        [interrogationKeys.boat]: { text: "Fartøjets ankomst er registreret klokken 06.37; jeg observerede det ikke personligt.", englishText: "The vessel arrival was logged at 06:37; I did not observe it personally.", factIds: ["boat-log-0637"], precision: "exact" },
        [interrogationKeys.alarm]: { text: "Alarmsignalet er tidsstemplet 06.44 i kontrolsystemet.", englishText: "The alarm signal is timestamped 06:44 in the control system.", factIds: ["alarm-0644"], precision: "exact" },
        [interrogationKeys.position]: { text: "Jeg befandt mig ved portkontoret og ankom først til kranen klokken 06.49.", englishText: "I was at the gate office and only reached the crane at 06:49.", factIds: ["inspector-0649"], precision: "exact" },
        [interrogationKeys.aftermath]: { text: "Efter ankomsten blev anlægget afspærret, hvorefter logfilen blev sikret.", englishText: "After arrival, the installation was cordoned off, after which the log file was secured.", factIds: ["site-secured", "log-secured"], precision: "focused" },
        [interrogationKeys.log]: { text: "Logbogen blev kontrolleret for at fastslå den tekniske årsag uden at bygge på antagelser.", englishText: "The logbook was checked to establish the technical cause without relying on assumptions.", factIds: ["log-purpose"], precision: "focused" },
        [interrogationKeys.call]: { text: "Vagten blev kontaktet af kranføreren; assistance blev derefter rekvireret.", englishText: "The duty officer was contacted by the operator; assistance was then requested.", factIds: ["assistance-called"], precision: "exact" },
        [interrogationKeys.crane]: { text: "Anlægget var driftsklart indtil 06.42, hvor forbindelsen til positionssensoren blev afbrudt.", englishText: "The installation was operational until 06:42, when the position sensor connection was interrupted.", factIds: ["stop-0642", "sensor-cause"], precision: "exact" },
        [interrogationKeys.quay]: { text: "Ved besigtigelsen blev en løs sensorforbindelse konstateret i styreskabet.", englishText: "Inspection found a loose sensor connection in the control cabinet.", factIds: ["sensor-cause"], precision: "exact" },
      },
    },
    {
      id: "peter",
      name: "Peter",
      role: "Nattevagt",
      englishRole: "Night watch officer",
      register: "Forsigtigt, indirekte og refererende",
      englishRegister: "Hedged, indirect, and reported",
      unknownAnswer: "Jeg mener ikke, at jeg kan sige noget sikkert om netop det.",
      englishUnknownAnswer: "I do not think I can say anything certain about that.",
      answers: {
        [interrogationKeys.boat]: { text: "Mikkel sagde, at båden var kommet kort før standsningen.", englishText: "Mikkel said that the boat had arrived shortly before the stoppage.", factIds: ["boat-before-stop"], precision: "focused" },
        [interrogationKeys.alarm]: { text: "Jeg mener, jeg hørte alarmen omkring 06.44, men uret gik måske et minut forkert.", englishText: "I think I heard the alarm around 06:44, but the clock may have been a minute off.", factIds: ["alarm-about-0644"], precision: "focused" },
        [interrogationKeys.position]: { text: "Jeg stod ved porten, mens Ida var inde på kontoret.", englishText: "I was at the gate while Ida was inside the office.", factIds: ["peter-gate"], precision: "focused" },
        [interrogationKeys.aftermath]: { text: "Jeg ringede efter assistance, da Mikkel havde meldt nødstop.", englishText: "I requested assistance once Mikkel had reported the emergency stop.", factIds: ["assistance-after-stop"], precision: "exact" },
        [interrogationKeys.log]: { text: "Ida sagde, at loggen skulle sikres, fordi tiderne ellers kunne gå tabt.", englishText: "Ida said that the log had to be secured because the timestamps might otherwise be lost.", factIds: ["log-secured"], precision: "focused" },
        [interrogationKeys.call]: { text: "Mikkel ringede til mig, og jeg kontaktede derefter teknikeren.", englishText: "Mikkel called me, and I then contacted the technician.", factIds: ["assistance-called"], precision: "exact" },
        [interrogationKeys.crane]: { text: "Kranen skulle efter sigende have virket normalt indtil hændelsen.", englishText: "The crane was said to have operated normally until the incident.", factIds: ["crane-reported-normal"], precision: "broad" },
        [interrogationKeys.quay]: { text: "Jeg mener, jeg så et løst kabel, men det kan have været et andet skab.", englishText: "I think I saw a loose cable, but it may have been another cabinet.", factIds: ["possible-cable"], precision: "broad" },
      },
    },
  ],
  documents: [
    {
      id: "port-log",
      title: "Automatisk portlog",
      englishTitle: "Automatic gate log",
      source: "AIS-modtager · systemtid",
      excerpt: "Fartøj 27 registreret inden for kajzonen kl. 06.37.12.",
      englishExcerpt: "Vessel 27 registered inside the quay zone at 06:37:12.",
      reliabilityNote: "Automatisk tidsstempel, men registrering er ikke det samme som fortøjning.",
      englishReliabilityNote: "Automatic timestamp, but registration is not the same as mooring.",
      contradicts: ["radio-note"],
    },
    {
      id: "radio-note",
      title: "Vagtens radionote",
      englishTitle: "Duty officer's radio note",
      source: "Håndskrevet · Peter",
      excerpt: "Båden kom 06.39. Mikkel melder problemer kort efter.",
      englishExcerpt: "The boat arrived at 06:39. Mikkel reports problems shortly afterwards.",
      reliabilityNote: "Noteret bagefter; kom kan betyde ankomst, registrering eller fortøjning.",
      englishReliabilityNote: "Written afterwards; arrived may refer to arrival, registration, or mooring.",
      contradicts: ["port-log"],
    },
    {
      id: "sensor-export",
      title: "Eksport fra styresystemet",
      englishTitle: "Control-system export",
      source: "Maskinlog · panel K4",
      excerpt: "06.42.03: sensorforbindelse tabt. 06.44.01: ekstern alarm aktiveret. Årsag: ukendt.",
      englishExcerpt: "06:42:03: sensor connection lost. 06:44:01: external alarm activated. Cause: unknown.",
      reliabilityNote: "Præcis rækkefølge, men loggen beviser ikke alene, hvorfor forbindelsen blev tabt.",
      englishReliabilityNote: "Precise sequence, but the log alone does not prove why the connection was lost.",
      contradicts: [],
    },
  ],
  reliabilityStatements: [
    { id: "direct", text: "Jeg så, at kranen standsede klokken 06.42.", englishText: "I saw the crane stop at 06:42.", signal: "Direkte observation: så, at", englishSignal: "Direct observation", reliability: 4 },
    { id: "reported", text: "Peter sagde, at kranen var standset før alarmen.", englishText: "Peter said that the crane had stopped before the alarm.", signal: "Navngiven kilde: sagde, at", englishSignal: "Named source", reliability: 3 },
    { id: "hedged", text: "Jeg mener, jeg så kranen standse.", englishText: "I think I saw the crane stop.", signal: "Hedging: mener", englishSignal: "Hedging", reliability: 2 },
    { id: "distanced", text: "Kranen skulle efter sigende være standset tidligere.", englishText: "The crane was reportedly supposed to have stopped earlier.", signal: "Dobbelt distance: skulle efter sigende", englishSignal: "Double distance", reliability: 1 },
  ],
  timelineEvents: [
    { id: "boat-arrives", title: "Båden registreres ved kajen", englishTitle: "The boat is logged at the quay", revealedTime: "06.37" },
    { id: "mikkel-sees-boat", title: "Mikkel ser båden", englishTitle: "Mikkel sees the boat", revealedTime: "06.38" },
    { id: "crane-stops", title: "Kranen standser", englishTitle: "The crane stops", revealedTime: "06.42" },
    { id: "alarm-sounds", title: "Alarmen lyder", englishTitle: "The alarm sounds", revealedTime: "06.44" },
    { id: "inspector-arrives", title: "Ida når frem til kranen", englishTitle: "Ida reaches the crane", revealedTime: "06.49" },
  ],
  timelineConstraints: [
    { id: "boat-before-mikkel", before: "boat-arrives", after: "mikkel-sees-boat", text: "Båden var allerede blevet registreret, da Mikkel så den.", englishText: "The boat had already been logged when Mikkel saw it." },
    { id: "mikkel-before-stop", before: "mikkel-sees-boat", after: "crane-stops", text: "Mikkel havde set båden, inden kranen standsede.", englishText: "Mikkel had seen the boat before the crane stopped." },
    { id: "stop-before-alarm", before: "crane-stops", after: "alarm-sounds", text: "Alarmen lød først, efter at kranen var standset.", englishText: "The alarm only sounded after the crane had stopped." },
    { id: "alarm-before-inspector", before: "alarm-sounds", after: "inspector-arrives", text: "Ida ankom, efter at alarmen havde lydt.", englishText: "Ida arrived after the alarm had sounded." },
  ],
  timelineSolution: ["boat-arrives", "mikkel-sees-boat", "crane-stops", "alarm-sounds", "inspector-arrives"],
  report: {
    task: "formal-report",
    prompt: "Skriv 55–100 ord i officielt register. Angiv det dokumenterede forløb, markér usikker information som usikker, og undgå talesprog.",
    englishPrompt: "Write 55–100 words in an official register. State the documented sequence, mark uncertain information as uncertain, and avoid colloquial language.",
    requiredFacts: [
      "Kranen standsede klokken 06.42.",
      "Alarmen lød efter standsningen klokken 06.44.",
      "Ida ankom efter alarmen klokken 06.49.",
      "Mikkel kontaktede vagten, som tilkaldte assistance.",
      "En løs sensorforbindelse blev konstateret.",
    ],
    criteria: [
      { id: "stop", label: "Standsningen klokken 06.42", englishLabel: "The stop at 06:42", alternatives: [["06.42", "stand"], ["06:42", "stand"]] },
      { id: "alarm", label: "Alarmen efter standsningen", englishLabel: "The alarm after the stop", alternatives: [["alarm", "efter"], ["alarm", "06.44"], ["alarm", "06:44"]] },
      { id: "arrival", label: "Inspektørens ankomst", englishLabel: "The inspector's arrival", alternatives: [["Ida", "06.49"], ["inspektør", "06:49"], ["inspektør", "ankom"]] },
      { id: "assistance", label: "Tilkaldelsen af assistance", englishLabel: "The request for assistance", alternatives: [["tilkald", "assistance"], ["kontakt", "vagt"]] },
      { id: "cause", label: "Den løse sensorforbindelse", englishLabel: "The loose sensor connection", alternatives: [["løs", "sensor"], ["sensorforbindelse"]] },
    ],
    canonicalSubmission: "Anlægget standsede klokken 06.42, hvorefter alarmen lød klokken 06.44. Mikkel kontaktede vagten, som tilkaldte assistance. Sikkerhedsinspektør Ida ankom klokken 06.49 og sikrede logfilen. Ved den efterfølgende besigtigelse blev en løs sensorforbindelse konstateret. Det kan ikke dokumenteres, om den tidligere blinkende sensorlampe varslede fejlen.",
    minimumWords: 55,
  },
};

const stormGate: ProtocolScenario = {
  id: "storm-gate",
  kind: "protocol",
  title: "Stormvagten",
  englishTitle: "Storm watch",
  eyebrow: "PROGNOSE · BETINGELSER · KONTROLKODE",
  level: "B2",
  description: "Kryds en dansk beredskabsmanual med sensordata, beregn højvandet og byg den eneste gyldige portsekvens.",
  englishDescription: "Cross-reference a Danish emergency manual with sensor data, calculate high water, and build the only valid gate sequence.",
  location: "Vestmolen · Stormcentral 3",
  accent: "#56a9c9",
  task: "risk-briefing",
  phases: ["Situationsbillede", "Manual", "Kontrolkode", "Risikovurdering"],
  brief: "Vestenvinden når 21 m/s. Vandstanden er 2,4 meter og forventes at stige 0,8 meter. Sensor B afviger kun 0,02 meter fra referencesensoren og skal derfor godkendes.",
  englishBrief: "The westerly wind reaches 21 m/s. Water level is 2.4 metres and is expected to rise by 0.8 metres. Sensor B differs by only 0.02 metres from the reference sensor and must therefore be approved.",
  facts: [
    { id: "water", label: "Vandstand nu", englishLabel: "Water level now", value: "2,4 m" },
    { id: "rise", label: "Forventet stigning", englishLabel: "Expected rise", value: "+0,8 m" },
    { id: "wind", label: "Vestenvind", englishLabel: "Westerly wind", value: "21 m/s" },
    { id: "sensor", label: "Sensor B-afvigelse", englishLabel: "Sensor B deviation", value: "0,02 m" },
  ],
  manual: [
    { id: "verification", title: "1 · Datakontrol", englishTitle: "1 · Data verification", rules: [
      { id: "sensor-rule", text: "Såfremt afvigelsen er højst 0,05 meter, skal sensoren GODKENDES før enhver alarm.", englishText: "If deviation is no more than 0.05 metres, the sensor must be VERIFIED before any alert." },
    ] },
    { id: "water", title: "2 · Højvand", englishTitle: "2 · High water", rules: [
      { id: "level-rule", text: "Beregn den forventede vandstand. Ved mindst 3,0 meter varsles området, hvorefter VESTPORT LUKKES.", englishText: "Calculate the expected water level. At 3.0 metres or more, alert the area and then CLOSE WEST GATE." },
    ] },
    { id: "wind", title: "3 · Vind og slæbebåde", englishTitle: "3 · Wind and tugboats", rules: [
      { id: "tow-rule", text: "Hvis vestenvinden overstiger 18 m/s, sendes SLÆBEALARM efter portlukningen, men inden ydermolen låses.", englishText: "If westerly wind exceeds 18 m/s, send TUG ALERT after gate closure but before locking the outer mole." },
      { id: "lock-rule", text: "YDERMOLE LÅS placeres umiddelbart før den afsluttende BEKRÆFTELSE.", englishText: "LOCK OUTER MOLE is placed immediately before the final CONFIRMATION." },
    ] },
  ],
  calculation: { label: "Forventet vandstand", englishLabel: "Expected water level", expression: "2,4 + 0,8", expected: 3.2, unit: "m" },
  controls: [
    { id: "verify", label: "Godkend sensor", englishLabel: "Verify sensor", symbol: "V" },
    { id: "warn", label: "Varsl området", englishLabel: "Alert area", symbol: "!" },
    { id: "close-west", label: "Luk vestport", englishLabel: "Close west gate", symbol: "W" },
    { id: "tow-alert", label: "Slæbealarm", englishLabel: "Tug alert", symbol: "T" },
    { id: "lock-outer", label: "Lås ydermole", englishLabel: "Lock outer mole", symbol: "L" },
    { id: "confirm", label: "Bekræft", englishLabel: "Confirm", symbol: "✓" },
  ],
  solution: ["verify", "warn", "close-west", "tow-alert", "lock-outer", "confirm"],
  derivation: [
    "0,02 er højst 0,05, så sensoren godkendes først.",
    "2,4 + 0,8 = 3,2 meter, så området varsles, før vestporten lukkes.",
    "21 m/s overstiger 18 m/s, så slæbealarmen placeres efter portlukningen.",
    "Ydermolen låses umiddelbart før bekræftelsen.",
  ],
  report: {
    task: "risk-briefing",
    prompt: "Skriv en risikovurdering på 50–90 ord til den næste vagt. Forklar både beregningen, tærsklerne og den valgte rækkefølge.",
    englishPrompt: "Write a 50–90 word risk briefing for the next watch. Explain the calculation, thresholds, and chosen sequence.",
    requiredFacts: [
      "Den forventede vandstand er 3,2 meter.",
      "Sensor B er godkendt, fordi afvigelsen kun er 0,02 meter.",
      "Vestporten lukkes, fordi vandstanden er over tærsklen på 3,0 meter.",
      "Slæbealarmen udløses, fordi vestenvinden er 21 m/s.",
      "Ydermolen låses før den afsluttende bekræftelse.",
    ],
    criteria: [
      { id: "peak", label: "Beregnet højvand på 3,2 meter", englishLabel: "Calculated high water of 3.2 metres", alternatives: [["3,2", "meter"], ["3.2", "meter"]] },
      { id: "sensor", label: "Sensorens afvigelse og godkendelse", englishLabel: "Sensor deviation and verification", alternatives: [["sensor", "0,02"], ["sensor", "godkend"]] },
      { id: "gate", label: "Vestportens tærskel", englishLabel: "West gate threshold", alternatives: [["vestport", "3,0"], ["vestport", "luk"]] },
      { id: "wind", label: "Slæbealarm ved 21 m/s", englishLabel: "Tug alert at 21 m/s", alternatives: [["slæbealarm", "21"], ["slæbe", "vind"]] },
      { id: "lock", label: "Ydermolen før bekræftelsen", englishLabel: "Outer mole before confirmation", alternatives: [["ydermole", "før"], ["ydermole", "bekræft"]] },
    ],
    canonicalSubmission: "Sensor B godkendes, da afvigelsen kun er 0,02 meter. Den forventede vandstand er 3,2 meter og overstiger dermed tærsklen på 3,0 meter. Området varsles derfor, hvorefter vestporten lukkes. Da vestenvinden er 21 m/s, udløses slæbealarmen. Til sidst låses ydermolen før den afsluttende bekræftelse.",
    minimumWords: 50,
  },
};

const ferryRelay: ProtocolScenario = {
  id: "ferry-relay",
  kind: "protocol",
  title: "Færgens reserveplan",
  englishTitle: "The ferry contingency plan",
  eyebrow: "KAPACITET · PRIORITERING · OFFENTLIG BESKED",
  level: "B1",
  description: "Beregn reel kapacitet, anvend prioriteringsreglerne og kod en boardingplan, før du skriver beskeden til passagererne.",
  englishDescription: "Calculate real capacity, apply priority rules, encode a boarding plan, and then write the passenger announcement.",
  location: "Færgeleje 2 · Afgang 17.20",
  accent: "#68b890",
  task: "public-message",
  phases: ["Passagerliste", "Regler", "Boardingkode", "Offentlig besked"],
  brief: "Reservefærgen har 54 pladser, men 6 skal holdes fri til redningspersonel. Gruppe M har 6 patienter, gruppe S har 21 skoleelever, gruppe C har 14 cyklister, og gruppe R har 9 standby-passagerer.",
  englishBrief: "The reserve ferry has 54 seats, but 6 must remain available for rescue personnel. Group M has 6 patients, group S has 21 pupils, group C has 14 cyclists, and group R has 9 standby passengers.",
  facts: [
    { id: "capacity", label: "Fysiske pladser", englishLabel: "Physical seats", value: "54" },
    { id: "reserve", label: "Reserveret til redning", englishLabel: "Reserved for rescue", value: "6" },
    { id: "medical", label: "Gruppe M", englishLabel: "Group M", value: "6 patienter" },
    { id: "school", label: "Gruppe S", englishLabel: "Group S", value: "21 skoleelever" },
    { id: "cycles", label: "Gruppe C", englishLabel: "Group C", value: "14 cyklister" },
    { id: "standby", label: "Gruppe R", englishLabel: "Group R", value: "9 standby" },
  ],
  manual: [
    { id: "capacity", title: "1 · Reel kapacitet", englishTitle: "1 · Real capacity", rules: [
      { id: "subtract", text: "De reserverede pladser trækkes fra den fysiske kapacitet, inden grupperne behandles.", englishText: "Reserved seats are subtracted from physical capacity before groups are processed." },
    ] },
    { id: "priority", title: "2 · Prioritet", englishTitle: "2 · Priority", rules: [
      { id: "manifest", text: "MANIFEST skal kontrolleres først. Derefter boardes patienter før skolegrupper, og skolegrupper før cyklister.", englishText: "The MANIFEST must be checked first. Patients then board before school groups, and school groups before cyclists." },
      { id: "standby", text: "Standby-passagerer boardes kun, såfremt hele gruppen kan rummes. Ellers markeres gruppen OMBUK.", englishText: "Standby passengers board only if the entire group can fit. Otherwise mark the group REBOOK." },
    ] },
    { id: "message", title: "3 · Kanal og offentliggørelse", englishTitle: "3 · Channel and publication", rules: [
      { id: "channel", text: "Ved ombooking vælges KANAL B efter OMBUK. OFFENTLIGGØR afslutter altid koden.", englishText: "When rebooking occurs, select CHANNEL B after REBOOK. PUBLISH always finishes the code." },
    ] },
  ],
  calculation: { label: "Tilgængelige pladser", englishLabel: "Available seats", expression: "54 − 6", expected: 48, unit: "pladser" },
  controls: [
    { id: "manifest", label: "Kontrollér manifest", englishLabel: "Check manifest", symbol: "M" },
    { id: "patients", label: "Board patienter", englishLabel: "Board patients", symbol: "+" },
    { id: "school", label: "Board skolegruppe", englishLabel: "Board school group", symbol: "S" },
    { id: "cyclists", label: "Board cyklister", englishLabel: "Board cyclists", symbol: "C" },
    { id: "rebook", label: "Ombuk standby", englishLabel: "Rebook standby", symbol: "R" },
    { id: "channel-b", label: "Kanal B", englishLabel: "Channel B", symbol: "B" },
    { id: "publish", label: "Offentliggør", englishLabel: "Publish", symbol: "✓" },
  ],
  solution: ["manifest", "patients", "school", "cyclists", "rebook", "channel-b", "publish"],
  derivation: [
    "54 − 6 = 48 tilgængelige pladser.",
    "Manifestet kontrolleres, før patienter, skoleelever og cyklister boardes i den rækkefølge.",
    "De tre grupper bruger 41 pladser, så kun 7 er ledige; hele standby-gruppen på 9 kan ikke rummes.",
    "Standby ombookes, kanal B vælges, og koden afsluttes med offentliggørelse.",
  ],
  report: {
    task: "public-message",
    prompt: "Skriv en tydelig offentlig besked på 45–80 ord. Fortæl hvem der kan boarde, hvem der ombookes, hvorfor, hvor de skal henvende sig, og hvornår færgen afgår.",
    englishPrompt: "Write a clear public announcement of 45–80 words. State who may board, who is rebooked, why, where they should go, and when the ferry departs.",
    requiredFacts: [
      "Der er 48 tilgængelige pladser.",
      "Patienter, skoleelever og cyklister kan boarde.",
      "Standby-gruppen ombookes, fordi alle 9 ikke kan rummes.",
      "Standby-passagerer skal henvende sig ved skranke B.",
      "Reservefærgen afgår klokken 17.20.",
    ],
    criteria: [
      { id: "capacity", label: "Kapaciteten på 48 pladser", englishLabel: "Capacity of 48 seats", alternatives: [["48", "plads"]] },
      { id: "boarding", label: "De tre grupper, der kan boarde", englishLabel: "The three groups that can board", alternatives: [["patient", "skole", "cyklist"]] },
      { id: "standby", label: "Standby-gruppens ombooking", englishLabel: "Standby group rebooking", alternatives: [["standby", "ombuk"], ["standby", "ny afgang"]] },
      { id: "desk", label: "Henvisning til skranke B", englishLabel: "Direction to desk B", alternatives: [["skranke", "b"]] },
      { id: "departure", label: "Afgang klokken 17.20", englishLabel: "Departure at 17:20", alternatives: [["17.20", "afg"], ["17:20", "afg"]] },
    ],
    canonicalSubmission: "Reservefærgen har 48 tilgængelige pladser og afgår klokken 17.20. Patienter, skoleelever og cyklister kan boarde i den anviste rækkefølge. Standby-gruppen på ni personer kan desværre ikke rummes samlet og bliver derfor ombooket. Standby-passagerer bedes henvende sig ved skranke B for information om den næste afgang.",
    minimumWords: 45,
  },
};

export const advancedScenarios: AdvancedScenario[] = [harborInvestigation, stormGate, ferryRelay];

export const advancedScenarioRegistry: Record<AdvancedScenarioId, AdvancedScenario> = {
  "harbor-investigation": harborInvestigation,
  "storm-gate": stormGate,
  "ferry-relay": ferryRelay,
};

export const advancedScenarioCards: AdvancedScenarioCard[] = advancedScenarios.map((scenario) => ({
  id: scenario.id,
  title: scenario.title,
  englishTitle: scenario.englishTitle,
  eyebrow: scenario.eyebrow,
  level: scenario.level,
  description: scenario.description,
  englishDescription: scenario.englishDescription,
  location: scenario.location,
  accent: scenario.accent,
  task: scenario.task,
}));

export function createAdvancedEvaluationRequest(scenario: AdvancedScenario, submission: string): AdvancedEvaluationRequest {
  return {
    scenarioId: scenario.id,
    task: scenario.report.task,
    submission,
    requiredFacts: [...scenario.report.requiredFacts],
    level: scenario.level,
  };
}
