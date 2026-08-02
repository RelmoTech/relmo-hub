import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

export interface ParsedRow {
  date: string
  description: string
  amount: number
  supplier: string
  raw: string
}

interface TextBlock {
  str: string
  x: number
  y: number
}

export async function parsePdf(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const allRows: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    const blocks: TextBlock[] = content.items
      .filter(item => 'str' in item && (item as { str: string }).str.trim())
      .map(item => {
        const t = item as { str: string; transform: number[] }
        return { str: t.str, x: t.transform[4], y: Math.round(t.transform[5]) }
      })

    // Group text items by Y coordinate (same row = same Y within tolerance)
    const rowMap = new Map<number, TextBlock[]>()
    for (const b of blocks) {
      const key = findNearestY(rowMap, b.y, 3)
      if (!rowMap.has(key)) rowMap.set(key, [])
      rowMap.get(key)!.push(b)
    }

    // Sort rows top-to-bottom (higher Y = higher on page in PDF coords)
    const sortedYs = [...rowMap.keys()].sort((a, b) => b - a)
    for (const y of sortedYs) {
      const items = rowMap.get(y)!.sort((a, b) => a.x - b.x)
      const line = items.map(i => i.str).join('  ')
      allRows.push(line)
    }
  }

  return extractTransactions(allRows)
}

function findNearestY(map: Map<number, TextBlock[]>, y: number, tolerance: number): number {
  for (const key of map.keys()) {
    if (Math.abs(key - y) <= tolerance) return key
  }
  return y
}

const SKIP_PATTERNS = [
  /saldo/i,
  /balans/i,
  /openingssaldo/i,
  /eindsaldo/i,
  /beginsaldo/i,
  /totaal/i,
  /rekeningnummer/i,
  /iban/i,
  /bic/i,
  /pagina/i,
  /page\s*\d/i,
  /overzicht/i,
  /datum\s+omschrijving/i,
  /^\s*\d{2}[-/.]\d{2}[-/.]\d{4}\s*$/,  // date-only lines
  /rekeningoverzicht/i,
  /dagafschrift/i,
  /valutadatum/i,
  /vorig\s*saldo/i,
  /nieuw\s*saldo/i,
]

function extractTransactions(lines: string[]): ParsedRow[] {
  const rows: ParsedRow[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (SKIP_PATTERNS.some(p => p.test(line))) continue

    const row = tryParseTransaction(line)
    if (row) {
      // Look ahead for continuation lines (description that spans multiple rows)
      let desc = row.description
      for (let j = i + 1; j < lines.length && j <= i + 2; j++) {
        const next = lines[j]
        // Continuation: no date, no amount, just text
        if (!next.match(/\d{2}[-/.]\d{2}[-/.]\d{2,4}/) && !next.match(/[\d.]+,\d{2}/) && next.trim().length > 2) {
          if (!SKIP_PATTERNS.some(p => p.test(next))) {
            desc += ' ' + next.trim()
            i = j
          }
        } else {
          break
        }
      }
      row.description = desc
      row.supplier = extractSupplier(desc)
      rows.push(row)
    }
  }

  return rows
}

function tryParseTransaction(line: string): ParsedRow | null {
  // Pattern 1: DD-MM-YYYY  description  [Af/Bij]  amount
  // ING Belgium/NL PDF formats vary, try multiple patterns

  // Pattern: date + text + Af/Bij + amount (e.g. "01-06-2026  CARREFOUR  Af  45,30")
  let m = line.match(
    /(\d{2}[-/.]\d{2}[-/.]\d{2,4})\s{2,}(.+?)\s{2,}(Af|Bij)\s{1,}([\d.]+,\d{2})/
  )
  if (m) {
    const date = normalizeDate(m[1])
    const desc = m[2].trim()
    const amount = parseAmount(m[4])
    const signed = m[3] === 'Af' ? -amount : amount
    return { date, description: desc, amount: signed, supplier: extractSupplier(desc), raw: line }
  }

  // Pattern: date + text + negative/positive amount (e.g. "01-06-2026  CARREFOUR  -45,30")
  m = line.match(
    /(\d{2}[-/.]\d{2}[-/.]\d{2,4})\s{2,}(.+?)\s{2,}([+-])\s*([\d.]+,\d{2})/
  )
  if (m) {
    const date = normalizeDate(m[1])
    const desc = m[2].trim()
    const amount = parseAmount(m[4])
    const signed = m[3] === '-' ? -amount : amount
    return { date, description: desc, amount: signed, supplier: extractSupplier(desc), raw: line }
  }

  // Pattern: date + text + amount at end (no sign — treat as expense if no clear indicator)
  m = line.match(
    /(\d{2}[-/.]\d{2}[-/.]\d{2,4})\s{2,}(.+?)\s{2,}([\d.]+,\d{2})\s*$/
  )
  if (m) {
    const date = normalizeDate(m[1])
    const desc = m[2].trim()
    const amount = parseAmount(m[3])
    // Check for debit/credit keywords in description
    const isCredit = /\b(bij|credit|storting|ontvangen|betaling\s+van)\b/i.test(desc)
    const signed = isCredit ? amount : -amount
    return { date, description: desc, amount: signed, supplier: extractSupplier(desc), raw: line }
  }

  // Pattern: amount + Af/Bij comes before description (some ING formats)
  m = line.match(
    /(\d{2}[-/.]\d{2}[-/.]\d{2,4})\s+(.+?)\s+([\d.]+,\d{2})\s+(Af|Bij)/
  )
  if (m) {
    const date = normalizeDate(m[1])
    const desc = m[2].trim()
    const amount = parseAmount(m[3])
    const signed = m[4] === 'Af' ? -amount : amount
    return { date, description: desc, amount: signed, supplier: extractSupplier(desc), raw: line }
  }

  return null
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

function extractSupplier(description: string): string {
  // Take the first meaningful chunk before common separators
  return description
    .split(/\s{3,}|[-–—]|\bte\b|\bbet\.\b/i)[0]
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDate(d: string): string {
  const sep = d.includes('-') ? '-' : d.includes('/') ? '/' : '.'
  const parts = d.split(sep)

  if (parts[0].length === 4) {
    return `${parts[0]}-${parts[1]}-${parts[2]}`
  }
  const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
  return `${year}-${parts[1]}-${parts[0]}`
}
