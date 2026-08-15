import { SettingsStore } from '../Settings/SettingsStore';

import global_en from './Languages/en.json';
import global_de from './Languages/de.json';
import global_fr from './Languages/fr.json';
import global_sv from './Languages/sv.json';
import global_es from './Languages/es.json';
import global_tr from './Languages/tr.json';
import global_hu from './Languages/hu.json';
import global_uk from './Languages/uk.json';
import global_zhHans from './Languages/zh-Hans.json';
import global_it from './Languages/it.json';
import global_ru from './Languages/ru.json';
import global_ptbr from './Languages/pt-BR.json';
import global_engb from './Languages/en-GB.json';
import global_nl from './Languages/nl.json';
import global_pl from './Languages/pl.json';
import global_ja from './Languages/ja.json';
import { defaultLanguage, resolveSupportedLanguage } from './LanguageSelection';

const resources = {
  en: { global: global_en },
  'en-GB': { global: global_engb },
  de: { global: global_de },
  fr: { global: global_fr },
  es: { global: global_es },
  it: { global: global_it },
  'pt-BR': { global: global_ptbr },
  sv: { global: global_sv },
  hu: { global: global_hu },
  tr: { global: global_tr },
  'zh-Hans': { global: global_zhHans },
  ru: { global: global_ru },
  uk: { global: global_uk },
  nl: { global: global_nl },
  pl: { global: global_pl },
  ja: { global: global_ja },
};

export const languages = Object.keys(resources ?? []);

export const getSelectedlanguage = async () => {
  const stored = await SettingsStore.getSettings();

  
  if (stored.lng && languages.includes(stored.lng)) {
    return stored.lng;
  }

  return resolveSupportedLanguage(navigator.language, languages);
};

export const isAutoDetected = (lng: string) => {
  return resolveSupportedLanguage(navigator.language, languages) === lng;
};

export const config = {
  lng: await getSelectedlanguage(),
  fallbackLng: defaultLanguage,
  resources,
  interpolation: { escapeValue: false },
};
