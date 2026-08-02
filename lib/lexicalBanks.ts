export type LexicalLevel = "A2+" | "B1" | "B2";

export type LexicalRegister =
  | "informal"
  | "neutral"
  | "formal"
  | "academic"
  | "bureaucratic"
  | "journalistic"
  | "literary"
  | "blunt";

export type LexicalMechanic =
  | "synonym-pick"
  | "nuance-scale"
  | "odd-one-out"
  | "collocation-lock"
  | "inflection-forge"
  | "word-forge";

export interface SynonymCandidate {
  readonly id: string;
  readonly lemmaDa: string;
  readonly glossEn: string;
  readonly register: LexicalRegister;
  readonly intensity: 1 | 2 | 3 | 4 | 5;
  readonly fitsContext: boolean;
  readonly constraintEn: string;
}

export interface SynonymGroup {
  readonly id: string;
  readonly level: LexicalLevel;
  readonly conceptEn: string;
  readonly promptDa: string;
  readonly contextDa: string;
  readonly targetRegister: LexicalRegister;
  readonly correctCandidateId: string;
  readonly candidates: readonly SynonymCandidate[];
}

export interface NuanceEntry {
  readonly termDa: string;
  readonly glossEn: string;
  readonly strength: 1 | 2 | 3 | 4 | 5;
  readonly usageDa: string;
}

export interface NuanceScale {
  readonly id: string;
  readonly level: LexicalLevel;
  readonly axisEn: string;
  readonly promptDa: string;
  readonly entries: readonly NuanceEntry[];
}

export interface VerbNounCollocation {
  readonly id: string;
  readonly level: LexicalLevel;
  readonly verbDa: string;
  readonly nounPhraseDa: string;
  readonly phraseDa: string;
  readonly glossEn: string;
  readonly contextDa: string;
  readonly distractorVerbsDa: readonly string[];
}

export interface GovernedPreposition {
  readonly id: string;
  readonly level: LexicalLevel;
  readonly headDa: string;
  readonly headKind: "verb" | "adjective" | "noun";
  readonly prepositionDa: string;
  readonly exampleDa: string;
  readonly glossEn: string;
  readonly distractorsDa: readonly string[];
}

export interface FalseFriend {
  readonly id: string;
  readonly level: LexicalLevel;
  readonly danishDa: string;
  readonly temptingEnglish: string;
  readonly meaningEn: string;
  readonly trapEn: string;
  readonly exampleDa: string;
}

export interface CompoundMorpheme {
  readonly textDa: string;
  readonly role: "first-stem" | "linker" | "head";
  readonly glossEn: string;
}

export interface CompoundPattern {
  readonly id: string;
  readonly level: LexicalLevel;
  readonly firstStemDa: string;
  readonly linkerDa: "" | "s" | "e" | "n";
  readonly headDa: string;
  readonly compoundDa: string;
  readonly glossEn: string;
  readonly contextDa: string;
  readonly morphemes: readonly CompoundMorpheme[];
  readonly distractorLinkersDa: readonly ("" | "s" | "e" | "n")[];
}

export interface SemanticField {
  readonly id: string;
  readonly level: LexicalLevel;
  readonly labelEn: string;
  readonly promptDa: string;
  readonly membersDa: readonly string[];
  readonly intruderDa: string;
  readonly reasonEn: string;
}

export interface InflectionTarget {
  readonly id: string;
  readonly level: LexicalLevel;
  readonly lemmaDa: string;
  readonly partOfSpeech: "noun" | "verb" | "adjective" | "pronoun";
  readonly targetEn: string;
  readonly promptDa: string;
  readonly answerDa: string;
  readonly acceptableAnswersDa: readonly string[];
  readonly contextDa: string;
}

const synonymGroups = [
  {
    id: "syn-say-neutral-report",
    level: "B1",
    conceptEn: "say",
    promptDa: "Vælg det ord, der passer i en neutral nyhedsrapport.",
    contextDa: "Ministeriet ___, at tallene bliver offentliggjort fredag.",
    targetRegister: "journalistic",
    correctCandidateId: "syn-say-oplyse",
    candidates: [
      { id: "syn-say-oplyse", lemmaDa: "oplyser", glossEn: "states/informs", register: "journalistic", intensity: 2, fitsContext: true, constraintEn: "Standard attribution in factual reporting." },
      { id: "syn-say-snakke", lemmaDa: "snakker", glossEn: "chats", register: "informal", intensity: 1, fitsContext: false, constraintEn: "Too conversational for an official source." },
      { id: "syn-say-ytre", lemmaDa: "ytrer", glossEn: "utters", register: "formal", intensity: 3, fitsContext: false, constraintEn: "Focuses on voicing an opinion, not releasing information." },
      { id: "syn-say-brøle", lemmaDa: "brøler", glossEn: "roars", register: "blunt", intensity: 5, fitsContext: false, constraintEn: "Adds loudness and aggression absent from the context." },
    ],
  },
  {
    id: "syn-angry-workplace",
    level: "A2+",
    conceptEn: "angry",
    promptDa: "Vælg den neutrale beskrivelse af en mild reaktion.",
    contextDa: "Hun blev lidt ___, da mødet begyndte ti minutter for sent.",
    targetRegister: "neutral",
    correctCandidateId: "syn-angry-irriteret",
    candidates: [
      { id: "syn-angry-irriteret", lemmaDa: "irriteret", glossEn: "annoyed", register: "neutral", intensity: 2, fitsContext: true, constraintEn: "Matches a mild reaction to a small delay." },
      { id: "syn-angry-rasende", lemmaDa: "rasende", glossEn: "furious", register: "neutral", intensity: 5, fitsContext: false, constraintEn: "Far too intense for a minor delay." },
      { id: "syn-angry-forbitret", lemmaDa: "forbitret", glossEn: "embittered", register: "literary", intensity: 4, fitsContext: false, constraintEn: "Implies lasting resentment rather than brief annoyance." },
      { id: "syn-angry-pissesur", lemmaDa: "pissesur", glossEn: "really pissed off", register: "blunt", intensity: 4, fitsContext: false, constraintEn: "Register is too crude for the workplace description." },
    ],
  },
  {
    id: "syn-small-budget",
    level: "B1",
    conceptEn: "small",
    promptDa: "Vælg det ord, der normalt bruges om økonomisk forskel.",
    contextDa: "Der er kun en ___ forskel mellem de to tilbud.",
    targetRegister: "formal",
    correctCandidateId: "syn-small-marginal",
    candidates: [
      { id: "syn-small-marginal", lemmaDa: "marginal", glossEn: "marginal", register: "formal", intensity: 1, fitsContext: true, constraintEn: "Conventional with differences in analyses and budgets." },
      { id: "syn-small-lille", lemmaDa: "lille", glossEn: "small", register: "neutral", intensity: 2, fitsContext: false, constraintEn: "Possible, but less precise for a formal comparison." },
      { id: "syn-small-spinkel", lemmaDa: "spinkel", glossEn: "slender/flimsy", register: "neutral", intensity: 2, fitsContext: false, constraintEn: "Typically describes bodies, structures, or evidence." },
      { id: "syn-small-mikroskopisk", lemmaDa: "mikroskopisk", glossEn: "microscopic", register: "neutral", intensity: 1, fitsContext: false, constraintEn: "Hyperbolic here and suggests near invisibility." },
    ],
  },
  {
    id: "syn-walk-police",
    level: "B1",
    conceptEn: "walk",
    promptDa: "Vælg verbet, der beskriver vagternes kontrollerede bevægelse.",
    contextDa: "To vagter ___ langs hegnet hver halve time.",
    targetRegister: "neutral",
    correctCandidateId: "syn-walk-patruljerer",
    candidates: [
      { id: "syn-walk-patruljerer", lemmaDa: "patruljerer", glossEn: "patrol", register: "neutral", intensity: 2, fitsContext: true, constraintEn: "Encodes repeated security rounds." },
      { id: "syn-walk-spadserer", lemmaDa: "spadserer", glossEn: "stroll", register: "neutral", intensity: 1, fitsContext: false, constraintEn: "Implies leisure rather than surveillance." },
      { id: "syn-walk-vandrer", lemmaDa: "vandrer", glossEn: "hike/wander", register: "neutral", intensity: 2, fitsContext: false, constraintEn: "Usually longer movement without a fixed patrol task." },
      { id: "syn-walk-lusker", lemmaDa: "lusker", glossEn: "slink", register: "informal", intensity: 3, fitsContext: false, constraintEn: "Implies suspicious or secretive movement." },
    ],
  },
  {
    id: "syn-help-formal",
    level: "B1",
    conceptEn: "help",
    promptDa: "Vælg det formelle verbum i myndighedens brev.",
    contextDa: "Kommunen kan ___ borgere med at udfylde blanketten.",
    targetRegister: "bureaucratic",
    correctCandidateId: "syn-help-bistå",
    candidates: [
      { id: "syn-help-bistå", lemmaDa: "bistå", glossEn: "assist", register: "bureaucratic", intensity: 2, fitsContext: true, constraintEn: "Standard formal verb for institutional assistance." },
      { id: "syn-help-hjælpe", lemmaDa: "hjælpe", glossEn: "help", register: "neutral", intensity: 2, fitsContext: false, constraintEn: "Semantically right but misses the requested official register." },
      { id: "syn-help-redde", lemmaDa: "redde", glossEn: "rescue/save", register: "neutral", intensity: 4, fitsContext: false, constraintEn: "Presupposes danger or serious failure." },
      { id: "syn-help-fikse", lemmaDa: "fikse", glossEn: "fix", register: "informal", intensity: 2, fitsContext: false, constraintEn: "Informal and focuses on solving the thing directly." },
    ],
  },
  {
    id: "syn-look-medical",
    level: "B1",
    conceptEn: "look",
    promptDa: "Vælg verbet for en grundig faglig undersøgelse.",
    contextDa: "Lægen ___ såret, før hun lagde en ny forbinding.",
    targetRegister: "formal",
    correctCandidateId: "syn-look-undersøgte",
    candidates: [
      { id: "syn-look-undersøgte", lemmaDa: "undersøgte", glossEn: "examined", register: "formal", intensity: 3, fitsContext: true, constraintEn: "Signals systematic professional examination." },
      { id: "syn-look-kiggede", lemmaDa: "kiggede på", glossEn: "looked at", register: "neutral", intensity: 1, fitsContext: false, constraintEn: "Too casual and superficial for the clinical action." },
      { id: "syn-look-stirrede", lemmaDa: "stirrede på", glossEn: "stared at", register: "neutral", intensity: 3, fitsContext: false, constraintEn: "Describes gaze duration, not diagnosis." },
      { id: "syn-look-glanede", lemmaDa: "glanede på", glossEn: "gawked at", register: "informal", intensity: 2, fitsContext: false, constraintEn: "Has an impolite, curious connotation." },
    ],
  },
  {
    id: "syn-eat-formal-event",
    level: "A2+",
    conceptEn: "eat",
    promptDa: "Vælg verbet, der passer til en formel invitation.",
    contextDa: "Efter ceremonien skal gæsterne ___ i rådhussalen.",
    targetRegister: "neutral",
    correctCandidateId: "syn-eat-spise",
    candidates: [
      { id: "syn-eat-spise", lemmaDa: "spise", glossEn: "eat/dine", register: "neutral", intensity: 2, fitsContext: true, constraintEn: "Natural, unmarked verb even in a formal invitation." },
      { id: "syn-eat-æde", lemmaDa: "æde", glossEn: "devour/eat", register: "blunt", intensity: 4, fitsContext: false, constraintEn: "Crude for people at a civic ceremony." },
      { id: "syn-eat-snuppe", lemmaDa: "snuppe noget", glossEn: "grab a bite", register: "informal", intensity: 1, fitsContext: false, constraintEn: "Too casual and requires an object." },
      { id: "syn-eat-fortære", lemmaDa: "fortære", glossEn: "consume/devour", register: "literary", intensity: 4, fitsContext: false, constraintEn: "Overly dramatic and usually transitive." },
    ],
  },
  {
    id: "syn-show-evidence",
    level: "B2",
    conceptEn: "show",
    promptDa: "Vælg verbet, der markerer en forsigtig evidensrelation.",
    contextDa: "De foreløbige målinger ___, at fejlen opstår ved høj belastning.",
    targetRegister: "academic",
    correctCandidateId: "syn-show-indikerer",
    candidates: [
      { id: "syn-show-indikerer", lemmaDa: "indikerer", glossEn: "indicate", register: "academic", intensity: 2, fitsContext: true, constraintEn: "Signals evidence without claiming final proof." },
      { id: "syn-show-beviser", lemmaDa: "beviser", glossEn: "prove", register: "academic", intensity: 5, fitsContext: false, constraintEn: "Too categorical for preliminary measurements." },
      { id: "syn-show-viser", lemmaDa: "viser", glossEn: "show", register: "neutral", intensity: 3, fitsContext: false, constraintEn: "Less calibrated than the requested cautious relation." },
      { id: "syn-show-afslører", lemmaDa: "afslører", glossEn: "reveal", register: "journalistic", intensity: 4, fitsContext: false, constraintEn: "Suggests hidden truth dramatically uncovered." },
    ],
  },
  {
    id: "syn-think-tentative",
    level: "B1",
    conceptEn: "think",
    promptDa: "Vælg den mest forsigtige formulering.",
    contextDa: "Forskerne ___, at ændringen kan skyldes vejret.",
    targetRegister: "academic",
    correctCandidateId: "syn-think-formoder",
    candidates: [
      { id: "syn-think-formoder", lemmaDa: "formoder", glossEn: "assume/suppose", register: "academic", intensity: 2, fitsContext: true, constraintEn: "Marks a reasoned but unconfirmed hypothesis." },
      { id: "syn-think-ved", lemmaDa: "ved", glossEn: "know", register: "neutral", intensity: 5, fitsContext: false, constraintEn: "Claims certainty unsupported by kan skyldes." },
      { id: "syn-think-synes", lemmaDa: "synes", glossEn: "think/feel", register: "neutral", intensity: 2, fitsContext: false, constraintEn: "Frames a personal evaluation rather than a hypothesis." },
      { id: "syn-think-fabler", lemmaDa: "fabler om", glossEn: "raves/dreams about", register: "blunt", intensity: 1, fitsContext: false, constraintEn: "Dismissive and incompatible with neutral research prose." },
    ],
  },
  {
    id: "syn-problem-technical",
    level: "B1",
    conceptEn: "problem",
    promptDa: "Vælg navneordet for en konkret teknisk fejl.",
    contextDa: "Teknikeren fandt en ___ i kølesystemets ventil.",
    targetRegister: "formal",
    correctCandidateId: "syn-problem-defekt",
    candidates: [
      { id: "syn-problem-defekt", lemmaDa: "defekt", glossEn: "defect", register: "formal", intensity: 3, fitsContext: true, constraintEn: "Names a physical or technical fault in a component." },
      { id: "syn-problem-udfordring", lemmaDa: "udfordring", glossEn: "challenge", register: "bureaucratic", intensity: 2, fitsContext: false, constraintEn: "Euphemistic and too broad for a broken valve." },
      { id: "syn-problem-dilemma", lemmaDa: "dilemma", glossEn: "dilemma", register: "formal", intensity: 3, fitsContext: false, constraintEn: "Requires a difficult choice between alternatives." },
      { id: "syn-problem-bøvl", lemmaDa: "bøvl", glossEn: "hassle", register: "informal", intensity: 2, fitsContext: false, constraintEn: "Too colloquial and not component-specific." },
    ],
  },
  {
    id: "syn-fast-decision",
    level: "B2",
    conceptEn: "fast",
    promptDa: "Vælg adverbiet, der roser en beslutning uden at kalde den forhastet.",
    contextDa: "Beredskabet reagerede ___ og lukkede tunnelen på to minutter.",
    targetRegister: "formal",
    correctCandidateId: "syn-fast-prompte",
    candidates: [
      { id: "syn-fast-prompte", lemmaDa: "prompte", glossEn: "promptly", register: "formal", intensity: 3, fitsContext: true, constraintEn: "Praises timely, appropriate action." },
      { id: "syn-fast-hastigt", lemmaDa: "hastigt", glossEn: "rapidly", register: "neutral", intensity: 3, fitsContext: false, constraintEn: "Focuses only on speed and can imply haste." },
      { id: "syn-fast-forhastet", lemmaDa: "forhastet", glossEn: "rashly", register: "neutral", intensity: 4, fitsContext: false, constraintEn: "Explicitly criticizes insufficient consideration." },
      { id: "syn-fast-lyn", lemmaDa: "lynende hurtigt", glossEn: "lightning-fast", register: "informal", intensity: 5, fitsContext: false, constraintEn: "Too vivid for an official emergency report." },
    ],
  },
  {
    id: "syn-refuse-polite",
    level: "B1",
    conceptEn: "refuse",
    promptDa: "Vælg det høflige verbum i afslaget.",
    contextDa: "Tak for tilbuddet, men vi må desværre ___ invitationen.",
    targetRegister: "formal",
    correctCandidateId: "syn-refuse-afslå",
    candidates: [
      { id: "syn-refuse-afslå", lemmaDa: "afslå", glossEn: "decline", register: "formal", intensity: 2, fitsContext: true, constraintEn: "Conventional polite refusal of an invitation." },
      { id: "syn-refuse-nægte", lemmaDa: "nægte", glossEn: "refuse/deny", register: "neutral", intensity: 4, fitsContext: false, constraintEn: "Sounds confrontational and normally takes an action clause." },
      { id: "syn-refuse-afvise", lemmaDa: "afvise", glossEn: "reject", register: "formal", intensity: 3, fitsContext: false, constraintEn: "More categorical and often used for proposals or claims." },
      { id: "syn-refuse-droppe", lemmaDa: "droppe", glossEn: "ditch", register: "informal", intensity: 3, fitsContext: false, constraintEn: "Too casual and not a courteous reply." },
    ],
  },
] as const satisfies readonly SynonymGroup[];

