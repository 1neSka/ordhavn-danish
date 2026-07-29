export type CityScenarioId = "borgerpost" | "byruten";
export type CityScenarioLevel = "A2" | "A2+" | "B1";
export type CityCaseId =
  | "storskrald"
  | "flyttedag"
  | "boligstoette"
  | "morgenbud"
  | "regnvej"
  | "kulturaften";

export interface CityScenarioCard {
  id: CityScenarioId;
  kind: "city";
  title: string;
  englishTitle: string;
  eyebrow: string;
  description: string;
  englishDescription: string;
  location: string;
  accent: string;
  levels: CityScenarioLevel[];
  caseCount: number;
}

export interface GlossaryEntry {
  danish: string;
  english: string;
  note: string;
}

interface CityCaseBase {
  id: CityCaseId;
  title: string;
  englishTitle: string;
  level: CityScenarioLevel;
  brief: string;
  englishBrief: string;
  rewardKroner: number;
  accent: string;
  glossary: GlossaryEntry[];
}

export interface FormOption {
  id: string;
  label: string;
  englishLabel: string;
}

export interface FormField {
  id: string;
  label: string;
  englishLabel: string;
  options: FormOption[];
  correctOptionId: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  englishLabel: string;
}

export interface CivicFormCase extends CityCaseBase {
  engine: "civic-form";
  document: {
    sender: string;
    title: string;
    englishTitle: string;
    paragraphs: string[];
    englishParagraphs: string[];
    reference: string;
  };
  fields: FormField[];
  calculation: {
    prompt: string;
    englishPrompt: string;
    unit: string;
    expected: number;
  };
  workflowOptions: WorkflowStep[];
  workflowSolution: string[];
}

export interface RouteStop {
  id: string;
  label: string;
  englishLabel: string;
  zone: number;
  windowStart: number;
  windowEnd: number;
  serviceMinutes: number;
  task: string;
  englishTask: string;
}

export interface RouteTicket {
  id: string;
  label: string;
  englishLabel: string;
  zones: number[];
  validityMinutes: number;
  cost: number;
}

export interface RouteCase extends CityCaseBase {
  engine: "route-planner";
  start: {
    id: string;
    label: string;
    englishLabel: string;
    zone: number;
    time: number;
  };
  dispatch: string[];
  englishDispatch: string[];
  stops: RouteStop[];
  travelMinutes: Record<string, number>;
  tickets: RouteTicket[];
  solutionRoute: string[];
  solutionTicketId: string;
}

export interface CivicFormScenario extends CityScenarioCard {
  engine: "civic-form";
  cases: CivicFormCase[];
}

export interface RouteScenario extends CityScenarioCard {
  engine: "route-planner";
  cases: RouteCase[];
}

export type CityScenario = CivicFormScenario | RouteScenario;
export type CityCase = CivicFormCase | RouteCase;

export interface FormAttempt {
  selections: Record<string, string>;
  calculation: number | null;
  workflow: string[];
}

export interface FormEvaluation {
  success: boolean;
  score: number;
  correctFields: number;
  fieldCount: number;
  calculationCorrect: boolean;
  workflowPrefix: number;
  workflowCorrect: boolean;
  feedback: string[];
}

export interface RouteTimelineEntry {
  stopId: string;
  arrival: number;
  serviceStart: number;
  departure: number;
  withinWindow: boolean;
}

export interface RouteEvaluation {
  success: boolean;
  score: number;
  routeFeasible: boolean;
  ticketCorrect: boolean;
  uniqueStops: boolean;
  timeline: RouteTimelineEntry[];
  feedback: string[];
}

export interface CityAttemptMetadata {
  scenarioId: CityScenarioId;
  caseId: CityCaseId;
  attemptNumber: number;
  firstAttemptEligible: boolean;
  firstAttemptSuccess: boolean;
  score: number;
  kronerEarned: number;
  ravEarned: number;
}

const routeKey = (from: string, to: string) => `${from}>${to}`;

