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
import { Login } from '@/pages/Login'
import { ActivityFilterContext } from '@/hooks/useActivityFilter'

export default function App() {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // loading

  if (!session) return <Login />

  return (
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
            <Route path="/instellingen" element={<Instellingen />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ActivityFilterContext.Provider>
  )
}
