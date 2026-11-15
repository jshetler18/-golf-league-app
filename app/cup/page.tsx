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
 const [preview,setPreview]=useState(false),[handicaps,setHandicaps]=useState<Handicap[]>([])
 useEffect(()=>{setPreview(new URLSearchParams(window.location.search).get('preview')==='week4')},[])
 const [season,setSeason]=useState<Season|null>(null),[teams,setTeams]=useState<Team[]>([]),[months,setMonths]=useState<Month[]>([]),[points,setPoints]=useState<CupPoint[]>([]),[matchups,setMatchups]=useState<Matchup[]>([]),[champions,setChampions]=useState<Champion[]>([]),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{const {data:s}=await supabase.from('seasons').select('id,name').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle();if(!s){setLoading(false);return};setSeason(s as Season);const [{data:t},{data:m}]=await Promise.all([supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'),supabase.from('league_months').select('id,month_start').eq('season_id',s.id).order('month_start')]);setTeams((t||[]) as Team[]);setMonths((m||[]) as Month[]);const ids=(m||[]).map(x=>x.id);if(ids.length){const [{data:p},{data:w},{data:c},{data:h}]=await Promise.all([supabase.from('cup_points').select('league_month_id,team_id,points,placement').in('league_month_id',ids),supabase.from('week4_matchups').select('league_month_id,seed_high,seed_low,team_high_id,team_low_id,winner_team_id,high_points_awarded,low_points_awarded').in('league_month_id',ids).order('seed_high'),supabase.from('monthly_champions').select('league_month_id,team_id').in('league_month_id',ids),supabase.from('monthly_team_handicaps').select('league_month_id,team_id,handicap_points').in('league_month_id',ids)]);setHandicaps((h||[]) as Handicap[]);setPoints((p||[]) as CupPoint[]);setMatchups((w||[]) as Matchup[]);setChampions((c||[]) as Champion[])}setLoading(false)})()},[])
 const rows=useMemo(()=>teams.map(t=>{const byMonth=months.map(m=>{const p=points.find(p=>p.team_id===t.id&&p.league_month_id===m.id);return p?Number(p.points):null});return {team:t,byMonth,total:byMonth.reduce<number>((sum,v)=>sum+(v||0),0)}}).sort((a,b)=>b.total-a.total||a.team.name.localeCompare(b.team.name)),[teams,months,points])
 const name=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'
 const monthName=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})
 const monthShort=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'short'})
 if(loading)return <PlayerPage title="Cup Standings"><p>Loading…</p></PlayerPage>
 return <PlayerPage title="Cup Standings"><div className="cup-page-v1231">
  <div className="section-title cup-heading-v1231"><div><h1>Cup Standings</h1><p className="muted">Cup points earned in each month build toward the season championship.</p></div></div>
  {!season?<div className="card">No active season found.</div>:<>
   {rows.length>0&&<div className="card cup-leader-v1231"><span className="cup-leader-icon-v1231">🏆</span><div><small>CURRENT CUP LEADER</small><strong>{rows[0].team.name}</strong><span>{rows[0].total.toLocaleString()} points</span></div></div>}
   <div className="card cup-board-v1231">
    <div className="cup-board-head-v1231"><div><small>{season.name}</small><h2>Season Cup Leaderboard</h2></div><span>Scroll to see each month</span></div>
    <div className="cup-scroll-v1231" style={{'--cup-months':months.length} as CSSProperties}><div className="cup-grid-v1231 header"><span>#</span><span>Team</span>{months.map(m=><span key={m.id}>{monthShort(m)}</span>)}<span>Total</span></div>{rows.map((r,i)=><div className={`cup-grid-v1231 row ${i===0?'cup-first-v1231':''}`} key={r.team.id}><span className="cup-rank-v1231">{i+1}</span><span className="cup-team-v1231"><strong>{r.team.name}</strong>{i===0&&<small>LEADER</small>}</span>{r.byMonth.map((v,j)=><span key={months[j].id}>{v===null?'—':v.toLocaleString()}</span>)}<span className="cup-total-v1231">{r.total.toLocaleString()}</span></div>)}</div>
   </div>
   <section id="match-play" className="cup-match-section-v1231"><div className="section-title compact"><div><h2>Match Play</h2><p className="muted">Week 4 head-to-head results and Cup points by month.</p></div></div>
    {months.map(m=>{const ms=matchups.filter(x=>x.league_month_id===m.id);const champ=champions.find(c=>c.league_month_id===m.id);if(!ms.length&&!champ)return null;return <div className="card cup-month-card-v1231 cup-month-card-v1256" key={m.id}><div className="cup-month-title-v1231"><h3>{monthName(m)}</h3>{champ&&<span className="pill cup-champion-pill-v1256">🏆 {name(champ.team_id)} — Monthly Champion</span>}</div>{ms.length>0&&<div className="cup-match-list-v1256">{ms.map(x=>{const highWin=x.winner_team_id===x.team_high_id,lowWin=x.winner_team_id===x.team_low_id;return <div className="cup-match-card-v1256" key={`${m.id}-${x.seed_high}-${x.seed_low}`}><div className="cup-seed-banner-v1256">#{x.seed_high} Seed <span>HEAD TO HEAD</span> #{x.seed_low} Seed</div><div className="cup-head-to-head-v1256"><div className={`cup-fighter-v1256 ${highWin?'winner':''}`}><strong>{name(x.team_high_id)}</strong><b>{x.high_points_awarded===null?'—':x.high_points_awarded.toLocaleString()}</b><small>Cup Points</small>{highWin&&<em>🏆 WINNER</em>}</div><div className="cup-vs-badge-v1256">VS</div><div className={`cup-fighter-v1256 ${lowWin?'winner':''}`}><strong>{name(x.team_low_id)}</strong><b>{x.low_points_awarded===null?'—':x.low_points_awarded.toLocaleString()}</b><small>Cup Points</small>{lowWin&&<em>🏆 WINNER</em>}</div></div>{!x.winner_team_id&&<div className="cup-pending-v1256">Matchup Pending</div>}</div>})}</div>}</div>})}
    {preview&&matchups.length===0&&months.length>0&&<div className="card" style={{border:'2px solid #c58b25',padding:'16px',marginBottom:'16px'}}>
     <div style={{textAlign:'center',marginBottom:'14px'}}><strong style={{display:'block',fontSize:'1.35rem'}}>NOVEMBER — WEEK 4 MATCHUPS</strong><span style={{display:'inline-block',marginTop:6,padding:'5px 10px',background:'#fff2cf',color:'#684600',borderRadius:8,fontWeight:800,fontSize:12}}>SAMPLE PREVIEW — FICTIONAL SCORES & RESULTS</span><p className="muted" style={{marginTop:8}}>This demonstration is only visible with the preview link. Real matchups will not appear until all 10 Week 3 scores are approved and the matchups are generated.</p></div>
     <div className="cup-match-list-v1256">{([['Team Billow','Team Hutzel','CHAMPIONSHIP',1,1000,800,27,25],['Team Smolnik','Team Rovder','3RD & 4TH PLACE',3,700,600,24,26],['Team Shetler','Team Mock','5TH & 6TH PLACE',5,500,400,23,25],['Team Croyle','Team Yoder','7TH & 8TH PLACE',7,300,200,28,27],['Team Shingler','Team Muir','TOILET BOWL',9,100,0,22,24]] as const).map(([a,b,label,seed,winPts,losePts,scoreA,scoreB])=>{
      const currentMonth=months.find(m=>m.month_start.startsWith('2026-11'))||months[0]
      const handicap=(teamName:string)=>{const team=teams.find(t=>t.name===teamName);return Number(handicaps.find(h=>h.league_month_id===currentMonth.id&&h.team_id===team?.id)?.handicap_points??0)}
      const ha=handicap(a),hb=handicap(b),diff=Math.abs(ha-hb)
      const helpA=ha>hb?diff:0,helpB=hb>ha?diff:0
      const aWins=scoreA>scoreB
      return <div className="cup-match-card-v1256" key={seed} style={{marginBottom:16,fontSize:'0.95rem',lineHeight:1.4}}>
       <div className="cup-seed-banner-v1256" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:3,padding:'10px 8px',lineHeight:1.25}}><strong style={{fontSize:'1.12rem',fontWeight:850}}>{label}</strong><span style={{fontSize:'0.84rem',fontWeight:750}}>#{seed} Seed vs #{seed+1} Seed</span></div>
       <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 42px minmax(0,1fr)',gap:4,alignItems:'start',padding:'10px 8px 12px'}}>
        {([{team:a,hc:ha,help:helpA,score:scoreA,points:aWins?winPts:losePts,winner:aWins},{team:b,hc:hb,help:helpB,score:scoreB,points:aWins?losePts:winPts,winner:!aWins}] as const).map((side,i)=><div key={side.team} style={{gridColumn:i===0?1:3,minWidth:0,display:'grid',gridTemplateRows:'34px 22px 26px 30px 20px 27px 22px',justifyItems:'center',alignItems:'center',textAlign:'center',rowGap:1}}>
         <strong style={{fontSize:'clamp(1rem,3.5vw,1.18rem)',lineHeight:1.15,overflowWrap:'break-word',alignSelf:'center'}}>{side.team}</strong>
         <small style={{fontSize:'0.83rem',whiteSpace:'nowrap'}}>Monthly HC: {side.hc>0?'+':''}{side.hc}</small>
         <span style={{fontSize:'0.78rem',fontWeight:800,color:side.help>0?'#15803d':'transparent',textAlign:'center',alignSelf:'center'}}>{side.help>0?`+${side.help} Matchup Help`:'No Help'}</span>
         <b style={{fontSize:'1.4rem',lineHeight:1}}>{side.score.toFixed(1)}</b>
         <small style={{fontSize:'0.8rem',whiteSpace:'nowrap'}}>Week 4 Score</small><b style={{fontSize:'1.1rem'}}>{side.points.toLocaleString()}</b><small style={{fontSize:'0.8rem'}}>{side.winner?'🏆 Winner • Cup Points':'Cup Points'}</small>
        </div>)}
        <div className="cup-vs-badge-v1256" style={{gridColumn:2,gridRow:1,alignSelf:'center',justifySelf:'center',marginTop:42}}>VS</div>
       </div>
       <div className="cup-pending-v1256" style={{fontSize:'0.72rem',lineHeight:1.4}}>SAMPLE RESULT • {aWins?a:b} wins {winPts.toLocaleString()} Cup Points; {aWins?b:a} earns {losePts.toLocaleString()}</div>
      </div>
     })}</div>
    </div>}
    {matchups.length===0&&!preview&&<div className="card">Week 4 matchups will appear here once they are created.</div>}
   </section>
  </>}
 </div></PlayerPage>
}
