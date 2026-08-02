import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Search, Trash2, Plus, X } from 'lucide-react'
import { useTransactions, useCategories, useActivities } from '@/hooks/useSupabase'
import { useActivityFilter } from '@/hooks/useActivityFilter'
import { formatCurrency, formatDate } from '@/lib/utils'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns'
import { nl } from 'date-fns/locale'

type Tab = 'overzicht' | 'transacties'
type Period = 'week' | 'maand' | 'jaar'
type TxType = 'uitgave' | 'inkomst'

const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6B7280']

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: '',
  category: '',
  activity_id: '',
  cost_type: 'variabel' as 'variabel' | 'vast',
  txType: 'uitgave' as TxType,
}

export function Financien() {
  const [tab, setTab] = useState<Tab>('overzicht')
  const { selectedActivityId } = useActivityFilter()
  const { transactions, update, remove, insert } = useTransactions(selectedActivityId)
  const { categories } = useCategories()
  const { activities } = useActivities()
  const [period, setPeriod] = useState<Period>('maand')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [selectedIncomeCat, setSelectedIncomeCat] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterCostType, setFilterCostType] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<string>('')

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories])
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories])

  const incomeCatFilters = ['Freelance', 'E-commerce', 'Websites', 'Applicaties']

  const now = new Date()
  const dateRange = useMemo(() => {
    if (period === 'week') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    if (period === 'maand') return { start: startOfMonth(now), end: endOfMonth(now) }
    return { start: startOfYear(now), end: endOfYear(now) }
  }, [period, now])

  const catFiltered = useMemo(() => {
    if (!selectedIncomeCat) return transactions
    return transactions.filter(t => t.category === selectedIncomeCat)
  }, [transactions, selectedIncomeCat])

  const filtered = useMemo(() => {
    return catFiltered.filter(t => {
      const d = new Date(t.date)
      return d >= dateRange.start && d <= dateRange.end
    })
  }, [catFiltered, dateRange])

  const searchFiltered = useMemo(() => {
    let result = catFiltered
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(t =>
        t.description?.toLowerCase().includes(s) ||
        t.category?.toLowerCase().includes(s) ||
        t.supplier?.toLowerCase().includes(s)
      )
    }
    if (filterCategory) {
      result = result.filter(t => t.category === filterCategory)
    }
    if (filterCostType) {
      result = result.filter(t => t.cost_type === filterCostType)
    }
    if (filterMonth) {
      result = result.filter(t => t.date.startsWith(filterMonth))
    }
    return result
  }, [catFiltered, search, filterCategory, filterCostType, filterMonth])

  const chartData = useMemo(() => {
    const months = period === 'jaar' ? 12 : 6
    return Array.from({ length: months }, (_, i) => {
      const month = subMonths(now, months - 1 - i)
      const ms = startOfMonth(month)
      const me = endOfMonth(month)
      const txs = catFiltered.filter(t => { const d = new Date(t.date); return d >= ms && d <= me })
      return {
        period: format(month, 'MMM', { locale: nl }),
        inkomsten: txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
        uitgaven: txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      }
    })
  }, [transactions, period, now])

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    filtered.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category || 'Andere'
      map.set(cat, (map.get(cat) || 0) + Math.abs(t.amount))
    })
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const incomeCategoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    filtered.filter(t => t.amount > 0).forEach(t => {
      const cat = t.category || 'Andere'
      map.set(cat, (map.get(cat) || 0) + t.amount)
    })
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const handleSubmit = async () => {
    const amt = parseFloat(form.amount.replace(',', '.'))
    if (!form.date || isNaN(amt)) return
    const signedAmount = form.txType === 'uitgave' ? -Math.abs(amt) : Math.abs(amt)
    await insert({
      date: form.date,
      description: form.description || null,
      amount: signedAmount,
      category: form.category || null,
      activity_id: form.activity_id || null,
      cost_type: form.txType === 'uitgave' ? form.cost_type : 'variabel',
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overzicht', label: 'Overzicht' },
    { key: 'transacties', label: 'Transacties' },
  ]

  const currentCategories = form.txType === 'uitgave' ? expenseCategories : incomeCategories

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financiën</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          <Plus size={16} /> Nieuwe transactie
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedIncomeCat(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            !selectedIncomeCat
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Alle
        </button>
        {incomeCatFilters.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedIncomeCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedIncomeCat === cat
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              tab === t.key ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* New transaction modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Nieuwe transactie</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setForm({ ...form, txType: 'uitgave', category: '' })}
                className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                  form.txType === 'uitgave' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Uitgave
              </button>
              <button
                onClick={() => setForm({ ...form, txType: 'inkomst', category: '', cost_type: 'variabel' })}
                className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                  form.txType === 'inkomst' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Inkomst
              </button>
            </div>

            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
            />
            <input
              placeholder="Omschrijving"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
            />
            <input
              placeholder="Bedrag (€)"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
              inputMode="decimal"
            />

            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
            >
              <option value="">Kies categorie...</option>
              {currentCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            {form.txType === 'uitgave' && (
              <select
                value={form.activity_id}
                onChange={e => setForm({ ...form, activity_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
              >
                <option value="">Geen activiteit</option>
                {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}

            {form.txType === 'uitgave' && (
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setForm({ ...form, cost_type: 'variabel' })}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    form.cost_type === 'variabel' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500'
                  }`}
                >
                  Variabel
                </button>
                <button
                  onClick={() => setForm({ ...form, cost_type: 'vast' })}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    form.cost_type === 'vast' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500'
                  }`}
                >
                  Vast
                </button>
              </div>
            )}

            <button
              onClick={handleSubmit}
              className={`w-full py-2.5 text-white rounded-lg text-sm font-medium ${
                form.txType === 'uitgave' ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            >
              {form.txType === 'uitgave' ? 'Uitgave toevoegen' : 'Inkomst toevoegen'}
            </button>
          </div>
        </div>
      )}

      {tab === 'overzicht' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['week', 'maand', 'jaar'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs rounded-full ${
                  period === p ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold mb-3">Inkomsten vs Uitgaven</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="inkomsten" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="uitgaven" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold mb-3">Uitgaven per categorie</h3>
              {categoryTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={categoryTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {categoryTotals.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 py-20 text-center">Geen data</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold mb-3">Inkomsten per categorie</h3>
              {incomeCategoryTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={incomeCategoryTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {incomeCategoryTotals.map((_, i) => (
                        <Cell key={i} fill={['#10B981', '#34D399', '#8B5CF6', '#3B82F6', '#F59E0B', '#06B6D4'][i % 6]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 py-20 text-center">Geen data</p>}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold mb-3">Inkomsten per categorie</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b dark:border-slate-700">
                      <th className="pb-2">Categorie</th>
                      <th className="pb-2 text-right">Bedrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeCategoryTotals.map(c => (
                      <tr key={c.name} className="border-b dark:border-slate-700/50">
                        <td className="py-2">{c.name}</td>
                        <td className="py-2 text-right text-emerald-500">{formatCurrency(c.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold mb-3">Uitgaven per categorie</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b dark:border-slate-700">
                    <th className="pb-2">Categorie</th>
                    <th className="pb-2 text-right">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTotals.map(c => (
                    <tr key={c.name} className="border-b dark:border-slate-700/50">
                      <td className="py-2">{c.name}</td>
                      <td className="py-2 text-right text-red-500">{formatCurrency(-c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'transacties' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Zoek transacties..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">Alle categorieën</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select
              value={filterCostType}
              onChange={e => setFilterCostType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">Alle types</option>
              <option value="vast">Vast</option>
              <option value="variabel">Variabel</option>
            </select>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">Alle maanden</option>
              <option value="2026-01">Januari</option>
              <option value="2026-02">Februari</option>
              <option value="2026-03">Maart</option>
              <option value="2026-04">April</option>
              <option value="2026-05">Mei</option>
              <option value="2026-06">Juni</option>
              <option value="2026-07">Juli</option>
              <option value="2026-08">Augustus</option>
              <option value="2026-09">September</option>
              <option value="2026-10">Oktober</option>
              <option value="2026-11">November</option>
              <option value="2026-12">December</option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b dark:border-slate-700">
                  <th className="p-3">Datum</th>
                  <th className="p-3">Omschrijving</th>
                  <th className="p-3">Bedrag</th>
                  <th className="p-3">Categorie</th>
                  <th className="p-3">Activiteit</th>
                  <th className="p-3">Type</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {searchFiltered.map(t => (
                  <tr key={t.id} className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="p-3 max-w-xs truncate">{t.description || '-'}</td>
                    <td className={`p-3 whitespace-nowrap font-medium ${t.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="p-3">
                      <select
                        value={t.category || ''}
                        onChange={e => update(t.id, { category: e.target.value })}
                        className="text-xs bg-transparent border border-slate-200 dark:border-slate-600 rounded px-2 py-1"
                      >
                        <option value="">-</option>
                        {(t.amount >= 0 ? incomeCategories : expenseCategories).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={t.activity_id || ''}
                        onChange={e => update(t.id, { activity_id: e.target.value || null })}
                        className="text-xs bg-transparent border border-slate-200 dark:border-slate-600 rounded px-2 py-1"
                      >
                        <option value="">-</option>
                        {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      {t.amount < 0 && (
                        <select
                          value={t.cost_type || 'variabel'}
                          onChange={e => update(t.id, { cost_type: e.target.value as 'variabel' | 'vast' })}
                          className="text-xs bg-transparent border border-slate-200 dark:border-slate-600 rounded px-2 py-1"
                        >
                          <option value="variabel">Variabel</option>
                          <option value="vast">Vast</option>
                        </select>
                      )}
                    </td>
                    <td className="p-3">
                      <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {searchFiltered.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Geen transacties gevonden</p>}
          </div>

          {searchFiltered.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-slate-500">Transacties: </span>
                <span className="font-medium">{searchFiltered.length}</span>
              </div>
              <div>
                <span className="text-slate-500">Inkomsten: </span>
                <span className="font-medium text-emerald-500">
                  {formatCurrency(searchFiltered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Uitgaven: </span>
                <span className="font-medium text-red-500">
                  {formatCurrency(searchFiltered.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Netto: </span>
                <span className={`font-bold ${searchFiltered.reduce((s, t) => s + t.amount, 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(searchFiltered.reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
