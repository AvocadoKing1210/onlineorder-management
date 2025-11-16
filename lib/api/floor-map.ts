'use client'

import { getSupabaseClient } from '@/lib/auth'
import { getUserId } from '@/lib/auth'

// ============================================================================
// TYPES
// ============================================================================

export type FloorTableType = 'rectangular' | 'circle' | 'bar' | 'l-booth' | 'u-booth' | 'corner-booth' | 'custom'
export type FloorTableStatus = 'available' | 'seated' | 'reserved' | 'dirty' | 'blocked' | 'maintenance'
export type FloorLayoutVersionStatus = 'draft' | 'published' | 'archived'

export interface SeatSections {
  left?: number
  right?: number
  front?: number
  back?: number
}

export interface FloorLayout {
  id: string
  name: string
  slug: string
  description: string | null
  floor_level: number
  is_default: boolean
  active_version_id: string | null
  created_by: string | null
  published_by: string | null
  background_image_url: string | null
  scale: number
  grid_size: number
  metadata: Record<string, any>
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface FloorLayoutVersion {
  id: string
  layout_id: string
  version_number: number
  status: FloorLayoutVersionStatus
  published_at: string | null
  published_by: string | null
  copied_from_version_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FloorZoneBlueprint {
  id: string
  version_id: string
  name: string
  color_hex: string
  sort_order: number
  capacity_hint: number | null
  is_service_only: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface FloorTableBlueprint {
  id: string
  version_id: string
  zone_blueprint_id: string | null
  table_number: string
  display_name: string
  type: FloorTableType
  seat_count: number
  seat_sections: SeatSections | null
  x: number
  y: number
  rotation: number
  width: number
  height: number
  shape: Record<string, any> | null
  default_status: FloorTableStatus | null
  qr_code_uuid: string | null
  metadata: Record<string, any>
  is_disabled: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateFloorLayoutData {
  name: string
  slug: string
  description?: string | null
  floor_level?: number
  is_default?: boolean
  background_image_url?: string | null
  scale?: number
  grid_size?: number
  metadata?: Record<string, any>
}

export interface CreateFloorLayoutVersionData {
  layout_id: string
  version_number: number
  notes?: string | null
  copied_from_version_id?: string | null
}

export interface CreateFloorZoneBlueprintData {
  version_id: string
  name: string
  color_hex?: string
  sort_order?: number
  capacity_hint?: number | null
  is_service_only?: boolean
  metadata?: Record<string, any>
}

export interface CreateFloorTableBlueprintData {
  version_id: string
  zone_blueprint_id?: string | null
  table_number: string
  display_name: string
  type: FloorTableType
  seat_count: number
  seat_sections?: SeatSections | null
  x: number
  y: number
  rotation?: number
  width: number
  height: number
  shape?: Record<string, any> | null
  default_status?: FloorTableStatus | null
  qr_code_uuid?: string | null
  metadata?: Record<string, any>
  is_disabled?: boolean
}

export interface UpdateFloorTableBlueprintData {
  zone_blueprint_id?: string | null
  table_number?: string
  display_name?: string
  type?: FloorTableType
  seat_count?: number
  seat_sections?: SeatSections | null
  x?: number
  y?: number
  rotation?: number
  width?: number
  height?: number
  shape?: Record<string, any> | null
  default_status?: FloorTableStatus | null
  qr_code_uuid?: string | null
  metadata?: Record<string, any>
  is_disabled?: boolean
}

// ============================================================================
// FLOOR LAYOUT OPERATIONS
// ============================================================================

/**
 * Get all floor layouts (excluding soft-deleted)
 */
export async function getFloorLayouts(): Promise<FloorLayout[]> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_layout')
    .select('*')
    .is('deleted_at', null)
    .order('floor_level', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching floor layouts:', error)
    throw new Error(`Failed to fetch floor layouts: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single floor layout by ID
 */
export async function getFloorLayout(id: string): Promise<FloorLayout | null> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_layout')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching floor layout:', error)
    throw new Error(`Failed to fetch floor layout: ${error.message}`)
  }

  return data
}

/**
 * Get default floor layout
 */
export async function getDefaultFloorLayout(): Promise<FloorLayout | null> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_layout')
    .select('*')
    .eq('is_default', true)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching default floor layout:', error)
    throw new Error(`Failed to fetch default floor layout: ${error.message}`)
  }

  return data
}

/**
 * Create a new floor layout
 */
export async function createFloorLayout(
  data: CreateFloorLayoutData
): Promise<FloorLayout> {
  const supabase = await getSupabaseClient()
  const userId = await getUserId()
  
  const { data: layout, error } = await supabase
    .from('floor_layout')
    .insert({
      ...data,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating floor layout:', error)
    throw new Error(`Failed to create floor layout: ${error.message}`)
  }

  return layout
}

/**
 * Update a floor layout
 */
export async function updateFloorLayout(
  id: string,
  updates: Partial<CreateFloorLayoutData>
): Promise<FloorLayout> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_layout')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating floor layout:', error)
    throw new Error(`Failed to update floor layout: ${error.message}`)
  }

  return data
}

/**
 * Delete a floor layout (soft delete)
 */
export async function deleteFloorLayout(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  
  const { error } = await supabase
    .from('floor_layout')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting floor layout:', error)
    throw new Error(`Failed to delete floor layout: ${error.message}`)
  }
}

// ============================================================================
// FLOOR LAYOUT VERSION OPERATIONS
// ============================================================================

/**
 * Get all versions for a layout
 */
export async function getFloorLayoutVersions(
  layoutId: string
): Promise<FloorLayoutVersion[]> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_layout_version')
    .select('*')
    .eq('layout_id', layoutId)
    .order('version_number', { ascending: false })

  if (error) {
    console.error('Error fetching floor layout versions:', error)
    throw new Error(`Failed to fetch floor layout versions: ${error.message}`)
  }

  return data || []
}

/**
 * Get the current draft version for a layout
 */
export async function getDraftVersion(
  layoutId: string
): Promise<FloorLayoutVersion | null> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_layout_version')
    .select('*')
    .eq('layout_id', layoutId)
    .eq('status', 'draft')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching draft version:', error)
    throw new Error(`Failed to fetch draft version: ${error.message}`)
  }

  return data
}

/**
 * Get a single floor layout version by ID
 */
export async function getFloorLayoutVersion(
  versionId: string
): Promise<FloorLayoutVersion | null> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_layout_version')
    .select('*')
    .eq('id', versionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching floor layout version:', error)
    throw new Error(`Failed to fetch floor layout version: ${error.message}`)
  }

  return data
}

/**
 * Create or get draft version for a layout
 * Optionally copies tables from a source version (typically the published version)
 * If an existing draft is empty and copyFromVersionId is provided, copies tables to it
 */
export async function getOrCreateDraftVersion(
  layoutId: string,
  copyFromVersionId?: string
): Promise<FloorLayoutVersion> {
  // Try to get existing draft
  const existing = await getDraftVersion(layoutId)
  if (existing) {
    // Check if draft is empty and we should copy from published version
    if (copyFromVersionId) {
      const supabase = await getSupabaseClient()
      const { count } = await supabase
        .from('floor_table_blueprint')
        .select('*', { count: 'exact', head: true })
        .eq('version_id', existing.id)
        .is('deleted_at', null)

      // If draft is empty, copy from the source version
      if (count === 0) {
        await copyVersionData(copyFromVersionId, existing.id)
      }
    }
    return existing
  }

  // Get latest version number
  const versions = await getFloorLayoutVersions(layoutId)
  const nextVersionNumber = versions.length > 0 
    ? Math.max(...versions.map(v => v.version_number)) + 1
    : 1

  // Create new draft version
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_layout_version')
    .insert({
      layout_id: layoutId,
      version_number: nextVersionNumber,
      status: 'draft',
      copied_from_version_id: copyFromVersionId || null,
    })
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation - draft version might have been created by another process
    if (error.code === '23505' && error.message?.includes('floor_layout_version_layout_id_version_number_key')) {
      console.warn('Draft version with this number already exists, fetching existing draft...')
      // Try to get the existing draft version
      const existingDraft = await getDraftVersion(layoutId)
      if (existingDraft) {
        // If copying from a version, check if we need to copy data
        if (copyFromVersionId) {
          const { count } = await supabase
            .from('floor_table_blueprint')
            .select('*', { count: 'exact', head: true })
            .eq('version_id', existingDraft.id)
            .is('deleted_at', null)

          // If draft is empty, copy from the source version
          if (count === 0) {
            await copyVersionData(copyFromVersionId, existingDraft.id)
          }
        }
        return existingDraft
      }
      // If we can't find the existing draft, throw the original error
      console.error('Error creating draft version:', error)
      throw new Error(`Failed to create draft version: A draft version with version number ${nextVersionNumber} may already exist, but we couldn't retrieve it. Please refresh the page.`)
    }
    console.error('Error creating draft version:', error)
    throw new Error(`Failed to create draft version: ${error.message}`)
  }

  // If copying from a version, copy zones and tables
  if (copyFromVersionId) {
    await copyVersionData(copyFromVersionId, data.id)
  }

  return data
}

/**
 * Copy zones and tables from one version to another
 */
async function copyVersionData(
  sourceVersionId: string,
  targetVersionId: string
): Promise<void> {
  const supabase = await getSupabaseClient()

  // Copy zones
  const { data: sourceZones, error: zonesError } = await supabase
    .from('floor_zone_blueprint')
    .select('*')
    .eq('version_id', sourceVersionId)

  if (zonesError) {
    console.error('Error fetching source zones:', zonesError)
    throw new Error(`Failed to copy zones: ${zonesError.message}`)
  }

  // Copy zones if they exist
  const zoneIdMap = new Map<string, string>()
  if (sourceZones && sourceZones.length > 0) {
    const zonesToInsert = sourceZones.map(({ id, version_id, created_at, updated_at, ...zone }) => ({
      ...zone,
      version_id: targetVersionId,
    }))

    const { error: insertZonesError } = await supabase
      .from('floor_zone_blueprint')
      .insert(zonesToInsert)

    if (insertZonesError) {
      console.error('Error copying zones:', insertZonesError)
      throw new Error(`Failed to copy zones: ${insertZonesError.message}`)
    }

    // Get the newly created zones to map zone IDs
    const { data: newZones } = await supabase
      .from('floor_zone_blueprint')
      .select('id, name')
      .eq('version_id', targetVersionId)

    // Create a mapping from old zone names to new zone IDs
    if (newZones) {
      sourceZones.forEach((oldZone) => {
        const newZone = newZones.find((z) => z.name === oldZone.name)
        if (newZone) {
          zoneIdMap.set(oldZone.id, newZone.id)
        }
      })
    }
  }

  // Copy tables (even if there are no zones)
  const { data: sourceTables, error: tablesError } = await supabase
    .from('floor_table_blueprint')
    .select('*')
    .eq('version_id', sourceVersionId)
    .is('deleted_at', null)

  if (tablesError) {
    console.error('Error fetching source tables:', tablesError)
    throw new Error(`Failed to copy tables: ${tablesError.message}`)
  }

  if (sourceTables && sourceTables.length > 0) {
    const tablesToInsert = sourceTables.map(({ id, version_id, created_at, updated_at, zone_blueprint_id, ...table }) => ({
      ...table,
      version_id: targetVersionId,
      zone_blueprint_id: zone_blueprint_id ? zoneIdMap.get(zone_blueprint_id) || null : null,
    }))

    const { error: insertTablesError } = await supabase
      .from('floor_table_blueprint')
      .insert(tablesToInsert)

    if (insertTablesError) {
      console.error('Error copying tables:', insertTablesError)
      throw new Error(`Failed to copy tables: ${insertTablesError.message}`)
    }
  }
}

/**
 * Publish a floor layout version
 */
export async function publishFloorLayout(
  layoutId: string,
  versionId: string
): Promise<string> {
  const supabase = await getSupabaseClient()
  const userId = await getUserId()
  
  // Verify version is in draft status before attempting to publish
  const { data: version, error: versionError } = await supabase
    .from('floor_layout_version')
    .select('id, status, layout_id, version_number')
    .eq('id', versionId)
    .eq('layout_id', layoutId)
    .single()

  if (versionError) {
    console.error('Error fetching version:', versionError)
    if (versionError.code === 'PGRST116') {
      // Version not found - check if it exists with different layout_id
      const { data: versionCheck } = await supabase
        .from('floor_layout_version')
        .select('id, status, layout_id, version_number')
        .eq('id', versionId)
        .single()
      
      if (versionCheck) {
        throw new Error(
          `Version ${versionId} belongs to a different layout (${versionCheck.layout_id}), not ${layoutId}. ` +
          `Please refresh the page.`
        )
      }
      throw new Error(`Version ${versionId} not found`)
    }
    throw new Error(`Failed to verify version: ${versionError.message}`)
  }

  if (!version) {
    throw new Error('Version not found')
  }

  if (version.status !== 'draft') {
    throw new Error(
      `Cannot publish version ${version.version_number}: version is ${version.status}, not draft. ` +
      `Please refresh the page to load the current draft version.`
    )
  }

  // Double-check version status right before publishing to catch race conditions
  const { data: lastCheck, error: lastCheckError } = await supabase
    .from('floor_layout_version')
    .select('id, status, layout_id')
    .eq('id', versionId)
    .single()

  if (lastCheckError || !lastCheck) {
    throw new Error(`Version ${versionId} no longer exists. Please refresh the page.`)
  }

  if (lastCheck.status !== 'draft') {
    throw new Error(
      `Version status changed to ${lastCheck.status} before publishing. Please refresh the page.`
    )
  }

  if (lastCheck.layout_id !== layoutId) {
    throw new Error(
      `Version ${versionId} belongs to layout ${lastCheck.layout_id}, not ${layoutId}. Please refresh the page.`
    )
  }
  
  const { data, error } = await supabase.rpc('publish_floor_layout', {
    p_layout_id: layoutId,
    p_version_id: versionId,
    p_actor_id: userId || 'system',
  })

  if (error) {
    console.error('Error publishing floor layout:', error)
    console.error('Layout ID:', layoutId)
    console.error('Version ID:', versionId)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    // Provide more helpful error messages
    const errorMessage = error.message || 'Unknown error'
    if (errorMessage.includes('Version not found or not in draft status')) {
      // Re-check the version one more time to provide specific details
      const { data: finalCheck } = await supabase
        .from('floor_layout_version')
        .select('id, status, layout_id, version_number')
        .eq('id', versionId)
        .single()
      
      if (!finalCheck) {
        throw new Error(`Version ${versionId} was deleted. Please refresh the page.`)
      }
      
      if (finalCheck.layout_id !== layoutId) {
        throw new Error(
          `Version ${versionId} (v${finalCheck.version_number}) belongs to a different layout. ` +
          `Expected layout ${layoutId}, but version belongs to ${finalCheck.layout_id}. Please refresh the page.`
        )
      }
      
      if (finalCheck.status !== 'draft') {
        throw new Error(
          `Version ${versionId} (v${finalCheck.version_number}) is ${finalCheck.status}, not draft. ` +
          `It may have been published by another user. Please refresh the page.`
        )
      }
    }
    
    throw new Error(`Failed to publish floor layout: ${errorMessage}`)
  }

  return data
}

// ============================================================================
// ZONE BLUEPRINT OPERATIONS
// ============================================================================

/**
 * Get all zone blueprints for a version
 */
export async function getZoneBlueprints(
  versionId: string
): Promise<FloorZoneBlueprint[]> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_zone_blueprint')
    .select('*')
    .eq('version_id', versionId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching zone blueprints:', error)
    throw new Error(`Failed to fetch zone blueprints: ${error.message}`)
  }

  return data || []
}

/**
 * Create a zone blueprint
 */
export async function createZoneBlueprint(
  data: CreateFloorZoneBlueprintData
): Promise<FloorZoneBlueprint> {
  const supabase = await getSupabaseClient()
  
  const { data: zone, error } = await supabase
    .from('floor_zone_blueprint')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating zone blueprint:', error)
    throw new Error(`Failed to create zone blueprint: ${error.message}`)
  }

  return zone
}

/**
 * Update a zone blueprint
 */
export async function updateZoneBlueprint(
  id: string,
  updates: Partial<CreateFloorZoneBlueprintData>
): Promise<FloorZoneBlueprint> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_zone_blueprint')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating zone blueprint:', error)
    throw new Error(`Failed to update zone blueprint: ${error.message}`)
  }

  return data
}

