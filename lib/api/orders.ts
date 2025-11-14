'use client'

import { getSupabaseClient, getUserId as getAuthUserId } from '@/lib/auth'
import { withTokenRefresh } from '@/lib/api-utils'

export interface Order {
  id: string
  user_id: string
  mode: 'dine_in' | 'takeout' | 'delivery' | 'view_only'
  status: 'created' | 'submitted' | 'accepted' | 'in_progress' | 'ready' | 'completed' | 'cancelled_by_user' | 'cancelled_by_store'
  subtotal: string // NUMERIC(12, 2) returns as string
  tax_amount: string
  fees_amount: string
  tip_amount: string
  total_amount: string
  dining_table_id?: string | null
  estimated_preparation_minutes?: number | null
  estimated_arrival_at?: string | null
  submitted_at?: string | null
  accepted_at?: string | null
  completed_at?: string | null
  special_instructions?: string | null
  idempotency_key?: string | null
  created_at: string
  updated_at: string
  // Joined data
  item_count?: number
  user_profile?: {
    name?: string
    email?: string
  } | null
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  item_name: string
  item_description?: string | null
  unit_price: string // NUMERIC(12, 2) returns as string
  quantity: number
  line_total: string // NUMERIC(12, 2) returns as string
  notes?: string | null
  created_at: string
  updated_at: string
  // Joined data
  modifiers?: OrderItemModifier[]
}

export interface OrderItemModifier {
  id: string
  order_item_id: string
  modifier_option_id: string
  modifier_group_name: string
  modifier_option_name: string
  price_delta: string // NUMERIC(12, 2) returns as string
  created_at: string
  updated_at: string
}

export interface OrderStatusEvent {
  id: string
  order_id: string
  status: string
  actor_type: 'system' | 'staff' | 'user'
  actor_id?: string | null
  message?: string | null
  created_at: string
}

export interface OrderFilters {
  status?: Order['status'] | 'all'
  mode?: Order['mode'] | 'all'
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: 'submitted_at' | 'created_at' | 'total_amount' | 'status'
  sort_order?: 'asc' | 'desc'
}

export interface UpdateOrderStatusData {
  status: Order['status']
  message?: string
  estimated_preparation_minutes?: number
  estimated_arrival_at?: string
}

export interface OrderWithDetails extends Order {
  items: OrderItem[]
  status_events: OrderStatusEvent[]
}

/**
 * Fetch all orders with optional filters
 * Includes item count and user profile information via joins
 */
export async function getOrders(
  filters?: OrderFilters
): Promise<Order[]> {
  return await withTokenRefresh(async () => {
    const supabase = await getSupabaseClient()
    
    // Build query - we'll count items separately
    let query = supabase
      .from('order')
      .select('*')
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.mode && filters.mode !== 'all') {
      query = query.eq('mode', filters.mode)
    }

    if (filters?.date_from) {
      query = query.gte('submitted_at', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('submitted_at', filters.date_to)
    }

    if (filters?.search) {
      query = query.or(
        `id.ilike.%${filters.search}%,user_id.ilike.%${filters.search}%`
      )
    }

    // Apply sorting
    if (filters?.sort_by) {
      const ascending = filters.sort_order === 'asc'
      if (filters.sort_by === 'submitted_at') {
        query = query.order('submitted_at', { ascending, nullsFirst: false })
      } else if (filters.sort_by === 'created_at') {
        query = query.order('created_at', { ascending })
      } else if (filters.sort_by === 'total_amount') {
        query = query.order('total_amount', { ascending })
      } else if (filters.sort_by === 'status') {
        query = query.order('status', { ascending })
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`)
    }

    // Transform the data and fetch item counts and user profiles
    const orders = (data || []) as Order[]
    const orderIds = orders.map(o => o.id)
    const userIds = [...new Set(orders.map(o => o.user_id))]

    // Fetch item counts for all orders
    const itemCounts = new Map<string, number>()
    if (orderIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('order_item')
        .select('order_id')
        .in('order_id', orderIds)

      if (itemsData) {
        itemsData.forEach((item: any) => {
          const count = itemCounts.get(item.order_id) || 0
          itemCounts.set(item.order_id, count + 1)
        })
      }
    }

    // Fetch user profiles for all unique user_ids
    const profileMap = new Map<string, { name?: string; email?: string }>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profile')
        .select('id, display_name, email')
        .in('id', userIds)

      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap.set(p.id, {
            name: p.display_name || undefined,
            email: p.email || undefined,
          })
        })
      }
    }

    // Combine all data
    return orders.map(order => ({
      ...order,
      item_count: itemCounts.get(order.id) || 0,
      user_profile: profileMap.get(order.user_id) || null,
    }))
  })
}

/**
 * Fetch a single order by ID with full details
 * Includes items, modifiers, and status events
 */
export async function getOrderById(
  id: string
): Promise<OrderWithDetails | null> {
  return await withTokenRefresh(async () => {
    const supabase = await getSupabaseClient()
    
    // Fetch order
    const { data: orderData, error: orderError } = await supabase
      .from('order')
      .select('*')
      .eq('id', id)
      .single()

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch order: ${orderError.message}`)
    }

    if (!orderData) {
      return null
    }

    // Fetch order items
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_item')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })

    if (itemsError) {
      throw new Error(`Failed to fetch order items: ${itemsError.message}`)
    }

    // Fetch modifiers for each item
    const items: OrderItem[] = []
    if (itemsData) {
      for (const item of itemsData) {
        const { data: modifiersData, error: modifiersError } = await supabase
          .from('order_item_modifier')
          .select('*')
          .eq('order_item_id', item.id)
          .order('created_at', { ascending: true })

        if (modifiersError) {
          throw new Error(`Failed to fetch modifiers: ${modifiersError.message}`)
        }

        items.push({
          ...item,
          modifiers: (modifiersData || []) as OrderItemModifier[],
        })
      }
    }

    // Fetch status events
    const { data: eventsData, error: eventsError } = await supabase
      .from('order_status_event')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })

    if (eventsError) {
      throw new Error(`Failed to fetch status events: ${eventsError.message}`)
    }

    // Fetch user profile
    let userProfile = null
    if (orderData.user_id) {
      const { data: profileData } = await supabase
        .from('user_profile')
        .select('display_name, email')
        .eq('id', orderData.user_id)
        .single()
      
      if (profileData) {
        userProfile = {
          name: profileData.display_name || undefined,
          email: profileData.email || undefined,
        }
      }
    }

    return {
      ...orderData,
      user_profile: userProfile,
      items,
      status_events: (eventsData || []) as OrderStatusEvent[],
    } as OrderWithDetails
  })
}

