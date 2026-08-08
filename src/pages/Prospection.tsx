import { useState, useRef } from 'react'
import { Plus, X, Upload, Trash2, Edit2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useProspects } from '@/hooks/useSupabase'
import { useLanguage } from '@/hooks/useLanguage'
import type { Prospect } from '@/types'

const STATUT_COLORS: Record<string, string> = {
  'envoyé': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'répondu': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'refusé': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'en attente': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'verstuurd': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'geantwoord': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'geweigerd': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'wachtend': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const emptyProspect: Partial<Prospect> = {
  entreprise: '',
  secteur: '',
  canal_utilise: '',
  statut: '',
  date_envoi: '',
  j3: '',
  j7: '',
  j30: '',
  j60: '',
  info: '',
}

export function Prospection() {
  const { prospects, upsert, bulkInsert, remove } = useProspects()
  const { t } = useLanguage()
  const [modal, setModal] = useState<Partial<Prospect> | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [filterStatut, setFilterStatut] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const excelDateToISO = (val: unknown): string | null => {
    if (!val) return null
    const n = Number(val)
    if (!isNaN(n) && n > 1000) {
      const date = new Date(Math.round((n - 25569) * 86400 * 1000))
      return date.toISOString().split('T')[0]
    }
    const s = String(val).trim()
    if (!s) return null
    return s
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const mapped: Partial<Prospect>[] = rows.map(r => ({
        entreprise: String(r['Entreprise'] || r['entreprise'] || r['Bedrijf'] || ''),
        secteur: String(r['Secteur'] || r['secteur'] || r['Sector'] || '') || null,
        canal_utilise: String(r['Canal utilisé'] || r['Canal utilise'] || r['Kanaal'] || '') || null,
        statut: String(r['Statut'] || r['statut'] || r['Status'] || '') || null,
        date_envoi: excelDateToISO(r['Date d\'envoi'] ?? r['Date envoi'] ?? r['Verzenddatum']),
        j3: String(r['J+3'] || r['j3'] || '') || null,
        j7: String(r['J+7'] || r['j7'] || '') || null,
        j30: String(r['J+30'] || r['j30'] || '') || null,
        j60: String(r['J+60'] || r['j60'] || '') || null,
        info: String(r['Info'] || r['info'] || '') || null,
      })).filter(p => p.entreprise)

      if (mapped.length > 0) {
        const err: string | null = await bulkInsert(mapped)
        if (err != null) {
          setImportMsg(`Fout: ${err}`)
        } else {
          setImportMsg(`${mapped.length} ${t('importSuccess')}`)
          setTimeout(() => setImportMsg(null), 3000)
        }
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!modal?.entreprise) return
    await upsert(modal)
    setModal(null)
  }

  const filtered = filterStatut
    ? prospects.filter(p => p.statut?.toLowerCase() === filterStatut.toLowerCase())
    : prospects

  const statuts = [...new Set(prospects.map(p => p.statut).filter(Boolean))] as string[]

  const statusColor = (s: string | null) => {
    if (!s) return 'bg-slate-100 text-slate-500'
    return STATUT_COLORS[s.toLowerCase()] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('prospection')}</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm"
          >
            <Upload size={16} /> {t('importExcel')}
          </button>
          <button
            onClick={() => setModal({ ...emptyProspect })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
          >
            <Plus size={16} /> {t('newProspect')}
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-lg text-sm">
          ✓ {importMsg}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatut('')}
          className={`px-3 py-1.5 text-xs rounded-full ${!filterStatut ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
        >
          {t('all')}
        </button>
        {statuts.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatut(s === filterStatut ? '' : s)}
            className={`px-3 py-1.5 text-xs rounded-full ${filterStatut === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">{t('entreprise')}</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">{t('secteur')}</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">{t('canalUtilise')}</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">{t('statut')}</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">{t('dateEnvoi')}</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">J+3</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">J+7</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">J+30</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">J+60</th>
              <th className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">{t('info')}</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-3 py-2 font-medium">{p.entreprise}</td>
                <td className="px-3 py-2 text-slate-500">{p.secteur || '-'}</td>
                <td className="px-3 py-2 text-slate-500">{p.canal_utilise || '-'}</td>
                <td className="px-3 py-2">
                  {p.statut ? (
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor(p.statut)}`}>{p.statut}</span>
                  ) : '-'}
                </td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.date_envoi || '-'}</td>
                <td className="px-3 py-2 text-slate-500 max-w-[80px] truncate">{p.j3 || '-'}</td>
                <td className="px-3 py-2 text-slate-500 max-w-[80px] truncate">{p.j7 || '-'}</td>
                <td className="px-3 py-2 text-slate-500 max-w-[80px] truncate">{p.j30 || '-'}</td>
                <td className="px-3 py-2 text-slate-500 max-w-[80px] truncate">{p.j60 || '-'}</td>
                <td className="px-3 py-2 text-slate-500 max-w-[150px] truncate">{p.info || '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => setModal(p)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                    <button onClick={() => remove(p.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-slate-400 py-12 text-sm">{t('noProspects')}</p>
        )}
      </div>

      <div className="text-xs text-slate-400">{filtered.length} / {prospects.length} prospects</div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg space-y-4 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{modal.id ? t('editProspect') : t('newProspect')}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 block mb-1">{t('entreprise')} *</label>
                <input value={modal.entreprise || ''} onChange={e => setModal({ ...modal, entreprise: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('secteur')}</label>
                <input value={modal.secteur || ''} onChange={e => setModal({ ...modal, secteur: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('canalUtilise')}</label>
                <input value={modal.canal_utilise || ''} onChange={e => setModal({ ...modal, canal_utilise: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="Email, LinkedIn, Tel..." />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('statut')}</label>
                <input value={modal.statut || ''} onChange={e => setModal({ ...modal, statut: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('dateEnvoi')}</label>
                <input type="date" value={modal.date_envoi || ''} onChange={e => setModal({ ...modal, date_envoi: e.target.value || null })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(['j3', 'j7', 'j30', 'j60'] as const).map(field => (
                <div key={field}>
                  <label className="text-xs text-slate-500 block mb-1">{field === 'j3' ? 'J+3' : field === 'j7' ? 'J+7' : field === 'j30' ? 'J+30' : 'J+60'}</label>
                  <input value={modal[field] || ''} onChange={e => setModal({ ...modal, [field]: e.target.value })} className="w-full px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-xs" placeholder="Note..." />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">{t('info')}</label>
              <textarea value={modal.info || ''} onChange={e => setModal({ ...modal, info: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-none" />
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">{t('save')}</button>
              {modal.id && (
                <button onClick={() => { remove(modal.id!); setModal(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">{t('delete')}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
