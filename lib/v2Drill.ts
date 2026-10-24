export type V2Level = "A1" | "A2" | "A2+" | "B1" | "B2";
export type V2Focus = "v2" | "forfelt" | "ikke" | "ledsaetning" | "inversion";
export type V2Mechanic = "choice" | "swap" | "order" | "slot" | "spot" | "theory";
export type V2Voice = "neutral" | "satirisk" | "skarp" | "venlig" | "filosofisk" | "absurd" | "formel";

interface V2DrillBase {
  id: string;
  level: V2Level;
  focus: V2Focus;
  mechanic: V2Mechanic;
  prompt: string;
  translation: string;
  correctSentence: string;
  explanation: string;
  formula: string[];
  voice: V2Voice;
}

export interface V2ChoiceDrill extends V2DrillBase {
  mechanic: "choice";
  options: string[];
  correctOption: string;
}

export interface V2SwapDrill extends V2DrillBase {
  mechanic: "swap";
  tokens: string[];
  swapIndices: [number, number];
}

export interface V2OrderDrill extends V2DrillBase {
  mechanic: "order";
  tokens: string[];
  correctOrder: number[];
}

export interface V2SlotDrill extends V2DrillBase {
  mechanic: "slot";
  token: string;
  segments: string[];
  answerSlot: number;
}

export interface V2SpotDrill extends V2DrillBase {
  mechanic: "spot";
  tokens: string[];
  errorIndex: number;
}

export interface V2TheoryDrill extends V2DrillBase {
  mechanic: "theory";
  options: string[];
  correctOption: string;
}

export type V2DrillItem = V2ChoiceDrill | V2SwapDrill | V2OrderDrill | V2SlotDrill | V2SpotDrill | V2TheoryDrill;

export interface V2ItemProgress {
  attempts: number;
  correct: number;
  incorrect: number;
  currentCorrectStreak: number;
  lastAttemptAt: string;
}

export interface V2DrillProgress {
  totalAttempts: number;
  correctAttempts: number;
  currentStreak: number;
  bestStreak: number;
  roundsCompleted: number;
  items: Record<string, V2ItemProgress>;
}

export type V2DrillResponse =
  | { mechanic: "choice"; option: string }
  | { mechanic: "swap"; indices: number[] }
  | { mechanic: "order"; indices: number[] }
  | { mechanic: "slot"; slot: number }
  | { mechanic: "spot"; index: number }
  | { mechanic: "theory"; option: string };

interface SentencePattern {
  id: string;
  level: V2Level;
  focus: V2Focus;
  translation: string;
  correct: string;
  distractors: [string, string];
  chunks: [string, string, string, ...string[]];
  swap: [number, number];
  errorIndex: number;
  explanation: string;
  formula: string[];
  voice?: V2Voice;
}

const mainFormula = ["Felt 1", "finit verbum", "subjekt", "resten"];
const clauseFormula = ["bindeord", "subjekt", "ikke/adverbium", "finit verbum"];
const inversionFormula = ["langt forfelt", "finit verbum", "subjekt", "resten"];

