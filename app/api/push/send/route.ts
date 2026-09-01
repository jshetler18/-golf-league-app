import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime='nodejs'

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||''
    const token=auth.startsWith('Bearer ')?auth.slice(7):''
    if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const privateKey=process.env.VAPID_PRIVATE_KEY
    if(!url||!key||!privateKey)return NextResponse.json({error:'Push notifications are not configured on the server yet.'},{status:503})
    const supabase=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}})
    const {data:{user},error:userError}=await supabase.auth.getUser(token)
    if(userError||!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single()
    if(profile?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403})

    const payload=await req.json()
    const announcementId=String(payload.announcementId||'')
    if(!announcementId)return NextResponse.json({error:'Announcement ID is required.'},{status:400})
    const {data:announcement,error:announcementError}=await supabase.from('announcements').select('id,title,body,audience,team_id').eq('id',announcementId).maybeSingle()
    if(announcementError)return NextResponse.json({error:announcementError.message},{status:500})
    if(!announcement)return NextResponse.json({error:'Announcement not found.'},{status:404})

    const title=String(announcement.title||'Tom Krise 19th Hole Golf League').slice(0,120)
    const body=String(announcement.body||'You have a new league message.').slice(0,500)
    webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com', 'BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM', privateKey)

    let subscriptions:any[]=[]
    if(announcement.audience==='team'){
      if(!announcement.team_id)return NextResponse.json({error:'Team announcement is missing a team.'},{status:400})
      const {data:teamPlayers,error:playersError}=await supabase.from('players').select('id').eq('team_id',announcement.team_id).eq('is_active',true)
      if(playersError)return NextResponse.json({error:playersError.message},{status:500})
      const playerIds=(teamPlayers||[]).map(p=>p.id)
      if(playerIds.length){
        const {data:linked,error:linkedError}=await supabase.from('profiles').select('id').in('player_id',playerIds).eq('status','approved')
        if(linkedError)return NextResponse.json({error:linkedError.message},{status:500})
        const userIds=(linked||[]).map(p=>p.id)
        if(userIds.length){
          const {data:subs,error:subError}=await supabase.from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id',userIds)
          if(subError)return NextResponse.json({error:subError.message},{status:500})
          subscriptions=subs||[]
        }
      }
    }else{
      const {data:subs,error:subError}=await supabase.from('push_subscriptions').select('id,endpoint,p256dh,auth')
      if(subError)return NextResponse.json({error:subError.message},{status:500})
      subscriptions=subs||[]
    }

    let sent=0, failed=0
    for(const sub of subscriptions){
      if(!sub.p256dh||!sub.auth)continue
      try{
        await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body,url:`/messages?message=${encodeURIComponent(announcementId)}`,tag:`announcement-${announcementId}`}))
        sent++
      }catch(err:any){
        failed++
        if(err?.statusCode===404||err?.statusCode===410)await supabase.from('push_subscriptions').delete().eq('id',sub.id)
      }
    }
    return NextResponse.json({ok:true,sent,failed,target:announcement.audience})
  }catch(err:any){return NextResponse.json({error:err?.message||'Unable to send push notifications.'},{status:500})}
}
