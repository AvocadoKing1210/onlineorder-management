'use client'

import { getSupabaseClient } from '@/lib/auth'

export interface Promotion {
  id: string
  name: string
  description?: string
  type: 'bogo' | 'percent_off' | 'amount_off'
  percent_off?: number
  amount_off_cents?: number
  active_from: string
  active_until?: string
  stackable: boolean
  limit_per_user?: number
  limit_total?: number
  created_at: string
  updated_at: string
}

export interface CreatePromotionData {
  name: string
  description?: string
  type: 'bogo' | 'percent_off' | 'amount_off'
  percent_off?: number
  amount_off_cents?: number
  active_from: string
  active_until?: string
  stackable?: boolean
  limit_per_user?: number
  limit_total?: number
}

export interface UpdatePromotionData {
  name?: string
  description?: string
  type?: 'bogo' | 'percent_off' | 'amount_off'
  percent_off?: number
  amount_off_cents?: number
  active_from?: string
  active_until?: string
  stackable?: boolean
  limit_per_user?: number
  limit_total?: number
}

export type PromotionStatus = 'active' | 'inactive' | 'expired' | 'upcoming'

export interface PromotionFilters {
  type?: 'bogo' | 'percent_off' | 'amount_off'
  status?: PromotionStatus
  search?: string
}

/**
 * Check if a promotion is currently active
 */
export function isPromotionActive(promotion: Promotion): boolean {
  const now = new Date()
  const from = new Date(promotion.active_from)
  const until = promotion.active_until ? new Date(promotion.active_until) : null
  
  return from <= now && (!until || until > now)
}

/**
 * Get the status of a promotion
 */
export function getPromotionStatus(promotion: Promotion): PromotionStatus {
  const now = new Date()
  const from = new Date(promotion.active_from)
  const until = promotion.active_until ? new Date(promotion.active_until) : null
  
  if (until && until < now) {
    return 'expired'
  }
  if (from > now) {
    return 'upcoming'
  }
  if (from <= now && (!until || until > now)) {
    return 'active'
  }
  return 'inactive'
}

/**
 * Format discount display for a promotion
 */
export function formatPromotionDiscount(promotion: Promotion): string {
  switch (promotion.type) {
    case 'percent_off':
      return promotion.percent_off ? `${promotion.percent_off}% off` : ''
    case 'amount_off':
      return promotion.amount_off_cents
        ? `$${(promotion.amount_off_cents / 100).toFixed(2)} off`
        : ''
    case 'bogo':
      return 'BOGO'
    default:
      return ''
  }
}

/**
 * Fetch all promotions with optional filters
 */
export async function getPromotions(
  filters?: PromotionFilters
): Promise<Promotion[]> {
  const supabase = await getSupabaseClient()
  let query = supabase.from('promotion').select('*')

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query.order('active_from', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch promotions: ${error.message}`)
  }

  let promotions = data || []

  // Filter by status if provided
  if (filters?.status) {
    promotions = promotions.filter((p) => getPromotionStatus(p) === filters.status)
  }

  return promotions
}

/**
 * Fetch currently active promotions
 */
export async function getActivePromotions(): Promise<Promotion[]> {
  const promotions = await getPromotions()
  return promotions.filter(isPromotionActive)
}

/**
 * Fetch a single promotion by ID
 */
export async function getPromotionById(id: string): Promise<Promotion | null> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('promotion')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch promotion: ${error.message}`)
  }

  return data
}

/**
 * Create a new promotion
 */
export async function createPromotion(
  data: CreatePromotionData
): Promise<Promotion> {
  const supabase = await getSupabaseClient()

  // Prepare payload based on type
  const payload: any = {
    name: data.name,
    description: data.description || null,
    type: data.type,
    active_from: data.active_from,
    active_until: data.active_until || null,
    stackable: data.stackable ?? false,
    limit_per_user: data.limit_per_user || null,
    limit_total: data.limit_total || null,
  }

  // Set discount values based on type
  if (data.type === 'percent_off') {
    payload.percent_off = data.percent_off
    payload.amount_off_cents = null
  } else if (data.type === 'amount_off') {
    payload.amount_off_cents = data.amount_off_cents
    payload.percent_off = null
  } else {
    // BOGO type
    payload.percent_off = null
    payload.amount_off_cents = null
  }

  const { data: promotion, error } = await supabase
    .from('promotion')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create promotion: ${error.message}`)
  }

  if (!promotion) {
    throw new Error('Failed to create promotion: No data returned')
  }

  return promotion
}

/**
 * Update a promotion
 */
export async function updatePromotion(
  id: string,
  data: UpdatePromotionData
): Promise<Promotion> {
  const supabase = await getSupabaseClient()

  // Prepare payload
  const payload: any = {}

  if (data.name !== undefined) payload.name = data.name
  if (data.description !== undefined)
    payload.description = data.description || null
  if (data.type !== undefined) payload.type = data.type
  if (data.active_from !== undefined) payload.active_from = data.active_from
  if (data.active_until !== undefined)
    payload.active_until = data.active_until || null
  if (data.stackable !== undefined) payload.stackable = data.stackable
  if (data.limit_per_user !== undefined)
    payload.limit_per_user = data.limit_per_user || null
  if (data.limit_total !== undefined)
    payload.limit_total = data.limit_total || null

  // Handle discount values based on type
  if (data.type !== undefined) {
    if (data.type === 'percent_off') {
      payload.percent_off = data.percent_off
      payload.amount_off_cents = null
    } else if (data.type === 'amount_off') {
      payload.amount_off_cents = data.amount_off_cents
      payload.percent_off = null
    } else {
      // BOGO type
      payload.percent_off = null
      payload.amount_off_cents = null
    }
  } else {
    // If type is not being changed, handle discount values separately
    if (data.percent_off !== undefined) {
      payload.percent_off = data.percent_off
      if (data.percent_off === null || data.percent_off === undefined) {
        payload.amount_off_cents = null
      }
    }
    if (data.amount_off_cents !== undefined) {
      payload.amount_off_cents = data.amount_off_cents
      if (data.amount_off_cents === null || data.amount_off_cents === undefined) {
        payload.percent_off = null
      }
    }
  }

  const { data: promotion, error } = await supabase
    .from('promotion')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update promotion: ${error.message}`)
  }

  if (!promotion) {
    throw new Error('Failed to update promotion: No data returned')
  }

  return promotion
}

/**
 * Delete a promotion
 */
export async function deletePromotion(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase.from('promotion').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete promotion: ${error.message}`)
  }
}

