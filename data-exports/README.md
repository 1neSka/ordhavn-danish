# Ordhavn data exports

Vælg denne mappe med knappen **Vælg mappe** under *Statistik → Dit læringsarkiv*.
Når mappen er forbundet, skriver Ordhavn automatisk et nyt snapshot efter hver
afsluttet mission og kan også eksportere manuelt.

Browseren kræver, at du godkender mappen mindst én gang. Det er en bevidst
sikkerhedsgrænse: et website må ikke skrive lydløst til vilkårlige mapper.

Eksporten består af separate filer:

- `attempts.json` — hvert svar, score, modality, tid, hint og Brier-score
- `sessions.json` — sessionsgrænser, aktiv tid og XP
- `daily.csv` — daglige aggregater
- `skills.csv` — færdigheder, præcision og svartid
- `errors.json` — detaljeret fejlarkiv
- `mastery.json` — modality-aware FSRS/holdout mastery records
- `review-events.json` — `review_scheduled` og `review_completed`
- `holdout-retention.csv` — kun unbiased 1/3/7/14-dages målinger
- `modality.csv` — read/listen/produce opdelt
- `content-progress.json` — status for niveauer og missioner
- `item-catalog.json` — typed item schema inkl. nullable audio assets
- `summary.json` — versions- og eksportoversigt

Filer med personlige svar ignoreres af Git som standard. Behold kun README og
schemas i versionsstyringen.
