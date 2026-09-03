import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'
export const runtime='nodejs'

export async function POST(req:NextRequest){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
  if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!,priv=process.env.VAPID_PRIVATE_KEY!
  const authClient=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
  const {data:{user}}=await authClient.auth.getUser(token)
  if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
  const {data:p}=await authClient.from('profiles').select('role').eq('id',user.id).single()
  if(p?.role!=='admin')return NextResponse.json({error:'Admin required.'},{status:403})
  const admin=createClient(url,secret,{auth:{persistSession:false}})
  const {submissionId,action,reason}=await req.json()
  if(!['approved','denied'].includes(action))return NextResponse.json({error:'Invalid review action.'},{status:400})
  const {data:r}=await admin.from('round_score_submissions').select('id,submitted_by,official_total,teams(name)').eq('id',submissionId).single()
  if(!r)return NextResponse.json({error:'Submission not found.'},{status:404})

  const team=(r as any).teams?.name||'A team'
  const score=Number((r as any).official_total||0).toFixed(1)
  let title='',body='',subs:any[]=[]
  if(action==='approved'){
    title='Round Complete'
    body=`${team} has completed their round with a score of ${score}.`
    const {data}=await admin.from('push_subscriptions').select('*')
    subs=data||[]
  }else{
    title='Scorecard Needs Correction'
    body=`Your scorecard was denied by the admin. ${String(reason||'Please review the scorecard and resubmit.').trim()}`
    const {data}=await admin.from('push_subscriptions').select('*').eq('user_id',(r as any).submitted_by)
    subs=data||[]
  }

  if(!priv)return NextResponse.json({ok:true,sent:0,warning:'Push notifications are not configured.'})
  webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com','BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM',priv)
  let sent=0
  for(const s of subs){
    if(!s.p256dh||!s.auth)continue
    try{
      await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({
        title,body,url:action==='approved'?`/rounds/${r.id}`:'/submit-score',tag:`round-review-${r.id}-${action}`,kind:'round-review'
      }))
      sent++
    }catch(e:any){
      if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id)
    }
  }
  return NextResponse.json({ok:true,sent})
 }catch(e:any){return NextResponse.json({error:e?.message||'Push failed.'},{status:500})}
}
