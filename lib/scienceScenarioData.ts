export type ScienceScenarioLevel = "A2+" | "B1" | "B2";

export type ScienceScenarioKind =
  | "resistor-code"
  | "circuit-tuning"
  | "measurement-uncertainty"
  | "lever-balance"
  | "density-lab"
  | "thermal-design";

export interface ScienceGlossaryEntry {
  danish: string;
  english: string;
  note?: string;
}

export interface ScienceManualSection {
  id: string;
  title: string;
  body: string;
  formula?: string;
  warning?: string;
}

export interface ScienceInstructionPane {
  objective: string;
  context: string;
  procedure: string[];
  manual: ScienceManualSection[];
  glossary: ScienceGlossaryEntry[];
}

export type ResistorBandColor =
  | "black"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "violet"
  | "grey"
  | "white"
  | "gold"
  | "silver";

export interface ResistorBoardWorkspace {
  kind: "resistor-board";
  resistors: Array<{
    id: string;
    label: string;
    bands: [ResistorBandColor, ResistorBandColor, ResistorBandColor, ResistorBandColor];
    note: string;
  }>;
  specification: { minimumOhm: number; maximumOhm: number };
}

export interface CircuitWorkspace {
  kind: "circuit";
  nodes: Array<{ id: string; label: string; x: number; y: number }>;
  components: Array<{
    id: string;
    type: "source" | "resistor" | "diode" | "ammeter" | "switch";
    from: string;
    to: string;
    label: string;
    value?: number;
    unit?: string;
    selectable?: boolean;
  }>;
  target: { label: string; value: number; unit: string };
}

export interface MeasurementWorkspace {
  kind: "measurement-bench";
  instrument: {
    label: string;
    resolution: number;
    unit: string;
    scaleStart: number;
    scaleEnd: number;
    majorTick: number;
  };
  readings: number[];
  specification: { center: number; plusMinus: number; unit: string };
}

export interface LeverWorkspace {
  kind: "lever";
  beam: { minimumPosition: number; maximumPosition: number; pivotPosition: number; unit: string };
  loads: Array<{
    id: string;
    label: string;
    massKg: number;
    positionM?: number;
    adjustableSlotsM?: number[];
  }>;
  gravity: number;
}

export interface DensityWorkspace {
  kind: "density-tank";
  fluid: { label: string; density: number; unit: string };
  samples: Array<{
    id: string;
    label: string;
    shape: "cylinder" | "block" | "irregular";
    massG: number;
    volumeCm3: number;
  }>;
  materialReference: Array<{ id: string; label: string; density: number; unit: string }>;
}

export interface ThermalWorkspace {
  kind: "thermal-section";
  insideTemperatureC: number;
  outsideTemperatureC: number;
  areaM2: number;
  durationHours: number;
  layers: Array<{
    id: string;
    label: string;
    thicknessM: number;
    conductivity: number;
    color: string;
  }>;
  upgrades: Array<{
    id: string;
    label: string;
    thicknessM: number;
    conductivity: number;
  }>;
}

export type ScienceWorkspace =
  | ResistorBoardWorkspace
  | CircuitWorkspace
  | MeasurementWorkspace
  | LeverWorkspace
  | DensityWorkspace
  | ThermalWorkspace;

export interface ScienceUnitOption {
  unit: string;
  factor: number;
}

export interface ScienceTolerance {
  absolute?: number;
  relative?: number;
}

export interface ScienceNumericAnswerField {
  kind: "number";
  id: string;
  label: string;
  expected: number;
  unit: string;
  acceptedUnits?: ScienceUnitOption[];
  tolerance: ScienceTolerance;
  weight?: number;
}

export interface ScienceChoiceAnswerField {
  kind: "choice";
  id: string;
  label: string;
  expectedOptionId: string;
  options: Array<{ id: string; label: string }>;
  weight?: number;
}

export interface ScienceSelectionAnswerField {
  kind: "selection";
  id: string;
  label: string;
  expectedOptionIds: string[];
  options: Array<{ id: string; label: string }>;
  orderMatters: boolean;
  weight?: number;
}

export type ScienceAnswerField =
  | ScienceNumericAnswerField
  | ScienceChoiceAnswerField
  | ScienceSelectionAnswerField;

export interface ScienceStage {
  id: string;
  title: string;
  instruction: string;
  workspacePrompt: string;
  dependsOn?: string[];
  fields: ScienceAnswerField[];
  solutionExplanation: string;
}

export interface ScienceScenarioCase {
  id: string;
  kind: ScienceScenarioKind;
  courseLevel: 15 | 16 | 17 | 18 | 19 | 20;
  level: ScienceScenarioLevel;
  title: string;
  englishTitle: string;
  eyebrow: string;
  description: string;
  accent: string;
  estimatedMinutes: number;
  instructionPane: ScienceInstructionPane;
  workspace: ScienceWorkspace;
  stages: ScienceStage[];
}

