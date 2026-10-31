'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import {supabase} from '@/lib/supabase'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {RichTextDisplay} from '@/components/RichTextEditor'

function sentTimestamp(iso:string){
  const date=new Date(iso)
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(date)
  const part=(type:string)=>parts.find(p=>p.type===type)?.value||''
  const day=Number(part('day'))
  const suffix=day%100>=11&&day%100<=13?'th':day%10===1?'st':day%10===2?'nd':day%10===3?'rd':'th'
  return `Sent: ${part('weekday')}, ${part('month')} ${day}${suffix}, ${part('year')} at ${part('hour')}:${part('minute')}${part('dayPeriod').toLowerCase()}`
}

export default function Messages(){
  const router=useRouter()
  const [rows,setRows]=useState<any[]>([])
  const [read,setRead]=useState<Set<string>>(new Set())
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [firstOpenIds,setFirstOpenIds]=useState<Set<string>>(new Set())
  const initializedReads=useRef(false)

  const load=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setRows([]);setRead(new Set());return}

    const now=new Date().toISOString()
    const [{data:a,error:aError},{data:r,error:rError}]=await Promise.all([
      supabase.from('announcements').select('*').or(`expires_at.is.null,expires_at.gt.${now}`).order('is_pinned',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('announcement_reads').select('announcement_id').eq('user_id',user.id)
    ])

    if(!aError)setRows(a||[])
    if(!rError){
      const readIds=new Set((r||[]).map(x=>x.announcement_id))
      if(!initializedReads.current&&!aError){
        setFirstOpenIds(new Set((a||[]).filter(m=>!readIds.has(m.id)).map(m=>m.id)))
        initializedReads.current=true
      }
      setRead(readIds)
    }
  },[])

  async function markAllVisibleRead(){
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const now=new Date().toISOString()
    const {data:visible}=await supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${now}`)
    const ids=(visible||[]).map(x=>x.id)
    if(!ids.length){window.dispatchEvent(new Event('league-unread-changed'));return}
    const {error}=await supabase.from('announcement_reads').upsert(ids.map(id=>({announcement_id:id,user_id:user.id})),{onConflict:'announcement_id,user_id'})
    if(!error){
      setRead(new Set(ids))
      window.dispatchEvent(new Event('league-unread-changed'))
    }
  }

  useEffect(()=>{
    const requested=new URLSearchParams(window.location.search).get('message')
    if(requested)setSelectedId(requested)
    load()
    markAllVisibleRead()

    const onFocus=()=>load()
    const onVisible=()=>{if(document.visibilityState==='visible')load()}
    const interval=window.setInterval(load,15000)

    window.addEventListener('focus',onFocus)
    document.addEventListener('visibilitychange',onVisible)

    const channel=supabase.channel('player-messages-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'announcements'},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'announcement_reads'},()=>load())
      .subscribe()

    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>load())

    return()=>{
      window.clearInterval(interval)
      window.removeEventListener('focus',onFocus)
      document.removeEventListener('visibilitychange',onVisible)
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  },[load])

  useEffect(()=>{
    if(!selectedId || !rows.some(m=>m.id===selectedId) || read.has(selectedId))return
    mark(selectedId)
  },[selectedId,rows,read])

  function showMessage(id:string){
    const next=selectedId===id?null:id
    if(selectedId&&selectedId!==id)setFirstOpenIds(prev=>{const copy=new Set(prev);copy.delete(selectedId);return copy})
    if(!next)setFirstOpenIds(prev=>{const copy=new Set(prev);copy.delete(id);return copy})
    setSelectedId(next)
    router.replace(next?`/messages?message=${encodeURIComponent(next)}`:'/messages',{scroll:false})
    if(next)mark(next)
  }

  async function mark(id:string){
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const {error}=await supabase.from('announcement_reads').upsert({announcement_id:id,user_id:user.id},{onConflict:'announcement_id,user_id'})
    if(error)return
    setRead(prev=>new Set([...prev,id]))
    window.dispatchEvent(new Event('league-unread-changed'))
  }

  return <PlayerPage title="Messages"><div className="simple-mobile-page">
    <h1 style={{display:"block",fontWeight:800}}>Messages</h1>
    <div className="message-list" style={{display:'flex',flexDirection:'column',gap:10}}>
      {rows.length?rows.map(m=>{
        const expanded=selectedId===m.id
        const unread=!read.has(m.id)
        const firstOpen=firstOpenIds.has(m.id)
        return <div key={m.id} className={'message-card '+(unread?'unread':'')+(expanded?' message-card-expanded':'')} style={{display:'block',width:'100%',textAlign:'left',padding:0,overflow:'hidden',border:expanded?`4px solid ${firstOpen?'#248b0c':'#626a70'}`:undefined,boxShadow:expanded?`0 0 0 2px ${firstOpen?'rgba(36,139,12,.15)':'rgba(98,106,112,.14)'}`:undefined}}>
          <button type="button" onClick={()=>showMessage(m.id)} aria-expanded={expanded} aria-controls={`message-body-${m.id}`} style={{display:'flex',alignItems:'center',gap:12,width:'100%',textAlign:'left',padding:'16px',background:'transparent',border:0,color:'inherit',cursor:'pointer'}}>
            {unread&&<span aria-label="Unread" title="Unread" style={{width:10,height:10,minWidth:10,borderRadius:'50%',background:'#e53935'}}/>}
            <span style={{flex:1,minWidth:0}}>
              <strong style={{display:'block',fontSize:'1.12rem',fontWeight:750,lineHeight:1.3}}>{m.title}</strong>
              {(m.audience==='team'||m.audience==='captains')&&<span className="message-audience-pill">{m.audience==='captains'?'Team Captains':'Team Message'}</span>}
              <small style={{display:'block',marginTop:6,fontSize:'.78rem',opacity:.75}}>{sentTimestamp(m.created_at)}</small>
              <small style={{display:'block',marginTop:3,fontSize:'.78rem',opacity:.75}}>From: Joe Shetler</small>
            </span>
            <span aria-hidden="true" style={{fontSize:20,transform:expanded?'rotate(180deg)':'none',transition:'transform .15s'}}>⌄</span>
          </button>
          {expanded&&<div id={`message-body-${m.id}`} style={{padding:'0 16px 18px',borderTop:'1px solid rgba(128,128,128,.2)'}}>
            <div style={{paddingTop:14}}><RichTextDisplay value={m.body}/></div>
          </div>}
        </div>
      }):<div className="card">No messages yet.</div>}
    </div>
  </div></PlayerPage>
}
