import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'Indoor Golf League',
  description: 'Indoor golf league standings, Cup, history, and simulator setup'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div>
            <div className="eyebrow">Indoor Golf League</div>
            <strong>League Central</strong>
          </div>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/standings">Standings</Link>
            <Link href="/cup">Cup</Link>
            <Link href="/setup">Setup</Link>
            <Link href="/history">History</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  )
}
