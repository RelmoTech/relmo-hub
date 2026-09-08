import { useState, useMemo } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Edit2, Phone, Mail, Euro } from 'lucide-react'
import { useReservations } from '@/hooks/useSupabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Reservation } from '@/types'

const MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
const DAYS = ['Ma','Di','Wo','Do','Vr','Za','Zo']

const empty: Partial<Reservation> = { klant: '', event: '', datum: '', einddatum: null, info: '', email: '', tel: '', aantal_dagen: null, aantal_uren: null, prijs: null }

function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(n: number) { return `€${n.toFixed(2).replace('.', ',')}` }

export function ReservationRobot() {
  const { reservations, upsert, remove } = useReservations()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [modal, setModal] = useState<Partial<Reservation> | null>(null)
  const [view, setView] = useState<'calendar' | 'list' | 'stats'>('calendar')
  const [durationType, setDurationType] = useState<'dagen' | 'uren'>('dagen')

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7

  const resByDate: Record<string, Reservation[]> = {}
  for (const r of reservations) {
    const start = r.datum?.slice(0, 10) ?? ''
    if (!start) continue
    const end = r.einddatum?.slice(0, 10) ?? start
    const cur = new Date(start)
    const endDate = new Date(end)
    while (cur <= endDate) {
      const key = cur.toISOString().split('T')[0]
      ;(resByDate[key] ??= []).push(r)
      cur.setDate(cur.getDate() + 1)
    }
  }

  const handleDayClick = (day: number) => {
    const d = `${year}-${pad(month + 1)}-${pad(day)}`
    setModal({ ...empty, datum: d })
  }

  const handleSave = async () => {
    if (!modal?.klant || !modal.datum) return
    const toSave = {
      ...modal,
      aantal_dagen: durationType === 'dagen' ? (modal.aantal_dagen ?? null) : null,
      aantal_uren: durationType === 'uren' ? (modal.aantal_uren ?? null) : null,
      einddatum: durationType === 'dagen' ? (modal.einddatum ?? null) : null,
    }
    await upsert(toSave)
    setModal(null)
  }

  const openModal = (r: Partial<Reservation>) => {
    setDurationType(r.aantal_uren ? 'uren' : 'dagen')
    setModal(r)
  }

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const upcoming = reservations.filter(r => (r.datum ?? '') >= todayStr).slice(0, 30)

  // Maandoverzicht per jaar
  const statsYear = today.getFullYear()
  const monthlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const prefix = `${statsYear}-${pad(i + 1)}`
      const monthRes = reservations.filter(r => r.datum?.startsWith(prefix))
      const inkomen = monthRes.reduce((s, r) => s + (r.prijs || 0), 0)
      const count = monthRes.length
      return { month: MONTHS_SHORT[i], inkomen, count }
    })
  }, [reservations, statsYear])

  const totalYear = monthlyStats.reduce((s, m) => s + m.inkomen, 0)
  const thisMonthIncome = monthlyStats[today.getMonth()].inkomen
  const thisMonthCount = monthlyStats[today.getMonth()].count

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Reservation Robot</h1>
        <div className="flex gap-2 items-center">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-md transition-colors ${view === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Agenda</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Lijst</button>
            <button onClick={() => setView('stats')} className={`px-3 py-1.5 rounded-md transition-colors ${view === 'stats' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Inkomsten</button>
          </div>
          <button onClick={() => { setDurationType('dagen'); setModal({ ...empty }) }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
            <Plus size={16} /> Nieuwe reservatie
          </button>
        </div>
      </div>

      {/* Stats view */}
      {view === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-xs text-slate-400 mb-1">Deze maand</div>
              <div className="text-2xl font-bold text-emerald-500">{fmt(thisMonthIncome)}</div>
              <div className="text-xs text-slate-400 mt-1">{thisMonthCount} reservatie{thisMonthCount !== 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-xs text-slate-400 mb-1">Totaal {statsYear}</div>
              <div className="text-2xl font-bold">{fmt(totalYear)}</div>
              <div className="text-xs text-slate-400 mt-1">{reservations.filter(r => r.datum?.startsWith(String(statsYear))).length} reservaties</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-xs text-slate-400 mb-1">Gem. per maand</div>
              <div className="text-2xl font-bold">{fmt(totalYear / 12)}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h2 className="text-sm font-semibold mb-4">Inkomsten per maand — {statsYear}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyStats}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                <Tooltip formatter={(v: unknown) => fmt(Number(v))} labelFormatter={(l: unknown) => `${l}`} />
                <Bar dataKey="inkomen" fill="#3B82F6" radius={[4,4,0,0]} name="Inkomsten" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Tabel per maand */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Maand</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Reservaties</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Inkomsten</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((m, i) => (
                  <tr key={i} className={`border-b dark:border-slate-700/50 ${i === today.getMonth() ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{MONTHS[i]}</td>
                    <td className="px-4 py-2.5 text-slate-500">{m.count}</td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">{m.inkomen > 0 ? fmt(m.inkomen) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-700">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft size={18} /></button>
            <span className="font-semibold">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 border-b dark:border-slate-700">
            {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`e${i}`} className="min-h-[90px] border-b border-r dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
              const dayRes = resByDate[dateStr] || []
              const isToday = dateStr === todayStr
              return (
                <div key={day} onClick={() => handleDayClick(day)} className="min-h-[90px] border-b border-r dark:border-slate-700/50 p-1.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                  <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayRes.slice(0, 3).map(r => (
                      <div key={r.id} onClick={e => { e.stopPropagation(); openModal(r) }} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded px-1.5 py-0.5 truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/60">
                        {r.klant}{r.prijs ? ` · ${fmt(r.prijs)}` : ''}
                      </div>
                    ))}
                    {dayRes.length > 3 && <div className="text-xs text-slate-400 pl-1">+{dayRes.length - 3} meer</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b dark:border-slate-700 text-sm font-semibold text-slate-500">Aankomende reservaties</div>
          {upcoming.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">Geen reservaties</p>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {upcoming.map(r => (
                <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="text-center min-w-[48px]">
                    <div className="text-xs text-slate-400">{MONTHS_SHORT[parseInt(r.datum?.slice(5,7) ?? '1') - 1]}</div>
                    <div className="text-xl font-bold">{r.datum?.slice(8,10)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{r.klant}</div>
                    <div className="flex gap-3 mt-0.5 flex-wrap text-xs text-slate-500">
                      {r.event && <span>{r.event}</span>}
                      {r.einddatum && r.einddatum !== r.datum ? <span>t/m {r.einddatum?.slice(8,10)} {MONTHS_SHORT[parseInt(r.einddatum?.slice(5,7) ?? '1') - 1]}</span> : null}
                      {r.aantal_dagen && <span>{r.aantal_dagen} dag{r.aantal_dagen > 1 ? 'en' : ''}</span>}
                      {r.aantal_uren && <span>{r.aantal_uren} uur</span>}
                      {r.prijs && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(r.prijs)}</span>}
                    </div>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {r.email && <a href={`mailto:${r.email}`} className="flex items-center gap-1 text-xs text-blue-500"><Mail size={11} />{r.email}</a>}
                      {r.tel && <a href={`tel:${r.tel}`} className="flex items-center gap-1 text-xs text-emerald-500"><Phone size={11} />{r.tel}</a>}
                    </div>
                    {r.info && <div className="text-xs text-slate-400 mt-1">{r.info}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openModal(r)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                    <button onClick={() => remove(r.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{modal.id ? 'Reservatie bewerken' : 'Nieuwe reservatie'}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Klant *</label>
                <input value={modal.klant || ''} onChange={e => setModal({ ...modal, klant: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="Naam klant..." />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Event</label>
                <input value={modal.event || ''} onChange={e => setModal({ ...modal, event: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="Type event..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Startdatum *</label>
                  <input type="date" value={modal.datum || ''} onChange={e => {
                    const newDatum = e.target.value
                    let dagen = modal.aantal_dagen ?? null
                    if (newDatum && modal.einddatum) {
                      const diff = Math.round((new Date(modal.einddatum).getTime() - new Date(newDatum).getTime()) / 86400000) + 1
                      dagen = diff > 0 ? diff : null
                    }
                    setModal({ ...modal, datum: newDatum, aantal_dagen: dagen })
                  }} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
                </div>
                {durationType === 'dagen' && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Einddatum</label>
                    <input type="date" value={modal.einddatum || ''} min={modal.datum || ''} onChange={e => {
                      const eind = e.target.value
                      let dagen = modal.aantal_dagen ?? null
                      if (modal.datum && eind) {
                        const diff = Math.round((new Date(eind).getTime() - new Date(modal.datum).getTime()) / 86400000) + 1
                        dagen = diff > 0 ? diff : null
                      }
                      setModal({ ...modal, einddatum: eind || null, aantal_dagen: dagen })
                    }} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
                  </div>
                )}
              </div>
              {modal.einddatum && modal.datum && modal.einddatum >= modal.datum && (
                <p className="text-xs text-blue-500 -mt-1">
                  {modal.aantal_dagen} dag{modal.aantal_dagen !== 1 ? 'en' : ''} geboekt
                </p>
              )}

              {/* Duur */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Duur</label>
                <div className="flex gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium shrink-0">
                    <button type="button" onClick={() => { setDurationType('dagen'); setModal({ ...modal, aantal_uren: null }) }} className={`px-3 py-1.5 rounded-md transition-colors ${durationType === 'dagen' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Dagen</button>
                    <button type="button" onClick={() => { setDurationType('uren'); setModal({ ...modal, einddatum: null, aantal_dagen: null }) }} className={`px-3 py-1.5 rounded-md transition-colors ${durationType === 'uren' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Uren</button>
                  </div>
                  {durationType === 'dagen' ? (
                    <input type="number" min="1" step="1" value={modal.aantal_dagen ?? ''} onChange={e => setModal({ ...modal, aantal_dagen: e.target.value ? Number(e.target.value) : null, einddatum: null })} className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="Aantal dagen..." />
                  ) : (
                    <input type="number" min="1" value={modal.aantal_uren ?? ''} onChange={e => setModal({ ...modal, aantal_uren: e.target.value ? Number(e.target.value) : null })} className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="Aantal uren..." />
                  )}
                </div>
              </div>

              {/* Prijs */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Prijs (€)</label>
                <div className="relative">
                  <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" min="0" step="0.01" value={modal.prijs ?? ''} onChange={e => setModal({ ...modal, prijs: e.target.value ? Number(e.target.value) : null })} className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="0,00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">E-mail</label>
                  <input type="email" value={modal.email || ''} onChange={e => setModal({ ...modal, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="..." />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Tel</label>
                  <input type="tel" value={modal.tel || ''} onChange={e => setModal({ ...modal, tel: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" placeholder="..." />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Info</label>
                <textarea value={modal.info || ''} onChange={e => setModal({ ...modal, info: e.target.value })} rows={6} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-y" placeholder="Extra info..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!modal.klant || !modal.datum} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-40">Opslaan</button>
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
