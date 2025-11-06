'use client'

import { getSupabaseClient } from '@/lib/auth'
import { type ModifierGroup } from './menu-modifier-groups'

export interface ModifierOption {
  id: string
  modifier_group_id: string
  modifier_group?: ModifierGroup // Joined data
  name: string
  price_delta: number
  position: number
  visible: boolean
  available: boolean
  created_at: string
  updated_at: string
}

export interface CreateModifierOptionData {
  modifier_group_id: string
  name: string
  price_delta?: number
  visible?: boolean
  available?: boolean
}

export interface UpdateModifierOptionData {
  name?: string
  price_delta?: number
  visible?: boolean
  available?: boolean
}

export interface ModifierOptionFilters {
  modifier_group_id?: string
}

/**
 * Fetch all modifier options with optional filters
 * Includes modifier group data
 */
export async function getModifierOptions(
  filters?: ModifierOptionFilters
): Promise<ModifierOption[]> {
  const supabase = await getSupabaseClient()
  
  let query = supabase
    .from('menu_modifier_option')
    .select(`
      *,
      modifier_group:menu_modifier_group(id, name)
    `)
  
  if (filters?.modifier_group_id) {
    query = query.eq('modifier_group_id', filters.modifier_group_id)
  }
  
  const { data, error } = await query
    .order('modifier_group_id', { ascending: true })
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch modifier options: ${error.message}`)
  }

  // Map the data to flatten modifier_group
  return (data || []).map((option: any) => ({
    ...option,
    modifier_group: option.modifier_group ? {
      id: option.modifier_group.id,
      name: option.modifier_group.name,
    } : undefined,
  }))
}

/**
 * Fetch a single modifier option by ID
 */
export async function getModifierOptionById(id: string): Promise<ModifierOption | null> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_modifier_option')
    .select(`
      *,
      modifier_group:menu_modifier_group(id, name)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch modifier option: ${error.message}`)
  }

  if (!data) return null

  return {
    ...data,
    modifier_group: data.modifier_group ? {
      id: data.modifier_group.id,
      name: data.modifier_group.name,
    } : undefined,
  }
}

/**
 * Create a new modifier option
 * Position is automatically calculated to be the last position within the group
 */
export async function createModifierOption(data: CreateModifierOptionData): Promise<ModifierOption> {
  const supabase = await getSupabaseClient()
  
  // Get the next position automatically within the group
  const nextPosition = await getNextPosition(data.modifier_group_id)
  
  const { data: option, error } = await supabase
    .from('menu_modifier_option')
    .insert([
      {
        modifier_group_id: data.modifier_group_id,
        name: data.name,
        price_delta: data.price_delta ?? 0,
        position: nextPosition,
        visible: data.visible ?? true,
        available: data.available ?? true,
      },
    ])
    .select(`
      *,
      modifier_group:menu_modifier_group(id, name)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to create modifier option: ${error.message}`)
  }

  if (!option) {
    throw new Error('Failed to create modifier option: No data returned')
  }

  return {
    ...option,
    modifier_group: option.modifier_group ? {
      id: option.modifier_group.id,
      name: option.modifier_group.name,
    } : undefined,
  }
}

/**
 * Update a modifier option
 */
export async function updateModifierOption(
  id: string,
  data: UpdateModifierOptionData
): Promise<ModifierOption> {
  const supabase = await getSupabaseClient()
  const { data: option, error } = await supabase
    .from('menu_modifier_option')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      modifier_group:menu_modifier_group(id, name)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to update modifier option: ${error.message}`)
  }

  if (!option) {
    throw new Error('Failed to update modifier option: No data returned')
  }

  return {
    ...option,
    modifier_group: option.modifier_group ? {
      id: option.modifier_group.id,
      name: option.modifier_group.name,
    } : undefined,
  }
}

/**
 * Delete a modifier option
 */
export async function deleteModifierOption(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase
    .from('menu_modifier_option')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete modifier option: ${error.message}`)
  }
}

/**
 * Reorder modifier options within a specific group
 * Uses a two-phase approach to avoid unique constraint violations
 * @param groupId The modifier group ID
 * @param optionIds Array of option IDs in the desired order
 */
export async function reorderModifierOptions(
  groupId: string,
  optionIds: string[]
): Promise<void> {
  const supabase = await getSupabaseClient()
  const TEMP_OFFSET = 100000 // High value to avoid conflicts with any existing positions

  // Phase 1: Move all options to temporary positions to free up the position space
  for (let index = 0; index < optionIds.length; index++) {
    const id = optionIds[index]
    const { error } = await supabase
      .from('menu_modifier_option')
      .update({ position: TEMP_OFFSET + index })
      .eq('id', id)
      .eq('modifier_group_id', groupId)

    if (error) {
      throw new Error(`Failed to reorder modifier options (phase 1): ${error.message}`)
    }
  }

  // Phase 2: Assign final positions
  for (let index = 0; index < optionIds.length; index++) {
    const id = optionIds[index]
    const { error } = await supabase
      .from('menu_modifier_option')
      .update({ position: index })
      .eq('id', id)
      .eq('modifier_group_id', groupId)

    if (error) {
      throw new Error(`Failed to reorder modifier options (phase 2): ${error.message}`)
    }
  }
}

/**
 * Get the next available position for a new option within a modifier group
 */
export async function getNextPosition(modifierGroupId: string): Promise<number> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_modifier_option')
    .select('position')
    .eq('modifier_group_id', modifierGroupId)
    .order('position', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to get next position: ${error.message}`)
  }

  if (!data || data.length === 0) return 0
  return (data[0].position ?? -1) + 1
}

/**
 * Toggle the available status of a modifier option
 */
export async function toggleOptionAvailable(
  id: string,
  available: boolean
): Promise<ModifierOption> {
  return updateModifierOption(id, { available })
}

/**
 * Bulk toggle available status for multiple options
 */
export async function bulkToggleAvailable(
  ids: string[],
  available: boolean
): Promise<void> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase
    .from('menu_modifier_option')
    .update({ available })
    .in('id', ids)

  if (error) {
    throw new Error(`Failed to bulk toggle available status: ${error.message}`)
  }
}