const sentencePatterns: SentencePattern[] = [
  { id: "a1-today-work", level: "A1", focus: "forfelt", translation: "Today I work from home until four o’clock.", correct: "I dag arbejder jeg hjemme indtil klokken fire.", distractors: ["I dag jeg arbejder hjemme indtil klokken fire.", "I dag arbejder hjemme indtil klokken fire jeg."], chunks: ["I dag", "arbejder", "jeg", "hjemme indtil klokken fire."], swap: [1, 2], errorIndex: 1, explanation: "Når I dag står i felt 1, skal det finite verbum arbejder stå før subjektet jeg.", formula: mainFormula },
  { id: "a1-morning-coffee", level: "A1", focus: "forfelt", translation: "In the morning she drinks coffee before leaving.", correct: "Om morgenen drikker hun kaffe før hun går.", distractors: ["Om morgenen hun drikker kaffe før hun går.", "Om morgenen drikker kaffe før hun går hun."], chunks: ["Om morgenen", "drikker", "hun", "kaffe før hun går."], swap: [1, 2], errorIndex: 1, explanation: "Tidsleddet fylder felt 1; derfor kommer drikker som nummer to og hun bagefter.", formula: mainFormula },
  { id: "a1-after-work", level: "A1", focus: "v2", translation: "After work we go straight home by bus.", correct: "Efter arbejde tager vi direkte hjem med bussen.", distractors: ["Efter arbejde vi tager direkte hjem med bussen.", "Efter arbejde tager direkte hjem med bussen vi."], chunks: ["Efter arbejde", "tager", "vi", "direkte hjem med bussen."], swap: [1, 2], errorIndex: 1, explanation: "Efter arbejde står først, så helsætningens verbum tager skal stå på anden plads.", formula: mainFormula },
  { id: "a1-now-aarhus", level: "A1", focus: "v2", translation: "Now they live with their brother in Aarhus.", correct: "Nu bor de sammen med deres bror i Aarhus.", distractors: ["Nu de bor sammen med deres bror i Aarhus.", "Nu bor sammen med deres bror i Aarhus de."], chunks: ["Nu", "bor", "de", "sammen med deres bror i Aarhus."], swap: [1, 2], errorIndex: 1, explanation: "Nu optager første plads. Bor er derfor nummer to, før de.", formula: mainFormula },
  { id: "a1-monday-course", level: "A1", focus: "forfelt", translation: "On Monday the course begins early at the library.", correct: "På mandag begynder kurset tidligt på biblioteket.", distractors: ["På mandag kurset begynder tidligt på biblioteket.", "På mandag begynder tidligt på biblioteket kurset."], chunks: ["På mandag", "begynder", "kurset", "tidligt på biblioteket."], swap: [1, 2], errorIndex: 1, explanation: "På mandag er ét samlet led i felt 1; verbet begynder følger straks efter.", formula: mainFormula },
  { id: "a1-kitchen-food", level: "A1", focus: "forfelt", translation: "In the kitchen my father cooks.", correct: "I køkkenet laver min far mad.", distractors: ["I køkkenet min far laver mad.", "I køkkenet laver mad min far."], chunks: ["I køkkenet", "laver", "min far", "mad."], swap: [1, 2], errorIndex: 1, explanation: "Stedleddet kommer først, men laver beholder V2-pladsen foran min far.", formula: mainFormula },
  { id: "a1-friday-friend", level: "A1", focus: "v2", translation: "Every Friday I see my friend.", correct: "Hver fredag ser jeg min ven.", distractors: ["Hver fredag jeg ser min ven.", "Hver fredag ser min ven jeg."], chunks: ["Hver fredag", "ser", "jeg", "min ven."], swap: [1, 2], errorIndex: 1, explanation: "Hele tidsudtrykket Hver fredag tæller som felt 1; ser skal derfor være nummer to.", formula: mainFormula },
  { id: "a1-pay-here", level: "A1", focus: "v2", translation: "Here you can pay by card or in cash.", correct: "Her kan du betale med kort eller kontanter.", distractors: ["Her du kan betale med kort eller kontanter.", "Her kan betale med kort eller kontanter du."], chunks: ["Her", "kan", "du", "betale med kort eller kontanter."], swap: [1, 2], errorIndex: 1, explanation: "Her står først, så modalverbet kan skal stå foran subjektet du.", formula: mainFormula },
  { id: "a1-then-bus", level: "A1", focus: "v2", translation: "Then we take the bus to the city centre.", correct: "Så tager vi bussen ind til centrum.", distractors: ["Så vi tager bussen ind til centrum.", "Så tager bussen ind til centrum vi."], chunks: ["Så", "tager", "vi", "bussen ind til centrum."], swap: [1, 2], errorIndex: 1, explanation: "Så er felt 1. Tager er det finite verbum på plads 2.", formula: mainFormula },
  { id: "a1-maybe-later", level: "A1", focus: "inversion", translation: "Maybe he will come much later tonight.", correct: "Måske kommer han meget senere i aften.", distractors: ["Måske han kommer meget senere i aften.", "Måske kommer meget senere i aften han."], chunks: ["Måske", "kommer", "han", "meget senere i aften."], swap: [1, 2], errorIndex: 1, explanation: "Selv et sætningsadverbium som måske kan stå i felt 1 og udløser da inversion.", formula: mainFormula },

  { id: "a2-yesterday-keys", level: "A2", focus: "ikke", translation: "Yesterday I could not find my keys.", correct: "I går kunne jeg ikke finde mine nøgler.", distractors: ["I går jeg kunne ikke finde mine nøgler.", "I går kunne ikke jeg finde mine nøgler."], chunks: ["I går", "kunne", "jeg", "ikke finde", "mine nøgler."], swap: [1, 2], errorIndex: 1, explanation: "I helsætningen står kunne på V2-pladsen; ikke kommer efter subjektet jeg.", formula: ["I går", "kunne", "jeg", "ikke …"] },
  { id: "a2-therefore-train", level: "A2", focus: "inversion", translation: "Therefore we took the earliest train home.", correct: "Derfor tog vi det tidligste tog hjem.", distractors: ["Derfor vi tog det tidligste tog hjem.", "Derfor tog det tidligste tog hjem vi."], chunks: ["Derfor", "tog", "vi", "det tidligste tog hjem."], swap: [1, 2], errorIndex: 1, explanation: "Derfor står i felt 1 og udløser inversion: tog før vi.", formula: mainFormula },
  { id: "a2-after-meeting", level: "A2", focus: "forfelt", translation: "After the meeting she must call the customer.", correct: "Efter mødet skal hun ringe til kunden.", distractors: ["Efter mødet hun skal ringe til kunden.", "Efter mødet skal ringe hun til kunden."], chunks: ["Efter mødet", "skal", "hun", "ringe til kunden."], swap: [1, 2], errorIndex: 1, explanation: "Efter mødet er forfeltet. Skal står på plads 2 foran hun.", formula: mainFormula },
  { id: "a2-station-people", level: "A2", focus: "v2", translation: "At the station there were many people waiting.", correct: "På stationen ventede der mange mennesker.", distractors: ["På stationen der ventede mange mennesker.", "På stationen mange mennesker ventede der."], chunks: ["På stationen", "ventede", "der", "mange mennesker."], swap: [1, 2], errorIndex: 1, explanation: "Stedleddet fylder felt 1, så ventede kommer før det formelle subjekt der.", formula: mainFormula },
  { id: "a2-never-ship", level: "A2", focus: "inversion", translation: "Never have I seen such a large ship.", correct: "Aldrig har jeg set så stort et skib.", distractors: ["Aldrig jeg har set så stort et skib.", "Aldrig har set jeg så stort et skib."], chunks: ["Aldrig", "har", "jeg", "set så stort et skib."], swap: [1, 2], errorIndex: 1, explanation: "Når aldrig fremhæves først, følger inversion: har før jeg.", formula: mainFormula },
  { id: "a2-first-letter", level: "A2", focus: "v2", translation: "First you read the letter, and then you fill in the form.", correct: "Først læser du brevet, og derefter udfylder du formularen.", distractors: ["Først du læser brevet, og derefter du udfylder formularen.", "Først læser brevet du, og derefter udfylder formularen du."], chunks: ["Først", "læser", "du", "brevet, og derefter udfylder du formularen."], swap: [1, 2], errorIndex: 1, explanation: "Både først og derefter indleder en helsætning og kræver verbet lige bagefter.", formula: ["Først", "læser", "du", "… derefter udfylder du …"] },
  { id: "a2-if-rain", level: "A2", focus: "inversion", translation: "If it rains, we stay at home.", correct: "Hvis det regner, bliver vi hjemme.", distractors: ["Hvis det regner, vi bliver hjemme.", "Hvis regner det, bliver vi hjemme."], chunks: ["Hvis det regner,", "bliver", "vi", "hjemme."], swap: [1, 2], errorIndex: 1, explanation: "Hele hvis-ledsætningen er felt 1 i helsætningen; derfor bliver vi, ikke vi bliver.", formula: inversionFormula },
  { id: "a2-when-film", level: "A2", focus: "inversion", translation: "When the film ends, we go home.", correct: "Når filmen slutter, tager vi hjem.", distractors: ["Når filmen slutter, vi tager hjem.", "Når slutter filmen, tager vi hjem."], chunks: ["Når filmen slutter,", "tager", "vi", "hjem."], swap: [1, 2], errorIndex: 1, explanation: "Når-ledsætningen fylder forfeltet, så hovedsætningen starter med tager vi.", formula: inversionFormula },
  { id: "a2-although-tired", level: "A2", focus: "ledsaetning", translation: "Although he is tired, he continues working.", correct: "Selvom han er træt, arbejder han videre.", distractors: ["Selvom er han træt, arbejder han videre.", "Selvom han er træt, han arbejder videre."], chunks: ["Selvom han er træt,", "arbejder", "han", "videre."], swap: [1, 2], errorIndex: 1, explanation: "I selvom-ledsætningen står subjekt før verbum; bagefter udløser hele leddet inversion i helsætningen.", formula: ["selvom + subjekt + verbum", "arbejder", "han", "videre"] },
  { id: "a2-weekend-visit", level: "A2", focus: "forfelt", translation: "At the weekend my friends will visit Copenhagen.", correct: "I weekenden vil mine venner besøge København.", distractors: ["I weekenden mine venner vil besøge København.", "I weekenden vil besøge mine venner København."], chunks: ["I weekenden", "vil", "mine venner", "besøge København."], swap: [1, 2], errorIndex: 1, explanation: "I weekenden optager første plads; vil skal stå på plads 2 foran subjektet.", formula: mainFormula },

  { id: "b1-report-number", level: "B1", focus: "forfelt", translation: "According to the report, the number fell last year.", correct: "Ifølge rapporten faldt antallet sidste år.", distractors: ["Ifølge rapporten antallet faldt sidste år.", "Ifølge rapporten faldt sidste år antallet."], chunks: ["Ifølge rapporten", "faldt", "antallet", "sidste år."], swap: [1, 2], errorIndex: 1, explanation: "Kildeleddet står i forfeltet, så faldt skal stå før antallet.", formula: mainFormula },
  { id: "b1-nevertheless-council", level: "B1", focus: "inversion", translation: "Nevertheless, the municipality decided to continue the project without changes.", correct: "Alligevel besluttede kommunen at fortsætte projektet uden ændringer.", distractors: ["Alligevel kommunen besluttede at fortsætte projektet uden ændringer.", "Alligevel besluttede at fortsætte projektet uden ændringer kommunen."], chunks: ["Alligevel", "besluttede", "kommunen", "at fortsætte projektet uden ændringer."], swap: [1, 2], errorIndex: 1, explanation: "Alligevel er et adverbial i felt 1 og udløser inversion.", formula: mainFormula },
  { id: "b1-agreement-states", level: "B1", focus: "ledsaetning", translation: "The new agreement states that the price cannot be changed.", correct: "I den nye aftale står der, at prisen ikke kan ændres.", distractors: ["I den nye aftale der står, at prisen kan ikke ændres.", "I den nye aftale står der, at ikke prisen kan ændres."], chunks: ["I den nye aftale", "står", "der,", "at prisen ikke kan ændres."], swap: [1, 2], errorIndex: 1, explanation: "Helsætningen har står der; i at-ledsætningen står ikke før det finite verbum kan.", formula: ["I den nye aftale", "står", "der", "at prisen ikke kan …"] },
  { id: "b1-system-failed", level: "B1", focus: "ikke", translation: "When the system failed, the guard could not open the gate.", correct: "Da systemet svigtede, kunne vagten ikke åbne porten.", distractors: ["Da systemet svigtede, vagten kunne ikke åbne porten.", "Da systemet svigtede, kunne ikke vagten åbne porten."], chunks: ["Da systemet svigtede,", "kunne", "vagten", "ikke åbne porten."], swap: [1, 2], errorIndex: 1, explanation: "Da-leddet fylder felt 1. Kunne står på plads 2, og ikke følger efter subjektet i helsætningen.", formula: inversionFormula },
  { id: "b1-before-decision", level: "B1", focus: "inversion", translation: "Before we make a decision, all documents must be checked.", correct: "Før vi træffer en beslutning, skal alle dokumenter kontrolleres.", distractors: ["Før vi træffer en beslutning, alle dokumenter skal kontrolleres.", "Før træffer vi en beslutning, skal alle dokumenter kontrolleres."], chunks: ["Før vi træffer en beslutning,", "skal", "alle dokumenter", "kontrolleres."], swap: [1, 2], errorIndex: 1, explanation: "Før-ledsætningen har normal ledsætningsorden og udløser derefter skal før subjektet.", formula: inversionFormula },
  { id: "b1-nonetheless-experts", level: "B1", focus: "inversion", translation: "Nonetheless, the experts believe the plan is realistic.", correct: "Ikke desto mindre mener eksperterne, at planen er realistisk.", distractors: ["Ikke desto mindre eksperterne mener, at planen er realistisk.", "Ikke desto mindre mener, at planen er realistisk, eksperterne."], chunks: ["Ikke desto mindre", "mener", "eksperterne,", "at planen er realistisk."], swap: [1, 2], errorIndex: 1, explanation: "Det lange adverbial er stadig kun ét felt; mener står derfor på V2-pladsen.", formula: mainFormula },
  { id: "b1-delay-passengers", level: "B1", focus: "forfelt", translation: "Because of the delay, the passengers had to wait outside.", correct: "På grund af forsinkelsen måtte passagererne vente udenfor.", distractors: ["På grund af forsinkelsen passagererne måtte vente udenfor.", "På grund af forsinkelsen måtte vente passagererne udenfor."], chunks: ["På grund af forsinkelsen", "måtte", "passagererne", "vente udenfor."], swap: [1, 2], errorIndex: 1, explanation: "Hele årsagsleddet står i felt 1; måtte er det finite verbum på plads 2.", formula: mainFormula },
  { id: "b1-only-if", level: "B1", focus: "inversion", translation: "Only if the figures agree can we approve the report.", correct: "Kun hvis tallene stemmer, kan vi godkende rapporten.", distractors: ["Kun hvis tallene stemmer, vi kan godkende rapporten.", "Kun hvis stemmer tallene, kan vi godkende rapporten."], chunks: ["Kun hvis tallene stemmer,", "kan", "vi", "godkende rapporten."], swap: [1, 2], errorIndex: 1, explanation: "Den indledende betingelse fylder forfeltet; hovedsætningen får derfor kan vi.", formula: inversionFormula },
  { id: "b1-budget-management", level: "B1", focus: "forfelt", translation: "As for the budget, management has changed its priorities.", correct: "Hvad angår budgettet, har ledelsen ændret sine prioriteter.", distractors: ["Hvad angår budgettet, ledelsen har ændret sine prioriteter.", "Hvad angår budgettet, har ændret ledelsen sine prioriteter."], chunks: ["Hvad angår budgettet,", "har", "ledelsen", "ændret sine prioriteter."], swap: [1, 2], errorIndex: 1, explanation: "Emneleddet står i felt 1; hjælpeverbet har står på plads 2.", formula: mainFormula },
  { id: "b1-after-interview", level: "B1", focus: "inversion", translation: "After the witness had been interviewed, the police changed the timeline.", correct: "Efter at vidnet var blevet afhørt, ændrede politiet tidslinjen.", distractors: ["Efter at vidnet var blevet afhørt, politiet ændrede tidslinjen.", "Efter at var vidnet blevet afhørt, ændrede politiet tidslinjen."], chunks: ["Efter at vidnet var blevet afhørt,", "ændrede", "politiet", "tidslinjen."], swap: [1, 2], errorIndex: 1, explanation: "Efter at-ledsætningen har subjekt før verbum; bagefter står ændrede før politiet.", formula: inversionFormula },

  { id: "b2-had-known", level: "B2", focus: "inversion", translation: "Had we known the risk, we would have chosen another route.", correct: "Havde vi kendt risikoen, ville vi have valgt en anden rute.", distractors: ["Havde kendt vi risikoen, ville vi have valgt en anden rute.", "Havde vi kendt risikoen, vi ville have valgt en anden rute."], chunks: ["Havde vi kendt risikoen,", "ville", "vi", "have valgt en anden rute."], swap: [1, 2], errorIndex: 1, explanation: "Den betingende inversion fylder forfeltet; hovedsætningen følger stadig V2 med ville vi.", formula: inversionFormula },
  { id: "b2-not-only", level: "B2", focus: "inversion", translation: "Not only did the manager overlook the warning; she also deleted the log.", correct: "Ikke alene overså lederen advarslen; hun slettede også loggen.", distractors: ["Ikke alene lederen overså advarslen; hun slettede også loggen.", "Ikke alene overså advarslen lederen; hun slettede også loggen."], chunks: ["Ikke alene", "overså", "lederen", "advarslen; hun slettede også loggen."], swap: [1, 2], errorIndex: 1, explanation: "Det fremhævede Ikke alene udløser inversion i den første helsætning.", formula: mainFormula },
  { id: "b2-under-no-circumstances", level: "B2", focus: "inversion", translation: "Under no circumstances may the valve be opened manually.", correct: "Under ingen omstændigheder må ventilen åbnes manuelt.", distractors: ["Under ingen omstændigheder ventilen må åbnes manuelt.", "Under ingen omstændigheder må åbnes ventilen manuelt."], chunks: ["Under ingen omstændigheder", "må", "ventilen", "åbnes manuelt."], swap: [1, 2], errorIndex: 1, explanation: "Det negative adverbial står først og kræver må før subjektet ventilen.", formula: mainFormula },
  { id: "b2-only-then", level: "B2", focus: "inversion", translation: "Only then did the committee understand the serious consequence.", correct: "Først da forstod udvalget den alvorlige konsekvens.", distractors: ["Først da udvalget forstod den alvorlige konsekvens.", "Først da forstod den alvorlige konsekvens udvalget."], chunks: ["Først da", "forstod", "udvalget", "den alvorlige konsekvens."], swap: [1, 2], errorIndex: 1, explanation: "Først da fremhæves i felt 1 og efterfølges af det finite verbum forstod.", formula: mainFormula },
  { id: "b2-as-long-as", level: "B2", focus: "ledsaetning", translation: "As long as the data are not verified, we cannot draw a conclusion.", correct: "Så længe dataene ikke er verificeret, kan vi ikke drage en konklusion.", distractors: ["Så længe dataene er ikke verificeret, kan vi ikke drage en konklusion.", "Så længe dataene ikke er verificeret, vi kan ikke drage en konklusion."], chunks: ["Så længe dataene ikke er verificeret,", "kan", "vi", "ikke drage en konklusion."], swap: [1, 2], errorIndex: 1, explanation: "I ledsætningen står ikke før er; den efterfølgende hovedsætning har kan vi ikke.", formula: ["så længe + subjekt + ikke + verbum", "kan", "vi", "ikke …"] },
  { id: "b2-no-matter", level: "B2", focus: "inversion", translation: "No matter how carefully we measure, uncertainty remains.", correct: "Uanset hvor præcist vi måler, består usikkerheden.", distractors: ["Uanset hvor præcist måler vi, består usikkerheden.", "Uanset hvor præcist vi måler, usikkerheden består."], chunks: ["Uanset hvor præcist vi måler,", "består", "usikkerheden", "."], swap: [1, 2], errorIndex: 1, explanation: "Den indledende ledsætning har subjekt før verbum; hovedsætningen inverterer til består usikkerheden.", formula: inversionFormula },
  { id: "b2-should-recur", level: "B2", focus: "inversion", translation: "Should the problem occur again, we will close the system.", correct: "Skulle problemet opstå igen, lukker vi systemet.", distractors: ["Skulle opstå problemet igen, lukker vi systemet.", "Skulle problemet opstå igen, vi lukker systemet."], chunks: ["Skulle problemet opstå igen,", "lukker", "vi", "systemet."], swap: [1, 2], errorIndex: 1, explanation: "Den betingende skulle-konstruktion står først; hovedsætningen følger med lukker vi.", formula: inversionFormula },
  { id: "b2-neither-board", level: "B2", focus: "inversion", translation: "Nor had the board been informed about the change.", correct: "Heller ikke var bestyrelsen blevet orienteret om ændringen.", distractors: ["Heller ikke bestyrelsen var blevet orienteret om ændringen.", "Heller ikke var blevet bestyrelsen orienteret om ændringen."], chunks: ["Heller ikke", "var", "bestyrelsen", "blevet orienteret om ændringen."], swap: [1, 2], errorIndex: 1, explanation: "Heller ikke i felt 1 udløser inversion: var før bestyrelsen.", formula: mainFormula },
  { id: "b2-despite-criticism", level: "B2", focus: "ledsaetning", translation: "Despite the report being criticised, the director maintains that the conclusion holds.", correct: "Selvom rapporten er blevet kritiseret, fastholder direktøren, at konklusionen holder.", distractors: ["Selvom er rapporten blevet kritiseret, fastholder direktøren, at konklusionen holder.", "Selvom rapporten er blevet kritiseret, direktøren fastholder, at konklusionen holder."], chunks: ["Selvom rapporten er blevet kritiseret,", "fastholder", "direktøren,", "at konklusionen holder."], swap: [1, 2], errorIndex: 1, explanation: "Selvom-leddet har ledsætningsorden og fylder derefter felt 1 foran fastholder direktøren.", formula: inversionFormula },
  { id: "b2-more-less", level: "B2", focus: "inversion", translation: "The more precisely we formulate the question, the less we misunderstand each other.", correct: "Jo mere præcist vi formulerer spørgsmålet, desto mindre misforstår vi hinanden.", distractors: ["Jo mere præcist formulerer vi spørgsmålet, desto mindre vi misforstår hinanden.", "Jo mere præcist vi formulerer spørgsmålet, desto mindre vi hinanden misforstår."], chunks: ["Jo mere præcist vi formulerer spørgsmålet,", "desto mindre misforstår", "vi", "hinanden."], swap: [1, 2], errorIndex: 1, explanation: "Jo-leddet har ledsætningsorden; i desto-leddet står det finite verbum før subjektet.", formula: ["jo + subjekt + verbum", "desto + verbum", "subjekt", "resten"] },
];

