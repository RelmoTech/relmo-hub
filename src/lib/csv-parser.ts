import type { Transaction } from '@/types'
import { autoCategorize, normalizeSupplier } from './categories'
import type { SupplierCategory } from '@/types'

interface ParsedRow {
  date: string
  description: string
  amount: number
  supplier: string
  raw: string
}

export function parseINGCsv(text: string): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0]
  const isING = header.includes('Datum') && header.includes('Af Bij')

  if (isING) return parseINGFormat(lines.slice(1))
  return parseGenericCsv(lines)
}

function parseINGFormat(lines: string[]): ParsedRow[] {
  return lines.filter(l => l.trim()).map(line => {
    const cols = line.split(';')
    const dateStr = cols[0]?.replace(/"/g, '').trim()
    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)
    const date = `${year}-${month}-${day}`

    const naam = cols[1]?.replace(/"/g, '').trim() || ''
    const afBij = cols[5]?.replace(/"/g, '').trim()
    const bedragStr = cols[6]?.replace(/"/g, '').trim().replace(',', '.')
    const mededelingen = cols[8]?.replace(/"/g, '').trim() || ''

    const amount = parseFloat(bedragStr || '0')
    const signedAmount = afBij === 'Af' ? -Math.abs(amount) : Math.abs(amount)

    const description = mededelingen ? `${naam} - ${mededelingen}` : naam

    return {
      date,
      description,
      amount: signedAmount,
      supplier: naam,
      raw: line,
    }
  })
}

function parseGenericCsv(lines: string[]): ParsedRow[] {
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.replace(/"/g, '').trim().toLowerCase())

  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('datum'))
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('omschrijving') || h.includes('naam'))
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('bedrag'))

  if (dateIdx === -1 || amountIdx === -1) return []

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(sep).map(c => c.replace(/"/g, '').trim())
    const amountStr = cols[amountIdx].replace(',', '.')
    return {
      date: cols[dateIdx],
      description: descIdx >= 0 ? cols[descIdx] : '',
      amount: parseFloat(amountStr) || 0,
      supplier: descIdx >= 0 ? cols[descIdx] : '',
      raw: line,
    }
  })
}

export function categorizeRows(
  rows: ParsedRow[],
  supplierCategories: SupplierCategory[]
): Omit<Transaction, 'id' | 'created_at'>[] {
  const supplierMap = new Map(supplierCategories.map(sc => [sc.supplier_key, sc]))

  return rows.map(row => {
    const key = normalizeSupplier(row.supplier)
    const saved = supplierMap.get(key)

    let category: string | null = null
    let activity_id: string | null = null

    if (saved) {
      category = saved.category
      activity_id = saved.activity_id
    } else {
      category = autoCategorize(row.description)
    }

    if (!category) category = 'Overige'

    return {
      date: row.date,
      description: row.description,
      amount: row.amount,
      category,
      activity_id,
      supplier: row.supplier,
      raw_csv_row: row.raw,
      cost_type: 'variabel' as const,
    }
  })
}
