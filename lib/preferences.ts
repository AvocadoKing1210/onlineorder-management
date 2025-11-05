'use client'

import { getSupabaseClient } from './auth'
import { getUserId } from './auth'

export type ManagementPreference = {
  user_id: string
  theme: 'light' | 'dark' | 'system'
  preferred_locale: string
  sidebar_collapsed: boolean
  notifications_enabled: boolean
  user_guide_completed: boolean
  layout?: Record<string, any>
  last_seen_at?: string
  created_at?: string
  updated_at?: string
}

const DEFAULT_PREFERENCES: Omit<ManagementPreference, 'user_id'> = {
  theme: 'system',
  preferred_locale: 'en',
  sidebar_collapsed: false,
  notifications_enabled: true,
  user_guide_completed: false,
}

export async function getManagementPreferences(): Promise<ManagementPreference | null> {
  try {
    const userId = await getUserId()
    if (!userId) return null

    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('management_preference')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found, return defaults
        return {
          user_id: userId,
          ...DEFAULT_PREFERENCES,
        }
      }
      console.error('Error fetching preferences:', error)
      return null
    }

    return data as ManagementPreference
  } catch (error) {
    console.error('Error getting preferences:', error)
    return null
  }
}

export async function saveManagementPreferences(
  preferences: Partial<Omit<ManagementPreference, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  try {
    const userId = await getUserId()
    if (!userId) return false

    const supabase = await getSupabaseClient()
    const { error } = await supabase
      .from('management_preference')
      .upsert(
        {
          user_id: userId,
          ...preferences,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      console.error('Error saving preferences:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving preferences:', error)
    return false
  }
}

