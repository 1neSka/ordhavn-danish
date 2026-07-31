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
