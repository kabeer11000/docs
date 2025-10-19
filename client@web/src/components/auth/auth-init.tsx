'use client'

import { useEffect } from 'react'
import { authManager } from '@/lib/auth/manager'

export function AuthInit() {
  useEffect(() => {
    authManager.init()
    return () => authManager.cleanup()
  }, [])
  
  return null
}