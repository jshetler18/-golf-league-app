'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PlayerPage } from '@/components/PlayerMobileChrome'

type CalendarItem={id:string;kind:'personal'|'league'|'blocked';start_at:string;end_at:string;display_title:string;is_own:boolean;team_id:string|null}
type Booking={id:string;start_at:string;end_at:string;status:string}
type Profile={status:string;booking_enabled:boolean;role:string}

const hours=Array.from({length:14},(_,i)=>i+7)
const pad=(n:number)=>String(n).padStart(2,'0')
function dateKey(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function easternStamp(date:string,hour:number){return `${date} ${pad(hour)}:00:00 America/New_York`}
function hourLabel(hour:number){return new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,hour))}
function ordinalDay(day:number){const mod100=day%100;if(mod100>=11&&mod100<=13)return `${day}th`;if(day%10===1)return `${day}st`;if(day%10===2)return `${day}nd`;if(day%10===3)return `${day}rd`;return `${day}th`}
function fullFriendlyDate(date:string){const d=new Date(`${date}T12:00:00`);const weekday=new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(d);const month=new Intl.DateTimeFormat('en-US',{month:'long'}).format(d);return `${weekday}, ${month} ${ordinalDay(d.getDate())}`}
function compactHour(hour:number){return new Intl.DateTimeFormat('en-US',{hour:'numeric'}).format(new Date(2020,0,1,hour)).replace(/\s/g,'').toUpperCase()}
function dateText(iso:string){return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'America/New_York'}).format(new Date(iso))}
function timeText(iso:string){return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).format(new Date(iso))}
function easternParts(iso:string){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));const get=(type:string)=>Number(parts.find(p=>p.type===type)?.value||0);return {date:`${get('year')}-${pad(get('month'))}-${pad(get('day'))}`,minutes:get('hour')*60+get('minute')}}

