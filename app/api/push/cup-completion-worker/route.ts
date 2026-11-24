import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'
import {getVapidPublicKey} from '@/lib/vapid'
export const runtime='nodejs'
export const dynamic='force-dynamic'
// Triggered by Supabase cron after the two-minute notification queue delay.
async function publishChampionships(admin:any){
 const priv=process.env.VAPID_PRIVATE_KEY;if(!priv)return
 const {data:jobs,error}=await admin.from('monthly_championship_announcements').select('league_month_id,photo_team_id').eq('enabled',true).is('published_at',null).not('photo_data','is',null)
 if(error)throw error
 for(const job of jobs||[]){
 const id=job.league_month_id
 const {data:q}=await admin.from('cup_completion_notifications').select('created_at,sent_at').eq('league_month_id',id).maybeSingle()
 if(!q?.sent_at||Date.now()-new Date(q.created_at).getTime()<300000)continue
 const [{data:m},{data:c},{data:p},{data:w},{data:s}]=await Promise.all([admin.from('league_months').select('month_start,season_id').eq('id',id).single(),admin.from('monthly_champions').select('team_id').eq('league_month_id',id).maybeSingle(),admin.from('cup_points').select('team_id,points,placement,teams(name)').eq('league_month_id',id).order('placement'),admin.from('week4_matchups').select('team_high_id,team_low_id,winner_team_id').eq('league_month_id',id),admin.from('weekly_scores').select('team_id,official_total').eq('league_month_id',id).eq('week_number',4).eq('status','approved')])
 if(!m||c?.team_id!==job.photo_team_id||!p||!w||!s)continue
 const {data:t}=await admin.from('teams').select('id').eq('season_id',m.season_id).eq('is_active',true)
 const ids=new Set((t||[]).map((x:any)=>x.id)),approved=new Set(s.filter((x:any)=>x.official_total!==null).map((x:any)=>x.team_id))
 if(ids.size!==10||p.length!==10||w.length!==5||!w.every((x:any)=>x.winner_team_id&&ids.has(x.team_high_id)&&ids.has(x.team_low_id))||new Set(w.flatMap((x:any)=>[x.team_high_id,x.team_low_id])).size!==10||!p.every((x:any,i:number)=>ids.has(x.team_id)&&approved.has(x.team_id)&&x.placement===i+1&&x.teams?.name)||p[0].team_id!==c.team_id)continue
 const name=new Date(m.month_start+'T12:00:00').toLocaleDateString('en-US',{month:'long'})
 const {data:players,error:pe}=await admin.from('profiles').select('id').eq('status','approved').eq('access_type','league');if(pe)continue
 const playerIds=(players||[]).map((x:any)=>x.id)
 const {data:subs,error:se}=playerIds.length?await admin.from('push_subscriptions').select('*').in('user_id',playerIds):{data:[],error:null};if(se)continue
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',getVapidPublicKey(),priv)
 const {data:claim,error:ce}=await admin.from('monthly_championship_announcements').update({published_at:new Date().toISOString(),month_name:name,results:p.map((x:any)=>({name:x.teams.name,points:x.points,placement:x.placement}))}).eq('league_month_id',id).eq('enabled',true).eq('photo_team_id',job.photo_team_id).is('published_at',null).select('league_month_id')
 if(ce||!claim?.length)continue
 const results=await Promise.allSettled((subs||[]).filter((x:any)=>x.endpoint&&x.p256dh&&x.auth).map(async(x:any)=>{try{await webpush.sendNotification({endpoint:x.endpoint,keys:{p256dh:x.p256dh,auth:x.auth}},JSON.stringify({title:name+' is now complete!',body:'Here are the final standings for '+name+'.',url:'/cup',tag:'monthly-championship-'+id,kind:'monthly-championship'}));return 1}catch(e:any){if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',x.id);return 0}}))
 await admin.from('monthly_championship_announcements').update({sent_count:results.reduce((n:number,x:any)=>n+(x.status==='fulfilled'?Number(x.value):0),0)}).eq('league_month_id',id)
 }
}

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
 await publishChampionships(admin)
 return NextResponse.json({ok:true,processed})
 }catch(e:any){console.error('Cup push worker error',e);return NextResponse.json({error:'Worker failed'},{status:500})}
}
