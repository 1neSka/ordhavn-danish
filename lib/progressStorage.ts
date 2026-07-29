export type StoredProgressRecord = Record<string, unknown>;

function parseStoredRecord(value: string | null): StoredProgressRecord | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as StoredProgressRecord
      : null;
  } catch {
    return null;
  }
}

export function readProgressWithBackup(primary: string | null, backup: string | null) {
  return parseStoredRecord(primary) ?? parseStoredRecord(backup);
}

export function prepareProgressWrite(previousPrimary: string | null, nextSerialized: string) {
  const validPrevious = parseStoredRecord(previousPrimary) ? previousPrimary : null;
  return {
    primary: nextSerialized,
    backup: validPrevious && validPrevious !== nextSerialized ? validPrevious : null,
  };
}
