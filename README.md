# Ordhavn

Ordhavn er et local-first læringsspil til dansk. Den nuværende udgave indeholder
10 niveauer, 34 missioner, 272 unikke opgaver og 139 minutters aktivt
kursusindhold fra A0 til B2. Brugerfladen og hjælpesproget er kun dansk og
engelsk.

## Det særlige ved Ordhavn

- hele den primære brugerflade er på enkelt dansk;
- otte opgavetyper, herunder danske tal, `en/et` med sikkerhedsindsats,
  bestemthed, adjektivkongruens, V2 og placeringen af `ikke`;
- syv udvidelige scenariesystemer: danske telefonindstillinger, forgrenede
  psykologiske dialoger, mail-efterforskning, trafik-dispatch, A1–A2-havnecases,
  en B1–B2-manualkonsol og tidevandsbaseret last-routing;
- et lokalt miniordbogskort ved markering af præcis ét dansk ord;
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
- alle svar og sessions gemmes lokalt og kan eksporteres som separate JSON/CSV-filer.

## Kør lokalt

Krav: Node.js 22.13 eller nyere.

```bash
npm install
npm run dev
```

Åbn `http://localhost:3000`.

På Windows kan `start-ordhavn.bat` bruges til en synlig, manuel start. Kør
`install-ordhavn-autostart.ps1` én gang for at registrere den skjulte opgave
**Ordhavn Localhost**, som starter produktionsserveren efter Windows-login uden
at åbne browseren. Loggen skrives til `%LOCALAPPDATA%\Ordhavn\localhost.log`.

## Kontrol

```bash
npm run check
```

Kontrollen bygger produktionsversionen, typechecker hele projektet, kører ESLint,
verificerer server-rendering, indholdsinvarianter, FSRS-adskillelsen og den
deterministiske holdout-gruppe.

## Dataeksport

Åbn **Statistik → Dit læringsarkiv → Vælg mappe**, og vælg projektets
`data-exports`-mappe. Browseren kræver denne engangsgodkendelse. Derefter skriver
Ordhavn automatisk et nyt, opdelt snapshot efter hver afsluttet mission.

Se [data-exports/README.md](data-exports/README.md) for den fulde filliste.

## Arkitektur

- `app/page.tsx` — navigation, læringssti, træning, player og statistik
- `app/scenario-games.tsx` — indgangen til de syv interaktive scenariesystemer
- `app/instruction-puzzle-games.tsx` — manual- og ruteopgaver med beregninger
- `app/selection-dictionary.tsx` — miniordbog for markerede danske enkeltord
- `app/harbor-game.tsx` — havnen, karakterkontrakter og Kønsbanken
- `lib/courseData.ts` — typed, data-driven dansk kursusindhold
- `lib/scenarioData.ts` — typed cases, branches, settings and route data
- `lib/instructionPuzzleData.ts` — seks B1–B2-manualpuslespil
- `lib/dictionaryData.ts` — lokal dansk-engelsk ordbog med bøjningsformer
- `lib/gameEconomy.ts` — valutaer, rangporte, bygninger og ugens storm
- `lib/harborData.ts` — karakterer, bosser og udvidelige havnecases
- `lib/dialogueEpisodes.ts` — seks betalte, forgrenede karakterfortsættelser
- `lib/scheduler.ts` — FSRS-5 og unbiased holdout-plan
- `lib/analytics.ts` — eventlog, aggregater og validering
- `data-exports/schema.json` — stabilt data- og audio-ready schema

Kildedata og personlige eksporter bliver på enheden. Ingen ekstern analytics-
tjeneste er koblet på.