export default function SimReservations(){
  const [date,setDate]=useState(dateKey(new Date()))
  const [items,setItems]=useState<CalendarItem[]>([])
  const [reservations,setReservations]=useState<Booking[]>([])
  const [profile,setProfile]=useState<Profile|null>(null)
  const [userId,setUserId]=useState('')
  const [signedIn,setSignedIn]=useState<boolean|null>(null)
  const [startHour,setStartHour]=useState<number|null>(null)
  const [duration,setDuration]=useState(1)
  const [message,setMessage]=useState('')
  const [confirmation,setConfirmation]=useState<{date:string;time:string}|null>(null)
  const [loading,setLoading]=useState(true)
  const [showReservations,setShowReservations]=useState(false)
  const [focusId,setFocusId]=useState('')
  const [fromReminder,setFromReminder]=useState(false)
  const [cancelBooking,setCancelBooking]=useState<Booking|null>(null)
  const [cancelHours,setCancelHours]=useState<number[]>([])
  const [cancelBusy,setCancelBusy]=useState(false)
  const [bookingDaysAhead,setBookingDaysAhead]=useState(30)
  const [bookingWindowDenied,setBookingWindowDenied]=useState(false)

  const today=useMemo(()=>dateKey(new Date()),[])
  const maxDate=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+bookingDaysAhead);return dateKey(d)},[bookingDaysAhead])

  async function load(preserveFeedback=false){
    setLoading(true)
    if(!preserveFeedback)setMessage('')
    const {data:u}=await supabase.auth.getUser()
    if(!u.user){setSignedIn(false);setUserId('');setProfile(null);setItems([]);setReservations([]);setLoading(false);return}
    setSignedIn(true);setUserId(u.user.id)
    const from=easternStamp(date,0),to=easternStamp(date,24)
    const [{data:p},{data:calendar,error:calendarError},{data:upcoming,error:upcomingError},{data:settings}]=await Promise.all([
      supabase.from('profiles').select('status,booking_enabled,role').eq('id',u.user.id).maybeSingle(),
      supabase.rpc('get_booking_calendar',{p_from:from,p_to:to}),
      supabase.from('bookings').select('id,start_at,end_at,status').eq('kind','personal').eq('user_id',u.user.id).eq('status','active').gte('end_at',new Date().toISOString()).order('start_at'),
      supabase.from('simulator_settings').select('booking_days_ahead').eq('id',1).maybeSingle()
    ])
    if(settings?.booking_days_ahead)setBookingDaysAhead(settings.booking_days_ahead)
    setProfile(p as Profile|null);setItems((calendar||[]) as CalendarItem[]);setReservations((upcoming||[]) as Booking[])
    if(calendarError)setMessage(calendarError.message);else if(upcomingError)setMessage(upcomingError.message)
    setLoading(false)
  }

  useEffect(()=>{const params=new URLSearchParams(window.location.search);const booking=params.get('booking')||'';setFocusId(booking);const reminder=params.get('from')==='reminder';setFromReminder(reminder);if(booking||reminder)setShowReservations(true)},[])
  useEffect(()=>{setStartHour(null);setDuration(1);load(false)},[date])
  useEffect(()=>{if(!focusId||!reservations.length||!showReservations)return;const el=document.getElementById(`booking-${focusId}`);if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center'}),120)},[focusId,reservations,showReservations])

  function isPastSlot(hour:number){if(date!==today)return false;const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const get=(t:string)=>Number(parts.find(p=>p.type===t)?.value||0);const nowMinutes=get('hour')*60+get('minute');return nowMinutes>=(hour+1)*60-15}
  function overlaps(hour:number){const slotStart=hour*60,slotEnd=(hour+1)*60;return items.find(x=>{const start=easternParts(x.start_at),end=easternParts(x.end_at);if(start.date!==date&&end.date!==date)return false;const bookingStart=start.date===date?start.minutes:0;const bookingEnd=end.date===date?end.minutes:24*60;return bookingStart<slotEnd&&bookingEnd>slotStart})}
  function chooseSlot(hour:number){if(date>maxDate){setBookingWindowDenied(true);return}if(overlaps(hour)||isPastSlot(hour))return;setMessage('');setConfirmation(null);if(startHour!==null&&hour>=startHour&&hour<startHour+duration){if(duration===1){setStartHour(null);setDuration(1);return}if(hour===startHour){setStartHour(startHour+1);setDuration(duration-1);return}if(hour===startHour+duration-1){setDuration(duration-1);return}setStartHour(null);setDuration(1);return}if(startHour!==null&&hour===startHour-1&&duration<3&&hour>=7){setStartHour(hour);setDuration(duration+1);return}if(startHour!==null&&hour===startHour+duration&&duration<3&&hour<21){setDuration(duration+1);return}setStartHour(hour);setDuration(1)}
  function prepareBookingSound(){try{const ctx=new AudioContext();return {play(){const now=ctx.currentTime;const gain=ctx.createGain();gain.connect(ctx.destination);gain.gain.setValueAtTime(0.0001,now);gain.gain.exponentialRampToValueAtTime(0.16,now+0.02);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.65);const first=ctx.createOscillator(),second=ctx.createOscillator();first.type='sine';second.type='sine';first.frequency.setValueAtTime(659.25,now);second.frequency.setValueAtTime(880,now+0.18);first.connect(gain);second.connect(gain);first.start(now);first.stop(now+0.28);second.start(now+0.18);second.stop(now+0.62);window.setTimeout(()=>ctx.close().catch(()=>{}),800)},close(){ctx.close().catch(()=>{})}}}catch{return null}}

  const canBook=profile?.status==='approved'&&profile?.booking_enabled
  async function book(e:FormEvent){e.preventDefault();setMessage('');setConfirmation(null);if(date>maxDate){setBookingWindowDenied(true);return}if(!canBook){setMessage('Your account must be approved before you can book.');return}if(startHour===null){setMessage('Please select a starting time.');return}if(startHour+duration>21){setMessage('Bookings must end by 9:00 PM.');return}for(let h=startHour;h<startHour+duration;h++)if(overlaps(h)){setMessage('Part of that time is already reserved. Please choose another time.');return}const sound=prepareBookingSound();const {data:created,error}=await supabase.from('bookings').insert({kind:'personal',user_id:userId,created_by:userId,start_at:easternStamp(date,startHour),end_at:easternStamp(date,startHour+duration)}).select('id').single();if(error){sound?.close();setMessage(error.message);return}try{const {data:{session}}=await supabase.auth.getSession();if(session?.access_token&&created?.id)await fetch('/api/push/booking-admin',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({bookingId:created.id})})}catch{}setConfirmation({date:fullFriendlyDate(date),time:`${compactHour(startHour)}-${compactHour(startHour+duration)}`});sound?.play();setStartHour(null);setDuration(1);await load(true)}
  function openCancel(b:Booking){const start=easternParts(b.start_at).minutes/60,end=easternParts(b.end_at).minutes/60;const hs=Array.from({length:Math.max(0,end-start)},(_,i)=>start+i);setCancelBooking(b);setCancelHours(hs)}
  function toggleCancelHour(h:number){setCancelHours(v=>v.includes(h)?v.filter(x=>x!==h):[...v,h].sort((a,b)=>a-b))}
  async function confirmCancellation(){if(!cancelBooking||cancelHours.length===0)return;setCancelBusy(true);setMessage('');try{const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error('Please sign in again.');const res=await fetch('/api/bookings/cancel-hours',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({bookingId:cancelBooking.id,hours:cancelHours})});const json=await res.json();if(!res.ok)throw new Error(json.error||'Unable to cancel reservation time.');setMessage(cancelHours.length===json.totalHours?'Reservation cancelled.':'Selected reservation time cancelled.');setCancelBooking(null);setCancelHours([]);await load(true)}catch(e:any){setMessage(e?.message||'Unable to cancel reservation time.')}finally{setCancelBusy(false)}}

  if(signedIn===false&&!loading)return <PlayerPage title="Sim Reservations"><section className="hero"><div className="eyebrow">Simulator Calendar</div><h1>Sim Reservations</h1><p>Sign in to see availability and make a reservation.</p></section><div className="card"><h2>Sign in required</h2><p>Only approved users can reserve simulator time.</p><Link className="btn" href="/login">Sign In / Create Account</Link></div></PlayerPage>

  return <PlayerPage title="Sim Reservations">
    <section className="hero"><h1>Sim Reservations</h1><p>View your upcoming reservations or reserve simulator time.</p></section>
    <section className="card sim-reservation-summary-v1307">
      <div><div className="sim-reservations-title-v1330">Your Reservations</div><div className="sim-reservation-count-v1331">{reservations.length===0?'You don’t have any upcoming reservations.':`You have ${reservations.length} upcoming reservation${reservations.length===1?'':'s'}.`}</div></div>
      {reservations.length>0&&<button type="button" className="btn secondary" onClick={()=>setShowReservations(v=>!v)}>{showReservations?'Hide My Reservations':'View My Reservations'}</button>}
    </section>
    {fromReminder&&focusId&&<div className="reminder-cancel-note"><strong>Reservation Reminder</strong><span>Your reservation is shown below. You can cancel it here if your plans changed.</span></div>}
    {showReservations&&reservations.length>0&&<section className="sim-reservation-list-v1307"><div className="booking-rows">{reservations.map(b=><div id={`booking-${b.id}`} className={`booking-row${b.id===focusId?' booking-row-highlight':''}`} key={b.id}><div className="booking-row-main"><strong className="booking-row-date">{dateText(b.start_at)}</strong><span className="booking-row-time">{timeText(b.start_at)}–{timeText(b.end_at)}</span></div><button className="btn danger booking-row-cancel" onClick={()=>openCancel(b)}>Cancel Reservation</button></div>)}</div></section>}
    {!canBook&&profile&&<div className="card notice"><strong>Booking access is {profile.status}.</strong><p className="muted">You can view the calendar, but an admin must approve your account before you can reserve time.</p></div>}
    {cancelBooking&&<div className="booking-confirmation-overlay" role="presentation" onClick={()=>!cancelBusy&&setCancelBooking(null)}><div className="booking-confirmation-modal cancel-hours-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button type="button" className="booking-confirmation-close" disabled={cancelBusy} onClick={()=>setCancelBooking(null)} aria-label="Close cancellation options">×</button><h2>Cancel Reservation Time</h2><p className="muted"><strong>All hours are selected for cancellation by default.</strong> Uncheck any hour you want to KEEP. Only the checked hours will be cancelled and released to other players.</p><div className="cancel-hour-options">{(()=>{const start=easternParts(cancelBooking.start_at).minutes/60,end=easternParts(cancelBooking.end_at).minutes/60;const all=Array.from({length:Math.max(0,end-start)},(_,i)=>start+i);return <>{all.map(h=>{const selected=cancelHours.includes(h);return <button type="button" className={`cancel-hour-option ${selected?'cancel-hour-selected':'cancel-hour-kept'}`} key={h} disabled={cancelBusy} onClick={()=>toggleCancelHour(h)} aria-pressed={selected}><input type="checkbox" checked={selected} readOnly tabIndex={-1}/><span><strong>{hourLabel(h)}–{hourLabel(h+1)}</strong><small>{selected?'Selected for cancellation':'KEEP this time'}</small></span></button>})}</>})()}</div><div className="booking-confirmation-actions"><button type="button" className="btn danger" disabled={cancelBusy||cancelHours.length===0} onClick={confirmCancellation}>{cancelBusy?'Cancelling…':`Cancel ${cancelHours.length} Selected ${cancelHours.length===1?'Hour':'Hours'}`}</button><button type="button" className="btn secondary" disabled={cancelBusy} onClick={()=>setCancelBooking(null)}>Keep Reservation</button></div></div></div>}
    {bookingWindowDenied&&<div className="booking-confirmation-overlay" role="presentation" onClick={()=>setBookingWindowDenied(false)}><div className="booking-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="booking-window-denied-title" onClick={e=>e.stopPropagation()}><button type="button" className="booking-confirmation-close" onClick={()=>setBookingWindowDenied(false)} aria-label="Close">×</button><div className="booking-denied-x" aria-hidden="true">×</div><h2 id="booking-window-denied-title">Reservation Not Available</h2><p>You can only reserve the simulator up to <strong>{bookingDaysAhead} days in advance</strong>. Please select a date within the current booking window.</p><div className="booking-confirmation-actions"><button type="button" className="btn" onClick={()=>setBookingWindowDenied(false)}>Choose Another Date</button></div></div></div>}
    {confirmation&&<div className="booking-confirmation-overlay" role="presentation" onClick={()=>setConfirmation(null)}><div className="booking-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="booking-confirmation-title" onClick={e=>e.stopPropagation()}><button type="button" className="booking-confirmation-close" onClick={()=>setConfirmation(null)} aria-label="Close reservation confirmation">×</button><div className="booking-confirmation-check" aria-hidden="true">✓</div><h2 id="booking-confirmation-title">Reservation Confirmed</h2><div className="booking-confirmation-details"><div>Reservation Confirmed for</div><div className="booking-confirmation-date">{confirmation.date}</div><div className="booking-confirmation-time">{confirmation.time}</div></div><div className="booking-confirmation-actions"><button type="button" className="btn" onClick={()=>{setConfirmation(null);setShowReservations(true)}}>View My Reservations</button><button type="button" className="btn secondary" onClick={()=>setConfirmation(null)}>Done</button></div></div></div>}
    <div className="booking-layout booking-layout-single"><form onSubmit={book} className="card choose-day-card"><h2>Book the Sim</h2><label className="field booking-date-field">Date<input type="date" min={today} max={maxDate} value={date} onChange={e=>{const next=e.target.value;setDate(next);if(next>maxDate)setBookingWindowDenied(true)}}/></label><p className="muted">Reservations may be made up to {bookingDaysAhead} days in advance.</p><p className="muted slot-help">Tap any green available time to start. Then tap the consecutive hour before or after your selection to extend it, up to 3 hours. Tap a selected time again to turn it off.</p><div className="slot-list">{hours.map(h=>{const busy=overlaps(h);const past=isPastSlot(h);const beyondWindow=date>maxDate;const selected=!busy&&!past&&startHour!==null&&h>=startHour&&h<startHour+duration;return <button type="button" onClick={()=>chooseSlot(h)} disabled={!!busy||past||!canBook||beyondWindow} className={`slot ${busy?busy.kind:past?'past':'open'} ${selected?'selected':''} ${!busy&&!past&&canBook?'slot-clickable':''}`} key={h}><span><strong>{hourLabel(h)}</strong>–{hourLabel(h+1)}</span><span>{busy?(busy.kind==='league'?busy.display_title:busy.is_own?'My Reservation':'Unavailable'):past?'Time Passed':beyondWindow?'Outside Booking Window':selected?'Selected':'Available'}</span></button>})}</div><div className="booking-confirm-area">{startHour!==null&&<p className="booking-selection-summary"><strong>Selected:</strong> {hourLabel(startHour)}–{hourLabel(startHour+duration)} ({duration} {duration===1?'hour':'hours'})</p>}<button className="btn booking-confirm-btn" disabled={!canBook||startHour===null||date>maxDate} onClick={()=>{if(date>maxDate)setBookingWindowDenied(true)}}>Confirm Reservation</button>{message&&<p className="message booking-error">{message}</p>}<p className="muted booking-availability-note">Reserved personal time is shown in light red as unavailable. League reservations continue to show the team name.</p></div></form></div>
  </PlayerPage>
}
