'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type Season={id:string;name:string}
type Team={id:string;name:string}
type Player={id:string;team_id:string|null;full_name:string;official_tee_color:string|null}
type TrophyCounts={cup:number;monthly:number}

const teeLabels:Record<string,string>={turquoise:'Forward Tees',red:'Senior Tees',yellow:'Middle Tees',blue:'Back Tees',black:'Tips'}

export default function Teams(){
  const [season,setSeason]=useState<Season|null>(null)
  const [teams,setTeams]=useState<Team[]>([])
  const [players,setPlayers]=useState<Player[]>([])
  const [loading,setLoading]=useState(true)
  const [trophies,setTrophies]=useState<Record<string,TrophyCounts>>({})
  const [avatars,setAvatars]=useState<Record<string,string>>({})

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.from('seasons').select('id,name').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    if(!s){setLoading(false);return}
    setSeason(s as Season)
    const [{data:t},{data:p},{data:champions},{data:closedSeasons},{data:allTeams}]=await Promise.all([
      supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'),
      supabase.from('players').select('id,team_id,full_name,official_tee_color').eq('season_id',s.id).eq('is_active',true).order('full_name'),
      supabase.from('monthly_champions').select('team_id'),
      supabase.from('seasons').select('id').eq('is_closed',true),
      supabase.from('teams').select('id,name')
    ])
    setTeams((t||[]) as Team[])
    setPlayers((p||[]) as Player[])
    const {data:avatarRows}=await supabase.rpc('get_league_player_avatars')
    const avatarMap:Record<string,string>={}
    ;((avatarRows||[]) as {player_id:string;avatar_url:string|null}[]).forEach(row=>{if(row.avatar_url)avatarMap[row.player_id]=row.avatar_url})
    setAvatars(avatarMap)

    const counts:Record<string,TrophyCounts>={}
    const teamNameById=new Map(((allTeams||[]) as Team[]).map(team=>[team.id,team.name]))
    const teamKey=(name:string)=>name.trim().toLowerCase()
    ;((champions||[]) as {team_id:string}[]).forEach(c=>{
      const name=teamNameById.get(c.team_id); if(!name)return
      const key=teamKey(name)
      counts[key]=counts[key]||{cup:0,monthly:0}
      counts[key].monthly+=1
    })
    const closedIds=((closedSeasons||[]) as {id:string}[]).map(x=>x.id)
    if(closedIds.length){
      const {data:months}=await supabase.from('league_months').select('id,season_id').in('season_id',closedIds)
      const monthIds=((months||[]) as {id:string;season_id:string}[]).map(m=>m.id)
      if(monthIds.length){
        const {data:points}=await supabase.from('cup_points').select('league_month_id,team_id,points').in('league_month_id',monthIds)
        const seasonByMonth=new Map(((months||[]) as {id:string;season_id:string}[]).map(m=>[m.id,m.season_id]))
        const totals:Record<string,Record<string,number>>={}
        ;((points||[]) as {league_month_id:string;team_id:string;points:number}[]).forEach(r=>{
          const sid=seasonByMonth.get(r.league_month_id); if(!sid)return
          totals[sid]=totals[sid]||{}; totals[sid][r.team_id]=(totals[sid][r.team_id]||0)+Number(r.points||0)
        })
        Object.values(totals).forEach(teamTotals=>{
          const entries=Object.entries(teamTotals).sort((a,b)=>b[1]-a[1]); if(!entries.length)return
          const winnerId=entries[0][0]; const winnerName=teamNameById.get(winnerId); if(!winnerName)return
          const key=teamKey(winnerName); counts[key]=counts[key]||{cup:0,monthly:0}; counts[key].cup+=1
        })
      }
    }
    setTrophies(counts)
    setLoading(false)
  })()},[])

  const rows=useMemo(()=>teams.map(team=>({
    team,
    players:players.filter(p=>p.team_id===team.id).sort((a,b)=>a.full_name.localeCompare(b.full_name))
  })),[teams,players])

  if(loading)return <PlayerPage title="Teams"><p>Loading…</p></PlayerPage>

  return <PlayerPage title="Teams">
    <div className="section-title">
      <div>
        <div className="eyebrow">{season?.name||'Current season'}</div>
        <h1>Teams & Rosters</h1>
        <p className="muted">Current league teams and active player rosters.</p>
      </div>
      {season&&<div className="pill">{teams.length} Teams</div>}
    </div>

    {!season?<div className="card">There is no active league season right now.</div>:<>
      <div className="card tee-key" aria-label="Championship trophy key">
        <strong>Championship Key</strong>
        <div className="trophy-key-items">
          <span><i className="trophy trophy-cup" aria-hidden="true">🏆</i>Cup Championship</span>
          <span><i className="trophy trophy-monthly" aria-hidden="true">🏆</i>Monthly Championship</span>
        </div>
      </div>
      <div className="grid team-grid">
        {rows.map(({team,players:roster})=><section className="card team-card" key={team.id}>
          <div className="section-title compact">
            <div><h2>{team.name}</h2>
              {(trophies[team.name.trim().toLowerCase()]?.cup||trophies[team.name.trim().toLowerCase()]?.monthly)?<div className="team-trophies" aria-label="Championships">
                {Array.from({length:trophies[team.name.trim().toLowerCase()]?.cup||0}).map((_,i)=><span className="trophy trophy-cup" title="Cup Championship" key={`cup-${i}`}>🏆</span>)}
                {Array.from({length:trophies[team.name.trim().toLowerCase()]?.monthly||0}).map((_,i)=><span className="trophy trophy-monthly" title="Monthly Championship" key={`monthly-${i}`}>🏆</span>)}
              </div>:null}
            </div>
          </div>
          {roster.length?<div className="player-roster">
            {roster.map((player)=><div className="player-name" key={player.id}>
              <span className="team-player-avatar-v1230" aria-hidden={!avatars[player.id]}>
                {avatars[player.id]?<img src={avatars[player.id]} alt={`${player.full_name} profile`} />:<span>👤</span>}
              </span>
              <span className="team-player-copy-v1230"><strong>{player.full_name}</strong><small className="team-player-tee-v1235">{player.official_tee_color&&<span className={`tee-square tee-${player.official_tee_color}`} aria-hidden="true"></span>}<span>{player.official_tee_color?(teeLabels[player.official_tee_color]||`${player.official_tee_color} Tees`):'Tee not set'}</span></small></span>
            </div>)}
          </div>:<p className="muted">No active players are assigned to this team.</p>}
        </section>)}
      </div></>}
  </PlayerPage>
}
