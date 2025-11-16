"use client"

import { useState, useEffect } from "react"
import { GitBranch, CheckCircle2, Archive, FileEdit, Loader2, CircleArrowUp } from "lucide-react"
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
import { getFloorLayoutVersions } from "@/lib/api/floor-map"

interface CombinedVersionPublishProps {
  currentLayout: FloorLayout | null
  currentVersion: FloorLayoutVersion | null
  onVersionChange?: (versionId: string) => void
  onPublish?: () => void
  onPublishComplete?: () => void // Callback to refresh versions after publish
  loading?: boolean
  saving?: boolean
  publishing?: boolean
  canPublish?: boolean
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
    variant: "outline" as const,
    className: "bg-white text-green-600 dark:bg-white dark:text-green-600 border-green-600",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    variant: "outline" as const,
    className: "text-muted-foreground",
  },
}

export function CombinedVersionPublish({
  currentLayout,
  currentVersion,
  onVersionChange,
  onPublish,
  onPublishComplete,
  loading = false,
  saving = false,
  publishing = false,
  canPublish = false,
}: CombinedVersionPublishProps) {
  const [versions, setVersions] = useState<FloorLayoutVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  const loadVersions = async () => {
    if (!currentLayout?.id) return

    const layoutId = currentLayout.id
    try {
      setLoadingVersions(true)
      const data = await getFloorLayoutVersions(layoutId)
      setVersions(data)
    } catch (err) {
      console.error("Failed to load versions:", err)
    } finally {
      setLoadingVersions(false)
    }
  }

  // Load versions when layout changes
  useEffect(() => {
    loadVersions()
  }, [currentLayout?.id])

  // Refresh versions after publish completes
  useEffect(() => {
    if (!publishing && currentLayout?.id) {
      // Refresh when publishing state changes from true to false
      loadVersions()
    }
  }, [publishing, currentLayout?.id])

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
    <div className="flex items-center gap-0 rounded-md border bg-background shadow-md overflow-hidden">
      {/* Version Selector - Left side */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-r-none border-r border-border h-9 px-3 hover:bg-muted/50"
            disabled={loading || loadingVersions || !currentLayout}
          >
            {loadingVersions ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            <span className="text-xs mr-1.5">
              v{currentVersion?.version_number || "?"}
            </span>
            {currentStatus && (
              <Badge
                variant={currentStatus.variant}
                className={cn("h-4 px-1.5 text-[10px]", currentStatus.className)}
              >
                {currentStatus.label}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
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

      {/* Publish Button - Right side */}
      <Button
        onClick={onPublish}
        disabled={saving || publishing || !canPublish}
        size="sm"
        className="rounded-l-none h-9 px-3"
        variant={canPublish ? "default" : "ghost"}
      >
        {publishing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CircleArrowUp className="mr-2 h-4 w-4" />
        )}
        Publish
      </Button>
    </div>
  )
}