/**
 * Delete a zone blueprint (soft delete)
 */
export async function deleteZoneBlueprint(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  
  const { error } = await supabase
    .from('floor_zone_blueprint')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting zone blueprint:', error)
    throw new Error(`Failed to delete zone blueprint: ${error.message}`)
  }
}

// ============================================================================
// TABLE BLUEPRINT OPERATIONS
// ============================================================================

/**
 * Get all table blueprints for a version
 */
export async function getTableBlueprints(
  versionId: string
): Promise<FloorTableBlueprint[]> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_table_blueprint')
    .select('*')
    .eq('version_id', versionId)
    .is('deleted_at', null)
    .order('table_number', { ascending: true })

  if (error) {
    console.error('Error fetching table blueprints:', error)
    throw new Error(`Failed to fetch table blueprints: ${error.message}`)
  }

  return data || []
}

/**
 * Create a table blueprint
 */
export async function createTableBlueprint(
  data: CreateFloorTableBlueprintData
): Promise<FloorTableBlueprint> {
  const supabase = await getSupabaseClient()
  
  const { data: table, error } = await supabase
    .from('floor_table_blueprint')
    .insert({
      ...data,
      rotation: data.rotation ?? 0,
      shape: data.shape ?? null,
      default_status: data.default_status ?? 'available',
      metadata: data.metadata ?? {},
      is_disabled: data.is_disabled ?? false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating table blueprint:', error)
    throw new Error(`Failed to create table blueprint: ${error.message}`)
  }

  return table
}

/**
 * Update a table blueprint
 */
export async function updateTableBlueprint(
  id: string,
  updates: UpdateFloorTableBlueprintData
): Promise<FloorTableBlueprint> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('floor_table_blueprint')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating table blueprint:', error)
    throw new Error(`Failed to update table blueprint: ${error.message}`)
  }

  return data
}

/**
 * Delete a table blueprint (soft delete)
 */
export async function deleteTableBlueprint(id: string): Promise<void> {
  const supabase = await getSupabaseClient()
  
  const { error } = await supabase
    .from('floor_table_blueprint')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting table blueprint:', error)
    throw new Error(`Failed to delete table blueprint: ${error.message}`)
  }
}

/**
 * Bulk update table blueprints (for position changes, etc.)
 */
export async function bulkUpdateTableBlueprints(
  updates: Array<{ id: string; updates: UpdateFloorTableBlueprintData }>
): Promise<FloorTableBlueprint[]> {
  const supabase = await getSupabaseClient()
  
  // Use a transaction-like approach with Promise.all
  const results = await Promise.all(
    updates.map(({ id, updates: updateData }) =>
      updateTableBlueprint(id, updateData)
    )
  )

  return results
}

