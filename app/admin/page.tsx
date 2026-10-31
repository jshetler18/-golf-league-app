'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useAdminGuard} from './admin-shared'

const adminCards=[
{href:'/admin/accounts',icon:'👥',title:'Accounts',text:'Approve accounts and manage booking access.'},
{href:'/admin/messages',icon:'✉️',title:'Messages',text:'Send league and team announcements.'},
{href:'/admin/meeting-rsvp',icon:'✅',title:'Meeting Setup & RSVP',text:'Manage meetings and responses.'},
{href:'/admin/rules',icon:'📋',title:'Rules',text:'Update league rules.'},
{href:'/admin/teams',icon:'⛳',title:'Players & Teams',text:'Manage players, rosters and tee boxes.'},
{href:'/admin/league',icon:'🏆',title:'League Setup & Scoring',text:'Manage rounds, handicaps and standings.'},
{href:'/admin/score-submissions',icon:'📷',title:'Score Submissions',text:'Review and approve scorecards.'},
{href:'/admin/simulator/bookings',icon:'📅',title:'Simulator Bookings',text:'Manage reservations and blocked times.'}
]

export default function AdminPage(){
  const guard=useAdminGuard()
  const [waiting,setWaiting]=useState(false)
  useEffect(()=>{if(guard.ready)return;const timer=window.setTimeout(()=>setWaiting(true),7000);return()=>window.clearTimeout(timer)},[guard.ready])
  if(!guard.ready)return <div className="card" role="status"><h2>Opening Golf Admin…</h2><p>Checking your administrator access.</p>{waiting&&<><p>This is taking longer than expected. You can retry without closing the app.</p><button className="btn" onClick={()=>window.location.reload()}>Retry Admin</button></>}</div>
  if(!guard.admin)return <div className="card"><h2>Admin access unavailable</h2><p>We could not verify approved administrator access. If you just signed in, try again.</p><button className="btn" onClick={()=>window.location.reload()}>Retry Admin</button></div>
  return <div className="admin-dashboard-landing-v13134" aria-label="League administration home"><div className="admin-mobile-home-v13126"><section className="hero"><div className="eyebrow">Administration</div><h1>League Admin</h1><p>Choose the area you want to manage.</p></section><div className="admin-page-grid-v1237">{adminCards.map(card=><Link className="card admin-page-card-v1237" href={card.href} key={card.href}><span>{card.icon}</span><div><h2>{card.title}</h2><p>{card.text}</p></div><b>›</b></Link>)}</div></div></div>
}
