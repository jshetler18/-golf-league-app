import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { runYouTubeLiveCheck } from '@/lib/youtubeLiveNotify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Booking = { id:string; user_id:string; start_at:string; end_at:string }
type ReminderType = '24h'|'1h'

function easternTimeOnly(iso:string){
  return new Intl.DateTimeFormat('en-US',{
    timeZone:'America/New_York', hour:'numeric', minute:'2-digit'
  }).format(new Date(iso))
}

export async function POST(req:NextRequest){
  try{
    const secret=process.env.CRON_SECRET
    const auth=req.headers.get('authorization')||''
    if(!secret || auth!==`Bearer ${secret}`) return NextResponse.json({error:'Unauthorized'},{status:401})

    let youtubeLive:any
    try{
      youtubeLive=await runYouTubeLiveCheck()
    }catch(error:any){
      youtubeLive={ok:false,error:error?.message||'Unable to check YouTube livestream.'}
    }

    const url=process.env.NEXT_PUBLIC_SUPABASE_URL
    const adminKey=process.env.SUPABASE_SECRET_KEY
    const vapidPrivate=process.env.VAPID_PRIVATE_KEY
    if(!url||!adminKey||!vapidPrivate) return NextResponse.json({error:'Reminder service is not fully configured.'},{status:503})

    const supabase=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}})
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',
      'BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM',
      vapidPrivate
    )

    const now=Date.now()
    const ranges:[ReminderType,number,number][]=[
      ['24h',23*60+50,24*60+10],
      ['1h',50,70]
    ]
    const due:{booking:Booking;type:ReminderType}[]=[]

    for(const [type,minMinutes,maxMinutes] of ranges){
      const from=new Date(now+minMinutes*60_000).toISOString()
      const to=new Date(now+maxMinutes*60_000).toISOString()
      const {data,error}=await supabase.from('bookings')
        .select('id,user_id,start_at,end_at')
        .eq('kind','personal').eq('status','active').not('user_id','is',null)
        .gte('start_at',from).lte('start_at',to)
      if(error) throw error
      for(const booking of (data||[]) as Booking[]) due.push({booking,type})
    }

    if(!due.length) return NextResponse.json({ok:true,due:0,sent:0,failed:0,youtubeLive})

    const bookingIds=[...new Set(due.map(x=>x.booking.id))]
    const userIds=[...new Set(due.map(x=>x.booking.user_id))]
    const [{data:done,error:doneError},{data:subs,error:subError}]=await Promise.all([
      supabase.from('booking_reminder_deliveries').select('booking_id,reminder_type').in('booking_id',bookingIds),
      supabase.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',userIds)
    ])
    if(doneError) throw doneError
    if(subError) throw subError

    const doneSet=new Set((done||[]).map((x:any)=>`${x.booking_id}:${x.reminder_type}`))
    let sent=0, failed=0, processed=0

    for(const item of due){
      const key=`${item.booking.id}:${item.type}`
      if(doneSet.has(key)) continue
      const userSubs=(subs||[]).filter((s:any)=>s.user_id===item.booking.user_id && s.p256dh && s.auth)
      if(!userSubs.length) continue

      const when=easternTimeOnly(item.booking.start_at)
      const title=item.type==='24h' ? 'Simulator Reservation Tomorrow' : 'Simulator Reservation in 1 Hour'
      const body=item.type==='24h'
        ? `Reminder: You have the simulator reserved tomorrow at ${when}.`
        : `Reminder: Your simulator reservation starts at ${when}.`
      let sentForReminder=0

      for(const sub of userSubs as any[]){
        try{
          await webpush.sendNotification(
            {endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},
            JSON.stringify({
              title, body, url:`/my-bookings?booking=${encodeURIComponent(item.booking.id)}&from=reminder`,
              tag:`reservation-${item.booking.id}-${item.type}`
            })
          )
          sent++; sentForReminder++
        }catch(err:any){
          failed++
          if(err?.statusCode===404||err?.statusCode===410) await supabase.from('push_subscriptions').delete().eq('id',sub.id)
        }
      }

      if(sentForReminder>0){
        const {error}=await supabase.from('booking_reminder_deliveries').insert({booking_id:item.booking.id,reminder_type:item.type})
        if(error && error.code!=='23505') throw error
        processed++
      }
    }

    return NextResponse.json({ok:true,due:due.length,processed,sent,failed,youtubeLive})
  }catch(err:any){
    return NextResponse.json({error:err?.message||'Unable to process reservation reminders.'},{status:500})
  }
}
