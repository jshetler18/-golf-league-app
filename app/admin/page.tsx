'use client'
import {useEffect,useState} from 'react'
import {useAdminGuard} from './admin-shared'

export default function AdminPage(){
  const guard=useAdminGuard()
  const [waiting,setWaiting]=useState(false)
  useEffect(()=>{if(guard.ready)return;const timer=window.setTimeout(()=>setWaiting(true),7000);return()=>window.clearTimeout(timer)},[guard.ready])
  if(!guard.ready)return <div className="card" role="status"><h2>Opening Golf Admin…</h2><p>Checking your administrator access.</p>{waiting&&<><p>This is taking longer than expected. You can retry without closing the app.</p><button className="btn" onClick={()=>window.location.reload()}>Retry Admin</button></>}</div>
  if(!guard.admin)return <div className="card"><h2>Admin access unavailable</h2><p>We could not verify approved administrator access. If you just signed in, try again.</p><button className="btn" onClick={()=>window.location.reload()}>Retry Admin</button></div>
  return <div className="admin-dashboard-landing-v13134" aria-label="League administration home" />
}
