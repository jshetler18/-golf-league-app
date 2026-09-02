'use client'
import {FormEvent,useEffect,useMemo,useRef,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {AdminDenied,AdminFrame,useAdminGuard} from '../admin-shared'

type Team={id:string;name:string}
type Season={id:string;name:string;start_date:string|null;end_date:string|null}
type TeamSlot={id:string;season_id:string;team_id:string;weekday:number;start_time:string;duration_hours:number}
type Booking={id:string;kind:'personal'|'league'|'blocked';status:string;user_id:string|null;team_id:string|null;title:string|null;start_at:string;end_at:string}
const pad=(n:number)=>String(n).padStart(2,'0')
const easternStamp=(date:string,hour:number)=>`${date} ${pad(hour)}:00:00 America/New_York`
const fmtDate=(v:string)=>new Date(v).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
const fmtTime=(v:string)=>new Date(v).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const hourText=(h:number)=>new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,h))
const slotHour=(v:string)=>Number((v||'00:00').slice(0,2))

export default function SimulatorAdmin(){
 const guard=useAdminGuard()
 const [season,setSeason]=useState<Season|null>(null),[teams,setTeams]=useState<Team[]>([]),[teamSlots,setTeamSlots]=useState<TeamSlot[]>([]),[bookings,setBookings]=useState<Booking[]>([]),[names,setNames]=useState<Record<string,string>>({})
 const [teamId,setTeamId]=useState(''),[date,setDate]=useState(''),[hour,setHour]=useState(18),[duration,setDuration]=useState(2),[blockTitle,setBlockTitle]=useState(''),[blockDate,setBlockDate]=useState(''),[blockHour,setBlockHour]=useState(12),[blockDuration,setBlockDuration]=useState(1)
 const [scheduleTeamId,setScheduleTeamId]=useState(''),[scheduleDay,setScheduleDay]=useState(1),[scheduleHour,setScheduleHour]=useState(13),[savingSchedule,setSavingSchedule]=useState(false)
 const [msg,setMsg]=useState(''),[range,setRange]=useState<'7'|'30'|'all'>('7'),[page,setPage]=useState(0),[jumpDate,setJumpDate]=useState('')
 const scheduleRef=useRef<HTMLElement|null>(null)

 async function load(){
  if(!guard.admin)return
  const {data:s}=await supabase.from('seasons').select('id,name,start_date,end_date').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
  setSeason((s||null) as Season|null)
  const {data:t}=s?.id?await supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'):await supabase.from('teams').select('id,name').eq('is_active',true).order('name')
  const teamRows=(t||[]) as Team[];setTeams(teamRows)
  if(teamRows[0]&&!teamId)setTeamId(teamRows[0].id)
  if(teamRows[0]&&!scheduleTeamId)setScheduleTeamId(teamRows[0].id)
  if(s?.id){const {data:slots}=await supabase.from('team_sim_slots').select('id,season_id,team_id,weekday,start_time,duration_hours').eq('season_id',s.id);setTeamSlots((slots||[]) as TeamSlot[])}else setTeamSlots([])
  const {data:b,error}=await supabase.from('bookings').select('id,kind,status,user_id,team_id,title,start_at,end_at').eq('status','active').gte('end_at',new Date().toISOString()).order('start_at').limit(500)
  if(error){setMsg(error.message);return}
  const rows=(b||[]) as Booking[];setBookings(rows)
  const ids=[...new Set(rows.map(x=>x.user_id).filter(Boolean))] as string[]
  if(ids.length){const {data:p}=await supabase.from('profiles').select('id,full_name,email').in('id',ids);setNames(Object.fromEntries((p||[]).map(x=>[x.id,x.full_name||x.email||'Player'])))}else setNames({})
 }
 useEffect(()=>{load()},[guard.admin])
 useEffect(()=>{setPage(0)},[range,jumpDate])
 useEffect(()=>{const current=teamSlots.find(x=>x.team_id===scheduleTeamId);if(current){setScheduleDay(current.weekday);setScheduleHour(slotHour(current.start_time))}},[scheduleTeamId,teamSlots])

 async function addLeague(e:FormEvent){e.preventDefault();const t=teams.find(x=>x.id===teamId);const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('bookings').insert({kind:'league',team_id:teamId,title:`${t?.name||'Team'} – League Round`,start_at:easternStamp(date,hour),end_at:easternStamp(date,hour+duration),created_by:user?.id});setMsg(error?error.message:'League reservation added.');if(!error)load()}
 async function addBlock(e:FormEvent){e.preventDefault();const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('bookings').insert({kind:'blocked',title:blockTitle||'Unavailable',start_at:easternStamp(blockDate,blockHour),end_at:easternStamp(blockDate,blockHour+blockDuration),created_by:user?.id});setMsg(error?error.message:'Blocked time added.');if(!error)load()}
 async function saveSeasonBlock(e:FormEvent){
  e.preventDefault();if(!scheduleTeamId)return
  setSavingSchedule(true);setMsg('')
  const {data,error}=await supabase.rpc('set_team_sim_slot',{p_team_id:scheduleTeamId,p_weekday:scheduleDay,p_start_time:`${pad(scheduleHour)}:00:00`,p_duration_hours:3})
  setSavingSchedule(false)
  if(error){setMsg(error.message);return}
  const created=Number((data as any)?.bookings_created||0)
  setMsg(`Season team block saved. ${created} weekly 3-hour reservation${created===1?'':'s'} created.`)
  await load()
 }
 async function clearSeasonBlock(team:Team){
  if(!confirm(`Remove ${team.name}'s weekly simulator block for the rest of the season?`))return
  const {error}=await supabase.rpc('clear_team_sim_slot',{p_team_id:team.id})
  setMsg(error?error.message:`${team.name}'s season simulator block was removed.`)
  if(!error)await load()
 }
 function editTeamBlock(teamIdValue:string){setScheduleTeamId(teamIdValue);const current=teamSlots.find(x=>x.team_id===teamIdValue);if(current){setScheduleDay(current.weekday);setScheduleHour(slotHour(current.start_time))}scheduleRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}

 const who=(b:Booking)=>b.kind==='personal'?(b.user_id?names[b.user_id]||'Player reservation':'Player reservation'):b.kind==='league'?(teams.find(t=>t.id===b.team_id)?.name||b.title||'League reservation'):(b.title||'Blocked / unavailable')
 const filtered=useMemo(()=>{const now=new Date();const limit=new Date(now);if(range==='7')limit.setDate(limit.getDate()+7);if(range==='30')limit.setDate(limit.getDate()+30);return bookings.filter(b=>{const start=new Date(b.start_at);if(jumpDate){const key=start.toLocaleDateString('en-CA');if(key!==jumpDate)return false}if(range!=='all'&&start>limit)return false;return true})},[bookings,range,jumpDate])
 const pageSize=10,totalPages=Math.max(1,Math.ceil(filtered.length/pageSize)),safePage=Math.min(page,totalPages-1),visible=filtered.slice(safePage*pageSize,safePage*pageSize+pageSize)
 const configuredCount=teams.filter(t=>teamSlots.some(s=>s.team_id===t.id)).length
 const currentSlot=teamSlots.find(x=>x.team_id===scheduleTeamId)

 if(!guard.ready || !guard.admin)return <AdminDenied {...guard}/>
 return <AdminFrame title="Simulator" description="Manage one-time simulator time, weekly winter-league team blocks, and upcoming reservations.">{msg&&<p className="message">{msg}</p>}
 <section><div className="section-title"><h2>Add Simulator Time</h2></div><div className="grid-2"><div className="card"><h3>Add League Reservation</h3><form onSubmit={addLeague} className="form-grid single"><label className="field">Team<select value={teamId} onChange={e=>setTeamId(e.target.value)}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="field">Date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field">Start Time<select value={hour} onChange={e=>setHour(Number(e.target.value))}>{Array.from({length:15},(_,i)=>i+7).map(h=><option key={h} value={h}>{hourText(h)}</option>)}</select></label><label className="field">Length<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={1}>1 hour</option><option value={2}>2 hours</option><option value={3}>3 hours</option></select></label><button className="btn">Add League Reservation</button></form></div><div className="card"><h3>Block Simulator Time</h3><form onSubmit={addBlock} className="form-grid single"><label className="field">Reason<input value={blockTitle} onChange={e=>setBlockTitle(e.target.value)} placeholder="Unavailable"/></label><label className="field">Date<input required type="date" value={blockDate} onChange={e=>setBlockDate(e.target.value)}/></label><label className="field">Start Time<select value={blockHour} onChange={e=>setBlockHour(Number(e.target.value))}>{Array.from({length:15},(_,i)=>i+7).map(h=><option key={h} value={h}>{hourText(h)}</option>)}</select></label><label className="field">Length<select value={blockDuration} onChange={e=>setBlockDuration(Number(e.target.value))}><option value={1}>1 hour</option><option value={2}>2 hours</option><option value={3}>3 hours</option></select></label><button className="btn">Block Time</button></form></div></div></section>

 <section ref={scheduleRef} className="team-sim-schedule-v1241"><div className="section-title"><div><h2>Winter League Team Blocks</h2><p className="muted">Set each team once. Their same 3-hour block is reserved every week for the active season and automatically appears on the player simulator calendar.</p></div><span className={`team-sim-progress-v1241 ${configuredCount===teams.length&&teams.length?'complete':''}`}>{configuredCount} of {teams.length} teams set up</span></div>
 <div className="grid-2 team-sim-editor-grid-v1241"><div className="card"><h3>{currentSlot?'Edit Weekly Team Block':'Set Weekly Team Block'}</h3>{season?<p className="muted">{season.name}{season.start_date&&season.end_date?` • ${new Date(season.start_date+'T12:00:00').toLocaleDateString()}–${new Date(season.end_date+'T12:00:00').toLocaleDateString()}`:''}</p>:<p className="muted">Set an active season with dates before creating team blocks.</p>}<form onSubmit={saveSeasonBlock} className="form-grid single"><label className="field">Team<select value={scheduleTeamId} onChange={e=>setScheduleTeamId(e.target.value)}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="field">Day Each Week<select value={scheduleDay} onChange={e=>setScheduleDay(Number(e.target.value))}>{dayNames.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label><label className="field">3-Hour Time Block<select value={scheduleHour} onChange={e=>setScheduleHour(Number(e.target.value))}>{Array.from({length:12},(_,i)=>i+7).map(h=><option key={h} value={h}>{hourText(h)}–{hourText(h+3)}</option>)}</select></label><button className="btn" disabled={!season||!scheduleTeamId||savingSchedule}>{savingSchedule?'Saving Season Schedule…':currentSlot?'Update Entire Season Block':'Set Entire Season Block'}</button></form></div>
 <div className="card team-sim-help-v1241"><h3>How This Works</h3><div><span>1</span><p>Choose a team, weekday, and starting time.</p></div><div><span>2</span><p>The simulator is reserved for that team for 3 hours on that day every week of the season.</p></div><div><span>3</span><p>Players see the team name on Reserve Sim and cannot book over the league block.</p></div><div><span>4</span><p>If you change a team's block, future weekly reservations are rebuilt automatically.</p></div></div></div>
 <div className="card team-sim-overview-v1241"><div className="team-sim-overview-head-v1241"><div><h3>Team Schedule Overview</h3><p className="muted">Every active team is shown, including teams you have not scheduled yet.</p></div><button className="btn secondary small" onClick={load}>Refresh</button></div><div className="team-sim-team-list-v1241">{teams.length===0?<p className="muted">No active teams found for the active season.</p>:teams.map(team=>{const slot=teamSlots.find(s=>s.team_id===team.id);const h=slot?slotHour(slot.start_time):0;return <div className={`team-sim-team-row-v1241 ${slot?'configured':'missing'}`} key={team.id}><div className="team-sim-status-dot-v1241" aria-hidden="true">{slot?'✓':'!'}</div><div className="team-sim-team-copy-v1241"><strong>{team.name}</strong>{slot?<span>{dayNames[slot.weekday]}s • {hourText(h)}–{hourText(h+3)}</span>:<span>Not set up yet</span>}</div><span className={`team-sim-status-pill-v1241 ${slot?'configured':'missing'}`}>{slot?'Set Up':'Not Set Up'}</span><div className="actions"><button className="btn secondary small" onClick={()=>editTeamBlock(team.id)}>{slot?'Edit':'Set Up'}</button>{slot&&<button className="btn danger small" onClick={()=>clearSeasonBlock(team)}>Clear</button>}</div></div>})}</div></div>
 </section>

 <section><div className="section-title"><div><h2>Upcoming Simulator Bookings</h2><p className="muted">Weekly team blocks appear here alongside player reservations and other blocked time.</p></div><button className="btn secondary small" onClick={load}>Refresh</button></div><div className="card simulator-booking-browser-v1238"><div className="sim-booking-controls-v1238"><div className="sim-range-buttons-v1238"><button className={range==='7'?'active':''} onClick={()=>setRange('7')}>Next 7 Days</button><button className={range==='30'?'active':''} onClick={()=>setRange('30')}>Next 30 Days</button><button className={range==='all'?'active':''} onClick={()=>setRange('all')}>All Upcoming</button></div><label className="field sim-jump-date-v1238">Specific Date<input type="date" value={jumpDate} onChange={e=>setJumpDate(e.target.value)}/></label>{jumpDate&&<button className="btn secondary small" onClick={()=>setJumpDate('')}>Clear Date</button>}</div><div className="sim-booking-summary-v1238"><strong>{filtered.length} booking{filtered.length===1?'':'s'}</strong><span>{filtered.length?`Showing ${safePage*pageSize+1}–${Math.min((safePage+1)*pageSize,filtered.length)}`:'Nothing scheduled in this view'}</span></div><div className="table-wrap"><table className="sim-booking-table-v1238"><thead><tr><th>Date</th><th>Time</th><th>Reserved By / Reason</th><th>Type</th></tr></thead><tbody>{visible.length===0?<tr><td colSpan={4}>No upcoming reservations in this view.</td></tr>:visible.map(b=><tr key={b.id}><td><strong>{fmtDate(b.start_at)}</strong></td><td>{fmtTime(b.start_at)} – {fmtTime(b.end_at)}</td><td><strong>{who(b)}</strong></td><td><span className={`sim-kind-pill-v1238 ${b.kind}`}>{b.kind==='personal'?'Player':b.kind==='league'?'League':'Blocked'}</span></td></tr>)}</tbody></table></div>{totalPages>1&&<div className="sim-pagination-v1238"><button className="btn secondary small" disabled={safePage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>← Previous</button><span>Page {safePage+1} of {totalPages}</span><button className="btn secondary small" disabled={safePage>=totalPages-1} onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))}>Next →</button></div>}</div></section>
 </AdminFrame>
}
