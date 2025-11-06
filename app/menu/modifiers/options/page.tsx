'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ModifierOptionsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/menu/modifiers')
  }, [router])
  
  return null
}
