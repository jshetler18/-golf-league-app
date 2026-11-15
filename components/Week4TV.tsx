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
 const completeWeek3=teams.length===10&&teams.every(t=>[1,2,3].every(w=>scores.some(s=>s.team_id===t.id&&s.week_number===w)))
 const pairs=Array.from({length:5},(_,i)=>matchups.find(m=>m.seed_high===i*2+1)||{id:'provisional-'+i,seed_high:i*2+1,seed_low:i*2+2,team_high_id:ranking[i*2]?.id||'',team_low_id:ranking[i*2+1]?.id||'',winner_team_id:null,high_points_awarded:null,low_points_awarded:null})
 const fmt=(v:number|null)=>v==null?'—':v.toFixed(1)
 const row=(id:string,other:string,seed:number,pts:number,winner:string|null,completed:boolean,awarded:number|null)=>{
  const diff=Math.max(0,handicap(id)-handicap(other))
  const v=score(id)
  return <div className="w4team" key={id}><div className="w4name"><span className="w4seed">{seed} SEED</span><strong>{byId(id)}</strong>{diff>0&&<b className="w4help">(+{diff})</b>}</div><div className="w4numbers"><span className="w4score"><em>SCORE:</em><b>{completed&&winner===id&&<span className="w4trophy">🏆</span>}{fmt(v)}</b></span><span className="w4points"><em>CUP PTS</em><b>{completed&&awarded!=null?awarded.toLocaleString():'—'}</b></span></div></div>
 }
 return <main className="w4screen"><style>{`
 .w4screen{height:100vh;overflow:hidden;box-sizing:border-box;padding:1vh .7vw 2vh;background:radial-gradient(ellipse at 50% 35%,#073454 0%,#001b2e 75%);color:white;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;gap:1.5vh}
 .w4header{height:12vh;min-height:0;display:flex;align-items:center;gap:1.6vw}
 .w4header img{height:95%;width:15vw;object-fit:contain}
 .w4bar{width:.3vw;height:75%;border-radius:8px;background:#46ed10}
 .w4header h1{font-size:clamp(25px,3.65vw,74px);font-weight:1000;white-space:nowrap;letter-spacing:-.04em;text-shadow:2px 4px 3px #000;margin:0}
 .w4champ{flex:0 0 22%;min-height:0;border:4px solid #45ed13;border-radius:1.6vw;display:grid;grid-template-columns:19% 1fr 6% 1fr;align-items:stretch;box-shadow:inset 0 0 0 2px #fff;background:linear-gradient(90deg,#03283e,#001b30)}
 .w4champlabel{background:linear-gradient(130deg,#2a9a0a,#00551c);display:flex;align-items:center;justify-content:center;text-align:center;font-weight:1000;font-size:2.1vw;line-height:1.2;border-radius:1.3vw 0 0 1.3vw}
 .w4champ .w4team{justify-content:center;padding:.7vw}
 .w4vs{display:flex;align-items:center;justify-content:center;color:#fff;font-size:3vw;font-weight:1000}
 .w4grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55vw}
 .w4card{border:3px solid #e5eef4;border-radius:1.4vw;min-width:0;display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(140deg,#06374d,#001526)}
 .w4card h2{height:21%;min-height:0;margin:0;background:linear-gradient(#f1f5f9,#a9b7c8);color:#080b12;text-align:center;display:flex;align-items:center;justify-content:center;font-size:1.9vw;font-weight:1000;line-height:1.1}
 .w4card .w4team{flex:1;min-height:0;justify-content:center;padding:.5vw}
 .w4card .w4vs{height:7%;font-size:2vw;position:relative}
 .w4card .w4vs:before,.w4card .w4vs:after{content:'';height:4px;background:#42eb10;flex:1;margin:0 .6vw}
 .w4team{display:flex;flex-direction:column;gap:1vh;align-items:center;min-width:0}
 .w4name{display:flex;gap:.4vw;align-items:center;justify-content:center;min-width:0;width:100%;white-space:nowrap}
 .w4name strong{font-size:1.6vw;font-weight:1000;letter-spacing:-.05em}
 .w4champ .w4name strong{font-size:2.5vw}
 .w4seed{flex:none;border-radius:.6vw;background:linear-gradient(#f8ffea,#7fe831);color:#061a0c;font-size:1.12vw;font-weight:1000;padding:.45vw}
 .w4champ .w4seed{font-size:1.45vw}
 .w4help{font-size:1.6vw;color:#ffe500}
 .w4numbers{display:flex;align-items:center;justify-content:center;gap:.5vw;flex-wrap:wrap}
 .w4score,.w4points{display:flex;align-items:center;border:2px solid #dce7ec;border-radius:.6vw;overflow:hidden;font-weight:1000;white-space:nowrap}
 .w4numbers em{font-size:1.2vw;font-style:normal;background:linear-gradient(#14c40c,#05620c);padding:.35vw .5vw}
 .w4numbers b{font-size:1.7vw;padding:.3vw .5vw;background:#eaf1f8;color:#080b0e}
 .w4points b{background:#041526;color:white}
 .w4champ .w4numbers em{font-size:1.4vw}.w4champ .w4numbers b{font-size:2.1vw}
 .w4trophy{display:inline-block;font-size:.8em;transform:rotate(-17deg);margin-right:.2vw}
 .w4pending{position:absolute;bottom:.4vh;right:1vw;font-size:1vw;color:#f8e99b}
 `}</style>
 <header className="w4header"><img src="/Tom%20Krise%2019th%20Hole%20Golf%20League%20Logo%20(1).png" alt="Tom Krise 19th Hole Golf League"/><span className="w4bar"/><h1>{month.toUpperCase()} WEEK 4 HEAD-TO-HEAD MATCHUPS</h1></header>
 <section className="w4champ"><div className="w4champlabel">CHAMPIONSHIP<br/>MATCHUP<br/>(1ST &amp; 2ND)</div>{row(pairs[0].team_high_id,pairs[0].team_low_id,1,1000,pairs[0].winner_team_id,!!pairs[0].winner_team_id&&score(pairs[0].team_high_id)!=null&&score(pairs[0].team_low_id)!=null,pairs[0].high_points_awarded)}<div className="w4vs">VS</div>{row(pairs[0].team_low_id,pairs[0].team_high_id,2,800,pairs[0].winner_team_id,!!pairs[0].winner_team_id&&score(pairs[0].team_high_id)!=null&&score(pairs[0].team_low_id)!=null,pairs[0].low_points_awarded)}</section>
 <section className="w4grid">{pairs.slice(1).map((p,i)=>{const done=!!p.winner_team_id&&score(p.team_high_id)!=null&&score(p.team_low_id)!=null;return <div className="w4card" key={p.id}><h2>{names[i+1]}</h2>{row(p.team_high_id,p.team_low_id,p.seed_high,pointPairs[i+1][0],p.winner_team_id,done,p.high_points_awarded)}<div className="w4vs">VS</div>{row(p.team_low_id,p.team_high_id,p.seed_low,pointPairs[i+1][1],p.winner_team_id,done,p.low_points_awarded)}</div>})}</section>
 {!completeWeek3&&<div className="w4pending">SEEDS PROVISIONAL UNTIL ALL WEEK 3 SCORES ARE APPROVED</div>}
 </main>
}
