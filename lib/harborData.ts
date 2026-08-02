export type HarborLevel = "A1" | "A2" | "B1" | "B2";

export type HarborRankId =
  | "skibsdreng"
  | "letmatros"
  | "matros"
  | "baadsmand"
  | "styrmand"
  | "skipper"
  | "lods"
  | "havnefoged";

export interface UnlockPrice {
  kr: number;
  rav?: number;
}

export interface HarborRank {
  id: HarborRankId;
  label: string;
  englishLabel: string;
  order: number;
}

export const harborRanks: HarborRank[] = [
  { id: "skibsdreng", label: "Skibsdreng", englishLabel: "Cabin trainee", order: 0 },
  { id: "letmatros", label: "Letmatros", englishLabel: "Junior sailor", order: 1 },
  { id: "matros", label: "Matros", englishLabel: "Able sailor", order: 2 },
  { id: "baadsmand", label: "Bådsmand", englishLabel: "Boatswain", order: 3 },
  { id: "styrmand", label: "Styrmand", englishLabel: "First mate", order: 4 },
  { id: "skipper", label: "Skipper", englishLabel: "Skipper", order: 5 },
  { id: "lods", label: "Lods", englishLabel: "Harbor pilot", order: 6 },
  { id: "havnefoged", label: "Havnefoged", englishLabel: "Harbor master", order: 7 },
];

export type HarborBuildingMechanic =
  | "daily-hints"
  | "error-patterns"
  | "weak-item-reroll"
  | "drifting-words"
  | "custom-decks"
  | "character-inbox"
  | "scenario-contracts"
  | "storm-history";

export interface HarborBuilding {
  id: string;
  name: string;
  englishName: string;
  description: string;
  unlock: {
    pathLevel: number;
    rank: HarborRankId;
    prerequisiteBuildingId?: string;
    completedScenarioId?: string;
  };
  cost: UnlockPrice;
  mechanic: {
    id: HarborBuildingMechanic;
    label: string;
    effect: string;
  };
  district: "kajen" | "kanalen" | "vaerftet";
}

export const harborBuildings: HarborBuilding[] = [
  {
    id: "building-kaffebaren",
    name: "Kaffebaren",
    englishName: "The Coffee Bar",
    description: "Et varmt mødested ved kajen, hvor dagens første ledetråd er gratis.",
    unlock: { pathLevel: 2, rank: "skibsdreng", completedScenarioId: "harbor-cafe-morning" },
    cost: { kr: 180 },
    mechanic: { id: "daily-hints", label: "Morgenkaffe", effect: "Giver én gratis ledetråd hver dag." },
    district: "kajen",
  },
  {
    id: "building-biblioteket",
    name: "Biblioteket",
    englishName: "The Library",
    description: "Her bliver fejl til spor i stedet for nederlag.",
    unlock: { pathLevel: 3, rank: "letmatros" },
    cost: { kr: 360 },
    mechanic: { id: "error-patterns", label: "Fejlkortet", effect: "Viser mønstre i dine fejl efter færdige træninger." },
    district: "kanalen",
  },
  {
    id: "building-laesesalen",
    name: "Læsesalen",
    englishName: "The Reading Room",
    description: "En stille tilbygning til biblioteket med plads til en ny formulering.",
    unlock: { pathLevel: 4, rank: "matros", prerequisiteBuildingId: "building-biblioteket" },
    cost: { kr: 520 },
    mechanic: { id: "weak-item-reroll", label: "Ny formulering", effect: "Lader dig ombytte ét svagt item om dagen." },
    district: "kanalen",
  },
  {
    id: "building-fyrtaarnet",
    name: "Fyrtårnet",
    englishName: "The Lighthouse",
    description: "Lyset finder ord, der er ved at drive ud af hukommelsen.",
    unlock: { pathLevel: 5, rank: "baadsmand" },
    cost: { kr: 740, rav: 1 },
    mechanic: { id: "drifting-words", label: "Drivende ord", effect: "Viser de næste ord i FSRS-køen og deres forventede genkaldelse." },
    district: "kajen",
  },
  {
    id: "building-vaerftet",
    name: "Værftet",
    englishName: "The Shipyard",
    description: "Byg din egen træningsrute af ord, modaliteter og emner.",
    unlock: { pathLevel: 6, rank: "styrmand", completedScenarioId: "harbor-bike-chain" },
    cost: { kr: 980, rav: 2 },
    mechanic: { id: "custom-decks", label: "Egne togter", effect: "Åbner egne træningssæt med valgte skills og tags." },
    district: "vaerftet",
  },
  {
    id: "building-posthuset",
    name: "Posthuset",
    englishName: "The Post Office",
    description: "Breve og korte beskeder fra havnens beboere samles her.",
    unlock: { pathLevel: 4, rank: "matros", completedScenarioId: "harbor-parcel-locker" },
    cost: { kr: 460 },
    mechanic: { id: "character-inbox", label: "Indbakken", effect: "Åbner niveautilpassede beskeder fra Freja, Maja og Nora." },
    district: "kanalen",
  },
  {
    id: "building-havnekontoret",
    name: "Havnekontoret",
    englishName: "The Harbor Office",
    description: "Her bliver hverdagens problemer til betalte sprogkontrakter.",
    unlock: { pathLevel: 7, rank: "skipper", prerequisiteBuildingId: "building-posthuset" },
    cost: { kr: 1250, rav: 2 },
    mechanic: { id: "scenario-contracts", label: "Kontrakttavlen", effect: "Samler karakterkontrakter og deres bonusmål." },
    district: "kajen",
  },
  {
    id: "building-stormtaarnet",
    name: "Stormtårnet",
    englishName: "The Storm Tower",
    description: "Et udsigtspunkt over ugens sværeste ord og tidligere storme.",
    unlock: { pathLevel: 8, rank: "lods", prerequisiteBuildingId: "building-fyrtaarnet" },
    cost: { kr: 1600, rav: 4 },
    mechanic: { id: "storm-history", label: "Ugens storm", effect: "Åbner den ugentlige éngangschallenge og din resultathistorik." },
    district: "vaerftet",
  },
];

