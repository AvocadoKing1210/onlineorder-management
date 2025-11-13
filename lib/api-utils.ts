'use client'

import { getSupabaseClient, refreshToken, getAuth0Client } from '@/lib/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Check if an error is a JWT expiration error
 */
function isJWTExpiredError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code?.toLowerCase() || ''
  
  // Check for common JWT expiration indicators
  return (
    errorMessage.includes('jwt expired') ||
    errorMessage.includes('token expired') ||
    errorMessage.includes('expired token') ||
    errorCode === 'pgrst301' || // Supabase JWT expired error code
    errorCode === 'invalid_jwt' ||
    errorMessage.includes('invalid token')
  )
}

/**
 * Force refresh the Auth0 token by calling getTokenSilently with cacheMode: 'off'
 * This ensures we get a fresh token even if one is cached
 */
async function forceTokenRefresh(): Promise<boolean> {
  try {
    const auth0 = await getAuth0Client()
    // Force refresh by bypassing cache
    await auth0.getTokenSilently({ cacheMode: 'off' })
    return true
  } catch (error) {
    console.error('Failed to force token refresh:', error)
    return false
  }
}

/**
 * Wraps a Supabase operation with automatic token refresh on JWT expiration
 * 
 * @param operation A function that performs a Supabase operation
 * @param maxRetries Maximum number of retry attempts (default: 1)
 * @returns The result of the operation
 * 
 * @example
 * ```ts
 * const result = await withTokenRefresh(async () => {
 *   const supabase = await getSupabaseClient()
 *   return await supabase.from('order').select('*')
 * })
 * ```
 */
export async function withTokenRefresh<T>(
  operation: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let lastError: any = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If this is a retry, force refresh the token first
      if (attempt > 0) {
        console.log('JWT expired, refreshing token...')
        const refreshed = await forceTokenRefresh()
        if (!refreshed) {
          // Fallback to regular refresh
          const fallbackRefreshed = await refreshToken()
          if (!fallbackRefreshed) {
            throw new Error('Failed to refresh token. Please log in again.')
          }
        }
        console.log('Token refreshed successfully, retrying operation...')
        // Small delay to ensure token is propagated
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Execute the operation
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a JWT expiration error and we have retries left
      if (isJWTExpiredError(error) && attempt < maxRetries) {
        // Continue to retry
        continue
      }
      
      // If it's not a JWT error or we're out of retries, throw the error
      throw error
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Operation failed after retries')
}

/**
 * Helper to create a fresh Supabase client after token refresh
 * This ensures the client uses the newly refreshed token
 */
export async function getFreshSupabaseClient(): Promise<SupabaseClient> {
  // Force token refresh first
  await refreshToken()
  // Get a fresh client (which will use the refreshed token)
  return await getSupabaseClient()
}

