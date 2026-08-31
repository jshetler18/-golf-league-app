import Link from 'next/link'

export default function Home(){
 return <>
  <section className="hero"><div className="eyebrow">Laurel View Village</div><h1>Tom Krise 19th Hole Golf Simulator</h1><p>Simulator reservations and indoor golf league information in one place.</p><div className="hero-actions"><Link className="btn light" href="/book">Book the Sim</Link><Link className="btn ghost" href="/standings">League Standings</Link></div></section>
  <div className="grid"><Link className="card clickable" href="/book"><h2>Book the Sim</h2><p>View open times and reserve 1–3 hours. League team reservations are labeled on the calendar.</p></Link><Link className="card clickable" href="/my-bookings"><h2>My Bookings</h2><p>See your upcoming reservations and cancel if your plans change.</p></Link><Link className="card clickable" href="/cup"><h2>19th Hole Cup</h2><p>Follow monthly Cup points and the season-long championship race.</p></Link><Link className="card clickable" href="/setup"><h2>Round Setup</h2><p>Course, simulator settings, bonus par-3 holes, and monthly tee assignments.</p></Link></div>
  <section className="card notice home-note"><h2>Booking rules</h2><p>Open every day from <strong>7:00 AM to 9:00 PM</strong>. Book in 1-hour increments, up to <strong>3 hours per day</strong>, and up to <strong>30 days ahead</strong>. New accounts require admin approval before booking.</p></section>
 </>
}
