'use client'
import {useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {useAdminGuard,AdminDenied} from '../admin-shared'

const pointMap:Record<number,[number,number]>={1:[1000,800],3:[700,600],5:[500,400],7:[300,200],9:[100,0]}

export default function ScoreSubmissions(){
 const guard=useAdminGuard()
 const [rows,setRows]=useState<any[]>([])
 const [images,setImages]=useState<Record<string,string>>({})
 const [submitters,setSubmitters]=useState<Record<string,string>>({})
 const [msg,setMsg]=useState('')
 const [busy,setBusy]=useState('')

 async function load(){
   const {data,error}=await supabase.from('round_score_submissions').select('*,teams(name),league_months(month_start,course_name)').order('created_at',{ascending:false})
   if(error){setMsg(error.message);return}
   const rr=data||[]
   setRows(rr)
   const imgPairs=await Promise.all(rr.filter(r=>r.image_path).map(async r=>{
     const {data:s}=await supabase.storage.from('round-scorecards').createSignedUrl(r.image_path,900)
     return [r.id,s?.signedUrl||''] as const
   }))
   setImages(Object.fromEntries(imgPairs))
   const ids=[...new Set(rr.map(r=>r.submitted_by).filter(Boolean))]
   if(ids.length){
     const {data:p}=await supabase.from('profiles').select('id,full_name,email').in('id',ids)
     setSubmitters(Object.fromEntries((p||[]).map(x=>[x.id,x.full_name||x.email||'Player'])))
   }else setSubmitters({})
 }

 useEffect(()=>{if(guard.admin)load()},[guard.admin])

 async function syncCompletedWeek4(monthId:string){
   const [{data:m,error:matchLoadErr},{data:s,error:scoreLoadErr}]=await Promise.all([
     supabase.from('week4_matchups').select('id,seed_high,seed_low,team_high_id,team_low_id,winner_team_id').eq('league_month_id',monthId).order('seed_high'),
     supabase.from('weekly_scores').select('team_id,official_total').eq('league_month_id',monthId).eq('week_number',4).eq('status','approved')
   ])
   if(matchLoadErr)throw matchLoadErr
   if(scoreLoadErr)throw scoreLoadErr
   const scoreMap=new Map((s||[]).map((x:any)=>[x.team_id,Number(x.official_total)]))
   for(const matchup of m||[]){
     if(!scoreMap.has(matchup.team_high_id)||!scoreMap.has(matchup.team_low_id))continue
     const highScore=Number(scoreMap.get(matchup.team_high_id)),lowScore=Number(scoreMap.get(matchup.team_low_id))
     if(highScore===lowScore){
       if(matchup.winner_team_id)continue
       await supabase.from('week4_matchups').update({winner_team_id:null,high_points_awarded:null,low_points_awarded:null}).eq('id',matchup.id)
       await supabase.from('cup_points').delete().eq('league_month_id',monthId).in('team_id',[matchup.team_high_id,matchup.team_low_id])
       if(matchup.seed_high===1)await supabase.from('monthly_champions').delete().eq('league_month_id',monthId)
       continue
     }
     const highWins=highScore>lowScore
     const pair=pointMap[matchup.seed_high]
     if(!pair)continue
     const [winnerPts,loserPts]=pair
     const winnerId=highWins?matchup.team_high_id:matchup.team_low_id
     const highPts=highWins?winnerPts:loserPts,lowPts=highWins?loserPts:winnerPts
     const highPlacement=highWins?matchup.seed_high:matchup.seed_low,lowPlacement=highWins?matchup.seed_low:matchup.seed_high
     await supabase.from('week4_matchups').update({winner_team_id:winnerId,high_points_awarded:highPts,low_points_awarded:lowPts}).eq('id',matchup.id)
     await supabase.from('cup_points').upsert([
       {league_month_id:monthId,team_id:matchup.team_high_id,points:highPts,placement:highPlacement},
       {league_month_id:monthId,team_id:matchup.team_low_id,points:lowPts,placement:lowPlacement}
     ],{onConflict:'league_month_id,team_id'})
     if(matchup.seed_high===1)await supabase.from('monthly_champions').upsert({league_month_id:monthId,team_id:winnerId},{onConflict:'league_month_id'})
   }
 }

 async function notify(submissionId:string,action:'approved'|'denied',reason=''){
   const {data:{session}}=await supabase.auth.getSession()
   if(!session?.access_token)return
   try{await fetch('/api/push/round-review',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({submissionId,action,reason})})}catch{}
 }

 async function approve(r:any){
   if(!window.confirm(`Approve ${r.teams?.name}'s submitted score of ${Number(r.official_total).toFixed(1)}?`))return
   setBusy(r.id);setMsg('Approving scorecard…')
   const submitted=Number(r.official_total)
   const {error}=await supabase.from('weekly_scores').upsert({
     league_month_id:r.league_month_id,
     team_id:r.team_id,
     week_number:r.week_number,
     raw_stableford:submitted,
     bonus_birdies:0,
     bonus_points:0,
     handicap_points:0,
     status:'approved'
   },{onConflict:'league_month_id,team_id,week_number'})
   if(error){setMsg(error.message);setBusy('');return}
   const {data:{user}}=await supabase.auth.getUser()
   const {error:updateError}=await supabase.from('round_score_submissions').update({status:'approved',admin_note:null,approved_by:user?.id||null,approved_at:new Date().toISOString()}).eq('id',r.id)
   if(updateError){setMsg(updateError.message);setBusy('');return}
   if(Number(r.week_number)===4){try{await syncCompletedWeek4(r.league_month_id)}catch(e:any){setMsg(`Score approved, but the Week 4 Cup update needs attention: ${e?.message||'Unknown error'}`)}}
   await notify(r.id,'approved')
   setMsg(`${r.teams?.name} was approved. The score is now official and the league was notified.`)
   setBusy('');await load()
 }

 async function reject(r:any){
   const reason=window.prompt('Why are you denying this scorecard? This explanation will be sent only to the player who submitted it.','')
   if(reason===null)return
   if(!reason.trim()){setMsg('Please enter a reason before denying the scorecard.');return}
   setBusy(r.id);setMsg('Returning scorecard to player…')
   const {error}=await supabase.from('round_score_submissions').update({status:'rejected',admin_note:reason.trim(),approved_by:null,approved_at:null}).eq('id',r.id)
   if(error){setMsg(error.message);setBusy('');return}
   await notify(r.id,'denied',reason.trim())
   setMsg('Scorecard denied. Only the submitting player was notified and can now resubmit the corrected scorecard and score.')
   setBusy('');await load()
 }

 if(!guard.ready||!guard.admin)return <AdminDenied {...guard}/>
 return <><section className="hero"><div className="eyebrow">Administration</div><h1>Score Submissions</h1><p>Review the player's scorecard image and submitted total. Nothing is posted until you approve it.</p></section>
 {msg&&<p className="message">{msg}</p>}
 <div className="admin-score-list">{rows.length===0?<div className="card"><p>No scorecards have been submitted yet.</p></div>:rows.map(r=><div className="card manual-score-review-card" key={r.id}>
   <div className="submission-head"><div><h2>{r.teams?.name}</h2><p>{new Date(r.league_months?.month_start+'T12:00:00').toLocaleString('en-US',{month:'long',year:'numeric'})} · Week {r.week_number}</p><small>Submitted by {submitters[r.submitted_by]||'Player'}</small></div><span className={'submission-status '+r.status}>{r.status}</span></div>
   <div className="submitted-total-admin"><span>Player Submitted Score</span><strong>{Number(r.official_total).toFixed(1)}</strong></div>
   {images[r.id]?<a href={images[r.id]} target="_blank" rel="noreferrer" className="admin-scorecard-image-link"><img src={images[r.id]} alt={`${r.teams?.name} submitted scorecard`}/><span>Tap image to open full size</span></a>:<p className="message">No scorecard image is available.</p>}
   {r.status==='rejected'&&r.admin_note&&<div className="admin-denial-note"><b>Denial reason</b><span>{r.admin_note}</span></div>}
   {r.status==='pending'&&<div className="admin-actions"><button className="btn" disabled={busy===r.id} onClick={()=>approve(r)}>✓ Accept & Make Official</button><button className="btn danger" disabled={busy===r.id} onClick={()=>reject(r)}>Deny Scorecard</button></div>}
 </div>)}</div></>
}