const nuanceScales = [
  {
    id: "scale-anger",
    level: "A2+",
    axisEn: "anger",
    promptDa: "Sæt ordene fra mild irritation til voldsom vrede.",
    entries: [
      { termDa: "irriteret", glossEn: "annoyed", strength: 1, usageDa: "Jeg er lidt irriteret over ventetiden." },
      { termDa: "vred", glossEn: "angry", strength: 2, usageDa: "Hun blev vred over den skjulte regning." },
      { termDa: "rasende", glossEn: "furious", strength: 4, usageDa: "Kunden var rasende efter den tredje fejl." },
      { termDa: "ude af sig selv af vrede", glossEn: "beside oneself with anger", strength: 5, usageDa: "Han var ude af sig selv af vrede." },
    ],
  },
  {
    id: "scale-certainty",
    level: "B1",
    axisEn: "certainty",
    promptDa: "Sæt markørerne fra størst usikkerhed til størst sikkerhed.",
    entries: [
      { termDa: "muligvis", glossEn: "possibly", strength: 1, usageDa: "Fejlen skyldes muligvis fugt." },
      { termDa: "sandsynligvis", glossEn: "probably", strength: 2, usageDa: "Toget kommer sandsynligvis til tiden." },
      { termDa: "næsten sikkert", glossEn: "almost certainly", strength: 4, usageDa: "Ventilen er næsten sikkert årsagen." },
      { termDa: "uden tvivl", glossEn: "without doubt", strength: 5, usageDa: "Det er uden tvivl den bedste måling." },
    ],
  },
  {
    id: "scale-fear",
    level: "A2+",
    axisEn: "fear",
    promptDa: "Sæt ordene fra mild uro til ekstrem frygt.",
    entries: [
      { termDa: "urolig", glossEn: "uneasy", strength: 1, usageDa: "Hun blev urolig, da lyset blinkede." },
      { termDa: "bange", glossEn: "afraid", strength: 2, usageDa: "Barnet er bange for hunden." },
      { termDa: "rædselsslagen", glossEn: "terrified", strength: 4, usageDa: "Vidnet stod rædselsslagen i døren." },
      { termDa: "panisk", glossEn: "panicked", strength: 5, usageDa: "Folk løb panisk mod udgangen." },
    ],
  },
  {
    id: "scale-importance",
    level: "B1",
    axisEn: "importance",
    promptDa: "Sæt ordene fra lav til afgørende betydning.",
    entries: [
      { termDa: "mindre", glossEn: "minor", strength: 1, usageDa: "Det er en mindre detalje." },
      { termDa: "væsentlig", glossEn: "significant", strength: 2, usageDa: "Rapporten har en væsentlig mangel." },
      { termDa: "kritisk", glossEn: "critical", strength: 4, usageDa: "Strømmen er kritisk for hospitalet." },
      { termDa: "altafgørende", glossEn: "absolutely decisive", strength: 5, usageDa: "Rent vand er altafgørende for driften." },
    ],
  },
  {
    id: "scale-criticism",
    level: "B2",
    axisEn: "critical force",
    promptDa: "Sæt formuleringerne fra afdæmpet til knusende kritik.",
    entries: [
      { termDa: "forbeholden", glossEn: "reserved", strength: 1, usageDa: "Udvalget er forbeholdent over for planen." },
      { termDa: "kritisk", glossEn: "critical", strength: 2, usageDa: "Revisoren er kritisk over for metoden." },
      { termDa: "skarpt afvisende", glossEn: "sharply dismissive", strength: 4, usageDa: "Fagfolk er skarpt afvisende." },
      { termDa: "sønderlemmende", glossEn: "devastating", strength: 5, usageDa: "Rapporten leverer en sønderlemmende kritik." },
    ],
  },
  {
    id: "scale-agreement",
    level: "B1",
    axisEn: "agreement",
    promptDa: "Sæt udtrykkene fra delvis til fuld enighed.",
    entries: [
      { termDa: "kan følge noget af", glossEn: "can accept part of", strength: 1, usageDa: "Jeg kan følge noget af argumentet." },
      { termDa: "er overvejende enig", glossEn: "mostly agrees", strength: 2, usageDa: "Rådet er overvejende enig i analysen." },
      { termDa: "tilslutter sig", glossEn: "endorses", strength: 4, usageDa: "Flertallet tilslutter sig forslaget." },
      { termDa: "bakker fuldt op", glossEn: "fully supports", strength: 5, usageDa: "Bestyrelsen bakker fuldt op om planen." },
    ],
  },
  {
    id: "scale-speed",
    level: "A2+",
    axisEn: "speed",
    promptDa: "Sæt bevægelserne fra langsom til ekstremt hurtig.",
    entries: [
      { termDa: "langsom", glossEn: "slow", strength: 1, usageDa: "Bussen kørte langsomt i sneen." },
      { termDa: "rask", glossEn: "brisk", strength: 2, usageDa: "De gik i rask tempo." },
      { termDa: "hurtig", glossEn: "fast", strength: 3, usageDa: "Hun fandt en hurtig løsning." },
      { termDa: "lynhurtig", glossEn: "lightning-fast", strength: 5, usageDa: "Systemet gav et lynhurtigt svar." },
    ],
  },
  {
    id: "scale-noise",
    level: "A2+",
    axisEn: "loudness",
    promptDa: "Sæt lydene fra næsten uhørlig til øredøvende.",
    entries: [
      { termDa: "svag", glossEn: "faint", strength: 1, usageDa: "En svag lyd kom fra røret." },
      { termDa: "tydelig", glossEn: "clearly audible", strength: 2, usageDa: "Alarmen var tydelig i gangen." },
      { termDa: "høj", glossEn: "loud", strength: 3, usageDa: "Musikken var for høj." },
      { termDa: "øredøvende", glossEn: "deafening", strength: 5, usageDa: "Eksplosionen var øredøvende." },
    ],
  },
  {
    id: "scale-damage",
    level: "B1",
    axisEn: "severity of damage",
    promptDa: "Sæt skaderne fra ubetydelige til uoprettelige.",
    entries: [
      { termDa: "kosmetisk", glossEn: "cosmetic", strength: 1, usageDa: "Bulen er kun kosmetisk." },
      { termDa: "mærkbar", glossEn: "noticeable", strength: 2, usageDa: "Motoren har en mærkbar skade." },
      { termDa: "alvorlig", glossEn: "serious", strength: 4, usageDa: "Branden gav alvorlige skader." },
      { termDa: "uoprettelig", glossEn: "irreparable", strength: 5, usageDa: "Originalfilen fik uoprettelig skade." },
    ],
  },
  {
    id: "scale-honesty",
    level: "B2",
    axisEn: "distance from truth",
    promptDa: "Sæt beskrivelserne fra upræcis til bevidst løgnagtig.",
    entries: [
      { termDa: "upræcis", glossEn: "imprecise", strength: 1, usageDa: "Svaret er upræcist, men ikke falsk." },
      { termDa: "misvisende", glossEn: "misleading", strength: 2, usageDa: "Grafen er teknisk korrekt, men misvisende." },
      { termDa: "vildledende", glossEn: "deceptive", strength: 4, usageDa: "Reklamen er bevidst vildledende." },
      { termDa: "løgnagtig", glossEn: "mendacious", strength: 5, usageDa: "Forklaringen var gennemført løgnagtig." },
    ],
  },
  {
    id: "scale-tiredness",
    level: "A2+",
    axisEn: "tiredness",
    promptDa: "Sæt ordene fra let træt til helt uden kræfter.",
    entries: [
      { termDa: "træt", glossEn: "tired", strength: 1, usageDa: "Jeg er lidt træt efter turen." },
      { termDa: "udmattet", glossEn: "exhausted", strength: 3, usageDa: "Holdet var udmattet efter vagten." },
      { termDa: "drænet", glossEn: "drained", strength: 4, usageDa: "Hun følte sig mentalt drænet." },
      { termDa: "fuldstændig færdig", glossEn: "completely spent", strength: 5, usageDa: "Efter stormen var vi fuldstændig færdige." },
    ],
  },
  {
    id: "scale-heat",
    level: "A2+",
    axisEn: "heat",
    promptDa: "Sæt temperaturordene fra mild varme til farlig varme.",
    entries: [
      { termDa: "lun", glossEn: "lukewarm", strength: 1, usageDa: "Suppen er kun lun." },
      { termDa: "varm", glossEn: "warm/hot", strength: 2, usageDa: "Motoren er varm." },
      { termDa: "hed", glossEn: "very hot", strength: 4, usageDa: "Luften fra ventilen er hed." },
      { termDa: "brændende", glossEn: "scorching", strength: 5, usageDa: "Metallet er brændende varmt." },
    ],
  },
  {
    id: "scale-risk",
    level: "B2",
    axisEn: "risk",
    promptDa: "Sæt risikovurderingerne fra begrænset til akut.",
    entries: [
      { termDa: "begrænset", glossEn: "limited", strength: 1, usageDa: "Der er en begrænset risiko for lækage." },
      { termDa: "betydelig", glossEn: "substantial", strength: 2, usageDa: "Fejlen giver en betydelig risiko." },
      { termDa: "alvorlig", glossEn: "serious", strength: 4, usageDa: "Broen udgør en alvorlig risiko." },
      { termDa: "overhængende", glossEn: "imminent", strength: 5, usageDa: "Der er overhængende fare for kollaps." },
    ],
  },
  {
    id: "scale-suspicion",
    level: "B1",
    axisEn: "suspicion",
    promptDa: "Sæt udtrykkene fra en svag anelse til stærk mistanke.",
    entries: [
      { termDa: "en anelse", glossEn: "a hunch", strength: 1, usageDa: "Jeg har en anelse om, at noget mangler." },
      { termDa: "en formodning", glossEn: "a supposition", strength: 2, usageDa: "Politiet arbejder ud fra en formodning." },
      { termDa: "en begrundet mistanke", glossEn: "reasonable suspicion", strength: 4, usageDa: "Kvitteringen skaber en begrundet mistanke." },
      { termDa: "en stærk mistanke", glossEn: "strong suspicion", strength: 5, usageDa: "Loggen giver en stærk mistanke om svindel." },
    ],
  },
  {
    id: "scale-praise",
    level: "B2",
    axisEn: "praise",
    promptDa: "Sæt vurderingerne fra forsigtig ros til begejstring.",
    entries: [
      { termDa: "fornuftig", glossEn: "sensible", strength: 1, usageDa: "Det er en fornuftig løsning." },
      { termDa: "vellykket", glossEn: "successful", strength: 2, usageDa: "Forsøget var vellykket." },
      { termDa: "imponerende", glossEn: "impressive", strength: 4, usageDa: "Resultatet er imponerende." },
      { termDa: "fremragende", glossEn: "outstanding", strength: 5, usageDa: "Det er et fremragende stykke arbejde." },
    ],
  },
] as const satisfies readonly NuanceScale[];

