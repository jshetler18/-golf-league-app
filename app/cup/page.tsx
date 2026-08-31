'use client'
import { useEffect,useMemo,useState } from 'react'
import { supabase } from '@/lib/supabase'

type Season={id:string;name:string}
type Team={id:string;name:string}
type Month={id:string;month_start:string}
type CupPoint={league_month_id:string;team_id:string;points:number;placement:number|null}
type Matchup={league_month_id:string;seed_high:number;seed_low:number;team_high_id:string;team_low_id:string;winner_team_id:string|null}

type Champion={league_month_id:string;team_id:string}

export default function Cup(){
 const [season,setSeason]=useState<Season|null>(null),[teams,setTeams]=useState<Team[]>([]),[months,setMonths]=useState<Month[]>([]),[points,setPoints]=useState<CupPoint[]>([]),[matchups,setMatchups]=useState<Matchup[]>([]),[champions,setChampions]=useState<Champion[]>([]),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{const {data:s}=await supabase.from('seasons').select('id,name').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle();if(!s){setLoading(false);return};setSeason(s as Season);const [{data:t},{data:m}]=await Promise.all([supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'),supabase.from('league_months').select('id,month_start').eq('season_id',s.id).order('month_start')]);setTeams((t||[]) as Team[]);setMonths((m||[]) as Month[]);const ids=(m||[]).map(x=>x.id);if(ids.length){const [{data:p},{data:w},{data:c}]=await Promise.all([supabase.from('cup_points').select('league_month_id,team_id,points,placement').in('league_month_id',ids),supabase.from('week4_matchups').select('league_month_id,seed_high,seed_low,team_high_id,team_low_id,winner_team_id').in('league_month_id',ids).order('seed_high'),supabase.from('monthly_champions').select('league_month_id,team_id').in('league_month_id',ids)]);setPoints((p||[]) as CupPoint[]);setMatchups((w||[]) as Matchup[]);setChampions((c||[]) as Champion[])}setLoading(false)})()},[])
 const rows=useMemo(()=>teams.map(t=>{const byMonth=months.map(m=>Number(points.find(p=>p.team_id===t.id&&p.league_month_id===m.id)?.points||0));return {team:t,byMonth,total:byMonth.reduce((a,b)=>a+b,0)}}).sort((a,b)=>b.total-a.total||a.team.name.localeCompare(b.team.name)),[teams,months,points])
 const name=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'
 if(loading)return <p>Loading…</p>
 return <><div className="section-title"><div><div className="eyebrow">Six-month championship</div><h1>Cup Standings</h1><p className="muted">Week 4 head-to-head results determine each month’s Cup points.</p></div></div>{!season?<div className="card">No active season found.</div>:<><div className="card table-wrap"><table><thead><tr><th>#</th><th>Team</th>{months.map(m=><th key={m.id}>{new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</th>)}<th>Total</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.team.id}><td className="rank">{i+1}</td><td><strong>{r.team.name}</strong></td>{r.byMonth.map((v,j)=><td key={months[j].id}>{points.some(p=>p.team_id===r.team.id&&p.league_month_id===months[j].id)?v:'—'}</td>)}<td><strong>{r.total}</strong></td></tr>)}</tbody></table></div>{months.map(m=>{const ms=matchups.filter(x=>x.league_month_id===m.id);const champ=champions.find(c=>c.league_month_id===m.id);if(!ms.length&&!champ)return null;return <div className="card" key={m.id}><div className="section-title compact"><h3>{new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})} Week 4</h3>{champ&&<span className="pill">Monthly Champion: {name(champ.team_id)}</span>}</div>{ms.length>0&&<div className="table-wrap"><table><thead><tr><th>Matchup</th><th>Teams</th><th>Winner</th></tr></thead><tbody>{ms.map(x=><tr key={`${x.seed_high}-${x.seed_low}`}><td>{x.seed_high} vs {x.seed_low}</td><td>{name(x.team_high_id)} vs {name(x.team_low_id)}</td><td>{x.winner_team_id?<strong>{name(x.winner_team_id)}</strong>:'Pending'}</td></tr>)}</tbody></table></div>}</div>})}</>}</>
}
