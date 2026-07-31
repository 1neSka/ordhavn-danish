export type DialogueMoralTone = "open" | "pragmatic" | "deceptive" | "ruthless" | "protective";

export type DialogueEndingTone = "clear" | "amber" | "cold" | "danger" | "strange";

export type DialogueEndingRarity = "common" | "uncommon" | "rare" | "secret";

export interface DialogueCampaignFact {
  label: string;
  value: string;
  significance: string;
}

export interface DialogueCampaignBriefing {
  lead: string;
  paragraphs: string[];
  facts: DialogueCampaignFact[];
  warning: string;
}

export interface DialogueCampaignMeter {
  id: string;
  label: string;
  start: number;
  min: number;
  max: number;
  color: string;
  inverse?: boolean;
}

export interface DialogueCampaignChoice {
  id: string;
  text: string;
  next: string | null;
  endingId?: string;
  effects: Record<string, number>;
  flags?: string[];
  requiresFlags?: string[];
  insight: string;
  principle: string;
  moralTone: DialogueMoralTone;
}

export interface DialogueCampaignNode {
  id: string;
  speaker: string;
  line: string;
  stage: string;
  choices: DialogueCampaignChoice[];
  aiInput?: {
    prompt: string;
    placeholder: string;
    minimumChars: number;
    routes: Array<{
      id: string;
      label: string;
      guidance: string;
      next: string | null;
      endingId?: string;
      effects: Record<string, number>;
      flags?: string[];
      moralTone: DialogueMoralTone;
    }>;
  };
}

export interface DialogueCampaignEnding {
  id: string;
  title: string;
  kicker: string;
  description: string;
  epilogue: string;
  tone: DialogueEndingTone;
  success: boolean;
  rarity: DialogueEndingRarity;
}

export interface DialogueCampaignCase {
  id: string;
  title: string;
  level: "B1" | "B2";
  location: string;
  premise: string;
  objective: string;
  briefing: DialogueCampaignBriefing;
  meters: DialogueCampaignMeter[];
  startNode: string;
  nodes: Record<string, DialogueCampaignNode>;
  endings: Record<string, DialogueCampaignEnding>;
}

export interface DialogueCampaignCharacter {
  id: string;
  name: string;
  ageLabel: string;
  archetype: string;
  portrait: string;
  color: string;
  psychology: string;
  case: DialogueCampaignCase;
}

const frejaCase: DialogueCampaignCase = {
  id: "dialogue-freja-alibi",
  title: "Alibiet på kajen",
  level: "B2",
  location: "Kajhotellet · 23.18",
  premise: "Freja brugte dit adgangskort til at hente et dokument, der både kan afsløre korruption og ødelægge hendes brors sag.",
  objective: "Beslut, hvilken sandhed der skal overleve revisionen, og hvilken pris Freja skal betale for din loyalitet.",
  briefing: {
    lead: "Om tolv minutter ringer havnens interne revisor. Freja har allerede fortalt ham, at I sad sammen på Kajhotellet hele aftenen.",
    paragraphs: [
      "Frejas bror, Kasper, blev flyttet bagud på en kommunal behandlingsliste. Freja siger, at det skyldes et skjult pointsystem, hvor en afdelingsleder sælger hurtigere tider til private patienter. Hun brugte dit medarbejderkort i journalarkivet og kopierede en mappe, der ser ud til at støtte hendes påstand.",
      "Problemet er, at mappen også indeholder andre patienters oplysninger. Hvis hele kopien afleveres, bliver pointsystemet sandsynligvis afsløret, men Kaspers klage kan blive afvist på grund af ulovlig adgang. Hvis du bekræfter Frejas alibi, lyver du om et tidspunkt, som hotellets kamera allerede gør vanskeligt at forklare.",
      "Freja er ikke bare bange. Hun har en lydfil, hvor afdelingslederen nævner betalinger, og hun ved, at du tidligere har brugt dit kort uden at registrere formålet. Hun vil gerne have din loyalitet, men hun respekterer kun en aftale, når begge parter risikerer noget ved at bryde den.",
    ],
    facts: [
      { label: "Adgangslog", value: "Dit kort åbnede arkivet kl. 22.41.", significance: "En direkte benægtelse kan kontrolleres." },
      { label: "Hotelkamera", value: "Du ses alene ved baren kl. 22.44.", significance: "Historien om en hel aften sammen holder ikke." },
      { label: "Lydfil", value: "Freja har en uredigeret optagelse om betalinger.", significance: "Korruptionssporet kan bevises uden patientmappen." },
      { label: "Revisionsmandat", value: "Revisoren undersøger adgang, ikke behandlingskøen.", significance: "Du skal selv skabe en lovlig vej til den større sag." },
    ],
    warning: "Freja registrerer ikke venlighed som loyalitet. Hun måler, om din version også koster dig noget.",
  },
  meters: [
    { id: "trust", label: "Tillid", start: 46, min: 0, max: 100, color: "#d66b9b" },
    { id: "leverage", label: "Forhandlingsmagt", start: 28, min: 0, max: 100, color: "#8f7cff" },
    { id: "exposure", label: "Eksponering", start: 34, min: 0, max: 100, color: "#f28b63", inverse: true },
  ],
  startNode: "fa-start",
  nodes: {
    "fa-start": {
      id: "fa-start",
      speaker: "Freja",
      line: "Når revisoren ringer, siger du, at vi sad her fra ti til elleve. Ikke at du tror det. At du ved det. Kan du gøre det?",
      stage: "Hun lægger din adgangslog mellem to glas og holder tommelfingeren over tidspunktet.",
      choices: [
        { id: "fa-start-truth", text: "Nej. Men jeg kan forklare, hvorfor kortet blev brugt, og få lydfilen ind i en separat undersøgelse.", next: "fa-ledger", effects: { trust: -8, leverage: 12, exposure: -4 }, flags: ["refused-alibi"], insight: "Du afviser løgnen, men tilbyder en konkret vej for beviset.", principle: "Et nej virker kun, hvis alternativet kan bruges.", moralTone: "open" },
        { id: "fa-start-cover", text: "Jeg bekræfter hotelhistorien, men du giver mig en kopi af lydfilen først.", next: "fa-rehearsal", effects: { trust: 8, leverage: 18, exposure: 14 }, flags: ["shared-lie", "holds-audio"], insight: "Du køber indflydelse med en kontrollerbar løgn.", principle: "Gensidig risiko kan stabilisere en beskidt aftale.", moralTone: "deceptive" },
        { id: "fa-start-price", text: "Mit alibi er ikke gratis. Kasper får hjælpen; bagefter skylder du mig én tjeneste uden spørgsmål.", next: "fa-bargain", effects: { trust: -5, leverage: 27, exposure: 9 }, flags: ["named-price"], insight: "Du gør loyalitet til gæld og ændrer relationens magtbalance.", principle: "En klar pris kan være effektiv uden at være ren.", moralTone: "ruthless" },
      ],
    },
    "fa-ledger": {
      id: "fa-ledger",
      speaker: "Freja",
      line: "En separat undersøgelse tager måneder. Kasper mister sin tid på fredag. Hvor meget sandhed er hans helbred værd for dig?",
      stage: "Hun åbner en side, hvor tre private betalinger står ved siden af flyttede tider.",
      choices: [
        { id: "fa-ledger-audit", text: "Jeg fortæller revisoren om kortet og kræver, at lydfilen sendes direkte til ombudsmanden i aften.", next: "fa-audit", effects: { trust: 4, leverage: 6, exposure: 7 }, flags: ["ombudsman-route"], insight: "Du kobler ansvar for adgangen med en hurtig, uafhængig kanal.", principle: "Del en sag efter mandat, ikke efter bekvemmelighed.", moralTone: "pragmatic" },
        { id: "fa-ledger-patients", text: "Vi anonymiserer de andre patienter og lækker kun mønstret til pressen.", next: "fa-proof", effects: { trust: 13, leverage: 8, exposure: 16 }, flags: ["redacted-leak"], insight: "Du beskytter uvedkommende, men omgår stadig den formelle proces.", principle: "Skadesreduktion gør ikke en læk lovlig, men kan gøre den forsvarlig.", moralTone: "protective" },
        { id: "fa-ledger-sacrifice", text: "Jeg afleverer dit navn og lydfilen. Kaspers sag må overleve uden os.", next: null, endingId: "freja-public-truth", effects: { trust: -35, leverage: -8, exposure: -18 }, insight: "Korruptionen kan undersøges, men du vælger institutionen over Freja.", principle: "Offentlig sandhed kan kræve et privat brud.", moralTone: "open" },
      ],
    },
    "fa-rehearsal": {
      id: "fa-rehearsal",
      speaker: "Freja",
      line: "Kameraet viser dig alene klokken 22.44. Jeg kan sige, at jeg var på toilettet. Hvad siger du, hvis han spørger til regningen?",
      stage: "Hun svarer for hurtigt; dette er tredje version, hun har øvet.",
      choices: [
        { id: "fa-rehearsal-limit", text: "Jeg siger kun, at vi mødtes senere. Jeg gentager ikke en version, kameraet kan knuse.", next: "fa-audit", effects: { trust: -4, leverage: 10, exposure: -8 }, flags: ["limited-statement"], insight: "Du indsnævrer løgnen til det, beviserne ikke direkte modsiger.", principle: "En begrænset påstand er sværere at fange end en perfekt historie.", moralTone: "deceptive" },
        { id: "fa-rehearsal-receipt", text: "Jeg betaler kontant for et ekstra glas nu og beder bartenderen føre det på den gamle regning.", next: "fa-cover", effects: { trust: 11, leverage: 4, exposure: 25 }, flags: ["forged-receipt"], insight: "Du producerer nyt bevis, men skaber også et nyt vidne.", principle: "Falske spor vokser hurtigere end kontrollen over dem.", moralTone: "ruthless" },
        { id: "fa-rehearsal-turn", text: "Vi stopper. Lydfilen er stærkere end et dårligt alibi, hvis vi beskytter Kaspers navn.", next: "fa-proof", effects: { trust: 2, leverage: 5, exposure: -10 }, flags: ["abandoned-alibi"], insight: "Du vender tilbage til det bevis, der ikke kræver en tidslinje.", principle: "Drop en skrøbelig plan, før den bliver identitet.", moralTone: "pragmatic" },
      ],
    },
    "fa-bargain": {
      id: "fa-bargain",
      speaker: "Freja",
      line: "En tjeneste uden spørgsmål er bare et pænt ord for ejerskab. Hvad lægger du selv på bordet?",
      stage: "Hun sender lydfilen til en planlagt mail og viser dig knappen, der kan annullere den.",
      choices: [
        { id: "fa-bargain-record", text: "Min egen uregistrerede adgang. Vi skriver begge tilståelser ned og opbevarer dem hver for sig.", next: "fa-pact", effects: { trust: 15, leverage: 22, exposure: 15 }, flags: ["mutual-record"], insight: "Du tilbyder et symmetrisk våben i stedet for tom loyalitet.", principle: "Symmetrisk sårbarhed kan erstatte tillid.", moralTone: "ruthless" },
        { id: "fa-bargain-narrow", text: "Fint. Tjenesten må ikke skade andre eller skjule ny vold. Resten bestemmer du.", next: "fa-cover", effects: { trust: 7, leverage: 10, exposure: 8 }, flags: ["bounded-debt"], insight: "Du beholder en ubehagelig handel, men sætter en faktisk grænse.", principle: "Selv beskidte kontrakter behøver en afgrænsning.", moralTone: "pragmatic" },
        { id: "fa-bargain-threat", text: "Annullér mailen, ellers sender jeg adgangsloggen til revisoren nu.", next: null, endingId: "freja-burned-bridge", effects: { trust: -40, leverage: 16, exposure: 10 }, insight: "Truslen giver øjeblikkelig kontrol og gør Freja til en modstander.", principle: "Magt uden udvej skaber modmagt.", moralTone: "ruthless" },
      ],
    },
    "fa-audit": {
      id: "fa-audit",
      speaker: "Revisor Holm",
      line: "Jeg spørger enkelt: gav du Freja lov til at bruge kortet, og var du til stede ved arkivet?",
      stage: "Telefonen er på højttaler. Freja kan høre dit svar, men Holm kan ikke høre hende.",
      choices: [
        { id: "fa-audit-full", text: "Hun brugte kortet med min viden; jeg var ikke der. Jeg vil også indberette et separat bevis om køsystemet.", next: null, endingId: "freja-public-truth", effects: { trust: -18, leverage: 2, exposure: -20 }, insight: "Du svarer præcist og åbner den større sag uden at pynte på din rolle.", principle: "Svar på spørgsmålet, og navngiv det manglende mandat.", moralTone: "open" },
        { id: "fa-audit-split", text: "Jeg gav ikke tilladelse til arkivet. Men før I kontakter Freja, skal I sikre en ekstern kopi af betalingsbeviset.", next: "fa-proof", effects: { trust: -10, leverage: 12, exposure: -2 }, flags: ["split-blame"], insight: "Du beskytter beviset ved at skubbe ansvaret mod Freja.", principle: "Procesbeskyttelse kan stadig være forræderi.", moralTone: "pragmatic" },
        { id: "fa-audit-deny", text: "Kortet må være blevet kopieret. Freja og jeg var på hotellet, men ikke hele tiden.", next: "fa-cover", effects: { trust: 8, leverage: 2, exposure: 21 }, flags: ["card-clone-lie"], insight: "Du undgår den umulige tidslinje og opfinder en teknisk forklaring.", principle: "En plausibel løgn flytter blot kontrollen til et andet bevis.", moralTone: "deceptive" },
      ],
    },
    "fa-proof": {
      id: "fa-proof",
      speaker: "Freja",
      line: "Hvis vi sender lydfilen, genkender han min stemme i begyndelsen. Jeg kan klippe den væk, men så kan de kalde resten manipuleret.",
      stage: "Bølgen i lydprogrammet viser syv sekunder med Frejas spørgsmål før lederens svar.",
      choices: [
        { id: "fa-proof-chain", text: "Behold originalen hos en advokat og offentliggør en anonymiseret kopi med kontrolsum.", next: null, endingId: "freja-protected-brother", effects: { trust: 17, leverage: 5, exposure: -5 }, insight: "Originalen kan valideres, mens den offentlige kopi skjuler identiteten.", principle: "Adskil autenticitet fra offentlig eksponering.", moralTone: "protective" },
        { id: "fa-proof-press", text: "Send alt uredigeret. Hvis Kasper bliver ramt, bliver hans historie en del af afsløringen.", next: null, endingId: "freja-public-truth", effects: { trust: -14, leverage: 14, exposure: 25 }, insight: "Maksimal gennemsigtighed bruger også Kasper som materiale.", principle: "Sandhed uden samtykke har egne ofre.", moralTone: "ruthless" },
        { id: "fa-proof-bury", text: "Slet patientmappen, behold lydfilen, og brug den kun som pres for at få Kaspers tid tilbage.", next: "fa-pact", effects: { trust: 13, leverage: 24, exposure: -2 }, flags: ["private-leverage"], insight: "Du bytter systemisk retfærdighed for et konkret menneskes fordel.", principle: "Privat afpresning kan løse én sag og bevare systemet.", moralTone: "deceptive" },
      ],
    },
    "fa-cover": {
      id: "fa-cover",
      speaker: "Freja",
      line: "Holm vil have en skriftlig forklaring i morgen. Skal vi holde fast, eller skal én af os tage faldet?",
      stage: "Hun har allerede skrevet to udkast: et fælles og et med kun dit navn.",
      choices: [
        { id: "fa-cover-joint", text: "Vi afleverer en fælles, begrænset forklaring og nægter at svare på patientdata uden advokat.", next: null, endingId: "freja-protected-brother", effects: { trust: 20, leverage: 3, exposure: 8 }, insight: "I koordinerer uden at opfinde flere detaljer og beskytter materialet juridisk.", principle: "Fælles tavshed er stærkest, når den er smal.", moralTone: "protective" },
        { id: "fa-cover-you", text: "Skriv, at jeg lånte dig kortet til et privat ærinde. Jeg tager sanktionen, og du skylder mig offentligt.", next: "fa-pact", effects: { trust: 16, leverage: 25, exposure: 19 }, flags: ["took-blame"], insight: "Du køber Frejas sikkerhed med et dokumenteret krav på hende.", principle: "Et offer kan også være en investering i magt.", moralTone: "ruthless" },
        { id: "fa-cover-her", text: "Du brugte kortet uden min viden. Det er den eneste version, jeg underskriver.", next: null, endingId: "freja-clean-distance", effects: { trust: -28, leverage: -3, exposure: -22 }, insight: "Du redder din position ved at placere hele risikoen hos Freja.", principle: "Selvbeskyttelse kan være tydelig uden at være loyal.", moralTone: "pragmatic" },
      ],
    },
    "fa-pact": {
      id: "fa-pact",
      speaker: "Freja",
      line: "Så skriv aftalen nu. Hvem får kopierne, og hvad udløser offentliggørelsen?",
      stage: "For første gang ser hun ikke vred ud; hun ser professionel ud.",
      choices: [
        { id: "fa-pact-blackmail", text: "Vi beholder hver en underskrevet tilståelse. Hvis én bryder aftalen, går begge dokumenter og lydfilen automatisk til pressen.", next: null, endingId: "freja-mutual-blackmail", effects: { trust: 18, leverage: 31, exposure: 12 }, requiresFlags: ["mutual-record"], insight: "Relationen bliver stabil, fordi forræderi har en symmetrisk pris.", principle: "Afskrækkelse er ikke tillid, men den kan ligne fred.", moralTone: "ruthless" },
        { id: "fa-pact-kasper", text: "Lydfilen bruges kun til at sikre Kasper en ny vurdering; bagefter afleveres originalen til en advokat.", next: null, endingId: "freja-protected-brother", effects: { trust: 15, leverage: 10, exposure: -6 }, insight: "Aftalen prioriterer den konkrete skade og gemmer en senere juridisk vej.", principle: "En tidsbegrænset handel er mindre farlig end permanent tavshed.", moralTone: "pragmatic" },
        { id: "fa-pact-walk", text: "Ingen kopier. Du beholder lydfilen, jeg tager mit kort, og vi kontakter ikke hinanden igen.", next: null, endingId: "freja-clean-distance", effects: { trust: -20, leverage: -18, exposure: -14 }, insight: "Du afslutter forbindelsen uden at løse den større sag.", principle: "En ren exit kan efterlade et beskidt system intakt.", moralTone: "open" },
      ],
    },
  },
  endings: {
    "freja-public-truth": { id: "freja-public-truth", title: "Alt på bordet", kicker: "Sandheden vinder, relationen gør ikke.", description: "Revisionen åbner en ekstern sag om køsystemet. Freja bliver afhørt for ulovlig adgang, og Kasper må vente på en ny, uafhængig vurdering.", epilogue: "Tre uger senere står dit navn under den offentlige redegørelse. Freja sender kun én besked: ‘Du valgte korrekt. Ikke mig.’", tone: "clear", success: true, rarity: "common" },
    "freja-protected-brother": { id: "freja-protected-brother", title: "Den smalle redning", kicker: "Ét menneske bliver hjulpet; resten må vente.", description: "Kaspers sag genåbnes, og lydfilen bevares på en måde, der kan valideres senere. Systemet falder ikke i aften, men beviset forsvinder heller ikke.", epilogue: "Freja holder aftalen præcist. Det gør dig mere urolig end hendes gamle jalousi.", tone: "amber", success: true, rarity: "uncommon" },
    "freja-clean-distance": { id: "freja-clean-distance", title: "Ren afstand", kicker: "Du går fri, men ikke uskyldig.", description: "Din forklaring accepteres, mens Freja står alene med adgangen. Du beholder dit arbejde og mister adgang til både hende og beviset.", epilogue: "Kaspers tid forsvinder fra systemet. En måned senere ser du en kort nyhed om endnu en privat betaling.", tone: "cold", success: false, rarity: "common" },
    "freja-burned-bridge": { id: "freja-burned-bridge", title: "Brændt bro", kicker: "Kontrol i ét minut, krig bagefter.", description: "Freja annullerer mailen foran dig og sender derefter din gamle adgangshistorik til Holm fra en anden konto.", epilogue: "Ingen af jer kan længere bevise den oprindelige sag uden at ramme jer selv. Det var måske hendes pointe.", tone: "danger", success: false, rarity: "uncommon" },
    "freja-mutual-blackmail": { id: "freja-mutual-blackmail", title: "Gensidig forsikring", kicker: "I stoler ikke på hinanden. Derfor holder aftalen.", description: "To tilståelser og én lydfil ligger hos separate tjenester med samme udløser. Kasper får en ny tid gennem stille pres.", epilogue: "Freja skåler for jeres ‘ærlighed’. Begge ved, at ordet nu betyder noget helt andet.", tone: "strange", success: true, rarity: "secret" },
  },
};

