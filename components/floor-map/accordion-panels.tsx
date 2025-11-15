"use client"

import { useState, useEffect, useRef } from "react"
import { PlusCircle, RefreshCcw, ChevronDown, Menu, Square, Circle, Minus, Settings, Trash2, ChevronRight, Plus, Minus as MinusIcon, X } from "lucide-react"
import type { FloorTable, FloorTableType, FloorTableStatus, SeatSections } from "@/hooks/use-floor-plan"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"

type AccordionPanelsProps = {
  tables: FloorTable[]
  selectedTable: FloorTable | null
  selectedTableId: string | null
  onSelect: (id: string) => void
  onAddTable: (type: FloorTableType) => void
  onUpdateTable: (id: string, updates: Partial<FloorTable>) => void
  onRemoveTable: (id: string) => void
  onResetLayout: () => void
  onMobileDetailsOpenChange?: (open: boolean) => void // Callback for mobile drawer state
}

const tableTypeOptions: { value: FloorTableType; label: string }[] = [
  { value: "rectangular", label: "Rectangular" },
  { value: "circle", label: "Circle" },
  { value: "bar", label: "Bar" },
  { value: "l-booth", label: "L-Booth" },
  { value: "u-booth", label: "U-Booth" },
  { value: "corner-booth", label: "Corner Booth" },
]

const statusOptions: { value: FloorTableStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "blocked", label: "Blocked" },
]