function advancedPattern(
  id: string,
  level: "A2+" | "B1" | "B2",
  focus: V2Focus,
  voice: Exclude<V2Voice, "neutral">,
  translation: string,
  front: string,
  verb: string,
  subject: string,
  rest: string,
  explanation: string,
  formula = mainFormula,
): SentencePattern {
  const correct = `${front} ${verb} ${subject} ${rest}.`;
  return {
    id: `advanced-${id}`,
    level,
    focus,
    voice,
    translation,
    correct,
    distractors: [
      `${front} ${subject} ${verb} ${rest}.`,
      `${front} ${verb} ${rest} ${subject}.`,
    ],
    chunks: [front, verb, subject, `${rest}.`],
    swap: [1, 2],
    errorIndex: 1,
    explanation,
    formula,
  };
}

// Expansion bank: 50 new situations, each rendered in two mechanics = 100 new drills.
// The voices deliberately pull in different directions so that advanced V2 practice
// does not collapse into one endlessly polite office sentence.
const advancedVoicePatterns: SentencePattern[] = [
  advancedPattern("theory-perfect", "A2+", "inversion", "satirisk", "In theory, the system works perfectly, but only in the presentation.", "I teorien", "virker", "systemet", "perfekt, men kun på præsentationen", "I teorien fills the first field, so virker must precede systemet."),
  advancedPattern("strategic-hole", "A2+", "forfelt", "satirisk", "Of course, the municipality calls the hole a temporary opening.", "Selvfølgelig", "kalder", "kommunen", "hullet for en midlertidig åbning", "Selvfølgelig is fronted; the finite verb kalder still claims second position."),
  advancedPattern("tea-after-meeting", "A2+", "forfelt", "venlig", "After the meeting, I will make tea for both of us.", "Efter mødet", "laver", "jeg", "te til os begge", "The time phrase comes first, followed by laver and then jeg."),
  advancedPattern("quiet-place", "A2+", "ledsaetning", "venlig", "If you get tired, we will find a quieter place.", "Hvis du bliver træt,", "finder", "vi", "et roligere sted", "The if-clause is one long first field; the main clause therefore begins finder vi.", inversionFormula),
  advancedPattern("return-key", "A2+", "inversion", "skarp", "Now you hand over the key without any more excuses.", "Nu", "afleverer", "du", "nøglen uden flere undskyldninger", "Nu triggers inversion: afleverer before du."),
  advancedPattern("alarm-again", "A2+", "ledsaetning", "skarp", "If you ignore the alarm again, I will close the gate immediately.", "Hvis du ignorerer alarmen igen,", "lukker", "jeg", "porten med det samme", "The complete if-clause occupies field one, so the main clause begins lukker jeg.", inversionFormula),
  advancedPattern("long-silence", "A2+", "ledsaetning", "filosofisk", "When the silence grows long, we often hear our own doubt.", "Når stilheden bliver lang,", "hører", "vi", "ofte vores egen tvivl", "After the subordinate clause, hører must stand before vi.", inversionFormula),
  advancedPattern("truth-later", "A2+", "inversion", "filosofisk", "Perhaps he will understand the truth much later.", "Måske", "forstår", "han", "sandheden meget senere", "Måske can occupy field one and therefore sends forstår ahead of han."),
  advancedPattern("seagull-parking", "A2+", "forfelt", "absurd", "Last night, the seagull demanded its own parking space.", "I nat", "krævede", "mågen", "sin egen parkeringsplads", "The time phrase I nat is first; krævede is the finite verb in second position."),
  advancedPattern("tiny-auditor", "A2+", "forfelt", "absurd", "Behind the printer, there apparently lives a very small auditor.", "Bag printeren", "bor", "der", "tilsyneladende en meget lille revisor", "The place phrase is fronted, so bor comes before the formal subject der."),
  advancedPattern("inspection-eight", "A2+", "forfelt", "formel", "According to the message, the inspection begins at eight.", "Ifølge beskeden", "begynder", "kontrollen", "klokken otte", "The source phrase occupies the first field; begynder must follow immediately."),
  advancedPattern("boss-restart", "A2+", "inversion", "satirisk", "Fortunately, the machine only restarts when the boss is watching.", "Heldigvis", "genstarter", "maskinen", "kun når chefen ser på", "Heldigvis is fronted, but V2 still places genstarter before maskinen."),
  advancedPattern("shared-umbrella", "A2+", "forfelt", "venlig", "In the rain, the neighbour held the umbrella over both of us.", "I regnen", "holdt", "naboen", "paraplyen over os begge", "The place phrase comes first; holdt remains the second constituent."),
  advancedPattern("new-old-error", "A2+", "forfelt", "satirisk", "After every update, the users discover a new old error.", "Efter hver opdatering", "opdager", "brugerne", "en ny gammel fejl", "The time phrase fills field one, so opdager comes before brugerne."),
  advancedPattern("read-message", "A2+", "forfelt", "skarp", "From now on, you read the entire message before replying.", "Fra nu af", "læser", "du", "hele beskeden før du svarer", "Fra nu af is one fronted constituent; læser must therefore precede du."),
  advancedPattern("honest-question", "A2+", "forfelt", "filosofisk", "In doubt, one sometimes finds the honest question.", "I tvivlen", "finder", "man", "nogle gange det ærlige spørgsmål", "The fronted prepositional phrase is followed by finder and then man."),
  advancedPattern("forklift-race", "A2+", "forfelt", "absurd", "After lunch, the forklift challenged the coffee machine to a race.", "Efter frokost", "udfordrede", "gaffeltrucken", "kaffemaskinen til et kapløb", "The time phrase stands first; udfordrede must occupy the V2 position."),

  advancedPattern("chatbot-savings", "B1", "forfelt", "satirisk", "On paper, the chatbot saves all three minutes.", "På papiret", "sparer", "chatbotten", "alle tre minutter", "The evaluative frame comes first, so sparer stands before chatbotten."),
  advancedPattern("strategic-pause", "B1", "inversion", "satirisk", "Officially, the delay is called a strategic thinking pause.", "Officielt", "hedder", "forsinkelsen", "en strategisk tænkepause", "Officielt takes field one; hedder is therefore the second constituent."),
  advancedPattern("honest-answer", "B1", "ledsaetning", "venlig", "Even though we disagree, you deserve an honest answer.", "Selvom vi er uenige,", "fortjener", "du", "et ærligt svar", "The subordinate clause occupies the first field, giving fortjener du in the main clause.", inversionFormula),
  advancedPattern("listen-first", "B1", "ledsaetning", "venlig", "Before I answer, I listen to your whole explanation.", "Før jeg svarer,", "lytter", "jeg", "til hele din forklaring", "After the before-clause, the finite verb lytter must precede jeg.", inversionFormula),
  advancedPattern("no-name", "B1", "inversion", "skarp", "Under no circumstances do we share the name without consent.", "Under ingen omstændigheder", "deler", "vi", "navnet uden samtykke", "The negative fronted phrase triggers inversion: deler vi."),
  advancedPattern("evidence-holds", "B1", "ledsaetning", "skarp", "Only when the evidence holds do I approve the report.", "Kun når beviserne holder,", "godkender", "jeg", "rapporten", "The condition fills field one, so the main clause must begin godkender jeg.", inversionFormula),
  advancedPattern("doubt-argument", "B1", "ledsaetning", "filosofisk", "Only when we doubt does the argument become stronger.", "Først når vi tvivler,", "bliver", "argumentet", "stærkere", "The full condition is fronted; bliver therefore comes before argumentet.", inversionFormula),
  advancedPattern("resistance-thought", "B1", "forfelt", "filosofisk", "When facing resistance, thought becomes sharper.", "I mødet med modstand", "bliver", "tanken", "skarpere", "The long prepositional phrase counts as one first field, followed by bliver."),
  advancedPattern("copier-election", "B1", "ledsaetning", "absurd", "If the copier wins the election, it promises free toner for everyone.", "Hvis kopimaskinen vinder valget,", "lover", "den", "gratis toner til alle", "The if-clause fills field one, so lover comes before den.", inversionFormula),
  advancedPattern("robot-ethics", "B1", "forfelt", "absurd", "On the night shift, the robot discusses ethics with the refrigerator.", "På nattevagten", "diskuterer", "robotten", "etik med køleskabet", "The time phrase is fronted; diskuterer keeps the finite verb in second position."),
  advancedPattern("appendices", "B1", "forfelt", "formel", "On the basis of the appendices, the committee changes its preliminary assessment.", "På baggrund af bilagene", "ændrer", "udvalget", "sin foreløbige vurdering", "The basis phrase is field one, followed by ændrer and the subject."),
  advancedPattern("investigation", "B1", "forfelt", "formel", "After the investigation, the auditor presents three possible explanations.", "Efter undersøgelsen", "fremlægger", "revisoren", "tre mulige forklaringer", "The time phrase occupies field one; fremlægger must be the next constituent."),
  advancedPattern("consultant-billing", "B1", "inversion", "satirisk", "Nevertheless, the consultant bills the meeting as an efficiency exercise.", "Alligevel", "fakturerer", "konsulenten", "mødet som en effektiviseringsøvelse", "Alligevel triggers inversion, placing fakturerer before konsulenten."),
  advancedPattern("dashboard-dashboard", "B1", "forfelt", "satirisk", "Behind the dashboard, the system hides yet another dashboard.", "Bag instrumentbrættet", "gemmer", "systemet", "endnu et instrumentbræt", "The place phrase is fronted; gemmer must precede systemet."),
  advancedPattern("rebuild", "B1", "forfelt", "venlig", "After your mistake, we help you rebuild the experiment.", "Efter din fejl", "hjælper", "vi", "dig med at bygge forsøget igen", "The time phrase comes first, then hjælper and the subject vi."),
  advancedPattern("no-documentation", "B1", "forfelt", "skarp", "Without documentation, no one accepts that claim.", "Uden dokumentation", "accepterer", "ingen", "den påstand", "The condition is fronted, so accepterer stands before ingen."),

  advancedPattern("third-meeting", "B2", "forfelt", "satirisk", "Only after the third committee meeting did management discover that the first memo was correct.", "Først efter det tredje udvalgsmøde", "opdagede", "ledelsen", "at det første notat var korrekt", "The emphatic time phrase fills field one; opdagede must precede ledelsen."),
  advancedPattern("self-made-problem", "B2", "inversion", "satirisk", "Surprisingly, the new procedure solves exactly the problem it created itself.", "Overraskende nok", "løser", "den nye procedure", "præcis det problem, den selv skabte", "The sentence adverbial is fronted, so løser comes before the subject."),
  advancedPattern("next-person", "B2", "ledsaetning", "venlig", "When someone dares to speak up, we also protect the next person.", "Når nogen tør sige fra,", "beskytter", "vi", "også den næste person", "The when-clause occupies field one and triggers beskytter vi.", inversionFormula),
  advancedPattern("boundary-respect", "B2", "forfelt", "venlig", "In the most difficult conversation, she preserves both the boundary and the respect.", "I den sværeste samtale", "bevarer", "hun", "både grænsen og respekten", "The prepositional phrase is fronted; bevarer is the finite verb in second position."),
  advancedPattern("change-log", "B2", "ledsaetning", "skarp", "Should you alter the log again, I will report it without further notice.", "Skulle du ændre loggen igen,", "indberetter", "jeg", "det uden yderligere varsel", "The conditional clause is field one; the main clause therefore begins indberetter jeg.", inversionFormula),
  advancedPattern("pressure-argument", "B2", "forfelt", "skarp", "Under pressure, the argument quickly reveals its weakest links.", "Under pres", "afslører", "argumentet", "hurtigt sine svageste led", "The fronted circumstance is followed by afslører and then argumentet."),
  advancedPattern("precise-language", "B2", "ledsaetning", "filosofisk", "Only when language becomes precise can responsibility be assigned fairly.", "Kun når sproget bliver præcist,", "kan", "ansvaret", "placeres retfærdigt", "The condition fills field one, so the modal kan precedes ansvaret.", inversionFormula),
  advancedPattern("memory-shape", "B2", "forfelt", "filosofisk", "In memory, the past changes shape without changing weight.", "I erindringen", "ændrer", "fortiden", "form uden at skifte vægt", "The fronted frame requires ændrer before fortiden."),
  advancedPattern("lighthouse-moon", "B2", "forfelt", "absurd", "At midnight, the lighthouse summoned the moon to a technical meeting.", "Ved midnat", "indkaldte", "fyrtårnet", "månen til en teknisk samtale", "The time phrase occupies field one, followed by indkaldte and the subject."),
  advancedPattern("toaster-veto", "B2", "ledsaetning", "absurd", "If the toaster gets a veto, breakfast loses all democratic legitimacy.", "Hvis brødristeren får vetoret,", "mister", "morgenmaden", "enhver demokratisk legitimitet", "The if-clause is one first field; mister must then precede morgenmaden.", inversionFormula),
  advancedPattern("independent-review", "B2", "forfelt", "formel", "Regardless of the preliminary conclusion, the case requires an independent review.", "Uanset den foreløbige konklusion", "kræver", "sagen", "en uafhængig kontrol", "The concessive phrase is fronted; kræver remains the finite verb in second position."),
  advancedPattern("new-measurements", "B2", "forfelt", "formel", "In light of the new measurements, the researchers revise their previous assumption.", "I lyset af de nye målinger", "reviderer", "forskerne", "deres tidligere antagelse", "The evidence frame counts as one field, followed by reviderer."),
  advancedPattern("admit-uncertainty", "B2", "inversion", "filosofisk", "Paradoxically, certainty grows when we admit uncertainty.", "Paradoksalt nok", "vokser", "sikkerheden", "når vi indrømmer usikkerheden", "The sentence adverbial fills field one; vokser must precede sikkerheden."),
  advancedPattern("expensive-saving", "B2", "forfelt", "satirisk", "After the saving, the solution costs twice as much to maintain.", "Efter besparelsen", "koster", "løsningen", "dobbelt så meget at vedligeholde", "The time frame comes first, so koster is placed before løsningen."),
  advancedPattern("time-to-think", "B2", "forfelt", "venlig", "Despite the disagreement, they give each other time to think.", "På trods af uenigheden", "giver", "de", "hinanden tid til at tænke", "The concessive phrase occupies field one; giver comes before de."),
  advancedPattern("full-documentation", "B2", "forfelt", "skarp", "No later than tomorrow, you present the full documentation.", "Senest i morgen", "fremlægger", "du", "den fulde dokumentation", "The deadline is fronted, so fremlægger stands before du."),
  advancedPattern("question-answer", "B2", "inversion", "filosofisk", "Perhaps, in the end, the question proves more important than the answer.", "Måske til sidst", "viser", "spørgsmålet", "sig vigtigere end svaret", "The compound adverbial is one first field; viser must precede spørgsmålet."),
];

