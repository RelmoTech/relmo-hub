export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Loon / Inkomsten': ['loon', 'salaris', 'wedde', 'freelance', 'factuur ontvangen'],
  'Robot Events': ['robot', 'relmo', 'event', 'verhuur', 'boeking'],
  'Facturatie ontvangen': ['betaling', 'overschrijving klant', 'factuur'],
  'Boodschappen': ['carrefour', 'delhaize', 'colruyt', 'lidl', 'aldi', 'spar', 'albert heijn'],
  'Restaurant / Eten': ['restaurant', 'café', 'pizza', 'mcdonalds', 'deliveroo', 'uber eats', 'frituur'],
  'Transport': ['nmbs', 'de lijn', 'stib', 'uber', 'taxi', 'parking', 'q8', 'shell', 'total', 'texaco'],
  'Telefoon / Internet': ['proximus', 'telenet', 'base', 'orange', 'voo'],
  'Energie': ['fluvius', 'engie', 'luminus', 'octa+'],
  'Verzekeringen': ['ag insurance', 'ethias', 'axa', 'belfius insurance', 'allianz'],
  'Gezondheid': ['apotheker', 'apotheek', 'dokter', 'tandarts', 'ziekenhuis', 'cm ', 'mutualiteit'],
  'Abonnementen / Software': ['netflix', 'spotify', 'amazon', 'apple', 'google', 'microsoft', 'adobe', 'github', 'railway', 'netlify', 'replit', 'digitalocean', 'openai', 'anthropic'],
  'Marketing / Reclame': ['meta ads', 'google ads', 'linkedin', 'facebook ads', 'canva'],
  'Bankkosten': ['bankkosten', 'ing bank', 'belfius bank', 'kbc bank', 'beheerskosten'],
  'Belastingen': ['belasting', 'fod', 'spf', 'btw', 'tva', 'gemeentebelasting'],
}

export function autoCategorize(description: string): string | null {
  const lower = description.toLowerCase().trim()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category
      }
    }
  }
  return null
}

export function normalizeSupplier(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}
