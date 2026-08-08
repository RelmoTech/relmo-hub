import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Financien } from '@/pages/Financien'
import { Projecten } from '@/pages/Projecten'
import { Taken } from '@/pages/Taken'
import { Facturatie } from '@/pages/Facturatie'
import { Instellingen } from '@/pages/Instellingen'
import { Brainstorm } from '@/pages/Brainstorm'
import { Prospection } from '@/pages/Prospection'
import { Login } from '@/pages/Login'
import { ActivityFilterContext } from '@/hooks/useActivityFilter'
import { LanguageContext } from '@/hooks/useLanguage'
import { translations, type Lang, type TranslationKey } from '@/lib/i18n'

export default function App() {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'nl')

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  const t = (key: TranslationKey): string => translations[lang][key]

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  if (!session) return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <Login />
    </LanguageContext.Provider>
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <ActivityFilterContext.Provider value={{ selectedActivityId, setSelectedActivityId }}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/financien" element={<Financien />} />
              <Route path="/projecten" element={<Projecten />} />
              <Route path="/taken" element={<Taken />} />
              <Route path="/facturatie" element={<Facturatie />} />
              <Route path="/brainstorm" element={<Brainstorm />} />
            <Route path="/prospection" element={<Prospection />} />
              <Route path="/instellingen" element={<Instellingen />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ActivityFilterContext.Provider>
    </LanguageContext.Provider>
  )
}