const resistorCodeCase: ScienceScenarioCase = {
  id: "farvekoden-paa-broen",
  kind: "resistor-code",
  courseLevel: 15,
  level: "A2+",
  title: "Farvekoden på broen",
  englishTitle: "The colour code on the bridge",
  eyebrow: "ELEKTRONIK · FARVER OG TAL",
  description: "Læs fire farvebånd, beregn modstand og tolerance, og vælg den komponent, der holder sig inden for værkstedets krav.",
  accent: "#59c8b2",
  estimatedMinutes: 8,
  instructionPane: {
    objective: "Afkod tre modstande og dokumentér, om de kan bruges i styrepanelet.",
    context: "Et gammelt styrepanel mangler mærkater. Kun farvebåndene på modstandene er bevaret.",
    procedure: [
      "Læs de to første bånd som cifre.",
      "Gang tallet med tredje bånds multiplikator.",
      "Brug sidste bånd til at beregne det laveste og højeste mulige resultat.",
    ],
    manual: [
      {
        id: "digits",
        title: "Cifre",
        body: "Sort 0 · brun 1 · rød 2 · orange 3 · gul 4 · grøn 5 · blå 6 · violet 7 · grå 8 · hvid 9.",
      },
      {
        id: "multiplier",
        title: "Multiplikator",
        body: "Tredje bånd bruger samme tal som en tierpotens: brun ×10, rød ×100 og orange ×1.000.",
        formula: "R = (første ciffer · 10 + andet ciffer) · multiplikator",
      },
      {
        id: "tolerance",
        title: "Tolerance",
        body: "Guld betyder ±5 %, og sølv betyder ±10 %. Tolerancen skal regnes på den nominelle modstand.",
        formula: "R_min = R · (1 − tolerance), R_max = R · (1 + tolerance)",
      },
    ],
    glossary: [
      { danish: "en modstand", english: "a resistor" },
      { danish: "et farvebånd", english: "a colour band" },
      { danish: "nominel", english: "nominal" },
      { danish: "tolerance", english: "tolerance", note: "Tilladt variation omkring den nominelle værdi." },
    ],
  },
  workspace: {
    kind: "resistor-board",
    resistors: [
      { id: "r1", label: "R1", bands: ["brown", "black", "red", "gold"], note: "Referencekomponent" },
      { id: "r2", label: "R2", bands: ["red", "violet", "orange", "gold"], note: "Kandidat til styrepanelet" },
      { id: "r3", label: "R3", bands: ["yellow", "violet", "brown", "silver"], note: "Reservekomponent" },
    ],
    specification: { minimumOhm: 24_000, maximumOhm: 30_000 },
  },
  stages: [
    {
      id: "decode-r1",
      title: "Referenceværdien",
      instruction: "Afkod R1, og beregn hele toleranceintervallet.",
      workspacePrompt: "Brun · sort · rød · guld",
      fields: [
        { kind: "number", id: "nominal", label: "Nominel modstand", expected: 1_000, unit: "Ω", acceptedUnits: [{ unit: "Ω", factor: 1 }, { unit: "kΩ", factor: 1_000 }], tolerance: { absolute: 0.5 } },
        { kind: "number", id: "minimum", label: "Laveste modstand", expected: 950, unit: "Ω", acceptedUnits: [{ unit: "Ω", factor: 1 }, { unit: "kΩ", factor: 1_000 }], tolerance: { absolute: 0.5 } },
        { kind: "number", id: "maximum", label: "Højeste modstand", expected: 1_050, unit: "Ω", acceptedUnits: [{ unit: "Ω", factor: 1 }, { unit: "kΩ", factor: 1_000 }], tolerance: { absolute: 0.5 } },
      ],
      solutionExplanation: "Brun og sort giver 10; rød ganger med 100. Derfor er R1 1.000 Ω, og ±5 % giver 950–1.050 Ω.",
    },
    {
      id: "inspect-r2",
      title: "Panelets kandidat",
      instruction: "Afkod R2, og afgør om hele dens toleranceinterval ligger inden for kravet 24–30 kΩ.",
      workspacePrompt: "Rød · violet · orange · guld",
      dependsOn: ["decode-r1"],
      fields: [
        { kind: "number", id: "nominal", label: "Nominel modstand", expected: 27_000, unit: "Ω", acceptedUnits: [{ unit: "Ω", factor: 1 }, { unit: "kΩ", factor: 1_000 }], tolerance: { absolute: 1 } },
        { kind: "number", id: "minimum", label: "Laveste modstand", expected: 25_650, unit: "Ω", acceptedUnits: [{ unit: "Ω", factor: 1 }, { unit: "kΩ", factor: 1_000 }], tolerance: { absolute: 1 } },
        { kind: "number", id: "maximum", label: "Højeste modstand", expected: 28_350, unit: "Ω", acceptedUnits: [{ unit: "Ω", factor: 1 }, { unit: "kΩ", factor: 1_000 }], tolerance: { absolute: 1 } },
        { kind: "choice", id: "approved", label: "Værkstedets afgørelse", expectedOptionId: "yes", options: [{ id: "yes", label: "Godkend R2" }, { id: "no", label: "Afvis R2" }] },
      ],
      solutionExplanation: "27 kΩ med ±5 % spænder fra 25,65 til 28,35 kΩ. Hele intervallet ligger mellem 24 og 30 kΩ.",
    },
    {
      id: "check-r3",
      title: "Reserven",
      instruction: "Find R3's højeste mulige modstand, og beregn den nominelle seriekobling R1 + R3.",
      workspacePrompt: "Gul · violet · brun · sølv",
      dependsOn: ["inspect-r2"],
      fields: [
        { kind: "number", id: "r3-maximum", label: "R3 maksimum", expected: 517, unit: "Ω", tolerance: { absolute: 0.5 } },
        { kind: "number", id: "series", label: "R1 + R3 nominelt", expected: 1_470, unit: "Ω", acceptedUnits: [{ unit: "Ω", factor: 1 }, { unit: "kΩ", factor: 1_000 }], tolerance: { absolute: 0.5 } },
      ],
      solutionExplanation: "Gul-violet-brun er 47 · 10 = 470 Ω. Sølv giver +10 % = 517 Ω; nominelt bliver 1.000 + 470 = 1.470 Ω.",
    },
  ],
};

