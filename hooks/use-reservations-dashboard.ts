"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { FloorLayout } from "@/lib/api/floor-map"
import { getFloorLayouts } from "@/lib/api/floor-map"
import {
  getDiningTablesWithState,
  getReservationsForLayout,
  type DiningTable,
  type TableReservation,
  type ReservationFilters,
  type ReservationStatus,
} from "@/lib/api/reservations"

const ACTIVE_STATUSES: ReservationStatus[] = ["pending", "confirmed", "seated"]

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function useReservationsDashboard() {
  const [layouts, setLayouts] = useState<FloorLayout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null)
  const [tables, setTables] = useState<DiningTable[]>([])
  const [reservations, setReservations] = useState<TableReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReservationFilters>(() => {
    const start = startOfDay(new Date())
    const end = endOfDay(new Date())
    return { start: start.toISOString(), end: end.toISOString(), statuses: ACTIVE_STATUSES }
  })

  // Load layouts
  useEffect(() => {
    async function loadLayouts() {
      try {
        const data = await getFloorLayouts()
        setLayouts(data)
        if (!selectedLayoutId && data.length > 0) {
          const preferred = data.find((layout) => layout.is_default) ?? data[0]
          setSelectedLayoutId(preferred.id)
        }
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : "Failed to load layouts")
      }
    }

    loadLayouts()
  }, [selectedLayoutId])


  const refreshData = useCallback(async () => {
    if (!selectedLayoutId) return
    setLoading(true)
    setError(null)

    try {
      const [tablesData, reservationsData] = await Promise.all([
        getDiningTablesWithState(selectedLayoutId),
        getReservationsForLayout(selectedLayoutId, filters),
      ])
      setTables(tablesData)
      setReservations(reservationsData)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to load reservations")
    } finally {
      setLoading(false)
    }
  }, [selectedLayoutId, filters])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const reservationStats = useMemo(() => {
    const totals = reservations.reduce(
      (acc, reservation) => {
        acc.total += 1
        acc.byStatus[reservation.status] = (acc.byStatus[reservation.status] ?? 0) + 1
        acc.covers += reservation.covers
        return acc
      },
      {
        total: 0,
        covers: 0,
        byStatus: {} as Record<string, number>,
      },
    )

    return totals
  }, [reservations])

  return {
    layouts,
    selectedLayoutId,
    setSelectedLayoutId,
    tables,
    reservations,
    loading,
    error,
    filters,
    setFilters,
    refreshData,
    reservationStats,
  }
}