interface SlotPattern {
  id: string;
  level: V2Level;
  focus: V2Focus;
  token: string;
  segments: string[];
  answerSlot: number;
  translation: string;
  correct: string;
  explanation: string;
  formula: string[];
}

const slotPatterns: SlotPattern[] = [
  { id: "a1-not-home", level: "A1", focus: "ikke", token: "ikke", segments: ["Jeg", "er", "hjemme", "i dag."], answerSlot: 2, translation: "I am not at home today.", correct: "Jeg er ikke hjemme i dag.", explanation: "I en almindelig helsætning står ikke efter det finite verbum.", formula: ["subjekt", "verbum", "ikke", "resten"] },
  { id: "a1-always-bus", level: "A1", focus: "ikke", token: "altid", segments: ["Hun", "tager", "bussen", "om morgenen."], answerSlot: 2, translation: "She always takes the bus in the morning.", correct: "Hun tager altid bussen om morgenen.", explanation: "Sætningsadverbiet altid står normalt efter det finite verbum i en helsætning.", formula: ["subjekt", "verbum", "altid", "resten"] },
  { id: "a1-today-not-work", level: "A1", focus: "ikke", token: "ikke", segments: ["I dag", "arbejder", "jeg", "hjemme."], answerSlot: 3, translation: "Today I am not working from home.", correct: "I dag arbejder jeg ikke hjemme.", explanation: "Efter et forfelt kommer verbum og subjekt; ikke følger efter subjektet.", formula: ["forfelt", "verbum", "subjekt", "ikke"] },
  { id: "a1-maybe-visit", level: "A1", focus: "forfelt", token: "Måske", segments: ["kommer", "de", "på besøg", "i morgen."], answerSlot: 0, translation: "Maybe they will visit tomorrow.", correct: "Måske kommer de på besøg i morgen.", explanation: "Måske kan stå i felt 1; derefter følger verbum og subjekt.", formula: mainFormula },
  { id: "a1-now-not-open", level: "A1", focus: "ikke", token: "ikke", segments: ["Nu", "er", "butikken", "åben."], answerSlot: 3, translation: "Now the shop is not open.", correct: "Nu er butikken ikke åben.", explanation: "I den inverterede helsætning kommer ikke efter subjektet butikken.", formula: ["Nu", "er", "butikken", "ikke …"] },
  { id: "a2-says-not", level: "A2", focus: "ledsaetning", token: "ikke", segments: ["Hun siger,", "at", "hun", "kan", "komme."], answerSlot: 3, translation: "She says that she cannot come.", correct: "Hun siger, at hun ikke kan komme.", explanation: "I en at-ledsætning står ikke før det finite verbum kan.", formula: clauseFormula },
  { id: "a2-because-not", level: "A2", focus: "ledsaetning", token: "ikke", segments: ["Vi bliver hjemme,", "fordi", "bussen", "kører", "i dag."], answerSlot: 3, translation: "We are staying home because the bus is not running today.", correct: "Vi bliver hjemme, fordi bussen ikke kører i dag.", explanation: "Efter fordi står subjektet før ikke og det finite verbum.", formula: clauseFormula },
  { id: "a2-probably-late", level: "A2", focus: "ikke", token: "sandsynligvis", segments: ["Toget", "kommer", "for sent", "igen."], answerSlot: 2, translation: "The train will probably be late again.", correct: "Toget kommer sandsynligvis for sent igen.", explanation: "Sandsynligvis står i helsætningens midterfelt efter det finite verbum.", formula: ["subjekt", "verbum", "sandsynligvis", "resten"] },
  { id: "a2-if-already", level: "A2", focus: "ledsaetning", token: "allerede", segments: ["Hvis", "du", "har", "betalt, kan du gå ind."], answerSlot: 2, translation: "If you have already paid, you can enter.", correct: "Hvis du allerede har betalt, kan du gå ind.", explanation: "I hvis-ledsætningen står allerede før det finite hjælpeverbum har.", formula: clauseFormula },
  { id: "a2-yesterday-never", level: "A2", focus: "ikke", token: "aldrig", segments: ["I går", "havde", "jeg", "set stedet før."], answerSlot: 3, translation: "Yesterday I had never seen the place before.", correct: "I går havde jeg aldrig set stedet før.", explanation: "I hovedsætningen følger aldrig efter subjektet, når et andet led står i forfeltet.", formula: ["I går", "havde", "jeg", "aldrig …"] },
  { id: "b1-claims-not", level: "B1", focus: "ledsaetning", token: "ikke", segments: ["Direktøren hævder,", "at", "aftalen", "er", "bindende."], answerSlot: 3, translation: "The director claims that the agreement is not binding.", correct: "Direktøren hævder, at aftalen ikke er bindende.", explanation: "I at-ledsætningen placeres ikke før det finite verbum er.", formula: clauseFormula },
  { id: "b1-apparently", level: "B1", focus: "ikke", token: "angiveligt", segments: ["Rapporten", "blev", "skrevet", "før mødet."], answerSlot: 2, translation: "The report was allegedly written before the meeting.", correct: "Rapporten blev angiveligt skrevet før mødet.", explanation: "Angiveligt står i midterfeltet mellem det finite hjælpeverbum og participiet.", formula: ["subjekt", "finit verbum", "angiveligt", "participium"] },
  { id: "b1-although-never", level: "B1", focus: "ledsaetning", token: "aldrig", segments: ["Selvom", "hun", "havde", "prøvet systemet, godkendte hun det."], answerSlot: 2, translation: "Although she had never tested the system, she approved it.", correct: "Selvom hun aldrig havde prøvet systemet, godkendte hun det.", explanation: "I selvom-ledsætningen står aldrig før det finite hjælpeverbum havde.", formula: clauseFormula },
  { id: "b1-therefore-probably", level: "B1", focus: "ikke", token: "sandsynligvis", segments: ["Derfor", "vil", "kommunen", "ændre planen."], answerSlot: 3, translation: "Therefore the municipality will probably change the plan.", correct: "Derfor vil kommunen sandsynligvis ændre planen.", explanation: "Efter inversion står sætningsadverbiet efter subjektet kommunen.", formula: ["Derfor", "vil", "kommunen", "sandsynligvis …"] },
  { id: "b1-before-still", level: "B1", focus: "ledsaetning", token: "stadig", segments: ["Før", "vi", "kan", "godkende rapporten, mangler vi bilagene."], answerSlot: 2, translation: "Before we can still approve the report, we need the appendices.", correct: "Før vi stadig kan godkende rapporten, mangler vi bilagene.", explanation: "I før-ledsætningen står stadig mellem subjektet og det finite verbum kan.", formula: clauseFormula },
  { id: "b2-not-necessarily", level: "B2", focus: "ledsaetning", token: "nødvendigvis", segments: ["Det betyder,", "at", "konklusionen", "ikke", "er forkert."], answerSlot: 4, translation: "That means the conclusion is not necessarily wrong.", correct: "Det betyder, at konklusionen ikke nødvendigvis er forkert.", explanation: "I ledsætningen samles ikke nødvendigvis før det finite verbum er.", formula: ["at", "subjekt", "ikke nødvendigvis", "verbum"] },
  { id: "b2-under-no", level: "B2", focus: "inversion", token: "Under ingen omstændigheder", segments: ["må", "dataene", "slettes", "automatisk."], answerSlot: 0, translation: "Under no circumstances may the data be deleted automatically.", correct: "Under ingen omstændigheder må dataene slettes automatisk.", explanation: "Det negative led står i felt 1 og udløser inversion med må før dataene.", formula: mainFormula },
  { id: "b2-if-hardly", level: "B2", focus: "ledsaetning", token: "næppe", segments: ["Hvis", "resultatet", "kan", "gentages, bør påstanden nedtones."], answerSlot: 2, translation: "If the result can hardly be repeated, the claim should be softened.", correct: "Hvis resultatet næppe kan gentages, bør påstanden nedtones.", explanation: "I hvis-ledsætningen står næppe før det finite verbum kan.", formula: clauseFormula },
  { id: "b2-nonetheless-still", level: "B2", focus: "ikke", token: "stadig", segments: ["Ikke desto mindre", "fastholder", "ministeren", "sin forklaring."], answerSlot: 3, translation: "Nevertheless, the minister still maintains the explanation.", correct: "Ikke desto mindre fastholder ministeren stadig sin forklaring.", explanation: "Efter V2 og subjekt står stadig i helsætningens midterfelt.", formula: ["forfelt", "verbum", "subjekt", "stadig …"] },
  { id: "b2-unless-fully", level: "B2", focus: "ledsaetning", token: "fuldt ud", segments: ["Medmindre", "risikoen", "er", "dokumenteret, kan vi ikke handle."], answerSlot: 2, translation: "Unless the risk is fully documented, we cannot act.", correct: "Medmindre risikoen fuldt ud er dokumenteret, kan vi ikke handle.", explanation: "I medmindre-ledsætningen står fuldt ud før det finite hjælpeverbum er.", formula: clauseFormula },
];

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rotateOptions(options: string[], id: string) {
  const offset = hashString(id) % options.length;
  return [...options.slice(offset), ...options.slice(0, offset)];
}

