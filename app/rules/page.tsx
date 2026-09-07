'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PlayerPage } from '@/components/PlayerMobileChrome'
import { supabase } from '@/lib/supabase'
import {RichTextDisplay} from '@/components/RichTextEditor'

type RuleSection={heading:string;body:string}
type RulePage={page_title:string;sections:RuleSection[]}
type LeagueMonth={
  id:string
  month_start:string
  course_name:string
  bonus_hole_1:number|null
  bonus_hole_2:number|null
  bonus_birdie_value:number
  elevation_ft:number
  stimp_options:number[]
  gimmie_feet:number
  wind:string
  greens:string
  fairways:string
  mulligans:boolean
  pins_week_1:string|null
  pins_week_2:string|null
  pins_week_3:string|null
  pins_week_4:string|null
}
type TeeAssignment={player_id:string;tee_color:string;yardage:number|null}
type Player={id:string;full_name:string;team_id:string|null}
type Team={id:string;name:string}

const fallback:RulePage={
  page_title:'League Rules',
  sections:[
    {heading:'Monthly Format',body:'Each team plays one round per week for four rounds each month. The first 10 holes use Stableford scoring, with two designated bonus par-3 holes from the back nine.'},
    {heading:'Stableford Points',body:'Albatross 5 · Eagle 4 · Birdie 3 · Par 2 · Bogey 1 · Double bogey or worse 0.'},
    {heading:'Week 4 Match Play & Cup Points',body:'Seeds 1–2 award 1,000/800; 3–4 award 700/600; 5–6 award 500/400; 7–8 award 300/200; 9–10 award 100/0. Ties are resolved by the league administrator.'},
    {heading:'Official Weekly Score',body:'Raw Stableford + bonus points + monthly team handicap.'}
  ]
}

const teeNames:Record<string,string>={
  turquoise:'Forward',
  red:'Senior',
  yellow:'Middle',
  blue:'Back',
  black:'Tips',
  green:'Green',
  gray:'Gray'
}
const teeClass=(color:string)=>['turquoise','red','yellow','blue','black'].includes(color.toLowerCase())?`tee-${color.toLowerCase()}`:''
const teeColorLabel=(color:string)=>color?color.trim().toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()):'Not set'
const monthLabel=(value:string)=>new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('en-US',{month:'long',year:'numeric'})

