"use client"

import { useState, useEffect } from "react"
import { Building2, GitBranch, CheckCircle2, Archive, FileEdit, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { FloorLayout, FloorLayoutVersion } from "@/lib/api/floor-map"
import { getFloorLayouts, getFloorLayoutVersions } from "@/lib/api/floor-map"

interface VersionFloorSelectorProps {
  currentLayout: FloorLayout | null
  currentVersion: FloorLayoutVersion | null
  onLayoutChange?: (layoutId: string) => void
  onVersionChange?: (versionId: string) => void
  loading?: boolean
}

const statusConfig = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    variant: "secondary" as const,
    className: "text-blue-600 dark:text-blue-400",
  },
  published: {
    label: "Published",
    icon: CheckCircle2,
    variant: "default" as const,
    className: "text-green-600 dark:text-green-400",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    variant: "outline" as const,
    className: "text-muted-foreground",
  },
}

export function VersionFloorSelector({
  currentLayout,
  currentVersion,
  onLayoutChange,
  onVersionChange,
  loading = false,
}: VersionFloorSelectorProps) {
  const [layouts, setLayouts] = useState<FloorLayout[]>([])
  const [versions, setVersions] = useState<FloorLayoutVersion[]>([])
  const [loadingLayouts, setLoadingLayouts] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)

  // Load all layouts
  useEffect(() => {
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
  }, [])

  // Load versions when layout changes
  useEffect(() => {
    if (!currentLayout?.id) return

    async function loadVersions() {
      try {
        setLoadingVersions(true)
        const data = await getFloorLayoutVersions(currentLayout.id)
        setVersions(data)
      } catch (err) {
        console.error("Failed to load versions:", err)
      } finally {
        setLoadingVersions(false)
      }
    }
    loadVersions()
  }, [currentLayout?.id])

  const handleLayoutSelect = (layoutId: string) => {
    if (layoutId !== currentLayout?.id && onLayoutChange) {
      onLayoutChange(layoutId)
    }
  }

  const handleVersionSelect = (versionId: string) => {
    if (versionId !== currentVersion?.id && onVersionChange) {
      onVersionChange(versionId)
    }
  }

  const currentStatus = currentVersion?.status
    ? statusConfig[currentVersion.status as keyof typeof statusConfig]
    : null
  const StatusIcon = currentStatus?.icon || FileEdit

  return (
    <div className="absolute top-4 left-4 md:left-[22rem] z-50 flex gap-2">
      {/* Floor Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="shadow-md bg-background/80 backdrop-blur-sm"
            disabled={loading || loadingLayouts}
          >
            {loadingLayouts ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="mr-2 h-4 w-4" />
            )}
            <span className="max-w-[150px] truncate">
              {currentLayout?.name || "Select Floor"}
            </span>
            {currentLayout?.floor_level !== undefined && currentLayout.floor_level !== 0 && (
              <Badge variant="secondary" className="ml-2">
                L{currentLayout.floor_level}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Select Floor</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {layouts.length === 0 ? (
              <DropdownMenuItem disabled>
                {loadingLayouts ? "Loading..." : "No floors available"}
              </DropdownMenuItem>
            ) : (
              layouts.map((layout) => (
                <DropdownMenuItem
                  key={layout.id}
                  onClick={() => handleLayoutSelect(layout.id)}
                  className={cn(
                    "flex items-center justify-between",
                    layout.id === currentLayout?.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{layout.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {layout.floor_level !== undefined && layout.floor_level !== 0 && (
                      <Badge variant="secondary" className="text-xs">
                        L{layout.floor_level}
                      </Badge>
                    )}
                    {layout.is_default && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                    {layout.id === currentLayout?.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Version Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="shadow-md bg-background/80 backdrop-blur-sm"
            disabled={loading || loadingVersions || !currentLayout}
          >
            {loadingVersions ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitBranch className="mr-2 h-4 w-4" />
            )}
            <span className="max-w-[120px] truncate">
              {currentVersion
                ? `v${currentVersion.version_number}`
                : "Select Version"}
            </span>
            {currentStatus && (
              <Badge
                variant={currentStatus.variant}
                className={cn("ml-2", currentStatus.className)}
              >
                <StatusIcon className="mr-1 h-3 w-3" />
                {currentStatus.label}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Select Version</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!currentLayout ? (
            <DropdownMenuItem disabled>Select a floor first</DropdownMenuItem>
          ) : versions.length === 0 ? (
            <DropdownMenuItem disabled>
              {loadingVersions ? "Loading..." : "No versions available"}
            </DropdownMenuItem>
          ) : (
            <>
              {/* Draft versions */}
              {versions.filter((v) => v.status === "draft").length > 0 && (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Draft
                    </DropdownMenuLabel>
                    {versions
                      .filter((v) => v.status === "draft")
                      .map((version) => {
                        const status = statusConfig[version.status as keyof typeof statusConfig]
                        const Icon = status.icon
                        return (
                          <DropdownMenuItem
                            key={version.id}
                            onClick={() => handleVersionSelect(version.id)}
                            className={cn(
                              "flex items-center justify-between",
                              version.id === currentVersion?.id && "bg-accent"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>Version {version.version_number}</span>
                            </div>
                            {version.id === currentVersion?.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </DropdownMenuItem>
                        )
                      })}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Published versions */}
              {versions.filter((v) => v.status === "published").length > 0 && (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Published
                    </DropdownMenuLabel>
                    {versions
                      .filter((v) => v.status === "published")
                      .map((version) => {
                        const status = statusConfig[version.status as keyof typeof statusConfig]
                        const Icon = status.icon
                        const isActive = currentLayout?.active_version_id === version.id
                        return (
                          <DropdownMenuItem
                            key={version.id}
                            onClick={() => handleVersionSelect(version.id)}
                            className={cn(
                              "flex items-center justify-between",
                              version.id === currentVersion?.id && "bg-accent"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>Version {version.version_number}</span>
                              {isActive && (
                                <Badge variant="default" className="text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                            {version.id === currentVersion?.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </DropdownMenuItem>
                        )
                      })}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Archived versions */}
              {versions.filter((v) => v.status === "archived").length > 0 && (
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Archived
                  </DropdownMenuLabel>
                  {versions
                    .filter((v) => v.status === "archived")
                    .slice(0, 5) // Limit to 5 most recent archived
                    .map((version) => {
                      const status = statusConfig[version.status as keyof typeof statusConfig]
                      const Icon = status.icon
                      return (
                        <DropdownMenuItem
                          key={version.id}
                          onClick={() => handleVersionSelect(version.id)}
                          className={cn(
                            "flex items-center justify-between",
                            version.id === currentVersion?.id && "bg-accent"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>Version {version.version_number}</span>
                            {version.published_at && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(version.published_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {version.id === currentVersion?.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      )
                    })}
                </DropdownMenuGroup>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

