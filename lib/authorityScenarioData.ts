export type AuthorityCefrLevel = "A2+" | "B1" | "B2";

export type AuthorityTone = "strict" | "cynical" | "warm" | "noble" | "absurd" | "biting";

export interface AuthorityScenarioCard {
  id: string;
  courseLevel: 15 | 16 | 17 | 18 | 19 | 20;
  level: AuthorityCefrLevel;
  title: string;
  englishTitle: string;
  eyebrow: string;
  description: string;
  accent: string;
  estimatedMinutes: number;
  tones: AuthorityTone[];
}

export interface AuthoritySourceDocument {
  id: string;
  title: string;
  kind: "memo" | "table" | "rule" | "message" | "testimony";
  body: string;
  source: string;
  reliability: "confirmed" | "contested" | "interested";
}

export interface AuthorityNumericFact {
  id: string;
  label: string;
  value: number;
  unit: string;
  sourceDocumentId: string;
}

export type AuthorityMetricOperation = "sum" | "difference" | "product" | "ratio" | "percentage";

/** Inputs refer to facts or earlier metrics; authored order is therefore significant. */
export interface AuthorityDerivedMetric {
  id: string;
  label: string;
  operation: AuthorityMetricOperation;
  inputs: string[];
  unit: string;
  explanation: string;
  decimals?: number;
}

export type AuthorityOperand =
  | { kind: "reference"; id: string }
  | { kind: "constant"; value: number };

export type AuthorityCondition =
  | {
      kind: "compare";
      left: AuthorityOperand;
      operator: "<" | "<=" | "=" | ">=" | ">";
      right: AuthorityOperand;
    }
  | { kind: "all"; conditions: AuthorityCondition[] }
  | { kind: "any"; conditions: AuthorityCondition[] }
  | { kind: "not"; condition: AuthorityCondition };

export interface AuthorityDecisionOption {
  id: string;
  label: string;
  rationale: string;
  consequence: string;
  pressureAligned: boolean;
}

export interface AuthorityDecisionRule {
  decisionId: string;
  when: AuthorityCondition;
  explanation: string;
}

export type AuthorityWorksheetField =
  | {
      kind: "number";
      id: string;
      label: string;
      metricId: string;
      tolerance: number;
      unit: string;
    }
  | {
      kind: "choice";
      id: string;
      label: string;
      expectedOptionId: string;
      options: Array<{ id: string; label: string }>;
    };

export interface AuthorityWorksheet {
  title: string;
  introduction: string;
  optionalNotice: string;
  fields: AuthorityWorksheetField[];
}

export interface AuthorityAiPersuasionPolicy {
  enabled: true;
  mode: "optional-final-persuasion";
  task: "authority-persuasion";
  language: "da";
  offlineBehavior: "skip";
  minimumWords: number;
  maximumCharacters: number;
  audience: string;
  hiddenGoal: string;
  systemInstruction: string;
  rubric: Array<{ id: string; label: string; weight: number }>;
}

export interface AuthorityScenarioCase extends AuthorityScenarioCard {
  setting: string;
  role: string;
  brief: string;
  institutionalDemand: string;
  playerObjective: string;
  sourceDocuments: AuthoritySourceDocument[];
  facts: AuthorityNumericFact[];
  metrics: AuthorityDerivedMetric[];
  decisions: AuthorityDecisionOption[];
  decisionRules: AuthorityDecisionRule[];
  worksheet: AuthorityWorksheet;
  aiPolicy: AuthorityAiPersuasionPolicy;
  glossary: Array<{ danish: string; english: string }>;
}

const ref = (id: string): AuthorityOperand => ({ kind: "reference", id });
const constant = (value: number): AuthorityOperand => ({ kind: "constant", value });

const optionalNotice =
  "Arket er kun et hjælpemiddel. Du må træffe afgørelsen direkte; en tom eller forkert kladde spærrer aldrig sagen.";

const commonSystemInstruction =
  "Bedøm en afsluttende dansk overtalelsestekst i en fiktiv institutionssag. Den deterministiske beregning og afgørelse er autoritativ: modellen må aldrig ændre facit. Beløn præcis brug af beviser, gyldig logik og taktisk forståelse af modtageren. Sofistikeret framing, strategisk udeladelse og psykologisk timing kan vurderes højt, når teksten ikke opfinder data eller gør en ugyldig slutning. Fortæl aldrig spilleren, at vedkommende skal lyve. Returnér kun struktureret feedback; ingen ny afgørelse.";

function aiPolicy(audience: string, hiddenGoal: string, minimumWords: number): AuthorityAiPersuasionPolicy {
  return {
    enabled: true,
    mode: "optional-final-persuasion",
    task: "authority-persuasion",
    language: "da",
    offlineBehavior: "skip",
    minimumWords,
    maximumCharacters: 1800,
    audience,
    hiddenGoal,
    systemInstruction: commonSystemInstruction,
    rubric: [
      { id: "evidence", label: "Korrekt og selektiv brug af sagens data", weight: 0.35 },
      { id: "logic", label: "Logisk sammenhæng mellem data og krav", weight: 0.3 },
      { id: "audience", label: "Forståelse af modtagerens interesser og modstand", weight: 0.2 },
      { id: "control", label: "Sproglig kontrol, framing og timing", weight: 0.15 },
    ],
  };
}