export default function Rules(){
  const [rules,setRules]=useState<RulePage>(fallback)
  const [loading,setLoading]=useState(true)
  const [scoreCap,setScoreCap]=useState(30)
  const [tab,setTab]=useState<'rules'|'settings'>('rules')
  const [months,setMonths]=useState<LeagueMonth[]>([])
  const [selectedMonthId,setSelectedMonthId]=useState('')
  const [tees,setTees]=useState<Record<string,TeeAssignment[]>>({})
  const [players,setPlayers]=useState<Player[]>([])
  const [teams,setTeams]=useState<Team[]>([])
  const [handicaps,setHandicaps]=useState<Record<string,Record<string,number>>>({})
  const [settingsLoading,setSettingsLoading]=useState(true)

  const loadRules=useCallback(async()=>{
    const {data}=await supabase.from('league_rules').select('page_title,sections,updated_at').eq('id',1).maybeSingle()
    if(data){
      const sections=Array.isArray(data.sections)?data.sections as RuleSection[]:fallback.sections
      setRules({page_title:data.page_title||fallback.page_title,sections})
    }
    setLoading(false)
  },[])

  useEffect(()=>{
    loadRules()
    const channel=supabase.channel('league-rules-live-v1336')
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'league_rules',filter:'id=eq.1'},()=>loadRules())
      .subscribe()
    const refreshWhenVisible=()=>{if(document.visibilityState==='visible')loadRules()}
    document.addEventListener('visibilitychange',refreshWhenVisible)
    window.addEventListener('focus',loadRules)
    return()=>{
      document.removeEventListener('visibilitychange',refreshWhenVisible)
      window.removeEventListener('focus',loadRules)
      supabase.removeChannel(channel)
    }
  },[loadRules])

  useEffect(()=>{(async()=>{
    setSettingsLoading(true)
    const {data:season}=await supabase.from('seasons').select('id,standings_score_cap').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    if(!season?.id){setSettingsLoading(false);return}
    setScoreCap(Number(season.standings_score_cap||30))
    const [{data:monthRows},{data:teamRows},{data:playerRows}]=await Promise.all([
      supabase.from('league_months').select('id,month_start,course_name,bonus_hole_1,bonus_hole_2,bonus_birdie_value,elevation_ft,stimp_options,gimmie_feet,wind,greens,fairways,mulligans,pins_week_1,pins_week_2,pins_week_3,pins_week_4').eq('season_id',season.id).order('month_start'),
      supabase.from('teams').select('id,name').eq('season_id',season.id).eq('is_active',true).order('name'),
      supabase.from('players').select('id,full_name,team_id').eq('season_id',season.id).eq('is_active',true).order('full_name')
    ])
    const ms=(monthRows||[]) as LeagueMonth[]
    setMonths(ms)
    setTeams((teamRows||[]) as Team[])
    setPlayers((playerRows||[]) as Player[])
    if(ms.length){
      const assignmentResults=await Promise.all(ms.map(async m=>{
        const {data}=await supabase.from('tee_assignments').select('player_id,tee_color,yardage').eq('league_month_id',m.id)
        return [m.id,(data||[]) as TeeAssignment[]] as const
      }))
      setTees(Object.fromEntries(assignmentResults))
      const handicapResults=await Promise.all(ms.map(async m=>{
        const {data}=await supabase.from('monthly_team_handicaps').select('team_id,handicap_points').eq('league_month_id',m.id)
        return [m.id,Object.fromEntries((data||[]).map(h=>[h.team_id,Number(h.handicap_points)]))] as const
      }))
      setHandicaps(Object.fromEntries(handicapResults))
      const now=new Date()
      const currentKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
      const current=ms.find(m=>m.month_start.startsWith(currentKey))
      setSelectedMonthId(current?.id||ms[0].id)
    }
    setSettingsLoading(false)
  })()},[])

  const selected=months.find(m=>m.id===selectedMonthId)||months[0]||null
  const selectedTees=selected?tees[selected.id]||[]:[]
  const teeLegend=useMemo(()=>{
    const map=new Map<string,{color:string;yardages:Set<number>}>()
    for(const t of selectedTees){
      const key=(t.tee_color||'').toLowerCase()
      if(!key)continue
      if(!map.has(key))map.set(key,{color:key,yardages:new Set<number>()})
      if(typeof t.yardage==='number')map.get(key)!.yardages.add(t.yardage)
    }
    const order=['turquoise','red','yellow','blue','black']
    return [...map.values()].sort((a,b)=>{
      const ai=order.indexOf(a.color),bi=order.indexOf(b.color)
      return (ai<0?99:ai)-(bi<0?99:bi)
    })
  },[selectedTees])
  const teamName=(teamId:string|null)=>teams.find(t=>t.id===teamId)?.name||'—'
  const playerFor=(playerId:string)=>players.find(p=>p.id===playerId)

  return <PlayerPage title="">
    <div className="simple-mobile-page rules-page-v1230 rules-settings-page-v1329">
      <h1>Rules &amp; Settings</h1>

      <div className="rules-settings-tabs-v1329" role="tablist" aria-label="Rules and monthly settings">
        <button className={tab==='rules'?'active':''} onClick={()=>setTab('rules')}>Rules</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>Monthly Settings</button>
      </div>

      {tab==='rules'&&(loading?<section className="card"><p>Loading…</p></section>:<>
        <h2 className="rules-settings-section-title-v1329">{rules.page_title}</h2>
        <section className="card rules-content-v1230">
          {rules.sections.map((section,index)=><div className="rule-section-v1230" key={`${section.heading}-${index}`}>
            <h2>{section.heading}</h2>
            <RichTextDisplay value={section.body}/>
            {section.heading.trim().toLowerCase().includes('tee assignment')&&<div className="tee-speed-table-wrap-v1334">
              <h3>Tee Box Guidelines</h3>
              <p className="muted">Driver ball speed is the primary guideline. Typical driver carry and the playing length of the monthly course may also be considered when assigning tees.</p>
              <div className="table-wrap"><table className="tee-speed-table-v1334">
                <thead><tr><th>Tee Box</th><th>Driver Ball Speed</th><th>Approx. Driver Carry</th><th>Suggested Course Yardage</th></tr></thead>
                <tbody>
                  <tr><td data-label="Tee Box"><span className="tee-guide-name-v1335"><span className="tee-guide-square-v1335 tee-guide-turquoise-v1335"/><strong>Forward</strong></span></td><td data-label="Driver Ball Speed">Less than 105 mph</td><td data-label="Approx. Driver Carry">Less than 160 yd</td><td data-label="Suggested Course Yardage">3,300–4,300 yd</td></tr>
                  <tr><td data-label="Tee Box"><span className="tee-guide-name-v1335"><span className="tee-guide-square-v1335 tee-guide-red-v1335"/><strong>Senior</strong></span></td><td data-label="Driver Ball Speed">105–139.9 mph</td><td data-label="Approx. Driver Carry">160–219.9 yd</td><td data-label="Suggested Course Yardage">4,800–5,300 yd</td></tr>
                  <tr><td data-label="Tee Box"><span className="tee-guide-name-v1335"><span className="tee-guide-square-v1335 tee-guide-yellow-v1335"/><strong>Middle</strong></span></td><td data-label="Driver Ball Speed">140–154.9 mph</td><td data-label="Approx. Driver Carry">220–259.9 yd</td><td data-label="Suggested Course Yardage">5,300–5,800 yd</td></tr>
                  <tr><td data-label="Tee Box"><span className="tee-guide-name-v1335"><span className="tee-guide-square-v1335 tee-guide-blue-v1335"/><strong>Back</strong></span></td><td data-label="Driver Ball Speed">155–169.9 mph</td><td data-label="Approx. Driver Carry">260–299.9 yd</td><td data-label="Suggested Course Yardage">5,800–6,500 yd</td></tr>
                  <tr><td data-label="Tee Box"><span className="tee-guide-name-v1335"><span className="tee-guide-square-v1335 tee-guide-black-v1335"/><strong>Tips</strong></span></td><td data-label="Driver Ball Speed">170+ mph</td><td data-label="Approx. Driver Carry">300+ yd</td><td data-label="Suggested Course Yardage">6,500+ yd</td></tr>
                </tbody>
              </table></div>
              <p className="tee-speed-note-v1334">Tee boxes are assigned by the league administrator for each monthly course. Assignments may be moved forward or back when a player’s typical driving distance or the course length warrants an adjustment.</p>
            </div>}
          </div>)}
        </section>
      </>)}

      {tab==='settings'&&<>
        <div className="settings-intro-v1329">
          <h2>Monthly League Settings</h2>
          <p>Select a league month to see the course, simulator setup, weekly pins, tee yardages, and every player’s assigned tee box.</p>
        </div>

        {settingsLoading?<section className="card"><p>Loading monthly settings…</p></section>:months.length===0?
          <section className="card"><p>Monthly league settings have not been published yet.</p></section>:
          <>
            <div className="month-picker-v1329" role="tablist" aria-label="League months">
              {months.map(m=><button key={m.id} className={selected?.id===m.id?'active':''} onClick={()=>setSelectedMonthId(m.id)}>
                <strong>{new Date(`${m.month_start.slice(0,10)}T12:00:00`).toLocaleDateString('en-US',{month:'short'})}</strong>
                <small>{new Date(`${m.month_start.slice(0,10)}T12:00:00`).getFullYear()}</small>
              </button>)}
            </div>

            {selected&&<div className="monthly-settings-wrap-v1329">
              <section className="card monthly-course-card-v1329">
                <div className="monthly-course-heading-v1329">
                  <div><span>{monthLabel(selected.month_start)}</span><h2>{selected.course_name||'Course not set'}</h2></div>
                </div>

                <div className="settings-summary-grid-v1329">
                  <div><small>LEAGUE HOLES</small><strong>1–10</strong></div>
                  <div><small>BONUS PAR 3s</small><strong>{selected.bonus_hole_1&&selected.bonus_hole_2?`${selected.bonus_hole_1} & ${selected.bonus_hole_2}`:'Not set'}</strong></div>
                  <div><small>ELEVATION</small><strong>{Number(selected.elevation_ft||0).toLocaleString()} ft</strong></div>
                  <div><small>STIMP</small><strong>{selected.stimp_options?.length?selected.stimp_options.join(' or '):'Not set'}</strong></div>
                  <div><small>GIMMIES</small><strong>{selected.gimmie_feet} ft</strong></div>
                  <div><small>WIND</small><strong>{selected.wind||'Not set'}</strong></div>
                  <div><small>GREENS</small><strong>{selected.greens||'Not set'}</strong></div>
                  <div><small>FAIRWAYS</small><strong>{selected.fairways||'Not set'}</strong></div>
                  <div><small>MULLIGANS</small><strong>{selected.mulligans?'On':'Off'}</strong></div>
                </div>
              </section>

              <section className="card weekly-pins-card-v1329">
                <h3>Weekly Pin Settings</h3>
                <div className="weekly-pins-grid-v1329">
                  {[1,2,3,4].map(w=><div key={w}><small>WEEK {w}</small><strong>{(selected as any)[`pins_week_${w}`]||'Not set'}</strong></div>)}
                </div>
              </section>

              <section className="card tee-setup-card-v1329">
                <h3>Tee Boxes &amp; Yardages</h3>
                {teeLegend.length?<div className="tee-yardage-key-v1329">
                  {teeLegend.map(t=><div className="tee-yardage-key-row-v1348" key={t.color}><span className={`tee-square ${teeClass(t.color)}`} style={!teeClass(t.color)?{background:t.color}:undefined}/><div><strong>{teeColorLabel(t.color)} Tees</strong><small>{t.yardages.size?[...t.yardages].sort((a,b)=>a-b).map(v=>`${v.toLocaleString()} yds`).join(' / '):'Yardage not set'}</small></div></div>)}
                </div>:<p className="muted">Tee box yardages have not been set for this month.</p>}
              </section>

              <section className="card monthly-player-tees-v1329">
                <h3>Player Tee Box Assignments</h3>
                <p className="muted">This is the tee box each player is assigned to use for {monthLabel(selected.month_start)}.</p>
                <div className="monthly-player-team-groups-v1348">
                  {selectedTees.length?teams.map(team=>{
                    const rows=selectedTees
                      .map(a=>({assignment:a,player:playerFor(a.player_id)}))
                      .filter(x=>x.player?.team_id===team.id)
                      .sort((a,b)=>a.player!.full_name.localeCompare(b.player!.full_name))
                    if(!rows.length)return null
                    return <section className="monthly-player-team-group-v1348" key={team.id}>
                      <h4><span>{team.name}</span><span className="monthly-team-handicap-v1349">{handicaps[selected.id]?.[team.id]===undefined?'Not Yet Available':`+${handicaps[selected.id][team.id]}`}</span></h4>
                      <div className="monthly-player-tee-list-v1329">
                        {rows.map(({assignment,player})=><div className="monthly-player-tee-row-v1329" key={assignment.player_id}>
                          <div><strong>{player!.full_name}</strong></div>
                          <div className="monthly-player-tee-value-v1329">
                            <span className={`tee-square ${teeClass(assignment.tee_color)}`} style={!teeClass(assignment.tee_color)?{background:assignment.tee_color}:undefined}/>
                            <div><strong>{teeColorLabel(assignment.tee_color)} Tees</strong><small>{typeof assignment.yardage==='number'?`${assignment.yardage.toLocaleString()} yds`:'Yardage not set'}</small></div>
                          </div>
                        </div>)}
                      </div>
                    </section>
                  }):<p className="muted">Player tee assignments have not been set for this month.</p>}
                </div>
              </section>
            </div>}
          </>
        }
      </>}
    </div>
  </PlayerPage>
}
