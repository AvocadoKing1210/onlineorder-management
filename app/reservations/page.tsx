"use client"

import { useMemo, useState, useCallback, type ReactNode } from "react"
import { format, addHours, startOfDay, endOfDay } from "date-fns"
import { FloorMapCanvas } from "@/components/floor-map/floor-map-canvas"
import { useReservationsDashboard } from "@/hooks/use-reservations-dashboard"
import type { FloorTable } from "@/hooks/use-floor-plan"
import { useIsMobile } from "@/hooks/use-mobile"
import type { TableReservation } from "@/lib/api/reservations"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { AlertCircle, CalendarClock, ChevronDown, RefreshCw, Users, CalendarIcon } from "lucide-react"
import type { ReservationFilters } from "@/lib/api/reservations"

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-700" },
  seated: { label: "Seated", className: "bg-sky-100 text-sky-700" },
  cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-700" },
  no_show: { label: "No Show", className: "bg-rose-100 text-rose-700" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
}

export default function ReservationsPage() {
  const {
    layouts,
    selectedLayoutId,
    setSelectedLayoutId,
    tables,
    reservations,
    loading,
    error,
    filters,
    setFilters,
    reservationStats,
    refreshData,
  } = useReservationsDashboard()
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  // Get selected date from filters
  const selectedDate = useMemo(() => {
    if (!filters.start) {
      return new Date()
    }
    return new Date(filters.start)
  }, [filters.start])

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return
      const newFilters: ReservationFilters = {
        start: startOfDay(date).toISOString(),
        end: endOfDay(date).toISOString(),
        statuses: filters.statuses,
      }
      setFilters(newFilters)
    },
    [filters.statuses, setFilters]
  )

  const handleSelectTable = useCallback((id: string | null) => {
    setSelectedTableId(id)
  }, [])

  const handlePositionChange = useCallback((_id: string, _x: number, _y: number) => {
    // Read-only canvas for reservations dashboard
  }, [])

  const canvasTables: FloorTable[] = useMemo(
    () =>
      tables.map((table) => ({
        id: table.id,
        name: table.display_name,
        seats: table.seat_count,
        status: table.state?.status ?? "available",
        tableNumber: table.table_number,
        type: table.type,
        seatSections: (table.seat_sections ?? undefined) as FloorTable["seatSections"],
        x: Number(table.x),
        y: Number(table.y),
        width: Number(table.width),
        height: Number(table.height),
        rotation: Number(table.rotation ?? 0),
      })),
    [tables],
  )

  const layout = layouts.find((item) => item.id === selectedLayoutId) || null
  const selectedTable = tables.find((table) => table.id === selectedTableId) || null

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
            <p className="text-muted-foreground">
              Monitor upcoming reservations layered on top of your published floor layouts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-between">
                  <span>{layout?.name ?? "Select Floor"}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[240px]">
                <DropdownMenuLabel>Floors</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {layouts.length === 0 ? (
                  <DropdownMenuItem disabled>No layouts available</DropdownMenuItem>
                ) : (
                  layouts.map((floor) => (
                    <DropdownMenuItem
                      key={floor.id}
                      className={cn(floor.id === selectedLayoutId && "bg-accent")}
                      onClick={() => {
                        setSelectedLayoutId(floor.id)
                        setSelectedTableId(null)
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{floor.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Level {floor.floor_level ?? 0}
                          {floor.active_version_id ? " • Published" : ""}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="sm" onClick={refreshData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 overflow-hidden px-6 py-6 lg:flex-row">
        <div className="flex w-full flex-col gap-6 lg:w-[360px]">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <OverviewStat label="Upcoming" value={reservationStats.total} icon={<CalendarClock className="h-4 w-4" />} />
              <OverviewStat label="Guests" value={reservationStats.covers} icon={<Users className="h-4 w-4" />} />
              <OverviewStat
                label="Confirmed"
                value={reservationStats.byStatus?.confirmed ?? 0}
                icon={<Badge className={statusStyles.confirmed.className}>{statusStyles.confirmed.label}</Badge>}
                isBadge
              />
              <OverviewStat
                label="Pending"
                value={reservationStats.byStatus?.pending ?? 0}
                icon={<Badge className={statusStyles.pending.className}>{statusStyles.pending.label}</Badge>}
                isBadge
              />
            </CardContent>
          </Card>

          <Card className="flex-1 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Reservations</CardTitle>
              {!loading && <span className="text-sm text-muted-foreground">{reservations.length} total</span>}
            </CardHeader>
            <CardContent className="h-full p-0">
              {loading ? (
                <div className="space-y-3 px-4 py-4">
                  {[...Array(4)].map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : reservations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
                  <CalendarClock className="h-5 w-5" />
                  No reservations for this window.
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <ul className="space-y-3 px-4 py-4">
                    {reservations.map((reservation) => (
                      <ReservationListItem
                        key={reservation.id}
                        reservation={reservation}
                        isSelected={selectedTableId === reservation.table_id}
                        onSelect={() => handleSelectTable(reservation.table_id)}
                      />
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-xl border bg-background">
          {error && (
            <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
          )}

          {!loading && canvasTables.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <CalendarClock className="h-6 w-6" />
              <p>No tables found for this layout.</p>
            </div>
          ) : (
            <FloorMapCanvas
              tables={canvasTables}
              selectedTableId={selectedTableId}
              onSelectTable={(id) => handleSelectTable(id)}
              onPositionChange={handlePositionChange}
              mobileDetailsOpen={false}
              isMobile={isMobile}
              readOnly={true}
            />
          )}
        </div>
      </main>

      {selectedTable && (
        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Selected table</p>
              <p className="font-medium">
                {selectedTable.display_name} • {selectedTable.seat_count} seats
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Status:</span>
              <Badge variant="secondary">{selectedTable.state?.status ?? "available"}</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReservationListItem({
  reservation,
  isSelected,
  onSelect,
}: {
  reservation: TableReservation
  isSelected: boolean
  onSelect: () => void
}) {
  const start = new Date(reservation.reservation_time)
  const duration = reservation.duration_hours ? Number(reservation.duration_hours) : 2
  const end = addHours(start, duration)
  const statusStyle = statusStyles[reservation.status] ?? statusStyles.confirmed

  return (
    <li
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-lg border p-3 transition hover:border-primary",
        isSelected && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">{reservation.customer_name}</p>
          <p className="text-xs text-muted-foreground">{reservation.table?.display_name ?? "Unassigned table"}</p>
        </div>
        <Badge className={statusStyle.className}>{statusStyle.label}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{format(start, "EEE • MMM d")}</span>
        <span>•</span>
        <span>
          {format(start, "p")} - {format(end, "p")}
        </span>
        <span>•</span>
        <span>{reservation.covers} guests</span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {reservation.contact_phone}
        {reservation.special_requests ? ` • ${reservation.special_requests}` : ""}
      </div>
    </li>
  )
}

function OverviewStat({
  label,
  value,
  icon,
  isBadge = false,
}: {
  label: string
  value: number
  icon: ReactNode
  isBadge?: boolean
}) {
  return (
    <div className="space-y-1 rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-xl font-semibold">{value}</span>
        {isBadge ? icon : <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  )
}