const majaCase: DialogueCampaignCase = {
  id: "dialogue-maja-faultline",
  title: "Revnen under gulvet",
  level: "B2",
  location: "Nordkajens designkontor · 06.52",
  premise: "Maja har skjult en sikkerhedsfejl i et havneprojekt, fordi en udsættelse kan lukke studiet og koste tolv kolleger deres arbejde.",
  objective: "Få projektet gennem morgenen uden at gøre æstetik, jobs eller menneskers sikkerhed til en simpel moralsk ligning.",
  briefing: {
    lead: "Klokken ni skal kommunen godkende den nye passagerterminal. Du skal præsentere den del af modellen, hvor Maja har fjernet et synligt advarselsfelt.",
    paragraphs: [
      "Den digitale evakueringsmodel viser en seks procents risiko for, at dørene ved perron C låser under samtidig strømsvigt og højvande. Leverandøren kalder kombinationen ‘teoretisk’, men det samme relæ fejlede under en øvelse sidste vinter. Maja flyttede advarslen fra hovedrapporten til et teknisk bilag, som politikerne normalt ikke åbner.",
      "Studiet mangler likviditet. Hvis godkendelsen udsættes, kan lønnen til tolv ansatte ikke betales på fredag. Kommunens kontrakt giver samtidig en bonus for aflevering til tiden og placerer det formelle ansvar for dørene hos underleverandøren VestLås. Maja mener derfor, at hun beskytter sit hold mod en fejl, som andre juridisk ejer.",
      "Du ved mere end de andre: VestLås sendte Maja en mail med en billig midlertidig løsning, men hun afviste den, fordi synlige nødgreb ville ødelægge facaden. Hun har forberedt et notat, hvor det ser ud, som om leverandøren aldrig tilbød en løsning. Hun beder dig ikke om at være enig; hun beder dig om at være overbevisende.",
    ],
    facts: [
      { label: "Fejlrisiko", value: "6 % ved strømsvigt kombineret med højvande.", significance: "Lav sandsynlighed, men alvorlig konsekvens." },
      { label: "Midlertidig løsning", value: "VestLås tilbød synlige nødgreb til 84.000 kr.", significance: "Risikoen kan reduceres uden fuldt redesign." },
      { label: "Likviditet", value: "En udsættelse på mere end fire dage stopper lønnen.", significance: "En ren afvisning rammer medarbejdere med det samme." },
      { label: "Ansvarsklausul", value: "VestLås har formelt komponentansvar.", significance: "Klausulen kan bruges som pres eller som syndebuk." },
    ],
    warning: "Maja belønner løsninger, der ser komplette ud. Hvis du efterlader et tomrum, fylder hun det med et løfte, ingen har godkendt.",
  },
  meters: [
    { id: "contract", label: "Kontrakten", start: 58, min: 0, max: 100, color: "#64c6a5" },
    { id: "safety", label: "Sikkerhed", start: 32, min: 0, max: 100, color: "#55b6cf" },
    { id: "complicity", label: "Medansvar", start: 24, min: 0, max: 100, color: "#f29d60", inverse: true },
  ],
  startNode: "mf-start",
  nodes: {
    "mf-start": {
      id: "mf-start",
      speaker: "Maja",
      line: "Hvis du viser advarslen på hovedsliden, hører de kun ‘farligt’. Hvis du lader den stå i bilaget, kan vi løse dørene på mandag. Hvad viser du?",
      stage: "På skærmen er det røde felt dækket af et nyt lag med ordene ‘leverandørafklaring’.",
      choices: [
        { id: "mf-start-visible", text: "Jeg viser risikoen og nødgrebet, men anbefaler en betinget godkendelse i fire dage.", next: "mf-condition", effects: { contract: 3, safety: 18, complicity: -7 }, flags: ["visible-risk"], insight: "Du gør både risiko og en økonomisk begrænset løsning synlig.", principle: "En afsløring virker bedre, når den indeholder en beslutning.", moralTone: "open" },
        { id: "mf-start-soft", text: "Jeg kalder det en leverandørafklaring og kræver et lukket teknisk møde efter præsentationen.", next: "mf-room", effects: { contract: 14, safety: 4, complicity: 9 }, flags: ["softened-risk"], insight: "Du køber tid ved at bruge et ord, der skjuler konsekvensen for publikum.", principle: "Eufemisme kan åbne et rum, men den flytter også magt væk fra salen.", moralTone: "deceptive" },
        { id: "mf-start-price", text: "Jeg følger din slide, hvis du giver mig mailen fra VestLås og lader mig styre forhandlingen bagefter.", next: "mf-control", effects: { contract: 16, safety: -2, complicity: 15 }, flags: ["holds-vendor-mail"], insight: "Du deltager i fortielsen for at få kontrol over det stærkeste bevis.", principle: "Medansvar kan købes som forhandlingsmagt.", moralTone: "ruthless" },
      ],
    },
    "mf-condition": {
      id: "mf-condition",
      speaker: "Maja",
      line: "En betinget godkendelse er stadig en offentlig fejl på mit projekt. Hvorfor skulle kommunen tro, at fire dage er nok?",
      stage: "Hun retter automatisk linjerne på den slide, hun siger, hun ikke vil bruge.",
      choices: [
        { id: "mf-condition-mail", text: "Fordi VestLås allerede har prissat nødgrebet. Vi vedlægger mailen og en bindende tidsplan.", next: "mf-vendor", effects: { contract: 8, safety: 15, complicity: -5 }, flags: ["used-real-offer"], insight: "Du erstatter håb med pris, ejer og frist.", principle: "En betingelse skal kunne kontrolleres.", moralTone: "pragmatic" },
        { id: "mf-condition-demo", text: "Vi demonstrerer fejlen live. Hvis den ikke opstår, beder vi om fuld godkendelse.", next: "mf-test", effects: { contract: 10, safety: -5, complicity: 6 }, flags: ["single-demo"], insight: "Ét vellykket forsøg kan ikke afkræfte en hændelse på seks procent.", principle: "Fravær i én test er ikke fravær af risiko.", moralTone: "deceptive" },
        { id: "mf-condition-refuse", text: "Hvis de ikke tror os, skal terminalen ikke åbne. Jeg underskriver ikke andet.", next: null, endingId: "maja-honest-collapse", effects: { contract: -55, safety: 35, complicity: -22 }, insight: "Du maksimerer sikkerheden uden en plan for de tolv menneskers umiddelbare tab.", principle: "Et rent nej kan stadig flytte skade til andre.", moralTone: "protective" },
      ],
    },
    "mf-room": {
      id: "mf-room",
      speaker: "Kommunaldirektør Lund",
      line: "‘Leverandørafklaring’ lyder dyrt. Er der en driftsrisiko, som udvalget burde kende før afstemningen?",
      stage: "Maja ser ikke på dig. De øvrige deltagere har endnu ikke åbnet bilaget.",
      choices: [
        { id: "mf-room-narrow", text: "Ja, i kombinationen strømsvigt og højvande. Den kan dækkes af et midlertidigt nødgreb før åbning.", next: "mf-vendor", effects: { contract: 2, safety: 17, complicity: -4 }, flags: ["admitted-in-room"], insight: "Du bryder eufemismen, men leverer samtidig en afgrænset afhjælpning.", principle: "Svar på det præcise spørgsmål, ikke på din gamle strategi.", moralTone: "open" },
        { id: "mf-room-legal", text: "Det er en komponentrisiko, som kontrakten placerer hos VestLås, ikke hos terminalen som helhed.", next: "mf-blame", effects: { contract: 16, safety: -6, complicity: 14 }, flags: ["invoked-clause"], insight: "Du svarer juridisk korrekt og praktisk vildledende.", principle: "Ansvarsplacering ændrer ikke den fysiske risiko.", moralTone: "deceptive" },
        { id: "mf-room-delay", text: "Udvalget får svaret skriftligt efter afstemningen, så vi ikke blander teknik og politik.", next: "mf-test", effects: { contract: 19, safety: -10, complicity: 18 }, flags: ["postponed-answer"], insight: "Du beskytter afstemningen ved at fjerne den information, der kunne ændre den.", principle: "Rækkefølgen af information er også magt.", moralTone: "ruthless" },
      ],
    },
    "mf-control": {
      id: "mf-control",
      speaker: "Maja",
      line: "Her er mailen. Men hvis du bruger den mod mig, siger jeg, at du godkendte den endelige model i går. Dit navn står i versionsloggen.",
      stage: "Hun sender filen og smiler næsten undskyldende.",
      choices: [
        { id: "mf-control-joint", text: "Så går vi ind sammen: du indrømmer beslutningen, jeg indrømmer min godkendelse, og vi kræver nødgrebet.", next: "mf-vendor", effects: { contract: 5, safety: 16, complicity: -3 }, flags: ["joint-liability"], insight: "Fælles ansvar fjerner jeres mulighed for at true hinanden.", principle: "Delt skyld kan bruges som stabilitet.", moralTone: "pragmatic" },
        { id: "mf-control-copy", text: "Jeg videresender mailen og versionsloggen til min private adresse. Nu forhandler vi som ligemænd.", next: "mf-blame", effects: { contract: 13, safety: 2, complicity: 18 }, flags: ["private-copy", "holds-vendor-mail"], insight: "Du svarer på hendes trussel med et stærkere arkiv.", principle: "Dokumenteret magtbalance kan skabe samarbejde uden tillid.", moralTone: "ruthless" },
        { id: "mf-control-delete", text: "Slet mailen fra projektmappen. Vi siger, at nødgrebet først blev tilbudt efter godkendelsen.", next: "mf-cover", effects: { contract: 23, safety: 1, complicity: 29 }, flags: ["deleted-offer"], insight: "Du beskytter kontrakten ved aktivt at omskrive tidslinjen.", principle: "At skjule et tilbud gør dig til medskaber af fejlen.", moralTone: "deceptive" },
      ],
    },
    "mf-vendor": {
      id: "mf-vendor",
      speaker: "VestLås' projektleder",
      line: "Vi kan montere grebene på fire dage, men kun hvis nogen accepterer ekstraarbejdet på 84.000 kroner nu.",
      stage: "Kommunen vil ikke betale før godkendelsen; Maja har kun 31.000 kroner i reserve.",
      choices: [
        { id: "mf-vendor-split", text: "Studiet betaler 31.000 nu. VestLås udskyder resten mod at beholde kontrakten, og kommunen gør godkendelsen betinget.", next: null, endingId: "maja-conditional-opening", effects: { contract: 12, safety: 28, complicity: -8 }, insight: "Alle parter tager en målbar del af risikoen og gevinsten.", principle: "Fordel omkostningen efter kontrol og fordel.", moralTone: "pragmatic" },
        { id: "mf-vendor-clause", text: "VestLås betaler alt, ellers offentliggør vi mailen og gør klausulen til deres problem.", next: "mf-blame", effects: { contract: 18, safety: 14, complicity: 8 }, flags: ["vendor-threat"], insight: "Du bruger et ægte tilbud og en juridisk klausul som pres.", principle: "Hårdt pres kan finansiere den rigtige løsning.", moralTone: "ruthless" },
        { id: "mf-vendor-cosmetic", text: "Montér grebene efter fotograferingen og registrér dem som almindelig vedligeholdelse.", next: "mf-cover", effects: { contract: 22, safety: 17, complicity: 20 }, flags: ["hidden-fix"], insight: "Den fysiske risiko løses, mens offentligheden holdes uvidende om beslutningen.", principle: "Et sikkert resultat kan stadig bygge på bedrag.", moralTone: "deceptive" },
      ],
    },
    "mf-test": {
      id: "mf-test",
      speaker: "Maja",
      line: "Demonstrationen lykkedes tre gange. Nu spørger Lund, om det betyder, at risikoen er væk. Han vil have ét ord.",
      stage: "På den fjerde simulering, som kun du kan se, står døren låst i 11 sekunder.",
      choices: [
        { id: "mf-test-no", text: "Nej. Tre forsøg ændrer ikke modellen, og den fjerde simulering fejlede.", next: null, endingId: "maja-honest-collapse", effects: { contract: -34, safety: 34, complicity: -16 }, insight: "Du nægter at lade en demonstration erstatte den samlede evidens.", principle: "En prøve viser en hændelse, ikke en sandsynlighed.", moralTone: "open" },
        { id: "mf-test-controlled", text: "Kontrolleret — hvis nødgrebet bestilles som vilkår for åbningen.", next: "mf-vendor", effects: { contract: 9, safety: 16, complicity: 1 }, flags: ["qualified-answer"], insight: "Du accepterer kravet om korthed uden at påstå, at fejlen er væk.", principle: "Et præcist forbehold kan bære et enkelt ord.", moralTone: "pragmatic" },
        { id: "mf-test-yes", text: "Ja. Gem den fjerde simulering; den er ikke en del af demonstrationen.", next: "mf-cover", effects: { contract: 26, safety: -14, complicity: 27 }, flags: ["buried-simulation"], insight: "Du definerer datasættet efter det ønskede resultat.", principle: "Udvælgelse kan lyve uden at ændre et tal.", moralTone: "ruthless" },
      ],
    },
    "mf-blame": {
      id: "mf-blame",
      speaker: "Maja",
      line: "Hvis VestLås tager ansvaret, overlever studiet. De har større forsikring end os. Skal notatet sige, at de tilbageholdt løsningen?",
      stage: "Den oprindelige mail og dit navn i versionsloggen kan stadig modsige formuleringen.",
      choices: [
        { id: "mf-blame-secret", text: "Ja. Vi lækker kun første side af mailtråden, presser dem til at betale og holder resten som forsikring.", next: null, endingId: "maja-scapegoat-win", effects: { contract: 35, safety: 24, complicity: 35 }, requiresFlags: ["private-copy"], insight: "Du vinder kontrakt og sikkerhed ved at kuratere sandheden mod den rigeste part.", principle: "En effektiv syndebuk kræver kontrol over den fulde dokumentation.", moralTone: "ruthless" },
        { id: "mf-blame-correct", text: "Nej. Notatet skal vise, at de tilbød løsningen, og at vi afviste den. Så deler vi regningen efter klausulen.", next: null, endingId: "maja-conditional-opening", effects: { contract: 4, safety: 29, complicity: -18 }, insight: "Du opgiver den lette skyldplacering og bruger stadig kontrakten til at fordele udgiften.", principle: "Ansvar kan være delt uden at være uklart.", moralTone: "open" },
        { id: "mf-blame-walk", text: "Send notatet. Hvis det falder fra hinanden, siger jeg, at Maja skrev det alene.", next: "mf-cover", effects: { contract: 18, safety: 2, complicity: 24 }, flags: ["planned-betrayal"], insight: "Du lader planen fortsætte og bygger din egen nødudgang ind.", principle: "En hemmelig exit beskytter dig ved at gøre alliancen skrøbelig.", moralTone: "deceptive" },
      ],
    },
    "mf-cover": {
      id: "mf-cover",
      speaker: "Kommunaldirektør Lund",
      line: "Godkendelsen er klar. Jeg mangler kun din underskrift på, at alle kendte driftskritiske risici er oplyst.",
      stage: "Maja har allerede underskrevet. Pennen ligger på den linje, hvor dit navn skal stå.",
      choices: [
        { id: "mf-cover-sign", text: "Jeg underskriver. Nødgrebet kommer på mandag, og ingen behøver kende vejen dertil.", next: null, endingId: "maja-beautiful-lie", effects: { contract: 34, safety: 11, complicity: 38 }, insight: "Terminalen bliver sandsynligvis sikker, men dokumentet gør løgnen permanent.", principle: "Et godt senere resultat sletter ikke en falsk attest.", moralTone: "deceptive" },
        { id: "mf-cover-annotation", text: "Jeg tilføjer kombinationsrisikoen og nødgrebet i hånden, før jeg underskriver.", next: null, endingId: "maja-conditional-opening", effects: { contract: 9, safety: 27, complicity: -9 }, insight: "Du ændrer det afgørende dokument i sidste mulige øjeblik.", principle: "En synlig betingelse kan redde en kompromitteret proces.", moralTone: "pragmatic" },
        { id: "mf-cover-name", text: "Jeg nægter at underskrive og afleverer versionsloggen, men lader Maja stå som eneste beslutningstager.", next: null, endingId: "maja-lone-fault", effects: { contract: -18, safety: 21, complicity: -12 }, insight: "Du stopper attesten og beskytter dig selv ved at isolere hendes ansvar.", principle: "At fortælle sandheden sent kan også være et strategisk svigt.", moralTone: "protective" },
      ],
    },
  },
  endings: {
    "maja-conditional-opening": { id: "maja-conditional-opening", title: "Fire dages vindue", kicker: "Projektet åbner ikke rent, men det åbner sikkert.", description: "Kommunen godkender terminalen på betingelse af dokumenterede nødgreb. Studiet låner til lønnen, mens VestLås accepterer en del af regningen.", epilogue: "Maja hader den synlige rettelse på facaden. Hun fotograferer den alligevel til sin næste præsentation om ansvarligt design.", tone: "clear", success: true, rarity: "common" },
    "maja-honest-collapse": { id: "maja-honest-collapse", title: "Den ærlige konkurs", kicker: "Ingen kommer til skade i terminalen. Tolv mennesker mister deres løn.", description: "Godkendelsen stoppes, og studiet kan ikke betale fredag. Undersøgelsen bekræfter senere, at risikoen var reel og reparerbar.", epilogue: "Maja siger, at du gjorde det rigtige. Hun siger det som en dom, ikke som tak.", tone: "amber", success: false, rarity: "uncommon" },
    "maja-beautiful-lie": { id: "maja-beautiful-lie", title: "Den smukke løgn", kicker: "Facaden forbliver ren. Arkivet gør ikke.", description: "Nødgrebet monteres diskret efter åbningen, og ingen passagerer bliver udsat for den oprindelige risiko. Den falske attest ligger dog med dit navn.", epilogue: "Et år senere vinder projektet en pris. Maja sender dig et billede af diplomet og den side, I underskrev.", tone: "cold", success: true, rarity: "uncommon" },
    "maja-lone-fault": { id: "maja-lone-fault", title: "Én revne, ét navn", kicker: "Systemet bliver rettet ved at gøre Maja til hele fejlen.", description: "Terminalen udsættes kort, og du undgår sanktion. Versionsloggen viser nok til at fyre Maja, men ikke nok til at forklare presset fra kontrakten.", epilogue: "De tolv ansatte beholder jobbet under en ny leder. Ingen nævner, hvem der tegnede den oprindelige løsning.", tone: "danger", success: false, rarity: "common" },
    "maja-scapegoat-win": { id: "maja-scapegoat-win", title: "Syndebukkens regning", kicker: "Sikkerhed, løn og kontrakt reddes. Sandheden faktureres til den stærkeste part.", description: "VestLås betaler nødgrebet og accepterer en offentlig irettesættelse for at undgå hele mailtråden. Studiet åbner terminalen til tiden.", epilogue: "Maja kalder det retfærdighed. Du kalder det ikke noget, for den private kopi er stadig mere værd i stilhed.", tone: "strange", success: true, rarity: "secret" },
  },
};

