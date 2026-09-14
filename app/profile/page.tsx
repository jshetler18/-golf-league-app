'use client'

import {useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {PlayerPage} from '@/components/PlayerMobileChrome'

type ProfileRow={full_name:string;avatar_url:string|null;role:string;email:string|null}

export default function Profile(){
  const [name,setName]=useState('')
  const [avatar,setAvatar]=useState<string|null>(null)
  const [role,setRole]=useState('player')
  const [email,setEmail]=useState('')
  const [newPassword,setNewPassword]=useState('')
  const [confirmPassword,setConfirmPassword]=useState('')
  const [msg,setMsg]=useState('')
  const [credentialMsg,setCredentialMsg]=useState('')
  const [savingCredentials,setSavingCredentials]=useState(false)

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const {data}=await supabase.from('profiles').select('full_name,avatar_url,role,email').eq('id',user.id).single()
    const p=data as ProfileRow|null
    setName(p?.full_name||'')
    setAvatar(p?.avatar_url||null)
    setRole(p?.role||'player')
    setEmail(user.email||p?.email||'')
  })()},[])

  async function upload(e:any){
    const f=e.target.files?.[0]
    if(!f)return
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const ext=f.name.split('.').pop()
    const path=`${user.id}/profile.${ext}`
    const {error}=await supabase.storage.from('avatars').upload(path,f,{upsert:true})
    if(error){setMsg(error.message);return}
    const {data}=supabase.storage.from('avatars').getPublicUrl(path)
    setAvatar(data.publicUrl+'?v='+Date.now())
  }

  async function save(){
    const {error}=await supabase.rpc('update_my_profile',{p_full_name:name,p_avatar_url:avatar})
    setMsg(error?error.message:'Profile saved.')
  }

  async function saveAdminCredentials(){
    setCredentialMsg('')
    if(!email.trim()){setCredentialMsg('Enter the username / email you want to use.');return}
    if(newPassword&&newPassword.length<6){setCredentialMsg('Password must be at least 6 characters.');return}
    if(newPassword!==confirmPassword){setCredentialMsg('The new passwords do not match.');return}
    setSavingCredentials(true)
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.access_token){setCredentialMsg('Your session has expired. Please sign in again.');return}
      const res=await fetch('/api/admin/my-profile',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({email:email.trim(),password:newPassword||undefined})})
      const body=await res.json().catch(()=>({}))
      if(!res.ok){setCredentialMsg(body?.error||'Unable to update administrator login.');return}
      setNewPassword('')
      setConfirmPassword('')
      setCredentialMsg('Administrator login updated.')
    }finally{setSavingCredentials(false)}
  }

  const content=<div className="simple-mobile-page"><h1>My Profile</h1><div className="profile-editor"><div className="avatar-preview">{avatar?<img src={avatar} alt="Profile"/>:<span>👤</span>}</div><label className="btn secondary">Choose Profile Photo<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={upload}/></label><label>Display Name<input value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn" onClick={save}>Save Profile</button>{msg&&<p>{msg}</p>}</div>{role==='admin'&&<section className="card admin-profile-login-v13127"><div className="section-title"><div><h2>Administrator Login</h2><p className="muted">Change the username used to sign in and set a new password.</p></div></div><div className="form-grid single"><label className="field">Username / Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">New Password<input type="password" minLength={6} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Leave blank to keep current password"/></label><label className="field">Confirm New Password<input type="password" minLength={6} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter new password"/></label><button className="btn" type="button" disabled={savingCredentials} onClick={saveAdminCredentials}>{savingCredentials?'Saving…':'Update Admin Login'}</button>{credentialMsg&&<p className="message">{credentialMsg}</p>}</div></section>}</div>

  return <PlayerPage title="My Profile">{content}</PlayerPage>
}
