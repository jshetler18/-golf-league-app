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
  const {data:profile}=await authClient.from('profiles').select('role').eq('id',user.id).single()
  if(profile?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403})
  const admin=createClient(url,secret,{auth:{persistSession:false}})
  const body=await req.json();const seasonId=String(body.seasonId||''),monthId=String(body.monthId||''),monthStart=String(body.monthStart||'')
  if(!seasonId||!monthId||!monthStart||!Array.isArray(body.snapshot))return NextResponse.json({error:'Publication details are incomplete.'},{status:400})
  const {data:month}=await admin.from('league_months').select('id,season_id,month_start').eq('id',monthId).eq('season_id',seasonId).maybeSingle()
  if(!month||month.month_start!==monthStart)return NextResponse.json({error:'League month could not be verified.'},{status:400})
  const {data:activeTeams}=await admin.from('teams').select('id,name').eq('season_id',seasonId).eq('is_active',true)
  const {data:confirmed}=await admin.from('monthly_team_handicaps').select('team_id,handicap_points').eq('league_month_id',monthId)
  const confirmedMap=new Map((confirmed||[]).map((x:any)=>[x.team_id,Number(x.handicap_points)]))
  const missing=(activeTeams||[]).filter((t:any)=>!confirmedMap.has(t.id))
  if(missing.length)return NextResponse.json({error:`Set a handicap for every active team before publishing. Missing: ${missing.map((t:any)=>t.name).join(', ')}`},{status:400})
  const allowed=new Map((activeTeams||[]).map((t:any)=>[t.id,t.name]))
  const snapshot=body.snapshot.filter((x:any)=>allowed.has(x.team_id)).map((x:any)=>({...x,team_name:allowed.get(x.team_id),handicap:confirmedMap.get(x.team_id)}))
  if(snapshot.length!==(activeTeams||[]).length)return NextResponse.json({error:'The handicap snapshot does not include every active team.'},{status:400})
  const {data:prior}=await admin.from('handicap_publications').select('id').eq('league_month_id',monthId).maybeSingle()
  const payload={season_id:seasonId,league_month_id:monthId,month_start:monthStart,handicap_standard:Number(body.standard||27),snapshot,published_at:new Date().toISOString(),published_by:user.id}
  const {error}=await admin.from('handicap_publications').upsert(payload,{onConflict:'league_month_id'})
  if(error)return NextResponse.json({error:error.message},{status:500})
  let sent=0,failed=0
  if(priv){
   webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com','BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM',priv)
   const {data:approved}=await admin.from('profiles').select('id').eq('status','approved').not('player_id','is',null)
   const ids=(approved||[]).map((p:any)=>p.id)
   const {data:subs}=ids.length?await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',ids):{data:[] as any[]}
   const monthName=new Date(monthStart+'T12:00:00').toLocaleString('en-US',{month:'long',year:'numeric'})
   const title=prior?'Team Handicaps Updated':'New Team Handicaps Set'
   const message=prior?`Team handicaps for ${monthName} have been updated. Tap to view them.`:`New team handicaps for ${monthName} have been set. Tap to view them.`
   for(const s of subs||[]){if(!s.p256dh||!s.auth)continue;try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title,body:message,url:'/teams?tab=handicaps',tag:`handicaps-${monthId}`,kind:'handicaps'}));sent++}catch(e:any){failed++;if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id)}}
  }
  return NextResponse.json({ok:true,updated:Boolean(prior),sent,failed})
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to publish handicaps.'},{status:500})}
}