const circuitTuningCase: ScienceScenarioCase = {
  id: "fyrlysets-stroemkreds",
  kind: "circuit-tuning",
  courseLevel: 16,
  level: "B1",
  title: "Fyrlysets strømkreds",
  englishTitle: "The beacon-light circuit",
  eyebrow: "ELEKTRONIK · OHMS LOV",
  description: "Dimensionér en seriekreds, kombiner virkelige modstandsværdier og kontrollér strøm og effekt uden at overbelaste komponenterne.",
  accent: "#7d73e8",
  estimatedMinutes: 10,
  instructionPane: {
    objective: "Indstil signallyset til cirka 14 mA med de modstande, der ligger på arbejdsbordet.",
    context: "Forsyningen leverer 9 V, mens lysdioden bruger 2 V. Resten af spændingen skal falde over seriemodstandene.",
    procedure: [
      "Træk diodens spændingsfald fra forsyningen.",
      "Beregn den ideelle samlede modstand med Ohms lov.",
      "Vælg en kombination, beregn den faktiske strøm og kontrollér effekten.",
    ],
    manual: [
      { id: "ohm", title: "Ohms lov", body: "Spænding, strøm og modstand hænger sammen. Milliampere skal divideres med 1.000 før beregningen.", formula: "U = R · I" },
      { id: "series", title: "Serieforbindelse", body: "Modstande i serie lægges sammen. Den samme strøm løber gennem alle komponenterne.", formula: "R_total = R₁ + R₂ + …" },
      { id: "power", title: "Effektkontrol", body: "Den samlede varmeeffekt i modstandene må være under 0,125 W.", formula: "P = I² · R" },
    ],
    glossary: [
      { danish: "spænding", english: "voltage" },
      { danish: "strømstyrke", english: "current" },
      { danish: "spændingsfald", english: "voltage drop" },
      { danish: "en serieforbindelse", english: "a series connection" },
    ],
  },
  workspace: {
    kind: "circuit",
    nodes: [
      { id: "plus", label: "+9 V", x: 8, y: 50 },
      { id: "after-switch", label: "Efter afbryder", x: 25, y: 50 },
      { id: "before-led", label: "Før LED", x: 72, y: 50 },
      { id: "minus", label: "0 V", x: 92, y: 50 },
    ],
    components: [
      { id: "supply", type: "source", from: "minus", to: "plus", label: "Forsyning", value: 9, unit: "V" },
      { id: "switch", type: "switch", from: "plus", to: "after-switch", label: "Testkontakt" },
      { id: "r330", type: "resistor", from: "after-switch", to: "before-led", label: "330 Ω", value: 330, unit: "Ω", selectable: true },
      { id: "r150", type: "resistor", from: "after-switch", to: "before-led", label: "150 Ω", value: 150, unit: "Ω", selectable: true },
      { id: "r22", type: "resistor", from: "after-switch", to: "before-led", label: "22 Ω", value: 22, unit: "Ω", selectable: true },
      { id: "r100", type: "resistor", from: "after-switch", to: "before-led", label: "100 Ω", value: 100, unit: "Ω", selectable: true },
      { id: "led", type: "diode", from: "before-led", to: "minus", label: "LED · 2 V", value: 2, unit: "V" },
      { id: "meter", type: "ammeter", from: "before-led", to: "minus", label: "mA" },
    ],
    target: { label: "Målstrøm", value: 14, unit: "mA" },
  },
  stages: [
    {
      id: "ideal-resistance",
      title: "Den ideelle værdi",
      instruction: "Beregn spændingen over modstandene og den modstand, der ideelt giver 14 mA.",
      workspacePrompt: "Forsyning 9 V · LED 2 V · mål 14 mA",
      fields: [
        { kind: "number", id: "resistor-voltage", label: "Spænding over modstandene", expected: 7, unit: "V", tolerance: { absolute: 0.01 } },
        { kind: "number", id: "ideal-resistance", label: "Ideel samlet modstand", expected: 500, unit: "Ω", acceptedUnits: [{ unit: "Ω", factor: 1 }, { unit: "kΩ", factor: 1_000 }], tolerance: { absolute: 0.5 } },
      ],
      solutionExplanation: "Modstandene får 9 − 2 = 7 V. Med 0,014 A bliver R = 7 / 0,014 = 500 Ω.",
    },
    {
      id: "build-network",
      title: "Byg serien",
      instruction: "Vælg den tilgængelige kombination, der kommer tættest på 500 Ω uden at bruge samme komponent to gange.",
      workspacePrompt: "Tilgængelig: 330 Ω · 150 Ω · 22 Ω · 100 Ω",
      dependsOn: ["ideal-resistance"],
      fields: [
        { kind: "selection", id: "resistors", label: "Valgte modstande", expectedOptionIds: ["r330", "r150", "r22"], orderMatters: false, options: [{ id: "r330", label: "330 Ω" }, { id: "r150", label: "150 Ω" }, { id: "r22", label: "22 Ω" }, { id: "r100", label: "100 Ω" }] },
        { kind: "number", id: "total", label: "Samlet modstand", expected: 502, unit: "Ω", tolerance: { absolute: 0.5 } },
      ],
      solutionExplanation: "330 + 150 + 22 = 502 Ω, kun 2 Ω fra den ideelle værdi. De øvrige kombinationer ligger længere væk.",
    },
    {
      id: "verify-current",
      title: "Målerens forventning",
      instruction: "Beregn den faktiske strøm gennem 502 Ω, og angiv den i milliampere.",
      workspacePrompt: "I = 7 V / 502 Ω",
      dependsOn: ["build-network"],
      fields: [
        { kind: "number", id: "actual-current", label: "Faktisk strøm", expected: 13.9442231076, unit: "mA", acceptedUnits: [{ unit: "mA", factor: 1 }, { unit: "A", factor: 1_000 }], tolerance: { absolute: 0.02 } },
      ],
      solutionExplanation: "7 / 502 = 0,013944 A, altså cirka 13,94 mA.",
    },
    {
      id: "verify-power",
      title: "Varmekontrollen",
      instruction: "Beregn den samlede effekt i modstandene, og afgør om grænsen på 0,125 W overholdes.",
      workspacePrompt: "Brug den faktiske strøm, ikke målstrømmen.",
      dependsOn: ["verify-current"],
      fields: [
        { kind: "number", id: "power", label: "Samlet effekt", expected: 0.0976095618, unit: "W", acceptedUnits: [{ unit: "W", factor: 1 }, { unit: "mW", factor: 0.001 }], tolerance: { absolute: 0.001 } },
        { kind: "choice", id: "safe", label: "Resultat", expectedOptionId: "safe", options: [{ id: "safe", label: "Kredsen er under grænsen" }, { id: "unsafe", label: "Kredsen overskrider grænsen" }] },
      ],
      solutionExplanation: "P = 0,013944² · 502 ≈ 0,0976 W. Det er lavere end 0,125 W.",
    },
  ],
};

