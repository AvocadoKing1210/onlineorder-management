"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import type { FloorTable, FloorTableType, SeatSections } from "@/hooks/use-floor-plan"
import { Button } from "@/components/ui/button"

const GRID_SIZE = 40
const INITIAL_VIEWBOX_SIZE = 2000 // Large initial viewBox for infinite canvas

type FloorMapCanvasProps = {
  tables: FloorTable[]
  selectedTableId: string | null
  onSelectTable: (id: string | null) => void
  onPositionChange: (id: string, x: number, y: number) => void
  mobileDetailsOpen?: boolean // Mobile drawer open state
  isMobile?: boolean // Whether we're on mobile
}

// All tables use light grey colors regardless of status
const TABLE_COLORS = {
  fill: "#e5e7eb", // Light grey
  fillLight: "#f3f4f6",
  stroke: "#d1d5db", // Light grey stroke
  seatFill: "#d1d5db", // Light grey seats
  seatStroke: "#9ca3af",
}

type DraggableTableProps = {
  table: FloorTable
  isSelected: boolean
  onSelect: (id: string) => void
  scaleX: number
  scaleY: number
  allTables: FloorTable[]
  onDragUpdate?: (guideLines: AlignmentGuideLine[]) => void
  isSpacePressed?: boolean
}

