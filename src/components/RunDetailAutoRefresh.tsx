'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function RunDetailAutoRefresh({ isRunning }: { isRunning: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(id)
  }, [isRunning, router])

  return null
}