function shuffledChunkIndices(length: number, id: string) {
  const indices = Array.from({ length }, (_, index) => index);
  let state = hashString(id) || 1;
  for (let index = indices.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [indices[index], indices[target]] = [indices[target], indices[index]];
  }
  if (indices.every((value, index) => value === index) && indices.length > 1) {
    [indices[0], indices[1]] = [indices[1], indices[0]];
  }
  return indices;
}

function tokenizeChunk(chunk: string) {
  return chunk
    .trim()
    .replace(/\s+([,.;:!?])/gu, "$1")
    .split(/\s+/u)
    .filter(Boolean);
}

function sentenceChallenge(pattern: SentencePattern) {
  const chunkTokens = pattern.chunks.map(tokenizeChunk);
  const tokens = chunkTokens.flat();
  const verbIndex = chunkTokens[0].length + chunkTokens[1].length - 1;
  const subjectIndex = verbIndex + 1;
  const wrongTokens = [...tokens];
  [wrongTokens[verbIndex], wrongTokens[subjectIndex]] = [wrongTokens[subjectIndex], wrongTokens[verbIndex]];
  return { tokens, wrongTokens, verbIndex, subjectIndex };
}

function buildSentenceDrills(pattern: SentencePattern, patternIndex: number): V2DrillItem[] {
  const options = rotateOptions([pattern.correct, ...pattern.distractors], `${pattern.id}:choice`);
  const common = {
    level: pattern.level,
    focus: pattern.focus,
    translation: pattern.translation,
    correctSentence: pattern.correct,
    explanation: pattern.explanation,
    formula: pattern.formula,
    voice: pattern.voice ?? "neutral",
  };
  const challenge = sentenceChallenge(pattern);
  const choice: V2ChoiceDrill = {
    ...common,
    id: `${pattern.id}:choice`,
    mechanic: "choice",
    prompt: "Vælg den sætning, der følger dansk ordstilling.",
    options,
    correctOption: pattern.correct,
  };

  if (patternIndex % 3 === 0) {
    const presentation = shuffledChunkIndices(challenge.tokens.length, `${pattern.id}:order`);
    return [choice, {
      ...common,
      id: `${pattern.id}:order`,
      mechanic: "order",
      prompt: "Byg sætningen, så det finite verbum lander rigtigt.",
      tokens: presentation.map((index) => challenge.tokens[index]),
      correctOrder: challenge.tokens.map((_, correctIndex) => presentation.indexOf(correctIndex)),
    }];
  }

  if (patternIndex % 3 === 1) {
    return [choice, {
      ...common,
      id: `${pattern.id}:swap`,
      mechanic: "swap",
      prompt: "To ord står forkert. Vælg dem, der skal bytte plads.",
      tokens: challenge.wrongTokens,
      swapIndices: [challenge.verbIndex, challenge.subjectIndex],
    }];
  }

  return [choice, {
    ...common,
    id: `${pattern.id}:spot`,
    mechanic: "spot",
    prompt: "Hvor bryder sætningen V2-reglen? Markér det første fejlplacerede ord.",
    tokens: challenge.wrongTokens,
    errorIndex: challenge.verbIndex,
  }];
}