// Calculate seat positions around the table
function calculateSeatPositions(
  seats: number,
  tableCenterX: number,
  tableCenterY: number,
  tableHalfWidth: number,
  tableHalfHeight: number,
  seatRadius: number,
  tableWidth: number,
  tableHeight: number,
  tableType: FloorTableType,
  seatSections?: SeatSections,
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = []
  const spacing = 12 // Space between table edge and seat
  const fixedSeatSpacing = 36 // Fixed spacing between adjacent seats (center to center)

  if (tableType === "circle") {
    // Circular arrangement for circle tables
    const angleStep = (2 * Math.PI) / seats
    const tableRadius = Math.min(tableHalfWidth, tableHalfHeight)
    const seatDistance = tableRadius + spacing + seatRadius

    for (let i = 0; i < seats; i++) {
      const angle = i * angleStep - Math.PI / 2 // Start from top
      const x = tableCenterX + Math.cos(angle) * seatDistance
      const y = tableCenterY + Math.sin(angle) * seatDistance
      positions.push({ x, y })
    }
  } else if (tableType === "bar") {
    // Bar tables: seats on one side (bottom) with fixed spacing
    // Use seatSections if available, otherwise use total seats
    const frontSeats = seatSections?.front ?? seats
    const seatY = tableHalfHeight + spacing + seatRadius
    
    if (frontSeats === 1) {
      // Single seat at center
      positions.push({
        x: tableCenterX,
        y: tableCenterY + seatY,
      })
    } else {
      // Multiple seats with fixed spacing
      // Calculate total space needed: (N - 1) gaps of fixedSeatSpacing
      const totalSeatSpace = (frontSeats - 1) * fixedSeatSpacing
      const startX = tableCenterX - totalSeatSpace / 2
      
      for (let i = 0; i < frontSeats; i++) {
        positions.push({
          x: startX + i * fixedSeatSpacing,
          y: tableCenterY + seatY,
        })
      }
    }
  } else if (tableType === "l-booth") {
    // L-shaped booth: seats on two long edges (left vertical edge and top horizontal edge)
    // Use seatSections if available
    const leftSeats = seatSections?.left ?? Math.ceil(seats / 2)
    const frontSeats = seatSections?.front ?? Math.floor(seats / 2)
    
    // Left side (vertical edge - long edge)
    if (leftSeats > 0) {
      const leftX = -tableHalfWidth - spacing - seatRadius
      if (leftSeats === 1) {
        positions.push({
          x: tableCenterX + leftX,
          y: tableCenterY,
        })
      } else {
        const totalSeatSpace = (leftSeats - 1) * fixedSeatSpacing
        const startY = tableCenterY - totalSeatSpace / 2
        for (let i = 0; i < leftSeats; i++) {
          positions.push({
            x: tableCenterX + leftX,
            y: startY + i * fixedSeatSpacing,
          })
        }
      }
    }
    
    // Front side (top horizontal edge - long edge)
    if (frontSeats > 0) {
      const frontY = -tableHalfHeight - spacing - seatRadius
      if (frontSeats === 1) {
        positions.push({
          x: tableCenterX,
          y: tableCenterY + frontY,
        })
      } else {
        const totalSeatSpace = (frontSeats - 1) * fixedSeatSpacing
        const startX = tableCenterX - totalSeatSpace / 2
        for (let i = 0; i < frontSeats; i++) {
          positions.push({
            x: startX + i * fixedSeatSpacing,
            y: tableCenterY + frontY,
          })
        }
      }
    }
  } else if (tableType === "u-booth") {
    // U-shaped booth: seats on three sides (left, top/front, right) - NOT on bottom (inside the U)
    // Use seatSections if available
    const leftSeats = seatSections?.left ?? Math.ceil(seats / 3)
    const frontSeats = seatSections?.front ?? Math.ceil(seats / 3)
    const rightSeats = seatSections?.right ?? Math.floor(seats / 3)
    
    // Left side
    if (leftSeats > 0) {
      const leftX = -tableHalfWidth - spacing - seatRadius
      if (leftSeats === 1) {
        positions.push({
          x: tableCenterX + leftX,
          y: tableCenterY,
        })
      } else {
        const totalSeatSpace = (leftSeats - 1) * fixedSeatSpacing
        const startY = tableCenterY - totalSeatSpace / 2
        for (let i = 0; i < leftSeats; i++) {
          positions.push({
            x: tableCenterX + leftX,
            y: startY + i * fixedSeatSpacing,
          })
        }
      }
    }
    
    // Front side (top) - NOT bottom (inside the U)
    if (frontSeats > 0) {
      const frontY = -tableHalfHeight - spacing - seatRadius
      if (frontSeats === 1) {
        positions.push({
          x: tableCenterX,
          y: tableCenterY + frontY,
        })
      } else {
        const totalSeatSpace = (frontSeats - 1) * fixedSeatSpacing
        const startX = tableCenterX - totalSeatSpace / 2
        for (let i = 0; i < frontSeats; i++) {
          positions.push({
            x: startX + i * fixedSeatSpacing,
            y: tableCenterY + frontY,
          })
        }
      }
    }
    
    // Right side
    if (rightSeats > 0) {
      const rightX = tableHalfWidth + spacing + seatRadius
      if (rightSeats === 1) {
        positions.push({
          x: tableCenterX + rightX,
          y: tableCenterY,
        })
      } else {
        const totalSeatSpace = (rightSeats - 1) * fixedSeatSpacing
        const startY = tableCenterY - totalSeatSpace / 2
        for (let i = 0; i < rightSeats; i++) {
          positions.push({
            x: tableCenterX + rightX,
            y: startY + i * fixedSeatSpacing,
          })
        }
      }
    }
  } else if (tableType === "corner-booth") {
    // Corner booth: seats on two sides meeting at a corner (left and bottom)
    // Use seatSections if available
    const leftSeats = seatSections?.left ?? Math.ceil(seats / 2)
    const backSeats = seatSections?.back ?? Math.floor(seats / 2)
    
    // Left side
    if (leftSeats > 0) {
      const leftX = -tableHalfWidth - spacing - seatRadius
      if (leftSeats === 1) {
        positions.push({
          x: tableCenterX + leftX,
          y: tableCenterY,
        })
      } else {
        const totalSeatSpace = (leftSeats - 1) * fixedSeatSpacing
        const startY = tableCenterY - totalSeatSpace / 2
        for (let i = 0; i < leftSeats; i++) {
          positions.push({
            x: tableCenterX + leftX,
            y: startY + i * fixedSeatSpacing,
          })
        }
      }
    }
    
    // Back side (bottom)
    if (backSeats > 0) {
      const backY = tableHalfHeight + spacing + seatRadius
      if (backSeats === 1) {
        positions.push({
          x: tableCenterX,
          y: tableCenterY + backY,
        })
      } else {
        const totalSeatSpace = (backSeats - 1) * fixedSeatSpacing
        const startX = tableCenterX - totalSeatSpace / 2
        for (let i = 0; i < backSeats; i++) {
          positions.push({
            x: startX + i * fixedSeatSpacing,
            y: tableCenterY + backY,
          })
        }
      }
    }
  } else {
    // Rectangular tables: seats distributed along 4 edges
    if (seats <= 4) {
      // ≤ 4 seats: one seat at the middle of each edge
      const seatDistance = Math.max(tableHalfWidth, tableHalfHeight) + spacing + seatRadius
      
      // Top edge (seat 0)
      if (seats >= 1) {
        positions.push({
          x: tableCenterX,
          y: tableCenterY - seatDistance,
        })
      }
      // Right edge (seat 1)
      if (seats >= 2) {
        positions.push({
          x: tableCenterX + seatDistance,
          y: tableCenterY,
        })
      }
      // Bottom edge (seat 2)
      if (seats >= 3) {
        positions.push({
          x: tableCenterX,
          y: tableCenterY + seatDistance,
        })
      }
      // Left edge (seat 3)
      if (seats >= 4) {
        positions.push({
          x: tableCenterX - seatDistance,
          y: tableCenterY,
        })
      }
    } else {
      // > 4 seats: distribute along edges with proper spacing
      // Long sides (top/bottom) get ~60% of seats, short sides (left/right) get ~40%
      const longSideTotal = Math.round(seats * 0.6)
      const shortSideTotal = seats - longSideTotal
      
      // Distribute symmetrically (each side gets half)
      const topSeats = Math.ceil(longSideTotal / 2)
      const bottomSeats = Math.floor(longSideTotal / 2)
      const leftSeats = Math.ceil(shortSideTotal / 2)
      const rightSeats = Math.floor(shortSideTotal / 2)

      // Top side (long side)
      if (topSeats > 0) {
        const topY = -tableHalfHeight - spacing - seatRadius
        if (topSeats === 1) {
          // Single seat at center
          positions.push({
            x: tableCenterX,
            y: tableCenterY + topY,
          })
        } else {
          // Multiple seats with fixed spacing
          const totalSeatSpace = (topSeats - 1) * fixedSeatSpacing
          const startX = tableCenterX - totalSeatSpace / 2
          for (let i = 0; i < topSeats; i++) {
            positions.push({
              x: startX + i * fixedSeatSpacing,
              y: tableCenterY + topY,
            })
          }
        }
      }

      // Right side (short side)
      if (rightSeats > 0) {
        const rightX = tableHalfWidth + spacing + seatRadius
        if (rightSeats === 1) {
          // Single seat at center
          positions.push({
            x: tableCenterX + rightX,
            y: tableCenterY,
          })
        } else {
          // Multiple seats with fixed spacing
          const totalSeatSpace = (rightSeats - 1) * fixedSeatSpacing
          const startY = tableCenterY - totalSeatSpace / 2
          for (let i = 0; i < rightSeats; i++) {
            positions.push({
              x: tableCenterX + rightX,
              y: startY + i * fixedSeatSpacing,
            })
          }
        }
      }

      // Bottom side (long side)
      if (bottomSeats > 0) {
        const bottomY = tableHalfHeight + spacing + seatRadius
        if (bottomSeats === 1) {
          // Single seat at center
          positions.push({
            x: tableCenterX,
            y: tableCenterY + bottomY,
          })
        } else {
          // Multiple seats with fixed spacing
          const totalSeatSpace = (bottomSeats - 1) * fixedSeatSpacing
          const startX = tableCenterX - totalSeatSpace / 2
          for (let i = 0; i < bottomSeats; i++) {
            positions.push({
              x: startX + i * fixedSeatSpacing,
              y: tableCenterY + bottomY,
            })
          }
        }
      }

      // Left side (short side)
      if (leftSeats > 0) {
        const leftX = -tableHalfWidth - spacing - seatRadius
        if (leftSeats === 1) {
          // Single seat at center
          positions.push({
            x: tableCenterX + leftX,
            y: tableCenterY,
          })
        } else {
          // Multiple seats with fixed spacing
          const totalSeatSpace = (leftSeats - 1) * fixedSeatSpacing
          const startY = tableCenterY - totalSeatSpace / 2
          for (let i = 0; i < leftSeats; i++) {
            positions.push({
              x: tableCenterX + leftX,
              y: startY + i * fixedSeatSpacing,
            })
          }
        }
      }
    }
  }

  return positions
}

