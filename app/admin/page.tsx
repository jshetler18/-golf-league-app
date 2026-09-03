'use client'
import Link from 'next/link'
import {useAdminGuard,AdminDenied} from './admin-shared'

const cards=[
  {href:'/admin/accounts',icon:'👥',title:'Accounts',text:'Approve accounts, link players, and manage booking access.'},
  {href:'/admin/messages',icon:'✉️',title:'Messages',text:'Create formatted announcements for everyone or individual teams.'},
  {href:'/admin/rules',icon:'📋',title:'Rules',text:'Edit and format the Rules page players see in the app.'},
  {href:'/admin/teams',icon:'⛳',title:'Players & Teams',text:'Manage team names, rosters, players, and official tee boxes.'},
  {href:'/admin/league',icon:'🏆',title:'League Setup & Scoring',text:'Monthly setup, weekly scoring, Week 4 matchups, and Cup points.'},
  {href:'/admin/score-submissions',icon:'📷',title:'Score Submissions',text:'Review team scorecard photos, approve scores, and post completed rounds.'},
  {href:'/admin/simulator',icon:'🖥️',title:'Simulator',text:'See upcoming reservations and add league or blocked simulator time.'}
]
export default function AdminPage(){const guard=useAdminGuard();if(!guard.ready || !guard.admin)return <AdminDenied {...guard}/>;return <><section className="hero admin-hero-v1236"><div className="eyebrow">Administration</div><h1>League Admin</h1><p>Choose the area you want to manage.</p></section><div className="admin-page-grid-v1237">{cards.map(c=><Link className="card admin-page-card-v1237" href={c.href} key={c.href}><span>{c.icon}</span><div><h2>{c.title}</h2><p>{c.text}</p></div><b>›</b></Link>)}</div></>}