function theoryQuestion(
  id: string,
  level: "A2+" | "B1" | "B2",
  focus: V2Focus,
  voice: Exclude<V2Voice, "neutral">,
  prompt: string,
  translation: string,
  correctOption: string,
  distractors: [string, string, string],
  explanation: string,
  formula: string[],
): V2TheoryDrill {
  return {
    id: `theory-${id}`,
    level,
    focus,
    voice,
    mechanic: "theory",
    prompt,
    translation,
    options: rotateOptions([correctOption, ...distractors], `theory-${id}`),
    correctOption,
    correctSentence: correctOption,
    explanation,
    formula,
  };
}

const theoryDrills: V2TheoryDrill[] = [
  theoryQuestion("subordinator", "A2+", "ledsaetning", "formel", "Hvilket ord kan indlede en årsagsledsætning?", "Which word can introduce a subordinate clause expressing a reason?", "fordi", ["derfor", "alligevel", "ellers"], "Fordi er en underordnende konjunktion. Derfor er derimod et adverbium, som normalt indleder en helsætning med V2.", ["fordi", "subjekt", "ikke", "verbum"]),
  theoryQuestion("subordinator-family", "A2+", "ledsaetning", "venlig", "Hvilken gruppe består kun af ord, der kan indlede ledsætninger?", "Which group contains only words that can introduce subordinate clauses?", "at · fordi · hvis · selvom", ["derfor · så · alligevel · nu", "og · men · eller · for", "måske · aldrig · ofte · altid"], "At, fordi, hvis og selvom underordner alle en ledsætning. Ordene i de andre grupper har andre funktioner.", ["bindeord", "subjekt", "adverbium", "verbum"]),
  theoryQuestion("therefore", "A2+", "inversion", "satirisk", "Hvilket ord ligner et bindeord, men starter normalt en ny helsætning med V2?", "Which word looks connective but normally starts a new main clause with V2?", "derfor", ["fordi", "selvom", "hvis"], "Derfor forbinder betydningen, men er et adverbium: Derfor bliver vi hjemme — verbet kommer før subjektet.", ["Derfor", "verbum", "subjekt", "resten"]),
  theoryQuestion("find-clause", "A2+", "ledsaetning", "skarp", "Hvilken del er ledsætningen i: “Vi venter, fordi bussen er forsinket”?", "Which part is the subordinate clause?", "fordi bussen er forsinket", ["Vi venter", "bussen er", "Vi venter, fordi"], "Fordi markerer starten, og hele ledet fordi bussen er forsinket fungerer som årsag til helsætningen.", ["helsætning", "fordi + ledsætning"]),
  theoryQuestion("ikke-before", "A2+", "ikke", "filosofisk", "Hvorfor står “ikke” før “kan” i: “Hun siger, at hun ikke kan komme”?", "Why does ikke stand before kan?", "Fordi “at hun …” er en ledsætning", ["Fordi kan altid står sidst", "Fordi hun er et objekt", "Fordi ikke altid skal stå først"], "I ledsætninger står sætningsadverbiet normalt mellem subjektet og det finite verbum.", ["at", "hun", "ikke", "kan"]),
  theoryQuestion("finite-regner", "A2+", "ledsaetning", "absurd", "Hvilket ord er det finite verbum i “Hvis det regner i morgen”?", "Which word is the finite verb?", "regner", ["Hvis", "det", "morgen"], "Regner er bøjet i nutid og bærer sætningens tid. Derfor er det det finite verbum.", ["Hvis", "subjekt", "finit verbum", "resten"]),
  theoryQuestion("first-field", "A2+", "forfelt", "formel", "Hvad fylder felt 1 i “Efter mødet ringer hun til kunden”?", "What occupies the first field?", "Efter mødet", ["Efter", "mødet ringer", "hun"], "Et helt led kan bestå af flere ord. Efter mødet tæller samlet som ét forfelt.", ["Efter mødet", "ringer", "hun", "til kunden"]),
  theoryQuestion("clause-front", "A2+", "inversion", "venlig", "Hvad følger normalt efter en ledsætning i forfeltet?", "What normally follows a subordinate clause placed first?", "finit verbum + subjekt", ["subjekt + finit verbum", "ikke + subjekt", "infinitiv + objekt"], "Hele ledsætningen fylder felt 1, så helsætningen fortsætter med V2: Hvis det regner, bliver vi hjemme.", ["ledsætning", "finit verbum", "subjekt", "resten"]),

  theoryQuestion("coordinator-men", "B1", "ledsaetning", "skarp", "Hvilket ord sideordner to helsætninger i stedet for at skabe en ledsætning?", "Which word coordinates two main clauses rather than creating a subordinate clause?", "men", ["selvom", "fordi", "mens"], "Men er en sideordnende konjunktion. Begge sider kan derfor have almindelig helsætningsorden.", ["helsætning", "men", "helsætning"]),
  theoryQuestion("relative-som", "B1", "ledsaetning", "venlig", "Hvilket ord indleder relativleddet i “Kvinden, som bor her, er læge”?", "Which word introduces the relative clause?", "som", ["her", "bor", "er"], "Som knytter relativledsætningen til kvinden og har samtidig en rolle inde i ledsætningen.", ["navneord", "som", "ledsætning"]),
  theoryQuestion("embedded-question", "B1", "ledsaetning", "formel", "Hvilket ord kan indlede et indirekte ja/nej-spørgsmål?", "Which word can introduce an indirect yes/no question?", "om", ["at", "derfor", "men"], "Om svarer her til engelsk whether: Hun spørger, om mødet er aflyst.", ["spørger", "om", "subjekt", "verbum"]),
  theoryQuestion("sentence-adverb", "B1", "ikke", "satirisk", "Hvilket ord kommenterer talerens sikkerhed om hele udsagnet?", "Which word comments on the speaker’s certainty about the whole statement?", "sandsynligvis", ["rapporten", "skriver", "grundigt"], "Sandsynligvis er et sætningsadverbium og flytter derfor plads mellem hel- og ledsætning.", ["subjekt", "verbum", "sandsynligvis", "resten"]),
  theoryQuestion("main-order", "B1", "ikke", "absurd", "Hvilken grundmodel passer til en helsætning, når subjektet står først?", "Which basic model fits a main clause beginning with the subject?", "subjekt + finit verbum + ikke", ["subjekt + ikke + finit verbum", "ikke + subjekt + infinitiv", "finit verbum + ikke + subjekt"], "I en neutral helsætning kommer det finite verbum før ikke: Robotten forstår ikke reglen.", ["subjekt", "finit verbum", "ikke", "resten"]),
  theoryQuestion("subordinate-order", "B1", "ikke", "filosofisk", "Hvilken grundmodel passer til en ledsætning?", "Which basic model fits a subordinate clause?", "subjekt + ikke + finit verbum", ["finit verbum + subjekt + ikke", "ikke + finit verbum + subjekt", "subjekt + finit verbum + ikke"], "Ledsætningsordenen placerer sætningsadverbiet før det finite verbum.", ["bindeord", "subjekt", "ikke", "finit verbum"]),
  theoryQuestion("one-field", "B1", "forfelt", "formel", "Hvor mange felter fylder “På grund af den lange forsinkelse” foran verbet?", "How many fields does the long phrase occupy before the verb?", "ét felt", ["to felter", "fire felter", "ingen felter"], "Antallet af ord er ikke afgørende. Hele præpositionsleddet fungerer samlet som felt 1.", ["langt led = felt 1", "verbum = felt 2"]),
  theoryQuestion("two-main-clauses", "B1", "v2", "satirisk", "Hvad sker der med V2 efter “og”, når der kommer en ny helsætning?", "What happens to V2 after og when a new main clause follows?", "Den nye helsætning har sin egen V2-struktur", ["V2 forsvinder efter og", "Verbet skal altid stå sidst", "Ikke skal stå foran subjektet"], "Og kan forbinde to selvstændige helsætninger; hver af dem organiserer sin egen verbumsplads.", ["helsætning", "og", "helsætning"]),

  theoryQuestion("conditional-inversion", "B2", "inversion", "formel", "Hvilken sætning udtrykker en betingelse uden ordet “hvis”?", "Which sentence expresses a condition without using hvis?", "Havde vi vidst det, var vi blevet hjemme.", ["Vi havde vidst det og blev hjemme.", "Fordi vi vidste det, blev vi hjemme.", "Vi var hjemme, men vidste det ikke."], "Havde vi … er betingende inversion og svarer til Hvis vi havde …", ["Havde", "subjekt", "participium", "hovedsætning"]),
  theoryQuestion("negative-front", "B2", "inversion", "skarp", "Hvad udløser “Under ingen omstændigheder” i begyndelsen af en helsætning?", "What does the negative fronted phrase trigger?", "inversion mellem finit verbum og subjekt", ["ledsætningsorden", "verbet i infinitiv", "subjektet udelades"], "Det negative led fylder felt 1 og fremhæver negationen; derefter følger stadig V2.", ["negativt forfelt", "finit verbum", "subjekt"]),
  theoryQuestion("jo-desto", "B2", "inversion", "filosofisk", "Hvilken struktur er korrekt i en jo–desto-konstruktion?", "Which structure is correct in a jo–desto construction?", "Jo mere vi øver, desto bedre forstår vi det.", ["Jo mere øver vi, desto vi bedre forstår det.", "Jo vi mere øver, desto bedre vi forstår det.", "Jo mere vi øver, desto vi forstår bedre det."], "Jo-leddet har ledsætningslignende orden; desto-leddet placerer det finite verbum før subjektet.", ["jo + subjekt + verbum", "desto + verbum + subjekt"]),
  theoryQuestion("finite-perfect", "B2", "v2", "absurd", "Hvilket ord er finit i “Rapporten har været undersøgt grundigt”?", "Which word is finite in the verb chain?", "har", ["været", "undersøgt", "grundigt"], "Kun har er bøjet efter tid. De øvrige verbalformer er infinitte og flytter ikke V2-pladsen.", ["subjekt", "har", "været undersøgt", "resten"]),
  theoryQuestion("relative-choice", "B2", "ledsaetning", "venlig", "Hvilket par kan begge indlede en dansk relativledsætning i passende sammenhænge?", "Which pair can both introduce a Danish relative clause?", "der og som", ["derfor og fordi", "men og eller", "nu og så"], "Der og som kan begge fungere som relative markører, selv om deres muligheder ikke er helt identiske.", ["navneord", "der/som", "relativled"]),
  theoryQuestion("temporal-naar", "B2", "ledsaetning", "filosofisk", "Hvad indleder “når” typisk i “Når tidevandet falder, forlader båden havnen”?", "What does når typically introduce here?", "en tidsledsætning", ["et direkte spørgsmål", "en ny helsætning", "et navneord"], "Når-leddet angiver tidspunkt eller gentagen betingelse og fylder her hele forfeltet.", ["Når + ledsætning", "verbum", "subjekt"]),
  theoryQuestion("stand-alone-test", "B2", "ledsaetning", "skarp", "Hvilket udsagn beskriver bedst en ledsætning?", "Which statement best describes a subordinate clause?", "Den er grammatisk underordnet et andet led", ["Den skal altid stå efter komma", "Den indeholder aldrig et subjekt", "Den har altid verbet først"], "Placering og komma er ikke sikre tests. Det afgørende er den grammatiske underordning.", ["overordnet led", "underordnet ledsætning"]),
  theoryQuestion("main-after-clause", "B2", "inversion", "satirisk", "Hvad er helsætningen i “Selvom planen ser flot ud, mangler den stadig data”?", "What is the main clause in the sentence?", "mangler den stadig data", ["Selvom planen ser flot ud", "planen ser flot ud", "stadig data"], "Selvom-leddet er indrømmelsen. Det selvstændige udsagn begynder med V2-leddet mangler den.", ["Selvom + ledsætning", "mangler", "den", "stadig data"]),
];

