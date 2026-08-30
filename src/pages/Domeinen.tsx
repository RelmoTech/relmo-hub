import { useState, useMemo } from 'react'
import { Plus, X, Trash2, Edit2, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useReservations } from '@/hooks/useSupabase'
import { supabase } from '@/lib/supabase'
import { useEffect, useCallback } from 'react'

interface Domein {
  id: string
  naam: string
  klant: string | null
  type: 'domein' | 'hosting' | 'licentie' | 'ssl' | 'andere'
  vervaldatum: string
  prijs_jaar: number | null
  notities: string | null
  actief: boolean
  created_at: string
}

function useDomeinen() {
  const [domeinen, setDomeinen] = useState<Domein[]>([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('domeinen').select('*').order('vervaldatum', { ascending: true })
    setDomeinen(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (d: Partial<Domein>) => {
    if (d.id) {
      await supabase.from('domeinen').update(d).eq('id', d.id)
    } else {
      await supabase.from('domeinen').insert(d)
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('domeinen').delete().eq('id', id)
    fetch()
  }

  return { domeinen, upsert, remove }
}

const TYPE_LABELS: Record<string, string> = {
  domein: 'Domein',
  hosting: 'Hosting',
  licentie: 'Licentie',
  ssl: 'SSL',
  andere: 'Andere',
}

const TYPE_COLORS: Record<string, string> = {
  domein: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  hosting: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  licentie: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ssl: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  andere: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

const empty: Partial<Domein> = {
  naam: '', klant: '', type: 'domein', vervaldatum: '', prijs_jaar: undefined, notities: '', actief: true,
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function StatusBadge({ days }: { days: number }) {
  if (days < 0) return (
    <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
      <AlertTriangle size={12} /> Vervallen
    </span>
  )
  if (days <= 30) return (
    <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 font-medium">
      <AlertTriangle size={12} /> {days}d
    </span>
  )
  if (days <= 60) return (
    <span className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400 font-medium">
      <Clock size={12} /> {days}d
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
      <CheckCircle size={12} /> {days}d
    </span>
  )
}

export function Domeinen() {
  const { domeinen, upsert, remove } = useDomeinen()
  const [modal, setModal] = useState<Partial<Domein> | null>(null)
  const [filterType, setFilterType] = useState('')

  const soon = useMemo(() => domeinen.filter(d => d.actief && daysUntil(d.vervaldatum) <= 60), [domeinen])
  const filtered = filterType ? domeinen.filter(d => d.type === filterType) : domeinen

  const handleSave = async () => {
    if (!modal?.naam || !modal.vervaldatum) return
    await upsert(modal)
    setModal(null)
  }

  const totalPerJaar = domeinen.filter(d => d.actief).reduce((s, d) => s + (d.prijs_jaar || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Domeinen & Licenties</h1>
        <button onClick={() => setModal({ ...empty })} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
          <Plus size={16} /> Nieuw toevoegen
        </button>
      </div>

      {/* Waarschuwingen */}
      {soon.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 mb-2">
            <AlertTriangle size={16} /> {soon.length} vervalt binnen 60 dagen
          </div>
          <div className="space-y-1">
            {soon.map(d => (
              <div key={d.id} className="flex items-center gap-3 text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">{d.naam}</span>
                {d.klant && <span className="text-amber-500">({d.klant})</span>}
                <span>— {d.vervaldatum} <span className="font-semibold">({daysUntil(d.vervaldatum)}d)</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">Totaal actief</div>
          <div className="text-2xl font-bold">{domeinen.filter(d => d.actief).length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">Vervalt &lt; 30d</div>
          <div className="text-2xl font-bold text-red-500">{domeinen.filter(d => d.actief && daysUntil(d.vervaldatum) <= 30).length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">Jaarlijkse kost</div>
          <div className="text-2xl font-bold">€{totalPerJaar.toFixed(0)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">Maandelijks</div>
          <div className="text-2xl font-bold">€{(totalPerJaar / 12).toFixed(0)}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('')} className={`px-3 py-1.5 text-xs rounded-full ${!filterType ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>Alle</button>
        {Object.keys(TYPE_LABELS).map(t => (
          <button key={t} onClick={() => setFilterType(t === filterType ? '' : t)} className={`px-3 py-1.5 text-xs rounded-full ${filterType === t ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{TYPE_LABELS[t]}</button>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Naam / Domein</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Klant</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Type</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Vervaldatum</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">€/jaar</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Notities</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className={`border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!d.actief ? 'opacity-40' : ''}`}>
                <td className="px-4 py-2.5 font-medium">{d.naam}</td>
                <td className="px-4 py-2.5 text-slate-500">{d.klant || '-'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-1 rounded-full ${TYPE_COLORS[d.type]}`}>{TYPE_LABELS[d.type]}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{d.vervaldatum}</td>
                <td className="px-4 py-2.5"><StatusBadge days={daysUntil(d.vervaldatum)} /></td>
                <td className="px-4 py-2.5 text-slate-500">{d.prijs_jaar ? `€${d.prijs_jaar}` : '-'}</td>
                <td className="px-4 py-2.5 text-slate-400 max-w-[180px] truncate">{d.notities || '-'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => setModal(d)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                    <button onClick={() => remove(d.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-slate-400 py-12 text-sm">Nog geen domeinen of licenties toegevoegd</p>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{modal.id ? 'Bewerken' : 'Nieuw toevoegen'}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Naam / Domein *</label>
                <input value={modal.naam || ''} onChange={e => setModal({ ...modal, naam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="bijv. relmotech.be" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Klant</label>
                <input value={modal.klant || ''} onChange={e => setModal({ ...modal, klant: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="Naam klant (of leeg voor eigen)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Type</label>
                  <select value={modal.type || 'domein'} onChange={e => setModal({ ...modal, type: e.target.value as Domein['type'] })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Prijs / jaar (€)</label>
                  <input type="number" value={modal.prijs_jaar ?? ''} onChange={e => setModal({ ...modal, prijs_jaar: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Vervaldatum *</label>
                <input type="date" value={modal.vervaldatum || ''} onChange={e => setModal({ ...modal, vervaldatum: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Notities</label>
                <textarea value={modal.notities || ''} onChange={e => setModal({ ...modal, notities: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-none" placeholder="Registrar, inloggegevens, hosting provider..." />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={modal.actief ?? true} onChange={e => setModal({ ...modal, actief: e.target.checked })} className="rounded" />
                Actief
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!modal.naam || !modal.vervaldatum} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-40">Opslaan</button>
              {modal.id && (
                <button onClick={() => { remove(modal.id!); setModal(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">Verwijderen</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
