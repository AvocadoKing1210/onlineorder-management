"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  FloorTableBlueprint,
  FloorTableType,
  FloorTableStatus,
  SeatSections as APISeatSections,
  FloorLayout,
  FloorLayoutVersion,
} from "@/lib/api/floor-map"

// Re-export types for components
export type { FloorTableType, FloorTableStatus } from "@/lib/api/floor-map"
export type SeatSections = APISeatSections
import {
  getDefaultFloorLayout,
  getOrCreateDraftVersion,
  getTableBlueprints,
  getZoneBlueprints,
  createTableBlueprint,
  updateTableBlueprint,
  deleteTableBlueprint,
  bulkUpdateTableBlueprints,
  publishFloorLayout,
} from "@/lib/api/floor-map"

// Local table data for editing (matches blueprint structure)
export type FloorTableData = {
  id: string // Blueprint ID
  name: string // display_name
  seats: number // seat_count
  x: number
  y: number
  status: FloorTableStatus // default_status
  type: FloorTableType
  seatSections?: SeatSections
  tableNumber: string // table_number
  zoneId?: string | null // zone_blueprint_id
  width: number
  height: number
  rotation?: number
}

// Table with computed size (used in components)
export type FloorTable = FloorTableData & {
  width: number
  height: number
}

type UpdateInput = Partial<Omit<FloorTableData, "id">>