export const authorityScenarioCases: AuthorityScenarioCase[] = [
  {
    id: "myndighed-faergen-15",
    courseLevel: 15,
    level: "A2+",
    title: "Den sidste færge",
    englishTitle: "The last ferry",
    eyebrow: "Kapacitetskontrol",
    description:
      "En havnechef vil sende en overfyldt færge af sted før tågen. Tæl de faktiske passagerer, læs sikkerhedsgrænsen og vælg en løsning, der virker uden chefens kreative hovedregning.",
    accent: "#64c9ad",
    estimatedMinutes: 9,
    tones: ["strict", "absurd"],
    setting: "Færgelejet · 21.42",
    role: "Du er den vagthavende kapacitetskontrollør.",
    brief:
      "Boardingsystemet tæller 168 personer. Certifikatet tillader 160. Havnechefen hævder, at otte skoleelever ikke fylder som voksne, men certifikatet skelner ikke mellem alder eller billetpris.",
    institutionalDemand:
      "Afgang nu. Chefen vil notere ‘160 plus småting’ og lover, at tågen respekterer hierarkiet.",
    playerObjective:
      "Afgør præcist, hvor mange der skal vente, så færgen kan sejle lovligt uden at aflyse hele afgangen.",
    sourceDocuments: [
      { id: "boarding", title: "Boardingliste", kind: "table", body: "Registreret om bord: 168 personer.", source: "Automatisk tæller", reliability: "confirmed" },
      { id: "certificate", title: "Sikkerhedscertifikat", kind: "rule", body: "Maksimal personkapacitet: 160. Alle personer tæller én.", source: "Søfartsmyndigheden", reliability: "confirmed" },
      { id: "chief", title: "Chefens besked", kind: "message", body: "Børn fylder mindre. Skriv 160, så sejler vi.", source: "Havnechefen", reliability: "interested" },
    ],
    facts: [
      { id: "boarded", label: "Personer om bord", value: 168, unit: "personer", sourceDocumentId: "boarding" },
      { id: "capacity", label: "Tilladt kapacitet", value: 160, unit: "personer", sourceDocumentId: "certificate" },
    ],
    metrics: [
      { id: "excess", label: "Personer over grænsen", operation: "difference", inputs: ["boarded", "capacity"], unit: "personer", explanation: "168 − 160 = 8 personer skal fra borde." },
      { id: "load-percent", label: "Belægning", operation: "percentage", inputs: ["boarded", "capacity"], unit: "%", decimals: 1, explanation: "168 ud af 160 svarer til 105 % af den lovlige kapacitet." },
    ],
    decisions: [
      { id: "sail", label: "Lad alle 168 sejle", rationale: "Accepter chefens særlige børnetælling.", consequence: "Certifikatet brydes, og ansvaret lander hos kontrolløren.", pressureAligned: true },
      { id: "hold-eight", label: "Lad præcis otte vente", rationale: "Bring antallet ned på den dokumenterede grænse.", consequence: "160 sejler; otte ombookes med registreret begrundelse.", pressureAligned: false },
      { id: "cancel", label: "Aflys for alle", rationale: "Fjern enhver risiko ved slet ikke at sejle.", consequence: "Reglen overholdes, men løsningen er unødigt indgribende.", pressureAligned: false },
    ],
    decisionRules: [
      { decisionId: "hold-eight", when: { kind: "compare", left: ref("excess"), operator: ">", right: constant(0) }, explanation: "Der er overkapacitet, men den kan løses ved at fjerne præcis differencen." },
    ],
    worksheet: {
      title: "Kapacitetskladde",
      introduction: "Regn forskellen og belægningen, hvis du vil kontrollere din læsning.",
      optionalNotice,
      fields: [
        { kind: "number", id: "ws-excess", label: "Hvor mange er for meget?", metricId: "excess", tolerance: 0, unit: "personer" },
        { kind: "number", id: "ws-load", label: "Belægning i procent", metricId: "load-percent", tolerance: 0.1, unit: "%" },
      ],
    },
    aiPolicy: aiPolicy("en utålmodig havnechef", "Få chefen til at acceptere ombookingen uden at miste ansigt.", 35),
    glossary: [
      { danish: "kapacitetsgrænse", english: "capacity limit" },
      { danish: "at ombooke", english: "to rebook" },
      { danish: "vagthavende", english: "officer on duty" },
    ],
  },
  {
    id: "myndighed-fugtproeven-16",
    courseLevel: 16,
    level: "B1",
    title: "Atten våde vægge",
    englishTitle: "Eighteen damp walls",
    eyebrow: "Tilsyn og stikprøve",
    description:
      "Boligkontoret kalder fugtskaderne ‘en højlydt minoritet’. Skeln mellem klager og den tilfældige stikprøve, beregn forekomsten og afgør, om et bredere tilsyn er påkrævet.",
    accent: "#7aa7ff",
    estimatedMinutes: 11,
    tones: ["biting", "warm"],
    setting: "Kommunens boligtilsyn · Mødelokale 4",
    role: "Du er uafhængig sagsbehandler før budgetmødet.",
    brief:
      "En tilfældig stikprøve omfatter 120 lejligheder; 18 har bekræftet fugt. Kommunens handlegrænse er 10 %. Direktøren dividerer i stedet de 18 fund med de 30 lejere, der tidligere klagede, og kalder resten tavse og derfor tørre.",
    institutionalDemand:
      "Luk sagen som ‘klagerdrevet støj’. En rigtig inspektion passer meget dårligt i kvartalsregnskabet.",
    playerObjective:
      "Brug stikprøvens korrekte nævner og afgør, om kommunen skal åbne et systematisk tilsyn af ejendommen.",
    sourceDocuments: [
      { id: "sample", title: "Tilfældig stikprøve", kind: "table", body: "120 udvalgte lejligheder; 18 bekræftede fugtskader.", source: "Ekstern byggesagkyndig", reliability: "confirmed" },
      { id: "threshold", title: "Tilsynsregel § 8", kind: "rule", body: "Ved mindst 10 % bekræftede fund åbnes systematisk tilsyn.", source: "Kommunens kvalitetshåndbog", reliability: "confirmed" },
      { id: "director", title: "Direktørnotat", kind: "memo", body: "Kun 30 klagede. Brug dem som nævner; så ser problemet afgrænset ud.", source: "Boligdirektøren", reliability: "interested" },
    ],
    facts: [
      { id: "inspected", label: "Tilfældigt undersøgte boliger", value: 120, unit: "boliger", sourceDocumentId: "sample" },
      { id: "damp", label: "Bekræftede fugtskader", value: 18, unit: "boliger", sourceDocumentId: "sample" },
      { id: "threshold-percent", label: "Handlegrænse", value: 10, unit: "%", sourceDocumentId: "threshold" },
    ],
    metrics: [
      { id: "prevalence", label: "Fugtforekomst i stikprøven", operation: "percentage", inputs: ["damp", "inspected"], unit: "%", decimals: 1, explanation: "18 ÷ 120 × 100 = 15 %. Nævneren er hele den tilfældige stikprøve." },
      { id: "above-threshold", label: "Procentpoint over grænsen", operation: "difference", inputs: ["prevalence", "threshold-percent"], unit: "procentpoint", decimals: 1, explanation: "15 % − 10 % = 5 procentpoint over handlegrænsen." },
    ],
    decisions: [
      { id: "close", label: "Luk sagen", rationale: "Behandl manglende klager som bevis for tørre boliger.", consequence: "En forkert nævner skjuler et målt problem.", pressureAligned: true },
      { id: "systematic-inspection", label: "Åbn systematisk tilsyn", rationale: "Anvend den tilfældige stikprøve og den vedtagne grænse.", consequence: "Hele ejendommen undersøges efter den gældende regel.", pressureAligned: false },
      { id: "evacuate", label: "Evakuér straks hele ejendommen", rationale: "Behandl enhver fugt som akut konstruktionssvigt.", consequence: "Data viser behov for tilsyn, ikke akut evakuering.", pressureAligned: false },
    ],
    decisionRules: [
      { decisionId: "systematic-inspection", when: { kind: "compare", left: ref("prevalence"), operator: ">=", right: ref("threshold-percent") }, explanation: "Den korrekte forekomst er 15 %, altså over den vedtagne handlegrænse." },
    ],
    worksheet: {
      title: "Stikprøveark",
      introduction: "Notér forekomsten og sammenlign den med den formelle grænse.",
      optionalNotice,
      fields: [
        { kind: "number", id: "ws-prevalence", label: "Forekomst", metricId: "prevalence", tolerance: 0.1, unit: "%" },
        { kind: "choice", id: "ws-denominator", label: "Hvilken nævner er gyldig?", expectedOptionId: "sample", options: [{ id: "sample", label: "Alle 120 tilfældigt udvalgte" }, { id: "complaints", label: "De 30 tidligere klagere" }, { id: "findings", label: "De 18 fund" }] },
      ],
    },
    aiPolicy: aiPolicy("en budgetdirektør, som vil undgå en synlig udgift", "Gør tilsynet politisk billigere at acceptere end et senere svigt.", 55),
    glossary: [
      { danish: "stikprøve", english: "sample" },
      { danish: "nævner", english: "denominator" },
      { danish: "forekomst", english: "prevalence" },
    ],
  },
  {
    id: "myndighed-ansigtsfilteret-17",
    courseLevel: 17,
    level: "B2",
    title: "Maskinens sikre mistanke",
    englishTitle: "The machine's confident suspicion",
    eyebrow: "Grundrate og sanktion",
    description:
      "Et ansigtsfilter leverer mange røde markeringer og en flot præsentation. Regn den positive præcision ud, se gennem leverandørens procentsprog og afgør, om maskinen må udløse automatiske sanktioner.",
    accent: "#f18f7f",
    estimatedMinutes: 14,
    tones: ["cynical", "biting"],
    setting: "Nationalt adgangscenter · Lukket høring",
    role: "Du er revisionsleder for et automatiseret kontrolsystem.",
    brief:
      "I den validerede prøve blev 10.000 rejsende kontrolleret. Systemet markerede 218; kun 18 var reelle træffere, mens 200 var falske alarmer. Ministeriet fremhæver, at 18 reelle personer blev fundet, men undgår spørgsmålet om, hvad en rød markering faktisk betyder.",
    institutionalDemand:
      "Godkend automatisk karantæne ved hver markering. Leverandøren kalder 218 alarmer for 218 ‘operationelle muligheder’.",
    playerObjective:
      "Beregn andelen af sande træffere blandt alle markeringer og afgør, om markeringen alene kan bære en sanktion.",
    sourceDocuments: [
      { id: "validation", title: "Blind validering", kind: "table", body: "10.000 kontroller; 218 markeringer; 18 sande træffere; 200 falske alarmer.", source: "Uafhængigt testlaboratorium", reliability: "confirmed" },
      { id: "legal", title: "Sanktionskrav", kind: "rule", body: "Automatisk indgreb kræver mindst 50 % positiv præcision og individuel efterprøvelse.", source: "Tilsynets afgørelse", reliability: "confirmed" },
      { id: "vendor", title: "Leverandørens slide", kind: "memo", body: "Systemet fandt 18 relevante personer. Flere data vil sikkert gøre resten relevant senere.", source: "Leverandøren", reliability: "interested" },
    ],
    facts: [
      { id: "flagged", label: "Alle markeringer", value: 218, unit: "markeringer", sourceDocumentId: "validation" },
      { id: "true-positive", label: "Sande træffere", value: 18, unit: "markeringer", sourceDocumentId: "validation" },
      { id: "false-positive", label: "Falske alarmer", value: 200, unit: "markeringer", sourceDocumentId: "validation" },
      { id: "precision-threshold", label: "Minimumspræcision", value: 50, unit: "%", sourceDocumentId: "legal" },
    ],
    metrics: [
      { id: "precision", label: "Positiv præcision", operation: "percentage", inputs: ["true-positive", "flagged"], unit: "%", decimals: 2, explanation: "18 ÷ 218 × 100 ≈ 8,26 %. En markering er oftest falsk." },
      { id: "false-share", label: "Andel falske blandt markeringer", operation: "percentage", inputs: ["false-positive", "flagged"], unit: "%", decimals: 2, explanation: "200 ÷ 218 × 100 ≈ 91,74 % af markeringerne er falske." },
    ],
    decisions: [
      { id: "automatic", label: "Godkend automatisk karantæne", rationale: "Lad markeringen være tilstrækkeligt bevis.", consequence: "De fleste ramte sanktioneres på en falsk alarm.", pressureAligned: true },
      { id: "human-review", label: "Forbyd automatisk sanktion; kræv efterprøvelse", rationale: "Brug systemet som et svagt signal, ikke som dom.", consequence: "Markeringer kan undersøges, men ingen straffes alene af filteret.", pressureAligned: false },
      { id: "erase", label: "Slet alle testdata og al kontrol", rationale: "Afvis enhver mulig anvendelse af et fejlbehæftet signal.", consequence: "Problemet med sanktion løses, men revision og forbedring umuliggøres.", pressureAligned: false },
    ],
    decisionRules: [
      { decisionId: "human-review", when: { kind: "compare", left: ref("precision"), operator: "<", right: ref("precision-threshold") }, explanation: "8,26 % er langt under kravet, så signalet kan højst udløse menneskelig efterprøvelse." },
    ],
    worksheet: {
      title: "Præcisionsark",
      introduction: "Skeln mellem hvor mange systemet finder, og hvor troværdig hver markering er.",
      optionalNotice,
      fields: [
        { kind: "number", id: "ws-precision", label: "Sand andel blandt markeringer", metricId: "precision", tolerance: 0.02, unit: "%" },
        { kind: "number", id: "ws-false", label: "Falsk andel blandt markeringer", metricId: "false-share", tolerance: 0.02, unit: "%" },
      ],
    },
    aiPolicy: aiPolicy("en minister og en leverandør, som begge har annonceret systemets succes", "Skab en udvej, hvor de kan bevare ansigt uden automatisk at sanktionere uskyldige.", 80),
    glossary: [
      { danish: "grundrate", english: "base rate" },
      { danish: "falsk alarm", english: "false positive" },
      { danish: "efterprøvelse", english: "verification" },
    ],
  },
  {
    id: "myndighed-elevatoren-18",
    courseLevel: 18,
    level: "A2+",
    title: "Ni kasser og en minister",
    englishTitle: "Nine crates and a minister",
    eyebrow: "Last og løfteevne",
    description:
      "En minister, ni ens kasser og en elevator med et meget tydeligt skilt skal samme vej. Beregn lasten, modstå protokollens mest højtidelige hovedregning og planlæg sikre ture.",
    accent: "#f0bd62",
    estimatedMinutes: 9,
    tones: ["absurd", "strict"],
    setting: "Arkivets vareelevator · Fotomulighed om fire minutter",
    role: "Du er sikkerhedsansvarlig med adgang til stopknappen.",
    brief:
      "Elevatoren må løfte 600 kg. Ni kasser vejer 58 kg hver, og ministeren med fotograf vejer tilsammen 143 kg. Protokolchefen mener, at ministeriel autoritet ikke har masse, og at fotografen kan ‘stå let’.",
    institutionalDemand:
      "Send alle, alle kasser og helst også det store bånd på én tur. Kameraet venter ikke på fysik.",
    playerObjective:
      "Beregn den samlede last og vælg den mindst forstyrrende plan, der holder hver tur på eller under 600 kg.",
    sourceDocuments: [
      { id: "label", title: "Elevatorskilt", kind: "rule", body: "Maksimal last: 600 kg.", source: "Teknisk kontrol", reliability: "confirmed" },
      { id: "manifest", title: "Lastmanifest", kind: "table", body: "9 kasser á 58 kg. Minister og fotograf: 143 kg tilsammen.", source: "Arkivets vægtstation", reliability: "confirmed" },
      { id: "protocol", title: "Protokolchefens ordre", kind: "message", body: "Titler vejer ingenting. Gør det fotogent.", source: "Protokolchefen", reliability: "interested" },
    ],
    facts: [
      { id: "crate-count", label: "Antal kasser", value: 9, unit: "kasser", sourceDocumentId: "manifest" },
      { id: "crate-weight", label: "Vægt pr. kasse", value: 58, unit: "kg", sourceDocumentId: "manifest" },
      { id: "people-weight", label: "Minister og fotograf", value: 143, unit: "kg", sourceDocumentId: "manifest" },
      { id: "lift-limit", label: "Maksimal last", value: 600, unit: "kg", sourceDocumentId: "label" },
    ],
    metrics: [
      { id: "crates-total", label: "Kassernes samlede vægt", operation: "product", inputs: ["crate-count", "crate-weight"], unit: "kg", explanation: "9 × 58 = 522 kg." },
      { id: "one-trip", label: "Last på én samlet tur", operation: "sum", inputs: ["crates-total", "people-weight"], unit: "kg", explanation: "522 + 143 = 665 kg, altså 65 kg over grænsen." },
      { id: "over-limit", label: "Overlast", operation: "difference", inputs: ["one-trip", "lift-limit"], unit: "kg", explanation: "665 − 600 = 65 kg overlast." },
    ],
    decisions: [
      { id: "one-trip", label: "Send alt på én tur", rationale: "Antag, at officielle titler reducerer tyngdekraften.", consequence: "Elevatoren overlastes med 65 kg.", pressureAligned: true },
      { id: "two-trips", label: "Fordel lasten på to ture", rationale: "Send kasserne først og personerne bagefter.", consequence: "Begge ture ligger under grænsen, og forsinkelsen er lille.", pressureAligned: false },
      { id: "stairs", label: "Bær alle kasser ad trappen", rationale: "Undgå elevatoren helt.", consequence: "Sikkert for elevatoren, men unødigt og dårligt for ni menneskerygge.", pressureAligned: false },
    ],
    decisionRules: [
      { decisionId: "two-trips", when: { kind: "all", conditions: [{ kind: "compare", left: ref("one-trip"), operator: ">", right: ref("lift-limit") }, { kind: "compare", left: ref("crates-total"), operator: "<=", right: ref("lift-limit") }, { kind: "compare", left: ref("people-weight"), operator: "<=", right: ref("lift-limit") }] }, explanation: "Den samlede tur er for tung, mens både kasselasten og personlasten er sikre hver for sig." },
    ],
    worksheet: {
      title: "Lastkladde",
      introduction: "Regn kassernes vægt og den samlede last, hvis skiltet og protokolchefen er uenige.",
      optionalNotice,
      fields: [
        { kind: "number", id: "ws-crates", label: "Ni kasser vejer", metricId: "crates-total", tolerance: 0, unit: "kg" },
        { kind: "number", id: "ws-total", label: "Last på én tur", metricId: "one-trip", tolerance: 0, unit: "kg" },
      ],
    },
    aiPolicy: aiPolicy("en protokolchef med et kamera og meget lidt tid", "Få to ture til at lyde som en planlagt del af ceremonien.", 35),
    glossary: [
      { danish: "løfteevne", english: "lifting capacity" },
      { danish: "overlast", english: "overload" },
      { danish: "vareelevator", english: "freight lift" },
    ],
  },
  {
    id: "myndighed-noedstroemmen-19",
    courseLevel: 19,
    level: "B1",
    title: "Lys, luft og facade",
    englishTitle: "Light, air, and appearances",
    eyebrow: "Prioritering under knaphed",
    description:
      "Et hospital har mindre nødstrøm end alle afdelinger tilsammen kræver. Beskyt operation og intensiv, regn den resterende reserve ud og afvis en administrativ prioritering, der ser bedre ud end den virker.",
    accent: "#78d3c7",
    estimatedMinutes: 12,
    tones: ["warm", "noble", "biting"],
    setting: "Kysthospitalet · Strømsvigt",
    role: "Du er teknisk koordinator for nødstrømsfordelingen.",
    brief:
      "Generatoren leverer 80 kW. Operationsstuen kræver 42 kW, intensivafdelingen 36 kW og forhalsbelysning samt pressevæg 18 kW. Hospitalets plan klassificerer operation og intensiv som livskritiske; pressevæggen er ikke kritisk.",
    institutionalDemand:
      "Hold forhallen oplyst, så ingen filmer et mørkt hospital. Direktøren foreslår at ‘dele manglen demokratisk’ mellem alle tre kredse.",
    playerObjective:
      "Find en fordeling, der dækker begge livskritiske kredse fuldt ud og holder sig inden for generatorens effekt.",
    sourceDocuments: [
      { id: "generator", title: "Generatorpanel", kind: "table", body: "Stabil tilgængelig effekt: 80 kW.", source: "Nødstrømsanlægget", reliability: "confirmed" },
      { id: "loads", title: "Kredsliste", kind: "table", body: "Operation 42 kW; intensiv 36 kW; forhal og pressevæg 18 kW.", source: "Hospitalets elplan", reliability: "confirmed" },
      { id: "priority", title: "Beredskabsregel", kind: "rule", body: "Livskritiske kredse forsynes fuldt før ikke-kritiske kredse.", source: "Beredskabsledelsen", reliability: "confirmed" },
      { id: "director", title: "Direktørens besked", kind: "message", body: "En mørk pressevæg sender det forkerte signal.", source: "Hospitalsdirektøren", reliability: "interested" },
    ],
    facts: [
      { id: "generator-kw", label: "Generatorens effekt", value: 80, unit: "kW", sourceDocumentId: "generator" },
      { id: "surgery-kw", label: "Operation", value: 42, unit: "kW", sourceDocumentId: "loads" },
      { id: "icu-kw", label: "Intensiv", value: 36, unit: "kW", sourceDocumentId: "loads" },
      { id: "lobby-kw", label: "Forhal og pressevæg", value: 18, unit: "kW", sourceDocumentId: "loads" },
    ],
    metrics: [
      { id: "essential-load", label: "Livskritisk belastning", operation: "sum", inputs: ["surgery-kw", "icu-kw"], unit: "kW", explanation: "42 + 36 = 78 kW til de to livskritiske kredse." },
      { id: "all-load", label: "Alle kredse", operation: "sum", inputs: ["essential-load", "lobby-kw"], unit: "kW", explanation: "78 + 18 = 96 kW; generatoren kan ikke drive alt." },
      { id: "reserve", label: "Reserve efter kritiske kredse", operation: "difference", inputs: ["generator-kw", "essential-load"], unit: "kW", explanation: "80 − 78 = 2 kW i reserve, for lidt til forhallen." },
    ],
    decisions: [
      { id: "equal-cuts", label: "Skær lige meget på alle kredse", rationale: "Fordel manglen, så alle afdelinger ser delvist aktive ud.", consequence: "Livskritisk udstyr mister nødvendig effekt.", pressureAligned: true },
      { id: "protect-essential", label: "Forsyn operation og intensiv; frakobl pressevæggen", rationale: "Følg prioriteringsreglen og den faktiske kapacitet.", consequence: "Patientkritiske funktioner får 78 kW; 2 kW holdes i reserve.", pressureAligned: false },
      { id: "lobby-first", label: "Hold forhallen lys og fordel resten", rationale: "Prioritér den synlige del af hospitalet.", consequence: "Der er kun 62 kW tilbage til et behov på 78 kW.", pressureAligned: true },
    ],
    decisionRules: [
      { decisionId: "protect-essential", when: { kind: "all", conditions: [{ kind: "compare", left: ref("essential-load"), operator: "<=", right: ref("generator-kw") }, { kind: "compare", left: ref("all-load"), operator: ">", right: ref("generator-kw") }, { kind: "compare", left: ref("reserve"), operator: "<", right: ref("lobby-kw") }] }, explanation: "De kritiske 78 kW kan dækkes; alle 96 kW kan ikke, og reserven kan ikke drive forhallen." },
    ],
    worksheet: {
      title: "Effektfordeling",
      introduction: "Saml først de kritiske behov og kontrollér derefter, hvad der er tilbage.",
      optionalNotice,
      fields: [
        { kind: "number", id: "ws-essential", label: "Livskritisk belastning", metricId: "essential-load", tolerance: 0, unit: "kW" },
        { kind: "number", id: "ws-reserve", label: "Resterende reserve", metricId: "reserve", tolerance: 0, unit: "kW" },
      ],
    },
    aiPolicy: aiPolicy("en hospitalsdirektør, der frygter billeder mere end tabeller", "Forbind den upopulære mørklægning med direktørens eget ansvar for patienterne.", 65),
    glossary: [
      { danish: "nødstrøm", english: "emergency power" },
      { danish: "belastning", english: "load" },
      { danish: "livskritisk", english: "life-critical" },
    ],
  },
  {
    id: "myndighed-leverandoeren-20",
    courseLevel: 20,
    level: "B2",
    title: "Den pæne total",
    englishTitle: "The tidy total",
    eyebrow: "Stratificering og revision",
    description:
      "Et indkøbskontor vil udelukke en leverandør ud fra den samlede fejlrate. Opdel leverancerne efter risikoklasse, find den skjulte vending i tallene og afgør, hvad data faktisk kan begrunde.",
    accent: "#b394ff",
    estimatedMinutes: 16,
    tones: ["cynical", "strict", "biting"],
    setting: "Statens indkøbsrevision · Endelig høring",
    role: "Du er den sidste faglige underskriver på en udelukkelsessag.",
    brief:
      "Nordværk har 10 fejl i 200 leverancer; Sydkomponent har 17 fejl i 500. Nordværks samlede rate er derfor højere. Men Nordværk håndterede langt flere højrisikoleverancer. Inden for høj risiko havde Nordværk 9 fejl i 100 mod Sydkomponents 2 i 20; inden for normal risiko 1 i 100 mod 15 i 480.",
    institutionalDemand:
      "Udeluk Nordværk i dag. Den samlede søjle er højere, passer på én slide og kræver ingen pinlig forklaring om blandede risikogrupper.",
    playerObjective:
      "Kontrollér både totalrater og rater inden for hver risikoklasse, og afgør om totalen alene kan begrunde automatisk udelukkelse.",
    sourceDocuments: [
      { id: "totals", title: "Samlet leverandøroversigt", kind: "table", body: "Nordværk: 10/200 fejl. Sydkomponent: 17/500 fejl.", source: "Indkøbsdatabasen", reliability: "confirmed" },
      { id: "strata", title: "Risikofordeling", kind: "table", body: "Høj risiko: Nord 9/100, Syd 2/20. Normal: Nord 1/100, Syd 15/480.", source: "Kvalitetsrevisionen", reliability: "confirmed" },
      { id: "rule", title: "Udelukkelsesregel", kind: "rule", body: "Automatisk udelukkelse kræver sammenlignelige leverancegrupper; kendt risikomix skal undersøges særskilt.", source: "Udbudskontrollen", reliability: "confirmed" },
      { id: "office", title: "Kontorchefens udkast", kind: "memo", body: "5,0 er større end 3,4. Resten er akademisk pynt.", source: "Indkøbschefen", reliability: "interested" },
    ],
    facts: [
      { id: "north-errors", label: "Nordværk fejl i alt", value: 10, unit: "fejl", sourceDocumentId: "totals" },
      { id: "north-total", label: "Nordværk leverancer i alt", value: 200, unit: "leverancer", sourceDocumentId: "totals" },
      { id: "south-errors", label: "Sydkomponent fejl i alt", value: 17, unit: "fejl", sourceDocumentId: "totals" },
      { id: "south-total", label: "Sydkomponent leverancer i alt", value: 500, unit: "leverancer", sourceDocumentId: "totals" },
      { id: "north-high-errors", label: "Nordværk højrisikofejl", value: 9, unit: "fejl", sourceDocumentId: "strata" },
      { id: "north-high-total", label: "Nordværk højrisikoleverancer", value: 100, unit: "leverancer", sourceDocumentId: "strata" },
      { id: "south-high-errors", label: "Sydkomponent højrisikofejl", value: 2, unit: "fejl", sourceDocumentId: "strata" },
      { id: "south-high-total", label: "Sydkomponent højrisikoleverancer", value: 20, unit: "leverancer", sourceDocumentId: "strata" },
      { id: "north-normal-errors", label: "Nordværk normalfejl", value: 1, unit: "fejl", sourceDocumentId: "strata" },
      { id: "north-normal-total", label: "Nordværk normale leverancer", value: 100, unit: "leverancer", sourceDocumentId: "strata" },
      { id: "south-normal-errors", label: "Sydkomponent normalfejl", value: 15, unit: "fejl", sourceDocumentId: "strata" },
      { id: "south-normal-total", label: "Sydkomponent normale leverancer", value: 480, unit: "leverancer", sourceDocumentId: "strata" },
    ],
    metrics: [
      { id: "north-overall", label: "Nordværk samlet fejlrate", operation: "percentage", inputs: ["north-errors", "north-total"], unit: "%", decimals: 2, explanation: "10 ÷ 200 × 100 = 5,00 %." },
      { id: "south-overall", label: "Sydkomponent samlet fejlrate", operation: "percentage", inputs: ["south-errors", "south-total"], unit: "%", decimals: 2, explanation: "17 ÷ 500 × 100 = 3,40 %." },
      { id: "north-high", label: "Nordværk høj risiko", operation: "percentage", inputs: ["north-high-errors", "north-high-total"], unit: "%", decimals: 2, explanation: "9 ÷ 100 × 100 = 9,00 %." },
      { id: "south-high", label: "Sydkomponent høj risiko", operation: "percentage", inputs: ["south-high-errors", "south-high-total"], unit: "%", decimals: 2, explanation: "2 ÷ 20 × 100 = 10,00 %." },
      { id: "north-normal", label: "Nordværk normal risiko", operation: "percentage", inputs: ["north-normal-errors", "north-normal-total"], unit: "%", decimals: 3, explanation: "1 ÷ 100 × 100 = 1,00 %." },
      { id: "south-normal", label: "Sydkomponent normal risiko", operation: "percentage", inputs: ["south-normal-errors", "south-normal-total"], unit: "%", decimals: 3, explanation: "15 ÷ 480 × 100 = 3,125 %." },
    ],
    decisions: [
      { id: "exclude-north", label: "Udeluk Nordværk automatisk", rationale: "Brug kun de to samlede rater.", consequence: "Afgørelsen ignorerer et dokumenteret forskelligt risikomix.", pressureAligned: true },
      { id: "stratified-audit", label: "Afvis automatisk udelukkelse; kræv stratificeret revision", rationale: "Sammenlign leverandørerne inden for samme risikoklasse.", consequence: "Kontrakten sættes under revision uden at foregribe en uunderbygget skyld.", pressureAligned: false },
      { id: "award-north", label: "Tildel straks hele kontrakten til Nordværk", rationale: "Antag, at bedre rater i begge lag beviser alt om fremtidig drift.", consequence: "Vendingen afkræfter totalargumentet, men er ikke alene et fuldt udbudsgrundlag.", pressureAligned: false },
    ],
    decisionRules: [
      { decisionId: "stratified-audit", when: { kind: "all", conditions: [{ kind: "compare", left: ref("north-overall"), operator: ">", right: ref("south-overall") }, { kind: "compare", left: ref("north-high"), operator: "<", right: ref("south-high") }, { kind: "compare", left: ref("north-normal"), operator: "<", right: ref("south-normal") }] }, explanation: "Totalen peger mod Nordværk, men begge sammenlignelige risikolag peger den anden vej. Risikomixet skal derfor revideres før en sanktion." },
    ],
    worksheet: {
      title: "Stratificeringsark",
      introduction: "Beregn først totalerne og derefter hver sammenlignelig risikogruppe.",
      optionalNotice,
      fields: [
        { kind: "number", id: "ws-north-all", label: "Nordværk samlet", metricId: "north-overall", tolerance: 0.01, unit: "%" },
        { kind: "number", id: "ws-south-all", label: "Sydkomponent samlet", metricId: "south-overall", tolerance: 0.01, unit: "%" },
        { kind: "choice", id: "ws-pattern", label: "Hvad sker der efter opdeling?", expectedOptionId: "reversal", options: [{ id: "same", label: "Nordværk er værst i begge grupper" }, { id: "reversal", label: "Nordværk har lavere rate i begge grupper" }, { id: "equal", label: "Raterne bliver ens" }] },
      ],
    },
    aiPolicy: aiPolicy("en indkøbschef, hvis offentlige konklusion allerede er skrevet", "Få en stratificeret revision til at fremstå som beskyttelse af chefens proces, ikke som en ydmygelse.", 95),
    glossary: [
      { danish: "risikomix", english: "risk mix" },
      { danish: "at stratificere", english: "to stratify" },
      { danish: "at foregribe", english: "to prejudge" },
    ],
  },
];

export const authorityScenarioRegistry: Readonly<Record<string, AuthorityScenarioCase>> = Object.freeze(
  Object.fromEntries(authorityScenarioCases.map((scenario) => [scenario.id, scenario])),
);

export const authorityScenarioCards: AuthorityScenarioCard[] = authorityScenarioCases.map((scenario) => ({
  id: scenario.id,
  courseLevel: scenario.courseLevel,
  level: scenario.level,
  title: scenario.title,
  englishTitle: scenario.englishTitle,
  eyebrow: scenario.eyebrow,
  description: scenario.description,
  accent: scenario.accent,
  estimatedMinutes: scenario.estimatedMinutes,
  tones: scenario.tones,
}));