const borgerpost: CivicFormScenario = {
  id: "borgerpost",
  kind: "city",
  engine: "civic-form",
  title: "Borgerservice: Læs det med småt",
  englishTitle: "Citizen service: Read the fine print",
  eyebrow: "BREV · BLANKET · HANDLINGSPLAN",
  description: "Find de afgørende oplysninger i et officielt brev, udfyld den rigtige blanket og sæt handlingerne i sikker rækkefølge.",
  englishDescription: "Find the decisive information in an official letter, complete the correct form, and arrange the actions safely.",
  location: "Borgerservice · Skranke 4",
  accent: "#e5a75e",
  levels: ["A2", "A2+", "B1"],
  caseCount: 3,
  cases: [
    {
      id: "storskrald",
      engine: "civic-form",
      title: "Sofaen på fortovet",
      englishTitle: "The sofa on the pavement",
      level: "A2",
      brief: "Naboen har givet dig et brev og tre ting. Bestil afhentning uden at vælge fakturanummeret eller den forkerte dato.",
      englishBrief: "Your neighbour gave you a letter and three items. Book collection without using the invoice number or the wrong date.",
      rewardKroner: 55,
      accent: "#e5a75e",
      glossary: [
        { danish: "storskrald", english: "bulky waste", note: "Large household items collected separately." },
        { danish: "afhentning", english: "collection", note: "When the municipality picks something up." },
        { danish: "kundenummer", english: "customer number", note: "Not the same as an invoice number." },
      ],
      document: {
        sender: "Nordhavn Affald",
        title: "Bestilling af storskrald",
        englishTitle: "Booking bulky-waste collection",
        reference: "Kunde 48271 · Faktura 90418",
        paragraphs: [
          "Vi henter storskrald tirsdag den 17. september mellem kl. 07.00 og 12.00. Bestil senest den 12. september med kundenummer 48271.",
          "Du må stille højst tre dele ved kantstenen efter kl. 20.00 aftenen før. Batterier skal afleveres på genbrugsstationen.",
          "Prisen er 35 kr. pr. stor del plus et bestillingsgebyr på 15 kr. En sofa og en stol tæller som to store dele; lampen er gratis.",
        ],
        englishParagraphs: [
          "We collect bulky waste on Tuesday 17 September between 07:00 and 12:00. Book by 12 September using customer number 48271.",
          "Place no more than three items by the kerb after 20:00 the evening before. Batteries must go to the recycling centre.",
          "The price is DKK 35 per large item plus a DKK 15 booking fee. A sofa and a chair count as two large items; the lamp is free.",
        ],
      },
      fields: [
        {
          id: "reference",
          label: "Nummer på blanketten",
          englishLabel: "Number on the form",
          correctOptionId: "customer",
          options: [
            { id: "invoice", label: "90418", englishLabel: "invoice number" },
            { id: "customer", label: "48271", englishLabel: "customer number" },
            { id: "date", label: "1209", englishLabel: "deadline written as digits" },
          ],
        },
        {
          id: "date",
          label: "Afhentningsdato",
          englishLabel: "Collection date",
          correctOptionId: "pickup",
          options: [
            { id: "deadline", label: "12. september", englishLabel: "booking deadline" },
            { id: "pickup", label: "17. september", englishLabel: "collection date" },
            { id: "eve", label: "16. september kl. 20", englishLabel: "earliest placement time" },
          ],
        },
        {
          id: "place",
          label: "Placering",
          englishLabel: "Placement",
          correctOptionId: "kerb",
          options: [
            { id: "hall", label: "I opgangen", englishLabel: "inside the stairwell" },
            { id: "kerb", label: "Ved kantstenen", englishLabel: "by the kerb" },
            { id: "station", label: "På genbrugsstationen", englishLabel: "at the recycling centre" },
          ],
        },
      ],
      calculation: {
        prompt: "Sofa + stol + gratis lampe: Hvad koster afhentningen i alt?",
        englishPrompt: "Sofa + chair + free lamp: What is the total collection cost?",
        unit: "kr.",
        expected: 85,
      },
      workflowOptions: [
        { id: "sort", label: "Fjern batteriet fra lampen", englishLabel: "Remove the battery from the lamp" },
        { id: "book", label: "Bestil med kundenummeret", englishLabel: "Book using the customer number" },
        { id: "label", label: "Sæt mærke på de tre dele", englishLabel: "Label the three items" },
        { id: "place", label: "Stil delene ud efter kl. 20", englishLabel: "Put the items out after 20:00" },
        { id: "early", label: "Stil delene ud om morgenen den 16.", englishLabel: "Put the items out on the morning of the 16th" },
      ],
      workflowSolution: ["sort", "book", "label", "place"],
    },
    {
      id: "flyttedag",
      engine: "civic-form",
      title: "Flytning og parkering",
      englishTitle: "Moving and parking",
      level: "A2+",
      brief: "Du flytter på en fredag. Meld adressen korrekt, og reserver kun de timer, hvor flyttebilen faktisk står ved huset.",
      englishBrief: "You move on a Friday. Report the address correctly and reserve only the hours when the van is actually outside the building.",
      rewardKroner: 70,
      accent: "#de8d55",
      glossary: [
        { danish: "folkeregister", english: "civil register", note: "The official register of residents and addresses." },
        { danish: "indflytningsdato", english: "move-in date", note: "The day the new address starts." },
        { danish: "midlertidig", english: "temporary", note: "Valid for a limited time." },
      ],
      document: {
        sender: "Københavns Borgerservice",
        title: "Din flytning den 4. oktober",
        englishTitle: "Your move on 4 October",
        reference: "Sag F-7713 · Ny adresse: Strandlodsvej 18, 2. th.",
        paragraphs: [
          "Meld flytning senest fem dage efter indflytningen. Brug indflytningsdatoen 4. oktober og sagsnummer F-7713. Lejemålet er din faste bopæl, ikke en midlertidig adresse.",
          "Flyttebilen ankommer kl. 09.30 og kører kl. 12.30. En parkeringsreservation købes i hele timer og skal dække hele perioden.",
          "Reservationen koster 24 kr. pr. time. Skiltet skal sættes op mindst 24 timer før, men først efter tilladelsen er modtaget digitalt.",
        ],
        englishParagraphs: [
          "Report the move no later than five days after moving in. Use 4 October as the move-in date and case number F-7713. This is your permanent home, not a temporary address.",
          "The moving van arrives at 09:30 and leaves at 12:30. A parking reservation is sold in whole hours and must cover the full period.",
          "The reservation costs DKK 24 per hour. Put up the sign at least 24 hours beforehand, but only after receiving the permit digitally.",
        ],
      },
      fields: [
        {
          id: "address-type",
          label: "Adressetype",
          englishLabel: "Address type",
          correctOptionId: "permanent",
          options: [
            { id: "temporary", label: "Midlertidig adresse", englishLabel: "temporary address" },
            { id: "permanent", label: "Fast bopæl", englishLabel: "permanent residence" },
            { id: "postal", label: "Kun postadresse", englishLabel: "postal address only" },
          ],
        },
        {
          id: "move-date",
          label: "Indflytningsdato",
          englishLabel: "Move-in date",
          correctOptionId: "oct4",
          options: [
            { id: "oct4", label: "4. oktober", englishLabel: "4 October" },
            { id: "oct9", label: "9. oktober", englishLabel: "last reporting day" },
            { id: "oct3", label: "3. oktober", englishLabel: "day before the move" },
          ],
        },
        {
          id: "parking",
          label: "Tidsrum på skiltet",
          englishLabel: "Time range on the sign",
          correctOptionId: "09-13",
          options: [
            { id: "09-12", label: "09.00–12.00", englishLabel: "09:00–12:00" },
            { id: "09-13", label: "09.00–13.00", englishLabel: "09:00–13:00" },
            { id: "10-13", label: "10.00–13.00", englishLabel: "10:00–13:00" },
          ],
        },
      ],
      calculation: {
        prompt: "Fire hele parkeringstimer til 24 kr.: Hvad betaler du?",
        englishPrompt: "Four whole parking hours at DKK 24: How much do you pay?",
        unit: "kr.",
        expected: 96,
      },
      workflowOptions: [
        { id: "report", label: "Meld flytningen digitalt", englishLabel: "Report the move digitally" },
        { id: "apply", label: "Søg om parkeringstilladelsen", englishLabel: "Apply for the parking permit" },
        { id: "receive", label: "Modtag tilladelsen", englishLabel: "Receive the permit" },
        { id: "sign", label: "Sæt skiltet op mindst 24 timer før", englishLabel: "Put up the sign at least 24 hours beforehand" },
        { id: "sign-first", label: "Sæt først skiltet op og søg bagefter", englishLabel: "Put up the sign first and apply afterwards" },
      ],
      workflowSolution: ["report", "apply", "receive", "sign"],
    },
    {
      id: "boligstoette",
      engine: "civic-form",
      title: "Bilaget, der mangler",
      englishTitle: "The missing attachment",
      level: "B1",
      brief: "En ansøgning om boligstøtte er sat på pause. Sammenhold brevet med lønsedlerne, beregn årsindkomsten og send kun de nødvendige bilag.",
      englishBrief: "A housing-support application is paused. Compare the letter with the payslips, calculate annual income, and submit only the necessary documents.",
      rewardKroner: 90,
      accent: "#d87d54",
      glossary: [
        { danish: "bilag", english: "supporting document", note: "A document attached as evidence." },
        { danish: "husstandsindkomst", english: "household income", note: "The combined income of the household." },
        { danish: "efterspørge", english: "request", note: "To ask specifically for missing information." },
      ],
      document: {
        sender: "Udbetaling Danmark",
        title: "Vi mangler oplysninger til din ansøgning",
        englishTitle: "We need information for your application",
        reference: "Sag BS-2046 · Svarfrist 21. november",
        paragraphs: [
          "Vi har lejekontrakten, men mangler dokumentation for Samiras aktuelle indkomst. Send de to seneste lønsedler samlet som én fil senest 21. november.",
          "Samira får 18.400 kr. før skat om måneden. I december får hun desuden en engangsbonus på 3.000 kr. Husstanden har ingen anden indkomst.",
          "Oplys den forventede årsindkomst før skat. Send ikke pas eller sundhedskort, medmindre vi efterspørger legitimation i et nyt brev.",
        ],
        englishParagraphs: [
          "We already have the tenancy agreement, but need proof of Samira's current income. Submit the two latest payslips as one file by 21 November.",
          "Samira earns DKK 18,400 before tax each month. In December she also receives a one-off bonus of DKK 3,000. The household has no other income.",
          "State the expected annual income before tax. Do not submit a passport or health card unless identification is requested in a new letter.",
        ],
      },
      fields: [
        {
          id: "document",
          label: "Bilag",
          englishLabel: "Attachment",
          correctOptionId: "payslips",
          options: [
            { id: "lease", label: "Lejekontrakten igen", englishLabel: "the tenancy agreement again" },
            { id: "payslips", label: "To lønsedler i én fil", englishLabel: "two payslips in one file" },
            { id: "passport", label: "Pas og sundhedskort", englishLabel: "passport and health card" },
          ],
        },
        {
          id: "income-type",
          label: "Beløbstype",
          englishLabel: "Income type",
          correctOptionId: "gross",
          options: [
            { id: "net", label: "Efter skat", englishLabel: "after tax" },
            { id: "gross", label: "Før skat", englishLabel: "before tax" },
            { id: "rent", label: "Efter husleje", englishLabel: "after rent" },
          ],
        },
        {
          id: "deadline",
          label: "Svarfrist",
          englishLabel: "Response deadline",
          correctOptionId: "nov21",
          options: [
            { id: "nov12", label: "12. november", englishLabel: "12 November" },
            { id: "nov21", label: "21. november", englishLabel: "21 November" },
            { id: "dec1", label: "1. december", englishLabel: "1 December" },
          ],
        },
        {
          id: "household",
          label: "Anden indkomst",
          englishLabel: "Other income",
          correctOptionId: "none",
          options: [
            { id: "bonus-only", label: "3.000 kr. om måneden", englishLabel: "DKK 3,000 per month" },
            { id: "unknown", label: "Ikke oplyst", englishLabel: "not provided" },
            { id: "none", label: "Ingen anden indkomst", englishLabel: "no other income" },
          ],
        },
      ],
      calculation: {
        prompt: "12 × 18.400 kr. + engangsbonus på 3.000 kr.: Forventet årsindkomst?",
        englishPrompt: "12 × DKK 18,400 + a one-off DKK 3,000 bonus: Expected annual income?",
        unit: "kr.",
        expected: 223800,
      },
      workflowOptions: [
        { id: "scan", label: "Saml de to lønsedler i én fil", englishLabel: "Combine the two payslips in one file" },
        { id: "calculate", label: "Beregn årsindkomsten inklusive bonus", englishLabel: "Calculate annual income including the bonus" },
        { id: "submit", label: "Send oplysningerne med sagsnummeret", englishLabel: "Submit the information with the case number" },
        { id: "receipt", label: "Gem den digitale kvittering", englishLabel: "Save the digital receipt" },
        { id: "identity", label: "Vedhæft også pas for en sikkerheds skyld", englishLabel: "Also attach a passport just in case" },
      ],
      workflowSolution: ["scan", "calculate", "submit", "receipt"],
    },
  ],
};

