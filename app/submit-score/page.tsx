'use client'
import {useEffect,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {supabase} from '@/lib/supabase'

type Month={id:string;month_start:string;course_name:string|null}
type Ctx={userId:string;teamId:string;teamName:string;months:Month[]}

const monthName=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleString('en-US',{month:'long'})
const defaultWeek=(d:Date)=>Math.min(4,Math.floor((d.getDate()-1)/7)+1)

export default function SubmitScore(){
 const [ctx,setCtx]=useState<Ctx|null>(null)
 const [monthId,setMonthId]=useState('')
 const [week,setWeek]=useState(1)
 const [changeRound,setChangeRound]=useState(false)
 const [existing,setExisting]=useState<any>(null)
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

 async function loadExisting(){
   if(!ctx||!monthId)return
   const {data}=await supabase.from('round_score_submissions').select('*').eq('league_month_id',monthId).eq('team_id',ctx.teamId).eq('week_number',week).maybeSingle()
   setExisting(data||null)
   setFile(null);setPreview('');setScore('');setMsg('');setSuccessOpen(false)
 }
 useEffect(()=>{loadExisting()},[ctx?.teamId,monthId,week])

 const selectedMonth=ctx?.months.find(m=>m.id===monthId)
 const locked=existing?.status==='approved'||existing?.status==='pending'

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
       {!changeRound&&<button type="button" className="change-round-link" onClick={()=>setChangeRound(true)}>Change Round</button>}
     </div>
     {changeRound&&<div className="round-picker">
       <label>League Month<select value={monthId} onChange={e=>setMonthId(e.target.value)}>{ctx.months.map(m=><option key={m.id} value={m.id}>{monthName(m)}</option>)}</select></label>
       <label>League Week<select value={week} onChange={e=>setWeek(Number(e.target.value))}>{[1,2,3,4].map(w=><option key={w} value={w}>Week {w}</option>)}</select></label>
       <button type="button" className="btn secondary" onClick={()=>setChangeRound(false)}>Use This Round</button>
     </div>}

     {existing?.status==='pending'?<div className="round-status pending"><b>Awaiting Admin Approval</b><span>Your scorecard and submitted score are waiting for review.</span></div>
     :existing?.status==='approved'?<div className="round-status complete"><b>Complete ✓</b><span>This round has been approved and posted as an official score.</span></div>
     :<>
       {existing?.status==='rejected'&&<div className="round-status rejected"><b>Scorecard Denied — Please Resubmit</b><span>{existing.admin_note||'The admin returned this scorecard. Please correct the issue and submit it again.'}</span></div>}
       <p className="muted">Take or choose a photo of the final scorecard, then enter the total score your team believes it earned. The admin will review both before the score becomes official.</p>
       <div className="score-photo-actions">
         <label className="btn score-photo-btn">Take Photo<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={e=>e.target.files?.[0]&&choose(e.target.files[0])}/></label>
         <label className="btn secondary score-photo-btn">Photo Library<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e=>e.target.files?.[0]&&choose(e.target.files[0])}/></label>
       </div>
       {preview&&<img className="score-preview" src={preview} alt="Scorecard preview"/>}
       <label className="field submitted-score-field">Your Team's Total Score
         <input type="number" inputMode="decimal" step="0.1" min="0" value={score} onChange={e=>setScore(e.target.value)} placeholder="Example: 28.2"/>
       </label>
       <button className="btn submit-score-review-btn" disabled={saving||!file||score.trim()===''} onClick={submit}>{saving?'Submitting…':'Submit Scorecard & Score for Approval'}</button>
       {msg&&<p className="message">{msg}</p>}
     </>}
   </div>

   {successOpen&&<div className="score-success-modal-backdrop" role="presentation">
     <div className="score-success-modal" role="alertdialog" aria-modal="true" aria-labelledby="score-submit-success-title">
       <div className="score-success-icon" aria-hidden="true">✓</div>
       <h2 id="score-submit-success-title">Scorecard and Score Successfully Submitted!</h2>
       <p>Your scorecard and score has been successfully submitted to the admin.</p>
       <p><strong>Your score is not official and will not be posted until the admin approves your scorecard.</strong></p>
       <button type="button" className="btn" onClick={()=>setSuccessOpen(false)}>OK</button>
     </div>
   </div>}
 </div></PlayerPage>
}
