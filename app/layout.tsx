import './globals.css'
import AuthNav from '@/components/AuthNav'

export const metadata = {
  title: 'Tom Krise 19th Hole Golf League',
  description: 'Golf league standings, results, messages, and simulator bookings',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '19th Hole'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div>
            <div className="eyebrow">Tom Krise 19th Hole</div>
            <strong>Golf League</strong>
          </div>
          <AuthNav />
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  )
}
