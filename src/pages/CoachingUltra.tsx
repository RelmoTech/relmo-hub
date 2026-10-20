import { useState, useMemo } from 'react'
import { Check, ChevronDown, ChevronUp, ExternalLink, Plus, Trash2, Edit2, X, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCoachingActions } from '@/hooks/useSupabase'
import type { CoachingAction } from '@/types'

const CATEGORIES: CoachingAction['category'][] = ['prospectie', 'marketing', 'organisatie', 'dashboard', 'overig']

const CAT_COLORS: Record<CoachingAction['category'], string> = {
  prospectie: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  marketing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  organisatie: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  dashboard: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  overig: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}

const CAT_LABEL: Record<CoachingAction['category'], string> = {
  prospectie: 'Prospectie',
  marketing: 'Marketing',
  organisatie: 'Organisatie',
  dashboard: 'Dashboard',
  overig: 'Overig',
}

export function CoachingUltra() {
  const { actions, loading, upsert, toggle, remove, bulkInsert } = useCoachingActions()
  const [filterCat, setFilterCat] = useState<CoachingAction['category'] | 'alle'>('alle')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [editModal, setEditModal] = useState<CoachingAction | null>(null)
  const [newWeekOpen, setNewWeekOpen] = useState(false)
  const [newWeekNum, setNewWeekNum] = useState<number>(0)
  const [newWeekText, setNewWeekText] = useState('')
  const [newWeekCat, setNewWeekCat] = useState<CoachingAction['category']>('overig')

  const weeks = useMemo(() => {
    const map = new Map<number, CoachingAction[]>()
    for (const a of actions) {
      if (!map.has(a.week)) map.set(a.week, [])
      map.get(a.week)!.push(a)
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0])
  }, [actions])

  const maxWeek = weeks[0]?.[0] ?? 1

  const filteredActions = (list: CoachingAction[]) =>
    list.filter(a =>
      (filterCat === 'alle' || a.category === filterCat) &&
      (!onlyOpen || !a.done)
    )

  const toggleCollapse = (week: number) =>
    setCollapsed(p => ({ ...p, [week]: !p[week] }))

  const isOpen = (week: number) => {
    if (collapsed[week] !== undefined) return !collapsed[week]
    return week === maxWeek
  }

  const handleAddWeek = async () => {
    if (!newWeekText.trim() || !newWeekNum) return
    const lines = newWeekText
      .split('\n')
      .map(l => l.replace(/^[\s\-\*\•\d\.]+/, '').trim())
      .filter(Boolean)
    const rows: Partial<CoachingAction>[] = lines.map((title, i) => ({
      week: newWeekNum,
      title,
      category: newWeekCat,
      done: false,
      sort_order: i + 1,
    }))
    await bulkInsert(rows)
    setNewWeekOpen(false)
    setNewWeekText('')
    setNewWeekNum(0)
  }

  const handleSaveEdit = async () => {
    if (!editModal) return
    await upsert(editModal)
    setEditModal(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Laden...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Zap size={22} className="text-amber-400" />
          <h1 className="text-2xl font-bold">Coaching ULTRA</h1>
        </div>
        <button
          onClick={() => { setNewWeekOpen(true); setNewWeekNum(maxWeek + 1) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          <Plus size={16} /> Nouvelle semaine
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilterCat('alle')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === 'alle' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
        >Alle</button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === c ? CAT_COLORS[c] + ' ring-2 ring-current/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >{CAT_LABEL[c]}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setOnlyOpen(p => !p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${onlyOpen ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >Alleen open</button>
        </div>
      </div>

      {/* Week cards */}
      {weeks.map(([week, allItems]) => {
        const items = filteredActions(allItems)
        const total = allItems.length
        const done = allItems.filter(a => a.done).length
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        const open = isOpen(week)

        return (
          <div key={week} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Week header */}
            <button
              onClick={() => toggleCollapse(week)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="font-semibold flex-1 text-left">Semaine {week}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${done === total ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                {done}/{total}
              </span>
              {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {/* Progress bar */}
            <div className="px-5 pb-0">
              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            {open && (
              <div className="divide-y dark:divide-slate-700/50 mt-2">
                {items.length === 0 && (
                  <p className="text-sm text-slate-400 px-5 py-4">Geen acties voor deze filter.</p>
                )}
                {items.map(action => (
                  <div key={action.id} className="flex items-start gap-3 px-5 py-3 group">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggle(action.id, !action.done)}
                      className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        action.done
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                      }`}
                    >
                      {action.done && <Check size={11} className="text-white" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${action.done ? 'line-through text-slate-400' : ''}`}>
                        {action.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[action.category]}`}>
                          {CAT_LABEL[action.category]}
                        </span>
                        {action.due_date && (
                          <span className="text-xs text-slate-400">📅 {action.due_date}</span>
                        )}
                        {action.linked_module && (
                          <Link to={action.linked_module} className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                            <ExternalLink size={10} /> {action.linked_module}
                          </Link>
                        )}
                        {action.done && action.done_at && (
                          <span className="text-xs text-emerald-500">
                            ✓ {new Date(action.done_at).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {action.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic">{action.notes}</p>
                      )}
                    </div>

                    {/* Actions buttons */}
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditModal(action)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={13} /></button>
                      <button onClick={() => remove(action.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}

                {/* Add single action */}
                <AddActionRow week={week} nextOrder={allItems.length + 1} onAdd={upsert} />
              </div>
            )}
          </div>
        )
      })}

      {/* Nouvelle semaine modal */}
      {newWeekOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNewWeekOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Nouvelle semaine</h2>
              <button onClick={() => setNewWeekOpen(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Numéro de semaine</label>
                <input
                  type="number"
                  min="1"
                  value={newWeekNum || ''}
                  onChange={e => setNewWeekNum(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                  placeholder="ex. 11"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Catégorie par défaut</label>
                <select value={newWeekCat} onChange={e => setNewWeekCat(e.target.value as CoachingAction['category'])} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Actions (une par ligne — tirets et numéros acceptés)</label>
              <textarea
                value={newWeekText}
                onChange={e => setNewWeekText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-y font-mono"
                placeholder={"1. Première action\n2. Deuxième action\n- Troisième action"}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddWeek} disabled={!newWeekText.trim() || !newWeekNum} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-40">
                Ajouter {newWeekText.split('\n').filter(l => l.trim()).length} actions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Modifier l'action</h2>
              <button onClick={() => setEditModal(null)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Action</label>
                <textarea
                  value={editModal.title}
                  onChange={e => setEditModal({ ...editModal, title: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Catégorie</label>
                  <select
                    value={editModal.category}
                    onChange={e => setEditModal({ ...editModal, category: e.target.value as CoachingAction['category'] })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Date limite</label>
                  <input
                    type="date"
                    value={editModal.due_date || ''}
                    onChange={e => setEditModal({ ...editModal, due_date: e.target.value || null })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Module lié</label>
                <input
                  value={editModal.linked_module || ''}
                  onChange={e => setEditModal({ ...editModal, linked_module: e.target.value || null })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                  placeholder="ex. /prospection"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Notes — ce que j'ai fait concrètement</label>
                <textarea
                  value={editModal.notes || ''}
                  onChange={e => setEditModal({ ...editModal, notes: e.target.value || null })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-none"
                  placeholder="Résultat concret, décision prise..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">Enregistrer</button>
              <button onClick={() => { remove(editModal.id); setEditModal(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddActionRow({ week, nextOrder, onAdd }: { week: number; nextOrder: number; onAdd: (a: Partial<CoachingAction>) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [cat, setCat] = useState<CoachingAction['category']>('overig')

  const save = async () => {
    if (!title.trim()) return
    await onAdd({ week, title, category: cat, done: false, sort_order: nextOrder })
    setTitle('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <Plus size={13} /> Ajouter une action
      </button>
    )
  }

  return (
    <div className="px-5 py-3 flex flex-wrap gap-2 items-center bg-slate-50 dark:bg-slate-800/30">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="Nouvelle action..."
        className="flex-1 min-w-[200px] px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
      />
      <select value={cat} onChange={e => setCat(e.target.value as CoachingAction['category'])} className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs">
        {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
      </select>
      <button onClick={save} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs">Ajouter</button>
      <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-slate-400 hover:text-slate-600 text-xs">Annuler</button>
    </div>
  )
}
