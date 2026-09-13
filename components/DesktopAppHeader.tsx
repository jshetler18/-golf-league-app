'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const adminLinks=[
  {href:'/admin/accounts',title:'Accounts'},
  {href:'/admin/messages',title:'Messages'},
  {href:'/admin/meeting-rsvp',title:'League Meeting RSVP'},
  {href:'/admin/rules',title:'Rules'},
  {href:'/admin/teams',title:'Players & Teams'},
  {href:'/admin/league',title:'League Setup & Scoring'},
  {href:'/admin/score-submissions',title:'Score Submissions'},
  {href:'/admin/simulator',title:'Simulator'}
]

export default function DesktopAppHeader(){
  const pathname=usePathname()||''
  const isAdminHome=pathname==='/admin'
  const [profile,setProfile]=useState<any>(null)
  const [open,setOpen]=useState(false)
  const wrap=useRef<HTMLDivElement>(null)

  useEffect(()=>{
    let active=true
    ;(async()=>{
      const {data:{user}}=await supabase.auth.getUser()
      if(!active||!user)return
      const {data:p}=await supabase.from('profiles').select('full_name,avatar_url,is_scorecard_official,role,status').eq('id',user.id).maybeSingle()
      if(active)setProfile(p)
    })()
    return()=>{active=false}
  },[])

  useEffect(()=>{
    const close=(e:MouseEvent)=>{
      if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)
    }
    document.addEventListener('mousedown',close)
    return()=>document.removeEventListener('mousedown',close)
  },[])

  async function logout(){
    await supabase.auth.signOut()
    location.href='/login'
  }

  return <header className={`desktop-home-header-v13113${isAdminHome?' admin-home-unified-v13121':''}`}>
    <div className="desktop-home-mainrow-v13121">
      <Link href="/" className="desktop-home-logo-v13113" aria-label="Golf Sim home">
        <img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League"/>
      </Link>
      <div className="profile-wrap desktop-home-profile-v13113" ref={wrap}>
      <button className="profile-button" onClick={()=>setOpen(!open)} aria-label="Open profile menu">
        {profile?.avatar_url?<img src={profile.avatar_url} alt="Profile"/>:<span>👤</span>}
        <b>⌄</b>
      </button>
        {open&&<div className="profile-menu">
          <Link href="/submit-score">Submit Score</Link>
          {(profile?.status==='approved'&&(profile?.is_scorecard_official||profile?.role==='admin'))&&<Link href="/scorecard-official">Scorecard Admin</Link>}
          <Link href="/profile">My Profile</Link>
          <Link href="/settings">Settings</Link>
          <button onClick={logout}>Log Out ↪</button>
        </div>}
      </div>
    </div>
    {isAdminHome&&<div className="admin-header-content-v13121">
      <div className="eyebrow">Administration</div>
      <h1>League Admin</h1>
      <p>Choose the area you want to manage.</p>
      <nav className="admin-header-links-v13121" aria-label="League administration">
        {adminLinks.map(item=><Link href={item.href} key={item.href}>{item.title}</Link>)}
      </nav>
    </div>}
  </header>
}
