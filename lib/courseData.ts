/**
 * The complete, audio-free launch course for the Danish learning game.
 *
 * Every playable item is deliberately either read or produce. The asset shape is
 * already audio-ready, but no item may use the listen modality until an actual
 * audio file is supplied.
 */

export type Difficulty = 1 | 2 | 3;
export type Modality = "read" | "listen" | "produce";

export interface ItemAssets {
  audio: string | null;
}

export interface BaseItem {
  id: string;
  prompt: string;
  answer: string;
  hint: string;
  explanation: string;
  translation?: string;
  skill: string;
  tags: string[];
  difficulty: Difficulty;
  modality: Modality;
  assets: ItemAssets;
  options?: string[];
  tokens?: string[];
  acceptedAnswers?: string[];
}

export interface ChoiceItem extends BaseItem {
  type: "choice";
  options: string[];
}

export interface OrderItem extends BaseItem {
  type: "order";
  tokens: string[];
  acceptedAnswers: string[];
}

export interface InputItem extends BaseItem {
  type: "input";
  acceptedAnswers: string[];
}

export interface GenderBetItem extends BaseItem {
  type: "gender-bet";
  noun: string;
  options: ["en", "et"];
  /** The UI asks the learner to wager confidence before revealing the answer. */
  confidenceWager: { min: 50; max: 100; step: 10; default: number };
  /** Probability p is wager / 100; outcome is 1 for correct and 0 otherwise. */
  scoreMode: "brier";
}

export interface NumberArcadeItem extends BaseItem {
  type: "number-arcade";
  value: number;
  options: string[];
  numberSystem: "base-ten" | "vigesimal";
  breakdown: string;
}

export interface DefinitenessItem extends BaseItem {
  type: "definiteness";
  forms: { indefinite: string; definite: string; modified: string };
  targetForm: "indefinite" | "definite" | "modified";
  options: string[];
}

export interface AgreementItem extends BaseItem {
  type: "agreement";
  adjective: string;
  agreementForm: "base" | "t" | "e";
  options: string[];
}

export interface IkkePositionItem extends BaseItem {
  type: "ikke-position";
  clauseType: "main" | "subordinate";
  grammarFrame: "V2" | "subject-before-adverb";
  tokens: string[];
  acceptedAnswers: string[];
}

export type CourseItem =
  | ChoiceItem
  | OrderItem
  | InputItem
  | GenderBetItem
  | NumberArcadeItem
  | DefinitenessItem
  | AgreementItem
  | IkkePositionItem;

// Kept as a friendly alias for consumers that call mission items challenges.
export type Challenge = CourseItem;

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  estimatedMinutes: number;
  xp: number;
  questions: CourseItem[];
}

export interface CourseLevel {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  color: string;
  unlockXp: number;
  missions: Mission[];
}

const NO_AUDIO: ItemAssets = { audio: null };

const choice = (
  id: string, prompt: string, answer: string, options: string[], hint: string,
  explanation: string, translation: string, skill: string, tags: string[],
  difficulty: Difficulty = 1,
): ChoiceItem => ({ id, type: "choice", prompt, answer, options, hint, explanation,
  translation, skill, tags, difficulty, modality: "read", assets: NO_AUDIO });

const order = (
  id: string, prompt: string, answer: string, tokens: string[], hint: string,
  explanation: string, translation: string, skill: string, tags: string[],
  difficulty: Difficulty = 1,
): OrderItem => ({ id, type: "order", prompt, answer, tokens, acceptedAnswers: [answer],
  hint, explanation, translation, skill, tags, difficulty, modality: "produce", assets: NO_AUDIO });

const input = (
  id: string, prompt: string, answer: string, acceptedAnswers: string[], hint: string,
  explanation: string, translation: string, skill: string, tags: string[],
  difficulty: Difficulty = 1,
): InputItem => ({ id, type: "input", prompt, answer, acceptedAnswers, hint,
  explanation, translation, skill, tags, difficulty, modality: "produce", assets: NO_AUDIO });

const genderBet = (
  id: string, noun: string, answer: "en" | "et", hint: string, explanation: string,
  translation: string, tags: string[], difficulty: Difficulty = 1,
): GenderBetItem => ({ id, type: "gender-bet", noun,
  prompt: `Vælg en eller et foran “${noun}”, og sats din sikkerhed.`, answer,
  options: ["en", "et"], confidenceWager: { min: 50, max: 100, step: 10, default: 70 },
  scoreMode: "brier", hint, explanation, translation, skill: "navneordets køn",
  tags: ["køn", "en-et", ...tags], difficulty, modality: "read", assets: NO_AUDIO });

const numberArcade = (
  id: string, value: number, answer: string, options: string[], breakdown: string,
  hint: string, translation: string, difficulty: Difficulty = 2,
): NumberArcadeItem => ({ id, type: "number-arcade",
  prompt: `Ram tallet ${value} på dansk.`, value, answer, options, numberSystem: value >= 50 ? "vigesimal" : "base-ten",
  breakdown, hint, explanation: `${answer}: ${breakdown}.`, translation,
  skill: "danske tal", tags: ["tal", value >= 50 ? "vigesimal" : "grundtal"],
  difficulty, modality: "read", assets: NO_AUDIO });

const definiteness = (
  id: string, prompt: string, answer: string,
  forms: { indefinite: string; definite: string; modified: string },
  targetForm: DefinitenessItem["targetForm"], hint: string, explanation: string,
  translation: string, difficulty: Difficulty = 2,
): DefinitenessItem => ({ id, type: "definiteness", prompt, answer, forms, targetForm,
  options: [forms.indefinite, forms.definite, forms.modified], hint, explanation,
  translation, skill: "bestemthed", tags: ["navneord", "bestemthed", targetForm],
  difficulty, modality: "read", assets: NO_AUDIO });

const agreement = (
  id: string, prompt: string, answer: string, adjective: string,
  agreementForm: AgreementItem["agreementForm"], options: string[], hint: string,
  explanation: string, translation: string, difficulty: Difficulty = 2,
): AgreementItem => ({ id, type: "agreement", prompt, answer, adjective, agreementForm,
  options, hint, explanation, translation, skill: "adjektivkongruens",
  tags: ["adjektiv", "kongruens", agreementForm], difficulty, modality: "read", assets: NO_AUDIO });

const ikkePosition = (
  id: string, prompt: string, answer: string, tokens: string[],
  clauseType: IkkePositionItem["clauseType"], hint: string, explanation: string,
  translation: string, difficulty: Difficulty = 3,
): IkkePositionItem => ({ id, type: "ikke-position", prompt, answer, tokens,
  acceptedAnswers: [answer], clauseType,
  grammarFrame: clauseType === "main" ? "V2" : "subject-before-adverb",
  hint, explanation, translation, skill: "ikke og ordstilling",
  tags: ["ikke", "ordstilling", clauseType, clauseType === "main" ? "V2" : "ledsætning"],
  difficulty, modality: "produce", assets: NO_AUDIO });

