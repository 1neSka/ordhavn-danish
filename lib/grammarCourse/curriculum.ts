import type { ExamErrorRecord, GrammarLessonMeta, GrammarModuleMeta, GrammarRule } from "./types";

// The course is ordered from zero: lesson N may only rely on rules taught in
// lessons 1..N. Content files reference these ids, and the tests reject an item
// that uses a rule before its lesson.

export const GRAMMAR_RULES: GrammarRule[] = [
  { id: "verb-finite", title: "Det finitte verbum", summary: "The finite verb is the one verb that shows tense. Find it with the tense test: nu → i går." },
  { id: "subject", title: "Subjektet", summary: "The subject is who or what does the action. Every Danish clause needs one — even if it is only der or det." },
  { id: "led", title: "Led", summary: "Words that move together form one constituent (led). Word-order rules count constituents, not words." },
  { id: "adverbial", title: "Adverbialer", summary: "Adverbials say when, where, how or why. Sentence adverbials such as ikke, også and altid comment on the whole clause." },
  { id: "clause-type", title: "Helsætning eller ledsætning", summary: "A main clause can stand alone. A subordinate clause starts with a subordinator (at, fordi, hvis, om, selvom …) and leans on a main clause." },

  { id: "schema-main", title: "Helsætningens skema", summary: "Main-clause fields: F · v · n · a · V · N · A." },
  { id: "v2", title: "V2 og inversion", summary: "The finite verb is always the second constituent. If anything except the subject comes first, the subject moves behind the verb." },
  { id: "front-comma", title: "Forfeltet", summary: "Exactly one constituent before the verb, however long — and no comma after it. Ja, nej and altså stand outside the sentence." },
  { id: "adv-main", title: "Ikke & co. i helsætningen", summary: "Sentence adverbials come after the finite verb (and after the subject when it is inverted). Også + ikke = heller ikke." },
  { id: "verb-chain", title: "Verbalkæden", summary: "Only the finite verb takes position 2. Infinitives and participles wait after the sentence adverbial." },
  { id: "coord", title: "Og, men, for, eller, så", summary: "Coordinating conjunctions stand outside the fields and never trigger inversion by themselves." },
  { id: "v1", title: "Spørgsmål og ordrer", summary: "Yes/no questions and commands start with the verb (V1). Hv-questions put the question word in F." },

  { id: "sub-order", title: "Ledsætningens orden", summary: "Subordinate clause: bindeord · subjekt · ikke · verbum. No inversion, and the adverb comes before the finite verb." },
  { id: "sub-front", title: "Ledsætning i forfeltet", summary: "A whole subordinate clause can fill F. The main clause then continues with its verb: Hvis det regner, bliver vi hjemme." },
  { id: "connector-type", title: "Bindeord eller adverbium?", summary: "fordi, selvom and hvis give subordinate order; derfor, alligevel and så fill F and trigger V2; for, men and og change nothing." },
  { id: "indirect-q", title: "Indirekte spørgsmål", summary: "om or a hv-word + subordinate order: Jeg ved ikke, om han kommer. A hv-word that is the subject adds der: hvem der kommer." },
  { id: "relative", title: "Relativsætninger", summary: "som and der introduce relative clauses with subordinate order. som can be dropped when it is not the subject." },

  { id: "content-order", title: "Bagfeltet", summary: "After the verbs: objects before adverbials, and adverbials usually go how → where → when." },
  { id: "der-det", title: "Der eller det?", summary: "der er … introduces something that exists; det points to something (det er vigtigt, det regner)." },
  { id: "object-shift", title: "Små pronominer flytter", summary: "An unstressed object pronoun moves in front of ikke when the finite verb is the main verb: Jeg kender ham ikke." },
  { id: "complex", title: "Lange sætninger", summary: "Long sentences are fields inside fields. Analyse each clause on its own." },

  { id: "hvis-om", title: "Hvis eller om?", summary: "hvis = if (a condition); om = whether (an indirect yes/no question). If you could say 'whether', write om." },
  { id: "naar-da", title: "Når eller da?", summary: "når = when (now, in the future, every time); da = when (one time in the past)." },
  { id: "hvilket", title: "Som, hvilket, hvad", summary: "som/der point back to a noun; hvilket points back to the whole previous clause; hvad means 'what'." },
  { id: "at-inf", title: "At + infinitiv", summary: "After a preposition use at + infinitive (til at, for at, uden at). After a modal verb: no at." },
  { id: "prep-place", title: "Præpositioner: sted", summary: "i or på with places, øst for, i nærheden af, and til (direction) versus i/på (location)." },
  { id: "prep-time", title: "Præpositioner: tid", summary: "i to år, om to dage, for to år siden, på mandag, i mandags, om mandagen." },
  { id: "prep-fixed", title: "Faste forbindelser", summary: "Many verbs and adjectives choose their own preposition: bekymre sig om, glæde sig til, vigtig for, interesseret i." },
  { id: "opinion-verbs", title: "Mene, synes, tro, tænke", summary: "mene and synes give an opinion, tro assumes or believes, tænke is the thinking process (tænke på = think about)." },
  { id: "cap-i", title: "I eller i?", summary: "I with a capital letter means 'you' (plural); i is the preposition 'in'." },

  { id: "np-definite", title: "Bestemt form", summary: "en park → parken → den nye park. Never en and -en at the same time." },
  { id: "np-when-definite", title: "Hvornår bestemt?", summary: "Use the definite form for known, specific things — also after nogle af, en del af and mange af." },
  { id: "np-agreement", title: "Bøjning: -t og -e", summary: "et stort fokus, det er vigtigt, det nye projekt — and adverbs take -t: stærkt reguleret." },
];

