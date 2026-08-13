const SUPPORT_CONFIRMATION_KEY = "witnessops-support-verification-confirmation";

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredSupportConfirmation {
  marker: string;
  intakeId: string;
}

export function storeSupportConfirmation(
  storage: SessionStorageLike,
  intakeId: string,
  marker = crypto.randomUUID(),
): string {
  storage.setItem(
    SUPPORT_CONFIRMATION_KEY,
    JSON.stringify({ marker, intakeId } satisfies StoredSupportConfirmation),
  );
  return marker;
}

export function consumeSupportConfirmation(
  storage: SessionStorageLike,
  marker: string,
): boolean {
  const raw = storage.getItem(SUPPORT_CONFIRMATION_KEY);
  storage.removeItem(SUPPORT_CONFIRMATION_KEY);
  if (!raw || !marker) return false;
  try {
    const stored = JSON.parse(raw) as Partial<StoredSupportConfirmation>;
    return (
      stored.marker === marker &&
      typeof stored.intakeId === "string" &&
      stored.intakeId.length > 0
    );
  } catch {
    return false;
  }
}