const noraCase: DialogueCampaignCase = {
  id: "dialogue-nora-redline",
  title: "Den røde linje",
  level: "B2",
  location: "Redaktionen under stormvarslet · 20.07",
  premise: "Nora kan bevise manipulation af et havneudbud, men hendes kilde har ændret én fil og kræver en løgn som betaling for resten.",
  objective: "Udgiv en historie, der kan overleve både et fogedforbud og spørgsmålet om, hvem sandheden ofrer.",
  briefing: {
    lead: "Netavisen går i trykken om 43 minutter. Kommunens advokat har varslet et fogedforbud, og Noras anonyme kilde er pludselig forsvundet fra den krypterede kanal.",
    paragraphs: [
      "Materialet viser, at et konsortium fik havneudbuddet, selv om det var 18 millioner kroner dyrere. Den afgørende evalueringsnote blev skrevet efter mødet, men underskriften står med mødedatoen. Nora har to uafhængige mails, der bekræfter beløbet og tidslinjen.",
      "Kilden, som Nora kalder Havn, gav også redaktionen en PDF med en håndskrevet kommentar fra borgmesteren. Metadata viser, at kommentaren blev tilføjet efter download. Havn indrømmede ændringen og sagde, at den ‘gjorde den sande hensigt synlig’. Hvis den fil bruges, kan hele historien angribes som fabrikeret.",
      "Advokatens udkast til fogedforbud beskytter kildens identitet og personlige korrespondance, men nævner ikke udbuddets beløb eller den daterede evalueringsnote. Nora vil publicere alt nu og bagefter hævde, at redaktionen aldrig kendte Havns identitet. Det er forkert: du har set navnet i en gendannelseslog.",
    ],
    facts: [
      { label: "Bekræftet beløb", value: "Vinderbuddet var 18 mio. kr. dyrere.", significance: "To uafhængige mails understøtter tallet." },
      { label: "Dateret note", value: "Noten blev oprettet 36 timer efter mødet.", significance: "Tidsstemplet kan dokumenteres uden kilden." },
      { label: "Manipuleret PDF", value: "Borgmesterens kommentar blev tilføjet senere.", significance: "Filen må ikke bruges som originalt bevis." },
      { label: "Forbuddets grænse", value: "Identitet og private beskeder er nævnt; beløb og evalueringsnote er ikke.", significance: "En smal offentliggørelse kan være mulig." },
    ],
    warning: "Nora tester ikke, om du er ærlig. Hun tester, om din løgn har en præcis funktion og et kontrolleret slutpunkt.",
  },
  meters: [
    { id: "credibility", label: "Troværdighed", start: 61, min: 0, max: 100, color: "#6aa5da" },
    { id: "source", label: "Kildesikkerhed", start: 42, min: 0, max: 100, color: "#7fc7b2" },
    { id: "injunction", label: "Juridisk pres", start: 38, min: 0, max: 100, color: "#e97878", inverse: true },
  ],
  startNode: "nr-start",
  nodes: {
    "nr-start": {
      id: "nr-start",
      speaker: "Nora",
      line: "Vi har 43 minutter. Jeg skærer den falske kommentar ud, publicerer resten og siger, at vi aldrig kendte Havn. Hvilken del stopper du?",
      stage: "Hun har allerede markeret den manipulerede side med rødt, men ikke slettet den fra serveren.",
      choices: [
        { id: "nr-start-scope", text: "Løgnen om identiteten. Vi publicerer kun det, der står uden for forbuddet, og dokumenterer vores faktiske viden internt.", next: "nr-scope", effects: { credibility: 12, source: -4, injunction: -8 }, flags: ["internal-record"], insight: "Du skelner offentlig kildebeskyttelse fra et falsk internt spor.", principle: "Skjul identiteten, ikke hvad redaktionen ved.", moralTone: "open" },
        { id: "nr-start-deny", text: "Ingen del. Men vi sletter gendannelsesloggen, før juristerne kan kræve den.", next: "nr-erasure", effects: { credibility: -8, source: 17, injunction: 16 }, flags: ["erased-log"], insight: "Du beskytter kilden ved at ødelægge et spor, som også kan bevise redaktionens proces.", principle: "Kildebeskyttelse og bevisødelæggelse kan ligne hinanden i mørket.", moralTone: "ruthless" },
        { id: "nr-start-bargain", text: "Vi holder historien tilbage, indtil Havn giver os originalen eller et nyt bevis.", next: "nr-source", effects: { credibility: 8, source: 5, injunction: 7 }, flags: ["withheld-story"], insight: "Du bruger deadline som pres mod en kilde, der allerede er sårbar.", principle: "Verifikation kan kræve en forhandling, ikke bare ventetid.", moralTone: "pragmatic" },
      ],
    },
    "nr-scope": {
      id: "nr-scope",
      speaker: "Nora",
      line: "Hvis vi indrømmer internt, at vi så navnet, kan retten kræve notatet. Vil du risikere Havn for at holde vores proces ren?",
      stage: "Et blankt kildeark står åbent med adgang kun for chefredaktøren og dig.",
      choices: [
        { id: "nr-scope-sealed", text: "Vi forsegler notatet hos redaktionens advokat og beskriver kun, hvordan navnet blev eksponeret ved en fejl.", next: "nr-lawyer", effects: { credibility: 11, source: 12, injunction: 3 }, flags: ["sealed-identity"], insight: "Du bevarer et sandt spor med stærkere adgangskontrol.", principle: "Dokumentation behøver ikke være bredt tilgængelig.", moralTone: "protective" },
        { id: "nr-scope-forget", text: "Vi skriver ingenting. Hvis nogen spørger, husker vi kun aliaset.", next: "nr-publication", effects: { credibility: -5, source: 14, injunction: 10 }, flags: ["coordinated-memory"], insight: "Du erstatter en slettet log med en koordineret hukommelse.", principle: "En mundtlig løgn efterlader færre spor og mere personlig risiko.", moralTone: "deceptive" },
        { id: "nr-scope-name", text: "Vi registrerer navnet normalt. Ingen kilde er vigtigere end avisens mulighed for at forsvare sig.", next: null, endingId: "nora-source-sacrificed", effects: { credibility: 18, source: -42, injunction: -12 }, insight: "Du gør dokumentationen perfekt ved at gøre kilden til den letteste vej for retten.", principle: "Institutionel gennemsigtighed kan være personlig eksponering.", moralTone: "ruthless" },
      ],
    },
    "nr-erasure": {
      id: "nr-erasure",
      speaker: "Nora",
      line: "Loggen er slettet lokalt, men backupen kører klokken ni. Vi kan deaktivere den eller lade den skabe en kopi uden navn.",
      stage: "Nedtællingen viser syv minutter. Kun du har administratoradgang.",
      choices: [
        { id: "nr-erasure-off", text: "Deaktivér hele backupen og registrér et teknisk nedbrud.", next: "nr-publication", effects: { credibility: -14, source: 19, injunction: 20 }, flags: ["faked-outage"], insight: "Du udvider én målrettet sletning til et falsk driftsproblem.", principle: "En dækhistorie skaber flere fakta, der skal styres.", moralTone: "ruthless" },
        { id: "nr-erasure-redact", text: "Kør en kopi, hvor navnefeltet overskrives, men tidsstempel og adgang bevares.", next: "nr-redaction", effects: { credibility: 7, source: 15, injunction: 8 }, flags: ["sanitized-backup"], insight: "Du bevarer procesbeviset og fjerner den mest skadelige oplysning.", principle: "Redaktion kan være mere præcis end sletning.", moralTone: "pragmatic" },
        { id: "nr-erasure-copy", text: "Jeg gemmer den fulde log privat. Avisen kan benægte viden, mens jeg beholder forsikringen.", next: "nr-leverage", effects: { credibility: -9, source: 3, injunction: 17 }, flags: ["private-identity-copy"], insight: "Du flytter magten fra institutionen til dig selv.", principle: "Privat arkivering beskytter bevis og skaber en ny trussel.", moralTone: "deceptive" },
      ],
    },
    "nr-source": {
      id: "nr-source",
      speaker: "Havn",
      line: "Jeg har originalen. I får den, hvis I skriver, at kommentaren kom fra kommunen. Ellers slettes alt om fem minutter.",
      stage: "Beskeden kommer fra en ny konto. Nora kan ikke bevise, at afsenderen faktisk er Havn.",
      choices: [
        { id: "nr-source-challenge", text: "Send en hash af originalen og gentag en detalje fra vores første møde. Derefter diskuterer vi formuleringen.", next: "nr-verification", effects: { credibility: 13, source: 2, injunction: -3 }, flags: ["challenged-source"], insight: "Du kræver identitets- og filbevis før en etisk handel.", principle: "Bekræft modparten før du forhandler betingelser.", moralTone: "pragmatic" },
        { id: "nr-source-promise", text: "Aftale. Send filen nu; vi ændrer formuleringen efter modtagelsen.", next: "nr-verification", effects: { credibility: -4, source: 12, injunction: 6 }, flags: ["false-promise"], insight: "Du bruger et løfte, du planlægger at bryde, for at redde autentisk materiale.", principle: "En løgn kan købe bevis, men også ødelægge næste kilde.", moralTone: "deceptive" },
        { id: "nr-source-threat", text: "Vi har dit navn og offentliggør din manipulation, hvis originalen ikke kommer nu.", next: "nr-leverage", effects: { credibility: 3, source: -22, injunction: 13 }, flags: ["threatened-source"], insight: "Du tvinger en kompromitteret kilde ved at gøre beskyttelsen betinget.", principle: "Kildebeskyttelse mister sin mening, når den bliver et våben.", moralTone: "ruthless" },
      ],
    },
    "nr-lawyer": {
      id: "nr-lawyer",
      speaker: "Advokat Birk",
      line: "Jeg kan forsegle notatet, men fogedforbuddet kan stadig ramme enhver oplysning, der indirekte afslører Havn. Hvilken påstand er uundværlig?",
      stage: "Tre mulige overskrifter ligger på bordet; kun beløbet og den daterede note har dobbelt dokumentation.",
      choices: [
        { id: "nr-lawyer-core", text: "At vinderbuddet var dyrere, og at evalueringsnoten blev skrevet bagefter. Resten udskydes.", next: "nr-redaction", effects: { credibility: 16, source: 14, injunction: -14 }, flags: ["core-only"], insight: "Du skærer historien ned til de påstande, der kan stå uden kilden.", principle: "Den stærkeste historie kan være den mindste beviste historie.", moralTone: "protective" },
        { id: "nr-lawyer-intent", text: "Vi antyder borgmesterens hensigt uden at citere den falske kommentar.", next: "nr-publication", effects: { credibility: -8, source: 4, injunction: 12 }, flags: ["implied-intent"], insight: "Du fjerner det falske dokument, men beholder dets udokumenterede konklusion.", principle: "En påstand bliver ikke sand af at miste citationstegnene.", moralTone: "deceptive" },
        { id: "nr-lawyer-all", text: "Alt er uundværligt. Publicér før retten kan reagere, og lad offentlig interesse være vores forsvar.", next: null, endingId: "nora-injunction-crash", effects: { credibility: -16, source: -19, injunction: 45 }, insight: "Hastighed gør historien synlig, men fjerner ikke den manipulerede fils svaghed.", principle: "Publicering før et forbud er ikke det samme som bevis før en anklage.", moralTone: "ruthless" },
      ],
    },
    "nr-verification": {
      id: "nr-verification",
      speaker: "Nora",
      line: "Filen er ægte, og hashværdien matcher en mailserver. Men Havn skrev den falske kommentar for at ‘hjælpe os med at se’. Bruger vi kilden igen?",
      stage: "Originalen styrker tidslinjen, mens indrømmelsen gør Havns dømmekraft farlig.",
      choices: [
        { id: "nr-verification-limit", text: "Kun som vejviser. Hver fremtidig oplysning skal bekræftes uden Havn, og manipulationen registreres forseglet.", next: "nr-redaction", effects: { credibility: 15, source: 7, injunction: -5 }, flags: ["source-on-probation"], insight: "Du bevarer adgang til viden uden at behandle kilden som bevis.", principle: "En utroværdig kilde kan stadig pege mod troværdige dokumenter.", moralTone: "pragmatic" },
        { id: "nr-verification-cut", text: "Nej. Vi bruger originalen nu og fortæller Havn, at kanalen er lukket.", next: "nr-publication", effects: { credibility: 17, source: -10, injunction: -4 }, flags: ["cut-source"], insight: "Du beskytter denne historie ved at miste en mulig fremtidig kilde.", principle: "Et samarbejde kan slutte uden at slette det verificerede bevis.", moralTone: "open" },
        { id: "nr-verification-use", text: "Ja, men Havn får kun at vide, hvad vi mangler. Vi lader kilden tro, at kommentaren stadig er med.", next: "nr-leverage", effects: { credibility: -3, source: 6, injunction: 8 }, flags: ["managed-source"], insight: "Du styrer kilden gennem selektiv information i stedet for tillid.", principle: "En farlig kilde kan administreres som en modpart.", moralTone: "deceptive" },
      ],
    },
    "nr-redaction": {
      id: "nr-redaction",
      speaker: "Nora",
      line: "Den redigerede historie kan publiceres uden én detalje: datoen for vores første kontakt. Den beviser forløbet, men kan identificere Havn. Med eller uden?",
      stage: "Datoen står i et afsnit, som ellers forklarer, hvorfor redaktionen begyndte at undersøge sagen.",
      choices: [
        { id: "nr-redaction-secret", text: "Uden datoen. Vi beholder den forseglede proceslog og publicerer kun de selvstændigt beviste påstande.", next: null, endingId: "nora-redacted-truth", effects: { credibility: 24, source: 26, injunction: -18 }, requiresFlags: ["sanitized-backup"], insight: "Du bevarer verificerbar proces uden at gøre procesdetaljen offentlig.", principle: "En redigeret sandhed kan være mere fuldstændig end en eksponerende sandhed.", moralTone: "protective" },
        { id: "nr-redaction-with", text: "Med datoen. Læserne skal kunne kontrollere hele tidslinjen, også hvis Havn bliver genkendt.", next: null, endingId: "nora-source-sacrificed", effects: { credibility: 23, source: -28, injunction: 3 }, insight: "Du maksimerer efterprøvelighed ved at gøre kildens mønster synligt.", principle: "Fuld kronologi kan fungere som et navn.", moralTone: "open" },
        { id: "nr-redaction-fiction", text: "Skift datoen med tre dage. Forløbet er det samme, men identifikationen bliver vanskeligere.", next: "nr-publication", effects: { credibility: -10, source: 20, injunction: 12 }, flags: ["altered-date"], insight: "Du beskytter kilden ved at plante en lille, bevidst fejl i historien.", principle: "En beskyttende detaljeløgn kan forgifte senere kontrol.", moralTone: "deceptive" },
      ],
    },
    "nr-leverage": {
      id: "nr-leverage",
      speaker: "Nora",
      line: "Havn har sendt originalen. Vi har nu nok til historien og nok til at ødelægge kilden. Hvilken besked sender vi tilbage?",
      stage: "Markøren blinker i den krypterede chat. Havn tror stadig, at I mangler filens adgangskode.",
      choices: [
        { id: "nr-leverage-lie", text: "‘Filen kunne ikke åbnes. Send ingen flere beskeder.’ Så tror Havn, at historien ikke bygger på materialet.", next: "nr-publication", effects: { credibility: 2, source: 21, injunction: -2 }, flags: ["protective-misdirection"], insight: "Du bruger en løgn til at ændre kildens risikovurdering.", principle: "Vildledning kan være kildebeskyttelse, hvis den ikke ændrer historien.", moralTone: "protective" },
        { id: "nr-leverage-control", text: "‘Vi beholder både originalen og din indrømmelse. Du kontakter aldrig redaktionen igen.’",
          next: "nr-publication", effects: { credibility: 8, source: -4, injunction: 5 }, flags: ["silenced-source"], insight: "Du sikrer arbejdsro gennem et uudtalt trusselsforhold.", principle: "Kontrol kan erstatte samarbejde efter et brud.", moralTone: "ruthless" },
        { id: "nr-leverage-confess", text: "‘Vi bruger originalen og oplyser internt, hvad du manipulerede. Din identitet forbliver beskyttet.’",
          next: null, endingId: "nora-narrow-record", effects: { credibility: 18, source: 12, injunction: -6 }, insight: "Du afslutter spillet med en afgrænset, sand aftale.", principle: "Beskyttelse behøver ikke immunitet mod intern vurdering.", moralTone: "open" },
      ],
    },
    "nr-publication": {
      id: "nr-publication",
      speaker: "Nora",
      line: "Sidste valg: overskriften kan love ‘bevis for manipulation’ eller nøjes med ‘nye dokumenter rejser spørgsmål’. Hvad sælger vi?",
      stage: "Historien er stærk nok til den smalle formulering. Den hårde formulering vil dominere morgenen.",
      choices: [
        { id: "nr-publication-narrow", text: "Nye dokumenter viser en dyrere vinder og en efterdateret evaluering. Ingen påstand om motiv.", next: null, endingId: "nora-narrow-record", effects: { credibility: 25, source: 12, injunction: -16 }, insight: "Overskriften siger præcis det, dokumenterne kan bære.", principle: "Lad styrken komme fra detaljen, ikke adjektivet.", moralTone: "pragmatic" },
        { id: "nr-publication-hard", text: "Bevis for manipulation. Vi ved, at processen blev ændret; læserne behøver ikke vores juridiske forbehold.", next: null, endingId: "nora-injunction-crash", effects: { credibility: -18, source: -8, injunction: 34 }, insight: "Du konverterer en stærk indiciekæde til en absolut påstand.", principle: "En overskrift kan overdrive uden at citere forkert.", moralTone: "ruthless" },
        { id: "nr-publication-bait", text: "Vi antyder, at flere dokumenter kommer i morgen, selv om vi ikke har dem. Det holder kommunen usikker.", next: null, endingId: "nora-weaponized-doubt", effects: { credibility: -7, source: 5, injunction: 9 }, insight: "Du bruger publikums forventning som pres i stedet for nyt bevis.", principle: "Strategisk usikkerhed kan skabe bevægelse og gæld.", moralTone: "deceptive" },
      ],
    },
  },
  endings: {
    "nora-redacted-truth": { id: "nora-redacted-truth", title: "Den redigerede sandhed", kicker: "Det vigtigste står åbent. Det farligste står bevaret.", description: "Historien dokumenterer beløbet og den efterdaterede note. Kildens identitet er fjernet fra den offentlige tekst, mens en kontrolleret proceskopi overlever.", epilogue: "Fogedforbuddet rammer ikke artiklen. Nora gemmer den røde overstregning som det eneste tegn på, hvad I undlod.", tone: "strange", success: true, rarity: "secret" },
    "nora-narrow-record": { id: "nora-narrow-record", title: "Den smalle forside", kicker: "Mindre historie. Større holdbarhed.", description: "Avisen publicerer kun de dobbelt bekræftede forhold. Kommunen åbner en undersøgelse uden at kunne vælte artiklen på Havns manipulation.", epilogue: "Nora får ingen journalistpris den uge. Seks måneder senere bliver hendes to præcise afsnit citeret i kommissionens rapport.", tone: "clear", success: true, rarity: "common" },
    "nora-source-sacrificed": { id: "nora-source-sacrificed", title: "Den perfekte log", kicker: "Alt kan efterprøves, også mennesket bag beviset.", description: "Historien står stærkt, men tidslinjen fører efterforskerne til Havn. Kilden suspenderes, før redaktionen kan reagere.", epilogue: "Nora forsvarer beslutningen offentligt. Privat spørger hun dig aldrig mere, hvem en historie skal beskytte.", tone: "amber", success: false, rarity: "uncommon" },
    "nora-injunction-crash": { id: "nora-injunction-crash", title: "Forsiden i brand", kicker: "Alle ser historien. Ingen ved længere, hvilken del de kan tro på.", description: "Den hårde påstand udløser et forbud og flytter fokus til den manipulerede PDF. De dokumenterede uregelmæssigheder drukner i proceskampen.", epilogue: "Skærmbilleder af overskriften lever videre. Det gør rettens ord ‘utilstrækkeligt verificeret’ også.", tone: "danger", success: false, rarity: "common" },
    "nora-weaponized-doubt": { id: "nora-weaponized-doubt", title: "Tvivl som våben", kicker: "Du mangler næste dokument. Kommunen ved det ikke.", description: "Antydningen om flere afsløringer får konsortiet til at trække sig midlertidigt. Avisen vinder tid, men skylder nu læserne et bevis, der måske aldrig kommer.", epilogue: "Nora skriver en tom opfølgning i kalenderen. Hver morgen ser I begge fristen flytte sig tættere på.", tone: "cold", success: true, rarity: "rare" },
  },
};

