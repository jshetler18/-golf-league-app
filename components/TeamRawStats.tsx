'use client'

type RawRow={canonical_team_name:string;season_label:string;score_month:string;raw_score:number|string}

function monthYear(d:string){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}
function num(v:number|null){return v==null?'—':Number(v).toFixed(1)}

export function TeamRawStats({rows,teamName,currentSeason}:{rows:RawRow[];teamName:string;currentSeason:string}){
  const all=rows.filter(r=>r.canonical_team_name.trim().toLowerCase()===teamName.trim().toLowerCase()).map(r=>({...r,raw_score:Number(r.raw_score)}))
  const current=all.filter(r=>r.season_label===currentSeason)
  const avg=(a:typeof all)=>a.length?a.reduce((n,r)=>n+r.raw_score,0)/a.length:null
  const extreme=(a:typeof all,kind:'low'|'high')=>{
    if(!a.length)return null
    const value=kind==='low'?Math.min(...a.map(r=>r.raw_score)):Math.max(...a.map(r=>r.raw_score))
    const dates=Array.from(new Set(a.filter(r=>r.raw_score===value).map(r=>r.score_month))).sort((a,b)=>b.localeCompare(a))
    return {value,dates}
  }
  const allLow=extreme(all,'low'), seasonLow=extreme(current,'low'), allHigh=extreme(all,'high'), seasonHigh=extreme(current,'high')
  const latest=all.length?[...all].sort((a,b)=>b.score_month.localeCompare(a.score_month))[0].score_month:null
  const past=[...all].sort((a,b)=>b.score_month.localeCompare(a.score_month))

  const ExtremeSide=({label,data}:{label:string;data:{value:number;dates:string[]}|null})=><div className="raw-extreme-side">
    <small>{label}</small>
    <strong>{data?num(data.value):'—'}</strong>
    <div className="raw-extreme-dates">{data?.dates.length?data.dates.map(d=><span key={d}>{monthYear(d)}</span>):<span>No scores yet</span>}</div>
  </div>

  const Average=({value,detail}:{value:number|null;detail:string})=><div className="raw-group-average">
    <small>Average Raw Score</small>
    <strong>{num(value)}</strong>
    <span>{detail}</span>
  </div>

  return <div className="team-raw-stats">
    <div className="raw-stat-group">
      <h3>All-Time</h3>
      <Average value={avg(all)} detail={latest?`Through ${monthYear(latest)}`:'No scores yet'}/>
      <div className="raw-extreme-grid">
        <ExtremeSide label="Lowest Raw Score" data={allLow}/>
        <ExtremeSide label="Highest Raw Score" data={allHigh}/>
      </div>
    </div>

    <div className="raw-stat-group">
      <h3>Current Season</h3>
      <Average value={avg(current)} detail={current.length?`${currentSeason} Season`:'No scores yet'}/>
      <div className="raw-extreme-grid">
        <ExtremeSide label="Lowest Raw Score" data={seasonLow}/>
        <ExtremeSide label="Highest Raw Score" data={seasonHigh}/>
      </div>
    </div>

    <details className="past-scores-details">
      <summary>{teamName}'s Past Scores</summary>
      <div className="past-scores-list">
        {past.length?past.map((r,i)=>{
          const isHigh=allHigh?.value===r.raw_score
          const isLow=allLow?.value===r.raw_score
          return <div className="past-score-row" key={`${r.season_label}-${r.score_month}-${i}`}>
            <span className="past-score-date">{monthYear(r.score_month)}</span>
            <strong className={`past-score-value${isHigh?' is-high':isLow?' is-low':''}`}>{num(r.raw_score)}</strong>
          </div>
        }):<div className="past-score-empty">No past scores yet.</div>}
      </div>
    </details>
  </div>
}
