'use client'

import { getSupabaseClient } from '@/lib/auth'

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string | null
  price: string // NUMERIC(12, 2) returns as string
  image_url: string | null
  video_ref: string | null
  position: number
  visible: boolean
  dietary_tags: string[] | null
  availability_notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Joined category data
  category?: {
    id: string
    name: string
  }
}

export interface MenuItemWithCategory extends MenuItem {
  category: {
    id: string
    name: string
  }
}

export interface CreateMenuItemData {
  category_id: string
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  video_ref?: string | null
  position?: number
  visible?: boolean
  dietary_tags?: string[] | null
  availability_notes?: string | null
}

export interface UpdateMenuItemData {
  category_id?: string
  name?: string
  description?: string | null
  price?: number
  image_url?: string | null
  video_ref?: string | null
  position?: number
  visible?: boolean
  dietary_tags?: string[] | null
  availability_notes?: string | null
}

export interface MenuItemFilters {
  category_id?: string
  visible?: boolean
  search?: string
}

/**
 * Fetch all menu items with optional filters
 * Includes category information via join
 * Automatically excludes soft-deleted items (deleted_at IS NULL)
 */
export async function getMenuItems(
  filters?: MenuItemFilters
): Promise<MenuItemWithCategory[]> {
  const supabase = await getSupabaseClient()
  
  let query = supabase
    .from('menu_item')
    .select(`
      *,
      menu_category(id, name)
    `)
    .is('deleted_at', null) // Exclude soft-deleted items
    .order('category_id', { ascending: true })
    .order('position', { ascending: true })

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  if (filters?.visible !== undefined) {
    query = query.eq('visible', filters.visible)
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch menu items: ${error.message}`)
  }

  return (data || []).map((item: any) => ({
    ...item,
    category: Array.isArray(item.menu_category) 
      ? item.menu_category[0] 
      : item.menu_category,
  })) as MenuItemWithCategory[]
}

/**
 * Fetch a single menu item by ID with category information
 * Automatically excludes soft-deleted items (deleted_at IS NULL)
 */
export async function getMenuItemById(
  id: string
): Promise<MenuItemWithCategory | null> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_item')
    .select(`
      *,
      menu_category(id, name)
    `)
    .eq('id', id)
    .is('deleted_at', null) // Exclude soft-deleted items
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch menu item: ${error.message}`)
  }

  return {
    ...data,
    category: Array.isArray(data.menu_category) 
      ? data.menu_category[0] 
      : data.menu_category,
  } as MenuItemWithCategory
}

/**
 * Create a new menu item
 * Position is automatically calculated to be the last position within the category
 */
export async function createMenuItem(
  data: CreateMenuItemData
): Promise<MenuItem> {
  const supabase = await getSupabaseClient()
  
  // Get the next position automatically within the category
  // Position is always auto-calculated, never set manually
  const nextPosition = await getNextPosition(data.category_id)
  
  // Remove position from data if it exists (shouldn't be set manually)
  const { position: _, ...dataWithoutPosition } = data
  
  const { data: item, error } = await supabase
    .from('menu_item')
    .insert([
      {
        ...dataWithoutPosition,
        position: nextPosition,
        visible: data.visible ?? true,
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create menu item: ${error.message}`)
  }

  if (!item) {
    throw new Error('Failed to create menu item: No data returned')
  }

  return item
}

/**
 * Update a menu item
 * Cannot update soft-deleted items (must restore first)
 */
export async function updateMenuItem(
  id: string,
  data: UpdateMenuItemData
): Promise<MenuItem> {
  const supabase = await getSupabaseClient()
  const { data: item, error } = await supabase
    .from('menu_item')
    .update(data)
    .eq('id', id)
    .is('deleted_at', null) // Cannot update deleted items
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update menu item: ${error.message}`)
  }

  if (!item) {
    throw new Error('Failed to update menu item: No data returned. Item may be deleted.')
  }

  return item
}

/**
 * Soft delete a menu item
 * Sets deleted_at timestamp instead of actually deleting the record
 * This preserves data integrity for historical orders while hiding the item from management platform
 */
export async function deleteMenuItem(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  
  // Soft delete by setting deleted_at timestamp
  const { error } = await supabase
    .from('menu_item')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null) // Only update if not already deleted

  if (error) {
    throw new Error(`Failed to delete menu item: ${error.message}`)
  }
}

/**
 * Restore a soft-deleted menu item
 * Removes the deleted_at timestamp to make it visible again
 */
