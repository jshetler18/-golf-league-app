'use client'
import {FormEvent,useEffect,useState} from 'react'
import {AdminDenied,AdminFrame,useAdminGuard} from '../admin-shared'
import {supabase} from '@/lib/supabase'

type EditMeeting={id:string,title:string,date:string,time:string,location:string,message:string}

function localDateValue(value:string){
  const d=new Date(value)
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
function localTimeValue(value:string){
  const d=new Date(value)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function MeetingRSVPAdmin(){
  const guard=useAdminGuard()
  const [meetings,setMeetings]=useState<any[]>([])
  const [title,setTitle]=useState('League Meeting')
  const [date,setDate]=useState('')
  const [time,setTime]=useState('18:00')
  const [location,setLocation]=useState('')
  const [message,setMessage]=useState('')
  const [msg,setMsg]=useState('')
  const [busy,setBusy]=useState(false)
  const [editing,setEditing]=useState<EditMeeting|null>(null)
  const [editBusy,setEditBusy]=useState(false)

  async function call(url:string,opts:any={}){
    const {data:{session}}=await supabase.auth.getSession()
    return fetch(url,{...opts,headers:{...(opts.headers||{}),Authorization:`Bearer ${session?.access_token||''}`}})
  }
  async function load(){
    const r=await call('/api/meeting-rsvp/admin',{cache:'no-store'}),j=await r.json()
    if(r.ok)setMeetings(j.meetings||[])
    else setMsg(j.error||'Unable to load meetings.')
  }
  useEffect(()=>{if(guard.admin)load()},[guard.admin])

  async function create(e:FormEvent){
    e.preventDefault()
    if(!date||!time)return
    setBusy(true);setMsg('')
    const local=new Date(`${date}T${time}:00`)
    const r=await call('/api/meeting-rsvp/admin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,meetingAt:local.toISOString(),location,message})}),j=await r.json()
    setBusy(false)
    if(!r.ok){setMsg(j.error||'Could not create meeting.');return}
    setMsg(`Meeting created with ${j.inviteeCount} league players.`)
    setDate('');setMessage('')
    await load()
  }
  async function toggle(m:any){
    const r=await call('/api/meeting-rsvp/admin',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:m.id,is_open:!m.is_open})})
    if(r.ok)load()
  }
  function beginEdit(m:any){
    setEditing({id:m.id,title:m.title||'League Meeting',date:localDateValue(m.meeting_at),time:localTimeValue(m.meeting_at),location:m.location||'',message:m.message||''})
    setMsg('')
  }
  async function saveEdit(e:FormEvent){
    e.preventDefault()
    if(!editing||!editing.date||!editing.time)return
    setEditBusy(true);setMsg('')
    const local=new Date(`${editing.date}T${editing.time}:00`)
    const r=await call('/api/meeting-rsvp/admin',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:editing.id,title:editing.title.trim()||'League Meeting',meetingAt:local.toISOString(),location:editing.location.trim(),message:editing.message.trim()})})
    const j=await r.json().catch(()=>({}))
    setEditBusy(false)
    if(!r.ok){setMsg(j.error||'Could not update meeting.');return}
    setEditing(null)
    setMsg('Meeting details updated. The RSVP link and existing responses were preserved.')
    await load()
  }
  function link(m:any){return `${window.location.origin}/rsvp/${m.public_token}`}
  async function copyLink(m:any){await navigator.clipboard.writeText(link(m));setMsg('RSVP link copied.')}
  async function copyText(m:any){
    const d=new Date(m.meeting_at),when=`${d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} at ${d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`
    const text=`Tom Krise 19th Hole Golf League Meeting\n${m.title} — ${when}${m.location?`\n${m.location}`:''}${m.message?`\n\n${m.message}`:''}\n\nPlease use this link, find your name, and let us know if you can or cannot attend:\n${link(m)}`
    await navigator.clipboard.writeText(text)
    setMsg('Text message copied and ready to paste into your group text.')
  }

  if(!guard.ready||!guard.admin)return <AdminDenied {...guard}/>
  return <AdminFrame title="League Meeting RSVP" description="Create a meeting, send one RSVP link to the league, and see who is coming.">
    <form className="card rsvp-admin-form-v1392" onSubmit={create}>
      <h2>Create Meeting</h2>
      <label>Meeting Name<input value={title} onChange={e=>setTitle(e.target.value)} required/></label>
      <div className="rsvp-admin-row-v1392">
        <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
        <label>Time<input type="time" value={time} onChange={e=>setTime(e.target.value)} required/></label>
      </div>
      <label>Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Optional"/></label>
      <label>Message<textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Optional note for players" rows={3}/></label>
      <button disabled={busy}>{busy?'Creating…':'Create RSVP Meeting'}</button>
    </form>
    {msg&&<div className="card"><strong>{msg}</strong></div>}
    <div className="rsvp-admin-list-v1392">{meetings.map(m=>{
      const people=m.league_meeting_invitees||[]
      const coming=people.filter((p:any)=>p.response_status==='coming'||(!p.response_status&&p.is_coming))
      const declined=people.filter((p:any)=>p.response_status==='declined')
      const noResponse=people.length-coming.length-declined.length
      const groups=new Map<string,any[]>()
      people.forEach((p:any)=>groups.set(p.team_name,[...(groups.get(p.team_name)||[]),p]))
      const isEditing=editing?.id===m.id
      return <section className="card rsvp-admin-meeting-v1392" key={m.id}>
        <div className="rsvp-admin-heading-v1392"><div><h2>{m.title}</h2><p>{new Date(m.meeting_at).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}{m.location?` • ${m.location}`:''}</p></div><div className="rsvp-count-v1392"><strong>{coming.length}</strong><span>Coming</span><small>{declined.length} Can't Come • {noResponse} No Response</small></div></div>
        <div className="rsvp-admin-actions-v1392">
          <button onClick={()=>copyText(m)}>Copy Text Message</button>
          <button className="secondary" onClick={()=>copyLink(m)}>Copy RSVP Link</button>
          <button className="secondary" onClick={()=>window.open(link(m),'_blank','noopener,noreferrer')}>View RSVP Page</button>
          <button className="secondary" onClick={()=>beginEdit(m)}>{isEditing?'Editing…':'Edit Meeting'}</button>
          <button className="secondary" onClick={()=>toggle(m)}>{m.is_open?'Close RSVPs':'Reopen RSVPs'}</button>
        </div>
        {isEditing&&editing&&<form className="card rsvp-admin-form-v1392" onSubmit={saveEdit} style={{marginTop:14}}>
          <h3>Edit Meeting</h3>
          <label>Meeting Name<input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} required/></label>
          <div className="rsvp-admin-row-v1392">
            <label>Date<input type="date" value={editing.date} onChange={e=>setEditing({...editing,date:e.target.value})} required/></label>
            <label>Time<input type="time" value={editing.time} onChange={e=>setEditing({...editing,time:e.target.value})} required/></label>
          </div>
          <label>Location<input value={editing.location} onChange={e=>setEditing({...editing,location:e.target.value})} placeholder="Optional"/></label>
          <label>Message<textarea value={editing.message} onChange={e=>setEditing({...editing,message:e.target.value})} placeholder="Optional note for players" rows={3}/></label>
          <div className="rsvp-admin-actions-v1392">
            <button disabled={editBusy}>{editBusy?'Saving…':'Save Changes'}</button>
            <button type="button" className="secondary" onClick={()=>setEditing(null)} disabled={editBusy}>Cancel</button>
          </div>
          <small>Saving changes keeps this meeting's existing RSVP link and all player responses.</small>
        </form>}
        <details><summary>View Responses by Team</summary>{[...groups.entries()].map(([team,members])=><div className="rsvp-admin-team-v1392" key={team}><h3>{team}</h3>{members.map((p:any)=><div key={p.id}><span>{p.player_name}</span><b className={p.is_coming?'yes':''}>{p.response_status==='declined'?"✕ Can't Come":(p.response_status==='coming'||(!p.response_status&&p.is_coming))?'✓ Coming':'No Response'}</b></div>)}</div>)}</details>
      </section>
    })}</div>
  </AdminFrame>
}
