# Danish Wordle data sources

Ordhavn keeps two deliberately separate five-letter word lists:

- **Answers (500):** frequent lowercase forms that also occur as lowercase
  Stavekontrolden headwords. Entries with a title-cased dictionary twin and a
  small safety deny-list are excluded.
- **Accepted guesses (6,071 at generation time):** the generous union of all lowercase five-letter
  Stavekontrolden headwords and FrequencyWords forms that the same Hunspell
  affix rules recognize. This keeps useful inflections without accepting every
  subtitle typo or character name.

The generated file is `lib/wordleData.ts`. Rebuild it with
`scripts/generate-wordle-data.mjs`; the raw source files are not vendored.
The generator uses `nspell@2.1.5` (MIT) only to apply Stavekontrolden's affix
rules while validating frequency-list forms.

## Stavekontrolden

- Files: `da_DK-2.9.109.aff` and `da_DK-2.9.109.dic`
- Source: <https://stavekontrolden.dk/dictionaries/da_DK/da_DK-2.9.109.dic>
- Copyright: Foreningen for frit tilgængelige sprogværktøjer
- Offered under GPL-2.0-or-later, LGPL-2.1-or-later, or MPL-1.1. Ordhavn uses
  the MPL-1.1 option for this generated data workflow.

## FrequencyWords / OpenSubtitles 2018

- File: `content/2018/da/da_50k.txt`
- Snapshot: `525f9b560de45753a5ea01069454e72e9aa541c6`
- Source: <https://github.com/hermitdave/FrequencyWords/blob/525f9b560de45753a5ea01069454e72e9aa541c6/content/2018/da/da_50k.txt>
- The repository code is MIT-licensed; its generated frequency-list content is
  licensed CC BY-SA 4.0. This attribution and the same-license requirement apply
  to the derived frequency selection in `lib/wordleData.ts`.
- Corpus origin: OpenSubtitles 2018 via OPUS.
