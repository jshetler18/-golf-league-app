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
    const {data:profile}=await supabase.from('profiles').select('role,status,is_account_approver').eq('id',user.id).single()
    const canSend=profile?.status==='approved'&&(profile?.role==='admin'||profile?.is_account_approver===true)
    if(!canSend)return NextResponse.json({error:'Admin access required.'},{status:403})

    const payload=await req.json()
    const announcementId=String(payload.announcementId||'')
    if(!announcementId)return NextResponse.json({error:'Announcement ID is required.'},{status:400})
    const {data:announcement,error:announcementError}=await supabase.from('announcements').select('id,title,body,audience,team_id').eq('id',announcementId).maybeSingle()
    if(announcementError)return NextResponse.json({error:announcementError.message},{status:500})
    if(!announcement)return NextResponse.json({error:'Announcement not found.'},{status:404})

    const title=String(announcement.title||'Tom Krise 19th Hole Golf League').slice(0,120)
    const body=String(announcement.body||'You have a new league message.').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,500)
    webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com', 'BM_yHAEkMmTuvc5_3KBvmQ1roeGxqyT8N8YJnpSzU19qwHRnUgHRsgRbQo62tqld6dh4kABoUMFf3HG0jf8Glnc', privateKey)

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
          const {data:subs,error:subError}=await supabase.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',userIds)
          if(subError)return NextResponse.json({error:subError.message},{status:500})
          subscriptions=subs||[]
        }
      }
    }else if(announcement.audience==='captains'){
      const {data:captainTeams,error:captainError}=await supabase.from('teams').select('captain_player_id').eq('is_active',true).not('captain_player_id','is',null)
      if(captainError)return NextResponse.json({error:captainError.message},{status:500})
      const captainIds=[...new Set((captainTeams||[]).map(t=>t.captain_player_id).filter(Boolean))]
      if(captainIds.length){
        const {data:linked,error:linkedError}=await supabase.from('profiles').select('id').in('player_id',captainIds).eq('status','approved')
        if(linkedError)return NextResponse.json({error:linkedError.message},{status:500})
        const userIds=(linked||[]).map(p=>p.id)
        if(userIds.length){
          const {data:subs,error:subError}=await supabase.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',userIds)
          if(subError)return NextResponse.json({error:subError.message},{status:500})
          subscriptions=subs||[]
        }
      }
    }else{
      const {data:subs,error:subError}=await supabase.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth')
      if(subError)return NextResponse.json({error:subError.message},{status:500})
      subscriptions=subs||[]
    }

    let sent=0, failed=0
    const sendOne=async(sub:any)=>{
      if(!sub.p256dh||!sub.auth)return
      try{
        await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body,url:`/messages?message=${encodeURIComponent(announcementId)}`,tag:`announcement-${announcementId}`,kind:'announcement'}),{timeout:4000})
        sent++
      }catch(err:any){
        failed++
        console.error('Announcement push rejected',{statusCode:err?.statusCode,message:err?.message})
        if(err?.statusCode===404||err?.statusCode===410)await supabase.from('push_subscriptions').delete().eq('id',sub.id)
      }
    }
    for(let i=0;i<subscriptions.length;i+=5){await Promise.allSettled(subscriptions.slice(i,i+5).map(sendOne))}
    return NextResponse.json({ok:true,sent,failed,target:announcement.audience})
  }catch(err:any){return NextResponse.json({error:err?.message||'Unable to send push notifications.'},{status:500})}
}