export async function restoreMenuItem(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  
  const { error } = await supabase
    .from('menu_item')
    .update({ deleted_at: null })
    .eq('id', id)
    .not('deleted_at', 'is', null) // Only update if currently deleted

  if (error) {
    throw new Error(`Failed to restore menu item: ${error.message}`)
  }
}

/**
 * Bulk update menu items
 * Only updates non-deleted items
 */
export async function bulkUpdateItems(
  ids: string[],
  updates: UpdateMenuItemData
): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase
    .from('menu_item')
    .update(updates)
    .in('id', ids)
    .is('deleted_at', null) // Only update non-deleted items

  if (error) {
    throw new Error(`Failed to bulk update menu items: ${error.message}`)
  }
}

/**
 * Get the next available position for a new item within a category
 * Only considers non-deleted items
 */
export async function getNextPosition(categoryId: string): Promise<number> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_item')
    .select('position')
    .eq('category_id', categoryId)
    .is('deleted_at', null) // Only count non-deleted items
    .order('position', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to get next position: ${error.message}`)
  }

  if (!data || data.length === 0) return 0
  return (data[0].position ?? -1) + 1
}

/**
 * Reorder menu items within a category by updating their positions
 * Uses a two-phase approach to avoid unique constraint violations
 * Only reorders non-deleted items
 * @param categoryId The category ID to reorder items within
 * @param itemIds Array of item IDs in the desired order (must all be in the same category)
 */
export async function reorderItems(categoryId: string, itemIds: string[]): Promise<void> {
  const supabase = await getSupabaseClient()
  const TEMP_OFFSET = 100000 // High value to avoid conflicts with any existing positions

  // Phase 1: Move all items to temporary positions to free up the position space
  for (let index = 0; index < itemIds.length; index++) {
    const id = itemIds[index]
    const { error } = await supabase
      .from('menu_item')
      .update({ position: TEMP_OFFSET + index })
      .eq('id', id)
      .eq('category_id', categoryId)
      .is('deleted_at', null) // Only reorder non-deleted items

    if (error) {
      throw new Error(`Failed to reorder items (phase 1): ${error.message}`)
    }
  }

  // Phase 2: Assign final positions
  for (let index = 0; index < itemIds.length; index++) {
    const id = itemIds[index]
    const { error } = await supabase
      .from('menu_item')
      .update({ position: index })
      .eq('id', id)
      .eq('category_id', categoryId)
      .is('deleted_at', null) // Only reorder non-deleted items

    if (error) {
      throw new Error(`Failed to reorder items (phase 2): ${error.message}`)
    }
  }
}

/**
 * Get modifier groups associated with a menu item
 */
export async function getMenuItemModifierGroups(
  menuItemId: string
): Promise<string[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_item_modifier_group')
    .select('modifier_group_id')
    .eq('menu_item_id', menuItemId)
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch modifier groups: ${error.message}`)
  }

  return (data || []).map((row: any) => row.modifier_group_id)
}

/**
 * Set modifier groups for a menu item
 * Replaces all existing associations with the new ones
 */
export async function setMenuItemModifierGroups(
  menuItemId: string,
  modifierGroupIds: string[]
): Promise<void> {
  const supabase = await getSupabaseClient()

  // First, delete all existing associations
  const { error: deleteError } = await supabase
    .from('menu_item_modifier_group')
    .delete()
    .eq('menu_item_id', menuItemId)

  if (deleteError) {
    throw new Error(`Failed to delete existing associations: ${deleteError.message}`)
  }

  // Then, insert new associations with positions
  if (modifierGroupIds.length > 0) {
    const associations = modifierGroupIds.map((groupId, index) => ({
      menu_item_id: menuItemId,
      modifier_group_id: groupId,
      position: index,
    }))

    const { error: insertError } = await supabase
      .from('menu_item_modifier_group')
      .insert(associations)

    if (insertError) {
      throw new Error(`Failed to create associations: ${insertError.message}`)
    }
  }
}

/**
 * Get all unique dietary tags from all menu items
 * Returns a sorted array of all unique dietary tags used across all menu items
 * Only includes tags from non-deleted items
 */
export async function getAllDietaryTags(): Promise<string[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_item')
    .select('dietary_tags')
    .is('deleted_at', null) // Only include non-deleted items
    .not('dietary_tags', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch dietary tags: ${error.message}`)
  }

  const tagSet = new Set<string>()
  if (data) {
    data.forEach((item: any) => {
      if (item.dietary_tags && Array.isArray(item.dietary_tags)) {
        item.dietary_tags.forEach((tag: string) => {
          if (tag && typeof tag === 'string' && tag.trim()) {
            tagSet.add(tag.trim())
          }
        })
      }
    })
  }

  return Array.from(tagSet).sort()
}