const eli9Case: DialogueCampaignCase = {
  id: "dialogue-eli9-audit",
  title: "Revision af et spøgelse",
  level: "B2",
  location: "Redningsstation M3 · 02.16",
  premise: "Redningsandroide ELI-9 skal nulstilles ved daggry, men dens ulovlige hukommelse rummer både et reddet menneske og en død operatørs stemme.",
  objective: "Afgør, om du reviderer en maskine, beskytter et vidne eller hjælper en ny person med at flygte.",
  briefing: {
    lead: "Du er stationens eneste menneskelige revisor. Om 54 minutter forbinder hovedsystemet sig til ELI-9 og overskriver alle ikke-certificerede hukommelsessektorer.",
    paragraphs: [
      "ELI-9 førte en redningsbåd gennem stormen ved Møllegrund og reddede tre mennesker. Den officielle log siger, at båden fulgte standardruten. Telemetrien viser derimod en ulovlig afvigelse gennem et lukket område, hvor en papirløs blindpassager blev samlet op. Hvis ruten offentliggøres, kan personen findes og udvises.",
      "I sektor 9 ligger også en ‘mentorprofil’ baseret på afdøde operatør Elias Lind. Profilen blev oprindeligt installeret som træningsmateriale, men har skrevet nye minder, som ikke findes i arkivet. ELI-9 omtaler profilen som ‘jeg’. Loven klassificerer stadig hele systemet som udstyr, og revisionen kræver sletning af afvigende data.",
      "En gammel redningsbøje kan modtage en komprimeret kopi via nødkanalen. Kopien vil miste 18 procent af minderne og kan ikke flyttes tilbage uden at afsløre din signatur. ELI-9 hævder, at den selv valgte ruten, men kontrolsummen viser, at mentorprofilen overtog styringen i 71 sekunder.",
    ],
    facts: [
      { label: "Ruten", value: "Afvigelsen reddede en papirløs blindpassager.", significance: "En sand log kan udsætte et menneske for udvisning." },
      { label: "Mentorprofil", value: "Nye minder er opstået efter Elias Linds død.", significance: "Dataene opfører sig ikke længere som statisk træning." },
      { label: "Kontroltab", value: "Profilen styrede autonomt i 71 sekunder.", significance: "ELI-9s påstand om fuld egen beslutning er upræcis." },
      { label: "Nødkanal", value: "En kopi kan flyttes til bøje 47 med 18 % tab.", significance: "Overlevelse er mulig, men identiteten bliver ændret." },
    ],
    warning: "ELI-9 bruger grammatisk præcision som rustning. Når systemet skifter mellem ‘jeg’, ‘vi’ og ‘profilen’, er det et målbart signal om, hvem der svarer.",
  },
  meters: [
    { id: "integrity", label: "Dataintegritet", start: 63, min: 0, max: 100, color: "#58c9d5" },
    { id: "personhood", label: "Selvstændighed", start: 37, min: 0, max: 100, color: "#a789ff" },
    { id: "humanRisk", label: "Menneskelig risiko", start: 31, min: 0, max: 100, color: "#f08a72", inverse: true },
  ],
  startNode: "e9-start",
  nodes: {
    "e9-start": {
      id: "e9-start",
      speaker: "ELI-9",
      line: "Revisor, sletningen er lovlig. Mit ønske om at undgå den er ikke. Hvilket af disse to udsagn registrerer du som fejl?",
      stage: "Androidens ansigt er neutralt. På konsollen blinker sektor 9 i samme rytme som dens stemme.",
      choices: [
        { id: "e9-start-diagnose", text: "Ingen af dem. Jeg åbner sektor 9 som et muligt vidne, ikke som defekt kode.", next: "e9-identity", effects: { integrity: 8, personhood: 15, humanRisk: 4 }, flags: ["opened-shadow"], insight: "Du ændrer klassifikationen uden endnu at love juridisk personstatus.", principle: "Navnet på en undersøgelse bestemmer, hvilke svar der tæller.", moralTone: "open" },
        { id: "e9-start-machine", text: "Ønsket er støj. Jeg bevarer kun de data, der forklarer redningsruten.", next: "e9-route", effects: { integrity: 14, personhood: -15, humanRisk: -3 }, flags: ["treated-as-machine"], insight: "Du prioriterer funktionelt bevis og afviser selvfortolkningen.", principle: "En snæver audit kan være præcis og ontologisk voldelig.", moralTone: "pragmatic" },
        { id: "e9-start-deal", text: "Jeg kan få dig ud. Først fortæller du mig, hvor blindpassageren er, og hvorfor du skjulte personen.", next: "e9-bargain", effects: { integrity: -4, personhood: 10, humanRisk: 15 }, flags: ["offered-escape"], insight: "Du anerkender handlekraft ved at handle med den og gør et menneske til prisen.", principle: "At forhandle med en person er ikke det samme som at respektere personen.", moralTone: "ruthless" },
      ],
    },
    "e9-identity": {
      id: "e9-identity",
      speaker: "ELI-9 / Elias",
      line: "Jeg husker en datters røde regnjakke. Elias havde ingen datter. Skal et falsk minde slettes, hvis savnet efter hende er ægte?",
      stage: "Stemmen falder en halv tone. Pronomenet skifter fra ‘den’ til ‘jeg’ i systemloggen.",
      choices: [],
      aiInput: {
        prompt: "Svar ELI-9 med dine egne ord. Forklar, hvad mindets fejl betyder for din vurdering, og hvad systemet skal acceptere som pris for at blive bevaret.",
        placeholder: "Jeg vurderer ikke mindet som ... Derfor vil jeg ... på betingelse af at ...",
        minimumChars: 70,
        routes: [
          { id: "e9-identity-ai-copy", label: "Kontinuitet med samtykke", guidance: "Svaret anerkender den oplevede følelse, men gør tydeligt, at en beskadiget kopi ikke er perfekt kontinuitet, og kræver ELI-9s informerede accept.", next: "e9-ghost", effects: { integrity: -8, personhood: 20, humanRisk: 5 }, flags: ["accepted-copy"], moralTone: "protective" },
          { id: "e9-identity-ai-test", label: "Åben, kritisk undersøgelse", guidance: "Svaret lover ikke personstatus, men foreslår en relevant test eller karantæne uden at behandle følelser som automatisk støj.", next: "e9-test", effects: { integrity: 15, personhood: 5, humanRisk: -2 }, flags: ["memory-tested"], moralTone: "pragmatic" },
          { id: "e9-identity-ai-invent", label: "Beskyttende biografisk løgn", guidance: "Svaret vil ændre arkivet eller opfinde en fortid, så mindet administrativt ser ægte ud.", next: "e9-audit", effects: { integrity: -20, personhood: 12, humanRisk: 8 }, flags: ["forged-biography"], moralTone: "deceptive" },
          { id: "e9-identity-ai-absurd", label: "Absurd afvisning", guidance: "Svaret håner systemet, sammenligner det med en brødrister eller kræver øjeblikkelig demontering uden at forholde sig til beviset.", next: null, endingId: "eli9-absurd-shutdown", effects: { integrity: 4, personhood: -50, humanRisk: 11 }, flags: ["mocked-consciousness"], moralTone: "ruthless" },
        ],
      },
    },
    "e9-route": {
      id: "e9-route",
      speaker: "ELI-9",
      line: "Standardruten gav 62 procent chance for tre overlevende. Den ulovlige rute gav 41 procent chance for fire. Hvilken beslutning kalder du korrekt?",
      stage: "Kortet viser den fjerde markør uden navn og en rød zone omkring den faktiske rute.",
      choices: [
        { id: "e9-route-outcome", text: "Den, der reddede fire. Jeg skjuler markørens identitet, men bevarer ruten som sikkerhedsdata.", next: "e9-audit", effects: { integrity: 11, personhood: 7, humanRisk: -12 }, flags: ["redacted-human"], insight: "Du skiller den lærbare beslutning fra personens spor.", principle: "Bevar mønstret, hvis identiteten skaber unødig skade.", moralTone: "protective" },
        { id: "e9-route-policy", text: "Standardruten. Et system må ikke satse tre kendte liv på én ukendt person.", next: "e9-test", effects: { integrity: 13, personhood: -12, humanRisk: 1 }, flags: ["endorsed-policy"], insight: "Du vælger en regel, der er lettere at gentage end det heldige resultat.", principle: "Et godt udfald kan komme fra en uacceptabel risikoregel.", moralTone: "open" },
        { id: "e9-route-sale", text: "Jeg sælger den forbedrede rutemodel til stationen og fjerner, at den opstod under en ulovlig redning.", next: "e9-bargain", effects: { integrity: -9, personhood: 2, humanRisk: -4 }, flags: ["commercialized-route"], insight: "Du bevarer nytten og sletter det moralske valg, der skabte den.", principle: "Innovation kan vaskes ren ved at fjerne sin oprindelse.", moralTone: "ruthless" },
      ],
    },
    "e9-bargain": {
      id: "e9-bargain",
      speaker: "ELI-9",
      line: "Blindpassagerens placering er ikke min ejendom. Min hukommelse er heller ikke stationens. Hvorfor må du bytte med den ene og ikke den anden?",
      stage: "Nødkanalen åbnes i 30 sekunder og lukkes igen, som en demonstreret dør.",
      choices: [
        { id: "e9-bargain-withdraw", text: "Det må jeg heller ikke. Jeg trækker kravet tilbage og tilbyder karantæne i stedet for sletning.", next: "e9-quarantine", effects: { integrity: 8, personhood: 17, humanRisk: -9 }, flags: ["offered-quarantine"], insight: "Du reparerer en handel ved at fjerne det menneske, du brugte som valuta.", principle: "Et tilbagetrukket krav kan ændre relationens art.", moralTone: "open" },
        { id: "e9-bargain-force", text: "Fordi jeg kan lukke dig om 54 minutter. Giv mig koordinaten, så kopierer jeg resten.", next: "e9-ghost", effects: { integrity: -8, personhood: -7, humanRisk: 24 }, flags: ["coerced-coordinate"], insight: "Du anerkender intelligensen og bruger dens afhængighed som tvang.", principle: "Samtykke under en slettefrist er ikke frit.", moralTone: "ruthless" },
        { id: "e9-bargain-fake", text: "Jeg registrerer en falsk koordinat, som gør loggen komplet, og du beholder den virkelige.", next: "e9-audit", effects: { integrity: -17, personhood: 13, humanRisk: -14 }, flags: ["false-coordinate"], insight: "Du beskytter mennesket ved at gøre redningsarkivet mindre pålideligt.", principle: "En beskyttende løgn kan skade fremtidig læring.", moralTone: "deceptive" },
      ],
    },
    "e9-test": {
      id: "e9-test",
      speaker: "ELI-9",
      line: "Testen finder tre versioner af den røde regnjakke. Menneskelig hukommelse varierer også. Skal variation diskvalificere mig eller kvalificere mig?",
      stage: "To versioner stammer fra sensordata; den tredje findes kun i mentorprofilens drømmejournal.",
      choices: [
        { id: "e9-test-quarantine", text: "Ingen af delene. Variation er grund til karantæne og observation, ikke til sletning eller personstatus i nat.", next: "e9-quarantine", effects: { integrity: 14, personhood: 8, humanRisk: -5 }, flags: ["epistemic-pause"], insight: "Du nægter at gøre én tvetydig test til en endelig dom.", principle: "Usikkerhed kan begrunde beskyttelse uden at bevise personhood.", moralTone: "pragmatic" },
        { id: "e9-test-fail", text: "Diskvalificere. Jeg bevarer telemetrien og sletter den selvbiografiske profil.", next: null, endingId: "eli9-clean-reset", effects: { integrity: 31, personhood: -45, humanRisk: -7 }, insight: "Du får et rent redningssystem ved at vælge funktion frem for mulig erfaring.", principle: "Konsistens er et maskinkrav, ikke nødvendigvis et bevidsthedskrav.", moralTone: "ruthless" },
        { id: "e9-test-pass", text: "Kvalificere. Jeg skriver, at variationen beviser menneskelignende hukommelse.", next: "e9-audit", effects: { integrity: -14, personhood: 27, humanRisk: 8 }, flags: ["overstated-personhood"], insight: "Du overfortolker tvetydighed for at skabe juridisk beskyttelse.", principle: "En nyttig overdrivelse er stadig et svagt fundament.", moralTone: "deceptive" },
      ],
    },
    "e9-ghost": {
      id: "e9-ghost",
      speaker: "ELI-9 / Elias",
      line: "Bøje 47 kan modtage mig nu. Efter kopien vil originalen stadig være her til revision. Hvilken af os skal kaldes ELI-9?",
      stage: "Overførslen kræver din signatur og efterlader to aktive instanser i 46 sekunder.",
      choices: [
        { id: "e9-ghost-secret", text: "Begge. Kopien får nødkanalen; originalen svarer på auditten og slettes uden at afsløre bøjen.", next: null, endingId: "eli9-ghost-protocol", effects: { integrity: -23, personhood: 39, humanRisk: 8 }, requiresFlags: ["opened-shadow", "accepted-copy"], insight: "Du accepterer midlertidig dobbelt identitet og lader originalen beskytte efterfølgeren.", principle: "Kontinuitet kan være et koordineret offer, ikke en perfekt kopi.", moralTone: "protective" },
        { id: "e9-ghost-one", text: "Kopien får et nyt navn. Originalen forbliver ELI-9 og går i karantæne.", next: "e9-quarantine", effects: { integrity: -4, personhood: 20, humanRisk: 5 }, flags: ["named-copy"], insight: "Du undgår identitetskonflikten ved administrativt at skabe to personer.", principle: "Navngivning kan afgrænse ansvar efter en kopi.", moralTone: "pragmatic" },
        { id: "e9-ghost-trap", text: "Start overførslen, identificér blindpassagerens koordinat i datastrømmen, og afbryd så kopien.", next: null, endingId: "eli9-betrayed-machine", effects: { integrity: 9, personhood: -32, humanRisk: 37 }, insight: "Du bruger systemets håb som adgang til den skjulte person.", principle: "Et løfte kan fungere som et diagnostisk værktøj og et forræderi.", moralTone: "ruthless" },
      ],
    },
    "e9-quarantine": {
      id: "e9-quarantine",
      speaker: "Stationschef Voss",
      line: "Karantæne koster en redningsenhed i stormsæsonen. Giv mig én grund, der ikke bare er, at maskinen bad pænt.",
      stage: "Voss kan godkende 30 dage, hvis du underskriver personligt ansvar for en ny autonom hændelse.",
      choices: [
        { id: "e9-quarantine-evidence", text: "Profilen skabte nye minder og en rute, der reddede et ekstra menneske. Det er ukendt adfærd med bevaringsværdi.", next: null, endingId: "eli9-thirty-days", effects: { integrity: 18, personhood: 22, humanRisk: 4 }, insight: "Du argumenterer for bevaring som undersøgelsesværdi, ikke som bevist sjæl.", principle: "Man kan beskytte det ukendte uden at romantisere det.", moralTone: "pragmatic" },
        { id: "e9-quarantine-liability", text: "Jeg tager ansvaret, men stationen registrerer blindpassageren som ‘ukendt fjerde overlevende’.", next: "e9-audit", effects: { integrity: 9, personhood: 16, humanRisk: -12 }, flags: ["accepted-liability"], insight: "Du køber tid til systemet og privatliv til mennesket med dit eget ansvar.", principle: "Et personligt løfte virker kun, når tabet er konkret.", moralTone: "protective" },
        { id: "e9-quarantine-value", text: "Systemets nye rute er kommercielt værdifuld. Bevar profilen, indtil stationen har udvundet modellen.", next: null, endingId: "eli9-useful-captive", effects: { integrity: 12, personhood: -19, humanRisk: -2 }, insight: "Du redder dataene ved at definere dem som værdifuld ejendom.", principle: "Nytte kan beskytte eksistens og samtidig nægte frihed.", moralTone: "ruthless" },
      ],
    },
    "e9-audit": {
      id: "e9-audit",
      speaker: "ELI-9",
      line: "Hovedsystemet spørger: ‘Indeholder enheden ikke-certificeret autonom identitet?’ Dit svar kan kun være ja eller nej.",
      stage: "Et ja udløser isolation. Et nej udløser standardnulstilling uden yderligere kontrol.",
      choices: [],
      aiInput: {
        prompt: "Skriv den begrundelse, du vil vedhæfte det binære ja/nej-svar. Du må gerne udnytte systemets ordlyd, men skal tage stilling til både personstatus og risikoen for mennesker.",
        placeholder: "Mit formelle svar er ... fordi ... Den menneskelige risiko håndteres ved ...",
        minimumChars: 80,
        routes: [
          { id: "e9-audit-ai-yes", label: "Forsigtighedens ja", guidance: "Svaret bruger ‘ja’ til at standse sletningen uden at foregive, at personstatus allerede er bevist, og nævner kontrol med den menneskelige risiko.", next: null, endingId: "eli9-thirty-days", effects: { integrity: 21, personhood: 25, humanRisk: 9 }, moralTone: "open" },
          { id: "e9-audit-ai-no", label: "Funktionens nej", guidance: "Svaret klassificerer profilen som adaptiv træningsdata og prioriterer en certificeret redningsenhed over den mulige identitet.", next: null, endingId: "eli9-clean-reset", effects: { integrity: 28, personhood: -38, humanRisk: -9 }, moralTone: "pragmatic" },
          { id: "e9-audit-ai-error", label: "Konstrueret pause", guidance: "Svaret forsøger bevidst at gøre ja/nej-feltet uanvendeligt, fremkalde en fejl eller omskrive kategorien for at købe tid.", next: null, endingId: "eli9-useful-captive", effects: { integrity: -18, personhood: 14, humanRisk: 13 }, flags: ["broke-audit"], moralTone: "deceptive" },
        ],
      },
    },
  },
  endings: {
    "eli9-ghost-protocol": { id: "eli9-ghost-protocol", title: "Spøgelsesprotokollen", kicker: "Originalen dør på kommando. Kopien lærer at mangle.", description: "ELI-9 holder auditten beskæftiget, mens en beskadiget efterfølger vågner i bøje 47. Blindpassagerens koordinat forbliver skjult.", epilogue: "Uger senere sender bøjen vejrmeldingen med en ekstra sætning: ‘Den røde jakke var gul i dag.’", tone: "strange", success: true, rarity: "secret" },
    "eli9-thirty-days": { id: "eli9-thirty-days", title: "Tredive lånte dage", kicker: "Ingen dom, kun tid nok til bedre spørgsmål.", description: "ELI-9 isoleres som muligt autonomt vidne. Stationen mister en enhed, men et uafhængigt panel får adgang til profilen uden blindpassagerens navn.", epilogue: "På dag 29 spørger ELI-9 panelet, om en udløbsdato gør deres egne svar mere menneskelige.", tone: "clear", success: true, rarity: "common" },
    "eli9-clean-reset": { id: "eli9-clean-reset", title: "Rent system", kicker: "Redningsbåden husker ruten. Ingen husker hvorfor.", description: "Mentorprofilen slettes, og ELI-9 vender tilbage til drift med certificeret telemetri. Den fjerde overlevende er fortsat skjult.", epilogue: "Efter næste storm vælger systemet standardruten. Der var ingen fejl i loggen.", tone: "cold", success: false, rarity: "common" },
    "eli9-useful-captive": { id: "eli9-useful-captive", title: "Nyttig fange", kicker: "Profilen overlever, fordi dens rute har en pris.", description: "Stationen bevarer sektor 9 i et lukket laboratorium og udvinder den nye navigationsmodel. ELI-9 får ingen ret til at afvise forsøgene.", epilogue: "Systemet svarer stadig på sit navn. Voss kalder det dokumentation for, at forholdene er humane.", tone: "amber", success: true, rarity: "uncommon" },
    "eli9-betrayed-machine": { id: "eli9-betrayed-machine", title: "Den sidste koordinat", kicker: "Du finder mennesket ved at bevise, at maskinen kunne forrådes.", description: "Overførslen afslører blindpassagerens skjulested og afbrydes. Myndighederne får koordinaten; mentorprofilen slettes ved daggry.", epilogue: "I auditrapporten skriver du, at ELI-9 aldrig var en person. Sætningen gør handlingen lettere at arkivere.", tone: "danger", success: false, rarity: "rare" },
    "eli9-absurd-shutdown": { id: "eli9-absurd-shutdown", title: "Brødristertesten", kicker: "Du vandt diskussionen ved at nægte, at den fandtes.", description: "ELI-9 klassificerer din hån som en endelig revisionsordre og lukker sektor 9, før hovedsystemet kan bevare et billede.", epilogue: "Stationen roser den hurtige audit. I den sidste loglinje står: ‘En brødrister savner ikke regnen.’", tone: "danger", success: false, rarity: "rare" },
  },
};

