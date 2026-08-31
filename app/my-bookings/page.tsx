'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Booking={id:string;start_at:string;end_at:string;status:string}
function dateText(iso:string){return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'America/New_York'}).format(new Date(iso))}
function timeText(iso:string){return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).format(new Date(iso))}

export default function MyBookings(){
 const [items,setItems]=useState<Booking[]>([]); const [signedIn,setSignedIn]=useState<boolean|null>(null); const [msg,setMsg]=useState('')
 async function load(){const {data:u}=await supabase.auth.getUser(); if(!u.user){setSignedIn(false);return} setSignedIn(true); const {data,error}=await supabase.from('bookings').select('id,start_at,end_at,status').eq('kind','personal').eq('user_id',u.user.id).eq('status','active').gte('end_at',new Date().toISOString()).order('start_at'); if(error)setMsg(error.message);setItems((data||[]) as Booking[])}
 useEffect(()=>{load()},[])
 async function cancel(id:string){if(!confirm('Cancel this simulator reservation? The time will immediately become available to others.'))return; const {error}=await supabase.from('bookings').update({status:'cancelled'}).eq('id',id); setMsg(error?error.message:'Reservation cancelled.'); if(!error)load()}
 if(signedIn===false)return <div className="card"><h1>My Bookings</h1><p>Please sign in first.</p><Link href="/login" className="btn">Sign In</Link></div>
 return <><section className="hero"><div className="eyebrow">Your Reservations</div><h1>My Bookings</h1><p>See and cancel your upcoming simulator times.</p></section>{msg&&<p className="message">{msg}</p>}{items.length===0?<div className="card"><h2>No upcoming reservations</h2><Link href="/book" className="btn">Book the Sim</Link></div>:<div className="booking-rows">{items.map(b=><div className="booking-row" key={b.id}><div className="booking-row-main"><strong className="booking-row-date">{dateText(b.start_at)}</strong><span className="booking-row-time">{timeText(b.start_at)}–{timeText(b.end_at)}</span></div><button className="btn danger booking-row-cancel" onClick={()=>cancel(b.id)}>Cancel Reservation</button></div>)}</div>}</>
}
