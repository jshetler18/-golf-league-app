'use client'
import { useEffect,useMemo,useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type Season={id:string;name:string;start_date:string|null;end_date:string|null;is_active:boolean;is_closed:boolean}
type Team={id:string;season_id:string;name:string;is_active?:boolean}
type Month={id:string;season_id:string;month_start:string}
type CupPoint={league_month_id:string;team_id:string;points:number}
type Champion={league_month_id:string;team_id:string}
type RawRow={canonical_team_name:string;season_label:string;score_month:string;raw_score:number|string}
type RankingMetric='all_avg'|'all_high'|'all_low'|'season_avg'|'season_high'|'season_low'|'cup_titles'|'monthly_titles'

type MonthlyHistoryRow={season:Season;month:Month;team:string}

const HISTORY_START='2025-11-01'
const teamKey=(name:string)=>name.trim().toLowerCase()
const rankingLabels:Record<RankingMetric,string>={
 all_avg:'All-Time Avg Raw Score',all_high:'All-Time Highest Raw Score',all_low:'All-Time Lowest Raw Score',
 season_avg:'Current Season Avg Raw Score',season_high:'Current Season High Raw Score',season_low:'Current Season Low Raw Score',
 cup_titles:'Cup Championships',monthly_titles:'Monthly Championships'
}

export default function History(){
 const [seasons,setSeasons]=useState<Season[]>([]),[teams,setTeams]=useState<Team[]>([]),[months,setMonths]=useState<Month[]>([]),[points,setPoints]=useState<CupPoint[]>([]),[champions,setChampions]=useState<Champion[]>([]),[rawRows,setRawRows]=useState<RawRow[]>([]),[loading,setLoading]=useState(true),[selectedSeasonId,setSelectedSeasonId]=useState(''),[rankingMetric,setRankingMetric]=useState<RankingMetric>('all_avg'),[rankingDirection,setRankingDirection]=useState<'desc'|'asc'>('desc')
 useEffect(()=>{(async()=>{
  const {data:s}=await supabase.from('seasons').select('id,name,start_date,end_date,is_active,is_closed').order('start_date')
  const ss=(s||[]) as Season[];setSeasons(ss);const preferred=ss.find(x=>x.is_active&&!x.is_closed)||ss[ss.length-1];if(preferred)setSelectedSeasonId(preferred.id);const seasonIds=ss.map(x=>x.id)
  if(!seasonIds.length){setLoading(false);return}
  const [{data:t},{data:m}]=await Promise.all([
   supabase.from('teams').select('id,season_id,name,is_active').in('season_id',seasonIds),
   supabase.from('league_months').select('id,season_id,month_start').in('season_id',seasonIds).gte('month_start',HISTORY_START).order('month_start')
  ])
  const tt=(t||[]) as Team[],mm=(m||[]) as Month[];setTeams(tt);setMonths(mm);const monthIds=mm.map(x=>x.id)
  if(monthIds.length){const [{data:p},{data:c}]=await Promise.all([
   supabase.from('cup_points').select('league_month_id,team_id,points').in('league_month_id',monthIds),
   supabase.from('monthly_champions').select('league_month_id,team_id').in('league_month_id',monthIds)
  ]);setPoints((p||[]) as CupPoint[]);setChampions((c||[]) as Champion[])}
  const {data:raw}=await supabase.from('team_raw_score_history').select('canonical_team_name,season_label,score_month,raw_score')
  setRawRows((raw||[]) as RawRow[])
  setLoading(false)
 })()},[])

 const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'

 const cupChampions=useMemo(()=>seasons.filter(s=>s.is_closed&&(!s.end_date||s.end_date>=HISTORY_START)).map(s=>{
   const sm=months.filter(m=>m.season_id===s.id)
   const st=teams.filter(t=>t.season_id===s.id)
   const totals=st.map(team=>({team,total:sm.reduce((sum,m)=>sum+Number(points.find(p=>p.league_month_id===m.id&&p.team_id===team.id)?.points||0),0)})).sort((a,b)=>b.total-a.total||a.team.name.localeCompare(b.team.name))
   return totals.length?{season:s,team:totals[0].team.name,total:totals[0].total}:null
 }).filter(Boolean) as {season:Season;team:string;total:number}[],[seasons,months,teams,points])

 const monthlyHistory=useMemo(()=>champions.map(c=>{
   const month=months.find(m=>m.id===c.league_month_id);if(!month)return null
   const season=seasons.find(s=>s.id===month.season_id);if(!season)return null
   return {season,month,team:teamName(c.team_id)}
 }).filter(Boolean).sort((a:any,b:any)=>a.month.month_start.localeCompare(b.month.month_start)) as MonthlyHistoryRow[],[champions,months,seasons,teams])

 const monthlyLeaders=useMemo(()=>{
   const counts=new Map<string,{name:string,count:number}>()
   monthlyHistory.forEach(row=>{const key=teamKey(row.team);const old=counts.get(key);counts.set(key,{name:row.team,count:(old?.count||0)+1})})
   return [...counts.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))
 },[monthlyHistory])

 const bySeason=useMemo(()=>seasons.filter(s=>monthlyHistory.some(r=>r.season.id===s.id)).slice().sort((a,b)=>Number(b.is_active)-Number(a.is_active)||(b.start_date||'').localeCompare(a.start_date||'')).map(s=>({season:s,rows:monthlyHistory.filter(r=>r.season.id===s.id)})),[seasons,monthlyHistory])
 const selectedSeason=seasons.find(s=>s.id===selectedSeasonId)||null
 const selectedMonths=useMemo(()=>months.filter(m=>m.season_id===selectedSeasonId).sort((a,b)=>a.month_start.localeCompare(b.month_start)),[months,selectedSeasonId])
 const seasonCupRows=useMemo(()=>{
   if(!selectedSeasonId)return []
   const st=teams.filter(t=>t.season_id===selectedSeasonId)
   return st.map(team=>{
     const byMonth=selectedMonths.map(m=>{const p=points.find(p=>p.league_month_id===m.id&&p.team_id===team.id);return p?Number(p.points):null})
     return {team,byMonth,total:byMonth.reduce<number>((sum,v)=>sum+(v||0),0)}
   }).sort((a,b)=>b.total-a.total||a.team.name.localeCompare(b.team.name))
 },[selectedSeasonId,teams,selectedMonths,points])
 const currentSeason=seasons.find(s=>s.is_active&&!s.is_closed)||seasons.slice().sort((a,b)=>(b.start_date||'').localeCompare(a.start_date||''))[0]||null
 const currentRankingTeams=useMemo(()=>{
   if(!currentSeason)return []
   const seen=new Set<string>()
   return teams.filter(t=>t.season_id===currentSeason.id&&t.is_active!==false).filter(t=>{const k=teamKey(t.name);if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.name.localeCompare(b.name))
 },[teams,currentSeason?.id])
 const rankingRows=useMemo(()=>{
   const calc=(vals:number[],kind:'avg'|'high'|'low')=>{
     if(!vals.length)return null
     if(kind==='avg')return vals.reduce((a,b)=>a+b,0)/vals.length
     return kind==='high'?Math.max(...vals):Math.min(...vals)
   }
   return currentRankingTeams.map(team=>{
     const key=teamKey(team.name)
     const all=rawRows.filter(r=>teamKey(r.canonical_team_name)===key).map(r=>Number(r.raw_score))
     const current=rawRows.filter(r=>teamKey(r.canonical_team_name)===key&&r.season_label===currentSeason?.name).map(r=>Number(r.raw_score))
     let value:number|null
     if(rankingMetric==='cup_titles') value=cupChampions.filter(c=>teamKey(c.team)===key).length
     else if(rankingMetric==='monthly_titles') value=monthlyHistory.filter(r=>teamKey(r.team)===key).length
     else {
       const vals=rankingMetric.startsWith('season_')?current:all
       const kind: 'avg'|'high'|'low'=rankingMetric.endsWith('avg')?'avg':rankingMetric.endsWith('high')?'high':'low'
       value=calc(vals,kind)
     }
     return {team,value}
   }).sort((a,b)=>{
     if(a.value==null&&b.value==null)return a.team.name.localeCompare(b.team.name)
     if(a.value==null)return 1;if(b.value==null)return -1
     const d=a.value-b.value
     return rankingDirection==='asc'?d:-d
   })
 },[currentRankingTeams,rawRows,rankingMetric,rankingDirection,currentSeason?.name,cupChampions,monthlyHistory])
 const formatRanking=(v:number|null)=>v==null?'—':Math.round(Number(v)).toLocaleString()

 const monthShort=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'short'})
 const monthLabel=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})

 if(loading)return <PlayerPage title="History"><p>Loading…</p></PlayerPage>
 return <PlayerPage title="History"><div className="history-page-v1232">
   <div className="section-title"><div><h1>History</h1><p className="muted">League champions beginning with the 2025–2026 season.</p></div></div>

   <section className="card history-section-v1232">
     <div className="history-section-title-v1232"><span className="history-trophy-v1232 trophy-cup">🏆</span><div><h2>Cup Champions</h2><p className="muted">Season-long Cup champions.</p></div></div>
     {cupChampions.length?<div className="history-cup-list-v1232">{cupChampions.map(row=><div className="history-cup-row-v1232" key={row.season.id}><span>{row.season.name}</span><strong>{row.team}</strong><b>{row.total.toLocaleString()} pts</b></div>)}</div>:<p className="muted">No completed Cup champions are recorded yet.</p>}
   </section>

   <section className="card history-section-v1232 history-cup-standings-v1233">
     <div className="history-section-title-v1232"><span className="history-trophy-v1232 trophy-cup">🏆</span><div><h2>Season Cup Standings</h2><p className="muted">Choose a season to view its Cup standings.</p></div></div>
     <label className="history-season-select-v1233">
       <span>Season</span>
       <select value={selectedSeasonId} onChange={e=>setSelectedSeasonId(e.target.value)}>
         {seasons.filter(s=>!s.start_date||s.start_date>=HISTORY_START).slice().sort((a,b)=>(b.start_date||'').localeCompare(a.start_date||'')).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
       </select>
     </label>
     {selectedSeason&&seasonCupRows.length?<div className="history-cup-board-v1233">
       <div className="cup-scroll-v1231" style={{'--cup-months':selectedMonths.length} as CSSProperties}>
         <div className="cup-grid-v1231 header"><span>#</span><span>Team</span>{selectedMonths.map(m=><span key={m.id}>{monthShort(m)}</span>)}<span>Total</span></div>
         {seasonCupRows.map((r,i)=><div className={`cup-grid-v1231 row ${i===0?'cup-first-v1231':''}`} key={r.team.id}><span className="cup-rank-v1231">{i+1}</span><span className="cup-team-v1231"><strong>{r.team.name}</strong>{i===0&&<small>{selectedSeason.is_closed?'CHAMPION':'LEADER'}</small>}</span>{r.byMonth.map((v,j)=><span key={selectedMonths[j].id}>{v===null?'—':v.toLocaleString()}</span>)}<span className="cup-total-v1231">{r.total.toLocaleString()}</span></div>)}
       </div>
     </div>:<p className="muted">No Cup standings are available for this season yet.</p>}
   </section>

   <section className="card history-section-v1232">
     <div className="history-section-title-v1232"><span className="history-trophy-v1232 trophy-monthly">🏆</span><div><h2>All-Time Monthly Titles</h2><p className="muted">Total monthly championships won since November 2025.</p></div></div>
     {monthlyLeaders.length?<div className="history-title-list-v1232">{monthlyLeaders.map((row,i)=><div className="history-title-row-v1232" key={teamKey(row.name)}><span className="history-rank-v1232">{i+1}</span><strong>{row.name}</strong><span className="history-title-count-v1232"><span className="history-title-trophies-v1234" aria-label={`${row.count} monthly ${row.count===1?'title':'titles'}`}>{Array.from({length:row.count}).map((_,trophyIndex)=><i className="trophy trophy-monthly" key={trophyIndex}>🏆</i>)}</span>{row.count} {row.count===1?'Title':'Titles'}</span></div>)}</div>:<p className="muted">No monthly champions are recorded yet.</p>}
   </section>

   <section className="history-monthly-section-v1232">
     <div className="section-title compact"><div><h2>Monthly Champions</h2><p className="muted">Starting with November 2025, each newly crowned monthly champion is added automatically.</p></div></div>
     {bySeason.length?bySeason.map(group=><div className="card history-season-v1232" key={group.season.id}>
       <div className="history-season-head-v1232"><strong>{group.season.name}</strong>{group.season.is_active&&<span className="pill">Current Season</span>}</div>
       <div className="history-month-list-v1232">{group.rows.map(row=><div className="history-month-row-v1232" key={row.month.id}><span className="trophy trophy-monthly">🏆</span><div><small>{monthLabel(row.month.month_start)}</small><strong>{row.team}</strong></div></div>)}</div>
     </div>):<div className="card"><p className="muted">No monthly champions are recorded yet.</p></div>}
   </section>

   <section className="card history-section-v1232 history-rankings-v1254">
     <div className="section-title compact"><div><div className="eyebrow">Raw Score Statistics</div><h2>Rankings</h2><p className="muted">Compare current league teams using raw scores only. Handicaps are not factored in.</p></div></div>
     <div className="rankings-controls">
       <label>Ranking Statistic<select value={rankingMetric} onChange={e=>setRankingMetric(e.target.value as RankingMetric)}>{(Object.keys(rankingLabels) as RankingMetric[]).map(k=><option key={k} value={k}>{rankingLabels[k]}</option>)}</select></label>
       <label>Sort Order<select value={rankingDirection} onChange={e=>setRankingDirection(e.target.value as 'asc'|'desc')}><option value="desc">Highest First</option><option value="asc">Lowest First</option></select></label>
     </div>
     <div className="rankings-table-wrap"><table className="rankings-table"><thead><tr><th>Rank</th><th>Team</th><th className="rank-stat-head"><span>Statistic</span><strong>{rankingLabels[rankingMetric]}</strong></th></tr></thead><tbody>
       {rankingRows.map((r,i)=><tr key={r.team.id}><td className="rank-number">#{i+1}</td><td className="rank-team">{r.team.name}</td><td className="rank-value">{formatRanking(r.value)}</td></tr>)}
     </tbody></table></div>
   </section>
 </div></PlayerPage>
}