export interface RelationshipTrack {
  min: 0;
  max: 5;
  startingLevel: 0;
  levelLabels: [string, string, string, string, string, string];
}

export interface CharacterInboxMessage {
  id: string;
  subject: string;
  body: string;
  englishSupport: string;
  level: HarborLevel;
  unlock: {
    relationship: number;
    pathLevel?: number;
    completedContentId?: string;
  };
  replyOptions?: Array<{
    id: string;
    text: string;
    relationshipDelta: -1 | 0 | 1;
  }>;
}

export interface CharacterContract {
  id: string;
  title: string;
  brief: string;
  scenarioId: string;
  engine: "phone" | "dialogue" | "post" | "metro" | "harbor-case";
  unlock: {
    rank: HarborRankId;
    relationship: number;
  };
  reward: {
    xp: number;
    kr: number;
    firstTryRav: number;
    relationship: number;
  };
}

export interface CharacterEpisode {
  id: string;
  title: string;
  synopsis: string;
  scenarioId: string;
  unlock: {
    rank: HarborRankId;
    relationship: number;
    completedEpisodeId?: string;
    purchase?: UnlockPrice;
    purchaseId?: string;
  };
}

export interface HarborCharacter {
  id: "freja" | "maja" | "nora";
  name: string;
  portrait: string;
  homeBuildingId: string;
  relationship: RelationshipTrack;
  inboxMessages: CharacterInboxMessage[];
  contracts: CharacterContract[];
  episodes: CharacterEpisode[];
}

const relationshipTrack: RelationshipTrack = {
  min: 0,
  max: 5,
  startingLevel: 0,
  levelLabels: ["Fremmed", "Bekendt", "Fortrolig", "Ven", "Nær ven", "Havnefælle"],
};

