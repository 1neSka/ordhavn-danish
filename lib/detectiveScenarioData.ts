export type DetectiveCaseId =
  | "sluice-cargo-theft"
  | "silent-account"
  | "double-ledger"
  | "shipyard-fire"
  | "missing-insulin"
  | "reading-room-murder";

export type DetectiveLevel = "A2+" | "B1" | "B1+" | "B2";
export type DetectiveCrime = "theft" | "cyberabuse" | "fraud" | "arson" | "medical-diversion" | "murder";
export type ArchiveEntryKind = "person" | "timeline" | "document" | "datum" | "evidence";

export interface ArchivePerson {
  id: string;
  name: string;
  role: string;
  relation: string;
  statement: string;
  claimedTimeline: string[];
  access: string[];
}

export interface ArchiveTimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  sourceIds: string[];
  personIds: string[];
}

export interface ArchiveDocument {
  id: string;
  title: string;
  kind: "report" | "message" | "invoice" | "log" | "contract" | "photo" | "record";
  source: string;
  summary: string;
  excerpt: string;
  personIds: string[];
  evidenceIds: string[];
}

export interface ArchiveDatum {
  id: string;
  label: string;
  value: string;
  interpretation: string;
  sourceIds: string[];
  personIds: string[];
  evidenceIds: string[];
}

export interface ArchiveEvidence {
  id: string;
  title: string;
  description: string;
  strength: 1 | 2 | 3;
  sourceIds: string[];
  implicates: string[];
  exonerates: string[];
}

export interface ArchiveContradiction {
  id: string;
  title: string;
  explanation: string;
  leftEvidenceId: string;
  rightEvidenceId: string;
  personIds: string[];
}

export interface DetectiveCase {
  id: DetectiveCaseId;
  pathLevel: 15 | 16 | 17 | 18 | 19 | 20;
  level: DetectiveLevel;
  crime: DetectiveCrime;
  title: string;
  englishTitle: string;
  eyebrow: string;
  brief: string;
  objective: string;
  victimCare: string;
  estimatedMinutes: number;
  people: ArchivePerson[];
  timeline: ArchiveTimelineEvent[];
  documents: ArchiveDocument[];
  data: ArchiveDatum[];
  evidence: ArchiveEvidence[];
  contradictions: ArchiveContradiction[];
  culpritId: string;
  requiredEvidenceIds: string[];
  minimumEvidence: number;
  solutionReasoning: string;
}

