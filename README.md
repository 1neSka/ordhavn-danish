# Ordhavn

Ordhavn er et local-first læringsspil til dansk. Den nuværende udgave indeholder
10 niveauer, 30 missioner, 240 unikke opgaver og over 100 minutters aktivt
kursusindhold fra A0 til B2.

## Det særlige ved Ordhavn

- hele den primære brugerflade er på enkelt dansk;
- otte opgavetyper, herunder danske tal, `en/et` med sikkerhedsindsats,
  bestemthed, adjektivkongruens, V2 og placeringen af `ikke`;
- fire udvidelige scenariesystemer: danske telefonindstillinger, forgrenede
  psykologiske dialoger, mail-efterforskning og trafik-dispatch;
- tre originale animefigurer med forskellige samtaleregler og flere udfald;
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
- `app/scenario-games.tsx` — de fire interaktive scenariemotorer
- `lib/courseData.ts` — typed, data-driven dansk kursusindhold
- `lib/scenarioData.ts` — typed cases, branches, settings and route data
- `lib/scheduler.ts` — FSRS-5 og unbiased holdout-plan
- `lib/analytics.ts` — eventlog, aggregater, validering og 21-fils eksport
- `data-exports/schema.json` — stabilt data- og audio-ready schema

Kildedata og personlige eksporter bliver på enheden. Ingen ekstern analytics-
tjeneste er koblet på.
