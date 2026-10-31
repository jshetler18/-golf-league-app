'use client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {ComponentType, SVGProps} from 'react'
import {supabase} from '@/lib/supabase'
import {syncAppBadge} from '@/lib/appBadge'
import ViewportBottomNav from '@/components/ViewportBottomNav'
import {CalendarIcon,StandingsIcon,TrophyIcon,MessagesIcon,TeamsIcon,HistoryIcon,RulesIcon,HomeIcon,LiveIcon} from '@/components/PlayerIcons'

type MenuItem={href:string;Icon:ComponentType<SVGProps<SVGSVGElement>>;title:string}
const items:MenuItem[]=[
 {href:'/my-bookings',Icon:CalendarIcon,title:'Sim Reservations'},
 {href:'/results',Icon:StandingsIcon,title:'Monthly Standings'},
 {href:'/cup',Icon:TrophyIcon,title:'Cup Standings'},
 {href:'/live',Icon:LiveIcon,title:'Recorded Rounds'},
 {href:'/messages',Icon:MessagesIcon,title:'Messages'},
 {href:'/teams',Icon:TeamsIcon,title:'Teams & Handicaps'},
 {href:'/rules',Icon:RulesIcon,title:'Rules & Settings'},
 {href:'/history',Icon:HistoryIcon,title:'History'}
]
export default function Home(){
 const router=useRouter()
 const [authReady,setAuthReady]=useState(false)
 const [profileError,setProfileError]=useState('')
 const [profile,setProfile]=useState<any>(null),[open,setOpen]=useState(false),[unread,setUnread]=useState(0),[chatUnread,setChatUnread]=useState(0),[pendingScorecards,setPendingScorecards]=useState(0),[pendingAccounts,setPendingAccounts]=useState(0),[youtubeLive,setYoutubeLive]=useState<any>(null); const wrap=useRef<HTMLDivElement>(null)
 const loadPlayer=useCallback(async()=>{const {data:{user},error:authError}=await supabase.auth.getUser();if(authError && (!user || /auth session missing/i.test(authError.message))){setProfile(null);setProfileError('');setAuthReady(true);router.replace('/login');return}if(authError){setProfileError(authError.message);setAuthReady(true);return}if(!user){setProfile(null);setUnread(0);setChatUnread(0);setAuthReady(true);router.replace('/login');return}; const [{data:p,error:pError},{data:a},{data:r}]=await Promise.all([supabase.from('profiles').select('full_name,avatar_url,player_id,is_scorecard_official,is_account_approver,role,status,access_type').eq('id',user.id).single(),supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),supabase.from('announcement_reads').select('announcement_id').eq('user_id',user.id)]);if(pError||!p){setProfileError(pError?.message||'Your account profile could not be loaded.');setAuthReady(true);return}setProfileError('');setProfile(p);
 if(p?.status==='approved'&&(p?.is_scorecard_official||p?.role==='admin')){
   const {count}=await supabase.from('round_score_submissions').select('id',{count:'exact',head:true}).eq('status','pending');
   setPendingScorecards(count||0)
 }else setPendingScorecards(0);
 if(p?.status==='approved'&&(p?.is_account_approver||p?.role==='admin')){
   try{const {data:{session}}=await supabase.auth.getSession();if(session?.access_token){const ar=await fetch('/api/account-review',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});const aj=await ar.json().catch(()=>({}));setPendingAccounts(ar.ok?Number(aj.count||0):0)}else setPendingAccounts(0)}catch{setPendingAccounts(0)}
 }else setPendingAccounts(0);
 setAuthReady(true); const read=new Set((r||[]).map(x=>x.announcement_id));const messageUnread=(a||[]).filter(x=>!read.has(x.id)).length;setUnread(messageUnread);syncAppBadge(messageUnread); const {data:state}=await supabase.from('chat_read_state').select('last_seen_at').eq('user_id',user.id).maybeSingle(); const since=state?.last_seen_at||'1970-01-01T00:00:00Z'; const {data:chat}=await supabase.from('chat_posts').select('id,user_id').gt('created_at',since).neq('user_id',user.id); setChatUnread((chat||[]).length);
},[router])
 useEffect(()=>{loadPlayer(); const refresh=()=>loadPlayer(); const visible=()=>{if(document.visibilityState==='visible')loadPlayer()}; const timer=window.setInterval(loadPlayer,15000); window.addEventListener('focus',refresh); window.addEventListener('league-unread-changed',refresh); window.addEventListener('chat-unread-changed',refresh); document.addEventListener('visibilitychange',visible); const channel=supabase.channel('home-announcements-live').on('postgres_changes',{event:'*',schema:'public',table:'announcements'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'announcement_reads'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'chat_posts'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'round_score_submissions'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},refresh).subscribe(); return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('league-unread-changed',refresh);window.removeEventListener('chat-unread-changed',refresh);document.removeEventListener('visibilitychange',visible);supabase.removeChannel(channel)}},[loadPlayer])
 useEffect(()=>{const fn=(e:MouseEvent)=>{if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn)},[])
 useEffect(()=>{let alive=true;const check=async()=>{try{const r=await fetch('/api/youtube/live',{cache:'no-store'});const j=await r.json();if(alive)setYoutubeLive(j?.isLive?j:null)}catch{}};check();const timer=window.setInterval(check,15000);return()=>{alive=false;window.clearInterval(timer)}},[])
 async function logout(){await supabase.auth.signOut();location.href='/login'}
 if(authReady&&profileError)return <main style={{minHeight:'100vh',display:'grid',placeContent:'center',padding:24,textAlign:'center',background:'#09243a',color:'white'}}><h1>Unable to Verify Sign In</h1><p role="alert">{profileError}</p><p>Your account may still be approved. Please try again.</p><div style={{display:'flex',gap:12,justifyContent:'center'}}><button onClick={()=>{setAuthReady(false);setProfileError('');void loadPlayer()}} style={{padding:'12px 20px',borderRadius:8}}>Retry</button><button onClick={()=>{void supabase.auth.signOut().then(()=>{window.location.href='/login'})}} style={{padding:'12px 20px',borderRadius:8}}>Sign Out</button></div></main>
 if(!authReady||!profile)return <div className="golf-auth-loading" role="status" aria-live="polite" aria-label="Checking sign in status">
  <div className="golf-auth-loading-content">
   <div className="golf-auth-ball-wrap" aria-hidden="true"><div className="golf-auth-ball">⛳</div><div className="golf-auth-orbit"/></div>
   <strong>Checking Sign In</strong>
   <span>Getting your golf league ready…</span>
   <div className="golf-auth-progress" aria-hidden="true"><div/></div>
  </div>
  <style>{`
   .golf-auth-loading{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:linear-gradient(155deg,#06172d,#0d3050 55%,#082b24);color:white;text-align:center;padding:24px;box-sizing:border-box}
   .golf-auth-loading-content{display:flex;flex-direction:column;align-items:center;gap:12px;width:min(320px,90vw)}
   .golf-auth-ball-wrap{position:relative;width:112px;height:112px;display:grid;place-items:center;margin-bottom:10px}
   .golf-auth-ball{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 30% 25%,#fff,#e6edf2 62%,#a5b5c4);box-shadow:inset -8px -9px 14px #8b9ca755,0 8px 25px #0008;font-size:37px;animation:golfAuthBounce 1.6s ease-in-out infinite}
   .golf-auth-orbit{position:absolute;inset:0;border:4px solid #ffffff20;border-top-color:#9cdb3b;border-right-color:#9cdb3b;border-radius:50%;animation:golfAuthSpin 1.2s linear infinite}
   .golf-auth-loading strong{font-size:23px;letter-spacing:.02em}
   .golf-auth-loading span{font-size:14px;color:#d5e3ee}
   .golf-auth-progress{height:6px;width:100%;margin-top:12px;background:#ffffff30;border-radius:20px;overflow:hidden}
   .golf-auth-progress>div{height:100%;width:38%;background:linear-gradient(90deg,#7ecb27,#d1f97b);border-radius:20px;animation:golfAuthProgress 1.6s ease-in-out infinite}
   @keyframes golfAuthSpin{to{transform:rotate(360deg)}}
   @keyframes golfAuthBounce{50%{transform:translateY(-5px)}}
   @keyframes golfAuthProgress{0%{transform:translateX(-105%)}100%{transform:translateX(270%)}}
   @media(prefers-reduced-motion:reduce){.golf-auth-ball,.golf-auth-orbit,.golf-auth-progress>div{animation:none}.golf-auth-progress>div{width:100%}}
  `}</style>
 </div>
 if(profile?.status==='approved'&&profile?.access_type==='sim_only')return <div className="mobile-home sim-only-home-v13159">
  <section className="mobile-brand"><img src="/logo-golf-league.png" alt="Laurel View Golf Simulator"/><div className="profile-wrap" ref={wrap}><button className="profile-button" onClick={()=>setOpen(!open)} aria-label="Open profile menu">{profile?.avatar_url?<img src={profile.avatar_url} alt="Profile"/>:<span>👤</span>}<b>⌄</b></button>{open&&<div className="profile-menu"><Link href="/profile">My Profile</Link><Link href="/settings">Settings</Link><button onClick={logout}>Log Out ↪</button></div>}</div></section>
  <div className="sim-only-welcome-v13159"><h1>Golf Simulator</h1><p>Your account is approved for simulator reservations.</p></div>
  <nav className="mobile-menu"><Link href="/my-bookings" className="mobile-menu-row"><span className="menu-icon"><CalendarIcon /></span><span className="menu-copy"><span className="menu-title">Sim Reservations</span></span><span className="menu-arrow">›</span></Link></nav>
  <ViewportBottomNav><nav className="mobile-bottom sim-only-bottom-v13159"><Link className="active" href="/"><span><HomeIcon /></span><b>Home</b></Link><Link href="/my-bookings"><span><CalendarIcon /></span><b>Reservations</b></Link></nav></ViewportBottomNav>
 </div>
 return <div className="mobile-home">
  <section className="mobile-brand"><img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League"/><div className="profile-wrap" ref={wrap}><button className="profile-button" onClick={()=>setOpen(!open)} aria-label="Open profile menu">{profile?.avatar_url?<img src={profile.avatar_url} alt="Profile"/>:<span>👤</span>}<b>⌄</b></button>{open&&<div className="profile-menu"><Link href="/submit-score">Submit Score</Link>{(profile?.status==='approved'&&(profile?.is_scorecard_official||profile?.role==='admin'))&&<Link href="/scorecard-official">Scorecard Admin</Link>}{(profile?.status==='approved'&&(profile?.is_account_approver||profile?.role==='admin'))&&<Link href="/account-approvals">Account Approvals</Link>}{profile?.status==='approved'&&(profile?.is_account_approver||profile?.role==='admin')&&<Link href="/send-message">Send Message</Link>}<Link href="/profile">My Profile</Link><Link href="/settings">Settings</Link><button onClick={logout}>Log Out ↪</button></div>}</div></section>
  {(profile?.status==='approved'&&(profile?.is_scorecard_official||profile?.role==='admin')&&pendingScorecards>0)&&<Link href="/scorecard-official" className="home-scorecard-official-v1300"><span className="home-scorecard-official-icon-v1300" aria-hidden="true">▤</span><span><strong>Scorecard Approval Needed</strong><small>{pendingScorecards} scorecard{pendingScorecards===1?'':'s'} waiting for approval</small></span><b>›</b></Link>}
  {(profile?.status==='approved'&&(profile?.is_account_approver||profile?.role==='admin')&&pendingAccounts>0)&&<Link href="/account-approvals" className="home-scorecard-official-v1300"><span className="home-scorecard-official-icon-v1300" aria-hidden="true">👤</span><span><strong>New Player Approval Needed</strong><small>{pendingAccounts} account{pendingAccounts===1?'':'s'} waiting for approval</small></span><b>›</b></Link>}
  {youtubeLive&&<Link href="/live" className="home-live-alert-v1263" aria-label="Watch live round"><span className="home-live-orb-v1263"><i/>LIVE</span><span className="home-live-copy-v1263"><strong>{youtubeLive.liveHeadline||'A League Round is now LIVE!'}</strong><small>{youtubeLive.liveSubtext||'Tap to watch'}</small></span><span className="home-live-arrow-v1263">›</span></Link>}
  <nav className="mobile-menu">{items.map(({href,Icon,title})=><Link href={href} className="mobile-menu-row" key={title}><span className="menu-icon"><Icon /></span><span className="menu-copy"><span className="menu-title">{title}</span></span>{title==='Messages'&&unread>0&&<span className="unread-badge">{unread}</span>}{title==='League Chat'&&chatUnread>0&&<span className="unread-badge">{chatUnread}</span>}{title==='Recorded Rounds'&&!!youtubeLive&&<span className="live-home-badge-v1260"><i/>LIVE</span>}<span className="menu-arrow">›</span></Link>)}</nav>
  <Bottom unread={unread}/>
 </div>
}
function Bottom({unread}:{unread:number}){return <ViewportBottomNav><nav className="mobile-bottom"><Link className="active" href="/"><span><HomeIcon /></span><b>Home</b></Link><Link href="/my-bookings"><span><CalendarIcon /></span><b>Reservations</b></Link><Link href="/my-team"><span><TeamsIcon /></span><b>My Team</b></Link><Link href="/messages" className="bottom-message"><span><MessagesIcon /></span>{unread>0&&<i>{unread}</i>}<b>Messages</b></Link></nav></ViewportBottomNav>}