const collocations = [
  { id: "col-traeffe-beslutning", level: "A2+", verbDa: "træffe", nounPhraseDa: "en beslutning", phraseDa: "træffe en beslutning", glossEn: "make a decision", contextDa: "Udvalget skal ___ en beslutning i dag.", distractorVerbsDa: ["lave", "bygge", "slå"] },
  { id: "col-begaa-fejl", level: "A2+", verbDa: "begå", nounPhraseDa: "en fejl", phraseDa: "begå en fejl", glossEn: "make a mistake", contextDa: "Alle kan ___ en fejl under pres.", distractorVerbsDa: ["gøre", "skabe", "holde"] },
  { id: "col-stille-spoergsmaal", level: "A2+", verbDa: "stille", nounPhraseDa: "et spørgsmål", phraseDa: "stille et spørgsmål", glossEn: "ask a question", contextDa: "Må jeg ___ et spørgsmål om prisen?", distractorVerbsDa: ["sætte", "give", "tage"] },
  { id: "col-tage-ansvar", level: "A2+", verbDa: "tage", nounPhraseDa: "ansvar", phraseDa: "tage ansvar", glossEn: "take responsibility", contextDa: "Lederen må ___ ansvar for fejlen.", distractorVerbsDa: ["holde", "gribe", "føre"] },
  { id: "col-holde-tale", level: "A2+", verbDa: "holde", nounPhraseDa: "en tale", phraseDa: "holde en tale", glossEn: "give a speech", contextDa: "Borgmesteren skal ___ en tale ved åbningen.", distractorVerbsDa: ["gøre", "sige", "sætte"] },
  { id: "col-indgaa-aftale", level: "B1", verbDa: "indgå", nounPhraseDa: "en aftale", phraseDa: "indgå en aftale", glossEn: "enter into an agreement", contextDa: "Parterne vil ___ en aftale om levering.", distractorVerbsDa: ["komme", "skrive", "gå"] },
  { id: "col-rejse-kritik", level: "B1", verbDa: "rejse", nounPhraseDa: "kritik", phraseDa: "rejse kritik", glossEn: "raise criticism", contextDa: "Flere eksperter kan ___ kritik af beregningen.", distractorVerbsDa: ["løfte", "sætte", "give"] },
  { id: "col-udgoere-risiko", level: "B1", verbDa: "udgøre", nounPhraseDa: "en risiko", phraseDa: "udgøre en risiko", glossEn: "pose a risk", contextDa: "Den løse ledning kan ___ en risiko.", distractorVerbsDa: ["gøre", "sætte", "have"] },
  { id: "col-laegge-pres", level: "B1", verbDa: "lægge", nounPhraseDa: "pres på", phraseDa: "lægge pres på", glossEn: "put pressure on", contextDa: "Fristen vil ___ pres på holdet.", distractorVerbsDa: ["stille", "sætte", "holde"] },
  { id: "col-skabe-praecedens", level: "B2", verbDa: "skabe", nounPhraseDa: "præcedens", phraseDa: "skabe præcedens", glossEn: "set a precedent", contextDa: "Dommen kan ___ præcedens for kommende sager.", distractorVerbsDa: ["bygge", "føre", "holde"] },
  { id: "col-foretage-vurdering", level: "B1", verbDa: "foretage", nounPhraseDa: "en vurdering", phraseDa: "foretage en vurdering", glossEn: "carry out an assessment", contextDa: "En ingeniør skal ___ en vurdering af broen.", distractorVerbsDa: ["lave", "drive", "tage"] },
  { id: "col-ivaerksaette-undersoegelse", level: "B2", verbDa: "iværksætte", nounPhraseDa: "en undersøgelse", phraseDa: "iværksætte en undersøgelse", glossEn: "launch an investigation", contextDa: "Styrelsen vil ___ en undersøgelse af sagen.", distractorVerbsDa: ["starte op", "sætte", "bygge"] },
  { id: "col-drage-konklusion", level: "B1", verbDa: "drage", nounPhraseDa: "en konklusion", phraseDa: "drage en konklusion", glossEn: "draw a conclusion", contextDa: "Vi kan ikke ___ en konklusion ud fra ét forsøg.", distractorVerbsDa: ["tage", "hente", "skrive"] },
  { id: "col-foere-bevis", level: "B2", verbDa: "føre", nounPhraseDa: "bevis", phraseDa: "føre bevis", glossEn: "provide proof", contextDa: "Anklageren skal ___ bevis for påstanden.", distractorVerbsDa: ["køre", "vise", "tage"] },
  { id: "col-tage-forbehold", level: "B1", verbDa: "tage", nounPhraseDa: "forbehold", phraseDa: "tage forbehold", glossEn: "make a reservation/caveat", contextDa: "Rapporten må ___ for små datamængder.", distractorVerbsDa: ["holde", "give", "sætte"] },
  { id: "col-yde-hjaelp", level: "B1", verbDa: "yde", nounPhraseDa: "hjælp", phraseDa: "yde hjælp", glossEn: "provide assistance", contextDa: "Frivillige kan ___ hjælp ved stationen.", distractorVerbsDa: ["lave", "sætte", "bygge"] },
  { id: "col-opnaa-resultat", level: "A2+", verbDa: "opnå", nounPhraseDa: "et resultat", phraseDa: "opnå et resultat", glossEn: "achieve a result", contextDa: "Holdet håber at ___ et bedre resultat.", distractorVerbsDa: ["få frem", "tage", "føre"] },
  { id: "col-rejse-tvivl", level: "B2", verbDa: "rejse", nounPhraseDa: "tvivl", phraseDa: "rejse tvivl", glossEn: "raise doubt", contextDa: "Den manglende log kan ___ tvivl om forklaringen.", distractorVerbsDa: ["løfte", "give", "bygge"] },
  { id: "col-vaekke-mistanke", level: "B1", verbDa: "vække", nounPhraseDa: "mistanke", phraseDa: "vække mistanke", glossEn: "arouse suspicion", contextDa: "De slettede mails kan ___ mistanke.", distractorVerbsDa: ["rejse op", "åbne", "kalde"] },
  { id: "col-skabe-overblik", level: "A2+", verbDa: "skabe", nounPhraseDa: "overblik", phraseDa: "skabe overblik", glossEn: "create an overview", contextDa: "En tidslinje kan ___ overblik over sagen.", distractorVerbsDa: ["bygge", "se", "tage"] },
  { id: "col-goere-fremskridt", level: "A2+", verbDa: "gøre", nounPhraseDa: "fremskridt", phraseDa: "gøre fremskridt", glossEn: "make progress", contextDa: "Eleven begynder at ___ fremskridt.", distractorVerbsDa: ["lave", "skabe", "tage"] },
  { id: "col-tage-initiativ", level: "B1", verbDa: "tage", nounPhraseDa: "initiativ", phraseDa: "tage initiativ", glossEn: "take initiative", contextDa: "Nogen må ___ initiativ til et nyt møde.", distractorVerbsDa: ["gribe", "føre", "holde"] },
  { id: "col-afgive-forklaring", level: "B1", verbDa: "afgive", nounPhraseDa: "forklaring", phraseDa: "afgive forklaring", glossEn: "give testimony/an account", contextDa: "Vidnet skal ___ forklaring på stationen.", distractorVerbsDa: ["lave", "sige", "tage"] },
  { id: "col-fremsaette-paastand", level: "B2", verbDa: "fremsætte", nounPhraseDa: "en påstand", phraseDa: "fremsætte en påstand", glossEn: "make a claim", contextDa: "Rapporten kan ___ en påstand uden kilde.", distractorVerbsDa: ["sætte frem", "give", "tage"] },
  { id: "col-indgive-klage", level: "B1", verbDa: "indgive", nounPhraseDa: "en klage", phraseDa: "indgive en klage", glossEn: "file a complaint", contextDa: "Borgeren vil ___ en klage digitalt.", distractorVerbsDa: ["levere", "sætte", "skrive ind"] },
  { id: "col-opfylde-krav", level: "B1", verbDa: "opfylde", nounPhraseDa: "et krav", phraseDa: "opfylde et krav", glossEn: "meet a requirement", contextDa: "Udstyret skal ___ alle sikkerhedskrav.", distractorVerbsDa: ["fylde", "holde", "tage"] },
  { id: "col-overholde-frist", level: "B1", verbDa: "overholde", nounPhraseDa: "en frist", phraseDa: "overholde en frist", glossEn: "meet a deadline", contextDa: "Leverandøren kunne ikke ___ fristen.", distractorVerbsDa: ["holde over", "nå op", "tage"] },
  { id: "col-udoeve-pres", level: "B2", verbDa: "udøve", nounPhraseDa: "pres", phraseDa: "udøve pres", glossEn: "exert pressure", contextDa: "Lobbygruppen forsøgte at ___ pres på rådet.", distractorVerbsDa: ["gøre", "drive", "tage"] },
  { id: "col-vaekke-opsigt", level: "B1", verbDa: "vække", nounPhraseDa: "opsigt", phraseDa: "vække opsigt", glossEn: "attract attention", contextDa: "Den bizarre annonce vil ___ opsigt.", distractorVerbsDa: ["åbne", "rejse", "lave"] },
  { id: "col-lide-tab", level: "B1", verbDa: "lide", nounPhraseDa: "et tab", phraseDa: "lide et tab", glossEn: "suffer a loss", contextDa: "Firmaet kan ___ et stort tab.", distractorVerbsDa: ["have ondt", "få", "tage"] },
  { id: "col-indgaa-kompromis", level: "B1", verbDa: "indgå", nounPhraseDa: "et kompromis", phraseDa: "indgå et kompromis", glossEn: "reach a compromise", contextDa: "Begge sider må ___ et kompromis.", distractorVerbsDa: ["gå ind", "tage", "bygge"] },
  { id: "col-holde-loefte", level: "A2+", verbDa: "holde", nounPhraseDa: "et løfte", phraseDa: "holde et løfte", glossEn: "keep a promise", contextDa: "Du skal ___ dit løfte til hende.", distractorVerbsDa: ["bære", "tage", "sætte"] },
  { id: "col-tage-hensyn", level: "A2+", verbDa: "tage", nounPhraseDa: "hensyn", phraseDa: "tage hensyn", glossEn: "take into account/show consideration", contextDa: "Planen skal ___ hensyn til naboerne.", distractorVerbsDa: ["give", "holde", "se"] },
  { id: "col-rette-henvendelse", level: "B2", verbDa: "rette", nounPhraseDa: "henvendelse", phraseDa: "rette henvendelse", glossEn: "address an inquiry", contextDa: "Du kan ___ henvendelse til sekretariatet.", distractorVerbsDa: ["sætte", "gøre", "sende"] },
  { id: "col-bringe-orden", level: "B1", verbDa: "bringe", nounPhraseDa: "orden", phraseDa: "bringe orden", glossEn: "bring order", contextDa: "Den nye log skal ___ orden i arkivet.", distractorVerbsDa: ["tage", "føre", "lave"] },
  { id: "col-foere-tilsyn", level: "B2", verbDa: "føre", nounPhraseDa: "tilsyn", phraseDa: "føre tilsyn", glossEn: "supervise/inspect", contextDa: "Styrelsen skal ___ tilsyn med anlægget.", distractorVerbsDa: ["holde", "tage", "lave"] },
  { id: "col-skabe-tillid", level: "A2+", verbDa: "skabe", nounPhraseDa: "tillid", phraseDa: "skabe tillid", glossEn: "build trust", contextDa: "Åbenhed kan ___ tillid mellem parterne.", distractorVerbsDa: ["bygge op", "tage", "føre"] },
  { id: "col-danne-grundlag", level: "B1", verbDa: "danne", nounPhraseDa: "grundlag", phraseDa: "danne grundlag", glossEn: "form the basis", contextDa: "Målingerne skal ___ grundlag for beslutningen.", distractorVerbsDa: ["bygge", "lave", "holde"] },
  { id: "col-naa-enighed", level: "A2+", verbDa: "nå", nounPhraseDa: "enighed", phraseDa: "nå enighed", glossEn: "reach agreement", contextDa: "Parterne håber at ___ enighed før fredag.", distractorVerbsDa: ["komme", "tage", "holde"] },
  { id: "col-fatte-mistanke", level: "B2", verbDa: "fatte", nounPhraseDa: "mistanke", phraseDa: "fatte mistanke", glossEn: "become suspicious", contextDa: "Revisoren begyndte at ___ mistanke efter opkaldet.", distractorVerbsDa: ["tage", "bygge", "gribe"] },
] as const satisfies readonly VerbNounCollocation[];