export const harborCharacters: HarborCharacter[] = [
  {
    id: "freja",
    name: "Freja",
    portrait: "/characters/freja.png",
    homeBuildingId: "building-kaffebaren",
    relationship: relationshipTrack,
    inboxMessages: [
      {
        id: "inbox-freja-coffee",
        subject: "Kaffe ved kajen?",
        body: "Jeg har fundet et bord udenfor. Kommer du før regnen?",
        englishSupport: "I found a table outside. Will you arrive before the rain?",
        level: "A1",
        unlock: { relationship: 0, pathLevel: 2 },
        replyOptions: [
          { id: "reply-freja-coffee-clear", text: "Ja, jeg er der om ti minutter.", relationshipDelta: 1 },
          { id: "reply-freja-coffee-vague", text: "Måske. Vi får se.", relationshipDelta: -1 },
        ],
      },
      {
        id: "inbox-freja-travel",
        subject: "Min telefon på rejsen",
        body: "Kan du hjælpe mig med Fokus? Jeg vil gerne høre fra dig, men ikke fra alle apps.",
        englishSupport: "Can you help me with Focus? I want to hear from you, but not from every app.",
        level: "A2",
        unlock: { relationship: 2, completedContentId: "dialogue-freja-dinner" },
      },
      {
        id: "inbox-freja-honest",
        subject: "En ærlig aftale",
        body: "Det var lettere, da du sagde præcist, hvad du kunne love. Skal vi lave en plan for lørdag?",
        englishSupport: "It was easier when you said exactly what you could promise. Shall we make a plan for Saturday?",
        level: "B1",
        unlock: { relationship: 4, completedContentId: "episode-freja-boundaries" },
      },
    ],
    contracts: [
      {
        id: "contract-freja-coffee",
        title: "Den rigtige bestilling",
        brief: "Mød Freja ved kaffebaren, og bestil uden at overse hendes allergi.",
        scenarioId: "harbor-cafe-morning",
        engine: "harbor-case",
        unlock: { rank: "skibsdreng", relationship: 0 },
        reward: { xp: 55, kr: 80, firstTryRav: 1, relationship: 1 },
      },
      {
        id: "contract-freja-focus",
        title: "Ro før afrejse",
        brief: "Indstil telefonen, så vigtige opkald kommer igennem uden appstøj.",
        scenarioId: "phone-sleep",
        engine: "phone",
        unlock: { rank: "letmatros", relationship: 2 },
        reward: { xp: 90, kr: 130, firstTryRav: 1, relationship: 1 },
      },
    ],
    episodes: [
      {
        id: "episode-freja-dinner",
        title: "Middagen med en ekstra stol",
        synopsis: "En forsinkelse og en besked på låseskærmen sætter tilliden på prøve.",
        scenarioId: "dialogue-freja-dinner",
        unlock: { rank: "matros", relationship: 1 },
      },
      {
        id: "episode-freja-boundaries",
        title: "Grænser ved midnat",
        synopsis: "En sen besked kræver et varmt, men tydeligt nej.",
        scenarioId: "dialogue-freja-boundaries",
        unlock: { rank: "baadsmand", relationship: 3, completedEpisodeId: "episode-freja-dinner", purchase: { kr: 420 }, purchaseId: "unlock-freja-boundaries" },
      },
      {
        id: "episode-freja-weekend",
        title: "En weekend med plads",
        synopsis: "I planlægger en tur, hvor forventninger og privat tid skal siges højt.",
        scenarioId: "dialogue-freja-weekend",
        unlock: { rank: "styrmand", relationship: 5, completedEpisodeId: "episode-freja-boundaries", purchase: { kr: 700, rav: 1 }, purchaseId: "unlock-freja-weekend" },
      },
    ],
  },
  {
    id: "maja",
    name: "Maja",
    portrait: "/characters/maja.png",
    homeBuildingId: "building-vaerftet",
    relationship: relationshipTrack,
    inboxMessages: [
      {
        id: "inbox-maja-bike",
        subject: "Cyklen siger en mærkelig lyd",
        body: "Kæden hopper, når jeg cykler op ad bakke. Ved du, hvad jeg skal spørge værkstedet om?",
        englishSupport: "The chain skips when I ride uphill. Do you know what I should ask the workshop about?",
        level: "A2",
        unlock: { relationship: 0, pathLevel: 3 },
      },
      {
        id: "inbox-maja-slide",
        subject: "Side syv",
        body: "Jeg har kontrolleret tallet igen. Denne gang vil jeg rette det selv, men kan du læse konklusionen?",
        englishSupport: "I checked the number again. This time I want to fix it myself, but can you read the conclusion?",
        level: "B1",
        unlock: { relationship: 2, completedContentId: "dialogue-maja-pitch" },
        replyOptions: [
          { id: "reply-maja-support", text: "Ja. Send konklusionen, så giver jeg konkret feedback.", relationshipDelta: 1 },
          { id: "reply-maja-takeover", text: "Send hele filen. Jeg laver den færdig for dig.", relationshipDelta: -1 },
        ],
      },
      {
        id: "inbox-maja-opening",
        subject: "Skiltet er næsten klar",
        body: "Jeg mangler kun én beslutning: Skal der stå ‘åbent fra otte’ eller ‘vi åbner klokken otte’?",
        englishSupport: "I only need one decision: should the sign say ‘open from eight’ or ‘we open at eight’?",
        level: "B1",
        unlock: { relationship: 4, completedContentId: "episode-maja-opening" },
      },
    ],
    contracts: [
      {
        id: "contract-maja-bike",
        title: "Kæden der hopper",
        brief: "Læs symptomerne, vælg de rigtige spørgsmål, og giv værkstedet en præcis besked.",
        scenarioId: "harbor-bike-chain",
        engine: "harbor-case",
        unlock: { rank: "letmatros", relationship: 0 },
        reward: { xp: 75, kr: 110, firstTryRav: 1, relationship: 1 },
      },
      {
        id: "contract-maja-calm-screen",
        title: "En roligere skærm",
        brief: "Tilpas en telefon uden at ændre unødvendige privatlivsvalg.",
        scenarioId: "phone-calm",
        engine: "phone",
        unlock: { rank: "matros", relationship: 2 },
        reward: { xp: 100, kr: 145, firstTryRav: 1, relationship: 1 },
      },
    ],
    episodes: [
      {
        id: "episode-maja-pitch",
        title: "Fejlen på side syv",
        synopsis: "En lille fejl vokser hurtigt, hvis ingen gør problemet målbart.",
        scenarioId: "dialogue-maja-pitch",
        unlock: { rank: "matros", relationship: 1 },
      },
      {
        id: "episode-maja-opening",
        title: "Åbning før åbningstid",
        synopsis: "Maja skal bede om hjælp uden at aflevere hele ansvaret.",
        scenarioId: "dialogue-maja-opening",
        unlock: { rank: "baadsmand", relationship: 3, completedEpisodeId: "episode-maja-pitch", purchase: { kr: 390 }, purchaseId: "unlock-maja-opening" },
      },
      {
        id: "episode-maja-critique",
        title: "Den svære feedback",
        synopsis: "En kundes kritik skal omsættes til konkrete ændringer uden katastrofetænkning.",
        scenarioId: "dialogue-maja-critique",
        unlock: { rank: "styrmand", relationship: 5, completedEpisodeId: "episode-maja-opening", purchase: { kr: 680, rav: 1 }, purchaseId: "unlock-maja-critique" },
      },
    ],
  },
  {
    id: "nora",
    name: "Nora",
    portrait: "/characters/nora.png",
    homeBuildingId: "building-biblioteket",
    relationship: relationshipTrack,
    inboxMessages: [
      {
        id: "inbox-nora-parcel",
        subject: "Pakken har ingen adresse",
        body: "Skærmen viser både ‘afhent’ og ‘returnér’. Læs beskeden én gang til, før du trykker.",
        englishSupport: "The screen shows both ‘collect’ and ‘return’. Read the message once more before you press.",
        level: "A2",
        unlock: { relationship: 0, pathLevel: 3 },
      },
      {
        id: "inbox-nora-source",
        subject: "To tabeller, to år",
        body: "God rettelse. Du skrev også begrænsningen tydeligt, så læseren kan kontrollere konklusionen.",
        englishSupport: "Good correction. You also stated the limitation clearly, so the reader can verify the conclusion.",
        level: "B2",
        unlock: { relationship: 2, completedContentId: "dialogue-nora-source" },
      },
      {
        id: "inbox-nora-interview",
        subject: "Et spørgsmål uden tåge",
        body: "Send mig ét spørgsmål, som hverken antyder svaret eller gemmer variablen.",
        englishSupport: "Send me one question that neither suggests the answer nor hides the variable.",
        level: "B2",
        unlock: { relationship: 4, completedContentId: "episode-nora-interview" },
      },
    ],
    contracts: [
      {
        id: "contract-nora-parcel",
        title: "Boks 47",
        brief: "Følg pakkebeskeden og vælg den rigtige funktion på automaten.",
        scenarioId: "harbor-parcel-locker",
        engine: "harbor-case",
        unlock: { rank: "letmatros", relationship: 0 },
        reward: { xp: 70, kr: 100, firstTryRav: 1, relationship: 1 },
      },
      {
        id: "contract-nora-fraud",
        title: "Direktørens hastebetaling",
        brief: "Find tegnene, og vælg en uafhængig kontrolkanal.",
        scenarioId: "post-boss",
        engine: "post",
        unlock: { rank: "styrmand", relationship: 2 },
        reward: { xp: 135, kr: 185, firstTryRav: 1, relationship: 1 },
      },
    ],
    episodes: [
      {
        id: "episode-nora-sources",
        title: "To kilder, én overskrift",
        synopsis: "En deadline gør præcision vigtigere, ikke mindre vigtig.",
        scenarioId: "dialogue-nora-source",
        unlock: { rank: "baadsmand", relationship: 1 },
      },
      {
        id: "episode-nora-interview",
        title: "Interviewet på kajen",
        synopsis: "Et ledende spørgsmål skal omskrives, før optageren tændes.",
        scenarioId: "dialogue-nora-interview",
        unlock: { rank: "styrmand", relationship: 3, completedEpisodeId: "episode-nora-sources", purchase: { kr: 480 }, purchaseId: "unlock-nora-interview" },
      },
      {
        id: "episode-nora-correction",
        title: "Rettelsen på forsiden",
        synopsis: "En offentlig fejl kræver både præcis rettelse og ansvarlig tone.",
        scenarioId: "dialogue-nora-correction",
        unlock: { rank: "skipper", relationship: 5, completedEpisodeId: "episode-nora-interview", purchase: { kr: 760, rav: 1 }, purchaseId: "unlock-nora-correction" },
      },
    ],
  },
];

