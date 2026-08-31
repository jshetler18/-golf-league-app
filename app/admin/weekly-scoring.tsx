'use client'
import { useEffect,useMemo,useState } from 'react'
import { supabase } from '@/lib/supabase'

type Team={id:string;name:string}
type Month={id:string;month_start:string;course_name:string;bonus_birdie_value:number}
type Score={id?:string;league_month_id:string;team_id:string;week_number:number;raw_stableford:number;bonus_birdies:number;bonus_points:number;handicap_points:number;official_total:number|null;status:string}
type Handicap={team_id:string;handicap_points:number}
type Matchup={id:string;seed_high:number;seed_low:number;team_high_id:string;team_low_id:string;winner_team_id:string|null}

const pointMap:Record<number,[number,number]>={1:[1000,800],3:[700,600],5:[500,400],7:[300,200],9:[100,0]}

export default function WeeklyScoring({seasonId,teams}:{seasonId:string;teams:Team[]}){
 const [months,setMonths]=useState<Month[]>([]),[monthId,setMonthId]=useState(''),[week,setWeek]=useState(1),[scores,setScores]=useState<Score[]>([]),[handicaps,setHandicaps]=useState<Handicap[]>([]),[draft,setDraft]=useState<Record<string,{raw:string;birdies:string}>>({}),[msg,setMsg]=useState(''),[saving,setSaving]=useState(false)
 async function loadMonths(){if(!seasonId)return;const {data}=await supabase.from('league_months').select('id,month_start,course_name,bonus_birdie_value').eq('season_id',seasonId).order('month_start');setMonths((data||[]) as Month[]);if(data?.length&&!monthId)setMonthId(data[0].id)}
 async function loadScores(){if(!monthId)return;const [{data:s},{data:h}]=await Promise.all([supabase.from('weekly_scores').select('*').eq('league_month_id',monthId),supabase.from('monthly_team_handicaps').select('team_id,handicap_points').eq('league_month_id',monthId)]);setScores((s||[]) as Score[]);setHandicaps((h||[]) as Handicap[]);const d:Record<string,{raw:string;birdies:string}>={};teams.forEach(t=>{const x=(s||[]).find((z:any)=>z.team_id===t.id&&z.week_number===week);d[t.id]={raw:x?String(x.raw_stableford):'',birdies:x?String(x.bonus_birdies):''}});setDraft(d)}
 useEffect(()=>{loadMonths()},[seasonId]);useEffect(()=>{loadScores()},[monthId,week,teams.length])
 const month=months.find(m=>m.id===monthId);const hv=(id:string)=>Number(handicaps.find(h=>h.team_id===id)?.handicap_points||0)

 async function syncCompletedWeek4(){
   const [{data:m,error:matchLoadErr},{data:s,error:scoreLoadErr}]=await Promise.all([
     supabase.from('week4_matchups').select('id,seed_high,seed_low,team_high_id,team_low_id,winner_team_id').eq('league_month_id',monthId).order('seed_high'),
     supabase.from('weekly_scores').select('team_id,official_total').eq('league_month_id',monthId).eq('week_number',4).eq('status','approved')
   ])
   if(matchLoadErr)throw matchLoadErr
   if(scoreLoadErr)throw scoreLoadErr
   const matchups=(m||[]) as Matchup[]
   const scoreMap=new Map((s||[]).map((x:any)=>[x.team_id,Number(x.official_total)]))
   let completed=0
   for(const matchup of matchups){
     const hasHigh=scoreMap.has(matchup.team_high_id),hasLow=scoreMap.has(matchup.team_low_id)
     if(!hasHigh||!hasLow)continue
     const highScore=Number(scoreMap.get(matchup.team_high_id)),lowScore=Number(scoreMap.get(matchup.team_low_id))
     if(highScore===lowScore){
       // Preserve an admin-selected winner for an exact tie. This lets the league
       // apply its own tiebreaker without a later score save erasing the decision.
       if(matchup.winner_team_id)continue
       const {error:e1}=await supabase.from('week4_matchups').update({winner_team_id:null,high_points_awarded:null,low_points_awarded:null}).eq('id',matchup.id)
       if(e1)throw e1
       const {error:e2}=await supabase.from('cup_points').delete().eq('league_month_id',monthId).in('team_id',[matchup.team_high_id,matchup.team_low_id])
       if(e2)throw e2
       if(matchup.seed_high===1){const {error:e3}=await supabase.from('monthly_champions').delete().eq('league_month_id',monthId);if(e3)throw e3}
       continue
     }
     const highWins=highScore>lowScore
     const [winnerPts,loserPts]=pointMap[matchup.seed_high]
     const winnerId=highWins?matchup.team_high_id:matchup.team_low_id
     const highPts=highWins?winnerPts:loserPts,lowPts=highWins?loserPts:winnerPts
     const highPlacement=highWins?matchup.seed_high:matchup.seed_low,lowPlacement=highWins?matchup.seed_low:matchup.seed_high
     const {error:e1}=await supabase.from('week4_matchups').update({winner_team_id:winnerId,high_points_awarded:highPts,low_points_awarded:lowPts}).eq('id',matchup.id)
     if(e1)throw e1
     const {error:e2}=await supabase.from('cup_points').upsert([
       {league_month_id:monthId,team_id:matchup.team_high_id,points:highPts,placement:highPlacement},
       {league_month_id:monthId,team_id:matchup.team_low_id,points:lowPts,placement:lowPlacement}
     ],{onConflict:'league_month_id,team_id'})
     if(e2)throw e2
     if(matchup.seed_high===1){const {error:e3}=await supabase.from('monthly_champions').upsert({league_month_id:monthId,team_id:winnerId},{onConflict:'league_month_id'});if(e3)throw e3}
     completed++
   }
   return completed
 }

 async function saveAll(){
   if(!month)return
   const rows=teams.flatMap(team=>{
     const d=draft[team.id]||{raw:'',birdies:''}
     if(d.raw==='')return []
     const raw=Number(d.raw),birdies=Number(d.birdies||0)
     if(!Number.isFinite(raw)||!Number.isFinite(birdies)||birdies<0)return []
     return [{league_month_id:monthId,team_id:team.id,week_number:week,raw_stableford:raw,bonus_birdies:birdies,bonus_points:birdies*Number(month.bonus_birdie_value),handicap_points:hv(team.id),status:'approved'}]
   })
   if(!rows.length){setMsg('Enter at least one raw Stableford score before saving.');return}
   setSaving(true);setMsg('')
   const {error}=await supabase.from('weekly_scores').upsert(rows,{onConflict:'league_month_id,team_id,week_number'})
   if(error){setSaving(false);setMsg(error.message);return}
   try{
     let extra=''
     if(week===4){const completed=await syncCompletedWeek4();extra=completed?` ${completed} completed Week 4 matchup${completed===1?'':'s'} updated in the Cup standings.`:' Week 4 scores saved; completed head-to-head matchups will update automatically as both teams post scores.'}
     setMsg(`${rows.length} team score${rows.length===1?'':'s'} saved.${extra}`)
     await loadScores()
   }catch(e:any){setMsg(`Scores saved, but Week 4 Cup update failed: ${e?.message||'Unknown error'}`)}
   setSaving(false)
 }

 const standings=useMemo(()=>teams.map(t=>{const ss=scores.filter(s=>s.team_id===t.id&&s.week_number<=3);return {team:t,total:ss.reduce((a,s)=>a+Number(s.official_total||0),0),played:ss.length}}).sort((a,b)=>b.total-a.total),[scores,teams])
 return <section><div className="section-title"><div><h2>Weekly Scoring & Standings</h2><p className="muted">Enter scores for as many teams as you want, then save the whole week once. Bonus points and the saved monthly handicap are calculated automatically.</p></div></div>{msg&&<p className="message">{msg}</p>}<div className="card"><div className="form-grid"><label className="field">Month<select value={monthId} onChange={e=>setMonthId(e.target.value)}>{months.map(m=><option key={m.id} value={m.id}>{new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})} — {m.course_name}</option>)}</select></label><label className="field">Week<select value={week} onChange={e=>setWeek(Number(e.target.value))}>{[1,2,3,4].map(w=><option key={w} value={w}>Week {w}</option>)}</select></label></div>{!month?<p className="muted">Save a Monthly League Setup first.</p>:<><div className="table-wrap"><table><thead><tr><th>Team</th><th>Raw Stableford</th><th>Bonus Birdies</th><th>Bonus</th><th>Handicap</th><th>Official Total</th></tr></thead><tbody>{teams.map(t=>{const d=draft[t.id]||{raw:'',birdies:''};const bonus=Number(d.birdies||0)*Number(month.bonus_birdie_value),total=d.raw===''?null:Number(d.raw)+bonus+hv(t.id);return <tr key={t.id}><td><strong>{t.name}</strong></td><td><input type="number" step="0.1" value={d.raw} onChange={e=>setDraft(v=>({...v,[t.id]:{...d,raw:e.target.value}}))}/></td><td><input type="number" min="0" value={d.birdies} onChange={e=>setDraft(v=>({...v,[t.id]:{...d,birdies:e.target.value}}))}/></td><td>{bonus.toFixed(1)}</td><td>{hv(t.id).toFixed(1)}</td><td><strong>{total===null?'—':total.toFixed(1)}</strong></td></tr>})}</tbody></table></div><div style={{marginTop:'1rem'}}><button className="btn" disabled={saving} onClick={saveAll}>{saving?'Saving…':`Save Week ${week} Scores`}</button></div></>}</div>{month&&<div className="card"><h3>Weeks 1–3 Seeding Preview</h3><div className="table-wrap"><table><thead><tr><th>#</th><th>Team</th><th>Rounds</th><th>Adjusted Total</th></tr></thead><tbody>{standings.map((r,i)=><tr key={r.team.id}><td className="rank">{i+1}</td><td>{r.team.name}</td><td>{r.played}</td><td><strong>{r.total.toFixed(1)}</strong></td></tr>)}</tbody></table></div></div>}</section>
}
