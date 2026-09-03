'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {supabase} from '@/lib/supabase'

type Month={
  id:string;month_start:string;course_name:string|null;bonus_hole_1:number|null;bonus_hole_2:number|null;bonus_birdie_value:number|null;
  elevation_ft:number|null;stimp_options:number[]|null;gimmie_feet:number|null;wind:string|null;greens:string|null;fairways:string|null;mulligans:boolean|null;
  pins_week_1:string|null;pins_week_2:string|null;pins_week_3:string|null;pins_week_4:string|null
}
type Ctx={userId:string;teamId:string;teamName:string;players:string[];months:Month[]}
type CheckStatus='waiting'|'checking'|'pass'|'fail'
type Check={key:string;label:string;status:CheckStatus;detail:string}

const pts=(score:number,par:number)=>{const d=score-par;return d<=-3?5:d===-2?4:d===-1?3:d===0?2:d===1?1:0}
const monthName=(m:Month)=>new Date(m.month_start+'T12:00:00').toLocaleString('en-US',{month:'long'})
const defaultWeek=(d:Date)=>Math.min(4,Math.floor((d.getDate()-1)/7)+1)
const clean=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()
const scoreLabel=(score:number|null,par:number|null)=>{if(!score||!par)return '—';const d=score-par;return d<=-3?'Albatross+':d===-2?'Eagle':d===-1?'Birdie':d===0?'Par':d===1?'Bogey':'Double Bogey+'}
const scoreFromLabel=(label:string,par:number|null,current:number|null)=>{if(!par)return current;return label==='Albatross+'?Math.max(1,par-3):label==='Eagle'?par-2:label==='Birdie'?par-1:label==='Par'?par:label==='Bogey'?par+1:label==='Double Bogey+'?par+2:current}
const aliases=(s:string|null|undefined)=>{
 const n=clean(String(s||''));
 const out=[n,n.replace(/feet?/g,'ft')]
 if(['none','no wind','off','calm'].includes(n))out.push('none','no wind','no winds','off','calm','0 mph','0 0 mph')
 if(n==='normal')out.push('normal','default')
 return [...new Set(out.filter(Boolean))]
}
const editDistance=(a:string,b:string)=>{const m=Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)]);for(let j=0;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return m[a.length][b.length]}
const fuzzyToken=(needle:string,haystack:string)=>{if(haystack.includes(needle))return true;const words=haystack.split(' ').filter(Boolean);return words.some(w=>needle.length>=4&&editDistance(needle,w)<=Math.max(1,Math.floor(needle.length*.25)))}
const labelFound=(line:string,labels:string[])=>{const n=clean(line);return labels.map(clean).some(l=>n.includes(l)||fuzzyToken(l,n))}
const windowAround=(lines:string[],i:number,radius=4)=>clean(lines.slice(Math.max(0,i-1),Math.min(lines.length,i+radius+1)).join(' '))
const numericOcr=(s:string)=>clean(s).replace(/\b[iIl|]+\b/g,m=>'1'.repeat(m.length)).replace(/\bo\b/g,'0')

function lineHas(textLines:string[],labels:string[],values:string[]){
 const vv=values.map(clean).filter(Boolean)
 return textLines.some((line,i)=>{
   if(!labelFound(line,labels))return false
   const w=windowAround(textLines,i,5)
   return vv.some(v=>w.includes(v)||v.split(' ').filter(Boolean).every(t=>fuzzyToken(t,w)))
 })
}
function numberNearLabel(lines:string[],labels:string[],expected:number){
 return lines.some((line,i)=>{
   if(!labelFound(line,labels))return false
   const w=numericOcr(lines.slice(Math.max(0,i-1),Math.min(lines.length,i+6)).join(' '))
   const compact=w.replace(/\s+/g,' ')
   const variants=[String(expected),String(expected).split('').join(' ')]
   return variants.some(v=>new RegExp(`(^|\\D)${v.replace(/ /g,'\\s*')}(?:\\.0+)?(\\D|$)`).test(compact))
 })
}
function fuzzyCourseMatch(text:string,expected:string){
 const hay=clean(text), exp=clean(expected);if(!exp)return false;if(hay.includes(exp))return true
 const tokens=exp.split(' ').filter(t=>t.length>2);if(!tokens.length)return false
 const matched=tokens.filter(t=>fuzzyToken(t,hay)).length
 return matched>=Math.max(1,Math.ceil(tokens.length*.6))
}
function playerMatches(lines:string[],players:string[]){
 const normalized=lines.map(clean)
 return players.filter(name=>{
   const parts=clean(name).split(' ').filter(Boolean);if(!parts.length)return false
   return normalized.some(line=>parts.every(p=>line.includes(p)))
 }).slice(0,4)
}
function numericRows(lines:string[]){
 return lines.map(l=>(l.match(/\b(?:[1-9]|1\d|2\d)\b/g)||[]).map(Number)).filter(a=>a.length>=8)
}

