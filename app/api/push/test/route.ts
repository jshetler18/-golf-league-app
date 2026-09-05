import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'
export const runtime='nodejs'
const VAPID_PUBLIC_KEY='BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM'
export async function POST(req:NextRequest){
  try{
    const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
    if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!,priv=process.env.VAPID_PRIVATE_KEY
    if(!priv)return NextResponse.json({error:'Push server is missing its private notification key.'},{status:500})
    const authClient=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
    const {data:{user}}=await authClient.auth.getUser(token)
    if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
    const admin=createClient(url,secret,{auth:{persistSession:false}})
    const {data:subs,error}=await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',user.id)
    if(error)return NextResponse.json({error:error.message},{status:500})
    const usable=(subs||[]).filter((s:any)=>s.p256dh&&s.auth)
    if(!usable.length)return NextResponse.json({ok:true,sent:0,failed:0,detail:'No usable server push subscription is registered for this account.'})
    webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',VAPID_PUBLIC_KEY,priv)
    let sent=0,failed=0,lastError=''
    for(const s of usable){
      try{
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:'Golf League Notification Test',body:'Push notifications are working on this device.',url:'/settings',tag:`push-test-${Date.now()}`,kind:'test'}))
        sent++
      }catch(e:any){
        failed++;lastError=`Push service returned ${e?.statusCode||'an error'}${e?.body?`: ${String(e.body).slice(0,180)}`:''}`
        console.error('Push test failed',{statusCode:e?.statusCode,body:e?.body})
        if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id)
      }
    }
    return NextResponse.json({ok:true,sent,failed,detail:lastError})
  }catch(e:any){
    console.error('Push test route failed',e)
    return NextResponse.json({error:e?.message||'Push test failed.'},{status:500})
  }
}