export interface ScenarioBossGate {
  id: string;
  afterPathLevel: number;
  title: string;
  description: string;
  scenarioIds: string[];
  requiredCompletions: number;
  endingRequirements?: Array<{
    caseId: string;
    endingId: string;
    description: string;
  }>;
  reward: {
    kr: number;
    buildingId?: string;
  };
}

export const scenarioBossGates: ScenarioBossGate[] = [
  {
    id: "boss-gate-level-02",
    afterPathLevel: 2,
    title: "Morgen ved kajen",
    description: "Gennemfør din første hverdagssamtale, før havnen åbner videre.",
    scenarioIds: ["harbor-cafe-morning"],
    requiredCompletions: 1,
    reward: { kr: 90, buildingId: "building-kaffebaren" },
  },
  {
    id: "boss-gate-level-04",
    afterPathLevel: 4,
    title: "Hjælp på havnen",
    description: "Løs to af tre praktiske problemer på dansk.",
    scenarioIds: ["harbor-bike-chain", "harbor-parcel-locker", "phone-sleep"],
    requiredCompletions: 2,
    reward: { kr: 180, buildingId: "building-posthuset" },
  },
  {
    id: "boss-gate-level-06",
    afterPathLevel: 6,
    title: "Byen under pres",
    description: "Læs situationen, og vælg en løsning uden gratis kontrol.",
    scenarioIds: ["metro-wheelchair", "post-deposit", "phone-calm"],
    requiredCompletions: 2,
    reward: { kr: 280, buildingId: "building-vaerftet" },
  },
  {
    id: "boss-gate-level-08",
    afterPathLevel: 8,
    title: "Havnevagten",
    description: "Vis, at du kan forstå nuancer i både relationer og instruktioner.",
    scenarioIds: ["post-boss", "phone-roaming", "metro-closure"],
    requiredCompletions: 2,
    reward: { kr: 420, buildingId: "building-fyrtaarnet" },
  },
  {
    id: "boss-gate-level-10",
    afterPathLevel: 10,
    title: "Skyldens kompas",
    description: "Før en vanskelig sag gennem tidspres, modstridende forklaringer og et møde, hvor nogen skal betale prisen.",
    scenarioIds: ["dialogue-maja-faultline", "post-boss", "metro-last-train"],
    requiredCompletions: 3,
    endingRequirements: [
      {
        caseId: "dialogue-maja-faultline",
        endingId: "maja-scapegoat-win",
        description: "Lad mødet finde en skyldig, uden at regningen lander hos dig.",
      },
    ],
    reward: { kr: 650, buildingId: "building-havnekontoret" },
  },
  {
    id: "boss-gate-level-11",
    afterPathLevel: 11,
    title: "En aftale i mørket",
    description: "Find en udvej, hvor tillid er mindre værd end det, begge parter ved om hinanden.",
    scenarioIds: ["dialogue-freja-alibi", "storskrald", "night-dispatch"],
    requiredCompletions: 2,
    endingRequirements: [
      {
        caseId: "dialogue-freja-alibi",
        endingId: "freja-mutual-blackmail",
        description: "Gå derfra med en aftale, som ingen af jer tør bryde.",
      },
    ],
    reward: { kr: 760 },
  },
  {
    id: "boss-gate-level-12",
    afterPathLevel: 12,
    title: "Revisionens blinde vinkel",
    description: "Sammenhold et kunstigt vidne med byens dokumenter, og afgør hvad der bør overleve kontrollen.",
    scenarioIds: [
      "dialogue-eli9-audit",
      "storskrald", "flyttedag", "boligstoette", "blodproeve", "varmeaflaesning",
      "morgenbud", "regnvej", "kulturaften", "natskift", "oefaergen",
    ],
    requiredCompletions: 2,
    endingRequirements: [
      {
        caseId: "dialogue-eli9-audit",
        endingId: "eli9-ghost-protocol",
        description: "Bestå kontrollen, uden at efterlade et navn i revisionssporet.",
      },
    ],
    reward: { kr: 860 },
  },
  {
    id: "boss-gate-level-13",
    afterPathLevel: 13,
    title: "Den manglende linje",
    description: "Afgør hvad offentligheden må vide, når hele sandheden kan ødelægge selve beviset.",
    scenarioIds: ["dialogue-nora-redline", "natskift", "quay-permits"],
    requiredCompletions: 2,
    endingRequirements: [
      {
        caseId: "dialogue-nora-redline",
        endingId: "nora-redacted-truth",
        description: "Få sandheden ud, uden at den farligste linje kommer på tryk.",
      },
    ],
    reward: { kr: 1020 },
  },
  {
    id: "boss-gate-level-14",
    afterPathLevel: 14,
    title: "Stemmer under vand",
    description: "Hold havnen i drift, mens et kollektiv kræver enighed og den eneste afvigende stemme nægter at forsvinde.",
    scenarioIds: [
      "dialogue-koret-blackout",
      "harbor-investigation",
      "night-dispatch", "bridge-crews", "radio-allocation", "lock-windows", "watch-rotation",
      "sluice-warning", "water-notice", "platform-change", "quay-permits", "medicine-recall",
    ],
    requiredCompletions: 3,
    endingRequirements: [
      {
        caseId: "dialogue-koret-blackout",
        endingId: "koret-minority-report",
        description: "Bevar den ene stemme, som flertallet helst vil slukke.",
      },
    ],
    reward: { kr: 1200, buildingId: "building-stormtaarnet" },
  },
  {
    id: "boss-gate-level-15",
    afterPathLevel: 15,
    title: "Kortet over kajen",
    description: "Brug retning, placering og målbare spor i mindst to forskellige systemer, før du sejler videre.",
    scenarioIds: [
      "terminal-kajpakker-15",
      "farvekoden-paa-broen",
      "myndighed-faergen-15",
      "sluice-cargo-theft",
    ],
    requiredCompletions: 2,
    reward: { kr: 1320 },
  },
  {
    id: "boss-gate-level-16",
    afterPathLevel: 16,
    title: "Det, loggen sagde",
    description: "Gengiv andres forklaringer præcist, og kontrollér dem mod data i mindst to af havnens nye prøver.",
    scenarioIds: [
      "terminal-loginspor-16",
      "fyrlysets-stroemkreds",
      "myndighed-fugtproeven-16",
      "silent-account",
    ],
    requiredCompletions: 2,
    reward: { kr: 1440 },
  },
  {
    id: "boss-gate-level-17",
    afterPathLevel: 17,
    title: "Ordene under målingen",
    description: "Vælg forbindelser, der både holder sprogligt og teknisk, når en enkelt detalje kan ændre konklusionen.",
    scenarioIds: [
      "terminal-forsyningsrevision-17",
      "maalingen-der-ikke-er-et-punkt",
      "myndighed-ansigtsfilteret-17",
      "double-ledger",
    ],
    requiredCompletions: 2,
    reward: { kr: 1560 },
  },
  {
    id: "boss-gate-level-18",
    afterPathLevel: 18,
    title: "Værftets samlinger",
    description: "Byg noget, der kan bære: et ord, en filsti, en beregning eller en beviskæde. To prøver skal bestås.",
    scenarioIds: [
      "terminal-billedkaj-18",
      "kranen-i-balance",
      "myndighed-elevatoren-18",
      "shipyard-fire",
    ],
    requiredCompletions: 2,
    reward: { kr: 1700 },
  },
  {
    id: "boss-gate-level-19",
    afterPathLevel: 19,
    title: "Hvis kæden var bristet",
    description: "Følg årsager og konsekvenser gennem flere led, og vis i mindst to prøver, hvad der kunne have forhindret skaden.",
    scenarioIds: [
      "terminal-koelekaede-19",
      "tre-proever-i-saltvand",
      "myndighed-noedstroemmen-19",
      "missing-insulin",
    ],
    requiredCompletions: 2,
    reward: { kr: 1860 },
  },
  {
    id: "boss-gate-level-20",
    afterPathLevel: 20,
    title: "Den sidste formulering",
    description: "Afslut rejsen med tre stærke afgørelser, hvor sprog, dokumentation og konsekvens peger samme vej.",
    scenarioIds: [
      "terminal-kontraktspor-20",
      "kuldebroens-regnskab",
      "myndighed-leverandoeren-20",
      "reading-room-murder",
    ],
    requiredCompletions: 3,
    reward: { kr: 2200 },
  },
];

