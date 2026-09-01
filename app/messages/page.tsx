'use client'

import {useCallback,useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {PlayerPage} from '@/components/PlayerMobileChrome'

export default function Messages(){
  const [rows,setRows]=useState<any[]>([])
  const [read,setRead]=useState<Set<string>>(new Set())

  const load=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setRows([]);setRead(new Set());return}

    const now=new Date().toISOString()
    const [{data:a,error:aError},{data:r,error:rError}]=await Promise.all([
      supabase.from('announcements').select('*').or(`expires_at.is.null,expires_at.gt.${now}`).order('is_pinned',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('announcement_reads').select('announcement_id').eq('user_id',user.id)
    ])

    if(!aError)setRows(a||[])
    if(!rError)setRead(new Set((r||[]).map(x=>x.announcement_id)))
  },[])

  useEffect(()=>{
    load()

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

  async function mark(id:string){
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const {error}=await supabase.from('announcement_reads').upsert({announcement_id:id,user_id:user.id},{onConflict:'announcement_id,user_id'})
    if(error)return
    setRead(prev=>new Set([...prev,id]))
    window.dispatchEvent(new Event('league-unread-changed'))
  }

  return <PlayerPage title="Messages"><div className="simple-mobile-page"><h1>Messages</h1><p className="muted">League messages and announcements.</p><div className="message-list">{rows.length?rows.map(m=><button key={m.id} onClick={()=>mark(m.id)} className={'message-card '+(!read.has(m.id)?'unread':'')}><div><strong>{m.title}</strong>{!read.has(m.id)&&<span className="new-dot">New</span>}</div><p>{m.body}</p><small>{new Date(m.created_at).toLocaleDateString()}</small></button>):<div className="card">No messages yet.</div>}</div></div></PlayerPage>
}
