'use client'

import {FormEvent, useEffect, useState} from 'react'
import {supabase} from '@/lib/supabase'
import {RichTextDisplay,RichTextEditor,sanitizeRichText} from '@/components/RichTextEditor'

type Team={id:string;name:string}
type Announcement={
  id:string
  title:string
  body:string
  audience:'everyone'|'team'
  team_id:string|null
  is_pinned:boolean
  expires_at:string|null
  created_at:string
}
type Reader={user_id:string;read_at:string;name:string}

export default function AdminAnnouncements({teams}:{teams:Team[]}){
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [audience,setAudience]=useState<'everyone'|'team'>('everyone')
  const [teamId,setTeamId]=useState('')
  const [pinned,setPinned]=useState(false)
  const [sendPush,setSendPush]=useState(true)
  const [expires,setExpires]=useState('')
  const [rows,setRows]=useState<Announcement[]>([])
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)
  const [readers,setReaders]=useState<Record<string,Reader[]>>({})
  const [openReaders,setOpenReaders]=useState<string|null>(null)

  async function load(){
    const {data,error}=await supabase
      .from('announcements')
      .select('id,title,body,audience,team_id,is_pinned,expires_at,created_at')
      .order('is_pinned',{ascending:false})
      .order('created_at',{ascending:false})
      .limit(20)
    if(error){setMessage(error.message);return}
    const announcements=(data||[]) as Announcement[]
    setRows(announcements)
    const ids=announcements.map(a=>a.id)
    if(!ids.length){setReaders({});return}
    const {data:readRows,error:readError}=await supabase.from('announcement_reads').select('announcement_id,user_id,read_at').in('announcement_id',ids).order('read_at',{ascending:true})
    if(readError){setMessage(readError.message);return}
    const userIds=[...new Set((readRows||[]).map(r=>r.user_id))]
    let names:Record<string,string>={}
    if(userIds.length){
      const {data:profiles}=await supabase.from('profiles').select('id,full_name,email').in('id',userIds)
      names=Object.fromEntries((profiles||[]).map(p=>[p.id,p.full_name||p.email||'Player']))
    }
    const grouped:Record<string,Reader[]>={}
    for(const r of readRows||[]){(grouped[r.announcement_id]??=[]).push({user_id:r.user_id,read_at:r.read_at,name:names[r.user_id]||'Player'})}
    setReaders(grouped)
  }

  useEffect(()=>{load()},[])
  useEffect(()=>{if(!teamId&&teams[0])setTeamId(teams[0].id)},[teams,teamId])

  async function publish(e:FormEvent){
    e.preventDefault()
    const cleanTitle=title.trim()
    const cleanBody=sanitizeRichText(body).trim()
    if(!cleanTitle||!cleanBody){setMessage('Please enter both a title and a message.');return}
    if(audience==='team'&&!teamId){setMessage('Please choose a team.');return}
    setSaving(true);setMessage('')
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setMessage('Please sign in again.');setSaving(false);return}
    const expiresAt=expires?new Date(`${expires}T23:59:59`).toISOString():null
    const targetTeamId=audience==='team'?teamId:null
    const {data:created,error}=await supabase.from('announcements').insert({
      title:cleanTitle,
      body:cleanBody,
      audience,
      team_id:targetTeamId,
      is_pinned:pinned,
      send_push:sendPush,
      expires_at:expiresAt,
      created_by:user.id
    }).select('id').single()
    if(error){setMessage(error.message)}else{
      setTitle('');setBody('');setPinned(false);setExpires('')
      let pushNote=''
      if(sendPush&&created?.id){
        const {data:{session}}=await supabase.auth.getSession()
        if(session?.access_token){
          try{
            const r=await fetch('/api/push/send',{
              method:'POST',
              headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
              body:JSON.stringify({announcementId:created.id})
            })
            const j=await r.json()
            pushNote=r.ok?` Phone alert sent to ${j.sent||0} registered device${j.sent===1?'':'s'}.`:` Phone alert was not sent: ${j.error||'push service error'}.`
          }catch{pushNote=' Announcement posted, but the phone alert could not be sent.'}
        }
      }
      const target=audience==='team'?(teams.find(t=>t.id===targetTeamId)?.name||'selected team'):'all players'
      setMessage(`Announcement published to ${target}.`+pushNote)
      await load()
    }
    setSaving(false)
  }

  async function remove(id:string,title:string){
    if(!window.confirm(`Delete “${title}”? This will remove it from player Messages.`))return
    const {error}=await supabase.from('announcements').delete().eq('id',id)
    setMessage(error?error.message:'Announcement deleted.')
    if(!error)load()
  }

  const now=Date.now()
  return <section className="admin-announcements-section">
    <div className="section-title"><div><h2>Messages & Announcements</h2><p className="muted">Send a message to everyone or only to one league team. Team messages are visible only to accounts linked to that team.</p></div></div>
    {message&&<p className="message">{message}</p>}
    <div className="admin-announcement-grid">
      <div className="card">
        <h3>Post Announcement</h3>
        <form onSubmit={publish} className="form-grid single">
          <label className="field">Send To<select value={audience==='everyone'?'everyone':teamId} onChange={e=>{const v=e.target.value;if(v==='everyone')setAudience('everyone');else{setAudience('team');setTeamId(v)}}}><option value="everyone">Everyone</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="field">Title<input maxLength={120} required placeholder="Example: Simulator Closed Thursday" value={title} onChange={e=>setTitle(e.target.value)}/></label>
          <label className="field">Message<RichTextEditor value={body} onChange={setBody} placeholder="Enter the message players should see…"/></label>
          <label className="field">Expiration Date <span className="muted">(optional)</span><input type="date" value={expires} onChange={e=>setExpires(e.target.value)}/></label>
          <label className="admin-check"><input type="checkbox" checked={sendPush} onChange={e=>setSendPush(e.target.checked)}/><span><strong>Send phone notification</strong><small>{audience==='team'?'Alerts only registered devices for players linked to the selected team.':'Alerts players who have enabled notifications on their device.'}</small></span></label>
          <label className="admin-check"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/><span><strong>Pin this message</strong><small>Pinned messages stay at the top of the player Messages page.</small></span></label>
          <button className="btn" disabled={saving}>{saving?'Publishing…':'Publish Announcement'}</button>
        </form>
      </div>
      <div className="card">
        <h3>Recent Announcements</h3>
        <div className="admin-announcement-list">
          {rows.length===0?<p className="muted">No announcements have been posted yet.</p>:rows.map(a=>{
            const expired=!!a.expires_at&&new Date(a.expires_at).getTime()<now
            const teamName=a.team_id?teams.find(t=>t.id===a.team_id)?.name:null
            return <div className="admin-announcement-item" key={a.id}>
              <div className="admin-announcement-copy">
                <div className="admin-announcement-title"><strong>{a.title}</strong><span className="admin-announcement-pill audience">{a.audience==='team'?(teamName||'Team'):'Everyone'}</span>{a.is_pinned&&<span className="admin-announcement-pill">Pinned</span>}{expired&&<span className="admin-announcement-pill expired">Expired</span>}</div>
                <RichTextDisplay value={a.body} className="admin-announcement-body-v1237"/>
                <small>Posted {new Date(a.created_at).toLocaleDateString()}{a.expires_at?` · Expires ${new Date(a.expires_at).toLocaleDateString()}`:''}</small>
                <div className="announcement-read-tools-v1237">
                  <button type="button" className="announcement-read-button-v1237" onClick={()=>setOpenReaders(openReaders===a.id?null:a.id)}>{(readers[a.id]||[]).length} {(readers[a.id]||[]).length===1?'view':'views'} · Viewed By</button>
                  {openReaders===a.id&&<div className="announcement-read-list-v1237">{(readers[a.id]||[]).length===0?<span>No one has opened this message yet.</span>:(readers[a.id]||[]).map(r=><div key={r.user_id}><strong>{r.name}</strong><small>{new Date(r.read_at).toLocaleString()}</small></div>)}</div>}
                </div>
              </div>
              <button className="btn danger small" onClick={()=>remove(a.id,a.title)}>Delete</button>
            </div>
          })}
        </div>
      </div>
    </div>
  </section>
}
