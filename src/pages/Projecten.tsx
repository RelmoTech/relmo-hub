import { useState, useMemo } from 'react'
import { Plus, X, ArrowLeft, FolderKanban } from 'lucide-react'
import { useProjects, useTodos } from '@/hooks/useSupabase'
import { useLanguage } from '@/hooks/useLanguage'
import type { Project, Todo } from '@/types'

const PROJECT_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']

export function Projecten() {
  const { projects, upsert: upsertProject, remove: removeProject } = useProjects()
  const { todos, upsert: upsertTodo, remove: removeTodo } = useTodos()
  const { t } = useLanguage()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [projectModal, setProjectModal] = useState<Partial<Project> | null>(null)
  const [taskModal, setTaskModal] = useState<Partial<Todo> | null>(null)

  const KANBAN_COLUMNS = [
    { key: 'todo', label: t('todo'), color: 'bg-slate-400' },
    { key: 'in-progress', label: t('inProgress'), color: 'bg-blue-500' },
    { key: 'review', label: t('review'), color: 'bg-amber-500' },
    { key: 'done', label: t('finished'), color: 'bg-emerald-500' },
  ]

  const activeProject = projects.find(p => p.id === activeProjectId)
  const projectTodos = useMemo(() => todos.filter(todo => todo.project_id === activeProjectId), [todos, activeProjectId])

  const handleSaveProject = async () => {
    if (!projectModal?.title) return
    await upsertProject(projectModal)
    setProjectModal(null)
  }

  const handleSaveTask = async () => {
    if (!taskModal?.title) return
    await upsertTodo({ ...taskModal, project_id: activeProjectId, kanban_column: taskModal.kanban_column || 'todo' } as Partial<Todo>)
    setTaskModal(null)
  }

  const handleDragStart = (e: React.DragEvent, todoId: string) => {
    e.dataTransfer.setData('todoId', todoId)
  }

  const handleDrop = async (e: React.DragEvent, column: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('todoId')
    if (id) await upsertTodo({ id, kanban_column: column, done: column === 'done' } as Partial<Todo>)
  }

  const priorityLabel = (p: Todo['priority']) => p === 'hoog' ? t('high') : p === 'laag' ? t('low') : t('normal')

  if (!activeProjectId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('projecten')}</h1>
          <button onClick={() => setProjectModal({ status: 'actief' })} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
            <Plus size={16} /> {t('newProject')}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.map((p, i) => {
            const taskCount = todos.filter(todo => todo.project_id === p.id).length
            const doneCount = todos.filter(todo => todo.project_id === p.id && todo.done).length
            return (
              <div key={p.id} onClick={() => setActiveProjectId(p.id)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] + '20' }}>
                    <FolderKanban size={20} style={{ color: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-blue-500 transition-colors">{p.title}</h3>
                    {p.client && <p className="text-xs text-slate-400">{p.client}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{taskCount} {t('tasks')}</span>
                  {taskCount > 0 && <span>{Math.round((doneCount / taskCount) * 100)}% {t('done')}</span>}
                </div>
                {taskCount > 0 && (
                  <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(doneCount / taskCount) * 100}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {projects.length === 0 && <p className="text-center text-slate-400 py-12 text-sm">{t('noProjects')}</p>}

        {projectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProjectModal(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{projectModal.id ? t('editProject') : t('newProject')}</h2>
                <button onClick={() => setProjectModal(null)}><X size={18} /></button>
              </div>
              <input placeholder={t('projectName')} value={projectModal.title || ''} onChange={e => setProjectModal({ ...projectModal, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              <input placeholder={t('client')} value={projectModal.client || ''} onChange={e => setProjectModal({ ...projectModal, client: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              <textarea placeholder={t('notes')} value={projectModal.notes || ''} onChange={e => setProjectModal({ ...projectModal, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm h-20" />
              <div className="flex gap-2">
                <button onClick={handleSaveProject} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">{t('save')}</button>
                {projectModal.id && (
                  <button onClick={() => { removeProject(projectModal.id!); setProjectModal(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">{t('delete')}</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveProjectId(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold">{activeProject?.title}</h1>
          <button onClick={() => setProjectModal(activeProject || {})} className="text-xs text-slate-400 hover:text-blue-500">{t('edit')}</button>
        </div>
        <button onClick={() => setTaskModal({ kanban_column: 'todo', priority: 'normaal' })} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
          <Plus size={16} /> {t('newTask')}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KANBAN_COLUMNS.map(col => {
          const colTodos = projectTodos.filter(todo => (todo as Todo & { kanban_column?: string }).kanban_column === col.key || (!('kanban_column' in todo) && col.key === 'todo'))
          return (
            <div key={col.key} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col.key)} className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3 min-h-[300px]">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${col.color}`} />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{col.label}</h3>
                <span className="text-xs text-slate-400 ml-auto">{colTodos.length}</span>
              </div>
              <div className="space-y-2">
                {colTodos.map(todo => (
                  <div key={todo.id} draggable onDragStart={e => handleDragStart(e, todo.id)} onClick={() => setTaskModal(todo)} className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium">{todo.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${todo.priority === 'hoog' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : todo.priority === 'laag' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {priorityLabel(todo.priority)}
                      </span>
                      {todo.due_date && <span className="text-xs text-slate-400">{todo.due_date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {taskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setTaskModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{taskModal.id ? t('editTask') : t('newTask')}</h2>
              <button onClick={() => setTaskModal(null)}><X size={18} /></button>
            </div>
            <input placeholder={t('taskTitle')} value={taskModal.title || ''} onChange={e => setTaskModal({ ...taskModal, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
            <select value={(taskModal as Todo & { kanban_column?: string }).kanban_column || 'todo'} onChange={e => setTaskModal({ ...taskModal, kanban_column: e.target.value } as Partial<Todo>)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm">
              {KANBAN_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={taskModal.priority || 'normaal'} onChange={e => setTaskModal({ ...taskModal, priority: e.target.value as Todo['priority'] })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm">
              <option value="hoog">{t('high')}</option>
              <option value="normaal">{t('normal')}</option>
              <option value="laag">{t('low')}</option>
            </select>
            <input type="date" value={taskModal.due_date || ''} onChange={e => setTaskModal({ ...taskModal, due_date: e.target.value || null })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
            <textarea placeholder={t('taskNotes')} value={(taskModal as Todo & { notes?: string }).notes || ''} onChange={e => setTaskModal({ ...taskModal, notes: e.target.value } as Partial<Todo>)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm h-32" />
            <div className="flex gap-2">
              <button onClick={handleSaveTask} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">{t('save')}</button>
              {taskModal.id && (
                <button onClick={() => { removeTodo(taskModal.id!); setTaskModal(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">{t('delete')}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {projectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProjectModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t('editProject')}</h2>
              <button onClick={() => setProjectModal(null)}><X size={18} /></button>
            </div>
            <input placeholder={t('projectName')} value={projectModal.title || ''} onChange={e => setProjectModal({ ...projectModal, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
            <input placeholder={t('client')} value={projectModal.client || ''} onChange={e => setProjectModal({ ...projectModal, client: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
            <textarea placeholder={t('notes')} value={projectModal.notes || ''} onChange={e => setProjectModal({ ...projectModal, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm h-20" />
            <div className="flex gap-2">
              <button onClick={handleSaveProject} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">{t('save')}</button>
              <button onClick={() => { removeProject(projectModal.id!); setProjectModal(null); setActiveProjectId(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
