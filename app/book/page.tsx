'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type CalendarItem={id:string;kind:'personal'|'league'|'blocked';start_at:string;end_at:string;display_title:string;is_own:boolean;team_id:string|null}
type Profile={status:string;booking_enabled:boolean;role:string}

const hours=Array.from({length:14},(_,i)=>i+7)
const pad=(n:number)=>String(n).padStart(2,'0')
function dateKey(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function easternStamp(date:string,hour:number){return `${date} ${pad(hour)}:00:00 America/New_York`}
function fmtTime(iso:string){return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).format(new Date(iso))}

export default function BookPage(){
  const [date,setDate]=useState(dateKey(new Date()))
  const [items,setItems]=useState<CalendarItem[]>([])
  const [profile,setProfile]=useState<Profile|null>(null)
  const [userId,setUserId]=useState('')
  const [startHour,setStartHour]=useState(7)
  const [duration,setDuration]=useState(1)
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(true)

  const today=useMemo(()=>dateKey(new Date()),[])
  const maxDate=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+30);return dateKey(d)},[])

  async function load(){
    setLoading(true); setMessage('')
    const { data:u }=await supabase.auth.getUser()
    if(!u.user){setUserId('');setProfile(null);setItems([]);setLoading(false);return}
    setUserId(u.user.id)
    const {data:p}=await supabase.from('profiles').select('status,booking_enabled,role').eq('id',u.user.id).maybeSingle()
    setProfile(p as Profile|null)
    const from=easternStamp(date,0), to=easternStamp(date,24)
    const {data,error}=await supabase.rpc('get_booking_calendar',{p_from:from,p_to:to})
    setItems((data||[]) as CalendarItem[])
    if(error)setMessage(error.message)
    setLoading(false)
  }
  useEffect(()=>{load()},[date])

  function overlaps(hour:number){
    const slotStart=new Date(easternStamp(date,hour)); const slotEnd=new Date(easternStamp(date,hour+1))
    return items.find(x=>new Date(x.start_at)<slotEnd && new Date(x.end_at)>slotStart)
  }
  const canBook=profile?.status==='approved' && profile?.booking_enabled

  async function book(e:FormEvent){
    e.preventDefault(); setMessage('')
    if(!canBook){setMessage('Your account must be approved before you can book.');return}
    if(startHour+duration>21){setMessage('Bookings must end by 9:00 PM.');return}
    for(let h=startHour;h<startHour+duration;h++) if(overlaps(h)){setMessage('Part of that time is already reserved.');return}
    const {error}=await supabase.from('bookings').insert({kind:'personal',user_id:userId,created_by:userId,start_at:easternStamp(date,startHour),end_at:easternStamp(date,startHour+duration)})
    setMessage(error?error.message:'Reservation confirmed!')
    if(!error) await load()
  }

  if(!userId && !loading) return <><section className="hero"><div className="eyebrow">Simulator Calendar</div><h1>Book the Sim</h1><p>Sign in to see availability and make a reservation.</p></section><div className="card"><h2>Sign in required</h2><p>Only approved users can reserve simulator time.</p><Link className="btn" href="/login">Sign In / Create Account</Link></div></>

  return <>
    <section className="hero"><div className="eyebrow">Simulator Calendar</div><h1>Book the Sim</h1><p>Open daily 7:00 AM–9:00 PM. Reserve up to 3 hours per day, up to 30 days ahead.</p></section>
    {!canBook && profile && <div className="card notice"><strong>Booking access is {profile.status}.</strong><p className="muted">You can view the calendar, but an admin must approve your account before you can reserve time.</p></div>}
    <div className="booking-layout">
      <div className="card"><h2>Choose a Day</h2><label className="field">Date<input type="date" min={today} max={maxDate} value={date} onChange={e=>setDate(e.target.value)} /></label>
        <div className="slot-list">{hours.map(h=>{const busy=overlaps(h);return <div className={`slot ${busy?busy.kind:'open'}`} key={h}><span><strong>{new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,h))}</strong>–{new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,h+1))}</span><span>{busy?(busy.kind==='league'?busy.display_title:busy.is_own?'My Booking':'Unavailable'):'Available'}</span></div>})}</div>
      </div>
      <div className="card"><h2>Reserve Time</h2><form onSubmit={book} className="form-grid single"><label className="field">Start time<select value={startHour} onChange={e=>setStartHour(Number(e.target.value))}>{hours.map(h=><option key={h} value={h}>{new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,h))}</option>)}</select></label><label className="field">Length<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={1}>1 hour</option><option value={2}>2 hours</option><option value={3}>3 hours</option></select></label><button className="btn" disabled={!canBook}>Confirm Reservation</button></form>{message&&<p className="message">{message}</p>}<p className="muted">League reservations show the team name. Other personal reservations simply appear as unavailable.</p><Link href="/my-bookings" className="text-link">View My Bookings →</Link></div>
    </div>
  </>
}