// Calculate table dimensions based on number of seats and type
export function calculateTableSize(seats: number, type: FloorTableType, seatSections?: SeatSections): { width: number; height: number } {
  // Seat circle radius (matches canvas seatRadius)
  const seatRadius = 12
  // Spacing between table edge and seats (matches canvas spacing)
  const seatSpacing = 12
  // Fixed spacing between adjacent seats (center to center)
  const fixedSeatSpacing = 36
  // Add padding for visual spacing around seats
  const padding = 20
  
  if (type === "circle") {
    // Circular tables: size based on seats in a circle
    const baseTableSize = 40 + seats * 4 // Scale with seat count
    const totalRadius = baseTableSize / 2 + seatSpacing + seatRadius
    const size = Math.max(80, totalRadius * 2 + padding)
    
    return {
      width: size,
      height: size,
    }
  } else if (type === "bar") {
    // Bar tables: long and narrow, seats on one side (front)
    // Table width must accommodate seats with fixed spacing
    // For N seats: need (N - 1) * fixedSeatSpacing space between them
    const frontSeats = seatSections?.front ?? seats
    const baseWidth = frontSeats === 1 
      ? 30 
      : Math.max(30, (frontSeats - 1) * fixedSeatSpacing)
    const baseHeight = 30 // Narrow height
    
    const totalWidth = baseWidth + (seatSpacing + seatRadius) * 2 + padding
    const totalHeight = baseHeight + (seatSpacing + seatRadius) * 2 + padding
    
    return {
      width: Math.max(80, totalWidth),
      height: Math.max(60, totalHeight),
    }
  } else if (type === "l-booth") {
    // L-shaped booth: seats on two long edges (left vertical edge and top horizontal edge)
    // Width is determined by front side (top horizontal edge)
    // Height is determined by left side (vertical edge)
    const frontSeats = seatSections?.front ?? Math.floor(seats / 2)
    const leftSeats = seatSections?.left ?? Math.ceil(seats / 2)
    
    // Calculate width based on front side (top horizontal edge)
    const calculateMinEdgeLength = (seatCount: number) => {
      if (seatCount === 0) return 40
      if (seatCount === 1) return 40 // Minimum edge length for single seat
      // For multiple seats: need space for (N - 1) gaps of fixedSeatSpacing
      return Math.max(40, (seatCount - 1) * fixedSeatSpacing)
    }
    
    const baseWidth = calculateMinEdgeLength(frontSeats)
    // Height is based on left side (vertical edge)
    const baseHeight = calculateMinEdgeLength(leftSeats)
    
    const totalWidth = baseWidth + (seatSpacing + seatRadius) * 2 + padding
    const totalHeight = baseHeight + (seatSpacing + seatRadius) * 2 + padding
    
    return {
      width: Math.max(100, totalWidth),
      height: Math.max(100, totalHeight),
    }
  } else if (type === "u-booth") {
    // U-shaped booth: seats on three sides (left, front/top, right)
    // Width is determined by front side (top horizontal edge)
    // Height is determined by max of left and right sides (vertical edges)
    const frontSeats = seatSections?.front ?? Math.ceil(seats / 3)
    const leftSeats = seatSections?.left ?? Math.ceil(seats / 3)
    const rightSeats = seatSections?.right ?? Math.floor(seats / 3)
    
    // Calculate width based on front side
    const calculateMinEdgeLength = (seatCount: number) => {
      if (seatCount === 0) return 50
      if (seatCount === 1) return 50 // Minimum edge length for single seat
      // For multiple seats: need space for (N - 1) gaps of fixedSeatSpacing
      return Math.max(50, (seatCount - 1) * fixedSeatSpacing)
    }
    
    const baseWidth = calculateMinEdgeLength(frontSeats)
    // Height is based on the longer of the two vertical sides
    const leftEdgeLength = calculateMinEdgeLength(leftSeats)
    const rightEdgeLength = calculateMinEdgeLength(rightSeats)
    const baseHeight = Math.max(leftEdgeLength, rightEdgeLength, 50)
    
    const totalWidth = baseWidth + (seatSpacing + seatRadius) * 2 + padding
    const totalHeight = baseHeight + (seatSpacing + seatRadius) * 2 + padding
    
    return {
      width: Math.max(120, totalWidth),
      height: Math.max(100, totalHeight),
    }
  } else if (type === "corner-booth") {
    // Corner booth: seats on two sides meeting at a corner (like L-booth but different orientation)
    const maxSeats = seats
    const baseWidth = maxSeats === 1 
      ? 40 
      : Math.max(40, (maxSeats - 1) * fixedSeatSpacing)
    const baseHeight = baseWidth
    
    const totalWidth = baseWidth + (seatSpacing + seatRadius) * 2 + padding
    const totalHeight = baseHeight + (seatSpacing + seatRadius) * 2 + padding
    
    return {
      width: Math.max(100, totalWidth),
      height: Math.max(100, totalHeight),
    }
  } else {
    // Rectangular tables: seats distributed along 4 edges
    const baseTableSize = 50
    const minEdgeLength = 40 // Minimum edge length
    
    if (seats <= 4) {
      // ≤ 4 seats: one seat at the middle of each edge
      // Use square table
      const totalRadius = baseTableSize / 2 + seatSpacing + seatRadius
      const size = Math.max(80, totalRadius * 2 + padding)
      
      return {
        width: size,
        height: size,
      }
    } else {
      // > 4 seats: distribute along edges, increase table size
      // Distribute seats: long sides (top/bottom) get more, short sides (left/right) get fewer
      // Long sides get ~60% of seats, short sides get ~40%
      const longSideTotal = Math.round(seats * 0.6)
      const shortSideTotal = seats - longSideTotal
      
      // Each side gets half (symmetric)
      const topSeats = Math.ceil(longSideTotal / 2)
      const bottomSeats = Math.floor(longSideTotal / 2)
      const leftSeats = Math.ceil(shortSideTotal / 2)
      const rightSeats = Math.floor(shortSideTotal / 2)
      
      // Calculate minimum edge length needed for seats
      // For N seats on an edge, need: (N - 1) * fixedSeatSpacing for spacing between seats
      const calculateMinEdgeLength = (seatCount: number) => {
        if (seatCount === 0) return 40
        if (seatCount === 1) return 40 // Minimum edge length for single seat
        // For multiple seats: need space for (N - 1) gaps of fixedSeatSpacing
        return Math.max(40, (seatCount - 1) * fixedSeatSpacing)
      }
      
      const topEdgeLength = calculateMinEdgeLength(topSeats)
      const bottomEdgeLength = calculateMinEdgeLength(bottomSeats)
      const leftEdgeLength = calculateMinEdgeLength(leftSeats)
      const rightEdgeLength = calculateMinEdgeLength(rightSeats)
      
      // Table width = max of top/bottom edges
      const baseWidth = Math.max(topEdgeLength, bottomEdgeLength, baseTableSize * 1.2)
      // Table height = max of left/right edges
      const baseHeight = Math.max(leftEdgeLength, rightEdgeLength, baseTableSize)
      
      // Calculate total dimensions needed
      const totalWidth = baseWidth + (seatSpacing + seatRadius) * 2 + padding
      const totalHeight = baseHeight + (seatSpacing + seatRadius) * 2 + padding
      
      return {
        width: Math.max(100, totalWidth),
        height: Math.max(80, totalHeight),
      }
    }
  }
}

