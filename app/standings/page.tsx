'use client'
import { useEffect,useMemo,useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type Team={id:string;name:string}
type Month={id:string;month_start:string;course_name:string}
type Score={team_id:string;week_number:number;official_total:number|null}
type Handicap={team_id:string;handicap_points:number}

export default function Standings(){
  const [teams,setTeams]=useState<Team[]>([])
  const [months,setMonths]=useState<Month[]>([])
  const [monthId,setMonthId]=useState('')
  const [scores,setScores]=useState<Score[]>([])
  const [handicaps,setHandicaps]=useState<Handicap[]>([])
  const [myTeamId,setMyTeamId]=useState<string|null>(null)

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    const {data:s}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    if(!s)return

    const requests:any[]=[
      supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true),
      supabase.from('league_months').select('id,month_start,course_name').eq('season_id',s.id).order('month_start')
    ]
    const [{data:t},{data:m}]=await Promise.all(requests)
    setTeams((t||[]) as Team[])
    setMonths((m||[]) as Month[])

    if(m?.length){
      const today=new Date()
      const current=(m as Month[]).find((x:any)=>{
        const d=new Date(x.month_start+'T12:00:00')
        return d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()
      })
      setMonthId((current||m[0]).id)
    }

    if(user){
      const {data:p}=await supabase.from('profiles').select('player_id').eq('id',user.id).maybeSingle()
      if(p?.player_id){
        const {data:player}=await supabase.from('players').select('team_id').eq('id',p.player_id).maybeSingle()
        if(player?.team_id)setMyTeamId(player.team_id)
      }
    }
  })()},[])

  useEffect(()=>{if(monthId)(async()=>{
    const [{data:scoreData},{data:handicapData}]=await Promise.all([
      supabase.from('weekly_scores').select('team_id,week_number,official_total').eq('league_month_id',monthId).eq('status','approved'),
      supabase.from('monthly_team_handicaps').select('team_id,handicap_points').eq('league_month_id',monthId)
    ])
    setScores((scoreData||[]) as Score[])
    setHandicaps((handicapData||[]) as Handicap[])
  })()},[monthId])

  const rows=useMemo(()=>teams.map(t=>{
    const seedingScores=scores.filter(s=>s.team_id===t.id&&s.week_number<=3)
    const handicap=handicaps.find(h=>h.team_id===t.id)?.handicap_points
    return {
      t,
      handicap:handicap==null?null:Number(handicap),
      played:seedingScores.length,
      total:seedingScores.reduce((a,s)=>a+Number(s.official_total||0),0)
    }
  }).sort((a,b)=>b.total-a.total||a.t.name.localeCompare(b.t.name)),[teams,scores,handicaps])

  const m=months.find(x=>x.id===monthId)
  const maxRounds=Math.max(0,...rows.map(r=>r.played))
  const monthName=m?new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'}):''

  return <PlayerPage title="">
    <div className="standings-v1228">
      <div className="standings-top-v1228">
        <div>
          <h1>Monthly Standings</h1>
          {m&&<p className="muted">{monthName} at {m.course_name}</p>}
        </div>
        <label className="field standings-month-select">Month
          <select value={monthId} onChange={e=>setMonthId(e.target.value)}>
            {months.map(x=><option key={x.id} value={x.id}>{new Date(x.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})} — {x.course_name}</option>)}
          </select>
        </label>
      </div>

      {!m?<div className="card">Monthly league setup has not been entered yet.</div>:<>
        <div className="standings-progress-v1228 card">
          <div>
            <small>WEEK 4 SEEDING</small>
            <strong>{maxRounds>=3?'Seeding Complete':`${maxRounds} of 3 rounds complete`}</strong>
          </div>
          <span>{maxRounds>=3?'Seeds are set for Match Play':'Standings update as approved scores are posted'}</span>
        </div>

        <div className="card standings-board-v1228">
          <div className="standings-board-head-v1228">
            <div>
              <small>LIVE RACE</small>
              <h2>{monthName} Standings</h2>
            </div>
            <span>Weeks 1–3</span>
          </div>
          <div className="standings-scroll-v1228">
            <div className="standings-grid-v1228 header">
              <span>Rank</span><span>Team</span><span>Rounds</span><span>HCP</span><span>Total</span><span>W4 Seed</span>
            </div>
            {rows.map((r,i)=>{
              const isMine=r.t.id===myTeamId
              return <div className={'standings-grid-v1228 row '+(isMine?'my-team-row':'')} key={r.t.id}>
                <span className="standings-rank-v1228">{i+1}</span>
                <span className="standings-team-v1228"><strong>{r.t.name}</strong>{isMine&&<small>MY TEAM</small>}</span>
                <span>{r.played}/3</span>
                <span>{r.handicap==null?'—':`${r.handicap>=0?'+':''}${r.handicap.toFixed(1)}`}</span>
                <span className="standings-total-v1228">{r.played?Number(r.total).toFixed(1):'—'}</span>
                <span className="standings-seed-v1228">#{i+1}</span>
              </div>
            })}
          </div>
        </div>

        <p className="muted standings-note-v1228">The Week 4 seed is the team's projected seed based on the current Weeks 1–3 total. Week 4 is a separate head-to-head match and still counts as a full scoring round.</p>
      </>}
    </div>
  </PlayerPage>
}