export const courseLevels: CourseLevel[] = [
  {
    id: "level-01", eyebrow: "A0 · Niveau 1", title: "Hej, Danmark!",
    description: "Tag de første skridt: hils, præsenter dig selv og byg helt korte sætninger.",
    color: "#EF5B5B", unlockXp: 0,
    missions: [
      {
        id: "l01-m01", title: "Første møde", subtitle: "Hilsner, høflighed og farvel", icon: "👋",
        estimatedMinutes: 3, xp: 80,
        questions: [
          choice("l01-m01-q01", "Vælg den almindelige danske hilsen.", "Hej!", ["Hej!", "Tak!", "Farvel!"], "Den virker både formelt og uformelt.", "Hej er den neutrale hilsen på dansk.", "Hello!", "hilsner", ["begynder", "hilsen"]),
          choice("l01-m01-q02", "Hvad svarer du på “Tak” ?", "Selv tak", ["Godnat", "Selv tak", "Undskyld"], "Du giver høfligheden tilbage.", "Selv tak betyder omtrent 'My pleasure'.", "My pleasure", "høflighed", ["fast udtryk"]),
          order("l01-m01-q03", "Byg: «My name is Lena».", "Jeg hedder Lena.", ["Lena.", "hedder", "Jeg"], "Start med personen.", "På dansk siger man bogstaveligt: Jeg hedder …", "My name is Lena.", "præsentation", ["ordstilling", "jeg"]),
          input("l01-m01-q04", "Skriv det manglende ord: God ___! (morning)", "morgen", ["morgen", "Morgen"], "Det er dagens første del.", "Godmorgen kan skrives samlet; efter God står morgen.", "Good morning!", "hilsner", ["tid på dagen"]),
          choice("l01-m01-q05", "Vælg den bedste oversættelse af “Vi ses”.", "See you", ["See you", "We are sitting", "Welcome"], "Det bruges som et uformelt farvel.", "Vi ses betyder, at man forventer at mødes igen.", "Vi ses — See you", "afsked", ["fast udtryk"]),
          order("l01-m01-q06", "Byg en høflig undskyldning.", "Undskyld, jeg er ny.", ["ny.", "Undskyld,", "er", "jeg"], "Efter kommaet kommer grundleddet før verbet.", "Jeg er er den simple rækkefølge subjekt + verbum.", "Sorry, I'm new.", "basisordstilling", ["undskyld", "er"]),
          input("l01-m01-q07", "Skriv «Thank you» på dansk.", "tak", ["tak", "Tak"], "Tre bogstaver.", "Tak er både neutralt og meget almindeligt.", "Thank you", "høflighed", ["basisord"]),
          choice("l01-m01-q08", "Hvornår siger man “Godnat” ?", "Når man går i seng", ["Når man går i seng", "Når man spiser frokost", "Når man mødes om morgenen"], "Tænk på nattens afslutning.", "Godnat bruges ved sengetid, ikke som almindelig aftenhilsen.", "When going to bed", "hilsner", ["kultur", "nat"]),
        ],
      },
      {
        id: "l01-m02", title: "Jeg og du", subtitle: "Personer og verbet at være", icon: "🙂",
        estimatedMinutes: 4, xp: 90,
        questions: [
          choice("l01-m02-q01", "Vælg pronomenet for «I».", "jeg", ["jeg", "du", "vi"], "Det skrives med j.", "Jeg er første person ental.", "I", "personlige pronomener", ["jeg", "ental"]),
          input("l01-m02-q02", "Udfyld: Du ___ sød.", "er", ["er", "Er"], "Samme form bruges efter jeg, du og vi.", "Nutidsformen er ændrer sig ikke efter person.", "You are sweet.", "verbet være", ["er", "nutid"]),
          order("l01-m02-q03", "Byg spørgsmålet: «Are you Danish?»", "Er du dansker?", ["dansker?", "du", "Er"], "Ja/nej-spørgsmål starter med verbet.", "I et spørgsmål står er før du.", "Are you Danish?", "spørgsmål", ["inversion", "er"]),
          choice("l01-m02-q04", "Hvem er “hun” ?", "she", ["He", "she", "They"], "Bruges om én kvinde eller pige.", "Hun er tredje person ental, feminin.", "she", "personlige pronomener", ["hun", "ental"]),
          order("l01-m02-q05", "Byg: «We are from Russia».", "Vi er fra Rusland.", ["Rusland.", "fra", "Vi", "er"], "Subjekt + er + fra + land.", "Fra markerer oprindelse.", "We are from Russia.", "oprindelse", ["vi", "fra"]),
          input("l01-m02-q06", "Skriv pronomenet: Peter er træt. ___ er træt.", "Han", ["han", "Han"], "Peter er én mand.", "Han erstatter et maskulint personnavn.", "Peter is tired. He's tired.", "personlige pronomener", ["han"]),
          choice("l01-m02-q07", "Vælg korrekt sætning.", "De er her.", ["De er her.", "De her er.", "Er de her."], "I et udsagn står subjektet typisk først.", "De + er + her følger neutral dansk ordstilling.", "They are here.", "basisordstilling", ["de", "er"]),
          input("l01-m02-q08", "Oversæt ét ord: «You» (flertal/høfligt).", "I", ["I", "i"], "Som pronomen skrives det med stort bogstav.", "I med stort er pronomenet; i med lille er præpositionen 'in'.", "You", "personlige pronomener", ["I", "stavning"], 2),
        ],
      },
      {
        id: "l01-m03", title: "Små ting", subtitle: "En, et og de første navneord", icon: "🧩",
        estimatedMinutes: 3, xp: 100,
        questions: [
          genderBet("l01-m03-q01", "bog", "en", "Tænk på udtrykket “en god bog”.", "Bog er fælleskøn: en bog.", "book", ["ting"]),
          genderBet("l01-m03-q02", "hus", "et", "Et meget almindeligt intetkønsord.", "Hus er intetkøn: et hus.", "house", ["bolig"]),
          choice("l01-m03-q03", "Vælg korrekt: ___ æble.", "et æble", ["en æble", "et æble", "æble en"], "Æble er intetkøn.", "Den ubestemte artikel står foran navneordet.", "apple", "navneordets køn", ["et", "mad"]),
          order("l01-m03-q04", "Byg: «This is a book».", "Det er en bog.", ["bog.", "Det", "en", "er"], "Start med Det er.", "Det er bruges til at identificere noget.", "This is a book.", "præsentation af ting", ["det er", "en"]),
          input("l01-m03-q05", "Udfyld artiklen: ___ kaffe.", "en", ["en", "En"], "Kaffe er fælleskøn.", "Man siger en kaffe, især om en kop/portion.", "coffee", "navneordets køn", ["en", "mad"]),
          genderBet("l01-m03-q06", "barn", "et", "Ordet betegner et menneske, men grammatikken er intetkøn.", "Barn hedder et barn i ental.", "child", ["person"]),
          genderBet("l01-m03-q07", "cykel", "en", "Husk frasen en ny cykel.", "Cykel er fælleskøn: en cykel.", "bike", ["transport"]),
          order("l01-m03-q08", "Byg: «I have an apple».", "Jeg har et æble.", ["et", "Jeg", "æble.", "har"], "Jeg + har + ting.", "Har betyder 'have'; æble kræver et.", "I have an apple.", "verbet have", ["har", "et"]),
        ],
      },
    ],
  },
  {
    id: "level-02", eyebrow: "A0–A1 · Niveau 2", title: "Tal & tid",
    description: "Knæk tallene, fortæl din alder og få styr på den danske kalender.",
    color: "#F59E42", unlockXp: 250,
    missions: [
      {
        id: "l02-m01", title: "Talbanen", subtitle: "Fra nul til de mærkelige halvtredsere", icon: "🎯",
        estimatedMinutes: 3, xp: 110,
        questions: [
          numberArcade("l02-m01-q01", 12, "tolv", ["tyve", "tolv", "to"], "et selvstændigt grundtal", "Det ligner engelsk twelve en smule.", "twelve", 1),
          numberArcade("l02-m01-q02", 21, "enogtyve", ["enogtyve", "tyveogen", "enogtredive"], "en + og + tyve", "Enerne kommer før tierne.", "twenty-one", 1),
          numberArcade("l02-m01-q03", 40, "fyrre", ["fjorten", "fyrre", "fireti"], "et uregelmæssigt årti", "Lær fyrre som én blok.", "forty", 2),
          numberArcade("l02-m01-q04", 50, "halvtreds", ["halvtreds", "femti", "tres"], "historisk 2½ × 20", "Det moderne ord læres bedst som en fast form.", "fifty", 2),
          numberArcade("l02-m01-q05", 75, "femoghalvfjerds", ["femoghalvfjerds", "halvfjerdsogfem", "femogtres"], "5 + og + 70; halvfjerds bygger historisk på 3½ × 20", "Sig først eneren, så årtiet.", "seventy-five", 3),
          input("l02-m01-q06", "Skriv 30 med bogstaver.", "tredive", ["tredive", "Tredive"], "Det begynder med tre-.", "30 hedder tredive, ikke treti.", "thirty", "danske tal", ["tal", "årtier"], 2),
          choice("l02-m01-q07", "Hvilket tal er “otteogtres” ?", "68", ["58", "68", "78"], "otte + og + tres.", "På dansk kommer 8 før 60 i ordet.", "sixty-eight", "danske tal", ["talforståelse", "vigesimal"], 2),
          order("l02-m01-q08", "Byg: «I have two sisters».", "Jeg har to søstre.", ["søstre.", "to", "har", "Jeg"], "Tal står før navneordet.", "Søster har den uregelmæssige flertalsform søstre.", "I have two sisters.", "tal i sætninger", ["to", "flertal"], 2),
        ],
      },
      {
        id: "l02-m02", title: "Hvad er klokken?", subtitle: "Timer, halve timer og aftaler", icon: "🕒",
        estimatedMinutes: 4, xp: 120,
        questions: [
          choice("l02-m02-q01", "Hvad betyder “Klokken er tre” ?", "It's three o'clock now", ["It's three o'clock now", "In three hours", "Three hours ago"], "Er beskriver tidspunktet nu.", "Klokken er … bruges til at fortælle tiden.", "It's three o'clock now.", "klokkeslæt", ["tid", "klokken"]),
          choice("l02-m02-q02", "“Halv otte” er …", "07.30", ["08.30", "07.30", "07.08"], "Dansk tæller frem mod den næste hele time.", "Halv otte betyder halvvejs til otte, altså 7.30.", "half past seven", "klokkeslæt", ["halv", "kultur"], 2),
          order("l02-m02-q03", "Byg spørgsmålet: «What time is it?»", "Hvad er klokken?", ["klokken?", "Hvad", "er"], "Spørgeordet kommer først.", "Den faste vending er Hvad er klokken?", "What time is it?", "spørgsmål om tid", ["spørgeord"]),
          input("l02-m02-q04", "Udfyld: Vi mødes ___ klokken ni.", "klokken", ["klokken", "Klokken"], "Ingen præposition er nødvendig her.", "På dansk kan man sige mødes klokken ni direkte.", "We meet at nine.", "aftaler", ["tidspunkt"]),
          choice("l02-m02-q05", "Vælg 14.15 på almindeligt dansk.", "kvart over to", ["kvart i to", "kvart over to", "halv tre"], "15 minutter efter to.", "Kvart over to er 2.15; sammenhængen afgør 14.15.", "quarter past two / 14:15", "klokkeslæt", ["kvart", "over"], 2),
          order("l02-m02-q06", "Byg: «Lesson starts at ten».", "Timen starter klokken ti.", ["ti.", "starter", "Timen", "klokken"], "Subjekt + verbum + tidspunkt.", "Starter er nutid af at starte.", "The lesson starts at ten.", "aftaler", ["V2", "tid"]),
          input("l02-m02-q07", "Skriv det manglende ord: kvart ___ fem = 16.45.", "i", ["i", "I"], "Man bevæger sig mod fem.", "Kvart i fem er et kvarter før fem.", "quarter to five", "klokkeslæt", ["kvart", "i"], 2),
          choice("l02-m02-q08", "Hvilket spørgsmål passer til svaret “Klokken otte” ?", "Hvornår åbner caféen?", ["Hvor er caféen?", "Hvornår åbner caféen?", "Hvem åbner caféen?"], "Svaret er et tidspunkt.", "Hvornår spørger til tid.", "When does the cafe open?", "spørgeord", ["hvornår", "aftale"]),
        ],
      },
      {
        id: "l02-m03", title: "Ugen rundt", subtitle: "Dage, datoer og fødselsdag", icon: "📅",
        estimatedMinutes: 3, xp: 120,
        questions: [
          choice("l02-m03-q01", "Hvilken dag kommer efter mandag?", "tirsdag", ["søndag", "tirsdag", "torsdag"], "Ugens anden arbejdsdag.", "Rækken er mandag, tirsdag, onsdag …", "Tuesday", "ugedage", ["kalender"]),
          input("l02-m03-q02", "Skriv dagen før fredag.", "torsdag", ["torsdag", "Torsdag"], "Den begynder med tors-.", "Torsdag ligger mellem onsdag og fredag.", "Thursday", "ugedage", ["kalender"]),
          order("l02-m03-q03", "Byg: «Today is Wednesday».", "Det er onsdag i dag.", ["i", "onsdag", "er", "dag.", "Det"], "Den faste slutning er i dag.", "Dansk bruger ofte Det er … i dag.", "Today is Wednesday.", "ugedage", ["det er", "i dag"]),
          choice("l02-m03-q04", "Hvad betyder “i weekenden” ?", "on weekends", ["on weekdays", "on weekends", "in a week"], "Weekend er lørdag og søndag.", "Præpositionen i bruges om perioden: i weekenden.", "on weekends", "tidsudtryk", ["weekend", "præposition"]),
          input("l02-m03-q05", "Udfyld: Min fødselsdag er ___ maj.", "i", ["i", "I"], "Måneder bruger denne præposition.", "Man siger i maj, men den 4. maj om en bestemt dato.", "My birthday is in May.", "måneder", ["præposition", "dato"]),
          order("l02-m03-q06", "Byg: «I am twenty years old».", "Jeg er tyve år.", ["år.", "tyve", "Jeg", "er"], "Dansk bruger er om alder.", "Alder udtrykkes med være: Jeg er tyve år.", "I am twenty years old.", "alder", ["er", "tal"]),
          choice("l02-m03-q07", "Vælg den korrekte dato: “den tredje april”.", "3. april", ["13. april", "30. april", "3. april"], "Tredje er ordenstallet 3.", "Datoer bruger ordenstal: den tredje.", "third of April", "datoer", ["ordenstal"]),
          input("l02-m03-q08", "Skriv «Today» på dansk.", "i dag", ["i dag", "I dag", "idag"], "Det er to ord.", "I dag skrives som to ord på moderne dansk.", "Today", "tidsudtryk", ["stavning", "dag"]),
        ],
      },
    ],
  },
  {
    id: "level-03", eyebrow: "A1 · Niveau 3", title: "Smag på dansk",
    description: "Bestil på café, køb ind og lær hvordan danske ting bliver bestemte.",
    color: "#F2C14E", unlockXp: 600,
    missions: [
      {
        id: "l03-m01", title: "På café", subtitle: "Bestil naturligt og høfligt", icon: "☕",
        estimatedMinutes: 3, xp: 130,
        questions: [
          choice("l03-m01-q01", "Hvad siger du for at bestille høfligt?", "Jeg vil gerne have en kaffe.", ["Jeg har en kaffe.", "Jeg vil gerne have en kaffe.", "Jeg bliver en kaffe."], "Brug vil gerne have.", "Vil gerne have er den almindelige, høflige bestillingsform.", "I would like some coffee.", "bestilling", ["café", "vil gerne"]),
          order("l03-m01-q02", "Byg: «Can I have a menu?»", "Må jeg få menuen?", ["få", "jeg", "menuen?", "Må"], "Et høfligt spørgsmål starter med Må.", "Må jeg få … er en fast og naturlig forespørgsel.", "Can I have a menu?", "høflige spørgsmål", ["må", "café"], 2),
          input("l03-m01-q03", "Udfyld: En kop kaffe, ___ tak.", "tak", ["tak", "Tak"], "Det lille ord gør bestillingen venlig.", "Tak kan afslutte en bestilling på dansk.", "A cup of coffee, please.", "høflighed", ["café", "tak"]),
          choice("l03-m01-q04", "Hvad er “regningen” ?", "check", ["menu", "check", "tips"], "Det er det, du betaler til sidst.", "En regning viser, hvor meget du skal betale.", "check", "caféord", ["betaling"]),
          order("l03-m01-q05", "Byg spørgsmålet: «What do you recommend?»", "Hvad anbefaler du?", ["du?", "Hvad", "anbefaler"], "Spørgeord + verbum + subjekt.", "Dansk V2 placerer anbefaler foran du efter spørgeordet.", "What do you recommend?", "spørgsmål", ["V2", "restaurant"], 2),
          input("l03-m01-q06", "Skriv det danske ord for «water».", "vand", ["vand", "Vand"], "Det er et intetkønsord.", "Vand hedder et vand, når man mener en portion/flaske.", "water", "mad og drikke", ["drikke"]),
          choice("l03-m01-q07", "Vælg korrekt svar på “Er der mælk i?”", "Nej, den er uden mælk.", ["Nej, den er uden mælk.", "Nej, den er under mælk.", "Nej, den er mellem mælk."], "Uden er det modsatte af med.", "Uden mælk betyder, at retten eller drikken ikke indeholder mælk.", "No, it's without milk.", "ingredienser", ["med-uden", "allergi"], 2),
          order("l03-m01-q08", "Byg: «That is all, thank you».", "Det var det, tak.", ["det,", "Det", "tak.", "var"], "En fast vending ved kassen.", "Det var det betyder, at bestillingen er færdig.", "That is all, thank you.", "bestilling", ["fast udtryk", "betaling"]),
        ],
      },
      {
        id: "l03-m02", title: "Indkøbskurven", subtitle: "Varer, mængder og en/et", icon: "🛒",
        estimatedMinutes: 4, xp: 140,
        questions: [
          genderBet("l03-m02-q01", "tomat", "en", "De fleste konkrete madord her er fælleskøn.", "Tomat er fælleskøn: en tomat.", "tomato", ["mad"]),
          genderBet("l03-m02-q02", "brød", "et", "Husk udtrykket et rugbrød.", "Brød er intetkøn: et brød.", "bread", ["mad"]),
          genderBet("l03-m02-q03", "mælk", "en", "Drikken har fælleskøn.", "Mælk er grammatisk fælleskøn: en mælk, når den tælles som vare.", "milk", ["drikke"], 2),
          choice("l03-m02-q04", "Vælg den naturlige mængde: ___ ost.", "et stykke", ["et stykke", "en flaske", "en liter"], "Ost kan skæres af.", "Et stykke ost er en almindelig mængdeangivelse.", "piece of cheese", "mængder", ["mad", "stykke"]),
          order("l03-m02-q05", "Byg: «I need a kilo of apples».", "Jeg skal bruge et kilo æbler.", ["et", "skal", "æbler.", "bruge", "Jeg", "kilo"], "Jeg skal bruge = I need.", "Efter et kilo står æble i flertal: æbler.", "I need a kilo of apples.", "indkøb", ["mængde", "flertal"], 2),
          input("l03-m02-q06", "Udfyld: Hvor ___ koster den?", "meget", ["meget", "Meget"], "Pris spørger til en mængde penge.", "Hvor meget koster …? er det normale prisspørgsmål.", "How much does it cost?", "priser", ["spørgeord", "butik"]),
          numberArcade("l03-m02-q07", 59, "nioghalvtreds", ["nioghalvtreds", "halvtredsogni", "niogtres"], "9 + og + 50; halvtreds er historisk 2½ × 20", "Enerne står først i sammensatte tal.", "fifty-nine kroner", 3),
          choice("l03-m02-q08", "Hvad betyder “på tilbud” ?", "on sale", ["sold out", "on sale", "too expensive"], "Prisen er midlertidigt lavere.", "En vare på tilbud sælges til en særlig pris.", "on sale", "butik", ["pris", "tilbud"]),
        ],
      },
      {
        id: "l03-m03", title: "Den bestemte hylde", subtitle: "En vare bliver til varen", icon: "🏷️",
        estimatedMinutes: 3, xp: 150,
        questions: [
          definiteness("l03-m03-q01", "Vælg formen for «apple» som en bestemt ting.", "æblet", { indefinite: "et æble", definite: "æblet", modified: "det røde æble" }, "definite", "Et-ord får normalt -et.", "Et æble bliver til æblet, når artiklen sættes bagpå.", "apple / this is an apple", 1),
          definiteness("l03-m03-q02", "Vælg: «this fresh fish».", "den friske fisk", { indefinite: "en fisk", definite: "fisken", modified: "den friske fisk" }, "modified", "Med adjektiv står den foran.", "Ved bestemt form med adjektiv bruges den + adjektiv på -e + ubøjet navneord.", "this fresh fish", 2),
          definiteness("l03-m03-q03", "Gør “en pose” bestemt.", "posen", { indefinite: "en pose", definite: "posen", modified: "den store pose" }, "definite", "En-ord får normalt -en.", "En pose bliver til posen.", "a bag → the bag", 1),
          choice("l03-m03-q04", "Vælg korrekt: Jeg køber ___ brød på hylden.", "det billige", ["den billig", "det billige", "billigt det"], "Brød er et-ord, og bestemt adjektiv ender på -e.", "Foran et bestemt et-ord med adjektiv bruger man det + billige.", "I buy that cheap bread on the shelf.", "bestemt adjektiv", ["det", "-e"], 2),
          order("l03-m03-q05", "Byg: «Milk is in the refrigerator».", "Mælken står i køleskabet.", ["i", "står", "Mælken", "køleskabet."], "Begge kendte ting står i bestemt form.", "Mælk → mælken; køleskab → køleskabet.", "The milk is in the refrigerator.", "bestemthed i kontekst", ["-en", "-et"], 2),
          input("l03-m03-q06", "Gør “en banan” bestemt: ___.", "bananen", ["bananen", "Bananen"], "Tilføj -en.", "Banan ender på konsonant og får bestemthedsendelsen -en.", "banana → this banana", "bestemthed", ["en-ord"]),
          definiteness("l03-m03-q07", "Vælg den ubestemte form.", "et æg", { indefinite: "et æg", definite: "ægget", modified: "det kogte æg" }, "indefinite", "Der nævnes ét nyt æg.", "Den ubestemte artikel et står foran æg.", "one egg", 1),
          agreement("l03-m03-q08", "Vælg: et ___ måltid.", "godt", "god", "t", ["god", "godt", "gode"], "Et-ord kræver ofte -t.", "God bøjes til godt foran et ubestemt intetkønsord.", "good food / good dish", 2),
        ],
      },
    ],
  },
  {
    id: "level-04", eyebrow: "A1 · Niveau 4", title: "Hjemme hos os",
    description: "Tal om familie og bolig, og få styr på bestemthed og adjektivernes endelser.",
    color: "#4DB6AC", unlockXp: 1000,
    missions: [
      {
        id: "l04-m01", title: "Min familie", subtitle: "Relationer og ejerskab", icon: "👨‍👩‍👧",
        estimatedMinutes: 3, xp: 150,
        questions: [
          choice("l04-m01-q01", "Hvem er “min mors søn”, hvis det ikke er mig?", "min bror", ["min far", "min bror", "min onkel"], "I har samme mor.", "Bror betyder brother.", "my brother", "familie", ["relationer"]),
          input("l04-m01-q02", "Skriv «my sister» på dansk.", "min søster", ["min søster", "Min søster"], "Søster er et en-ord.", "Min bruges foran fælleskønsord; søster er fælleskøn.", "my sister", "possessiver", ["min", "familie"]),
          order("l04-m01-q03", "Byg: «Our parents live in Aarhus».", "Vores forældre bor i Aarhus.", ["i", "forældre", "Vores", "Aarhus.", "bor"], "Vores ændrer ikke form.", "Bor betyder live/reside; danske byer bruger i.", "Our parents live in Aarhus.", "familie", ["vores", "bor"], 2),
          choice("l04-m01-q04", "Vælg korrekt: Det er ___ barn.", "mit", ["min", "mit", "mine"], "Barn er et-ord.", "Mit bruges foran et intetkønsord i ental.", "This is my child.", "possessiver", ["mit", "et-ord"]),
          order("l04-m01-q05", "Byg spørgsmålet: «Do you have children?»", "Har du børn?", ["børn?", "Har", "du"], "Ja/nej-spørgsmål starter med verbet.", "Barn har uregelmæssigt flertal: børn.", "Do you have children?", "familiespørgsmål", ["har", "flertal"]),
          input("l04-m01-q06", "Udfyld: Anna besøger ___ bedstemor. (her own)", "sin", ["sin", "Sin"], "Ejeren er sætningens subjekt Anna.", "Sin viser tilbage til subjektet i tredje person: Annas egen bedstemor.", "Anna visits her own grandmother.", "refleksive possessiver", ["sin", "familie"], 3),
          choice("l04-m01-q07", "Hvad betyder “gift” i sætningen “De er gift” ?", "married", ["poison", "married", "divorced"], "Konteksten handler om to mennesker.", "Som adjektiv betyder gift 'married'.", "They are married.", "civilstand", ["familie", "homonym"]),
          order("l04-m01-q08", "Byg: «Her husband's name is Mikkel».", "Hendes mand hedder Mikkel.", ["hedder", "Hendes", "Mikkel.", "mand"], "Hendes står foran den ejede person.", "Hendes betyder hendes egen eller en anden kvindes 'her'.", "Her husband's name is Mikkel.", "possessiver", ["hendes", "hedder"], 2),
        ],
      },
      {
        id: "l04-m02", title: "Rundt i boligen", subtitle: "Rum, møbler og placering", icon: "🏠",
        estimatedMinutes: 4, xp: 160,
        questions: [
          genderBet("l04-m02-q01", "værelse", "et", "Endelsen -else fortæller ikke kønnet sikkert.", "Værelse er intetkøn: et værelse.", "room", ["bolig"], 2),
          genderBet("l04-m02-q02", "stol", "en", "Husk en stol ved bordet.", "Stol er fælleskøn: en stol.", "chair", ["møbler"]),
          definiteness("l04-m02-q03", "Vælg: «the large window» som bestemt frase.", "det store vindue", { indefinite: "et vindue", definite: "vinduet", modified: "det store vindue" }, "modified", "Vindue er et-ord.", "Bestemt et-ord med adjektiv: det + store + vindue.", "the large window", 2),
          order("l04-m02-q04", "Byg: «The key is on the table».", "Nøglen ligger på bordet.", ["bordet.", "ligger", "på", "Nøglen"], "På bruges om en overflade.", "Kendte genstande står naturligt bestemt: nøglen, bordet.", "The key is on the table.", "placering", ["på", "bestemthed"], 2),
          input("l04-m02-q05", "Udfyld: Lampen hænger ___ bordet. (over)", "over", ["over", "Over"], "Den er højere end bordet.", "Over beskriver en placering højere end noget andet.", "The lamp hangs over the table.", "præpositioner", ["over", "placering"]),
          choice("l04-m02-q06", "Hvor står sofaen, hvis den er “mellem døren og vinduet” ?", "between the door and the window", ["in front of the door", "between the door and the window", "outside the window"], "Mellem forbinder to grænser med og.", "Mellem X og Y betyder between X and Y.", "between the door and the window", "præpositioner", ["mellem", "og"]),
          definiteness("l04-m02-q07", "Gør “en lejlighed” bestemt.", "lejligheden", { indefinite: "en lejlighed", definite: "lejligheden", modified: "den lyse lejlighed" }, "definite", "Føj -en til ordet.", "Lejlighed + en = lejligheden.", "apartment → this apartment", 2),
          order("l04-m02-q08", "Byg: «There is no window in the bathroom».", "Der er ikke et vindue på badeværelset.", ["på", "ikke", "Der", "vindue", "badeværelset.", "et", "er"], "Der er ikke + navneord.", "Eksistenskonstruktionen er der er; ikke følger efter det finite verbum.", "There is no window in the bathroom.", "der er", ["ikke", "bolig"], 3),
        ],
      },
      {
        id: "l04-m03", title: "Farver på væggene", subtitle: "God, godt, gode — få endelserne til at passe", icon: "🎨",
        estimatedMinutes: 3, xp: 170,
        questions: [
          agreement("l04-m03-q01", "Vælg: en ___ sofa.", "grøn", "grøn", "base", ["grøn", "grønt", "grønne"], "En-ord i ubestemt ental bruger grundformen.", "Sofa er fælleskøn, derfor en grøn sofa.", "green sofa", 1),
          agreement("l04-m03-q02", "Vælg: et ___ køkken.", "lyst", "lys", "t", ["lys", "lyst", "lyse"], "Et-ord giver ofte -t.", "Køkken er intetkøn: et lyst køkken.", "bright kitchen", 2),
          agreement("l04-m03-q03", "Vælg: to ___ stole.", "røde", "rød", "e", ["rød", "rødt", "røde"], "Flertal bruger -e.", "Adjektivet står i e-form foran navneord i flertal.", "two red chairs", 2),
          order("l04-m03-q04", "Byg: «This is a new little house».", "Det er et nyt lille hus.", ["lille", "Det", "nyt", "hus.", "et", "er"], "Begge adjektiver beskriver et hus.", "Ny får -t: nyt. Lille har samme form her.", "This is a new little house.", "adjektiver", ["et-ord", "ordstilling"], 2),
          choice("l04-m03-q05", "Vælg korrekt bestemt frase.", "den gamle stol", ["den gammel stol", "den gamle stol", "det gamle stol"], "Stol er en-ord; bestemt adjektiv får -e.", "Den gamle stol har både foranstillet artikel og e-form.", "this old chair", "bestemt adjektiv", ["den", "-e"]),
          input("l04-m03-q06", "Udfyld: Værelserne er ___. (small)", "små", ["små", "Små"], "Lille har en uregelmæssig flertalsform.", "Lille bliver til små i flertal og bestemt form.", "The rooms are small.", "adjektiver", ["uregelmæssig", "flertal"], 2),
          definiteness("l04-m03-q07", "Vælg frasen med både bestemthed og adjektiv.", "det hyggelige hjem", { indefinite: "et hjem", definite: "hjemmet", modified: "det hyggelige hjem" }, "modified", "Brug det og -e.", "Når et bestemt et-ord har adjektiv: det hyggelige hjem.", "this cozy house", 2),
          agreement("l04-m03-q08", "Vælg: Min seng er ___.", "blød", "blød", "base", ["blød", "blødt", "bløde"], "Seng er fælleskøn og står i ental.", "Efter er bøjes adjektivet stadig efter seng: blød.", "My bed is soft.", 2),
        ],
      },
    ],
  },
  {
    id: "level-05", eyebrow: "A1+ · Niveau 5", title: "En dag i bevægelse",
    description: "Fortæl om rutiner, flyt tiden frem i sætningen og navigér sikkert gennem byen.",
    color: "#3E8EDE", unlockXp: 1450,
    missions: [
      {
        id: "l05-m01", title: "Fra morgen til aften", subtitle: "Rutiner i nutid", icon: "🌅",
        estimatedMinutes: 3, xp: 170,
        questions: [
          order("l05-m01-q01", "Byg: «I get up at seven».", "Jeg står op klokken syv.", ["syv.", "står", "Jeg", "klokken", "op"], "Står op er et løst sammensat verbum.", "I hovedsætningen står op efter subjektet, mens tidsleddet kommer sidst.", "I get up at seven.", "daglige rutiner", ["stå op", "nutid"], 2),
          choice("l05-m01-q02", "Vælg den rigtige nutidsform: Hun ___ morgenmad.", "spiser", ["spise", "spiser", "spiste"], "Nutid ender ofte på -r.", "At spise bliver til spiser i nutid.", "She is having breakfast.", "nutid", ["rutine", "-r"]),
          input("l05-m01-q03", "Udfyld: Jeg børster ___ tænder.", "mine", ["mine", "Mine"], "Tænder står i flertal.", "Mine bruges foran flere ejede ting.", "I'm brushing my teeth.", "possessiver", ["rutine", "flertal"]),
          order("l05-m01-q04", "Byg: «He rides his bike to work».", "Han cykler på arbejde.", ["arbejde.", "Han", "på", "cykler"], "Cykler indeholder allerede transportmåden.", "På arbejde er den faste vending for destinationen arbejdet.", "He goes to work by bicycle.", "transport", ["cykle", "på arbejde"], 2),
          choice("l05-m01-q05", "Hvad betyder “jeg har fri” ?", "I'm free / I have a day off", ["I'm late", "I'm free / I have a day off", "I work from home"], "Fri betyder uden arbejde eller undervisning.", "At have fri betyder at have fritid fra arbejde eller skole.", "I have a day off.", "fritid", ["fast udtryk"]),
          input("l05-m01-q06", "Skriv nutid af “at læse”.", "læser", ["læser", "Læser"], "Fjern at og tilføj -r.", "Læse ender allerede på -e, så nutiden er læser.", "read → reads/am reading", "nutid", ["verber", "-r"]),
          choice("l05-m01-q07", "Vælg den naturlige sætning.", "Jeg går i seng ved elleve-tiden.", ["Jeg går på seng ved elleve.", "Jeg går i seng ved elleve-tiden.", "Jeg går i sengen på elleve."], "Udtrykket er gå i seng.", "Ved elleve-tiden betyder omtrent klokken elleve.", "I go to bed around eleven.", "aftenrutine", ["gå i seng", "cirkatid"], 2),
          order("l05-m01-q08", "Byg: «After dinner I read».", "Efter aftensmaden læser jeg.", ["jeg.", "Efter", "læser", "aftensmaden"], "Når tidsleddet står først, kommer verbet som nummer to.", "V2-reglen giver Efter aftensmaden + læser + jeg.", "After dinner I read.", "V2", ["tidsled først", "inversion"], 3),
        ],
      },
      {
        id: "l05-m02", title: "Ikke-maskinen", subtitle: "Nægtelse i hoved- og ledsætninger", icon: "⚙️",
        estimatedMinutes: 4, xp: 190,
        questions: [
          ikkePosition("l05-m02-q01", "Placér “ikke” i hovedsætningen.", "Jeg drikker ikke kaffe.", ["kaffe.", "ikke", "drikker", "Jeg"], "main", "I en hovedsætning står ikke efter det bøjede verbum.", "Rækkefølgen er subjekt + finit verbum + ikke.", "I don't drink coffee.", 2),
          ikkePosition("l05-m02-q02", "Byg med tid først og korrekt V2.", "I dag arbejder jeg ikke hjemme.", ["arbejder", "hjemme.", "I", "ikke", "jeg", "dag"], "main", "Efter I dag skal det bøjede verbum komme.", "V2: I dag + arbejder + jeg + ikke + hjemme.", "Today I'm not working at home.", 3),
          ikkePosition("l05-m02-q03", "Byg ledsætningen efter “fordi”.", "fordi jeg ikke har tid", ["har", "fordi", "tid", "jeg", "ikke"], "subordinate", "I ledsætningen kommer ikke før det bøjede verbum.", "Efter fordi er rækkefølgen subjekt + ikke + finit verbum.", "because I don't have time", 3),
          choice("l05-m02-q04", "Hvilken sætning har korrekt dansk ordstilling?", "Hun siger, at hun ikke er træt.", ["Hun siger, at hun er ikke træt.", "Hun siger, at hun ikke er træt.", "Hun siger, ikke at hun er træt."], "Efter at begynder en ledsætning.", "I at-ledsætningen står ikke før er.", "She says that she is not tired.", "ledsætningsordstilling", ["at", "ikke"], 3),
          ikkePosition("l05-m02-q05", "Placér “ikke” i et ja/nej-udsagn.", "Vi tager ikke bussen.", ["bussen.", "tager", "ikke", "Vi"], "main", "Ikke følger efter tager.", "Hovedsætningen bruger Vi + tager + ikke.", "We don't go by bus.", 2),
          order("l05-m02-q06", "Byg: «If I'm not late…»", "Hvis jeg ikke kommer for sent …", ["for", "ikke", "Hvis", "sent", "kommer", "jeg", "…"], "Hvis indleder en ledsætning.", "I hvis-ledsætningen står ikke før kommer; komme for sent er et fast udtryk.", "If I'm not late…", "ledsætning", ["hvis", "ikke"], 3),
          ikkePosition("l05-m02-q07", "Byg med et frontet tidsled.", "Om søndagen står hun ikke tidligt op.", ["står", "ikke", "hun", "op.", "Om", "søndagen", "tidligt"], "main", "Står skal være sætningens andet led.", "V2 efter Om søndagen; ikke står efter subjektet, og op til sidst.", "On Sundays she doesn't get up early.", 3),
          input("l05-m02-q08", "Hvilket ord mangler? Jeg ved, at han ___ bor her.", "ikke", ["ikke", "Ikke"], "At gør resten til en ledsætning.", "I ledsætninger kommer sætningsadverbiet ikke før det finite verbum bor.", "I know that he does not live here.", "ledsætningsordstilling", ["ikke", "at"], 3),
        ],
      },
      {
        id: "l05-m03", title: "Gennem byen", subtitle: "Transport og vejvisning", icon: "🚲",
        estimatedMinutes: 3, xp: 180,
        questions: [
          choice("l05-m03-q01", "Hvad spørger du, når du leder efter stationen?", "Hvor ligger stationen?", ["Hvornår er stationen?", "Hvor ligger stationen?", "Hvem ligger stationen?"], "Steder bruger hvor.", "Ligge bruges naturligt om en bygnings placering.", "Where is the station?", "vejvisning", ["hvor", "station"]),
          order("l05-m03-q02", "Byg: «Go straight and turn left».", "Gå ligeud og drej til venstre.", ["drej", "venstre.", "Gå", "ligeud", "til", "og"], "To bydeformer forbindes med og.", "Gå og drej er imperativer uden subjekt.", "Go straight and turn left.", "vejvisning", ["imperativ", "retning"], 2),
          input("l05-m03-q03", "Udfyld: Bussen kører ___ centrum.", "til", ["til", "Til"], "Der er bevægelse mod et mål.", "Til markerer destination.", "The bus goes to the center.", "præpositioner", ["til", "transport"]),
          choice("l05-m03-q04", "Hvad betyder “stå af” ?", "get off public transport", ["wait for transport", "get off public transport", "change transport"], "Det modsatte er stå på.", "Man står af bussen eller toget ved sit stoppested.", "get off a bus or train", "transportverber", ["stå af", "løst verbum"]),
          order("l05-m03-q05", "Byg: «Change to the metro at Nørreport».", "Skift til metroen på Nørreport.", ["til", "Skift", "Nørreport.", "metroen", "på"], "Skift til + transportmiddel.", "Skifte til betyder at change transport; på bruges ved stationen.", "Change to the metro at Nørreport.", "transport", ["skifte", "metro"], 3),
          input("l05-m03-q06", "Skriv bydeformen af “at vente”.", "vent", ["vent", "Vent"], "Fjern -e.", "Imperativ af vente er vent.", "wait → wait", "imperativ", ["vejvisning", "verbum"]),
          choice("l05-m03-q07", "Vælg korrekt: Cykelstien er ___ vejen.", "langs", ["gennem", "langs", "uden"], "Den følger vejens retning.", "Langs betyder along.", "The bike path runs along the road.", "præpositioner", ["langs", "by"]),
          order("l05-m03-q08", "Byg: «How many stops will there be?»", "Hvor mange stop er der?", ["stop", "der?", "Hvor", "er", "mange"], "Mange bruges med ting, der kan tælles.", "Eksistensspørgsmålet følger Hvor mange stop + er der.", "How many stops will there be?", "transportspørgsmål", ["hvor mange", "der er"], 2),
        ],
      },
    ],
  },
  {
    id: "level-06", eyebrow: "A1+–A2 · Niveau 6", title: "Klar til hverdagen",
    description: "Løs praktiske problemer hos lægen, i butikker og i det omskiftelige danske vejr.",
    color: "#6676D9", unlockXp: 1950,
    missions: [
      {
        id: "l06-m01", title: "Vejrvinduet", subtitle: "Prognoser, tøj og temperatur", icon: "🌦️",
        estimatedMinutes: 3, xp: 190,
        questions: [
          choice("l06-m01-q01", "Hvad betyder “Det regner” ?", "It's raining", ["The wind is blowing", "It's raining", "It's snowing"], "Regn falder som vand.", "Upersonlige vejrsætninger bruger det.", "It's raining.", "vejret", ["det", "regn"]),
          input("l06-m01-q02", "Udfyld: Der er femten ___ i dag.", "grader", ["grader", "Grader"], "Temperaturen tælles i flertal.", "Efter et tal over én bruges grader.", "It's fifteen degrees today.", "temperatur", ["tal", "vejr"]),
          order("l06-m01-q03", "Byg: «It will be sunny tomorrow».", "I morgen bliver det solrigt.", ["det", "I", "solrigt.", "bliver", "morgen"], "Tidsleddet står først, så verbet er nummer to.", "Bliver beskriver en ændring/fremtidig tilstand; V2 giver bliver det.", "It will be sunny tomorrow.", "vejrudsigt", ["V2", "blive"], 2),
          agreement("l06-m01-q04", "Vælg: Vejret er ___.", "koldt", "kold", "t", ["kold", "koldt", "kolde"], "Vejr er intetkøn.", "Prædikativt adjektiv følger kønnet: et vejr → koldt.", "The weather is cold.", 2),
          choice("l06-m01-q05", "Hvad tager du med, hvis “det klarer op, men det kan regne” ?", "en paraply", ["en paraply", "sandaler", "solbriller alene"], "Der er stadig mulighed for regn.", "Kan regne udtrykker mulighed, så paraplyen er den sikre løsning.", "umbrella", "vejret", ["kan", "pragmatik"]),
          order("l06-m01-q06", "Byg: «Wear a warm jacket».", "Tag en varm jakke på.", ["jakke", "Tag", "på.", "varm", "en"], "Tag … på er delt omkring objektet.", "I imperativ placeres tøjet mellem tag og på.", "Wear a warm jacket.", "tøj", ["tage på", "imperativ"], 2),
          input("l06-m01-q07", "Skriv det modsatte af “varm”.", "kold", ["kold", "Kold"], "Tænk på vinter.", "Varm og kold er antonymer.", "cold", "adjektiver", ["vejr", "antonym"]),
          choice("l06-m01-q08", "Vælg korrekt ledsætning.", "fordi det ikke blæser", ["fordi det blæser ikke", "fordi det ikke blæser", "fordi ikke det blæser"], "Efter fordi står ikke før verbet.", "Ledsætningsrækkefølgen er subjekt + ikke + blæser.", "because there is no wind", "ledsætningsordstilling", ["fordi", "ikke"], 3),
        ],
      },
      {
        id: "l06-m02", title: "Hos lægen", subtitle: "Kroppen, symptomer og råd", icon: "🩺",
        estimatedMinutes: 4, xp: 210,
        questions: [
          choice("l06-m02-q01", "Hvordan siger man naturligt “I have a headache” ?", "Jeg har ondt i hovedet.", ["Jeg er ondt på hovedet.", "Jeg har ondt i hovedet.", "Mit hoved gør ond."], "Brug have ondt i.", "Dansk udtrykker smerte med har ondt i + bestemt kropsdel.", "I have a headache.", "symptomer", ["have ondt", "krop"], 2),
          order("l06-m02-q02", "Byg lægens spørgsmål: «How long have you had a fever?»", "Hvor længe har du haft feber?", ["haft", "Hvor", "feber?", "du", "længe", "har"], "Hvor længe + har + subjekt + perfektum.", "Har haft beskriver en tilstand, der begyndte tidligere og fortsætter.", "How long have you had a fever?", "lægesamtale", ["perfektum", "spørgsmål"], 3),
          input("l06-m02-q03", "Udfyld: Du skal ___ meget vand.", "drikke", ["drikke", "Drikke"], "Efter skal bruges infinitiv uden at.", "Modalverbet skal efterfølges af grundformen drikke.", "You need to drink a lot of water.", "modalverber", ["skal", "råd"]),
          choice("l06-m02-q04", "Hvad er “en recept” ?", "prescription for medicine", ["doctor's appointment", "prescription for medicine", "health insurance"], "Den bruges på apoteket.", "Lægen udsteder en recept på medicin.", "prescription", "sundhed", ["apotek", "læge"]),
          order("l06-m02-q05", "Byg: «I am coughing and have a cold».", "Jeg hoster og er forkølet.", ["er", "Jeg", "hoster", "forkølet.", "og"], "Forkølet bruges med er.", "Hoster er et symptom; er forkølet beskriver tilstanden.", "I am coughing and have a cold.", "symptomer", ["hoste", "forkølelse"], 2),
          input("l06-m02-q06", "Skriv kropsdelen: Jeg har ondt i ___. (back)", "ryggen", ["ryggen", "Ryggen", "min ryg"], "Brug bestemt form efter ondt i.", "Ryg → ryggen; dansk siger normalt i ryggen.", "My back hurts.", "kroppen", ["bestemthed", "smerte"], 2),
          choice("l06-m02-q07", "Vælg det mildeste og mest passende råd ved forkølelse.", "Du bør hvile dig.", ["Du bør hvile dig.", "Du må aldrig sove.", "Du skal løbe et maraton."], "Bør udtrykker en anbefaling.", "At hvile sig er et refleksivt verbum; rådet er pragmatisk naturligt.", "You should rest.", "råd", ["bør", "refleksiv"]),
          ikkePosition("l06-m02-q08", "Byg lægens ledsætning efter “hvis”.", "hvis du ikke får det bedre", ["bedre", "du", "får", "hvis", "det", "ikke"], "subordinate", "Ikke står før får i hvis-ledsætningen.", "Få det bedre betyder at recover; ordstillingen er du ikke får.", "if you don't feel better", 3),
        ],
      },
      {
        id: "l06-m03", title: "Små problemer", subtitle: "Byt varer, bed om hjælp og forklar", icon: "🧰",
        estimatedMinutes: 3, xp: 210,
        questions: [
          order("l06-m03-q01", "Byg: «I would like to return this».", "Jeg vil gerne returnere den.", ["gerne", "den.", "Jeg", "returnere", "vil"], "Efter vil står infinitiven uden at.", "Den henviser til en fælleskønsgenstand, som begge kender.", "I would like to return this.", "retur i butik", ["vil gerne", "pronomen"], 2),
          choice("l06-m03-q02", "Hvad spørger ekspedienten med “Har du kvitteringen?”", "Do you have a receipt?", ["Do you have a receipt?", "Do you have a map?", "Do you need a package?"], "Kvitteringen dokumenterer købet.", "Kvittering betyder check/receipt.", "Do you have a receipt?", "butik", ["retur", "kvittering"]),
          input("l06-m03-q03", "Udfyld: Den er for ___. (too small)", "lille", ["lille", "Lille"], "For + adjektiv betyder excessively.", "For lille betyder mindre end ønsket.", "It is too small.", "problembeskrivelse", ["for", "adjektiv"]),
          order("l06-m03-q04", "Byg: «Can I exchange for a different size?»", "Kan jeg bytte den til en anden størrelse?", ["anden", "den", "jeg", "en", "Kan", "størrelse?", "bytte", "til"], "Spørgsmålet starter med Kan jeg.", "Bytte X til Y er den naturlige konstruktion ved størrelsesskift.", "Can I exchange it for a different size?", "butik", ["kan", "bytte"], 3),
          choice("l06-m03-q05", "Vælg korrekt: Jeg købte den ___, men den virker ikke.", "i går", ["på går", "i går", "om går"], "Udtrykket skrives som to ord.", "I går placerer købet i fortiden.", "I bought this yesterday, but it doesn't work.", "tidsudtryk", ["fortid", "i går"]),
          input("l06-m03-q06", "Skriv det manglende verbum: Kan du ___ mig?", "hjælpe", ["hjælpe", "Hjælpe"], "Efter kan kommer infinitiv.", "Kan + hjælpe uden at; hjælpe tager direkte objekt mig.", "Can you help me?", "hjælp", ["modalverbum", "butik"]),
          ikkePosition("l06-m03-q07", "Forklar problemet med korrekt “ikke”.", "Skærmen virker ikke.", ["ikke.", "Skærmen", "virker"], "main", "Ikke følger det bøjede verbum virker.", "I en kort hovedsætning står ikke efter verbet.", "The screen doesn't work.", 2),
          choice("l06-m03-q08", "Hvilken afslutning er høflig efter hjælp?", "Tak for hjælpen.", ["Tak for hjælpen.", "Tak til hjælpen.", "Tak ved hjælpen."], "Den faste præposition er for.", "Tak for + bestemt navneord bruges om noget, man har modtaget.", "Thanks for your help.", "høflighed", ["tak for", "fast udtryk"]),
        ],
      },
    ],
  },
  {
    id: "level-07", eyebrow: "A2 · Niveau 7", title: "Fortid & fremtid",
    description: "Fortæl hvad der skete, forbind oplevelser med nutiden og lav konkrete planer.",
    color: "#8B5FC7", unlockXp: 2500,
    missions: [
      {
        id: "l07-m01", title: "I går", subtitle: "Datid og små fortællinger", icon: "⏪",
        estimatedMinutes: 3, xp: 220,
        questions: [
          choice("l07-m01-q01", "Vælg datid af “at arbejde”.", "arbejdede", ["arbejder", "arbejdede", "har arbejde"], "Regelmæssige svage verber får ofte -ede.", "Arbejde bliver arbejdede i datid.", "worked", "datid", ["regelmæssigt verbum"]),
          input("l07-m01-q02", "Skriv datid af “at spise”.", "spiste", ["spiste", "Spiste"], "Verbet mister sin infinitivendelse.", "Spise har den korte datidsform spiste.", "ate", "datid", ["uregelmæssigt verbum"]),
          order("l07-m01-q03", "Byg: «Yesterday we watched a good movie».", "I går så vi en god film.", ["god", "vi", "film.", "I", "en", "så", "går"], "Tidsled først udløser V2.", "Datid af se er så; efter I går står så før vi.", "Yesterday we watched a good film.", "fortælling", ["datid", "V2"], 3),
          choice("l07-m01-q04", "Hvad er datid af “at gå” ?", "gik", ["gåede", "gik", "gået"], "Det er en kort uregelmæssig form.", "Gik er præteritum; gået er perfektum participium.", "went / walked", "datid", ["uregelmæssigt verbum"]),
          order("l07-m01-q05", "Byg: «Then she called her mom».", "Så ringede hun til sin mor.", ["hun", "sin", "Så", "til", "mor.", "ringede"], "Så først giver inversion.", "V2: Så + ringede + hun. Sin viser tilbage til hun.", "Then she called her mother.", "fortælling", ["V2", "sin", "datid"], 3),
          input("l07-m01-q06", "Udfyld datid: De ___ hjemme hele aftenen. (were)", "var", ["var", "Var"], "Datid af er.", "Være bøjes uregelmæssigt: er → var.", "They were at home all evening.", "datid", ["være", "uregelmæssig"]),
          choice("l07-m01-q07", "Vælg det rigtige bindeord: Jeg blev hjemme, ___ jeg var syg.", "fordi", ["men", "fordi", "eller"], "Den anden del giver årsagen.", "Fordi indleder en årsagsledsætning.", "I stayed at home because I was sick.", "bindeord", ["fordi", "årsag"]),
          ikkePosition("l07-m01-q08", "Byg fortidssætningen med korrekt “ikke”.", "I går nåede jeg ikke toget.", ["ikke", "nåede", "toget.", "I", "jeg", "går"], "main", "Efter I går står nåede som andet led.", "V2 giver nåede jeg; ikke følger subjektet i denne frontede hovedsætning.", "Yesterday I missed the train.", 3),
        ],
      },
      {
        id: "l07-m02", title: "Har du prøvet?", subtitle: "Perfektum og livserfaring", icon: "🧳",
        estimatedMinutes: 4, xp: 230,
        questions: [
          choice("l07-m02-q01", "Vælg perfektum: Jeg ___ København mange gange.", "har besøgt", ["er besøgt", "har besøgt", "har besøge"], "Brug har + kort tillægsform.", "Transitivt besøge danner perfektum med har besøgt.", "I have visited Copenhagen many times.", "perfektum", ["har", "oplevelse"], 2),
          order("l07-m02-q02", "Byg spørgsmålet: «Have you ever tried smørrebrød?»", "Har du nogensinde prøvet smørrebrød?", ["smørrebrød?", "du", "prøvet", "nogensinde", "Har"], "Har står først i ja/nej-spørgsmålet.", "Nogensinde betyder ever; prøvet er participium af prøve.", "Have you ever tried smørrebrød?", "livserfaring", ["perfektum", "nogensinde"], 3),
          input("l07-m02-q03", "Skriv perfektum participium af “at skrive”.", "skrevet", ["skrevet", "Skrevet"], "Tænk: har ___.", "Skrive bøjes uregelmæssigt: skrev, har skrevet.", "written/wrote", "perfektum", ["uregelmæssig", "participium"]),
          choice("l07-m02-q04", "Vælg korrekt hjælpeverbum: Hun ___ kommet hjem.", "er", ["har", "er", "bliver"], "Bevægelse med resultat bruger ofte er.", "Komme danner normalt perfektum med være: er kommet.", "She came home.", "perfektum", ["er kommet", "bevægelse"], 3),
          order("l07-m02-q05", "Byg: «We're not done yet».", "Vi er ikke færdige endnu.", ["ikke", "Vi", "endnu.", "færdige", "er"], "Den naturlige danske løsning bruger en tilstand.", "V2-hovedsætning: er før ikke; færdige får -e med vi.", "We're not done yet.", "resultat", ["ikke endnu", "kongruens"], 3),
          input("l07-m02-q06", "Udfyld: Jeg har boet her ___ 2024.", "siden", ["siden", "Siden"], "Startpunktet er et årstal.", "Siden bruges med et starttidspunkt; i bruges med varighed.", "I have lived here since 2024.", "tidsforløb", ["siden", "perfektum"], 2),
          choice("l07-m02-q07", "Hvad betyder “Jeg har lige spist” ?", "I just ate", ["I'm eating now", "I just ate", "I'll eat soon"], "Lige markerer noget helt nyligt.", "Har spist er perfektum, og lige betyder just.", "I just ate.", "perfektum", ["lige", "tid"]),
          ikkePosition("l07-m02-q08", "Byg en ledsætning om manglende erfaring.", "fordi jeg aldrig har været der", ["aldrig", "været", "fordi", "der", "jeg", "har"], "subordinate", "Aldrig står samme sted som ikke.", "I ledsætningen kommer sætningsadverbiet aldrig før hjælpeverbet har.", "because I have never been there", 3),
        ],
      },
      {
        id: "l07-m03", title: "Næste uge", subtitle: "Planer, intentioner og aftaler", icon: "🚀",
        estimatedMinutes: 3, xp: 230,
        questions: [
          choice("l07-m03-q01", "Vælg en fast plan: Vi ___ besøge Odense på lørdag.", "skal", ["har", "skal", "var"], "Skal kan udtrykke noget planlagt.", "Skal + infinitiv bruges om en aftale eller fast plan.", "On Saturday we will go to Odense.", "fremtid", ["skal", "plan"]),
          order("l07-m03-q02", "Byg: «I'm going to learn Danish every day».", "Jeg vil lære dansk hver dag.", ["lære", "hver", "Jeg", "dag.", "dansk", "vil"], "Vil + infinitiv udtrykker intention.", "Efter modalverbet vil står lære uden at.", "I'm going to learn Danish every day.", "intention", ["vil", "infinitiv"], 2),
          input("l07-m03-q03", "Udfyld: Hvad skal du lave ___ weekenden?", "i", ["i", "I"], "En periode bruger i.", "Det faste tidsudtryk er i weekenden.", "What will you do this weekend?", "planer", ["weekend", "præposition"]),
          choice("l07-m03-q04", "Hvad signalerer “måske” ?", "usikkerhed", ["sikker plan", "usikkerhed", "forbud"], "Det betyder Maybe.", "Måske viser, at noget er muligt, men ikke sikkert.", "Maybe", "modalitet", ["måske", "sandsynlighed"]),
          order("l07-m03-q05", "Byg med V2: «Tomorrow I'll call you».", "I morgen ringer jeg til dig.", ["ringer", "dig.", "I", "til", "jeg", "morgen"], "Dansk nutid kan udtrykke aftalt fremtid.", "Efter I morgen står ringer som andet led.", "I'll call you tomorrow.", "fremtid", ["V2", "nutid for fremtid"], 3),
          choice("l07-m03-q06", "Vælg korrekt forskel: “Jeg vil” udtrykker ofte ___; “jeg skal” ofte ___.", "ønske/intention; plan/pligt", ["fortid; nutid", "ønske/intention; plan/pligt", "sted; retning"], "Begge efterfølges af infinitiv.", "Vil handler ofte om vilje, mens skal peger på aftale, forventning eller nødvendighed.", "desire/intention; plan/obligation", "modalverber", ["vil", "skal"], 3),
          input("l07-m03-q07", "Skriv ét ord: Vi ses ___! (Tomorrow)", "i morgen", ["i morgen", "I morgen"], "To ord.", "I morgen er det almindelige fremtidige tidsudtryk.", "See you tomorrow!", "tidsudtryk", ["fremtid", "stavning"]),
          ikkePosition("l07-m03-q08", "Byg betingelsen korrekt.", "Hvis det ikke regner, cykler vi.", ["cykler", "regner,", "Hvis", "vi.", "det", "ikke"], "subordinate", "I hvis-ledsætningen står ikke før regner.", "Den efterfølgende hovedsætning har verbet først: cykler vi.", "If it doesn't rain, we will go on bicycles.", 3),
        ],
      },
    ],
  },
  {
    id: "level-08", eyebrow: "A2 · Niveau 8", title: "Din danske stemme",
    description: "Arbejd, studér, begrund meninger og saml alle mekanikker i en afsluttende mission.",
    color: "#C6538C", unlockXp: 3100,
    missions: [
      {
        id: "l08-m01", title: "Arbejde & studie", subtitle: "Opgaver, pauser og samarbejde", icon: "💼",
        estimatedMinutes: 3, xp: 240,
        questions: [
          choice("l08-m01-q01", "Hvad betyder “Jeg arbejder hjemmefra” ?", "I work from home", ["I'm leaving work", "I work from home", "I work without home"], "-fra viser udgangspunktet.", "Hjemmefra er ét adverbium, der betyder from home.", "I work from home.", "arbejdsliv", ["hjemmefra", "sted"]),
          order("l08-m01-q02", "Byg: «The meeting starts at half past nine».", "Mødet begynder halv ti.", ["halv", "Mødet", "ti.", "begynder"], "Halv ti er 9.30.", "På dansk kan klokkeslættet stå direkte uden præposition.", "The meeting starts at 9:30.", "arbejdsaftaler", ["klokkeslæt", "møde"], 2),
          input("l08-m01-q03", "Udfyld: Jeg er færdig ___ rapporten.", "med", ["med", "Med"], "Fast forbindelse: færdig med.", "At være færdig med noget betyder at have afsluttet det.", "I finished the report.", "arbejdsopgaver", ["fast præposition", "færdig"]),
          choice("l08-m01-q04", "Vælg den høflige anmodning til en kollega.", "Kan du sende filen, når du har tid?", ["Send filen nu!", "Kan du sende filen, når du har tid?", "Du sender måske aldrig filen."], "Kan du …? blødgør ønsket.", "Når du har tid respekterer modtagerens arbejdssituation.", "Can you send the file when you have time?", "samarbejde", ["høflighed", "kan"]),
          order("l08-m01-q05", "Byg med V2: «After lunch we have class».", "Efter frokost har vi undervisning.", ["vi", "Efter", "undervisning.", "har", "frokost"], "Det bøjede verbum skal være andet led.", "Efter frokost fylder første plads, derfor kommer har før vi.", "After lunch we have class.", "V2", ["studie", "tid først"], 3),
          input("l08-m01-q06", "Skriv flertal af “en kollega”.", "kolleger", ["kolleger", "kollegaer", "Kolleger", "Kollegaer"], "To former accepteres i moderne dansk.", "Både kolleger og kollegaer er korrekte flertalsformer.", "Colleagues", "flertal", ["arbejde", "variant"], 2),
          choice("l08-m01-q07", "Hvilket bindeord viser kontrast?", "selvom", ["fordi", "selvom", "så"], "Betydningen er Although.", "Selvom indleder noget, der står i kontrast til hovedsætningen.", "Although", "bindeord", ["selvom", "kontrast"]),
          ikkePosition("l08-m01-q08", "Byg ledsætningen efter “selvom”.", "selvom jeg ikke er helt færdig", ["helt", "færdig", "selvom", "er", "jeg", "ikke"], "subordinate", "Ikke kommer før er.", "Ledsætningsrækkefølgen er jeg + ikke + er; helt modificerer færdig.", "although I am not quite finished yet", 3),
        ],
      },
      {
        id: "l08-m02", title: "Jeg mener …", subtitle: "Meninger, grunde og nuancer", icon: "💬",
        estimatedMinutes: 4, xp: 250,
        questions: [
          order("l08-m02-q01", "Byg: «I think Danish is interesting».", "Jeg synes, at dansk er spændende.", ["spændende.", "at", "synes,", "dansk", "Jeg", "er"], "Synes bruges om en subjektiv vurdering.", "Efter synes kan en at-ledsætning forklare meningen.", "I think Danish is interesting.", "meninger", ["synes", "at-ledsætning"], 2),
          choice("l08-m02-q02", "Vælg det bedste svar: “Hvad synes du om byen?”", "Jeg synes, den er hyggelig.", ["Jeg synes, den er hyggelig.", "Jeg synes byen i går.", "Jeg synes ikke spørgsmål."], "Giv en personlig vurdering.", "Pronomenet den henviser til byen; hyggelig beskriver atmosfæren.", "I think the city is cozy.", "meninger", ["synes om", "adjektiv"]),
          input("l08-m02-q03", "Udfyld årsagen: Jeg lærer dansk, ___ jeg bor her.", "fordi", ["fordi", "Fordi"], "Anden del besvarer hvorfor.", "Fordi indleder en ledsætning med årsag.", "I am learning Danish because I live here.", "argumentation", ["fordi", "årsag"]),
          choice("l08-m02-q04", "Hvilken sætning betyder “I think, it's too expensive” ?", "Efter min mening er det for dyrt.", ["Efter min mening er det for dyrt.", "Før min mening har det dyrt.", "På mening bliver det dyrt."], "Start med den faste vending Efter min mening.", "Efter min mening fylder første plads; V2 giver er det.", "I think, it's too expensive.", "meninger", ["fast udtryk", "V2"], 3),
          ikkePosition("l08-m02-q05", "Byg en forsigtig uenighed.", "Jeg tror ikke, at det er en god idé.", ["en", "ikke,", "tror", "at", "idé.", "Jeg", "god", "det", "er"], "main", "Ikke hører til hovedsætningen efter tror.", "Jeg tror ikke … er blødere end en direkte afvisning.", "I do not think this is a good idea.", 3),
          agreement("l08-m02-q06", "Vælg: Det er et ___ argument.", "vigtigt", "vigtig", "t", ["vigtig", "vigtigt", "vigtige"], "Argument er et-ord.", "Ubestemt intetkøn kræver vigtig + t.", "This is an important argument.", 2),
          order("l08-m02-q07", "Byg: «On the one hand, it is convenient».", "På den ene side er det praktisk.", ["praktisk.", "ene", "er", "side", "det", "På", "den"], "Hele frasen før verbet er ét led.", "V2 placerer er før det efter På den ene side.", "On the one hand, it is convenient.", "nuancering", ["på den ene side", "V2"], 3),
          input("l08-m02-q08", "Skriv bindeordet: ___ er det dyrt, men kvaliteten er god. (admittedly)", "godt nok", ["godt nok", "Godt nok"], "Det er en indrømmelse før men.", "Godt nok … men … anerkender ét punkt og sætter et andet over for det.", "Admittedly, it is expensive, but the quality is good.", "nuancering", ["godt nok", "kontrast"], 3),
        ],
      },
      {
        id: "l08-m03", title: "Københavnerdagen", subtitle: "Finale: saml sprogbrikkerne", icon: "🏁",
        estimatedMinutes: 3, xp: 300,
        questions: [
          numberArcade("l08-m03-q01", 87, "syvogfirs", ["syvogfirs", "firsogsyv", "syvoghalvfems"], "7 + og + 80; firs er historisk 4 × 20", "Find firs og sæt syv foran med og.", "eighty-seven", 3),
          genderBet("l08-m03-q02", "museum", "et", "Mange internationale ord skal stadig læres med køn.", "Museum er intetkøn: et museum.", "museum", ["by", "kultur"], 2),
          definiteness("l08-m03-q03", "Vælg den fulde bestemte frase: «this famous museum».", "det berømte museum", { indefinite: "et museum", definite: "museet", modified: "det berømte museum" }, "modified", "Et-ord bruger det; adjektivet får -e.", "Bestemthed med adjektiv vises foran: det berømte museum.", "this famous museum", 3),
          agreement("l08-m03-q04", "Vælg: Museet har to ___ udstillinger.", "nye", "ny", "e", ["ny", "nyt", "nye"], "Flertal kræver e-form.", "Foran udstillinger i flertal står nye.", "The museum has two new exhibitions.", 2),
          order("l08-m03-q05", "Byg med korrekt V2: «After the museum we will go to the harbor».", "Efter museet tager vi ned til havnen.", ["til", "museet", "ned", "vi", "Efter", "havnen.", "tager"], "Tager skal være andet led.", "Efter museet + tager + vi følger V2; ned til angiver retning.", "After the museum we will go to the harbor.", "byplan", ["V2", "retning"], 3),
          ikkePosition("l08-m03-q06", "Byg årsagen med ledsætningsordstilling.", "fordi restauranten ikke har et ledigt bord", ["har", "restauranten", "ledigt", "fordi", "bord", "et", "ikke"], "subordinate", "Ikke står mellem subjektet og har.", "I fordi-ledsætningen er rækkefølgen restauranten + ikke + har.", "because there is no free table in the restaurant", 3),
          input("l08-m03-q07", "Afslut høfligt: Det har været en ___ dag. (wonderful)", "dejlig", ["dejlig", "Dejlig"], "Dag er et en-ord.", "Dejlig står i grundform efter en dag.", "It was a wonderful day.", "evaluering", ["adjektiv", "oplevelse"], 2),
          choice("l08-m03-q08", "Vælg den sammenhængende afslutning på historien.", "Selvom vi var trætte, gik vi glade hjem.", ["Selvom vi var trætte, gik vi glade hjem.", "Selvom var vi trætte, vi gik hjem glade.", "Vi selvom trætte ikke hjem."], "Selvom-leddet har subjekt før verbum; hovedsætningen får inversion.", "I ledsætningen: vi var. Efter kommaet: gik vi, fordi ledsætningen fylder første plads.", "Although we were tired, we went home happy.", "sammenhængende fortælling", ["selvom", "V2", "finale"], 3),
        ],
      },
    ],
  },
  {
    id: "level-09", eyebrow: "B1 · Niveau 9", title: "Mellem hverdag og nuance",
    description: "Håndtér indirekte spørgsmål, myndighedssprog og sammenhængende forklaringer i virkelige situationer.",
    color: "#3E9B8E", unlockXp: 4200,
    missions: [
      {
        id: "l09-m01", title: "Sig det uden at støde", subtitle: "Høflige spørgsmål, forbehold og reparation", icon: "message",
        estimatedMinutes: 5, xp: 320,
        questions: [
          choice("l09-m01-q01", "Vælg den mest høflige måde at bede en nabo skrue ned.", "Kunne du måske skrue lidt ned efter klokken ti?", ["Du larmer altid.", "Kunne du måske skrue lidt ned efter klokken ti?", "Stop musikken med det samme."], "Brug datid af kunne som høflig afstand.", "Kunne du måske …? gør anmodningen tydelig uden at gøre personen til problemet.", "Could you turn down the volume a little after ten?", "pragmatik", ["høflighed", "anmodning"], 2),
          order("l09-m01-q02", "Byg det indirekte spørgsmål.", "Ved du, hvornår bussen kommer?", ["bussen", "du,", "kommer?", "Ved", "hvornår"], "Efter hvornår er rækkefølgen subjekt + verbum.", "Et indirekte spørgsmål har ikke inversion i den indlejrede del: hvornår bussen kommer.", "Do you know when the bus will arrive?", "indirekte spørgsmål", ["hv-ord", "ordstilling"], 3),
          ikkePosition("l09-m01-q03", "Byg den høflige forklaring.", "Jeg ved ikke, om det passer dig.", ["om", "passer", "Jeg", "dig.", "ved", "det", "ikke,"], "main", "Ikke står efter ved i hovedsætningen.", "Jeg ved ikke er hovedsætningen; om det passer dig er et indirekte ja/nej-spørgsmål.", "I do not know whether that works for you.", 3),
          input("l09-m01-q04", "Udfyld: Jeg er ked ___, at jeg afbrød dig.", "af det", ["af det", "Af det"], "Fast udtryk før en at-sætning.", "At være ked af det betyder her at være sorry, ikke nødvendigvis trist.", "I am sorry that I interrupted you.", "reparation", ["fast udtryk", "undskyldning"], 2),
          choice("l09-m01-q05", "Hvilket svar viser uenighed uden at afvise personen?", "Jeg kan godt følge dig, men jeg ser risikoen anderledes.", ["Det giver ingen mening.", "Jeg kan godt følge dig, men jeg ser risikoen anderledes.", "Du tager helt fejl."], "Anerkend først det forståelige punkt.", "Formuleringen skelner mellem personens perspektiv og din vurdering af sagen.", "I understand your logic, but I see the risk differently.", "uenighed", ["nuance", "samtale"], 3),
          order("l09-m01-q06", "Byg en reparation efter en misforståelse.", "Det var ikke sådan, jeg mente det.", ["mente", "sådan,", "Det", "jeg", "ikke", "var", "det."], "Start med Det var ikke sådan.", "Udtrykket korrigerer fortolkningen uden at benægte, at ordene kunne misforstås.", "That's not what I meant.", "reparation", ["ikke", "sådan"], 2),
          input("l09-m01-q07", "Skriv bindeordet: Jeg siger det, ___ vi kan undgå samme fejl.", "så", ["så", "Så"], "Anden del udtrykker formålet/resultatet.", "Så kan forbinde handlingen med det ønskede resultat; så vi kan … er almindeligt talesprog.", "I say this, so that we can avoid the same mistake.", "sammenhæng", ["formål", "så"], 2),
          choice("l09-m01-q08", "Hvad antyder “Det er ikke helt optimalt” typisk?", "En forholdsvis tydelig negativ vurdering", ["Stor begejstring", "En forholdsvis tydelig negativ vurdering", "At alt er neutralt"], "Dansk kritik bliver ofte nedtonet sprogligt.", "Ikke helt optimalt lyder mildt, men bruges ofte som klar kritik i professionel sammenhæng.", "This is not entirely optimal - usually a pretty obvious criticism.", "underdrivelse", ["pragmatik", "arbejdssprog"], 3),
        ],
      },
      {
        id: "l09-m02", title: "Brevet fra kommunen", subtitle: "Frister, betingelser og præcise spørgsmål", icon: "book",
        estimatedMinutes: 5, xp: 340,
        questions: [
          choice("l09-m02-q01", "Hvad betyder “senest den 14. august” ?", "Ikke senere end den 14. august", ["Efter den 14. august", "Præcis klokken 14", "Ikke senere end den 14. august"], "Senest angiver den sidste accepterede tid.", "Datoen er inkluderet, medmindre brevet siger andet.", "No later than 14 August.", "myndighedssprog", ["frist", "senest"], 2),
          input("l09-m02-q02", "Udfyld: Du skal vedlægge dokumentation ___ din indkomst.", "for", ["for", "For"], "Man dokumenterer noget; navneordet tager ofte for.", "Den faste administrative forbindelse er dokumentation for noget.", "You must include proof of income.", "myndighedssprog", ["præposition", "dokumentation"], 2),
          order("l09-m02-q03", "Byg et præcist spørgsmål til sagsbehandleren.", "Kan du bekræfte, hvilke dokumenter der mangler?", ["der", "du", "dokumenter", "Kan", "bekræfte,", "mangler?", "hvilke"], "I en relativlignende hv-ledsætning står der før verbet.", "Hvilke dokumenter der mangler er et indirekte spørgsmål uden inversion.", "Can you confirm which documents are missing?", "indirekte spørgsmål", ["myndighed", "der"], 3),
          choice("l09-m02-q04", "Brevet siger: “Hvis vi ikke hører fra dig, træffer vi afgørelse på det foreliggende grundlag.” Hvad sker der?", "Sagen afgøres ud fra de oplysninger, kommunen allerede har", ["Sagen slettes automatisk", "Du vinder automatisk", "Sagen afgøres ud fra de oplysninger, kommunen allerede har"], "Foreliggende betyder allerede tilgængeligt.", "Myndigheden fortsætter uden de manglende oplysninger; det er derfor vigtigt at reagere.", "The decision will be made based on the data already available.", "læseforståelse", ["betingelse", "myndighed"], 3),
          ikkePosition("l09-m02-q05", "Byg betingelsen fra brevet.", "Hvis du ikke sender bilaget, kan sagen blive forsinket.", ["kan", "bilaget,", "Hvis", "blive", "sagen", "du", "forsinket.", "ikke", "sender"], "subordinate", "I hvis-leddet står ikke før sender.", "Efter den indledende ledsætning kommer inversion i hovedsætningen: kan sagen.", "If you do not submit the application, the matter may be delayed.", 3),
          definiteness("l09-m02-q06", "Vælg den administrative bestemte frase: «required document».", "det nødvendige dokument", { indefinite: "et dokument", definite: "dokumentet", modified: "det nødvendige dokument" }, "modified", "Dokument er et-ord.", "Foran et bestemt et-ord står det, og adjektivet får -e.", "required document", 3),
          input("l09-m02-q07", "Skriv ét ord: Du kan søge om ___, hvis fristen er umulig at nå.", "udsættelse", ["udsættelse", "Udsættelse"], "Det betyder mere tid før fristen.", "At søge om udsættelse er at bede om, at fristen flyttes.", "You can ask for a deferment.", "myndighedssprog", ["frist", "navneord"], 3),
          choice("l09-m02-q08", "Hvilken afslutning passer til en formel mail?", "På forhånd tak for hjælpen.", ["Skynd dig lige.", "På forhånd tak for hjælpen.", "Nå, men vi ses."], "Tak for den hjælp, du forventer.", "På forhånd tak er en neutral, formel afslutning på en konkret anmodning.", "Thanks in advance for your help.", "register", ["formel mail", "høflighed"], 2),
        ],
      },
      {
        id: "l09-m03", title: "Hvad skete der egentlig?", subtitle: "Fortæl sammenhængende og markér kilden", icon: "compass",
        estimatedMinutes: 5, xp: 360,
        questions: [
          choice("l09-m03-q01", "Hvilket ord viser, at du ikke selv så hændelsen?", "angiveligt", ["pludselig", "angiveligt", "heldigvis"], "Det betyder ifølge det, man siger.", "Angiveligt markerer, at oplysningen kommer fra en anden kilde og ikke er bekræftet af taleren.", "supposedly/reportedly", "kildemarkering", ["evidentialitet", "adverbium"], 3),
          order("l09-m03-q02", "Byg en neutral kildemarkering.", "Ifølge vidnet kørte bilen for hurtigt.", ["bilen", "Ifølge", "for", "vidnet", "hurtigt.", "kørte"], "Kildeleddet står først, så kommer verbet.", "Ifølge vidnet fylder første plads; V2 giver kørte bilen.", "According to the witness, the car was driving too fast.", "kildemarkering", ["ifølge", "V2"], 3),
          input("l09-m03-q03", "Udfyld rækkefølgen: Først ringede jeg. ___ ventede jeg udenfor.", "Derefter", ["derefter", "Derefter"], "Et tidsadverbium, der betyder bagefter.", "Derefter binder hændelserne sammen og udløser inversion: ventede jeg.", "Then I waited outside.", "fortællestruktur", ["rækkefølge", "V2"], 2),
          choice("l09-m03-q04", "Hvilken sætning skelner tydeligt mellem observation og gæt?", "Jeg så røg, men jeg ved ikke, hvor den kom fra.", ["Der var helt sikkert brand.", "Jeg så røg, men jeg ved ikke, hvor den kom fra.", "Alt var nok farligt."], "Fortæl først det sansede, derefter grænsen.", "Sætningen hævder kun den direkte observation og markerer det ukendte eksplicit.", "I saw smoke, but I do not know where it came from.", "præcision", ["observation", "usikkerhed"], 3),
          ikkePosition("l09-m03-q05", "Byg ledsætningen med korrekt placering.", "selvom politiet endnu ikke har bekræftet årsagen", ["årsagen", "endnu", "politiet", "har", "selvom", "bekræftet", "ikke"], "subordinate", "Sætningsadverbierne kommer før har.", "I ledsætningen står subjekt + endnu ikke + hjælpeverbum.", "although the police have not yet confirmed the reason", 3),
          order("l09-m03-q06", "Byg en sammenhængende kontrast.", "På den ene side var vejen glat, men på den anden side kørte han for stærkt.", ["stærkt.", "ene", "kørte", "På", "men", "han", "glat,", "den", "på", "side", "den", "for", "side", "anden", "var", "vejen"], "Brug de to faste side-udtryk.", "Konstruktionen vejer to forklaringer mod hinanden uden at gøre dem ens.", "On the one hand, the road was slippery, but on the other hand, he was driving too fast.", "nuancering", ["kontrast", "argumentation"], 3),
          input("l09-m03-q07", "Skriv participiet: Hændelsen er blevet ___ af flere aviser. (omtale)", "omtalt", ["omtalt", "Omtalt"], "Blive + kort tillægsform danner passiv.", "Er blevet omtalt er perfektum passiv: hændelsen har fået omtale.", "The event was covered by several newspapers.", "passiv", ["blive-passiv", "medier"], 3),
          choice("l09-m03-q08", "Vælg den bedste opsummering, når årsagen stadig undersøges.", "Forløbet er kendt, men årsagen er endnu uafklaret.", ["Ingen ved noget som helst.", "Årsagen er helt sikkert teknisk.", "Forløbet er kendt, men årsagen er endnu uafklaret."], "Adskil det kendte fra det ukendte.", "Uafklaret beskriver præcist en konklusion, der endnu ikke kan drages.", "The course of events is known, but the reason has not yet been established.", "opsummering", ["usikkerhed", "medier"], 3),
        ],
      },
    ],
  },
  {
    id: "level-10", eyebrow: "B2 · Niveau 10", title: "Præcision under pres",
    description: "Argumentér, forhandl og læs mellem linjerne med den præcision, som komplekse danske samtaler kræver.",
    color: "#4E73C7", unlockXp: 5400,
    missions: [
      {
        id: "l10-m01", title: "Det står ikke helt sådan", subtitle: "Forbehold, modalitet og skjulte antagelser", icon: "layers",
        estimatedMinutes: 6, xp: 390,
        questions: [
          choice("l10-m01-q01", "Hvilken formulering udtrykker den stærkeste sikkerhed?", "Tallene dokumenterer, at udgiften er faldet.", ["Tallene kunne tyde på et fald.", "Tallene dokumenterer, at udgiften er faldet.", "Det lader til, at udgiften måske er faldet."], "Dokumenterer hævder direkte bevis.", "Kun dokumenterer præsenterer sammenhængen som bevist; kunne tyde på og lader til er forbehold.", "The numbers confirm the cost reduction.", "modalitet", ["sikkerhed", "kilder"], 3),
          order("l10-m01-q02", "Byg et præcist forbehold.", "Resultatet gælder kun, for så vidt som stikprøven er repræsentativ.", ["repræsentativ.", "vidt", "kun,", "Resultatet", "stikprøven", "gælder", "som", "er", "for", "så"], "Brug den faste forbindelse for så vidt som.", "For så vidt som afgrænser påstandens gyldighed til en bestemt betingelse.", "The result applies only insofar as the sample is representative.", "akademisk dansk", ["forbehold", "betingelse"], 3),
          input("l10-m01-q03", "Udfyld: Det kan ikke udelukkes, ___ ændringen skyldes sæsonen.", "at", ["at", "At"], "En hel påstand følger efter udtrykket.", "Det kan ikke udelukkes, at … er en formel måde at markere en reel mulighed uden at hævde den.", "It cannot be ruled out that the change is seasonal.", "modalitet", ["formelt register", "usikkerhed"], 3),
          choice("l10-m01-q04", "Hvilken skjult antagelse ligger i “Selv eksperterne tog fejl” ?", "Man forventede især, at eksperterne havde ret", ["Ingen forventede noget af eksperterne", "Man forventede især, at eksperterne havde ret", "Kun eksperter kan tage fejl"], "Selv markerer et uventet medlem af gruppen.", "Fokuspartiklen selv bygger på forventningen om, at eksperter er mindre tilbøjelige til at tage fejl.", "Even the experts were wrong — they were especially expected to be right.", "pragmatik", ["presupposition", "selv"], 3),
          ikkePosition("l10-m01-q05", "Byg den komplekse indrømmelse.", "Selvom metoden ikke nødvendigvis er forkert, er datagrundlaget for smalt.", ["for", "metoden", "forkert,", "Selvom", "smalt.", "nødvendigvis", "er", "datagrundlaget", "ikke", "er"], "subordinate", "I selvom-leddet kommer ikke nødvendigvis før er.", "Indrømmelsen kritiserer ikke metoden direkte; hovedpåstanden rammer datagrundlaget.", "Although the method is not necessarily wrong, the data basis is too narrow.", 3),
          choice("l10-m01-q06", "Hvad gør ordet “tilsyneladende” i en rapport?", "Det markerer, at noget ser sådan ud, men ikke er endeligt bevist", ["Det gør påstanden juridisk sikker", "Det markerer, at noget ser sådan ud, men ikke er endeligt bevist", "Det gør påstanden ironisk"], "Tænk på det, der er synligt på overfladen.", "Tilsyneladende er en evidensmarkør, der reserverer mulighed for en anden forklaring.", "Apparently - this is what it looks like, but not conclusively proven.", "kildemarkering", ["adverbium", "forbehold"], 3),
          input("l10-m01-q07", "Skriv substantivet: Der er ikke belæg ___ den konklusion.", "for", ["for", "For"], "Fast forbindelse i argumentation.", "Belæg for betyder evidens, der kan bære en bestemt påstand.", "There is no basis for such a conclusion.", "argumentation", ["belæg", "præposition"], 3),
          order("l10-m01-q08", "Byg konklusionen uden at overdrive.", "Dataene peger i samme retning, men de fastslår ikke årsagen.", ["de", "retning,", "Dataene", "årsagen.", "ikke", "men", "fastslår", "peger", "samme", "i"], "Kontrastér mønster med årsag.", "At data peger i en retning er svagere end at fastslå en årsag; forskellen beskytter mod overfortolkning.", "The data point in the same direction, but they do not establish the cause.", "konklusion", ["årsag", "evidens"], 3),
        ],
      },
      {
        id: "l10-m02", title: "Forhandlingsrummet", subtitle: "Interesser, betingelser og brugbare kompromiser", icon: "target",
        estimatedMinutes: 6, xp: 410,
        questions: [
          choice("l10-m02-q01", "Hvilket svar undersøger interessen bag et krav?", "Hvad er det vigtigste, den tidligere deadline skal løse?", ["Det går vi aldrig med til.", "Hvad er det vigtigste, den tidligere deadline skal løse?", "Kan vi ikke bare mødes på midten?"], "Spørg efter problemet, ikke kun positionen.", "Spørgsmålet kan afsløre en anden løsning end blot at acceptere eller afvise datoen.", "What is the main problem that the earlier date should solve?", "forhandling", ["interesser", "åbent spørgsmål"], 3),
          order("l10-m02-q02", "Byg et betinget tilbud.", "Hvis I kan garantere volumen, kan vi reducere prisen med otte procent.", ["otte", "prisen", "Hvis", "reducere", "kan", "I", "kan", "med", "procent.", "garantere", "vi", "volumen,"], "Betingelsen står først; hovedsætningen får inversion.", "Tilbuddet kobler indrømmelsen til en konkret modydelse og gør aftalen målbar.", "If you guarantee the volume, we will reduce the price by eight percent.", "forhandling", ["betingelse", "V2"], 3),
          input("l10-m02-q03", "Udfyld: Det forslag imødekommer vores behov ___ sikkerhed.", "for", ["for", "For"], "Behov tager ofte for foran det ønskede.", "Et behov for noget er den normale substantivforbindelse.", "This proposal meets our need for reliability.", "forhandling", ["fast præposition", "behov"], 2),
          choice("l10-m02-q04", "Hvilken formulering afviser et forslag, men holder forhandlingen åben?", "Den model kan vi ikke godkende som den står, men vi kan arbejde videre med risikodelingen.", ["Aldrig i livet.", "Den model kan vi ikke godkende som den står, men vi kan arbejde videre med risikodelingen.", "Det lyder fint nok."], "Afvis den konkrete model, og navngiv et arbejdsområde.", "Som den står begrænser afvisningen; anden del viser en specifik vej frem.", "We cannot approve the model as it stands, but we can keep working on risk sharing.", "forhandling", ["afvisning", "kompromis"], 3),
          ikkePosition("l10-m02-q05", "Byg reservationen korrekt.", "Vi accepterer tilbuddet, hvis leveringen ikke bliver forsinket igen.", ["igen.", "accepterer", "ikke", "Vi", "leveringen", "tilbuddet,", "bliver", "hvis", "forsinket"], "subordinate", "I hvis-leddet står ikke før bliver.", "Betingelsen er en ledsætning og følger subjekt + ikke + finit verbum.", "We accept the offer if the delivery is not delayed again.", 3),
          choice("l10-m02-q06", "Hvad betyder “Det er et udgangspunkt, ikke et ultimatum” ?", "Forslaget kan stadig forhandles", ["Forslaget er allerede endeligt", "Forslaget kan stadig forhandles", "Forslaget trækkes tilbage"], "Et udgangspunkt er stedet, man starter.", "Kontrasten sænker presset og inviterer til modforslag.", "This is the starting point, not an ultimatum.", "forhandling", ["pragmatik", "rammesætning"], 2),
          order("l10-m02-q07", "Byg en fair opsummering af uenigheden.", "Vi er enige om målet, men uenige om, hvem der bærer risikoen.", ["om,", "men", "risikoen.", "målet,", "uenige", "der", "Vi", "hvem", "er", "om", "bærer", "enige"], "Skeln mellem fælles mål og uafklaret ansvar.", "En præcis opsummering gør konflikten mindre personlig og viser, hvad der faktisk skal løses.", "We agree on the goal, but disagree about who bears the risk.", "opsummering", ["uenighed", "relativsætning"], 3),
          input("l10-m02-q08", "Skriv ordet: Aftalen træder i kraft under ___ af bestyrelsens godkendelse.", "forudsætning", ["forudsætning", "Forudsætning"], "Det betyder på betingelse af.", "Under forudsætning af gør godkendelsen til en nødvendig betingelse for aftalens virkning.", "The agreement is subject to board approval.", "formelt register", ["betingelse", "aftale"], 3),
        ],
      },
      {
        id: "l10-m03", title: "Den svære beslutning", subtitle: "B2-finale: analyse, position og konsekvens", icon: "sparkles",
        estimatedMinutes: 6, xp: 450,
        questions: [
          choice("l10-m03-q01", "En kommune vil lukke et bibliotek med få daglige besøgende. Hvilket argument er mest analytisk?", "Besøgstallet er relevant, men bør vejes mod adgang, alternativer og bibliotekets sociale funktion.", ["Få gæster betyder altid, at stedet er værdiløst.", "Biblioteker må aldrig ændres.", "Besøgstallet er relevant, men bør vejes mod adgang, alternativer og bibliotekets sociale funktion."], "Inddrag både mål og konsekvenser.", "Svaret accepterer dataens relevans uden at gøre én måling til hele beslutningen.", "Attendance is important, but it should be weighed against availability, alternatives and social role.", "argumentation", ["afvejning", "samfund"], 3),
          order("l10-m03-q02", "Byg en kausal reservation.", "At to ændringer sker samtidig, betyder ikke nødvendigvis, at den ene skyldes den anden.", ["at", "skyldes", "sker", "den", "nødvendigvis,", "betyder", "ændringer", "anden.", "ikke", "samtidig,", "At", "to", "ene", "den"], "Samtidighed er ikke automatisk årsag.", "Sætningen skelner korrelation fra kausalitet med nødvendigvis som styrkemarkør.", "Two changes happening at the same time does not necessarily mean that one caused the other.", "kritisk tænkning", ["kausalitet", "korrelation"], 3),
          input("l10-m03-q03", "Udfyld: Fordelene skal ses i ___ af de langsigtede omkostninger.", "lyset", ["lyset", "Lyset"], "Fast metafor: i ___ af.", "At se noget i lyset af betyder at vurdere det med en bestemt kontekst som baggrund.", "Benefits must be considered in light of long-term costs.", "argumentation", ["fast udtryk", "afvejning"], 3),
          choice("l10-m03-q04", "Hvilken sætning gengiver en modparts synspunkt fair?", "Kritikerne frygter især, at besparelsen flytter udgiften til andre tilbud.", ["Kritikerne hader tydeligvis forandring.", "Kritikerne frygter især, at besparelsen flytter udgiften til andre tilbud.", "Kritikerne forstår ikke økonomi."], "Gengiv deres stærkeste konkrete bekymring.", "Sætningen beskriver et efterprøvbart konsekvensargument uden at tillægge modparten dårlige motiver.", "Critics are primarily concerned about shifting costs to other services.", "argumentation", ["steelman", "modargument"], 3),
          ikkePosition("l10-m03-q05", "Byg indrømmelsen med korrekt ordstilling.", "Selv hvis besparelsen ikke er stor, kan signalværdien være betydelig.", ["stor,", "Selv", "signalværdien", "betydelig.", "besparelsen", "ikke", "kan", "hvis", "være", "er"], "subordinate", "I selv hvis-leddet står ikke før er.", "Indrømmelsen accepterer en lille direkte effekt, mens hovedsætningen peger på en anden type effekt.", "Even if the savings are small, the symbolic meaning can be significant.", 3),
          choice("l10-m03-q06", "Hvad er forskellen på “effektiv” og “effektfuld” i en beslutning?", "Effektiv handler om ressourcebrug; effektfuld om stærk virkning", ["De betyder altid præcis det samme", "Effektiv handler om ressourcebrug; effektfuld om stærk virkning", "Effektiv er negativ; effektfuld er positiv"], "Det ene måler middel, det andet virkning.", "En løsning kan være billig og effektiv uden at have stor effekt — eller omvendt.", "Efficient concerns resource use; impactful concerns the strength of the effect.", "ordforråd", ["præcision", "falske venner"], 3),
          order("l10-m03-q07", "Byg den endelige anbefaling.", "Jeg anbefaler en prøveperiode, fordi den gør beslutningen reversibel og skaber bedre data.", ["den", "prøveperiode,", "bedre", "fordi", "en", "anbefaler", "data.", "reversibel", "Jeg", "beslutningen", "gør", "og", "skaber"], "Giv både handling og begrundelse.", "En prøveperiode reducerer usikkerhed, fordi den kan rulles tilbage og samtidig producerer ny evidens.", "I recommend a trial period: the decision can be reversed and better data collected.", "anbefaling", ["beslutning", "begrundelse"], 3),
          input("l10-m03-q08", "Afslut B2-rejsen: En ansvarlig konklusion er tydelig om både sit svar og sin ___.", "usikkerhed", ["usikkerhed", "Usikkerhed"], "Det modsatte af falsk sikkerhed.", "På B2 er præcision ikke kun at vide mere, men også at markere grænsen for det, man ved.", "The responsible conclusion is clear in the answer, and in its uncertainty.", "metakognition", ["B2", "usikkerhed"], 3),
        ],
      },
    ],
  },
];
