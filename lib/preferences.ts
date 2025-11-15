'use client'

import { getSupabaseClient } from './auth'
import { getUserId } from './auth'
import { withTokenRefresh } from './api-utils'

/**
 * Check if a Supabase error is a JWT expiration error
 */
function isJWTExpiredError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code?.toLowerCase() || ''
  
  return (
    errorMessage.includes('jwt expired') ||
    errorMessage.includes('token expired') ||
    errorMessage.includes('expired token') ||
    errorCode === 'pgrst301' || // Supabase JWT expired error code
    errorCode === 'invalid_jwt' ||
    errorMessage.includes('invalid token')
  )
}

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
    const userId = await getUserId()
    if (!userId) return null

  return await withTokenRefresh(async () => {
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
      
      // If it's a JWT error, throw it so withTokenRefresh can handle it
      if (isJWTExpiredError(error)) {
        throw error
      }
      
      // For other errors, log and return null
      console.error('Error fetching preferences:', error)
      return null
    }

    return data as ManagementPreference
  })
}

export async function saveManagementPreferences(
  preferences: Partial<Omit<ManagementPreference, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
    const userId = await getUserId()
    if (!userId) return false

  return await withTokenRefresh(async () => {
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
      // If it's a JWT error, throw it so withTokenRefresh can handle it
      if (isJWTExpiredError(error)) {
        throw error
      }
      
      // For other errors, log and return false
      console.error('Error saving preferences:', error)
      return false
    }

    return true
  })
}

