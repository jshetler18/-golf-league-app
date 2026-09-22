'use client'
import {useCallback,useEffect,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {supabase} from '@/lib/supabase'

type PendingAccount={id:string;full_name:string;email:string|null;status:string;created_at:string}

export default function AccountApprovalsPage(){
 const [allowed,setAllowed]=useState<boolean|null>(null)
 const [rows,setRows]=useState<PendingAccount[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState<string|null>(null)
 const [msg,setMsg]=useState('')

 const load=useCallback(async()=>{
  setLoading(true)
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setAllowed(false);setLoading(false);return}
  const {data:p}=await supabase.from('profiles').select('role,status,is_account_approver').eq('id',user.id).maybeSingle()
  const can=!!p&&p.status==='approved'&&(p.role==='admin'||p.is_account_approver===true)
  setAllowed(can)
  if(!can){setLoading(false);return}
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setLoading(false);return}
  const r=await fetch('/api/account-review',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'})
  const j=await r.json().catch(()=>({}))
  if(!r.ok){setMsg(j.error||'Unable to load pending accounts.');setLoading(false);return}
  setRows(j.rows||[])
  setLoading(false)
 },[])
 useEffect(()=>{load()},[load])

 async function approve(row:PendingAccount,accessType:'league'|'sim_only'){
  const label=accessType==='sim_only'?'Simulator Booking Only':'League Member'
  if(!window.confirm(`Approve ${row.full_name||row.email||'this player'} as ${label}?`))return
  setBusy(row.id);setMsg('Approving account…')
  try{
   const {data:{session}}=await supabase.auth.getSession()
   if(!session?.access_token){setMsg('Please sign in again.');return}
   const r=await fetch('/api/accounts/approve',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({profileId:row.id,accessType})})
   const j=await r.json().catch(()=>({}))
   if(!r.ok){setMsg(j.error||'Unable to approve account.');return}
   setRows(prev=>prev.filter(x=>x.id!==row.id))
   setMsg(j.detail||'Account approved.')
  }finally{setBusy(null)}
 }

 if(allowed===null||loading)return <PlayerPage title="Account Approvals"><div className="simple-mobile-page"><p>Loading account requests…</p></div></PlayerPage>
 if(!allowed)return <PlayerPage title="Account Approvals"><div className="simple-mobile-page"><div className="card"><h1>Account Approvals</h1><p>This area is available only to approved account approvers.</p></div></div></PlayerPage>
 return <PlayerPage title="Account Approvals"><div className="simple-mobile-page scorecard-official-page-v1298">
  {msg&&<p className="message">{msg}</p>}
  {rows.length===0?<div className="card scorecard-official-empty-v1298"><strong>All caught up!</strong><span>There are no new accounts waiting for approval.</span></div>:<div className="scorecard-official-list-v1298">{rows.map(r=><article className="card scorecard-official-card-v1298" key={r.id}>
   <div className="submission-head"><div><h2>{r.full_name||'New Player'}</h2><p>{r.email||'No email shown'}</p><small>Requested {new Date(r.created_at).toLocaleString()}</small></div><span className="submission-status pending">pending</span></div>
   <div className="scorecard-official-actions-v1298 account-approval-actions-v13159"><button className="btn" disabled={busy===r.id} onClick={()=>approve(r,'league')}>✓ Approve League Member</button><button className="btn secondary" disabled={busy===r.id} onClick={()=>approve(r,'sim_only')}>📅 Approve Booking Only</button></div>
  </article>)}</div>}
 </div></PlayerPage>
}
