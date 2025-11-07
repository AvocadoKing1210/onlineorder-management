'use client'

import { getSupabaseClient } from '@/lib/auth'

export interface Notification {
  id: string
  title: string
  body: string
  audience: 'all_customers' | 'recent_purchasers'
  published_at: string
  expiry_at?: string | null
  created_at: string
  updated_at: string
}

export type NotificationStatus = 'active' | 'inactive' | 'expired' | 'upcoming'

export interface NotificationFilters {
  audience?: 'all_customers' | 'recent_purchasers'
  status?: NotificationStatus
  active_only?: boolean
  search?: string
}

export interface CreateNotificationData {
  title: string
  body: string
  audience: 'all_customers' | 'recent_purchasers'
  published_at: string
  expiry_at?: string | null
}

export interface UpdateNotificationData {
  title?: string
  body?: string
  audience?: 'all_customers' | 'recent_purchasers'
  published_at?: string
  expiry_at?: string | null
}

/**
 * Check if a notification is currently active
 */
export function isNotificationActive(notification: Notification): boolean {
  const now = new Date()
  const publishedAt = new Date(notification.published_at)
  const expiryAt = notification.expiry_at ? new Date(notification.expiry_at) : null
  
  return publishedAt <= now && (!expiryAt || expiryAt > now)
}

/**
 * Get the status of a notification
 */
export function getNotificationStatus(notification: Notification): NotificationStatus {
  const now = new Date()
  const publishedAt = new Date(notification.published_at)
  const expiryAt = notification.expiry_at ? new Date(notification.expiry_at) : null
  
  if (expiryAt && expiryAt < now) {
    return 'expired'
  }
  if (publishedAt > now) {
    return 'upcoming'
  }
  if (publishedAt <= now && (!expiryAt || expiryAt > now)) {
    return 'active'
  }
  return 'inactive'
}

/**
 * Fetch all notifications with optional filters
 */
export async function getNotifications(
  filters?: NotificationFilters
): Promise<Notification[]> {
  const supabase = await getSupabaseClient()
  
  let query = supabase
    .from('notification')
    .select('*')
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.audience) {
    query = query.eq('audience', filters.audience)
  }

  if (filters?.active_only) {
    const now = new Date().toISOString()
    query = query
      .lte('published_at', now)
      .or(`expiry_at.is.null,expiry_at.gt.${now}`)
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,body.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`)
  }

  // Apply status filter in memory if provided
  let result = data || []
  if (filters?.status) {
    result = result.filter((n) => getNotificationStatus(n) === filters.status)
  }

  return result as Notification[]
}

/**
 * Fetch a single notification by ID
 */
export async function getNotificationById(
  id: string
): Promise<Notification | null> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from('notification')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch notification: ${error.message}`)
  }

  return data as Notification
}

/**
 * Fetch currently active notifications (for customer-facing use)
 */
export async function getActiveNotifications(
  audience?: 'all_customers' | 'recent_purchasers'
): Promise<Notification[]> {
  const supabase = await getSupabaseClient()
  const now = new Date().toISOString()
  
  let query = supabase
    .from('notification')
    .select('*')
    .lte('published_at', now)
    .or(`expiry_at.is.null,expiry_at.gt.${now}`)
    .order('published_at', { ascending: false })

  if (audience) {
    query = query.eq('audience', audience)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch active notifications: ${error.message}`)
  }

  return (data || []) as Notification[]
}

/**
 * Create a new notification
 */
export async function createNotification(
  data: CreateNotificationData
): Promise<Notification> {
  const supabase = await getSupabaseClient()

  const payload: any = {
    title: data.title.trim(),
    body: data.body.trim(),
    audience: data.audience,
    published_at: data.published_at,
    expiry_at: data.expiry_at || null,
  }

  const { data: notification, error } = await supabase
    .from('notification')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`)
  }

  if (!notification) {
    throw new Error('Failed to create notification: No data returned')
  }

  return notification
}

/**
 * Update a notification
 */
export async function updateNotification(
  id: string,
  data: UpdateNotificationData
): Promise<Notification> {
  const supabase = await getSupabaseClient()

  const payload: any = {}

  if (data.title !== undefined) {
    payload.title = data.title.trim()
  }
  if (data.body !== undefined) {
    payload.body = data.body.trim()
  }
  if (data.audience !== undefined) {
    payload.audience = data.audience
  }
  if (data.published_at !== undefined) {
    payload.published_at = data.published_at
  }
  if (data.expiry_at !== undefined) {
    payload.expiry_at = data.expiry_at || null
  }

  const { data: notification, error } = await supabase
    .from('notification')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update notification: ${error.message}`)
  }

  if (!notification) {
    throw new Error('Failed to update notification: No data returned')
  }

  return notification
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<void> {
  const supabase = await getSupabaseClient()

  const { error } = await supabase
    .from('notification')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete notification: ${error.message}`)
  }
}

