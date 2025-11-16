"use client"

import { useState, useEffect } from "react"
import { Loader2, CircleArrowUp } from "lucide-react"
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

interface MobileVersionSelectorProps {
  currentLayout: FloorLayout | null
  currentVersion: FloorLayoutVersion | null
  onVersionChange?: (versionId: string) => void
  onPublish?: () => void
  loading?: boolean
  saving?: boolean
  publishing?: boolean
  canPublish?: boolean
}

const statusConfig = {
  draft: {
    label: "Draft",
    variant: "secondary" as const,
    className: "text-blue-600 dark:text-blue-400",
  },
  published: {
    label: "Published",
    variant: "outline" as const,
    className: "bg-white text-green-600 dark:bg-white dark:text-green-600 border-green-600",
  },
  archived: {
    label: "Archived",
    variant: "outline" as const,
    className: "text-muted-foreground",
  },
}

export function MobileVersionSelector({
  currentLayout,
  currentVersion,
  onVersionChange,
  onPublish,
  loading = false,
  saving = false,
  publishing = false,
  canPublish = false,
}: MobileVersionSelectorProps) {
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

  return (
    <div className="flex flex-col gap-0 rounded-lg border bg-background/95 backdrop-blur-sm p-0 shadow-lg overflow-hidden w-11.5">
      {/* Version Selector - Top */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted/50 rounded-b-none w-full h-11"
            disabled={loading || loadingVersions || !currentLayout}
          >
            {loadingVersions ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span className="text-xs">
                v{currentVersion?.version_number || "?"}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="left" sideOffset={0} className="w-64 mr-1 mt-[-3px]">
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
                              <span className="text-xs">Version {version.version_number}</span>
                            </div>
                            {version.id === currentVersion?.id && (
                              <Badge variant="secondary" className="text-xs">
                                Draft
                              </Badge>
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
                              <span className="text-xs">Version {version.version_number}</span>
                              {isActive && (
                                <Badge variant="default" className="text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                            {version.id === currentVersion?.id && (
                              <Badge
                                variant="outline"
                                className="bg-white text-green-600 border-green-600 text-xs"
                              >
                                Published
                              </Badge>
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
                    .slice(0, 5)
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
                            <span className="text-xs">Version {version.version_number}</span>
                            {version.published_at && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(version.published_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {version.id === currentVersion?.id && (
                            <Badge variant="outline" className="text-xs">
                              Archived
                            </Badge>
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

      {/* Publish Button - Bottom */}
      <Button
        onClick={onPublish}
        disabled={saving || publishing || !canPublish}
        size="icon"
        className={cn(
          "rounded-t-none rounded-b-lg w-full h-12",
          canPublish 
            ? "bg-black text-white hover:bg-black/90" 
            : "hover:bg-muted/50"
        )}
        variant="ghost"
      >
        {publishing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CircleArrowUp className="size-4" />
        )}
      </Button>
    </div>
  )
}

