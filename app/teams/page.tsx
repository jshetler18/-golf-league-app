'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'
import { TeamRawStats } from '@/components/TeamRawStats'

type Season={id:string;name:string}
type Team={id:string;name:string;season_id?:string}
type Player={id:string;team_id:string|null;full_name:string;official_tee_color:string|null}
type TrophyCounts={cup:number;monthly:number}
type RawRow={canonical_team_name:string;season_label:string;score_month:string;raw_score:number|string}
type AdjustedRow={team_name:string;season_label:string;score_month:string;adjusted_score:number}
type RankingMetric='all_avg'|'all_high'|'all_low'|'season_avg'|'season_high'|'season_low'|'cup'|'monthly'

const teeLabels:Record<string,string>={turquoise:'Forward Tees',red:'Senior Tees',yellow:'Middle Tees',blue:'Back Tees',black:'Tip Tees'}
const metricLabels:Record<RankingMetric,string>={
  all_avg:'All-Time Avg Score',all_high:'All-Time Highest Score',all_low:'All-Time Lowest Score',
  season_avg:'Current Season Avg Score',season_high:'Current Season High Score',season_low:'Current Season Low Score',
  cup:'Cup Championships Won',monthly:'Monthly Championships Won'
}

function teamKey(name:string){return name.trim().toLowerCase()}
function fmt(v:number|null,metric:RankingMetric){if(v==null)return '—';return metric==='cup'||metric==='monthly'?String(v):Number(v).toFixed(1)}

