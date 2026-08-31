'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Profile = { full_name:string; email:string|null; status:string; role:string; booking_enabled:boolean }

export default function LoginPage(){
  const [userEmail,setUserEmail]=useState('')
  const [profile,setProfile]=useState<Profile|null>(null)
  const [mode,setMode]=useState<'signin'|'signup'>('signin')
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
      setMessage(error ? error.message : 'Account request created. If email confirmation is enabled, check your email. An admin must approve your account before you can book the simulator.')
    }else{
      const { error } = await supabase.auth.signInWithPassword({email,password})
      setMessage(error ? error.message : 'Signed in successfully.')
      if(!error) await refresh()
    }
    setLoading(false)
  }

  async function signOut(){ await supabase.auth.signOut(); setProfile(null); setUserEmail(''); setMessage('Signed out.') }

  if(userEmail) return <>
    <section className="hero"><div className="eyebrow">Your Account</div><h1>{profile?.full_name || userEmail}</h1><p>Manage your simulator access and reservations.</p></section>
    <div className="grid">
      <div className="card"><h2>Account Status</h2><p><span className={`status ${profile?.status || 'pending'}`}>{profile?.status || 'Pending'}</span></p><p className="muted">Booking access: <strong>{profile?.booking_enabled ? 'Enabled' : 'Not enabled yet'}</strong></p>{profile?.status==='pending' && <p>Your account is waiting for admin approval.</p>}</div>
      <div className="card"><h2>Signed In</h2><p>{userEmail}</p><button className="btn secondary" onClick={signOut}>Sign Out</button></div>
    </div>
    {message && <p className="message">{message}</p>}
  </>

  return <>
    <section className="hero"><div className="eyebrow">Member Access</div><h1>{mode==='signin'?'Sign In':'Request an Account'}</h1><p>Approved users can reserve simulator time and manage their own bookings.</p></section>
    <div className="card auth-card">
      <div className="segmented"><button className={mode==='signin'?'active':''} onClick={()=>setMode('signin')}>Sign In</button><button className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>Create Account</button></div>
      <form onSubmit={submit} className="form-grid single">
        {mode==='signup' && <label className="field">Full name<input required value={name} onChange={e=>setName(e.target.value)} /></label>}
        <label className="field">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label className="field">Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <button className="btn" disabled={loading}>{loading?'Please wait…':mode==='signin'?'Sign In':'Request Account'}</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  </>
}
