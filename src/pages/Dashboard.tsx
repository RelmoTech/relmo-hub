import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, FileText, AlertCircle, AlertTriangle, Zap, Check } from 'lucide-react'
import { useTransactions, useProjects, useTodos, useReservations, useDomeinen, useCoachingActions } from '@/hooks/useSupabase'
import { useActivityFilter } from '@/hooks/useActivityFilter'
import { useLanguage } from '@/hooks/useLanguage'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, isBefore, addDays } from 'date-fns'
import { nl, fr } from 'date-fns/locale'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const { selectedActivityId } = useActivityFilter()
  const { transactions } = useTransactions(selectedActivityId)
  const { projects } = useProjects(selectedActivityId)
  const { todos } = useTodos(selectedActivityId)
  const { reservations } = useReservations()
  const { t, lang } = useLanguage()
  const locale = lang === 'fr' ? fr : nl

  const now = new Date()
  const yearStart = startOfYear(now)
  const yearEnd = endOfYear(now)
  const thisYear = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date)
      return d >= yearStart && d <= yearEnd
    })
  }, [transactions, yearStart, yearEnd])

  const income = thisYear.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expenses = thisYear.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const net = income - expenses
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const robotIncome = reservations
    .filter(r => r.datum?.startsWith(thisMonthPrefix))
    .reduce((s, r) => s + (r.prijs || 0), 0)

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(now, 5 - i)
      const ms = startOfMonth(month)
      const me = endOfMonth(month)
      const monthTx = transactions.filter(t => {
        const d = new Date(t.date)
        return d >= ms && d <= me
      })
      return {
        month: format(month, 'MMM', { locale }),
        [t('income')]: monthTx.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0),
        [t('expenses')]: monthTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0),
      }
    })
  }, [transactions, now, lang])

  const urgentTodos = useMemo(() => {
    const soon = addDays(now, 3)
    return todos
      .filter(t => !t.done && (t.priority === 'hoog' || (t.due_date && isBefore(new Date(t.due_date), soon))))
      .slice(0, 5)
  }, [todos, now])

  const { domeinen } = useDomeinen()
  const { actions: coachingActions, toggle: coachingToggle } = useCoachingActions()
  const expiringSoon = useMemo(() => {
    const today = new Date().setHours(0,0,0,0)
    return domeinen.filter(d => {
      if (!d.actief) return false
      const days = Math.ceil((new Date(d.vervaldatum).getTime() - today) / 86400000)
      return days <= 60
    }).sort((a, b) => a.vervaldatum.localeCompare(b.vervaldatum))
  }, [domeinen])

  const activeProjects = projects.filter(p => p.status === 'actief').slice(0, 5)

  const coachingWeeks = useMemo(() => {
    const map = new Map<number, typeof coachingActions>()
    for (const a of coachingActions) {
      if (!map.has(a.week)) map.set(a.week, [])
      map.get(a.week)!.push(a)
    }
    return map
  }, [coachingActions])
  const latestWeek = coachingWeeks.size > 0 ? Math.max(...coachingWeeks.keys()) : null
  const latestWeekActions = latestWeek ? (coachingWeeks.get(latestWeek) ?? []) : []
  const latestDone = latestWeekActions.filter(a => a.done).length
  const latestOpen = latestWeekActions.filter(a => !a.done)
  const prevWeeksOpen = latestWeek
    ? coachingActions.filter(a => a.week < latestWeek && !a.done).length
    : 0
  const recentTx = transactions.slice(0, 5)

  const cards = [
    { label: `${t('income')} ${now.getFullYear()}`, value: income, icon: TrendingUp, color: 'text-emerald-500' },
    { label: `${t('expenses')} ${now.getFullYear()}`, value: expenses, icon: TrendingDown, color: 'text-red-500' },
    { label: t('net'), value: net, icon: Wallet, color: net >= 0 ? 'text-emerald-500' : 'text-red-500' },
    { label: 'Robot verhuur deze maand', value: robotIncome, icon: FileText, color: 'text-blue-500', isCount: false },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard')}</h1>

      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 mb-2 text-sm">
            <AlertTriangle size={15} /> {expiringSoon.length} domein{expiringSoon.length > 1 ? 'en' : ''} vervalt binnenkort
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {expiringSoon.map(d => {
              const days = Math.ceil((new Date(d.vervaldatum).getTime() - new Date().setHours(0,0,0,0)) / 86400000)
              return (
                <span key={d.id} className={`text-xs font-medium ${days <= 30 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {d.naam} — {days}d ({d.vervaldatum})
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{c.label}</span>
              <c.icon size={16} className={c.color} />
            </div>
            <div className="text-xl font-bold">
              {c.isCount ? c.value : formatCurrency(c.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold mb-4">{t('incomeVsExpenses')}</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Bar dataKey={t('income')} fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey={t('expenses')} fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t('recentTransactions')}</h2>
            <Link to="/financien" className="text-xs text-blue-500">{t('viewAll')}</Link>
          </div>
          <div className="space-y-2">
            {recentTx.map(tx => (
              <div key={tx.id} className="flex justify-between text-sm">
                <div className="truncate flex-1 mr-2">
                  <div className="truncate">{tx.description || '-'}</div>
                  <div className="text-xs text-slate-400">{formatDate(tx.date)}</div>
                </div>
                <span className={tx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
            {recentTx.length === 0 && <p className="text-sm text-slate-400">{t('noTransactions')}</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t('activeProjects')}</h2>
            <Link to="/projecten" className="text-xs text-blue-500">{t('viewAll')}</Link>
          </div>
          <div className="space-y-2">
            {activeProjects.map(p => (
              <div key={p.id} className="text-sm">
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-slate-400">{p.client || t('noClient')} {p.deadline ? `• ${formatDate(p.deadline)}` : ''}</div>
              </div>
            ))}
            {activeProjects.length === 0 && <p className="text-sm text-slate-400">{t('noActiveProjects')}</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t('urgentTasks')}</h2>
            <Link to="/taken" className="text-xs text-blue-500">{t('viewAll')}</Link>
          </div>
          <div className="space-y-2">
            {urgentTodos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 text-sm">
                <AlertCircle size={14} className={todo.priority === 'hoog' ? 'text-red-500' : 'text-amber-500'} />
                <span className="truncate">{todo.title}</span>
              </div>
            ))}
            {urgentTodos.length === 0 && <p className="text-sm text-slate-400">{t('noUrgentTasks')}</p>}
          </div>
        </div>
      </div>

      {/* Coaching ULTRA widget */}
      {latestWeek !== null && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold">Coaching ULTRA — Semaine {latestWeek}</h2>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{latestDone}/{latestWeekActions.length}</span>
            </div>
            <Link to="/coaching" className="text-xs text-blue-500">Voir tout</Link>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${latestWeekActions.length > 0 ? Math.round((latestDone / latestWeekActions.length) * 100) : 0}%` }} />
          </div>
          <div className="space-y-1.5">
            {latestOpen.slice(0, 5).map(action => (
              <div key={action.id} className="flex items-start gap-2.5">
                <button
                  onClick={() => coachingToggle(action.id, true)}
                  className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-400 transition-colors flex items-center justify-center"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">{action.title}</span>
              </div>
            ))}
            {latestOpen.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-500">
                <Check size={13} /> Toutes les actions de la semaine sont complétées !
              </div>
            )}
          </div>
          {prevWeeksOpen > 0 && (
            <p className="mt-2 text-xs text-amber-500">⚠ {prevWeeksOpen} action{prevWeeksOpen > 1 ? 's' : ''} de semaines précédentes encore ouverte{prevWeeksOpen > 1 ? 's' : ''}</p>
          )}
        </div>
      )}
    </div>
  )
}
