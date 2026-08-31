'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Team={id:string;name:string}
type Month={id:string;month_start:string;course_name:string}
type Score={team_id:string;week_number:number;official_total:number|null}
type Matchup={id?:string;league_month_id:string;seed_high:number;seed_low:number;team_high_id:string;team_low_id:string;winner_team_id:string|null;high_points_awarded:number|null;low_points_awarded:number|null}

const pointMap:Record<number,[number,number]>={1:[1000,800],3:[700,600],5:[500,400],7:[300,200],9:[100,0]}

export default function Week4Cup({seasonId,teams}:{seasonId:string;teams:Team[]}){
  const [months,setMonths]=useState<Month[]>([])
  const [monthId,setMonthId]=useState('')
  const [scores,setScores]=useState<Score[]>([])
  const [matchups,setMatchups]=useState<Matchup[]>([])
  const [msg,setMsg]=useState('')
  const [busy,setBusy]=useState(false)

  async function loadMonths(){
    if(!seasonId)return
    const {data}=await supabase.from('league_months').select('id,month_start,course_name').eq('season_id',seasonId).order('month_start')
    setMonths((data||[]) as Month[])
    if(data?.length&&!monthId)setMonthId(data[0].id)
  }

  async function loadMonthData(){
    if(!monthId)return
    const [{data:s},{data:m}]=await Promise.all([
      supabase.from('weekly_scores').select('team_id,week_number,official_total').eq('league_month_id',monthId),
      supabase.from('week4_matchups').select('*').eq('league_month_id',monthId).order('seed_high')
    ])
    setScores((s||[]) as Score[])
    setMatchups((m||[]) as Matchup[])
  }

  useEffect(()=>{loadMonths()},[seasonId])
  useEffect(()=>{loadMonthData()},[monthId])

  const seedRows=useMemo(()=>teams.map(t=>{
    const s=scores.filter(x=>x.team_id===t.id&&x.week_number<=3)
    return {team:t,played:s.length,total:s.reduce((a,x)=>a+Number(x.official_total||0),0)}
  }).sort((a,b)=>b.total-a.total||a.team.name.localeCompare(b.team.name)),[scores,teams])

  const allThree=teams.length===10&&seedRows.every(r=>r.played===3)
  const tiedPairs=seedRows.flatMap((r,i)=>i>0&&r.total===seedRows[i-1].total?[`${seedRows[i-1].team.name} and ${r.team.name} (${r.total.toFixed(1)})`]:[])
  const tied=tiedPairs.length>0
  const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'
  const week4=(id:string)=>scores.find(s=>s.team_id===id&&s.week_number===4)

  async function generate(){
    if(!allThree){setMsg('All 10 teams need Weeks 1–3 scores before Week 4 matchups can be generated.');return}
    if(tied){setMsg(`Tie in Weeks 1–3 seeding: ${tiedPairs.join(', ')}. Adjust the tied score or use your league tiebreaker before generating matchups.`);return}
    setBusy(true);setMsg('')
    const pairs:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[1,2],[3,4],[5,6],[7,8],[9,10]]
    const payload=pairs.map(([hi,lo])=>({league_month_id:monthId,seed_high:hi,seed_low:lo,team_high_id:seedRows[hi-1].team.id,team_low_id:seedRows[lo-1].team.id,winner_team_id:null,high_points_awarded:null,low_points_awarded:null}))
    const {error}=await supabase.from('week4_matchups').upsert(payload,{onConflict:'league_month_id,seed_high,seed_low'})
    setBusy(false);setMsg(error?error.message:'Week 4 matchups generated from Weeks 1–3 standings.')
    if(!error)loadMonthData()
  }

  async function finalize(){
    if(matchups.length!==5){setMsg('Generate the five Week 4 matchups first.');return}
    const missing=matchups.filter(m=>!week4(m.team_high_id)||!week4(m.team_low_id))
    if(missing.length){setMsg('Both teams in every matchup need a Week 4 score before Cup points can be finalized.');return}
    const ties=matchups.filter(m=>Number(week4(m.team_high_id)?.official_total||0)===Number(week4(m.team_low_id)?.official_total||0))
    if(ties.length){setMsg('A Week 4 matchup is tied. Resolve the tied score before finalizing Cup points.');return}
    setBusy(true);setMsg('')
    for(const m of matchups){
      const highScore=Number(week4(m.team_high_id)?.official_total||0)
      const lowScore=Number(week4(m.team_low_id)?.official_total||0)
      const highWins=highScore>lowScore
      const [winnerPts,loserPts]=pointMap[m.seed_high]
      const winnerId=highWins?m.team_high_id:m.team_low_id
      const highPts=highWins?winnerPts:loserPts
      const lowPts=highWins?loserPts:winnerPts
      const highPlacement=highWins?m.seed_high:m.seed_low
      const lowPlacement=highWins?m.seed_low:m.seed_high
      const {error:matchErr}=await supabase.from('week4_matchups').update({winner_team_id:winnerId,high_points_awarded:highPts,low_points_awarded:lowPts}).eq('id',m.id)
      if(matchErr){setBusy(false);setMsg(matchErr.message);return}
      const {error:cupErr}=await supabase.from('cup_points').upsert([
        {league_month_id:monthId,team_id:m.team_high_id,points:highPts,placement:highPlacement},
        {league_month_id:monthId,team_id:m.team_low_id,points:lowPts,placement:lowPlacement}
      ],{onConflict:'league_month_id,team_id'})
      if(cupErr){setBusy(false);setMsg(cupErr.message);return}
      if(m.seed_high===1){
        const {error:champErr}=await supabase.from('monthly_champions').upsert({league_month_id:monthId,team_id:winnerId},{onConflict:'league_month_id'})
        if(champErr){setBusy(false);setMsg(champErr.message);return}
      }
    }
    setBusy(false);setMsg('Week 4 finalized. Cup points and the monthly champion are saved.')
    loadMonthData()
  }

  const month=months.find(m=>m.id===monthId)
  return <section>
    <div className="section-title"><div><h2>Week 4 Matchups & Cup Points</h2><p className="muted">Weeks 1–3 determine the seeds. Week 4 head-to-head results award Cup points.</p></div></div>
    {msg&&<p className="message">{msg}</p>}
    <div className="card">
      <div className="form-grid"><label className="field">Month<select value={monthId} onChange={e=>setMonthId(e.target.value)}>{months.map(m=><option key={m.id} value={m.id}>{new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})} — {m.course_name}</option>)}</select></label></div>
      {!month?<p className="muted">Save a Monthly League Setup first.</p>:<>
        <h3>Weeks 1–3 Seeding</h3>
        <div className="table-wrap"><table><thead><tr><th>Seed</th><th>Team</th><th>Rounds</th><th>Adjusted Total</th></tr></thead><tbody>{seedRows.map((r,i)=><tr key={r.team.id}><td className="rank">{i+1}</td><td>{r.team.name}</td><td>{r.played}/3</td><td><strong>{r.total.toFixed(1)}</strong></td></tr>)}</tbody></table></div>
        <p className="muted">Matchups: 1 vs 2, 3 vs 4, 5 vs 6, 7 vs 8, 9 vs 10.</p>
        {tied&&<p className="message"><strong>Seeding tie:</strong> {tiedPairs.join(', ')}. The button stays available so the reason is visible when clicked, but the tie must be resolved before matchups are created.</p>}
        <button className="btn" disabled={busy||!allThree} onClick={generate}>{matchups.length?'Regenerate Week 4 Matchups':'Generate Week 4 Matchups'}</button>
      </>}
    </div>
    {matchups.length>0&&<div className="card"><h3>Week 4 Head-to-Head</h3><div className="table-wrap"><table><thead><tr><th>Matchup</th><th>Higher Seed</th><th>W4 Score</th><th>Lower Seed</th><th>W4 Score</th><th>Result</th></tr></thead><tbody>{matchups.map(m=>{const hs=week4(m.team_high_id),ls=week4(m.team_low_id);const winner=m.winner_team_id;return <tr key={m.id}><td>{m.seed_high} vs {m.seed_low}</td><td>{teamName(m.team_high_id)}</td><td>{hs?.official_total==null?'—':Number(hs.official_total).toFixed(1)}</td><td>{teamName(m.team_low_id)}</td><td>{ls?.official_total==null?'—':Number(ls.official_total).toFixed(1)}</td><td>{winner?<strong>{teamName(winner)} wins</strong>:'Pending'}</td></tr>})}</tbody></table></div><p className="muted">Cup awards: 1000/800, 700/600, 500/400, 300/200, and 100/0.</p><button className="btn" disabled={busy} onClick={finalize}>Finalize Week 4 & Award Cup Points</button></div>}
  </section>
}
