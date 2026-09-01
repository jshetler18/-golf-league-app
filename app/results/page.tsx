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
  high_points_awarded:number|null
  low_points_awarded:number|null
}
type CupPoint = { team_id:string; points:number }
type MonthlyChampion = { team_id:string }

function fmt(value:number|null|undefined){
  return value == null ? '—' : Number(value).toFixed(1)
}

function signed(value:number|null|undefined){
  if(value == null) return '—'
  const n=Number(value)
  return `${n>0?'+':''}${n.toFixed(1)}`
}

function ordinal(value:number){
  const mod100=value%100
  if(mod100>=11&&mod100<=13)return `${value}th`
  if(value%10===1)return `${value}st`
  if(value%10===2)return `${value}nd`
  if(value%10===3)return `${value}rd`
  return `${value}th`
}

export default function WeeklyResults(){
  const [teams,setTeams]=useState<Team[]>([])
  const [months,setMonths]=useState<Month[]>([])
  const [monthId,setMonthId]=useState('')
  const [week,setWeek]=useState(1)
  const [scores,setScores]=useState<Score[]>([])
  const [matchups,setMatchups]=useState<Matchup[]>([])
  const [cupPoints,setCupPoints]=useState<CupPoint[]>([])
  const [champion,setChampion]=useState<MonthlyChampion|null>(null)
  const [loading,setLoading]=useState(true)
  const [monthLoading,setMonthLoading]=useState(false)

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
    if(loadedMonths.length){
      const now=new Date()
      const current=loadedMonths.find(m=>{
        const d=new Date(m.month_start+'T12:00:00')
        return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()
      })
      setMonthId((current||loadedMonths[0]).id)
    }
    setLoading(false)
  })()},[])

  useEffect(()=>{if(!monthId)return;(async()=>{
    setMonthLoading(true)
    const [{data:scoreData},{data:matchupData},{data:pointData},{data:championData}]=await Promise.all([
      supabase.from('weekly_scores').select('team_id,week_number,raw_stableford,bonus_birdies,bonus_points,handicap_points,official_total,status').eq('league_month_id',monthId).eq('status','approved'),
      supabase.from('week4_matchups').select('seed_high,seed_low,team_high_id,team_low_id,winner_team_id,high_points_awarded,low_points_awarded').eq('league_month_id',monthId).order('seed_high'),
      supabase.from('cup_points').select('team_id,points').eq('league_month_id',monthId),
      supabase.from('monthly_champions').select('team_id').eq('league_month_id',monthId).limit(1).maybeSingle()
    ])
    setScores((scoreData||[]) as Score[])
    setMatchups((matchupData||[]) as Matchup[])
    setCupPoints((pointData||[]) as CupPoint[])
    setChampion((championData||null) as MonthlyChampion|null)
    setMonthLoading(false)
  })()},[monthId])

  const month=months.find(m=>m.id===monthId)
  const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'
  const championName=champion?teamName(champion.team_id):''
  const approvedThisWeek=scores.filter(s=>s.week_number===week&&s.official_total!=null)
  const weekComplete=teams.length>0&&approvedThisWeek.length===teams.length
  const monthlyCupPoints=new Map(cupPoints.map(p=>[p.team_id,Number(p.points||0)]))

  const rows=useMemo(()=>{
    const ranked=teams.map(team=>{
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
      let awarded:number|null=null
      if(matchup){
        awarded=matchup.team_high_id===team.id?matchup.high_points_awarded:matchup.low_points_awarded
      }
      return {team,score,matchup,opponentId,result,awarded}
    }).sort((a,b)=>{
      const aHas=a.score?.official_total!=null, bHas=b.score?.official_total!=null
      if(aHas&&bHas) return Number(b.score?.official_total)-Number(a.score?.official_total)
      if(aHas) return -1
      if(bHas) return 1
      return a.team.name.localeCompare(b.team.name)
    })
    return ranked.map((row,index)=>({...row,place:row.score?.official_total!=null?index+1:null}))
  },[teams,scores,week,matchups])

  if(loading) return <PlayerPage title="Results"><p>Loading…</p></PlayerPage>

  return <PlayerPage title="Results">
    <div className="section-title results-heading results-heading-v1224">
      <div>
        <div className="eyebrow">League history</div>
        <h1>Results</h1>
        <p className="muted">Choose a month and week to review the official league results.</p>
      </div>
      <label className="field results-month-select">Month
        <select value={monthId} onChange={e=>setMonthId(e.target.value)}>
          {months.map(m=><option key={m.id} value={m.id}>{new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})} — {m.course_name}</option>)}
        </select>
      </label>
    </div>

    {!month?<div className="card">Monthly league setup has not been entered yet.</div>:<>
      <div className="results-week-tabs" aria-label="Choose week">
        {[1,2,3,4].map(w=><button key={w} type="button" className={week===w?'active':''} onClick={()=>setWeek(w)}>Week {w}</button>)}
      </div>

      <div className="card results-summary results-summary-v1224">
        <div><span className="eyebrow">Month</span><strong>{new Date(month.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong></div>
        <div><span className="eyebrow">Course</span><strong>{month.course_name}</strong></div>
        <div><span className="eyebrow">Viewing</span><strong>Week {week}</strong></div>
        <div><span className="eyebrow">Status</span><strong>{weekComplete?'Complete':'In Progress'}</strong></div>
      </div>

      {champion&&<div className="card monthly-champion-banner">
        <span className="monthly-champion-trophy" aria-hidden="true">🏆</span>
        <div><span className="eyebrow">Monthly Champion</span><strong>{championName}</strong><small>{new Date(month.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</small></div>
      </div>}

      {monthLoading?<div className="card">Loading results…</div>:<>
        <div className="results-section-label">
          <div><span className="eyebrow">Official results</span><h2>Week {week} Finishing Order</h2></div>
          <span className="pill">{approvedThisWeek.length} of {teams.length} posted</span>
        </div>

        <div className="card table-wrap results-table-card player-mobile-cards results-table-card-v1224">
          <table className="results-table results-table-v1224">
            <thead><tr>
              <th>Place</th>
              <th>Team</th>
              <th>Raw</th>
              <th>Birdies</th>
              <th>Bonus</th>
              <th>Handicap</th>
              <th>Official Total</th>
              {week===4&&<><th>Opponent</th><th>Match</th><th>Cup Points</th></>}
            </tr></thead>
            <tbody>{rows.map(r=><tr key={r.team.id} className={r.result==='Winner'?'week4-winner':undefined}>
              <td data-label="Place" className="results-place">{r.place?<span className={`place-badge place-${r.place}`}>{ordinal(r.place)}</span>:'—'}</td>
              <td data-primary="true"><strong>{r.team.name}</strong></td>
              <td data-label="Raw Stableford">{fmt(r.score?.raw_stableford)}</td>
              <td data-label="Bonus Birdies">{r.score?Number(r.score.bonus_birdies):'—'}</td>
              <td data-label="Bonus Points">{fmt(r.score?.bonus_points)}</td>
              <td data-label="Handicap">{signed(r.score?.handicap_points)}</td>
              <td className="official-score" data-label="Official Total" data-total="true"><strong>{fmt(r.score?.official_total)}</strong></td>
              {week===4&&<>
                <td data-label="Opponent">{r.opponentId?teamName(r.opponentId):'—'}</td>
                <td data-label="Match Result">{r.matchup?<span className={`result-pill ${r.result==='Winner'?'winner':r.result==='Lost'?'lost':'pending'}`}>{r.result}</span>:'—'}</td>
                <td data-label="Cup Points"><strong>{r.awarded!=null?r.awarded:(monthlyCupPoints.has(r.team.id)?monthlyCupPoints.get(r.team.id):'—')}</strong></td>
              </>}
            </tr>)}</tbody>
          </table>
        </div>
      </>}

      <p className="muted results-note">Official Total = Raw Stableford + bonus points + monthly team handicap. Week 4 shows the head-to-head result and Cup points after they have been awarded.</p>
    </>}
  </PlayerPage>
}
