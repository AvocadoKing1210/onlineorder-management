"use client"

import { useState, useEffect } from "react"
import { GitBranch, CheckCircle2, Archive, FileEdit, Loader2 } from "lucide-react"
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

interface VersionSelectorCompactProps {
  currentLayout: FloorLayout | null
  currentVersion: FloorLayoutVersion | null
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

export function VersionSelectorCompact({
  currentLayout,
  currentVersion,
  onVersionChange,
  loading = false,
}: VersionSelectorCompactProps) {
  const [versions, setVersions] = useState<FloorLayoutVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  // Load versions when layout changes
  useEffect(() => {
    if (!currentLayout?.id) return

    const layoutId = currentLayout.id
    async function loadVersions() {
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
    loadVersions()
  }, [currentLayout?.id])

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shadow-md"
          disabled={loading || loadingVersions || !currentLayout}
        >
          {loadingVersions ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitBranch className="mr-1.5 h-3.5 w-3.5" />
          )}
          <span className="text-xs">
            v{currentVersion?.version_number || "?"}
          </span>
          {currentStatus && (
            <Badge
              variant={currentStatus.variant}
              className={cn("ml-1.5 h-4 px-1.5 text-[10px]", currentStatus.className)}
            >
              <StatusIcon className="mr-0.5 h-2.5 w-2.5" />
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
  )
}

