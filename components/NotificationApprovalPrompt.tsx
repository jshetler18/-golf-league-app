'use client'
import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'
import {supabase} from '@/lib/supabase'

const VAPID_PUBLIC_KEY='BPZqymvEA841isoUA5oz4-PicInDnM34vMvhh5pGO7MhK6Hi6xRYzjG_1mYZYf8ebYtLzk3IH4oT5uNhgOGreYU'
function keyBytes(s:string){const pad='='.repeat((4-s.length%4)%4),b64=(s+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}

export default function NotificationApprovalPrompt(){
 const path=usePathname();const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('')
 useEffect(()=>{(async()=>{
  if(path==='/login'||path==='/admin'||path?.startsWith('/admin/')||path==='/tv'||path?.startsWith('/tv/')){setShow(false);return}
  // Safari tabs on iPad cannot receive web push; prompt only in installed Home Screen apps.
  const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true
  if(!standalone){setShow(false);return}
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){setMsg('This app session does not support web push. Please confirm this icon was installed from the Golf V2 test site using Safari > Add to Home Screen.');setShow(true);return}
  // During the first moments after login, the auth session can still be settling.
  // Do not display an alarming sign-in error from the optional notification prompt.
  const {data:{session}}=await supabase.auth.getSession();if(!session?.user)return
  const user=session.user
  const {data:p,error:profileError}=await supabase.from('profiles').select('status').eq('id',user.id).maybeSingle();if(profileError||!p){setMsg('Notification setup could not load your V2 account approval. Please report this message.');setShow(true);return}if(p.status!=='approved')return
  if(Notification.permission==='denied'){setMsg('Notifications are blocked in iPhone settings. Enable them for this Home Screen app, then reopen it.');setShow(true);return}
  const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready
  const sub=await reg.pushManager.getSubscription()
  if(sub&&Notification.permission==='granted'){
   // A Home Screen app may retain a browser subscription after migrating to V2,
   // while the isolated V2 database has no corresponding subscription row.
   // Always register the existing subscription against the signed-in V2 account.
   const {data:{session}}=await supabase.auth.getSession()
   if(session?.access_token){
    const j=sub.toJSON()
    const res=await fetch('/api/push/register',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({endpoint:sub.endpoint,p256dh:j.keys?.p256dh,auth:j.keys?.auth})})
    if(res.ok)return
   }
   setMsg('Notifications are allowed, but this device is not registered with Golf V2. Tap Enable Notifications to retry.')
   setShow(true)
   return
  }
  const dismissed=sessionStorage.getItem('notification-prompt-dismissed')==='1'
  if(!dismissed)setShow(true)
 })().catch((e)=>{setMsg('Notification setup encountered an error: '+(e?.message||'unknown error'));setShow(true)})},[path])
 async function enable(){setBusy(true);setMsg('');try{
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Notifications were not allowed. You can enable them later in Settings.')
  const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready
  let sub=await reg.pushManager.getSubscription()
  if(sub){const oldKey=sub.options?.applicationServerKey;const expected=keyBytes(VAPID_PUBLIC_KEY);if(oldKey&&Array.from(new Uint8Array(oldKey)).join(',')!==Array.from(expected).join(',')){await sub.unsubscribe();sub=null}}
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(VAPID_PUBLIC_KEY)})
  const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error('Please sign in again.')
  const j=sub.toJSON();const r=await fetch('/api/push/register',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({endpoint:sub.endpoint,p256dh:j.keys?.p256dh,auth:j.keys?.auth})});const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||'Unable to register notifications.')
  setShow(false)
 }catch(e:any){setMsg(e?.message||'Unable to enable notifications.')}finally{setBusy(false)}}
 if(!show)return null
 return <div role="presentation" style={{position:"fixed",inset:0,zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(0,0,0,.55)",overflowY:"auto"}}><div role="dialog" aria-modal="true" aria-label="Enable Notifications" className="card" style={{width:"100%",maxWidth:"440px",maxHeight:"calc(100dvh - 32px)",overflowY:"auto",margin:"auto",boxSizing:"border-box"}}><h2>Enable Notifications</h2><p>Turn on notifications so you receive simulator reservation updates, reminders, and league alerts.</p>{msg&&<p className="message">{msg}</p>}<div className="actions"><button className="btn" disabled={busy} onClick={enable}>{busy?'Enabling…':'Enable Notifications'}</button><button className="btn secondary" disabled={busy} onClick={()=>{sessionStorage.setItem('notification-prompt-dismissed','1');setShow(false)}}>Not Now</button></div></div></div>
}