export const V2_DRILLS: V2DrillItem[] = [
  ...sentencePatterns.flatMap(buildSentenceDrills),
  ...slotPatterns.map((pattern): V2SlotDrill => ({
    id: `${pattern.id}:slot`,
    level: pattern.level,
    focus: pattern.focus,
    mechanic: "slot",
    prompt: `Placér “${pattern.token}” i det rigtige felt.`,
    translation: pattern.translation,
    correctSentence: pattern.correct,
    explanation: pattern.explanation,
    formula: pattern.formula,
    voice: "neutral",
    token: pattern.token,
    segments: pattern.segments,
    answerSlot: pattern.answerSlot,
  })),
  ...advancedVoicePatterns.flatMap((pattern, index) => buildSentenceDrills(pattern, sentencePatterns.length + index)),
  ...theoryDrills,
];

export const EMPTY_V2_PROGRESS: V2DrillProgress = {
  totalAttempts: 0,
  correctAttempts: 0,
  currentStreak: 0,
  bestStreak: 0,
  roundsCompleted: 0,
  items: {},
};

export function normalizeV2Progress(value?: Partial<V2DrillProgress> | null): V2DrillProgress {
  return {
    ...EMPTY_V2_PROGRESS,
    ...value,
    items: value?.items ?? {},
  };
}

