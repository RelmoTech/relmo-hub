import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Activity, Project, Todo, Transaction, Invoice, Category, SupplierCategory, FixedCostTemplate, Prospect, Reservation } from '@/types'

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('activities').select('*').order('name').then(({ data }) => {
      setActivities(data || [])
      setLoading(false)
    })
  }, [])

  return { activities, loading }
}

export function useProjects(activityId?: string | null) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (activityId) q = q.eq('activity_id', activityId)
    const { data } = await q
    setProjects(data || [])
    setLoading(false)
  }, [activityId])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (project: Partial<Project>) => {
    if (project.id) {
      await supabase.from('projects').update(project).eq('id', project.id)
    } else {
      await supabase.from('projects').insert(project)
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id)
    fetch()
  }

  return { projects, loading, upsert, remove, refetch: fetch }
}

export function useTodos(activityId?: string | null) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('todos').select('*').order('created_at', { ascending: false })
    if (activityId) q = q.eq('activity_id', activityId)
    const { data } = await q
    setTodos(data || [])
    setLoading(false)
  }, [activityId])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (todo: Partial<Todo>) => {
    if (todo.id) {
      await supabase.from('todos').update(todo).eq('id', todo.id)
    } else {
      await supabase.from('todos').insert(todo)
    }
    fetch()
  }

  const toggle = async (id: string, done: boolean) => {
    await supabase.from('todos').update({ done }).eq('id', id)
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id)
    fetch()
  }

  return { todos, loading, upsert, toggle, remove, refetch: fetch }
}

export function useTransactions(activityId?: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('transactions').select('*').order('date', { ascending: false })
    if (activityId) q = q.eq('activity_id', activityId)
    const { data } = await q
    setTransactions(data || [])
    setLoading(false)
  }, [activityId])

  useEffect(() => { fetch() }, [fetch])

  const insert = async (tx: Partial<Transaction>) => {
    await supabase.from('transactions').insert(tx)
    fetch()
  }

  const update = async (id: string, data: Partial<Transaction>) => {
    await supabase.from('transactions').update(data).eq('id', id)
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id)
    fetch()
  }

  return { transactions, loading, insert, update, remove, refetch: fetch }
}

export function useInvoices(activityId?: string | null) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('invoices').select('*').order('created_at', { ascending: false })
    if (activityId) q = q.eq('activity_id', activityId)
    const { data } = await q
    setInvoices(data || [])
    setLoading(false)
  }, [activityId])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (invoice: Partial<Invoice>) => {
    if (invoice.id) {
      await supabase.from('invoices').update(invoice).eq('id', invoice.id)
    } else {
      await supabase.from('invoices').insert(invoice)
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('invoices').delete().eq('id', id)
    fetch()
  }

  return { invoices, loading, upsert, remove, refetch: fetch }
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (cat: Partial<Category>) => {
    if (cat.id) {
      await supabase.from('categories').update(cat).eq('id', cat.id)
    } else {
      await supabase.from('categories').insert(cat)
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id)
    fetch()
  }

  return { categories, upsert, remove, refetch: fetch }
}

export function useProspects(tableName: string = 'prospects') {
  const [prospects, setProspects] = useState<Prospect[]>([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from(tableName).select('*').order('date_envoi', { ascending: false, nullsFirst: false })
    setProspects(data || [])
  }, [tableName])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (p: Partial<Prospect>) => {
    if (p.id) {
      await supabase.from(tableName).update(p).eq('id', p.id)
    } else {
      await supabase.from(tableName).insert(p)
    }
    fetch()
  }

  const bulkInsert = async (rows: Partial<Prospect>[]): Promise<string | null> => {
    const { error } = await supabase.from(tableName).insert(rows)
    if (error) return error.message
    fetch()
    return null
  }

  const remove = async (id: string) => {
    await supabase.from(tableName).delete().eq('id', id)
    fetch()
  }

  return { prospects, upsert, bulkInsert, remove, refetch: fetch }
}

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('reservations').select('*').order('datum', { ascending: true })
    setReservations(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (r: Partial<Reservation>) => {
    if (r.id) {
      await supabase.from('reservations').update(r).eq('id', r.id)
    } else {
      await supabase.from('reservations').insert(r)
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('reservations').delete().eq('id', id)
    fetch()
  }

  return { reservations, upsert, remove, refetch: fetch }
}

export function useFixedCostTemplates() {
  const [templates, setTemplates] = useState<FixedCostTemplate[]>([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('fixed_cost_templates').select('*').order('description')
    setTemplates(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (t: Partial<FixedCostTemplate>) => {
    if (t.id) {
      await supabase.from('fixed_cost_templates').update(t).eq('id', t.id)
    } else {
      await supabase.from('fixed_cost_templates').insert(t)
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('fixed_cost_templates').delete().eq('id', id)
    fetch()
  }

  return { templates, upsert, remove, refetch: fetch }
}

export function useSupplierCategories() {
  const [supplierCategories, setSupplierCategories] = useState<SupplierCategory[]>([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('supplier_categories').select('*').order('supplier_key')
    setSupplierCategories(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (key: string, category: string, activityId?: string | null) => {
    await supabase.from('supplier_categories').upsert({
      supplier_key: key,
      category,
      activity_id: activityId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'supplier_key' })
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('supplier_categories').delete().eq('id', id)
    fetch()
  }

  return { supplierCategories, upsert, remove, refetch: fetch }
}
