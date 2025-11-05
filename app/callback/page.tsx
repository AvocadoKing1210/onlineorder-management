'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth0Client } from '@/lib/auth'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const auth0 = await getAuth0Client()
        await auth0.handleRedirectCallback()
        router.push('/')
      } catch (error) {
        console.error('Error handling callback:', error)
        router.push('/?error=callback')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing login...</h1>
        <p className="text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  )
}


