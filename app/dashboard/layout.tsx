'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    isAuthenticated().then((ok) => {
      if (!mounted) return
      if (!ok) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })
    return () => {
      mounted = false
    }
  }, [router])

  if (!ready) return null
  return <>{children}</>
}


