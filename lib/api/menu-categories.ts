'use client'

import { getSupabaseClient } from '@/lib/auth'

export interface MenuCategory {
  id: string
  name: string
  position: number
  visible: boolean
  created_at: string
  updated_at: string
}

export interface CreateMenuCategoryData {
  name: string
  visible: boolean
}

export interface UpdateMenuCategoryData {
  name?: string
  visible?: boolean
}

/**
 * Fetch all menu categories ordered by position
 */
export async function getMenuCategories(): Promise<MenuCategory[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_category')
    .select('*')
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch menu categories: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch a single menu category by ID
 */
export async function getMenuCategoryById(id: string): Promise<MenuCategory | null> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_category')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch menu category: ${error.message}`)
  }

  return data
}

/**
 * Create a new menu category
 * Position is automatically calculated to be the last position
 */
export async function createMenuCategory(data: CreateMenuCategoryData): Promise<MenuCategory> {
  const supabase = await getSupabaseClient()
  
  // Get the next position automatically
  const nextPosition = await getNextPosition()
  
  const { data: category, error } = await supabase
    .from('menu_category')
    .insert([{ ...data, position: nextPosition }])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create menu category: ${error.message}`)
  }

  if (!category) {
    throw new Error('Failed to create menu category: No data returned')
  }

  return category
}

/**
 * Update a menu category
 */
export async function updateMenuCategory(
  id: string,
  data: UpdateMenuCategoryData
): Promise<MenuCategory> {
  const supabase = await getSupabaseClient()
  const { data: category, error } = await supabase
    .from('menu_category')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update menu category: ${error.message}`)
  }

  if (!category) {
    throw new Error('Failed to update menu category: No data returned')
  }

  return category
}

/**
 * Delete a menu category
 */
export async function deleteMenuCategory(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase.from('menu_category').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete menu category: ${error.message}`)
  }
}

/**
 * Reorder categories by updating their positions
 * Uses a two-phase approach to avoid unique constraint violations:
 * 1. First, move all categories to temporary high values
 * 2. Then, assign final positions
 * @param categoryIds Array of category IDs in the desired order
 */
export async function reorderCategories(categoryIds: string[]): Promise<void> {
  const supabase = await getSupabaseClient()
  const TEMP_OFFSET = 100000 // High value to avoid conflicts with any existing positions

  // Phase 1: Move all categories to temporary positions to free up the position space
  for (let index = 0; index < categoryIds.length; index++) {
    const id = categoryIds[index]
    const { error } = await supabase
      .from('menu_category')
      .update({ position: TEMP_OFFSET + index })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to reorder categories (phase 1): ${error.message}`)
    }
  }

  // Phase 2: Assign final positions
  for (let index = 0; index < categoryIds.length; index++) {
    const id = categoryIds[index]
    const { error } = await supabase
      .from('menu_category')
      .update({ position: index })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to reorder categories (phase 2): ${error.message}`)
    }
  }
}

/**
 * Get the next available position for a new category
 */
export async function getNextPosition(): Promise<number> {
  const categories = await getMenuCategories()
  if (categories.length === 0) return 0
  return Math.max(...categories.map((c) => c.position)) + 1
}

