'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getUserGroups } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { PreferencesProvider } from '@/lib/preferences-context'
import { LocaleProvider } from '@/lib/locale-context'

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const ok = await isAuthenticated()
      if (!mounted) return
      if (!ok) {
        router.replace('/login')
        return
      }
      const groups = await getUserGroups()
      const allowed = groups.includes('Admin') || groups.includes('Business Owner')
      if (!allowed) {
        router.replace('/unauthorized')
        return
      }
      setReady(true)
    })()
    return () => {
      mounted = false
    }
  }, [router])

  if (!ready) return null
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PreferencesProvider>
        <LocaleProvider>
          {children}
          <Toaster />
        </LocaleProvider>
      </PreferencesProvider>
    </ThemeProvider>
  )
}


