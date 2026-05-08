'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function RunsAutoRefresh({ hasRunning }: { hasRunning: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!hasRunning) return
    const id = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(id)
  }, [hasRunning, router])

  return null
}
