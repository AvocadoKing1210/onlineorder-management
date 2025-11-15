"use client"

import { PlusCircle, RefreshCcw, Trash2, ChevronDown } from "lucide-react"
import type { FloorTable, FloorTableStatus, FloorTableType } from "@/hooks/use-floor-plan"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type FloorMapSidebarProps = {
  tables: FloorTable[]
  selectedTable: FloorTable | null
  onSelect: (id: string) => void
  onAddTable: (type: FloorTableType) => void
  onRemoveTable: (id: string) => void
  onUpdateTable: (id: string, updates: Partial<FloorTable>) => void
  onResetLayout: () => void
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

export function FloorMapSidebar({
  tables,
  selectedTable,
  onSelect,
  onAddTable,
  onRemoveTable,
  onUpdateTable,
  onResetLayout,
}: FloorMapSidebarProps) {
  const selectedId = selectedTable?.id ?? null

  return (
    <div className="flex h-full flex-col gap-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Tables</CardTitle>
          <CardDescription>Manage floor map tables stored locally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex-1">
                  <PlusCircle className="mr-2 size-4" />
                  Add Table
                  <ChevronDown className="ml-2 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {tableTypeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onAddTable(option.value)}
                  >
                    Add {option.label} Table
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={onResetLayout}
            >
              <RefreshCcw className="mr-2 size-4" />
              Reset
            </Button>
          </div>
          <ScrollArea className="h-64 rounded-md border">
            <ul className="divide-y">
              {tables.map((table) => (
                <li
                  key={table.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition hover:bg-muted/60",
                    selectedId === table.id && "bg-muted",
                  )}
                  onClick={() => onSelect(table.id)}
                >
                  <div>
                    <p className="font-medium">{table.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {table.seats} seats · {table.type} · {table.status}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    ({table.x}, {table.y})
                  </span>
                </li>
              ))}
              {tables.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tables yet.
                </li>
              )}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg">Table Details</CardTitle>
          <CardDescription>
            {selectedTable ? "Edit the selected table" : "Select a table to edit its details"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTable ? (
            <>
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
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>X Position</Label>
                  <Input
                    type="number"
                    value={selectedTable.x}
                    onChange={(event) =>
                      onUpdateTable(selectedTable.id, { x: Number(event.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Y Position</Label>
                  <Input
                    type="number"
                    value={selectedTable.y}
                    onChange={(event) =>
                      onUpdateTable(selectedTable.id, { y: Number(event.target.value) })
                    }
                  />
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
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Select a table from the list to edit its properties.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


