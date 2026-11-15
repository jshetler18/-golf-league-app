'use client'
import React from 'react'
type Team={id:string;name:string}
type Score={team_id:string;week_number:number;official_total:number|null;status:string}
type Handicap={team_id:string;handicap_points:number}
type Matchup={id:string;seed_high:number;seed_low:number;team_high_id:string;team_low_id:string;winner_team_id:string|null;high_points_awarded:number|null;low_points_awarded:number|null}
type Props={month:string;teams:Team[];scores:Score[];handicaps:Handicap[];matchups:Matchup[];scoreCap:number}
const pointPairs=[[1000,800],[700,600],[500,400],[300,200],[150,100]]
const names=['CHAMPIONSHIP MATCHUP','3RD & 4TH MATCHUP','5TH & 6TH MATCHUP','7TH & 8TH MATCHUP','TOILET BOWL']
export default function Week4TV({month,teams,scores,handicaps,matchups,scoreCap}:Props){
 const handicap=(id:string)=>Number(handicaps.find(h=>h.team_id===id)?.handicap_points??0)
 const byId=(id:string)=>teams.find(t=>t.id===id)?.name?.toUpperCase()||'TEAM PENDING'
 const score=(id:string)=>{const v=scores.find(s=>s.team_id===id&&s.week_number===4)?.official_total;return v==null?null:Math.min(Number(v),scoreCap)}
 const ranking=teams.map(t=>({id:t.id,total:scores.filter(s=>s.team_id===t.id&&s.week_number<=3).reduce((a,s)=>a+Math.min(Number(s.official_total||0),scoreCap),0)})).sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id))
 const useSaved=matchups.length===5&&matchups.every(m=>m.team_high_id&&m.team_low_id)&&new Set(matchups.flatMap(m=>[m.team_high_id,m.team_low_id])).size===10
 const pairs=Array.from({length:5},(_,i)=>(useSaved?matchups.find(m=>m.seed_high===i*2+1):null)||{id:'provisional-'+i,seed_high:i*2+1,seed_low:i*2+2,team_high_id:ranking[i*2]?.id||'',team_low_id:ranking[i*2+1]?.id||'',winner_team_id:null,high_points_awarded:null,low_points_awarded:null})
 const fmt=(v:number|null)=>v==null?'—':v.toFixed(1)
 const row=(id:string,other:string,seed:number,pts:number,winner:string|null,completed:boolean,awarded:number|null)=>{
  const diff=Math.max(0,handicap(id)-handicap(other))
  const v=score(id)
  return <div className="w4team" key={seed}><div className="w4name"><span className="w4seed">{seed} SEED</span><strong>{byId(id)}</strong>{diff>0&&<b className="w4help">(+{diff})</b>}</div><div className="w4numbers"><span className="w4score"><em>SCORE</em><b>{completed&&winner===id&&<span className="w4trophy">🏆</span>}{fmt(v)}</b></span><span className="w4points"><em>CUP PTS</em><b>{completed&&awarded!=null?awarded.toLocaleString():'—'}</b></span></div></div>
 }
 return <main className="w4screen"><style>{`

 .w4screen,.w4screen *{box-sizing:border-box}
 .w4screen{width:100%;height:100dvh;overflow:hidden;margin:0;padding:1.1vh .55vw 1.8vh;background:#001c2d;color:#fff;font-family:'Arial Narrow','Roboto Condensed',Impact,Arial,sans-serif;display:grid;grid-template-rows:11% 20% minmax(0,1fr);gap:1.2vh}
 .w4header{min-height:0;min-width:0;display:grid;grid-template-columns:14.5% .35% minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:1.2%;align-items:center;overflow:hidden}
 .w4logo{width:100%;height:100%;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:.35vh .5vw}.w4header img{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center}
 .w4bar{height:80%;width:100%;background:#43f719;border-radius:10px}
 .w4header h1{font-family:Impact,'Arial Narrow','Arial Black',sans-serif;font-stretch:condensed;font-size:min(3.2vw,5.8vh);line-height:1;letter-spacing:-.045em;font-weight:1000;white-space:nowrap;overflow:hidden;margin:0;text-shadow:1px 3px 2px #000}
 .w4champ{min-width:0;min-height:0;border:3px solid #4bff20;border-radius:1.5vw;box-shadow:inset 0 0 0 2px #fff;display:grid;grid-template-columns:21.5% minmax(0,1fr) 5.2% minmax(0,1fr);align-items:stretch;overflow:hidden;background:linear-gradient(180deg,#00283b,#001c2c)}
 .w4champlabel{font-family:Impact,'Arial Narrow','Arial Black',sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;background:linear-gradient(120deg,#0d7810,#03470b);border-right:5px solid #fff;transform:skewX(-9deg);margin-left:-.6vw;padding:.5vw;font-size:2.05vw;font-style:italic;font-weight:1000;line-height:1.13}
 .w4champlabel span{transform:skewX(9deg);display:block;width:100%;font-size:clamp(22px,2.5vw,49px);font-weight:1000;letter-spacing:-.055em;line-height:1.06;text-shadow:1px 2px 2px #002a06}
 .w4champ .w4team{justify-content:center;gap:1.3vh;padding:.4vw;overflow:hidden}
 .w4vs{font-size:2.7vw;font-weight:1000;display:flex;align-items:center;justify-content:center}
 .w4champ .w4vs{position:relative}
 .w4champ .w4vs:before,.w4champ .w4vs:after{content:none}
 .w4champ .w4vs:before{top:4%}.w4champ .w4vs:after{bottom:4%}
 .w4grid{min-width:0;min-height:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55vw}
 .w4card{min-width:0;min-height:0;border:3px solid #e9f1f7;border-radius:1.5vw;overflow:hidden;display:grid;grid-template-rows:15% minmax(0,1fr) 10% minmax(0,1fr);background:linear-gradient(180deg,#032c40,#001b2c)}
 .w4card h2{font-family:Impact,'Arial Narrow','Arial Black',sans-serif;margin:0;padding:.3vw;background:linear-gradient(#f6f8fb,#aebdcd);color:#070c13;text-align:center;font-size:2.25vw;line-height:1.0;font-weight:1000;font-style:italic;display:flex;align-items:center;justify-content:center;flex-direction:column}
 .w4card .w4team{min-width:0;min-height:0;justify-content:center;gap:2.6vh;padding:.22vw}
 .w4card .w4vs{font-size:2.65vw;gap:.45vw;min-height:0}
 .w4card .w4vs:before,.w4card .w4vs:after{content:none}
 .w4team{min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center}
 .w4name{width:100%;min-width:0;display:flex;align-items:center;justify-content:center;gap:.3vw;white-space:nowrap;line-height:1}
 .w4name strong{font-family:Impact,'Arial Narrow','Arial Black',sans-serif;font-size:1.87vw;letter-spacing:-.05em;font-weight:1000}
 .w4champ .w4name strong{font-size:2.65vw;letter-spacing:-.055em}
 .w4seed{font-family:Impact,'Arial Narrow','Arial Black',sans-serif;flex:none;padding:.3vw .42vw;background:linear-gradient(#faffed,#a2f350);border-radius:.55vw;color:#081707;font-size:1.44vw;font-weight:1000}
 .w4champ .w4seed{font-size:1.35vw}
 .w4help{font-size:1.25vw;color:#ffe500}
 .w4numbers{min-width:0;display:flex;align-items:center;justify-content:center;gap:.6vw}
 .w4score,.w4points{display:flex;align-items:center;border:2px solid #d9e6ed;border-radius:.6vw;overflow:hidden;font-weight:1000;white-space:nowrap;line-height:1}
 .w4numbers em{font-family:Impact,'Arial Narrow','Arial Black',sans-serif;font-style:italic;background:linear-gradient(#18c614,#057a0a);padding:.42vw .45vw;font-size:1.08vw;color:#fff}
 .w4numbers b{font-family:Impact,'Arial Narrow','Arial Black',sans-serif;font-size:1.7vw;padding:.35vw .42vw;background:#f1f4f8;color:#080b0f}
 .w4points b{background:#051626;color:#fff}
 .w4champ .w4numbers{gap:.55vw;flex-wrap:nowrap;width:100%}
 .w4champ .w4score,.w4champ .w4points{flex:1 1 0;min-width:0;display:grid;grid-template-columns:51% 49%;align-items:stretch}
 .w4champ .w4numbers em{font-size:1.55vw;padding:.52vw .3vw;display:flex;align-items:center;justify-content:center}
 .w4champ .w4numbers b{font-size:2.05vw;padding:.45vw .2vw;display:flex;align-items:center;justify-content:center;min-width:0}
 .w4card .w4numbers{flex-direction:column;gap:1.1vh;width:100%}
 .w4card .w4score,.w4card .w4points{width:82%;display:grid;grid-template-columns:48% 52%;align-items:stretch}
 .w4card .w4score em,.w4card .w4points em{font-size:1.7vw;padding:.52vw .15vw;display:flex;align-items:center;justify-content:center}
 .w4card .w4score b,.w4card .w4points b{font-size:2.3vw;padding:.45vw .15vw;display:flex;align-items:center;justify-content:center;min-width:0}
 .w4trophy{display:inline-block;font-size:.85em;transform:rotate(-16deg);margin-right:.12vw}
 .w4pending{position:absolute;right:.8vw;bottom:0;font-size:.7vw;color:#ffe991;background:#001c2d;padding:0 .4vw}
 `}</style>
 <header className="w4header"><div className="w4logo"><img src="/Tom%20Krise%2019th%20Hole%20Golf%20League%20Logo%20(1).png" alt="Tom Krise 19th Hole Golf League"/></div><span className="w4bar"/><h1>{month.toUpperCase()} WEEK 4 HEAD-TO-HEAD MATCHUPS</h1></header>
 <section className="w4champ"><div className="w4champlabel"><span>CHAMPIONSHIP<br/>MATCHUP<br/>(1ST &amp; 2ND)</span></div>{row(pairs[0].team_high_id,pairs[0].team_low_id,1,1000,pairs[0].winner_team_id,!!pairs[0].winner_team_id&&score(pairs[0].team_high_id)!=null&&score(pairs[0].team_low_id)!=null,pairs[0].high_points_awarded)}<div className="w4vs">VS</div>{row(pairs[0].team_low_id,pairs[0].team_high_id,2,800,pairs[0].winner_team_id,!!pairs[0].winner_team_id&&score(pairs[0].team_high_id)!=null&&score(pairs[0].team_low_id)!=null,pairs[0].low_points_awarded)}</section>
 <section className="w4grid">{pairs.slice(1).map((p,i)=>{const done=!!p.winner_team_id&&score(p.team_high_id)!=null&&score(p.team_low_id)!=null;return <div className="w4card" key={p.id}><h2>{i===3?<><span>TOILET BOWL</span><span>(9TH &amp; 10TH)</span></>:<><span>{['3RD & 4TH','5TH & 6TH','7TH & 8TH'][i]}</span><span>MATCHUP</span></>}</h2>{row(p.team_high_id,p.team_low_id,p.seed_high,pointPairs[i+1][0],p.winner_team_id,done,p.high_points_awarded)}<div className="w4vs">VS</div>{row(p.team_low_id,p.team_high_id,p.seed_low,pointPairs[i+1][1],p.winner_team_id,done,p.low_points_awarded)}</div>})}</section>
 </main>
}
