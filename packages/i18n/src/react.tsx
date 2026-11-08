import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator, defaultLocale, type Locale, type Translator } from "./index";

const I18nContext = createContext<Translator>(createTranslator(defaultLocale));

export function I18nProvider({ locale = defaultLocale, children }: { locale?: Locale; children: ReactNode }) {
  const value = useMemo(() => createTranslator(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Translator {
  return useContext(I18nContext);
}
