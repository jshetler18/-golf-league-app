'use client'
import Link from 'next/link'
import {useEffect,useRef,useState} from 'react'
import {supabase} from '@/lib/supabase'

const items=[
 ['/my-bookings','▦','My Bookings','View and manage your simulator bookings'],
 ['/standings','▥','Monthly Standings','View monthly standings and team rankings'],
 ['/cup','♛','Cup Standings','View Cup Points and monthly totals'],
 ['/cup#match-play','⌁','Match Play','View your Week 4 matchups and results'],
 ['/messages','●●●','Messages','Read league messages and announcements'],
 ['/results','⚑','Results','View past results and round history'],
 ['/teams','●●','Teams','View league teams and players'],
 ['/rules','▤','Rules','View league rules and point system']
]
export default function Home(){
 const [profile,setProfile]=useState<any>(null),[open,setOpen]=useState(false),[unread,setUnread]=useState(0); const wrap=useRef<HTMLDivElement>(null)
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return; const {data:p}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).single();setProfile(p); const {data:a}=await supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`); const {data:r}=await supabase.from('announcement_reads').select('announcement_id').eq('user_id',user.id); const read=new Set((r||[]).map(x=>x.announcement_id));setUnread((a||[]).filter(x=>!read.has(x.id)).length)})()},[])
 useEffect(()=>{const fn=(e:MouseEvent)=>{if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn)},[])
 async function logout(){await supabase.auth.signOut();location.href='/login'}
 return <div className="mobile-home">
  <section className="mobile-brand"><img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League"/><div className="profile-wrap" ref={wrap}><button className="profile-button" onClick={()=>setOpen(!open)} aria-label="Open profile menu">{profile?.avatar_url?<img src={profile.avatar_url} alt="Profile"/>:<span>👤</span>}<b>⌄</b></button>{open&&<div className="profile-menu"><Link href="/profile">My Profile</Link><Link href="/settings">Settings</Link><button onClick={logout}>Log Out ↪</button></div>}</div></section>
  <nav className="mobile-menu">{items.map(([href,icon,title,desc])=><Link href={href} className="mobile-menu-row" key={title}><span className="menu-icon">{icon}</span><span className="menu-copy"><strong>{title}</strong><small>{desc}</small></span>{title==='Messages'&&unread>0&&<span className="unread-badge">{unread}</span>}<span className="menu-arrow">›</span></Link>)}</nav>
  <Bottom unread={unread}/>
 </div>
}
function Bottom({unread}:{unread:number}){return <nav className="mobile-bottom"><Link className="active" href="/"><span>⌂</span><b>Home</b></Link><Link href="/my-bookings"><span>▦</span><b>My Bookings</b></Link><Link href="/messages" className="bottom-message"><span>●●●</span>{unread>0&&<i>{unread}</i>}<b>Messages</b></Link></nav>}