const byruten: RouteScenario = {
  id: "byruten",
  kind: "city",
  engine: "route-planner",
  title: "Bybuddet: Tiden løber",
  englishTitle: "City courier: Time is running",
  eyebrow: "RUTE · TIDSVINDUER · ZONER",
  description: "Læs dagens beskeder, byg den eneste mulige rute og vælg den billigste billet, der både dækker zonerne og tiden.",
  englishDescription: "Read the day's messages, build the only possible route, and choose the cheapest ticket that covers both zones and duration.",
  location: "Budcentralen · Kajplads 7",
  accent: "#66b9ae",
  levels: ["A2", "A2+", "B1"],
  caseCount: 3,
  cases: [
    {
      id: "morgenbud",
      engine: "route-planner",
      title: "Tre pakker før frokost",
      englishTitle: "Three parcels before lunch",
      level: "A2",
      brief: "Start kl. 09.00. Alle modtagere har korte åbningstider, så rækkefølgen kan ikke vælges frit.",
      englishBrief: "Start at 09:00. Every recipient has a narrow opening window, so the order is constrained.",
      rewardKroner: 60,
      accent: "#66b9ae",
      glossary: [
        { danish: "tidsvindue", english: "time window", note: "The period in which a delivery is accepted." },
        { danish: "gyldig", english: "valid", note: "Accepted for a specific time or area." },
        { danish: "aflevere", english: "deliver", note: "To hand something over at its destination." },
      ],
      start: { id: "depot", label: "Budcentralen", englishLabel: "courier depot", zone: 1, time: 540 },
      dispatch: [
        "Biblioteket tager kun imod pakken kl. 09.10–09.22.",
        "Apoteket åbner vareindgangen kl. 09.28–09.40.",
        "Borgerservice modtager kuverten kl. 09.45–10.00.",
      ],
      englishDispatch: [
        "The library only accepts the parcel from 09:10 to 09:22.",
        "The pharmacy opens the goods entrance from 09:28 to 09:40.",
        "Citizen service accepts the envelope from 09:45 to 10:00.",
      ],
      stops: [
        { id: "library", label: "Biblioteket", englishLabel: "library", zone: 1, windowStart: 550, windowEnd: 562, serviceMinutes: 5, task: "Aflever bogkassen", englishTask: "Deliver the book crate" },
        { id: "pharmacy", label: "Apoteket", englishLabel: "pharmacy", zone: 2, windowStart: 568, windowEnd: 580, serviceMinutes: 5, task: "Aflever køleboksen", englishTask: "Deliver the cold box" },
        { id: "service", label: "Borgerservice", englishLabel: "citizen service", zone: 2, windowStart: 585, windowEnd: 600, serviceMinutes: 5, task: "Aflever den blå kuvert", englishTask: "Deliver the blue envelope" },
      ],
      travelMinutes: {
        [routeKey("depot", "library")]: 10, [routeKey("depot", "pharmacy")]: 20, [routeKey("depot", "service")]: 26,
        [routeKey("library", "pharmacy")]: 10, [routeKey("library", "service")]: 18,
        [routeKey("pharmacy", "library")]: 10, [routeKey("pharmacy", "service")]: 8,
        [routeKey("service", "library")]: 18, [routeKey("service", "pharmacy")]: 8,
      },
      tickets: [
        { id: "one-zone", label: "1 zone · 60 min", englishLabel: "1 zone · 60 min", zones: [1], validityMinutes: 60, cost: 18 },
        { id: "two-zone", label: "2 zoner · 60 min", englishLabel: "2 zones · 60 min", zones: [1, 2], validityMinutes: 60, cost: 24 },
        { id: "day", label: "Dagsbillet · alle zoner", englishLabel: "day ticket · all zones", zones: [1, 2, 3], validityMinutes: 1440, cost: 80 },
      ],
      solutionRoute: ["library", "pharmacy", "service"],
      solutionTicketId: "two-zone",
    },
    {
      id: "regnvej",
      engine: "route-planner",
      title: "Regn over broen",
      englishTitle: "Rain over the bridge",
      level: "A2+",
      brief: "En oversvømmet tunnel gør nogle strækninger langsomme. Vent om nødvendigt, men kom aldrig efter et tidsvindue.",
      englishBrief: "A flooded tunnel makes some legs slow. Wait if needed, but never arrive after a time window.",
      rewardKroner: 78,
      accent: "#4eaaa6",
      glossary: [
        { danish: "oversvømmet", english: "flooded", note: "Covered by too much water." },
        { danish: "varemodtagelse", english: "goods reception", note: "An entrance for deliveries rather than customers." },
        { danish: "omvej", english: "detour", note: "A longer alternative route." },
      ],
      start: { id: "station", label: "Østerport", englishLabel: "Østerport station", zone: 1, time: 780 },
      dispatch: [
        "Tag først prøven til klinikken; den skal være fremme mellem 13.12 og 13.24.",
        "Museets varemodtagelse åbner 13.32–13.45. Skolen tager imod nøglen 13.48–14.02.",
        "Pakken til værkstedet må først afleveres fra 14.05 og senest 14.18.",
      ],
      englishDispatch: [
        "Take the sample to the clinic first; it must arrive between 13:12 and 13:24.",
        "The museum goods entrance opens 13:32–13:45. The school accepts the key from 13:48–14:02.",
        "The workshop parcel may only be delivered from 14:05 and no later than 14:18.",
      ],
      stops: [
        { id: "clinic", label: "Klinikken", englishLabel: "clinic", zone: 1, windowStart: 792, windowEnd: 804, serviceMinutes: 4, task: "Aflever laboratorieprøven", englishTask: "Deliver the lab sample" },
        { id: "museum", label: "Museet", englishLabel: "museum", zone: 2, windowStart: 812, windowEnd: 825, serviceMinutes: 5, task: "Aflever plakatrullen", englishTask: "Deliver the poster roll" },
        { id: "school", label: "Skolen", englishLabel: "school", zone: 2, windowStart: 828, windowEnd: 842, serviceMinutes: 4, task: "Aflever ekstranøglen", englishTask: "Deliver the spare key" },
        { id: "workshop", label: "Værkstedet", englishLabel: "workshop", zone: 3, windowStart: 845, windowEnd: 858, serviceMinutes: 5, task: "Aflever reservedelen", englishTask: "Deliver the spare part" },
      ],
      travelMinutes: {
        [routeKey("station", "clinic")]: 9, [routeKey("station", "museum")]: 22, [routeKey("station", "school")]: 25, [routeKey("station", "workshop")]: 35,
        [routeKey("clinic", "museum")]: 13, [routeKey("clinic", "school")]: 19, [routeKey("clinic", "workshop")]: 29,
        [routeKey("museum", "clinic")]: 15, [routeKey("museum", "school")]: 8, [routeKey("museum", "workshop")]: 18,
        [routeKey("school", "clinic")]: 19, [routeKey("school", "museum")]: 8, [routeKey("school", "workshop")]: 9,
        [routeKey("workshop", "clinic")]: 29, [routeKey("workshop", "museum")]: 18, [routeKey("workshop", "school")]: 9,
      },
      tickets: [
        { id: "two-short", label: "2 zoner · 60 min", englishLabel: "2 zones · 60 min", zones: [1, 2], validityMinutes: 60, cost: 24 },
        { id: "three-short", label: "3 zoner · 60 min", englishLabel: "3 zones · 60 min", zones: [1, 2, 3], validityMinutes: 60, cost: 30 },
        { id: "three-long", label: "3 zoner · 90 min", englishLabel: "3 zones · 90 min", zones: [1, 2, 3], validityMinutes: 90, cost: 38 },
        { id: "day", label: "Dagsbillet", englishLabel: "day ticket", zones: [1, 2, 3], validityMinutes: 1440, cost: 80 },
      ],
      solutionRoute: ["clinic", "museum", "school", "workshop"],
      solutionTicketId: "three-long",
    },
    {
      id: "kulturaften",
      engine: "route-planner",
      title: "Kulturaften med ændringer",
      englishTitle: "Culture night with changes",
      level: "B1",
      brief: "Fire arrangører ændrer planen på samme tid. Kombinér tidsmarkører, køretider og billetregler uden at købe mere end nødvendigt.",
      englishBrief: "Four organisers change the plan at once. Combine time markers, travel times, and ticket rules without buying more than necessary.",
      rewardKroner: 100,
      accent: "#39958f",
      glossary: [
        { danish: "udsat", english: "postponed", note: "Moved to a later time." },
        { danish: "senest", english: "no later than", note: "A hard deadline, including that time." },
        { danish: "foreløbig", english: "provisional", note: "Temporary and possibly changed later." },
      ],
      start: { id: "harbor", label: "Kulturhavnen", englishLabel: "culture harbour", zone: 1, time: 1005 },
      dispatch: [
        "Galleriet er rykket frem: aflever programmet 16.57–17.09.",
        "Teatret skal have masken efter galleriet, men senest 17.25. Arkivet åbner først 17.28.",
        "Radioen sender direkte fra 17.45 og skal have kortet mellem 17.38 og 17.50.",
        "En 90-minutters billet gælder fra første påstigning, ikke fra første aflevering.",
      ],
      englishDispatch: [
        "The gallery has been moved earlier: deliver the programme from 16:57–17:09.",
        "The theatre needs the mask after the gallery, but no later than 17:25. The archive does not open until 17:28.",
        "The radio broadcasts live from 17:45 and needs the map from 17:38–17:50.",
        "A 90-minute ticket is valid from first boarding, not from the first delivery.",
      ],
      stops: [
        { id: "gallery", label: "Galleriet", englishLabel: "gallery", zone: 1, windowStart: 1017, windowEnd: 1029, serviceMinutes: 4, task: "Aflever aftenprogrammet", englishTask: "Deliver the evening programme" },
        { id: "theatre", label: "Teatret", englishLabel: "theatre", zone: 2, windowStart: 1026, windowEnd: 1045, serviceMinutes: 6, task: "Aflever masken", englishTask: "Deliver the mask" },
        { id: "archive", label: "Arkivet", englishLabel: "archive", zone: 3, windowStart: 1048, windowEnd: 1060, serviceMinutes: 5, task: "Hent lydkassetten", englishTask: "Collect the audio cassette" },
        { id: "radio", label: "Radioen", englishLabel: "radio station", zone: 2, windowStart: 1058, windowEnd: 1070, serviceMinutes: 4, task: "Aflever kortet og kassetten", englishTask: "Deliver the map and cassette" },
      ],
      travelMinutes: {
        [routeKey("harbor", "gallery")]: 10, [routeKey("harbor", "theatre")]: 18, [routeKey("harbor", "archive")]: 27, [routeKey("harbor", "radio")]: 25,
        [routeKey("gallery", "theatre")]: 7, [routeKey("gallery", "archive")]: 17, [routeKey("gallery", "radio")]: 16,
        [routeKey("theatre", "gallery")]: 7, [routeKey("theatre", "archive")]: 10, [routeKey("theatre", "radio")]: 11,
        [routeKey("archive", "gallery")]: 17, [routeKey("archive", "theatre")]: 10, [routeKey("archive", "radio")]: 7,
        [routeKey("radio", "gallery")]: 16, [routeKey("radio", "theatre")]: 11, [routeKey("radio", "archive")]: 7,
      },
      tickets: [
        { id: "two-long", label: "2 zoner · 90 min", englishLabel: "2 zones · 90 min", zones: [1, 2], validityMinutes: 90, cost: 32 },
        { id: "three-hour", label: "3 zoner · 60 min", englishLabel: "3 zones · 60 min", zones: [1, 2, 3], validityMinutes: 60, cost: 30 },
        { id: "three-long", label: "3 zoner · 90 min", englishLabel: "3 zones · 90 min", zones: [1, 2, 3], validityMinutes: 90, cost: 38 },
        { id: "day", label: "Dagsbillet", englishLabel: "day ticket", zones: [1, 2, 3], validityMinutes: 1440, cost: 80 },
      ],
      solutionRoute: ["gallery", "theatre", "archive", "radio"],
      solutionTicketId: "three-hour",
    },
  ],
};

