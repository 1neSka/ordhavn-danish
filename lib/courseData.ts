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
          choice("l01-m01-q01", "Vælg den almindelige danske hilsen.", "Hej!", ["Hej!", "Tak!", "Farvel!"], "Den virker både formelt og uformelt.", "Hej er den neutrale hilsen på dansk.", "Привет!", "hilsner", ["begynder", "hilsen"]),
          choice("l01-m01-q02", "Hvad svarer du på “Tak” ?", "Selv tak", ["Godnat", "Selv tak", "Undskyld"], "Du giver høfligheden tilbage.", "Selv tak betyder omtrent 'не за что'.", "Не за что", "høflighed", ["fast udtryk"]),
          order("l01-m01-q03", "Byg: «Меня зовут Лена».", "Jeg hedder Lena.", ["Lena.", "hedder", "Jeg"], "Start med personen.", "På dansk siger man bogstaveligt: Jeg hedder …", "Меня зовут Лена.", "præsentation", ["ordstilling", "jeg"]),
          input("l01-m01-q04", "Skriv det manglende ord: God ___! (утро)", "morgen", ["morgen", "Morgen"], "Det er dagens første del.", "Godmorgen kan skrives samlet; efter God står morgen.", "Доброе утро!", "hilsner", ["tid på dagen"]),
          choice("l01-m01-q05", "Vælg den bedste oversættelse af “Vi ses”.", "Увидимся", ["Увидимся", "Мы сидим", "Добро пожаловать"], "Det bruges som et uformelt farvel.", "Vi ses betyder, at man forventer at mødes igen.", "Vi ses — увидимся", "afsked", ["fast udtryk"]),
          order("l01-m01-q06", "Byg en høflig undskyldning.", "Undskyld, jeg er ny.", ["ny.", "Undskyld,", "er", "jeg"], "Efter kommaet kommer grundleddet før verbet.", "Jeg er er den simple rækkefølge subjekt + verbum.", "Извините, я новичок.", "basisordstilling", ["undskyld", "er"]),
          input("l01-m01-q07", "Skriv «спасибо» på dansk.", "tak", ["tak", "Tak"], "Tre bogstaver.", "Tak er både neutralt og meget almindeligt.", "Спасибо", "høflighed", ["basisord"]),
          choice("l01-m01-q08", "Hvornår siger man “Godnat” ?", "Når man går i seng", ["Når man går i seng", "Når man spiser frokost", "Når man mødes om morgenen"], "Tænk på nattens afslutning.", "Godnat bruges ved sengetid, ikke som almindelig aftenhilsen.", "Когда ложатся спать", "hilsner", ["kultur", "nat"]),
        ],
      },
      {
        id: "l01-m02", title: "Jeg og du", subtitle: "Personer og verbet at være", icon: "🙂",
        estimatedMinutes: 4, xp: 90,
        questions: [
          choice("l01-m02-q01", "Vælg pronomenet for «я».", "jeg", ["jeg", "du", "vi"], "Det skrives med j.", "Jeg er første person ental.", "я", "personlige pronomener", ["jeg", "ental"]),
          input("l01-m02-q02", "Udfyld: Du ___ sød.", "er", ["er", "Er"], "Samme form bruges efter jeg, du og vi.", "Nutidsformen er ændrer sig ikke efter person.", "Ты милый/милая.", "verbet være", ["er", "nutid"]),
          order("l01-m02-q03", "Byg spørgsmålet: «Ты датчанин?»", "Er du dansker?", ["dansker?", "du", "Er"], "Ja/nej-spørgsmål starter med verbet.", "I et spørgsmål står er før du.", "Ты датчанин?", "spørgsmål", ["inversion", "er"]),
          choice("l01-m02-q04", "Hvem er “hun” ?", "она", ["он", "она", "они"], "Bruges om én kvinde eller pige.", "Hun er tredje person ental, feminin.", "она", "personlige pronomener", ["hun", "ental"]),
          order("l01-m02-q05", "Byg: «Мы из России».", "Vi er fra Rusland.", ["Rusland.", "fra", "Vi", "er"], "Subjekt + er + fra + land.", "Fra markerer oprindelse.", "Мы из России.", "oprindelse", ["vi", "fra"]),
          input("l01-m02-q06", "Skriv pronomenet: Peter er træt. ___ er træt.", "Han", ["han", "Han"], "Peter er én mand.", "Han erstatter et maskulint personnavn.", "Петер устал. Он устал.", "personlige pronomener", ["han"]),
          choice("l01-m02-q07", "Vælg korrekt sætning.", "De er her.", ["De er her.", "De her er.", "Er de her."], "I et udsagn står subjektet typisk først.", "De + er + her følger neutral dansk ordstilling.", "Они здесь.", "basisordstilling", ["de", "er"]),
          input("l01-m02-q08", "Oversæt ét ord: «вы» (flertal/høfligt).", "I", ["I", "i"], "Som pronomen skrives det med stort bogstav.", "I med stort er pronomenet; i med lille er præpositionen 'в'.", "вы", "personlige pronomener", ["I", "stavning"], 2),
        ],
      },
      {
        id: "l01-m03", title: "Små ting", subtitle: "En, et og de første navneord", icon: "🧩",
        estimatedMinutes: 3, xp: 100,
        questions: [
          genderBet("l01-m03-q01", "bog", "en", "Tænk på udtrykket “en god bog”.", "Bog er fælleskøn: en bog.", "книга", ["ting"]),
          genderBet("l01-m03-q02", "hus", "et", "Et meget almindeligt intetkønsord.", "Hus er intetkøn: et hus.", "дом", ["bolig"]),
          choice("l01-m03-q03", "Vælg korrekt: ___ æble.", "et æble", ["en æble", "et æble", "æble en"], "Æble er intetkøn.", "Den ubestemte artikel står foran navneordet.", "яблоко", "navneordets køn", ["et", "mad"]),
          order("l01-m03-q04", "Byg: «Это книга».", "Det er en bog.", ["bog.", "Det", "en", "er"], "Start med Det er.", "Det er bruges til at identificere noget.", "Это книга.", "præsentation af ting", ["det er", "en"]),
          input("l01-m03-q05", "Udfyld artiklen: ___ kaffe.", "en", ["en", "En"], "Kaffe er fælleskøn.", "Man siger en kaffe, især om en kop/portion.", "кофе", "navneordets køn", ["en", "mad"]),
          genderBet("l01-m03-q06", "barn", "et", "Ordet betegner et menneske, men grammatikken er intetkøn.", "Barn hedder et barn i ental.", "ребёнок", ["person"]),
          choice("l01-m03-q07", "Hvilken artikel passer til “cykel” ?", "en", ["en", "et"], "Husk frasen en ny cykel.", "Cykel er fælleskøn: en cykel.", "велосипед", "navneordets køn", ["transport"]),
          order("l01-m03-q08", "Byg: «У меня есть яблоко».", "Jeg har et æble.", ["et", "Jeg", "æble.", "har"], "Jeg + har + ting.", "Har betyder 'имею/есть'; æble kræver et.", "У меня есть яблоко.", "verbet have", ["har", "et"]),
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
          numberArcade("l02-m01-q01", 12, "tolv", ["tyve", "tolv", "to"], "et selvstændigt grundtal", "Det ligner engelsk twelve en smule.", "двенадцать", 1),
          numberArcade("l02-m01-q02", 21, "enogtyve", ["enogtyve", "tyveogen", "enogtredive"], "en + og + tyve", "Enerne kommer før tierne.", "двадцать один", 1),
          numberArcade("l02-m01-q03", 40, "fyrre", ["fjorten", "fyrre", "fireti"], "et uregelmæssigt årti", "Lær fyrre som én blok.", "сорок", 2),
          numberArcade("l02-m01-q04", 50, "halvtreds", ["halvtreds", "femti", "tres"], "historisk 2½ × 20", "Det moderne ord læres bedst som en fast form.", "пятьдесят", 2),
          numberArcade("l02-m01-q05", 75, "femoghalvfjerds", ["femoghalvfjerds", "halvfjerdsogfem", "femogtres"], "5 + og + 70; halvfjerds bygger historisk på 3½ × 20", "Sig først eneren, så årtiet.", "семьдесят пять", 3),
          input("l02-m01-q06", "Skriv 30 med bogstaver.", "tredive", ["tredive", "Tredive"], "Det begynder med tre-.", "30 hedder tredive, ikke treti.", "тридцать", "danske tal", ["tal", "årtier"], 2),
          choice("l02-m01-q07", "Hvilket tal er “otteogtres” ?", "68", ["58", "68", "78"], "otte + og + tres.", "På dansk kommer 8 før 60 i ordet.", "шестьдесят восемь", "danske tal", ["talforståelse", "vigesimal"], 2),
          order("l02-m01-q08", "Byg: «У меня две сестры».", "Jeg har to søstre.", ["søstre.", "to", "har", "Jeg"], "Tal står før navneordet.", "Søster har den uregelmæssige flertalsform søstre.", "У меня две сестры.", "tal i sætninger", ["to", "flertal"], 2),
        ],
      },
      {
        id: "l02-m02", title: "Hvad er klokken?", subtitle: "Timer, halve timer og aftaler", icon: "🕒",
        estimatedMinutes: 4, xp: 120,
        questions: [
          choice("l02-m02-q01", "Hvad betyder “Klokken er tre” ?", "Сейчас три часа", ["Сейчас три часа", "Через три часа", "Три часа назад"], "Er beskriver tidspunktet nu.", "Klokken er … bruges til at fortælle tiden.", "Сейчас три часа.", "klokkeslæt", ["tid", "klokken"]),
          choice("l02-m02-q02", "“Halv otte” er …", "07.30", ["08.30", "07.30", "07.08"], "Dansk tæller frem mod den næste hele time.", "Halv otte betyder halvvejs til otte, altså 7.30.", "половина восьмого", "klokkeslæt", ["halv", "kultur"], 2),
          order("l02-m02-q03", "Byg spørgsmålet: «Который час?»", "Hvad er klokken?", ["klokken?", "Hvad", "er"], "Spørgeordet kommer først.", "Den faste vending er Hvad er klokken?", "Который час?", "spørgsmål om tid", ["spørgeord"]),
          input("l02-m02-q04", "Udfyld: Vi mødes ___ klokken ni.", "klokken", ["klokken", "Klokken"], "Ingen præposition er nødvendig her.", "På dansk kan man sige mødes klokken ni direkte.", "Мы встречаемся в девять.", "aftaler", ["tidspunkt"]),
          choice("l02-m02-q05", "Vælg 14.15 på almindeligt dansk.", "kvart over to", ["kvart i to", "kvart over to", "halv tre"], "15 minutter efter to.", "Kvart over to er 2.15; sammenhængen afgør 14.15.", "четверть третьего / 14:15", "klokkeslæt", ["kvart", "over"], 2),
          order("l02-m02-q06", "Byg: «Урок начинается в десять».", "Timen starter klokken ti.", ["ti.", "starter", "Timen", "klokken"], "Subjekt + verbum + tidspunkt.", "Starter er nutid af at starte.", "Урок начинается в десять.", "aftaler", ["V2", "tid"]),
          input("l02-m02-q07", "Skriv det manglende ord: kvart ___ fem = 16.45.", "i", ["i", "I"], "Man bevæger sig mod fem.", "Kvart i fem er et kvarter før fem.", "без четверти пять", "klokkeslæt", ["kvart", "i"], 2),
          choice("l02-m02-q08", "Hvilket spørgsmål passer til svaret “Klokken otte” ?", "Hvornår åbner caféen?", ["Hvor er caféen?", "Hvornår åbner caféen?", "Hvem åbner caféen?"], "Svaret er et tidspunkt.", "Hvornår spørger til tid.", "Когда открывается кафе?", "spørgeord", ["hvornår", "aftale"]),
        ],
      },
      {
        id: "l02-m03", title: "Ugen rundt", subtitle: "Dage, datoer og fødselsdag", icon: "📅",
        estimatedMinutes: 3, xp: 120,
        questions: [
          choice("l02-m03-q01", "Hvilken dag kommer efter mandag?", "tirsdag", ["søndag", "tirsdag", "torsdag"], "Ugens anden arbejdsdag.", "Rækken er mandag, tirsdag, onsdag …", "вторник", "ugedage", ["kalender"]),
          input("l02-m03-q02", "Skriv dagen før fredag.", "torsdag", ["torsdag", "Torsdag"], "Den begynder med tors-.", "Torsdag ligger mellem onsdag og fredag.", "четверг", "ugedage", ["kalender"]),
          order("l02-m03-q03", "Byg: «Сегодня среда».", "Det er onsdag i dag.", ["i", "onsdag", "er", "dag.", "Det"], "Den faste slutning er i dag.", "Dansk bruger ofte Det er … i dag.", "Сегодня среда.", "ugedage", ["det er", "i dag"]),
          choice("l02-m03-q04", "Hvad betyder “i weekenden” ?", "на выходных", ["в будни", "на выходных", "через неделю"], "Weekend er lørdag og søndag.", "Præpositionen i bruges om perioden: i weekenden.", "на выходных", "tidsudtryk", ["weekend", "præposition"]),
          input("l02-m03-q05", "Udfyld: Min fødselsdag er ___ maj.", "i", ["i", "I"], "Måneder bruger denne præposition.", "Man siger i maj, men den 4. maj om en bestemt dato.", "Мой день рождения в мае.", "måneder", ["præposition", "dato"]),
          order("l02-m03-q06", "Byg: «Мне двадцать лет».", "Jeg er tyve år.", ["år.", "tyve", "Jeg", "er"], "Dansk bruger er om alder.", "Alder udtrykkes med være: Jeg er tyve år.", "Мне двадцать лет.", "alder", ["er", "tal"]),
          choice("l02-m03-q07", "Vælg den korrekte dato: “den tredje april”.", "3. april", ["13. april", "30. april", "3. april"], "Tredje er ordenstallet 3.", "Datoer bruger ordenstal: den tredje.", "третье апреля", "datoer", ["ordenstal"]),
          input("l02-m03-q08", "Skriv «сегодня» på dansk.", "i dag", ["i dag", "I dag", "idag"], "Det er to ord.", "I dag skrives som to ord på moderne dansk.", "сегодня", "tidsudtryk", ["stavning", "dag"]),
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
          choice("l03-m01-q01", "Hvad siger du for at bestille høfligt?", "Jeg vil gerne have en kaffe.", ["Jeg har en kaffe.", "Jeg vil gerne have en kaffe.", "Jeg bliver en kaffe."], "Brug vil gerne have.", "Vil gerne have er den almindelige, høflige bestillingsform.", "Я бы хотел(а) кофе.", "bestilling", ["café", "vil gerne"]),
          order("l03-m01-q02", "Byg: «Можно мне меню?»", "Må jeg få menuen?", ["få", "jeg", "menuen?", "Må"], "Et høfligt spørgsmål starter med Må.", "Må jeg få … er en fast og naturlig forespørgsel.", "Можно мне меню?", "høflige spørgsmål", ["må", "café"], 2),
          input("l03-m01-q03", "Udfyld: En kop kaffe, ___ tak.", "tak", ["tak", "Tak"], "Det lille ord gør bestillingen venlig.", "Tak kan afslutte en bestilling på dansk.", "Чашку кофе, пожалуйста.", "høflighed", ["café", "tak"]),
          choice("l03-m01-q04", "Hvad er “regningen” ?", "счёт", ["меню", "счёт", "чаевые"], "Det er det, du betaler til sidst.", "En regning viser, hvor meget du skal betale.", "счёт", "caféord", ["betaling"]),
          order("l03-m01-q05", "Byg spørgsmålet: «Что вы рекомендуете?»", "Hvad anbefaler du?", ["du?", "Hvad", "anbefaler"], "Spørgeord + verbum + subjekt.", "Dansk V2 placerer anbefaler foran du efter spørgeordet.", "Что вы рекомендуете?", "spørgsmål", ["V2", "restaurant"], 2),
          input("l03-m01-q06", "Skriv det danske ord for «вода».", "vand", ["vand", "Vand"], "Det er et intetkønsord.", "Vand hedder et vand, når man mener en portion/flaske.", "вода", "mad og drikke", ["drikke"]),
          choice("l03-m01-q07", "Vælg korrekt svar på “Er der mælk i?”", "Nej, den er uden mælk.", ["Nej, den er uden mælk.", "Nej, den er under mælk.", "Nej, den er mellem mælk."], "Uden er det modsatte af med.", "Uden mælk betyder, at retten eller drikken ikke indeholder mælk.", "Нет, это без молока.", "ingredienser", ["med-uden", "allergi"], 2),
          order("l03-m01-q08", "Byg: «Это всё, спасибо».", "Det var det, tak.", ["det,", "Det", "tak.", "var"], "En fast vending ved kassen.", "Det var det betyder, at bestillingen er færdig.", "Это всё, спасибо.", "bestilling", ["fast udtryk", "betaling"]),
        ],
      },
      {
        id: "l03-m02", title: "Indkøbskurven", subtitle: "Varer, mængder og en/et", icon: "🛒",
        estimatedMinutes: 4, xp: 140,
        questions: [
          genderBet("l03-m02-q01", "tomat", "en", "De fleste konkrete madord her er fælleskøn.", "Tomat er fælleskøn: en tomat.", "помидор", ["mad"]),
          genderBet("l03-m02-q02", "brød", "et", "Husk udtrykket et rugbrød.", "Brød er intetkøn: et brød.", "хлеб", ["mad"]),
          genderBet("l03-m02-q03", "mælk", "en", "Drikken har fælleskøn.", "Mælk er grammatisk fælleskøn: en mælk, når den tælles som vare.", "молоко", ["drikke"], 2),
          choice("l03-m02-q04", "Vælg den naturlige mængde: ___ ost.", "et stykke", ["et stykke", "en flaske", "en liter"], "Ost kan skæres af.", "Et stykke ost er en almindelig mængdeangivelse.", "кусок сыра", "mængder", ["mad", "stykke"]),
          order("l03-m02-q05", "Byg: «Мне нужен килограмм яблок».", "Jeg skal bruge et kilo æbler.", ["et", "skal", "æbler.", "bruge", "Jeg", "kilo"], "Jeg skal bruge = мне нужно.", "Efter et kilo står æble i flertal: æbler.", "Мне нужен килограмм яблок.", "indkøb", ["mængde", "flertal"], 2),
          input("l03-m02-q06", "Udfyld: Hvor ___ koster den?", "meget", ["meget", "Meget"], "Pris spørger til en mængde penge.", "Hvor meget koster …? er det normale prisspørgsmål.", "Сколько это стоит?", "priser", ["spørgeord", "butik"]),
          numberArcade("l03-m02-q07", 59, "nioghalvtreds", ["nioghalvtreds", "halvtredsogni", "niogtres"], "9 + og + 50; halvtreds er historisk 2½ × 20", "Enerne står først i sammensatte tal.", "пятьдесят девять крон", 3),
          choice("l03-m02-q08", "Hvad betyder “på tilbud” ?", "со скидкой / по акции", ["распродано", "со скидкой / по акции", "слишком дорого"], "Prisen er midlertidigt lavere.", "En vare på tilbud sælges til en særlig pris.", "по акции", "butik", ["pris", "tilbud"]),
        ],
      },
      {
        id: "l03-m03", title: "Den bestemte hylde", subtitle: "En vare bliver til varen", icon: "🏷️",
        estimatedMinutes: 3, xp: 150,
        questions: [
          definiteness("l03-m03-q01", "Vælg formen for «яблоко» som en bestemt ting.", "æblet", { indefinite: "et æble", definite: "æblet", modified: "det røde æble" }, "definite", "Et-ord får normalt -et.", "Et æble bliver til æblet, når artiklen sættes bagpå.", "яблоко / это яблоко", 1),
          definiteness("l03-m03-q02", "Vælg: «эта свежая рыба».", "den friske fisk", { indefinite: "en fisk", definite: "fisken", modified: "den friske fisk" }, "modified", "Med adjektiv står den foran.", "Ved bestemt form med adjektiv bruges den + adjektiv på -e + ubøjet navneord.", "эта свежая рыба", 2),
          definiteness("l03-m03-q03", "Gør “en pose” bestemt.", "posen", { indefinite: "en pose", definite: "posen", modified: "den store pose" }, "definite", "En-ord får normalt -en.", "En pose bliver til posen.", "пакет → этот пакет", 1),
          choice("l03-m03-q04", "Vælg korrekt: Jeg køber ___ brød på hylden.", "det billige", ["den billig", "det billige", "billigt det"], "Brød er et-ord, og bestemt adjektiv ender på -e.", "Foran et bestemt et-ord med adjektiv bruger man det + billige.", "Я покупаю тот дешёвый хлеб на полке.", "bestemt adjektiv", ["det", "-e"], 2),
          order("l03-m03-q05", "Byg: «Молоко стоит в холодильнике».", "Mælken står i køleskabet.", ["i", "står", "Mælken", "køleskabet."], "Begge kendte ting står i bestemt form.", "Mælk → mælken; køleskab → køleskabet.", "Молоко стоит в холодильнике.", "bestemthed i kontekst", ["-en", "-et"], 2),
          input("l03-m03-q06", "Gør “en banan” bestemt: ___.", "bananen", ["bananen", "Bananen"], "Tilføj -en.", "Banan ender på konsonant og får bestemthedsendelsen -en.", "банан → этот банан", "bestemthed", ["en-ord"]),
          definiteness("l03-m03-q07", "Vælg den ubestemte form.", "et æg", { indefinite: "et æg", definite: "ægget", modified: "det kogte æg" }, "indefinite", "Der nævnes ét nyt æg.", "Den ubestemte artikel et står foran æg.", "одно яйцо", 1),
          agreement("l03-m03-q08", "Vælg: et ___ måltid.", "godt", "god", "t", ["god", "godt", "gode"], "Et-ord kræver ofte -t.", "God bøjes til godt foran et ubestemt intetkønsord.", "хорошая еда / хорошее блюдо", 2),
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
          choice("l04-m01-q01", "Hvem er “min mors søn”, hvis det ikke er mig?", "min bror", ["min far", "min bror", "min onkel"], "I har samme mor.", "Bror betyder брат.", "мой брат", "familie", ["relationer"]),
          input("l04-m01-q02", "Skriv «моя сестра» på dansk.", "min søster", ["min søster", "Min søster"], "Søster er et en-ord.", "Min bruges foran fælleskønsord; søster er fælleskøn.", "моя сестра", "possessiver", ["min", "familie"]),
          order("l04-m01-q03", "Byg: «Наши родители живут в Орхусе».", "Vores forældre bor i Aarhus.", ["i", "forældre", "Vores", "Aarhus.", "bor"], "Vores ændrer ikke form.", "Bor betyder живут/проживают; danske byer bruger i.", "Наши родители живут в Орхусе.", "familie", ["vores", "bor"], 2),
          choice("l04-m01-q04", "Vælg korrekt: Det er ___ barn.", "mit", ["min", "mit", "mine"], "Barn er et-ord.", "Mit bruges foran et intetkønsord i ental.", "Это мой ребёнок.", "possessiver", ["mit", "et-ord"]),
          order("l04-m01-q05", "Byg spørgsmålet: «У тебя есть дети?»", "Har du børn?", ["børn?", "Har", "du"], "Ja/nej-spørgsmål starter med verbet.", "Barn har uregelmæssigt flertal: børn.", "У тебя есть дети?", "familiespørgsmål", ["har", "flertal"]),
          input("l04-m01-q06", "Udfyld: Anna besøger ___ bedstemor. (свою)", "sin", ["sin", "Sin"], "Ejeren er sætningens subjekt Anna.", "Sin viser tilbage til subjektet i tredje person: Annas egen bedstemor.", "Анна навещает свою бабушку.", "refleksive possessiver", ["sin", "familie"], 3),
          choice("l04-m01-q07", "Hvad betyder “gift” i sætningen “De er gift” ?", "женаты", ["яд", "женаты", "разведены"], "Konteksten handler om to mennesker.", "Som adjektiv betyder gift 'женат/замужем'.", "Они женаты.", "civilstand", ["familie", "homonym"]),
          order("l04-m01-q08", "Byg: «Её муж зовут Миккель».", "Hendes mand hedder Mikkel.", ["hedder", "Hendes", "Mikkel.", "mand"], "Hendes står foran den ejede person.", "Hendes betyder hendes egen eller en anden kvindes 'её'.", "Её мужа зовут Миккель.", "possessiver", ["hendes", "hedder"], 2),
        ],
      },
      {
        id: "l04-m02", title: "Rundt i boligen", subtitle: "Rum, møbler og placering", icon: "🏠",
        estimatedMinutes: 4, xp: 160,
        questions: [
          genderBet("l04-m02-q01", "værelse", "et", "Endelsen -else fortæller ikke kønnet sikkert.", "Værelse er intetkøn: et værelse.", "комната", ["bolig"], 2),
          genderBet("l04-m02-q02", "stol", "en", "Husk en stol ved bordet.", "Stol er fælleskøn: en stol.", "стул", ["møbler"]),
          definiteness("l04-m02-q03", "Vælg: «большое окно» som bestemt frase.", "det store vindue", { indefinite: "et vindue", definite: "vinduet", modified: "det store vindue" }, "modified", "Vindue er et-ord.", "Bestemt et-ord med adjektiv: det + store + vindue.", "это большое окно", 2),
          order("l04-m02-q04", "Byg: «Ключ лежит на столе».", "Nøglen ligger på bordet.", ["bordet.", "ligger", "på", "Nøglen"], "På bruges om en overflade.", "Kendte genstande står naturligt bestemt: nøglen, bordet.", "Ключ лежит на столе.", "placering", ["på", "bestemthed"], 2),
          input("l04-m02-q05", "Udfyld: Lampen hænger ___ bordet. (над)", "over", ["over", "Over"], "Den er højere end bordet.", "Over beskriver en placering højere end noget andet.", "Лампа висит над столом.", "præpositioner", ["over", "placering"]),
          choice("l04-m02-q06", "Hvor står sofaen, hvis den er “mellem døren og vinduet” ?", "между дверью и окном", ["перед дверью", "между дверью и окном", "за окном"], "Mellem forbinder to grænser med og.", "Mellem X og Y betyder между X и Y.", "между дверью и окном", "præpositioner", ["mellem", "og"]),
          definiteness("l04-m02-q07", "Gør “en lejlighed” bestemt.", "lejligheden", { indefinite: "en lejlighed", definite: "lejligheden", modified: "den lyse lejlighed" }, "definite", "Føj -en til ordet.", "Lejlighed + en = lejligheden.", "квартира → эта квартира", 2),
          order("l04-m02-q08", "Byg: «В ванной нет окна».", "Der er ikke et vindue på badeværelset.", ["på", "ikke", "Der", "vindue", "badeværelset.", "et", "er"], "Der er ikke + navneord.", "Eksistenskonstruktionen er der er; ikke følger efter det finite verbum.", "В ванной нет окна.", "der er", ["ikke", "bolig"], 3),
        ],
      },
      {
        id: "l04-m03", title: "Farver på væggene", subtitle: "God, godt, gode — få endelserne til at passe", icon: "🎨",
        estimatedMinutes: 3, xp: 170,
        questions: [
          agreement("l04-m03-q01", "Vælg: en ___ sofa.", "grøn", "grøn", "base", ["grøn", "grønt", "grønne"], "En-ord i ubestemt ental bruger grundformen.", "Sofa er fælleskøn, derfor en grøn sofa.", "зелёный диван", 1),
          agreement("l04-m03-q02", "Vælg: et ___ køkken.", "lyst", "lys", "t", ["lys", "lyst", "lyse"], "Et-ord giver ofte -t.", "Køkken er intetkøn: et lyst køkken.", "светлая кухня", 2),
          agreement("l04-m03-q03", "Vælg: to ___ stole.", "røde", "rød", "e", ["rød", "rødt", "røde"], "Flertal bruger -e.", "Adjektivet står i e-form foran navneord i flertal.", "два красных стула", 2),
          order("l04-m03-q04", "Byg: «Это новый маленький дом».", "Det er et nyt lille hus.", ["lille", "Det", "nyt", "hus.", "et", "er"], "Begge adjektiver beskriver et hus.", "Ny får -t: nyt. Lille har samme form her.", "Это новый маленький дом.", "adjektiver", ["et-ord", "ordstilling"], 2),
          choice("l04-m03-q05", "Vælg korrekt bestemt frase.", "den gamle stol", ["den gammel stol", "den gamle stol", "det gamle stol"], "Stol er en-ord; bestemt adjektiv får -e.", "Den gamle stol har både foranstillet artikel og e-form.", "этот старый стул", "bestemt adjektiv", ["den", "-e"]),
          input("l04-m03-q06", "Udfyld: Værelserne er ___. (маленькие)", "små", ["små", "Små"], "Lille har en uregelmæssig flertalsform.", "Lille bliver til små i flertal og bestemt form.", "Комнаты маленькие.", "adjektiver", ["uregelmæssig", "flertal"], 2),
          definiteness("l04-m03-q07", "Vælg frasen med både bestemthed og adjektiv.", "det hyggelige hjem", { indefinite: "et hjem", definite: "hjemmet", modified: "det hyggelige hjem" }, "modified", "Brug det og -e.", "Når et bestemt et-ord har adjektiv: det hyggelige hjem.", "этот уютный дом", 2),
          agreement("l04-m03-q08", "Vælg: Min seng er ___.", "blød", "blød", "base", ["blød", "blødt", "bløde"], "Seng er fælleskøn og står i ental.", "Efter er bøjes adjektivet stadig efter seng: blød.", "Моя кровать мягкая.", 2),
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
          order("l05-m01-q01", "Byg: «Я встаю в семь».", "Jeg står op klokken syv.", ["syv.", "står", "Jeg", "klokken", "op"], "Står op er et løst sammensat verbum.", "I hovedsætningen står op efter subjektet, mens tidsleddet kommer sidst.", "Я встаю в семь.", "daglige rutiner", ["stå op", "nutid"], 2),
          choice("l05-m01-q02", "Vælg den rigtige nutidsform: Hun ___ morgenmad.", "spiser", ["spise", "spiser", "spiste"], "Nutid ender ofte på -r.", "At spise bliver til spiser i nutid.", "Она завтракает.", "nutid", ["rutine", "-r"]),
          input("l05-m01-q03", "Udfyld: Jeg børster ___ tænder.", "mine", ["mine", "Mine"], "Tænder står i flertal.", "Mine bruges foran flere ejede ting.", "Я чищу зубы.", "possessiver", ["rutine", "flertal"]),
          order("l05-m01-q04", "Byg: «Он едет на работу на велосипеде».", "Han cykler på arbejde.", ["arbejde.", "Han", "på", "cykler"], "Cykler indeholder allerede transportmåden.", "På arbejde er den faste vending for destinationen arbejdet.", "Он едет на работу на велосипеде.", "transport", ["cykle", "på arbejde"], 2),
          choice("l05-m01-q05", "Hvad betyder “jeg har fri” ?", "я свободен / у меня выходной", ["я опаздываю", "я свободен / у меня выходной", "я работаю дома"], "Fri betyder uden arbejde eller undervisning.", "At have fri betyder at have fritid fra arbejde eller skole.", "У меня выходной.", "fritid", ["fast udtryk"]),
          input("l05-m01-q06", "Skriv nutid af “at læse”.", "læser", ["læser", "Læser"], "Fjern at og tilføj -r.", "Læse ender allerede på -e, så nutiden er læser.", "читать → читает/читаю", "nutid", ["verber", "-r"]),
          choice("l05-m01-q07", "Vælg den naturlige sætning.", "Jeg går i seng ved elleve-tiden.", ["Jeg går på seng ved elleve.", "Jeg går i seng ved elleve-tiden.", "Jeg går i sengen på elleve."], "Udtrykket er gå i seng.", "Ved elleve-tiden betyder omtrent klokken elleve.", "Я ложусь спать около одиннадцати.", "aftenrutine", ["gå i seng", "cirkatid"], 2),
          order("l05-m01-q08", "Byg: «После ужина я читаю».", "Efter aftensmaden læser jeg.", ["jeg.", "Efter", "læser", "aftensmaden"], "Når tidsleddet står først, kommer verbet som nummer to.", "V2-reglen giver Efter aftensmaden + læser + jeg.", "После ужина я читаю.", "V2", ["tidsled først", "inversion"], 3),
        ],
      },
      {
        id: "l05-m02", title: "Ikke-maskinen", subtitle: "Nægtelse i hoved- og ledsætninger", icon: "⚙️",
        estimatedMinutes: 4, xp: 190,
        questions: [
          ikkePosition("l05-m02-q01", "Placér “ikke” i hovedsætningen.", "Jeg drikker ikke kaffe.", ["kaffe.", "ikke", "drikker", "Jeg"], "main", "I en hovedsætning står ikke efter det bøjede verbum.", "Rækkefølgen er subjekt + finit verbum + ikke.", "Я не пью кофе.", 2),
          ikkePosition("l05-m02-q02", "Byg med tid først og korrekt V2.", "I dag arbejder jeg ikke hjemme.", ["arbejder", "hjemme.", "I", "ikke", "jeg", "dag"], "main", "Efter I dag skal det bøjede verbum komme.", "V2: I dag + arbejder + jeg + ikke + hjemme.", "Сегодня я не работаю дома.", 3),
          ikkePosition("l05-m02-q03", "Byg ledsætningen efter “fordi”.", "fordi jeg ikke har tid", ["har", "fordi", "tid", "jeg", "ikke"], "subordinate", "I ledsætningen kommer ikke før det bøjede verbum.", "Efter fordi er rækkefølgen subjekt + ikke + finit verbum.", "потому что у меня нет времени", 3),
          choice("l05-m02-q04", "Hvilken sætning har korrekt dansk ordstilling?", "Hun siger, at hun ikke er træt.", ["Hun siger, at hun er ikke træt.", "Hun siger, at hun ikke er træt.", "Hun siger, ikke at hun er træt."], "Efter at begynder en ledsætning.", "I at-ledsætningen står ikke før er.", "Она говорит, что не устала.", "ledsætningsordstilling", ["at", "ikke"], 3),
          ikkePosition("l05-m02-q05", "Placér “ikke” i et ja/nej-udsagn.", "Vi tager ikke bussen.", ["bussen.", "tager", "ikke", "Vi"], "main", "Ikke følger efter tager.", "Hovedsætningen bruger Vi + tager + ikke.", "Мы не едем на автобусе.", 2),
          order("l05-m02-q06", "Byg: «Если я не опаздываю…»", "Hvis jeg ikke kommer for sent …", ["for", "ikke", "Hvis", "sent", "kommer", "jeg", "…"], "Hvis indleder en ledsætning.", "I hvis-ledsætningen står ikke før kommer; komme for sent er et fast udtryk.", "Если я не опоздаю…", "ledsætning", ["hvis", "ikke"], 3),
          ikkePosition("l05-m02-q07", "Byg med et frontet tidsled.", "Om søndagen står hun ikke tidligt op.", ["står", "ikke", "hun", "op.", "Om", "søndagen", "tidligt"], "main", "Står skal være sætningens andet led.", "V2 efter Om søndagen; ikke står efter subjektet, og op til sidst.", "По воскресеньям она не встаёт рано.", 3),
          input("l05-m02-q08", "Hvilket ord mangler? Jeg ved, at han ___ bor her.", "ikke", ["ikke", "Ikke"], "At gør resten til en ledsætning.", "I ledsætninger kommer sætningsadverbiet ikke før det finite verbum bor.", "Я знаю, что он здесь не живёт.", "ledsætningsordstilling", ["ikke", "at"], 3),
        ],
      },
      {
        id: "l05-m03", title: "Gennem byen", subtitle: "Transport og vejvisning", icon: "🚲",
        estimatedMinutes: 3, xp: 180,
        questions: [
          choice("l05-m03-q01", "Hvad spørger du, når du leder efter stationen?", "Hvor ligger stationen?", ["Hvornår er stationen?", "Hvor ligger stationen?", "Hvem ligger stationen?"], "Steder bruger hvor.", "Ligge bruges naturligt om en bygnings placering.", "Где находится вокзал?", "vejvisning", ["hvor", "station"]),
          order("l05-m03-q02", "Byg: «Идите прямо и поверните налево».", "Gå ligeud og drej til venstre.", ["drej", "venstre.", "Gå", "ligeud", "til", "og"], "To bydeformer forbindes med og.", "Gå og drej er imperativer uden subjekt.", "Идите прямо и поверните налево.", "vejvisning", ["imperativ", "retning"], 2),
          input("l05-m03-q03", "Udfyld: Bussen kører ___ centrum.", "til", ["til", "Til"], "Der er bevægelse mod et mål.", "Til markerer destination.", "Автобус едет в центр.", "præpositioner", ["til", "transport"]),
          choice("l05-m03-q04", "Hvad betyder “stå af” ?", "выйти из транспорта", ["ждать транспорт", "выйти из транспорта", "пересесть"], "Det modsatte er stå på.", "Man står af bussen eller toget ved sit stoppested.", "выйти (из автобуса/поезда)", "transportverber", ["stå af", "løst verbum"]),
          order("l05-m03-q05", "Byg: «Сделайте пересадку на метро на Нёррепорте».", "Skift til metroen på Nørreport.", ["til", "Skift", "Nørreport.", "metroen", "på"], "Skift til + transportmiddel.", "Skifte til betyder at change transport; på bruges ved stationen.", "Пересядьте на метро на Нёррепорте.", "transport", ["skifte", "metro"], 3),
          input("l05-m03-q06", "Skriv bydeformen af “at vente”.", "vent", ["vent", "Vent"], "Fjern -e.", "Imperativ af vente er vent.", "ждать → подождите", "imperativ", ["vejvisning", "verbum"]),
          choice("l05-m03-q07", "Vælg korrekt: Cykelstien er ___ vejen.", "langs", ["gennem", "langs", "uden"], "Den følger vejens retning.", "Langs betyder вдоль.", "Велодорожка идёт вдоль дороги.", "præpositioner", ["langs", "by"]),
          order("l05-m03-q08", "Byg: «Сколько будет остановок?»", "Hvor mange stop er der?", ["stop", "der?", "Hvor", "er", "mange"], "Mange bruges med ting, der kan tælles.", "Eksistensspørgsmålet følger Hvor mange stop + er der.", "Сколько будет остановок?", "transportspørgsmål", ["hvor mange", "der er"], 2),
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
          choice("l06-m01-q01", "Hvad betyder “Det regner” ?", "Идёт дождь", ["Дует ветер", "Идёт дождь", "Идёт снег"], "Regn falder som vand.", "Upersonlige vejrsætninger bruger det.", "Идёт дождь.", "vejret", ["det", "regn"]),
          input("l06-m01-q02", "Udfyld: Der er femten ___ i dag.", "grader", ["grader", "Grader"], "Temperaturen tælles i flertal.", "Efter et tal over én bruges grader.", "Сегодня пятнадцать градусов.", "temperatur", ["tal", "vejr"]),
          order("l06-m01-q03", "Byg: «Завтра будет солнечно».", "I morgen bliver det solrigt.", ["det", "I", "solrigt.", "bliver", "morgen"], "Tidsleddet står først, så verbet er nummer to.", "Bliver beskriver en ændring/fremtidig tilstand; V2 giver bliver det.", "Завтра будет солнечно.", "vejrudsigt", ["V2", "blive"], 2),
          agreement("l06-m01-q04", "Vælg: Vejret er ___.", "koldt", "kold", "t", ["kold", "koldt", "kolde"], "Vejr er intetkøn.", "Prædikativt adjektiv følger kønnet: et vejr → koldt.", "Погода холодная.", 2),
          choice("l06-m01-q05", "Hvad tager du med, hvis “det klarer op, men det kan regne” ?", "en paraply", ["en paraply", "sandaler", "solbriller alene"], "Der er stadig mulighed for regn.", "Kan regne udtrykker mulighed, så paraplyen er den sikre løsning.", "зонт", "vejret", ["kan", "pragmatik"]),
          order("l06-m01-q06", "Byg: «Надень тёплую куртку».", "Tag en varm jakke på.", ["jakke", "Tag", "på.", "varm", "en"], "Tag … på er delt omkring objektet.", "I imperativ placeres tøjet mellem tag og på.", "Надень тёплую куртку.", "tøj", ["tage på", "imperativ"], 2),
          input("l06-m01-q07", "Skriv det modsatte af “varm”.", "kold", ["kold", "Kold"], "Tænk på vinter.", "Varm og kold er antonymer.", "холодный", "adjektiver", ["vejr", "antonym"]),
          choice("l06-m01-q08", "Vælg korrekt ledsætning.", "fordi det ikke blæser", ["fordi det blæser ikke", "fordi det ikke blæser", "fordi ikke det blæser"], "Efter fordi står ikke før verbet.", "Ledsætningsrækkefølgen er subjekt + ikke + blæser.", "потому что ветра нет", "ledsætningsordstilling", ["fordi", "ikke"], 3),
        ],
      },
      {
        id: "l06-m02", title: "Hos lægen", subtitle: "Kroppen, symptomer og råd", icon: "🩺",
        estimatedMinutes: 4, xp: 210,
        questions: [
          choice("l06-m02-q01", "Hvordan siger man naturligt “У меня болит голова” ?", "Jeg har ondt i hovedet.", ["Jeg er ondt på hovedet.", "Jeg har ondt i hovedet.", "Mit hoved gør ond."], "Brug have ondt i.", "Dansk udtrykker smerte med har ondt i + bestemt kropsdel.", "У меня болит голова.", "symptomer", ["have ondt", "krop"], 2),
          order("l06-m02-q02", "Byg lægens spørgsmål: «Как давно у вас температура?»", "Hvor længe har du haft feber?", ["haft", "Hvor", "feber?", "du", "længe", "har"], "Hvor længe + har + subjekt + perfektum.", "Har haft beskriver en tilstand, der begyndte tidligere og fortsætter.", "Как давно у вас температура?", "lægesamtale", ["perfektum", "spørgsmål"], 3),
          input("l06-m02-q03", "Udfyld: Du skal ___ meget vand.", "drikke", ["drikke", "Drikke"], "Efter skal bruges infinitiv uden at.", "Modalverbet skal efterfølges af grundformen drikke.", "Вам нужно пить много воды.", "modalverber", ["skal", "råd"]),
          choice("l06-m02-q04", "Hvad er “en recept” ?", "рецепт на лекарство", ["приём у врача", "рецепт на лекарство", "медицинская страховка"], "Den bruges på apoteket.", "Lægen udsteder en recept på medicin.", "рецепт", "sundhed", ["apotek", "læge"]),
          order("l06-m02-q05", "Byg: «Я кашляю и у меня насморк».", "Jeg hoster og er forkølet.", ["er", "Jeg", "hoster", "forkølet.", "og"], "Forkølet bruges med er.", "Hoster er et symptom; er forkølet beskriver tilstanden.", "Я кашляю и простужен(а).", "symptomer", ["hoste", "forkølelse"], 2),
          input("l06-m02-q06", "Skriv kropsdelen: Jeg har ondt i ___. (спине)", "ryggen", ["ryggen", "Ryggen", "min ryg"], "Brug bestemt form efter ondt i.", "Ryg → ryggen; dansk siger normalt i ryggen.", "У меня болит спина.", "kroppen", ["bestemthed", "smerte"], 2),
          choice("l06-m02-q07", "Vælg det mildeste og mest passende råd ved forkølelse.", "Du bør hvile dig.", ["Du bør hvile dig.", "Du må aldrig sove.", "Du skal løbe et maraton."], "Bør udtrykker en anbefaling.", "At hvile sig er et refleksivt verbum; rådet er pragmatisk naturligt.", "Вам стоит отдохнуть.", "råd", ["bør", "refleksiv"]),
          ikkePosition("l06-m02-q08", "Byg lægens ledsætning efter “hvis”.", "hvis du ikke får det bedre", ["bedre", "du", "får", "hvis", "det", "ikke"], "subordinate", "Ikke står før får i hvis-ledsætningen.", "Få det bedre betyder at recover; ordstillingen er du ikke får.", "если вам не станет лучше", 3),
        ],
      },
      {
        id: "l06-m03", title: "Små problemer", subtitle: "Byt varer, bed om hjælp og forklar", icon: "🧰",
        estimatedMinutes: 3, xp: 210,
        questions: [
          order("l06-m03-q01", "Byg: «Я хотел(а) бы вернуть это».", "Jeg vil gerne returnere den.", ["gerne", "den.", "Jeg", "returnere", "vil"], "Efter vil står infinitiven uden at.", "Den henviser til en fælleskønsgenstand, som begge kender.", "Я хотел(а) бы это вернуть.", "retur i butik", ["vil gerne", "pronomen"], 2),
          choice("l06-m03-q02", "Hvad spørger ekspedienten med “Har du kvitteringen?”", "Есть ли у вас чек?", ["Есть ли у вас чек?", "Есть ли у вас карта?", "Нужен ли вам пакет?"], "Kvitteringen dokumenterer købet.", "Kvittering betyder чек/квитанция.", "Есть ли у вас чек?", "butik", ["retur", "kvittering"]),
          input("l06-m03-q03", "Udfyld: Den er for ___. (слишком маленькая)", "lille", ["lille", "Lille"], "For + adjektiv betyder чрезмерно.", "For lille betyder mindre end ønsket.", "Она слишком маленькая.", "problembeskrivelse", ["for", "adjektiv"]),
          order("l06-m03-q04", "Byg: «Можно обменять на другой размер?»", "Kan jeg bytte den til en anden størrelse?", ["anden", "den", "jeg", "en", "Kan", "størrelse?", "bytte", "til"], "Spørgsmålet starter med Kan jeg.", "Bytte X til Y er den naturlige konstruktion ved størrelsesskift.", "Можно обменять её на другой размер?", "butik", ["kan", "bytte"], 3),
          choice("l06-m03-q05", "Vælg korrekt: Jeg købte den ___, men den virker ikke.", "i går", ["på går", "i går", "om går"], "Udtrykket skrives som to ord.", "I går placerer købet i fortiden.", "Я купил(а) это вчера, но оно не работает.", "tidsudtryk", ["fortid", "i går"]),
          input("l06-m03-q06", "Skriv det manglende verbum: Kan du ___ mig?", "hjælpe", ["hjælpe", "Hjælpe"], "Efter kan kommer infinitiv.", "Kan + hjælpe uden at; hjælpe tager direkte objekt mig.", "Можете мне помочь?", "hjælp", ["modalverbum", "butik"]),
          ikkePosition("l06-m03-q07", "Forklar problemet med korrekt “ikke”.", "Skærmen virker ikke.", ["ikke.", "Skærmen", "virker"], "main", "Ikke følger det bøjede verbum virker.", "I en kort hovedsætning står ikke efter verbet.", "Экран не работает.", 2),
          choice("l06-m03-q08", "Hvilken afslutning er høflig efter hjælp?", "Tak for hjælpen.", ["Tak for hjælpen.", "Tak til hjælpen.", "Tak ved hjælpen."], "Den faste præposition er for.", "Tak for + bestemt navneord bruges om noget, man har modtaget.", "Спасибо за помощь.", "høflighed", ["tak for", "fast udtryk"]),
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
          choice("l07-m01-q01", "Vælg datid af “at arbejde”.", "arbejdede", ["arbejder", "arbejdede", "har arbejde"], "Regelmæssige svage verber får ofte -ede.", "Arbejde bliver arbejdede i datid.", "работал/работала", "datid", ["regelmæssigt verbum"]),
          input("l07-m01-q02", "Skriv datid af “at spise”.", "spiste", ["spiste", "Spiste"], "Verbet mister sin infinitivendelse.", "Spise har den korte datidsform spiste.", "ел/ела", "datid", ["uregelmæssigt verbum"]),
          order("l07-m01-q03", "Byg: «Вчера мы смотрели хороший фильм».", "I går så vi en god film.", ["god", "vi", "film.", "I", "en", "så", "går"], "Tidsled først udløser V2.", "Datid af se er så; efter I går står så før vi.", "Вчера мы смотрели хороший фильм.", "fortælling", ["datid", "V2"], 3),
          choice("l07-m01-q04", "Hvad er datid af “at gå” ?", "gik", ["gåede", "gik", "gået"], "Det er en kort uregelmæssig form.", "Gik er præteritum; gået er perfektum participium.", "шёл/шла", "datid", ["uregelmæssigt verbum"]),
          order("l07-m01-q05", "Byg: «Потом она позвонила маме».", "Så ringede hun til sin mor.", ["hun", "sin", "Så", "til", "mor.", "ringede"], "Så først giver inversion.", "V2: Så + ringede + hun. Sin viser tilbage til hun.", "Потом она позвонила своей маме.", "fortælling", ["V2", "sin", "datid"], 3),
          input("l07-m01-q06", "Udfyld datid: De ___ hjemme hele aftenen. (были)", "var", ["var", "Var"], "Datid af er.", "Være bøjes uregelmæssigt: er → var.", "Они были дома весь вечер.", "datid", ["være", "uregelmæssig"]),
          choice("l07-m01-q07", "Vælg det rigtige bindeord: Jeg blev hjemme, ___ jeg var syg.", "fordi", ["men", "fordi", "eller"], "Den anden del giver årsagen.", "Fordi indleder en årsagsledsætning.", "Я остался дома, потому что был болен.", "bindeord", ["fordi", "årsag"]),
          ikkePosition("l07-m01-q08", "Byg fortidssætningen med korrekt “ikke”.", "I går nåede jeg ikke toget.", ["ikke", "nåede", "toget.", "I", "jeg", "går"], "main", "Efter I går står nåede som andet led.", "V2 giver nåede jeg; ikke følger subjektet i denne frontede hovedsætning.", "Вчера я не успел(а) на поезд.", 3),
        ],
      },
      {
        id: "l07-m02", title: "Har du prøvet?", subtitle: "Perfektum og livserfaring", icon: "🧳",
        estimatedMinutes: 4, xp: 230,
        questions: [
          choice("l07-m02-q01", "Vælg perfektum: Jeg ___ København mange gange.", "har besøgt", ["er besøgt", "har besøgt", "har besøge"], "Brug har + kort tillægsform.", "Transitivt besøge danner perfektum med har besøgt.", "Я много раз посещал(а) Копенгаген.", "perfektum", ["har", "oplevelse"], 2),
          order("l07-m02-q02", "Byg spørgsmålet: «Ты когда-нибудь пробовал смёрребрёд?»", "Har du nogensinde prøvet smørrebrød?", ["smørrebrød?", "du", "prøvet", "nogensinde", "Har"], "Har står først i ja/nej-spørgsmålet.", "Nogensinde betyder ever; prøvet er participium af prøve.", "Ты когда-нибудь пробовал(а) смёрребрёд?", "livserfaring", ["perfektum", "nogensinde"], 3),
          input("l07-m02-q03", "Skriv perfektum participium af “at skrive”.", "skrevet", ["skrevet", "Skrevet"], "Tænk: har ___.", "Skrive bøjes uregelmæssigt: skrev, har skrevet.", "написанный / написал", "perfektum", ["uregelmæssig", "participium"]),
          choice("l07-m02-q04", "Vælg korrekt hjælpeverbum: Hun ___ kommet hjem.", "er", ["har", "er", "bliver"], "Bevægelse med resultat bruger ofte er.", "Komme danner normalt perfektum med være: er kommet.", "Она пришла домой.", "perfektum", ["er kommet", "bevægelse"], 3),
          order("l07-m02-q05", "Byg: «Мы ещё не закончили».", "Vi er ikke færdige endnu.", ["ikke", "Vi", "endnu.", "færdige", "er"], "Den naturlige danske løsning bruger en tilstand.", "V2-hovedsætning: er før ikke; færdige får -e med vi.", "Мы ещё не закончили.", "resultat", ["ikke endnu", "kongruens"], 3),
          input("l07-m02-q06", "Udfyld: Jeg har boet her ___ 2024.", "siden", ["siden", "Siden"], "Startpunktet er et årstal.", "Siden bruges med et starttidspunkt; i bruges med varighed.", "Я живу здесь с 2024 года.", "tidsforløb", ["siden", "perfektum"], 2),
          choice("l07-m02-q07", "Hvad betyder “Jeg har lige spist” ?", "Я только что поел(а)", ["Я сейчас ем", "Я только что поел(а)", "Я скоро поем"], "Lige markerer noget helt nyligt.", "Har spist er perfektum, og lige betyder just.", "Я только что поел(а).", "perfektum", ["lige", "tid"]),
          ikkePosition("l07-m02-q08", "Byg en ledsætning om manglende erfaring.", "fordi jeg aldrig har været der", ["aldrig", "været", "fordi", "der", "jeg", "har"], "subordinate", "Aldrig står samme sted som ikke.", "I ledsætningen kommer sætningsadverbiet aldrig før hjælpeverbet har.", "потому что я там никогда не был(а)", 3),
        ],
      },
      {
        id: "l07-m03", title: "Næste uge", subtitle: "Planer, intentioner og aftaler", icon: "🚀",
        estimatedMinutes: 3, xp: 230,
        questions: [
          choice("l07-m03-q01", "Vælg en fast plan: Vi ___ besøge Odense på lørdag.", "skal", ["har", "skal", "var"], "Skal kan udtrykke noget planlagt.", "Skal + infinitiv bruges om en aftale eller fast plan.", "В субботу мы поедем в Оденсе.", "fremtid", ["skal", "plan"]),
          order("l07-m03-q02", "Byg: «Я собираюсь учить датский каждый день».", "Jeg vil lære dansk hver dag.", ["lære", "hver", "Jeg", "dag.", "dansk", "vil"], "Vil + infinitiv udtrykker intention.", "Efter modalverbet vil står lære uden at.", "Я собираюсь учить датский каждый день.", "intention", ["vil", "infinitiv"], 2),
          input("l07-m03-q03", "Udfyld: Hvad skal du lave ___ weekenden?", "i", ["i", "I"], "En periode bruger i.", "Det faste tidsudtryk er i weekenden.", "Что ты будешь делать на выходных?", "planer", ["weekend", "præposition"]),
          choice("l07-m03-q04", "Hvad signalerer “måske” ?", "usikkerhed", ["sikker plan", "usikkerhed", "forbud"], "Det betyder возможно.", "Måske viser, at noget er muligt, men ikke sikkert.", "возможно", "modalitet", ["måske", "sandsynlighed"]),
          order("l07-m03-q05", "Byg med V2: «Завтра я позвоню тебе».", "I morgen ringer jeg til dig.", ["ringer", "dig.", "I", "til", "jeg", "morgen"], "Dansk nutid kan udtrykke aftalt fremtid.", "Efter I morgen står ringer som andet led.", "Завтра я тебе позвоню.", "fremtid", ["V2", "nutid for fremtid"], 3),
          choice("l07-m03-q06", "Vælg korrekt forskel: “Jeg vil” udtrykker ofte ___; “jeg skal” ofte ___.", "ønske/intention; plan/pligt", ["fortid; nutid", "ønske/intention; plan/pligt", "sted; retning"], "Begge efterfølges af infinitiv.", "Vil handler ofte om vilje, mens skal peger på aftale, forventning eller nødvendighed.", "желание/намерение; план/обязанность", "modalverber", ["vil", "skal"], 3),
          input("l07-m03-q07", "Skriv ét ord: Vi ses ___! (завтра)", "i morgen", ["i morgen", "I morgen"], "To ord.", "I morgen er det almindelige fremtidige tidsudtryk.", "Увидимся завтра!", "tidsudtryk", ["fremtid", "stavning"]),
          ikkePosition("l07-m03-q08", "Byg betingelsen korrekt.", "Hvis det ikke regner, cykler vi.", ["cykler", "regner,", "Hvis", "vi.", "det", "ikke"], "subordinate", "I hvis-ledsætningen står ikke før regner.", "Den efterfølgende hovedsætning har verbet først: cykler vi.", "Если не будет дождя, мы поедем на велосипедах.", 3),
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
          choice("l08-m01-q01", "Hvad betyder “Jeg arbejder hjemmefra” ?", "Я работаю из дома", ["Я иду с работы", "Я работаю из дома", "Я работаю без дома"], "-fra viser udgangspunktet.", "Hjemmefra er ét adverbium, der betyder from home.", "Я работаю из дома.", "arbejdsliv", ["hjemmefra", "sted"]),
          order("l08-m01-q02", "Byg: «Собрание начинается в половине десятого».", "Mødet begynder halv ti.", ["halv", "Mødet", "ti.", "begynder"], "Halv ti er 9.30.", "På dansk kan klokkeslættet stå direkte uden præposition.", "Встреча начинается в 9:30.", "arbejdsaftaler", ["klokkeslæt", "møde"], 2),
          input("l08-m01-q03", "Udfyld: Jeg er færdig ___ rapporten.", "med", ["med", "Med"], "Fast forbindelse: færdig med.", "At være færdig med noget betyder at have afsluttet det.", "Я закончил(а) отчёт.", "arbejdsopgaver", ["fast præposition", "færdig"]),
          choice("l08-m01-q04", "Vælg den høflige anmodning til en kollega.", "Kan du sende filen, når du har tid?", ["Send filen nu!", "Kan du sende filen, når du har tid?", "Du sender måske aldrig filen."], "Kan du …? blødgør ønsket.", "Når du har tid respekterer modtagerens arbejdssituation.", "Можешь прислать файл, когда будет время?", "samarbejde", ["høflighed", "kan"]),
          order("l08-m01-q05", "Byg med V2: «После обеда у нас занятие».", "Efter frokost har vi undervisning.", ["vi", "Efter", "undervisning.", "har", "frokost"], "Det bøjede verbum skal være andet led.", "Efter frokost fylder første plads, derfor kommer har før vi.", "После обеда у нас занятие.", "V2", ["studie", "tid først"], 3),
          input("l08-m01-q06", "Skriv flertal af “en kollega”.", "kolleger", ["kolleger", "kollegaer", "Kolleger", "Kollegaer"], "To former accepteres i moderne dansk.", "Både kolleger og kollegaer er korrekte flertalsformer.", "коллеги", "flertal", ["arbejde", "variant"], 2),
          choice("l08-m01-q07", "Hvilket bindeord viser kontrast?", "selvom", ["fordi", "selvom", "så"], "Betydningen er хотя.", "Selvom indleder noget, der står i kontrast til hovedsætningen.", "хотя", "bindeord", ["selvom", "kontrast"]),
          ikkePosition("l08-m01-q08", "Byg ledsætningen efter “selvom”.", "selvom jeg ikke er helt færdig", ["helt", "færdig", "selvom", "er", "jeg", "ikke"], "subordinate", "Ikke kommer før er.", "Ledsætningsrækkefølgen er jeg + ikke + er; helt modificerer færdig.", "хотя я ещё не совсем закончил(а)", 3),
        ],
      },
      {
        id: "l08-m02", title: "Jeg mener …", subtitle: "Meninger, grunde og nuancer", icon: "💬",
        estimatedMinutes: 4, xp: 250,
        questions: [
          order("l08-m02-q01", "Byg: «Я думаю, что датский интересный».", "Jeg synes, at dansk er spændende.", ["spændende.", "at", "synes,", "dansk", "Jeg", "er"], "Synes bruges om en subjektiv vurdering.", "Efter synes kan en at-ledsætning forklare meningen.", "Я считаю, что датский интересный.", "meninger", ["synes", "at-ledsætning"], 2),
          choice("l08-m02-q02", "Vælg det bedste svar: “Hvad synes du om byen?”", "Jeg synes, den er hyggelig.", ["Jeg synes, den er hyggelig.", "Jeg synes byen i går.", "Jeg synes ikke spørgsmål."], "Giv en personlig vurdering.", "Pronomenet den henviser til byen; hyggelig beskriver atmosfæren.", "Я думаю, что город уютный.", "meninger", ["synes om", "adjektiv"]),
          input("l08-m02-q03", "Udfyld årsagen: Jeg lærer dansk, ___ jeg bor her.", "fordi", ["fordi", "Fordi"], "Anden del besvarer hvorfor.", "Fordi indleder en ledsætning med årsag.", "Я учу датский, потому что живу здесь.", "argumentation", ["fordi", "årsag"]),
          choice("l08-m02-q04", "Hvilken sætning betyder “По-моему, это слишком дорого” ?", "Efter min mening er det for dyrt.", ["Efter min mening er det for dyrt.", "Før min mening har det dyrt.", "På mening bliver det dyrt."], "Start med den faste vending Efter min mening.", "Efter min mening fylder første plads; V2 giver er det.", "По-моему, это слишком дорого.", "meninger", ["fast udtryk", "V2"], 3),
          ikkePosition("l08-m02-q05", "Byg en forsigtig uenighed.", "Jeg tror ikke, at det er en god idé.", ["en", "ikke,", "tror", "at", "idé.", "Jeg", "god", "det", "er"], "main", "Ikke hører til hovedsætningen efter tror.", "Jeg tror ikke … er blødere end en direkte afvisning.", "Я не думаю, что это хорошая идея.", 3),
          agreement("l08-m02-q06", "Vælg: Det er et ___ argument.", "vigtigt", "vigtig", "t", ["vigtig", "vigtigt", "vigtige"], "Argument er et-ord.", "Ubestemt intetkøn kræver vigtig + t.", "Это важный аргумент.", 2),
          order("l08-m02-q07", "Byg: «С одной стороны это удобно».", "På den ene side er det praktisk.", ["praktisk.", "ene", "er", "side", "det", "På", "den"], "Hele frasen før verbet er ét led.", "V2 placerer er før det efter På den ene side.", "С одной стороны, это удобно.", "nuancering", ["på den ene side", "V2"], 3),
          input("l08-m02-q08", "Skriv bindeordet: ___ er det dyrt, men kvaliteten er god. (правда/однако)", "godt nok", ["godt nok", "Godt nok"], "Det er en indrømmelse før men.", "Godt nok … men … anerkender ét punkt og sætter et andet over for det.", "Правда, это дорого, но качество хорошее.", "nuancering", ["godt nok", "kontrast"], 3),
        ],
      },
      {
        id: "l08-m03", title: "Københavnerdagen", subtitle: "Finale: saml sprogbrikkerne", icon: "🏁",
        estimatedMinutes: 3, xp: 300,
        questions: [
          numberArcade("l08-m03-q01", 87, "syvogfirs", ["syvogfirs", "firsogsyv", "syvoghalvfems"], "7 + og + 80; firs er historisk 4 × 20", "Find firs og sæt syv foran med og.", "восемьдесят семь", 3),
          genderBet("l08-m03-q02", "museum", "et", "Mange internationale ord skal stadig læres med køn.", "Museum er intetkøn: et museum.", "музей", ["by", "kultur"], 2),
          definiteness("l08-m03-q03", "Vælg den fulde bestemte frase: «этот известный музей».", "det berømte museum", { indefinite: "et museum", definite: "museet", modified: "det berømte museum" }, "modified", "Et-ord bruger det; adjektivet får -e.", "Bestemthed med adjektiv vises foran: det berømte museum.", "этот известный музей", 3),
          agreement("l08-m03-q04", "Vælg: Museet har to ___ udstillinger.", "nye", "ny", "e", ["ny", "nyt", "nye"], "Flertal kræver e-form.", "Foran udstillinger i flertal står nye.", "В музее две новые выставки.", 2),
          order("l08-m03-q05", "Byg med korrekt V2: «После музея поедем к гавани».", "Efter museet tager vi ned til havnen.", ["til", "museet", "ned", "vi", "Efter", "havnen.", "tager"], "Tager skal være andet led.", "Efter museet + tager + vi følger V2; ned til angiver retning.", "После музея мы поедем к гавани.", "byplan", ["V2", "retning"], 3),
          ikkePosition("l08-m03-q06", "Byg årsagen med ledsætningsordstilling.", "fordi restauranten ikke har et ledigt bord", ["har", "restauranten", "ledigt", "fordi", "bord", "et", "ikke"], "subordinate", "Ikke står mellem subjektet og har.", "I fordi-ledsætningen er rækkefølgen restauranten + ikke + har.", "потому что в ресторане нет свободного столика", 3),
          input("l08-m03-q07", "Afslut høfligt: Det har været en ___ dag. (замечательный)", "dejlig", ["dejlig", "Dejlig"], "Dag er et en-ord.", "Dejlig står i grundform efter en dag.", "Это был замечательный день.", "evaluering", ["adjektiv", "oplevelse"], 2),
          choice("l08-m03-q08", "Vælg den sammenhængende afslutning på historien.", "Selvom vi var trætte, gik vi glade hjem.", ["Selvom vi var trætte, gik vi glade hjem.", "Selvom var vi trætte, vi gik hjem glade.", "Vi selvom trætte ikke hjem."], "Selvom-leddet har subjekt før verbum; hovedsætningen får inversion.", "I ledsætningen: vi var. Efter kommaet: gik vi, fordi ledsætningen fylder første plads.", "Хотя мы устали, мы довольные пошли домой.", "sammenhængende fortælling", ["selvom", "V2", "finale"], 3),
        ],
      },
    ],
  },
];
