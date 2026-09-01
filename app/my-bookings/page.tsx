'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type Booking={id:string;start_at:string;end_at:string;status:string}
function dateText(iso:string){return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'America/New_York'}).format(new Date(iso))}
function timeText(iso:string){return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).format(new Date(iso))}

export default function MyBookings(){
 const [items,setItems]=useState<Booking[]>([]); const [signedIn,setSignedIn]=useState<boolean|null>(null); const [msg,setMsg]=useState(''); const [focusId,setFocusId]=useState(''); const [fromReminder,setFromReminder]=useState(false)
 async function load(){const {data:u}=await supabase.auth.getUser(); if(!u.user){setSignedIn(false);return} setSignedIn(true); const {data,error}=await supabase.from('bookings').select('id,start_at,end_at,status').eq('kind','personal').eq('user_id',u.user.id).eq('status','active').gte('end_at',new Date().toISOString()).order('start_at'); if(error)setMsg(error.message);setItems((data||[]) as Booking[])}
 useEffect(()=>{
   const params=new URLSearchParams(window.location.search); const booking=params.get('booking')||''; setFocusId(booking); setFromReminder(params.get('from')==='reminder'); load()
 },[])
 useEffect(()=>{if(!focusId||!items.length)return; const el=document.getElementById(`booking-${focusId}`); if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center'}),120)},[focusId,items])
 async function cancel(id:string){if(!confirm('Cancel this simulator reservation? The time will immediately become available to others.'))return; const {error}=await supabase.from('bookings').update({status:'cancelled'}).eq('id',id); setMsg(error?error.message:'Reservation cancelled.'); if(!error)load()}
 if(signedIn===false)return <PlayerPage title="My Sim Reservations"><div className="card"><h1>My Sim Reservations</h1><p>Please sign in first.</p><Link href="/login" className="btn">Sign In</Link></div></PlayerPage>
 return <PlayerPage title="My Sim Reservations"><section className="hero"><div className="eyebrow">Your Reservations</div><h1>My Sim Reservations</h1><p>See and cancel your upcoming simulator times.</p></section>{fromReminder&&focusId&&<div className="reminder-cancel-note"><strong>Reservation Reminder</strong><span>Your reservation is shown below. You can cancel it here if your plans changed.</span></div>}{msg&&<p className="message">{msg}</p>}{items.length===0?<div className="card"><h2>No upcoming reservations</h2><Link href="/book" className="btn">Reserve Sim</Link></div>:<div className="booking-rows">{items.map(b=><div id={`booking-${b.id}`} className={`booking-row${b.id===focusId?' booking-row-highlight':''}`} key={b.id}><div className="booking-row-main"><strong className="booking-row-date">{dateText(b.start_at)}</strong><span className="booking-row-time">{timeText(b.start_at)}–{timeText(b.end_at)}</span></div><button className="btn danger booking-row-cancel" onClick={()=>cancel(b.id)}>Cancel Reservation</button></div>)}</div>}</PlayerPage>
}
