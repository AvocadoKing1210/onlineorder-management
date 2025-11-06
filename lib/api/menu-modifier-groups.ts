'use client'

import { getSupabaseClient } from '@/lib/auth'

export interface ModifierGroup {
  id: string
  name: string
  min_select: number
  max_select: number
  required: boolean
  position: number
  visible: boolean
  created_at: string
  updated_at: string
  option_count?: number // Added when joining with options count
}

export interface CreateModifierGroupData {
  name: string
  min_select?: number
  max_select?: number
  required?: boolean
  visible?: boolean
}

export interface UpdateModifierGroupData {
  name?: string
  min_select?: number
  max_select?: number
  required?: boolean
  visible?: boolean
}

/**
 * Fetch all modifier groups ordered by position
 * Includes option count if available
 */
export async function getModifierGroups(): Promise<ModifierGroup[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_modifier_group')
    .select(`
      *,
      menu_modifier_option(id)
    `)
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch modifier groups: ${error.message}`)
  }

  // Map the data to add option_count
  return (data || []).map((group: any) => {
    const { menu_modifier_option, ...rest } = group
    return {
      ...rest,
      option_count: Array.isArray(menu_modifier_option) 
        ? menu_modifier_option.length 
        : 0,
    }
  })
}

/**
 * Fetch a single modifier group by ID
 */
export async function getModifierGroupById(id: string): Promise<ModifierGroup | null> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_modifier_group')
    .select(`
      *,
      menu_modifier_option(id)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch modifier group: ${error.message}`)
  }

  if (!data) return null

  const { menu_modifier_option, ...rest } = data
  return {
    ...rest,
    option_count: Array.isArray(menu_modifier_option) 
      ? menu_modifier_option.length 
      : 0,
  }
}

/**
 * Create a new modifier group
 * Position is automatically calculated to be the last position
 */
export async function createModifierGroup(data: CreateModifierGroupData): Promise<ModifierGroup> {
  const supabase = await getSupabaseClient()
  
  // Get the next position automatically
  const nextPosition = await getNextPosition()
  
  // Validate: if required=true, min_select must be >= 1
  const minSelect = data.min_select ?? 0
  const maxSelect = data.max_select ?? 1
  const required = data.required ?? false
  
  if (required && minSelect < 1) {
    throw new Error('If required is true, minimum selections must be at least 1')
  }
  
  if (maxSelect < minSelect) {
    throw new Error('Maximum selections must be greater than or equal to minimum selections')
  }
  
  const { data: group, error } = await supabase
    .from('menu_modifier_group')
    .insert([
      {
        name: data.name,
        min_select: minSelect,
        max_select: maxSelect,
        required,
        position: nextPosition,
        visible: data.visible ?? true,
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create modifier group: ${error.message}`)
  }

  if (!group) {
    throw new Error('Failed to create modifier group: No data returned')
  }

  return group
}

/**
 * Update a modifier group
 */
export async function updateModifierGroup(
  id: string,
  data: UpdateModifierGroupData
): Promise<ModifierGroup> {
  const supabase = await getSupabaseClient()
  
  // Get current group to validate
  const current = await getModifierGroupById(id)
  if (!current) {
    throw new Error('Modifier group not found')
  }
  
  // Validate: if required=true, min_select must be >= 1
  const minSelect = data.min_select ?? current.min_select
  const maxSelect = data.max_select ?? current.max_select
  const required = data.required ?? current.required
  
  if (required && minSelect < 1) {
    throw new Error('If required is true, minimum selections must be at least 1')
  }
  
  if (maxSelect < minSelect) {
    throw new Error('Maximum selections must be greater than or equal to minimum selections')
  }
  
  const { data: group, error } = await supabase
    .from('menu_modifier_group')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update modifier group: ${error.message}`)
  }

  if (!group) {
    throw new Error('Failed to update modifier group: No data returned')
  }

  return group
}

/**
 * Delete a modifier group
 * Checks for item associations and options before deletion
 */
export async function deleteModifierGroup(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  
  // Check for item associations
  const { data: associations, error: assocError } = await supabase
    .from('menu_item_modifier_group')
    .select('menu_item_id')
    .eq('modifier_group_id', id)
    .limit(1)
  
  if (assocError) {
    throw new Error(`Failed to check item associations: ${assocError.message}`)
  }
  
  if (associations && associations.length > 0) {
    throw new Error('Cannot delete modifier group: It is associated with one or more menu items')
  }
  
  // Delete the group (options will be cascade deleted)
  const { error } = await supabase
    .from('menu_modifier_group')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete modifier group: ${error.message}`)
  }
}

/**
 * Reorder modifier groups by updating their positions
 * Uses a two-phase approach to avoid unique constraint violations
 * @param groupIds Array of group IDs in the desired order
 */
export async function reorderModifierGroups(groupIds: string[]): Promise<void> {
  const supabase = await getSupabaseClient()
  const TEMP_OFFSET = 100000 // High value to avoid conflicts with any existing positions

  // Phase 1: Move all groups to temporary positions to free up the position space
  for (let index = 0; index < groupIds.length; index++) {
    const id = groupIds[index]
    const { error } = await supabase
      .from('menu_modifier_group')
      .update({ position: TEMP_OFFSET + index })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to reorder modifier groups (phase 1): ${error.message}`)
    }
  }

  // Phase 2: Assign final positions
  for (let index = 0; index < groupIds.length; index++) {
    const id = groupIds[index]
    const { error } = await supabase
      .from('menu_modifier_group')
      .update({ position: index })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to reorder modifier groups (phase 2): ${error.message}`)
    }
  }
}

/**
 * Get the next available position for a new modifier group
 */
export async function getNextPosition(): Promise<number> {
  const groups = await getModifierGroups()
  if (groups.length === 0) return 0
  return Math.max(...groups.map((g) => g.position)) + 1
}