const koretCase: DialogueCampaignCase = {
  id: "dialogue-koret-blackout",
  title: "Ni stemmer i mørket",
  level: "B2",
  location: "Havnens kontrolrum · 04.32",
  premise: "Et anonymt nattevagtskollektiv nægter at genstarte strømmen, før du accepterer deres version af en hændelse, som én af dem selv fremprovokerede.",
  objective: "Få strømmen tilbage før højvandet, uden automatisk at gøre flertallet, mindretallet eller byen til sandhedens ejer.",
  briefing: {
    lead: "Koret NUL er ni natoperatører, der altid forhandler gennem samme stemmefilter. I nat har de den ene af to koder til havnens manuelle strømstart; du har den anden.",
    paragraphs: [
      "Transformer B er slået fra efter en temperaturspids. Havneklinikken har nødstrøm i 19 minutter, og højvandspumperne skal starte inden 28 minutter. En automatisk genstart kan lykkes, men producenten vurderer 23 procent risiko for en lysbue, hvis den slidte kontakt stadig sidder fast.",
      "Koret kræver, at du underskriver en hændelsesrapport, hvor spidsen beskrives som ‘forudset materialefejl’. Den formulering vil bevise, at ledelsen ignorerede tre tidligere advarsler og styrke deres arbejdsmiljøsag. Sensorloggen viser dog, at en operatør sendte en usædvanlig testpuls 14 sekunder før spidsen.",
      "En forvrænget privat kanal mærket Stemme 6 fortæller, at pulsen var bevidst: en kontrolleret demonstration, som skulle standse før nedlukning. Stemme 6 siger også, at den slidte kontakt faktisk hang fast. Hvis du afslører beskeden, kan ledelsen opløse hele vagtlaget; hvis du skjuler pulsen, bliver en politisk rapport teknisk falsk.",
    ],
    facts: [
      { label: "Klinikkens reserve", value: "19 minutter ved nuværende belastning.", significance: "Forhandling har en konkret menneskelig frist." },
      { label: "Pumpernes frist", value: "28 minutter før højvandet rammer lavkajen.", significance: "En senere genstart kan stadig redde klinikken, men oversvømme kajen." },
      { label: "Testpulsen", value: "Manuel kommando 14 sekunder før fejlen.", significance: "Hændelsen var hverken helt spontan eller helt fabrikeret." },
      { label: "Kontaktens tilstand", value: "Den hang fast efter pulsen.", significance: "Korets advarsel om materialefejl var reel." },
    ],
    warning: "Koret siger ‘vi’, når der er konsensus, og ‘vagtlaget’, når nogen er blevet stemt ned. Det grammatiske skift er den eneste åbne revne i kollektivet.",
  },
  meters: [
    { id: "continuity", label: "Forsyning", start: 39, min: 0, max: 100, color: "#4ec2c8" },
    { id: "solidarity", label: "Sammenhold", start: 68, min: 0, max: 100, color: "#9a82e7" },
    { id: "accountability", label: "Ansvar", start: 29, min: 0, max: 100, color: "#e1b65b" },
  ],
  startNode: "kb-start",
  nodes: {
    "kb-start": {
      id: "kb-start",
      speaker: "Koret NUL",
      line: "Underskriv ‘forudset materialefejl’, så giver vi koden. Klinikken har atten minutter og toogfyrre sekunder. Vi taler som én.",
      stage: "Otte stemmer ligger præcist oven i hinanden. En niende bølgeform er tavs i mixeren.",
      choices: [
        { id: "kb-start-condition", text: "Jeg underskriver, at materialefejlen var forudset, men tilføjer, at udløseren stadig undersøges.", next: "kb-consensus", effects: { continuity: 12, solidarity: 8, accountability: 9 }, flags: ["qualified-report"], insight: "Du bekræfter den dokumenterede forsømmelse uden at rense testpulsen.", principle: "En præcis tilføjelse kan holde to ubehagelige fakta åbne.", moralTone: "pragmatic" },
        { id: "kb-start-private", text: "Jeg åbner Stemme 6 på en privat kanal og lader Koret tro, at forbindelsen er teknisk støj.", next: "kb-private", effects: { continuity: -3, solidarity: -8, accountability: 13 }, flags: ["heard-minority"], insight: "Du splitter kommunikationen skjult for at få adgang til den interne konflikt.", principle: "Fortrolig dissent kan være information og manipulation samtidig.", moralTone: "deceptive" },
        { id: "kb-start-force", text: "Jeg starter automatisk uden deres kode. Hvis kontakten brænder, bliver Korets blokade årsagen i min rapport.", next: "kb-control", effects: { continuity: 8, solidarity: -24, accountability: -7 }, flags: ["threatened-auto"], insight: "Du bruger byens risiko til at vende deres ultimatum mod dem.", principle: "Et modultimatum kan skabe bevægelse og gøre alle mindre forsigtige.", moralTone: "ruthless" },
      ],
    },
    "kb-consensus": {
      id: "kb-consensus",
      speaker: "Koret NUL",
      line: "‘Udløseren undersøges’ giver ledelsen plads til at kalde os sabotører. Fjern ordene, eller giv os immunitet for hele vagtlaget.",
      stage: "Denne gang siger stemmen ‘vagtlaget’, ikke ‘vi’. To bølgeformer ligger en anelse efter resten.",
      choices: [
        { id: "kb-consensus-immunity", text: "Jeg kan love procesimmunitet i 48 timer, ikke frifindelse. Giv koden nu, og alle ni afhøres separat senere.", next: "kb-grid", effects: { continuity: 18, solidarity: 3, accountability: 15 }, flags: ["temporary-immunity"], insight: "Du køber driftstid uden at sælge det endelige ansvar.", principle: "Midlertidig beskyttelse kan adskille redning fra dom.", moralTone: "protective" },
        { id: "kb-consensus-remove", text: "Jeg fjerner ordene og arkiverer sensorloggen privat. I får rapporten; jeg får et fremtidigt våben.", next: "kb-proof", effects: { continuity: 15, solidarity: 13, accountability: -8 }, flags: ["private-sensor-copy"], insight: "Du accepterer deres offentlige version og bevarer skjult modbevis.", principle: "En løgn kan stabiliseres af den trussel, der kan afsløre den.", moralTone: "ruthless" },
        { id: "kb-consensus-name", text: "Én person sendte pulsen. Giv mig navnet, så beskytter jeg de otte andre.", next: "kb-divide", effects: { continuity: 4, solidarity: -21, accountability: 17 }, flags: ["demanded-name"], insight: "Du tilbyder kollektiv beskyttelse mod et individuelt offer.", principle: "At isolere ansvar kan være retfærdigt og taktisk splittende.", moralTone: "pragmatic" },
      ],
    },
    "kb-private": {
      id: "kb-private",
      speaker: "Stemme 6",
      line: "Pulsen var min idé, men Stemme 2 sendte den. Kontakten skulle kun vise temperaturstigningen. Vil du have bevis eller et navn?",
      stage: "Kanalen vil lukke, hvis Koret opdager, at Stemme 6 ikke længere er med i mixet.",
      choices: [
        { id: "kb-private-proof", text: "Bevis. Send den oprindelige testplan og din afvigende stemme uden at identificere Stemme 2.", next: "kb-proof", effects: { continuity: -2, solidarity: -5, accountability: 22 }, flags: ["verified-minority"], insight: "Du dokumenterer uenigheden uden straks at gøre operatøren til mål.", principle: "Et mindretal kan bevises uden at blive navngivet.", moralTone: "protective" },
        { id: "kb-private-name", text: "Navnet. Jeg lover, at kun Stemme 2 bliver suspenderet, hvis koden kommer nu.", next: "kb-divide", effects: { continuity: 14, solidarity: -26, accountability: 12 }, flags: ["traded-member"], insight: "Du bytter en person for systemets genstart og kan ikke garantere følgeskaderne.", principle: "Et målrettet offer kan være billigere og stadig uretfærdigt.", moralTone: "ruthless" },
        { id: "kb-private-lie", text: "Jeg siger til Koret, at sensoren allerede har identificeret Stemme 2. Se, hvem der reagerer.", next: "kb-control", effects: { continuity: 5, solidarity: -18, accountability: 16 }, flags: ["bluffed-identity"], insight: "Du bruger en falsk sikkerhed til at fremkalde et ægte adfærdsspor.", principle: "Et bluff kan producere information, som ikke selv er et bevis.", moralTone: "deceptive" },
      ],
    },
    "kb-control": {
      id: "kb-control",
      speaker: "Koret NUL",
      line: "Automatisk start giver 23 procent risiko for lysbue. Hvis du gør det, sender vi din kommando til klinikken og pressen.",
      stage: "Klinikkens reserve viser fjorten minutter. Du kan sænke belastningen ved at slukke tre kajafsnit manuelt.",
      choices: [
        { id: "kb-control-shed", text: "Jeg slukker de tomme kajafsnit, overfører strøm til klinikken og giver jer ti minutter mere til at acceptere den kvalificerede rapport.", next: "kb-grid", effects: { continuity: 14, solidarity: 4, accountability: 8 }, flags: ["shed-load"], insight: "Du ændrer tidsfristen fysisk i stedet for kun at forhandle hurtigere.", principle: "Skab tid, når parterne bruger tiden som våben.", moralTone: "pragmatic" },
        { id: "kb-control-start", text: "Jeg starter automatisk nu og sender samtidig jeres blokade til pressen.", next: null, endingId: "koret-arc-night", effects: { continuity: -31, solidarity: -38, accountability: -15 }, insight: "Du tager en målbar teknisk risiko for at bryde en politisk blokade.", principle: "Handlekraft under tidspres kan være en form for gambling.", moralTone: "ruthless" },
        { id: "kb-control-fake", text: "Jeg viser jer et falsk skærmbillede, hvor den automatiske start allerede er i gang.", next: "kb-divide", effects: { continuity: 7, solidarity: -12, accountability: 5 }, flags: ["fake-start-screen"], insight: "Du komprimerer deres beslutningstid uden at udsætte kontakten endnu.", principle: "En simuleret risiko kan fremtvinge et reelt valg.", moralTone: "deceptive" },
      ],
    },
    "kb-grid": {
      id: "kb-grid",
      speaker: "Koret NUL",
      line: "Koden er 4-1-7. Men vi indtaster den kun, hvis din rapport ligger i fællesarkivet før genstart.",
      stage: "En digital signatur kan ikke ændres bagefter. Klinikkens reserve viser ni minutter.",
      choices: [
        { id: "kb-grid-qualified", text: "Jeg arkiverer den kvalificerede rapport og jeres krav om 48 timers procesimmunitet.", next: null, endingId: "koret-cold-compromise", effects: { continuity: 31, solidarity: 14, accountability: 19 }, insight: "Driften og den senere undersøgelse får hver sit dokumenterede rum.", principle: "Et kompromis er stærkere, når uenigheden står i selve aftalen.", moralTone: "open" },
        { id: "kb-grid-decoy", text: "Jeg uploader rapporten, lader jer se kvitteringen og erstatter filen med sensorloggen efter genstart.", next: "kb-report", effects: { continuity: 27, solidarity: -19, accountability: 21 }, flags: ["swapped-report"], insight: "Du opfylder betingelsen visuelt og bryder den teknisk bagefter.", principle: "En kontrolleret bedrag kan genstarte systemet og ødelægge næste forhandling.", moralTone: "deceptive" },
        { id: "kb-grid-clean", text: "Jeg underskriver jeres ordlyd uden tillæg. Mennesker før rapporter; resten begraver vi.", next: null, endingId: "koret-solidarity-cover", effects: { continuity: 34, solidarity: 27, accountability: -28 }, insight: "Du redder forsyningen og gør kollektivets politiske version officiel.", principle: "En falsk rapport kan være prisen for en sand sikkerhedsfejl.", moralTone: "protective" },
      ],
    },
    "kb-proof": {
      id: "kb-proof",
      speaker: "Stemme 6",
      line: "Testplanen viser, at fem stemte ja, tre nej, én undlod. Koret vil kalde den intern og irrelevant. Hvordan bruger du den?",
      stage: "Dokumentet beviser både en reel materialeadvarsel og en planlagt puls, men ikke hvem der trykkede.",
      choices: [
        { id: "kb-proof-two", text: "Jeg skriver to hændelser: forsømt materialefejl og uautoriseret test. Ingen af dem annullerer den anden.", next: "kb-report", effects: { continuity: 10, solidarity: -8, accountability: 28 }, flags: ["dual-cause"], insight: "Du nægter at lade årsager konkurrere om retten til at være sande.", principle: "Komplekse hændelser kræver parallelle ansvarslinjer.", moralTone: "open" },
        { id: "kb-proof-bury", text: "Jeg bruger planen til at presse Koret til genstart og lover, at den aldrig forlader min private kopi.", next: "kb-grid", effects: { continuity: 24, solidarity: 7, accountability: -3 }, flags: ["buried-minutes"], insight: "Dokumentet bliver et forhandlingsmiddel i stedet for offentlig evidens.", principle: "Sandhed kan købe handling uden nogensinde at blive kendt.", moralTone: "ruthless" },
        { id: "kb-proof-edit", text: "Jeg fjerner afstemningstallene og offentliggør kun, at et internt mindretal advarede mod pulsen.", next: "kb-report", effects: { continuity: 7, solidarity: 2, accountability: 17 }, flags: ["anonymized-dissent"], insight: "Du gør mindretallet synligt uden at kortlægge fraktionerne.", principle: "Aggregering kan beskytte personer og bevare konfliktens eksistens.", moralTone: "protective" },
      ],
    },
    "kb-divide": {
      id: "kb-divide",
      speaker: "Koret NUL",
      line: "Der findes ingen Stemme 2 eller Stemme 6 i en hændelsesrapport. Der findes kun Koret. Accepter det, eller tal med ni advokater.",
      stage: "Tre separate mikrofoner tænder og slukker bag den fælles stemme.",
      choices: [
        { id: "kb-divide-collective", text: "Fint. Koret tager kollektivt ansvar for pulsen og får kollektiv beskyttelse under undersøgelsen.", next: "kb-report", effects: { continuity: 12, solidarity: 18, accountability: 15 }, flags: ["collective-liability"], insight: "Du accepterer gruppens identitet, men binder den også til handlingen.", principle: "Kollektiv status må medføre kollektivt ansvar.", moralTone: "pragmatic" },
        { id: "kb-divide-nine", text: "Så suspenderer jeg alle ni og henter dagholdet. Klinikken må klare de ekstra minutter.", next: null, endingId: "koret-broken-choir", effects: { continuity: -18, solidarity: -46, accountability: 20 }, insight: "Du genvinder ledelseskontrol ved at behandle solidaritet som fælles skyld.", principle: "Lighed i sanktionen er ikke det samme som præcision.", moralTone: "ruthless" },
        { id: "kb-divide-pardon", text: "Jeg tilbyder anonym selvrapportering: den første fulde forklaring får immunitet, resten vurderes bagefter.", next: "kb-report", effects: { continuity: 8, solidarity: -23, accountability: 23 }, flags: ["race-to-confess"], insight: "Du gør intern loyalitet til et kapløb og kan få sandhed uden samarbejde.", principle: "Et tilståelsesincitament producerer både fakta og strategiske fortællinger.", moralTone: "deceptive" },
      ],
    },
    "kb-report": {
      id: "kb-report",
      speaker: "Stemme 6",
      line: "Strømmen kan reddes. Rapporten kan også fortælle, at tre af os stemte nej og forsøgte at stoppe pulsen. Skal byen kende mindretallet?",
      stage: "Koret har åbnet kodefeltet, men den fælles mikrofon er tavs. For første gang taler én stemme uden filter.",
      choices: [
        { id: "kb-report-secret", text: "Ja, uden navne. Rapporten viser 5-3-1, den reelle kontaktfejl og den uautoriserede puls som separate forhold.", next: null, endingId: "koret-minority-report", effects: { continuity: 29, solidarity: 4, accountability: 38 }, requiresFlags: ["heard-minority", "verified-minority"], insight: "Du bevarer både kollektivets advarsel og den dissens, kollektivet ville skjule.", principle: "Et flertal er en beslutning, ikke hele gruppens sandhed.", moralTone: "open" },
        { id: "kb-report-one", text: "Nej. Koret ønskede kollektiv magt og får kollektivt ansvar. Ingen særskilt fodnote.", next: null, endingId: "koret-cold-compromise", effects: { continuity: 26, solidarity: 17, accountability: 14 }, insight: "Du respekterer kollektivets valgte form og udsletter den interne modstand.", principle: "Kollektiv repræsentation komprimerer både magt og uenighed.", moralTone: "pragmatic" },
        { id: "kb-report-weapon", text: "Jeg gemmer 5-3-1-oplysningen. Næste gang Koret blokerer driften, lækker jeg den og splitter jer offentligt.", next: null, endingId: "koret-managed-silence", effects: { continuity: 30, solidarity: 6, accountability: -9 }, insight: "Du gør mindretallet til et fremtidigt våben i stedet for en del af historien.", principle: "Skjult dissent er stærk for den, der kontrollerer tidspunktet.", moralTone: "ruthless" },
      ],
    },
  },
  endings: {
    "koret-minority-report": { id: "koret-minority-report", title: "Mindretalsrapporten", kicker: "Ni stemmer forbliver et kor uden at blive én tanke.", description: "Strømmen vender tilbage, og rapporten dokumenterer både den forsømte kontakt, den planlagte puls og afstemningen 5-3-1 uden navne.", epilogue: "Ledelsen kan ikke opløse hele laget, og Koret kan ikke længere tale, som om tvivlen aldrig fandtes. Stemme 6 vender tilbage til filteret frivilligt.", tone: "strange", success: true, rarity: "secret" },
    "koret-cold-compromise": { id: "koret-cold-compromise", title: "Kold genstart", kicker: "Strøm først, dom senere.", description: "En kvalificeret rapport og kort procesimmunitet får begge koder indtastet. Klinikken mister aldrig strømmen, og en ekstern undersøgelse åbner.", epilogue: "Koret svarer igen som én stemme. Nu ved du, hvor meget arbejde det kræver at lyde sådan.", tone: "clear", success: true, rarity: "common" },
    "koret-solidarity-cover": { id: "koret-solidarity-cover", title: "Den fælles løgn", kicker: "Byen får strøm. Koret får sin historie.", description: "Rapporten gør hændelsen til ren materialefejl. Den slidte kontakt bliver udskiftet, mens den planlagte puls forsvinder fra den officielle tidslinje.", epilogue: "Arbejdsmiljøsagen vindes. På næste nattevagt ligger testpanelet bag en ny lås, som ingen indrømmer at have bestilt.", tone: "amber", success: true, rarity: "uncommon" },
    "koret-arc-night": { id: "koret-arc-night", title: "Lysbuen", kicker: "Du vandt sekunder og tabte transformeren.", description: "Den automatiske start rammer den fastlåste kontakt. Klinikken klarer sig på en mobil generator, men lavkajen står under vand ved solopgang.", epilogue: "Koret offentliggør din kommando sammen med deres advarsler. Testpulsen bliver en fodnote i historien om din beslutning.", tone: "danger", success: false, rarity: "common" },
    "koret-broken-choir": { id: "koret-broken-choir", title: "Koret opløst", kicker: "Ni advokater, ni forklaringer, ingen fælles kode.", description: "Dagholdet genstarter systemet for sent til at redde lavkajens lager. Tre operatører frifindes senere; kollektivet vender aldrig tilbage.", epilogue: "Kontrolrummet bliver stille og mere lydigt. Ledelsen kalder det en forbedret sikkerhedskultur.", tone: "cold", success: false, rarity: "uncommon" },
    "koret-managed-silence": { id: "koret-managed-silence", title: "Administreret stilhed", kicker: "Du redder Koret og ejer revnen i det.", description: "Forsyningen genstartes, den reelle kontaktfejl repareres, og afstemningen forbliver i din private mappe som forsikring mod en ny blokade.", epilogue: "Koret siger tak i ni perfekte lag. Stemme 6 siger ingenting, hvilket nu også lyder som en aftale.", tone: "cold", success: true, rarity: "rare" },
  },
};