// Convert blueprint to local table data
function blueprintToTableData(blueprint: FloorTableBlueprint): FloorTableData {
  const size = calculateTableSize(
    blueprint.seat_count,
    blueprint.type,
    blueprint.seat_sections || undefined
  )
  
  return {
    id: blueprint.id,
    name: blueprint.display_name,
    seats: blueprint.seat_count,
    x: Number(blueprint.x),
    y: Number(blueprint.y),
    status: blueprint.default_status || "available",
    type: blueprint.type,
    seatSections: blueprint.seat_sections || undefined,
    tableNumber: blueprint.table_number,
    zoneId: blueprint.zone_blueprint_id,
    width: size.width,
    height: size.height,
    rotation: Number(blueprint.rotation || 0),
  }
}

// Convert local table data to blueprint create/update data
function tableDataToBlueprint(
  table: FloorTableData,
  versionId: string
): {
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
  default_status?: FloorTableStatus
} {
  return {
    version_id: versionId,
    zone_blueprint_id: table.zoneId,
    table_number: table.tableNumber,
    display_name: table.name,
    type: table.type,
    seat_count: table.seats,
    seat_sections: table.seatSections || null,
    x: table.x,
    y: table.y,
    rotation: table.rotation || 0,
    width: table.width,
    height: table.height,
    default_status: table.status,
  }
}

// Add computed size to table data
const addComputedSize = (table: FloorTableData): FloorTable => {
  // Size is already computed, just return as-is
  return table as FloorTable
}

const createTable = (
  count: number,
  type: FloorTableType = "rectangular",
  versionId: string
): FloorTableData => {
  const baseTable: FloorTableData = {
    id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID until saved
    name: `Table ${count + 1}`,
    seats: 4,
    x: 60,
    y: 60,
    status: "available",
    type,
    tableNumber: `T${count + 1}`,
    width: 100,
    height: 80,
    rotation: 0,
  }
  
  // Initialize seatSections for booth types
  if (type === "bar") {
    return { ...baseTable, seatSections: { front: 4 }, seats: 4 }
  } else if (type === "l-booth") {
    return { ...baseTable, seatSections: { left: 2, front: 2 }, seats: 4 }
  } else if (type === "u-booth") {
    return { ...baseTable, seatSections: { left: 2, front: 2, right: 1 }, seats: 5 }
  } else if (type === "corner-booth") {
    return { ...baseTable, seatSections: { left: 2, back: 2 }, seats: 4 }
  }
  
  const size = calculateTableSize(baseTable.seats, baseTable.type, baseTable.seatSections)
  return { ...baseTable, width: size.width, height: size.height }
}