const measurementCase: ScienceScenarioCase = {
  id: "maalingen-der-ikke-er-et-punkt",
  kind: "measurement-uncertainty",
  courseLevel: 17,
  level: "B2",
  title: "Målingen, der ikke er et punkt",
  englishTitle: "The measurement that is not a point",
  eyebrow: "METROLOGI · USIKKERHED",
  description: "Sammenfat gentagne målinger uden falsk præcision, beregn absolut og relativ usikkerhed, og vurder et krav som et interval.",
  accent: "#e0a24d",
  estimatedMinutes: 11,
  instructionPane: {
    objective: "Afgør, om fem målinger dokumenterer, at akslen overholder tolerancen 42,50 ± 0,25 mm.",
    context: "En kollega vil rapportere kun den pæneste måling. Du skal i stedet bruge hele serien og instrumentets opløsning.",
    procedure: [
      "Beregn middelværdien af alle fem aflæsninger.",
      "Beregn halvdelen af variationsbredden, og sammenlign med halvdelen af opløsningen.",
      "Brug den største værdi som absolut usikkerhed, og vurder hele intervallet mod specifikationen.",
    ],
    manual: [
      { id: "mean", title: "Middelværdi", body: "Middelværdien er summen af alle aflæsninger divideret med antallet.", formula: "x̄ = Σx / n" },
      { id: "spread", title: "Spredning", body: "I denne øvelse estimeres spredningen som halvdelen af variationsbredden.", formula: "u_spredning = (x_max − x_min) / 2" },
      { id: "instrument", title: "Instrumentbidrag", body: "Instrumentets bidrag sættes til halvdelen af opløsningen. Den rapporterede usikkerhed er det største af de to bidrag.", formula: "u = max(u_spredning, opløsning / 2)" },
      { id: "relative", title: "Relativ usikkerhed", body: "Divider den absolutte usikkerhed med middelværdien, og gang med 100 %.", formula: "u_rel = u / x̄ · 100 %" },
    ],
    glossary: [
      { danish: "en aflæsning", english: "a reading" },
      { danish: "opløsning", english: "resolution" },
      { danish: "variationsbredde", english: "range" },
      { danish: "måleusikkerhed", english: "measurement uncertainty" },
      { danish: "at overholde", english: "to comply with" },
    ],
  },
  workspace: {
    kind: "measurement-bench",
    instrument: { label: "Digital skydelære", resolution: 0.1, unit: "mm", scaleStart: 42, scaleEnd: 43, majorTick: 0.1 },
    readings: [42.4, 42.6, 42.5, 42.7, 42.3],
    specification: { center: 42.5, plusMinus: 0.25, unit: "mm" },
  },
  stages: [
    {
      id: "central-value",
      title: "Saml måleserien",
      instruction: "Beregn middelværdien af samtlige fem aflæsninger.",
      workspacePrompt: "42,4 · 42,6 · 42,5 · 42,7 · 42,3 mm",
      fields: [{ kind: "number", id: "mean", label: "Middelværdi", expected: 42.5, unit: "mm", tolerance: { absolute: 0.005 } }],
      solutionExplanation: "Summen er 212,5 mm; divideret med fem giver det 42,5 mm.",
    },
    {
      id: "absolute-uncertainty",
      title: "Usikkerhedens størrelse",
      instruction: "Beregn både halvdelen af variationsbredden og den usikkerhed, der skal rapporteres.",
      workspacePrompt: "Opløsning: 0,1 mm",
      dependsOn: ["central-value"],
      fields: [
        { kind: "number", id: "half-range", label: "Halv variationsbredde", expected: 0.2, unit: "mm", tolerance: { absolute: 0.005 } },
        { kind: "number", id: "reported", label: "Rapporteret absolut usikkerhed", expected: 0.2, unit: "mm", tolerance: { absolute: 0.005 } },
      ],
      solutionExplanation: "(42,7 − 42,3) / 2 = 0,2 mm. Instrumentets halve opløsning er kun 0,05 mm, så 0,2 mm vælges.",
    },
    {
      id: "relative-uncertainty",
      title: "Sammenlignelig usikkerhed",
      instruction: "Omregn den absolutte usikkerhed til procent af middelværdien.",
      workspacePrompt: "0,2 mm i forhold til 42,5 mm",
      dependsOn: ["absolute-uncertainty"],
      fields: [{ kind: "number", id: "relative", label: "Relativ usikkerhed", expected: 0.4705882353, unit: "%", tolerance: { absolute: 0.01 } }],
      solutionExplanation: "Den relative usikkerhed er 0,2 / 42,5 · 100 % ≈ 0,47 % af middelværdien.",
    },
    {
      id: "compliance",
      title: "En ærlig konklusion",
      instruction: "Sammenlign måleresultatet 42,50 ± 0,20 mm med kravet 42,50 ± 0,25 mm.",
      workspacePrompt: "Måleinterval: 42,30–42,70 mm · krav: 42,25–42,75 mm",
      dependsOn: ["relative-uncertainty"],
      fields: [{ kind: "choice", id: "decision", label: "Konklusion", expectedOptionId: "within", options: [{ id: "within", label: "Hele måleintervallet er inden for kravet" }, { id: "overlap", label: "Intervallerne overlapper kun delvist" }, { id: "outside", label: "Målingen dokumenterer en overskridelse" }] }],
      solutionExplanation: "Intervallet 42,30–42,70 mm ligger helt inden for 42,25–42,75 mm. Serien kan derfor godkendes efter øvelsens regel.",
    },
  ],
};

