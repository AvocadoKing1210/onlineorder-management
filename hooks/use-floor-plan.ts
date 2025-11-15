"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

export type FloorTableStatus = "available" | "reserved" | "blocked"
export type FloorTableType = "rectangular" | "circle" | "bar" | "l-booth" | "u-booth" | "corner-booth"

// Seat sections for booths (left, right, front, back)
export type SeatSections = {
  left?: number
  right?: number
  front?: number
  back?: number
}

// Stored table data (what goes in localStorage)
export type FloorTableData = {
  id: string
  name: string
  seats: number // Total seats (computed from seatSections for booths, or direct value)
  x: number
  y: number
  status: FloorTableStatus
  type: FloorTableType
  seatSections?: SeatSections // For booth types: configure seats per section
}

// Table with computed size (used in components)
export type FloorTable = FloorTableData & {
  width: number // Computed in real-time
  height: number // Computed in real-time
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

const STORAGE_KEY = "floor-map:v1"

const createDefaultTable = (id: string, name: string, seats: number, x: number, y: number, status: FloorTableStatus, type: FloorTableType = "rectangular"): FloorTableData => {
  return {
    id,
    name,
    seats,
    x,
    y,
    status,
    type,
  }
}

const DEFAULT_TABLES_DATA: FloorTableData[] = [
  createDefaultTable("table-1", "Table 1", 4, 80, 80, "available", "rectangular"),
  createDefaultTable("table-2", "Table 2", 2, 260, 80, "reserved", "circle"),
  createDefaultTable("table-3", "Table 3", 6, 80, 220, "available", "rectangular"),
  createDefaultTable("table-4", "Booth A", 4, 300, 250, "blocked", "bar"),
]

const createTable = (count: number, type: FloorTableType = "rectangular"): FloorTableData => {
  const id = (globalThis.crypto?.randomUUID?.() ?? `table-${Date.now()}-${Math.random()}`)
  const baseTable = {
    id,
    name: `Table ${count + 1}`,
    seats: 4,
    x: 60,
    y: 60,
    status: "available" as FloorTableStatus,
    type,
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
  
  return baseTable
}

// Add computed size to table data
const addComputedSize = (table: FloorTableData): FloorTable => {
  const size = calculateTableSize(table.seats, table.type, table.seatSections)
  return {
    ...table,
    width: size.width,
    height: size.height,
  }
}

const duplicateDefaults = () => DEFAULT_TABLES_DATA.map((table) => ({ ...table }))

export function useFloorPlan() {
  // Store only data without computed size
  const [tablesData, setTablesData] = useState<FloorTableData[]>(duplicateDefaults)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    DEFAULT_TABLES_DATA[0]?.id ?? null,
  )
  const [hydrated, setHydrated] = useState(false)

  // Compute tables with size for components
  const tables = useMemo(() => tablesData.map(addComputedSize), [tablesData])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as FloorTableData[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove any width/height that might be in old data, and add default type if missing
          const cleaned = parsed.map(({ width, height, type, ...rest }) => ({
            ...rest,
            type: type || "rectangular", // Default to rectangular for old data
          }))
          setTablesData(cleaned)
          setSelectedTableId(cleaned[0]?.id ?? null)
        }
      }
    } catch (error) {
      console.warn("Failed to load floor plan from localStorage", error)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    // Store only data without computed size
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tablesData))
  }, [tablesData, hydrated])

  const selectTable = useCallback((id: string | null) => {
    setSelectedTableId(id)
  }, [])

  const addTable = useCallback((type: FloorTableType = "rectangular") => {
    setTablesData((prev) => {
      const next = createTable(prev.length, type)
      setSelectedTableId(next.id)
      return [...prev, next]
    })
  }, [])

  const updateTable = useCallback((id: string, updates: UpdateInput) => {
    setTablesData((prev) =>
      prev.map((table) => (table.id === id ? { ...table, ...updates } : table)),
    )
  }, [])

  const updateTablePosition = useCallback((id: string, x: number, y: number) => {
    updateTable(id, { x, y })
  }, [updateTable])

  const removeTable = useCallback((id: string) => {
    setTablesData((prev) => prev.filter((table) => table.id !== id))
    setSelectedTableId((current) => (current === id ? null : current))
  }, [])

  const resetLayout = useCallback(() => {
    setTablesData(duplicateDefaults())
    setSelectedTableId(DEFAULT_TABLES_DATA[0]?.id ?? null)
  }, [])

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  )

  return {
    tables,
    hydrated,
    selectedTable,
    selectedTableId,
    selectTable,
    addTable,
    updateTable,
    updateTablePosition,
    removeTable,
    resetLayout,
  }
}


