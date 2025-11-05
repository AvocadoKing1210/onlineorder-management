'use client'

import { createClient } from '@supabase/supabase-js'
import { createAuth0Client, type Auth0Client, type User } from '@auth0/auth0-spa-js'

let auth0Client: Auth0Client | null = null
let supabaseClient: ReturnType<typeof createClient> | null = null

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
    },
    cacheLocation: 'localstorage',
  })

  return auth0Client
}

export async function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const auth0 = await getAuth0Client()

  supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        try {
          const claims = await auth0.getIdTokenClaims()
          return (claims as any)?.__raw || ''
        } catch {
          return ''
        }
      },
    }
  )

  return supabaseClient
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


