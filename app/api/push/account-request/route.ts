import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime='nodejs'
const VAPID_PUBLIC_KEY='BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM'

export async function POST(req:NextRequest){
  try{
    const {userId}=await req.json()
    if(!userId)return NextResponse.json({error:'User ID is required.'},{status:400})
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!
    const secret=process.env.SUPABASE_SECRET_KEY!
    const priv=process.env.VAPID_PRIVATE_KEY
    const admin=createClient(url,secret,{auth:{persistSession:false}})

    const {data:profile,error:pErr}=await admin.from('profiles')
      .select('id,full_name,email,status,created_at')
      .eq('id',userId).maybeSingle()
    if(pErr||!profile)return NextResponse.json({error:pErr?.message||'Account request was not found.'},{status:404})
    if(profile.status!=='pending')return NextResponse.json({ok:true,sent:0,detail:'Account is not pending.'})

    // Only allow the public signup flow to announce a recently-created pending account.
    const created=Date.parse(profile.created_at||'')
    if(!Number.isFinite(created)||Date.now()-created>30*60*1000)return NextResponse.json({ok:true,sent:0,detail:'Account request is outside the new-signup notification window.'})

    const {data:admins,error:aErr}=await admin.from('profiles').select('id').eq('role','admin').eq('status','approved')
    if(aErr)return NextResponse.json({error:aErr.message},{status:500})
    const adminIds=(admins||[]).map((x:any)=>x.id)
    if(!adminIds.length)return NextResponse.json({ok:true,sent:0,detail:'No approved administrators found.'})
    if(!priv)return NextResponse.json({ok:true,sent:0,detail:'Push server is not configured.'})

    const {data:subs,error:sErr}=await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',adminIds)
    if(sErr)return NextResponse.json({error:sErr.message},{status:500})
    webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',VAPID_PUBLIC_KEY,priv)
    const name=profile.full_name||profile.email||'A new player'
    let sent=0
    for(const s of (subs||[])){
      if(!s.p256dh||!s.auth)continue
      try{
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({
          title:'New Account Request',
          body:`${name} is waiting for account approval.`,
          url:'/admin/accounts',
          tag:`account-request-${profile.id}`,
          kind:'account-request'
        }))
        sent++
      }catch(e:any){
        if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id)
      }
    }
    return NextResponse.json({ok:true,sent})
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Unable to notify administrators.'},{status:500})
  }
}
