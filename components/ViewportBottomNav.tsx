'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Keep the golf app's existing bottom navigation outside scrollable page
 * containers, so CSS position:fixed is always relative to the viewport.
 */
export default function ViewportBottomNav({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