export type HarborCaseSkill =
  | "reading-instructions"
  | "food-and-allergies"
  | "polite-requests"
  | "problem-description"
  | "question-asking"
  | "compound-nouns"
  | "parcel-vocabulary"
  | "sequence-and-numbers";

export interface HarborCaseChoice {
  id: string;
  text: string;
  next: string;
  correct: boolean;
  feedback: string;
  krDelta?: number;
}

export interface HarborCaseNode {
  id: string;
  type: "brief" | "choice" | "terminal";
  speaker?: string;
  text: string;
  englishSupport?: string;
  choices?: HarborCaseChoice[];
  terminal?: {
    success: boolean;
    summary: string;
  };
}

export interface HarborScenarioCase {
  id: string;
  title: string;
  level: Extract<HarborLevel, "A1" | "A2">;
  location: string;
  icon: "coffee" | "bike" | "package";
  objective: string;
  startNode: string;
  skills: HarborCaseSkill[];
  firstTryReward: {
    xp: number;
    kr: number;
    rav: 1;
  };
  retryCostKr: number;
  nodes: Record<string, HarborCaseNode>;
}

export const harborScenarioCases: HarborScenarioCase[] = [
  {
    id: "harbor-cafe-morning",
    title: "Morgenbestillingen",
    level: "A1",
    location: "Kaffebaren · 08.10",
    icon: "coffee",
    objective: "Bestil to drikke og undgå mælk i Frejas kop.",
    startNode: "cafe-brief",
    skills: ["reading-instructions", "food-and-allergies", "polite-requests"],
    firstTryReward: { xp: 55, kr: 80, rav: 1 },
    retryCostKr: 12,
    nodes: {
      "cafe-brief": {
        id: "cafe-brief",
        type: "choice",
        speaker: "Freja",
        text: "Jeg vil gerne have en lille kaffe med havredrik. Ingen mælk. Du må vælge noget til dig selv.",
        englishSupport: "I would like a small coffee with oat drink. No milk. You may choose something for yourself.",
        choices: [
          { id: "cafe-order-oat", text: "En lille kaffe med havredrik og en te, tak.", next: "cafe-confirm", correct: true, feedback: "Du bruger ‘med’ og nævner havredrik tydeligt." },
          { id: "cafe-order-milk", text: "To kaffe med mælk, tak.", next: "cafe-repair", correct: false, feedback: "Freja sagde ‘ingen mælk’. Du skal rette bestillingen." },
          { id: "cafe-order-vague", text: "To af dem der, tak.", next: "cafe-repair", correct: false, feedback: "‘Dem der’ fortæller ikke baristaen, hvilken drik eller størrelse du mener." },
        ],
      },
      "cafe-repair": {
        id: "cafe-repair",
        type: "choice",
        speaker: "Barista",
        text: "Undskyld, hvad skal der være i den lille kaffe?",
        englishSupport: "Sorry, what should be in the small coffee?",
        choices: [
          { id: "cafe-repair-oat", text: "Havredrik, ikke mælk.", next: "cafe-confirm", correct: true, feedback: "Kort og præcis rettelse." },
          { id: "cafe-repair-none", text: "Det er lige meget.", next: "cafe-fail", correct: false, feedback: "Det er ikke lige meget, når bestillingen har en tydelig begrænsning." },
        ],
      },
      "cafe-confirm": {
        id: "cafe-confirm",
        type: "choice",
        speaker: "Barista",
        text: "En lille kaffe med havredrik og en te. Er det korrekt?",
        choices: [
          { id: "cafe-confirm-yes", text: "Ja, det er korrekt.", next: "cafe-success", correct: true, feedback: "Bestillingen matcher beskeden." },
          { id: "cafe-confirm-no", text: "Nej, kaffen skal være med mælk.", next: "cafe-fail", correct: false, feedback: "Du ændrer den vigtigste del af bestillingen." },
        ],
      },
      "cafe-success": { id: "cafe-success", type: "terminal", text: "Baristaen sætter den rigtige kop på disken.", terminal: { success: true, summary: "Du bestilte tydeligt og kontrollerede drikken." } },
      "cafe-fail": { id: "cafe-fail", type: "terminal", text: "Bestillingen må laves om.", terminal: { success: false, summary: "Læs begrænsningen igen, før du bekræfter." } },
    },
  },
  {
    id: "harbor-bike-chain",
    title: "Kæden der hopper",
    level: "A2",
    location: "Cykelværkstedet · 15.25",
    icon: "bike",
    objective: "Beskriv problemet præcist, så mekanikeren undersøger den rigtige del.",
    startNode: "bike-symptom",
    skills: ["problem-description", "question-asking", "compound-nouns"],
    firstTryReward: { xp: 75, kr: 110, rav: 1 },
    retryCostKr: 18,
    nodes: {
      "bike-symptom": {
        id: "bike-symptom",
        type: "choice",
        speaker: "Maja",
        text: "Kæden hopper kun, når jeg træder hårdt op ad bakke. Dækkene holder luften, og bremserne virker.",
        englishSupport: "The chain only skips when I pedal hard uphill. The tires hold air, and the brakes work.",
        choices: [
          { id: "bike-report-chain", text: "Kæden hopper under belastning, især op ad bakke.", next: "bike-question", correct: true, feedback: "Du nævner både delen og situationen, hvor fejlen opstår." },
          { id: "bike-report-flat", text: "Bagdækket er fladt hele tiden.", next: "bike-wrong-part", correct: false, feedback: "Maja sagde, at dækkene holder luften." },
          { id: "bike-report-vague", text: "Cyklen er mærkelig.", next: "bike-question", correct: false, feedback: "Beskriv hvad der sker, og hvornår det sker." },
        ],
      },
      "bike-wrong-part": {
        id: "bike-wrong-part",
        type: "choice",
        speaker: "Mekaniker",
        text: "Er du sikker? Dækket ser normalt ud. Hvad sker der, når hun træder hårdt?",
        choices: [
          { id: "bike-correct-report", text: "Du har ret. Kæden hopper under belastning.", next: "bike-question", correct: true, feedback: "Du retter beskrivelsen med det relevante symptom." },
          { id: "bike-insist-flat", text: "Skift dækket alligevel.", next: "bike-fail", correct: false, feedback: "Et nyt dæk løser ikke det beskrevne kædeproblem." },
        ],
      },
      "bike-question": {
        id: "bike-question",
        type: "choice",
        speaker: "Mekaniker",
        text: "Hvad skal jeg kontrollere først?",
        choices: [
          { id: "bike-check-drive", text: "Kan du kontrollere kæden og tandhjulene?", next: "bike-success", correct: true, feedback: "Kæde og tandhjul hører til det system, der svigter under belastning." },
          { id: "bike-check-bell", text: "Kan du kontrollere ringeklokken?", next: "bike-fail", correct: false, feedback: "Ringeklokken har ingen forbindelse til symptomet." },
          { id: "bike-check-everything", text: "Kan du bare skifte alt?", next: "bike-fail", correct: false, feedback: "En præcis bestilling er billigere og lettere at forstå." },
        ],
      },
      "bike-success": { id: "bike-success", type: "terminal", text: "Mekanikeren finder et slidt tandhjul og giver et klart prisoverslag.", terminal: { success: true, summary: "Du beskrev del, symptom og situation præcist." } },
      "bike-fail": { id: "bike-fail", type: "terminal", text: "Værkstedet kan ikke vælge den rigtige reparation ud fra beskeden.", terminal: { success: false, summary: "Brug symptom + tidspunkt + relevant del." } },
    },
  },
  {
    id: "harbor-parcel-locker",
    title: "Boks 47",
    level: "A2",
    location: "Pakkeboksen · 18.06",
    icon: "package",
    objective: "Afhent den rigtige pakke uden at starte en returnering.",
    startNode: "parcel-message",
    skills: ["reading-instructions", "parcel-vocabulary", "sequence-and-numbers"],
    firstTryReward: { xp: 70, kr: 100, rav: 1 },
    retryCostKr: 16,
    nodes: {
      "parcel-message": {
        id: "parcel-message",
        type: "choice",
        speaker: "Besked fra PostNord",
        text: "Din pakke kan afhentes i boks 47 til og med fredag. Tryk ‘Afhent’, og indtast koden 3816. Pakken skal ikke returneres.",
        englishSupport: "Your parcel can be collected from locker 47 through Friday. Press ‘Collect’ and enter code 3816. The parcel must not be returned.",
        choices: [
          { id: "parcel-pickup", text: "Afhent pakke", next: "parcel-code", correct: true, feedback: "‘Afhent’ betyder, at du henter pakken." },
          { id: "parcel-return", text: "Returnér pakke", next: "parcel-cancel-return", correct: false, feedback: "‘Returnér’ sender pakken tilbage i stedet for at udlevere den." },
        ],
      },
      "parcel-cancel-return": {
        id: "parcel-cancel-return",
        type: "choice",
        speaker: "Pakkeboks",
        text: "Vil du sende en pakke retur?",
        choices: [
          { id: "parcel-cancel", text: "Annullér og gå tilbage", next: "parcel-code", correct: true, feedback: "Du stopper den forkerte handling og kan fortsætte med afhentning." },
          { id: "parcel-confirm-return", text: "Ja, fortsæt returnering", next: "parcel-fail", correct: false, feedback: "Beskeden siger direkte, at pakken ikke skal returneres." },
        ],
      },
      "parcel-code": {
        id: "parcel-code",
        type: "choice",
        speaker: "Pakkeboks",
        text: "Indtast afhentningskode.",
        choices: [
          { id: "parcel-code-correct", text: "3816", next: "parcel-locker", correct: true, feedback: "Koden matcher beskeden." },
          { id: "parcel-code-box", text: "0047", next: "parcel-fail", correct: false, feedback: "47 er boksens nummer, ikke afhentningskoden." },
          { id: "parcel-code-date", text: "0005", next: "parcel-fail", correct: false, feedback: "Fredag er en frist, ikke en kode." },
        ],
      },
      "parcel-locker": {
        id: "parcel-locker",
        type: "choice",
        speaker: "Pakkeboks",
        text: "Koden er godkendt. Boks 47 er åben. Hvad gør du nu?",
        choices: [
          { id: "parcel-take-close", text: "Tag pakken, og luk lågen.", next: "parcel-success", correct: true, feedback: "Du afslutter afhentningen i den rigtige rækkefølge." },
          { id: "parcel-leave-open", text: "Lad pakken og lågen stå åben.", next: "parcel-fail", correct: false, feedback: "Pakken skal tages ud, og lågen skal lukkes." },
        ],
      },
      "parcel-success": { id: "parcel-success", type: "terminal", text: "Boks 47 er tom og låst igen.", terminal: { success: true, summary: "Du fulgte funktion, kode og rækkefølge korrekt." } },
      "parcel-fail": { id: "parcel-fail", type: "terminal", text: "Afhentningen blev ikke afsluttet.", terminal: { success: false, summary: "Skeln mellem boksnummer, kode og handling." } },
    },
  },
];

export interface PaidContinuationUnlock {
  id: string;
  ownerCharacterId: HarborCharacter["id"];
  contentId: string;
  contentType: "episode" | "contract";
  price: UnlockPrice;
  requires: {
    rank: HarborRankId;
    relationship: number;
    completedContentId: string;
  };
}

export const paidContinuationUnlocks: PaidContinuationUnlock[] = harborCharacters.flatMap((character) =>
  character.episodes.flatMap((episode) =>
    episode.unlock.purchase && episode.unlock.purchaseId && episode.unlock.completedEpisodeId
      ? [{
          id: episode.unlock.purchaseId,
          ownerCharacterId: character.id,
          contentId: episode.id,
          contentType: "episode" as const,
          price: episode.unlock.purchase,
          requires: {
            rank: episode.unlock.rank,
            relationship: episode.unlock.relationship,
            completedContentId: episode.unlock.completedEpisodeId,
          },
        }]
      : [],
  ),
);

export const harborData = {
  ranks: harborRanks,
  buildings: harborBuildings,
  characters: harborCharacters,
  bossGates: scenarioBossGates,
  scenarioCases: harborScenarioCases,
  paidContinuationUnlocks,
} as const;
