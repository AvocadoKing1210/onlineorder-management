"use client"

import { Trash2, X, Settings } from "lucide-react"
import type { FloorTable, FloorTableStatus, FloorTableType } from "@/hooks/use-floor-plan"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

type FloatingDetailsPanelProps = {
  selectedTable: FloorTable | null
  onUpdateTable: (id: string, updates: Partial<FloorTable>) => void
  onRemoveTable: (id: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const statusOptions: { value: FloorTableStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "blocked", label: "Blocked" },
]

const tableTypeOptions: { value: FloorTableType; label: string }[] = [
  { value: "rectangular", label: "Rectangular" },
  { value: "circle", label: "Circle" },
  { value: "bar", label: "Bar" },
]

export function FloatingDetailsPanel({
  selectedTable,
  onUpdateTable,
  onRemoveTable,
  isCollapsed,
  onToggleCollapse,
}: FloatingDetailsPanelProps) {
  if (!selectedTable) return null

  if (isCollapsed) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="absolute left-4 top-20 z-20 h-10 w-10 shadow-lg"
        onClick={onToggleCollapse}
      >
        <Settings className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className="absolute left-4 top-20 z-20 w-80 shadow-lg">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Table Details</CardTitle>
            <CardDescription>Edit the selected table</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleCollapse}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="table-name">Name</Label>
            <Input
              id="table-name"
              value={selectedTable.name}
              onChange={(event) =>
                onUpdateTable(selectedTable.id, { name: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Table Type</Label>
            <Select
              value={selectedTable.type}
              onValueChange={(value) =>
                onUpdateTable(selectedTable.id, { type: value as FloorTableType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tableTypeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Seats</Label>
              <Input
                type="number"
                min="1"
                value={selectedTable.seats}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (value > 0) {
                    onUpdateTable(selectedTable.id, { seats: value })
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedTable.status}
                onValueChange={(value) =>
                  onUpdateTable(selectedTable.id, { status: value as FloorTableStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Table size is automatically calculated based on the number of seats.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => onRemoveTable(selectedTable.id)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete Table
          </Button>
      </CardContent>
    </Card>
  )
}

