'use client'
import {useCallback,useEffect,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {supabase} from '@/lib/supabase'

type Submission={id:string;week_number:number;official_total:number;monthly_handicap:number;created_at:string;image_url:string;submitted_by_name:string;teams?:{name:string};league_months?:{month_start:string;course_name:string}}

export default function ScorecardOfficialPage(){
 const [allowed,setAllowed]=useState<boolean|null>(null)
 const [rows,setRows]=useState<Submission[]>([])
 const [msg,setMsg]=useState('')
 const [busy,setBusy]=useState('')

 const load=useCallback(async()=>{
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setAllowed(false);return}
  const {data:p}=await supabase.from('profiles').select('role,is_scorecard_official,status').eq('id',user.id).single()
  const can=!!p&&p.status==='approved'&&(p.role==='admin'||p.is_scorecard_official)
  setAllowed(can)
  if(!can)return
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token)return
  const r=await fetch('/api/scorecard-review',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'})
  const j=await r.json()
  if(!r.ok){setMsg(j.error||'Unable to load scorecards.');return}
  setRows(j.rows||[])
 },[])
 useEffect(()=>{load()},[load])

 async function review(row:Submission,action:'approved'|'denied'){
  let reason=''
  if(action==='approved'){
   if(!window.confirm(`Approve ${row.teams?.name||'this team'}'s submitted score of ${Number(row.official_total).toFixed(1)}? This will make the round official.`))return
  }else{
   const entered=window.prompt('Why are you denying this scorecard? This explanation will be sent only to the player who submitted it.','')
   if(entered===null)return
   reason=entered.trim()
   if(!reason){setMsg('Please enter an explanation before denying the scorecard.');return}
  }
  setBusy(row.id);setMsg(action==='approved'?'Approving scorecard…':'Returning scorecard to player…')
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setMsg('Please sign in again.');setBusy('');return}
  const r=await fetch('/api/scorecard-review',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({submissionId:row.id,action,reason})})
  const j=await r.json()
  if(!r.ok){setMsg(j.error||'Unable to review scorecard.');setBusy('');return}
  setMsg(j.message||'Scorecard review saved.')
  setBusy('');await load()
 }

 if(allowed===null)return <PlayerPage title="Scorecard Official"><div className="simple-mobile-page"><p>Loading scorecards…</p></div></PlayerPage>
 if(!allowed)return <PlayerPage title="Scorecard Official"><div className="simple-mobile-page"><div className="card"><h1>Scorecard Officials</h1><p>This area is available only to players designated as Scorecard Officials by the league admin.</p></div></div></PlayerPage>
 return <PlayerPage title="Scorecard Official"><div className="simple-mobile-page scorecard-official-page-v1298">
  <div className="scorecard-official-title-v1298"><span>✓</span><div><h1>Scorecard Official</h1><p>Review submitted scorecards and scores waiting for league approval.</p></div></div>
  {msg&&<p className="message">{msg}</p>}
  {rows.length===0?<div className="card scorecard-official-empty-v1298"><strong>All caught up!</strong><span>There are no scorecards waiting for approval.</span></div>:<div className="scorecard-official-list-v1298">{rows.map(r=>{
   const month=r.league_months?.month_start?new Date(r.league_months.month_start+'T12:00:00').toLocaleString('en-US',{month:'long',year:'numeric'}):'League Round'
   return <article className="card scorecard-official-card-v1298" key={r.id}>
    <div className="submission-head"><div><h2>{r.teams?.name}</h2><p>{month} · Week {r.week_number}</p>{r.league_months?.course_name&&<small>{r.league_months.course_name}</small>}<small>Submitted by {r.submitted_by_name}</small></div><span className="submission-status pending">pending</span></div>
    <div className="scorecard-official-score-summary-v1299">
     <div><span>Submitted Score</span><strong>{Number(r.official_total).toFixed(1)}</strong><small>total with handicap</small></div>
     <div><span>Monthly Team Handicap</span><strong>{Number(r.monthly_handicap)>=0?'+':''}{Number(r.monthly_handicap||0).toFixed(1)}</strong><small>{month}</small></div>
     <div><span>Score Before Handicap</span><strong>{(Number(r.official_total)-Number(r.monthly_handicap||0)).toFixed(1)}</strong><small>{(Number(r.official_total)-Number(r.monthly_handicap||0)).toFixed(1)} {Number(r.monthly_handicap||0)>=0?'+':'−'} {Math.abs(Number(r.monthly_handicap||0)).toFixed(1)} = {Number(r.official_total).toFixed(1)}</small></div>
    </div>
    {r.image_url?<a className="admin-scorecard-image-link" href={r.image_url} target="_blank" rel="noreferrer"><img src={r.image_url} alt={`${r.teams?.name||'Team'} scorecard`}/><span>Tap scorecard to open full size</span></a>:<p className="message">Scorecard image is unavailable.</p>}
    <div className="scorecard-official-actions-v1298"><button className="btn" disabled={busy===r.id} onClick={()=>review(r,'approved')}>✓ Approve Score & Scorecard</button><button className="btn danger" disabled={busy===r.id} onClick={()=>review(r,'denied')}>Deny</button></div>
   </article>
  })}</div>}
 </div></PlayerPage>
}