export const cityScenarios: CityScenario[] = [borgerpost, byruten];

export const cityScenarioRegistry = Object.fromEntries(
  cityScenarios.map((scenario) => [scenario.id, scenario]),
) as Record<CityScenarioId, CityScenario>;

export const cityScenarioCards: CityScenarioCard[] = cityScenarios.map((scenario) => ({
  id: scenario.id,
  kind: scenario.kind,
  title: scenario.title,
  englishTitle: scenario.englishTitle,
  eyebrow: scenario.eyebrow,
  description: scenario.description,
  englishDescription: scenario.englishDescription,
  location: scenario.location,
  accent: scenario.accent,
  levels: scenario.levels,
  caseCount: scenario.cases.length,
}));

export const cityScenarioIntegration = {
  id: "city-scenarios" as const,
  kind: "city" as const,
  title: "Byliv",
  englishTitle: "City life",
  cards: cityScenarioCards,
  registry: cityScenarioRegistry,
  component: "CityScenarioHub" as const,
};

export function getCityCase(scenarioId: CityScenarioId, caseId: CityCaseId) {
  return cityScenarioRegistry[scenarioId].cases.find((candidate) => candidate.id === caseId) ?? null;
}

function longestCorrectPrefix(actual: readonly string[], expected: readonly string[]) {
  let length = 0;
  while (length < actual.length && length < expected.length && actual[length] === expected[length]) length += 1;
  return length;
}

