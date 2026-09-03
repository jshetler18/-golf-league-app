import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'
import {getYouTubeLiveStatus} from '@/lib/youtubeLive'

const PUBLIC='BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM'

export async function runYouTubeLiveCheck(){
  const status=await getYouTubeLiveStatus()
  if(!status.configured)return {ok:true,configured:false,isLive:false,sent:0}
  if(!status.isLive||!status.videoId)return {ok:true,configured:true,isLive:false,sent:0}

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey=process.env.SUPABASE_SECRET_KEY
  const privateKey=process.env.VAPID_PRIVATE_KEY
  if(!url||!adminKey||!privateKey)throw new Error('Live push notifications are not fully configured.')
  const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}})

  const {data:existing,error:existingError}=await admin.from('youtube_live_notifications').select('video_id,notified_at').eq('video_id',status.videoId).maybeSingle()
  if(existingError)throw existingError
  if(existing?.notified_at)return {ok:true,configured:true,isLive:true,alreadyNotified:true,sent:0,videoId:status.videoId}

  const {error:reserveError}=await admin.from('youtube_live_notifications').upsert({video_id:status.videoId,title:status.title||null,detected_at:new Date().toISOString()},{onConflict:'video_id'})
  if(reserveError)throw reserveError

  const {data:profiles,error:profileError}=await admin.from('profiles').select('id').eq('status','approved')
  if(profileError)throw profileError
  const userIds=(profiles||[]).map(p=>p.id)
  let subscriptions:any[]=[]
  if(userIds.length){
    const {data:subs,error:subsError}=await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',userIds)
    if(subsError)throw subsError
    subscriptions=subs||[]
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',PUBLIC,privateKey)
  const title='Tom’s 19th Hole is LIVE!'
  const body=status.title?`${status.title} — Tap to watch now.`:'Tap to watch the live stream now.'
  let sent=0,failed=0
  for(const sub of subscriptions){
    if(!sub.p256dh||!sub.auth)continue
    try{
      await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body,url:'/live',tag:`youtube-live-${status.videoId}`}))
      sent++
    }catch(error:any){
      failed++
      if(error?.statusCode===404||error?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',sub.id)
    }
  }
  if(sent>0||subscriptions.length===0){
    const {error:updateError}=await admin.from('youtube_live_notifications').update({notified_at:new Date().toISOString(),sent_count:sent}).eq('video_id',status.videoId)
    if(updateError)throw updateError
  }
  return {ok:true,configured:true,isLive:true,videoId:status.videoId,sent,failed}
}
