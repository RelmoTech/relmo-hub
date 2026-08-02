import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Financien } from '@/pages/Financien'
import { Projecten } from '@/pages/Projecten'
import { Taken } from '@/pages/Taken'
import { Facturatie } from '@/pages/Facturatie'
import { Instellingen } from '@/pages/Instellingen'
import { Brainstorm } from '@/pages/Brainstorm'
import { ActivityFilterContext } from '@/hooks/useActivityFilter'

export default function App() {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)

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
