import { Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import { supabase } from '@/lib/supabase'

export function TopBar() {
  const { dark, toggle } = useTheme()
  const { lang, setLang } = useLanguage()

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3">
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setLang('nl')}
            className={`px-2.5 py-1 rounded-md transition-colors ${lang === 'nl' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
          >
            NL
          </button>
          <button
            onClick={() => setLang('fr')}
            className={`px-2.5 py-1 rounded-md transition-colors ${lang === 'fr' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
          >
            FR
          </button>
        </div>
        <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500"
          title={lang === 'fr' ? 'Se déconnecter' : 'Uitloggen'}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
