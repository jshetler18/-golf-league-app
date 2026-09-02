'use client'

type RawRow={canonical_team_name:string;season_label:string;score_month:string;raw_score:number|string}

function monthYear(d:string){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}
function num(v:number|null){return v==null?'—':Number(v).toFixed(1)}

export function TeamRawStats({rows,teamName,currentSeason}:{rows:RawRow[];teamName:string;currentSeason:string}){
  const all=rows.filter(r=>r.canonical_team_name.trim().toLowerCase()===teamName.trim().toLowerCase()).map(r=>({...r,raw_score:Number(r.raw_score)}))
  const current=all.filter(r=>r.season_label===currentSeason)
  const avg=(a:typeof all)=>a.length?a.reduce((n,r)=>n+r.raw_score,0)/a.length:null
  const extreme=(a:typeof all,kind:'low'|'high')=>{if(!a.length)return null;const value=kind==='low'?Math.min(...a.map(r=>r.raw_score)):Math.max(...a.map(r=>r.raw_score));const hits=a.filter(r=>r.raw_score===value).sort((x,y)=>x.score_month.localeCompare(y.score_month));return {value,date:hits[0].score_month}}
  const allLow=extreme(all,'low'), seasonLow=extreme(current,'low'), allHigh=extreme(all,'high'), seasonHigh=extreme(current,'high')
  const latest=all.length?[...all].sort((a,b)=>b.score_month.localeCompare(a.score_month))[0].score_month:null
  const Stat=({label,value,detail}:{label:string;value:string;detail:string})=><div className="raw-stat-box"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
  return <div className="team-raw-stats">
    <div className="raw-stat-feature"><small>All-Time Average Raw Score</small><strong>{num(avg(all))}</strong><span>{latest?`Through ${monthYear(latest)}`:'No scores yet'}</span></div>
    <div className="raw-stat-grid">
      <Stat label="Current Season Average Raw Score" value={num(avg(current))} detail={current.length?`${currentSeason} Season`:'No scores yet'}/>
      <Stat label="All-Time Lowest Raw Score" value={allLow?num(allLow.value):'—'} detail={allLow?monthYear(allLow.date):'No scores yet'}/>
      <Stat label="Current Season Lowest Raw Score" value={seasonLow?num(seasonLow.value):'—'} detail={seasonLow?monthYear(seasonLow.date):'No scores yet'}/>
      <Stat label="All-Time Highest Raw Score" value={allHigh?num(allHigh.value):'—'} detail={allHigh?monthYear(allHigh.date):'No scores yet'}/>
      <Stat label="Current Season Highest Raw Score" value={seasonHigh?num(seasonHigh.value):'—'} detail={seasonHigh?monthYear(seasonHigh.date):'No scores yet'}/>
    </div>
  </div>
}
