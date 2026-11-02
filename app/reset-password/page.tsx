'use client'
import {FormEvent,useEffect,useState} from 'react'
import Link from 'next/link'
import {supabase} from '@/lib/supabase'
export default function ResetPassword(){
 const [password,setPassword]=useState('')
 const [confirm,setConfirm]=useState('')
 const [ready,setReady]=useState(false)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [done,setDone]=useState(false)
 useEffect(()=>{
  let mounted=true
  const check=async()=>{const {data}=await supabase.auth.getSession();if(mounted)setReady(!!data.session)}
  check()
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')check()})
  return()=>{mounted=false;subscription.unsubscribe()}
 },[])
 async function save(e:FormEvent){
  e.preventDefault()
  if(password.length<8){setMessage('Use at least 8 characters.');return}
  if(password!==confirm){setMessage('Passwords do not match.');return}
  setBusy(true);setMessage('')
  const {error}=await supabase.auth.updateUser({password})
  setBusy(false)
  if(error){setMessage(error.message);return}
  setDone(true);setMessage('Your password has been updated successfully.')
 }
 return <div className="auth-app-shell-v1230"><div className="auth-app-brand-v1230"><img src="/logo-golf-league.png" alt="Tom Krise 19th Hole Golf League"/></div><main className="auth-app-content-v1230"><div className="auth-app-heading-v1230"><h1>Reset Password</h1><p>Tom Krise 19th Hole Golf League</p></div><div className="card auth-card auth-app-card-v1230">{done?<><p>{message}</p><Link className="btn" href="/">Go to Golf App</Link></>:ready?<form className="form-grid single" onSubmit={save}><label className="field">New Password<input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="field">Confirm New Password<input type="password" minLength={8} autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="btn" disabled={busy}>{busy?'Saving…':'Save New Password'}</button></form>:<p>Checking your reset link… If this page does not continue, your link may have expired. Return to Sign In and request a new link.</p>}{message&&!done&&<p role="alert" className="message">{message}</p>}<Link href="/login">Back to Sign In</Link></div></main></div>
}