export function AccordionPanels({
  tables,
  selectedTable,
  selectedTableId,
  onSelect,
  onAddTable,
  onUpdateTable,
  onRemoveTable,
  onResetLayout,
  onMobileDetailsOpenChange,
}: AccordionPanelsProps) {
  const isMobile = useIsMobile()
  const [openPanel, setOpenPanel] = useState<"tables" | "details" | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [tableToDelete, setTableToDelete] = useState<string | null>(null)
  const [mobileTablesOpen, setMobileTablesOpen] = useState(false)
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false)
  const manuallyClosedRef = useRef(false)
  const prevSelectedTableIdRef = useRef<string | null>(null)

  // Open details panel when a table is selected, close it when no table is selected
  useEffect(() => {
    // Check if a different table was selected
    const isNewTable = selectedTableId !== prevSelectedTableIdRef.current
    
    if (selectedTable) {
      // Reset manual close flag when a new table is selected
      if (isNewTable) {
        manuallyClosedRef.current = false
      }
      // Open details panel when a table is selected (unless it was manually closed)
      if (!manuallyClosedRef.current) {
        if (isMobile) {
          setMobileDetailsOpen(true)
        } else {
          setOpenPanel("details")
        }
      }
      prevSelectedTableIdRef.current = selectedTableId
    } else {
      // Close details panel when no table is selected
      if (isMobile) {
        setMobileDetailsOpen(false)
      } else {
        setOpenPanel((prev) => (prev === "details" ? null : prev))
      }
      manuallyClosedRef.current = false
      prevSelectedTableIdRef.current = null
    }
  }, [selectedTable, selectedTableId, isMobile])

  // Notify parent of mobile drawer state changes
  useEffect(() => {
    if (isMobile && onMobileDetailsOpenChange) {
      onMobileDetailsOpenChange(mobileDetailsOpen)
    }
  }, [isMobile, mobileDetailsOpen, onMobileDetailsOpenChange])

  const handleTablesToggle = () => {
    setOpenPanel(openPanel === "tables" ? null : "tables")
  }

  const handleDetailsToggle = () => {
    if (!selectedTable) return
    const willClose = openPanel === "details"
    setOpenPanel(willClose ? null : "details")
    // Track if user manually closed the panel
    if (willClose) {
      manuallyClosedRef.current = true
    } else {
      manuallyClosedRef.current = false
    }
  }

  const isTablesOpen = openPanel === "tables"
  const isDetailsOpen = openPanel === "details" && selectedTable !== null
  const addTableButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (addTableButtonRef.current && isTablesOpen) {
      const width = addTableButtonRef.current.offsetWidth
      setDropdownWidth(width)
    }
  }, [isTablesOpen])

  // Mobile: Show floating action buttons and drawers
  if (isMobile) {
    return (
      <>
        {/* Mobile Floating Action Buttons */}
        <div className="fixed bottom-4 left-4 right-4 z-30 flex gap-3 md:hidden">
          <Drawer open={mobileTablesOpen} onOpenChange={setMobileTablesOpen}>
            <DrawerTrigger asChild>
              <Button
                size="lg"
                className="flex-1 h-14 rounded-full shadow-lg"
              >
                <Menu className="mr-2 size-5" />
                Tables
              </Button>
            </DrawerTrigger>
            <DrawerContent direction="bottom" className="max-h-[85vh]">
              <DrawerHeader className="text-left">
                <div className="flex items-center justify-between">
                  <DrawerTitle>Tables</DrawerTitle>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>
              <div className="px-4 pb-4 space-y-3 overflow-y-auto">
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="flex-1" size="sm">
                        <PlusCircle className="mr-2 size-4" />
                        Add Table
                        <ChevronDown className="ml-2 size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {tableTypeOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => {
                            onAddTable(option.value)
                            setMobileTablesOpen(false)
                          }}
                        >
                          Add {option.label} Table
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowResetDialog(true)
                      setMobileTablesOpen(false)
                    }}
                  >
                    <RefreshCcw className="mr-2 size-4" />
                    Reset
                  </Button>
                </div>
                <ScrollArea className="h-[50vh] rounded-md border">
                  <ul className="divide-y">
                    {tables.map((table) => {
                      const TableIcon = table.type === "circle"
                        ? Circle
                        : table.type === "bar"
                        ? Minus
                        : table.type === "l-booth" || table.type === "u-booth" || table.type === "corner-booth"
                        ? Minus
                        : Square

                      return (
                        <li
                          key={table.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 px-3 py-3 text-sm transition hover:bg-muted/60",
                            selectedTableId === table.id && "bg-muted",
                          )}
                          onClick={() => {
                            onSelect(table.id)
                            setMobileTablesOpen(false)
                          }}
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
              </div>
            </DrawerContent>
          </Drawer>

          <Drawer open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
            <DrawerTrigger asChild>
              <Button
                size="lg"
                variant={selectedTable ? "default" : "outline"}
                disabled={!selectedTable}
                className="flex-1 h-14 rounded-full shadow-lg disabled:opacity-50"
              >
                <Settings className="mr-2 size-5" />
                Details
              </Button>
            </DrawerTrigger>
            {selectedTable && (
              <DrawerContent direction="bottom" className="max-h-[85vh]">
                <DrawerHeader className="text-left">
                  <div className="flex items-center justify-between">
                    <DrawerTitle>Table Details</DrawerTitle>
                    <DrawerClose asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>
                <div className="px-4 pb-4 space-y-3 overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="mobile-table-name">Name</Label>
                    <Input
                      id="mobile-table-name"
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
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
                  {/* Seat configuration - different for booths vs regular tables */}
                  {selectedTable.type === "bar" || selectedTable.type === "l-booth" || selectedTable.type === "u-booth" || selectedTable.type === "corner-booth" ? (
                    <div className="space-y-3">
                      <Label>Seat Sections</Label>
                      {selectedTable.type === "bar" && (
                        <div className="space-y-2">
                          <Label htmlFor="mobile-bar-front-seats" className="text-xs text-muted-foreground">Front</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const current = selectedTable.seatSections?.front ?? selectedTable.seats
                                const newValue = Math.max(0, current - 1)
                                const newSections: SeatSections = { front: newValue }
                                const totalSeats = newValue
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: totalSeats })
                              }}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              id="mobile-bar-front-seats"
                              type="number"
                              min="0"
                              value={selectedTable.seatSections?.front ?? selectedTable.seats}
                              onChange={(event) => {
                                const value = Math.max(0, Number(event.target.value))
                                const newSections: SeatSections = { front: value }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: value })
                              }}
                              className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const current = selectedTable.seatSections?.front ?? selectedTable.seats
                                const newValue = current + 1
                                const newSections: SeatSections = { front: newValue }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedTable.type === "l-booth" && (
                        <div className="space-y-2">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="mobile-l-booth-left-seats" className="text-xs text-muted-foreground">Left</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                    const newValue = Math.max(0, left - 1)
                                    const newSections: SeatSections = { left: newValue, front }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + front })
                                  }}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <Input
                                  id="mobile-l-booth-left-seats"
                                  type="number"
                                  min="0"
                                  value={selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)}
                                  onChange={(event) => {
                                    const value = Math.max(0, Number(event.target.value))
                                    const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                    const newSections: SeatSections = { left: value, front }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: value + front })
                                  }}
                                  className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                    const newValue = left + 1
                                    const newSections: SeatSections = { left: newValue, front }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + front })
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="mobile-l-booth-front-seats" className="text-xs text-muted-foreground">Front</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                    const newValue = Math.max(0, front - 1)
                                    const newSections: SeatSections = { left, front: newValue }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue })
                                  }}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <Input
                                  id="mobile-l-booth-front-seats"
                                  type="number"
                                  min="0"
                                  value={selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)}
                                  onChange={(event) => {
                                    const value = Math.max(0, Number(event.target.value))
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const newSections: SeatSections = { left, front: value }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + value })
                                  }}
                                  className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                    const newValue = front + 1
                                    const newSections: SeatSections = { left, front: newValue }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue })
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedTable.type === "u-booth" && (
                        <div className="space-y-2">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="mobile-u-booth-left-seats" className="text-xs text-muted-foreground">Left</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                    const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                    const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                    const newValue = Math.max(0, left - 1)
                                    const newSections: SeatSections = { left: newValue, front, right }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + front + right })
                                  }}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <Input
                                  id="mobile-u-booth-left-seats"
                                  type="number"
                                  min="0"
                                  value={selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)}
                                  onChange={(event) => {
                                    const value = Math.max(0, Number(event.target.value))
                                    const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                    const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                    const newSections: SeatSections = { left: value, front, right }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: value + front + right })
                                  }}
                                  className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                    const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                    const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                    const newValue = left + 1
                                    const newSections: SeatSections = { left: newValue, front, right }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + front + right })
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="mobile-u-booth-front-seats" className="text-xs text-muted-foreground">Front</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                    const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                    const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                    const newValue = Math.max(0, front - 1)
                                    const newSections: SeatSections = { left, front: newValue, right }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue + right })
                                  }}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <Input
                                  id="mobile-u-booth-front-seats"
                                  type="number"
                                  min="0"
                                  value={selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)}
                                  onChange={(event) => {
                                    const value = Math.max(0, Number(event.target.value))
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                    const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                    const newSections: SeatSections = { left, front: value, right }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + value + right })
                                  }}
                                  className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                    const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                    const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                    const newValue = front + 1
                                    const newSections: SeatSections = { left, front: newValue, right }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue + right })
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="mobile-u-booth-right-seats" className="text-xs text-muted-foreground">Right</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                    const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                    const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                    const newValue = Math.max(0, right - 1)
                                    const newSections: SeatSections = { left, front, right: newValue }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + front + newValue })
                                  }}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <Input
                                  id="mobile-u-booth-right-seats"
                                  type="number"
                                  min="0"
                                  value={selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)}
                                  onChange={(event) => {
                                    const value = Math.max(0, Number(event.target.value))
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                    const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                    const newSections: SeatSections = { left, front, right: value }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + front + value })
                                  }}
                                  className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                    const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                    const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                    const newValue = right + 1
                                    const newSections: SeatSections = { left, front, right: newValue }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + front + newValue })
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedTable.type === "corner-booth" && (
                        <div className="space-y-2">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="mobile-corner-booth-left-seats" className="text-xs text-muted-foreground">Left</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                    const newValue = Math.max(0, left - 1)
                                    const newSections: SeatSections = { left: newValue, back }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + back })
                                  }}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <Input
                                  id="mobile-corner-booth-left-seats"
                                  type="number"
                                  min="0"
                                  value={selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)}
                                  onChange={(event) => {
                                    const value = Math.max(0, Number(event.target.value))
                                    const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                    const newSections: SeatSections = { left: value, back }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: value + back })
                                  }}
                                  className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                    const newValue = left + 1
                                    const newSections: SeatSections = { left: newValue, back }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + back })
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="mobile-corner-booth-back-seats" className="text-xs text-muted-foreground">Back</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                    const newValue = Math.max(0, back - 1)
                                    const newSections: SeatSections = { left, back: newValue }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue })
                                  }}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <Input
                                  id="mobile-corner-booth-back-seats"
                                  type="number"
                                  min="0"
                                  value={selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)}
                                  onChange={(event) => {
                                    const value = Math.max(0, Number(event.target.value))
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const newSections: SeatSections = { left, back: value }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + value })
                                  }}
                                  className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                    const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                    const newValue = back + 1
                                    const newSections: SeatSections = { left, back: newValue }
                                    onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue })
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Total: {selectedTable.seats} {selectedTable.seats === 1 ? "seat" : "seats"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Seats</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              const newValue = Math.max(1, selectedTable.seats - 1)
                              onUpdateTable(selectedTable.id, { seats: newValue })
                            }}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
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
                            className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              onUpdateTable(selectedTable.id, { seats: selectedTable.seats + 1 })
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={selectedTable.status}
                          onValueChange={(value) =>
                            onUpdateTable(selectedTable.id, { status: value as FloorTableStatus })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
                  )}
                  {selectedTable.type === "bar" || selectedTable.type === "l-booth" || selectedTable.type === "u-booth" || selectedTable.type === "corner-booth" ? (
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={selectedTable.status}
                        onValueChange={(value) =>
                          onUpdateTable(selectedTable.id, { status: value as FloorTableStatus })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    Table size is automatically calculated based on the number of seats.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      setTableToDelete(selectedTable.id)
                      setShowDeleteDialog(true)
                      setMobileDetailsOpen(false)
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete Table
                  </Button>
                </div>
              </DrawerContent>
            )}
          </Drawer>
        </div>


        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Floor Map Layout?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset the floor map to the default layout. All current tables and their positions will be removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onResetLayout()
                  setShowResetDialog(false)
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Table Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Table?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedTable?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTableToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  if (tableToDelete) {
                    onRemoveTable(tableToDelete)
                    setTableToDelete(null)
                  }
                  setShowDeleteDialog(false)
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Desktop: Show accordion panels
  return (
    <div className="absolute left-4 top-4 z-20 flex flex-col gap-1.5 w-80 hidden md:flex">
      {/* Tables Panel */}
      <div className="bg-background border rounded-md shadow-lg overflow-hidden">
        <Button
          variant="ghost"
          onClick={handleTablesToggle}
          className="w-full justify-between h-9 px-3 rounded-none hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Menu className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">Tables</span>
          </div>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              isTablesOpen && "rotate-90"
            )}
          />
        </Button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isTablesOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="p-3 space-y-3 border-t">
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button ref={addTableButtonRef} className="flex-1" size="sm">
                    <PlusCircle className="mr-2 size-4" />
                    Add Table
                    <ChevronDown className="ml-2 size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  style={dropdownWidth ? { width: `${dropdownWidth}px` } : undefined}
                  className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
                >
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
                onClick={() => setShowResetDialog(true)}
              >
                <RefreshCcw className="mr-2 size-4" />
                Reset
              </Button>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <ul className="divide-y">
                {tables.map((table) => {
                  const TableIcon = table.type === "circle"
                    ? Circle
                    : table.type === "bar"
                    ? Minus
                    : table.type === "l-booth" || table.type === "u-booth" || table.type === "corner-booth"
                    ? Minus // Use Minus for booths for now
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
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <div className={cn(
        "bg-background border rounded-md shadow-lg overflow-hidden",
        !selectedTable && "opacity-50"
      )}>
        <Button
          variant="ghost"
          onClick={handleDetailsToggle}
          disabled={!selectedTable}
          className="w-full justify-between h-9 px-3 rounded-none hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">Table Details</span>
          </div>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              isDetailsOpen && selectedTable && "rotate-90"
            )}
          />
        </Button>
        {selectedTable && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              isDetailsOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="p-3 space-y-3 border-t">
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
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
              {/* Seat configuration - different for booths vs regular tables */}
              {selectedTable.type === "bar" || selectedTable.type === "l-booth" || selectedTable.type === "u-booth" || selectedTable.type === "corner-booth" ? (
                <div className="space-y-3">
                  <Label>Seat Sections</Label>
                  {selectedTable.type === "bar" && (
                    <div className="space-y-2">
                      <Label htmlFor="bar-front-seats" className="text-xs text-muted-foreground">Front</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            const current = selectedTable.seatSections?.front ?? selectedTable.seats
                            const newValue = Math.max(0, current - 1)
                            const newSections: SeatSections = { front: newValue }
                            const totalSeats = newValue
                            onUpdateTable(selectedTable.id, { seatSections: newSections, seats: totalSeats })
                          }}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <Input
                          id="bar-front-seats"
                          type="number"
                          min="0"
                          value={selectedTable.seatSections?.front ?? selectedTable.seats}
                          onChange={(event) => {
                            const value = Math.max(0, Number(event.target.value))
                            const newSections: SeatSections = { front: value }
                            onUpdateTable(selectedTable.id, { seatSections: newSections, seats: value })
                          }}
                          className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            const current = selectedTable.seatSections?.front ?? selectedTable.seats
                            const newValue = current + 1
                            const newSections: SeatSections = { front: newValue }
                            onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue })
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {selectedTable.type === "l-booth" && (
                    <div className="space-y-2">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="l-booth-left-seats" className="text-xs text-muted-foreground">Left</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                const newValue = Math.max(0, left - 1)
                                const newSections: SeatSections = { left: newValue, front }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + front })
                              }}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              id="l-booth-left-seats"
                              type="number"
                              min="0"
                              value={selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)}
                              onChange={(event) => {
                                const value = Math.max(0, Number(event.target.value))
                                const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                const newSections: SeatSections = { left: value, front }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: value + front })
                              }}
                              className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                const newValue = left + 1
                                const newSections: SeatSections = { left: newValue, front }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + front })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="l-booth-front-seats" className="text-xs text-muted-foreground">Front</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                const newValue = Math.max(0, front - 1)
                                const newSections: SeatSections = { left, front: newValue }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue })
                              }}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              id="l-booth-front-seats"
                              type="number"
                              min="0"
                              value={selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)}
                              onChange={(event) => {
                                const value = Math.max(0, Number(event.target.value))
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const newSections: SeatSections = { left, front: value }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + value })
                              }}
                              className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const front = selectedTable.seatSections?.front ?? Math.floor(selectedTable.seats / 2)
                                const newValue = front + 1
                                const newSections: SeatSections = { left, front: newValue }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedTable.type === "u-booth" && (
                    <div className="space-y-2">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="u-booth-left-seats" className="text-xs text-muted-foreground">Left</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                const newValue = Math.max(0, left - 1)
                                const newSections: SeatSections = { left: newValue, front, right }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + front + right })
                              }}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              id="u-booth-left-seats"
                              type="number"
                              min="0"
                              value={selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)}
                              onChange={(event) => {
                                const value = Math.max(0, Number(event.target.value))
                                const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                const newSections: SeatSections = { left: value, front, right }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: value + front + right })
                              }}
                              className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                const newValue = left + 1
                                const newSections: SeatSections = { left: newValue, front, right }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + front + right })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="u-booth-front-seats" className="text-xs text-muted-foreground">Front</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                const newValue = Math.max(0, front - 1)
                                const newSections: SeatSections = { left, front: newValue, right }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue + right })
                              }}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              id="u-booth-front-seats"
                              type="number"
                              min="0"
                              value={selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)}
                              onChange={(event) => {
                                const value = Math.max(0, Number(event.target.value))
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                const newSections: SeatSections = { left, front: value, right }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + value + right })
                              }}
                              className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                const newValue = front + 1
                                const newSections: SeatSections = { left, front: newValue, right }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue + right })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="u-booth-right-seats" className="text-xs text-muted-foreground">Right</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                const newValue = Math.max(0, right - 1)
                                const newSections: SeatSections = { left, front, right: newValue }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + front + newValue })
                              }}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              id="u-booth-right-seats"
                              type="number"
                              min="0"
                              value={selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)}
                              onChange={(event) => {
                                const value = Math.max(0, Number(event.target.value))
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                const newSections: SeatSections = { left, front, right: value }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + front + value })
                              }}
                              className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 3)
                                const front = selectedTable.seatSections?.front ?? Math.ceil(selectedTable.seats / 3)
                                const right = selectedTable.seatSections?.right ?? Math.floor(selectedTable.seats / 3)
                                const newValue = right + 1
                                const newSections: SeatSections = { left, front, right: newValue }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + front + newValue })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedTable.type === "corner-booth" && (
                    <div className="space-y-2">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="corner-booth-left-seats" className="text-xs text-muted-foreground">Left</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                const newValue = Math.max(0, left - 1)
                                const newSections: SeatSections = { left: newValue, back }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + back })
                              }}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              id="corner-booth-left-seats"
                              type="number"
                              min="0"
                              value={selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)}
                              onChange={(event) => {
                                const value = Math.max(0, Number(event.target.value))
                                const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                const newSections: SeatSections = { left: value, back }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: value + back })
                              }}
                              className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                const newValue = left + 1
                                const newSections: SeatSections = { left: newValue, back }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: newValue + back })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="corner-booth-back-seats" className="text-xs text-muted-foreground">Back</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                const newValue = Math.max(0, back - 1)
                                const newSections: SeatSections = { left, back: newValue }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue })
                              }}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              id="corner-booth-back-seats"
                              type="number"
                              min="0"
                              value={selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)}
                              onChange={(event) => {
                                const value = Math.max(0, Number(event.target.value))
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const newSections: SeatSections = { left, back: value }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + value })
                              }}
                              className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                const left = selectedTable.seatSections?.left ?? Math.ceil(selectedTable.seats / 2)
                                const back = selectedTable.seatSections?.back ?? Math.floor(selectedTable.seats / 2)
                                const newValue = back + 1
                                const newSections: SeatSections = { left, back: newValue }
                                onUpdateTable(selectedTable.id, { seatSections: newSections, seats: left + newValue })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Total: {selectedTable.seats} {selectedTable.seats === 1 ? "seat" : "seats"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Seats</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          const newValue = Math.max(1, selectedTable.seats - 1)
                          onUpdateTable(selectedTable.id, { seats: newValue })
                        }}
                      >
                        <MinusIcon className="h-4 w-4" />
                      </Button>
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
                        className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          onUpdateTable(selectedTable.id, { seats: selectedTable.seats + 1 })
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selectedTable.status}
                      onValueChange={(value) =>
                        onUpdateTable(selectedTable.id, { status: value as FloorTableStatus })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
              )}
              {selectedTable.type === "bar" || selectedTable.type === "l-booth" || selectedTable.type === "u-booth" || selectedTable.type === "corner-booth" ? (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selectedTable.status}
                    onValueChange={(value) =>
                      onUpdateTable(selectedTable.id, { status: value as FloorTableStatus })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
              ) : null}
              <p className="text-muted-foreground text-xs">
                Table size is automatically calculated based on the number of seats.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  setTableToDelete(selectedTable.id)
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete Table
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Floor Map Layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the floor map to the default layout. All current tables and their positions will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onResetLayout()
                setShowResetDialog(false)
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Table Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTable?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTableToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (tableToDelete) {
                  onRemoveTable(tableToDelete)
                  setTableToDelete(null)
                }
                setShowDeleteDialog(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