export function isV2ResponseReady(item: V2DrillItem, response: V2DrillResponse | null) {
  if (!response || response.mechanic !== item.mechanic) return false;
  if (item.mechanic === "choice" && response.mechanic === "choice") return Boolean(response.option);
  if (item.mechanic === "theory" && response.mechanic === "theory") return Boolean(response.option);
  if (item.mechanic === "swap" && response.mechanic === "swap") return response.indices.length === 2;
  if (item.mechanic === "order" && response.mechanic === "order") return response.indices.length === item.tokens.length;
  if (item.mechanic === "slot" && response.mechanic === "slot") return response.slot >= 0 && response.slot <= item.segments.length;
  if (item.mechanic === "spot" && response.mechanic === "spot") return response.index >= 0 && response.index < item.tokens.length;
  return false;
}

export function isV2AnswerCorrect(item: V2DrillItem, response: V2DrillResponse) {
  if (response.mechanic !== item.mechanic) return false;
  if (item.mechanic === "choice" && response.mechanic === "choice") return response.option === item.correctOption;
  if (item.mechanic === "theory" && response.mechanic === "theory") return response.option === item.correctOption;
  if (item.mechanic === "swap" && response.mechanic === "swap") {
    const selected = [...response.indices].sort((left, right) => left - right);
    const expected = [...item.swapIndices].sort((left, right) => left - right);
    return selected.length === 2 && selected.every((value, index) => value === expected[index]);
  }
  if (item.mechanic === "order" && response.mechanic === "order") {
    return response.indices.length === item.correctOrder.length
      && response.indices.every((value, index) => value === item.correctOrder[index]);
  }
  if (item.mechanic === "slot" && response.mechanic === "slot") return response.slot === item.answerSlot;
  if (item.mechanic === "spot" && response.mechanic === "spot") return response.index === item.errorIndex;
  return false;
}

export function recordV2Attempt(
  progress: V2DrillProgress,
  itemId: string,
  correct: boolean,
  attemptedAt = new Date().toISOString(),
): V2DrillProgress {
  const previous = progress.items[itemId] ?? { attempts: 0, correct: 0, incorrect: 0, currentCorrectStreak: 0, lastAttemptAt: attemptedAt };
  const currentStreak = correct ? progress.currentStreak + 1 : 0;
  return {
    ...progress,
    totalAttempts: progress.totalAttempts + 1,
    correctAttempts: progress.correctAttempts + (correct ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(progress.bestStreak, currentStreak),
    items: {
      ...progress.items,
      [itemId]: {
        attempts: previous.attempts + 1,
        correct: previous.correct + (correct ? 1 : 0),
        incorrect: previous.incorrect + (correct ? 0 : 1),
        currentCorrectStreak: correct ? previous.currentCorrectStreak + 1 : 0,
        lastAttemptAt: attemptedAt,
      },
    },
  };
}

export function v2WeakItemIds(progress: V2DrillProgress) {
  return V2_DRILLS
    .filter((item) => {
      const itemProgress = progress.items[item.id];
      return Boolean(itemProgress && itemProgress.incorrect > 0 && itemProgress.currentCorrectStreak < 2);
    })
    .sort((left, right) => {
      const leftProgress = progress.items[left.id];
      const rightProgress = progress.items[right.id];
      const leftAccuracy = leftProgress.correct / Math.max(1, leftProgress.attempts);
      const rightAccuracy = rightProgress.correct / Math.max(1, rightProgress.attempts);
      return leftAccuracy - rightAccuracy || Date.parse(leftProgress.lastAttemptAt) - Date.parse(rightProgress.lastAttemptAt);
    })
    .map((item) => item.id);
}

function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createV2Queue(ids: string[], seed: number, avoidFirstId?: string | null) {
  const result = [...new Set(ids)];
  const random = seededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  if (avoidFirstId && result.length > 1 && result[0] === avoidFirstId) {
    [result[0], result[1]] = [result[1], result[0]];
  }
  return result;
}

export function v2ProgressAccuracy(progress: V2DrillProgress) {
  return progress.totalAttempts ? Math.round(progress.correctAttempts / progress.totalAttempts * 100) : 0;
}

export function v2MechanicLabel(mechanic: V2Mechanic) {
  return ({ choice: "Vælg", swap: "Byt to ord", order: "Byg", slot: "Placér", spot: "Find bruddet", theory: "Forstå reglen" } as const)[mechanic];
}

export function v2FocusLabel(focus: V2Focus) {
  return ({ v2: "V2", forfelt: "Forfelt", ikke: "Ikke & adverbier", ledsaetning: "Ledsætning", inversion: "Inversion" } as const)[focus];
}

export function v2VoiceLabel(voice: V2Voice) {
  return ({
    neutral: "Klar",
    satirisk: "Satirisk",
    skarp: "Skarp",
    venlig: "Venlig",
    filosofisk: "Filosofisk",
    absurd: "Absurd",
    formel: "Formel",
  } as const)[voice];
}
