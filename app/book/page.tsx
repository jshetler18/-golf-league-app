'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type CalendarItem={id:string;kind:'personal'|'league'|'blocked';start_at:string;end_at:string;display_title:string;is_own:boolean;team_id:string|null}
type Profile={status:string;booking_enabled:boolean;role:string}

const hours=Array.from({length:14},(_,i)=>i+7)
const pad=(n:number)=>String(n).padStart(2,'0')
function dateKey(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function easternStamp(date:string,hour:number){return `${date} ${pad(hour)}:00:00 America/New_York`}
function hourLabel(hour:number){return new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,hour))}
function ordinalDay(day:number){
  const mod100=day%100
  if(mod100>=11&&mod100<=13)return `${day}th`
  if(day%10===1)return `${day}st`
  if(day%10===2)return `${day}nd`
  if(day%10===3)return `${day}rd`
  return `${day}th`
}
function fullFriendlyDate(date:string){
  const d=new Date(`${date}T12:00:00`)
  const weekday=new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(d)
  const month=new Intl.DateTimeFormat('en-US',{month:'long'}).format(d)
  return `${weekday}, ${month} ${ordinalDay(d.getDate())}`
}
function compactHour(hour:number){return new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,hour)).replace(/\s/g,'').toUpperCase()}

function easternParts(iso:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso))
  const get=(type:string)=>Number(parts.find(p=>p.type===type)?.value||0)
  return {date:`${get('year')}-${pad(get('month'))}-${pad(get('day'))}`,minutes:get('hour')*60+get('minute')}
}

