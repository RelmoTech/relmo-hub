import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, FileText, AlertCircle } from 'lucide-react'
import { useTransactions, useProjects, useTodos, useInvoices } from '@/hooks/useSupabase'
import { useActivityFilter } from '@/hooks/useActivityFilter'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, isBefore, addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const { selectedActivityId } = useActivityFilter()
  const { transactions } = useTransactions(selectedActivityId)
  const { projects } = useProjects(selectedActivityId)
  const { todos } = useTodos(selectedActivityId)
  const { invoices } = useInvoices(selectedActivityId)

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
  const openInvoices = invoices.filter(i => i.status !== 'betaald').length

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
        month: format(month, 'MMM', { locale: nl }),
        inkomsten: monthTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
        uitgaven: monthTx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      }
    })
  }, [transactions, now])

  const urgentTodos = useMemo(() => {
    const soon = addDays(now, 3)
    return todos
      .filter(t => !t.done && (t.priority === 'hoog' || (t.due_date && isBefore(new Date(t.due_date), soon))))
      .slice(0, 5)
  }, [todos, now])

  const activeProjects = projects.filter(p => p.status === 'actief').slice(0, 5)
  const recentTx = transactions.slice(0, 5)

  const cards = [
    { label: `Inkomsten ${now.getFullYear()}`, value: income, icon: TrendingUp, color: 'text-emerald-500' },
    { label: `Uitgaven ${now.getFullYear()}`, value: expenses, icon: TrendingDown, color: 'text-red-500' },
    { label: 'Netto', value: net, icon: Wallet, color: net >= 0 ? 'text-emerald-500' : 'text-red-500' },
    { label: 'Open facturen', value: openInvoices, icon: FileText, color: 'text-blue-500', isCount: true },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

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
        <h2 className="text-sm font-semibold mb-4">Inkomsten vs Uitgaven (6 maanden)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Bar dataKey="inkomsten" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="uitgaven" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recente transacties</h2>
            <Link to="/financien" className="text-xs text-blue-500">Bekijk alle</Link>
          </div>
          <div className="space-y-2">
            {recentTx.map(t => (
              <div key={t.id} className="flex justify-between text-sm">
                <div className="truncate flex-1 mr-2">
                  <div className="truncate">{t.description || '-'}</div>
                  <div className="text-xs text-slate-400">{formatDate(t.date)}</div>
                </div>
                <span className={t.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
            {recentTx.length === 0 && <p className="text-sm text-slate-400">Geen transacties</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Actieve projecten</h2>
            <Link to="/projecten" className="text-xs text-blue-500">Bekijk alle</Link>
          </div>
          <div className="space-y-2">
            {activeProjects.map(p => (
              <div key={p.id} className="text-sm">
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-slate-400">{p.client || 'Geen klant'} {p.deadline ? `• ${formatDate(p.deadline)}` : ''}</div>
              </div>
            ))}
            {activeProjects.length === 0 && <p className="text-sm text-slate-400">Geen actieve projecten</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Urgente taken</h2>
            <Link to="/taken" className="text-xs text-blue-500">Bekijk alle</Link>
          </div>
          <div className="space-y-2">
            {urgentTodos.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <AlertCircle size={14} className={t.priority === 'hoog' ? 'text-red-500' : 'text-amber-500'} />
                <span className="truncate">{t.title}</span>
              </div>
            ))}
            {urgentTodos.length === 0 && <p className="text-sm text-slate-400">Geen urgente taken</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
