export type HandicapScore={score:number;season_label?:string;score_month:string;round_number?:number|null}
export type HandicapCalc={available:number;recent:HandicapScore[];counted:HandicapScore[];excluded:HandicapScore[];average:number|null;recommended:number|null;method:string}

const dateValue=(r:HandicapScore)=>new Date(`${r.score_month.slice(0,10)}T12:00:00`).getTime()+(Number(r.round_number||0)*1000)

export function calculateHandicap(rows:HandicapScore[],standard:number):HandicapCalc{
 const recent=[...rows].filter(r=>Number.isFinite(Number(r.score))).sort((a,b)=>dateValue(b)-dateValue(a)).slice(0,12)
 const n=recent.length
 if(n<3)return{available:n,recent,counted:recent,excluded:[],average:null,recommended:null,method:'At least 3 rounds are needed.'}
 let drops=n>=8?2:n>=5?1:0
 const excluded=[...recent].sort((a,b)=>a.score-b.score||dateValue(a)-dateValue(b)).slice(0,drops)
 const excludedSet=new Set(excluded)
 const counted=recent.filter(r=>!excludedSet.has(r))
 let average:number
 let method:string
 if(n>=12){
   // After dropping the two lowest, weight the remaining scores by recency:
   // newest 4 = 50%, next 4 = 30%, oldest 2 = 20%.
   const newest=counted.slice(0,4),middle=counted.slice(4,8),oldest=counted.slice(8)
   const avg=(x:HandicapScore[])=>x.reduce((s,r)=>s+r.score,0)/x.length
   average=avg(newest)*.50+avg(middle)*.30+avg(oldest)*.20
   method='Best 10 of last 12; newest 4 weighted 50%, next 4 30%, oldest 2 20%.'
 }else{
   average=counted.reduce((s,r)=>s+r.score,0)/counted.length
   method=n>=8?'Last 8–11; lowest 2 dropped.':n>=5?'Last 5–7; lowest 1 dropped.':'Last 3–4; all rounds counted.'
 }
 const recommended=Math.max(0,Math.round(standard-average))
 return{available:n,recent,counted,excluded,average,recommended,method}
}
export function scoreLabel(r:HandicapScore){
 const d=new Date(`${r.score_month.slice(0,10)}T12:00:00`)
 return `${d.toLocaleDateString('en-US',{month:'short',year:'numeric'})}${r.round_number?` W${r.round_number}`:''}`
}
