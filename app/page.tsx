import Link from 'next/link'

export default function Home() {
  return <>
    <section className="hero">
      <div className="eyebrow">2026–2027 Season • November</div>
      <h1>Indoor Golf League</h1>
      <p>Current course: Sample Course • Week 1 of 4</p>
      <span className="pill">10 Stableford holes</span><span className="pill">Bonus Par 3s: #12 & #17</span>
    </section>
    <div className="grid">
      <section className="card"><h2>Monthly Leader</h2><div className="stat">Team 1</div><p className="muted">28.2 adjusted points</p><Link className="btn" href="/standings">View standings</Link></section>
      <section className="card"><h2>Cup Leader</h2><div className="stat">Team 3</div><p className="muted">1,000 Cup points</p><Link className="btn" href="/cup">View Cup</Link></section>
      <section className="card"><h2>This Month's Setup</h2><p>Elevation 2000 ft • Stimp 10 or 11 • 5 ft gimmies • No wind • Normal greens/fairways • Mulligans off</p><Link className="btn secondary" href="/setup">Full simulator setup</Link></section>
      <section className="card notice"><h2>League Announcement</h2><p><strong>Welcome to the new season.</strong></p><p className="muted">Admin announcements and push notifications will appear here.</p></section>
    </div>
    <div className="section-title"><h2>Quick access</h2></div>
    <div className="grid">
      <Link className="card" href="/standings"><h3>Monthly Standings</h3><p className="muted">Raw, bonus, handicap and adjusted totals.</p></Link>
      <Link className="card" href="/history"><h3>League History</h3><p className="muted">Past Cup champions and all-time monthly titles.</p></Link>
      <a className="card" href="https://www.laurelviewvillage.com/golfsimulator"><h3>Book The Sim</h3><p className="muted">Secondary menu link to the external booking page.</p></a>
    </div>
  </>
}
