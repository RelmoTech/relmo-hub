import { useState } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Edit2, Phone, Mail } from 'lucide-react'
import { useReservations } from '@/hooks/useSupabase'
import type { Reservation } from '@/types'

const MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
const DAYS = ['Ma','Di','Wo','Do','Vr','Za','Zo']

const empty: Partial<Reservation> = { klant: '', event: '', datum: '', info: '', email: '', tel: '' }

function pad(n: number) { return String(n).padStart(2, '0') }

export function ReservationRobot() {
  const { reservations, upsert, remove } = useReservations()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [modal, setModal] = useState<Partial<Reservation> | null>(null)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday-based: 0=Mon..6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7

  const resByDate: Record<string, Reservation[]> = {}
  for (const r of reservations) {
    const key = r.datum?.slice(0, 10) ?? ''
    if (key) (resByDate[key] ??= []).push(r)
  }

  const handleDayClick = (day: number) => {
    const d = `${year}-${pad(month + 1)}-${pad(day)}`
    setModal({ ...empty, datum: d })
  }

  const handleSave = async () => {
    if (!modal?.klant || !modal.datum) return
    await upsert(modal)
    setModal(null)
  }

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const upcoming = reservations.filter(r => (r.datum ?? '') >= todayStr).slice(0, 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Reservation Robot</h1>
        <div className="flex gap-2 items-center">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-md transition-colors ${view === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Agenda</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Lijst</button>
          </div>
          <button onClick={() => setModal({ ...empty })} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
            <Plus size={16} /> Nieuwe reservatie
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-700">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft size={18} /></button>
            <span className="font-semibold">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={18} /></button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b dark:border-slate-700">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
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
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="min-h-[90px] border-b border-r dark:border-slate-700/50 p-1.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                >
                  <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayRes.slice(0, 3).map(r => (
                      <div
                        key={r.id}
                        onClick={e => { e.stopPropagation(); setModal(r) }}
                        className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded px-1.5 py-0.5 truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/60"
                      >
                        {r.klant}
                      </div>
                    ))}
                    {dayRes.length > 3 && (
                      <div className="text-xs text-slate-400 pl-1">+{dayRes.length - 3} meer</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b dark:border-slate-700 text-sm font-semibold text-slate-500">Aankomende reservaties</div>
          {upcoming.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">Geen reservaties</p>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {upcoming.map(r => (
                <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="text-center min-w-[48px]">
                    <div className="text-xs text-slate-400">{MONTHS[parseInt(r.datum?.slice(5,7) ?? '1') - 1]?.slice(0,3)}</div>
                    <div className="text-xl font-bold">{r.datum?.slice(8,10)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{r.klant}</div>
                    {r.event && <div className="text-sm text-slate-500">{r.event}</div>}
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {r.email && <a href={`mailto:${r.email}`} className="flex items-center gap-1 text-xs text-blue-500"><Mail size={11} />{r.email}</a>}
                      {r.tel && <a href={`tel:${r.tel}`} className="flex items-center gap-1 text-xs text-emerald-500"><Phone size={11} />{r.tel}</a>}
                    </div>
                    {r.info && <div className="text-xs text-slate-400 mt-1">{r.info}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal(r)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
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
              <div>
                <label className="text-xs text-slate-500 block mb-1">Datum *</label>
                <input type="date" value={modal.datum || ''} onChange={e => setModal({ ...modal, datum: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm" />
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
                <textarea value={modal.info || ''} onChange={e => setModal({ ...modal, info: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm resize-none" placeholder="Extra info..." />
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