// Calculate alignment snap offset and guide lines
// Returns { snapX, snapY, guideLines } where guideLines contains alignment line info
type AlignmentGuideLine = {
  type: "horizontal" | "vertical"
  position: number // X for vertical, Y for horizontal
  min: number // Start position of the line
  max: number // End position of the line
}

function calculateAlignmentSnap(
  draggingTable: FloorTable,
  currentX: number,
  currentY: number,
  allTables: FloorTable[],
  snapThreshold: number = 20,
): { snapX: number; snapY: number; guideLines: AlignmentGuideLine[] } {
  const draggingCenterX = currentX + draggingTable.width / 2
  const draggingCenterY = currentY + draggingTable.height / 2

  let snapX = 0
  let snapY = 0
  let minXDistance = snapThreshold
  let minYDistance = snapThreshold
  const guideLines: AlignmentGuideLine[] = []

  // Check alignment with other tables
  for (const otherTable of allTables) {
    if (otherTable.id === draggingTable.id) continue

    const otherCenterX = otherTable.x + otherTable.width / 2
    const otherCenterY = otherTable.y + otherTable.height / 2

    // Check horizontal alignment (same Y)
    const yDistance = Math.abs(draggingCenterY - otherCenterY)
    if (yDistance < minYDistance) {
      minYDistance = yDistance
      snapY = otherCenterY - draggingCenterY
      
      // Add horizontal guide line
      if (Math.abs(snapY) < snapThreshold) {
        const alignedY = draggingCenterY + snapY
        // Extend line across visible area (will be adjusted in render)
        guideLines.push({
          type: "horizontal",
          position: alignedY,
          min: -10000, // Will be clipped to viewBox
          max: 10000,
        })
      }
    }

    // Check vertical alignment (same X)
    const xDistance = Math.abs(draggingCenterX - otherCenterX)
    if (xDistance < minXDistance) {
      minXDistance = xDistance
      snapX = otherCenterX - draggingCenterX
      
      // Add vertical guide line
      if (Math.abs(snapX) < snapThreshold) {
        const alignedX = draggingCenterX + snapX
        // Extend line across visible area (will be adjusted in render)
        guideLines.push({
          type: "vertical",
          position: alignedX,
          min: -10000, // Will be clipped to viewBox
          max: 10000,
        })
      }
    }
  }

  // Only apply snap if within threshold
  return {
    snapX: Math.abs(snapX) < snapThreshold ? snapX : 0,
    snapY: Math.abs(snapY) < snapThreshold ? snapY : 0,
    guideLines,
  }
}

