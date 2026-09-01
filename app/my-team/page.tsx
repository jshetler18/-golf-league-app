'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type Player={id:string;full_name:string;team_id:string|null;official_tee_color:string|null;is_active:boolean}
type PlayerAvatar={player_id:string;avatar_url:string|null}
type Team={id:string;name:string;season_id:string}
type Month={id:string;month_start:string;course_name:string}
type Score={league_month_id:string;team_id:string;week_number:number;official_total:number|null;status:string}
type Handicap={league_month_id:string;team_id:string;handicap_points:number}
type CupPoint={league_month_id:string;team_id:string;points:number}
type Matchup={league_month_id:string;seed_high:number;seed_low:number;team_high_id:string;team_low_id:string;winner_team_id:string|null}

function monthLabel(date:string){return new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}
function scoreText(v:number|null|undefined){return v==null?'—':Number(v).toFixed(1)}

export default function MyTeam(){
  const [loading,setLoading]=useState(true)
  const [linkedPlayer,setLinkedPlayer]=useState<Player|null>(null)
  const [team,setTeam]=useState<Team|null>(null)
  const [roster,setRoster]=useState<Player[]>([])
  const [teams,setTeams]=useState<Team[]>([])
  const [months,setMonths]=useState<Month[]>([])
  const [scores,setScores]=useState<Score[]>([])
  const [handicaps,setHandicaps]=useState<Handicap[]>([])
  const [cupPoints,setCupPoints]=useState<CupPoint[]>([])
  const [matchups,setMatchups]=useState<Matchup[]>([])
  const [playerAvatars,setPlayerAvatars]=useState<Record<string,string>>({})

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setLoading(false);return}
    const {data:profile}=await supabase.from('profiles').select('player_id').eq('id',user.id).maybeSingle()
    if(!profile?.player_id){setLoading(false);return}
    const {data:player}=await supabase.from('players').select('id,full_name,team_id,official_tee_color,is_active').eq('id',profile.player_id).maybeSingle()
    if(!player?.team_id){setLinkedPlayer((player||null) as Player|null);setLoading(false);return}
    setLinkedPlayer(player as Player)
    const {data:teamData}=await supabase.from('teams').select('id,name,season_id').eq('id',player.team_id).maybeSingle()
    if(!teamData){setLoading(false);return}
    setTeam(teamData as Team)

    const [{data:rosterData},{data:teamDataAll},{data:monthData}]=await Promise.all([
      supabase.from('players').select('id,full_name,team_id,official_tee_color,is_active').eq('season_id',teamData.season_id).eq('is_active',true).order('full_name'),
      supabase.from('teams').select('id,name,season_id').eq('season_id',teamData.season_id).eq('is_active',true),
      supabase.from('league_months').select('id,month_start,course_name').eq('season_id',teamData.season_id).order('month_start')
    ])
    setRoster((rosterData||[]) as Player[])
    const {data:avatarData}=await supabase.rpc('get_league_player_avatars')
    const avatarMap:Record<string,string>={}
    ;((avatarData||[]) as PlayerAvatar[]).forEach(a=>{if(a.avatar_url)avatarMap[a.player_id]=a.avatar_url})
    setPlayerAvatars(avatarMap)
    setTeams((teamDataAll||[]) as Team[])
    setMonths((monthData||[]) as Month[])
    const monthIds=(monthData||[]).map(m=>m.id)
    if(monthIds.length){
      const [{data:scoreData},{data:handicapData},{data:cupData},{data:matchData}]=await Promise.all([
        supabase.from('weekly_scores').select('league_month_id,team_id,week_number,official_total,status').in('league_month_id',monthIds).eq('status','approved'),
        supabase.from('monthly_team_handicaps').select('league_month_id,team_id,handicap_points').in('league_month_id',monthIds),
        supabase.from('cup_points').select('league_month_id,team_id,points').in('league_month_id',monthIds),
        supabase.from('week4_matchups').select('league_month_id,seed_high,seed_low,team_high_id,team_low_id,winner_team_id').in('league_month_id',monthIds)
      ])
      setScores((scoreData||[]) as Score[])
      setHandicaps((handicapData||[]) as Handicap[])
      setCupPoints((cupData||[]) as CupPoint[])
      setMatchups((matchData||[]) as Matchup[])
    }
    setLoading(false)
  })()},[])

  const selectedMonth=useMemo(()=>{
    if(!months.length)return null
    const today=new Date(); today.setHours(0,0,0,0)
    const upcoming=months.find(m=>new Date(m.month_start+'T12:00:00')>=today)
    if(upcoming)return upcoming
    return months[months.length-1]
  },[months])

  const monthInfo=useMemo(()=>{
    if(!team||!selectedMonth)return null
    const monthScores=scores.filter(s=>s.league_month_id===selectedMonth.id&&s.status==='approved'&&s.week_number<=3)
    const myScores=scores.filter(s=>s.league_month_id===selectedMonth.id&&s.team_id===team.id).sort((a,b)=>a.week_number-b.week_number)
    const mySeedScores=myScores.filter(s=>s.week_number<=3)
    const teamRows=teams.map(t=>({id:t.id,total:monthScores.filter(s=>s.team_id===t.id).reduce((a,s)=>a+Number(s.official_total||0),0)})).sort((a,b)=>b.total-a.total)
    const myMonthlyRank=Math.max(1,teamRows.findIndex(r=>r.id===team.id)+1)
    const monthHandicap=handicaps.find(h=>h.league_month_id===selectedMonth.id&&h.team_id===team.id)?.handicap_points
    const latest=myScores.length?myScores[myScores.length-1]:null
    const matchup=matchups.find(m=>m.league_month_id===selectedMonth.id&&(m.team_high_id===team.id||m.team_low_id===team.id))||null
    const opponentId=matchup?(matchup.team_high_id===team.id?matchup.team_low_id:matchup.team_high_id):null
    const opponent=teams.find(t=>t.id===opponentId)?.name||null
    return {myScores,mySeedScores,myMonthlyRank,monthHandicap:monthHandicap==null?null:Number(monthHandicap),latest,matchup,opponent}
  },[team,selectedMonth,teams,scores,handicaps,matchups])

  const cupInfo=useMemo(()=>{
    if(!team)return {rank:null,total:0}
    const totals=teams.map(t=>({id:t.id,total:cupPoints.filter(p=>p.team_id===t.id).reduce((a,p)=>a+Number(p.points||0),0)})).sort((a,b)=>b.total-a.total)
    const rank=totals.findIndex(x=>x.id===team.id)
    return {rank:rank<0?null:rank+1,total:totals.find(x=>x.id===team.id)?.total||0}
  },[team,teams,cupPoints])

  if(loading)return <PlayerPage title=""><div className="card">Loading your team…</div></PlayerPage>
  if(!linkedPlayer||!team)return <PlayerPage title=""><div className="card my-team-empty"><h2>Team link needed</h2><p>Your account has not been linked to a league player/team yet. Ask the league administrator to link your account.</p></div></PlayerPage>

  return <PlayerPage title="">
    <div className="my-team-hero card">
      <div><div className="eyebrow">Team</div><select className="my-team-select" value={team.id} onChange={e=>{const next=teams.find(t=>t.id===e.target.value);if(next)setTeam(next)}} aria-label="Select team">{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><p className="muted">Here is your team's league snapshot.</p></div>
    </div>

    <div className="my-team-stats">
      <div className="card my-team-stat"><small>Monthly Position</small><strong>{monthInfo?`#${monthInfo.myMonthlyRank}`:'—'}</strong><span>{selectedMonth?monthLabel(selectedMonth.month_start):'No month set'}</span></div>
      <div className="card my-team-stat"><small>Cup Position</small><strong>{cupInfo.rank?`#${cupInfo.rank}`:'—'}</strong><span>{cupInfo.total} Cup points</span></div>
      <div className="card my-team-stat"><small>Monthly Handicap</small><strong>{monthInfo?.monthHandicap==null?'—':`${monthInfo.monthHandicap>=0?'+':''}${monthInfo.monthHandicap.toFixed(1)}`}</strong><span>Added to each round</span></div>
      <div className="card my-team-stat"><small>Latest Round</small><strong>{scoreText(monthInfo?.latest?.official_total)}</strong><span>{monthInfo?.latest?`Week ${monthInfo.latest.week_number}`:'No score yet'}</span></div>
    </div>

    <div className="my-team-grid">
      <div className="card">
        <div className="section-title compact"><div><div className="eyebrow">Current month</div><h2>{selectedMonth?monthLabel(selectedMonth.month_start):'League Month'}</h2></div></div>
        {selectedMonth?<><p className="my-team-course">⛳ <strong>{selectedMonth.course_name}</strong></p><div className="my-team-rounds">{[1,2,3,4].map(w=>{const s=monthInfo?.myScores.find(x=>x.week_number===w);return <div key={w}><small>Week {w}</small><strong>{scoreText(s?.official_total)}</strong></div>})}</div></>:<p className="muted">Monthly setup has not been entered yet.</p>}
        <Link href="/standings" className="my-team-link">View Monthly Standings ›</Link>
      </div>

      <div className="card">
        <div className="section-title compact"><div><div className="eyebrow">Week 4</div><h2>Match Play</h2></div></div>
        {!monthInfo?.matchup?<p className="muted">This team's Week 4 matchup has not been set yet.</p>:<div className="my-team-matchup"><strong>{team.name}</strong><span>vs</span><strong>{monthInfo.opponent||'Opponent'}</strong>{monthInfo.matchup.winner_team_id&&<small>{monthInfo.matchup.winner_team_id===team.id?'🏆 Team won':'Match completed'}</small>}</div>}
        <Link href="/cup#match-play" className="my-team-link">View Match Play ›</Link>
      </div>
    </div>

    <div className="card">
      <div className="section-title compact"><div><div className="eyebrow">Roster</div><h2>{team.name} Players</h2></div></div>
      <div className="my-team-roster">{roster.filter(p=>p.team_id===team.id).map(p=><div key={p.id} className="my-team-player"><span className="my-team-avatar">{playerAvatars[p.id]?<img src={playerAvatars[p.id]} alt={`${p.full_name} profile`}/>:<span aria-hidden="true">👤</span>}</span><div><strong>{p.full_name}{p.id===linkedPlayer.id?' (You)':''}</strong><small>{p.official_tee_color?`${p.official_tee_color.charAt(0).toUpperCase()+p.official_tee_color.slice(1)} tees`:'Tee not set'}</small></div></div>)}</div>
    </div>
  </PlayerPage>
}
