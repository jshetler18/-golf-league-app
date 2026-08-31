'use client'
import { useEffect,useMemo,useState } from 'react'
import { supabase } from '@/lib/supabase'

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

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    if(!s)return
    const [{data:t},{data:m}]=await Promise.all([
      supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true),
      supabase.from('league_months').select('id,month_start,course_name').eq('season_id',s.id).order('month_start')
    ])
    setTeams((t||[]) as Team[])
    setMonths((m||[]) as Month[])
    if(m?.length)setMonthId(m[0].id)
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
    const ss=scores.filter(s=>s.team_id===t.id&&s.week_number<=3)
    const wk=(n:number)=>ss.find(s=>s.week_number===n)?.official_total
    const handicap=handicaps.find(h=>h.team_id===t.id)?.handicap_points
    return {
      t,
      handicap:handicap==null?null:Number(handicap),
      w1:wk(1),w2:wk(2),w3:wk(3),
      played:ss.length,
      total:ss.reduce((a,s)=>a+Number(s.official_total||0),0)
    }
  }).sort((a,b)=>b.total-a.total),[teams,scores,handicaps])

  const m=months.find(x=>x.id===monthId)

  return <>
    <div className="section-title">
      <div>
        <div className="eyebrow">Weeks 1–3 determine Week 4 seeding</div>
        <h1>Monthly Standings</h1>
        <p className="muted">Adjusted totals include bonus points and the month's team handicap. The handicap shown is added to every round that month.</p>
      </div>
      <label className="field">Month
        <select value={monthId} onChange={e=>setMonthId(e.target.value)}>
          {months.map(x=><option key={x.id} value={x.id}>{new Date(x.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})} — {x.course_name}</option>)}
        </select>
      </label>
    </div>

    {!m?<div className="card">Monthly league setup has not been entered yet.</div>:
      <div className="card table-wrap">
        <table>
          <thead><tr><th>#</th><th>Team</th><th>Handicap</th><th>W1</th><th>W2</th><th>W3</th><th>Rounds</th><th>Total</th></tr></thead>
          <tbody>{rows.map((r,i)=><tr key={r.t.id}>
            <td className="rank">{i+1}</td>
            <td><strong>{r.t.name}</strong></td>
            <td><strong>{r.handicap==null?'—':`${r.handicap>=0?'+':''}${r.handicap.toFixed(1)}`}</strong></td>
            <td>{r.w1==null?'—':Number(r.w1).toFixed(1)}</td>
            <td>{r.w2==null?'—':Number(r.w2).toFixed(1)}</td>
            <td>{r.w3==null?'—':Number(r.w3).toFixed(1)}</td>
            <td>{r.played}</td>
            <td><strong>{r.total.toFixed(1)}</strong></td>
          </tr>)}</tbody>
        </table>
      </div>}
    <p className="muted">Week 4 remains a full scoring round and will be used for the head-to-head placement matches and Cup points.</p>
  </>
}
