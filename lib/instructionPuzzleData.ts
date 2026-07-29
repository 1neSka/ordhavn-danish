export type InstructionPuzzleMode = "safety-console" | "cargo-routing";
export type InstructionPuzzleLevel = "B1" | "B2";

export interface PuzzleFact {
  id: string;
  label: string;
  value: string;
  englishLabel: string;
}

export interface PuzzleManualRule {
  id: string;
  text: string;
  englishText: string;
}

export interface PuzzleManualSection {
  id: string;
  title: string;
  englishTitle: string;
  rules: PuzzleManualRule[];
}

export interface PuzzleControl {
  id: string;
  label: string;
  englishLabel: string;
  symbol: string;
  description: string;
}

export interface PuzzleCalculation {
  label: string;
  englishLabel: string;
  expression: string;
  expected: number;
  unit: string;
}

export interface InstructionPuzzleCase {
  id: string;
  mode: InstructionPuzzleMode;
  title: string;
  englishTitle: string;
  level: InstructionPuzzleLevel;
  location: string;
  objective: string;
  englishObjective: string;
  context: string;
  englishContext: string;
  safetyNote?: string;
  facts: PuzzleFact[];
  manual: PuzzleManualSection[];
  controls: PuzzleControl[];
  calculation: PuzzleCalculation;
  solution: string[];
  derivation: string[];
  maxScore: number;
}

export interface PuzzleEvaluation {
  success: boolean;
  sequenceCorrect: boolean;
  calculationCorrect: boolean;
  correctPositions: number;
}

export function evaluateInstructionPuzzle(
  puzzle: Readonly<InstructionPuzzleCase>,
  sequence: readonly string[],
  calculation: number,
): PuzzleEvaluation {
  const correctPositions = puzzle.solution.reduce(
    (count, controlId, index) => count + (sequence[index] === controlId ? 1 : 0),
    0,
  );
  const sequenceCorrect = sequence.length === puzzle.solution.length && correctPositions === puzzle.solution.length;
  const calculationCorrect = calculation === puzzle.calculation.expected;
  return {
    success: sequenceCorrect && calculationCorrect,
    sequenceCorrect,
    calculationCorrect,
    correctPositions,
  };
}