const leverCase: ScienceScenarioCase = {
  id: "kranen-i-balance",
  kind: "lever-balance",
  courseLevel: 18,
  level: "A2+",
  title: "Kranen i balance",
  englishTitle: "The crane in balance",
  eyebrow: "MEKANIK · KRAFTARM",
  description: "Læs en enkel kranmanual, beregn kraft og drejemoment, og placér kontravægten i den eneste rille, der skaber balance.",
  accent: "#54b9dd",
  estimatedMinutes: 8,
  instructionPane: {
    objective: "Balancér prøvekranen uden at flytte lasten på venstre side.",
    context: "En last på 18 kg hænger 0,75 m til venstre for akslen. En kontravægt på 15 kg kan flyttes mellem fire riller til højre.",
    procedure: [
      "Beregn lastens tyngdekraft med g = 9,81 N/kg.",
      "Beregn dens drejemoment omkring akslen.",
      "Vælg den rille, hvor kontravægten giver samme drejemoment i modsat retning.",
    ],
    manual: [
      { id: "force", title: "Tyngdekraft", body: "Massen skal ganges med tyngdeaccelerationen.", formula: "F = m · g" },
      { id: "moment", title: "Drejemoment", body: "Kraften ganges med den vinkelrette afstand til akslen.", formula: "M = F · d" },
      { id: "balance", title: "Balance", body: "Kranen er i balance, når venstre og højre drejemoment er lige store og peger hver sin vej.", formula: "M_venstre = M_højre" },
    ],
    glossary: [
      { danish: "en kraft", english: "a force" },
      { danish: "en aksel", english: "a pivot" },
      { danish: "en kontravægt", english: "a counterweight" },
      { danish: "et drejemoment", english: "a torque" },
    ],
  },
  workspace: {
    kind: "lever",
    beam: { minimumPosition: -1, maximumPosition: 1, pivotPosition: 0, unit: "m" },
    loads: [
      { id: "cargo", label: "Last", massKg: 18, positionM: -0.75 },
      { id: "counterweight", label: "Kontravægt", massKg: 15, adjustableSlotsM: [0.45, 0.6, 0.75, 0.9] },
    ],
    gravity: 9.81,
  },
  stages: [
    {
      id: "load-force",
      title: "Kraften nedad",
      instruction: "Beregn tyngdekraften på lasten på 18 kg.",
      workspacePrompt: "m = 18 kg · g = 9,81 N/kg",
      fields: [{ kind: "number", id: "force", label: "Tyngdekraft", expected: 176.58, unit: "N", tolerance: { absolute: 0.02 } }],
      solutionExplanation: "Tyngdekraften findes som masse gange tyngdeacceleration: 18 · 9,81 = 176,58 N.",
    },
    {
      id: "load-torque",
      title: "Venstre drejemoment",
      instruction: "Beregn drejemomentets størrelse 0,75 m fra akslen.",
      workspacePrompt: "M = 176,58 N · 0,75 m",
      dependsOn: ["load-force"],
      fields: [{ kind: "number", id: "torque", label: "Drejemoment", expected: 132.435, unit: "N·m", tolerance: { absolute: 0.02 } }],
      solutionExplanation: "Lastens kraft virker 0,75 m fra akslen, så drejemomentet er 176,58 · 0,75 = 132,435 N·m.",
    },
    {
      id: "place-counterweight",
      title: "Den rigtige rille",
      instruction: "Vælg kontravægtens afstand, så højre drejemoment bliver lige så stort.",
      workspacePrompt: "Kontravægt: 15 kg · mulige riller: 0,45 / 0,60 / 0,75 / 0,90 m",
      dependsOn: ["load-torque"],
      fields: [
        { kind: "number", id: "distance", label: "Afstand fra akslen", expected: 0.9, unit: "m", tolerance: { absolute: 0.005 } },
        { kind: "choice", id: "slot", label: "Valgt rille", expectedOptionId: "slot-090", options: [{ id: "slot-045", label: "0,45 m" }, { id: "slot-060", label: "0,60 m" }, { id: "slot-075", label: "0,75 m" }, { id: "slot-090", label: "0,90 m" }] },
      ],
      solutionExplanation: "15 · 9,81 · d = 132,435. Derfor er d = 0,90 m, som er den yderste rille.",
    },
  ],
};

