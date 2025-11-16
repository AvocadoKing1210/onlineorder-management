"use client"

import { useRef, useState } from "react"
import { FloorMapCanvas } from "@/components/floor-map/floor-map-canvas"
import { AccordionPanels } from "@/components/floor-map/accordion-panels"
import { CombinedVersionPublish } from "@/components/floor-map/combined-version-publish"
import { useFloorPlan } from "@/hooks/use-floor-plan"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Loader2, Save, AlertCircle, CircleArrowUp } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function FloorMapPage() {
  const {
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
  } = useFloorPlan()
  const isMobile = useIsMobile()
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const publishingLockRef = useRef(false)

  const handlePublish = async () => {
    if (publishingLockRef.current) return

    try {
      publishingLockRef.current = true
      setPublishing(true)
      await publishLayout()
      toast.success("Layout Published", {
        description: "Your floor plan has been published successfully.",
      })
      setShowPublishDialog(false)
    } catch (err) {
      toast.error("Publish Failed", {
        description: err instanceof Error ? err.message : "Failed to publish layout",
      })
    } finally {
      setPublishing(false)
      publishingLockRef.current = false
    }
  }

  if (!hydrated || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading floor map…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100vh-var(--header-height))] w-full overflow-hidden">
      {/* Error banner */}
      {error && (
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded-md bg-background/80 px-3 py-2 text-sm shadow-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving…</span>
        </div>
      )}

      {/* Combined Version selector and Publish button - show for all versions, but only enable publish for drafts */}
      {version && (
        <div className="absolute top-4 right-4 z-50">
          <CombinedVersionPublish
            currentVersion={version}
            onVersionChange={switchVersion}
            onPublish={() => setShowPublishDialog(true)}
            loading={loading}
            saving={saving}
            publishing={publishing}
            currentLayout={layout}
            canPublish={version.status === "draft" && tables.length > 0}
          />
        </div>
      )}

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
        onMobileDetailsOpenChange={setMobileDetailsOpen}
        currentLayout={layout}
        currentVersion={version}
        onLayoutChange={switchLayout}
        onVersionChange={switchVersion}
        onLayoutCreated={(layout) => switchLayout(layout.id)}
        loading={loading}
      />

      {/* Publish confirmation dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Floor Layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will publish the current draft version and make it the active layout.
              The previous published version will be archived. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={publishing}>
              {publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                "Publish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


