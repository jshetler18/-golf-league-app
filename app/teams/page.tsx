'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'
import { TeamRawStats } from '@/components/TeamRawStats'
import {calculateHandicap,scoreLabel} from '@/lib/handicap'

type Season={id:string;name:string;handicap_standard:number}
type Team={id:string;name:string;season_id?:string;captain_player_id:string|null}
type Player={id:string;team_id:string|null;full_name:string;official_tee_color:string|null}
type TrophyCounts={cup:number;monthly:number}
type RawRow={canonical_team_name:string;season_label:string;score_month:string;round_number?:number|null;raw_score:number|string}
type PublishedScore={score:number;season_label?:string;score_month?:string;round_number?:number|null;counted:boolean}
type PublishedHandicap={team_id:string;team_name:string;average:number|null;recommended:number|null;handicap:number;method:string;recent:PublishedScore[]}
type HandicapPublication={month_start:string;handicap_standard:number;published_at:string;snapshot:PublishedHandicap[]}

const teeLabels:Record<string,string>={turquoise:'Forward Tees',red:'Senior Tees',yellow:'Middle Tees',blue:'Back Tees',black:'Tip Tees'}
function teamKey(name:string){return name.trim().toLowerCase()}

export default function Teams(){
  const [season,setSeason]=useState<Season|null>(null)
  const [teams,setTeams]=useState<Team[]>([])
  const [players,setPlayers]=useState<Player[]>([])
  const [loading,setLoading]=useState(true)
  const [trophies,setTrophies]=useState<Record<string,TrophyCounts>>({})
  const [avatars,setAvatars]=useState<Record<string,string>>({})
  const [rawRows,setRawRows]=useState<RawRow[]>([])
  const [tab,setTab]=useState<'teams'|'handicaps'>('teams')
  const [openHandicapTeam,setOpenHandicapTeam]=useState<string|null>(null)
  const [publication,setPublication]=useState<HandicapPublication|null>(null)

  useEffect(()=>{if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('tab')==='handicaps')setTab('handicaps')},[])

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.from('seasons').select('id,name,handicap_standard').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    if(!s){setLoading(false);return}
    setSeason(s as Season)
    const {data:published}=await supabase.from('handicap_publications').select('month_start,handicap_standard,published_at,snapshot').eq('season_id',s.id).order('published_at',{ascending:false}).limit(1).maybeSingle()
    setPublication((published||null) as HandicapPublication|null)
    const [{data:t},{data:p},{data:champions},{data:closedSeasons},{data:allTeams},{data:allMonths}]=await Promise.all([
      supabase.from('teams').select('id,name,captain_player_id').eq('season_id',s.id).eq('is_active',true).order('name'),
      supabase.from('players').select('id,team_id,full_name,official_tee_color').eq('season_id',s.id).eq('is_active',true).order('full_name'),
      supabase.from('monthly_champions').select('team_id'),
      supabase.from('seasons').select('id').eq('is_closed',true),
      supabase.from('teams').select('id,name,season_id'),
      supabase.from('league_months').select('id,season_id,month_start')
    ])
    setTeams((t||[]) as Team[])
    setPlayers((p||[]) as Player[])
    const {data:rawData}=await supabase.from('team_raw_score_history').select('canonical_team_name,season_label,score_month,round_number,raw_score')
    setRawRows((rawData||[]) as RawRow[])
    const {data:avatarRows}=await supabase.rpc('get_league_player_avatars')
    const avatarMap:Record<string,string>={}
    ;((avatarRows||[]) as {player_id:string;avatar_url:string|null}[]).forEach(row=>{if(row.avatar_url)avatarMap[row.player_id]=row.avatar_url})
    setAvatars(avatarMap)

    const allTeamRows=(allTeams||[]) as Team[]
    const counts:Record<string,TrophyCounts>={}
    const teamNameById=new Map(allTeamRows.map(team=>[team.id,team.name]))
    ;((champions||[]) as {team_id:string}[]).forEach(c=>{
      const name=teamNameById.get(c.team_id); if(!name)return
      const key=teamKey(name); counts[key]=counts[key]||{cup:0,monthly:0}; counts[key].monthly+=1
    })
    const closedIds=((closedSeasons||[]) as {id:string}[]).map(x=>x.id)
    if(closedIds.length){
      const months=((allMonths||[]) as {id:string;season_id:string;month_start:string}[]).filter(m=>closedIds.includes(m.season_id))
      const monthIds=months.map(m=>m.id)
      if(monthIds.length){
        const {data:points}=await supabase.from('cup_points').select('league_month_id,team_id,points').in('league_month_id',monthIds)
        const seasonByMonth=new Map(months.map(m=>[m.id,m.season_id]))
        const totals:Record<string,Record<string,number>>={}
        ;((points||[]) as {league_month_id:string;team_id:string;points:number}[]).forEach(r=>{
          const sid=seasonByMonth.get(r.league_month_id); if(!sid)return
          totals[sid]=totals[sid]||{}; totals[sid][r.team_id]=(totals[sid][r.team_id]||0)+Number(r.points||0)
        })
        Object.values(totals).forEach(teamTotals=>{
          const entries=Object.entries(teamTotals).sort((a,b)=>b[1]-a[1]); if(!entries.length)return
          const winnerName=teamNameById.get(entries[0][0]); if(!winnerName)return
          const key=teamKey(winnerName); counts[key]=counts[key]||{cup:0,monthly:0}; counts[key].cup+=1
        })
      }
    }
    setTrophies(counts)
    setLoading(false)
  })()},[])

  const rows=useMemo(()=>teams.map(team=>({team,players:players.filter(p=>p.team_id===team.id).sort((a,b)=>(a.id===team.captain_player_id?-1:b.id===team.captain_player_id?1:a.full_name.localeCompare(b.full_name)))})),[teams,players])
  const handicapRows=useMemo(()=>{
    if(!publication)return []
    return [...(publication.snapshot||[])].sort((a,b)=>(b.average??-Infinity)-(a.average??-Infinity)||a.team_name.localeCompare(b.team_name))
  },[publication])

  if(loading)return <PlayerPage title="Teams & Handicaps"><p>Loading…</p></PlayerPage>

  return <PlayerPage title="Teams & Handicaps">
    <div className="teams-handicaps-page-v1372">
      <h1>Teams &amp; Handicaps</h1>
      <div className="rules-settings-tabs-v1329" role="tablist" aria-label="Teams and handicaps">
        <button className={tab==='teams'?'active':''} onClick={()=>setTab('teams')}>Teams</button>
        <button className={tab==='handicaps'?'active':''} onClick={()=>setTab('handicaps')}>Handicaps</button>
      </div>
      {!season?<div className="card">There is no active league season right now.</div>:<>
      {tab==='teams'&&<>
      <div className="section-title teams-tab-heading-v1372">
        <div>
          <div className="eyebrow">{season?.name||'Current season'}</div>
          <h2>Teams</h2>
          <p className="muted">Browse league teams, players, and scoring history.</p>
        </div>
        <div className="pill">{teams.length} Teams</div>
      </div>
      <div className="card tee-key" aria-label="Tee box and championship key">
        <strong>Tee Box Key</strong>
        <div className="tee-key-items">
          <span><i className="tee-square tee-turquoise" aria-hidden="true"></i>Forward Tees (≈3,500 yards)</span>
          <span><i className="tee-square tee-red" aria-hidden="true"></i>Senior Tees (≈5,000 yards)</span>
          <span><i className="tee-square tee-yellow" aria-hidden="true"></i>Middle Tees (≈5,500 yards)</span>
          <span><i className="tee-square tee-blue" aria-hidden="true"></i>Back Tees (≈6,000 yards)</span>
          <span><i className="tee-square tee-black" aria-hidden="true"></i>Tip Tees (≈6,500+ yards)</span>
        </div>
        <strong className="championship-key-title-v1250">Championship Key</strong>
        <div className="trophy-key-items">
          <span><i className="trophy trophy-cup" aria-hidden="true">🏆</i>Cup Championship</span>
          <span><i className="trophy trophy-monthly" aria-hidden="true">🏆</i>Monthly Championship</span>
        </div>
      </div>
      <div className="grid team-grid">
        {rows.map(({team,players:roster})=><section className="card team-card" key={team.id}>
          <div className="section-title compact"><div><h2>{team.name}</h2>
            {(trophies[teamKey(team.name)]?.cup||trophies[teamKey(team.name)]?.monthly)?<div className="team-trophies" aria-label="Championships">
              {Array.from({length:trophies[teamKey(team.name)]?.cup||0}).map((_,i)=><span className="trophy trophy-cup" title="Cup Championship" key={`cup-${i}`}>🏆</span>)}
              {Array.from({length:trophies[teamKey(team.name)]?.monthly||0}).map((_,i)=><span className="trophy trophy-monthly" title="Monthly Championship" key={`monthly-${i}`}>🏆</span>)}
            </div>:null}
          </div></div>
          {roster.length?<div className="player-roster">{roster.map(player=><div className="player-name" key={player.id}>
            <span className="team-player-avatar-v1230" aria-hidden={!avatars[player.id]}>{avatars[player.id]?<img src={avatars[player.id]} alt={`${player.full_name} profile`} />:<span>👤</span>}</span>
            <span className="team-player-copy-v1230"><strong>{player.full_name}{player.id===team.captain_player_id&&<span className="captain-mark-v1357"> (C)</span>}</strong><small className="team-player-tee-v1235">{player.official_tee_color&&<span className={`tee-square tee-${player.official_tee_color}`} aria-hidden="true"></span>}<span>{player.official_tee_color?(teeLabels[player.official_tee_color]||`${player.official_tee_color} Tees`):'Tee not set'}</span></small></span>
          </div>)}</div>:<p className="muted">No active players are assigned to this team.</p>}
          {(()=>{const calc=calculateHandicap(rawRows.filter(r=>teamKey(r.canonical_team_name)===teamKey(team.name)).map(r=>({score:Number(r.raw_score),season_label:r.season_label,score_month:r.score_month,round_number:r.round_number})),Number(season?.handicap_standard||27));return <div className="handicap-history-v1369">
            <div className="eyebrow">Handicap Performance</div>
            <h3>{calc.available>=12?'Best 10 of Last 12 Raw Scores':'Recent Raw Scores'}</h3>
            <p className="muted">{calc.method}</p>
            <div className="handicap-average-v1369"><span>Handicap Raw Scoring Average:</span><strong>{calc.average==null?'Not Yet Available':calc.average.toFixed(2)}</strong></div>
            <div className="handicap-score-chips-v1369">{calc.recent.map((r,i)=>{const out=calc.excluded.includes(r);return <span className={out?'not-counted':''} key={`${r.score_month}-${r.round_number}-${i}`}><small>{scoreLabel(r)}</small><strong>{r.score.toFixed(1)}</strong><em>{out?'Not Counted':'Counted'}</em></span>})}</div>
          </div>})()}
          <div className="eyebrow" style={{marginTop:16}}>Raw Score Statistics <span className="raw-score-disclaimer">(Handicaps are not factored in)</span></div>
          <TeamRawStats rows={rawRows} teamName={team.name} currentSeason={season?.name||''}/>
        </section>)}
      </div>
      </>}
      {tab==='handicaps'&&<div className="handicap-rankings-v1372">
        {!publication?<div className="card"><h2>Team Handicaps</h2><p className="muted">Team handicaps have not been published yet. This page will update when the league administrator confirms and publishes the handicaps for the upcoming month.</p></div>:<>
        <div className="section-title teams-tab-heading-v1372"><div><div className="eyebrow">{new Date(publication.month_start+'T12:00:00').toLocaleString('en-US',{month:'long',year:'numeric'})}</div><h2>Team Handicaps</h2><p className="muted">These are the latest handicaps confirmed by the league administrator. This page stays unchanged until the next handicap publication.</p></div><div className="pill">Standard Used to Calculate Handicaps: {Number(publication.handicap_standard||27)}</div></div>
        <div className="card handicap-ranking-table-v1372">
          <div className="handicap-ranking-head-v1372"><span>Rank</span><span>Team</span><span>Raw Avg.</span><span>Handicap</span></div>
          {handicapRows.map((row,index)=>{const open=openHandicapTeam===row.team_id;return <div className="handicap-ranking-entry-v1372" key={row.team_id}>
            <button className="handicap-ranking-row-v1372" onClick={()=>setOpenHandicapTeam(open?null:row.team_id)} aria-expanded={open}>
              <span className="handicap-rank-v1372">{row.average==null?'—':index+1}</span><strong>{row.team_name}</strong><span>{row.average==null?'N/A':Math.round(row.average)}</span><span className={(row.handicap||0)>0?'helps-v1372':(row.handicap||0)<0?'hurts-v1372':''}>{row.handicap==null?'N/A':row.handicap>0?`+${row.handicap}`:`${row.handicap}`}</span><i>{open?'⌃':'⌄'}</i>
            </button>
            {open&&<div className="handicap-ranking-detail-v1372"><p className="muted">{row.method}</p><div className="handicap-average-v1369"><span>Handicap Raw Scoring Average:</span><strong>{row.average==null?'Not Yet Available':Math.round(row.average)}</strong></div><div className="handicap-score-chips-v1369">{(row.recent||[]).map((r,i)=><span className={!r.counted?'not-counted':''} key={`${r.score_month}-${r.round_number}-${i}`}><small>{scoreLabel(r as any)}</small><strong>{Number(r.score).toFixed(1)}</strong><em>{r.counted?'Counted':'Not Counted'}</em></span>)}</div></div>}
          </div>})}
        </div>
        <p className="muted handicap-help-note-v1372">A positive handicap adds points to a team's raw score. A negative handicap subtracts points. A 0 handicap makes no adjustment.</p>
        <p className="muted handicap-help-note-v1372">Published {new Date(publication.published_at).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}.</p>
        </>}
      </div>})}
        </div>
        <p className="muted handicap-help-note-v1372">A positive handicap adds points to a team's raw score. A negative handicap subtracts points. A 0 handicap makes no adjustment.</p>
      </div>}
      </>}
    </div>
  </PlayerPage>
}