const densityCase: ScienceScenarioCase = {
  id: "tre-proever-i-saltvand",
  kind: "density-lab",
  courseLevel: 19,
  level: "B1",
  title: "Tre prøver i saltvand",
  englishTitle: "Three samples in brine",
  eyebrow: "MATERIALELÆRE · MASSEFYLDE",
  description: "Beregn massefylde ud fra masse og volumen, identificér materialer og forudsig opdrift i en væske med kendt massefylde.",
  accent: "#40b7a4",
  estimatedMinutes: 10,
  instructionPane: {
    objective: "Identificér tre umærkede prøver, og vælg den prøve, der flyder stabilt i saltvand.",
    context: "Prøverne har forskellig form, men massefylden afhænger kun af deres masse og volumen.",
    procedure: [
      "Divider hver prøves masse med dens volumen.",
      "Sammenlign resultatet med materialetabellen.",
      "Sammenlign prøvens massefylde med saltvandets, og beregn flydemarginen.",
    ],
    manual: [
      { id: "density", title: "Massefylde", body: "Når massen måles i gram og volumen i kubikcentimeter, fås resultatet direkte i g/cm³.", formula: "ρ = m / V" },
      { id: "identify", title: "Materialesammenligning", body: "Vælg den referenceværdi, som svarer til den beregnede massefylde. I denne øvelse er prøverne homogene." },
      { id: "float", title: "Flyde eller synke", body: "En prøve flyder, hvis dens massefylde er lavere end væskens. Forskellen kan udtrykkes som procent af væskens massefylde.", formula: "margin = (ρ_væske − ρ_prøve) / ρ_væske · 100 %" },
    ],
    glossary: [
      { danish: "massefylde", english: "density" },
      { danish: "volumen", english: "volume" },
      { danish: "en prøve", english: "a sample" },
      { danish: "opdrift", english: "buoyancy" },
      { danish: "at synke", english: "to sink" },
    ],
  },
  workspace: {
    kind: "density-tank",
    fluid: { label: "Saltvand", density: 1.05, unit: "g/cm³" },
    samples: [
      { id: "sample-a", label: "Prøve A", shape: "cylinder", massG: 390, volumeCm3: 50 },
      { id: "sample-b", label: "Prøve B", shape: "block", massG: 216, volumeCm3: 80 },
      { id: "sample-c", label: "Prøve C", shape: "irregular", massG: 115, volumeCm3: 125 },
    ],
    materialReference: [
      { id: "steel", label: "Stål", density: 7.8, unit: "g/cm³" },
      { id: "aluminium", label: "Aluminium", density: 2.7, unit: "g/cm³" },
      { id: "oak", label: "Tørt egetræ", density: 0.92, unit: "g/cm³" },
    ],
  },
  stages: [
    {
      id: "calculate-densities",
      title: "Tre forholdstal",
      instruction: "Beregn massefylden for alle tre prøver.",
      workspacePrompt: "Brug m / V for hver prøve.",
      fields: [
        { kind: "number", id: "density-a", label: "Prøve A", expected: 7.8, unit: "g/cm³", tolerance: { absolute: 0.01 } },
        { kind: "number", id: "density-b", label: "Prøve B", expected: 2.7, unit: "g/cm³", tolerance: { absolute: 0.01 } },
        { kind: "number", id: "density-c", label: "Prøve C", expected: 0.92, unit: "g/cm³", tolerance: { absolute: 0.01 } },
      ],
      solutionExplanation: "A: 390/50 = 7,8. B: 216/80 = 2,7. C: 115/125 = 0,92 g/cm³.",
    },
    {
      id: "identify-materials",
      title: "Navn på prøverne",
      instruction: "Kobl hver prøve til den tilsvarende reference i materialetabellen.",
      workspacePrompt: "Stål 7,8 · aluminium 2,7 · tørt egetræ 0,92 g/cm³",
      dependsOn: ["calculate-densities"],
      fields: [
        { kind: "choice", id: "material-a", label: "Prøve A", expectedOptionId: "steel", options: [{ id: "steel", label: "Stål" }, { id: "aluminium", label: "Aluminium" }, { id: "oak", label: "Tørt egetræ" }] },
        { kind: "choice", id: "material-b", label: "Prøve B", expectedOptionId: "aluminium", options: [{ id: "steel", label: "Stål" }, { id: "aluminium", label: "Aluminium" }, { id: "oak", label: "Tørt egetræ" }] },
        { kind: "choice", id: "material-c", label: "Prøve C", expectedOptionId: "oak", options: [{ id: "steel", label: "Stål" }, { id: "aluminium", label: "Aluminium" }, { id: "oak", label: "Tørt egetræ" }] },
      ],
      solutionExplanation: "De tre beregnede værdier matcher tabellen nøjagtigt: stål, aluminium og tørt egetræ.",
    },
    {
      id: "predict-buoyancy",
      title: "Prøven, der bliver oppe",
      instruction: "Vælg den prøve, der flyder i saltvand, og beregn dens procentvise margin under væskens massefylde.",
      workspacePrompt: "Saltvand: 1,05 g/cm³",
      dependsOn: ["identify-materials"],
      fields: [
        { kind: "choice", id: "floating", label: "Flydende prøve", expectedOptionId: "sample-c", options: [{ id: "sample-a", label: "Prøve A" }, { id: "sample-b", label: "Prøve B" }, { id: "sample-c", label: "Prøve C" }] },
        { kind: "number", id: "margin", label: "Flydemargin", expected: 12.380952381, unit: "%", tolerance: { absolute: 0.02 } },
      ],
      solutionExplanation: "Kun C har lavere massefylde end 1,05. Marginen er (1,05 − 0,92) / 1,05 · 100 % ≈ 12,38 %.",
    },
  ],
};

