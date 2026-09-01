'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Profile = { full_name:string; email:string|null; status:string; role:string; booking_enabled:boolean }
type Mode = 'signin'|'signup'|'admin'

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
  }
  useEffect(()=>{refresh()},[])

  async function submit(e:FormEvent){
    e.preventDefault(); setLoading(true); setMessage('')
    if(mode==='signup'){
      const { error } = await supabase.auth.signUp({email,password,options:{data:{full_name:name}}})
      setMessage(error ? error.message : 'Account created successfully. Your account is waiting for administrator approval. You’ll be able to book the simulator once approved.')
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
        setMessage('Signed in successfully.')
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
          <div className="auth-app-actions-v1230"><Link className="btn" href={profile?.role==='admin'?'/admin':'/'}>{profile?.role==='admin'?'Go to Admin':'Go to Home'}</Link><button className="btn secondary" onClick={signOut}>Log Out</button></div>
        </div>
      </>:<>
        <div className="auth-app-heading-v1230"><h1>{mode==='signin'?'Welcome Back':mode==='admin'?'Admin Login':'Create Your Account'}</h1><p>{mode==='signin'?'Sign in to the 19th Hole Golf League app.':mode==='admin'?'Sign in with an approved administrator account.':'Request access to the 19th Hole Golf League app.'}</p></div>
        <div className="card auth-card auth-app-card-v1230">
          <div className="segmented"><button className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setMessage('')}}>Sign In</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setMessage('')}}>Create Account</button></div>
          {mode!=='admin'&&<button type="button" className="btn secondary admin-login-choice-v1231" onClick={()=>{setMode('admin');setMessage('')}}>Admin Login</button>}
          {mode==='admin'&&<button type="button" className="auth-back-player-v1231" onClick={()=>{setMode('signin');setMessage('')}}>← Back to Player Sign In</button>}
          <form onSubmit={submit} className="form-grid single">
            {mode==='signup' && <label className="field">Full name<input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} /></label>}
            <label className="field">Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
            <label className="field">Password<input type="password" required minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} /></label>
            <button className="btn auth-primary-v1230" disabled={loading}>{loading?'Please wait…':mode==='signup'?'Request Account':mode==='admin'?'Enter Admin':'Sign In'}</button>
          </form>
        </div>
      </>}
      {message&&<p className="message auth-message-v1230">{message}</p>}
    </main>
  </div>
}
