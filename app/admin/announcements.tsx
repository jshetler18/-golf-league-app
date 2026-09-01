'use client'

import {FormEvent, useEffect, useState} from 'react'
import {supabase} from '@/lib/supabase'

type Announcement={
  id:string
  title:string
  body:string
  is_pinned:boolean
  expires_at:string|null
  created_at:string
}

export default function AdminAnnouncements(){
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [pinned,setPinned]=useState(false)
  const [sendPush,setSendPush]=useState(true)
  const [expires,setExpires]=useState('')
  const [rows,setRows]=useState<Announcement[]>([])
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)

  async function load(){
    const {data,error}=await supabase
      .from('announcements')
      .select('id,title,body,is_pinned,expires_at,created_at')
      .order('is_pinned',{ascending:false})
      .order('created_at',{ascending:false})
      .limit(20)
    if(error){setMessage(error.message);return}
    setRows((data||[]) as Announcement[])
  }

  useEffect(()=>{load()},[])

  async function publish(e:FormEvent){
    e.preventDefault()
    const cleanTitle=title.trim()
    const cleanBody=body.trim()
    if(!cleanTitle||!cleanBody){setMessage('Please enter both a title and a message.');return}
    setSaving(true);setMessage('')
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setMessage('Please sign in again.');setSaving(false);return}
    const expiresAt=expires?new Date(`${expires}T23:59:59`).toISOString():null
    const {data:created,error}=await supabase.from('announcements').insert({
      title:cleanTitle,
      body:cleanBody,
      audience:'everyone',
      team_id:null,
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
          try{const r=await fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({announcementId:created.id,title:cleanTitle,body:cleanBody})});const j=await r.json();pushNote=r.ok?` Phone alert sent to ${j.sent||0} registered device${j.sent===1?'':'s'}.`:` Phone alert was not sent: ${j.error||'push service error'}.`}catch{pushNote=' Announcement posted, but the phone alert could not be sent.'}
        }
      }
      setMessage('Announcement published. Players will see it in Messages.'+pushNote)
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
    <div className="section-title"><div><h2>Messages & Announcements</h2><p className="muted">Publish league messages that appear in each player’s Messages page and unread badge.</p></div></div>
    {message&&<p className="message">{message}</p>}
    <div className="admin-announcement-grid">
      <div className="card">
        <h3>Post Announcement</h3>
        <form onSubmit={publish} className="form-grid single">
          <label className="field">Title<input maxLength={120} required placeholder="Example: Simulator Closed Thursday" value={title} onChange={e=>setTitle(e.target.value)}/></label>
          <label className="field">Message<textarea required rows={5} placeholder="Enter the message players should see…" value={body} onChange={e=>setBody(e.target.value)}/></label>
          <label className="field">Expiration Date <span className="muted">(optional)</span><input type="date" value={expires} onChange={e=>setExpires(e.target.value)}/></label>
          <label className="admin-check"><input type="checkbox" checked={sendPush} onChange={e=>setSendPush(e.target.checked)}/><span><strong>Send phone notification</strong><small>Alerts players who have enabled notifications on their device.</small></span></label>
          <label className="admin-check"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/><span><strong>Pin this message</strong><small>Pinned messages stay at the top of the player Messages page.</small></span></label>
          <button className="btn" disabled={saving}>{saving?'Publishing…':'Publish Announcement'}</button>
        </form>
      </div>
      <div className="card">
        <h3>Recent Announcements</h3>
        <div className="admin-announcement-list">
          {rows.length===0?<p className="muted">No announcements have been posted yet.</p>:rows.map(a=>{
            const expired=!!a.expires_at&&new Date(a.expires_at).getTime()<now
            return <div className="admin-announcement-item" key={a.id}>
              <div className="admin-announcement-copy">
                <div className="admin-announcement-title"><strong>{a.title}</strong>{a.is_pinned&&<span className="admin-announcement-pill">Pinned</span>}{expired&&<span className="admin-announcement-pill expired">Expired</span>}</div>
                <p>{a.body}</p>
                <small>Posted {new Date(a.created_at).toLocaleDateString()}{a.expires_at?` · Expires ${new Date(a.expires_at).toLocaleDateString()}`:''}</small>
              </div>
              <button className="btn danger small" onClick={()=>remove(a.id,a.title)}>Delete</button>
            </div>
          })}
        </div>
      </div>
    </div>
  </section>
}