const thermalCase: ScienceScenarioCase = {
  id: "kuldebroens-regnskab",
  kind: "thermal-design",
  courseLevel: 20,
  level: "B2",
  title: "Kuldebroens regnskab",
  englishTitle: "The thermal bridge ledger",
  eyebrow: "TERMODYNAMIK · VARMETAB",
  description: "Modellér varmeledning gennem flere lag, omsæt effekt til energiforbrug og vælg den opgradering, der faktisk gør en målbar forskel.",
  accent: "#e26d64",
  estimatedMinutes: 12,
  instructionPane: {
    objective: "Beregn varmetabet gennem servicekassens låg over otte timer, og vælg den mest virksomme ekstra isolering.",
    context: "Låget består af mineraluld og krydsfiner. De to lag leder varme i serie over et areal på 2,0 m².",
    procedure: [
      "Beregn hvert lags termiske modstand, og læg dem sammen.",
      "Beregn varmeeffekten ved temperaturforskellen.",
      "Omregn effekten til energi over otte timer, og sammenlign de to opgraderinger.",
    ],
    manual: [
      { id: "layer", title: "Ét lag", body: "Et tykkere lag eller en lavere varmeledningsevne giver større termisk modstand.", formula: "R_lag = L / (k · A)" },
      { id: "series", title: "Lag i serie", body: "Når varmen passerer alle lag efter hinanden, lægges modstandene sammen.", formula: "R_total = ΣR_lag" },
      { id: "heat", title: "Varmeeffekt", body: "Temperaturforskel divideret med samlet termisk modstand giver effekten i watt.", formula: "P = ΔT / R_total" },
      { id: "energy", title: "Energi", body: "Watt gange timer giver watt-timer. Divider med 1.000 for kilowatt-timer.", formula: "E = P · t" },
    ],
    glossary: [
      { danish: "varmeledningsevne", english: "thermal conductivity" },
      { danish: "termisk modstand", english: "thermal resistance" },
      { danish: "et varmetab", english: "a heat loss" },
      { danish: "en kuldebro", english: "a thermal bridge" },
      { danish: "mineraluld", english: "mineral wool" },
    ],
  },
  workspace: {
    kind: "thermal-section",
    insideTemperatureC: 20,
    outsideTemperatureC: 2,
    areaM2: 2,
    durationHours: 8,
    layers: [
      { id: "wool", label: "Mineraluld", thicknessM: 0.12, conductivity: 0.04, color: "#c9b47b" },
      { id: "plywood", label: "Krydsfiner", thicknessM: 0.018, conductivity: 0.13, color: "#9f7654" },
    ],
    upgrades: [
      { id: "extra-wool", label: "+ 40 mm mineraluld", thicknessM: 0.04, conductivity: 0.04 },
      { id: "extra-plywood", label: "+ 12 mm krydsfiner", thicknessM: 0.012, conductivity: 0.13 },
    ],
  },
  stages: [
    {
      id: "layer-resistance",
      title: "Modstanden i hvert lag",
      instruction: "Beregn den termiske modstand for mineraluld og krydsfiner hver for sig.",
      workspacePrompt: "A = 2,0 m² · R = L / (k · A)",
      fields: [
        { kind: "number", id: "wool-r", label: "Mineraluld", expected: 1.5, unit: "K/W", tolerance: { absolute: 0.005 } },
        { kind: "number", id: "plywood-r", label: "Krydsfiner", expected: 0.0692307692, unit: "K/W", tolerance: { absolute: 0.001 } },
      ],
      solutionExplanation: "Mineraluld: 0,12/(0,04·2) = 1,50 K/W. Krydsfiner: 0,018/(0,13·2) ≈ 0,0692 K/W.",
    },
    {
      id: "baseline-loss",
      title: "Varmetabet nu",
      instruction: "Læg modstandene sammen, og beregn effekten ved 18 K temperaturforskel.",
      workspacePrompt: "Inde 20 °C · ude 2 °C",
      dependsOn: ["layer-resistance"],
      fields: [
        { kind: "number", id: "total-r", label: "Samlet termisk modstand", expected: 1.5692307692, unit: "K/W", tolerance: { absolute: 0.002 } },
        { kind: "number", id: "power", label: "Varmeeffekt", expected: 11.4705882353, unit: "W", tolerance: { absolute: 0.02 } },
      ],
      solutionExplanation: "R_total ≈ 1,5692 K/W. Derfor er P = 18/1,5692 ≈ 11,47 W.",
    },
    {
      id: "energy-ledger",
      title: "Otte timers energi",
      instruction: "Omregn den konstante varmeeffekt til kilowatt-timer over otte timer.",
      workspacePrompt: "E = 11,4706 W · 8 h",
      dependsOn: ["baseline-loss"],
      fields: [{ kind: "number", id: "energy", label: "Energitab", expected: 0.0917647059, unit: "kWh", acceptedUnits: [{ unit: "kWh", factor: 1 }, { unit: "Wh", factor: 0.001 }], tolerance: { absolute: 0.001 } }],
      solutionExplanation: "Over otte timer bliver energien 11,4706 · 8 = 91,76 Wh = 0,0918 kWh.",
    },
    {
      id: "choose-upgrade",
      title: "Den virksomme ændring",
      instruction: "Beregn effekten med 40 mm ekstra mineraluld, og vælg den bedste af de to opgraderinger.",
      workspacePrompt: "Ekstra mineraluld: R = 0,04/(0,04·2) = 0,50 K/W",
      dependsOn: ["energy-ledger"],
      fields: [
        { kind: "number", id: "upgraded-power", label: "Effekt med ekstra mineraluld", expected: 8.6988847584, unit: "W", tolerance: { absolute: 0.02 } },
        { kind: "number", id: "reduction", label: "Reduktion i procent", expected: 24.1635687732, unit: "%", tolerance: { absolute: 0.05 } },
        { kind: "choice", id: "upgrade", label: "Anbefalet opgradering", expectedOptionId: "extra-wool", options: [{ id: "extra-wool", label: "+ 40 mm mineraluld" }, { id: "extra-plywood", label: "+ 12 mm krydsfiner" }] },
      ],
      solutionExplanation: "Ekstra mineraluld løfter R_total til cirka 2,0692 K/W og sænker effekten til 8,70 W, omtrent 24,16 %. Krydsfiner giver langt mindre ekstra modstand.",
    },
  ],
};

export const scienceScenarioCases: ScienceScenarioCase[] = [
  resistorCodeCase,
  circuitTuningCase,
  measurementCase,
  leverCase,
  densityCase,
  thermalCase,
];

export const scienceScenarioRegistry = Object.fromEntries(
  scienceScenarioCases.map((scenario) => [scenario.id, scenario]),
) as Record<string, ScienceScenarioCase>;

export const scienceScenarioCards = scienceScenarioCases.map((scenario) => ({
  id: scenario.id,
  kind: scenario.kind,
  courseLevel: scenario.courseLevel,
  level: scenario.level,
  title: scenario.title,
  englishTitle: scenario.englishTitle,
  eyebrow: scenario.eyebrow,
  description: scenario.description,
  accent: scenario.accent,
  estimatedMinutes: scenario.estimatedMinutes,
}));
