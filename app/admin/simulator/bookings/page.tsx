'use client'
import {FormEvent,useEffect,useMemo,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {AdminDenied,AdminFrame,useAdminGuard} from '../../admin-shared'

type B={id:string;kind:string;user_id:string|null;team_id:string|null;title:string|null;start_at:string;end_at:string;admin_sim_block_slot_id:string|null}
type R={id:string;title:string;weekday:number;start_time:string;duration_hours:number;start_date:string;end_date:string}
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const pad=(n:number)=>String(n).padStart(2,'0')
const stamp=(d:string,h:number)=>`${d} ${pad(h)}:00:00 America/New_York`
const ht=(h:number)=>new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,h))
const fd=(v:string)=>new Date(v).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
const ft=(v:string)=>new Date(v).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
const compactTime=(v:string)=>{const [hh,mm]=v.slice(0,5).split(':').map(Number);return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:mm?'2-digit':undefined}).format(new Date(2020,0,1,hh,mm))}

export default function Page(){
 const g=useAdminGuard()
 const [bookings,setBookings]=useState<B[]>([]),[teams,setTeams]=useState<any[]>([]),[names,setNames]=useState<Record<string,string>>({})
 const [date,setDate]=useState(''),[h,setH]=useState(12),[dur,setDur]=useState(1),[title,setTitle]=useState('Unavailable')
 const [range,setRange]=useState('7'),[jump,setJump]=useState(''),[msg,setMsg]=useState('')
 const [recurring,setRecurring]=useState<R[]>([]),[editId,setEditId]=useState<string|null>(null),[rTitle,setRTitle]=useState('Unavailable'),[weekday,setWeekday]=useState(1),[rHour,setRHour]=useState(7),[rDur,setRDur]=useState(1),[startDate,setStartDate]=useState(''),[endDate,setEndDate]=useState('')

 async function load(){
  const [{data:b},{data:t},{data:r}]=await Promise.all([
   supabase.from('bookings').select('id,kind,user_id,team_id,title,start_at,end_at,admin_sim_block_slot_id').eq('status','active').gte('end_at',new Date().toISOString()).order('start_at').limit(500),
   supabase.from('teams').select('id,name'),
   supabase.from('admin_sim_block_slots').select('id,title,weekday,start_time,duration_hours,start_date,end_date').order('weekday').order('start_time')
  ])
  const rows=(b||[]) as B[];setBookings(rows);setTeams(t||[]);setRecurring((r||[]) as R[])
  const ids=[...new Set(rows.map(x=>x.user_id).filter(Boolean))] as string[]
  if(ids.length){const {data:p}=await supabase.from('profiles').select('id,full_name,email').in('id',ids);setNames(Object.fromEntries((p||[]).map(x=>[x.id,x.full_name||x.email||'Player'])))}else setNames({})
 }
 useEffect(()=>{if(g.admin)load()},[g.admin])

 async function add(e:FormEvent){
  e.preventDefault();const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('bookings').insert({kind:'blocked',title:title||'Unavailable',start_at:stamp(date,h),end_at:stamp(date,h+dur),created_by:user?.id});setMsg(error?error.message:'Simulator time blocked.');if(!error)load()
 }

 async function saveRecurring(e:FormEvent){
  e.preventDefault();setMsg('')
  const {error}=await supabase.rpc('set_admin_sim_block_slot',{p_slot_id:editId,p_title:rTitle||'Unavailable',p_weekday:weekday,p_start_time:`${pad(rHour)}:00:00`,p_duration_hours:rDur,p_start_date:startDate,p_end_date:endDate})
  if(error){setMsg(error.message);return}
  setMsg(editId?'Recurring simulator block updated.':'Recurring simulator block created.');cancelEdit();load()
 }
 function editRecurring(r:R){setEditId(r.id);setRTitle(r.title);setWeekday(r.weekday);setRHour(Number(r.start_time.slice(0,2)));setRDur(r.duration_hours);setStartDate(r.start_date);setEndDate(r.end_date);window.scrollTo({top:0,behavior:'smooth'})}
 function cancelEdit(){setEditId(null);setRTitle('Unavailable');setWeekday(1);setRHour(7);setRDur(1);setStartDate('');setEndDate('')}
 async function clearRecurring(r:R){if(!confirm(`Remove the recurring block “${r.title}”? Future occurrences will be removed. Past blocks will remain.`))return;const {error}=await supabase.rpc('clear_admin_sim_block_slot',{p_slot_id:r.id});setMsg(error?error.message:'Recurring simulator block removed.');if(!error){if(editId===r.id)cancelEdit();load()}}

 async function remove(b:B){const recurring=b.kind==='league'||!!b.admin_sim_block_slot_id||(b.kind==='blocked'&&b.title?.toLowerCase().includes('make-up'));if(!confirm(`${recurring?'Remove this occurrence only':'Cancel/remove this simulator time'}?${recurring?' The recurring schedule itself will stay in place.':''}`))return;const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('bookings').update({status:'cancelled',cancelled_by:user?.id,cancellation_reason:'Removed by administrator'}).eq('id',b.id);setMsg(error?error.message:'Simulator time removed.');if(!error)load()}

 const filtered=useMemo(()=>{const now=new Date(),lim=new Date(now);if(range!=='all')lim.setDate(lim.getDate()+(range==='7'?7:30));return bookings.filter(b=>{const s=new Date(b.start_at);if(jump&&s.toLocaleDateString('en-CA')!==jump)return false;return range==='all'||s<=lim})},[bookings,range,jump])
 const who=(b:B)=>b.kind==='personal'?(b.user_id?names[b.user_id]||'Player':'Player'):b.kind==='league'?(teams.find(t=>t.id===b.team_id)?.name||b.title||'League'):b.title||'Unavailable'
 if(!g.ready||!g.admin)return <AdminDenied {...g}/>
 return <AdminFrame title="Bookings & Block Time" description="View upcoming simulator use and create one-time or recurring simulator blocks.">
  {msg&&<p className="message">{msg}</p>}

  <div className="card"><h2>{editId?'Edit Recurring Simulator Block':'Add Recurring Simulator Block'}</h2>
   <form onSubmit={saveRecurring} className="form-grid">
    <label className="field">Reason<input value={rTitle} onChange={e=>setRTitle(e.target.value)} placeholder="Unavailable"/></label>
    <label className="field">Day Each Week<select value={weekday} onChange={e=>setWeekday(+e.target.value)}>{DAYS.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label>
    <label className="field">Starting Time<select value={rHour} onChange={e=>setRHour(+e.target.value)}>{Array.from({length:16},(_,i)=>i+6).map(x=><option value={x} key={x}>{ht(x)}</option>)}</select></label>
    <label className="field">Hours Reserved<select value={rDur} onChange={e=>setRDur(+e.target.value)}>{Array.from({length:24},(_,i)=>i+1).map(x=><option value={x} key={x}>{x} hour{x===1?'':'s'}</option>)}</select></label>
    <label className="field">Schedule Starts<input required type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
    <label className="field">Schedule Ends<input required type="date" value={endDate} min={startDate||undefined} onChange={e=>setEndDate(e.target.value)}/></label>
    <div style={{display:'flex',gap:8,alignItems:'end'}}><button className="btn">{editId?'Update Recurring Block':'Create Recurring Block'}</button>{editId&&<button type="button" className="btn secondary" onClick={cancelEdit}>Cancel</button>}</div>
   </form>
   <p className="muted" style={{marginTop:10}}>This repeats every week between the start and end dates. Existing reservations are protected; the system will report a conflict instead of overwriting them.</p>
  </div>

  <div className="card"><div className="section-title"><h2>Recurring Simulator Blocks</h2><button className="btn secondary small" onClick={load}>Refresh</button></div>
   <div className="table-wrap"><table className="sim-booking-table-v1238"><thead><tr><th>Reason</th><th>Day</th><th>Time</th><th>Dates</th><th>Action</th></tr></thead><tbody>{recurring.length===0?<tr><td colSpan={5}>No recurring simulator blocks set up.</td></tr>:recurring.map(r=><tr key={r.id}><td><strong>{r.title}</strong></td><td>{DAYS[r.weekday]}</td><td>{compactTime(r.start_time)} · {r.duration_hours} hour{r.duration_hours===1?'':'s'}</td><td>{new Date(`${r.start_date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} – {new Date(`${r.end_date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button className="btn secondary small" onClick={()=>editRecurring(r)}>Edit</button><button className="btn danger small" onClick={()=>clearRecurring(r)}>Remove</button></div></td></tr>)}</tbody></table></div>
  </div>

  <div className="card"><h2>Add One-Time Simulator Block</h2><form onSubmit={add} className="form-grid"><label className="field">Reason<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="field">Date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field">Start Time<select value={h} onChange={e=>setH(+e.target.value)}>{Array.from({length:16},(_,i)=>i+6).map(x=><option value={x} key={x}>{ht(x)}</option>)}</select></label><label className="field">Length<select value={dur} onChange={e=>setDur(+e.target.value)}>{Array.from({length:24},(_,i)=>i+1).map(x=><option value={x} key={x}>{x} hour{x===1?'':'s'}</option>)}</select></label><button className="btn">Block Simulator Time</button></form></div>

  <section><div className="section-title"><h2>Upcoming Simulator Bookings</h2><button className="btn secondary small" onClick={load}>Refresh</button></div><div className="card simulator-booking-browser-v1238"><div className="sim-booking-controls-v1238"><div className="sim-range-buttons-v1238">{[['7','Next 7 Days'],['30','Next 30 Days'],['all','All Upcoming']].map(x=><button className={range===x[0]?'active':''} onClick={()=>setRange(x[0])} key={x[0]}>{x[1]}</button>)}</div><label className="field sim-jump-date-v1238">Specific Date<input type="date" value={jump} onChange={e=>setJump(e.target.value)}/></label></div><div className="table-wrap"><table className="sim-booking-table-v1238"><thead><tr><th>Date</th><th>Time</th><th>Reserved By / Reason</th><th>Type</th><th>Action</th></tr></thead><tbody>{filtered.length===0?<tr><td colSpan={5}>No upcoming reservations in this view.</td></tr>:filtered.map(b=><tr key={b.id}><td><strong>{fd(b.start_at)}</strong></td><td>{ft(b.start_at)} – {ft(b.end_at)}</td><td><strong>{who(b)}</strong></td><td><span className={`sim-kind-pill-v1238 ${b.kind}`}>{b.kind==='personal'?'Player':b.kind==='league'?'League':'Blocked'}</span></td><td><button className="btn danger small" onClick={()=>remove(b)}>Remove</button></td></tr>)}</tbody></table></div></div></section>
 </AdminFrame>
}
