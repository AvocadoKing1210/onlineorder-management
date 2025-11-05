'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isAuthenticated, logout } from '@/lib/auth'

export default function UnauthorizedPage() {
  const router = useRouter()

  useEffect(() => {
    isAuthenticated().then((ok) => {
      if (!ok) router.replace('/login')
    })
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-gray-600">
          Your account does not have permission to access this page.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => router.replace('/')}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 hover:bg-gray-50"
          >
            Go home
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white hover:opacity-90"
          >
            Switch account
          </button>
        </div>
      </div>
    </div>
  )
}


