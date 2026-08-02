export type TerminalCefrLevel = "A2+" | "B1" | "B2";

export interface TerminalFileSeed {
  path: string;
  kind: "file" | "directory";
  content?: string;
}

export type TerminalStageRequirement =
  | { type: "command-used"; command: string; minimum?: number }
  | { type: "successful-output"; command?: string; includes: string }
  | { type: "file-exists"; path: string }
  | { type: "file-contains"; path: string; includes: string[] }
  | { type: "cwd-is"; path: string };

export interface TerminalScenarioStage {
  id: string;
  title: string;
  instruction: string;
  englishSupport: string;
  requirements: TerminalStageRequirement[];
}

export interface TerminalScenarioCase {
  id: string;
  pathLevel: 15 | 16 | 17 | 18 | 19 | 20;
  level: TerminalCefrLevel;
  title: string;
  englishTitle: string;
  location: string;
  objective: string;
  englishObjective: string;
  openingMessage: string;
  startPath: string;
  filesystem: TerminalFileSeed[];
  stages: TerminalScenarioStage[];
  /** Internal deterministic transcript used to verify that the authored case is solvable. */
  referenceCommands: string[];
  finalAnswer: string;
  rewardKroner: number;
}

export interface TerminalAssistantRequest {
  caseId: string;
  language: "da";
  prompt: string;
  cwd: string;
  recentCommands: string[];
}

export interface TerminalAssistantPolicy {
  language: "da";
  maxPromptCharacters: number;
  maxRecentCommands: number;
  systemInstruction: string;
  refusal: string;
  suggestedPrompts: string[];
}

export const terminalAssistantPolicy: TerminalAssistantPolicy = {
  language: "da",
  maxPromptCharacters: 600,
  maxRecentCommands: 8,
  systemInstruction:
    "Du er terminalassistent i en lukket simulation. Svar kun på dansk. Forklar kommandoens princip og foreslå højst ét næste eksperiment; giv ikke hele sagens facit eller en komplet kommandorække.",
  refusal: "Assistenten svarer kun på spørgsmål skrevet på dansk.",
  suggestedPrompts: [
    "Hvordan kan jeg søge efter en tekst i flere filer?",
    "Hvad betyder flaget -n i denne kommando?",
    "Hvordan tæller jeg gentagne linjer uden at ændre originalfilen?",
  ],
};

const commonDirectories: TerminalFileSeed[] = [
  { path: "/", kind: "directory" },
  { path: "/home", kind: "directory" },
  { path: "/home/elev", kind: "directory" },
  { path: "/home/elev/arbejde", kind: "directory" },
  {
    path: "/home/elev/README.txt",
    kind: "file",
    content:
      "Terminaløvelse i Ordhavn. Brug help eller man <kommando>. Alle filer ligger i en lukket simulation.\n",
  },
];

