import { createContext, useContext, useState } from 'react'
import { translations, type Lang, type TranslationKey } from '@/lib/i18n'

interface LanguageContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

export const LanguageContext = createContext<LanguageContextType>({
  lang: 'nl',
  setLang: () => {},
  t: (key) => translations.nl[key],
})

export function useLanguage() {
  return useContext(LanguageContext)
}

export function createLanguageState(): LanguageContextType {
  const stored = (localStorage.getItem('lang') as Lang) || 'nl'
  const [lang, setLangState] = useState<Lang>(stored)

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  const t = (key: TranslationKey): string => translations[lang][key]

  return { lang, setLang, t }
}
