import { useState } from 'react'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'
import { useCategories, useSupplierCategories, useActivities, useFixedCostTemplates, useTransactions } from '@/hooks/useSupabase'
import type { Category, FixedCostTemplate } from '@/types'
import { format } from 'date-fns'

export function Instellingen() {
  const { categories, upsert: upsertCat, remove: removeCat } = useCategories()
  const { supplierCategories, remove: removeSupplier } = useSupplierCategories()
  const { activities } = useActivities()
  const { templates, upsert: upsertTemplate, remove: removeTemplate } = useFixedCostTemplates()
  const { insert: insertTransaction } = useTransactions()
  const [tab, setTab] = useState<'categories' | 'vaste-kosten' | 'suppliers' | 'company'>('vaste-kosten')
  const [editCat, setEditCat] = useState<Partial<Category> | null>(null)
  const [editTemplate, setEditTemplate] = useState<Partial<FixedCostTemplate> | null>(null)
  const [generateMonth, setGenerateMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleSaveCat = async () => {
    if (!editCat?.name) return
    await upsertCat(editCat)
    setEditCat(null)
  }

  const handleSaveTemplate = async () => {
    if (!editTemplate?.description || !editTemplate?.amount) return
    await upsertTemplate({
      ...editTemplate,
      amount: Number(editTemplate.amount),
    })
    setEditTemplate(null)
  }

  const handleGenerate = async () => {
    if (!generateMonth || templates.length === 0) return
    setGenerating(true)
    const [year, month] = generateMonth.split('-').map(Number)
    const dateStr = format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
    for (const t of templates) {
      await insertTransaction({
        date: dateStr,
        description: t.description,
        amount: t.amount,
        category: t.category,
        activity_id: t.activity_id,
        cost_type: 'vast',
      })
    }
    setGenerating(false)
    setGenerated(true)
    setTimeout(() => setGenerated(false), 3000)
  }

  const tabs = [
    { key: 'vaste-kosten' as const, label: 'Vaste Kosten' },
    { key: 'categories' as const, label: 'Categorieën' },
    { key: 'suppliers' as const, label: 'Leverancier regels' },
    { key: 'company' as const, label: 'Bedrijfsprofiel' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Instellingen</h1>

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

      {tab === 'vaste-kosten' && (
        <div className="space-y-4">
          {/* Generate for month */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 space-y-3">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Genereer vaste kosten als transacties</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Kies een maand en klik op genereren om alle vaste kosten automatisch toe te voegen als transacties.</p>
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={generateMonth}
                onChange={e => setGenerateMonth(e.target.value)}
                className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || templates.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {generating ? 'Bezig...' : generated ? '✓ Gegenereerd!' : `Genereer ${templates.length} kosten`}
              </button>
            </div>
          </div>

          {/* Template list */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">{templates.length} vaste kosten ingesteld</p>
            <button
              onClick={() => setEditTemplate({})}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
            >
              <Plus size={16} /> Nieuwe vaste kost
            </button>
          </div>

          {/* Edit modal */}
          {editTemplate && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditTemplate(null)}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{editTemplate.id ? 'Vaste kost bewerken' : 'Nieuwe vaste kost'}</h2>
                  <button onClick={() => setEditTemplate(null)}><X size={18} /></button>
                </div>
                <input
                  placeholder="Omschrijving"
                  value={editTemplate.description || ''}
                  onChange={e => setEditTemplate({ ...editTemplate, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Bedrag (negatief = uitgave)"
                  value={editTemplate.amount ?? ''}
                  onChange={e => setEditTemplate({ ...editTemplate, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                />
                <select
                  value={editTemplate.category || ''}
                  onChange={e => setEditTemplate({ ...editTemplate, category: e.target.value || null })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                >
                  <option value="">Geen categorie</option>
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={editTemplate.activity_id || ''}
                  onChange={e => setEditTemplate({ ...editTemplate, activity_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                >
                  <option value="">Geen activiteit</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleSaveTemplate} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">Opslaan</button>
                  {editTemplate.id && (
                    <button onClick={() => { removeTemplate(editTemplate.id!); setEditTemplate(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">
                      Verwijderen
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 dark:border-slate-700/50">
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-slate-400">{t.category || 'Geen categorie'} · {activities.find(a => a.id === t.activity_id)?.name || 'Geen activiteit'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${t.amount < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    €{Math.abs(t.amount).toFixed(2)}
                  </span>
                  <button onClick={() => setEditTemplate(t)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                  <button onClick={() => removeTemplate(t.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">Nog geen vaste kosten ingesteld</p>
            )}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="space-y-4">
          <button
            onClick={() => setEditCat({ type: 'expense' })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
          >
            <Plus size={16} /> Nieuwe categorie
          </button>

          {editCat && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
              <input placeholder="Naam" value={editCat.name || ''} onChange={e => setEditCat({ ...editCat, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              <div className="flex gap-3">
                <select value={editCat.type || 'expense'} onChange={e => setEditCat({ ...editCat, type: e.target.value as Category['type'] })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm">
                  <option value="income">Inkomsten</option>
                  <option value="expense">Uitgaven</option>
                  <option value="transfer">Transfer</option>
                </select>
                <input type="color" value={editCat.color || '#6B7280'} onChange={e => setEditCat({ ...editCat, color: e.target.value })} className="h-10 w-16 rounded border" />
                <button onClick={handleSaveCat} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm"><Save size={14} /></button>
                <button onClick={() => setEditCat(null)} className="px-4 py-2 text-slate-500 text-sm">Annuleer</button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || '#6B7280' }} />
                  <span className="text-sm">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.type}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditCat(c)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                  <button onClick={() => removeCat(c.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b dark:border-slate-700 text-sm font-medium text-slate-500">
            Geleerde leverancier → categorie koppelingen
          </div>
          {supplierCategories.map(sc => (
            <div key={sc.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 dark:border-slate-700/50">
              <div>
                <span className="text-sm font-medium">{sc.supplier_key}</span>
                <span className="text-xs text-slate-400 ml-2">→ {sc.category}</span>
                {sc.activity_id && (
                  <span
                    className="ml-2 w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: activities.find(a => a.id === sc.activity_id)?.color }}
                  />
                )}
              </div>
              <button onClick={() => removeSupplier(sc.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
          {supplierCategories.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nog geen leverancier regels</p>}
        </div>
      )}

      {tab === 'company' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4 max-w-md">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Bedrijfsnaam</label>
            <input value="Relmo Tech BV" readOnly className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Adres</label>
            <textarea value="Tabakvest 87/4548&#10;2000 Antwerpen" readOnly className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm h-16" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">BTW-nummer</label>
            <input value="BE1007151196" readOnly className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm" />
          </div>
          <p className="text-xs text-slate-400">Bedrijfsgegevens worden gebruikt op facturen.</p>
        </div>
      )}
    </div>
  )
}