export function evaluateCivicForm(cityCase: CivicFormCase, attempt: FormAttempt): FormEvaluation {
  const correctFields = cityCase.fields.filter((field) => attempt.selections[field.id] === field.correctOptionId).length;
  const calculationCorrect = attempt.calculation !== null
    && Number.isFinite(attempt.calculation)
    && Math.abs(attempt.calculation - cityCase.calculation.expected) < 0.001;
  const workflowPrefix = longestCorrectPrefix(attempt.workflow, cityCase.workflowSolution);
  const workflowCorrect = workflowPrefix === cityCase.workflowSolution.length
    && attempt.workflow.length === cityCase.workflowSolution.length;
  const fieldPart = correctFields / cityCase.fields.length;
  const workflowPart = workflowPrefix / cityCase.workflowSolution.length;
  const score = fieldPart * 0.5 + (calculationCorrect ? 0.2 : 0) + workflowPart * 0.3;
  const feedback: string[] = [];
  if (correctFields < cityCase.fields.length) feedback.push("Læs forskellen mellem frist, reference og selve handlingen én gang til.");
  if (!calculationCorrect) feedback.push("Kontrollér hvilke beløb der gentages, og hvilke der kun betales én gang.");
  if (!workflowCorrect) feedback.push("Rækkefølgen bryder en betingelse i brevet. Find ord som før, efter og først.");
  if (feedback.length === 0) feedback.push("Blanketten kan sendes: oplysninger, beløb og rækkefølge passer sammen.");
  return {
    success: score >= 0.999,
    score,
    correctFields,
    fieldCount: cityCase.fields.length,
    calculationCorrect,
    workflowPrefix,
    workflowCorrect,
    feedback,
  };
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [Array.from(items)];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

export function simulateRoute(cityCase: RouteCase, route: readonly string[]) {
  const validStopIds = new Set(cityCase.stops.map((stop) => stop.id));
  const uniqueStops = new Set(route).size === route.length;
  if (route.length !== cityCase.stops.length || !uniqueStops || route.some((id) => !validStopIds.has(id))) {
    return { feasible: false, uniqueStops, timeline: [] as RouteTimelineEntry[], duration: 0 };
  }
  let currentStop = cityCase.start.id;
  let currentTime = cityCase.start.time;
  const timeline: RouteTimelineEntry[] = [];
  for (const stopId of route) {
    const stop = cityCase.stops.find((candidate) => candidate.id === stopId);
    const travel = cityCase.travelMinutes[routeKey(currentStop, stopId)];
    if (!stop || travel === undefined) return { feasible: false, uniqueStops, timeline, duration: currentTime - cityCase.start.time };
    const arrival = currentTime + travel;
    const serviceStart = Math.max(arrival, stop.windowStart);
    const withinWindow = serviceStart <= stop.windowEnd;
    const departure = serviceStart + stop.serviceMinutes;
    timeline.push({ stopId, arrival, serviceStart, departure, withinWindow });
    currentTime = departure;
    currentStop = stopId;
  }
  return {
    feasible: timeline.every((entry) => entry.withinWindow),
    uniqueStops,
    timeline,
    duration: currentTime - cityCase.start.time,
  };
}

export function findFeasibleRoutes(cityCase: RouteCase) {
  return permutations(cityCase.stops.map((stop) => stop.id))
    .filter((route) => simulateRoute(cityCase, route).feasible);
}

export function findCheapestValidTicket(cityCase: RouteCase, route: readonly string[]) {
  const simulation = simulateRoute(cityCase, route);
  if (!simulation.feasible) return null;
  const requiredZones = new Set([cityCase.start.zone, ...cityCase.stops.map((stop) => stop.zone)]);
  return [...cityCase.tickets]
    .filter((ticket) => simulation.duration <= ticket.validityMinutes && [...requiredZones].every((zone) => ticket.zones.includes(zone)))
    .sort((left, right) => left.cost - right.cost)[0] ?? null;
}

export function evaluateRoute(cityCase: RouteCase, route: readonly string[], ticketId: string): RouteEvaluation {
  const simulation = simulateRoute(cityCase, route);
  const ticket = findCheapestValidTicket(cityCase, route);
  const ticketCorrect = ticket?.id === ticketId;
  const correctPositions = cityCase.solutionRoute.filter((id, index) => route[index] === id).length;
  const routePart = simulation.feasible ? 0.72 : (correctPositions / cityCase.solutionRoute.length) * 0.5;
  const score = routePart + (ticketCorrect ? 0.28 : 0);
  const feedback: string[] = [];
  const lateStops = simulation.timeline.filter((entry) => !entry.withinWindow);
  if (!simulation.uniqueStops) feedback.push("Hvert stop må kun bruges én gang.");
  if (!simulation.feasible) feedback.push(lateStops.length > 0 ? "Mindst én aflevering kommer efter sit tidsvindue." : "Ruten mangler et stop eller en gyldig forbindelse.");
  if (!ticketCorrect) feedback.push("Billetten skal være den billigste, der dækker alle zoner og hele turens varighed.");
  if (feedback.length === 0) feedback.push("Ruten holder alle tidsvinduer, og billetten er den billigste gyldige løsning.");
  return {
    success: simulation.feasible && ticketCorrect,
    score,
    routeFeasible: simulation.feasible,
    ticketCorrect,
    uniqueStops: simulation.uniqueStops,
    timeline: simulation.timeline,
    feedback,
  };
}

export function createCityAttemptMetadata(
  scenarioId: CityScenarioId,
  cityCase: CityCase,
  result: FormEvaluation | RouteEvaluation,
  attemptNumber: number,
  firstAttemptEligibleOverride?: boolean,
): CityAttemptMetadata {
  const firstAttemptEligible = firstAttemptEligibleOverride ?? attemptNumber === 1;
  const firstAttemptSuccess = firstAttemptEligible && result.success;
  return {
    scenarioId,
    caseId: cityCase.id,
    attemptNumber,
    firstAttemptEligible,
    firstAttemptSuccess,
    score: result.score,
    kronerEarned: Math.round(cityCase.rewardKroner * result.score),
    ravEarned: firstAttemptSuccess ? 1 : 0,
  };
}

export function formatCityTime(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}.${String(rest).padStart(2, "0")}`;
}
