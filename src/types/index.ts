export interface Activity {
  id: string
  name: string
  color: string
  icon: string
}

export interface Project {
  id: string
  title: string
  activity_id: string | null
  status: 'actief' | 'afgerond' | 'on-hold'
  client: string | null
  deadline: string | null
  notes: string | null
  created_at: string
}

export interface Todo {
  id: string
  title: string
  done: boolean
  project_id: string | null
  activity_id: string | null
  due_date: string | null
  priority: 'hoog' | 'normaal' | 'laag'
  kanban_column: 'todo' | 'in-progress' | 'review' | 'done'
  notes: string | null
  created_at: string
}

export interface Transaction {
  id: string
  date: string
  description: string | null
  amount: number
  category: string | null
  activity_id: string | null
  supplier: string | null
  raw_csv_row: string | null
  cost_type: 'variabel' | 'vast'
  created_at: string
}

export interface SupplierCategory {
  id: string
  supplier_key: string
  category: string
  activity_id: string | null
  updated_at: string
}

export interface Prospect {
  id: string
  entreprise: string
  secteur: string | null
  canal_utilise: string | null
  statut: string | null
  date_envoi: string | null
  j3: string | null
  j7: string | null
  j30: string | null
  j60: string | null
  info: string | null
  created_at: string
}

export interface Reservation {
  id: string
  klant: string
  event: string | null
  datum: string
  info: string | null
  email: string | null
  tel: string | null
  created_at: string
}

export interface FixedCostTemplate {
  id: string
  description: string
  amount: number
  category: string | null
  activity_id: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | 'transfer'
  color: string | null
  icon: string | null
}

export interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string | null
  client_address: string | null
  activity_id: string | null
  issue_date: string
  due_date: string | null
  status: 'concept' | 'verzonden' | 'betaald' | 'vervallen'
  lines: InvoiceLine[]
  notes: string | null
  created_at: string
}

export interface InvoiceLine {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
}
