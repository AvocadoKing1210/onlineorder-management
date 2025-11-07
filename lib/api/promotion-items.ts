'use client'

import { getSupabaseClient } from '@/lib/auth'

export interface PromotionItem {
  id: string
  promotion_id: string
  menu_item_id: string
  role: 'buy' | 'get' | 'target'
  required_quantity: number | null
  get_quantity: number | null
  created_at: string
  updated_at: string
}

export interface PromotionItemWithRelations extends PromotionItem {
  promotion?: {
    id: string
    name: string
    type: string
  }
  menu_item?: {
    id: string
    name: string
    visible: boolean
  }
}

export interface CreatePromotionItemData {
  promotion_id: string
  menu_item_id: string
  role: 'buy' | 'get' | 'target'
  required_quantity?: number | null
  get_quantity?: number | null
}

export interface UpdatePromotionItemData {
  role?: 'buy' | 'get' | 'target'
  required_quantity?: number | null
  get_quantity?: number | null
}

export interface PromotionItemFilters {
  promotion_id?: string
  menu_item_id?: string
  role?: 'buy' | 'get' | 'target'
}

/**
 * Fetch all promotion items
 */
export async function getPromotionItems(
  filters?: PromotionItemFilters
): Promise<PromotionItemWithRelations[]> {
  const supabase = await getSupabaseClient()
  
  let query = supabase
    .from('promotion_item')
    .select(`
      *,
      promotion:promotion_id (
        id,
        name,
        type
      ),
      menu_item:menu_item_id (
        id,
        name,
        visible
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.promotion_id) {
    query = query.eq('promotion_id', filters.promotion_id)
  }

  if (filters?.menu_item_id) {
    query = query.eq('menu_item_id', filters.menu_item_id)
  }

  if (filters?.role) {
    query = query.eq('role', filters.role)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch promotion items: ${error.message}`)
  }

  return (data || []) as PromotionItemWithRelations[]
}

/**
 * Fetch promotion items for a specific promotion
 */
export async function getPromotionItemsByPromotion(
  promotionId: string
): Promise<PromotionItemWithRelations[]> {
  return getPromotionItems({ promotion_id: promotionId })
}

/**
 * Fetch promotions for a specific menu item
 */
export async function getPromotionItemsByMenuItem(
  menuItemId: string
): Promise<PromotionItemWithRelations[]> {
  return getPromotionItems({ menu_item_id: menuItemId })
}

/**
 * Fetch a single promotion item by ID
 */
export async function getPromotionItemById(
  id: string
): Promise<PromotionItemWithRelations | null> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('promotion_item')
    .select(`
      *,
      promotion:promotion_id (
        id,
        name,
        type
      ),
      menu_item:menu_item_id (
        id,
        name,
        visible
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch promotion item: ${error.message}`)
  }

  return data as PromotionItemWithRelations
}

/**
 * Create a new promotion item association
 */
export async function createPromotionItem(
  data: CreatePromotionItemData
): Promise<PromotionItem> {
  const supabase = await getSupabaseClient()
  
  // Check for duplicate
  const { data: existing } = await supabase
    .from('promotion_item')
    .select('id')
    .eq('promotion_id', data.promotion_id)
    .eq('menu_item_id', data.menu_item_id)
    .single()

  if (existing) {
    throw new Error('This promotion-item association already exists')
  }

  const payload: any = {
    promotion_id: data.promotion_id,
    menu_item_id: data.menu_item_id,
    role: data.role,
    required_quantity: data.required_quantity ?? null,
    get_quantity: data.get_quantity ?? null,
  }

  const { data: item, error } = await supabase
    .from('promotion_item')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create promotion item: ${error.message}`)
  }

  if (!item) {
    throw new Error('Failed to create promotion item: No data returned')
  }

  return item
}

/**
 * Update a promotion item association
 */
export async function updatePromotionItem(
  id: string,
  data: UpdatePromotionItemData
): Promise<PromotionItem> {
  const supabase = await getSupabaseClient()
  
  const payload: any = {}
  if (data.role !== undefined) payload.role = data.role
  if (data.required_quantity !== undefined) payload.required_quantity = data.required_quantity ?? null
  if (data.get_quantity !== undefined) payload.get_quantity = data.get_quantity ?? null

  const { data: item, error } = await supabase
    .from('promotion_item')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update promotion item: ${error.message}`)
  }

  if (!item) {
    throw new Error('Failed to update promotion item: No data returned')
  }

  return item
}

/**
 * Delete a promotion item association
 */
export async function deletePromotionItem(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase
    .from('promotion_item')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete promotion item: ${error.message}`)
  }
}

/**
 * Delete all item associations for a promotion
 */
export async function bulkDeletePromotionItems(
  promotionId: string
): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase
    .from('promotion_item')
    .delete()
    .eq('promotion_id', promotionId)

  if (error) {
    throw new Error(`Failed to delete promotion items: ${error.message}`)
  }
}

