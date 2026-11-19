'use client'
import { useEffect,useMemo,useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type Season={id:string;name:string}
type Team={id:string;name:string}
type Month={id:string;month_start:string}
type CupPoint={league_month_id:string;team_id:string;points:number;placement:number|null}
type Matchup={league_month_id:string;seed_high:number;seed_low:number;team_high_id:string;team_low_id:string;winner_team_id:string|null;high_points_awarded:number|null;low_points_awarded:number|null}
type Champion={league_month_id:string;team_id:string}
type Handicap={league_month_id:string;team_id:string;handicap_points:number}

export default function Cup(){
 const [handicaps,setHandicaps]=useState<Handicap[]>([])
 const [view,setView]=useState('standings')
 const [selectedMonth,setSelectedMonth]=useState('')
 const [allowed,setAllowed]=useState<boolean|null>(null)
 useEffect(()=>{setView(new URLSearchParams(window.location.search).get('view')==='matchups'?'matchups':'standings');(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return};const {data:p}=await supabase.from('profiles').select('status,access_type').eq('id',user.id).maybeSingle();setAllowed(p?.status==='approved'&&p?.access_type==='league')})()},[])
 const [season,setSeason]=useState<Season|null>(null),[teams,setTeams]=useState<Team[]>([]),[months,setMonths]=useState<Month[]>([]),[points,setPoints]=useState<CupPoint[]>([]),[matchups,setMatchups]=useState<Matchup[]>([]),[champions,setChampions]=useState<Champion[]>([]),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{const {data:s}=await supabase.from('seasons').select('id,name').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle();if(!s){setLoading(false);return};setSeason(s as Season);const [{data:t},{data:m}]=await Promise.all([supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'),supabase.from('league_months').select('id,month_start').eq('season_id',s.id).order('month_start')]);setTeams((t||[]) as Team[]);setMonths((m||[]) as Month[]);const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit'}).formatToParts(new Date());const current=(parts.find(p=>p.type==='year')?.value||'')+'-'+(parts.find(p=>p.type==='month')?.value||'');setSelectedMonth((m||[]).find(x=>x.month_start.slice(0,7)===current)?.id||(m||[]).at(-1)?.id||'');const ids=(m||[]).map(x=>x.id);if(ids.length){const [{data:p},{data:w},{data:c},{data:h}]=await Promise.all([supabase.from('cup_points').select('league_month_id,team_id,points,placement').in('league_month_id',ids),supabase.from('week4_matchups').select('league_month_id,seed_high,seed_low,team_high_id,team_low_id,winner_team_id,high_points_awarded,low_points_awarded').in('league_month_id',ids).order('seed_high'),supabase.from('monthly_champions').select('league_month_id,team_id').in('league_month_id',ids),supabase.from('monthly_team_handicaps').select('league_month_id,team_id,handicap_points').in('league_month_id',ids)]);setHandicaps((h||[]) as Handicap[]);setPoints((p||[]) as CupPoint[]);setMatchups((w||[]) as Matchup[]);setChampions((c||[]) as Champion[])}setLoading(false)})()},[])
 const rows=useMemo(()=>teams.map(t=>{const byMonth=months.map(m=>{const p=points.find(p=>p.team_id===t.id&&p.league_month_id===m.id);return p?Number(p.points):null});return {team:t,byMonth,total:byMonth.reduce<number>((sum,v)=>sum+(v||0),0)}}).sort((a,b)=>b.total-a.total||a.team.name.localeCompare(b.team.name)),[teams,months,points])
 const name=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'
 const monthName=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})
 const monthShort=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'short'})
 if(loading||allowed===null)return <PlayerPage title="Cup Standings & Matchups"><p>Loading…</p></PlayerPage>
 if(!allowed)return <PlayerPage title="Cup Standings & Matchups"><div className="card">This page is available to approved league players only.</div></PlayerPage>
 return <PlayerPage title="Cup Standings & Matchups"><div className="cup-page-v1231"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}><button className={view==="standings"?"btn":"btn secondary"} onClick={()=>setView("standings")}>Cup Standings</button><button className={view==="matchups"?"btn":"btn secondary"} onClick={()=>setView("matchups")}>Week 4 Matchups</button></div>
  {view==='standings'&&<><div className="section-title cup-heading-v1231"><div><h1>Cup Standings</h1><p className="muted">Cup points earned in each month build toward the season championship.</p></div></div>
  {!season?<div className="card">No active season found.</div>:<>
   {rows.length>0&&<div className="card cup-leader-v1231"><span className="cup-leader-icon-v1231">🏆</span><div><small>CURRENT CUP LEADER</small><strong>{rows[0].team.name}</strong><span>{rows[0].total.toLocaleString()} points</span></div></div>}
   <div className="card cup-board-v1231">
    <div className="cup-board-head-v1231"><div><small>{season.name}</small><h2>Season Cup Leaderboard</h2></div><span>Scroll to see each month</span></div>
    <div className="cup-scroll-v1231" style={{'--cup-months':months.length} as CSSProperties}><div className="cup-grid-v1231 header"><span>#</span><span>Team</span>{months.map(m=><span key={m.id}>{monthShort(m)}</span>)}<span>Total</span></div>{rows.map((r,i)=><div className={`cup-grid-v1231 row ${i===0?'cup-first-v1231':''}`} key={r.team.id}><span className="cup-rank-v1231">{i+1}</span><span className="cup-team-v1231"><strong>{r.team.name}</strong>{i===0&&<small>LEADER</small>}</span>{r.byMonth.map((v,j)=><span key={months[j].id}>{v===null?'—':v.toLocaleString()}</span>)}<span className="cup-total-v1231">{r.total.toLocaleString()}</span></div>)}</div>
   </div>
   </>}
   {view==='matchups'&&<section id="match-play" className="cup-match-section-v1231">
    <div className="section-title compact"><div><h2>Week 4 Matchups</h2><p className="muted">Head-to-head results and Cup points by month.</p></div></div>
    <div className="card"><label className="field">Select Month<select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>{months.map(m=><option key={m.id} value={m.id}>{monthName(m)}</option>)}</select></label></div>
    {months.filter(m=>m.id===selectedMonth).map(m=>{
      const ms=matchups.filter(x=>x.league_month_id===m.id),champ=champions.find(c=>c.league_month_id===m.id)
      if(!ms.length)return <div className="card" key={m.id} style={{padding:24,textAlign:'center'}}><strong>{monthName(m)}'s matchups are not yet available.</strong><p className="muted">Matchups will be posted when all Week 3 scorecards have been approved by the scorecard administrator.</p></div>
      return <div className="card cup-month-card-v1231 cup-month-card-v1256" key={m.id}>
       <div className="cup-month-title-v1231"><h3>{monthName(m)} — Week 4 Matchups</h3>{champ&&<span className="pill cup-champion-pill-v1256">🏆 {name(champ.team_id)} — Monthly Champion</span>}</div>
       <div className="cup-match-list-v1256">{ms.map(x=>{const highWin=x.winner_team_id===x.team_high_id,lowWin=x.winner_team_id===x.team_low_id;return <div className="cup-match-card-v1256" key={x.seed_high}><div className="cup-seed-banner-v1256">#{x.seed_high} Seed <span>HEAD TO HEAD</span> #{x.seed_low} Seed</div><div className="cup-head-to-head-v1256"><div className={highWin?'cup-fighter-v1256 winner':'cup-fighter-v1256'}><strong>{name(x.team_high_id)}</strong><small>Monthly HC: {handicaps.find(h=>h.league_month_id===m.id&&h.team_id===x.team_high_id)?.handicap_points??0}</small><b>{x.high_points_awarded===null?'—':x.high_points_awarded.toLocaleString()}</b><small>Cup Points</small>{highWin&&<em>🏆 WINNER</em>}</div><div className="cup-vs-badge-v1256">VS</div><div className={lowWin?'cup-fighter-v1256 winner':'cup-fighter-v1256'}><strong>{name(x.team_low_id)}</strong><small>Monthly HC: {handicaps.find(h=>h.league_month_id===m.id&&h.team_id===x.team_low_id)?.handicap_points??0}</small><b>{x.low_points_awarded===null?'—':x.low_points_awarded.toLocaleString()}</b><small>Cup Points</small>{lowWin&&<em>🏆 WINNER</em>}</div></div>{!x.winner_team_id&&<div className="cup-pending-v1256">Matchup Pending</div>}</div>})}</div>
      </div>
    })}
   </section>}
  </>}
 </div></PlayerPage>
}
