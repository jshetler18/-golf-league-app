'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type Team = { id:string; name:string }
type Month = { id:string; month_start:string; course_name:string; bonus_birdie_value:number }
type Score = {
  team_id:string
  week_number:number
  raw_stableford:number
  bonus_birdies:number
  bonus_points:number
  handicap_points:number
  official_total:number|null
  status:string
}
type Matchup = {
  seed_high:number
  seed_low:number
  team_high_id:string
  team_low_id:string
  winner_team_id:string|null
}

function fmt(value:number|null|undefined){
  return value == null ? '—' : Number(value).toFixed(1)
}

function signed(value:number|null|undefined){
  if(value == null) return '—'
  const n=Number(value)
  return `${n>0?'+':''}${n.toFixed(1)}`
}

export default function WeeklyResults(){
  const [teams,setTeams]=useState<Team[]>([])
  const [months,setMonths]=useState<Month[]>([])
  const [monthId,setMonthId]=useState('')
  const [week,setWeek]=useState(1)
  const [scores,setScores]=useState<Score[]>([])
  const [matchups,setMatchups]=useState<Matchup[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{(async()=>{
    setLoading(true)
    const {data:season}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    if(!season){ setLoading(false); return }
    const [{data:teamData},{data:monthData}]=await Promise.all([
      supabase.from('teams').select('id,name').eq('season_id',season.id).eq('is_active',true).order('name'),
      supabase.from('league_months').select('id,month_start,course_name,bonus_birdie_value').eq('season_id',season.id).order('month_start')
    ])
    setTeams((teamData||[]) as Team[])
    const loadedMonths=(monthData||[]) as Month[]
    setMonths(loadedMonths)
    if(loadedMonths.length) setMonthId(loadedMonths[0].id)
    setLoading(false)
  })()},[])

  useEffect(()=>{if(!monthId)return;(async()=>{
    const [{data:scoreData},{data:matchupData}]=await Promise.all([
      supabase.from('weekly_scores').select('team_id,week_number,raw_stableford,bonus_birdies,bonus_points,handicap_points,official_total,status').eq('league_month_id',monthId).eq('status','approved'),
      supabase.from('week4_matchups').select('seed_high,seed_low,team_high_id,team_low_id,winner_team_id').eq('league_month_id',monthId).order('seed_high')
    ])
    setScores((scoreData||[]) as Score[])
    setMatchups((matchupData||[]) as Matchup[])
  })()},[monthId])

  const month=months.find(m=>m.id===monthId)
  const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'

  const rows=useMemo(()=>teams.map(team=>{
    const score=scores.find(s=>s.team_id===team.id&&s.week_number===week)
    const matchup=week===4?matchups.find(m=>m.team_high_id===team.id||m.team_low_id===team.id):undefined
    const opponentId=matchup?(matchup.team_high_id===team.id?matchup.team_low_id:matchup.team_high_id):null
    const opponentScore=opponentId?scores.find(s=>s.team_id===opponentId&&s.week_number===4):undefined
    let result='—'
    if(matchup){
      if(matchup.winner_team_id) result=matchup.winner_team_id===team.id?'Winner':'Lost'
      else if(score&&opponentScore&&Number(score.official_total)===Number(opponentScore.official_total)) result='Tie — Pending'
      else result='Pending'
    }
    return {team,score,matchup,opponentId,result}
  }).sort((a,b)=>{
    const aHas=a.score?.official_total!=null, bHas=b.score?.official_total!=null
    if(aHas&&bHas) return Number(b.score?.official_total)-Number(a.score?.official_total)
    if(aHas) return -1
    if(bHas) return 1
    return a.team.name.localeCompare(b.team.name)
  }),[teams,scores,week,matchups])

  if(loading) return <PlayerPage title="Results"><p>Loading…</p></PlayerPage>

  return <PlayerPage title="Results">
    <div className="section-title results-heading">
      <div>
        <div className="eyebrow">Player results</div>
        <h1>Weekly Results</h1>
        <p className="muted">View each team&apos;s official weekly score breakdown. Scores shown here are read-only and are entered by the league administrator.</p>
      </div>
      <div className="results-filters">
        <label className="field">Month
          <select value={monthId} onChange={e=>setMonthId(e.target.value)}>
            {months.map(m=><option key={m.id} value={m.id}>{new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})} — {m.course_name}</option>)}
          </select>
        </label>
        <label className="field">Week
          <select value={week} onChange={e=>setWeek(Number(e.target.value))}>
            {[1,2,3,4].map(w=><option key={w} value={w}>Week {w}</option>)}
          </select>
        </label>
      </div>
    </div>

    {!month?<div className="card">Monthly league setup has not been entered yet.</div>:<>
      <div className="card results-summary">
        <div><span className="eyebrow">Month</span><strong>{new Date(month.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong></div>
        <div><span className="eyebrow">Course</span><strong>{month.course_name}</strong></div>
        <div><span className="eyebrow">Viewing</span><strong>Week {week}</strong></div>
        <div><span className="eyebrow">Bonus birdie</span><strong>+{Number(month.bonus_birdie_value).toFixed(1)}</strong></div>
      </div>

      <div className="card table-wrap results-table-card player-mobile-cards">
        <table className="results-table">
          <thead><tr>
            <th>Team</th>
            <th>Raw Stableford</th>
            <th>Bonus Birdies</th>
            <th>Bonus Points</th>
            <th>Handicap</th>
            <th>Adjusted Total</th>
            {week===4&&<><th>Opponent</th><th>Result</th></>}
          </tr></thead>
          <tbody>{rows.map(r=><tr key={r.team.id} className={r.result==='Winner'?'week4-winner':undefined}>
            <td data-primary="true"><strong>{r.team.name}</strong></td>
            <td data-label="Raw Stableford">{fmt(r.score?.raw_stableford)}</td>
            <td data-label="Bonus Birdies">{r.score?Number(r.score.bonus_birdies):'—'}</td>
            <td data-label="Bonus Points">{fmt(r.score?.bonus_points)}</td>
            <td data-label="Handicap">{signed(r.score?.handicap_points)}</td>
            <td className="official-score" data-label="Adjusted Total" data-total="true"><strong>{fmt(r.score?.official_total)}</strong></td>
            {week===4&&<>
              <td data-label="Opponent">{r.opponentId?teamName(r.opponentId):'—'}</td>
              <td data-label="Result">{r.matchup?<span className={`result-pill ${r.result==='Winner'?'winner':r.result==='Lost'?'lost':'pending'}`}>{r.result}</span>:'—'}</td>
            </>}
          </tr>)}</tbody>
        </table>
      </div>
      <p className="muted results-note">Official Total = Raw Stableford + bonus points + monthly team handicap. Week 4 winners and Cup points are determined from the official adjusted totals.</p>
    </>}
  </PlayerPage>
}
