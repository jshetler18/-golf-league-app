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


async function sendTeamRoundReminders(supabase:any, now:number){
  const from=new Date(now+50*60_000).toISOString()
  const to=new Date(now+70*60_000).toISOString()
  const {data:bookings,error:bookingError}=await supabase.from('bookings')
    .select('id,team_id,start_at').eq('kind','league').eq('status','active')
    .not('team_id','is',null).gte('start_at',from).lte('start_at',to)
  if(bookingError)throw bookingError
  if(!bookings?.length)return {due:0,sent:0,failed:0}
  const teamIds=[...new Set(bookings.map((b:any)=>b.team_id))] as string[]
  const [{data:players,error:playerError},{data:teams,error:teamError}]=await Promise.all([
    supabase.from('players').select('id,team_id').in('team_id',teamIds).eq('is_active',true),
    supabase.from('teams').select('id,name').in('id',teamIds)
  ])
  if(playerError)throw playerError
  if(teamError)throw teamError
  const playerIds=(players||[]).map((p:any)=>p.id)
  if(!playerIds.length)return {due:bookings.length,sent:0,failed:0}
  const {data:profiles,error:profileError}=await supabase.from('profiles')
    .select('id,player_id').in('player_id',playerIds).eq('status','approved').eq('access_type','league')
  if(profileError)throw profileError
  const userIds=[...new Set((profiles||[]).map((p:any)=>p.id))] as string[]
  if(!userIds.length)return {due:bookings.length,sent:0,failed:0}
  const [{data:subs,error:subError},{data:delivered,error:deliveryError}]=await Promise.all([
    supabase.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',userIds),
    supabase.from('team_round_reminder_deliveries').select('booking_id,user_id').in('booking_id',bookings.map((b:any)=>b.id))
  ])
  if(subError)throw subError
  if(deliveryError)throw deliveryError
  const deliveredSet=new Set((delivered||[]).map((d:any)=>d.booking_id+':'+d.user_id))
  let sent=0,failed=0
  for(const booking of bookings){
    const playerSet=new Set((players||[]).filter((p:any)=>p.team_id===booking.team_id).map((p:any)=>p.id))
    const teamName=(teams||[]).find((t:any)=>t.id===booking.team_id)?.name||'Your team'
    const time=easternTimeOnly(booking.start_at)
    for(const profile of profiles||[]){
      if(!playerSet.has(profile.player_id)||deliveredSet.has(booking.id+':'+profile.id))continue
      const userSubs=(subs||[]).filter((s:any)=>s.user_id===profile.id&&s.p256dh&&s.auth)
      if(!userSubs.length)continue
      let accepted=0
      for(const sub of userSubs){
        try{
          await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},
            JSON.stringify({title:'League Round in 1 Hour',body:teamName+' is scheduled to play at '+time+'.',url:'/reservations',tag:'league-round-'+booking.id,kind:'league-reminder'}))
          sent++;accepted++
        }catch(err:any){
          failed++
          console.error('League round reminder push failed',{bookingId:booking.id,statusCode:err?.statusCode})
          if(err?.statusCode===404||err?.statusCode===410)await supabase.from('push_subscriptions').delete().eq('id',sub.id)
        }
      }
      if(accepted>0){
        const {error}=await supabase.from('team_round_reminder_deliveries').insert({booking_id:booking.id,user_id:profile.id})
        if(error&&error.code!=='23505')throw error
        deliveredSet.add(booking.id+':'+profile.id)
      }
    }
  }
  return {due:bookings.length,sent,failed}
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
      'BM_yHAEkMmTuvc5_3KBvmQ1roeGxqyT8N8YJnpSzU19qwHRnUgHRsgRbQo62tqld6dh4kABoUMFf3HG0jf8Glnc',
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

    const teamRoundReminders=await sendTeamRoundReminders(supabase,now)
    if(!due.length) return NextResponse.json({ok:true,due:0,sent:0,failed:0,teamRoundReminders,youtubeLive})

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

    return NextResponse.json({ok:true,due:due.length,processed,sent,failed,teamRoundReminders,youtubeLive})
  }catch(err:any){
    return NextResponse.json({error:err?.message||'Unable to process reservation reminders.'},{status:500})
  }
}