export const safetyConsoleCases: InstructionPuzzleCase[] = [
  {
    id: "safety-console-beacon-01",
    mode: "safety-console",
    title: "Fyrmodul 482",
    englishTitle: "Beacon module 482",
    level: "B1",
    location: "Øvelsesdæk A · Konsol 04",
    objective: "Stabilisér det abstrakte fyrsignal ved at følge manualens rækkefølge.",
    englishObjective: "Stabilize the abstract beacon signal by following the manual sequence.",
    context: "En træningskonsol viser et blåt signal, tre symboler og serienummer HN-482. Modulet styrer kun lys i denne simulation.",
    englishContext: "A training console shows a blue signal, three symbols, and serial HN-482. The module controls lights only in this simulation.",
    safetyNote: "Fiktiv havnesimulation · ingen virkelig maskine eller fare",
    facts: [
      { id: "serial", label: "Serienummer", value: "HN-482", englishLabel: "Serial number" },
      { id: "color", label: "Signalfarve", value: "Blå", englishLabel: "Signal color" },
      { id: "symbols", label: "Synlige symboler", value: "Anker · Fyr · Bølge", englishLabel: "Visible symbols" },
    ],
    manual: [
      {
        id: "start",
        title: "1 · Startsignal",
        englishTitle: "1 · Starting signal",
        rules: [
          { id: "start-even", text: "Slutter serienummeret på et lige tal, begynd med ANKER.", englishText: "If the serial ends in an even number, begin with ANCHOR." },
          { id: "start-odd", text: "Slutter det på et ulige tal, begynd med BØLGE.", englishText: "If it ends in an odd number, begin with WAVE." },
        ],
      },
      {
        id: "color",
        title: "2 · Farvekode",
        englishTitle: "2 · Color code",
        rules: [
          { id: "color-blue", text: "Blå vælger FYR som andet signal.", englishText: "Blue selects BEACON as the second signal." },
          { id: "color-amber", text: "Ravfarvet vælger RING som andet signal.", englishText: "Amber selects RING as the second signal." },
        ],
      },
      {
        id: "sum",
        title: "3 · Kontroltal",
        englishTitle: "3 · Check value",
        rules: [
          { id: "sum-rule", text: "Læg alle cifre sammen. Ved 12 eller mere vælges BØLGE; ellers vælges RING.", englishText: "Add all digits. At 12 or more choose WAVE; otherwise choose RING." },
          { id: "finish", text: "Afslut altid med GODKEND.", englishText: "Always finish with CONFIRM." },
        ],
      },
    ],
    controls: [
      { id: "anchor", label: "Anker", englishLabel: "Anchor", symbol: "⚓", description: "Fast reference" },
      { id: "beacon", label: "Fyr", englishLabel: "Beacon", symbol: "◉", description: "Light marker" },
      { id: "wave", label: "Bølge", englishLabel: "Wave", symbol: "≈", description: "Flow marker" },
      { id: "ring", label: "Ring", englishLabel: "Ring", symbol: "○", description: "Cycle marker" },
      { id: "confirm", label: "Godkend", englishLabel: "Confirm", symbol: "✓", description: "Complete sequence" },
    ],
    calculation: { label: "Kontroltal", englishLabel: "Check value", expression: "4 + 8 + 2", expected: 14, unit: "point" },
    solution: ["anchor", "beacon", "wave", "confirm"],
    derivation: [
      "2 er lige, derfor starter sekvensen med ANKER.",
      "Det blå signal vælger FYR som nummer to.",
      "4 + 8 + 2 = 14, så tredje signal er BØLGE.",
      "Manualen kræver GODKEND til sidst.",
    ],
    maxScore: 420,
  },
  {
    id: "safety-console-ring-02",
    mode: "safety-console",
    title: "Ringmodul 731",
    englishTitle: "Ring module 731",
    level: "B1",
    location: "Øvelsesdæk B · Konsol 11",
    objective: "Læs undtagelsen for ravfarvet signal, og byg den korrekte kommandokæde.",
    englishObjective: "Read the amber-signal exception and build the correct command chain.",
    context: "Træningsmodulet har serienummer HS-731, ravfarvet indikator og symbolerne bølge, ring og kompas.",
    englishContext: "The training module has serial HS-731, an amber indicator, and the symbols wave, ring, and compass.",
    safetyNote: "Fiktiv havnesimulation · modulet styrer kun et mønster på skærmen",
    facts: [
      { id: "serial", label: "Serienummer", value: "HS-731", englishLabel: "Serial number" },
      { id: "color", label: "Signalfarve", value: "Ravfarvet", englishLabel: "Signal color" },
      { id: "symbols", label: "Synlige symboler", value: "Bølge · Ring · Kompas", englishLabel: "Visible symbols" },
    ],
    manual: [
      {
        id: "start",
        title: "1 · Første kommando",
        englishTitle: "1 · First command",
        rules: [
          { id: "odd-wave", text: "Et ulige sidste ciffer starter med BØLGE.", englishText: "An odd final digit starts with WAVE." },
          { id: "even-anchor", text: "Et lige sidste ciffer starter med ANKER.", englishText: "An even final digit starts with ANCHOR." },
        ],
      },
      {
        id: "amber",
        title: "2 · Ravfarvet undtagelse",
        englishTitle: "2 · Amber exception",
        rules: [
          { id: "amber-ring", text: "Ved ravfarvet signal skal RING altid stå umiddelbart efter startsignalet.", englishText: "With an amber signal, RING must always follow the starting signal immediately." },
          { id: "amber-value", text: "Beregn første ciffer + andet ciffer − sidste ciffer.", englishText: "Calculate first digit + second digit − final digit." },
        ],
      },
      {
        id: "direction",
        title: "3 · Retning",
        englishTitle: "3 · Direction",
        rules: [
          { id: "direction-high", text: "Er kontroltallet 8 eller mere, vælg KOMPAS. Ellers vælg FYR.", englishText: "If the check value is 8 or more, choose COMPASS. Otherwise choose BEACON." },
          { id: "finish", text: "GODKEND er altid sidste kommando.", englishText: "CONFIRM is always the final command." },
        ],
      },
    ],
    controls: [
      { id: "wave", label: "Bølge", englishLabel: "Wave", symbol: "≈", description: "Flow marker" },
      { id: "ring", label: "Ring", englishLabel: "Ring", symbol: "○", description: "Cycle marker" },
      { id: "compass", label: "Kompas", englishLabel: "Compass", symbol: "✦", description: "Direction marker" },
      { id: "beacon", label: "Fyr", englishLabel: "Beacon", symbol: "◉", description: "Light marker" },
      { id: "confirm", label: "Godkend", englishLabel: "Confirm", symbol: "✓", description: "Complete sequence" },
    ],
    calculation: { label: "Kontroltal", englishLabel: "Check value", expression: "7 + 3 − 1", expected: 9, unit: "point" },
    solution: ["wave", "ring", "compass", "confirm"],
    derivation: [
      "1 er ulige, derfor starter sekvensen med BØLGE.",
      "Det ravfarvede signal placerer RING direkte efter startsignalet.",
      "7 + 3 − 1 = 9, og 9 vælger KOMPAS.",
      "GODKEND lukker sekvensen.",
    ],
    maxScore: 440,
  },
  {
    id: "safety-console-grid-03",
    mode: "safety-console",
    title: "Gittermodul 9254",
    englishTitle: "Grid module 9254",
    level: "B2",
    location: "Simulationsrum · Konsol 19",
    objective: "Kombinér serienummerets længde, grøn status og et sammensat kontroltal.",
    englishObjective: "Combine serial length, green status, and a compound check value.",
    context: "Simulationsgitteret viser serienummer KR-9254, grøn status og tre forskellige symboler: kompas, bølge og anker.",
    englishContext: "The simulation grid shows serial KR-9254, green status, and three distinct symbols: compass, wave, and anchor.",
    safetyNote: "Fiktiv havnesimulation · ingen virkelig installation er forbundet",
    facts: [
      { id: "serial", label: "Serienummer", value: "KR-9254", englishLabel: "Serial number" },
      { id: "color", label: "Statusfarve", value: "Grøn", englishLabel: "Status color" },
      { id: "symbols", label: "Forskellige symboler", value: "3", englishLabel: "Distinct symbols" },
    ],
    manual: [
      {
        id: "length",
        title: "1 · Serienummerets længde",
        englishTitle: "1 · Serial length",
        rules: [
          { id: "four-compass", text: "Har serienummeret fire cifre, begynd med KOMPAS. Har det tre, begynd med ANKER.", englishText: "For a four-digit serial, begin with COMPASS. For three digits, begin with ANCHOR." },
          { id: "green-wave", text: "Ved grøn status følger BØLGE som nummer to.", englishText: "With green status, WAVE follows in second position." },
        ],
      },
      {
        id: "compound",
        title: "2 · Sammensat kontroltal",
        englishTitle: "2 · Compound check value",
        rules: [
          { id: "formula", text: "Læg første og sidste ciffer sammen, og gang med antallet af forskellige symboler.", englishText: "Add the first and final digits, then multiply by the number of distinct symbols." },
          { id: "threshold", text: "Er resultatet over 30, tryk ANKER og derefter RING. Ellers tryk RING og derefter FYR.", englishText: "If the result is above 30, press ANCHOR then RING. Otherwise press RING then BEACON." },
        ],
      },
      {
        id: "finish",
        title: "3 · Afslutning",
        englishTitle: "3 · Finish",
        rules: [
          { id: "finish-confirm", text: "Efter de fire signaler afsluttes med GODKEND.", englishText: "After the four signals, finish with CONFIRM." },
        ],
      },
    ],
    controls: [
      { id: "compass", label: "Kompas", englishLabel: "Compass", symbol: "✦", description: "Direction marker" },
      { id: "wave", label: "Bølge", englishLabel: "Wave", symbol: "≈", description: "Flow marker" },
      { id: "anchor", label: "Anker", englishLabel: "Anchor", symbol: "⚓", description: "Fixed reference" },
      { id: "ring", label: "Ring", englishLabel: "Ring", symbol: "○", description: "Cycle marker" },
      { id: "beacon", label: "Fyr", englishLabel: "Beacon", symbol: "◉", description: "Light marker" },
      { id: "confirm", label: "Godkend", englishLabel: "Confirm", symbol: "✓", description: "Complete sequence" },
    ],
    calculation: { label: "Gitterværdi", englishLabel: "Grid value", expression: "(9 + 4) × 3", expected: 39, unit: "point" },
    solution: ["compass", "wave", "anchor", "ring", "confirm"],
    derivation: [
      "Fire cifre vælger KOMPAS som start.",
      "Grøn status placerer BØLGE som nummer to.",
      "(9 + 4) × 3 = 39, som er over 30; derfor følger ANKER og RING.",
      "GODKEND afslutter de fire signaler.",
    ],
    maxScore: 500,
  },
];

