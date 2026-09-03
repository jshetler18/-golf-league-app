'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { syncAppBadge } from '@/lib/appBadge'
import { HomeIcon, CalendarIcon, MessagesIcon, TeamsIcon } from '@/components/PlayerIcons'

export function PlayerMobileHeader({title}:{title:string}){
  const router=useRouter()
  const [profile,setProfile]=useState<any>(null)
  const [open,setOpen]=useState(false)
  const wrap=useRef<HTMLDivElement>(null)

  useEffect(()=>{
    ;(async()=>{
      const {data:{user}}=await supabase.auth.getUser()
      if(!user)return
      const {data:p}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).single()
      setProfile(p)
    })()
  },[])

  useEffect(()=>{
    const close=(e:MouseEvent)=>{
      if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)
    }
    document.addEventListener('mousedown',close)
    return()=>document.removeEventListener('mousedown',close)
  },[])

  function goBack(){
    if(window.history.length>1) router.back()
    else router.push('/')
  }

  async function logout(){
    await supabase.auth.signOut()
    location.href='/login'
  }

  return <header className="player-mobile-header">
    <button type="button" className="player-mobile-logo player-mobile-back" onClick={goBack} aria-label="Go back">
      <span className="player-mobile-back-arrow" aria-hidden="true">‹</span>
      <img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League" />
    </button>
    <div className="profile-wrap player-mobile-profile" ref={wrap}>
      <button className="profile-button" onClick={()=>setOpen(!open)} aria-label="Open profile menu">
        {profile?.avatar_url?<img src={profile.avatar_url} alt="Profile"/>:<span>👤</span>}
        <b>⌄</b>
      </button>
      {open&&<div className="profile-menu">
        <Link href="/submit-score">📷 Submit Score</Link><Link href="/profile">My Profile</Link>
        <Link href="/settings">Settings</Link>
        <button onClick={logout}>Log Out ↪</button>
      </div>}
    </div>
  </header>
}

export function PlayerMobileBottom(){
  const path=usePathname()
  const [unread,setUnread]=useState(0)
  const load=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setUnread(0);return}
    const [{data:a},{data:r}]=await Promise.all([
      supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
      supabase.from('announcement_reads').select('announcement_id').eq('user_id',user.id)
    ])
    const read=new Set((r||[]).map(x=>x.announcement_id))
    const messageUnread=(a||[]).filter(x=>!read.has(x.id)).length
    setUnread(messageUnread)
    syncAppBadge(messageUnread)
  },[])
  useEffect(()=>{
    load()
    const visible=()=>{if(document.visibilityState==='visible')load()}
    const timer=window.setInterval(load,15000)
    window.addEventListener('league-unread-changed',load)
    window.addEventListener('focus',load)
    document.addEventListener('visibilitychange',visible)
    const channel=supabase.channel(`bottom-announcements-live-${path}`).on('postgres_changes',{event:'*',schema:'public',table:'announcements'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'announcement_reads'},()=>load()).subscribe()
    return()=>{
      window.clearInterval(timer)
      window.removeEventListener('league-unread-changed',load)
      window.removeEventListener('focus',load)
      document.removeEventListener('visibilitychange',visible)
      supabase.removeChannel(channel)
    }
  },[path,load])
  return <nav className="player-mobile-bottom" aria-label="Player navigation">
    <Link className={path==='/'?'active':''} href="/"><span><HomeIcon /></span><b>Home</b></Link>
    <Link className={path==='/my-bookings'?'active':''} href="/my-bookings"><span><CalendarIcon /></span><b>Reservations</b></Link>
    <Link className={path==='/my-team'?'active':''} href="/my-team"><span><TeamsIcon /></span><b>My Team</b></Link>
    <Link className={`${path==='/messages'?'active':''} player-bottom-message`} href="/messages"><span><MessagesIcon /></span>{unread>0&&<i>{unread}</i>}<b>Messages</b></Link>
  </nav>
}

export function PlayerPage({title,children}:{title:string;children:ReactNode}){
  return <div className="player-page">
    <PlayerMobileHeader title={title}/>
    <div className="player-page-content">{children}</div>
    <PlayerMobileBottom/>
  </div>
}