const governedPrepositions = [
  { id: "prep-afhaengig-af", level: "A2+", headDa: "afhængig", headKind: "adjective", prepositionDa: "af", exampleDa: "Planen er afhængig af godt vejr.", glossEn: "dependent on", distractorsDa: ["på", "til", "med"] },
  { id: "prep-interesseret-i", level: "A2+", headDa: "interesseret", headKind: "adjective", prepositionDa: "i", exampleDa: "Hun er interesseret i fysik.", glossEn: "interested in", distractorsDa: ["på", "for", "af"] },
  { id: "prep-ansvarlig-for", level: "A2+", headDa: "ansvarlig", headKind: "adjective", prepositionDa: "for", exampleDa: "Han er ansvarlig for sikkerheden.", glossEn: "responsible for", distractorsDa: ["af", "på", "til"] },
  { id: "prep-tilfreds-med", level: "A2+", headDa: "tilfreds", headKind: "adjective", prepositionDa: "med", exampleDa: "Kunden er tilfreds med løsningen.", glossEn: "satisfied with", distractorsDa: ["af", "for", "over"] },
  { id: "prep-god-til", level: "A2+", headDa: "god", headKind: "adjective", prepositionDa: "til", exampleDa: "Maja er god til at forklare regler.", glossEn: "good at", distractorsDa: ["på", "for", "med"] },
  { id: "prep-bange-for", level: "A2+", headDa: "bange", headKind: "adjective", prepositionDa: "for", exampleDa: "Han er bange for at miste jobbet.", glossEn: "afraid of", distractorsDa: ["af", "på", "mod"] },
  { id: "prep-sikker-paa", level: "A2+", headDa: "sikker", headKind: "adjective", prepositionDa: "på", exampleDa: "Er du sikker på resultatet?", glossEn: "sure of", distractorsDa: ["om", "af", "for"] },
  { id: "prep-stolt-af", level: "A2+", headDa: "stolt", headKind: "adjective", prepositionDa: "af", exampleDa: "Hun er stolt af sit arbejde.", glossEn: "proud of", distractorsDa: ["over", "på", "for"] },
  { id: "prep-enig-i", level: "B1", headDa: "enig", headKind: "adjective", prepositionDa: "i", exampleDa: "Vi er enige i konklusionen.", glossEn: "agree with a point", distractorsDa: ["på", "om", "for"] },
  { id: "prep-deltage-i", level: "A2+", headDa: "deltage", headKind: "verb", prepositionDa: "i", exampleDa: "De deltager i mødet online.", glossEn: "participate in", distractorsDa: ["på", "til", "med"] },
  { id: "prep-bestaa-af", level: "A2+", headDa: "bestå", headKind: "verb", prepositionDa: "af", exampleDa: "Panelet består af tre eksperter.", glossEn: "consist of", distractorsDa: ["med", "fra", "i"] },
  { id: "prep-hoere-til", level: "A2+", headDa: "høre", headKind: "verb", prepositionDa: "til", exampleDa: "Nøglen hører til serverrummet.", glossEn: "belong to", distractorsDa: ["på", "for", "af"] },
  { id: "prep-vente-paa", level: "A2+", headDa: "vente", headKind: "verb", prepositionDa: "på", exampleDa: "Vi venter på den sidste måling.", glossEn: "wait for", distractorsDa: ["for", "til", "efter"] },
  { id: "prep-taenke-paa", level: "A2+", headDa: "tænke", headKind: "verb", prepositionDa: "på", exampleDa: "Husk at tænke på konsekvenserne.", glossEn: "think about", distractorsDa: ["om", "for", "til"] },
  { id: "prep-stole-paa", level: "B1", headDa: "stole", headKind: "verb", prepositionDa: "på", exampleDa: "Vi kan ikke stole på en ukendt kilde.", glossEn: "rely on/trust", distractorsDa: ["til", "med", "af"] },
  { id: "prep-soerge-for", level: "A2+", headDa: "sørge", headKind: "verb", prepositionDa: "for", exampleDa: "Sørg for, at døren er låst.", glossEn: "make sure/provide for", distractorsDa: ["om", "på", "til"] },
  { id: "prep-bidrage-til", level: "B1", headDa: "bidrage", headKind: "verb", prepositionDa: "til", exampleDa: "Fejlen bidrog til forsinkelsen.", glossEn: "contribute to", distractorsDa: ["for", "med", "på"] },
  { id: "prep-ansoeg-om", level: "B1", headDa: "ansøge", headKind: "verb", prepositionDa: "om", exampleDa: "Hun vil ansøge om støtte.", glossEn: "apply for", distractorsDa: ["for", "på", "til"] },
  { id: "prep-beskytte-mod", level: "B1", headDa: "beskytte", headKind: "verb", prepositionDa: "mod", exampleDa: "Filteret beskytter systemet mod støv.", glossEn: "protect against", distractorsDa: ["fra", "for", "af"] },
  { id: "prep-advare-mod", level: "B1", headDa: "advare", headKind: "verb", prepositionDa: "mod", exampleDa: "Rapporten advarer mod hurtige konklusioner.", glossEn: "warn against", distractorsDa: ["om", "for", "af"] },
  { id: "prep-henvise-til", level: "B1", headDa: "henvise", headKind: "verb", prepositionDa: "til", exampleDa: "Notatet henviser til bilag fire.", glossEn: "refer to", distractorsDa: ["på", "for", "mod"] },
  { id: "prep-insistere-paa", level: "B1", headDa: "insistere", headKind: "verb", prepositionDa: "på", exampleDa: "Chefen insisterer på en ny kontrol.", glossEn: "insist on", distractorsDa: ["om", "for", "til"] },
  { id: "prep-reagere-paa", level: "A2+", headDa: "reagere", headKind: "verb", prepositionDa: "på", exampleDa: "Sensoren reagerer på varme.", glossEn: "react to", distractorsDa: ["mod", "til", "for"] },
  { id: "prep-fokusere-paa", level: "B1", headDa: "fokusere", headKind: "verb", prepositionDa: "på", exampleDa: "Analysen fokuserer på de seneste fejl.", glossEn: "focus on", distractorsDa: ["i", "til", "om"] },
  { id: "prep-beskaeftige-med", level: "B2", headDa: "beskæftige sig", headKind: "verb", prepositionDa: "med", exampleDa: "Udvalget beskæftiger sig med datasikkerhed.", glossEn: "deal with", distractorsDa: ["om", "på", "i"] },
  { id: "prep-tvivle-paa", level: "B1", headDa: "tvivle", headKind: "verb", prepositionDa: "på", exampleDa: "Revisoren tvivler på vidnets forklaring.", glossEn: "doubt", distractorsDa: ["om", "af", "til"] },
  { id: "prep-anklage-for", level: "B1", headDa: "anklage", headKind: "verb", prepositionDa: "for", exampleDa: "Hun blev anklaget for dokumentfalsk.", glossEn: "accuse of", distractorsDa: ["om", "af", "på"] },
  { id: "prep-forhindre-i", level: "B2", headDa: "forhindre", headKind: "verb", prepositionDa: "i", exampleDa: "Støjen forhindrede ham i at høre alarmen.", glossEn: "prevent from", distractorsDa: ["fra", "for", "med"] },
  { id: "prep-minde-om", level: "A2+", headDa: "minde", headKind: "verb", prepositionDa: "om", exampleDa: "Lugten minder mig om havnen.", glossEn: "remind of", distractorsDa: ["på", "for", "af"] },
  { id: "prep-skelne-mellem", level: "B2", headDa: "skelne", headKind: "verb", prepositionDa: "mellem", exampleDa: "Modellen kan skelne mellem støj og signal.", glossEn: "distinguish between", distractorsDa: ["blandt", "fra", "mod"] },
  { id: "prep-adgang-til", level: "B1", headDa: "adgang", headKind: "noun", prepositionDa: "til", exampleDa: "Kun vagter har adgang til arkivet.", glossEn: "access to", distractorsDa: ["på", "for", "i"] },
  { id: "prep-behov-for", level: "A2+", headDa: "behov", headKind: "noun", prepositionDa: "for", exampleDa: "Der er behov for en ekstra måling.", glossEn: "need for", distractorsDa: ["af", "til", "på"] },
  { id: "prep-grund-til", level: "B1", headDa: "grund", headKind: "noun", prepositionDa: "til", exampleDa: "Der er grund til at undersøge loggen.", glossEn: "reason to", distractorsDa: ["for", "på", "af"] },
  { id: "prep-tvivl-om", level: "B1", headDa: "tvivl", headKind: "noun", prepositionDa: "om", exampleDa: "Der er tvivl om målingens præcision.", glossEn: "doubt about", distractorsDa: ["på", "for", "af"] },
  { id: "prep-respekt-for", level: "A2+", headDa: "respekt", headKind: "noun", prepositionDa: "for", exampleDa: "Hun har respekt for kollegernes erfaring.", glossEn: "respect for", distractorsDa: ["af", "til", "mod"] },
] as const satisfies readonly GovernedPreposition[];

