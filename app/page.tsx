'use client'
import Link from 'next/link'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {ComponentType, SVGProps} from 'react'
import {supabase} from '@/lib/supabase'
import {syncAppBadge} from '@/lib/appBadge'
import {ReserveIcon,CalendarIcon,StandingsIcon,TrophyIcon,MessagesIcon,ChatIcon,TeamsIcon,HistoryIcon,RulesIcon,HomeIcon,LiveIcon} from '@/components/PlayerIcons'

type MenuItem={href:string;Icon:ComponentType<SVGProps<SVGSVGElement>>;title:string}
const items:MenuItem[]=[
 {href:'/book',Icon:ReserveIcon,title:'Reserve Sim'},
 {href:'/my-bookings',Icon:CalendarIcon,title:'My Sim Reservations'},
 {href:'/results',Icon:StandingsIcon,title:'Monthly Standings'},
 {href:'/cup',Icon:TrophyIcon,title:'Cup Standings'},
 {href:'/live',Icon:LiveIcon,title:'Recorded Rounds'},
 {href:'/messages',Icon:MessagesIcon,title:'Messages'},
 {href:'/chat',Icon:ChatIcon,title:'League Chat'},
 {href:'/teams',Icon:TeamsIcon,title:'Teams'},
 {href:'/history',Icon:HistoryIcon,title:'History'},
 {href:'/rules',Icon:RulesIcon,title:'Rules'}
]
export default function Home(){
 const [profile,setProfile]=useState<any>(null),[open,setOpen]=useState(false),[unread,setUnread]=useState(0),[chatUnread,setChatUnread]=useState(0),[youtubeLive,setYoutubeLive]=useState<any>(null); const wrap=useRef<HTMLDivElement>(null)
 const loadPlayer=useCallback(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setProfile(null);setUnread(0);setChatUnread(0);return}; const [{data:p},{data:a},{data:r}]=await Promise.all([supabase.from('profiles').select('full_name,avatar_url,player_id').eq('id',user.id).single(),supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),supabase.from('announcement_reads').select('announcement_id').eq('user_id',user.id)]);setProfile(p); const read=new Set((r||[]).map(x=>x.announcement_id));const messageUnread=(a||[]).filter(x=>!read.has(x.id)).length;setUnread(messageUnread);syncAppBadge(messageUnread); const {data:state}=await supabase.from('chat_read_state').select('last_seen_at').eq('user_id',user.id).maybeSingle(); const since=state?.last_seen_at||'1970-01-01T00:00:00Z'; const {data:chat}=await supabase.from('chat_posts').select('id,user_id').gt('created_at',since).neq('user_id',user.id); setChatUnread((chat||[]).length);
},[])
 useEffect(()=>{loadPlayer(); const refresh=()=>loadPlayer(); const visible=()=>{if(document.visibilityState==='visible')loadPlayer()}; const timer=window.setInterval(loadPlayer,15000); window.addEventListener('focus',refresh); window.addEventListener('league-unread-changed',refresh); window.addEventListener('chat-unread-changed',refresh); document.addEventListener('visibilitychange',visible); const channel=supabase.channel('home-announcements-live').on('postgres_changes',{event:'*',schema:'public',table:'announcements'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'announcement_reads'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'chat_posts'},refresh).subscribe(); return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('league-unread-changed',refresh);window.removeEventListener('chat-unread-changed',refresh);document.removeEventListener('visibilitychange',visible);supabase.removeChannel(channel)}},[loadPlayer])
 useEffect(()=>{const fn=(e:MouseEvent)=>{if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn)},[])
 useEffect(()=>{let alive=true;const check=async()=>{try{const r=await fetch('/api/youtube/live',{cache:'no-store'});const j=await r.json();if(alive)setYoutubeLive(j?.isLive?j:null)}catch{}};check();const timer=window.setInterval(check,60000);return()=>{alive=false;window.clearInterval(timer)}},[])
 async function logout(){await supabase.auth.signOut();location.href='/login'}
 return <div className="mobile-home">
  <section className="mobile-brand"><img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League"/><div className="profile-wrap" ref={wrap}><button className="profile-button" onClick={()=>setOpen(!open)} aria-label="Open profile menu">{profile?.avatar_url?<img src={profile.avatar_url} alt="Profile"/>:<span>👤</span>}<b>⌄</b></button>{open&&<div className="profile-menu"><Link href="/submit-score">Submit Score</Link><Link href="/profile">My Profile</Link><Link href="/settings">Settings</Link><button onClick={logout}>Log Out ↪</button></div>}</div></section>
  {youtubeLive&&<Link href="/live" className="home-live-alert-v1263" aria-label="Watch live round"><span className="home-live-orb-v1263"><i/>LIVE</span><span className="home-live-copy-v1263"><strong>{youtubeLive.liveHeadline||'A League Round is now LIVE!'}</strong><small>{youtubeLive.liveSubtext||'Tap to watch'}</small></span><span className="home-live-arrow-v1263">›</span></Link>}
  <nav className="mobile-menu">{items.map(({href,Icon,title})=><Link href={href} className="mobile-menu-row" key={title}><span className="menu-icon"><Icon /></span><span className="menu-copy"><span className="menu-title">{title}</span></span>{title==='Messages'&&unread>0&&<span className="unread-badge">{unread}</span>}{title==='League Chat'&&chatUnread>0&&<span className="unread-badge">{chatUnread}</span>}{title==='Recorded Rounds'&&!!youtubeLive&&<span className="live-home-badge-v1260"><i/>LIVE</span>}<span className="menu-arrow">›</span></Link>)}</nav>
  <Bottom unread={unread}/>
 </div>
}
function Bottom({unread}:{unread:number}){return <nav className="mobile-bottom"><Link className="active" href="/"><span><HomeIcon /></span><b>Home</b></Link><Link href="/my-bookings"><span><CalendarIcon /></span><b>Reservations</b></Link><Link href="/my-team"><span><TeamsIcon /></span><b>My Team</b></Link><Link href="/messages" className="bottom-message"><span><MessagesIcon /></span>{unread>0&&<i>{unread}</i>}<b>Messages</b></Link></nav>}
