"use client"

import { useRef, useState, useEffect } from "react"
import { FloorMapCanvas } from "@/components/floor-map/floor-map-canvas"
import { AccordionPanels } from "@/components/floor-map/accordion-panels"
import { CombinedVersionPublish } from "@/components/floor-map/combined-version-publish"
import { MobileVersionSelector } from "@/components/floor-map/mobile-version-selector"
import { useFloorPlan } from "@/hooks/use-floor-plan"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Loader2, Save, AlertCircle, CircleArrowUp, ChevronDown, CheckCircle2, Plus, Pencil, Trash2, X, Check } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { FloorLayout } from "@/lib/api/floor-map"
import { getFloorLayouts, deleteFloorLayout, updateFloorLayout, getDefaultFloorLayout } from "@/lib/api/floor-map"

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
  
  // Mobile floor selector state
  const [layouts, setLayouts] = useState<FloorLayout[]>([])
  const [loadingLayouts, setLoadingLayouts] = useState(false)
  const [showDeleteFloorDialog, setShowDeleteFloorDialog] = useState(false)
  const [floorToDelete, setFloorToDelete] = useState<FloorLayout | null>(null)
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null)
  const [editingFloorName, setEditingFloorName] = useState("")
  
  // Load layouts for mobile floor selector
  useEffect(() => {
    if (!isMobile) return
    
    async function loadLayouts() {
      try {
        setLoadingLayouts(true)
        const data = await getFloorLayouts()
        setLayouts(data)
      } catch (err) {
        console.error("Failed to load layouts:", err)
      } finally {
        setLoadingLayouts(false)
      }
    }
    loadLayouts()
  }, [isMobile, layout?.id]) // Reload when layout changes

  const handleMobileLayoutSelect = (layoutId: string) => {
    if (layoutId !== layout?.id) {
      switchLayout(layoutId)
    }
  }

  const handleMobileCreateFloor = async () => {
    try {
      const { createFloorLayout } = await import("@/lib/api/floor-map")
      const newLayout = await createFloorLayout({
        name: `Floor ${layouts.length + 1}`,
        slug: `floor-${layouts.length + 1}`,
        description: "",
        floor_level: layouts.length + 1,
        is_default: false,
      })
      
      const data = await getFloorLayouts()
      setLayouts(data)
      
      switchLayout(newLayout.id)
    } catch (err) {
      console.error("Failed to create floor:", err)
      toast.error("Failed to create floor")
    }
  }

  const handleMobileDeleteFloor = async () => {
    if (!floorToDelete) return

    try {
      await deleteFloorLayout(floorToDelete.id)
      
      const data = await getFloorLayouts()
      setLayouts(data)
      
      if (floorToDelete.id === layout?.id) {
        const defaultLayout = await getDefaultFloorLayout()
        if (defaultLayout && defaultLayout.id !== floorToDelete.id) {
          switchLayout(defaultLayout.id)
        } else if (data.length > 0 && data[0].id !== floorToDelete.id) {
          switchLayout(data[0].id)
        }
      }
      
      setShowDeleteFloorDialog(false)
      setFloorToDelete(null)
    } catch (err) {
      console.error("Failed to delete floor:", err)
      toast.error("Failed to delete floor")
    }
  }

  const handleMobileEditFloor = (layout: FloorLayout) => {
    setEditingFloorId(layout.id)
    setEditingFloorName(layout.name)
  }

  const handleMobileSaveFloorName = async (layoutId: string) => {
    if (!editingFloorName.trim()) {
      setEditingFloorId(null)
      return
    }

    try {
      await updateFloorLayout(layoutId, { name: editingFloorName.trim() })
      const data = await getFloorLayouts()
      setLayouts(data)
      setEditingFloorId(null)
    } catch (err) {
      console.error("Failed to update floor name:", err)
      toast.error("Failed to update floor name")
    }
  }

  const handleMobileCancelEditFloor = () => {
    setEditingFloorId(null)
    setEditingFloorName("")
  }

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

      {/* Combined Version selector and Publish button - Desktop only */}
      {version && !isMobile && (
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

      {/* Mobile Floor Selector - Top Left */}
      {isMobile && (
        <div className="absolute left-4 top-4 z-30">
          <div className="bg-background border rounded-md shadow-lg">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
                  disabled={loading || loadingLayouts}
                >
                  {loadingLayouts ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="flex-1 text-left truncate text-sm">
                      {layout?.name || "Select Floor"}
                    </span>
                  )}
                  {!loadingLayouts && layout?.floor_level !== undefined && layout.floor_level !== 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
                      L{layout.floor_level}
                    </Badge>
                  )}
                  {!loadingLayouts && (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[240px]">
                <DropdownMenuLabel>Select Floor</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {layouts.length === 0 ? (
                    <DropdownMenuItem disabled>
                      {loadingLayouts ? "Loading..." : "No floors available"}
                    </DropdownMenuItem>
                  ) : (
                    layouts.map((floorLayout) => (
                      <DropdownMenuItem
                        key={floorLayout.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (editingFloorId !== floorLayout.id) {
                            handleMobileLayoutSelect(floorLayout.id)
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between group/item",
                          floorLayout.id === layout?.id && "bg-accent"
                        )}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {floorLayout.id === layout?.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                          {floorLayout.floor_level !== undefined && floorLayout.floor_level !== 0 ? (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              L{floorLayout.floor_level}
                            </Badge>
                          ) : null}
                          {editingFloorId === floorLayout.id ? (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <Input
                                value={editingFloorName}
                                onChange={(e) => setEditingFloorName(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault()
                                    handleMobileSaveFloorName(floorLayout.id)
                                  } else if (e.key === "Escape") {
                                    e.preventDefault()
                                    handleMobileCancelEditFloor()
                                  }
                                }}
                                className="h-6 text-xs px-1.5 py-0.5"
                                autoFocus
                              />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMobileSaveFloorName(floorLayout.id)
                                    }}
                                    className="p-0.5 hover:bg-muted rounded"
                                  >
                                    <Check className="h-3.5 w-3.5 text-primary" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Save</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMobileCancelEditFloor()
                                    }}
                                    className="p-0.5 hover:bg-muted rounded"
                                  >
                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Cancel</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          ) : (
                            <>
                              <span className="truncate">{floorLayout.name}</span>
                              {floorLayout.is_default && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  Default
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {editingFloorId !== floorLayout.id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMobileEditFloor(floorLayout)
                                  }}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Floor Name</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {!floorLayout.is_default && editingFloorId !== floorLayout.id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setFloorToDelete(floorLayout)
                                    setShowDeleteFloorDialog(true)
                                  }}
                                  className="p-1 hover:bg-destructive/10 rounded"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Floor</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMobileCreateFloor} className="text-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Floor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Mobile Version selector - positioned below zoom buttons, aligned with zoom buttons */}
      {version && isMobile && (
        <div className="absolute right-4 top-[160px] z-30">
          <MobileVersionSelector
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

      {/* Delete Floor Confirmation Dialog - Mobile */}
      {isMobile && (
        <AlertDialog open={showDeleteFloorDialog} onOpenChange={setShowDeleteFloorDialog}>
          <AlertDialogContent className={isMobile ? "mx-4" : ""}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Floor?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{floorToDelete?.name}"? This will permanently delete the floor layout and all its versions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={isMobile ? "gap-3" : ""}>
              <AlertDialogCancel onClick={() => setFloorToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleMobileDeleteFloor}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Publish confirmation dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className={isMobile ? "w-[calc(100%-2rem)] max-w-[calc(100%-2rem)]" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Floor Layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will publish the current draft version and make it the active layout.
              The previous published version will be archived. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? "gap-3" : ""}>
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


