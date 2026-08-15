export interface AutomaticFillSettings {
  autoFillImmediatelyIfOnlyASingleMatch: boolean;
  autoFillImmediatelyWithFirstMatch: boolean;
}

export function selectAutomaticFillCredential<T>(credentials: T[], settings: AutomaticFillSettings): T | null {
  if (settings.autoFillImmediatelyWithFirstMatch) {
    return credentials[0] ?? null;
  }

  if (settings.autoFillImmediatelyIfOnlyASingleMatch && credentials.length === 1) {
    return credentials[0];
  }

  return null;
}