/**
 * Update order status
 * Business Owner/Admin only
 * Creates a status event record automatically via database trigger
 */
export async function updateOrderStatus(
  id: string,
  data: UpdateOrderStatusData
): Promise<Order> {
  return await withTokenRefresh(async () => {
    const supabase = await getSupabaseClient()

    const updatePayload: any = {
      status: data.status,
    }

    // Update status-specific timestamps
    if (data.status === 'accepted') {
      updatePayload.accepted_at = new Date().toISOString()
    } else if (data.status === 'completed') {
      updatePayload.completed_at = new Date().toISOString()
    }

    // Update estimated times if provided
    if (data.estimated_preparation_minutes !== undefined) {
      updatePayload.estimated_preparation_minutes = data.estimated_preparation_minutes
    }

    if (data.estimated_arrival_at !== undefined) {
      updatePayload.estimated_arrival_at = data.estimated_arrival_at
    }

    const { data: order, error } = await supabase
      .from('order')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`)
    }

    if (!order) {
      throw new Error('Failed to update order status: No data returned')
    }

    // Create status event if message is provided
    // Note: The database trigger should create the event automatically, but we can add a message
    if (data.message) {
      const userId = await getUserId()
      await supabase
        .from('order_status_event')
        .insert({
          order_id: id,
          status: data.status,
          actor_type: 'staff',
          actor_id: userId || null,
          message: data.message,
        })
    }

    return order as Order
  })
}

/**
 * Update order estimated preparation time
 * Business Owner/Admin only
 * Updates only the estimated_preparation_minutes without changing status
 */
export async function updateOrderEstimatedTime(
  id: string,
  estimated_preparation_minutes: number
): Promise<Order> {
  return await withTokenRefresh(async () => {
    const supabase = await getSupabaseClient()

    // Update only the estimated_preparation_minutes, status remains unchanged
    const { data: order, error } = await supabase
      .from('order')
      .update({
        estimated_preparation_minutes,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update order estimated time: ${error.message}`)
    }

    if (!order) {
      throw new Error('Failed to update order estimated time: No data returned')
    }

    return order as Order
  })
}

/**
 * Cancel an order
 * Business Owner/Admin only
 */
export async function cancelOrder(
  id: string,
  reason?: string
): Promise<Order> {
  return await withTokenRefresh(async () => {
    const supabase = await getSupabaseClient()

    const { data: order, error } = await supabase
      .from('order')
      .update({
        status: 'cancelled_by_store',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to cancel order: ${error.message}`)
    }

    if (!order) {
      throw new Error('Failed to cancel order: No data returned')
    }

    // Create status event with cancellation reason
    const userId = await getUserId()
    await supabase
      .from('order_status_event')
      .insert({
        order_id: id,
        status: 'cancelled_by_store',
        actor_type: 'staff',
        actor_id: userId || null,
        message: reason || 'Order cancelled by store',
      })

    return order as Order
  })
}

/**
 * Get status event history for an order
 */
export async function getOrderStatusHistory(
  id: string
): Promise<OrderStatusEvent[]> {
  return await withTokenRefresh(async () => {
    const supabase = await getSupabaseClient()
    
    const { data, error } = await supabase
      .from('order_status_event')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch status history: ${error.message}`)
    }

    return (data || []) as OrderStatusEvent[]
  })
}

/**
 * Helper function to get current user ID (Auth0 user ID from JWT)
 */
async function getUserId(): Promise<string | null> {
  return await getAuthUserId()
}

