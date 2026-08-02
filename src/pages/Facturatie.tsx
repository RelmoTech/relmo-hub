import { useState, useMemo } from 'react'
import { Plus, X, Eye, Send, Printer } from 'lucide-react'
import { useInvoices, useActivities } from '@/hooks/useSupabase'
import { useActivityFilter } from '@/hooks/useActivityFilter'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceLine } from '@/types'

const STATUS_COLORS = {
  concept: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  verzonden: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  betaald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  vervallen: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const COMPANY = {
  name: 'Relmo Tech BV',
  address: 'Tabakvest 87/4548\n2000 Antwerpen',
  vat: 'BE1007151196',
}

const emptyLine: InvoiceLine = { description: '', quantity: 1, unit_price: 0, vat_rate: 21 }

export function Facturatie() {
  const { selectedActivityId } = useActivityFilter()
  const { invoices, upsert, remove } = useInvoices(selectedActivityId)
  const { activities } = useActivities()
  const [modal, setModal] = useState<Partial<Invoice> | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const filtered = useMemo(() => {
    if (!statusFilter) return invoices
    return invoices.filter(i => i.status === statusFilter)
  }, [invoices, statusFilter])

  const nextNumber = useMemo(() => {
    const year = new Date().getFullYear()
    const existing = invoices.filter(i => i.invoice_number.includes(`${year}`))
    const num = existing.length + 1
    return `RELMO-${year}-${String(num).padStart(3, '0')}`
  }, [invoices])

  const calcLine = (l: InvoiceLine) => {
    const subtotal = l.quantity * l.unit_price
    const vat = subtotal * (l.vat_rate / 100)
    return { subtotal, vat, total: subtotal + vat }
  }

  const calcTotals = (lines: InvoiceLine[]) => {
    let subtotal = 0, vat = 0
    for (const l of lines) {
      const c = calcLine(l)
      subtotal += c.subtotal
      vat += c.vat
    }
    return { subtotal, vat, total: subtotal + vat }
  }

  const handleSave = async () => {
    if (!modal?.client_name) return
    await upsert({
      ...modal,
      invoice_number: modal.invoice_number || nextNumber,
      lines: modal.lines || [],
    })
    setModal(null)
  }

  const updateLine = (idx: number, field: keyof InvoiceLine, value: string | number) => {
    if (!modal) return
    const lines = [...(modal.lines || [])]
    lines[idx] = { ...lines[idx], [field]: value }
    setModal({ ...modal, lines })
  }

  const addLine = () => setModal({ ...modal, lines: [...(modal?.lines || []), { ...emptyLine }] })
  const removeLine = (idx: number) => setModal({ ...modal, lines: (modal?.lines || []).filter((_, i) => i !== idx) })

  const viewInvoice = invoices.find(i => i.id === viewId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Facturatie</h1>
        <button
          onClick={() => setModal({ invoice_number: nextNumber, lines: [{ ...emptyLine }], activity_id: selectedActivityId, status: 'concept' })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          <Plus size={16} /> Nieuwe factuur
        </button>
      </div>

      <div className="flex gap-2">
        {['', 'concept', 'verzonden', 'betaald', 'vervallen'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full ${
              statusFilter === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {s || 'Alle'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b dark:border-slate-700">
              <th className="p-3">Nr</th>
              <th className="p-3">Klant</th>
              <th className="p-3">Datum</th>
              <th className="p-3">Bedrag</th>
              <th className="p-3">Status</th>
              <th className="p-3">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const totals = calcTotals(inv.lines || [])
              return (
                <tr key={inv.id} className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="p-3">{inv.client_name}</td>
                  <td className="p-3">{formatDate(inv.issue_date)}</td>
                  <td className="p-3 font-medium">{formatCurrency(totals.total)}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                  </td>
                  <td className="p-3 flex gap-1">
                    <button onClick={() => setViewId(inv.id)} className="p-1 text-slate-400 hover:text-blue-500"><Eye size={14} /></button>
                    <button onClick={() => setModal(inv)} className="p-1 text-slate-400 hover:text-blue-500">
                      <Send size={14} />
                    </button>
                    {inv.status === 'concept' && (
                      <button onClick={() => upsert({ id: inv.id, status: 'verzonden' })} className="text-xs text-blue-500">Verzend</button>
                    )}
                    {inv.status === 'verzonden' && (
                      <button onClick={() => upsert({ id: inv.id, status: 'betaald' })} className="text-xs text-emerald-500">Betaald</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Geen facturen</p>}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-2xl space-y-4 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Factuur {modal.invoice_number}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Klant naam" value={modal.client_name || ''} onChange={e => setModal({ ...modal, client_name: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              <input placeholder="Klant email" value={modal.client_email || ''} onChange={e => setModal({ ...modal, client_email: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              <textarea placeholder="Klant adres" value={modal.client_address || ''} onChange={e => setModal({ ...modal, client_address: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              <select value={modal.activity_id || ''} onChange={e => setModal({ ...modal, activity_id: e.target.value || null })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm">
                <option value="">Geen activiteit</option>
                {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input type="date" value={modal.issue_date || new Date().toISOString().split('T')[0]} onChange={e => setModal({ ...modal, issue_date: e.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
              <input type="date" placeholder="Vervaldatum" value={modal.due_date || ''} onChange={e => setModal({ ...modal, due_date: e.target.value || null })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Lijnen</h3>
              <div className="space-y-2">
                {(modal.lines || []).map((line, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input placeholder="Omschrijving" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-transparent" />
                    <input type="number" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))} className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-transparent" />
                    <input type="number" placeholder="Prijs" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', Number(e.target.value))} className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-transparent" />
                    <select value={line.vat_rate} onChange={e => updateLine(i, 'vat_rate', Number(e.target.value))} className="w-20 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-transparent">
                      <option value={21}>21%</option>
                      <option value={6}>6%</option>
                      <option value={0}>0%</option>
                    </select>
                    <span className="text-xs w-20 text-right">{formatCurrency(calcLine(line).total)}</span>
                    <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <button onClick={addLine} className="mt-2 text-xs text-blue-500">+ Lijn toevoegen</button>
            </div>

            {modal.lines && modal.lines.length > 0 && (
              <div className="text-right text-sm space-y-1 border-t dark:border-slate-700 pt-3">
                <div>Subtotaal: {formatCurrency(calcTotals(modal.lines).subtotal)}</div>
                <div>BTW: {formatCurrency(calcTotals(modal.lines).vat)}</div>
                <div className="font-bold">Totaal: {formatCurrency(calcTotals(modal.lines).total)}</div>
              </div>
            )}

            <textarea placeholder="Notities" value={modal.notes || ''} onChange={e => setModal({ ...modal, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm h-16" />

            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">Opslaan</button>
              {modal.id && (
                <button onClick={() => { remove(modal.id!); setModal(null) }} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm">Verwijder</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View/Print Invoice */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setViewId(null)}>
          <div className="bg-white rounded-xl p-8 w-full max-w-2xl my-8 text-slate-900" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-8 no-print">
              <button onClick={() => setViewId(null)} className="text-sm text-slate-500">Sluiten</button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
                <Printer size={14} /> PDF / Print
              </button>
            </div>

            <div className="flex justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold">{COMPANY.name}</h2>
                <p className="text-sm text-slate-500 whitespace-pre-line">{COMPANY.address}</p>
                <p className="text-sm text-slate-500">BTW: {COMPANY.vat}</p>
              </div>
              <div className="text-right">
                <h3 className="text-lg font-bold">FACTUUR</h3>
                <p className="text-sm">{viewInvoice.invoice_number}</p>
                <p className="text-sm text-slate-500">Datum: {formatDate(viewInvoice.issue_date)}</p>
                {viewInvoice.due_date && <p className="text-sm text-slate-500">Vervaldatum: {formatDate(viewInvoice.due_date)}</p>}
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-500 mb-1">Klant</h4>
              <p className="font-medium">{viewInvoice.client_name}</p>
              {viewInvoice.client_email && <p className="text-sm text-slate-500">{viewInvoice.client_email}</p>}
              {viewInvoice.client_address && <p className="text-sm text-slate-500 whitespace-pre-line">{viewInvoice.client_address}</p>}
            </div>

            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left pb-2">Omschrijving</th>
                  <th className="text-right pb-2">Qty</th>
                  <th className="text-right pb-2">Prijs</th>
                  <th className="text-right pb-2">BTW</th>
                  <th className="text-right pb-2">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {(viewInvoice.lines || []).map((l, i) => {
                  const c = calcLine(l)
                  return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2">{l.description}</td>
                      <td className="py-2 text-right">{l.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(l.unit_price)}</td>
                      <td className="py-2 text-right">{l.vat_rate}%</td>
                      <td className="py-2 text-right">{formatCurrency(c.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="text-right space-y-1">
              <div className="text-sm">Subtotaal: {formatCurrency(calcTotals(viewInvoice.lines || []).subtotal)}</div>
              <div className="text-sm">BTW: {formatCurrency(calcTotals(viewInvoice.lines || []).vat)}</div>
              <div className="text-lg font-bold border-t-2 border-slate-200 pt-2">Totaal: {formatCurrency(calcTotals(viewInvoice.lines || []).total)}</div>
            </div>

            {viewInvoice.notes && <p className="mt-6 text-sm text-slate-500">{viewInvoice.notes}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
