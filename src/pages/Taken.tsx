import { useState, useMemo } from 'react'
import { Plus, Check, Trash2, Edit2, X, RefreshCw } from 'lucide-react'
import { useTodos, useProjects, useActivities } from '@/hooks/useSupabase'
import { useActivityFilter } from '@/hooks/useActivityFilter'
import { useLanguage } from '@/hooks/useLanguage'
import { isToday, isThisWeek, isBefore, addDays } from 'date-fns'
import { formatDate } from '@/lib/utils'
import type { Todo } from '@/types'

const PRIORITY_COLORS = { hoog: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', normaal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', laag: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' }
const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function todayStr() { return new Date().toISOString().split('T')[0] }
function todayDayIndex() { return (new Date().getDay() + 6) % 7 } // 0=Ma..6=Zo

function isRecurringDueToday(todo: Todo): boolean {
  if (!todo.recurrence) return false
  if (todo.last_done_date === todayStr()) return false // al gedaan vandaag
  if (todo.recurrence === 'daily') return true
  if (todo.recurrence === 'weekly') {
    const days = (todo.recurrence_days || '').split(',').map(Number)
    return days.includes(todayDayIndex())
  }
  return false
}

function RecurrencePicker({ value, days, onChange, onDaysChange }: {
  value: Todo['recurrence'], days: string, onChange: (v: Todo['recurrence']) => void, onDaysChange: (d: string) => void
}) {
  const selectedDays = days ? days.split(',').map(Number) : []
  const toggleDay = (d: number) => {
    const next = selectedDays.includes(d) ? selectedDays.filter(x => x !== d) : [...selectedDays, d].sort()
    onDaysChange(next.join(','))
  }
  return (
    <div className="space-y-2">
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium w-fit">
        <button type="button" onClick={() => onChange(null)} className={`px-3 py-1.5 rounded-md transition-colors ${!value ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Eénmalig</button>
        <button type="button" onClick={() => onChange('daily')} className={`px-3 py-1.5 rounded-md transition-colors ${value === 'daily' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Dagelijks</button>
        <button type="button" onClick={() => { onChange('weekly'); if (!days) onDaysChange(String(todayDayIndex())) }} className={`px-3 py-1.5 rounded-md transition-colors ${value === 'weekly' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Wekelijks</button>
      </div>
      {value === 'weekly' && (
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${selectedDays.includes(i) ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Taken() {
  const { selectedActivityId } = useActivityFilter()
  const { todos, upsert, toggle, remove } = useTodos(selectedActivityId)
  const { projects } = useProjects()
  const { activities } = useActivities()
  const { t } = useLanguage()
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Todo['priority']>('normaal')
  const [newProject, setNewProject] = useState('')
  const [newActivity, setNewActivity] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newRecurrence, setNewRecurrence] = useState<Todo['recurrence']>(null)
  const [newRecurrenceDays, setNewRecurrenceDays] = useState('')
  const [modal, setModal] = useState<Todo | null>(null)

  const groups = useMemo(() => {
    const now = new Date()
    const vandaag: Todo[] = []
    const dezeWeek: Todo[] = []
    const later: Todo[] = []
    const afgerond: Todo[] = []

    for (const todo of todos) {
      // Herhalende taken
      if (todo.recurrence) {
        if (isRecurringDueToday(todo)) { vandaag.push(todo); continue }
        if (todo.last_done_date === todayStr()) { afgerond.push(todo); continue }
        later.push(todo)
        continue
      }
      // Gewone taken
      if (todo.done) { afgerond.push(todo); continue }
      if (todo.due_date && isToday(new Date(todo.due_date))) vandaag.push(todo)
      else if (todo.due_date && isThisWeek(new Date(todo.due_date), { weekStartsOn: 1 })) dezeWeek.push(todo)
      else if (todo.priority === 'hoog' && (!todo.due_date || isBefore(new Date(todo.due_date), addDays(now, 7)))) vandaag.push(todo)
      else later.push(todo)
    }

    return [
      { label: t('today'), items: vandaag },
      { label: t('thisWeek'), items: dezeWeek },
      { label: t('later'), items: later },
      { label: t('finished'), items: afgerond },
    ]
  }, [todos, t])

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    await upsert({
      title: newTitle,
      priority: newPriority,
      project_id: newProject || null,
      activity_id: newActivity || selectedActivityId || null,
      due_date: newDate || null,
      recurrence: newRecurrence,
      recurrence_days: newRecurrence === 'weekly' ? newRecurrenceDays : null,
    })
    setNewTitle('')
    setNewDate('')
    setNewRecurrence(null)
    setNewRecurrenceDays('')
  }

  const handleSave = async () => {
    if (!modal) return
    await upsert(modal)
    setModal(null)
  }

  const handleToggle = (todo: Todo, checked: boolean) => {
    toggle(todo.id, checked, !!todo.recurrence)
  }

  const isDoneToday = (todo: Todo) => todo.recurrence ? todo.last_done_date === todayStr() : todo.done

  const priorityLabel = (p: Todo['priority']) => p === 'hoog' ? t('high') : p === 'laag' ? t('low') : t('normal')
  const getActivityColor = (id: string | null) => activities.find(a => a.id === id)?.color

  const recurrenceLabel = (todo: Todo) => {
    if (!todo.recurrence) return null
    if (todo.recurrence === 'daily') return 'Dagelijks'
    if (todo.recurrence === 'weekly') {
      const days = (todo.recurrence_days || '').split(',').map(Number).map(d => DAY_LABELS[d]).join(', ')
      return `Wekelijks: ${days}`
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('taken')}</h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder={t('newTaskPlaceholder')}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
          />
          <select value={newPriority} onChange={e => setNewPriority(e.target.value as Todo['priority'])} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs">
            <option value="hoog">{t('high')}</option>
            <option value="normaal">{t('normal')}</option>
            <option value="laag">{t('low')}</option>
          </select>
          <select value={newProject} onChange={e => setNewProject(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs">
            <option value="">{t('noProject')}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select value={newActivity} onChange={e => setNewActivity(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs">
            <option value="">{t('noActivity')}</option>
            {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {!newRecurrence && (
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs" />
          )}
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
            <Plus size={16} />
          </button>
        </div>
        <RecurrencePicker value={newRecurrence} days={newRecurrenceDays} onChange={setNewRecurrence} onDaysChange={setNewRecurrenceDays} />
      </div>

      {groups.map(group => (
        <div key={group.label}>
          <h2 className="text-sm font-semibold text-slate-500 mb-2">{group.label} ({group.items.length})</h2>
          <div className="space-y-1">
            {group.items.map(todo => {
              const done = isDoneToday(todo)
              return (
                <div key={todo.id} className="bg-white dark:bg-slate-900 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(todo, !done)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}
                  >
                    {done && <Check size={12} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${done ? 'line-through text-slate-400' : ''}`}>{todo.title}</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {todo.recurrence && (
                        <span className="flex items-center gap-1 text-xs text-blue-500">
                          <RefreshCw size={10} /> {recurrenceLabel(todo)}
                        </span>
                      )}
                      {!todo.recurrence && todo.due_date && <span className="text-xs text-slate-400">{formatDate(todo.due_date)}</span>}
                      {todo.notes && <span className="text-xs text-slate-400 truncate max-w-[200px]">{todo.notes}</span>}
                      {todo.activity_id && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getActivityColor(todo.activity_id) }} />}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[todo.priority]}`}>{priorityLabel(todo.priority)}</span>
                  <button onClick={() => setModal(todo)} className="text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                  <button onClick={() => remove(todo.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              )
            })}
            {group.items.length === 0 && <p className="text-xs text-slate-400 py-2">{t('noTasks')}</p>}
          </div>
        </div>
      ))}

      {/* Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t('editTask')}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('taskTitle')}</label>
                <input value={modal.title} onChange={e => setModal({ ...modal, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">{t('priority')}</label>
                  <select value={modal.priority} onChange={e => setModal({ ...modal, priority: e.target.value as Todo['priority'] })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm">
                    <option value="hoog">{t('high')}</option>
                    <option value="normaal">{t('normal')}</option>
                    <option value="laag">{t('low')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">{t('deadline')}</label>
                  <input type="date" value={modal.due_date || ''} onChange={e => setModal({ ...modal, due_date: e.target.value || null })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" disabled={!!modal.recurrence} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('activity')}</label>
                <select value={modal.activity_id || ''} onChange={e => setModal({ ...modal, activity_id: e.target.value || null })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm">
                  <option value="">{t('noActivity')}</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Herhaling</label>
                <RecurrencePicker
                  value={modal.recurrence}
                  days={modal.recurrence_days || ''}
                  onChange={v => setModal({ ...modal, recurrence: v, recurrence_days: v === 'weekly' ? (modal.recurrence_days || String(todayDayIndex())) : null })}
                  onDaysChange={d => setModal({ ...modal, recurrence_days: d })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('notes')}</label>
                <textarea value={modal.notes || ''} onChange={e => setModal({ ...modal, notes: e.target.value || null })} rows={3} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-none" placeholder="Notities..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">{t('save')}</button>
              <button onClick={() => { remove(modal.id); setModal(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
