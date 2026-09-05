'use client'
import {useEffect,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {supabase} from '@/lib/supabase'

type Month={id:string;month_start:string;course_name:string|null}
type Team={id:string;name:string}
type Ctx={userId:string;submitterName:string;ownTeamId:string;months:Month[];teams:Team[]}
type PendingRound={id:string;league_month_id:string;team_id:string;week_number:number;official_total:number;submitted_by:string;teams?:{name?:string}|null}
type RejectedRound={id:string;league_month_id:string;team_id:string;week_number:number;official_total:number;submitted_by:string;admin_note:string|null;teams?:{name?:string}|null}

const monthName=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleString('en-US',{month:'long'})
const defaultWeek=(d:Date)=>Math.min(4,Math.floor((d.getDate()-1)/7)+1)

export default function SubmitScore(){
 const [ctx,setCtx]=useState<Ctx|null>(null)
 const [teamId,setTeamId]=useState('')
 const [monthId,setMonthId]=useState('')
 const [week,setWeek]=useState(1)
 const [changeRound,setChangeRound]=useState(false)
 const [roundMonthChoice,setRoundMonthChoice]=useState('')
 const [roundWeekChoice,setRoundWeekChoice]=useState('')
 const [existing,setExisting]=useState<any>(null)
 const [pendingRounds,setPendingRounds]=useState<PendingRound[]>([])
 const [rejectedRounds,setRejectedRounds]=useState<RejectedRound[]>([])
 const [resubmitTarget,setResubmitTarget]=useState('')
 const [file,setFile]=useState<File|null>(null)
 const [preview,setPreview]=useState('')
 const [score,setScore]=useState('')
 const [msg,setMsg]=useState('')
 const [saving,setSaving]=useState(false)
 const [reviewOpen,setReviewOpen]=useState(false)
 const [progressOpen,setProgressOpen]=useState(false)
 const [progress,setProgress]=useState(0)
 const [successOpen,setSuccessOpen]=useState(false)
 const [resubmitActive,setResubmitActive]=useState(false)

 useEffect(()=>{(async()=>{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user)return
   const {data:p}=await supabase.from('profiles').select('player_id,full_name').eq('id',user.id).single()
   if(!p?.player_id){setMsg('Your account must be linked to a league player before submitting a score.');return}
   const {data:pl}=await supabase.from('players').select('team_id,teams(name)').eq('id',p.player_id).single()
   const ownTeamId=(pl as any)?.team_id
   if(!ownTeamId)return
   const {data:season}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).maybeSingle()
   if(!season){setMsg('There is no active league season.');return}
   const [{data:months},{data:teams}]=await Promise.all([
     supabase.from('league_months').select('id,month_start,course_name').eq('season_id',season.id).order('month_start'),
     supabase.from('teams').select('id,name').eq('season_id',season.id).eq('is_active',true).order('name')
   ])
   const ms=(months||[]) as Month[],ts=(teams||[]) as Team[]
   const now=new Date(),key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
   const current=ms.find(m=>String(m.month_start).startsWith(key))||ms[0]
   if(!current){setMsg('No league months have been configured yet.');return}
   setCtx({userId:user.id,submitterName:p?.full_name||'Player',ownTeamId,months:ms,teams:ts})
   setTeamId(ownTeamId);setMonthId(current.id);setWeek(String(current.month_start).startsWith(key)?defaultWeek(now):1)
 })()},[])

 async function loadSubmissionAlerts(){
   if(!ctx)return
   const [{data:pending},{data:rejected}]=await Promise.all([
     supabase.from('round_score_submissions')
       .select('id,league_month_id,team_id,week_number,official_total,submitted_by,teams(name)')
       .eq('status','pending')
       .order('created_at',{ascending:true}),
     supabase.from('round_score_submissions')
       .select('id,league_month_id,team_id,week_number,official_total,submitted_by,admin_note,teams(name)')
       .eq('status','rejected')
       .eq('submitted_by',ctx.userId)
       .order('created_at',{ascending:false})
   ])
   setPendingRounds((pending||[]) as PendingRound[])
   setRejectedRounds((rejected||[]) as RejectedRound[])
 }

 async function loadExisting(){
   if(!ctx||!monthId||!teamId)return
   const {data}=await supabase.from('round_score_submissions').select('*').eq('league_month_id',monthId).eq('team_id',teamId).eq('week_number',week).maybeSingle()
   const row=data||null
   setExisting(row);setFile(null);setPreview('');setScore('');setMsg('');setReviewOpen(false);setSuccessOpen(false);setResubmitActive(Boolean(row?.status==='rejected'&&row?.id===resubmitTarget))
   await loadSubmissionAlerts()
 }
 useEffect(()=>{loadExisting()},[ctx?.userId,teamId,monthId,week,resubmitTarget])
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])

 const selectedMonth=ctx?.months.find(m=>m.id===monthId)
 const selectedTeam=ctx?.teams.find(t=>t.id===teamId)
 const pendingFor=(t:string,m:string,w:number)=>pendingRounds.some(r=>r.team_id===t&&r.league_month_id===m&&r.week_number===w)
 const myPendingRounds=pendingRounds.filter(r=>r.submitted_by===ctx?.userId)

 function choose(f:File){setFile(f);if(preview)URL.revokeObjectURL(preview);setPreview(URL.createObjectURL(f));setMsg('')}
 function openReview(){
   if(!ctx||!selectedMonth||!selectedTeam||!file)return
   const entered=Number(score)
   if(!Number.isFinite(entered)||entered<0){setMsg('Please enter the total score you believe the team earned.');return}
   if(existing?.status==='pending'||existing?.status==='approved'){setMsg('That league round has already been submitted or completed.');return}
   setMsg('');setReviewOpen(true)
 }
 async function submitConfirmed(){
   if(!ctx||!selectedMonth||!selectedTeam||!file)return
   const entered=Number(score)
   if(!Number.isFinite(entered)||entered<0)return
   setReviewOpen(false);setSaving(true);setProgress(12);setProgressOpen(true);setMsg('')
   const ext=(file.name.split('.').pop()||'jpg').toLowerCase()
   const path=`${ctx.userId}/${monthId}-${teamId}-w${week}-${Date.now()}.${ext}`
   const up=await supabase.storage.from('round-scorecards').upload(path,file,{upsert:false})
   if(up.error){setMsg(up.error.message);setSaving(false);setProgressOpen(false);return}
   setProgress(70)
   const row={league_month_id:monthId,team_id:teamId,week_number:week,submitted_by:ctx.userId,image_path:path,hole_scores:[],hole_pars:[],stableford_points:[],raw_stableford:0,bonus_birdies:0,bonus_points:0,handicap_points:0,official_total:entered,status:'pending',admin_note:null,approved_by:null,approved_at:null,validation_passed:false,validation_report:[],detected_course_name:null,detected_player_names:[],detected_settings:{},played_holes:[]}
   const {error}=await supabase.from('round_score_submissions').upsert(row,{onConflict:'league_month_id,team_id,week_number'})
   if(error){setMsg(error.message);setSaving(false);setProgressOpen(false);return}
   setProgress(92);setExisting({...row,status:'pending'});setRejectedRounds(prev=>prev.filter(r=>r.id!==existing?.id));setResubmitTarget('');await loadSubmissionAlerts();setProgress(100);await new Promise(resolve=>setTimeout(resolve,250));setProgressOpen(false);setSuccessOpen(true);setSaving(false)
 }

 if(!ctx||!selectedMonth||!selectedTeam)return <PlayerPage title="Submit Score"><div className="simple-mobile-page"><h1>Submit Score</h1><p>{msg||'Loading your round…'}</p></div></PlayerPage>

 return <PlayerPage title="Submit Score"><div className="simple-mobile-page submit-score-page">
   <h1>Submit Score</h1>
   {rejectedRounds.length>0&&<section className="denied-alerts-v1311" aria-label="Denied scorecards requiring resubmission"><div className="denied-alerts-heading-v1311"><strong>Scorecard Resubmission Required</strong><span>{rejectedRounds.length===1?'You have 1 denied scorecard that needs to be resubmitted.':`You have ${rejectedRounds.length} denied scorecards that need to be resubmitted.`}</span></div>{rejectedRounds.map(r=>{const m=ctx.months.find(x=>x.id===r.league_month_id);const teamName=r.teams?.name||ctx.teams.find(t=>t.id===r.team_id)?.name||'Team';return <div className="denied-alert-card-v1311" key={r.id}><div className="denied-alert-x-v1311" aria-hidden="true">×</div><div className="denied-alert-copy-v1311"><strong>{teamName} · {m?monthName(m):'League'} · Week {r.week_number}</strong><span>{r.admin_note||'The Scorecard Official returned this scorecard. Please correct the issue and submit it again.'}</span><button type="button" className="btn denied-alert-button-v1311" onClick={()=>{setResubmitTarget(r.id);setTeamId(r.team_id);setMonthId(r.league_month_id);setWeek(r.week_number);setChangeRound(false);setMsg('');window.scrollTo({top:0,behavior:'smooth'})}}>Resubmit Scorecard</button></div></div>})}</section>}
   <div className="card">
     <label className="field score-team-select-v1307">Team
       <select value={teamId} onChange={e=>{setResubmitTarget('');setTeamId(e.target.value)}}>{ctx.teams.map(t=><option key={t.id} value={t.id}>{t.name}{t.id===ctx.ownTeamId?' — My Team':''}</option>)}</select>
       <small>Your team is selected by default. Choose another team only when you are submitting their scorecard for them.</small>
     </label>
     <div className="selected-round"><strong>{monthName(selectedMonth)} · Week {week}</strong>{!changeRound&&<button type="button" className="change-round-link" onClick={()=>{setRoundMonthChoice('');setRoundWeekChoice('');setChangeRound(true)}}>Change Round</button>}</div>
     {changeRound&&<div className="round-picker round-picker-required-v1297"><div className="round-picker-intro-v1297"><strong>Select the round you are submitting</strong><span>Choose both the league month and week before continuing.</span></div><label>League Month<select value={roundMonthChoice} onChange={e=>setRoundMonthChoice(e.target.value)}><option value="">Select month…</option>{ctx.months.map(m=><option key={m.id} value={m.id}>{monthName(m)}</option>)}</select></label><label>League Week<select value={roundWeekChoice} onChange={e=>setRoundWeekChoice(e.target.value)}><option value="">Select week…</option>{[1,2,3,4].map(w=><option key={w} value={String(w)}>Week {w}</option>)}</select></label>{msg&&(msg.startsWith('ROUND_BLOCKED:')?<div className="round-blocked-alert-v1305" role="alert"><span className="round-blocked-x-v1305" aria-hidden="true">×</span><div><strong>Scorecard Cannot Be Submitted</strong><span>{msg.replace('ROUND_BLOCKED:','')}</span></div></div>:<p className="message">{msg}</p>)}<button type="button" className="btn" disabled={!roundMonthChoice||!roundWeekChoice} onClick={()=>{const nextWeek=Number(roundWeekChoice);if(pendingFor(teamId,roundMonthChoice,nextWeek)){const m=ctx.months.find(x=>x.id===roundMonthChoice);setMsg(`ROUND_BLOCKED:${selectedTeam.name}'s ${m?monthName(m):'selected'} Week ${nextWeek} scorecard is already waiting for approval. You cannot submit another scorecard for the same team, month, and week until that submission is reviewed. Please choose a different round.`);return}setMsg('');setResubmitTarget('');setMonthId(roundMonthChoice);setWeek(nextWeek);setChangeRound(false)}}>Continue to Scorecard</button></div>}

     {!changeRound&&(existing?.status==='pending'?<div className="pending-rounds-wrap-v1304"><div className="round-status pending"><b>Awaiting Approval</b><span>{existing.submitted_by===ctx.userId?'Your':`${selectedTeam.name}'s`} {monthName(selectedMonth)} Week {week} scorecard and submitted score are waiting for a Scorecard Official to review.</span></div><button type="button" className="btn secondary submit-another-round-v1304" onClick={()=>{setMsg('');setRoundMonthChoice('');setRoundWeekChoice('');setChangeRound(true)}}>Submit Another Round</button></div>
     :existing?.status==='approved'?<div className="round-status complete"><b>Complete ✓</b><span>This round has been approved and posted as an official score.</span></div>
     :existing?.status==='rejected'&&!resubmitActive?<div className="denied-resubmit-wrap-v1310"><div className="round-status rejected denied-round-detail-v1310"><b>Scorecard Denied — Resubmission Required</b><span>{existing.admin_note||'The Scorecard Official returned this scorecard. Please correct the issue and submit it again.'}</span><small>{selectedTeam.name} · {monthName(selectedMonth)} · Week {week}</small></div><button type="button" className="btn denied-resubmit-btn-v1310" onClick={()=>{setFile(null);setPreview('');setScore('');setMsg('');setResubmitActive(true)}}>Resubmit Scorecard</button></div>
     :<><p className="muted">Complete both steps below. A Scorecard Official will review the scorecard image and submitted total before the round becomes official.</p><section className="submit-step-v1297"><div className="submit-step-heading-v1297"><span>1</span><div><strong>Take a photo of the scorecard</strong><small>Take a new photo or select the final scorecard from your photo library.</small></div></div><div className="score-photo-actions"><label className="btn score-photo-btn">Take Photo<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={e=>e.target.files?.[0]&&choose(e.target.files[0])}/></label><label className="btn secondary score-photo-btn">Photo Library<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e=>e.target.files?.[0]&&choose(e.target.files[0])}/></label></div>{preview&&<img className="score-preview" src={preview} alt="Scorecard preview"/>}</section><section className="submit-step-v1297"><div className="submit-step-heading-v1297"><span>2</span><div><strong>Enter the team's total score with handicap</strong><small>Enter the final total after the team's handicap has been included.</small></div></div><label className="field submitted-score-field">Team Total Score (with handicap)<input type="number" inputMode="decimal" step="0.1" min="0" value={score} onChange={e=>setScore(e.target.value)} placeholder="Example: 28.2"/></label></section><button className="btn submit-score-review-btn" disabled={saving||!file||score.trim()===''} onClick={openReview}>Review Scorecard Submission</button>{msg&&<p className="message">{msg}</p>}</>)}
   </div>

   {reviewOpen&&<div className="score-success-modal-backdrop" role="presentation"><div className="score-review-modal-v1307" role="dialog" aria-modal="true" aria-labelledby="score-review-title"><h2 id="score-review-title">Confirm Scorecard Submission</h2><p className="muted">Check everything below before submitting it for approval.</p>{preview&&<img src={preview} alt="Scorecard being submitted" className="score-review-image-v1307"/>}<div className="score-review-details-v1307"><div><span>Team</span><strong>{selectedTeam.name}</strong></div><div><span>Round</span><strong>{monthName(selectedMonth)} · Week {week}</strong></div><div><span>Entered Score</span><strong>{Number(score).toFixed(1)}</strong></div><div><span>Submitted By</span><strong>{ctx.submitterName}</strong></div></div><div className="score-review-actions-v1307"><button type="button" className="btn secondary" onClick={()=>setReviewOpen(false)}>Go Back & Edit</button><button type="button" className="btn" onClick={submitConfirmed}>Submit for Approval</button></div></div></div>}
   {progressOpen&&<div className="score-success-modal-backdrop" role="presentation"><div className="score-progress-modal-v1307" role="alertdialog" aria-modal="true"><h2>Submitting Scorecard…</h2><p>Please keep this page open until your submission is complete.</p><div className="score-progress-track-v1307"><span style={{width:`${progress}%`}}/></div><strong>{progress}%</strong></div></div>}
   {successOpen&&<div className="score-success-modal-backdrop" role="presentation"><div className="score-success-modal" role="alertdialog" aria-modal="true" aria-labelledby="score-submit-success-title"><div className="score-success-icon" aria-hidden="true">✓</div><h2 id="score-submit-success-title">Scorecard and Score Successfully Submitted!</h2><p>Your scorecard and score has been successfully submitted for approval.</p><p><strong>Your score is not official and will not be posted until a Scorecard Official or admin approves your scorecard.</strong></p><button type="button" className="btn" onClick={()=>setSuccessOpen(false)}>OK</button></div></div>}
 </div></PlayerPage>
}
