'use client'

import { usePathname } from 'next/navigation'
import AuthNav from '@/components/AuthNav'

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const isPublicRsvp = pathname.startsWith('/rsvp/')

  if (isPublicRsvp) {
    return <main className="page rsvp-standalone-page-v13101">{children}</main>
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">Tom Krise 19th Hole</div>
          <strong>Golf League</strong>
        </div>
        <AuthNav />
      </header>
      <main className="page">{children}</main>
    </>
  )
}
