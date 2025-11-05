'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, login } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    isAuthenticated().then((ok) => {
      if (ok) router.replace('/dashboard')
    })
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-gray-600">Access the management dashboard</p>
        <button
          onClick={login}
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white hover:opacity-90"
        >
          Continue with Auth0
        </button>
      </div>
    </div>
  )
}


