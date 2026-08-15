export interface UrlCredentialCustomFieldLike {
  key: string;
  value: string;
}

export interface UrlCredentialLike {
  databaseId: string;
  uuid: string;
  password: string;
  url: string;
  customFields?: UrlCredentialCustomFieldLike[] | { [key: string]: UrlCredentialCustomFieldLike };
}

function parseHostname(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return parsed.hostname.replace(/\.+$/, '').toLocaleLowerCase() || null;
  } catch (_error) {
    return null;
  }
}

function hostsAreEquivalent(first: string, second: string): boolean {
  if (first === second) return true;

  const withoutWww = (hostname: string) => hostname.replace(/^www\./, '');
  return withoutWww(first) === withoutWww(second) && (first.startsWith('www.') || second.startsWith('www.'));
}

function getCustomFields(credential: UrlCredentialLike): UrlCredentialCustomFieldLike[] {
  if (Array.isArray(credential.customFields)) return credential.customFields;
  return Object.values(credential.customFields ?? {});
}

function getCredentialUrls(credential: UrlCredentialLike): string[] {
  const alternativeUrls = getCustomFields(credential)
    .filter(field => field.key.startsWith('URL') || field.key.startsWith('KP2A_URL'))
    .map(field => field.value);

  return [credential.url, ...alternativeUrls];
}

export function getCredentialSearchQueryForUrl(pageUrl: string): string | null {
  return parseHostname(pageUrl);
}

/**
 * Restores only passwordless entries whose primary or recognised alternative
 * URL has the same host as the page. The exact-host check is deliberately
 * stricter than text search so a lookalike domain cannot gain a credential.
 */
export function getPasswordlessUrlMatches<T extends UrlCredentialLike>(pageUrl: string, candidates: T[]): T[] {
  const pageHostname = parseHostname(pageUrl);
  if (!pageHostname) return [];

  return candidates.filter(candidate => {
    if (candidate.password.length > 0) return false;

    return getCredentialUrls(candidate).some(value => {
      const candidateHostname = parseHostname(value);
      return candidateHostname !== null && hostsAreEquivalent(pageHostname, candidateHostname);
    });
  });
}

export function mergeUniqueCredentials<T extends Pick<UrlCredentialLike, 'databaseId' | 'uuid'>>(primary: T[], fallback: T[]): T[] {
  const seen = new Set(primary.map(credential => `${credential.databaseId}:${credential.uuid}`));
  const merged = [...primary];

  fallback.forEach(credential => {
    const key = `${credential.databaseId}:${credential.uuid}`;
    if (seen.has(key)) return;

    seen.add(key);
    merged.push(credential);
  });

  return merged;
}
