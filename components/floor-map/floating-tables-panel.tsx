"use client"

import { PlusCircle, RefreshCcw, ChevronDown, X, Menu, Square, Circle, Minus } from "lucide-react"
import type { FloorTable, FloorTableType } from "@/hooks/use-floor-plan"
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
import { ScrollArea } from "@/components/ui/scroll-area"

type FloatingTablesPanelProps = {
  tables: FloorTable[]
  selectedTableId: string | null
  onSelect: (id: string) => void
  onAddTable: (type: FloorTableType) => void
  onResetLayout: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const tableTypeOptions: { value: FloorTableType; label: string }[] = [
  { value: "rectangular", label: "Rectangular" },
  { value: "circle", label: "Circle" },
  { value: "bar", label: "Bar" },
]

export function FloatingTablesPanel({
  tables,
  selectedTableId,
  onSelect,
  onAddTable,
  onResetLayout,
  isCollapsed,
  onToggleCollapse,
}: FloatingTablesPanelProps) {
  if (isCollapsed) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="absolute left-4 top-4 z-20 h-10 w-10 shadow-lg"
        onClick={onToggleCollapse}
      >
        <Menu className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className="absolute left-4 top-4 z-20 w-80 shadow-lg">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Tables</CardTitle>
            <CardDescription>Manage floor map tables</CardDescription>
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
        <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex-1" size="sm">
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
              size="sm"
              onClick={onResetLayout}
            >
              <RefreshCcw className="mr-2 size-4" />
              Reset
            </Button>
          </div>
          <ScrollArea className="h-64 rounded-md border">
            <ul className="divide-y">
              {tables.map((table, index) => {
                const TableIcon = table.type === "circle" 
                  ? Circle 
                  : table.type === "bar" 
                  ? Minus 
                  : Square
                
                return (
                  <li
                    key={table.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition hover:bg-muted/60",
                      selectedTableId === table.id && "bg-muted",
                    )}
                    onClick={() => onSelect(table.id)}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TableIcon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{table.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {table.seats} seats · {table.type} · {table.status}
                      </p>
                    </div>
                  </li>
                )
              })}
              {tables.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tables yet.
                </li>
              )}
            </ul>
          </ScrollArea>
      </CardContent>
    </Card>
  )
}

