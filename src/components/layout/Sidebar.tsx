import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Wallet, FolderKanban, CheckSquare, FileText, Settings, Bot, Menu, X, Lightbulb, Target, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/useLanguage'

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  const links = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/financien', icon: Wallet, label: t('financien') },
    { to: '/projecten', icon: FolderKanban, label: t('projecten') },
    { to: '/taken', icon: CheckSquare, label: t('taken') },
    { to: '/facturatie', icon: FileText, label: t('facturatie') },
    { to: '/brainstorm', icon: Lightbulb, label: t('brainstorm') },
    { to: '/prospection', icon: Target, label: t('prospection') },
    { to: '/prospection-maroc', icon: Target, label: 'Prospection Maroc' },
    { to: '/reservations', icon: CalendarDays, label: 'Reservation Robot' },
    { to: '/instellingen', icon: Settings, label: t('instellingen') },
  ]

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar z-50 flex justify-around py-2 border-t border-slate-700">
        {links.slice(0, 4).map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-1 text-xs px-2 py-1 rounded',
              isActive ? 'text-white' : 'text-sidebar-text'
            )}
          >
            <l.icon size={20} />
            <span>{l.label}</span>
          </NavLink>
        ))}
        <button onClick={() => setOpen(!open)} className="flex flex-col items-center gap-1 text-xs text-sidebar-text px-2 py-1">
          <Menu size={20} />
          <span>Meer</span>
        </button>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-sidebar p-4 rounded-t-xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-sidebar-text"><X size={20} /></button>
            {links.slice(4).map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm',
                  isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text'
                )}
              >
                <l.icon size={20} />
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <aside className="hidden md:flex flex-col w-60 bg-sidebar min-h-screen fixed left-0 top-0 z-40">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
          <Bot className="text-amber-400" size={28} />
          <span className="text-white font-bold text-lg">RELMO Hub</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
                isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-sidebar-active/50 hover:text-white'
              )}
            >
              <l.icon size={18} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          Relmo Tech BV
        </div>
      </aside>
    </>
  )
}
