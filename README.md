# Ordhavn

Ordhavn er et local-first læringsspil til dansk. Den nuværende udgave indeholder
14 niveauer, 50 missioner, 400 unikke opgaver og 234 minutters aktivt
kursusindhold fra A0 til B2. Brugerfladen og hjælpesproget er kun dansk og
engelsk.

## Det særlige ved Ordhavn

- hele den primære brugerflade er på enkelt dansk;
- elleve opgavetyper, herunder danske tal, `en/et` med sikkerhedsindsats,
  bestemthed, adjektivkongruens, V2, placeringen af `ikke`, flerdelte cloze-felter,
  registermatching og fri sætningsomskrivning med delvis kredit;
- ti udvidelige scenariesystemer: danske telefonindstillinger, forgrenede
  psykologiske dialoger, mail-efterforskning, trafik-dispatch, A1–A2-havnecases,
  en B1–B2-manualkonsol, tidevandsbaseret last-routing og Sagslaboratoriets tre
  AI-hybride efterforskninger samt to nye A2–B2-laboratorier med tyve sager;
- `Borgerservice & bybud` lader spilleren læse digital post, udfylde blanketter,
  beregne priser og bygge ruter med frister, tidsvinduer, zoner og billetvalg;
- `Vagtcentralen` har fem entydige begrænsningsgitre og fem
  betydningsredaktører, hvor før/efter, kun, medmindre og præcise referencer er
  selve puslespillets regler;
- `Havnefogedens sag` kombinerer V2-afhøring, evidentialitet, en entydig tidslinje
  og et formelt rapportskift. `Stormvagten` og `Færgens reserveplan` kombinerer
  dansk manualforståelse, beregninger og en kodevalideret kontrolsekvens;
- et lokalt miniordbogskort ved markering af præcis ét dansk ord;
- **Ordle** som dagligt fem-bogstavsspil, fri træning og fire valgfrie
  checkpoints på læringsstien. Svarbanken har 500 hyppige ord, mens 6.071
  danske gæt accepteres;
- en lokal Developer mode med testkroner og direkte adgang til senere stiniveauer;
- tre originale animefigurer med forskellige samtaleregler og ni spilbare episoder;
- en levende havn med købte bygninger, karakterkontrakter, relationer og tidevand;
- tre valutaer: XP til rang, kroner til valg og rav fra holdout, Brier og
  scenarier løst rent i første forsøg;
- maritime rangporte, Kønsbanken og en deterministisk ugentlig storm;
- et mørkt standardtema samt et øjeblikkeligt sol/måne-skift til lyst tema;
- tre adskilte mastery-dimensioner: `read`, `listen` og `produce`;
- item-skemaet er audio-ready (`assets.audio: null`), men første version har
  bevidst ingen lydafspilning, mikrofon eller stemmedata;
- operationelle gentagelser planlægges med FSRS-5 via den fastlåste pakke
  `ts-fsrs@4.7.1`;
- 8% af items holdes uden for FSRS og måles på en fast 1/3/7/14-dages plan,
  så retentionskurven ikke bliver biased af scheduleren;
- alle svar og sessions gemmes lokalt og kan eksporteres som separate JSON/CSV-filer;
- fremskridt migreres på samme storage-nøgle og hvert nyt snapshot beholder den
  foregående gyldige version som lokal recovery-kopi.

## Kør lokalt

Krav: Node.js 22.13 eller nyere.

```bash
npm install
npm run dev
```

Åbn `http://localhost:3000`.

De avancerede scenarier kan vurdere fri dansk produktion via Gemini. Sæt
`GEMINI_API_KEY` som en server-side miljøvariabel (se `.env.example`). Nøglen må
aldrig hedde `NEXT_PUBLIC_GEMINI_API_KEY`. Hvis alle modeller er utilgængelige,
fortsætter spillet automatisk med sin deterministiske lokale rubric.