const cases: DetectiveCase[] = [
  {
    id: "sluice-cargo-theft",
    pathLevel: 15,
    level: "A2+",
    crime: "theft",
    title: "Ladcyklen ved slusen",
    englishTitle: "The cargo bike by the lock",
    eyebrow: "ARKIV 15 · TYVERI",
    brief: "En kommunal ladcykel med medicinsk udstyr forsvandt fra slusen mellem klokken 16.10 og 16.40. Ingen blev såret, men hjemmeplejens besøg måtte aflyses.",
    objective: "Læs personerne, tidslinjen og sporene i valgfri rækkefølge. Vælg den mest mistænkelige person, og forbind mindst tre relevante beviser med din konklusion.",
    victimCare: "Udstyret tilhører hjemmeplejen. Sagen handler derfor både om tyveri og om mennesker, der ikke fik deres planlagte hjælp.",
    estimatedMinutes: 11,
    people: [
      { id: "kasper", name: "Kasper Lund", role: "cykelmekaniker", relation: "reparerede cyklen dagen før", statement: "Jeg lukkede værkstedet klokken fire og kørte direkte hjem.", claimedTimeline: ["16.00: lukker værkstedet", "16.20: hjemme"], access: ["servicenøgle", "kendskab til GPS-boksen"] },
      { id: "amina", name: "Amina Noor", role: "hjemmehjælper", relation: "brugte cyklen sidst", statement: "Jeg låste cyklen og afleverede nøglen i boksen.", claimedTimeline: ["16.08: parkerer", "16.12: går mod busstoppestedet"], access: ["daglig nøgle", "udstyrsliste"] },
      { id: "bo", name: "Bo Thygesen", role: "slusevagt", relation: "havde udsyn til gården", statement: "Porten var lukket hele eftermiddagen. Jeg så ingen cykel køre ud.", claimedTimeline: ["16.00–17.00: i vagtrummet"], access: ["portkontakt", "kameraoversigt"] },
      { id: "lea", name: "Lea Madsen", role: "budchauffør", relation: "leverede pakker ved slusen", statement: "Jeg så en mørk varevogn, men jeg kunne ikke se føreren.", claimedTimeline: ["16.24: levering", "16.31: afgang"], access: ["adgang til gården under levering"] },
    ],
    timeline: [
      { id: "t-park", time: "16.08", title: "Cyklen parkeres", description: "Aminas app afslutter ruten ved slusen.", sourceIds: ["doc-route"], personIds: ["amina"] },
      { id: "t-box", time: "16.14", title: "GPS-boksen åbnes", description: "Sensoren registrerer, at dækslet bliver fjernet.", sourceIds: ["data-gps"], personIds: ["kasper"] },
      { id: "t-van", time: "16.23", title: "Varevogn ved sideporten", description: "Et foto viser en varevogn med delvist synlig nummerplade.", sourceIds: ["doc-photo"], personIds: ["lea", "kasper"] },
      { id: "t-gate", time: "16.27", title: "Sideporten åbnes", description: "Portloggen viser manuel åbning i 54 sekunder.", sourceIds: ["doc-gate"], personIds: ["bo"] },
      { id: "t-listing", time: "17.02", title: "Salgsannonce gemmes", description: "En annonce med samme batteriserienummer oprettes.", sourceIds: ["doc-listing"], personIds: ["kasper"] },
    ],
    documents: [
      { id: "doc-route", title: "Hjemmeplejens rutelog", kind: "log", source: "Kommuneappen", summary: "Ruten slutter ved slusen klokken 16.08.", excerpt: "Cykel låst. Nøgle afleveret i boks 3.", personIds: ["amina"], evidenceIds: ["ev-locked"] },
      { id: "doc-photo", title: "Budbilens dashcam", kind: "photo", source: "Leas firmabil", summary: "En mørk varevogn holder ved sideporten.", excerpt: "Nummerpladen ender på 47; venstre baglygte har hvid tape.", personIds: ["lea", "kasper"], evidenceIds: ["ev-van"] },
      { id: "doc-gate", title: "Portlog", kind: "log", source: "Slusens adgangssystem", summary: "Sideporten åbnes manuelt.", excerpt: "16.27–16.28: servicekontakt, ingen medarbejderbrik.", personIds: ["bo"], evidenceIds: ["ev-gate"] },
      { id: "doc-listing", title: "Slettet salgsannonce", kind: "message", source: "Markedspladsens cache", summary: "Batteriet fra cyklen sættes til salg.", excerpt: "Næsten nyt 625 Wh-batteri. Afhentning ved Lund Cykler.", personIds: ["kasper"], evidenceIds: ["ev-listing"] },
    ],
    data: [
      { id: "data-gps", label: "GPS-dæksel", value: "åbnet 16.14 med serviceværktøj", interpretation: "En person kendte den skjulte sikring.", sourceIds: ["t-box"], personIds: ["kasper"], evidenceIds: ["ev-service"] },
      { id: "data-plate", label: "Nummerplade", value: "• • 47", interpretation: "Kaspers varevogn ender på 47 og har tape på lygten.", sourceIds: ["doc-photo"], personIds: ["kasper"], evidenceIds: ["ev-van"] },
      { id: "data-phone", label: "Telefonmast", value: "Kaspers telefon ved slusen 16.19–16.33", interpretation: "Det passer ikke med hans påstand om at være hjemme.", sourceIds: ["doc-listing"], personIds: ["kasper"], evidenceIds: ["ev-location"] },
    ],
    evidence: [
      { id: "ev-locked", title: "Cyklen var låst", description: "Ruteloggen støtter Aminas forklaring.", strength: 2, sourceIds: ["doc-route"], implicates: [], exonerates: ["amina"] },
      { id: "ev-service", title: "GPS slået fra fagligt", description: "Dækslet blev åbnet med et værktøj, Kasper bruger på værkstedet.", strength: 2, sourceIds: ["data-gps"], implicates: ["kasper"], exonerates: [] },
      { id: "ev-van", title: "Varevognen matcher", description: "Pladecifre og tapet baglygte matcher Kaspers varevogn.", strength: 3, sourceIds: ["doc-photo", "data-plate"], implicates: ["kasper"], exonerates: ["lea"] },
      { id: "ev-gate", title: "Porten blev åbnet", description: "Bo tog fejl om den lukkede port, men loggen knytter ikke åbningen til ham.", strength: 1, sourceIds: ["doc-gate"], implicates: ["bo"], exonerates: [] },
      { id: "ev-listing", title: "Batteriet til salg", description: "Annoncen peger på Kaspers forretning og det stjålne serienummer.", strength: 3, sourceIds: ["doc-listing"], implicates: ["kasper"], exonerates: [] },
      { id: "ev-location", title: "Telefonen var ved slusen", description: "Mastedata modsiger Kaspers hjemtur.", strength: 3, sourceIds: ["data-phone"], implicates: ["kasper"], exonerates: [] },
    ],
    contradictions: [
      { id: "con-home", title: "Hjemme eller ved slusen", explanation: "Kasper siger, at han var hjemme, mens mastedata placerer hans telefon ved slusen.", leftEvidenceId: "ev-location", rightEvidenceId: "ev-service", personIds: ["kasper"] },
      { id: "con-port", title: "En lukket port, der åbnede", explanation: "Bos udsagn passer ikke med portloggen; det er mistænkeligt, men ikke i sig selv bevis for tyveriet.", leftEvidenceId: "ev-gate", rightEvidenceId: "ev-van", personIds: ["bo"] },
    ],
    culpritId: "kasper",
    requiredEvidenceIds: ["ev-service", "ev-van", "ev-listing", "ev-location"],
    minimumEvidence: 3,
    solutionReasoning: "Kasper havde faglig adgang til GPS-boksen, hans varevogn og telefon var ved slusen, og det stjålne batteri blev udbudt ved hans værksted. Bos forkerte hukommelse er et sidespor.",
  },
  {
    id: "silent-account",
    pathLevel: 16,
    level: "B1",
    crime: "cyberabuse",
    title: "Den tavse konto",
    englishTitle: "The silent account",
    eyebrow: "ARKIV 16 · DIGITAL CHIKANE",
    brief: "Journalisten Nanna modtog trusler og fik sin private adresse offentliggjort fra en anonym konto. Arkivet samler adgangslogge, arbejdsrelationer og tidsstempler.",
    objective: "Undersøg hvem der både havde motiv, adgang til adressen og kontrol over kontoen. Vælg en person og mindst tre beviser; et vredt udsagn er ikke nok.",
    victimCare: "Nanna er ikke en brik i en gåde. Delingen af hendes adresse skabte en konkret sikkerhedsrisiko, og hendes egne grænser skal respekteres.",
    estimatedMinutes: 14,
    people: [
      { id: "emil", name: "Emil Krag", role: "tidligere redaktør", relation: "blev kritiseret i Nannas artikel", statement: "Jeg har aldrig set hendes adresse og var til debatmøde hele aftenen.", claimedTimeline: ["19.00–21.30: debatmøde"], access: ["gammel redaktionskonto", "medlemsregister"] },
      { id: "sara", name: "Sara Bloch", role: "fotograf", relation: "arbejder tæt med Nanna", statement: "Jeg hjalp med at gemme beskederne og blokerede kontoen.", claimedTimeline: ["20.05: videosamtale med Nanna"], access: ["redaktionens billedarkiv"] },
      { id: "morten", name: "Morten Ahl", role: "debattør", relation: "skændtes offentligt med Nanna", statement: "Jeg skrev hårdt, men jeg offentliggjorde ingen adresse.", claimedTimeline: ["19.40: opslag fra toget", "20.20: hjemme"], access: ["offentlige profiler"] },
      { id: "ida", name: "Ida Vester", role: "systemadministrator", relation: "administrerer redaktionen", statement: "Den gamle konto burde have været lukket. Det var mit ansvar at opdage fejlen.", claimedTimeline: ["18.00–22.00: vagt fra hjemmet"], access: ["serverlog", "kontolukning"] },
    ],
    timeline: [
      { id: "t-login", time: "19.18", title: "Gammel konto logger ind", description: "En deaktiveret redaktørkonto bliver genåbnet med korrekt sikkerhedssvar.", sourceIds: ["doc-auth"], personIds: ["emil", "ida"] },
      { id: "t-search", time: "19.24", title: "Adresse søges frem", description: "Medlemsregistret åbnes fra samme session.", sourceIds: ["doc-audit"], personIds: ["emil"] },
      { id: "t-post", time: "19.31", title: "Adressen offentliggøres", description: "Den anonyme konto lægger adressen ud.", sourceIds: ["doc-post"], personIds: ["emil"] },
      { id: "t-video", time: "20.05", title: "Nanna ringer til Sara", description: "Opkaldet varer 26 minutter.", sourceIds: ["data-call"], personIds: ["sara"] },
      { id: "t-delete", time: "21.12", title: "Kladder slettes", description: "Enheden bag kontoen sletter tre kladder efter debatmødet.", sourceIds: ["data-device"], personIds: ["emil"] },
    ],
    documents: [
      { id: "doc-auth", title: "Godkendelseslog", kind: "log", source: "Redaktionens identitetssystem", summary: "Emils gamle konto blev brugt.", excerpt: "Bruger EK-17; sikkerhedssvar godkendt; ingen nulstilling.", personIds: ["emil", "ida"], evidenceIds: ["ev-old-account"] },
      { id: "doc-audit", title: "Registerrevision", kind: "log", source: "Medlemsregistret", summary: "Nannas beskyttede adresse blev åbnet én gang.", excerpt: "Session EK-17 viste adressefeltet kl. 19.24.", personIds: ["emil"], evidenceIds: ["ev-address-access"] },
      { id: "doc-post", title: "Arkiveret opslag", kind: "message", source: "Platformens misbrugsteam", summary: "Opslaget genbruger en særpræget stavefejl.", excerpt: "Hun fortjæner at blive konfronteret på sin addresse.", personIds: ["emil", "morten"], evidenceIds: ["ev-language"] },
      { id: "doc-meeting", title: "Debatmødets program", kind: "record", source: "Kulturhuset", summary: "Emil talte først klokken 20.42.", excerpt: "Deltagerkort registreret 20.31; panelstart 20.42.", personIds: ["emil", "morten"], evidenceIds: ["ev-alibi"] },
    ],
    data: [
      { id: "data-device", label: "Enhedsnøgle", value: "7F:A1:EK", interpretation: "Samme browsernøgle findes på Emils afleverede laptop.", sourceIds: ["doc-auth", "t-delete"], personIds: ["emil"], evidenceIds: ["ev-device"] },
      { id: "data-call", label: "Videosamtale", value: "20.05–20.31", interpretation: "Sara var synlig i opkaldet, efter opslaget blev sendt.", sourceIds: ["t-video"], personIds: ["sara"], evidenceIds: ["ev-sara-call"] },
      { id: "data-style", label: "Staveprofil", value: "addresse: 11 tidligere forekomster", interpretation: "Fejlen forekommer i Emils interne beskeder, ikke i Mortens opslag.", sourceIds: ["doc-post"], personIds: ["emil", "morten"], evidenceIds: ["ev-language"] },
    ],
    evidence: [
      { id: "ev-old-account", title: "Emils konto blev brugt", description: "Login krævede et sikkerhedssvar, men en administrator kunne også have genåbnet kontoen.", strength: 2, sourceIds: ["doc-auth"], implicates: ["emil", "ida"], exonerates: [] },
      { id: "ev-address-access", title: "Adressen blev hentet", description: "Samme session åbnede Nannas beskyttede adresse.", strength: 3, sourceIds: ["doc-audit"], implicates: ["emil"], exonerates: ["morten"] },
      { id: "ev-language", title: "Særpræget stavefejl", description: "Addresse med dobbelt d matcher Emils beskeder.", strength: 2, sourceIds: ["doc-post", "data-style"], implicates: ["emil"], exonerates: ["morten"] },
      { id: "ev-alibi", title: "Debatmødet begyndte senere", description: "Emil var ikke registreret i huset, da opslaget blev sendt.", strength: 3, sourceIds: ["doc-meeting"], implicates: ["emil"], exonerates: [] },
      { id: "ev-device", title: "Browsernøglen matcher", description: "Kontosessionen matcher Emils laptop.", strength: 3, sourceIds: ["data-device"], implicates: ["emil"], exonerates: ["ida"] },
      { id: "ev-sara-call", title: "Saras opkald", description: "Opkaldet støtter Saras forklaring, men begyndte efter offentliggørelsen.", strength: 1, sourceIds: ["data-call"], implicates: [], exonerates: ["sara"] },
    ],
    contradictions: [
      { id: "con-meeting", title: "Et alibi før ankomsten", explanation: "Emil siger, at han var til mødet hele aftenen, men adgangskortet blev først brugt en time efter opslaget.", leftEvidenceId: "ev-alibi", rightEvidenceId: "ev-device", personIds: ["emil"] },
      { id: "con-admin", title: "Adgang er ikke handling", explanation: "Ida kunne genåbne kontoen, men browsernøglen knytter den faktiske session til Emils laptop.", leftEvidenceId: "ev-old-account", rightEvidenceId: "ev-device", personIds: ["ida", "emil"] },
    ],
    culpritId: "emil",
    requiredEvidenceIds: ["ev-address-access", "ev-alibi", "ev-device", "ev-language"],
    minimumEvidence: 3,
    solutionReasoning: "Emils konto hentede adressen, hans enhed oprettede opslaget, og hans påståede alibi begyndte først senere. Sprogsporet støtter forbindelsen, mens Idas administrative adgang alene ikke beviser handlingen.",
  },
  {
    id: "double-ledger",
    pathLevel: 17,
    level: "B2",
    crime: "fraud",
    title: "Fondens dobbeltbog",
    englishTitle: "The foundation's double ledger",
    eyebrow: "ARKIV 17 · BEDRAGERI",
    brief: "En fond for unge søfolk mangler 1,8 millioner kroner. Pengene er betalt til konsulentfirmaer, som tilsyneladende leverede den samme analyse flere gange.",
    objective: "Skeln mellem dårlig kontrol og bevidst bedrageri. Find den person, der kontrollerede både godkendelsen og den skjulte modtager, og dokumentér kæden med mindst fire spor.",
    victimCare: "De manglende midler var afsat til uddannelse. Analysen må ikke gøre tabet abstrakt eller mistænkeliggøre medarbejdere alene på grund af deres rolle.",
    estimatedMinutes: 17,
    people: [
      { id: "rasmus", name: "Rasmus Feld", role: "økonomichef", relation: "godkendte alle større betalinger", statement: "Leverandørerne blev valgt af projektlederne; jeg kontrollerede kun beløbene.", claimedTimeline: ["januar–juni: månedlig økonomikontrol"], access: ["betalingsgodkendelse", "leverandørregister"] },
      { id: "helene", name: "Helene Birk", role: "projektleder", relation: "bestilte den første analyse", statement: "Jeg bestilte én analyse hos Nordkonsult. De andre navne kender jeg ikke.", claimedTimeline: ["12. januar: bestilling", "4. marts: modtagelse"], access: ["projektbudget"] },
      { id: "yusuf", name: "Yusuf Kaya", role: "revisorassistent", relation: "opdagede dubletterne", statement: "PDF-filerne var ens, men fakturanumrene forskellige.", claimedTimeline: ["18. juni: stikprøve", "19. juni: intern alarm"], access: ["regnskabseksport"] },
      { id: "lone", name: "Lone Feld", role: "selskabsadministrator", relation: "driver et registreringskontor", statement: "Jeg registrerede selskabet for en kunde og kendte ikke fondens betalinger.", claimedTimeline: ["2. december: selskab oprettet"], access: ["selskabsdokumenter"] },
    ],
    timeline: [
      { id: "t-company", time: "02.12", title: "Havblik Analyse stiftes", description: "Selskabet registreres tre uger før udbuddet.", sourceIds: ["doc-company"], personIds: ["lone", "rasmus"] },
      { id: "t-tender", time: "22.12", title: "Leverandørlisten ændres", description: "Havblik tilføjes manuelt af økonomichefens konto.", sourceIds: ["doc-vendor-log"], personIds: ["rasmus"] },
      { id: "t-first", time: "12.01", title: "Nordkonsult bestilles", description: "Helene godkender fondens eneste dokumenterede bestilling.", sourceIds: ["doc-order"], personIds: ["helene"] },
      { id: "t-pay", time: "04.03", title: "Tre fakturaer betales", description: "Nordkonsult, Havblik og Fjorddata får betaling for samme analyse.", sourceIds: ["doc-invoices"], personIds: ["rasmus"] },
      { id: "t-alert", time: "19.06", title: "Dubletter anmeldes internt", description: "Yusuf sender sin sammenligning til bestyrelsen.", sourceIds: ["data-hash"], personIds: ["yusuf"] },
    ],
    documents: [
      { id: "doc-company", title: "Ejerbog for Havblik Analyse", kind: "contract", source: "Virksomhedsregistret", summary: "Den reelle ejer skjules bag en fuldmagt.", excerpt: "Stemmeret udøves af RF Invest, postboks 118.", personIds: ["lone", "rasmus"], evidenceIds: ["ev-owner"] },
      { id: "doc-vendor-log", title: "Leverandørlog", kind: "log", source: "Fondens økonomisystem", summary: "Rasmus tilføjede Havblik uden kontrolnummer.", excerpt: "Bruger RF-02 tilsidesatte fireøjegodkendelse.", personIds: ["rasmus"], evidenceIds: ["ev-override"] },
      { id: "doc-order", title: "Projektbestilling", kind: "contract", source: "Projektarkivet", summary: "Kun Nordkonsult blev bestilt af projektet.", excerpt: "Én analyse, fast pris 620.000 kr.", personIds: ["helene"], evidenceIds: ["ev-single-order"] },
      { id: "doc-invoices", title: "Tre fakturaer", kind: "invoice", source: "Kreditorarkivet", summary: "Tre selskaber fakturerer næsten identisk arbejde.", excerpt: "Tekst, sideantal og stavefejl er ens.", personIds: ["rasmus", "helene"], evidenceIds: ["ev-duplicate"] },
      { id: "doc-transfer", title: "Efterfølgende overførsel", kind: "record", source: "Bankens hvidvaskkontrol", summary: "Havblik sender 83 procent videre til RF Invest.", excerpt: "Modtagerkontoens ejer: Rasmus Feld.", personIds: ["rasmus"], evidenceIds: ["ev-transfer"] },
    ],
    data: [
      { id: "data-hash", label: "Dokumenthash", value: "3 identiske filer", interpretation: "Leverancerne er kopier, ikke tre selvstændige analyser.", sourceIds: ["doc-invoices"], personIds: ["yusuf"], evidenceIds: ["ev-duplicate"] },
      { id: "data-amount", label: "Samlet udbetaling", value: "1.860.000 kr.", interpretation: "Beløbet svarer præcis til tre gange den eneste bestilling.", sourceIds: ["doc-order", "doc-invoices"], personIds: ["rasmus", "helene"], evidenceIds: ["ev-single-order"] },
      { id: "data-mailbox", label: "Postboks 118", value: "deles af Havblik og RF Invest", interpretation: "Selskaberne er ikke uafhængige.", sourceIds: ["doc-company"], personIds: ["rasmus", "lone"], evidenceIds: ["ev-owner"] },
    ],
    evidence: [
      { id: "ev-owner", title: "Skjult fælles ejer", description: "Havblik og RF Invest forbindes med Rasmus gennem ejerbog og postboks.", strength: 3, sourceIds: ["doc-company", "data-mailbox"], implicates: ["rasmus", "lone"], exonerates: [] },
      { id: "ev-override", title: "Kontrollen blev tilsidesat", description: "Rasmus brugte sin konto til at omgå fireøjeprincippet.", strength: 3, sourceIds: ["doc-vendor-log"], implicates: ["rasmus"], exonerates: ["yusuf"] },
      { id: "ev-single-order", title: "Kun én gyldig bestilling", description: "Projektarkivet støtter Helenes forklaring.", strength: 2, sourceIds: ["doc-order", "data-amount"], implicates: ["rasmus"], exonerates: ["helene"] },
      { id: "ev-duplicate", title: "Leverancerne er identiske", description: "Tre betalinger dækker den samme fil.", strength: 3, sourceIds: ["doc-invoices", "data-hash"], implicates: ["rasmus"], exonerates: [] },
      { id: "ev-transfer", title: "Pengene ender hos Rasmus", description: "Havblik overfører hovedparten til hans eget selskab.", strength: 3, sourceIds: ["doc-transfer"], implicates: ["rasmus"], exonerates: ["lone"] },
    ],
    contradictions: [
      { id: "con-control", title: "Kun beløb eller også leverandør", explanation: "Rasmus siger, at han kun kontrollerede beløb, men loggen viser, at han selv oprettede leverandøren og fjernede kontrollen.", leftEvidenceId: "ev-override", rightEvidenceId: "ev-owner", personIds: ["rasmus"] },
      { id: "con-project", title: "Tre leverancer, én bestilling", explanation: "Fakturaerne hævder tre opgaver, mens projektarkivet og filhash viser én.", leftEvidenceId: "ev-single-order", rightEvidenceId: "ev-duplicate", personIds: ["helene", "rasmus"] },
    ],
    culpritId: "rasmus",
    requiredEvidenceIds: ["ev-owner", "ev-override", "ev-duplicate", "ev-transfer"],
    minimumEvidence: 4,
    solutionReasoning: "Rasmus oprettede den skjulte leverandør, tilsidesatte kontrollen, godkendte dubletfakturaerne og modtog pengene gennem RF Invest. Lone udførte registreringsarbejde, men banksporet exonererer hende som modtager.",
  },
  {
    id: "shipyard-fire",
    pathLevel: 18,
    level: "A2+",
    crime: "arson",
    title: "Brandnatten på værftet",
    englishTitle: "The shipyard fire",
    eyebrow: "ARKIV 18 · PÅSAT BRAND",
    brief: "En natlig brand ødelagde værftets lærlingeværksted. Alle kom ud i tide, men bygningen og elevernes værktøj gik tabt.",
    objective: "Find ud af hvem der var på området, hvem der kunne åbne hallen, og hvilket spor der viser en bevidst antændelse. Vælg mindst tre beviser.",
    victimCare: "Ingen døde, men lærlinge mistede et trygt arbejdssted. Undersøgelsen skal ikke behandle branden som en vittighed eller antage skyld ud fra temperament.",
    estimatedMinutes: 12,
    people: [
      { id: "helle", name: "Helle Brandt", role: "underleverandør", relation: "mistede en kontrakt samme dag", statement: "Jeg afleverede mit adgangskort klokken 17 og kom ikke tilbage.", claimedTimeline: ["17.02: kort afleveret", "18.00: hjemme"], access: ["tidligere adgangskort", "opløsningsmidler"] },
      { id: "jonas", name: "Jonas Møller", role: "lærling", relation: "var den sidste elev i hallen", statement: "Jeg slukkede maskinerne og gik klokken halv syv.", claimedTimeline: ["18.28: forlader hallen"], access: ["elevnøgle", "værktøjsskab"] },
      { id: "poul", name: "Poul Eriksen", role: "nattevagt", relation: "opdagede røgen", statement: "Alarmen lød før jeg så nogen ved porten.", claimedTimeline: ["22.00: runde", "22.14: alarm"] , access: ["hovednøgle", "kamerarum"] },
      { id: "runa", name: "Runa Dahl", role: "værkfører", relation: "afsluttede kontrakten med Helle", statement: "Hallen var ryddet. Der stod ingen brandfarlige dunke fremme.", claimedTimeline: ["17.30: sikkerhedstjek"], access: ["hovednøgle", "kemikalieskab"] },
    ],
    timeline: [
      { id: "t-return", time: "21.46", title: "Gæstekort bruges", description: "Et midlertidigt kort åbner sideporten.", sourceIds: ["doc-access"], personIds: ["helle"] },
      { id: "t-camera", time: "21.51", title: "Kamera mister signal", description: "Stikket trækkes ud i kameraskabet.", sourceIds: ["doc-camera"], personIds: ["poul", "helle"] },
      { id: "t-solvent", time: "22.03", title: "Damp registreres", description: "Sensoren måler opløsningsmiddel ved trappen.", sourceIds: ["data-sensor"], personIds: ["helle"] },
      { id: "t-fire", time: "22.11", title: "Branden starter", description: "To adskilte punkter antændes næsten samtidig.", sourceIds: ["doc-fire"], personIds: [] },
      { id: "t-alarm", time: "22.14", title: "Poul slår alarm", description: "Nattevagten ringer og åbner flugtporten.", sourceIds: ["doc-call"], personIds: ["poul"] },
    ],
    documents: [
      { id: "doc-access", title: "Adgangslog", kind: "log", source: "Værftets port", summary: "Et gæstekort udstedt til Helle bruges klokken 21.46.", excerpt: "Kort G-44 var markeret afleveret, men ikke slettet.", personIds: ["helle", "runa"], evidenceIds: ["ev-card"] },
      { id: "doc-camera", title: "Kamerafejl", kind: "report", source: "Sikkerhedssystemet", summary: "Kameraet blev fysisk frakoblet.", excerpt: "Ingen teknisk fejl; netstikket fjernet 21.51.", personIds: ["poul", "helle"], evidenceIds: ["ev-camera"] },
      { id: "doc-fire", title: "Brandrapport", kind: "report", source: "Beredskabet", summary: "To arnesteder og opløsningsmiddel viser påsat brand.", excerpt: "Naturlig eller elektrisk årsag vurderes usandsynlig.", personIds: [], evidenceIds: ["ev-accelerant"] },
      { id: "doc-call", title: "Alarmopkald", kind: "record", source: "Alarmcentralen", summary: "Poul anmeldte branden tre minutter efter antændelsen.", excerpt: "Jeg kan se røg fra elevhallen; alle rum bliver kontrolleret.", personIds: ["poul"], evidenceIds: ["ev-response"] },
    ],
    data: [
      { id: "data-sensor", label: "Luftsensor", value: "ethylacetat kl. 22.03", interpretation: "Stoffet fandtes i Helles arbejdsdunke, ikke i lærlingenes skab.", sourceIds: ["doc-fire"], personIds: ["helle"], evidenceIds: ["ev-accelerant"] },
      { id: "data-card", label: "Kortets serienummer", value: "G-44", interpretation: "Helles kvittering siger G-43; hun afleverede det forkerte kort.", sourceIds: ["doc-access"], personIds: ["helle"], evidenceIds: ["ev-card"] },
      { id: "data-tire", label: "Dækspor", value: "smal varevogn, ny højre bagdæk", interpretation: "Mønstret matcher Helles servicebil.", sourceIds: ["t-return"], personIds: ["helle"], evidenceIds: ["ev-tire"] },
    ],
    evidence: [
      { id: "ev-card", title: "Det aktive gæstekort", description: "Helle beholdt G-44 og afleverede et andet kort.", strength: 3, sourceIds: ["doc-access", "data-card"], implicates: ["helle"], exonerates: ["jonas"] },
      { id: "ev-camera", title: "Kameraet blev frakoblet", description: "Fysisk frakobling viser planlægning, men flere kendte skabet.", strength: 2, sourceIds: ["doc-camera"], implicates: ["helle", "poul"] , exonerates: [] },
      { id: "ev-accelerant", title: "Helles opløsningsmiddel", description: "Brandstedet indeholder samme særlige opløsningsmiddel som hendes dunke.", strength: 3, sourceIds: ["doc-fire", "data-sensor"], implicates: ["helle"], exonerates: ["runa"] },
      { id: "ev-response", title: "Hurtig evakuering", description: "Pouls opkald og flugtlog støtter hans forklaring.", strength: 2, sourceIds: ["doc-call"], implicates: [], exonerates: ["poul"] },
      { id: "ev-tire", title: "Servicebilens dækspor", description: "Sporet ved sideporten matcher Helles varevogn.", strength: 2, sourceIds: ["data-tire"], implicates: ["helle"], exonerates: [] },
    ],
    contradictions: [
      { id: "con-card", title: "Afleveret, men brugt", explanation: "Helle siger, at kortet var afleveret, mens serienumrene viser, at hun beholdt det aktive kort.", leftEvidenceId: "ev-card", rightEvidenceId: "ev-tire", personIds: ["helle"] },
      { id: "con-guard", title: "Adgang uden skyld", explanation: "Poul kendte kameraskabet, men hans dokumenterede reaktion og fravær af brandstofspor taler imod ham.", leftEvidenceId: "ev-camera", rightEvidenceId: "ev-response", personIds: ["poul"] },
    ],
    culpritId: "helle",
    requiredEvidenceIds: ["ev-card", "ev-accelerant", "ev-tire"],
    minimumEvidence: 3,
    solutionReasoning: "Helle beholdt et aktivt kort, hendes bil kom tilbage, og hendes særlige opløsningsmiddel blev brugt ved de to arnesteder. Poul havde adgang til kameraet, men hans handlinger og logge understøtter en redningsindsats.",
  },
  {
    id: "missing-insulin",
    pathLevel: 19,
    level: "B1+",
    crime: "medical-diversion",
    title: "Det tomme køleskab",
    englishTitle: "The empty refrigerator",
    eyebrow: "ARKIV 19 · MEDICINTYVERI",
    brief: "Tre kasser insulin forsvandt fra en klinik. Temperaturdata blev manipuleret, så lageret så kasseret ud, og patienter måtte flyttes til andre klinikker.",
    objective: "Rekonstruér forskellen mellem det registrerede spild og de fysiske leverancer. Vælg den person, der kunne ændre både køledata og afhentningen, med mindst fire beviser.",
    victimCare: "Mangel på insulin kan være livstruende. Personernes adgang er et spor, ikke en dom; konklusionen skal bygge på en dokumenteret kæde.",
    estimatedMinutes: 16,
    people: [
      { id: "niels", name: "Niels Falk", role: "logistikleder", relation: "planlagde varemodtagelse og kassation", statement: "Sensorfejlen tvang os til at kassere alt. Transportøren hentede kasserne.", claimedTimeline: ["05.40: fejlalarm", "07.10: afhentning"], access: ["sensoradministrator", "transportbestilling"] },
      { id: "fatima", name: "Fatima Saleh", role: "sygeplejerske", relation: "opdagede den tomme hylde", statement: "Pakkerne var kolde og ubrudte, da jeg gik klokken seks.", claimedTimeline: ["05.55: lagerkontrol", "06.03: vagt slut"], access: ["medicinskab"] },
      { id: "esben", name: "Esben Tran", role: "chauffør", relation: "hentede klinisk affald", statement: "Jeg hentede én grå beholder, ikke medicinkasser.", claimedTimeline: ["07.08: ankomst", "07.16: afgang"], access: ["affaldsrum under ledsagelse"] },
      { id: "vibeke", name: "Vibeke Holm", role: "apoteker", relation: "modtog en hasteordre fra klinikken", statement: "Jeg sendte erstatningslager, men kendte ikke årsagen til tabet.", claimedTimeline: ["08.20: hasteordre", "09.05: levering"], access: ["leverandørportal"] },
    ],
    timeline: [
      { id: "t-admin", time: "05.37", title: "Sensorgrænse ændres", description: "Alarmgrænsen sættes fra 8 til 2 grader.", sourceIds: ["doc-sensor"], personIds: ["niels"] },
      { id: "t-check", time: "05.55", title: "Fysisk kontrol", description: "Fatima scanner tre kolde, forseglede kasser.", sourceIds: ["doc-scan"], personIds: ["fatima"] },
      { id: "t-order", time: "06.18", title: "Privat transport oprettes", description: "En afhentning bestilles til en sideadresse.", sourceIds: ["doc-order"], personIds: ["niels", "esben"] },
      { id: "t-pickup", time: "07.02", title: "Hvid bil ved bagdøren", description: "Nummerpladen tilhører ikke klinikkens affaldstransportør.", sourceIds: ["doc-camera"], personIds: ["niels"] },
      { id: "t-waste", time: "07.08", title: "Affaldsbilen ankommer", description: "Esben henter én forseglet grå beholder.", sourceIds: ["data-weight"], personIds: ["esben"] },
    ],
    documents: [
      { id: "doc-sensor", title: "Sensorens revisionslog", kind: "log", source: "Kølesystemet", summary: "Alarmen skyldtes en ændret grænse, ikke høj temperatur.", excerpt: "Bruger NF-admin: øvre grænse 8,0 → 2,0 °C.", personIds: ["niels"], evidenceIds: ["ev-sensor"] },
      { id: "doc-scan", title: "Pakkescanning", kind: "record", source: "Medicinskabet", summary: "Alle kasser var til stede og forseglede klokken 05.55.", excerpt: "Temperaturmærke: grønt. Antal: 36 penne.", personIds: ["fatima"], evidenceIds: ["ev-safe-stock"] },
      { id: "doc-order", title: "Transportbestilling", kind: "contract", source: "Privat kurerportal", summary: "Niels bestilte en anonym afhentning.", excerpt: "Afhent tre kølekasser; faktura til NF Rådgivning.", personIds: ["niels"], evidenceIds: ["ev-private-order"] },
      { id: "doc-camera", title: "Bagdørskamera", kind: "photo", source: "Klinikken", summary: "Niels læsser tre kasser i en hvid bil.", excerpt: "07.02–07.05; ansigt og navneskilt synlige.", personIds: ["niels"], evidenceIds: ["ev-loading"] },
      { id: "doc-disposal", title: "Kassationsattest", kind: "report", source: "Klinikkens arkiv", summary: "Attesten angiver tre kasser, men mangler transportørens signatur.", excerpt: "Godkendt digitalt af NF-admin klokken 07.21.", personIds: ["niels", "esben"], evidenceIds: ["ev-false-certificate"] },
    ],
    data: [
      { id: "data-temp", label: "Faktisk temperatur", value: "4,2–4,8 °C", interpretation: "Insulinen var inden for sikker grænse hele natten.", sourceIds: ["doc-sensor"], personIds: ["niels"], evidenceIds: ["ev-sensor"] },
      { id: "data-weight", label: "Affaldsbilens vægt", value: "+11 kg", interpretation: "Det svarer til beholderen, ikke tre fulde kølekasser.", sourceIds: ["t-waste"], personIds: ["esben"], evidenceIds: ["ev-waste-weight"] },
      { id: "data-sale", label: "Engrosforespørgsel", value: "36 insulinpenne tilbudt samme dag", interpretation: "Afsenderkontoen bruger telefonnummeret fra NF Rådgivning.", sourceIds: ["doc-order"], personIds: ["niels"], evidenceIds: ["ev-resale"] },
    ],
    evidence: [
      { id: "ev-sensor", title: "Falsk temperaturalarm", description: "Niels ændrede grænsen, selv om temperaturen var sikker.", strength: 3, sourceIds: ["doc-sensor", "data-temp"], implicates: ["niels"], exonerates: [] },
      { id: "ev-safe-stock", title: "Sikkert lager klokken 05.55", description: "Scanningen støtter Fatimas forklaring.", strength: 2, sourceIds: ["doc-scan"], implicates: [], exonerates: ["fatima"] },
      { id: "ev-private-order", title: "Den private afhentning", description: "Bestillingen forbinder Niels med tre kølekasser og en sidevirksomhed.", strength: 3, sourceIds: ["doc-order"], implicates: ["niels"], exonerates: ["esben"] },
      { id: "ev-loading", title: "Niels læsser kasserne", description: "Kameraet viser den fysiske fjernelse før affaldsbilen ankommer.", strength: 3, sourceIds: ["doc-camera"], implicates: ["niels"], exonerates: ["esben"] },
      { id: "ev-false-certificate", title: "Falsk kassation", description: "Niels godkendte et dokument uden transportørsignatur.", strength: 2, sourceIds: ["doc-disposal"], implicates: ["niels"], exonerates: [] },
      { id: "ev-waste-weight", title: "Affaldsvægten passer", description: "Esbens bil bar kun den registrerede affaldsbeholder.", strength: 2, sourceIds: ["data-weight"], implicates: [], exonerates: ["esben"] },
      { id: "ev-resale", title: "Forsøg på videresalg", description: "Det præcise antal og telefonnummer forbinder tilbuddet med Niels.", strength: 3, sourceIds: ["data-sale"], implicates: ["niels"], exonerates: [] },
    ],
    contradictions: [
      { id: "con-disposal", title: "Kasseret uden transport", explanation: "Niels hævder, at transportøren hentede medicinen, men vægt og kamera viser en anden bil før Esbens ankomst.", leftEvidenceId: "ev-loading", rightEvidenceId: "ev-waste-weight", personIds: ["niels", "esben"] },
      { id: "con-temperature", title: "Fejl eller ændret regel", explanation: "Den faktiske temperatur var sikker; alarmen opstod kun, fordi Niels ændrede grænsen.", leftEvidenceId: "ev-sensor", rightEvidenceId: "ev-safe-stock", personIds: ["niels", "fatima"] },
    ],
    culpritId: "niels",
    requiredEvidenceIds: ["ev-sensor", "ev-private-order", "ev-loading", "ev-resale"],
    minimumEvidence: 4,
    solutionReasoning: "Niels skabte en falsk alarm, bestilte en privat afhentning, blev filmet med kasserne og forsøgte at sælge det præcise antal. Esbens vægtdata viser, at den lovlige affaldsbil ikke transporterede insulinen.",
  },
  {
    id: "reading-room-murder",
    pathLevel: 20,
    level: "B2",
    crime: "murder",
    title: "Mordet i læsesalen",
    englishTitle: "The reading-room murder",
    eyebrow: "ARKIV 20 · DRAB",
    brief: "Historikeren Elias Bohn blev fundet død i et aflåst forskningsarkiv. Ingen grafiske billeder indgår. Fire personer havde adgang, og et manglende brev kan have været motivet.",
    objective: "Byg en sammenhængende beviskæde om adgang, tidspunkt, motiv og manipulation. Vælg den mest mistænkelige person og mindst fire stærke spor; indicier uden forbindelse er utilstrækkelige.",
    victimCare: "Elias havde familie og kolleger, som har krav på en nøgtern undersøgelse. Arkivet undgår spekulation om privatlivet, medmindre et dokument er direkte relevant.",
    estimatedMinutes: 20,
    people: [
      { id: "solveig", name: "Solveig Nyholm", role: "seniorforsker", relation: "stod til at miste æren for en kildeudgivelse", statement: "Jeg forlod arkivet før klokken otte og talte med ingen bagefter.", claimedTimeline: ["19.48: udgang", "20.10: hjemme"], access: ["hovednøgle", "konserveringsskab", "Elias' projektmappe"] },
      { id: "malik", name: "Malik Jensen", role: "ph.d.-studerende", relation: "havde en faglig konflikt med Elias", statement: "Jeg arbejdede i caféen og sendte min klage derfra.", claimedTimeline: ["19.30–21.00: cafénetværk"], access: ["læsesalskort"] },
      { id: "anne", name: "Anne Bohn", role: "søster", relation: "skulle arve Elias' private samling", statement: "Vi var uenige om samlingen, men jeg var på hospitalet hos vores mor.", claimedTimeline: ["18.50–22.14: hospital"], access: ["privat ekstranøgle"] },
      { id: "thomas", name: "Thomas Riis", role: "arkivleder", relation: "ansvarlig for sikkerheden", statement: "Jeg låste magasinet klokken 20.05 og så ingen i læsesalen.", claimedTimeline: ["20.05: låser magasin", "20.12: vagtkontor"], access: ["alle døre", "adgangslog"] },
    ],
    timeline: [
      { id: "t-letter", time: "19.36", title: "Brevet fotograferes", description: "Elias gemmer billeder af et brev, der modsiger Solveigs bog.", sourceIds: ["doc-photo-meta"], personIds: ["solveig"] },
      { id: "t-exit", time: "19.48", title: "Solveigs kort registrerer udgang", description: "Kortet bruges ved hoveddøren, men døren står åben under en levering.", sourceIds: ["doc-access"], personIds: ["solveig"] },
      { id: "t-message", time: "20.07", title: "Elias sender en ufærdig besked", description: "Kladde: 'S., jeg offentliggør brevet i morgen'.", sourceIds: ["doc-draft"], personIds: ["solveig"] },
      { id: "t-vent", time: "20.12", title: "Læsesalens sensor ændres", description: "Konserveringsanlægget sættes manuelt på høj luftstrøm.", sourceIds: ["doc-vent"], personIds: ["solveig", "thomas"] },
      { id: "t-found", time: "20.41", title: "Thomas finder Elias", description: "Han ringer straks til alarmcentralen.", sourceIds: ["doc-call"], personIds: ["thomas"] },
    ],
    documents: [
      { id: "doc-photo-meta", title: "Fotografier af brevet", kind: "photo", source: "Elias' kamera", summary: "Brevet dokumenterer, at Solveigs centrale kilde var fejldateret.", excerpt: "Optaget 19.36; originalen mangler fra mappe B-12.", personIds: ["solveig"], evidenceIds: ["ev-motive"] },
      { id: "doc-access", title: "Adgangslog og leveringsvideo", kind: "log", source: "Arkivets sikkerhed", summary: "Solveigs udgangskort beviser ikke, at hun gik ud.", excerpt: "19.48: kort læst; døren holdt åben 19.47–19.50.", personIds: ["solveig", "thomas"], evidenceIds: ["ev-false-exit"] },
      { id: "doc-draft", title: "Elias' kladde", kind: "message", source: "Telefonens gendannelse", summary: "Elias ville offentliggøre brevet og adresserede en person med S.", excerpt: "S., jeg offentliggør brevet i morgen. Vi må rette kapitlet.", personIds: ["solveig"], evidenceIds: ["ev-motive"] },
      { id: "doc-vent", title: "Konserveringslog", kind: "log", source: "Læsesalens anlæg", summary: "En manuel kommando slettede normal sensorkurve.", excerpt: "Servicekode SN-4; høj luftstrøm 20.12–20.28.", personIds: ["solveig", "thomas"], evidenceIds: ["ev-service-code"] },
      { id: "doc-call", title: "Alarmopkald", kind: "record", source: "Alarmcentralen", summary: "Thomas oplyser korrekt placering og følger førstehjælpsinstruktioner.", excerpt: "Opkald 20.41; ambulancen ankommer 20.49.", personIds: ["thomas"], evidenceIds: ["ev-thomas-response"] },
      { id: "doc-fiber", title: "Teknisk sporrapport", kind: "report", source: "Laboratoriet", summary: "En særlig grøn konserveringstråd sad på Solveigs manchet og brevets tomme omslag.", excerpt: "Farvestof og fibersnoning har samme sjældne batch.", personIds: ["solveig"], evidenceIds: ["ev-fiber"] },
    ],
    data: [
      { id: "data-watch", label: "Solveigs ur", value: "bevægelse i læsesalen 20.09–20.17", interpretation: "Urets lokale positionssignal modsiger hendes hjemtur.", sourceIds: ["doc-access"], personIds: ["solveig"], evidenceIds: ["ev-watch"] },
      { id: "data-hospital", label: "Hospitalsbesøg", value: "Anne registreret 18.50–22.14", interpretation: "Kamera og personalesignatur støtter alibiet.", sourceIds: ["t-message"], personIds: ["anne"], evidenceIds: ["ev-anne-alibi"] },
      { id: "data-network", label: "Cafénetværk", value: "Maliks laptop aktiv 19.32–20.55", interpretation: "Live videomøde bekræfter, at Malik var i caféen.", sourceIds: ["t-message"], personIds: ["malik"], evidenceIds: ["ev-malik-alibi"] },
      { id: "data-code", label: "Servicekode SN-4", value: "udstedt til Solveig", interpretation: "Thomas havde hovedadgang, men ikke den personlige kode.", sourceIds: ["doc-vent"], personIds: ["solveig", "thomas"], evidenceIds: ["ev-service-code"] },
    ],
    evidence: [
      { id: "ev-motive", title: "Brevet truede Solveigs værk", description: "Fotografier og kladde giver et konkret fagligt motiv uden alene at bevise drab.", strength: 2, sourceIds: ["doc-photo-meta", "doc-draft"], implicates: ["solveig"], exonerates: [] },
      { id: "ev-false-exit", title: "Kortet skabte et falsk udgangsspor", description: "Døren stod åben, så Solveig kunne bruge kortet uden at forlade bygningen.", strength: 2, sourceIds: ["doc-access"], implicates: ["solveig"], exonerates: [] },
      { id: "ev-service-code", title: "Solveigs kode ændrede anlægget", description: "Den personlige kode blev brugt til at forstyrre sensordata.", strength: 3, sourceIds: ["doc-vent", "data-code"], implicates: ["solveig"], exonerates: ["thomas"] },
      { id: "ev-thomas-response", title: "Thomas slog alarm", description: "Opkald og førstehjælp støtter, at Thomas fandt scenen senere.", strength: 1, sourceIds: ["doc-call"], implicates: [], exonerates: ["thomas"] },
      { id: "ev-fiber", title: "Den sjældne konserveringstråd", description: "Samme batch forbinder Solveigs tøj med det manglende brevomslag.", strength: 3, sourceIds: ["doc-fiber"], implicates: ["solveig"], exonerates: [] },
      { id: "ev-watch", title: "Uret blev i læsesalen", description: "Positionsdata viser Solveig på stedet efter den påståede udgang.", strength: 3, sourceIds: ["data-watch"], implicates: ["solveig"], exonerates: [] },
      { id: "ev-anne-alibi", title: "Annes hospitalsalibi", description: "Uafhængige kilder placerer Anne på hospitalet.", strength: 3, sourceIds: ["data-hospital"], implicates: [], exonerates: ["anne"] },
      { id: "ev-malik-alibi", title: "Maliks videomøde", description: "Netværk og levende deltagere placerer Malik i caféen.", strength: 3, sourceIds: ["data-network"], implicates: [], exonerates: ["malik"] },
    ],
    contradictions: [
      { id: "con-exit", title: "Et kort uden en person", explanation: "Solveigs kort registrerer udgang, men hendes ur viser fortsat bevægelse i læsesalen.", leftEvidenceId: "ev-false-exit", rightEvidenceId: "ev-watch", personIds: ["solveig"] },
      { id: "con-access", title: "Hovednøgle eller personlig kode", explanation: "Thomas kunne åbne rummet, men kun Solveigs personlige servicekode ændrede anlægget.", leftEvidenceId: "ev-thomas-response", rightEvidenceId: "ev-service-code", personIds: ["thomas", "solveig"] },
      { id: "con-letter", title: "Brevet forsvinder", explanation: "Elias fotograferede brevet, mens fiberfundet forbinder det tomme omslag med Solveig.", leftEvidenceId: "ev-motive", rightEvidenceId: "ev-fiber", personIds: ["solveig"] },
    ],
    culpritId: "solveig",
    requiredEvidenceIds: ["ev-motive", "ev-service-code", "ev-fiber", "ev-watch"],
    minimumEvidence: 4,
    solutionReasoning: "Solveig havde motivet, blev i læsesalen efter et falsk udgangsspor, brugte sin personlige servicekode og bar en sjælden fiber fra det manglende brev. De øvrige personers adgang eller konflikt opvejes af uafhængige alibier og handlinger.",
  },
];

export const detectiveCases: readonly DetectiveCase[] = cases;

export const detectiveCaseRegistry = Object.fromEntries(
  detectiveCases.map((detectiveCase) => [detectiveCase.id, detectiveCase]),
) as Record<DetectiveCaseId, DetectiveCase>;

export const detectiveCaseCards = detectiveCases.map(({ id, pathLevel, level, crime, title, englishTitle, eyebrow, brief, estimatedMinutes }) => ({
  id,
  pathLevel,
  level,
  crime,
  title,
  englishTitle,
  eyebrow,
  description: brief,
  estimatedMinutes,
}));
