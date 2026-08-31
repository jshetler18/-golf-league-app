import './globals.css'
import AuthNav from '@/components/AuthNav'

export const metadata = {
  title: 'Tom Krise 19th Hole Golf Simulator',
  description: 'Golf simulator bookings, indoor league standings, Cup, history, and setup'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div>
            <div className="eyebrow">Tom Krise 19th Hole</div>
            <strong>Golf Simulator</strong>
          </div>
          <AuthNav />
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  )
}
