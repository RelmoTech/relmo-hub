import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/hooks/useLanguage'

interface Note {
  id: string
  title: string
  content: string | null
  color: string
  created_at: string
  updated_at: string
}

const COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#EC4899', '#06B6D4', '#F97316']

export function Brainstorm() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const { t } = useLanguage()

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase.from('notes').select('*').order('updated_at', { ascending: false })
    setNotes(data || [])
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const createNote = async () => {
    await supabase.from('notes').insert({
      title: t('newNote'),
      content: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    })
    const { data: all } = await supabase.from('notes').select('*').order('updated_at', { ascending: false })
    if (all) {
      setNotes(all)
      setActiveNote(all[0])
    }
  }

  const deleteNote = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(notes.filter(n => n.id !== id))
    if (activeNote?.id === id) setActiveNote(null)
  }

  const updateNote = (field: 'title' | 'content' | 'color', value: string) => {
    if (!activeNote) return
    const updated = { ...activeNote, [field]: value }
    setActiveNote(updated)
    setNotes(notes.map(n => n.id === updated.id ? updated : n))

    if (saveTimer) clearTimeout(saveTimer)
    setSaveTimer(setTimeout(async () => {
      await supabase.from('notes').update({
        [field]: value,
        updated_at: new Date().toISOString(),
      }).eq('id', updated.id)
    }, 500))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('brainstorm')}</h1>
        <button
          onClick={createNote}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          <Plus size={16} /> {t('newNote')}
        </button>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {notes.map(n => (
            <div
              key={n.id}
              onClick={() => setActiveNote(n)}
              className={`rounded-lg p-3 cursor-pointer border transition-all ${
                activeNote?.id === n.id
                  ? 'border-blue-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              } bg-white dark:bg-slate-900`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: n.color }} />
                  <span className="text-sm font-medium truncate">{n.title || t('untitled')}</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteNote(n.id) }}
                  className="text-slate-400 hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate">{n.content || t('noContent')}</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(n.updated_at).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">{t('noNotes')}</p>
          )}
        </div>

        {activeNote ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateNote('color', c)}
                    className={`w-5 h-5 rounded-full transition-transform ${activeNote.color === c ? 'scale-125 ring-2 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <input
              value={activeNote.title}
              onChange={e => updateNote('title', e.target.value)}
              className="w-full text-xl font-bold bg-transparent border-none outline-none"
              placeholder={t('titlePlaceholder')}
            />
            <textarea
              value={activeNote.content || ''}
              onChange={e => updateNote('content', e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm leading-relaxed resize-none min-h-[400px]"
              placeholder={t('contentPlaceholder')}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-12 flex items-center justify-center">
            <p className="text-slate-400 text-sm">{t('noNoteSelected')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