export const GRAMMAR_MODULES: GrammarModuleMeta[] = [
  {
    id: "m1",
    title: "Byggestenene",
    subtitle: "Verbum, subjekt, led og ledsætning — fra helt fra bunden.",
    track: "order",
    bossTitle: "Røntgen af din tale",
    bossQuote: "Vindmøllerne vil blive placeret 2,1 km vest for vores strand.",
    lessonIds: ["m1-verb", "m1-subject", "m1-led", "m1-adverbial", "m1-clauses"],
  },
  {
    id: "m2",
    title: "Helsætningen",
    subtitle: "V2, forfeltet og pladsen til ikke.",
    track: "order",
    bossTitle: "Bossen fra din eksamen",
    bossQuote: "Men i dette tilfæld bygning er sponseret …",
    lessonIds: ["m2-schema", "m2-v2", "m2-front", "m2-adverb", "m2-chain", "m2-coord", "m2-questions"],
  },
  {
    id: "m3",
    title: "Ledsætningen",
    subtitle: "Ingen inversion — og ikke før verbet.",
    track: "order",
    bossTitle: "Bossen fra din eksamen",
    bossQuote: "Selvom er jeg ikke en del af dette projekt …",
    lessonIds: ["m3-order", "m3-front", "m3-connectors", "m3-indirect", "m3-relative"],
  },
  {
    id: "m4",
    title: "Finpudsning",
    subtitle: "Bagfeltet, der/det, små pronominer og lange sætninger.",
    track: "order",
    bossTitle: "Bossen fra din eksamen",
    bossQuote: "… hvis de kræver fra SIXSEVENLYS flere detaljer for borgere om projektet.",
    lessonIds: ["m4-content", "m4-der-det", "m4-shift", "m4-complex"],
  },
  {
    id: "m5",
    title: "De små ord",
    subtitle: "hvis/om, hvilket, til at — og præpositionerne.",
    track: "choice",
    bossTitle: "Bossen fra din eksamen",
    bossQuote: "Det er irrelevant til emnet af energi …",
    lessonIds: ["m5-hvis-om", "m5-hvilket", "m5-at", "m5-place", "m5-time", "m5-fixed", "m5-small"],
  },
  {
    id: "m6",
    title: "Navneordet",
    subtitle: "Bestemt form, køn og bøjning.",
    track: "noun",
    bossTitle: "Bossen fra din eksamen",
    bossQuote: "… det vil være en solcelleparken.",
    lessonIds: ["m6-definite", "m6-when", "m6-agreement"],
  },
];