export const cargoRoutingCases: InstructionPuzzleCase[] = [
  {
    id: "cargo-routing-cold-01",
    mode: "cargo-routing",
    title: "Kølekassen ved kaj C",
    englishTitle: "The chilled crate at quay C",
    level: "B1",
    location: "Tidevandscentralen · 06.35",
    objective: "Send kølelasten gennem den rigtige kanal ved hjælp af tidevandstabellen.",
    englishObjective: "Route the chilled cargo through the correct channel using the tide table.",
    context: "En last med kølede fødevarer ankommer ved tidevand 4. Vinden er østlig, vandet stiger én enhed, og destinationen er kaj C.",
    englishContext: "A chilled food cargo arrives at tide level 4. The wind is easterly, the water rises by one unit, and the destination is quay C.",
    facts: [
      { id: "tide", label: "Tidevand nu", value: "4 · stigende +1", englishLabel: "Tide now" },
      { id: "wind", label: "Vind", value: "Øst", englishLabel: "Wind" },
      { id: "cargo", label: "Last", value: "Kølede fødevarer", englishLabel: "Cargo" },
      { id: "quay", label: "Destination", value: "Kaj C", englishLabel: "Destination" },
    ],
    manual: [
      {
        id: "departure",
        title: "1 · Afgangssignal",
        englishTitle: "1 · Departure signal",
        rules: [
          { id: "even-north", text: "Et lige tidevand starter med NORD. Et ulige starter med SYD.", englishText: "An even tide starts with NORTH. An odd tide starts with SOUTH." },
          { id: "cold", text: "Kølelast skal registreres med KØL direkte efter afgangssignalet.", englishText: "Chilled cargo must be registered with COLD directly after the departure signal." },
        ],
      },
      {
        id: "wind",
        title: "2 · Vindrute",
        englishTitle: "2 · Wind route",
        rules: [
          { id: "east-canal", text: "Østenvind vælger KANAL. Vestenvind vælger YDERRUTE.", englishText: "Easterly wind selects CANAL. Westerly wind selects OUTER ROUTE." },
          { id: "arrival", text: "Beregn tidevandet ved ankomst. Ved 5 eller lavere åbnes KAJ C; ellers åbnes KAJ D.", englishText: "Calculate tide at arrival. At 5 or below open QUAY C; otherwise open QUAY D." },
        ],
      },
      {
        id: "finish",
        title: "3 · Frigivelse",
        englishTitle: "3 · Release",
        rules: [{ id: "dispatch", text: "Afslut alle ruter med SEND.", englishText: "Finish every route with DISPATCH." }],
      },
    ],
    controls: [
      { id: "north", label: "Nord", englishLabel: "North", symbol: "N", description: "Northern departure" },
      { id: "south", label: "Syd", englishLabel: "South", symbol: "S", description: "Southern departure" },
      { id: "cold", label: "Køl", englishLabel: "Cold", symbol: "❄", description: "Chilled cargo flag" },
      { id: "canal", label: "Kanal", englishLabel: "Canal", symbol: "↝", description: "Inner channel" },
      { id: "outer", label: "Yderrute", englishLabel: "Outer route", symbol: "↗", description: "Outer channel" },
      { id: "quay-c", label: "Kaj C", englishLabel: "Quay C", symbol: "C", description: "Cargo destination" },
      { id: "quay-d", label: "Kaj D", englishLabel: "Quay D", symbol: "D", description: "Alternate destination" },
      { id: "dispatch", label: "Send", englishLabel: "Dispatch", symbol: "✓", description: "Release route" },
    ],
    calculation: { label: "Tidevand ved ankomst", englishLabel: "Tide at arrival", expression: "4 + 1", expected: 5, unit: "enheder" },
    solution: ["north", "cold", "canal", "quay-c", "dispatch"],
    derivation: [
      "Tidevand 4 er lige, så ruten starter med NORD.",
      "Kølede fødevarer kræver KØL direkte bagefter.",
      "Østenvind vælger KANAL.",
      "4 + 1 = 5, så lasten sendes til KAJ C og afsluttes med SEND.",
    ],
    maxScore: 440,
  },
  {
    id: "cargo-routing-fragile-02",
    mode: "cargo-routing",
    title: "Keramik i faldende vand",
    englishTitle: "Ceramics in falling water",
    level: "B1",
    location: "Tidevandscentralen · 14.20",
    objective: "Beskyt den skrøbelige last og vælg ruten ud fra vind og ankomstvandstand.",
    englishObjective: "Protect the fragile cargo and select the route from wind and arrival tide.",
    context: "Keramik ankommer ved tidevand 3. Vandet falder én enhed, vinden er vestlig, og losningen er reserveret ved kaj B.",
    englishContext: "Ceramics arrive at tide level 3. The water falls by one unit, the wind is westerly, and unloading is reserved at quay B.",
    facts: [
      { id: "tide", label: "Tidevand nu", value: "3 · faldende −1", englishLabel: "Tide now" },
      { id: "wind", label: "Vind", value: "Vest", englishLabel: "Wind" },
      { id: "cargo", label: "Last", value: "Skrøbelig keramik", englishLabel: "Cargo" },
      { id: "quay", label: "Reservation", value: "Kaj B", englishLabel: "Reservation" },
    ],
    manual: [
      {
        id: "departure",
        title: "1 · Afgang",
        englishTitle: "1 · Departure",
        rules: [
          { id: "odd-south", text: "Et ulige tidevand starter med SYD; et lige starter med NORD.", englishText: "An odd tide starts with SOUTH; an even tide starts with NORTH." },
          { id: "fragile", text: "Skrøbelig last markeres med VARSOM, før en rute vælges.", englishText: "Fragile cargo is marked CAREFUL before a route is selected." },
        ],
      },
      {
        id: "route",
        title: "2 · Rute og kaj",
        englishTitle: "2 · Route and quay",
        rules: [
          { id: "west-outer", text: "Vestenvind vælger YDERRUTE; østenvind vælger KANAL.", englishText: "Westerly wind selects OUTER ROUTE; easterly wind selects CANAL." },
          { id: "quay-parity", text: "Beregn tidevandet ved ankomst. Et lige resultat bekræfter KAJ B; et ulige bekræfter KAJ C.", englishText: "Calculate tide at arrival. An even result confirms QUAY B; an odd result confirms QUAY C." },
        ],
      },
      {
        id: "finish",
        title: "3 · Frigivelse",
        englishTitle: "3 · Release",
        rules: [{ id: "dispatch", text: "SEND står sidst i alle godkendte ruter.", englishText: "DISPATCH is last in every approved route." }],
      },
    ],
    controls: [
      { id: "north", label: "Nord", englishLabel: "North", symbol: "N", description: "Northern departure" },
      { id: "south", label: "Syd", englishLabel: "South", symbol: "S", description: "Southern departure" },
      { id: "careful", label: "Varsom", englishLabel: "Careful", symbol: "◇", description: "Fragile cargo flag" },
      { id: "canal", label: "Kanal", englishLabel: "Canal", symbol: "↝", description: "Inner channel" },
      { id: "outer", label: "Yderrute", englishLabel: "Outer route", symbol: "↗", description: "Outer channel" },
      { id: "quay-b", label: "Kaj B", englishLabel: "Quay B", symbol: "B", description: "Cargo destination" },
      { id: "quay-c", label: "Kaj C", englishLabel: "Quay C", symbol: "C", description: "Alternate destination" },
      { id: "dispatch", label: "Send", englishLabel: "Dispatch", symbol: "✓", description: "Release route" },
    ],
    calculation: { label: "Tidevand ved ankomst", englishLabel: "Tide at arrival", expression: "3 − 1", expected: 2, unit: "enheder" },
    solution: ["south", "careful", "outer", "quay-b", "dispatch"],
    derivation: [
      "Tidevand 3 er ulige, så ruten starter med SYD.",
      "Keramikken kræver VARSOM før rutevalget.",
      "Vestenvind vælger YDERRUTE.",
      "3 − 1 = 2 er lige, så KAJ B bekræftes før SEND.",
    ],
    maxScore: 460,
  },
  {
    id: "cargo-routing-medical-03",
    mode: "cargo-routing",
    title: "Prioritetslast ved højvande",
    englishTitle: "Priority cargo at high tide",
    level: "B2",
    location: "Tidevandscentralen · 22.45",
    objective: "Kombinér prioritet, fremtidigt tidevand og brokapacitet i én rute.",
    englishObjective: "Combine priority, future tide, and bridge capacity in one route.",
    context: "Medicinsk udstyr skal til kaj D. Tidevandet er 7 og stiger 2. Nordenvind fordobler broens grundværdi 9.",
    englishContext: "Medical supplies must reach quay D. The tide is 7 and rises by 2. A northerly wind doubles the bridge base value of 9.",
    facts: [
      { id: "tide", label: "Tidevand nu", value: "7 · stigende +2", englishLabel: "Tide now" },
      { id: "wind", label: "Vind", value: "Nord", englishLabel: "Wind" },
      { id: "cargo", label: "Last", value: "Medicinsk prioritet", englishLabel: "Cargo" },
      { id: "bridge", label: "Broens grundværdi", value: "9", englishLabel: "Bridge base value" },
      { id: "quay", label: "Destination", value: "Kaj D", englishLabel: "Destination" },
    ],
    manual: [
      {
        id: "priority",
        title: "1 · Prioritet og tidevand",
        englishTitle: "1 · Priority and tide",
        rules: [
          { id: "priority-first", text: "Medicinsk last starter altid med PRIORITET før retningssignalet.", englishText: "Medical cargo always starts with PRIORITY before the direction signal." },
          { id: "future-parity", text: "Beregn tidevandet ved ankomst. Et ulige resultat vælger SYD; et lige vælger NORD.", englishText: "Calculate tide at arrival. An odd result selects SOUTH; an even result selects NORTH." },
        ],
      },
      {
        id: "bridge",
        title: "2 · Brokapacitet",
        englishTitle: "2 · Bridge capacity",
        rules: [
          { id: "north-double", text: "Ved nordenvind ganges broens grundværdi med 2. Ved anden vind bruges grundværdien uændret.", englishText: "With a northerly wind, multiply the bridge base value by 2. With other wind, use the base value unchanged." },
          { id: "bridge-threshold", text: "Ved 16 eller mere vælges HØJ BRO. Ellers vælges LAV BRO.", englishText: "At 16 or more select HIGH BRIDGE. Otherwise select LOW BRIDGE." },
        ],
      },
      {
        id: "destination",
        title: "3 · Destination",
        englishTitle: "3 · Destination",
        rules: [
          { id: "destination-d", text: "Prioritetslast i denne vagt afsluttes med KAJ D og derefter SEND.", englishText: "Priority cargo on this watch finishes with QUAY D and then DISPATCH." },
        ],
      },
    ],
    controls: [
      { id: "priority", label: "Prioritet", englishLabel: "Priority", symbol: "!", description: "Medical priority flag" },
      { id: "north", label: "Nord", englishLabel: "North", symbol: "N", description: "Northern departure" },
      { id: "south", label: "Syd", englishLabel: "South", symbol: "S", description: "Southern departure" },
      { id: "high-bridge", label: "Høj bro", englishLabel: "High bridge", symbol: "⌂", description: "High-capacity bridge" },
      { id: "low-bridge", label: "Lav bro", englishLabel: "Low bridge", symbol: "▱", description: "Low-capacity bridge" },
      { id: "quay-d", label: "Kaj D", englishLabel: "Quay D", symbol: "D", description: "Priority destination" },
      { id: "dispatch", label: "Send", englishLabel: "Dispatch", symbol: "✓", description: "Release route" },
    ],
    calculation: { label: "Brokapacitet", englishLabel: "Bridge capacity", expression: "9 × 2", expected: 18, unit: "point" },
    solution: ["priority", "south", "high-bridge", "quay-d", "dispatch"],
    derivation: [
      "Medicinsk last placerer PRIORITET først.",
      "7 + 2 = 9 er ulige, så retningssignalet er SYD.",
      "Nordenvind giver 9 × 2 = 18; det åbner HØJ BRO.",
      "Lasten sendes til KAJ D og afsluttes med SEND.",
    ],
    maxScore: 520,
  },
];

export const instructionPuzzleCases: InstructionPuzzleCase[] = [
  ...safetyConsoleCases,
  ...cargoRoutingCases,
];

export const instructionPuzzleCasesByMode: Record<InstructionPuzzleMode, InstructionPuzzleCase[]> = {
  "safety-console": safetyConsoleCases,
  "cargo-routing": cargoRoutingCases,
};