const falseFriends = [
  { id: "false-eventuelt", level: "A2+", danishDa: "eventuelt", temptingEnglish: "eventually", meaningEn: "possibly; if relevant", trapEn: "Eventually is til sidst or efterhånden.", exampleDa: "Tag eventuelt en paraply med." },
  { id: "false-aktuel", level: "A2+", danishDa: "aktuel", temptingEnglish: "actual", meaningEn: "current; topical", trapEn: "Actual is faktisk or reel.", exampleDa: "Den aktuelle pris står på skiltet." },
  { id: "false-rolig", level: "A2+", danishDa: "rolig", temptingEnglish: "rowdy", meaningEn: "calm; quiet", trapEn: "The Danish word describes the opposite of rowdy.", exampleDa: "Havnen er rolig i aften." },
  { id: "false-frokost", level: "A2+", danishDa: "frokost", temptingEnglish: "breakfast", meaningEn: "lunch", trapEn: "Breakfast is morgenmad.", exampleDa: "Vi spiser frokost klokken tolv." },
  { id: "false-gift", level: "A2+", danishDa: "gift", temptingEnglish: "gift", meaningEn: "married; poison", trapEn: "A present is en gave.", exampleDa: "Hun er gift, og flasken indeholder gift." },
  { id: "false-chef", level: "A2+", danishDa: "chef", temptingEnglish: "chef", meaningEn: "boss; manager", trapEn: "A professional cook is en kok or køkkenchef.", exampleDa: "Min chef godkendte ferien." },
  { id: "false-kontor", level: "A2+", danishDa: "kontor", temptingEnglish: "counter", meaningEn: "office", trapEn: "A shop counter is en disk.", exampleDa: "Hun arbejder på et lille kontor." },
  { id: "false-karakter", level: "B1", danishDa: "karakter", temptingEnglish: "character only", meaningEn: "grade; character trait; fictional character", trapEn: "In school contexts it normally means a grade.", exampleDa: "Han fik en høj karakter i fysik." },
  { id: "false-sympatisk", level: "B1", danishDa: "sympatisk", temptingEnglish: "sympathetic", meaningEn: "likeable; pleasant", trapEn: "Sympathetic in the compassionate sense is medfølende.", exampleDa: "Den nye nabo virker sympatisk." },
  { id: "false-genert", level: "A2+", danishDa: "genert", temptingEnglish: "generous", meaningEn: "shy", trapEn: "Generous is gavmild.", exampleDa: "Barnet er genert blandt fremmede." },
  { id: "false-kost", level: "B1", danishDa: "kost", temptingEnglish: "cost", meaningEn: "diet; broom; board", trapEn: "Cost as price is pris or omkostning.", exampleDa: "En sund kost kræver ikke en dyr kost." },
  { id: "false-fart", level: "A2+", danishDa: "fart", temptingEnglish: "fart", meaningEn: "speed; motion", trapEn: "The English bodily-noise meaning is en prut.", exampleDa: "Bilen havde for høj fart." },
  { id: "false-slut", level: "A2+", danishDa: "slut", temptingEnglish: "slut", meaningEn: "end; finished", trapEn: "It has no sexual insult meaning in Danish.", exampleDa: "Filmen er slut klokken ti." },
  { id: "false-sky", level: "A2+", danishDa: "sky", temptingEnglish: "sky", meaningEn: "cloud; shy", trapEn: "The sky is himlen.", exampleDa: "En mørk sky dækkede solen." },
  { id: "false-rar", level: "A2+", danishDa: "rar", temptingEnglish: "rare", meaningEn: "nice; pleasant", trapEn: "Rare is sjælden.", exampleDa: "Det var rart at møde dig." },
  { id: "false-eventyr", level: "A2+", danishDa: "eventyr", temptingEnglish: "event only", meaningEn: "fairy tale; adventure", trapEn: "An event is en begivenhed.", exampleDa: "De læste et gammelt eventyr." },
  { id: "false-artist", level: "B1", danishDa: "artist", temptingEnglish: "artist", meaningEn: "variety or circus performer", trapEn: "A visual artist is usually en kunstner.", exampleDa: "Artisten optræder i cirkusteltet." },
  { id: "false-gymnasium", level: "A2+", danishDa: "gymnasium", temptingEnglish: "gymnasium", meaningEn: "upper-secondary school", trapEn: "A sports gym is en gymnastiksal or et fitnesscenter.", exampleDa: "Hun går i gymnasiet i Roskilde." },
  { id: "false-blanket", level: "B1", danishDa: "blanket", temptingEnglish: "blanket", meaningEn: "form; official form", trapEn: "A bed blanket is et tæppe.", exampleDa: "Du skal udfylde denne blanket." },
  { id: "false-mappe", level: "A2+", danishDa: "mappe", temptingEnglish: "map", meaningEn: "folder; binder", trapEn: "A geographical map is et kort.", exampleDa: "Dokumentet ligger i den blå mappe." },
  { id: "false-praeservativ", level: "B1", danishDa: "præservativ", temptingEnglish: "preservative", meaningEn: "condom", trapEn: "A food preservative is et konserveringsmiddel.", exampleDa: "Apoteket sælger præservativer." },
  { id: "false-fabrik", level: "A2+", danishDa: "fabrik", temptingEnglish: "fabric", meaningEn: "factory", trapEn: "Fabric is stof or tekstil.", exampleDa: "Fabrikken fremstiller små motorer." },
  { id: "false-bibliotek", level: "A2+", danishDa: "bibliotek", temptingEnglish: "bibliography", meaningEn: "library", trapEn: "A bibliography is en bibliografi or litteraturliste.", exampleDa: "Bogen kan lånes på biblioteket." },
  { id: "false-kind", level: "B1", danishDa: "kind", temptingEnglish: "kind", meaningEn: "cheek", trapEn: "Kind as friendly is venlig.", exampleDa: "Hun havde et ar på venstre kind." },
  { id: "false-barn", level: "A2+", danishDa: "barn", temptingEnglish: "barn", meaningEn: "child", trapEn: "A farm barn is en lade.", exampleDa: "Hvert barn fik en refleksvest." },
  { id: "false-skade", level: "A2+", danishDa: "skade", temptingEnglish: "skate", meaningEn: "damage; injury; harm", trapEn: "To skate is at skøjte.", exampleDa: "Cyklen fik en mindre skade." },
  { id: "false-ret", level: "B1", danishDa: "ret", temptingEnglish: "retreat", meaningEn: "right; court; dish; quite", trapEn: "Its meaning depends strongly on syntax and gender.", exampleDa: "Du har ret til en varm ret efter retten." },
  { id: "false-time", level: "A2+", danishDa: "time", temptingEnglish: "time in general", meaningEn: "hour; lesson; appointment slot", trapEn: "Time as an abstract concept is tid.", exampleDa: "Vi har en times dansk i morgen." },
  { id: "false-grine", level: "A2+", danishDa: "grine", temptingEnglish: "grin only", meaningEn: "laugh", trapEn: "It covers ordinary laughing, not only grinning.", exampleDa: "De begyndte at grine af den dumme vittighed." },
  { id: "false-morgen", level: "A2+", danishDa: "morgen", temptingEnglish: "morning only", meaningEn: "morning; tomorrow in i morgen", trapEn: "The phrase i morgen means tomorrow, not in the morning.", exampleDa: "Vi mødes i morgen tidlig." },
] as const satisfies readonly FalseFriend[];