export const GRAMMAR_LESSONS: GrammarLessonMeta[] = [
  { id: "m1-verb", moduleId: "m1", title: "Verbet", subtitle: "Sætningens motor — og den ene form, der viser tid", rules: ["verb-finite"] },
  { id: "m1-subject", moduleId: "m1", title: "Subjektet", subtitle: "Hvem eller hvad gør noget?", rules: ["subject"] },
  { id: "m1-led", moduleId: "m1", title: "Led", subtitle: "Ord, der flytter sammen", rules: ["led"] },
  { id: "m1-adverbial", moduleId: "m1", title: "Adverbialer", subtitle: "Hvornår, hvor, hvordan — og ikke", rules: ["adverbial"] },
  { id: "m1-clauses", moduleId: "m1", title: "Hel- og ledsætning", subtitle: "Hvad kan stå alene?", rules: ["clause-type"] },

  { id: "m2-schema", moduleId: "m2", title: "Sætningsskemaet", subtitle: "Syv pladser, én fast rækkefølge", rules: ["schema-main"] },
  { id: "m2-v2", moduleId: "m2", title: "V2", subtitle: "Verbet står altid på plads 2", rules: ["v2"] },
  { id: "m2-front", moduleId: "m2", title: "Forfeltet", subtitle: "Ét led — og intet komma", rules: ["front-comma"] },
  { id: "m2-adverb", moduleId: "m2", title: "Ikke, også, altid", subtitle: "Sætningsadverbialer i helsætningen", rules: ["adv-main"] },
  { id: "m2-chain", moduleId: "m2", title: "Verbalkæden", subtitle: "kan, vil, har, bliver + verbum", rules: ["verb-chain"] },
  { id: "m2-coord", moduleId: "m2", title: "Og, men, for", subtitle: "Små ord, der ikke tæller", rules: ["coord"] },
  { id: "m2-questions", moduleId: "m2", title: "Spørgsmål og ordrer", subtitle: "Når verbet står først", rules: ["v1"] },

  { id: "m3-order", moduleId: "m3", title: "Ledsætningens orden", subtitle: "Bindeord, subjekt, ikke, verbum", rules: ["sub-order"] },
  { id: "m3-front", moduleId: "m3", title: "Ledsætningen først", subtitle: "Hele ledsætningen er felt 1", rules: ["sub-front"] },
  { id: "m3-connectors", moduleId: "m3", title: "Fordi eller derfor?", subtitle: "Bindeord, forbindere og adverbier", rules: ["connector-type"] },
  { id: "m3-indirect", moduleId: "m3", title: "Indirekte spørgsmål", subtitle: "om, hvad, hvordan — og hvem der", rules: ["indirect-q"] },
  { id: "m3-relative", moduleId: "m3", title: "Som og der", subtitle: "Relativsætninger", rules: ["relative"] },

  { id: "m4-content", moduleId: "m4", title: "Bagfeltet", subtitle: "Objekt, sted, tid", rules: ["content-order"] },
  { id: "m4-der-det", moduleId: "m4", title: "Der eller det?", subtitle: "Det formelle subjekt", rules: ["der-det"] },
  { id: "m4-shift", moduleId: "m4", title: "Jeg kender ham ikke", subtitle: "Små pronominer flytter", rules: ["object-shift"] },
  { id: "m4-complex", moduleId: "m4", title: "Lange sætninger", subtitle: "Felter i felter", rules: ["complex"] },

  { id: "m5-hvis-om", moduleId: "m5", title: "Hvis, om, når, da", subtitle: "Fire små ord, fire betydninger", rules: ["hvis-om", "naar-da"] },
  { id: "m5-hvilket", moduleId: "m5", title: "Som, hvilket, hvad", subtitle: "Hvad peger ordet tilbage på?", rules: ["hvilket"] },
  { id: "m5-at", moduleId: "m5", title: "At + infinitiv", subtitle: "til at, for at, uden at", rules: ["at-inf"] },
  { id: "m5-place", moduleId: "m5", title: "Sted og retning", subtitle: "i, på, til, øst for", rules: ["prep-place"] },
  { id: "m5-time", moduleId: "m5", title: "Tid", subtitle: "i, om, for … siden, på", rules: ["prep-time"] },
  { id: "m5-fixed", moduleId: "m5", title: "Faste forbindelser", subtitle: "bekymre sig om, glæde sig til", rules: ["prep-fixed"] },
  { id: "m5-small", moduleId: "m5", title: "Små ord, store fejl", subtitle: "mene, synes, tro — og I eller i", rules: ["opinion-verbs", "cap-i"] },

  { id: "m6-definite", moduleId: "m6", title: "En park, parken", subtitle: "Bestemt og ubestemt form", rules: ["np-definite"] },
  { id: "m6-when", moduleId: "m6", title: "Hvornår bestemt?", subtitle: "Kendt, konkret, nogle af …", rules: ["np-when-definite"] },
  { id: "m6-agreement", moduleId: "m6", title: "-t og -e", subtitle: "Køn, bøjning og adverbier", rules: ["np-agreement"] },
];

