function hashSeed(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/**
 * Reorders a three-choice exercise without changing its values.
 * The seed keeps the order stable during one attempt, while a new session seed
 * moves the correct answer to a different position often enough to prevent
 * positional guessing.
 */
export function orderThreeChoiceOptions(
  options: readonly string[],
  answer: string,
  seed: string,
) {
  if (options.length !== 3) return [...options];
  const answerIndex = options.findIndex((option) => option === answer);
  if (answerIndex < 0) return [...options];

  const distractors = options.filter((_, index) => index !== answerIndex);
  if (hashSeed(`${seed}:distractors`) % 2 === 1) distractors.reverse();
  const answerPosition = hashSeed(`${seed}:answer`) % 3;
  distractors.splice(answerPosition, 0, options[answerIndex]);
  return distractors;
}

/** Stable Fisher–Yates shuffle for token-bank mechanics; never mutates authored data. */
export function orderItemTokens(tokens: readonly string[], seed: string) {
  const ordered = [...tokens];
  if (ordered.length < 2) return ordered;
  let state = hashSeed(`${seed}:tokens`) || 1;
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const swapIndex = state % (index + 1);
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }
  if (ordered.every((token, index) => token === tokens[index])) ordered.push(ordered.shift()!);
  return ordered;
}