function DraggableTable({ table, isSelected, onSelect, scaleX, scaleY, allTables, onDragUpdate, isSpacePressed = false }: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
  })
  const setRef = useCallback(
    (node: SVGGElement | null) => {
      setNodeRef(node as unknown as HTMLElement | null)
    },
    [setNodeRef],
  )

  // Update guide lines when dragging - use ref to avoid infinite loops
  const onDragUpdateRef = useRef(onDragUpdate)
  const prevIsDraggingRef = useRef(false)
  const prevGuideLinesRef = useRef<AlignmentGuideLine[]>([])

  useEffect(() => {
    onDragUpdateRef.current = onDragUpdate
  }, [onDragUpdate])

  useEffect(() => {
    if (!onDragUpdateRef.current) return

    // Only update when dragging state changes or transform changes while dragging
    if (transform && isDragging) {
      const dx = transform.x * scaleX
      const dy = transform.y * scaleY
      const currentX = table.x + dx
      const currentY = table.y + dy
      const snap = calculateAlignmentSnap(table, currentX, currentY, allTables)

      // Only update if guide lines actually changed
      const guideLinesChanged =
        prevGuideLinesRef.current.length !== snap.guideLines.length ||
        prevGuideLinesRef.current.some((prevLine, index) => {
          const newLine = snap.guideLines[index]
          if (!newLine) return true
          return (
            prevLine.type !== newLine.type ||
            prevLine.position !== newLine.position
          )
        })

      if (guideLinesChanged) {
        prevGuideLinesRef.current = snap.guideLines
        onDragUpdateRef.current(snap.guideLines)
      }
      prevIsDraggingRef.current = true
    } else if (prevIsDraggingRef.current && !isDragging) {
      // Only clear when transitioning from dragging to not dragging
      prevGuideLinesRef.current = []
      onDragUpdateRef.current([])
      prevIsDraggingRef.current = false
    }
  }, [transform, isDragging, table, scaleX, scaleY, allTables])

  const translated = useMemo(() => {
    // Convert screen pixel transform to SVG world coordinates
    const dx = transform ? transform.x * scaleX : 0
    const dy = transform ? transform.y * scaleY : 0
    
    // Calculate current position during drag
    const currentX = table.x + dx
    const currentY = table.y + dy
    
    // Apply alignment snap if dragging
    let snapX = 0
    let snapY = 0
    if (transform && isDragging) {
      const snap = calculateAlignmentSnap(table, currentX, currentY, allTables)
      snapX = snap.snapX
      snapY = snap.snapY
    }
    
    return `translate(${currentX + snapX} ${currentY + snapY})`
  }, [table, transform, scaleX, scaleY, isDragging, allTables])

  const cornerRadius = Math.min(20, table.width * 0.15, table.height * 0.2)
  const tableCenterX = table.width / 2
  const tableCenterY = table.height / 2
  const tableHalfWidth = table.width / 2
  const tableHalfHeight = table.height / 2
  const seatRadius = 12 // Larger seat circles

  // Calculate seat positions
  const seatPositions = useMemo(
    () =>
      calculateSeatPositions(
        table.seats,
        tableCenterX,
        tableCenterY,
        tableHalfWidth,
        tableHalfHeight,
        seatRadius,
        table.width,
        table.height,
        table.type,
        table.seatSections,
      ),
    [table.seats, tableCenterX, tableCenterY, tableHalfWidth, tableHalfHeight, table.width, table.height, table.type, table.seatSections],
  )

  // Render table shape based on type
  const renderTableShape = () => {
    if (table.type === "circle") {
      const radius = Math.min(tableHalfWidth, tableHalfHeight)
      return (
        <circle
          cx={tableCenterX}
          cy={tableCenterY}
          r={radius}
          fill={TABLE_COLORS.fill}
          stroke={isSelected ? "#3b82f6" : TABLE_COLORS.stroke}
          strokeWidth={isSelected ? 3 : 2}
        />
      )
    } else if (table.type === "l-booth") {
      // L-shaped booth: render as L shape using path
      const lSize = Math.min(tableHalfWidth, tableHalfHeight) * 0.8
      return (
        <path
          d={`M ${tableCenterX - tableHalfWidth} ${tableCenterY - tableHalfHeight} 
              L ${tableCenterX + tableHalfWidth} ${tableCenterY - tableHalfHeight}
              L ${tableCenterX + tableHalfWidth} ${tableCenterY - tableHalfHeight + lSize}
              L ${tableCenterX - tableHalfWidth + lSize} ${tableCenterY - tableHalfHeight + lSize}
              L ${tableCenterX - tableHalfWidth + lSize} ${tableCenterY + tableHalfHeight}
              L ${tableCenterX - tableHalfWidth} ${tableCenterY + tableHalfHeight} Z`}
          fill={TABLE_COLORS.fill}
          stroke={isSelected ? "#3b82f6" : TABLE_COLORS.stroke}
          strokeWidth={isSelected ? 3 : 2}
        />
      )
    } else if (table.type === "u-booth") {
      // U-shaped booth: render as U shape using path
      const uDepth = tableHalfHeight * 0.3
      return (
        <path
          d={`M ${tableCenterX - tableHalfWidth} ${tableCenterY - tableHalfHeight} 
              L ${tableCenterX + tableHalfWidth} ${tableCenterY - tableHalfHeight}
              L ${tableCenterX + tableHalfWidth} ${tableCenterY + tableHalfHeight}
              L ${tableCenterX + tableHalfWidth - uDepth} ${tableCenterY + tableHalfHeight}
              L ${tableCenterX + tableHalfWidth - uDepth} ${tableCenterY - tableHalfHeight + uDepth}
              L ${tableCenterX - tableHalfWidth + uDepth} ${tableCenterY - tableHalfHeight + uDepth}
              L ${tableCenterX - tableHalfWidth + uDepth} ${tableCenterY + tableHalfHeight}
              L ${tableCenterX - tableHalfWidth} ${tableCenterY + tableHalfHeight} Z`}
          fill={TABLE_COLORS.fill}
          stroke={isSelected ? "#3b82f6" : TABLE_COLORS.stroke}
          strokeWidth={isSelected ? 3 : 2}
        />
      )
    } else if (table.type === "corner-booth") {
      // Corner booth: similar to L-booth but different orientation
      const cornerSize = Math.min(tableHalfWidth, tableHalfHeight) * 0.8
      return (
        <path
          d={`M ${tableCenterX - tableHalfWidth} ${tableCenterY - tableHalfHeight} 
              L ${tableCenterX + tableHalfWidth - cornerSize} ${tableCenterY - tableHalfHeight}
              L ${tableCenterX + tableHalfWidth - cornerSize} ${tableCenterY - tableHalfHeight + cornerSize}
              L ${tableCenterX + tableHalfWidth} ${tableCenterY - tableHalfHeight + cornerSize}
              L ${tableCenterX + tableHalfWidth} ${tableCenterY + tableHalfHeight}
              L ${tableCenterX - tableHalfWidth} ${tableCenterY + tableHalfHeight} Z`}
          fill={TABLE_COLORS.fill}
          stroke={isSelected ? "#3b82f6" : TABLE_COLORS.stroke}
          strokeWidth={isSelected ? 3 : 2}
        />
      )
    } else {
      // Rectangular or bar table
      return (
        <rect
          width={table.width}
          height={table.height}
          rx={cornerRadius}
          fill={TABLE_COLORS.fill}
          stroke={isSelected ? "#3b82f6" : TABLE_COLORS.stroke}
          strokeWidth={isSelected ? 3 : 2}
          style={{ transition: "all 0.2s ease" }}
        />
      )
    }
  }

  // Selection indicator shape
  const renderSelectionIndicator = () => {
    if (!isSelected) return null

    if (table.type === "circle") {
      const radius = Math.min(tableHalfWidth, tableHalfHeight)
      return (
        <circle
          cx={tableCenterX}
          cy={tableCenterY}
          r={radius + 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.8}
          pointerEvents="none"
        />
      )
    } else if (table.type === "l-booth") {
      // L-shaped booth: create path outline with 4px offset, no rounded corners
      const lSize = Math.min(tableHalfWidth, tableHalfHeight) * 0.8
      const offset = 4
      return (
        <path
          d={`M ${tableCenterX - tableHalfWidth - offset} ${tableCenterY - tableHalfHeight - offset} 
              L ${tableCenterX + tableHalfWidth + offset} ${tableCenterY - tableHalfHeight - offset}
              L ${tableCenterX + tableHalfWidth + offset} ${tableCenterY - tableHalfHeight + lSize}
              L ${tableCenterX - tableHalfWidth + lSize} ${tableCenterY - tableHalfHeight + lSize}
              L ${tableCenterX - tableHalfWidth + lSize} ${tableCenterY + tableHalfHeight + offset}
              L ${tableCenterX - tableHalfWidth - offset} ${tableCenterY + tableHalfHeight + offset} Z`}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.8}
          pointerEvents="none"
        />
      )
    } else if (table.type === "u-booth") {
      // U-shaped booth: create path outline with 4px offset, no rounded corners
      const uDepth = tableHalfHeight * 0.3
      const offset = 4
      return (
        <path
          d={`M ${tableCenterX - tableHalfWidth - offset} ${tableCenterY - tableHalfHeight - offset} 
              L ${tableCenterX + tableHalfWidth + offset} ${tableCenterY - tableHalfHeight - offset}
              L ${tableCenterX + tableHalfWidth + offset} ${tableCenterY + tableHalfHeight + offset}
              L ${tableCenterX + tableHalfWidth - uDepth} ${tableCenterY + tableHalfHeight + offset}
              L ${tableCenterX + tableHalfWidth - uDepth} ${tableCenterY - tableHalfHeight + uDepth}
              L ${tableCenterX - tableHalfWidth + uDepth} ${tableCenterY - tableHalfHeight + uDepth}
              L ${tableCenterX - tableHalfWidth + uDepth} ${tableCenterY + tableHalfHeight + offset}
              L ${tableCenterX - tableHalfWidth - offset} ${tableCenterY + tableHalfHeight + offset} Z`}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.8}
          pointerEvents="none"
        />
      )
    } else if (table.type === "corner-booth") {
      // Corner booth: create path outline with 4px offset, no rounded corners
      const cornerSize = Math.min(tableHalfWidth, tableHalfHeight) * 0.8
      const offset = 4
      return (
        <path
          d={`M ${tableCenterX - tableHalfWidth - offset} ${tableCenterY - tableHalfHeight - offset} 
              L ${tableCenterX + tableHalfWidth - cornerSize} ${tableCenterY - tableHalfHeight - offset}
              L ${tableCenterX + tableHalfWidth - cornerSize} ${tableCenterY - tableHalfHeight + cornerSize}
              L ${tableCenterX + tableHalfWidth + offset} ${tableCenterY - tableHalfHeight + cornerSize}
              L ${tableCenterX + tableHalfWidth + offset} ${tableCenterY + tableHalfHeight + offset}
              L ${tableCenterX - tableHalfWidth - offset} ${tableCenterY + tableHalfHeight + offset} Z`}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.8}
          pointerEvents="none"
        />
      )
    } else {
      // Rectangular or bar table: use rounded rectangle
      return (
        <rect
          x={-4}
          y={-4}
          width={table.width + 8}
          height={table.height + 8}
          rx={cornerRadius + 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.8}
          pointerEvents="none"
        />
      )
    }
  }

  // Track if we should keep selection after mouse up
  const shouldKeepSelectionRef = useRef(false)

  // Reset selection tracking when dragging starts
  useEffect(() => {
    if (isDragging) {
      shouldKeepSelectionRef.current = false
    }
  }, [isDragging])

  // Merge our mouse down handler with drag sensor's listeners
  const mergedListeners = useMemo(() => {
    const originalOnMouseDown = (listeners as any)?.onMouseDown
    const originalOnMouseUp = (listeners as any)?.onMouseUp
    return {
      ...listeners,
      onMouseDown: (e: React.MouseEvent) => {
        // Don't select if Space is pressed (panning mode)
        if (!isSpacePressed) {
          // Select immediately on mouse down
          onSelect(table.id)
          shouldKeepSelectionRef.current = true
        }
        // Call original drag sensor handler if it exists
        if (originalOnMouseDown) {
          originalOnMouseDown(e)
        }
      },
      onMouseUp: (e: React.MouseEvent) => {
        // Stop propagation to prevent canvas click from deselecting
        e.stopPropagation()
        // If we didn't drag, ensure selection persists after a short delay
        // This ensures the selection happens after any potential canvas click
        if (shouldKeepSelectionRef.current && !isDragging) {
          setTimeout(() => {
            if (shouldKeepSelectionRef.current) {
              onSelect(table.id)
            }
          }, 0)
        }
        // Call original handler if it exists
        if (originalOnMouseUp) {
          originalOnMouseUp(e)
        }
        // Reset after a short delay to allow the selection to persist
        setTimeout(() => {
          shouldKeepSelectionRef.current = false
        }, 10)
      },
      onClick: (e: React.MouseEvent) => {
        // Stop click from bubbling to canvas (which would deselect)
        e.stopPropagation()
        // Don't select if Space is pressed or if we dragged
        if (!isSpacePressed && !isDragging) {
          onSelect(table.id)
        }
      },
    }
  }, [listeners, onSelect, table.id, isSpacePressed, isDragging])

  return (
    <g
      ref={setRef}
      transform={translated}
      cursor="move"
      opacity={isDragging ? 0.85 : 1}
      data-table-id={table.id}
      style={{ outline: 'none' }}
      {...mergedListeners}
      {...attributes}
    >
      {/* Main table shape - varies by type */}
      {renderTableShape()}

      {/* Table name */}
      <text
        x={table.width / 2}
        y={table.height / 2 - 4}
        textAnchor="middle"
        fontSize={Math.min(16, table.width * 0.12)}
        fontWeight={700}
        fill="#374151"
        pointerEvents="none"
      >
        {table.name}
      </text>

      {/* Seats count */}
      <text
        x={table.width / 2}
        y={table.height / 2 + 14}
        textAnchor="middle"
        fontSize={Math.min(12, table.width * 0.09)}
        fontWeight={500}
        fill="#6b7280"
        pointerEvents="none"
      >
        {table.seats} {table.seats === 1 ? "seat" : "seats"}
      </text>

      {/* Seat circles around the table - rendered on top */}
      {seatPositions.map((pos, index) => (
        <circle
          key={`seat-${index}`}
          cx={pos.x}
          cy={pos.y}
          r={seatRadius}
          fill={TABLE_COLORS.seatFill}
          stroke={TABLE_COLORS.seatStroke}
          strokeWidth={1.5}
          pointerEvents="none"
        />
      ))}

      {/* Selection indicator ring */}
      {renderSelectionIndicator()}
    </g>
  )
}