async function enhanceImageForOcr(file:File):Promise<HTMLCanvasElement|File>{
 try{
  const url=URL.createObjectURL(file)
  try{
   const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=reject;el.src=url})
   const longest=Math.max(img.naturalWidth,img.naturalHeight)
   const scale=Math.min(2.4,Math.max(1.35,3200/Math.max(1,longest)))
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale))
   const cx=canvas.getContext('2d',{willReadFrequently:true});if(!cx)return file
   cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';cx.drawImage(img,0,0,canvas.width,canvas.height)
   const data=cx.getImageData(0,0,canvas.width,canvas.height),px=data.data
   for(let i=0;i<px.length;i+=4){
    const g=.2126*px[i]+.7152*px[i+1]+.0722*px[i+2]
    // Mild grayscale + contrast boost keeps thin GSPro text readable without crushing it.
    const v=Math.max(0,Math.min(255,(g-128)*1.5+128))
    px[i]=px[i+1]=px[i+2]=v
   }
   cx.putImageData(data,0,0)
   return canvas
  }finally{URL.revokeObjectURL(url)}
 }catch{return file}
}
const settingDigitText=(s:string)=>String(s||'').toLowerCase()
 .replace(/[|!]/g,'1')
 .replace(/\b[li]{2}\b/g,m=>m.replace(/[li]/g,'1'))
 .replace(/\bo\b/g,'0')
 .replace(/\bs(?=\s*(?:ft|feet|foot)\b)/g,'5')
const flexibleNumberNearLabel=(lines:string[],labels:string[],expected:number)=>{
 if(numberNearLabel(lines,labels,expected))return true
 const expectedText=String(expected)
 return lines.some((line,i)=>{
  const near=lines.slice(Math.max(0,i-2),Math.min(lines.length,i+8)).join(' ')
  const nearClean=clean(near)
  const labelOk=labels.some(label=>{
    const wanted=clean(label)
    if(nearClean.includes(wanted))return true
    return nearClean.split(' ').some(word=>wanted.length>=4&&editDistance(wanted,word)<=2)
  })
  if(!labelOk)return false
  const n=settingDigitText(near)
  if(expected===11&&/(?:^|\D)(?:11|1\s*1|l\s*l|i\s*i|1\s*l|l\s*1)(?:\D|$)/i.test(near))return true
  if(expected===10&&/(?:^|\D)(?:10|1\s*0|1\s*o)(?:\D|$)/i.test(near))return true
  if(expected===5&&/(?:^|\D)(?:5|s)\s*(?:ft|feet|foot)?(?:\D|$)/i.test(near))return true
  return new RegExp(`(^|\\D)${expectedText}(?:\\.0+)?(\\D|$)`).test(n)
 })
}
function extractGrid(lines:string[]){
 const rows=numericRows(lines)
 const parLine=rows.find(a=>a.length>=10&&a.slice(0,10).every(n=>n>=3&&n<=5))
 const scoreLine=rows.find(a=>a!==parLine&&a.length>=10&&a.slice(0,10).every(n=>n>=1&&n<=12))
 return {
   pars:Array.from({length:18},(_,i)=>parLine?.[i]??null) as (number|null)[],
   scores:Array.from({length:18},(_,i)=>scoreLine?.[i]??null) as (number|null)[]
 }
}

