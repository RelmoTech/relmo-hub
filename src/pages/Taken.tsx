import { useState, useMemo } from 'react'
import { Plus, Check, Trash2, Edit2, X } from 'lucide-react'
import { useTodos, useProjects, useActivities } from '@/hooks/useSupabase'
import { useActivityFilter } from '@/hooks/useActivityFilter'
import { useLanguage } from '@/hooks/useLanguage'
import { isToday, isThisWeek, isBefore, addDays } from 'date-fns'
import { formatDate } from '@/lib/utils'
import type { Todo } from '@/types'

const PRIORITY_COLORS = { hoog: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', normaal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', laag: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' }

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
  const [modal, setModal] = useState<Todo | null>(null)

  const groups = useMemo(() => {
    const now = new Date()
    const vandaag: Todo[] = []
    const dezeWeek: Todo[] = []
    const later: Todo[] = []
    const afgerond: Todo[] = []

    for (const todo of todos) {
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
    })
    setNewTitle('')
    setNewDate('')
  }

  const handleSave = async () => {
    if (!modal) return
    await upsert(modal)
    setModal(null)
  }

  const priorityLabel = (p: Todo['priority']) => p === 'hoog' ? t('high') : p === 'laag' ? t('low') : t('normal')
  const getActivityColor = (id: string | null) => activities.find(a => a.id === id)?.color

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('taken')}</h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
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
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs" />
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {groups.map(group => (
        <div key={group.label}>
          <h2 className="text-sm font-semibold text-slate-500 mb-2">{group.label} ({group.items.length})</h2>
          <div className="space-y-1">
            {group.items.map(todo => (
              <div key={todo.id} className="bg-white dark:bg-slate-900 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <button
                  onClick={() => toggle(todo.id, !todo.done)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    todo.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {todo.done && <Check size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${todo.done ? 'line-through text-slate-400' : ''}`}>{todo.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {todo.due_date && <span className="text-xs text-slate-400">{formatDate(todo.due_date)}</span>}
                    {todo.notes && <span className="text-xs text-slate-400 truncate max-w-[200px]">{todo.notes}</span>}
                    {todo.activity_id && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getActivityColor(todo.activity_id) }} />
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[todo.priority]}`}>{priorityLabel(todo.priority)}</span>
                <button onClick={() => setModal(todo)} className="text-slate-400 hover:text-blue-500">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => remove(todo.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {group.items.length === 0 && <p className="text-xs text-slate-400 py-2">{t('noTasks')}</p>}
          </div>
        </div>
      ))}

      {/* Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t('editTask')}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('taskTitle')}</label>
                <input
                  value={modal.title}
                  onChange={e => setModal({ ...modal, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                />
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
                  <input
                    type="date"
                    value={modal.due_date || ''}
                    onChange={e => setModal({ ...modal, due_date: e.target.value || null })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                  />
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
                <label className="text-xs text-slate-500 block mb-1">{t('notes')}</label>
                <textarea
                  value={modal.notes || ''}
                  onChange={e => setModal({ ...modal, notes: e.target.value || null })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-none"
                  placeholder="Notities..."
                />
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
