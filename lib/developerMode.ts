export const DEVELOPER_KRONER_GRANTS = [500, 5_000] as const;

export function grantDeveloperKroner(currentKroner: number, amount: number) {
  if (!Number.isSafeInteger(currentKroner) || currentKroner < 0) return 0;
  if (!Number.isSafeInteger(amount) || amount <= 0) return currentKroner;
  return Math.min(Number.MAX_SAFE_INTEGER, currentKroner + amount);
}

export function unlockDeveloperLevel(currentLevelIndex: number, targetLevelIndex: number, levelCount: number) {
  const lastLevelIndex = Math.max(0, levelCount - 1);
  const safeCurrent = Number.isInteger(currentLevelIndex) ? currentLevelIndex : 0;
  const safeTarget = Number.isInteger(targetLevelIndex) ? targetLevelIndex : 0;
  return Math.min(lastLevelIndex, Math.max(0, safeCurrent, safeTarget));
}

export function isDeveloperLevelOpen(developerMode: boolean, unlockedLevelIndex: number, levelIndex: number) {
  return developerMode && levelIndex <= unlockedLevelIndex;
}
