"use client"

import { useState } from "react"
import { FloorMapCanvas } from "@/components/floor-map/floor-map-canvas"
import { AccordionPanels } from "@/components/floor-map/accordion-panels"
import { useFloorPlan } from "@/hooks/use-floor-plan"
import { useIsMobile } from "@/hooks/use-mobile"

export default function FloorMapPage() {
  const {
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
  } = useFloorPlan()
  const isMobile = useIsMobile()
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false)

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading local floor map…</p>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100vh-var(--header-height))] w-full overflow-hidden">
      {/* Full screen canvas */}
      <FloorMapCanvas
        tables={tables}
        selectedTableId={selectedTableId}
        onSelectTable={selectTable}
        onPositionChange={updateTablePosition}
        mobileDetailsOpen={mobileDetailsOpen}
        isMobile={isMobile}
      />
      
      {/* Accordion Panels */}
      <AccordionPanels
        tables={tables}
        selectedTable={selectedTable}
        selectedTableId={selectedTableId}
        onSelect={(id) => selectTable(id)}
        onAddTable={addTable}
        onUpdateTable={updateTable}
        onRemoveTable={removeTable}
        onResetLayout={resetLayout}
        onMobileDetailsOpenChange={setMobileDetailsOpen}
      />
    </div>
  )
}


