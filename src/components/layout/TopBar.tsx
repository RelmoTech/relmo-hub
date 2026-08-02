import { Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'

export function TopBar() {
  const { dark, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3">
      <div className="flex items-center justify-end gap-2">
        <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500"
          title="Uitloggen"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
