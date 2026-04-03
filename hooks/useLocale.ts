import { createContext, useContext } from 'react';
import { getLocales } from 'expo-localization';
import { translations, Locale, TranslationKey } from '../constants/i18n';

// 디바이스 언어 자동 감지
export function detectLocale(): Locale {
  const tag = getLocales()[0]?.languageTag ?? 'ko';
  if (tag.startsWith('zh')) return 'zh';
  if (tag.startsWith('en')) return 'en';
  if (tag.startsWith('ja')) return 'ja';
  return 'ko';
}

export type LocaleContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
};

export const LocaleContext = createContext<LocaleContextType>({
  locale: 'ko',
  setLocale: () => {},
  t: (key) => translations.ko[key],
});

export function useLocale() {
  return useContext(LocaleContext);
}
