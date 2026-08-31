'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Season={id:string;name:string}
type Team={id:string;name:string}
type Player={id:string;team_id:string|null;full_name:string}

export default function Teams(){
  const [season,setSeason]=useState<Season|null>(null)
  const [teams,setTeams]=useState<Team[]>([])
  const [players,setPlayers]=useState<Player[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.from('seasons').select('id,name').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    if(!s){setLoading(false);return}
    setSeason(s as Season)
    const [{data:t},{data:p}]=await Promise.all([
      supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'),
      supabase.from('players').select('id,team_id,full_name').eq('season_id',s.id).eq('is_active',true).order('full_name')
    ])
    setTeams((t||[]) as Team[])
    setPlayers((p||[]) as Player[])
    setLoading(false)
  })()},[])

  const rows=useMemo(()=>teams.map(team=>({
    team,
    players:players.filter(p=>p.team_id===team.id).sort((a,b)=>a.full_name.localeCompare(b.full_name))
  })),[teams,players])

  if(loading)return <p>Loading…</p>

  return <>
    <div className="section-title">
      <div>
        <div className="eyebrow">{season?.name||'Current season'}</div>
        <h1>Teams & Rosters</h1>
        <p className="muted">Current league teams and active player rosters.</p>
      </div>
      {season&&<div className="pill">{teams.length} Teams • {players.length} Players</div>}
    </div>

    {!season?<div className="card">There is no active league season right now.</div>:
      <div className="grid team-grid">
        {rows.map(({team,players:roster})=><section className="card team-card" key={team.id}>
          <div className="section-title compact">
            <h2>{team.name}</h2>
            <span className="pill">{roster.length} Players</span>
          </div>
          {roster.length?<div className="player-roster">
            {roster.map((player,index)=><div className="player-name" key={player.id}>
              <span className="player-number">{index+1}</span>
              <strong>{player.full_name}</strong>
            </div>)}
          </div>:<p className="muted">No active players are assigned to this team.</p>}
        </section>)}
      </div>}
  </>
}
