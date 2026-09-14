'use client'
import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'
import {useAdminGuard,AdminDenied} from './admin-shared'

const cards=[
  {href:'/admin/accounts',icon:'👥',title:'Accounts',text:'Approve accounts, link players, and manage booking access.'},
  {href:'/admin/messages',icon:'✉️',title:'Messages',text:'Create formatted announcements for everyone or individual teams.'},
  {href:'/admin/meeting-rsvp',icon:'✅',title:"Meeting Setup & RSVP's",text:'Create meeting RSVP links and track responses.'},
  {href:'/admin/rules',icon:'📋',title:'Rules',text:'Edit and format the Rules page players see in the app.'},
  {href:'/admin/teams',icon:'⛳',title:'Players & Teams',text:'Manage team names, rosters, players, and official tee boxes.'},
  {href:'/admin/league',icon:'🏆',title:'League Setup & Scoring',text:'Monthly setup, weekly scoring, Week 4 matchups, and Cup points.'},
  {href:'/admin/score-submissions',icon:'📷',title:'Score Submissions',text:'Review scorecards, approve scores, and post completed rounds.'},
  {href:'/admin/simulator',icon:'📅',title:'Simulator Bookings',text:'Manage reservations and league or blocked simulator time.'}
]

const allowed=new Set(['accounts','messages','meeting-rsvp','rules','teams','league','score-submissions','simulator'])

export default function AdminPage(){
  const guard=useAdminGuard()
  const [panel,setPanel]=useState('')
  const frameRef=useRef<HTMLDivElement>(null)
  const iframeRef=useRef<HTMLIFrameElement>(null)
  const resizeObserverRef=useRef<ResizeObserver|null>(null)
  const [frameHeight,setFrameHeight]=useState(760)
  const active=allowed.has(panel)?panel:''

  useEffect(()=>{
    const sync=()=>setPanel(new URLSearchParams(window.location.search).get('panel')||'')
    sync(); window.addEventListener('popstate',sync); return()=>window.removeEventListener('popstate',sync)
  },[])

  useEffect(()=>{
    if(active) requestAnimationFrame(()=>frameRef.current?.scrollIntoView({behavior:'smooth',block:'start'}))
  },[active])

  useEffect(()=>()=>resizeObserverRef.current?.disconnect(),[])

  const syncEmbeddedHeight=()=>{
    const frame=iframeRef.current
    const doc=frame?.contentDocument
    if(!frame||!doc)return
    doc.documentElement.style.overflow='hidden'
    if(doc.body)doc.body.style.overflow='hidden'
    resizeObserverRef.current?.disconnect()
    const measure=()=>{
      const body=doc.body, root=doc.documentElement
      const height=Math.max(body?.scrollHeight||0,body?.offsetHeight||0,root?.scrollHeight||0,root?.offsetHeight||0,760)
      setFrameHeight(height+8)
    }
    measure()
    const observer=new ResizeObserver(measure)
    if(doc.body)observer.observe(doc.body)
    observer.observe(doc.documentElement)
    resizeObserverRef.current=observer
    window.setTimeout(measure,50)
    window.setTimeout(measure,250)
  }

  if(!guard.ready || !guard.admin)return <AdminDenied {...guard}/>
  return <div className="admin-dashboard-workspace-v13126">
    <div className="admin-mobile-home-v13126"><section className="hero"><div className="eyebrow">Administration</div><h1>League Admin</h1><p>Choose the area you want to manage.</p></section><div className="admin-page-grid-v1237">{cards.map(c=><Link className="card admin-page-card-v1237" href={c.href} key={c.href}><span>{c.icon}</span><div><h2>{c.title}</h2><p>{c.text}</p></div><b>›</b></Link>)}</div></div>
    {active&&<section ref={frameRef} className="admin-embedded-panel-v13126" aria-label="Selected administration page">
      <iframe ref={iframeRef} key={active} src={`/admin/${active}?embed=1`} title={`${active} administration`} scrolling="no" onLoad={syncEmbeddedHeight} style={{height:`${frameHeight}px`}} />
    </section>}
  </div>
}
