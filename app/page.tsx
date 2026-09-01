'use client'
import Link from 'next/link'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {ComponentType, SVGProps} from 'react'
import {supabase} from '@/lib/supabase'
import {ReserveIcon,CalendarIcon,StandingsIcon,TrophyIcon,MatchPlayIcon,MessagesIcon,FlagIcon,TeamsIcon,RulesIcon,HomeIcon} from '@/components/PlayerIcons'

type MenuItem={href:string;Icon:ComponentType<SVGProps<SVGSVGElement>>;title:string;desc:string}
const items:MenuItem[]=[
 {href:'/book',Icon:ReserveIcon,title:'Reserve Sim',desc:'Check availability and reserve simulator time'},
 {href:'/my-bookings',Icon:CalendarIcon,title:'My Sim Reservations',desc:'View and manage your simulator reservations'},
 {href:'/standings',Icon:StandingsIcon,title:'Monthly Standings',desc:'View monthly standings and team rankings'},
 {href:'/cup',Icon:TrophyIcon,title:'Cup Standings',desc:'View Cup Points and monthly totals'},
 {href:'/cup#match-play',Icon:MatchPlayIcon,title:'Match Play',desc:'View your Week 4 matchups and results'},
 {href:'/messages',Icon:MessagesIcon,title:'Messages',desc:'Read league messages and announcements'},
 {href:'/results',Icon:FlagIcon,title:'Results',desc:'View past results and round history'},
 {href:'/teams',Icon:TeamsIcon,title:'Teams',desc:'View league teams and players'},
 {href:'/rules',Icon:RulesIcon,title:'Rules',desc:'View league rules and point system'}
]
export default function Home(){
 const [profile,setProfile]=useState<any>(null),[open,setOpen]=useState(false),[unread,setUnread]=useState(0); const wrap=useRef<HTMLDivElement>(null)
 const loadPlayer=useCallback(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setProfile(null);setUnread(0);return}; const [{data:p},{data:a},{data:r}]=await Promise.all([supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).single(),supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),supabase.from('announcement_reads').select('announcement_id').eq('user_id',user.id)]);setProfile(p); const read=new Set((r||[]).map(x=>x.announcement_id));setUnread((a||[]).filter(x=>!read.has(x.id)).length)},[])
 useEffect(()=>{loadPlayer(); const refresh=()=>loadPlayer(); const visible=()=>{if(document.visibilityState==='visible')loadPlayer()}; const timer=window.setInterval(loadPlayer,15000); window.addEventListener('focus',refresh); window.addEventListener('league-unread-changed',refresh); document.addEventListener('visibilitychange',visible); const channel=supabase.channel('home-announcements-live').on('postgres_changes',{event:'*',schema:'public',table:'announcements'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'announcement_reads'},refresh).subscribe(); return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('league-unread-changed',refresh);document.removeEventListener('visibilitychange',visible);supabase.removeChannel(channel)}},[loadPlayer])
 useEffect(()=>{const fn=(e:MouseEvent)=>{if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn)},[])
 async function logout(){await supabase.auth.signOut();location.href='/login'}
 return <div className="mobile-home">
  <section className="mobile-brand"><img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League"/><div className="profile-wrap" ref={wrap}><button className="profile-button" onClick={()=>setOpen(!open)} aria-label="Open profile menu">{profile?.avatar_url?<img src={profile.avatar_url} alt="Profile"/>:<span>👤</span>}<b>⌄</b></button>{open&&<div className="profile-menu"><Link href="/profile">My Profile</Link><Link href="/settings">Settings</Link><button onClick={logout}>Log Out ↪</button></div>}</div></section>
  <nav className="mobile-menu">{items.map(({href,Icon,title,desc})=><Link href={href} className="mobile-menu-row" key={title}><span className="menu-icon"><Icon /></span><span className="menu-copy"><strong>{title}</strong><small>{desc}</small></span>{title==='Messages'&&unread>0&&<span className="unread-badge">{unread}</span>}<span className="menu-arrow">›</span></Link>)}</nav>
  <Bottom unread={unread}/>
 </div>
}
function Bottom({unread}:{unread:number}){return <nav className="mobile-bottom"><Link className="active" href="/"><span><HomeIcon /></span><b>Home</b></Link><Link href="/my-bookings"><span><CalendarIcon /></span><b>My Sim Reservations</b></Link><Link href="/messages" className="bottom-message"><span><MessagesIcon /></span>{unread>0&&<i>{unread}</i>}<b>Messages</b></Link></nav>}