På Windows kan `start-ordhavn.bat` bruges til en synlig, manuel start. Kør
`install-ordhavn-autostart.ps1` én gang for at registrere den skjulte opgave
**Ordhavn Localhost**, som starter den lokale server efter Windows-login uden
at åbne browseren. Den skjulte lokale server bruger den interaktive dev-runtime,
så klientfunktioner og lokal fremgang virker stabilt på Windows. Loggen skrives
til `%LOCALAPPDATA%\Ordhavn\localhost.log`.

## Kontrol

```bash
npm run check
```

Kontrollen bygger produktionsversionen, typechecker hele projektet, kører ESLint,
verificerer server-rendering, indholdsinvarianter, FSRS-adskillelsen og den
deterministiske holdout-gruppe, de 128 nye kursusitems, tre nye opgavetyper,
femten avancerede scenariecases, Gemini-fallback og Ordles to ordlister.

Ordles datakilder, filtrering og licenser er dokumenteret i
[WORDLE_SOURCES.md](WORDLE_SOURCES.md).

## Dataeksport

Åbn **Statistik → Dit læringsarkiv → Vælg mappe**, og vælg projektets
`data-exports`-mappe. Browseren kræver denne engangsgodkendelse. Derefter skriver
Ordhavn automatisk et nyt, opdelt snapshot efter hver afsluttet mission.

Se [data-exports/README.md](data-exports/README.md) for den fulde filliste.

## Arkitektur

- `app/page.tsx` — navigation, læringssti, træning, player og statistik
- `app/scenario-games.tsx` — indgangen til de ti interaktive scenariesystemer
- `app/advanced-scenario-games.tsx` — afhøring, kodepuslespil og fri rapportproduktion
- `app/city-scenario-games.tsx` — blanketter, beregninger og ruteplanlægning
- `app/logic-scenario-games.tsx` — begrænsningsgitre og betydningsredigering
- `app/api/gemini/evaluate/route.ts` — server-side Gemini-evaluering med model-fallback
- `app/instruction-puzzle-games.tsx` — manual- og ruteopgaver med beregninger
- `app/selection-dictionary.tsx` — miniordbog for markerede danske enkeltord
- `app/wordle-game.tsx` — daglig Ordle, træningsrunder og sti-checkpoints
- `app/harbor-game.tsx` — havnen, karakterkontrakter og Kønsbanken
- `lib/courseData.ts` — typed, data-driven dansk kursusindhold
- `lib/scenarioData.ts` — typed cases, branches, settings and route data
- `lib/advancedScenarioData.ts` — tre deterministiske B1–B2-sager og offline rubric
- `lib/cityScenarioData.ts` — seks A2–B1-cases med breve, priser, tid og zoner
- `lib/logicScenarioData.ts` — seks B1–B2-cases med entydig logik og fri produktion
- `lib/geminiEvaluation.ts` — validering, struktureret output og modelstige
- `lib/exerciseScoring.ts` — Levenshtein og delvis kredit for sammensatte svar
- `lib/instructionPuzzleData.ts` — seks B1–B2-manualpuslespil
- `lib/dictionaryData.ts` — lokal dansk-engelsk ordbog med bøjningsformer
- `lib/gameEconomy.ts` — valutaer, rangporte, bygninger og ugens storm
- `lib/harborData.ts` — karakterer, bosser og udvidelige havnecases
- `lib/dialogueEpisodes.ts` — seks betalte, forgrenede karakterfortsættelser
- `lib/scheduler.ts` — FSRS-5 og unbiased holdout-plan
- `lib/wordle.ts` — deterministiske ordvalg, duplicate-aware scoring og spiltyper
- `lib/wordleData.ts` — genererede, adskilte svar- og gættelister
- `lib/progressStorage.ts` — migration og recovery-snapshot for lokal fremgang
- `lib/analytics.ts` — eventlog, aggregater og validering
- `data-exports/schema.json` — stabilt data- og audio-ready schema

Fremgang, kildedata og personlige eksporter bliver på enheden. Når Gemini er
aktiv, sendes kun den afsluttende scenarietekst og sagens påkrævede fakta til
Google for sproglig vurdering. Ingen ekstern analytics-tjeneste er koblet på.