export function useFloorPlan() {
  const [tablesData, setTablesData] = useState<FloorTableData[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [layout, setLayout] = useState<FloorLayout | null>(null)
  const [version, setVersion] = useState<FloorLayoutVersion | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Compute tables with size for components
  const tables = useMemo(() => tablesData.map(addComputedSize), [tablesData])

  // Load floor plan from database
  useEffect(() => {
    let mounted = true

    async function loadFloorPlan() {
      try {
        setLoading(true)
        setError(null)

        // Get or create default layout
        let currentLayout = await getDefaultFloorLayout()
        if (!currentLayout) {
          // Create default layout if none exists
          const { createFloorLayout } = await import("@/lib/api/floor-map")
          currentLayout = await createFloorLayout({
            name: "Main Floor",
            slug: "main-floor",
            description: "Main dining floor",
            is_default: true,
          })
        }

        if (!mounted) return
        setLayout(currentLayout)

        // Load the active published version if available, otherwise check for draft
        const { getDraftVersion, getFloorLayoutVersion } = await import("@/lib/api/floor-map")
        let versionToLoad: FloorLayoutVersion | null = null

        // First, try to load the active published version
        if (currentLayout.active_version_id) {
          versionToLoad = await getFloorLayoutVersion(currentLayout.active_version_id)
        }

        // If no published version, check for existing draft
        if (!versionToLoad) {
          versionToLoad = await getDraftVersion(currentLayout.id)
        }

        // If still no version, create a draft (only if layout has no versions at all)
        if (!versionToLoad) {
          versionToLoad = await getOrCreateDraftVersion(currentLayout.id)
        }

        if (!mounted || !versionToLoad) return
        setVersion(versionToLoad)

        // Load tables and zones
        const [tables, zones] = await Promise.all([
          getTableBlueprints(versionToLoad.id),
          getZoneBlueprints(versionToLoad.id),
        ])

        if (!mounted) return

        // Convert blueprints to table data
        const tableData = tables.map(blueprintToTableData)
        setTablesData(tableData)

        // Only select table if viewing a draft (not published)
        if (versionToLoad.status === 'draft' && tableData.length > 0) {
          setSelectedTableId(tableData[0].id)
        } else {
          setSelectedTableId(null)
      }
      } catch (err) {
        console.error("Failed to load floor plan:", err)
        setError(err instanceof Error ? err.message : "Failed to load floor plan")
    } finally {
        if (mounted) {
          setLoading(false)
          setHydrated(true)
        }
      }
    }

    loadFloorPlan()

    return () => {
      mounted = false
    }
  }, [])

  // Save table changes to database
  const saveTable = useCallback(
    async (table: FloorTableData): Promise<void> => {
      if (!version) {
        throw new Error("No version available")
      }

      const isNew = table.id.startsWith("temp-")
      const blueprintData = tableDataToBlueprint(table, version.id)

      if (isNew) {
        // Create new table
        const created = await createTableBlueprint(blueprintData)
        // Update local state with real ID
        setTablesData((prev) =>
          prev.map((t) => (t.id === table.id ? blueprintToTableData(created) : t))
        )
      } else {
        // Update existing table
        await updateTableBlueprint(table.id, blueprintData)
      }
    },
    [version]
  )

  // Debounced save for position updates
  const debouncedSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    const pendingSaves = new Map<string, FloorTableData>()

    return (table: FloorTableData) => {
      pendingSaves.set(table.id, table)

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        const saves = Array.from(pendingSaves.values())
        pendingSaves.clear()

        if (!version) return

        try {
          setSaving(true)
          // Batch update all pending saves
          const updates = saves
            .filter((t) => !t.id.startsWith("temp-"))
            .map((t) => ({
              id: t.id,
              updates: tableDataToBlueprint(t, version.id),
            }))

          if (updates.length > 0) {
            await bulkUpdateTableBlueprints(updates)
          }

          // Create new tables
          const newTables = saves.filter((t) => t.id.startsWith("temp-"))
          for (const table of newTables) {
            await saveTable(table)
          }
        } catch (err) {
          console.error("Failed to save tables:", err)
          setError(err instanceof Error ? err.message : "Failed to save tables")
        } finally {
          setSaving(false)
        }
      }, 1000) // 1 second debounce
    }
  }, [version, saveTable])

  const selectTable = useCallback((id: string | null) => {
    setSelectedTableId(id)
  }, [])

  // Helper function to ensure we have a draft version when editing
  // Accepts pendingUpdates to preserve changes that haven't been saved yet
  const ensureDraftVersion = useCallback(async (
    pendingUpdates?: Map<string, FloorTableData>
  ): Promise<FloorLayoutVersion> => {
    if (!layout) {
      throw new Error("No layout available")
    }

    // If current version is already a draft, return it
    if (version && version.status === 'draft') {
      return version
    }

    // Preserve current table data (including any pending updates) before switching versions
    // Use pendingUpdates if provided, otherwise use current tablesData
    const currentTableData = new Map<string, FloorTableData>()
    if (pendingUpdates) {
      // Use pending updates as the source of truth
      pendingUpdates.forEach((table, id) => {
        currentTableData.set(id, table)
      })
      // Also include other tables from current state
      tablesData.forEach((table) => {
        if (!pendingUpdates.has(table.id)) {
          currentTableData.set(table.id, { ...table })
        }
      })
    } else {
      tablesData.forEach((table) => {
        currentTableData.set(table.id, { ...table })
      })
    }

    // If viewing a published version, create a new draft from it
    const { getDraftVersion } = await import("@/lib/api/floor-map")
    
    // Check if a draft already exists
    const existingDraft = await getDraftVersion(layout.id)
    if (existingDraft) {
      setVersion(existingDraft)
      // Load tables for the draft
      const [tables] = await Promise.all([
        getTableBlueprints(existingDraft.id),
        getZoneBlueprints(existingDraft.id),
      ])
      let tableData = tables.map(blueprintToTableData)
      
      // Merge with current state to preserve any pending changes
      // Match by table_number since IDs change when copying between versions
      tableData = tableData.map((table) => {
        // Find matching table in current state by table_number
        const currentData = Array.from(currentTableData.values()).find(
          (t) => t.tableNumber === table.tableNumber
        )
        if (currentData) {
          // Preserve all current data (positions, etc.) but keep the new blueprint ID
          return { ...table, ...currentData, id: table.id }
        }
        return table
      })
      
      // Add any new tables from pending updates that don't exist in loaded data
      // (tables that were added but not yet saved)
      currentTableData.forEach((table) => {
        if (!tableData.find((t) => t.tableNumber === table.tableNumber)) {
          tableData.push(table)
        }
      })
      
      setTablesData(tableData)
      return existingDraft
    }

    // Create a new draft from the current version (or published version)
    const sourceVersionId = version?.id || layout.active_version_id || undefined
    const draftVersion = await getOrCreateDraftVersion(layout.id, sourceVersionId)
    setVersion(draftVersion)

    // Load tables for the new draft
    const [tables] = await Promise.all([
      getTableBlueprints(draftVersion.id),
      getZoneBlueprints(draftVersion.id),
    ])
    let tableData = tables.map(blueprintToTableData)
    
    // Merge with current state to preserve any pending changes
    // Match by table_number since IDs change when copying between versions
    tableData = tableData.map((table) => {
      // Find matching table in current state by table_number
      const currentData = Array.from(currentTableData.values()).find(
        (t) => t.tableNumber === table.tableNumber
      )
      if (currentData) {
        // Preserve all current data (positions, etc.) but keep the new blueprint ID
        return { ...table, ...currentData, id: table.id }
      }
      return table
    })
    
    // Add any new tables from pending updates that don't exist in loaded data
    // (tables that were added but not yet saved)
    currentTableData.forEach((table) => {
      if (!tableData.find((t) => t.tableNumber === table.tableNumber)) {
        tableData.push(table)
      }
    })
    
    setTablesData(tableData)

    return draftVersion
  }, [layout, version, tablesData])

  const addTable = useCallback(
    async (type: FloorTableType = "rectangular") => {
      // Ensure we have a draft version before editing
      const draftVersion = await ensureDraftVersion()

      const newTable = createTable(tablesData.length, type, draftVersion.id)
      setTablesData((prev) => [...prev, newTable])
      setSelectedTableId(newTable.id)
      
      // Save immediately for new tables
      await saveTable(newTable)
    },
    [tablesData.length, ensureDraftVersion, saveTable]
  )

  const updateTable = useCallback(
    async (id: string, updates: UpdateInput) => {
      // Get current table to calculate updated version
      const currentTable = tablesData.find((t) => t.id === id)
      if (!currentTable) return

      // Calculate updated table
      let updatedTable: FloorTableData = { ...currentTable, ...updates }
      if (updates.seats !== undefined || updates.type !== undefined) {
        const size = calculateTableSize(updatedTable.seats, updatedTable.type, updatedTable.seatSections)
        updatedTable.width = size.width
        updatedTable.height = size.height
      }

      // Apply update optimistically first
      setTablesData((prev) => {
        return prev.map((table) => (table.id === id ? updatedTable : table))
      })

      // Ensure we have a draft version, passing the updated table data
      const pendingUpdates = new Map<string, FloorTableData>()
      pendingUpdates.set(id, updatedTable)
      await ensureDraftVersion(pendingUpdates)

      // Debounced save with the updated table
      debouncedSave(updatedTable)
    },
    [tablesData, debouncedSave, ensureDraftVersion]
  )

  const updateTablePosition = useCallback(
    (id: string, x: number, y: number) => {
    updateTable(id, { x, y })
    },
    [updateTable]
  )

  const removeTable = useCallback(
    async (id: string) => {
      // Ensure we have a draft version before editing
      await ensureDraftVersion()

      if (!id.startsWith("temp-")) {
        await deleteTableBlueprint(id)
      }
    setTablesData((prev) => prev.filter((table) => table.id !== id))
    setSelectedTableId((current) => (current === id ? null : current))
    },
    [ensureDraftVersion]
  )

  const publishLayout = useCallback(async () => {
    if (!layout || !version) {
      throw new Error("No layout or version available")
    }

    try {
      setSaving(true)
      setError(null)

      // Refresh version status from database to ensure we have latest state
      const { getDraftVersion } = await import("@/lib/api/floor-map")
      const currentDraft = await getDraftVersion(layout.id)
      
      if (!currentDraft) {
        throw new Error("No draft version found. Please refresh the page.")
      }

      // Verify the version we're trying to publish matches the current draft
      if (currentDraft.id !== version.id) {
        console.warn(`Version mismatch: hook has ${version.id}, database has ${currentDraft.id}. Updating...`)
        setVersion(currentDraft)
        // Reload tables for the correct version
        const [tables] = await Promise.all([
          getTableBlueprints(currentDraft.id),
          getZoneBlueprints(currentDraft.id),
        ])
        const tableData = tables.map(blueprintToTableData)
        setTablesData(tableData)
        throw new Error("Version changed. Please try publishing again.")
      }

      // Verify version is still in draft status
      if (currentDraft.status !== 'draft') {
        throw new Error(`Cannot publish: version ${currentDraft.version_number} is ${currentDraft.status}, not draft. Please refresh the page.`)
      }

      // Save any pending changes first
      const pendingTables = tablesData.filter((t) => t.id.startsWith("temp-"))
      for (const table of pendingTables) {
        await saveTable(table)
      }

      // Store the version ID before publishing (it will be published after this call)
      const versionIdToPublish = currentDraft.id

      // Publish the version (this will mark it as published)
      await publishFloorLayout(layout.id, versionIdToPublish)

      // Refresh layout to get updated active_version_id
      const { getFloorLayout, getFloorLayoutVersion } = await import("@/lib/api/floor-map")
      const updatedLayout = await getFloorLayout(layout.id)
      if (updatedLayout) {
        setLayout(updatedLayout)
      }

      // Switch to the published version (not create a new draft)
      if (updatedLayout?.active_version_id) {
        const publishedVersion = await getFloorLayoutVersion(updatedLayout.active_version_id)
        if (publishedVersion) {
          setVersion(publishedVersion)
          
          // Load tables for the published version
          const [tables] = await Promise.all([
            getTableBlueprints(publishedVersion.id),
            getZoneBlueprints(publishedVersion.id),
          ])
          const tableData = tables.map(blueprintToTableData)
          setTablesData(tableData)

          // Clear selection since we're viewing a published version
          setSelectedTableId(null)
        }
      }
    } catch (err) {
      console.error("Failed to publish layout:", err)
      setError(err instanceof Error ? err.message : "Failed to publish layout")
      throw err
    } finally {
      setSaving(false)
    }
  }, [layout, version, tablesData, saveTable])

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  )

  const switchLayout = useCallback(async (layoutId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { getFloorLayout, getDraftVersion, getFloorLayoutVersion } = await import("@/lib/api/floor-map")
      const newLayout = await getFloorLayout(layoutId)
      if (!newLayout) {
        throw new Error("Layout not found")
      }

      setLayout(newLayout)

      // Load the active published version if available, otherwise check for draft
      let versionToLoad: FloorLayoutVersion | null = null

      // First, try to load the active published version
      if (newLayout.active_version_id) {
        versionToLoad = await getFloorLayoutVersion(newLayout.active_version_id)
      }

      // If no published version, check for existing draft
      if (!versionToLoad) {
        versionToLoad = await getDraftVersion(newLayout.id)
      }

      // If still no version, create a draft (only if layout has no versions at all)
      if (!versionToLoad) {
        versionToLoad = await getOrCreateDraftVersion(newLayout.id)
      }

      if (!versionToLoad) {
        throw new Error("Failed to load version")
      }

      setVersion(versionToLoad)

      // Load tables and zones
      const [tables, zones] = await Promise.all([
        getTableBlueprints(versionToLoad.id),
        getZoneBlueprints(versionToLoad.id),
      ])

      const tableData = tables.map(blueprintToTableData)
      setTablesData(tableData)

      // Only select table if viewing a draft (not published)
      if (versionToLoad.status === 'draft' && tableData.length > 0) {
        setSelectedTableId(tableData[0].id)
      } else {
        setSelectedTableId(null)
      }
    } catch (err) {
      console.error("Failed to switch layout:", err)
      setError(err instanceof Error ? err.message : "Failed to switch layout")
    } finally {
      setLoading(false)
    }
  }, [])

  const switchVersion = useCallback(async (versionId: string) => {
    if (!layout) {
      throw new Error("No layout selected")
    }

    try {
      setLoading(true)
      setError(null)

      const { getFloorLayoutVersion } = await import("@/lib/api/floor-map")
      const newVersion = await getFloorLayoutVersion(versionId)
      if (!newVersion) {
        throw new Error("Version not found")
      }

      if (newVersion.layout_id !== layout.id) {
        throw new Error("Version does not belong to current layout")
      }

      setVersion(newVersion)

      // Load tables and zones for the selected version
      const [tables, zones] = await Promise.all([
        getTableBlueprints(newVersion.id),
        getZoneBlueprints(newVersion.id),
      ])

      const tableData = tables.map(blueprintToTableData)
      setTablesData(tableData)

      // Only select table if viewing a draft (not published)
      if (newVersion.status === 'draft' && tableData.length > 0) {
        setSelectedTableId(tableData[0].id)
      } else {
        setSelectedTableId(null)
      }
    } catch (err) {
      console.error("Failed to switch version:", err)
      setError(err instanceof Error ? err.message : "Failed to switch version")
    } finally {
      setLoading(false)
    }
  }, [layout])

  return {
    tables,
    hydrated,
    loading,
    saving,
    error,
    selectedTable,
    selectedTableId,
    layout,
    version,
    selectTable,
    addTable,
    updateTable,
    updateTablePosition,
    removeTable,
    publishLayout,
    switchLayout,
    switchVersion,
  }
}


