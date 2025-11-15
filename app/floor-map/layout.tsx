'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getUserGroups } from '@/lib/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { ThemeProvider } from 'next-themes'
import { PreferencesProvider } from '@/lib/preferences-context'
import { LocaleProvider } from '@/lib/locale-context'
import { Toaster } from '@/components/ui/sonner'

export default function FloorMapLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
          <SidebarProvider
            defaultOpen={false}
            style={
              {
                '--sidebar-width': 'calc(var(--spacing) * 72)',
                '--header-height': 'calc(var(--spacing) * 16)',
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset>
              <SiteHeader />
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col">
                  {children}
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </LocaleProvider>
      </PreferencesProvider>
    </ThemeProvider>
  )
}

