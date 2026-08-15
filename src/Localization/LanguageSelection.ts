export const defaultLanguage = 'en';

export function resolveSupportedLanguage(preferredLanguage: string, supportedLanguages: readonly string[]): string {
  const exactMatch = supportedLanguages.find(language => language.toLowerCase() === preferredLanguage.toLowerCase());
  if (exactMatch) return exactMatch;

  const baseLanguage = preferredLanguage.split('-')[0].toLowerCase();
  const baseMatch = supportedLanguages.find(language => language.toLowerCase() === baseLanguage);
  if (baseMatch) return baseMatch;

  return supportedLanguages.includes(defaultLanguage) ? defaultLanguage : supportedLanguages[0] ?? defaultLanguage;
}