export const terminalScenarioCases: TerminalScenarioCase[] = [
  {
    id: "terminal-kajpakker-15",
    pathLevel: 15,
    level: "A2+",
    title: "Pakkerne på kaj 7",
    englishTitle: "The packages at quay 7",
    location: "Godsterminalen · Modtagelse",
    objective:
      "Find den tilbageholdte pakke, kontrollér dens manifest og gem pakkenummeret i din egen resultatfil.",
    englishObjective:
      "Find the held package, check its manifest, and save the package number in your own result file.",
    openingMessage:
      "Tre mapper kom ind i nat. En pakke er tilbageholdt, men vagtskiftet efterlod kun tekstfiler. Start med pwd, ls eller help.",
    startPath: "/home/elev",
    filesystem: [
      ...commonDirectories,
      { path: "/data", kind: "directory" },
      { path: "/data/modtagelse", kind: "directory" },
      { path: "/data/modtagelse/pakke-184", kind: "directory" },
      { path: "/data/modtagelse/pakke-207", kind: "directory" },
      { path: "/data/modtagelse/pakke-319", kind: "directory" },
      { path: "/data/modtagelse/pakke-184/manifest.txt", kind: "file", content: "pakke=184\nstatus=frigivet\nkaj=03\nindhold=reservedele\n" },
      { path: "/data/modtagelse/pakke-207/manifest.txt", kind: "file", content: "pakke=207\nstatus=tilbageholdt\nkaj=07\nindhold=måleudstyr\n" },
      { path: "/data/modtagelse/pakke-319/manifest.txt", kind: "file", content: "pakke=319\nstatus=frigivet\nkaj=11\nindhold=arbejdstøj\n" },
      { path: "/data/modtagelse/vagt-note.txt", kind: "file", content: "Læs alle manifester. Kun status=tilbageholdt kræver handling.\n" },
    ],
    stages: [
      {
        id: "orienter",
        title: "Orientér dig",
        instruction: "Find modtagelsesmappen, gå ind i den, og vis også eventuelle skjulte poster.",
        englishSupport: "Locate the incoming directory, enter it, and include hidden entries in the listing.",
        requirements: [
          { type: "command-used", command: "pwd" },
          { type: "command-used", command: "ls" },
          { type: "cwd-is", path: "/data/modtagelse" },
        ],
      },
      {
        id: "undersoeg",
        title: "Undersøg manifesterne",
        instruction: "Søg i alle manifestfiler efter den præcise status, som kræver handling.",
        englishSupport: "Search all manifest files for the exact status that requires action.",
        requirements: [
          { type: "command-used", command: "grep" },
          { type: "successful-output", command: "grep", includes: "pakke-207/manifest.txt" },
        ],
      },
      {
        id: "gem",
        title: "Gem fundet",
        instruction: "Udtræk pakkelinjen fra det rigtige manifest, og skriv den til ~/arbejde/resultat.txt.",
        englishSupport: "Extract the package line from the correct manifest and redirect it to the result file.",
        requirements: [
          { type: "file-exists", path: "/home/elev/arbejde/resultat.txt" },
          { type: "file-contains", path: "/home/elev/arbejde/resultat.txt", includes: ["pakke=207"] },
        ],
      },
      {
        id: "bekraeft",
        title: "Bekræft afleveringen",
        instruction: "Vis resultatfilen og kontrollér, at den kun indeholder det nødvendige pakkenummer.",
        englishSupport: "Display the result file and verify that it contains only the required package number.",
        requirements: [{ type: "successful-output", command: "cat", includes: "pakke=207" }],
      },
    ],
    referenceCommands: [
      "pwd",
      "cd /data/modtagelse",
      "ls -a",
      "grep -n 'status=tilbageholdt' pakke-*/manifest.txt",
      "grep '^pakke=' pakke-207/manifest.txt > ~/arbejde/resultat.txt",
      "cat ~/arbejde/resultat.txt",
    ],
    finalAnswer: "pakke=207",
    rewardKroner: 145,
  },
  {
    id: "terminal-loginspor-16",
    pathLevel: 16,
    level: "B1",
    title: "Fem mislykkede nøgler",
    englishTitle: "Five failed keys",
    location: "Driftsvagten · Adgangslog",
    objective:
      "Find den adresse, der står bag flest afviste loginforsøg, og aflever en optælling uden succesfulde logins.",
    englishObjective:
      "Find the address behind the most rejected login attempts and deliver a count excluding successful logins.",
    openingMessage:
      "Adgangsloggen er lang, og chefen har allerede gættet på den forkerte adresse. Bevis det med en reproducerbar kommandokæde.",
    startPath: "/home/elev",
    filesystem: [
      ...commonDirectories,
      { path: "/var", kind: "directory" },
      { path: "/var/log", kind: "directory" },
      { path: "/var/log/havn", kind: "directory" },
      {
        path: "/var/log/havn/adgang.log",
        kind: "file",
        content: [
          "06:41 OK bruger=vera ip=10.4.0.8",
          "06:43 AFVIST bruger=admin ip=10.4.0.19",
          "06:44 AFVIST bruger=admin ip=10.4.0.19",
          "06:45 AFVIST bruger=root ip=10.4.0.22",
          "06:46 OK bruger=otto ip=10.4.0.19",
          "06:48 AFVIST bruger=admin ip=10.4.0.19",
          "06:52 AFVIST bruger=root ip=10.4.0.22",
          "06:55 AFVIST bruger=admin ip=10.4.0.19",
          "06:58 AFVIST bruger=admin ip=10.4.0.19",
          "07:01 OK bruger=liv ip=10.4.0.22",
        ].join("\n") + "\n",
      },
      { path: "/var/log/havn/format.txt", kind: "file", content: "felter: tid resultat bruger ip\nAFVIST betyder, at adgang blev nægtet.\n" },
      { path: "/var/log/havn/vagtskifte.txt", kind: "file", content: "Tæl kun AFVIST. Et senere OK må ikke slette et tidligere forsøg fra optællingen.\n" },
    ],
    stages: [
      {
        id: "laes-format",
        title: "Forstå loggen",
        instruction: "Læs formatbeskrivelsen og kontrollér de første linjer i adgangsloggen.",
        englishSupport: "Read the format description and inspect the first lines of the access log.",
        requirements: [
          { type: "command-used", command: "head" },
          { type: "successful-output", includes: "AFVIST" },
        ],
      },
      {
        id: "filtrer",
        title: "Fjern støjen",
        instruction: "Behold kun afviste forsøg, og udtræk IP-feltet med cut.",
        englishSupport: "Keep rejected attempts only and extract the IP field with cut.",
        requirements: [
          { type: "command-used", command: "grep" },
          { type: "command-used", command: "cut" },
          { type: "successful-output", command: "cut", includes: "ip=10.4.0.19" },
        ],
      },
      {
        id: "tael",
        title: "Tæl gentagelserne",
        instruction: "Sortér adresserne, tæl gentagelser med uniq -c, og gem tabellen i ~/arbejde/afviste.txt.",
        englishSupport: "Sort the addresses, count repeats with uniq -c, and save the table.",
        requirements: [
          { type: "command-used", command: "sort" },
          { type: "command-used", command: "uniq" },
          { type: "file-contains", path: "/home/elev/arbejde/afviste.txt", includes: ["5 ip=10.4.0.19", "2 ip=10.4.0.22"] },
        ],
      },
      {
        id: "aflever",
        title: "Aflever beviset",
        instruction: "Sortér optællingen numerisk med den største værdi først, og vis kun første linje.",
        englishSupport: "Sort the count numerically in descending order and display only the first line.",
        requirements: [{ type: "successful-output", command: "head", includes: "5 ip=10.4.0.19" }],
      },
    ],
    referenceCommands: [
      "cat /var/log/havn/format.txt",
      "head -n 4 /var/log/havn/adgang.log",
      "grep ' AFVIST ' /var/log/havn/adgang.log | cut -d' ' -f4",
      "grep ' AFVIST ' /var/log/havn/adgang.log | cut -d' ' -f4 | sort | uniq -c > ~/arbejde/afviste.txt",
      "sort -nr ~/arbejde/afviste.txt | head -n 1",
    ],
    finalAnswer: "5 ip=10.4.0.19",
    rewardKroner: 175,
  },
  {
    id: "terminal-forsyningsrevision-17",
    pathLevel: 17,
    level: "B2",
    title: "Revision uden regneark",
    englishTitle: "Audit without a spreadsheet",
    location: "Forsyningskontoret · Arkivserver",
    objective:
      "Find alle forsinkede leverancer, isolér den dyreste kategori og kontrollér rapportens integritet med den offentliggjorte checksum.",
    englishObjective:
      "Find all delayed deliveries, isolate the most expensive category, and verify report integrity using the published checksum.",
    openingMessage:
      "Leverandøren kalder tre CSV-filer for et regneark. Du har en terminal, et checksum-katalog og meget lidt tålmodighed.",
    startPath: "/srv/revision",
    filesystem: [
      ...commonDirectories,
      { path: "/srv", kind: "directory" },
      { path: "/srv/revision", kind: "directory" },
      { path: "/srv/revision/data", kind: "directory" },
      { path: "/srv/revision/noter", kind: "directory" },
      { path: "/srv/revision/data/uge-31.csv", kind: "file", content: "id;kategori;beløb;status\nA11;medicin;8400;rettidig\nA12;elektronik;12700;forsinket\nA13;fødevarer;3100;forsinket\n" },
      { path: "/srv/revision/data/uge-32.csv", kind: "file", content: "id;kategori;beløb;status\nB20;elektronik;15100;forsinket\nB21;medicin;9200;rettidig\nB22;fødevarer;2800;rettidig\n" },
      { path: "/srv/revision/data/uge-33.csv", kind: "file", content: "id;kategori;beløb;status\nC05;medicin;10100;forsinket\nC06;elektronik;9900;forsinket\nC07;fødevarer;2600;rettidig\n" },
      { path: "/srv/revision/noter/felter.txt", kind: "file", content: "CSV bruger semikolon: id;kategori;beløb;status\nRapporten skal indeholde hele linjer uden overskrift.\n" },
      { path: "/srv/revision/kontrol.sha256", kind: "file", content: "f2c50b4867b2dc488e78573de732db3b56e2985924f3d13b16990d8212a62f01  forsinkede.txt\n" },
    ],
    stages: [
      {
        id: "kortlaeg",
        title: "Kortlæg materialet",
        instruction: "Brug find til at lokalisere alle CSV-filer under data og kontrollér deres filtype.",
        englishSupport: "Use find to locate every CSV file under data and inspect their file type.",
        requirements: [
          { type: "command-used", command: "find" },
          { type: "successful-output", command: "find", includes: "uge-33.csv" },
          { type: "command-used", command: "file" },
        ],
      },
      {
        id: "saml",
        title: "Saml forsinkelserne",
        instruction: "Søg på tværs af CSV-filerne efter forsinket, fjern filnavnspræfikset, sortér linjerne og gem dem som forsinkede.txt.",
        englishSupport: "Search across the CSV files, remove filename prefixes, sort the lines, and save them as forsinkede.txt.",
        requirements: [
          { type: "file-contains", path: "/srv/revision/forsinkede.txt", includes: ["A12;elektronik;12700;forsinket", "B20;elektronik;15100;forsinket", "C05;medicin;10100;forsinket"] },
          { type: "command-used", command: "sort" },
        ],
      },
      {
        id: "kategori",
        title: "Isolér kategorien",
        instruction: "Udtræk kategori og beløb. Vis derefter de tre elektronikposter, så den største kan aflæses.",
        englishSupport: "Extract category and amount, then display the three electronics records so the largest can be read.",
        requirements: [
          { type: "command-used", command: "cut" },
          { type: "successful-output", command: "grep", includes: "elektronik;15100" },
        ],
      },
      {
        id: "integritet",
        title: "Kontrollér integriteten",
        instruction: "Beregn SHA-256 for forsinkede.txt, og sammenlign resultatet med kontrol.sha256.",
        englishSupport: "Calculate the SHA-256 digest of forsinkede.txt and compare it with the published checksum.",
        requirements: [{ type: "successful-output", command: "sha256sum", includes: "f2c50b4867b2dc488e78573de732db3b56e2985924f3d13b16990d8212a62f01" }],
      },
    ],
    referenceCommands: [
      "find data -maxdepth 1 -type f -name '*.csv'",
      "file data/uge-31.csv",
      "grep -h 'forsinket$' data/*.csv | sort > forsinkede.txt",
      "cut -d';' -f2,3 forsinkede.txt",
      "cut -d';' -f2,3 forsinkede.txt | grep '^elektronik;'",
      "sha256sum forsinkede.txt",
    ],
    finalAnswer: "elektronik;15100",
    rewardKroner: 220,
  },
  {
    id: "terminal-billedkaj-18",
    pathLevel: 18,
    level: "A2+",
    title: "Billedet, der ikke er et billede",
    englishTitle: "The picture that is not a picture",
    location: "Pressearkivet · Kajkamera",
    objective:
      "Find filen med forkert endelse, læs dens virkelige type og gem den skjulte kajkode som svar.",
    englishObjective:
      "Find the file with the wrong extension, inspect its real type, and save the hidden quay code as the answer.",
    openingMessage:
      "Nogen omdøbte en tekstfil til et foto. Det er enten sabotage eller en praktikant med humor. Terminalen er mindre dramatisk.",
    startPath: "/arkiv",
    filesystem: [
      ...commonDirectories,
      { path: "/arkiv", kind: "directory" },
      { path: "/arkiv/2026", kind: "directory" },
      { path: "/arkiv/2026/juli", kind: "directory" },
      { path: "/arkiv/2026/juli/kaj-a.jpg", kind: "file", content: "JPEG-SIM\u0000kaj A ved solopgang\n" },
      { path: "/arkiv/2026/juli/kaj-b.jpg", kind: "file", content: "JPEG-SIM\u0000kaj B i regn\n" },
      { path: "/arkiv/2026/juli/kaj-c.jpg", kind: "file", content: "Dette er ikke et fotografi på kajen.\narkivkode=FYR-42\nkaj=12\n" },
      { path: "/arkiv/2026/juli/indeks.txt", kind: "file", content: "Tre kamerafiler blev modtaget. Kontrollér typen, ikke kun endelsen.\n" },
    ],
    stages: [
      {
        id: "find-fotos",
        title: "Find kandidaterne",
        instruction: "Find alle filer med endelsen .jpg under arkivet.",
        englishSupport: "Find every file with the .jpg extension below the archive.",
        requirements: [
          { type: "command-used", command: "find" },
          { type: "successful-output", command: "find", includes: "kaj-c.jpg" },
        ],
      },
      {
        id: "typekontrol",
        title: "Kontrollér indholdstypen",
        instruction: "Brug file på kandidaterne. En af dem er almindelig tekst trods sin endelse.",
        englishSupport: "Run file on the candidates. One is plain text despite its extension.",
        requirements: [{ type: "successful-output", command: "file", includes: "kaj-c.jpg: UTF-8 Unicode text" }],
      },
      {
        id: "udtraek-kode",
        title: "Udtræk koden",
        instruction: "Læs tekstfilen og gem kun linjen med arkivkoden i ~/arbejde/kajkode.txt.",
        englishSupport: "Read the text file and save only the archive-code line.",
        requirements: [{ type: "file-contains", path: "/home/elev/arbejde/kajkode.txt", includes: ["arkivkode=FYR-42"] }],
      },
      {
        id: "slutkontrol",
        title: "Kontrollér svaret",
        instruction: "Vis første linje i din resultatfil, og kontrollér at der ikke fulgte anden tekst med.",
        englishSupport: "Display the first line of your result file.",
        requirements: [{ type: "successful-output", command: "head", includes: "arkivkode=FYR-42" }],
      },
    ],
    referenceCommands: [
      "find . -type f -name '*.jpg'",
      "file 2026/juli/*.jpg",
      "grep '^arkivkode=' 2026/juli/kaj-c.jpg > ~/arbejde/kajkode.txt",
      "head -n 1 ~/arbejde/kajkode.txt",
    ],
    finalAnswer: "arkivkode=FYR-42",
    rewardKroner: 155,
  },
  {
    id: "terminal-koelekaede-19",
    pathLevel: 19,
    level: "B1",
    title: "Kulden lyver ikke",
    englishTitle: "The cold does not lie",
    location: "Fødevarekajen · Sensorarkiv",
    objective:
      "Sammenlign sensorerne, find den container der gentagne gange overskred grænsen, og aflever dens seneste måling.",
    englishObjective:
      "Compare the sensors, find the container that repeatedly exceeded the limit, and deliver its latest reading.",
    openingMessage:
      "Formanden siger, at alle alarmer skyldes en løs ledning. Loggen har ingen fagforening og er villig til at vidne.",
    startPath: "/sensor",
    filesystem: [
      ...commonDirectories,
      { path: "/sensor", kind: "directory" },
      { path: "/sensor/log", kind: "directory" },
      { path: "/sensor/manual", kind: "directory" },
      { path: "/sensor/manual/graense.txt", kind: "file", content: "ALARM betyder temperatur over 8 grader. Felt 2 er container-id; felt 4 er målingen.\n" },
      { path: "/sensor/log/mandag.log", kind: "file", content: "08:00 C17 OK 5.2\n08:10 C41 ALARM 9.1\n08:20 C09 OK 6.0\n09:00 C41 ALARM 9.7\n" },
      { path: "/sensor/log/tirsdag.log", kind: "file", content: "07:50 C17 OK 5.4\n08:05 C09 ALARM 8.4\n08:25 C41 ALARM 10.2\n09:15 C09 OK 7.1\n" },
      { path: "/sensor/log/onsdag.log", kind: "file", content: "07:45 C17 OK 5.3\n08:15 C41 ALARM 11.8\n09:05 C09 OK 6.7\n09:40 C41 ALARM 12.4\n" },
    ],
    stages: [
      {
        id: "regel",
        title: "Læs grænsen",
        instruction: "Læs manualen, og se derefter de sidste linjer i onsdagens log.",
        englishSupport: "Read the threshold note, then inspect the final lines in Wednesday's log.",
        requirements: [
          { type: "command-used", command: "cat" },
          { type: "command-used", command: "tail" },
          { type: "successful-output", includes: "12.4" },
        ],
      },
      {
        id: "alarmer",
        title: "Saml alarmerne",
        instruction: "Find alle ALARM-linjer på tværs af logfilerne og gem dem kronologisk i ~/arbejde/alarmer.txt.",
        englishSupport: "Collect every ALARM line across the logs and save them in chronological order.",
        requirements: [
          { type: "file-exists", path: "/home/elev/arbejde/alarmer.txt" },
          { type: "file-contains", path: "/home/elev/arbejde/alarmer.txt", includes: ["C41 ALARM 9.1", "C41 ALARM 12.4", "C09 ALARM 8.4"] },
        ],
      },
      {
        id: "gentagelser",
        title: "Find mønstret",
        instruction: "Udtræk container-id, sortér dem og tæl gentagelser. Den værste har fem alarmer.",
        englishSupport: "Extract container IDs, sort them, and count repeats. The worst one has five alarms.",
        requirements: [{ type: "successful-output", command: "uniq", includes: "5 C41" }],
      },
      {
        id: "seneste",
        title: "Aflever seneste måling",
        instruction: "Filtrér alarmerne til den værste container, og vis dens seneste linje.",
        englishSupport: "Filter the alarms to the worst container and show its latest record.",
        requirements: [{ type: "successful-output", command: "tail", includes: "09:40 C41 ALARM 12.4" }],
      },
    ],
    referenceCommands: [
      "cat manual/graense.txt",
      "tail -n 2 log/onsdag.log",
      "cat log/mandag.log log/tirsdag.log log/onsdag.log | grep ' ALARM ' > ~/arbejde/alarmer.txt",
      "cut -d' ' -f2 ~/arbejde/alarmer.txt | sort | uniq -c",
      "grep ' C41 ' ~/arbejde/alarmer.txt | tail -n 1",
    ],
    finalAnswer: "09:40 C41 ALARM 12.4",
    rewardKroner: 190,
  },
  {
    id: "terminal-kontraktspor-20",
    pathLevel: 20,
    level: "B2",
    title: "Den pæne rapport og den grimme sandhed",
    englishTitle: "The neat report and the ugly truth",
    location: "Havnerådet · Kontraktrevision",
    objective:
      "Rekonstruér ændringssporet, identificér den uautoriserede godkendelse og aflever et verificerbart uddrag med checksum.",
    englishObjective:
      "Reconstruct the change trail, identify the unauthorized approval, and deliver a verifiable extract with a checksum.",
    openingMessage:
      "Direktøren kalder forskellen en afrundingsfejl. Forskellen har et brugernavn, et klokkeslæt og 480.000 kroner.",
    startPath: "/audit",
    filesystem: [
      ...commonDirectories,
      { path: "/audit", kind: "directory" },
      { path: "/audit/input", kind: "directory" },
      { path: "/audit/politik", kind: "directory" },
      { path: "/audit/input/aendringer.tsv", kind: "file", content: "tid\tbruger\thandling\tbeløb\n18:04\tliv\tOPRET\t920000\n18:19\tdirektor\tGODKEND\t920000\n23:41\tservice\tAENDR\t1400000\n23:43\tservice\tGODKEND\t1400000\n07:12\tliv\tLAES\t1400000\n" },
      { path: "/audit/input/aktive-brugere.txt", kind: "file", content: "liv\nanna\ndirektor\nrevisor\n" },
      { path: "/audit/politik/adgang.txt", kind: "file", content: "Kun aktive brugere må godkende kontrakter. Servicekonti må aldrig udføre GODKEND.\nÆndringer efter 22:00 kræver en revisor i sporet.\n" },
      { path: "/audit/politik/leverance.txt", kind: "file", content: "Aflever hele de mistænkelige linjer i fund.txt. Sortér dem efter tid. Beregn derefter SHA-256.\n" },
    ],
    stages: [
      {
        id: "politik",
        title: "Læs før du anklager",
        instruction: "Læs begge politikfiler og kontrollér, hvilke tekstfiler der findes under audit.",
        englishSupport: "Read both policy files and locate the text files below the audit directory.",
        requirements: [
          { type: "command-used", command: "find" },
          { type: "successful-output", includes: "Servicekonti må aldrig" },
        ],
      },
      {
        id: "spor",
        title: "Isolér ændringssporet",
        instruction: "Find alle linjer fra servicekontoen, og gem dem sorteret i fund.txt uden overskriften.",
        englishSupport: "Find all service-account records and save them sorted in fund.txt without the header.",
        requirements: [{ type: "file-contains", path: "/audit/fund.txt", includes: ["23:41\tservice\tAENDR\t1400000", "23:43\tservice\tGODKEND\t1400000"] }],
      },
      {
        id: "bevis",
        title: "Bevis overtrædelsen",
        instruction: "Vis kun GODKEND-linjen fra fund.txt, og udtræk bruger, handling og beløb med cut.",
        englishSupport: "Display only the approval record and extract user, action, and amount with cut.",
        requirements: [
          { type: "command-used", command: "cut" },
          { type: "successful-output", command: "cut", includes: "service\tGODKEND\t1400000" },
        ],
      },
      {
        id: "forsegl",
        title: "Forsegl leverancen",
        instruction: "Tæl linjerne i fund.txt og beregn filens SHA-256, så beviset kan kontrolleres senere.",
        englishSupport: "Count the lines in fund.txt and calculate its SHA-256 digest for later verification.",
        requirements: [
          { type: "successful-output", command: "wc", includes: "2" },
          { type: "successful-output", command: "sha256sum", includes: "19fac8d05422943681a4a227945e67c1b5c0a38255b504bc980c4dcaabb1c63b" },
        ],
      },
    ],
    referenceCommands: [
      "find . -type f -name '*.txt'",
      "cat politik/adgang.txt politik/leverance.txt",
      "grep 'service' input/aendringer.tsv | sort > fund.txt",
      "grep 'GODKEND' fund.txt | cut -f2,3,4",
      "wc -l fund.txt",
      "sha256sum fund.txt",
    ],
    finalAnswer: "service\tGODKEND\t1400000",
    rewardKroner: 250,
  },
];

export const terminalScenarioCasesByPathLevel = Object.fromEntries(
  terminalScenarioCases.map((scenario) => [scenario.pathLevel, scenario]),
) as Record<TerminalScenarioCase["pathLevel"], TerminalScenarioCase>;
