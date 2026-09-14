import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime='nodejs'
const VAPID_PUBLIC_KEY='BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM'

export async function POST(req:NextRequest){
  try{
    const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
    if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!
    const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const secret=process.env.SUPABASE_SECRET_KEY!
    const priv=process.env.VAPID_PRIVATE_KEY
    const authClient=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
    const {data:{user}}=await authClient.auth.getUser(token)
    if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
    const admin=createClient(url,secret,{auth:{persistSession:false}})
    const {data:me}=await admin.from('profiles').select('role,status').eq('id',user.id).maybeSingle()
    if(me?.role!=='admin'||me?.status!=='approved')return NextResponse.json({error:'Administrator access required.'},{status:403})

    const {profileId}=await req.json()
    if(!profileId)return NextResponse.json({error:'Profile ID is required.'},{status:400})
    const {data:profile,error:pErr}=await admin.from('profiles').select('id,full_name,email,status').eq('id',profileId).maybeSingle()
    if(pErr||!profile)return NextResponse.json({error:pErr?.message||'Account not found.'},{status:404})

    const {error:updateErr}=await admin.from('profiles').update({status:'approved',booking_enabled:true}).eq('id',profileId)
    if(updateErr)return NextResponse.json({error:updateErr.message},{status:500})

    if(!priv)return NextResponse.json({ok:true,sent:0,detail:'Account approved. Push server is not configured.'})
    const {data:subs,error:sErr}=await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',profileId)
    if(sErr)return NextResponse.json({ok:true,sent:0,detail:'Account approved, but notification lookup failed.'})
    webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',VAPID_PUBLIC_KEY,priv)
    let sent=0
    for(const s of (subs||[])){
      if(!s.p256dh||!s.auth)continue
      try{
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({
          title:'Account Approved',
          body:'Your Golf Sim account has been approved. You can now sign in.',
          url:'/login',
          tag:`account-approved-${profileId}`,
          kind:'account-approved'
        }))
        sent++
      }catch(e:any){
        if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id)
      }
    }
    return NextResponse.json({ok:true,sent,detail:sent>0?'Account approved and player notification sent.':'Account approved. The player does not yet have a registered phone notification subscription.'})
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Unable to approve account.'},{status:500})
  }
}
