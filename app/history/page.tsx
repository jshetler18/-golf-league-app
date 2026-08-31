'use client'
import { useEffect,useMemo,useState } from 'react'
import { supabase } from '@/lib/supabase'

type Season={id:string;name:string;start_date:string|null;end_date:string|null;is_active:boolean;is_closed:boolean}
type Team={id:string;season_id:string;name:string}
type Month={id:string;season_id:string;month_start:string}
type CupPoint={league_month_id:string;team_id:string;points:number}
type Champion={league_month_id:string;team_id:string}

export default function History(){
 const [seasons,setSeasons]=useState<Season[]>([]),[teams,setTeams]=useState<Team[]>([]),[months,setMonths]=useState<Month[]>([]),[points,setPoints]=useState<CupPoint[]>([]),[champions,setChampions]=useState<Champion[]>([]),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{
  const {data:s}=await supabase.from('seasons').select('id,name,start_date,end_date,is_active,is_closed').order('start_date')
  const ss=(s||[]) as Season[];setSeasons(ss);const seasonIds=ss.map(x=>x.id)
  if(!seasonIds.length){setLoading(false);return}
  const [{data:t},{data:m}]=await Promise.all([
   supabase.from('teams').select('id,season_id,name').in('season_id',seasonIds),
   supabase.from('league_months').select('id,season_id,month_start').in('season_id',seasonIds).order('month_start')
  ])
  const tt=(t||[]) as Team[],mm=(m||[]) as Month[];setTeams(tt);setMonths(mm);const monthIds=mm.map(x=>x.id)
  if(monthIds.length){const [{data:p},{data:c}]=await Promise.all([
   supabase.from('cup_points').select('league_month_id,team_id,points').in('league_month_id',monthIds),
   supabase.from('monthly_champions').select('league_month_id,team_id').in('league_month_id',monthIds)
  ]);setPoints((p||[]) as CupPoint[]);setChampions((c||[]) as Champion[])}
  setLoading(false)
 })()},[])
 const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'
 const completed=seasons.filter(s=>s.is_closed)
 const seasonTables=useMemo(()=>completed.map(s=>{
  const sm=months.filter(m=>m.season_id===s.id).sort((a,b)=>a.month_start.localeCompare(b.month_start))
  const st=teams.filter(t=>t.season_id===s.id)
  const rows=st.map(t=>{const byMonth=sm.map(m=>points.find(p=>p.league_month_id===m.id&&p.team_id===t.id)?.points);const total=byMonth.reduce((a,b)=>a+(b??0),0);return {team:t,byMonth,total}}).sort((a,b)=>b.total-a.total||a.team.name.localeCompare(b.team.name))
  return {season:s,months:sm,rows}
 }),[completed,months,teams,points])
 const monthlyHistory=useMemo(()=>champions.map(c=>{const m=months.find(x=>x.id===c.league_month_id);if(!m)return null;const s=seasons.find(x=>x.id===m.season_id);return {season:s,month:m,team:teamName(c.team_id)}}).filter(Boolean).sort((a:any,b:any)=>a.month.month_start.localeCompare(b.month.month_start)),[champions,months,seasons,teams])
 const monthlyLeaders=useMemo(()=>{const map=new Map<string,number>();monthlyHistory.forEach((x:any)=>map.set(x.team,(map.get(x.team)||0)+1));return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))},[monthlyHistory])
 if(loading)return <p>Loading…</p>
 return <>
  <div className="section-title"><div><div className="eyebrow">League archive</div><h1>Champions & History</h1><p className="muted">Past Cup champions, monthly champions, and final season standings.</p></div></div>
  <div className="grid">
   <section className="card"><h2>Past Cup Champions</h2>{seasonTables.length?seasonTables.map(x=>x.rows[0]?<div key={x.season.id} style={{marginBottom:12}}><div className="pill">{x.season.name}</div><p className="champ" style={{marginTop:8}}>{x.rows[0].team.name} • {x.rows[0].total.toLocaleString()} pts</p></div>:null):<p className="muted">No completed seasons yet.</p>}</section>
   <section className="card"><h2>All-Time Monthly Titles</h2>{monthlyLeaders.length?<div className="table-wrap"><table><thead><tr><th>#</th><th>Team</th><th>Titles</th></tr></thead><tbody>{monthlyLeaders.map(([team,count],i)=><tr key={team}><td>{i+1}</td><td><strong>{team}</strong></td><td>{count}</td></tr>)}</tbody></table></div>:<p className="muted">No monthly champions recorded yet.</p>}</section>
  </div>
  <div className="section-title"><h2>Monthly Champions</h2></div>
  <div className="card table-wrap"><table><thead><tr><th>Season</th><th>Month</th><th>Champion</th></tr></thead><tbody>{monthlyHistory.map((x:any)=><tr key={x.month.id}><td>{x.season?.name||'—'}</td><td>{new Date(x.month.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</td><td><strong>{x.team}</strong></td></tr>)}</tbody></table></div>
  {seasonTables.map(x=><div key={x.season.id}><div className="section-title"><h2>{x.season.name} Final Cup Standings</h2></div><div className="card table-wrap"><table><thead><tr><th>#</th><th>Team</th>{x.months.map(m=><th key={m.id}>{new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</th>)}<th>Total</th></tr></thead><tbody>{x.rows.map((r,i)=><tr key={r.team.id}><td className="rank">{i+1}</td><td><strong>{r.team.name}</strong>{i===0&&<span className="pill" style={{marginLeft:8}}>Cup Champion</span>}</td>{r.byMonth.map((v,j)=><td key={x.months[j].id}>{v??'—'}</td>)}<td><strong>{r.total}</strong></td></tr>)}</tbody></table></div></div>)}
 </>
}
