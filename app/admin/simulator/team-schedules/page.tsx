'use client'
import {FormEvent,useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {AdminDenied,AdminFrame,useAdminGuard} from '../../admin-shared'

type Team={id:string;name:string}
type Season={id:string;name:string;start_date:string;end_date:string}
type TeamSlot={id:string;team_id:string;weekday:number;start_time:string;duration_hours:number;start_date:string;end_date:string}
type MakeupSlot={id:string;name:string;weekday:number;start_time:string;duration_hours:number;start_date:string;end_date:string}

const MAKEUP='__league_makeup__'
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const startHours=Array.from({length:16},(_,i)=>i+6)
const durations=Array.from({length:24},(_,i)=>i+1)
const pad=(n:number)=>String(n).padStart(2,'0')
const hour=(h:number)=>new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,h))
const slotHour=(s:string)=>Number(s.slice(0,2))
const dateFmt=(s:string)=>new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
const practiceStart=(seasonStart:string)=>{const d=new Date(`${seasonStart}T12:00:00`);d.setMonth(d.getMonth()-1,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`}

export default function Page(){
 const g=useAdminGuard()
 const [season,setSeason]=useState<Season|null>(null)
 const [teams,setTeams]=useState<Team[]>([])
 const [slots,setSlots]=useState<TeamSlot[]>([])
 const [makeups,setMakeups]=useState<MakeupSlot[]>([])
 const [selection,setSelection]=useState('')
 const [editingMakeupId,setEditingMakeupId]=useState<string|null>(null)
 const [day,setDay]=useState(1)
 const [h,setH]=useState(12)
 const [dur,setDur]=useState(3)
 const [start,setStart]=useState('')
 const [end,setEnd]=useState('')
 const [msg,setMsg]=useState('')
 const [saving,setSaving]=useState(false)
 const [generating,setGenerating]=useState(false)

 async function load(){
  const {data:s}=await supabase.from('seasons').select('id,name,start_date,end_date').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
  setSeason(s as any)
  if(!s)return
  const [{data:t},{data:x},{data:m}]=await Promise.all([
   supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'),
   supabase.from('team_sim_slots').select('id,team_id,weekday,start_time,duration_hours,start_date,end_date').eq('season_id',s.id),
   supabase.from('league_makeup_slots').select('id,name,weekday,start_time,duration_hours,start_date,end_date').eq('season_id',s.id).order('weekday').order('start_time')
  ])
  setTeams((t||[]) as any);setSlots((x||[]) as any);setMakeups((m||[]) as any)
  if(!selection)setSelection(t?.[0]?.id||MAKEUP)
  if(!start)setStart(practiceStart(s.start_date))
  if(!end)setEnd(s.end_date)
 }
 useEffect(()=>{if(g.admin)load()},[g.admin])
 useEffect(()=>{
  if(!season)return
  if(selection===MAKEUP){
   if(!editingMakeupId){setDay(1);setH(12);setDur(3);setStart(practiceStart(season.start_date));setEnd(season.end_date)}
   return
  }
  setEditingMakeupId(null)
  const x=slots.find(s=>s.team_id===selection)
  if(x){setDay(x.weekday);setH(slotHour(x.start_time));setDur(x.duration_hours||3);setStart(x.start_date);setEnd(x.end_date)}
  else{setDay(1);setH(12);setDur(3);setStart(practiceStart(season.start_date));setEnd(season.end_date)}
 },[selection,slots,season,editingMakeupId])

 async function save(e:FormEvent){
  e.preventDefault(); if(!season)return; setSaving(true); setMsg('')
  if(selection===MAKEUP){
   const {data,error}=await supabase.rpc('set_league_makeup_slot',{p_slot_id:editingMakeupId,p_name:'League Make-Up Time',p_weekday:day,p_start_time:`${pad(h)}:00:00`,p_duration_hours:dur,p_start_date:start,p_end_date:end,p_season_id:season.id})
   setSaving(false);setMsg(error?error.message:`League Make-Up Time saved. ${(data as any)?.bookings_created||0} future weekly blocks created.`)
   if(!error){setEditingMakeupId(null);await load()}
   return
  }
  const {data,error}=await supabase.rpc('set_team_sim_slot',{p_team_id:selection,p_weekday:day,p_start_time:`${pad(h)}:00:00`,p_duration_hours:dur,p_start_date:start,p_end_date:end})
  setSaving(false);setMsg(error?error.message:`Schedule saved. ${(data as any)?.bookings_created||0} future weekly bookings created.`)
  if(!error)await load()
 }
 async function clearTeam(t:Team){if(!confirm(`Remove ${t.name}'s future recurring simulator bookings? Past bookings will remain.`))return;const {error}=await supabase.rpc('clear_team_sim_slot',{p_team_id:t.id});setMsg(error?error.message:`${t.name}'s future schedule removed.`);if(!error)load()}
 async function clearMakeup(s:MakeupSlot){if(!confirm('Remove this recurring League Make-Up Time block and all of its future occurrences?'))return;const {error}=await supabase.rpc('clear_league_makeup_slot',{p_slot_id:s.id});setMsg(error?error.message:'Future League Make-Up Time blocks removed.');if(!error){if(editingMakeupId===s.id)setEditingMakeupId(null);load()}}
 function editMakeup(s:MakeupSlot){setSelection(MAKEUP);setEditingMakeupId(s.id);setDay(s.weekday);setH(slotHour(s.start_time));setDur(s.duration_hours||3);setStart(s.start_date);setEnd(s.end_date);window.scrollTo({top:0,behavior:'smooth'})}
 function newMakeup(){if(!season)return;setSelection(MAKEUP);setEditingMakeupId(null);setDay(1);setH(12);setDur(3);setStart(practiceStart(season.start_date));setEnd(season.end_date);window.scrollTo({top:0,behavior:'smooth'})}
 function generateScheduleImage(){
  setGenerating(true)
  try{
   const W=1800,headerH=74,rowH=66,left=205,top=0,H=headerH+(16*rowH),colW=(W-left)/5
   const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not create the schedule image.')
   const teamColors=['#67b7f0','#c78af2','#39ced1','#82df8d','#ff8f7d','#80aaf0','#ff7fba','#ffe43d','#ffb06f','#8ed8e8','#b8e986','#e7a5d8']
   const colorByTeam=new Map(teams.map((t,i)=>[t.id,teamColors[i%teamColors.length]]))
   const fmt=(hr:number)=>{const h=((hr+11)%12)+1;return `${h}:00 ${hr<12?'AM':'PM'}`}
   const drawText=(text:string,x:number,y:number,size:number,bold=false,color='#111')=>{ctx.fillStyle=color;ctx.font=`${bold?'700':'500'} ${size}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y)}

   // Base calendar: no decorative strip above the weekday header.
   ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H)
   ctx.fillStyle='#064b36';ctx.fillRect(0,top,W,headerH)
   drawText('Time',left/2,top+headerH/2,42,true,'#fff')
   ;['Monday','Tuesday','Wednesday','Thursday','Friday'].forEach((d,i)=>drawText(d,left+colW*(i+.5),top+headerH/2,42,true,'#fff'))

   // Time labels and base grid are drawn BEFORE schedule blocks so hourly lines
   // never run through a colored team or League Make-Up block.
   for(let hr=6;hr<=21;hr++){
    const y=top+headerH+(hr-6)*rowH
    ctx.fillStyle='#f7f7f7';ctx.fillRect(0,y,left,rowH)
    drawText(fmt(hr),left/2,y+rowH/2,29,true)
   }
   ctx.strokeStyle='#222';ctx.lineWidth=2
   for(let i=0;i<=5;i++){
    const x=i===0?left:left+i*colW
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,H);ctx.stroke()
   }
   ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(W,top);ctx.stroke()
   ctx.beginPath();ctx.moveTo(0,top+headerH);ctx.lineTo(W,top+headerH);ctx.stroke()
   for(let hr=6;hr<=22;hr++){
    const y=top+headerH+(hr-6)*rowH
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()
   }
   ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(0,H);ctx.stroke()
   ctx.beginPath();ctx.moveTo(W-1,top);ctx.lineTo(W-1,H);ctx.stroke()

   const blocks=[
    ...slots.map(s=>({weekday:s.weekday,start:slotHour(s.start_time),dur:s.duration_hours||3,label:teams.find(t=>t.id===s.team_id)?.name||'Team',fill:colorByTeam.get(s.team_id)||'#9fd3ff'})),
    ...makeups.map(s=>({weekday:s.weekday,start:slotHour(s.start_time),dur:s.duration_hours||3,label:'League Make-Ups',fill:'#c9c9c9'}))
   ]
   blocks.filter(b=>b.weekday>=1&&b.weekday<=5).forEach(b=>{
    const x=left+(b.weekday-1)*colW,y=top+headerH+(b.start-6)*rowH,hgt=b.dur*rowH
    ctx.fillStyle=b.fill;ctx.fillRect(x+1,y+1,colW-2,hgt-2)
    ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.strokeRect(x,y,colW,hgt)
    drawText(b.label,x+colW/2,y+hgt/2-18,31,true)
    drawText(`${fmt(b.start)} – ${fmt(b.start+b.dur)}`,x+colW/2,y+hgt/2+28,25,false)
   })

   // Restore only the major day-column boundaries and header border after blocks.
   // Hourly row lines intentionally stay hidden inside schedule blocks.
   ctx.strokeStyle='#222';ctx.lineWidth=2
   for(let i=0;i<=5;i++){
    const x=i===0?left:left+i*colW
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,H);ctx.stroke()
   }
   ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(W,top);ctx.stroke()
   ctx.beginPath();ctx.moveTo(0,top+headerH);ctx.lineTo(W,top+headerH);ctx.stroke()
   ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(0,H);ctx.stroke()
   ctx.beginPath();ctx.moveTo(W-1,top);ctx.lineTo(W-1,H);ctx.stroke()

   const a=document.createElement('a');a.download=`league-team-schedule-${new Date().toISOString().slice(0,10)}.png`;a.href=canvas.toDataURL('image/png');a.click();setMsg('Schedule image generated from the current Team & League Schedules setup.')
  }catch(err:any){setMsg(err?.message||'Could not generate schedule image.')}
  finally{setGenerating(false)}
 }

 if(!g.ready||!g.admin)return <AdminDenied {...g}/>
 const current=selection!==MAKEUP?slots.find(x=>x.team_id===selection):null
 const selectedName=selection===MAKEUP?'League Make-Up Time':teams.find(t=>t.id===selection)?.name||'Team'
 return <AdminFrame title="Team & League Schedules" description="Set flexible recurring simulator blocks for teams and League Make-Up Time in one place.">
  {msg&&<p className="message">{msg}</p>}
  <div className="card">
   <h2>{selection===MAKEUP?(editingMakeupId?'Edit League Make-Up Time':'Add League Make-Up Time'):(current?'Edit Team Schedule':'Set Up Team Schedule')}</h2>
   <form onSubmit={save} className="form-grid">
    <label className="field">Team / Schedule<select value={selection} onChange={e=>{setSelection(e.target.value);setEditingMakeupId(null)}}>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}<option value={MAKEUP}>League Make-Up Time</option></select></label>
    <label className="field">Day Each Week<select value={day} onChange={e=>setDay(+e.target.value)}>{days.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label>
    <label className="field">Starting Time<select value={h} onChange={e=>setH(+e.target.value)}>{startHours.map(x=><option value={x} key={x}>{hour(x)}</option>)}</select></label>
    <label className="field">Hours Reserved<select value={dur} onChange={e=>setDur(+e.target.value)}>{durations.map(x=><option value={x} key={x}>{x} {x===1?'hour':'hours'}</option>)}</select></label>
    <label className="field">Schedule Starts<input required type="date" min={season?practiceStart(season.start_date):undefined} max={season?.end_date} value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label className="field">Schedule Ends<input required type="date" min={season?practiceStart(season.start_date):undefined} max={season?.end_date} value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <div className="actions"><button className="btn" disabled={saving}>{saving?'Updating Future Bookings…':selection===MAKEUP?(editingMakeupId?'Update Future Make-Up Blocks':'Create Make-Up Schedule'):(current?'Update Future Schedule':'Create Team Schedule')}</button>{selection===MAKEUP&&editingMakeupId&&<button type="button" className="btn secondary" onClick={newMakeup}>Cancel Edit</button>}</div>
   </form>
   <p className="muted">Choose any hourly starting time from 6 AM through 9 PM and the number of hours you want the simulator reserved. There is no 3-hour restriction for Admin recurring schedules. If a block starts before the player reservation calendar begins, the overlapping visible hours will still show as unavailable. Schedules may begin in October for practice. Changing a schedule rebuilds future bookings only; past bookings stay unchanged, and conflicts are reported rather than overwritten.</p>
  </div>
  <section>
   <div className="section-title"><h2>Schedule Image</h2></div>
   <div className="card">
    <p className="muted">Generate a clean Monday–Friday calendar image from the schedules currently saved below. Every team uses a different color and every League Make-Up block is gray.</p>
    <div className="actions"><button type="button" className="btn" onClick={generateScheduleImage} disabled={generating}>{generating?'Generating…':'Generate Schedule Image'}</button></div>
   </div>
  </section>
  <section>
   <div className="section-title"><h2>Team Schedule Overview</h2><span>{slots.length} of {teams.length} set up</span></div>
   <div className="card team-sim-team-list-v1241">{teams.map(t=>{const s=slots.find(x=>x.team_id===t.id);return <div className={`team-sim-team-row-v1241 ${s?'configured':'missing'}`} key={t.id}><div className="team-sim-status-dot-v1241">{s?'✓':'!'}</div><div className="team-sim-team-copy-v1241"><strong>{t.name}</strong>{s?<span>{days[s.weekday]}s • {hour(slotHour(s.start_time))}–{hour(slotHour(s.start_time)+(s.duration_hours||3))} • {dateFmt(s.start_date)}–{dateFmt(s.end_date)}</span>:<span>Not set up yet</span>}</div><span className={`team-sim-status-pill-v1241 ${s?'configured':'missing'}`}>{s?'Set Up':'Not Set Up'}</span><div className="actions"><button className="btn secondary small" onClick={()=>{setSelection(t.id);setEditingMakeupId(null);window.scrollTo({top:0,behavior:'smooth'})}}>{s?'Edit':'Set Up'}</button>{s&&<button className="btn danger small" onClick={()=>clearTeam(t)}>Clear</button>}</div></div>})}</div>
  </section>
  <section>
   <div className="section-title"><h2>League Make-Up Time</h2><button className="btn secondary small" onClick={newMakeup}>Add Make-Up Block</button></div>
   <div className="card team-sim-team-list-v1241">{makeups.length===0?<p className="muted">No recurring League Make-Up Time is set up yet.</p>:makeups.map(s=><div className="team-sim-team-row-v1241 configured" key={s.id}><div className="team-sim-status-dot-v1241">✓</div><div className="team-sim-team-copy-v1241"><strong>League Make-Up Time</strong><span>{days[s.weekday]}s • {hour(slotHour(s.start_time))}–{hour(slotHour(s.start_time)+(s.duration_hours||3))} • {dateFmt(s.start_date)}–{dateFmt(s.end_date)}</span></div><span className="team-sim-status-pill-v1241 configured">Set Up</span><div className="actions"><button className="btn secondary small" onClick={()=>editMakeup(s)}>Edit</button><button className="btn danger small" onClick={()=>clearMakeup(s)}>Remove</button></div></div>)}</div>
  </section>
 </AdminFrame>
}
