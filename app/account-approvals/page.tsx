'use client'
import {useCallback,useEffect,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {supabase} from '@/lib/supabase'

type PendingAccount={id:string;full_name:string;email:string|null;status:string;created_at:string}
type Team={id:string;name:string}
type Player={id:string;team_id:string|null;full_name:string}

export default function AccountApprovalsPage(){
 const [allowed,setAllowed]=useState<boolean|null>(null)
 const [rows,setRows]=useState<PendingAccount[]>([])
 const [teams,setTeams]=useState<Team[]>([])
 const [players,setPlayers]=useState<Player[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState<string|null>(null)
 const [msg,setMsg]=useState('')
 const [approveRow,setApproveRow]=useState<PendingAccount|null>(null)
 const [teamId,setTeamId]=useState('')
 const [playerId,setPlayerId]=useState('')

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
  const [review,{data:season}]=await Promise.all([
   fetch('/api/account-review',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'}),
   supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
  ])
  const j=await review.json().catch(()=>({}))
  if(!review.ok){setMsg(j.error||'Unable to load pending accounts.');setLoading(false);return}
  setRows(j.rows||[])
  const {data:t}=season?.id?await supabase.from('teams').select('id,name').eq('season_id',season.id).eq('is_active',true).order('name'):await supabase.from('teams').select('id,name').eq('is_active',true).order('name')
  setTeams((t||[]) as Team[])
  const ids=(t||[]).map(x=>x.id)
  const {data:pl}=ids.length?await supabase.from('players').select('id,team_id,full_name').in('team_id',ids).eq('is_active',true).order('full_name'):({data:[]} as any)
  setPlayers((pl||[]) as Player[])
  setLoading(false)
 },[])
 useEffect(()=>{load()},[load])

 function openLeagueApproval(row:PendingAccount){setApproveRow(row);setTeamId('');setPlayerId('');setMsg('')}
 function closeLeagueApproval(){if(!busy){setApproveRow(null);setTeamId('');setPlayerId('')}}

 async function approveBooking(row:PendingAccount){
  if(!window.confirm(`Approve ${row.full_name||row.email||'this player'} as Simulator Booking Only?`))return
  await finishApproval(row,'sim_only',null)
 }
 async function approveLeague(){
  if(!approveRow)return
  if(!teamId){setMsg('Please select a team.');return}
  if(!playerId){setMsg('Please select the player on that team.');return}
  await finishApproval(approveRow,'league',playerId)
 }
 async function finishApproval(row:PendingAccount,accessType:'league'|'sim_only',selectedPlayerId:string|null){
  setBusy(row.id);setMsg('Approving account…')
  try{
   const {data:{session}}=await supabase.auth.getSession()
   if(!session?.access_token){setMsg('Please sign in again.');return}
   const r=await fetch('/api/accounts/approve',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({profileId:row.id,accessType,playerId:selectedPlayerId})})
   const j=await r.json().catch(()=>({}))
   if(!r.ok){setMsg(j.error||'Unable to approve account.');return}
   setRows(prev=>prev.filter(x=>x.id!==row.id))
   setMsg(j.detail||'Account approved.')
   setApproveRow(null);setTeamId('');setPlayerId('')
  }finally{setBusy(null)}
 }

 if(allowed===null||loading)return <PlayerPage title="Account Approvals"><div className="simple-mobile-page"><p>Loading account requests…</p></div></PlayerPage>
 if(!allowed)return <PlayerPage title="Account Approvals"><div className="simple-mobile-page"><div className="card"><h1>Account Approvals</h1><p>This area is available only to approved account approvers.</p></div></div></PlayerPage>
 return <PlayerPage title="Account Approvals"><div className="simple-mobile-page scorecard-official-page-v1298">
  {msg&&<p className="message">{msg}</p>}
  {rows.length===0?<div className="card scorecard-official-empty-v1298"><strong>All caught up!</strong><span>There are no new accounts waiting for approval.</span></div>:<div className="scorecard-official-list-v1298">{rows.map(r=><article className="card scorecard-official-card-v1298" key={r.id}>
   <div className="submission-head"><div><h2>{r.full_name||'New Player'}</h2><p>{r.email||'No email shown'}</p><small>Requested {new Date(r.created_at).toLocaleString()}</small></div><span className="submission-status pending">pending</span></div>
   <div className="scorecard-official-actions-v1298 account-approval-actions-v13159"><button className="btn" disabled={busy===r.id} onClick={()=>openLeagueApproval(r)}>✓ Approve League Member</button><button className="btn secondary" disabled={busy===r.id} onClick={()=>approveBooking(r)}>📅 Approve Booking Only</button></div>
  </article>)}</div>}
  {approveRow&&<div className="modal-backdrop" onClick={closeLeagueApproval}><div className="card modal-card" onClick={e=>e.stopPropagation()}>
   <h2>Approve League Member</h2>
   <p>Approve <strong>{approveRow.full_name||approveRow.email||'this player'}</strong> and connect the account to the correct league roster.</p>
   <label className="field">Team<select value={teamId} onChange={e=>{setTeamId(e.target.value);setPlayerId('')}}><option value="">Select team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
   <label className="field">Player<select value={playerId} disabled={!teamId} onChange={e=>setPlayerId(e.target.value)}><option value="">{teamId?'Select player':'Select a team first'}</option>{players.filter(p=>p.team_id===teamId).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
   <div className="actions"><button className="btn" disabled={busy===approveRow.id||!teamId||!playerId} onClick={approveLeague}>{busy===approveRow.id?'Approving…':'Confirm League Member'}</button><button className="btn secondary" disabled={busy===approveRow.id} onClick={closeLeagueApproval}>Cancel</button></div>
  </div></div>}
 </div></PlayerPage>
}