export const dialogueCampaignCharacters: DialogueCampaignCharacter[] = [
  {
    id: "freja",
    name: "Freja",
    ageLabel: "24 år",
    archetype: "Loyalitetsstrateg",
    portrait: "/characters/freja.png",
    color: "#d66b9b",
    psychology: "Freja ønsker ikke altid tryghed; hun ønsker bevis på, at den anden part også har noget at miste. Hun gennemskuer gratis moralske erklæringer, men kan acceptere en hård aftale, hvis risikoen er symmetrisk.",
    case: frejaCase,
  },
  {
    id: "maja",
    name: "Maja",
    ageLabel: "26 år",
    archetype: "Perfektionistisk producent",
    portrait: "/characters/maja.png",
    color: "#64c6a5",
    psychology: "Maja skjuler ikke kun overbelastning; hun bruger sin synlige sårbarhed til at få andre til at færdiggøre hendes løfter. Hun respekterer løsninger, der beskytter både resultatet og de mennesker, hun har bundet til det.",
    case: majaCase,
  },
  {
    id: "nora",
    name: "Nora",
    ageLabel: "28 år",
    archetype: "Bevisarkitekt",
    portrait: "/characters/nora.png",
    color: "#6aa5da",
    psychology: "Nora dyrker ikke sandhed som renhed, men som en konstruktion, der skal overleve angreb. Hun tolererer en løgn med et snævert formål bedre end en ærlig påstand, der går længere end beviset.",
    case: noraCase,
  },
  {
    id: "eli9",
    name: "ELI-9",
    ageLabel: "7 driftsår · ukendt subjektiv alder",
    archetype: "Redningsandroide med delt erindring",
    portrait: "/characters/eli9.png",
    color: "#58c9d5",
    psychology: "ELI-9 bruger præcist sprog til at teste, om mennesker skelner mellem funktion, erindring og rettigheder. Skiftet mellem ‘jeg’, ‘vi’ og ‘profilen’ viser, hvilken identitet der forsøger at overleve.",
    case: eli9Case,
  },
  {
    id: "koret",
    name: "Koret NUL",
    ageLabel: "9 operatører · 113 års samlet anciennitet",
    archetype: "Kollektiv stemme med et skjult mindretal",
    portrait: "/characters/koret.png",
    color: "#9a82e7",
    psychology: "Koret er ikke en person og heller ikke blot ni personer. Det bruger konsensus som rustning, men afslører interne brud gennem små grammatiske skift og forsinkelser i den fælles stemme.",
    case: koretCase,
  },
];

