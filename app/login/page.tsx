'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Profile = { full_name:string; email:string|null; status:string; role:string; booking_enabled:boolean }
type Mode = 'signin'|'signup'|'admin'
const VAPID_PUBLIC_KEY='BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM'
function keyBytes(s:string){const pad='='.repeat((4-s.length%4)%4),b64=(s+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}

export default function LoginPage(){
  const [userEmail,setUserEmail]=useState('')
  const [profile,setProfile]=useState<Profile|null>(null)
  const [mode,setMode]=useState<Mode>('signin')
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(false)

  async function refresh(){
    const { data } = await supabase.auth.getUser()
    if(!data.user){ setUserEmail(''); setProfile(null); return }
    setUserEmail(data.user.email || '')
    const { data:p } = await supabase.from('profiles').select('full_name,email,status,role,booking_enabled').eq('id',data.user.id).maybeSingle()
    setProfile(p as Profile|null)
    if(p?.status==='approved'){
      window.location.replace(p?.role==='admin'?'/admin':'/')
      return
    }
  }
  useEffect(()=>{refresh()},[])

  async function prepareDefaultNotifications(){
    try{
      if(!('serviceWorker'in navigator)||!('PushManager'in window))return null
      const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true
      const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)
      if(isiOS&&!standalone)return null
      let permission=Notification.permission
      if(permission==='default')permission=await Notification.requestPermission()
      if(permission!=='granted')return null
      const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready
      let sub=await reg.pushManager.getSubscription()
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(VAPID_PUBLIC_KEY)})
      return sub
    }catch{return null}
  }

  async function saveDefaultNotificationSubscription(userId:string,sub:PushSubscription|null){
    if(!sub)return
    try{
      const j=sub.toJSON()
      await supabase.from('push_subscriptions').upsert({user_id:userId,endpoint:sub.endpoint,p256dh:j.keys?.p256dh||null,auth:j.keys?.auth||null,updated_at:new Date().toISOString()},{onConflict:'endpoint'})
    }catch{}
  }

  async function submit(e:FormEvent){
    e.preventDefault(); setLoading(true); setMessage('')
    if(mode==='signup'){
      const cleanName=name.trim()
      const cleanEmail=email.trim().toLowerCase()
      // Notifications are on by default for new accounts when the device/browser allows them.
      // Asking here keeps the browser permission prompt tied to the user's Request Account tap.
      const defaultPushSubscription=await prepareDefaultNotifications()
      const { data:signUpData, error } = await supabase.auth.signUp({email:cleanEmail,password,options:{data:{full_name:cleanName}}})
      if(error){
        setMessage(`Account request was not completed: ${error.message}`)
      }else if(!signUpData.user){
        setMessage('Account request was not completed. No account was created. Please try again, and if this continues contact the league administrator.')
      }else if(Array.isArray(signUpData.user.identities) && signUpData.user.identities.length===0){
        setMessage('Account request was not completed. This email may already be registered. Try signing in, use a different email address, or contact the league administrator.')
      }else{
        // A real auth user was created. The database creates the matching pending profile
        // in the same signup transaction, so only now do we tell the player they are pending.
        setEmail(cleanEmail)
        setPassword('')
        await saveDefaultNotificationSubscription(signUpData.user.id,defaultPushSubscription)
        setMessage('Account request submitted successfully. Your account is now waiting for administrator approval. You’ll be able to access the app once approved.')
        try{await fetch('/api/push/account-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:signUpData.user.id})})}catch{}
        if(signUpData.session){
          await refresh()
        }
      }
    }else{
      const { data, error } = await supabase.auth.signInWithPassword({email,password})
      if(error){
        setMessage(error.message)
      }else if(mode==='admin'){
        const { data:p } = await supabase.from('profiles').select('role,status').eq('id',data.user.id).maybeSingle()
        if(p?.role==='admin' && p?.status==='approved'){
          window.location.href='/admin'
          return
        }
        await supabase.auth.signOut()
        setMessage('This account does not have approved administrator access.')
      }else{
        const { data:p } = await supabase.from('profiles').select('role,status').eq('id',data.user.id).maybeSingle()
        if(p?.role==='admin' && p?.status==='approved'){
          window.location.replace('/admin')
          return
        }
        if(p?.status==='approved'){
          window.location.replace('/')
          return
        }
        await refresh()
      }
    }
    setLoading(false)
  }

  async function signOut(){ await supabase.auth.signOut(); setProfile(null); setUserEmail(''); setMessage('You have been signed out.') }



  return <div className="auth-app-shell-v1230">
    <div className="auth-app-brand-v1230"><img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League" /></div>
    <main className="auth-app-content-v1230">
      {userEmail?<>
        <div className="auth-app-heading-v1230"><h1>{profile?.full_name || 'Your Account'}</h1><p>Simulator and league member access</p></div>
        <div className="card auth-card auth-app-card-v1230">
          <div className="auth-account-status-v1230"><span className={`status ${profile?.status || 'pending'}`}>{profile?.status || 'Pending'}</span><h2>Signed In</h2><p>{userEmail}</p><p className="muted">Booking access: <strong>{profile?.booking_enabled ? 'Enabled' : 'Not enabled yet'}</strong></p>{profile?.status==='pending'&&<p>Your account is waiting for administrator approval.</p>}</div>
          <div className="auth-app-actions-v1230">{profile?.status==='approved'&&<Link className="btn" href={profile?.role==='admin'?'/admin':'/'}>{profile?.role==='admin'?'Go to Admin':'Go to Home'}</Link>}<button className="btn secondary" onClick={signOut}>Log Out</button></div>
        </div>
      </>:<>
        <div className="auth-app-heading-v1230"><h1>{mode==='signin'?'Welcome Back':mode==='admin'?'Admin Login':'Create Your Account'}</h1><p>{mode==='signin'?'Sign in to the 19th Hole Golf League app.':mode==='admin'?'Sign in with an approved administrator account.':'Request access to the 19th Hole Golf League app.'}</p></div>
        <div className="card auth-card auth-app-card-v1230">
          <div className="segmented"><button className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setMessage('')}}>Sign In</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setMessage('')}}>Create Account</button></div>
          {mode==='admin'&&<button type="button" className="auth-back-player-v1231" onClick={()=>{setMode('signin');setMessage('')}}>← Back to Player Sign In</button>}
          <form onSubmit={submit} className="form-grid single">
            {mode==='signup' && <label className="field">Full name<input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} /></label>}
            <label className="field">Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
            <label className="field">Password<input type="password" required minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} /></label>
            <button className="btn auth-primary-v1230" disabled={loading}>{loading?'Please wait…':mode==='signup'?'Request Account':mode==='admin'?'Enter Admin':'Sign In'}</button>
          </form>
          {mode==='signin'&&<button type="button" className="btn secondary admin-login-choice-v1231" onClick={()=>{setMode('admin');setMessage('')}}>Admin Login</button>}
        </div>
      </>}
      {message&&<p className="message auth-message-v1230">{message}</p>}
    </main>
  </div>
}
