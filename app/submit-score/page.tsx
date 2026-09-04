'use client'
import {useEffect,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {supabase} from '@/lib/supabase'

type Month={id:string;month_start:string;course_name:string|null}
type Ctx={userId:string;teamId:string;teamName:string;months:Month[]}
type PendingRound={id:string;league_month_id:string;week_number:number;official_total:number}

const monthName=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleString('en-US',{month:'long'})
const defaultWeek=(d:Date)=>Math.min(4,Math.floor((d.getDate()-1)/7)+1)

export default function SubmitScore(){
 const [ctx,setCtx]=useState<Ctx|null>(null)
 const [monthId,setMonthId]=useState('')
 const [week,setWeek]=useState(1)
 const [changeRound,setChangeRound]=useState(false)
 const [roundMonthChoice,setRoundMonthChoice]=useState('')
 const [roundWeekChoice,setRoundWeekChoice]=useState('')
 const [existing,setExisting]=useState<any>(null)
 const [pendingRounds,setPendingRounds]=useState<PendingRound[]>([])
 const [file,setFile]=useState<File|null>(null)
 const [preview,setPreview]=useState('')
 const [score,setScore]=useState('')
 const [msg,setMsg]=useState('')
 const [saving,setSaving]=useState(false)
 const [successOpen,setSuccessOpen]=useState(false)

 useEffect(()=>{(async()=>{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user)return
   const {data:p}=await supabase.from('profiles').select('player_id').eq('id',user.id).single()
   if(!p?.player_id){setMsg('Your account must be linked to a league player before submitting a score.');return}
   const {data:pl}=await supabase.from('players').select('team_id,teams(name)').eq('id',p.player_id).single()
   const teamId=(pl as any)?.team_id
   if(!teamId)return
   const {data:season}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).maybeSingle()
   if(!season){setMsg('There is no active league season.');return}
   const {data:months}=await supabase.from('league_months').select('id,month_start,course_name').eq('season_id',season.id).order('month_start')
   const ms=(months||[]) as Month[]
   const now=new Date(),key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
   const current=ms.find(m=>String(m.month_start).startsWith(key))||ms[0]
   if(!current){setMsg('No league months have been configured yet.');return}
   setCtx({userId:user.id,teamId,teamName:(pl as any)?.teams?.name||'My Team',months:ms})
   setMonthId(current.id)
   setWeek(String(current.month_start).startsWith(key)?defaultWeek(now):1)
 })()},[])

 async function loadPendingRounds(){
   if(!ctx)return
   const {data}=await supabase.from('round_score_submissions')
     .select('id,league_month_id,week_number,official_total')
     .eq('team_id',ctx.teamId)
     .eq('status','pending')
     .order('created_at',{ascending:true})
   setPendingRounds((data||[]) as PendingRound[])
 }

 async function loadExisting(){
   if(!ctx||!monthId)return
   const {data}=await supabase.from('round_score_submissions').select('*').eq('league_month_id',monthId).eq('team_id',ctx.teamId).eq('week_number',week).maybeSingle()
   setExisting(data||null)
   setFile(null);setPreview('');setScore('');setMsg('');setSuccessOpen(false)
   await loadPendingRounds()
 }
 useEffect(()=>{loadExisting()},[ctx?.teamId,monthId,week])

 const selectedMonth=ctx?.months.find(m=>m.id===monthId)
 const locked=existing?.status==='approved'||existing?.status==='pending'
 const pendingFor=(m:string,w:number)=>pendingRounds.some(r=>r.league_month_id===m&&r.week_number===w)

 function choose(f:File){
   setFile(f)
   if(preview)URL.revokeObjectURL(preview)
   setPreview(URL.createObjectURL(f))
   setMsg('')
 }

 async function submit(){
   if(!ctx||!selectedMonth||!file)return
   const entered=Number(score)
   if(!Number.isFinite(entered)||entered<0){setMsg('Please enter the total score you believe your team earned.');return}
   if(existing?.status==='pending'||existing?.status==='approved'){setMsg('That league round has already been submitted or completed.');return}
   setSaving(true);setMsg('')
   const ext=(file.name.split('.').pop()||'jpg').toLowerCase()
   const path=`${ctx.userId}/${monthId}-${ctx.teamId}-w${week}-${Date.now()}.${ext}`
   const up=await supabase.storage.from('round-scorecards').upload(path,file,{upsert:false})
   if(up.error){setMsg(up.error.message);setSaving(false);return}

   const row={
     league_month_id:monthId,
     team_id:ctx.teamId,
     week_number:week,
     submitted_by:ctx.userId,
     image_path:path,
     hole_scores:[],
     hole_pars:[],
     stableford_points:[],
     raw_stableford:0,
     bonus_birdies:0,
     bonus_points:0,
     handicap_points:0,
     official_total:entered,
     status:'pending',
     admin_note:null,
     approved_by:null,
     approved_at:null,
     validation_passed:false,
     validation_report:[],
     detected_course_name:null,
     detected_player_names:[],
     detected_settings:{},
     played_holes:[]
   }
   const {error}=await supabase.from('round_score_submissions').upsert(row,{onConflict:'league_month_id,team_id,week_number'})
   if(error){setMsg(error.message);setSaving(false);return}
   setExisting({...row,status:'pending'})
   await loadPendingRounds()
   setSuccessOpen(true)
   setSaving(false)
 }

 if(!ctx||!selectedMonth)return <PlayerPage title="Submit Score"><div className="simple-mobile-page"><h1>Submit Score</h1><p>{msg||'Loading your round…'}</p></div></PlayerPage>

 return <PlayerPage title="Submit Score"><div className="simple-mobile-page submit-score-page">
   <h1>Submit Score</h1>
   <div className="card">
     <h2>{ctx.teamName}</h2>
     <div className="selected-round">
       <strong>{monthName(selectedMonth)} · Week {week}</strong>
       {!changeRound&&<button type="button" className="change-round-link" onClick={()=>{setRoundMonthChoice('');setRoundWeekChoice('');setChangeRound(true)}}>Change Round</button>}
     </div>
     {changeRound&&<div className="round-picker round-picker-required-v1297">
       <div className="round-picker-intro-v1297"><strong>Select the round you are submitting</strong><span>Choose both the league month and week before continuing.</span></div>
       <label>League Month<select value={roundMonthChoice} onChange={e=>setRoundMonthChoice(e.target.value)}><option value="">Select month…</option>{ctx.months.map(m=><option key={m.id} value={m.id}>{monthName(m)}</option>)}</select></label>
       <label>League Week<select value={roundWeekChoice} onChange={e=>setRoundWeekChoice(e.target.value)}><option value="">Select week…</option>{[1,2,3,4].map(w=><option key={w} value={String(w)}>Week {w}</option>)}</select></label>
       {msg&&<p className="message">{msg}</p>}
       <button type="button" className="btn" disabled={!roundMonthChoice||!roundWeekChoice} onClick={()=>{
         const nextWeek=Number(roundWeekChoice)
         if(pendingFor(roundMonthChoice,nextWeek)){
           const m=ctx.months.find(x=>x.id===roundMonthChoice)
           setMsg(`Your ${m?monthName(m):'selected'} Week ${nextWeek} scorecard is already waiting for approval. You cannot submit another scorecard for the same month and week until that submission is reviewed. Please choose a different round.`)
           return
         }
         setMsg('')
         setMonthId(roundMonthChoice);setWeek(nextWeek);setChangeRound(false)
       }}>Continue to Scorecard</button>
     </div>}

     {!changeRound&&(existing?.status==='pending'?<div className="pending-rounds-wrap-v1304">
       <div className="round-status pending"><b>Awaiting Approval</b><span>Your submitted scorecard{pendingRounds.length===1?' is':'s are'} waiting for a Scorecard Official to review.</span></div>
       <div className="pending-rounds-list-v1304">
         {pendingRounds.map(r=>{
           const m=ctx.months.find(x=>x.id===r.league_month_id)
           return <div className="pending-round-card-v1304" key={r.id}>
             <strong>{m?monthName(m):'League'} Week {r.week_number}</strong>
             <span>Your {m?monthName(m):'League'} Week {r.week_number} scorecard and submitted score are waiting for a Scorecard Official to review.</span>
             <small>Submitted score: {Number(r.official_total).toFixed(1)}</small>
           </div>
         })}
       </div>
       <button type="button" className="btn secondary submit-another-round-v1304" onClick={()=>{setMsg('');setRoundMonthChoice('');setRoundWeekChoice('');setChangeRound(true)}}>Submit Another Round</button>
     </div>
     :existing?.status==='approved'?<div className="round-status complete"><b>Complete ✓</b><span>This round has been approved and posted as an official score.</span></div>
     :<>
       {existing?.status==='rejected'&&<div className="round-status rejected"><b>Scorecard Denied — Please Resubmit</b><span>{existing.admin_note||'The admin returned this scorecard. Please correct the issue and submit it again.'}</span></div>}
       <p className="muted">Complete both steps below. The admin will review the scorecard image and your submitted total before the round becomes official.</p>
       <section className="submit-step-v1297">
         <div className="submit-step-heading-v1297"><span>1</span><div><strong>Take a photo of your scorecard</strong><small>Take a new photo or select the final scorecard from your photo library.</small></div></div>
         <div className="score-photo-actions">
           <label className="btn score-photo-btn">Take Photo<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={e=>e.target.files?.[0]&&choose(e.target.files[0])}/></label>
           <label className="btn secondary score-photo-btn">Photo Library<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e=>e.target.files?.[0]&&choose(e.target.files[0])}/></label>
         </div>
         {preview&&<img className="score-preview" src={preview} alt="Scorecard preview"/>}
       </section>
       <section className="submit-step-v1297">
         <div className="submit-step-heading-v1297"><span>2</span><div><strong>Enter your team's total score with handicap</strong><small>Enter the final total after your team's handicap has been included.</small></div></div>
         <label className="field submitted-score-field">Team Total Score (with handicap)
           <input type="number" inputMode="decimal" step="0.1" min="0" value={score} onChange={e=>setScore(e.target.value)} placeholder="Example: 28.2"/>
         </label>
       </section>
       <button className="btn submit-score-review-btn" disabled={saving||!file||score.trim()===''} onClick={submit}>{saving?'Submitting…':'Submit Scorecard & Score for Approval'}</button>
       {msg&&<p className="message">{msg}</p>}
     </>)}
   </div>

   {successOpen&&<div className="score-success-modal-backdrop" role="presentation">
     <div className="score-success-modal" role="alertdialog" aria-modal="true" aria-labelledby="score-submit-success-title">
       <div className="score-success-icon" aria-hidden="true">✓</div>
       <h2 id="score-submit-success-title">Scorecard and Score Successfully Submitted!</h2>
       <p>Your scorecard and score has been successfully submitted for approval.</p>
       <p><strong>Your score is not official and will not be posted until a Scorecard Official or admin approves your scorecard.</strong></p>
       <button type="button" className="btn" onClick={()=>setSuccessOpen(false)}>OK</button>
     </div>
   </div>}
 </div></PlayerPage>
}