export default function SubmitScore(){
 const [ctx,setCtx]=useState<Ctx|null>(null),[monthId,setMonthId]=useState(''),[week,setWeek]=useState(1),[changeRound,setChangeRound]=useState(false),[existing,setExisting]=useState<any>(null),[handicap,setHandicap]=useState(0),[scores,setScores]=useState<(number|null)[]>(Array(18).fill(null)),[pars,setPars]=useState<(number|null)[]>(Array(18).fill(null)),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[reading,setReading]=useState(false),[msg,setMsg]=useState(''),[saving,setSaving]=useState(false),[checks,setChecks]=useState<Check[]>([]),[validationPassed,setValidationPassed]=useState(false),[failureModalOpen,setFailureModalOpen]=useState(false),[checkProgress,setCheckProgress]=useState(0)
 const audioCtxRef=useRef<AudioContext|null>(null)
 useEffect(()=>{if(!(window as any).Tesseract&&!document.querySelector('script[data-score-ocr]')){const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js';sc.async=true;sc.dataset.scoreOcr='1';document.head.appendChild(sc)};(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:p}=await supabase.from('profiles').select('player_id').eq('id',user.id).single();if(!p?.player_id){setMsg('Your account must be linked to a league player before submitting a score.');return}const {data:pl}=await supabase.from('players').select('team_id,teams(name)').eq('id',p.player_id).single();const teamId=pl?.team_id;if(!teamId)return;const {data:season}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).maybeSingle();if(!season)return;const {data:months}=await supabase.from('league_months').select('id,month_start,course_name,bonus_hole_1,bonus_hole_2,bonus_birdie_value,elevation_ft,stimp_options,gimmie_feet,wind,greens,fairways,mulligans,pins_week_1,pins_week_2,pins_week_3,pins_week_4').eq('season_id',season.id).order('month_start');const {data:roster}=await supabase.from('players').select('full_name').eq('team_id',teamId).eq('is_active',true).order('full_name');const ms=(months||[]) as Month[];const now=new Date(),key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const current=ms.find(m=>String(m.month_start).startsWith(key))||ms[0];if(!current)return;setCtx({userId:user.id,teamId,teamName:(pl as any)?.teams?.name||'My Team',players:(roster||[]).map((x:any)=>x.full_name),months:ms});setMonthId(current.id);setWeek(String(current.month_start).startsWith(key)?defaultWeek(now):1)})()},[])
 useEffect(()=>{if(!ctx||!monthId)return;(async()=>{const [{data:s},{data:h}]=await Promise.all([supabase.from('round_score_submissions').select('*').eq('league_month_id',monthId).eq('team_id',ctx.teamId).eq('week_number',week).maybeSingle(),supabase.from('monthly_team_handicaps').select('handicap_points').eq('league_month_id',monthId).eq('team_id',ctx.teamId).maybeSingle()]);setExisting(s||null);setHandicap(Number(h?.handicap_points||0));setFile(null);setPreview('');setScores(Array(18).fill(null));setPars(Array(18).fill(null));setMsg('');setChecks([]);setValidationPassed(false);setFailureModalOpen(false);setCheckProgress(0)})()},[ctx,monthId,week])
 const selectedMonth=ctx?.months.find(m=>m.id===monthId)||null,bonusHoles=selectedMonth?[Number(selectedMonth.bonus_hole_1),Number(selectedMonth.bonus_hole_2)].filter(Boolean):[],bonusValue=Number(selectedMonth?.bonus_birdie_value||0.1)
 const playedHoles=useMemo(()=>[...Array.from({length:10},(_,i)=>i+1),...bonusHoles].filter((h,i,a)=>a.indexOf(h)===i),[bonusHoles.join(',')])
 const sf=useMemo(()=>scores.slice(0,10).map((s,i)=>s&&pars[i]?pts(s,pars[i]!):0),[scores,pars]);const raw=sf.reduce<number>((a,b)=>a+b,0);const bonusBirdies=bonusHoles.filter(h=>scores[h-1]&&pars[h-1]&&scores[h-1]===pars[h-1]!-1).length;const bonus=bonusBirdies*bonusValue;const official=raw+bonus+handicap
 const selectedPins=selectedMonth?String((selectedMonth as any)[`pins_week_${week}`]||'').trim():''


 function primeFailureAudio(){
   try{
     const AC=(window as any).AudioContext||(window as any).webkitAudioContext
     if(!AC)return
     const ac:AudioContext=audioCtxRef.current ?? new AC();audioCtxRef.current=ac
     if(ac.state==='suspended')void ac.resume()
     // Start a silent oscillator during the actual tap. This unlocks Web Audio on iOS/Safari.
     const osc=ac.createOscillator(),gain=ac.createGain();gain.gain.value=0;osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+.01)
   }catch{}
 }
 async function playFailureTone(){
   try{
     const AC=(window as any).AudioContext||(window as any).webkitAudioContext
     if(!AC)return
     const ac:AudioContext=audioCtxRef.current ?? new AC();audioCtxRef.current=ac
     if(ac.state==='suspended')await ac.resume()
     const now=ac.currentTime+.03
     // One simple, low buzzer tone for a failed scorecard check.
     const osc=ac.createOscillator(),gain=ac.createGain()
     osc.type='square';osc.frequency.setValueAtTime(125,now)
     gain.gain.setValueAtTime(.0001,now)
     gain.gain.exponentialRampToValueAtTime(.22,now+.02)
     gain.gain.setValueAtTime(.22,now+.55)
     gain.gain.exponentialRampToValueAtTime(.0001,now+.72)
     osc.connect(gain);gain.connect(ac.destination);osc.start(now);osc.stop(now+.74)
     if('vibrate' in navigator)navigator.vibrate?.(250)
   }catch{}
 }

 async function choose(f:File){
   if(!ctx||!selectedMonth)return
   primeFailureAudio()
   setFailureModalOpen(true);setCheckProgress(5);setFile(f);setPreview(URL.createObjectURL(f));setReading(true);setValidationPassed(false);setScores(Array(18).fill(null));setPars(Array(18).fill(null));setMsg('Checking scorecard…')
   const base:Check[]=[
     {key:'ocr',label:'Read scorecard image',status:'checking',detail:'Reading text and score data…'},
     {key:'course',label:'Course name',status:'waiting',detail:''},{key:'holes',label:'Required holes + bonus holes',status:'waiting',detail:''},{key:'players',label:'At least 2 team players',status:'waiting',detail:''},
     {key:'stimp',label:'Stimp',status:'waiting',detail:''},{key:'pins',label:`Week ${week} pins`,status:'waiting',detail:''},{key:'gimmies',label:'Gimmies',status:'waiting',detail:''},{key:'wind',label:'Wind',status:'waiting',detail:''},{key:'fairways',label:'Fairways',status:'waiting',detail:''},{key:'greens',label:'Greens',status:'waiting',detail:''},{key:'mulligans',label:'Mulligans',status:'waiting',detail:''},{key:'elevation',label:'Elevation',status:'waiting',detail:''}
   ];setChecks(base)
   try{
     const T=(window as any).Tesseract;if(!T)throw new Error('OCR is still loading. Please wait a moment and try again.')
     setCheckProgress(10);setMsg('Preparing image for a clearer read…')
     const ocrImage=await enhanceImageForOcr(f)
     const r=await T.recognize(ocrImage,'eng',{logger:(m:any)=>{if(m?.status==='recognizing text'&&typeof m.progress==='number'){setCheckProgress(Math.min(85,15+Math.round(m.progress*70)));setMsg(`Reading scorecard… ${Math.round(m.progress*100)}%`)}}})
     setCheckProgress(90);setMsg('Comparing scorecard to league settings…');const text=String(r?.data?.text||'');const lines=text.split(/\n/).map((x:string)=>x.trim()).filter(Boolean);const grid=extractGrid(lines);setPars(grid.pars);setScores(grid.scores)
     const required=playedHoles.map(h=>h-1);const gridOk=required.every(i=>grid.pars[i]!=null&&grid.scores[i]!=null)
     const matchedPlayers=playerMatches(lines,ctx.players)
     const courseExpected=String(selectedMonth.course_name||'');const courseOk=fuzzyCourseMatch(text,courseExpected)
     const stimpOptions=(selectedMonth.stimp_options?.length?selectedMonth.stimp_options:[10,11]).map(Number);const foundStimp=stimpOptions.find(v=>flexibleNumberNearLabel(lines,['stimp','stimpmeter','green stimp','green speed','speed'],v));const stimpOk=foundStimp!=null
     const pinsOk=!!selectedPins&&lineHas(lines,['pins','pin','pin position','pin location'],aliases(selectedPins))
     const gimmie=Number(selectedMonth.gimmie_feet??5);const gimmieOk=flexibleNumberNearLabel(lines,['gimmie','gimmies','gimme','gimmes','gimme distance','gimme radius','gimmie distance','gimmie radius'],gimmie)
     const windOk=lineHas(lines,['wind','winds','wind speed'],aliases(selectedMonth.wind))
     const fairwaysOk=lineHas(lines,['fairway','fairways'],aliases(selectedMonth.fairways))
     const greensOk=lineHas(lines,['green','greens'],aliases(selectedMonth.greens))
     const mulliganExpected=selectedMonth.mulligans?'on':'off';const mulligansOk=lineHas(lines,['mulligan','mulligans'],selectedMonth.mulligans?['on','yes','enabled']:['off','no','disabled'])
     const elevation=Number(selectedMonth.elevation_ft??2000);const elevationOk=numberNearLabel(lines,['elevation','altitude'],elevation)
     const next:Check[]=[
       {key:'ocr',label:'Read scorecard image',status:text.trim()?'pass':'fail',detail:text.trim()?'Image text captured.':'No readable text was found.'},
       {key:'course',label:'Course name',status:courseOk?'pass':'fail',detail:courseOk?`${selectedMonth.course_name||'Course'} matched.`:`Could not confidently read the configured course: ${selectedMonth.course_name||'Not configured'}.`},
       {key:'holes',label:'Required holes + bonus holes',status:gridOk?'pass':'fail',detail:gridOk?`Holes ${playedHoles.join(', ')} have score/par data.`:`Missing score or par data for: ${playedHoles.filter(h=>grid.pars[h-1]==null||grid.scores[h-1]==null).join(', ')||'required holes'}`},
       {key:'players',label:'At least 2 team players',status:matchedPlayers.length>=2?'pass':'fail',detail:matchedPlayers.length>=2?`Matched: ${matchedPlayers.join(', ')}`:`Only matched ${matchedPlayers.length}: ${matchedPlayers.join(', ')||'none'}`},
       {key:'stimp',label:'Stimp',status:stimpOk?'pass':'fail',detail:stimpOk?`Matched ${foundStimp}.`:`Could not confidently read Stimp ${stimpOptions.join(' or ')} from the image.`},
       {key:'pins',label:`Week ${week} pins`,status:pinsOk?'pass':'fail',detail:pinsOk?`Matched ${selectedPins}.`:selectedPins?`Expected: ${selectedPins}.`:'Admin has not set pins for this week.'},
       {key:'gimmies',label:'Gimmies',status:gimmieOk?'pass':'fail',detail:gimmieOk?`Matched ${gimmie} ft.`:`Could not confidently read ${gimmie} ft gimmies from the image.`},
       {key:'wind',label:'Wind',status:windOk?'pass':'fail',detail:windOk?`Matched ${selectedMonth.wind}.`:`Could not confidently read wind setting ${selectedMonth.wind} from the image.`},
       {key:'fairways',label:'Fairways',status:fairwaysOk?'pass':'fail',detail:fairwaysOk?`Matched ${selectedMonth.fairways}.`:`Expected: ${selectedMonth.fairways}.`},
       {key:'greens',label:'Greens',status:greensOk?'pass':'fail',detail:greensOk?`Matched ${selectedMonth.greens}.`:`Expected: ${selectedMonth.greens}.`},
       {key:'mulligans',label:'Mulligans',status:mulligansOk?'pass':'fail',detail:mulligansOk?`Matched ${mulliganExpected}.`:`Expected: ${mulliganExpected}.`},
       {key:'elevation',label:'Elevation',status:elevationOk?'pass':'fail',detail:elevationOk?`Matched ${elevation} ft.`:`Expected ${elevation} ft.`}
     ]
     setChecks(next);setCheckProgress(100);const ok=next.every(c=>c.status==='pass');setValidationPassed(ok);setMsg(ok?'Scorecard Ready — every required league setting matches. Verify the scores below.':'');if(ok){setFailureModalOpen(false)}else{setFailureModalOpen(true);void playFailureTone()}
   }catch(e:any){setChecks(v=>v.map(c=>c.key==='ocr'?{...c,status:'fail',detail:e?.message||'Could not read this image.'}:c));setMsg('');setFailureModalOpen(true);void playFailureTone()}
   finally{setReading(false)}
 }
 async function submit(){if(!ctx||!file||!selectedMonth)return;if(!validationPassed){setMsg('This scorecard has not passed all required league checks.');return}if(existing?.status==='pending'||existing?.status==='approved'){setMsg('That league round has already been submitted or completed.');return}if(playedHoles.some(h=>!scores[h-1]||!pars[h-1])){setMsg('Please confirm every played hole before submitting.');return}setSaving(true);setMsg('');const ext=file.name.split('.').pop()||'jpg',path=`${ctx.userId}/${monthId}-${ctx.teamId}-w${week}-${Date.now()}.${ext}`;const up=await supabase.storage.from('round-scorecards').upload(path,file,{upsert:false});if(up.error){setMsg(up.error.message);setSaving(false);return}const row={league_month_id:monthId,team_id:ctx.teamId,week_number:week,submitted_by:ctx.userId,image_path:path,hole_scores:scores,hole_pars:pars,stableford_points:sf,raw_stableford:raw,bonus_birdies:bonusBirdies,bonus_points:bonus,handicap_points:handicap,official_total:official,status:'pending'};const {error}=await supabase.from('round_score_submissions').upsert(row,{onConflict:'league_month_id,team_id,week_number'});setMsg(error?error.message:'Scorecard submitted. It is now awaiting admin approval.');if(!error)setExisting({...row,status:'pending'});setSaving(false)}
 if(!ctx||!selectedMonth)return <PlayerPage title="Submit Score"><div className="simple-mobile-page"><h1>Submit Score</h1><p>{msg||'Loading your round…'}</p></div></PlayerPage>
 const locked=existing?.status==='approved'||existing?.status==='pending'
 return <PlayerPage title="Submit Score"><div className="simple-mobile-page submit-score-page"><h1>Submit Score</h1><div className="card"><h2>{ctx.teamName}</h2><div className="selected-round"><strong>{monthName(selectedMonth)} · Week {week}</strong>{!changeRound&&<button type="button" className="change-round-link" onClick={()=>setChangeRound(true)}>Change Round</button>}</div>{changeRound&&<div className="round-picker"><label>League Month<select value={monthId} onChange={e=>setMonthId(e.target.value)}>{ctx.months.map(m=><option key={m.id} value={m.id}>{monthName(m)}</option>)}</select></label><label>League Week<select value={week} onChange={e=>setWeek(Number(e.target.value))}>{[1,2,3,4].map(w=><option key={w} value={w}>Week {w}</option>)}</select></label><button type="button" className="btn secondary" onClick={()=>setChangeRound(false)}>Use This Round</button></div>}{existing?.status==='pending'?<div className="round-status pending"><b>Awaiting Admin Approval</b><span>This round has already been submitted.</span></div>:locked?<div className="round-status complete"><b>Complete ✓</b><span>This round has already been posted for official scoring.</span></div>:<><p className="muted">Upload a clear GSPro scorecard that also shows the round setup. The app will verify the league settings before any score can be submitted.</p><div className="score-photo-actions"><label className="btn score-photo-btn" onPointerDown={primeFailureAudio}>Take Photo<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={e=>e.target.files?.[0]&&choose(e.target.files[0])}/></label><label className="btn secondary score-photo-btn" onPointerDown={primeFailureAudio}>Photo Library<input hidden type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&choose(e.target.files[0])}/></label></div>{preview&&<img className="score-preview" src={preview} alt="Scorecard preview"/>}{msg&&!reading&&<p className={`message ${validationPassed?'score-ready-message':''}`}><span>{msg}</span></p>}</>}</div>{file&&!locked&&checks.length>0&&<div className="card score-check-card"><div className="score-check-heading"><div><h2>Scorecard Check</h2><p className="muted">All checks must pass before Verify Scores unlocks.</p></div>{reading&&<span className="checking-pill">Checking…</span>}</div><div className="score-check-progress"><span style={{width:`${Math.round((checks.filter(c=>c.status==='pass'||c.status==='fail').length/checks.length)*100)}%`}}/></div><div className="score-check-list">{checks.map(c=><div className={`score-check-item ${c.status}`} key={c.key}><span className="check-dot">{c.status==='pass'?'✓':c.status==='fail'?'!':'•'}</span><div><b>{c.label}</b><small>{c.detail||'Waiting…'}</small></div></div>)}</div></div>}{file&&!locked&&validationPassed&&<div className="card"><h2>Verify Scores</h2><p className="muted">Only the holes used in this league round are shown. Choose the scoring result for each hole.</p><div className="score-entry-grid"><b>Hole</b><b>Par</b><b>Score</b><b>Pts</b>{playedHoles.map(h=>{const i=h-1;return <div className="score-entry-row" key={h}><span>{h}{bonusHoles.includes(h)?' ★':''}</span><input inputMode="numeric" value={pars[i]??''} onChange={e=>setPars(v=>v.map((x,j)=>j===i?(e.target.value?Number(e.target.value):null):x))}/><select value={scoreLabel(scores[i],pars[i])} onChange={e=>setScores(v=>v.map((x,j)=>j===i?scoreFromLabel(e.target.value,pars[i],x):x))}><option value="—">Select</option><option>Albatross+</option><option>Eagle</option><option>Birdie</option><option>Par</option><option>Bogey</option><option>Double Bogey+</option></select><strong>{h<=10&&scores[i]&&pars[i]?pts(scores[i]!,pars[i]!):bonusHoles.includes(h)&&scores[i]&&pars[i]&&scores[i]===pars[i]!-1?`+${bonusValue}`:'—'}</strong></div>})}</div><div className="round-calc"><p>Raw Stableford <b>{raw}</b></p><p>Bonus Birdies <b>{bonusBirdies} (+{bonus.toFixed(1)})</b></p><p>Monthly Handicap <b>{handicap>=0?'+':''}{handicap.toFixed(1)}</b></p><p className="official">Calculated Round Score <b>{official.toFixed(1)}</b></p></div><button className="btn" disabled={saving||reading} onClick={submit}>{saving?'Submitting…':'✓ Scores Are Correct — Submit'}</button></div>}{failureModalOpen&&<div className="score-failure-modal-backdrop" role="presentation" onClick={()=>{if(!reading)setFailureModalOpen(false)}}><div className={`score-failure-modal ${reading?'score-progress-modal':''}`} role="alertdialog" aria-modal="true" aria-labelledby={reading?'score-progress-title':'score-failure-title'} onClick={e=>e.stopPropagation()}>{reading?<><div className="score-progress-spinner" aria-hidden="true"/><h2 id="score-progress-title">Checking Scorecard</h2><p className="score-progress-message">{msg||'Checking scorecard…'}</p><div className="score-modal-progress" aria-label={`Scorecard check ${checkProgress}% complete`}><span style={{width:`${checkProgress}%`}}/></div><strong className="score-progress-percent">{checkProgress}%</strong><small className="score-progress-note">Please keep this window open while the scorecard is being read and verified.</small></>:<><div className="score-failure-modal-icon" aria-hidden="true">×</div><h2 id="score-failure-title">Scorecard check failed and cannot be submitted!</h2><p>Please fix the items marked in red below and upload a new image. Make sure when taking a photo that you take the image from the computer monitor and not the hitting screen. Be sure to get the entire card in the photo including the course name and all of the round settings at the bottom.</p><button type="button" className="btn" onClick={()=>setFailureModalOpen(false)}>View Failed Checks</button></>}</div></div>}</div></PlayerPage>
}