const compoundPatterns = [
  { id: "cmp-arbejdsloes", level: "B1", firstStemDa: "arbejd", linkerDa: "s", headDa: "løs", compoundDa: "arbejdsløs", glossEn: "unemployed", contextDa: "Han blev arbejdsløs efter lukningen.", morphemes: [{ textDa: "arbejd", role: "first-stem", glossEn: "work" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "løs", role: "head", glossEn: "without/free" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-sikkerhedskontrol", level: "B1", firstStemDa: "sikkerhed", linkerDa: "s", headDa: "kontrol", compoundDa: "sikkerhedskontrol", glossEn: "security check", contextDa: "Alle tasker går gennem sikkerhedskontrol.", morphemes: [{ textDa: "sikkerhed", role: "first-stem", glossEn: "security" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "kontrol", role: "head", glossEn: "check" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-frihedsberoevelse", level: "B2", firstStemDa: "frihed", linkerDa: "s", headDa: "berøvelse", compoundDa: "frihedsberøvelse", glossEn: "deprivation of liberty", contextDa: "Dommeren vurderede frihedsberøvelsen.", morphemes: [{ textDa: "frihed", role: "first-stem", glossEn: "liberty" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "berøvelse", role: "head", glossEn: "deprivation" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-kaerlighedsbrev", level: "A2+", firstStemDa: "kærlighed", linkerDa: "s", headDa: "brev", compoundDa: "kærlighedsbrev", glossEn: "love letter", contextDa: "Hun gemte et gammelt kærlighedsbrev.", morphemes: [{ textDa: "kærlighed", role: "first-stem", glossEn: "love" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "brev", role: "head", glossEn: "letter" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-virksomhedsleder", level: "B1", firstStemDa: "virksomhed", linkerDa: "s", headDa: "leder", compoundDa: "virksomhedsleder", glossEn: "company director", contextDa: "Virksomhedslederen afviste påstanden.", morphemes: [{ textDa: "virksomhed", role: "first-stem", glossEn: "company" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "leder", role: "head", glossEn: "manager" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-myndighedskrav", level: "B2", firstStemDa: "myndighed", linkerDa: "s", headDa: "krav", compoundDa: "myndighedskrav", glossEn: "regulatory requirement", contextDa: "Anlægget opfylder alle myndighedskrav.", morphemes: [{ textDa: "myndighed", role: "first-stem", glossEn: "authority" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "krav", role: "head", glossEn: "requirement" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-tidsplan", level: "A2+", firstStemDa: "tid", linkerDa: "s", headDa: "plan", compoundDa: "tidsplan", glossEn: "schedule", contextDa: "Projektets tidsplan er presset.", morphemes: [{ textDa: "tid", role: "first-stem", glossEn: "time" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "plan", role: "head", glossEn: "plan" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-forsikringssag", level: "B1", firstStemDa: "forsikring", linkerDa: "s", headDa: "sag", compoundDa: "forsikringssag", glossEn: "insurance case", contextDa: "Skaden blev en kompliceret forsikringssag.", morphemes: [{ textDa: "forsikring", role: "first-stem", glossEn: "insurance" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "sag", role: "head", glossEn: "case" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-forbindelsesfejl", level: "B1", firstStemDa: "forbindelse", linkerDa: "s", headDa: "fejl", compoundDa: "forbindelsesfejl", glossEn: "connection error", contextDa: "Terminalen viser en forbindelsesfejl.", morphemes: [{ textDa: "forbindelse", role: "first-stem", glossEn: "connection" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "fejl", role: "head", glossEn: "error" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-uddannelsessted", level: "B2", firstStemDa: "uddannelse", linkerDa: "s", headDa: "sted", compoundDa: "uddannelsessted", glossEn: "educational institution", contextDa: "Angiv dit seneste uddannelsessted.", morphemes: [{ textDa: "uddannelse", role: "first-stem", glossEn: "education" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "sted", role: "head", glossEn: "place" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-barnevogn", level: "A2+", firstStemDa: "barn", linkerDa: "e", headDa: "vogn", compoundDa: "barnevogn", glossEn: "pram", contextDa: "Barnevognen står i gården.", morphemes: [{ textDa: "barn", role: "first-stem", glossEn: "child" }, { textDa: "e", role: "linker", glossEn: "linking element" }, { textDa: "vogn", role: "head", glossEn: "carriage" }], distractorLinkersDa: ["", "s"] },
  { id: "cmp-hundesnor", level: "A2+", firstStemDa: "hund", linkerDa: "e", headDa: "snor", compoundDa: "hundesnor", glossEn: "dog lead", contextDa: "Husk en kort hundesnor på perronen.", morphemes: [{ textDa: "hund", role: "first-stem", glossEn: "dog" }, { textDa: "e", role: "linker", glossEn: "linking element" }, { textDa: "snor", role: "head", glossEn: "lead" }], distractorLinkersDa: ["", "s"] },
  { id: "cmp-juletrae", level: "A2+", firstStemDa: "jul", linkerDa: "e", headDa: "træ", compoundDa: "juletræ", glossEn: "Christmas tree", contextDa: "Havnens juletræ har hundrede lys.", morphemes: [{ textDa: "jul", role: "first-stem", glossEn: "Christmas" }, { textDa: "e", role: "linker", glossEn: "linking element" }, { textDa: "træ", role: "head", glossEn: "tree" }], distractorLinkersDa: ["", "s"] },
  { id: "cmp-menneskemaengde", level: "B1", firstStemDa: "mennesk", linkerDa: "e", headDa: "mængde", compoundDa: "menneskemængde", glossEn: "crowd", contextDa: "En stor menneskemængde blokerede vejen.", morphemes: [{ textDa: "mennesk", role: "first-stem", glossEn: "human" }, { textDa: "e", role: "linker", glossEn: "linking element" }, { textDa: "mængde", role: "head", glossEn: "mass" }], distractorLinkersDa: ["", "s"] },
  { id: "cmp-fuglebur", level: "A2+", firstStemDa: "fugl", linkerDa: "e", headDa: "bur", compoundDa: "fuglebur", glossEn: "birdcage", contextDa: "Det tomme fuglebur stod åbent.", morphemes: [{ textDa: "fugl", role: "first-stem", glossEn: "bird" }, { textDa: "e", role: "linker", glossEn: "linking element" }, { textDa: "bur", role: "head", glossEn: "cage" }], distractorLinkersDa: ["", "s"] },
  { id: "cmp-ulvehyl", level: "B1", firstStemDa: "ulv", linkerDa: "e", headDa: "hyl", compoundDa: "ulvehyl", glossEn: "wolf howl", contextDa: "Et ulvehyl lød fra skoven.", morphemes: [{ textDa: "ulv", role: "first-stem", glossEn: "wolf" }, { textDa: "e", role: "linker", glossEn: "linking element" }, { textDa: "hyl", role: "head", glossEn: "howl" }], distractorLinkersDa: ["", "s"] },
  { id: "cmp-havnearbejder", level: "A2+", firstStemDa: "havn", linkerDa: "e", headDa: "arbejder", compoundDa: "havnearbejder", glossEn: "dock worker", contextDa: "En havnearbejder fandt kassen.", morphemes: [{ textDa: "havn", role: "first-stem", glossEn: "harbor" }, { textDa: "e", role: "linker", glossEn: "linking element" }, { textDa: "arbejder", role: "head", glossEn: "worker" }], distractorLinkersDa: ["", "s"] },
  { id: "cmp-oejenlaege", level: "B1", firstStemDa: "øje", linkerDa: "n", headDa: "læge", compoundDa: "øjenlæge", glossEn: "ophthalmologist", contextDa: "Øjenlægen målte hendes syn.", morphemes: [{ textDa: "øje", role: "first-stem", glossEn: "eye" }, { textDa: "n", role: "linker", glossEn: "linking element" }, { textDa: "læge", role: "head", glossEn: "doctor" }], distractorLinkersDa: ["", "s"] },
  { id: "cmp-solskin", level: "A2+", firstStemDa: "sol", linkerDa: "", headDa: "skin", compoundDa: "solskin", glossEn: "sunshine", contextDa: "Kajen lå i klart solskin.", morphemes: [{ textDa: "sol", role: "first-stem", glossEn: "sun" }, { textDa: "skin", role: "head", glossEn: "shine" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-vandkande", level: "A2+", firstStemDa: "vand", linkerDa: "", headDa: "kande", compoundDa: "vandkande", glossEn: "watering can", contextDa: "Vandkanden står ved drivhuset.", morphemes: [{ textDa: "vand", role: "first-stem", glossEn: "water" }, { textDa: "kande", role: "head", glossEn: "can/jug" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-togstation", level: "A2+", firstStemDa: "tog", linkerDa: "", headDa: "station", compoundDa: "togstation", glossEn: "train station", contextDa: "Den nye togstation åbner mandag.", morphemes: [{ textDa: "tog", role: "first-stem", glossEn: "train" }, { textDa: "station", role: "head", glossEn: "station" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-database", level: "B1", firstStemDa: "data", linkerDa: "", headDa: "base", compoundDa: "database", glossEn: "database", contextDa: "Arkivet ligger i en krypteret database.", morphemes: [{ textDa: "data", role: "first-stem", glossEn: "data" }, { textDa: "base", role: "head", glossEn: "base" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-brandalarm", level: "A2+", firstStemDa: "brand", linkerDa: "", headDa: "alarm", compoundDa: "brandalarm", glossEn: "fire alarm", contextDa: "Brandalarmen vækkede hele hotellet.", morphemes: [{ textDa: "brand", role: "first-stem", glossEn: "fire" }, { textDa: "alarm", role: "head", glossEn: "alarm" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-kaffemaskine", level: "A2+", firstStemDa: "kaffe", linkerDa: "", headDa: "maskine", compoundDa: "kaffemaskine", glossEn: "coffee machine", contextDa: "Kaffemaskinen kræver en ny pakning.", morphemes: [{ textDa: "kaffe", role: "first-stem", glossEn: "coffee" }, { textDa: "maskine", role: "head", glossEn: "machine" }], distractorLinkersDa: ["s", "n"] },
  { id: "cmp-cykelsti", level: "A2+", firstStemDa: "cykel", linkerDa: "", headDa: "sti", compoundDa: "cykelsti", glossEn: "cycle path", contextDa: "Bilen holder på cykelstien.", morphemes: [{ textDa: "cykel", role: "first-stem", glossEn: "bicycle" }, { textDa: "sti", role: "head", glossEn: "path" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-sprogskole", level: "A2+", firstStemDa: "sprog", linkerDa: "", headDa: "skole", compoundDa: "sprogskole", glossEn: "language school", contextDa: "Hun går på sprogskole om aftenen.", morphemes: [{ textDa: "sprog", role: "first-stem", glossEn: "language" }, { textDa: "skole", role: "head", glossEn: "school" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-klimamodel", level: "B1", firstStemDa: "klima", linkerDa: "", headDa: "model", compoundDa: "klimamodel", glossEn: "climate model", contextDa: "Klimamodellen overvurderer nedbøren.", morphemes: [{ textDa: "klima", role: "first-stem", glossEn: "climate" }, { textDa: "model", role: "head", glossEn: "model" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-bevismateriale", level: "B2", firstStemDa: "bevis", linkerDa: "", headDa: "materiale", compoundDa: "bevismateriale", glossEn: "evidence material", contextDa: "Politiet forseglede alt bevismateriale.", morphemes: [{ textDa: "bevis", role: "first-stem", glossEn: "evidence" }, { textDa: "materiale", role: "head", glossEn: "material" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-stroemsvigt", level: "B1", firstStemDa: "strøm", linkerDa: "", headDa: "svigt", compoundDa: "strømsvigt", glossEn: "power failure", contextDa: "Et strømsvigt lukkede tunnelen.", morphemes: [{ textDa: "strøm", role: "first-stem", glossEn: "power" }, { textDa: "svigt", role: "head", glossEn: "failure" }], distractorLinkersDa: ["s", "e"] },
  { id: "cmp-beslutningsgrundlag", level: "B2", firstStemDa: "beslutning", linkerDa: "s", headDa: "grundlag", compoundDa: "beslutningsgrundlag", glossEn: "basis for decision", contextDa: "Tallene er et tyndt beslutningsgrundlag.", morphemes: [{ textDa: "beslutning", role: "first-stem", glossEn: "decision" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "grundlag", role: "head", glossEn: "basis" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-efterforskningsleder", level: "B2", firstStemDa: "efterforskning", linkerDa: "s", headDa: "leder", compoundDa: "efterforskningsleder", glossEn: "lead investigator", contextDa: "Efterforskningslederen indkaldte vidnet.", morphemes: [{ textDa: "efterforskning", role: "first-stem", glossEn: "investigation" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "leder", role: "head", glossEn: "leader" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-meningsmaaling", level: "B2", firstStemDa: "mening", linkerDa: "s", headDa: "måling", compoundDa: "meningsmåling", glossEn: "opinion poll", contextDa: "Meningsmålingen har en stor fejlmargin.", morphemes: [{ textDa: "mening", role: "first-stem", glossEn: "opinion" }, { textDa: "s", role: "linker", glossEn: "linking element" }, { textDa: "måling", role: "head", glossEn: "measurement" }], distractorLinkersDa: ["", "e"] },
  { id: "cmp-havneafgift", level: "B1", firstStemDa: "havn", linkerDa: "e", headDa: "afgift", compoundDa: "havneafgift", glossEn: "harbor fee", contextDa: "Skibet betalte havneafgift ved ankomsten.", morphemes: [{ textDa: "havn", role: "first-stem", glossEn: "harbor" }, { textDa: "e", role: "linker", glossEn: "linking element" }, { textDa: "afgift", role: "head", glossEn: "fee" }], distractorLinkersDa: ["", "s"] },
] as const satisfies readonly CompoundPattern[];

const semanticFields = [
  { id: "field-courtroom", level: "B1", labelEn: "courtroom procedure", promptDa: "Hvilket ord hører ikke til en retssag?", membersDa: ["dommer", "vidne", "anklager", "forsvarer"], intruderDa: "dirigent", reasonEn: "A conductor belongs to music, not courtroom procedure." },
  { id: "field-harbor", level: "A2+", labelEn: "harbor", promptDa: "Hvilket ord hører ikke til på havnen?", membersDa: ["kaj", "mole", "fyrtårn", "fortøjning"], intruderDa: "skorsten", reasonEn: "A chimney is a building feature; the others are harbor infrastructure." },
  { id: "field-weather", level: "A2+", labelEn: "weather", promptDa: "Hvilket ord er ikke en vejrtype?", membersDa: ["byge", "tåge", "storm", "slud"], intruderDa: "skygge", reasonEn: "A shadow is caused by blocked light, not a weather condition." },
  { id: "field-evidence", level: "B1", labelEn: "evidence", promptDa: "Hvilket ord er ikke en type bevismateriale?", membersDa: ["fingeraftryk", "kvittering", "logfil", "vidneudsagn"], intruderDa: "fornemmelse", reasonEn: "A feeling may guide inquiry but is not evidence by itself." },
  { id: "field-electricity", level: "B1", labelEn: "electric circuit", promptDa: "Hvilket ord hører ikke til et elektrisk kredsløb?", membersDa: ["modstand", "spænding", "strømstyrke", "leder"], intruderDa: "tyngdekraft", reasonEn: "Gravity is a force, while the others are circuit concepts." },
  { id: "field-emotion", level: "A2+", labelEn: "emotion", promptDa: "Hvilket ord er ikke en følelse?", membersDa: ["vrede", "sorg", "glæde", "misundelse"], intruderDa: "hastighed", reasonEn: "Speed is a physical quantity, not an emotion." },
  { id: "field-research", level: "B2", labelEn: "research method", promptDa: "Hvilket ord hører ikke til forskningsmetode?", membersDa: ["stikprøve", "kontrolgruppe", "hypotese", "fejlmargin"], intruderDa: "slagord", reasonEn: "A slogan is rhetorical language, not a research-method term." },
  { id: "field-housing", level: "A2+", labelEn: "housing", promptDa: "Hvilket ord beskriver ikke en boligdel?", membersDa: ["altan", "kælder", "loft", "opgang"], intruderDa: "perron", reasonEn: "A platform belongs to a station, not a home." },
  { id: "field-cybersecurity", level: "B2", labelEn: "cybersecurity", promptDa: "Hvilket ord hører ikke til datasikkerhed?", membersDa: ["kryptering", "adgangskode", "sikkerhedskopi", "firewall"], intruderDa: "faldskærm", reasonEn: "A parachute is physical safety equipment, not cybersecurity." },
  { id: "field-cooking", level: "A2+", labelEn: "cooking method", promptDa: "Hvilket verbum er ikke en tilberedningsmetode?", membersDa: ["koge", "stege", "bage", "dampe"], intruderDa: "arkivere", reasonEn: "To archive concerns documents, not cooking." },
  { id: "field-reporting", level: "B1", labelEn: "source attribution", promptDa: "Hvilket udtryk markerer ikke en kilde?", membersDa: ["ifølge", "oplyser", "fremgår af", "angiveligt"], intruderDa: "heldigvis", reasonEn: "Fortunately evaluates an event; it does not attribute information." },
  { id: "field-navigation", level: "A2+", labelEn: "navigation", promptDa: "Hvilket ord hjælper ikke med navigation?", membersDa: ["kompas", "kort", "rute", "koordinat"], intruderDa: "kvittering", reasonEn: "A receipt records a purchase rather than a route." },
  { id: "field-contract", level: "B2", labelEn: "contract", promptDa: "Hvilket ord hører ikke til en kontrakt?", membersDa: ["klausul", "frist", "forpligtelse", "underskrift"], intruderDa: "temperatur", reasonEn: "Temperature is not a standard contract element." },
  { id: "field-body-language", level: "B1", labelEn: "body language", promptDa: "Hvilket udtryk beskriver ikke kropssprog?", membersDa: ["krydse armene", "undgå øjenkontakt", "nikke", "rynke panden"], intruderDa: "hæve momsen", reasonEn: "Raising VAT is policy, not a physical signal." },
  { id: "field-statistics", level: "B2", labelEn: "statistics", promptDa: "Hvilket ord er ikke et statistisk begreb?", membersDa: ["median", "gennemsnit", "varians", "korrelation"], intruderDa: "metafor", reasonEn: "A metaphor is rhetorical, not statistical." },
  { id: "field-tools", level: "A2+", labelEn: "hand tools", promptDa: "Hvilket ord er ikke et håndværktøj?", membersDa: ["hammer", "skruetrækker", "tang", "sav"], intruderDa: "dyne", reasonEn: "A duvet is bedding, not a tool." },
  { id: "field-argument", level: "B2", labelEn: "argumentation", promptDa: "Hvilket ord hører ikke til argumentation?", membersDa: ["påstand", "belæg", "modargument", "konklusion"], intruderDa: "fortøjning", reasonEn: "A mooring secures a vessel and is unrelated to argument structure." },
  { id: "field-healthcare", level: "A2+", labelEn: "healthcare", promptDa: "Hvilket ord hører ikke til et lægebesøg?", membersDa: ["recept", "symptom", "diagnose", "behandling"], intruderDa: "køreplan", reasonEn: "A timetable belongs to transport, not a medical visit." },
  { id: "field-workplace", level: "A2+", labelEn: "workplace", promptDa: "Hvilket ord hører ikke til arbejdslivet?", membersDa: ["kollega", "vagtplan", "løn", "ansættelse"], intruderDa: "tidevand", reasonEn: "Tides are a natural cycle, not an employment concept." },
  { id: "field-fire-safety", level: "B1", labelEn: "fire safety", promptDa: "Hvilket ord hører ikke til brandsikkerhed?", membersDa: ["røgalarm", "nødudgang", "slukker", "evakuering"], intruderDa: "ordbog", reasonEn: "A dictionary does not provide fire protection." },
] as const satisfies readonly SemanticField[];

const inflectionTargets = [
  { id: "inf-hus-def-sg", level: "A2+", lemmaDa: "et hus", partOfSpeech: "noun", targetEn: "definite singular", promptDa: "Skriv den bestemte form i ental af 'et hus'.", answerDa: "huset", acceptableAnswersDa: ["huset"], contextDa: "___ ved kajen er tomt." },
  { id: "inf-hus-indef-pl", level: "A2+", lemmaDa: "et hus", partOfSpeech: "noun", targetEn: "indefinite plural", promptDa: "Skriv den ubestemte form i flertal af 'et hus'.", answerDa: "huse", acceptableAnswersDa: ["huse"], contextDa: "Der ligger tre ___ ved vandet." },
  { id: "inf-hus-def-pl", level: "A2+", lemmaDa: "et hus", partOfSpeech: "noun", targetEn: "definite plural", promptDa: "Skriv den bestemte form i flertal af 'et hus'.", answerDa: "husene", acceptableAnswersDa: ["husene"], contextDa: "___ blev evakueret i nat." },
  { id: "inf-beslutning-def-sg", level: "A2+", lemmaDa: "en beslutning", partOfSpeech: "noun", targetEn: "definite singular", promptDa: "Skriv den bestemte form i ental af 'en beslutning'.", answerDa: "beslutningen", acceptableAnswersDa: ["beslutningen"], contextDa: "___ bliver offentliggjort fredag." },
  { id: "inf-beslutning-indef-pl", level: "B1", lemmaDa: "en beslutning", partOfSpeech: "noun", targetEn: "indefinite plural", promptDa: "Skriv den ubestemte form i flertal af 'en beslutning'.", answerDa: "beslutninger", acceptableAnswersDa: ["beslutninger"], contextDa: "Store ___ kræver et bedre grundlag." },
  { id: "inf-medlem-def-sg", level: "A2+", lemmaDa: "et medlem", partOfSpeech: "noun", targetEn: "definite singular", promptDa: "Skriv den bestemte form i ental af 'et medlem'.", answerDa: "medlemmet", acceptableAnswersDa: ["medlemmet"], contextDa: "___ stemte imod forslaget." },
  { id: "inf-medlem-indef-pl", level: "B1", lemmaDa: "et medlem", partOfSpeech: "noun", targetEn: "indefinite plural", promptDa: "Skriv den ubestemte form i flertal af 'et medlem'.", answerDa: "medlemmer", acceptableAnswersDa: ["medlemmer"], contextDa: "Udvalget har ni ___." },
  { id: "inf-fejl-def-pl", level: "A2+", lemmaDa: "en fejl", partOfSpeech: "noun", targetEn: "definite plural", promptDa: "Skriv den bestemte form i flertal af 'en fejl'.", answerDa: "fejlene", acceptableAnswersDa: ["fejlene"], contextDa: "___ blev rettet før testen." },
  { id: "inf-bevis-indef-pl", level: "B1", lemmaDa: "et bevis", partOfSpeech: "noun", targetEn: "indefinite plural", promptDa: "Skriv den ubestemte form i flertal af 'et bevis'.", answerDa: "beviser", acceptableAnswersDa: ["beviser"], contextDa: "Anklageren fremlagde tre ___." },
  { id: "inf-risiko-indef-pl", level: "B2", lemmaDa: "en risiko", partOfSpeech: "noun", targetEn: "indefinite plural", promptDa: "Skriv en korrekt ubestemt flertalsform af 'en risiko'.", answerDa: "risici", acceptableAnswersDa: ["risici", "risikoer"], contextDa: "Rapporten nævner flere alvorlige ___." },
  { id: "inf-vidne-def-pl", level: "A2+", lemmaDa: "et vidne", partOfSpeech: "noun", targetEn: "definite plural", promptDa: "Skriv den bestemte form i flertal af 'et vidne'.", answerDa: "vidnerne", acceptableAnswersDa: ["vidnerne"], contextDa: "___ blev afhørt hver for sig." },
  { id: "inf-krav-def-pl", level: "B1", lemmaDa: "et krav", partOfSpeech: "noun", targetEn: "definite plural", promptDa: "Skriv den bestemte form i flertal af 'et krav'.", answerDa: "kravene", acceptableAnswersDa: ["kravene"], contextDa: "___ står i bilag to." },
  { id: "inf-stor-neuter", level: "A2+", lemmaDa: "stor", partOfSpeech: "adjective", targetEn: "indefinite neuter singular", promptDa: "Bøj 'stor' til et ubestemt intetkønsord.", answerDa: "stort", acceptableAnswersDa: ["stort"], contextDa: "Det er et ___ ansvar." },
  { id: "inf-stor-definite", level: "A2+", lemmaDa: "stor", partOfSpeech: "adjective", targetEn: "definite singular", promptDa: "Bøj 'stor' efter en bestemt artikel.", answerDa: "store", acceptableAnswersDa: ["store"], contextDa: "Det ___ hus ligger ved molen." },
  { id: "inf-ny-neuter", level: "A2+", lemmaDa: "ny", partOfSpeech: "adjective", targetEn: "indefinite neuter singular", promptDa: "Bøj 'ny' til intetkøn.", answerDa: "nyt", acceptableAnswersDa: ["nyt"], contextDa: "Vi har fået et ___ system." },
  { id: "inf-ny-plural", level: "A2+", lemmaDa: "ny", partOfSpeech: "adjective", targetEn: "plural", promptDa: "Bøj 'ny' til flertal.", answerDa: "nye", acceptableAnswersDa: ["nye"], contextDa: "De ___ sensorer virker fint." },
  { id: "inf-sikker-neuter", level: "A2+", lemmaDa: "sikker", partOfSpeech: "adjective", targetEn: "indefinite neuter singular", promptDa: "Bøj 'sikker' til intetkøn.", answerDa: "sikkert", acceptableAnswersDa: ["sikkert"], contextDa: "Det er et ___ valg." },
  { id: "inf-falsk-plural", level: "A2+", lemmaDa: "falsk", partOfSpeech: "adjective", targetEn: "plural", promptDa: "Bøj 'falsk' til flertal.", answerDa: "falske", acceptableAnswersDa: ["falske"], contextDa: "Systemet fandt to ___ alarmer." },
  { id: "inf-roed-neuter", level: "A2+", lemmaDa: "rød", partOfSpeech: "adjective", targetEn: "indefinite neuter singular", promptDa: "Bøj 'rød' til intetkøn.", answerDa: "rødt", acceptableAnswersDa: ["rødt"], contextDa: "Vidnet bar et ___ halstørklæde." },
  { id: "inf-gammel-neuter", level: "A2+", lemmaDa: "gammel", partOfSpeech: "adjective", targetEn: "indefinite neuter singular", promptDa: "Bøj 'gammel' til intetkøn.", answerDa: "gammelt", acceptableAnswersDa: ["gammelt"], contextDa: "Det er et ___ arkiv." },
  { id: "inf-fri-neuter", level: "B1", lemmaDa: "fri", partOfSpeech: "adjective", targetEn: "indefinite neuter singular", promptDa: "Bøj 'fri' til intetkøn.", answerDa: "frit", acceptableAnswersDa: ["frit"], contextDa: "Alle skal have et ___ valg." },
  { id: "inf-mulig-neuter", level: "B1", lemmaDa: "mulig", partOfSpeech: "adjective", targetEn: "indefinite neuter singular", promptDa: "Bøj 'mulig' til intetkøn.", answerDa: "muligt", acceptableAnswersDa: ["muligt"], contextDa: "Det er et ___ scenarie." },
  { id: "inf-god-comparative", level: "A2+", lemmaDa: "god", partOfSpeech: "adjective", targetEn: "comparative", promptDa: "Skriv komparativ af 'god'.", answerDa: "bedre", acceptableAnswersDa: ["bedre"], contextDa: "Den anden løsning er ___." },
  { id: "inf-daarlig-superlative", level: "B1", lemmaDa: "dårlig", partOfSpeech: "adjective", targetEn: "superlative", promptDa: "Skriv superlativ af 'dårlig'.", answerDa: "værst", acceptableAnswersDa: ["værst"], contextDa: "Det tredje udfald er ___." },
  { id: "inf-hoej-comparative", level: "A2+", lemmaDa: "høj", partOfSpeech: "adjective", targetEn: "comparative", promptDa: "Skriv komparativ af 'høj'.", answerDa: "højere", acceptableAnswersDa: ["højere"], contextDa: "Risikoen er ___ end i går." },
  { id: "inf-lille-superlative", level: "B1", lemmaDa: "lille", partOfSpeech: "adjective", targetEn: "superlative", promptDa: "Skriv superlativ af 'lille'.", answerDa: "mindst", acceptableAnswersDa: ["mindst"], contextDa: "Denne gruppe er ___." },
  { id: "inf-vaelge-present", level: "A2+", lemmaDa: "at vælge", partOfSpeech: "verb", targetEn: "present tense", promptDa: "Bøj 'at vælge' i nutid.", answerDa: "vælger", acceptableAnswersDa: ["vælger"], contextDa: "Hun ___ den sikre rute." },
  { id: "inf-vaelge-past", level: "A2+", lemmaDa: "at vælge", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at vælge' i datid.", answerDa: "valgte", acceptableAnswersDa: ["valgte"], contextDa: "Hun ___ den sikre rute i går." },
  { id: "inf-skrive-past", level: "A2+", lemmaDa: "at skrive", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at skrive' i datid.", answerDa: "skrev", acceptableAnswersDa: ["skrev"], contextDa: "Vidnet ___ sit navn i loggen." },
  { id: "inf-skrive-perfect", level: "B1", lemmaDa: "at skrive", partOfSpeech: "verb", targetEn: "past participle after har", promptDa: "Bøj 'at skrive' efter 'har'.", answerDa: "skrevet", acceptableAnswersDa: ["skrevet"], contextDa: "Hun har ___ en ny rapport." },
  { id: "inf-forstaa-past", level: "A2+", lemmaDa: "at forstå", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at forstå' i datid.", answerDa: "forstod", acceptableAnswersDa: ["forstod"], contextDa: "Jeg ___ ikke instruktionen." },
  { id: "inf-forstaa-perfect", level: "B1", lemmaDa: "at forstå", partOfSpeech: "verb", targetEn: "past participle after har", promptDa: "Bøj 'at forstå' efter 'har'.", answerDa: "forstået", acceptableAnswersDa: ["forstået"], contextDa: "Nu har jeg ___ problemet." },
  { id: "inf-ligge-past", level: "B1", lemmaDa: "at ligge", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at ligge' i datid.", answerDa: "lå", acceptableAnswersDa: ["lå"], contextDa: "Nøglen ___ under bordet." },
  { id: "inf-laegge-past", level: "B1", lemmaDa: "at lægge", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at lægge' i datid.", answerDa: "lagde", acceptableAnswersDa: ["lagde"], contextDa: "Hun ___ nøglen på bordet." },
  { id: "inf-synes-past", level: "B1", lemmaDa: "at synes", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at synes' i datid.", answerDa: "syntes", acceptableAnswersDa: ["syntes"], contextDa: "De ___, at planen var god." },
  { id: "inf-blive-perfect", level: "B1", lemmaDa: "at blive", partOfSpeech: "verb", targetEn: "perfect with er", promptDa: "Skriv perfektum af 'at blive' efter 'er'.", answerDa: "blevet", acceptableAnswersDa: ["blevet"], contextDa: "Systemet er ___ langsommere." },
  { id: "inf-tage-past", level: "A2+", lemmaDa: "at tage", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at tage' i datid.", answerDa: "tog", acceptableAnswersDa: ["tog"], contextDa: "Hun ___ ansvar for fejlen." },
  { id: "inf-gaa-perfect", level: "A2+", lemmaDa: "at gå", partOfSpeech: "verb", targetEn: "perfect with er", promptDa: "Skriv perfektum af 'at gå' efter 'er'.", answerDa: "gået", acceptableAnswersDa: ["gået"], contextDa: "Alarmen er ___ i gang." },
  { id: "inf-finde-past", level: "A2+", lemmaDa: "at finde", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at finde' i datid.", answerDa: "fandt", acceptableAnswersDa: ["fandt"], contextDa: "Teknikeren ___ fejlen." },
  { id: "inf-undgaa-past", level: "B1", lemmaDa: "at undgå", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at undgå' i datid.", answerDa: "undgik", acceptableAnswersDa: ["undgik"], contextDa: "Holdet ___ en farlig situation." },
  { id: "inf-afslaa-past", level: "B1", lemmaDa: "at afslå", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at afslå' i datid.", answerDa: "afslog", acceptableAnswersDa: ["afslog"], contextDa: "Bestyrelsen ___ tilbuddet." },
  { id: "inf-fremgaa-past", level: "B2", lemmaDa: "at fremgå", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at fremgå' i datid.", answerDa: "fremgik", acceptableAnswersDa: ["fremgik"], contextDa: "Det ___ ikke af bilaget." },
  { id: "inf-begaa-past", level: "B1", lemmaDa: "at begå", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at begå' i datid.", answerDa: "begik", acceptableAnswersDa: ["begik"], contextDa: "Revisoren ___ en alvorlig fejl." },
  { id: "inf-opstaa-past", level: "B1", lemmaDa: "at opstå", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at opstå' i datid.", answerDa: "opstod", acceptableAnswersDa: ["opstod"], contextDa: "Problemet ___ under testen." },
  { id: "inf-yde-past", level: "B2", lemmaDa: "at yde", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at yde' i datid.", answerDa: "ydede", acceptableAnswersDa: ["ydede"], contextDa: "Holdet ___ hurtig hjælp." },
  { id: "inf-bidrage-past", level: "B2", lemmaDa: "at bidrage", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at bidrage' i datid.", answerDa: "bidrog", acceptableAnswersDa: ["bidrog"], contextDa: "Regnen ___ til ulykken." },
  { id: "inf-traeffe-past", level: "B1", lemmaDa: "at træffe", partOfSpeech: "verb", targetEn: "past tense", promptDa: "Bøj 'at træffe' i datid.", answerDa: "traf", acceptableAnswersDa: ["traf"], contextDa: "Udvalget ___ en hurtig beslutning." },
  { id: "inf-kontrollere-passive-present", level: "B2", lemmaDa: "at kontrollere", partOfSpeech: "verb", targetEn: "present s-passive", promptDa: "Skriv s-passiv i nutid af 'at kontrollere'.", answerDa: "kontrolleres", acceptableAnswersDa: ["kontrolleres"], contextDa: "Alle tasker ___ ved indgangen." },
  { id: "inf-godkende-passive-past", level: "B2", lemmaDa: "at godkende", partOfSpeech: "verb", targetEn: "past tense passive", promptDa: "Skriv passiv datid af 'at godkende'.", answerDa: "blev godkendt", acceptableAnswersDa: ["blev godkendt", "godkendtes"], contextDa: "Planen ___ efter mødet." },
  { id: "inf-sin-neuter", level: "B1", lemmaDa: "sin", partOfSpeech: "pronoun", targetEn: "reflexive possessive before a neuter noun", promptDa: "Bøj 'sin' foran et intetkønsord.", answerDa: "sit", acceptableAnswersDa: ["sit"], contextDa: "Hun viste ___ pas." },
  { id: "inf-sin-plural", level: "B1", lemmaDa: "sin", partOfSpeech: "pronoun", targetEn: "reflexive possessive before a plural noun", promptDa: "Bøj 'sin' foran et flertalsord.", answerDa: "sine", acceptableAnswersDa: ["sine"], contextDa: "Hun viste ___ papirer." },
] as const satisfies readonly InflectionTarget[];

export const LEXICAL_BANKS = {
  synonymGroups: synonymGroups as readonly SynonymGroup[],
  nuanceScales: nuanceScales as readonly NuanceScale[],
  collocations: collocations as readonly VerbNounCollocation[],
  governedPrepositions: governedPrepositions as readonly GovernedPreposition[],
  falseFriends: falseFriends as readonly FalseFriend[],
  compoundPatterns: compoundPatterns as readonly CompoundPattern[],
  semanticFields: semanticFields as readonly SemanticField[],
  inflectionTargets: inflectionTargets as readonly InflectionTarget[],
} as const;

export const LEXICAL_BANK_COUNTS = {
  synonymGroups: synonymGroups.length,
  synonymCandidates: synonymGroups.reduce((sum, group) => sum + group.candidates.length, 0),
  nuanceScales: nuanceScales.length,
  nuanceEntries: nuanceScales.reduce((sum, scale) => sum + scale.entries.length, 0),
  collocations: collocations.length,
  governedPrepositions: governedPrepositions.length,
  falseFriends: falseFriends.length,
  compoundPatterns: compoundPatterns.length,
  compoundMorphemes: compoundPatterns.reduce((sum, pattern) => sum + pattern.morphemes.length, 0),
  semanticFields: semanticFields.length,
  semanticTerms: semanticFields.reduce((sum, field) => sum + field.membersDa.length + 1, 0),
  inflectionTargets: inflectionTargets.length,
} as const;

export interface SynonymPickProjection {
  readonly id: string;
  readonly mechanic: "synonym-pick";
  readonly level: LexicalLevel;
  readonly promptDa: string;
  readonly contextDa: string;
  readonly optionsDa: readonly string[];
  readonly answerDa: string;
  readonly candidateIds: readonly string[];
}

export interface OddOneOutProjection {
  readonly id: string;
  readonly mechanic: "odd-one-out";
  readonly level: LexicalLevel;
  readonly promptDa: string;
  readonly optionsDa: readonly string[];
  readonly answerDa: string;
  readonly explanationEn: string;
}

export interface NuanceScaleProjection {
  readonly id: string;
  readonly mechanic: "nuance-scale";
  readonly level: LexicalLevel;
  readonly promptDa: string;
  readonly termsDa: readonly string[];
  readonly orderedAnswerDa: readonly string[];
}

export interface CollocationLockProjection {
  readonly id: string;
  readonly mechanic: "collocation-lock";
  readonly level: LexicalLevel;
  readonly promptDa: string;
  readonly contextDa: string;
  readonly optionsDa: readonly string[];
  readonly answerDa: string;
  readonly completedPhraseDa: string;
}

export interface InflectionForgeProjection {
  readonly id: string;
  readonly mechanic: "inflection-forge";
  readonly level: LexicalLevel;
  readonly promptDa: string;
  readonly contextDa: string;
  readonly answerDa: string;
  readonly acceptableAnswersDa: readonly string[];
}

export interface WordForgeProjection {
  readonly id: string;
  readonly mechanic: "word-forge";
  readonly level: LexicalLevel;
  readonly promptDa: string;
  readonly firstStemDa: string;
  readonly headDa: string;
  readonly linkerOptionsDa: readonly string[];
  readonly answerDa: string;
  readonly correctLinkerDa: string;
}

function findById<T extends { readonly id: string }>(items: readonly T[], id: string, bankName: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown ${bankName} id: ${id}`);
  return item;
}

export function getSynonymGroup(id: string): SynonymGroup {
  return findById(LEXICAL_BANKS.synonymGroups, id, "synonym group");
}

export function getSemanticField(id: string): SemanticField {
  return findById(LEXICAL_BANKS.semanticFields, id, "semantic field");
}

export function getNuanceScale(id: string): NuanceScale {
  return findById(LEXICAL_BANKS.nuanceScales, id, "nuance scale");
}

export function getCollocation(id: string): VerbNounCollocation {
  return findById(LEXICAL_BANKS.collocations, id, "collocation");
}

export function getInflectionTarget(id: string): InflectionTarget {
  return findById(LEXICAL_BANKS.inflectionTargets, id, "inflection target");
}

export function getCompoundPattern(id: string): CompoundPattern {
  return findById(LEXICAL_BANKS.compoundPatterns, id, "compound pattern");
}

export function buildSynonymPick(id: string): SynonymPickProjection {
  const group = getSynonymGroup(id);
  const correct = findById(group.candidates, group.correctCandidateId, "synonym candidate");
  return {
    id: group.id,
    mechanic: "synonym-pick",
    level: group.level,
    promptDa: group.promptDa,
    contextDa: group.contextDa,
    optionsDa: group.candidates.map((candidate) => candidate.lemmaDa),
    answerDa: correct.lemmaDa,
    candidateIds: group.candidates.map((candidate) => candidate.id),
  };
}

export function buildOddOneOut(id: string): OddOneOutProjection {
  const field = getSemanticField(id);
  return {
    id: field.id,
    mechanic: "odd-one-out",
    level: field.level,
    promptDa: field.promptDa,
    optionsDa: [...field.membersDa, field.intruderDa],
    answerDa: field.intruderDa,
    explanationEn: field.reasonEn,
  };
}

export function buildNuanceScale(id: string): NuanceScaleProjection {
  const scale = getNuanceScale(id);
  const orderedAnswerDa = scale.entries.map((entry) => entry.termDa);
  return {
    id: scale.id,
    mechanic: "nuance-scale",
    level: scale.level,
    promptDa: scale.promptDa,
    termsDa: orderedAnswerDa,
    orderedAnswerDa,
  };
}

export function buildCollocationLock(id: string): CollocationLockProjection {
  const collocation = getCollocation(id);
  return {
    id: collocation.id,
    mechanic: "collocation-lock",
    level: collocation.level,
    promptDa: `Vælg verbet, der passer til '${collocation.nounPhraseDa}'.`,
    contextDa: collocation.contextDa,
    optionsDa: [collocation.verbDa, ...collocation.distractorVerbsDa],
    answerDa: collocation.verbDa,
    completedPhraseDa: collocation.phraseDa,
  };
}

export function buildInflectionForge(id: string): InflectionForgeProjection {
  const target = getInflectionTarget(id);
  return {
    id: target.id,
    mechanic: "inflection-forge",
    level: target.level,
    promptDa: target.promptDa,
    contextDa: target.contextDa,
    answerDa: target.answerDa,
    acceptableAnswersDa: target.acceptableAnswersDa,
  };
}

export function buildWordForge(id: string): WordForgeProjection {
  const pattern = getCompoundPattern(id);
  return {
    id: pattern.id,
    mechanic: "word-forge",
    level: pattern.level,
    promptDa: `Byg ordet for '${pattern.glossEn}' og vælg det rigtige fugeelement.`,
    firstStemDa: pattern.firstStemDa,
    headDa: pattern.headDa,
    linkerOptionsDa: [pattern.linkerDa, ...pattern.distractorLinkersDa],
    answerDa: pattern.compoundDa,
    correctLinkerDa: pattern.linkerDa,
  };
}

export interface LexicalBankValidationIssue {
  readonly bank: keyof typeof LEXICAL_BANKS | "global";
  readonly id: string;
  readonly message: string;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function collectStrings(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, output));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => collectStrings(entry, output));
  return output;
}

export function validateLexicalBanks(): readonly LexicalBankValidationIssue[] {
  const issues: LexicalBankValidationIssue[] = [];
  const topLevelIds = Object.values(LEXICAL_BANKS).flatMap((items) => items.map((item) => item.id));
  if (hasDuplicates(topLevelIds)) issues.push({ bank: "global", id: "ids", message: "Top-level lexical IDs must be globally unique." });
  for (const id of topLevelIds) {
    if (!/^[a-z0-9-]+$/u.test(id)) issues.push({ bank: "global", id, message: "IDs may contain only lowercase ASCII letters, digits, and hyphens." });
  }

  const candidateIds: string[] = [];
  for (const group of LEXICAL_BANKS.synonymGroups) {
    candidateIds.push(...group.candidates.map((candidate) => candidate.id));
    const referenced = group.candidates.filter((candidate) => candidate.id === group.correctCandidateId);
    const fitting = group.candidates.filter((candidate) => candidate.fitsContext);
    if (group.candidates.length < 3) issues.push({ bank: "synonymGroups", id: group.id, message: "A synonym group needs at least three contextual alternatives." });
    if (referenced.length !== 1) issues.push({ bank: "synonymGroups", id: group.id, message: "correctCandidateId must resolve exactly once." });
    if (fitting.length !== 1) issues.push({ bank: "synonymGroups", id: group.id, message: "Exactly one candidate must fit the context." });
    if (referenced[0] && !referenced[0].fitsContext) issues.push({ bank: "synonymGroups", id: group.id, message: "The referenced correct candidate must fit the context." });
    if (referenced[0] && referenced[0].register !== group.targetRegister) issues.push({ bank: "synonymGroups", id: group.id, message: "The correct candidate must match the requested register." });
  }
  if (hasDuplicates(candidateIds)) issues.push({ bank: "synonymGroups", id: "candidate-ids", message: "Synonym candidate IDs must be globally unique." });

  for (const scale of LEXICAL_BANKS.nuanceScales) {
    const strengths = scale.entries.map((entry) => entry.strength);
    const ordered = strengths.every((strength, index) => index === 0 || strengths[index - 1] < strength);
    if (scale.entries.length < 4) issues.push({ bank: "nuanceScales", id: scale.id, message: "A nuance scale needs at least four entries." });
    if (!ordered || hasDuplicates(scale.entries.map((entry) => entry.termDa))) issues.push({ bank: "nuanceScales", id: scale.id, message: "Nuance entries must be unique and strictly ordered by strength." });
  }

  for (const item of LEXICAL_BANKS.collocations) {
    const options = [item.verbDa, ...item.distractorVerbsDa];
    if (item.distractorVerbsDa.length < 3 || hasDuplicates(options)) issues.push({ bank: "collocations", id: item.id, message: "A collocation needs three unique distractors and one unique answer." });
    if (!item.phraseDa.includes(item.verbDa) || !item.phraseDa.includes(item.nounPhraseDa)) issues.push({ bank: "collocations", id: item.id, message: "The completed phrase must contain its verb and noun phrase." });
  }

  for (const item of LEXICAL_BANKS.governedPrepositions) {
    if (item.distractorsDa.length < 3 || hasDuplicates([item.prepositionDa, ...item.distractorsDa])) issues.push({ bank: "governedPrepositions", id: item.id, message: "The governed preposition must be the only correct option." });
  }

  for (const pattern of LEXICAL_BANKS.compoundPatterns) {
    if (`${pattern.firstStemDa}${pattern.linkerDa}${pattern.headDa}` !== pattern.compoundDa) issues.push({ bank: "compoundPatterns", id: pattern.id, message: "Compound must equal first stem + linker + head." });
    if (hasDuplicates([pattern.linkerDa, ...pattern.distractorLinkersDa])) issues.push({ bank: "compoundPatterns", id: pattern.id, message: "Linker answer and distractors must be unique." });
  }

  for (const field of LEXICAL_BANKS.semanticFields) {
    if (field.membersDa.length < 4 || hasDuplicates([...field.membersDa, field.intruderDa])) issues.push({ bank: "semanticFields", id: field.id, message: "A semantic field needs four unique members and one unique intruder." });
  }

  for (const target of LEXICAL_BANKS.inflectionTargets) {
    if (!target.acceptableAnswersDa.includes(target.answerDa) || hasDuplicates(target.acceptableAnswersDa)) issues.push({ bank: "inflectionTargets", id: target.id, message: "Acceptable forms must be unique and include the canonical answer." });
  }

  if (collectStrings(LEXICAL_BANKS).some((text) => /[\u0400-\u04ff]/u.test(text))) issues.push({ bank: "global", id: "copy-language", message: "Lexical bank copy must contain Danish and English only; Cyrillic was found." });
  return issues;
}

export function assertLexicalBanksValid(): void {
  const issues = validateLexicalBanks();
  if (issues.length > 0) throw new Error(issues.map((issue) => `${issue.bank}/${issue.id}: ${issue.message}`).join("\n"));
}