export default function Teams(){
  const [season,setSeason]=useState<Season|null>(null)
  const [teams,setTeams]=useState<Team[]>([])
  const [players,setPlayers]=useState<Player[]>([])
  const [loading,setLoading]=useState(true)
  const [trophies,setTrophies]=useState<Record<string,TrophyCounts>>({})
  const [avatars,setAvatars]=useState<Record<string,string>>({})
  const [rawRows,setRawRows]=useState<RawRow[]>([])
  const [adjustedRows,setAdjustedRows]=useState<AdjustedRow[]>([])
  const [view,setView]=useState<'teams'|'rankings'>('teams')
  const [metric,setMetric]=useState<RankingMetric>('all_avg')
  const [scoreMode,setScoreMode]=useState<'raw'|'handicap'>('raw')
  const [direction,setDirection]=useState<'desc'|'asc'>('desc')

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.from('seasons').select('id,name').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    if(!s){setLoading(false);return}
    setSeason(s as Season)
    const [{data:t},{data:p},{data:champions},{data:closedSeasons},{data:allTeams},{data:allSeasons},{data:allMonths},{data:weekly}]=await Promise.all([
      supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'),
      supabase.from('players').select('id,team_id,full_name,official_tee_color').eq('season_id',s.id).eq('is_active',true).order('full_name'),
      supabase.from('monthly_champions').select('team_id'),
      supabase.from('seasons').select('id').eq('is_closed',true),
      supabase.from('teams').select('id,name,season_id'),
      supabase.from('seasons').select('id,name'),
      supabase.from('league_months').select('id,season_id,month_start'),
      supabase.from('weekly_scores').select('team_id,league_month_id,raw_stableford,handicap_points,status').eq('status','approved')
    ])
    setTeams((t||[]) as Team[])
    setPlayers((p||[]) as Player[])
    const {data:rawData}=await supabase.from('team_raw_score_history').select('canonical_team_name,season_label,score_month,raw_score')
    setRawRows((rawData||[]) as RawRow[])
    const {data:avatarRows}=await supabase.rpc('get_league_player_avatars')
    const avatarMap:Record<string,string>={}
    ;((avatarRows||[]) as {player_id:string;avatar_url:string|null}[]).forEach(row=>{if(row.avatar_url)avatarMap[row.player_id]=row.avatar_url})
    setAvatars(avatarMap)

    const allTeamRows=(allTeams||[]) as Team[]
    const teamById=new Map(allTeamRows.map(team=>[team.id,team]))
    const seasonById=new Map(((allSeasons||[]) as Season[]).map(x=>[x.id,x.name]))
    const monthById=new Map(((allMonths||[]) as {id:string;season_id:string;month_start:string}[]).map(x=>[x.id,x]))
    const adjusted:AdjustedRow[]=[]
    ;((weekly||[]) as {team_id:string;league_month_id:string;raw_stableford:number|string;handicap_points:number|string;status:string}[]).forEach(row=>{
      const tm=teamById.get(row.team_id), mo=monthById.get(row.league_month_id)
      if(!tm||!mo)return
      adjusted.push({team_name:tm.name,season_label:seasonById.get(mo.season_id)||'',score_month:mo.month_start,adjusted_score:Number(row.raw_stableford||0)+Number(row.handicap_points||0)})
    })
    setAdjustedRows(adjusted)

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

  const rows=useMemo(()=>teams.map(team=>({team,players:players.filter(p=>p.team_id===team.id).sort((a,b)=>a.full_name.localeCompare(b.full_name))})),[teams,players])

  const rankingRows=useMemo(()=>{
    const calc=(vals:number[],kind:'avg'|'high'|'low')=>{
      if(!vals.length)return null
      if(kind==='avg')return vals.reduce((a,b)=>a+b,0)/vals.length
      return kind==='high'?Math.max(...vals):Math.min(...vals)
    }
    const scoreMetric=metric!=='cup'&&metric!=='monthly'
    return teams.map(team=>{
      let value:number|null=null
      if(metric==='cup'||metric==='monthly') value=trophies[teamKey(team.name)]?.[metric]||0
      else if(scoreMode==='raw'){
        const all=rawRows.filter(r=>teamKey(r.canonical_team_name)===teamKey(team.name)).map(r=>Number(r.raw_score))
        const current=rawRows.filter(r=>teamKey(r.canonical_team_name)===teamKey(team.name)&&r.season_label===season?.name).map(r=>Number(r.raw_score))
        const vals=metric.startsWith('season_')?current:all
        value=calc(vals,metric.endsWith('avg')?'avg':metric.endsWith('high')?'high':'low')
      }else{
        const all=adjustedRows.filter(r=>teamKey(r.team_name)===teamKey(team.name)).map(r=>r.adjusted_score)
        const current=adjustedRows.filter(r=>teamKey(r.team_name)===teamKey(team.name)&&r.season_label===season?.name).map(r=>r.adjusted_score)
        const vals=metric.startsWith('season_')?current:all
        value=calc(vals,metric.endsWith('avg')?'avg':metric.endsWith('high')?'high':'low')
      }
      return {team,value,scoreMetric}
    }).sort((a,b)=>{
      if(a.value==null&&b.value==null)return a.team.name.localeCompare(b.team.name)
      if(a.value==null)return 1;if(b.value==null)return -1
      const d=a.value-b.value
      return direction==='asc'?d:-d
    })
  },[teams,trophies,rawRows,adjustedRows,metric,scoreMode,direction,season])

  if(loading)return <PlayerPage title="Teams & Rankings"><p>Loading…</p></PlayerPage>

  return <PlayerPage title="Teams & Rankings">
    <div className="section-title">
      <div>
        <div className="eyebrow">{season?.name||'Current season'}</div>
        <h1>Teams & Rankings</h1>
        <p className="muted">Browse league teams or compare team statistics.</p>
      </div>
      {season&&<div className="pill">{teams.length} Teams</div>}
    </div>

    <div className="teams-rankings-tabs" role="tablist" aria-label="Teams and Rankings">
      <button className={view==='teams'?'active':''} onClick={()=>setView('teams')} type="button">Teams</button>
      <button className={view==='rankings'?'active':''} onClick={()=>setView('rankings')} type="button">Rankings</button>
    </div>

    {!season?<div className="card">There is no active league season right now.</div>:view==='teams'?<>
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
            <span className="team-player-copy-v1230"><strong>{player.full_name}</strong><small className="team-player-tee-v1235">{player.official_tee_color&&<span className={`tee-square tee-${player.official_tee_color}`} aria-hidden="true"></span>}<span>{player.official_tee_color?(teeLabels[player.official_tee_color]||`${player.official_tee_color} Tees`):'Tee not set'}</span></small></span>
          </div>)}</div>:<p className="muted">No active players are assigned to this team.</p>}
          <div className="eyebrow" style={{marginTop:16}}>Raw Score Statistics <span className="raw-score-disclaimer">(Handicaps are not factored in)</span></div>
          <TeamRawStats rows={rawRows} teamName={team.name} currentSeason={season?.name||''}/>
        </section>)}
      </div>
    </>:<div className="card">
      <div className="section-title compact"><div><div className="eyebrow">Team Comparison</div><h2>Rankings</h2></div></div>
      <div className="rankings-mode" aria-label="Score type">
        <button type="button" className={scoreMode==='raw'?'active':''} onClick={()=>setScoreMode('raw')}>Raw Scores</button>
        <button type="button" className={scoreMode==='handicap'?'active':''} onClick={()=>setScoreMode('handicap')}>Handicaps Factored In</button>
      </div>
      <div className="rankings-controls">
        <label>Ranking Statistic<select value={metric} onChange={e=>setMetric(e.target.value as RankingMetric)}>{(Object.keys(metricLabels) as RankingMetric[]).map(k=><option key={k} value={k}>{metricLabels[k]}</option>)}</select></label>
        <label>Sort Order<select value={direction} onChange={e=>setDirection(e.target.value as 'asc'|'desc')}><option value="desc">Highest First</option><option value="asc">Lowest First</option></select></label>
      </div>
      {scoreMode==='handicap'&&metric!=='cup'&&metric!=='monthly'?<p className="rankings-note">Handicap-adjusted rankings use raw score plus the monthly handicap. Historical handicap data before {season.name} is not available, so adjusted all-time rankings begin with the scores stored in the app.</p>:null}
      {(metric==='cup'||metric==='monthly')?<p className="rankings-note">Raw/handicap selection does not change championship totals.</p>:null}
      <div className="rankings-table-wrap"><table className="rankings-table"><thead><tr><th>Rank</th><th>Team</th><th style={{textAlign:'right'}}>{metricLabels[metric]}</th></tr></thead><tbody>
        {rankingRows.map((r,i)=><tr key={r.team.id}><td className="rank-number">#{i+1}</td><td className="rank-team">{r.team.name}</td><td className="rank-value">{fmt(r.value,metric)}</td></tr>)}
      </tbody></table></div>
    </div>}
  </PlayerPage>
}
