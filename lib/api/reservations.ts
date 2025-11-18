'use client'

import { getSupabaseClient } from '@/lib/auth'
import type { FloorTableType, FloorTableStatus } from '@/lib/api/floor-map'

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show' | 'completed'

export interface DiningTableState {
  status: FloorTableStatus
  covers: number | null
  current_order_id: string | null
  server_user_id: string | null
  host_note: string | null
  expected_turn_time: string | null
  status_updated_at: string
}

export interface DiningTable {
  id: string
  layout_id: string
  zone_id: string | null
  blueprint_id: string | null
  table_number: string
  display_name: string
  type: FloorTableType
  seat_count: number
  seat_sections: Record<string, any> | null
  x: number
  y: number
  rotation: number | null
  width: number
  height: number
  shape: Record<string, any> | null
  qr_code_uuid: string | null
  is_active: boolean
  out_of_service_reason: string | null
  created_at: string
  updated_at: string
  state?: DiningTableState | null
}

export interface TableReservation {
  id: string
  table_id: string
  reservation_time: string
  duration_hours: number | null
  covers: number
  customer_name: string
  contact_phone: string
  contact_email: string | null
  special_requests: string | null
  status: ReservationStatus
  idempotency_key: string | null
  confirmed_at: string | null
  seated_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  table?: DiningTable | null
}

export interface ReservationFilters {
  start?: string
  end?: string
  statuses?: ReservationStatus[]
}

const tableSelect =
  'id, layout_id, zone_id, blueprint_id, table_number, display_name, type, seat_count, seat_sections, x, y, rotation, width, height, shape, qr_code_uuid, is_active, out_of_service_reason, created_at, updated_at, state:dining_table_state(table_id, status, covers, current_order_id, server_user_id, host_note, expected_turn_time, status_updated_at)'

export async function getDiningTablesWithState(layoutId: string): Promise<DiningTable[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('dining_table')
    .select(tableSelect)
    .eq('layout_id', layoutId)
    .eq('is_active', true)
    .order('table_number', { ascending: true })

  if (error) {
    console.error('Error fetching dining tables:', error)
    throw new Error(`Failed to fetch dining tables: ${error.message}`)
  }

  return (data || []).map((row) => ({
    ...row,
    x: Number(row.x),
    y: Number(row.y),
    width: Number(row.width),
    height: Number(row.height),
    rotation: row.rotation !== null ? Number(row.rotation) : null,
  }))
}

export async function getReservationsForLayout(
  layoutId: string,
  filters: ReservationFilters = {},
): Promise<TableReservation[]> {
  const supabase = await getSupabaseClient()

  let query = supabase
    .from('table_reservation')
    .select(
      `*, table:table_id!inner(
        ${tableSelect}
      )`,
    )
    .eq('table.layout_id', layoutId)
    .order('reservation_time', { ascending: true })

  if (filters.start) {
    query = query.gte('reservation_time', filters.start)
  }

  if (filters.end) {
    query = query.lte('reservation_time', filters.end)
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching reservations:', error)
    throw new Error(`Failed to fetch reservations: ${error.message}`)
  }

  return (data || []).map((row: any) => ({
    ...row,
    table: row.table
      ? {
          ...row.table,
          x: Number(row.table.x),
          y: Number(row.table.y),
          width: Number(row.table.width),
          height: Number(row.table.height),
          rotation: row.table.rotation !== null ? Number(row.table.rotation) : null,
        }
      : null,
  }))
}

