'use client'

import { getSupabaseClient } from '@/lib/auth'

export interface PromotionCategory {
  id: string
  promotion_id: string
  category_id: string
  created_at: string
  updated_at: string
}

export interface PromotionCategoryWithRelations extends PromotionCategory {
  promotion?: {
    id: string
    name: string
    type: string
  }
  category?: {
    id: string
    name: string
    visible: boolean
  }
}

export interface CreatePromotionCategoryData {
  promotion_id: string
  category_id: string
}

export interface PromotionCategoryFilters {
  promotion_id?: string
  category_id?: string
}

/**
 * Fetch all promotion category associations
 */
export async function getPromotionCategories(
  filters?: PromotionCategoryFilters
): Promise<PromotionCategoryWithRelations[]> {
  const supabase = await getSupabaseClient()
  
  let query = supabase
    .from('promotion_category')
    .select(`
      *,
      promotion:promotion_id (
        id,
        name,
        type
      ),
      category:category_id (
        id,
        name,
        visible
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.promotion_id) {
    query = query.eq('promotion_id', filters.promotion_id)
  }

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch promotion categories: ${error.message}`)
  }

  return (data || []) as PromotionCategoryWithRelations[]
}

/**
 * Fetch promotion categories for a specific promotion
 */
export async function getPromotionCategoriesByPromotion(
  promotionId: string
): Promise<PromotionCategoryWithRelations[]> {
  return getPromotionCategories({ promotion_id: promotionId })
}

/**
 * Fetch promotions for a specific category
 */
export async function getPromotionCategoriesByCategory(
  categoryId: string
): Promise<PromotionCategoryWithRelations[]> {
  return getPromotionCategories({ category_id: categoryId })
}

/**
 * Create a new promotion category association
 */
export async function createPromotionCategory(
  data: CreatePromotionCategoryData
): Promise<PromotionCategory> {
  const supabase = await getSupabaseClient()
  
  // Check for duplicate
  const { data: existing } = await supabase
    .from('promotion_category')
    .select('id')
    .eq('promotion_id', data.promotion_id)
    .eq('category_id', data.category_id)
    .single()

  if (existing) {
    throw new Error('This promotion-category association already exists')
  }

  const { data: association, error } = await supabase
    .from('promotion_category')
    .insert([data])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create promotion category: ${error.message}`)
  }

  if (!association) {
    throw new Error('Failed to create promotion category: No data returned')
  }

  return association
}

/**
 * Delete a promotion category association
 */
export async function deletePromotionCategory(
  promotionId: string,
  categoryId: string
): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase
    .from('promotion_category')
    .delete()
    .eq('promotion_id', promotionId)
    .eq('category_id', categoryId)

  if (error) {
    throw new Error(`Failed to delete promotion category: ${error.message}`)
  }
}

/**
 * Delete all category associations for a promotion
 */
export async function bulkDeletePromotionCategories(
  promotionId: string
): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase
    .from('promotion_category')
    .delete()
    .eq('promotion_id', promotionId)

  if (error) {
    throw new Error(`Failed to delete promotion categories: ${error.message}`)
  }
}