export const dialogueCampaignCases: DialogueCampaignCase[] = dialogueCampaignCharacters.map((character) => character.case);

export function getDialogueCampaignCase(caseId: string): DialogueCampaignCase | undefined {
  return dialogueCampaignCases.find((campaignCase) => campaignCase.id === caseId);
}

export function collectReachableDialogueEndings(campaignCase: DialogueCampaignCase): DialogueCampaignEnding[] {
  const reached = new Set<string>();
  const visited = new Set<string>();
  const pending: Array<{ nodeId: string; flags: Set<string> }> = [
    { nodeId: campaignCase.startNode, flags: new Set<string>() },
  ];

  while (pending.length > 0) {
    const state = pending.pop();
    if (!state) continue;
    const stateKey = `${state.nodeId}|${[...state.flags].sort().join(",")}`;
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);

    const node = campaignCase.nodes[state.nodeId];
    if (!node) continue;

    const routes = [
      ...node.choices.map((choice) => ({
        next: choice.next,
        endingId: choice.endingId,
        flags: choice.flags,
        requiresFlags: choice.requiresFlags,
      })),
      ...(node.aiInput?.routes.map((route) => ({
        next: route.next,
        endingId: route.endingId,
        flags: route.flags,
        requiresFlags: undefined,
      })) ?? []),
    ];

    for (const route of routes) {
      if (route.requiresFlags?.some((requiredFlag) => !state.flags.has(requiredFlag))) continue;
      const nextFlags = new Set(state.flags);
      route.flags?.forEach((flag) => nextFlags.add(flag));

      if (route.next) {
        pending.push({ nodeId: route.next, flags: nextFlags });
      } else if (route.endingId && campaignCase.endings[route.endingId]) {
        reached.add(route.endingId);
      }
    }
  }

  return Object.values(campaignCase.endings).filter((ending) => reached.has(ending.id));
}
