export type ClozeSegment =
  | { text: string }
  | { blankId: string; options: string[]; answer: string };

export type RegisterPair = {
  addressee: string;
  addresseeNote: string;
  utterance: string;
};

export function normalizeExerciseAnswer(value: string) {
  return value.trim().toLocaleLowerCase("da-DK").replace(/[.!?,]/g, "").replace(/\s+/g, " ");
}

export function levenshteinSimilarity(leftValue: string, rightValue: string) {
  const left = normalizeExerciseAnswer(leftValue);
  const right = normalizeExerciseAnswer(rightValue);
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return Math.max(0, 1 - previous[right.length] / Math.max(left.length, right.length));
}

export function scoreFreeAnswer(
  challenge: { answer: string; acceptedAnswers?: string[] },
  answer: string,
) {
  const alternatives = [challenge.answer, ...(challenge.acceptedAnswers ?? [])];
  return Math.max(...alternatives.map((item) => levenshteinSimilarity(item, answer)));
}

export function clozeBlanks(segments: ClozeSegment[]) {
  return segments.filter((segment): segment is Extract<ClozeSegment, { blankId: string }> => "blankId" in segment);
}

export function serializeClozeSelections(segments: ClozeSegment[], selections: Record<string, string>) {
  return clozeBlanks(segments).map((blank) => selections[blank.blankId] ?? "").join(" | ");
}

export function scoreClozeSelections(segments: ClozeSegment[], selections: Record<string, string>) {
  const blanks = clozeBlanks(segments);
  if (!blanks.length) return 0;
  const correct = blanks.filter((blank) => (
    normalizeExerciseAnswer(selections[blank.blankId] ?? "") === normalizeExerciseAnswer(blank.answer)
  )).length;
  return correct / blanks.length;
}

export function serializeRegisterMatches(pairs: RegisterPair[], matches: Record<string, string>) {
  return pairs.map((pair) => matches[pair.addressee] ?? "").join(" | ");
}

export function scoreRegisterMatches(pairs: RegisterPair[], matches: Record<string, string>) {
  if (!pairs.length) return 0;
  const correct = pairs.filter((pair) => (
    normalizeExerciseAnswer(matches[pair.addressee] ?? "") === normalizeExerciseAnswer(pair.utterance)
  )).length;
  return correct / pairs.length;
}
