import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'
import {getVapidPublicKey} from '@/lib/vapid'
export const runtime='nodejs'
export const dynamic='force-dynamic'
// Triggered by Supabase cron after the two-minute notification queue delay.
export async function POST(req:NextRequest){
 if(!process.env.CUP_PUSH_WORKER_TOKEN||req.headers.get('authorization')!==`Bearer ${process.env.CUP_PUSH_WORKER_TOKEN}`)return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}})
 const {data:due,error}=await admin.from('cup_completion_notifications').select('league_month_id').is('sent_at',null).lte('scheduled_at',new Date().toISOString()).limit(10)
 if(error)throw error
 let processed=0
 for(const job of due||[]){
 const {data:claimed}=await admin.from('cup_completion_notifications').update({sent_at:new Date().toISOString()}).eq('league_month_id',job.league_month_id).is('sent_at',null).select('league_month_id')
 if(!claimed?.length)continue
 const {data:month}=await admin.from('league_months').select('month_start').eq('id',job.league_month_id).single()
 if(!month)continue
 const priv=process.env.VAPID_PRIVATE_KEY
 if(!priv){console.error('Cup push VAPID key missing');continue}
 const name=new Date(month.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})
 const title='Cup Standings Updated',body=`${name} head-to-head matchups are complete! Final Cup points and ranking changes are ready. Tap to view Cup Standings.`
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',getVapidPublicKey(),priv)
 const {data:subs}=await admin.from('push_subscriptions').select('*')
 const results=await Promise.allSettled((subs||[]).filter((s:any)=>s.endpoint&&s.p256dh&&s.auth).map(async(s:any)=>{
 try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title,body,url:'/cup',tag:`cup-complete-${job.league_month_id}`,kind:'cup-complete'}));return 1}
 catch(e:any){console.error('Cup push failed',e?.statusCode);if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id);return 0}
 }))
 const sent=results.reduce((n:number,x:any)=>n+(x.status==='fulfilled'?Number(x.value):0),0)
 await admin.from('cup_completion_notifications').update({sent_count:sent}).eq('league_month_id',job.league_month_id)
 processed++
 }
 return NextResponse.json({ok:true,processed})
 }catch(e:any){console.error('Cup push worker error',e);return NextResponse.json({error:'Worker failed'},{status:500})}
}
