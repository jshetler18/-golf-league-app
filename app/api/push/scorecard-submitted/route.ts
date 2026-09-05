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
    if(!priv)return NextResponse.json({ok:true,sent:0,detail:'Push server is not configured.'})

    const authClient=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
    const {data:{user}}=await authClient.auth.getUser(token)
    if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})

    const {submissionId}=await req.json()
    if(!submissionId)return NextResponse.json({error:'Submission ID is required.'},{status:400})

    const admin=createClient(url,secret,{auth:{persistSession:false}})
    const {data:r,error:rErr}=await admin.from('round_score_submissions')
      .select('id,submitted_by,week_number,status,teams(name),league_months(month_start)')
      .eq('id',submissionId).single()
    if(rErr||!r)return NextResponse.json({error:rErr?.message||'Submission not found.'},{status:404})
    if(r.submitted_by!==user.id)return NextResponse.json({error:'Not allowed.'},{status:403})
    if(r.status!=='pending')return NextResponse.json({ok:true,sent:0,detail:'Submission is no longer pending.'})

    const {data:profiles,error:pErr}=await admin.from('profiles')
      .select('id,role,is_scorecard_official,status')
      .eq('status','approved')
    if(pErr)return NextResponse.json({error:pErr.message},{status:500})

    const reviewerIds=(profiles||[])
      .filter((p:any)=>p.role==='admin'||p.is_scorecard_official===true)
      .map((p:any)=>p.id)
    if(!reviewerIds.length)return NextResponse.json({ok:true,sent:0,detail:'No active scorecard reviewers found.'})

    const {data:subs,error:sErr}=await admin.from('push_subscriptions').select('*').in('user_id',reviewerIds)
    if(sErr)return NextResponse.json({error:sErr.message},{status:500})

    const month=new Date((r as any).league_months.month_start+'T12:00:00').toLocaleString('en-US',{month:'long'})
    const team=(r as any).teams?.name||'A team'
    const {data:submitter}=await admin.from('profiles').select('full_name,email').eq('id',user.id).maybeSingle()
    const submitterName=submitter?.full_name||submitter?.email||'A player'
    const title='Scorecard Ready for Approval'
    const body=`${team}'s ${month} Week ${r.week_number} scorecard was submitted by ${submitterName} and is ready for review.`

    webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',VAPID_PUBLIC_KEY,priv)
    const usable=(subs||[]).filter((s:any)=>s.p256dh&&s.auth)
    const results=await Promise.allSettled(usable.map(async(s:any)=>{
      try{
        await webpush.sendNotification(
          {endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},
          JSON.stringify({
            title,body,url:'/scorecard-official',
            tag:`scorecard-ready-${r.id}`,
            kind:'scorecard-ready'
          })
        )
        return 1
      }catch(e:any){
        console.error('Scorecard submitted push failed',{submissionId:r.id,statusCode:e?.statusCode,body:e?.body})
        if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id)
        return 0
      }
    }))
    const sent=results.reduce((n:any,x:any)=>n+(x.status==='fulfilled'?Number(x.value||0):0),0)
    return NextResponse.json({ok:true,sent})
  }catch(e:any){
    console.error('Scorecard submitted notification route failed',e)
    return NextResponse.json({error:e?.message||'Unable to notify scorecard reviewers.'},{status:500})
  }
}
