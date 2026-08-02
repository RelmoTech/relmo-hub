import { useState, useMemo } from 'react'
import { Plus, Check, Trash2 } from 'lucide-react'
import { useTodos, useProjects, useActivities } from '@/hooks/useSupabase'
import { useActivityFilter } from '@/hooks/useActivityFilter'
import { isToday, isThisWeek, isBefore, addDays } from 'date-fns'
import { formatDate } from '@/lib/utils'
import type { Todo } from '@/types'

const PRIORITY_COLORS = { hoog: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', normaal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', laag: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' }

export function Taken() {
  const { selectedActivityId } = useActivityFilter()
  const { todos, upsert, toggle, remove } = useTodos(selectedActivityId)
  const { projects } = useProjects()
  const { activities } = useActivities()
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Todo['priority']>('normaal')
  const [newProject, setNewProject] = useState('')
  const [newActivity, setNewActivity] = useState('')

  const groups = useMemo(() => {
    const now = new Date()
    const vandaag: Todo[] = []
    const dezeWeek: Todo[] = []
    const later: Todo[] = []
    const afgerond: Todo[] = []

    for (const t of todos) {
      if (t.done) { afgerond.push(t); continue }
      if (t.due_date && isToday(new Date(t.due_date))) vandaag.push(t)
      else if (t.due_date && isThisWeek(new Date(t.due_date), { weekStartsOn: 1 })) dezeWeek.push(t)
      else if (t.priority === 'hoog' && (!t.due_date || isBefore(new Date(t.due_date), addDays(now, 7)))) vandaag.push(t)
      else later.push(t)
    }

    return [
      { label: 'Vandaag', items: vandaag },
      { label: 'Deze week', items: dezeWeek },
      { label: 'Later', items: later },
      { label: 'Afgerond', items: afgerond },
    ]
  }, [todos])

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    await upsert({
      title: newTitle,
      priority: newPriority,
      project_id: newProject || null,
      activity_id: newActivity || selectedActivityId || null,
    })
    setNewTitle('')
  }

  const getActivityColor = (id: string | null) => activities.find(a => a.id === id)?.color

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Taken</h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Nieuwe taak..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
          />
          <select value={newPriority} onChange={e => setNewPriority(e.target.value as Todo['priority'])} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs">
            <option value="hoog">Hoog</option>
            <option value="normaal">Normaal</option>
            <option value="laag">Laag</option>
          </select>
          <select value={newProject} onChange={e => setNewProject(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs">
            <option value="">Geen project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select value={newActivity} onChange={e => setNewActivity(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs">
            <option value="">Geen activiteit</option>
            {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {groups.map(group => (
        <div key={group.label}>
          <h2 className="text-sm font-semibold text-slate-500 mb-2">{group.label} ({group.items.length})</h2>
          <div className="space-y-1">
            {group.items.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-900 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <button
                  onClick={() => toggle(t.id, !t.done)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    t.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {t.done && <Check size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${t.done ? 'line-through text-slate-400' : ''}`}>{t.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.due_date && <span className="text-xs text-slate-400">{formatDate(t.due_date)}</span>}
                    {t.activity_id && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getActivityColor(t.activity_id) }} />
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {group.items.length === 0 && <p className="text-xs text-slate-400 py-2">Geen taken</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
