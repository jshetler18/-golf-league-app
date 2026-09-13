'use client'

import { usePathname } from 'next/navigation'
import AuthNav from '@/components/AuthNav'
import DesktopAppHeader from '@/components/DesktopAppHeader'

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const isPublicRsvp = pathname.startsWith('/rsvp/')
  const isHome = pathname === '/'

  if (isPublicRsvp) {
    return <main className="page rsvp-standalone-page-v13101">{children}</main>
  }

  return (
    <>
      {!isHome&&<DesktopAppHeader />}
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
