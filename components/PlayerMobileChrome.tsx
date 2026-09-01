'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { HomeIcon, CalendarIcon, MessagesIcon } from '@/components/PlayerIcons'

export function PlayerMobileHeader({title}:{title:string}){
  return <header className="player-mobile-header">
    <Link href="/" className="player-mobile-logo" aria-label="Golf League Home">
      <img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League" />
    </Link>
    <div className="player-mobile-title">{title}</div>
  </header>
}

export function PlayerMobileBottom(){
  const path=usePathname()
  const [unread,setUnread]=useState(0)
  useEffect(()=>{
    const load=async()=>{
      const {data:{user}}=await supabase.auth.getUser()
      if(!user){setUnread(0);return}
      const {data:a}=await supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      const {data:r}=await supabase.from('announcement_reads').select('announcement_id').eq('user_id',user.id)
      const read=new Set((r||[]).map(x=>x.announcement_id))
      setUnread((a||[]).filter(x=>!read.has(x.id)).length)
    }
    load()
    window.addEventListener('league-unread-changed',load)
    return()=>window.removeEventListener('league-unread-changed',load)
  },[path])
  return <nav className="player-mobile-bottom" aria-label="Player navigation">
    <Link className={path==='/'?'active':''} href="/"><span><HomeIcon /></span><b>Home</b></Link>
    <Link className={path==='/my-bookings'?'active':''} href="/my-bookings"><span><CalendarIcon /></span><b>My Bookings</b></Link>
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
