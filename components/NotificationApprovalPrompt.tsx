'use client'
import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'
import {supabase} from '@/lib/supabase'

const VAPID_PUBLIC_KEY='BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM'
function keyBytes(s:string){const pad='='.repeat((4-s.length%4)%4),b64=(s+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}

export default function NotificationApprovalPrompt(){
 const path=usePathname();const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('')
 useEffect(()=>{(async()=>{
  if(path==='/login'||!('serviceWorker'in navigator)||!('PushManager'in window))return
  const {data:{user}}=await supabase.auth.getUser();if(!user)return
  const {data:p}=await supabase.from('profiles').select('status').eq('id',user.id).maybeSingle();if(p?.status!=='approved')return
  if(Notification.permission==='denied')return
  const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready
  const sub=await reg.pushManager.getSubscription()
  if(sub&&Notification.permission==='granted')return
  const dismissed=sessionStorage.getItem('notification-prompt-dismissed')==='1'
  if(!dismissed)setShow(true)
 })().catch(()=>{})},[path])
 async function enable(){setBusy(true);setMsg('');try{
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Notifications were not allowed. You can enable them later in Settings.')
  const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready
  let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(VAPID_PUBLIC_KEY)})
  const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error('Please sign in again.')
  const j=sub.toJSON();const r=await fetch('/api/push/register',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({endpoint:sub.endpoint,p256dh:j.keys?.p256dh,auth:j.keys?.auth})});const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||'Unable to register notifications.')
  setShow(false)
 }catch(e:any){setMsg(e?.message||'Unable to enable notifications.')}finally{setBusy(false)}}
 if(!show)return null
 return <div className="modal-backdrop"><div className="card modal-card"><h2>Enable Notifications</h2><p>Turn on notifications so you receive simulator reservation updates, reminders, and league alerts.</p>{msg&&<p className="message">{msg}</p>}<div className="actions"><button className="btn" disabled={busy} onClick={enable}>{busy?'Enabling…':'Enable Notifications'}</button><button className="btn secondary" disabled={busy} onClick={()=>{sessionStorage.setItem('notification-prompt-dismissed','1');setShow(false)}}>Not Now</button></div></div></div>
}