export default function BookPage(){
  const [date,setDate]=useState(dateKey(new Date()))
  const [items,setItems]=useState<CalendarItem[]>([])
  const [profile,setProfile]=useState<Profile|null>(null)
  const [userId,setUserId]=useState('')
  const [startHour,setStartHour]=useState<number|null>(null)
  const [duration,setDuration]=useState(1)
  const [message,setMessage]=useState('')
  const [confirmation,setConfirmation]=useState<{date:string;time:string}|null>(null)
  const [loading,setLoading]=useState(true)

  const today=useMemo(()=>dateKey(new Date()),[])
  const maxDate=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+30);return dateKey(d)},[])

  async function load(preserveFeedback=false){
    setLoading(true)
    if(!preserveFeedback){setMessage('');setConfirmation(null)}
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
  useEffect(()=>{setStartHour(null);setDuration(1);load(false)},[date])

  function overlaps(hour:number){
    const slotStart=hour*60, slotEnd=(hour+1)*60
    return items.find(x=>{
      const start=easternParts(x.start_at), end=easternParts(x.end_at)
      if(start.date!==date && end.date!==date)return false
      const bookingStart=start.date===date?start.minutes:0
      const bookingEnd=end.date===date?end.minutes:24*60
      return bookingStart<slotEnd && bookingEnd>slotStart
    })
  }

  function chooseSlot(hour:number){
    if(overlaps(hour))return
    setMessage('');setConfirmation(null)
    if(startHour!==null && hour===startHour+duration && duration<3 && hour<21){
      setDuration(duration+1)
      return
    }
    setStartHour(hour)
    setDuration(1)
  }

  function prepareBookingSound(){
    try{
      const ctx=new AudioContext()
      return {
        play(){
          const now=ctx.currentTime
          const gain=ctx.createGain()
          gain.connect(ctx.destination)
          gain.gain.setValueAtTime(0.0001,now)
          gain.gain.exponentialRampToValueAtTime(0.16,now+0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001,now+0.65)
          const first=ctx.createOscillator()
          const second=ctx.createOscillator()
          first.type='sine';second.type='sine'
          first.frequency.setValueAtTime(659.25,now)
          second.frequency.setValueAtTime(880,now+0.18)
          first.connect(gain);second.connect(gain)
          first.start(now);first.stop(now+0.28)
          second.start(now+0.18);second.stop(now+0.62)
          window.setTimeout(()=>ctx.close().catch(()=>{}),800)
        },
        close(){ctx.close().catch(()=>{})}
      }
    }catch{return null}
  }

  const canBook=profile?.status==='approved' && profile?.booking_enabled

  async function book(e:FormEvent){
    e.preventDefault(); setMessage(''); setConfirmation(null)
    if(!canBook){setMessage('Your account must be approved before you can book.');return}
    if(startHour===null){setMessage('Please select a starting time.');return}
    if(startHour+duration>21){setMessage('Bookings must end by 9:00 PM.');return}
    for(let h=startHour;h<startHour+duration;h++) if(overlaps(h)){setMessage('Part of that time is already reserved. Please choose another time.');return}
    const sound=prepareBookingSound()
    const {error}=await supabase.from('bookings').insert({kind:'personal',user_id:userId,created_by:userId,start_at:easternStamp(date,startHour),end_at:easternStamp(date,startHour+duration)})
    if(error){sound?.close();setMessage(error.message);return}
    setConfirmation({date:fullFriendlyDate(date),time:`${compactHour(startHour)}-${compactHour(startHour+duration)}`})
    sound?.play()
    setStartHour(null)
    setDuration(1)
    await load(true)
  }

  if(!userId && !loading) return <PlayerPage title="Reserve Sim"><section className="hero"><div className="eyebrow">Simulator Calendar</div><h1>Reserve Sim</h1><p>Sign in to see availability and make a reservation.</p></section><div className="card"><h2>Sign in required</h2><p>Only approved users can reserve simulator time.</p><Link className="btn" href="/login">Sign In / Create Account</Link></div></PlayerPage>

  return <PlayerPage title="Reserve Sim">
    <section className="hero"><div className="eyebrow">Simulator Calendar</div><h1>Reserve Sim</h1><p>Open daily 7:00 AM–9:00 PM. Reserve up to 3 hours per day, up to 30 days ahead.</p></section>
    {!canBook && profile && <div className="card notice"><strong>Booking access is {profile.status}.</strong><p className="muted">You can view the calendar, but an admin must approve your account before you can reserve time.</p></div>}
    {confirmation&&<div className="booking-confirmation-overlay" role="presentation" onClick={()=>setConfirmation(null)}>
      <div className="booking-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="booking-confirmation-title" onClick={e=>e.stopPropagation()}>
        <button type="button" className="booking-confirmation-close" onClick={()=>setConfirmation(null)} aria-label="Close reservation confirmation">×</button>
        <div className="booking-confirmation-check" aria-hidden="true">✓</div>
        <h2 id="booking-confirmation-title">Reservation Confirmed</h2>
        <div className="booking-confirmation-details"><div>Reservation Confirmed for</div><div className="booking-confirmation-date">{confirmation.date}</div><div className="booking-confirmation-time">{confirmation.time}</div></div>
        <div className="booking-confirmation-actions">
          <Link className="btn" href="/my-bookings">View My Sim Reservations</Link>
          <button type="button" className="btn secondary" onClick={()=>setConfirmation(null)}>Done</button>
        </div>
      </div>
    </div>}
    <div className="booking-layout booking-layout-single">
      <form onSubmit={book} className="card choose-day-card"><h2>Choose a Day</h2><label className="field booking-date-field">Date<input type="date" min={today} max={maxDate} value={date} onChange={e=>setDate(e.target.value)} /></label>
        <p className="muted slot-help">Tap or click any green available time to select it. Tap the next consecutive hour to extend the reservation, up to 3 hours.</p>
        <div className="slot-list">{hours.map(h=>{const busy=overlaps(h);const selected=!busy&&startHour!==null&&h>=startHour&&h<startHour+duration;return <button type="button" onClick={()=>chooseSlot(h)} disabled={!!busy||!canBook} className={`slot ${busy?busy.kind:'open'} ${selected?'selected':''} ${!busy&&canBook?'slot-clickable':''}`} key={h}><span><strong>{hourLabel(h)}</strong>–{hourLabel(h+1)}</span><span>{busy?(busy.kind==='league'?busy.display_title:busy.is_own?'My Reservation':'Unavailable'):selected?'Selected':'Available'}</span></button>})}</div>
        <div className="booking-confirm-area">
          {startHour!==null&&<p className="booking-selection-summary"><strong>Selected:</strong> {hourLabel(startHour)}–{hourLabel(startHour+duration)} ({duration} {duration===1?'hour':'hours'})</p>}
          <button className="btn booking-confirm-btn" disabled={!canBook||startHour===null}>Confirm Reservation</button>
          {message&&<p className="message booking-error">{message}</p>}
          <p className="muted booking-availability-note">Reserved personal time is shown in light red as unavailable. League reservations continue to show the team name.</p>
          <Link href="/my-bookings" className="text-link">View My Sim Reservations →</Link>
        </div>
      </form>
    </div>
  </PlayerPage>
}