// Taken from the learner's Paper 1 mock exam (speech at a town meeting about
// wind turbines). Only clear errors are listed; each points to the lesson that
// repairs it.
export const EXAM_ERRORS: ExamErrorRecord[] = [
  { id: "i-dette-tilfaelde", lessonId: "m2-v2", wrong: "Men i dette tilfæld bygning er sponseret af det privat firma", right: "Men i dette tilfælde er byggeriet sponsoreret af det private firma", note: "I dette tilfælde fills F, so the finite verb er must come next — before the subject." },
  { id: "selvfoelgelig-folk", lessonId: "m2-v2", wrong: "og selvfølgelig folk svømmer ikke så langt væk", right: "og selvfølgelig svømmer folk ikke så langt ud", note: "og stands outside the fields; selvfølgelig is in F, so svømmer comes before folk." },
  { id: "foerst-komma", lessonId: "m2-front", wrong: "Først, skal jeg minde om projektets kerne", right: "Først skal jeg minde om projektets kerne", note: "No comma after a fronted adverbial in Danish." },
  { id: "lige-nu-det-er", lessonId: "m2-front", wrong: "Men lige nu, det er alt fra mig for i dag", right: "Men lige nu er det alt fra mig for i dag", note: "The comma made the sentence look English. Lige nu is F, so er comes next." },
  { id: "helt-aerligt", lessonId: "m2-front", wrong: "Helt ærligt, det er ikke vigtigt hvis vi er ”for” eller ”imod”", right: "Helt ærligt er det ikke vigtigt, om vi er ”for” eller ”imod”", note: "Helt ærligt is F → er det. (And 'whether' is om — module 5.)" },
  { id: "ogsaa-ikke", lessonId: "m2-adverb", wrong: "men det også betyder ikke, at de vil falde", right: "men det betyder heller ikke, at de vil falde", note: "Sentence adverbials follow the finite verb, and også + ikke becomes heller ikke." },
  { id: "men-mindede", lessonId: "m2-coord", wrong: "men mindede jeg tidligere om afstand", right: "men jeg mindede tidligere om afstanden", note: "men does not fill F, so nothing triggers inversion: subject first, then the verb." },
  { id: "selvom-er-jeg", lessonId: "m3-order", wrong: "Selvom er jeg ikke en del af dette projekt", right: "Selvom jeg ikke er en del af dette projekt", note: "Subordinate clause: subject right after selvom, and ikke before the verb." },
  { id: "fordi-betyder-ikke", lessonId: "m3-order", wrong: "fordi ”tæt på” betyder ikke ”i byen”", right: "fordi ”tæt på” ikke betyder ”i byen”", note: "In a fordi-clause ikke stands before the finite verb." },
  { id: "at-lige-nu", lessonId: "m3-order", wrong: "viser, at lige nu, det største problem er udsigt", right: "viser, at det største problem lige nu er udsigten", note: "The subject comes straight after at; the time adverbial waits." },
  { id: "fordi-saa", lessonId: "m3-front", wrong: "Fordi kernedetaljer er klare så skal jeg svare på jeres kommentarer", right: "Da kernedetaljerne er klare, skal jeg svare på jeres kommentarer", note: "The whole subordinate clause is F: comma, then the verb. No extra så." },
  { id: "hvis-overhovedet", lessonId: "m3-indirect", wrong: "og hvis vi har overhovedet nogen indflydelse på beslutningen", right: "og om vi overhovedet har nogen indflydelse på beslutningen", note: "An indirect yes/no question uses om and subordinate order: overhovedet before har." },
  { id: "kraever-fra", lessonId: "m4-content", wrong: "hvis de kræver fra SIXSEVENLYS flere detaljer for borgere om projektet", right: "hvis den kræver flere detaljer om projektet af SIXSEVENLYS", note: "The object comes before the other phrases; kræve noget af nogen; kommunen → den." },
  { id: "det-vil-vaere", lessonId: "m4-der-det", wrong: "fordi i stedet for et stort tomt felt det vil være en solcelleparken", right: "fordi der vil være en solcellepark i stedet for en stor, tom mark", note: "Something new that exists is introduced with der, not det — and der is the subject right after fordi." },
  { id: "hvis-det-ikke-er", lessonId: "m4-der-det", wrong: "hvis det ikke er nogen detaljer", right: "hvis der ikke er nogen detaljer", note: "der er / der ikke er = there is / there are no." },
  { id: "vigtigt-hvis", lessonId: "m5-hvis-om", wrong: "det er ikke vigtigt hvis vi er ”for” eller ”imod”", right: "det er ikke vigtigt, om vi er ”for” eller ”imod”", note: "You mean 'whether' → om." },
  { id: "informere-hvis", lessonId: "m5-hvis-om", wrong: "De kan informere os, hvis projektet skaber arbejdspladser i byen", right: "De kan fortælle os, om projektet skaber arbejdspladser i byen", note: "They should tell us whether it creates jobs → om." },
  { id: "som-betyder", lessonId: "m5-hvilket", wrong: "…, som betyder at de vil være på vandet", right: "…, hvilket betyder, at de vil være på vandet", note: "som points to a noun. To point back to the whole sentence, use hvilket." },
  { id: "til-opstille", lessonId: "m5-at", wrong: "det nye initiativ til opstille seks store vindmøller", right: "det nye initiativ til at opstille seks store vindmøller", note: "After a preposition the infinitive needs at." },
  { id: "til-oest-fra", lessonId: "m5-place", wrong: "1.6 km til øst fra vores bygrænse", right: "1,6 km øst for vores bygrænse", note: "'East of' is øst for. (And Danish writes the decimal comma: 1,6.)" },
  { id: "i-universitet", lessonId: "m5-place", wrong: "medlem af energiafdelingen i SYD Universitet", right: "medlem af energiafdelingen på Syddansk Universitet", note: "Institutions such as universitet and gymnasium take på." },
  { id: "irrelevant-til", lessonId: "m5-fixed", wrong: "Det er irrelevant til emnet af energi", right: "Det er irrelevant for emnet energi", note: "relevant/irrelevant for — and no English-style 'of'." },
  { id: "ofret-til", lessonId: "m5-fixed", wrong: "den er ofret til den grønne omstilling", right: "den bliver ofret for den grønne omstilling", note: "ofre noget for noget = sacrifice something for something." },
  { id: "visualisering-hvordan", lessonId: "m5-fixed", wrong: "de kan bygge visualisering hvordan de seks vindmøller vil se ud", right: "de kan lave en visualisering af, hvordan de seks vindmøller vil se ud", note: "Danish keeps the preposition before a hv-clause: en visualisering af, hvordan …" },
  { id: "jeg-taenker", lessonId: "m5-small", wrong: "Jeg tænker, at kommunen kan få borgerne med", right: "Jeg mener, at kommunen kan få borgerne med", note: "To give an opinion in a formal speech, use mener (or synes)." },
  { id: "i-giver", lessonId: "m5-small", wrong: "hvor i giver mange argumenter for og imod", right: "hvor I giver mange argumenter for og imod", note: "I = you (plural) is always written with a capital letter." },
  { id: "en-solcelleparken", lessonId: "m6-definite", wrong: "en solcelleparken", right: "en solcellepark", note: "en and -en never appear together." },
  { id: "det-privat-firma", lessonId: "m6-definite", wrong: "det privat firma", right: "det private firma", note: "After den/det/de the adjective takes -e." },
  { id: "nogle-af-kommentarer", lessonId: "m6-when", wrong: "svare på nogle af kommentarer og bekymringer", right: "svare på nogle af kommentarerne og bekymringerne", note: "nogle af means 'some of the …' — the noun is definite." },
  { id: "stort-argument", lessonId: "m6-when", wrong: "Stort argument imod er prisen", right: "Et stort argument imod er prisen", note: "A singular countable noun needs an article." },
  { id: "vigtig-vigtigt", lessonId: "m6-agreement", wrong: "det vil være vigtig i fremtiden", right: "det vil være vigtigt i fremtiden", note: "After det the predicative adjective takes -t." },
  { id: "en-stor-fokus", lessonId: "m6-agreement", wrong: "en stor fokus på planeten", right: "et stort fokus på planeten", note: "fokus is an et-word: et stort fokus." },
  { id: "staerk-reguleret", lessonId: "m6-agreement", wrong: "energiinfrastruktur er stærk reguleret", right: "energiinfrastruktur er stærkt reguleret", note: "An adverb in front of an adjective or participle takes -t: stærkt reguleret." },
];

export const GRAMMAR_RULE_BY_ID = new Map(GRAMMAR_RULES.map((rule) => [rule.id, rule]));
export const GRAMMAR_LESSON_BY_ID = new Map(GRAMMAR_LESSONS.map((lesson) => [lesson.id, lesson]));
export const GRAMMAR_MODULE_BY_ID = new Map(GRAMMAR_MODULES.map((courseModule) => [courseModule.id, courseModule]));

/** Lesson index of the lesson that introduces each rule. */
export const RULE_INTRODUCED_AT = new Map(
  GRAMMAR_LESSONS.flatMap((lesson, index) => lesson.rules.map((rule) => [rule, index] as const)),
);