export function FloorMapCanvas({
  tables,
  selectedTableId,
  onSelectTable,
  onPositionChange,
  mobileDetailsOpen = false,
  isMobile = false,
}: FloorMapCanvasProps) {
  const [zoom, setZoom] = useState(1)
  const [viewBoxX, setViewBoxX] = useState(0)
  const [viewBoxY, setViewBoxY] = useState(0)
  const [guideLines, setGuideLines] = useState<AlignmentGuideLine[]>([])
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number; viewBoxX: number; viewBoxY: number } | null>(null)
  const [isPinching, setIsPinching] = useState(false)
  const pinchStartRef = useRef<{
    distance: number
    zoom: number
    viewBoxX: number
    viewBoxY: number
    centerX: number
    centerY: number
  } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevMobileDetailsOpenRef = useRef(mobileDetailsOpen)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
  )

  // Calculate viewBox dimensions based on zoom and container aspect ratio
  // Higher zoom = smaller viewBox (zoomed in)
  // Use actual container dimensions for aspect ratio
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 1080 })
  const aspectRatio = containerSize.width / containerSize.height
  const viewBoxWidth = INITIAL_VIEWBOX_SIZE / zoom
  const viewBoxHeight = viewBoxWidth / aspectRatio

  // Calculate scale factors for converting screen coordinates to SVG coordinates
  const [scaleFactors, setScaleFactors] = useState({ scaleX: 1, scaleY: 1 })

  useEffect(() => {
    if (!svgRef.current) return
    const updateScaleFactors = () => {
      if (!svgRef.current) return
      const svgRect = svgRef.current.getBoundingClientRect()
      setContainerSize({ width: svgRect.width, height: svgRect.height })
      setScaleFactors({
        scaleX: viewBoxWidth / svgRect.width,
        scaleY: viewBoxHeight / svgRect.height,
      })
    }
    updateScaleFactors()
    // Update on resize
    const resizeObserver = new ResizeObserver(updateScaleFactors)
    resizeObserver.observe(svgRef.current)
    return () => resizeObserver.disconnect()
  }, [viewBoxWidth, viewBoxHeight])

  // Auto-fit viewBox to show all tables
  const autoFitViewBox = useCallback(() => {
    if (tables.length === 0) {
      setViewBoxX(0)
      setViewBoxY(0)
      return
    }

    // Calculate bounding box of all tables
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    tables.forEach((table) => {
      // Include seats in bounding box calculation
      const seatRadius = 12
      const seatSpacing = 12
      const maxSeatDistance = Math.max(table.width, table.height) / 2 + seatSpacing + seatRadius

      minX = Math.min(minX, table.x - maxSeatDistance)
      minY = Math.min(minY, table.y - maxSeatDistance)
      maxX = Math.max(maxX, table.x + table.width + maxSeatDistance)
      maxY = Math.max(maxY, table.y + table.height + maxSeatDistance)
    })

    // Add padding (20% of content size)
    const paddingX = (maxX - minX) * 0.2
    const paddingY = (maxY - minY) * 0.2
    minX -= paddingX
    minY -= paddingY
    maxX += paddingX
    maxY += paddingY

    // Calculate content dimensions
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    // Calculate zoom to fit content
    const currentAspectRatio = containerSize.width / containerSize.height
    const zoomToFit = Math.min(
      INITIAL_VIEWBOX_SIZE / contentWidth,
      (INITIAL_VIEWBOX_SIZE / currentAspectRatio) / contentHeight,
    )

    // Clamp zoom
    const clampedZoom = Math.max(0.5, Math.min(3, zoomToFit))

    // Calculate viewBox dimensions
    const fitViewBoxWidth = INITIAL_VIEWBOX_SIZE / clampedZoom
    const fitViewBoxHeight = fitViewBoxWidth / currentAspectRatio

    // Center the content
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setViewBoxX(centerX - fitViewBoxWidth / 2)
    setViewBoxY(centerY - fitViewBoxHeight / 2)
    setZoom(clampedZoom)
  }, [tables, containerSize])

  // Auto-fit on mount and when table count changes (not on position updates)
  const prevTableCountRef = useRef(tables.length)
  useEffect(() => {
    // Only auto-fit if table count changed (added/removed), not on position updates
    if (tables.length !== prevTableCountRef.current) {
      prevTableCountRef.current = tables.length
      autoFitViewBox()
    }
  }, [tables.length, autoFitViewBox])

  // Auto-fit on initial mount
  useEffect(() => {
    if (tables.length > 0) {
      autoFitViewBox()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  const handleResetZoom = useCallback(() => {
    autoFitViewBox()
  }, [autoFitViewBox])

  // Zoom to a specific table (mobile-aware: accounts for drawer height)
  const zoomToTable = useCallback((table: FloorTable) => {
    if (!svgRef.current || !containerRef.current) return

    // Calculate table bounds including seats
    const seatRadius = 12
    const seatSpacing = 12
    const maxSeatDistance = Math.max(table.width, table.height) / 2 + seatSpacing + seatRadius

    const tableCenterX = table.x + table.width / 2
    const tableCenterY = table.y + table.height / 2

    // Calculate bounding box with padding
    const padding = 100 // Extra padding around the table
    const contentWidth = table.width + maxSeatDistance * 2 + padding * 2
    const contentHeight = table.height + maxSeatDistance * 2 + padding * 2

    // Get actual container dimensions
    const containerRect = containerRef.current.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // Calculate available viewport for table display
    // Drawer takes approximately 40% of screen height when open (max-h-[85vh] but typically ~40%)
    // So we have ~60% available for the table
    const drawerHeightRatio = 0.4 // 40% of viewport height
    const availableHeightRatio = 1 - drawerHeightRatio // 60% available
    const availableHeight = containerHeight * availableHeightRatio
    const availableWidth = containerWidth // Full width available

    // Calculate the aspect ratio of available space
    const availableAspectRatio = availableWidth / availableHeight

    // Calculate zoom to fit the table in the available space
    // We need to fit contentWidth in availableWidth and contentHeight in availableHeight
    const zoomForWidth = INITIAL_VIEWBOX_SIZE / contentWidth
    const zoomForHeight = (INITIAL_VIEWBOX_SIZE / availableAspectRatio) / contentHeight

    // Use the smaller zoom to ensure table fits in both dimensions
    const zoomToFit = Math.min(zoomForWidth, zoomForHeight)

    // Clamp zoom
    const clampedZoom = Math.max(0.5, Math.min(3, zoomToFit))

    // Calculate viewBox dimensions based on available space
    const fitViewBoxWidth = INITIAL_VIEWBOX_SIZE / clampedZoom
    const fitViewBoxHeight = fitViewBoxWidth / availableAspectRatio

    // Position the table in the center of the available space (above the drawer)
    // The available space starts at y=0 and ends at availableHeight
    // We want to center the table vertically in this space
    // Convert availableHeight to SVG coordinates
    const scaleY = fitViewBoxHeight / containerHeight
    const availableHeightInSVG = availableHeight * scaleY
    
    // Calculate the center Y position in the available space (top 60% of viewport)
    // This should be at 30% of viewport height (center of top 60%)
    const targetCenterYInSVG = availableHeightInSVG / 2

    // Calculate viewBox Y position to center table at targetCenterYInSVG
    // We want: tableCenterY - viewBoxY = targetCenterYInSVG
    // So: viewBoxY = tableCenterY - targetCenterYInSVG
    const targetViewBoxY = tableCenterY - targetCenterYInSVG

    // Center horizontally
    const targetViewBoxX = tableCenterX - fitViewBoxWidth / 2

    setViewBoxX(targetViewBoxX)
    setViewBoxY(targetViewBoxY)
    setZoom(clampedZoom)
  }, [])

  // Auto-zoom to selected table when mobile drawer opens
  useEffect(() => {
    if (!isMobile) return // Only on mobile
    if (!mobileDetailsOpen) return // Only when drawer is open
    if (!selectedTableId) return // Only when a table is selected

    const table = tables.find(t => t.id === selectedTableId)
    if (table) {
      // Small delay to ensure drawer animation doesn't interfere
      const timeoutId = setTimeout(() => {
        zoomToTable(table)
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [isMobile, mobileDetailsOpen, selectedTableId, tables, zoomToTable])

  // Auto-zoom out when mobile drawer closes
  useEffect(() => {
    if (!isMobile) {
      prevMobileDetailsOpenRef.current = mobileDetailsOpen
      return // Only on mobile
    }
    
    // Only zoom out when drawer transitions from open to closed
    const wasOpen = prevMobileDetailsOpenRef.current
    const isNowClosed = !mobileDetailsOpen
    
    if (wasOpen && isNowClosed) {
      // Zoom out to fit all tables when drawer closes
      const timeoutId = setTimeout(() => {
        autoFitViewBox()
      }, 100)
      prevMobileDetailsOpenRef.current = mobileDetailsOpen
      return () => clearTimeout(timeoutId)
    }
    
    prevMobileDetailsOpenRef.current = mobileDetailsOpen
  }, [isMobile, mobileDetailsOpen, autoFitViewBox])

  const handleDragUpdate = useCallback((lines: AlignmentGuideLine[]) => {
    setGuideLines((prevLines) => {
      // Only update if lines actually changed
      if (prevLines.length !== lines.length) {
        return lines
      }
      // Deep compare guide lines
      const hasChanged = prevLines.some((prevLine, index) => {
        const newLine = lines[index]
        if (!newLine) return true
        return (
          prevLine.type !== newLine.type ||
          prevLine.position !== newLine.position ||
          prevLine.min !== newLine.min ||
          prevLine.max !== newLine.max
        )
      })
      return hasChanged ? lines : prevLines
    })
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event
      const table = tables.find((item) => item.id === active.id)
      if (!table) return

      // Check if this was actually a drag (moved more than a few pixels)
      const movedDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y)
      const wasDrag = movedDistance > 5

      if (wasDrag) {
        // Convert screen pixel delta to SVG coordinate delta using scale factors
        const worldDeltaX = delta.x * scaleFactors.scaleX
        const worldDeltaY = delta.y * scaleFactors.scaleY

        // Calculate new position
        let nextX = table.x + worldDeltaX
        let nextY = table.y + worldDeltaY

        // Apply alignment snap on drop
        const snap = calculateAlignmentSnap(table, nextX, nextY, tables)
        nextX += snap.snapX
        nextY += snap.snapY

        // No clamping - infinite canvas
        onPositionChange(table.id, Math.round(nextX), Math.round(nextY))
      } else {
        // It was just a click, ensure table stays selected
        onSelectTable(String(active.id))
      }

      // Clear guide lines
      setGuideLines([])
    },
    [tables, onPositionChange, scaleFactors, onSelectTable],
  )

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) return
      
      // Check if click was on a table (check if target is within SVG and has a table as ancestor)
      const target = e.target as HTMLElement
      if (target.closest('g[data-table-id]')) {
        // Click was on a table, don't deselect
        return
      }
      
      // Click was on canvas, deselect
      onSelectTable(null)
    },
    [onSelectTable, isPanning],
  )

  // Handle Space key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        setIsSpacePressed(false)
        setIsPanning(false)
        setPanStart(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // Handle mouse panning
  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isSpacePressed || !svgRef.current) return
      e.preventDefault()
      e.stopPropagation()

      setIsPanning(true)
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        viewBoxX,
        viewBoxY,
      })
    },
    [isSpacePressed, viewBoxX, viewBoxY],
  )

  // Global mouse move handler for panning
  useEffect(() => {
    if (!isPanning || !panStart || !svgRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return
      e.preventDefault()

      const rect = svgRef.current.getBoundingClientRect()
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y

      // Convert screen pixel delta to SVG coordinate delta
      const scaleX = viewBoxWidth / rect.width
      const scaleY = viewBoxHeight / rect.height

      const worldDeltaX = -deltaX * scaleX // Negative because we want to move viewBox opposite to mouse
      const worldDeltaY = -deltaY * scaleY

      setViewBoxX(panStart.viewBoxX + worldDeltaX)
      setViewBoxY(panStart.viewBoxY + worldDeltaY)
    }

    const handleMouseUp = () => {
      setIsPanning(false)
      setPanStart(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isPanning, panStart, viewBoxWidth, viewBoxHeight])

  // Calculate distance between two touch points
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Handle touch events for pinch-to-zoom using native listeners with passive: false
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && svgRef.current) {
        e.preventDefault()
        e.stopPropagation()
        
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = getTouchDistance(touch1, touch2)
        const centerX = (touch1.clientX + touch2.clientX) / 2
        const centerY = (touch1.clientY + touch2.clientY) / 2

        setIsPinching(true)
        pinchStartRef.current = {
          distance,
          zoom,
          viewBoxX,
          viewBoxY,
          centerX,
          centerY,
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2 && svgRef.current && pinchStartRef.current) {
        e.preventDefault()
        e.stopPropagation()

        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const currentDistance = getTouchDistance(touch1, touch2)
        const scale = currentDistance / pinchStartRef.current.distance
        const newZoom = Math.max(0.5, Math.min(3, pinchStartRef.current.zoom * scale))

        // Calculate the center point in SVG coordinates
        const rect = svgRef.current.getBoundingClientRect()
        const centerX = (touch1.clientX + touch2.clientX) / 2
        const centerY = (touch1.clientY + touch2.clientY) / 2

        // Convert screen coordinates to SVG coordinates
        const scaleX = viewBoxWidth / rect.width
        const scaleY = viewBoxHeight / rect.height
        const svgX = viewBoxX + (centerX - rect.left) * scaleX
        const svgY = viewBoxY + (centerY - rect.top) * scaleY

        // Calculate new viewBox dimensions
        const newAspectRatio = containerSize.width / containerSize.height
        const newViewBoxWidth = INITIAL_VIEWBOX_SIZE / newZoom
        const newViewBoxHeight = newViewBoxWidth / newAspectRatio

        // Zoom into the center point
        const newViewBoxX = svgX - (centerX - rect.left) * (newViewBoxWidth / rect.width)
        const newViewBoxY = svgY - (centerY - rect.top) * (newViewBoxHeight / rect.height)

        setZoom(newZoom)
        setViewBoxX(newViewBoxX)
        setViewBoxY(newViewBoxY)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinching && e.touches.length < 2) {
        e.preventDefault()
        e.stopPropagation()
        setIsPinching(false)
        pinchStartRef.current = null
      }
    }

    // Add event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPinching, zoom, viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight, containerSize])

  // Handle wheel events for trackpad pinch-to-zoom (Ctrl+Wheel or pinch gesture on trackpad)
  // Using native listener with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && svgRef.current) {
        e.preventDefault()
        e.stopPropagation()

        const rect = svgRef.current.getBoundingClientRect()
        const delta = e.deltaY > 0 ? 0.9 : 1.1 // Zoom out or zoom in
        const newZoom = Math.max(0.5, Math.min(3, zoom * delta))

        // Get the mouse position in screen coordinates
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Convert to SVG coordinates
        const scaleX = viewBoxWidth / rect.width
        const scaleY = viewBoxHeight / rect.height
        const svgX = viewBoxX + mouseX * scaleX
        const svgY = viewBoxY + mouseY * scaleY

        // Calculate new viewBox dimensions
        const newAspectRatio = containerSize.width / containerSize.height
        const newViewBoxWidth = INITIAL_VIEWBOX_SIZE / newZoom
        const newViewBoxHeight = newViewBoxWidth / newAspectRatio

        // Zoom into the mouse position
        const newViewBoxX = svgX - mouseX * (newViewBoxWidth / rect.width)
        const newViewBoxY = svgY - mouseY * (newViewBoxHeight / rect.height)

        setZoom(newZoom)
        setViewBoxX(newViewBoxX)
        setViewBoxY(newViewBoxY)
      }
    }

    // Add event listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [zoom, viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight, containerSize])

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-4 top-4 md:bottom-4 md:top-auto z-30 flex flex-col gap-1 rounded-lg border bg-background/95 backdrop-blur-sm p-1 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= 3}
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetZoom}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="size-4" />
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={(event) => {
          // Don't start table drag if Space is pressed (panning mode)
          if (isSpacePressed) {
            return
          }
          onSelectTable(String(event.active.id))
          setGuideLines([]) // Clear guide lines on drag start
        }}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={containerRef}
          className="relative h-full w-full overflow-hidden bg-background touch-none"
          onClick={handleCanvasClick}
          onMouseDown={handlePanStart}
          style={{ cursor: isSpacePressed ? "grab" : isPanning ? "grabbing" : "default" }}
        >
          <svg
            ref={svgRef}
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
            className="h-full w-full [&_*]:outline-none"
            preserveAspectRatio="none"
            style={{ outline: 'none' }}
          >
          <defs>
            <pattern
              id="floor-grid"
              width={GRID_SIZE}
              height={GRID_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            </pattern>
            {/* Selected glow filter (only for selection, no shadow) */}
            <filter id="selected-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="0 0.5 1 0 0  0 0.5 1 0 0  0 0.5 1 0 0  0 0 0 0.4 0"
                result="coloredBlur"
              />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Grid background that fills the entire viewBox */}
          <rect
            x={viewBoxX - 10000}
            y={viewBoxY - 10000}
            width={20000}
            height={20000}
            fill="url(#floor-grid)"
          />
          {/* Alignment guide lines */}
          {guideLines.map((line, index) => {
            if (line.type === "horizontal") {
              // Extend horizontal line across viewBox width
              return (
                <line
                  key={`guide-${index}`}
                  x1={viewBoxX - 100}
                  y1={line.position}
                  x2={viewBoxX + viewBoxWidth + 100}
                  y2={line.position}
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.6}
                  pointerEvents="none"
                />
              )
            } else {
              // Extend vertical line across viewBox height
              return (
                <line
                  key={`guide-${index}`}
                  x1={line.position}
                  y1={viewBoxY - 100}
                  x2={line.position}
                  y2={viewBoxY + viewBoxHeight + 100}
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.6}
                  pointerEvents="none"
                />
              )
            }
          })}
          {tables.map((table) => (
            <DraggableTable
              key={table.id}
              table={table}
              isSelected={selectedTableId === table.id}
              onSelect={(id) => onSelectTable(id)}
              scaleX={scaleFactors.scaleX}
              scaleY={scaleFactors.scaleY}
              allTables={tables}
              onDragUpdate={handleDragUpdate}
              isSpacePressed={isSpacePressed}
            />
          ))}
          </svg>
        </div>
      </DndContext>
    </div>
  )
}

