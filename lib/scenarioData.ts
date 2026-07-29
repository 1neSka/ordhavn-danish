export type ScenarioKind = "harbor" | "phone" | "dialogue" | "post" | "metro" | "safety-console" | "cargo-routing";
export type ScenarioLevel = "A1" | "A2" | "B1" | "B2";

export interface ScenarioRun {
  id: string;
  kind: ScenarioKind;
  caseId: string;
  title: string;
  level: ScenarioLevel;
  startedAt: string;
  endedAt: string;
  success: boolean;
  score: number;
  maxScore: number;
  path: string[];
  decisions: Array<{
    stepId: string;
    answerId: string;
    answerText: string;
    correct: boolean | null;
    delta?: Record<string, number>;
  }>;
  metadata: Record<string, string | number | boolean | string[]>;
}

export type PhoneValue = boolean | string | number;

export interface PhoneSetting {
  id: string;
  label: string;
  description: string;
  type: "toggle" | "choice" | "slider";
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface PhonePage {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  parent: string | null;
  links?: Array<{ pageId: string; label: string; description: string; icon: string }>;
  settings?: string[];
}

export interface PhoneMission {
  id: string;
  title: string;
  level: ScenarioLevel;
  timeLimitMinutes: number;
  brief: string;
  message: string;
  successText: string;
  hint: string;
  initialState: Record<string, PhoneValue>;
  requirements: Record<string, PhoneValue>;
}

export const phoneSettings: Record<string, PhoneSetting> = {
  focusEnabled: { id: "focusEnabled", label: "Fokus", description: "Dæmp afbrydelser, når du har brug for ro.", type: "toggle" },
  focusSchedule: { id: "focusSchedule", label: "Automatisk tidsplan", description: "Aktivér Søvn-fokus hver aften kl. 22.30.", type: "toggle" },
  allowedPeople: { id: "allowedPeople", label: "Tillad opkald fra", description: "Vælg hvem der må bryde igennem Fokus.", type: "choice", options: [{ value: "none", label: "Ingen" }, { value: "favorites", label: "Favoritter" }, { value: "everyone", label: "Alle" }] },
  allowedApps: { id: "allowedApps", label: "Tillad notifikationer fra", description: "Apps, der stadig må sende beskeder under Fokus.", type: "choice", options: [{ value: "none", label: "Ingen apps" }, { value: "important", label: "Kun vigtige" }, { value: "all", label: "Alle apps" }] },
  repeatCalls: { id: "repeatCalls", label: "Gentagne opkald", description: "Et andet opkald inden for tre minutter går igennem.", type: "toggle" },
  mobileData: { id: "mobileData", label: "Mobildata", description: "Giv apps adgang til internettet uden Wi-Fi.", type: "toggle" },
  roaming: { id: "roaming", label: "Dataroaming", description: "Brug mobildata på et udenlandsk mobilnetværk.", type: "toggle" },
  mapsData: { id: "mapsData", label: "Kort", description: "Tillad Kort at bruge mobildata.", type: "toggle" },
  photosData: { id: "photosData", label: "Skyfotos", description: "Upload billeder via mobildata. Kan bruge meget data.", type: "toggle" },
  autoDownloads: { id: "autoDownloads", label: "Automatiske downloads", description: "Hent store opdateringer på mobildata.", type: "toggle" },
  textSize: { id: "textSize", label: "Tekststørrelse", description: "Gør tekst lettere at læse i hele telefonen.", type: "slider", min: 1, max: 5, step: 1, unit: "/5" },
  reduceMotion: { id: "reduceMotion", label: "Reducer bevægelse", description: "Erstat zoom og glidende effekter med roligere overgange.", type: "toggle" },
  highContrast: { id: "highContrast", label: "Øg kontrast", description: "Gør knapper og tekst tydeligere mod baggrunden.", type: "toggle" },
  boldText: { id: "boldText", label: "Fed tekst", description: "Vis systemtekst med en kraftigere skrifttype.", type: "toggle" },
  location: { id: "location", label: "Lokalitetstjenester", description: "Lad valgte apps bruge din placering.", type: "toggle" },
  preciseLocation: { id: "preciseLocation", label: "Præcis lokalitet", description: "Del din nøjagtige position i stedet for et omtrentligt område.", type: "toggle" },
  analyticsShare: { id: "analyticsShare", label: "Del enhedsanalyse", description: "Send tekniske brugsdata til producenten.", type: "toggle" },
};

export const phonePages: Record<string, PhonePage> = {
  root: {
    id: "root", title: "Indstillinger", subtitle: "Søg eller vælg en kategori", accent: "#8b7cf6", parent: null,
    links: [
      { pageId: "focus", label: "Fokus", description: "Ro, søvn og tilladte afbrydelser", icon: "moon" },
      { pageId: "mobile", label: "Mobilnetværk", description: "Data, roaming og appadgang", icon: "signal" },
      { pageId: "display", label: "Skærm & tekst", description: "Lys, tekst og kontrast", icon: "sun" },
      { pageId: "accessibility", label: "Tilgængelighed", description: "Bevægelse og læsevenlighed", icon: "accessibility" },
      { pageId: "privacy", label: "Anonymitet & sikkerhed", description: "Lokalitet og delte data", icon: "shield" },
    ],
  },
  focus: { id: "focus", title: "Fokus", subtitle: "Bestem hvad der må forstyrre dig", accent: "#7765e8", parent: "root", settings: ["focusEnabled", "focusSchedule"], links: [{ pageId: "focusAllowed", label: "Tilladte afbrydelser", description: "Personer, apps og gentagne opkald", icon: "bell" }] },
  focusAllowed: { id: "focusAllowed", title: "Tilladte afbrydelser", subtitle: "Undtagelser mens Fokus er aktivt", accent: "#7765e8", parent: "focus", settings: ["allowedPeople", "allowedApps", "repeatCalls"] },
  mobile: { id: "mobile", title: "Mobilnetværk", subtitle: "Styr dataforbruget på farten", accent: "#49b79e", parent: "root", settings: ["mobileData", "roaming", "autoDownloads"], links: [{ pageId: "mobileApps", label: "Data pr. app", description: "Vælg hvilke apps der må bruge mobildata", icon: "apps" }] },
  mobileApps: { id: "mobileApps", title: "Data pr. app", subtitle: "Apps med adgang til mobildata", accent: "#49b79e", parent: "mobile", settings: ["mapsData", "photosData"] },
  display: { id: "display", title: "Skærm & tekst", subtitle: "Tilpas det visuelle udtryk", accent: "#f2a843", parent: "root", settings: ["textSize", "boldText", "highContrast"] },
  accessibility: { id: "accessibility", title: "Tilgængelighed", subtitle: "Gør telefonen roligere og nemmere at bruge", accent: "#e26f6a", parent: "root", settings: ["reduceMotion", "highContrast", "boldText"] },
  privacy: { id: "privacy", title: "Anonymitet & sikkerhed", subtitle: "Bestem hvilke oplysninger der deles", accent: "#588fd8", parent: "root", settings: ["location", "preciseLocation", "analyticsShare"] },
};

export const phoneMissions: PhoneMission[] = [
  {
    id: "phone-sleep", title: "En rolig nat", level: "A2", timeLimitMinutes: 5,
    brief: "Sæt telefonen op, så Sofie kan sove uden appnotifikationer, men hendes favoritter stadig kan ringe. Gentagne ukendte opkald må ikke slippe igennem, og fokus skal starte automatisk.",
    message: "Jeg har nattevagt i morgen. Min mor skal kunne få fat i mig, men alle gruppechats holder mig vågen. — Sofie",
    successText: "Søvn-fokus starter automatisk. Favoritter kan ringe, mens apps og gentagne opkald forbliver stille.",
    hint: "Begynd under Fokus, og se derefter efter undtagelser for personer, apps og opkald.",
    initialState: { focusEnabled: false, focusSchedule: false, allowedPeople: "everyone", allowedApps: "all", repeatCalls: true },
    requirements: { focusEnabled: true, focusSchedule: true, allowedPeople: "favorites", allowedApps: "none", repeatCalls: false },
  },
  {
    id: "phone-roaming", title: "48 timer i Sverige", level: "B1", timeLimitMinutes: 6,
    brief: "Jonas skal kunne bruge Kort på rejsen, men billeder og store opdateringer må ikke bruge mobildata. Telefonen skal kunne gå på det svenske netværk.",
    message: "Mit abonnement dækker EU, men jeg har kun 5 GB. Jeg skal finde vej — ikke uploade 900 feriebilleder. — Jonas",
    successText: "Kort virker via roaming, mens Skyfotos og automatiske downloads ikke tømmer datapakken.",
    hint: "Roaming er ikke nok alene. Kontrollér også den enkelte apps adgang til mobildata.",
    initialState: { mobileData: true, roaming: false, mapsData: false, photosData: true, autoDownloads: true },
    requirements: { mobileData: true, roaming: true, mapsData: true, photosData: false, autoDownloads: false },
  },
  {
    id: "phone-calm", title: "Skærmen der står stille", level: "B1", timeLimitMinutes: 5,
    brief: "Amina bliver svimmel af zoom-animationer og har svært ved at læse den lille tekst. Gør teksten større og tydeligere uden at ændre lokalitets- eller delingsindstillinger.",
    message: "Jeg kan læse fed tekst bedst, og bevægelserne mellem apps gør mig utilpas. Tekststørrelse 4 plejer at være passende. — Amina",
    successText: "Telefonen bruger større fed tekst, høj kontrast og rolige overgange — uden unødige ændringer i privatlivet.",
    hint: "Løsningen ligger på to forskellige sider: Skærm & tekst samt Tilgængelighed.",
    initialState: { textSize: 2, reduceMotion: false, highContrast: false, boldText: false, location: true, preciseLocation: true, analyticsShare: false },
    requirements: { textSize: 4, reduceMotion: true, highContrast: true, boldText: true, location: true, preciseLocation: true, analyticsShare: false },
  },
];

export interface DialogueChoice {
  id: string;
  text: string;
  next: string | null;
  trust: number;
  tension: number;
  insight: string;
  principle: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  line: string;
  stage: string;
  choices: DialogueChoice[];
}

export interface DialogueCase {
  id: string;
  title: string;
  level: ScenarioLevel;
  location: string;
  premise: string;
  objective: string;
  startNode: string;
  successTrust: number;
  dangerLimit: number;
  nodes: Record<string, DialogueNode>;
}

export interface DialogueCharacter {
  id: string;
  name: string;
  age: number;
  archetype: string;
  portrait: string;
  color: string;
  psychology: string;
  rule: string;
  case: DialogueCase;
}

export const dialogueCharacters: DialogueCharacter[] = [
  {
    id: "freja", name: "Freja", age: 24, archetype: "Intens & jaloux", portrait: "/characters/freja.png", color: "#b4557b",
    psychology: "Hun scanner efter skjulte afvisninger. Løgne beroliger kort, men gør næste spørgsmål farligere. Tydelige grænser + konkret tryghed virker bedst.",
    rule: "Vær ærlig, konkret og varm — lov aldrig noget, du ikke kan holde.",
    case: {
      id: "dialogue-freja-dinner", title: "Middagen med en ekstra stol", level: "B1", location: "Frejas lejlighed · 20.17",
      premise: "Du er 17 minutter forsinket. Din kollega Ida skrev, at hun måske kommer forbi restauranten senere. Freja har set navnet på din låseskærm.",
      objective: "Forklar situationen uden at lyve, nedgøre Ida eller opgive dine egne grænser.", startNode: "f1", successTrust: 65, dangerLimit: 90,
      nodes: {
        f1: { id: "f1", speaker: "Freja", line: "Sytten minutter. Og Ida har skrevet tre gange. Skal jeg bare lade, som om det er normalt?", stage: "Hun smiler, men lægger din telefon midt på bordet.", choices: [
          { id: "f1-a", text: "Slap nu af. Du overdriver altid.", next: "f2-hostile", trust: -18, tension: 34, insight: "Du afviser følelsen og angriber personen. Nu handler samtalen om respekt, ikke om forsinkelsen.", principle: "Undgå personangreb." },
          { id: "f1-b", text: "Jeg var forsinket på arbejdet og burde have skrevet. Ida er min kollega; jeg vil hellere forklare det ærligt end skjule noget.", next: "f2-open", trust: 18, tension: -10, insight: "Du tager ansvar for din del uden at opfinde en bekvem løgn.", principle: "Ansvar + fakta." },
          { id: "f1-c", text: "Ida betyder ingenting. Jeg taler aldrig med hende igen, hvis du vil.", next: "f2-promise", trust: 5, tension: -4, insight: "Det lyder trygt nu, men er et urealistisk løfte, som inviterer til mere kontrol.", principle: "Lov ikke absolut lydighed." },
        ] },
        "f2-hostile": { id: "f2-hostile", speaker: "Freja", line: "Altid? Så det er altså mig, der er problemet. Hvorfor er du her så?", stage: "Smilet forsvinder. Døren bag dig klikker i låsen.", choices: [
          { id: "f2h-a", text: "Fordi jeg ikke gider mere drama. Flyt dig.", next: null, trust: -25, tension: 55, insight: "Ultimatum og aggressiv tone gør udgangen farlig. Samtalen afsluttes.", principle: "Deeskalér før du forlader rummet." },
          { id: "f2h-b", text: "Det var uretfærdigt sagt. Jeg er her, fordi du betyder noget, men jeg vil tale uden at angribe dig.", next: "f3", trust: 20, tension: -18, insight: "Du reparerer din formulering og sætter en respektfuld grænse.", principle: "Reparation + grænse." },
        ] },
        "f2-open": { id: "f2-open", speaker: "Freja", line: "Hvis der ikke er noget at skjule, kan jeg vel bare læse jeres beskeder?", stage: "Hun skubber telefonen roligt hen mod dig.", choices: [
          { id: "f2o-a", text: "Nej. Du må gerne spørge mig, men private beskeder er stadig private. Jeg kan fortælle dig, hvad planen med Ida er.", next: "f3", trust: 18, tension: -8, insight: "Du skelner mellem gennemsigtighed og overvågning og tilbyder konkret information.", principle: "Tryghed uden kontrol." },
          { id: "f2o-b", text: "Selvfølgelig. Du må også få min kode.", next: "f3-control", trust: 3, tension: 8, insight: "Eftergivenhed løser ikke mistilliden; den flytter blot grænsen.", principle: "Privatliv er ikke skyld." },
          { id: "f2o-c", text: "Det rager ikke dig.", next: null, trust: -22, tension: 46, insight: "Indholdet kan være sandt, men den lukkede formulering forstærker mistanken.", principle: "Sæt grænsen med forklaring." },
        ] },
        "f2-promise": { id: "f2-promise", speaker: "Freja", line: "Aldrig? Så skriv det til hende nu. Og fjern hende bagefter.", stage: "Hun læner sig frem og venter uden at blinke.", choices: [
          { id: "f2p-a", text: "Okay. Bare du ikke bliver vred.", next: "f3-control", trust: -2, tension: 16, insight: "Du gør frygt til beslutningsregel. Kravet bliver sandsynligvis større næste gang.", principle: "Frygt er ikke samtykke." },
          { id: "f2p-b", text: "Det lovede jeg for hurtigt. Jeg sletter ikke en kollega, men jeg vil gerne fortælle dig præcist, hvad aftalen er.", next: "f3", trust: 14, tension: -12, insight: "Du trækker et usundt løfte tilbage uden at trække omsorgen tilbage.", principle: "Korrigér falske løfter." },
        ] },
        "f3-control": { id: "f3-control", speaker: "Freja", line: "Godt. Så kan vi også slå din lokalitet til hele tiden. Det gør par vel?", stage: "Hun åbner allerede indstillingerne.", choices: [
          { id: "f3c-a", text: "Nej. Jeg vil gerne dele planer, ikke konstant position. Hvis det ikke er nok, tager jeg hjem nu.", next: null, trust: 16, tension: -18, insight: "En konkret grænse og en rolig konsekvens stopper kontrollens glidning.", principle: "Navngiv grænsen og konsekvensen." },
          { id: "f3c-b", text: "Ja, naturligvis. Alt for dig.", next: null, trust: -8, tension: 28, insight: "Absolut eftergivenhed ligner fred, men løser ikke relationens kerneproblem.", principle: "Bevar autonomi." },
        ] },
        f3: { id: "f3", speaker: "Freja", line: "Så hvad sker der helt konkret i aften? Og hvad forventer du af mig?", stage: "Hun slipper telefonen og lytter endelig.", choices: [
          { id: "f3-a", text: "Vi spiser sammen. Ida kommer måske forbi med sin kæreste senere. Jeg forventer, at vi spørger hinanden direkte i stedet for at kontrollere telefoner.", next: null, trust: 24, tension: -16, insight: "Konkrete fakta dæmper fantasien; gensidige regler beskytter begge.", principle: "Plan + gensidig aftale." },
          { id: "f3-b", text: "Lad os bare glemme det hele og lade som ingenting.", next: null, trust: -6, tension: 13, insight: "Konflikten er parkeret, ikke løst. Uklare planer holder mistanken i live.", principle: "Afslut med konkrete aftaler." },
        ] },
      },
    },
  },
  {
    id: "maja", name: "Maja", age: 26, archetype: "Perfektionist & people-pleaser", portrait: "/characters/maja.png", color: "#72a88c",
    psychology: "Hun tolker små fejl som bevis på, at hun har skuffet hele gruppen. Tomme forsikringer preller af; en afgrænset plan og delt ansvar hjælper.",
    rule: "Anerkend følelsen, gør problemet målbart, og tilbyd hjælp uden at overtage.",
    case: {
      id: "dialogue-maja-pitch", title: "Fejlen på side syv", level: "B1", location: "Designstudiet · 16.42",
      premise: "Tyve minutter før kundemødet opdager Maja et forkert tal i præsentationen. Fejlen kan rettes på fem minutter, men hun tror, at hele projektet er ødelagt.",
      objective: "Få hende tilbage til opgaven uden at minimere frygten eller tage alt arbejdet fra hende.", startNode: "m1", successTrust: 62, dangerLimit: 86,
      nodes: {
        m1: { id: "m1", speaker: "Maja", line: "Jeg har ødelagt det. Tallet på side syv er forkert, og de opdager sikkert alt det andet også.", stage: "Hun holder mappen så stramt, at knoerne bliver hvide.", choices: [
          { id: "m1-a", text: "Det er jo bare et tal. Du bekymrer dig for meget.", next: "m2-dismissed", trust: -14, tension: 20, insight: "Du gør følelsen forkert uden at gøre problemet mindre.", principle: "Anerkend før du løser." },
          { id: "m1-b", text: "Jeg kan se, at det rammer dig hårdt. Lad os først bekræfte, om fejlen kun står på side syv.", next: "m2-plan", trust: 18, tension: -13, insight: "Følelsen bliver set, og katastrofen bliver til en konkret kontrolopgave.", principle: "Validering + afgrænsning." },
          { id: "m1-c", text: "Giv mig filen. Jeg ordner hele præsentationen.", next: "m2-takeover", trust: -3, tension: -3, insight: "Det giver kort ro, men bekræfter hendes frygt for ikke at være kompetent.", principle: "Hjælp uden at overtage." },
        ] },
        "m2-dismissed": { id: "m2-dismissed", speaker: "Maja", line: "Du siger altid, at det ikke er noget. Måske ser du bare ikke, hvor dårligt mit arbejde er.", stage: "Hun lukker den bærbare computer halvt i.", choices: [
          { id: "m2d-a", text: "Du har ret — jeg gjorde din bekymring mindre. Vi undersøger fejlen sammen i to minutter.", next: "m3", trust: 18, tension: -14, insight: "Du reparerer og sætter en overskuelig tidsramme.", principle: "Reparation + tidsboks." },
          { id: "m2d-b", text: "Fint, så gennemgår vi alle 48 sider igen.", next: null, trust: -7, tension: 28, insight: "Du lader angsten bestemme omfanget og gør panikken større.", principle: "Afgræns problemet." },
        ] },
        "m2-plan": { id: "m2-plan", speaker: "Maja", line: "Jeg har tjekket: kilden er rigtig. Jeg kopierede bare 38 i stedet for 83. Men hvad hvis kunden spørger, hvorfor?", stage: "Hun trækker vejret langsommere, men undgår dit blik.", choices: [
          { id: "m2p-a", text: "Så siger vi sandheden: Det var en tastefejl, som blev rettet før mødet. Vil du rette tallet, mens jeg tjekker kilden én gang til?", next: "m3", trust: 20, tension: -12, insight: "Fejlen får korrekt størrelse, og ansvaret deles uden skam.", principle: "Sandhed + rollefordeling." },
          { id: "m2p-b", text: "Vi siger, at praktikanten gjorde det.", next: null, trust: -24, tension: 26, insight: "En bekvem løgn flytter skammen til en anden og ødelægger tillid.", principle: "Beskyt ikke med løgne." },
        ] },
        "m2-takeover": { id: "m2-takeover", speaker: "Maja", line: "Selvfølgelig. Du er også hurtigere end mig. Måske burde du bare præsentere det hele.", stage: "Hun skubber stolen væk fra bordet.", choices: [
          { id: "m2t-a", text: "Nej, det var ikke min pointe. Du kender løsningen bedst. Ret tallet; jeg tager et ekstra kildecheck.", next: "m3", trust: 17, tension: -12, insight: "Du giver kompetencen tilbage og tilbyder en klart afgrænset støtteopgave.", principle: "Giv ejerskab tilbage." },
          { id: "m2t-b", text: "God idé. Jeg tager den herfra.", next: null, trust: -18, tension: 18, insight: "Projektet reddes måske, men hendes selvstændighed og tillid gør ikke.", principle: "Effektivitet er ikke hele målet." },
        ] },
        m3: { id: "m3", speaker: "Maja", line: "Tallet er rettet. Jeg kan mærke, at jeg stadig ryster. Hvad gør vi de sidste ti minutter?", stage: "Hun har hånden på musen igen.", choices: [
          { id: "m3-a", text: "Du tager de tre kernesider højt. Jeg holder tiden og noterer kun uklare steder. Derefter stopper vi.", next: null, trust: 24, tension: -17, insight: "Planen træner kontrollen tilbage til hende og har et tydeligt stopkriterium.", principle: "Kort øvelse + stopregel." },
          { id: "m3-b", text: "Vi arbejder bare så hurtigt som muligt og håber på det bedste.", next: null, trust: -5, tension: 12, insight: "Utydelighed efterlader plads til ny katastrofetænkning.", principle: "Definér næste handling." },
        ] },
      },
    },
  },
  {
    id: "nora", name: "Nora", age: 28, archetype: "Analytisk & bevogtet", portrait: "/characters/nora.png", color: "#477ebc",
    psychology: "Hun tester om du kan skelne observation, kilde og antagelse. Smiger koster troværdighed; præcision og villighed til at korrigere vinder respekt.",
    rule: "Sig hvad du ved, hvordan du ved det, og hvad du endnu ikke ved.",
    case: {
      id: "dialogue-nora-source", title: "Kilden der ikke passer", level: "B2", location: "Redaktionen · 21.05",
      premise: "To dokumenter modsiger hinanden om kommunens boligbudget. Du har skrevet en sikker konklusion, men Nora vil godkende teksten før deadline.",
      objective: "Forsvar kun det, kilderne faktisk bærer, og korrigér din konklusion uden tom retorik.", startNode: "n1", successTrust: 68, dangerLimit: 82,
      nodes: {
        n1: { id: "n1", speaker: "Nora", line: "Du skriver, at budgettet ‘klart er blevet skåret ned’. Hvilken af de to tabeller beviser ordet klart?", stage: "Hun lægger begge kilder foran dig og venter.", choices: [
          { id: "n1-a", text: "Ingen alene. Den ene viser lavere drift, den anden højere anlæg. Min formulering er stærkere end belægget.", next: "n2-evidence", trust: 22, tension: -10, insight: "Du adskiller kategorierne og indrømmer overfortolkningen præcist.", principle: "Navngiv evidensgrænsen." },
          { id: "n1-b", text: "Jeg har en god fornemmelse for den slags — og du plejer jo at stole på mig.", next: "n2-flattery", trust: -22, tension: 24, insight: "Intuition og relationel smiger erstatter ikke dokumentation.", principle: "Autoritet er ikke evidens." },
          { id: "n1-c", text: "Begge dele, sådan overordnet set.", next: "n2-vague", trust: -12, tension: 16, insight: "Den vage formulering skjuler, at tabellerne måler forskellige ting.", principle: "Specificér variablen." },
        ] },
        "n2-flattery": { id: "n2-flattery", speaker: "Nora", line: "Jeg spørger ikke, om jeg kan lide dig. Jeg spørger, hvilken række der bærer påstanden.", stage: "Hun tager brillerne af. Det er ikke et godt tegn.", choices: [
          { id: "n2f-a", text: "Ingen række gør det alene. Jeg trækker formuleringen tilbage og sammenligner drift med drift.", next: "n3", trust: 20, tension: -15, insight: "Du skifter fra relation til metode og retter kategorifejlen.", principle: "Gå tilbage til måleenheden." },
          { id: "n2f-b", text: "Kan vi ikke bare skrive ‘ifølge flere kilder’ og komme videre?", next: null, trust: -24, tension: 38, insight: "Flertalsord skjuler ikke, at kilderne er uforenelige.", principle: "Kildepluralitet er ikke konsistens." },
        ] },
        "n2-vague": { id: "n2-vague", speaker: "Nora", line: "‘Overordnet’ er ofte et skjulested. Hvad sammenligner du helt præcist?", stage: "Hun peger på kolonneoverskrifterne.", choices: [
          { id: "n2v-a", text: "Jeg blandede drift i 2026 med anlægsrammen for 2027. De kan ikke bruges til den samme konklusion.", next: "n3", trust: 21, tension: -14, insight: "Den præcise fejlbeskrivelse gør korrektionen efterprøvbar.", principle: "Sammenlign samme kategori og år." },
          { id: "n2v-b", text: "Beløb. Store beløb.", next: null, trust: -20, tension: 32, insight: "Et substantiv uden en afgrænset variabel er stadig ikke et svar.", principle: "Definér variablen." },
        ] },
        "n2-evidence": { id: "n2-evidence", speaker: "Nora", line: "Godt. Hvad kan vi så skrive uden at foregive sikkerhed?", stage: "Hun skubber tastaturet over mod dig.", choices: [
          { id: "n2e-a", text: "Driftsbudgettet falder i udkastet, mens anlægsrammen stiger; den samlede virkning kan ikke afgøres ud fra de to tabeller alene.", next: "n3", trust: 24, tension: -13, insight: "Påstanden rummer både fundet og begrænsningen.", principle: "Konklusion + usikkerhed." },
          { id: "n2e-b", text: "Budgettet ændrer sig måske på en eller anden måde.", next: null, trust: -10, tension: 18, insight: "Forsigtighed uden information er bare tåge.", principle: "Vær forsigtig og informativ." },
        ] },
        n3: { id: "n3", speaker: "Nora", line: "Deadline om otte minutter. Hvad er din sidste kontrol, før vi publicerer?", stage: "Hendes tone er stadig kølig, men hun har ikke taget tastaturet tilbage.", choices: [
          { id: "n3-a", text: "Jeg åbner originalkilden, bekræfter årstal og enheder og linker begge tabeller. Hvis de stadig er uklare, markerer vi spørgsmålet som uafklaret.", next: null, trust: 26, tension: -16, insight: "Du gør kontrollen reproducerbar og bevarer retten til ikke at konkludere.", principle: "Reproducerbar sidste kontrol." },
          { id: "n3-b", text: "Jeg læser teksten én gang mere og retter det, der lyder forkert.", next: null, trust: -4, tension: 10, insight: "Sproglig glathed opdager ikke nødvendigvis en kildefejl.", principle: "Kontrollér kilden, ikke kun tonen." },
        ] },
      },
    },
  },
];

export interface PostClue {
  id: string;
  text: string;
  correct: boolean;
}

export interface PostAction {
  id: string;
  label: string;
  description: string;
  correct: boolean;
}

export interface PostCase {
  id: string;
  title: string;
  level: ScenarioLevel;
  sender: string;
  subject: string;
  received: string;
  body: string[];
  context: string;
  clues: PostClue[];
  actions: PostAction[];
  explanation: string;
}

export const postCases: PostCase[] = [
  {
    id: "post-mitid", title: "MitID udløber i dag", level: "A2", sender: "MitID Sikkerhedscenter <kontakt@mit-id-kontrol.net>", subject: "Sidste varsel: din adgang lukkes kl. 18", received: "I dag · 14.08",
    context: "Du brugte MitID i morges uden problemer. Beskeden kom som almindelig mail, ikke i Digital Post.",
    body: ["Kære bruger", "Vi har registreret manglende identitetskontrol. Bekræft dine oplysninger inden fire timer for at undgå permanent spærring.", "Åbn sikker kontrol: mit-id-kontrol.net/bekraeft", "Du skal bruge bruger-ID, kode og kortoplysninger."],
    clues: [
      { id: "domain", text: "Afsenderdomænet er ikke mitid.dk", correct: true },
      { id: "deadline", text: "Beskeden skaber ekstrem tidspres", correct: true },
      { id: "card", text: "Den beder om både kode og kortoplysninger", correct: true },
      { id: "greeting", text: "Der står ‘Kære bruger’", correct: false },
      { id: "morning", text: "MitID virkede i morges", correct: true },
    ],
    actions: [
      { id: "click", label: "Åbn linket og kontrollér", description: "Se om siden ser officiel ud.", correct: false },
      { id: "reply", label: "Svar og bed om bevis", description: "Få afsenderen til at forklare sig.", correct: false },
      { id: "official", label: "Luk mailen og åbn MitID direkte", description: "Kontrollér status i den officielle app eller skriv adressen selv.", correct: true },
    ],
    explanation: "Et legitimt sikkerhedstjek kræver ikke, at du følger et mail-link og afleverer kode samt kortdata. Gå altid til tjenesten via en kendt kanal.",
  },
  {
    id: "post-deposit", title: "Depositum før fremvisning", level: "B1", sender: "BoligService København <udlejning@bolig-service-mail.com>", subject: "Lejligheden er reserveret til dig", received: "Mandag · 09.31",
    context: "Du har kun skrevet én besked om en lejlighed. Huslejen er markant lavere end andre boliger i området, og du har ikke set den endnu.",
    body: ["Hej", "Ejeren arbejder midlertidigt i udlandet, så nøglen sendes med kurér.", "Overfør 18.000 kr. i depositum i dag. Beløbet refunderes, hvis lejligheden ikke passer.", "Når betalingen er registreret, får du adresse og kontrakt."],
    clues: [
      { id: "unseen", text: "Betaling kræves før fremvisning og kontrakt", correct: true },
      { id: "abroad", text: "Ejeren er praktisk nok i udlandet", correct: true },
      { id: "price", text: "Prisen er usædvanligt lav", correct: true },
      { id: "refund", text: "Der loves fuld refundering", correct: true },
      { id: "hello", text: "Beskeden begynder med ‘Hej’", correct: false },
    ],
    actions: [
      { id: "half", label: "Tilbyd halvdelen nu", description: "Vis seriøs interesse med mindre risiko.", correct: false },
      { id: "verify", label: "Verificér ejer og bolig uafhængigt", description: "Slå adressen op, kræv fysisk/video-fremvisning og underskrevet kontrakt før betaling.", correct: true },
      { id: "passport", label: "Send pas som sikkerhed", description: "Bevis at du er en seriøs lejer.", correct: false },
    ],
    explanation: "Kurérnøgle, udenlandsk ejer og betaling før fremvisning er en klassisk kombination. Et løfte om refundering gør ikke overførslen sikker.",
  },
  {
    id: "post-boss", title: "Direktørens hastebetaling", level: "B2", sender: "Lars Holm – Direktør <lars.holm@ordhavn-group.co>", subject: "Fortroligt: betal før bestyrelsesmødet", received: "Fredag · 16.47",
    context: "Din direktør hedder Lars Holm, men virksomhedens normale domæne slutter på .dk. Han plejer aldrig selv at sende betalingsinstrukser.",
    body: ["Jeg sidder i et lukket møde og kan ikke tale.", "Overfør 74.500 kr. til den vedhæftede konto inden kl. 17.15. Det er en fortrolig opkøbssag, så involvér ikke økonomichefen endnu.", "Svar kun på denne mail, når det er gjort."],
    clues: [
      { id: "lookalike", text: "Domænet ligner, men matcher ikke firmaets .dk-domæne", correct: true },
      { id: "bypass", text: "Afsenderen kræver, at normal godkendelse omgås", correct: true },
      { id: "secrecy", text: "Fortrolighed bruges til at isolere modtageren", correct: true },
      { id: "amount", text: "Beløbet er præcist angivet", correct: false },
      { id: "unavailable", text: "Afsenderen gør sig utilgængelig for kontrol", correct: true },
    ],
    actions: [
      { id: "call", label: "Verificér via kendt kanal", description: "Ring til Lars eller økonomichefen på et allerede gemt nummer.", correct: true },
      { id: "mail", label: "Svar med et kontrolspørgsmål", description: "Spørg om noget kun Lars kender i samme mailtråd.", correct: false },
      { id: "pay", label: "Betal og dokumentér bagefter", description: "Deadline er vigtigere end proceduren.", correct: false },
    ],
    explanation: "CEO-fraud kombinerer efterlignet identitet, tidspres, hemmelighed og omgåelse af kontrol. Verificér altid i en separat, allerede kendt kanal.",
  },
];

export interface MetroRoute {
  id: string;
  label: string;
  duration: number;
  changes: number;
  accessible: boolean;
  steps: string[];
  correct: boolean;
  explanation: string;
}

export interface MetroCase {
  id: string;
  title: string;
  level: ScenarioLevel;
  passenger: string;
  start: string;
  destination: string;
  now: string;
  deadline: string;
  incident: string;
  constraints: string[];
  closedStations: string[];
  routes: MetroRoute[];
}

export const metroCases: MetroCase[] = [
  {
    id: "metro-wheelchair", title: "Elevatoren er ude af drift", level: "A2", passenger: "Liv bruger kørestol og skal nå et møde.", start: "Nørreport", destination: "Kongens Nytorv", now: "08.12", deadline: "08.35",
    incident: "Elevatoren til M1/M2 på Kongens Nytorv er ude af drift. M3/M4-elevatoren virker. Togdriften er normal.", constraints: ["Trinfri adgang hele vejen", "Ankomst senest 08.35"], closedStations: [],
    routes: [
      { id: "m1-direct", label: "M1 direkte", duration: 4, changes: 0, accessible: false, steps: ["M1 fra Nørreport", "Stå af på Kongens Nytorv", "Brug M1/M2-elevatoren"], correct: false, explanation: "Ruten er hurtig, men den nødvendige elevator er netop ude af drift." },
      { id: "m3", label: "M3 via Gammel Strand", duration: 9, changes: 0, accessible: true, steps: ["M3 Cityringen fra Nørreport", "Fortsæt til Kongens Nytorv", "Brug M3/M4-elevatoren"], correct: true, explanation: "M3 tager lidt længere tid, men bruger den elevator, der stadig virker, og når fristen." },
      { id: "walk", label: "Gå gennem byen", duration: 22, changes: 0, accessible: true, steps: ["Følg Købmagergade", "Fortsæt mod Kongens Nytorv"], correct: false, explanation: "Ruten er mulig, men ankomsten bliver efter 08.35." },
    ],
  },
  {
    id: "metro-closure", title: "Et lukket stationsafsnit", level: "B1", passenger: "En familie med to små børn har barnevogn og tung bagage.", start: "København H", destination: "Østerport", now: "17.20", deadline: "18.00",
    incident: "M3/M4 standser ikke på Østerport på grund af politiarbejde. S-tog kører normalt. Bus 23 er 18 minutter forsinket.", constraints: ["Undgå lange trapper", "Højst ét skift", "Plads til barnevogn og bagage"], closedStations: ["Østerport · M3/M4"],
    routes: [
      { id: "s-train", label: "S-tog direkte", duration: 8, changes: 0, accessible: true, steps: ["Tag et nordgående S-tog fra København H", "Stå af på Østerport", "Følg elevator-skiltningen"], correct: true, explanation: "S-toget er direkte, tilgængeligt og berøres ikke af metroens lukning." },
      { id: "m4", label: "M4 direkte", duration: 10, changes: 0, accessible: true, steps: ["Tag M4 fra København H", "Stå af på Østerport"], correct: false, explanation: "Toget kører, men standser ikke på destinationen under hændelsen." },
      { id: "bus", label: "Bus 23", duration: 37, changes: 0, accessible: true, steps: ["Vent på bus 23", "Stå af ved Østerport"], correct: false, explanation: "Forsinkelsen gør ankomsten usikker og tæt på fristen." },
    ],
  },
  {
    id: "metro-last-train", title: "Sidste forbindelse", level: "B2", passenger: "Malik lander sent og har kun håndbagage.", start: "Lufthavnen", destination: "Vanløse", now: "00.41", deadline: "01.28",
    incident: "M2 kører kun til Frederiksberg efter kl. 01.05 på grund af natligt sporarbejde. Det sidste gennemgående tog afgår Lufthavnen 00.49. Toget mod Hovedbanegården afgår 00.56.", constraints: ["Nå Vanløse før 01.28", "Ingen taxa", "Skift er tilladt"], closedStations: ["M2 Frederiksberg–Vanløse efter 01.05"],
    routes: [
      { id: "last-m2", label: "Sidste M2 direkte", duration: 34, changes: 0, accessible: true, steps: ["Gå straks til M2", "Afgang 00.49", "Bliv i toget til Vanløse 01.15"], correct: true, explanation: "Det sidste gennemgående tog passerer det senere lukkede afsnit og når frem før fristen." },
      { id: "late-m2", label: "Næste M2 og vent", duration: 58, changes: 1, accessible: true, steps: ["Tag M2 efter 00.55", "Stå af på Frederiksberg", "Vent på erstatningsbus"], correct: false, explanation: "Efter 01.05 ender M2 på Frederiksberg, og erstatningsbussen når ikke fristen." },
      { id: "train-switch", label: "Tog + S-tog", duration: 43, changes: 2, accessible: true, steps: ["Tog 00.56 til København H", "S-tog til Flintholm", "Skift mod Vanløse"], correct: false, explanation: "Ruten er mulig, men de to natlige skift gør ankomsten senere end 01.28." },
    ],
  },
];
