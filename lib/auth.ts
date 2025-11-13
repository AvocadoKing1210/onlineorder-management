'use client'

import { createClient } from '@supabase/supabase-js'
import { createAuth0Client, type Auth0Client, type User } from '@auth0/auth0-spa-js'

let auth0Client: Auth0Client | null = null

export async function getAuth0Client(): Promise<Auth0Client> {
  if (auth0Client) {
    return auth0Client
  }

  auth0Client = await createAuth0Client({
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
    authorizationParams: {
      redirect_uri:
        typeof window !== 'undefined'
          ? window.location.origin + '/callback'
          : process.env.NEXT_PUBLIC_AUTH0_CALLBACK_URL || 'http://localhost:3000/callback',
      // Enable refresh tokens for automatic token renewal
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE, // Optional: if using API audience
    },
    cacheLocation: 'localstorage',
    // Enable automatic token refresh
    useRefreshTokens: true,
  })

  return auth0Client
}

export async function getSupabaseClient() {
  // Always create a fresh client to ensure we use the latest token retrieval logic
  // This ensures token refresh works correctly
  const auth0 = await getAuth0Client()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        try {
          // Use getTokenSilently() first - this automatically refreshes expired tokens
          // when useRefreshTokens: true is set in the Auth0 client config
          await auth0.getTokenSilently()
          
          // Get the ID token (not access token) - Supabase expects ID token JWT
          // The ID token is a standard JWT with 3 parts (header.payload.signature)
          const claims = await auth0.getIdTokenClaims()
          const token = (claims as any)?.__raw
          
          if (!token) {
            console.warn('No ID token available')
            return ''
          }
          
          // Verify it's a valid JWT format (3 parts separated by dots)
          const parts = token.split('.')
          if (parts.length !== 3) {
            console.error(`Invalid JWT format: expected 3 parts, got ${parts.length}`)
            return ''
          }
          
          return token
        } catch (error) {
          console.error('Error getting Auth0 ID token:', error)
          // Try to refresh token and retry
          try {
            await auth0.getTokenSilently({ cacheMode: 'off' }) // Force refresh
            const claims = await auth0.getIdTokenClaims()
            return (claims as any)?.__raw || ''
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError)
            return ''
          }
        }
      },
    }
  )
}

export async function login() {
  const auth0 = await getAuth0Client()
  await auth0.loginWithRedirect()
}

export async function logout() {
  const auth0 = await getAuth0Client()
  await auth0.logout({
    logoutParams: {
      returnTo: typeof window !== 'undefined' ? window.location.origin : '/',
    },
  })
}

export async function getUser(): Promise<User | null> {
  try {
    const auth0 = await getAuth0Client()
    const u = await auth0.getUser()
    return u ?? null
  } catch {
    return null
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const auth0 = await getAuth0Client()
    return await auth0.isAuthenticated()
  } catch {
    return false
  }
}

export async function getJWTClaims(): Promise<any> {
  try {
    const auth0 = await getAuth0Client()
    // Use getTokenSilently() to ensure we have a valid token, then get claims
    // This automatically refreshes expired tokens
    await auth0.getTokenSilently()
    const claims = await auth0.getIdTokenClaims()
    return claims || null
  } catch {
    return null
  }
}

export async function getUserGroups(): Promise<string[]> {
  try {
    const claims = await getJWTClaims()
    return (claims?.user_group as string[]) || []
  } catch {
    return []
  }
}

export type AppUserProfile = {
  name: string
  email: string
  avatar: string
  groups: string[]
}

export async function getAppUserProfile(): Promise<AppUserProfile | null> {
  const u = await getUser()
  if (!u) return null
  const claims = await getJWTClaims()
  const groups = ((claims?.user_group as string[]) || []).filter(Boolean)
  return {
    name: u.name || u.nickname || u.email || 'User',
    email: u.email || '',
    avatar: (u.picture as string) || '',
    groups,
  }
}

export async function getUserId(): Promise<string | null> {
  try {
    const user = await getUser()
    return user?.sub || null
  } catch {
    return null
  }
}

/**
 * Refresh the Auth0 token explicitly
 * This is useful for proactive token refresh or when you want to ensure
 * a fresh token before making API calls. The token will be automatically
 * refreshed when needed via getTokenSilently(), but this can be called
 * to refresh it ahead of time.
 * 
 * @returns The refreshed token, or null if refresh fails
 */
export async function refreshToken(): Promise<string | null> {
  try {
    const auth0 = await getAuth0Client()
    const token = await auth0.getTokenSilently()
    return token || null
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

