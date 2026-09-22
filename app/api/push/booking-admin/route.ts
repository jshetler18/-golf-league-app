import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime='nodejs'
const VAPID_PUBLIC_KEY='BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM'
const fmtDate=(iso:string)=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'America/New_York'}).format(new Date(iso))
const fmtTime=(iso:string)=>new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).format(new Date(iso))

export async function POST(req:NextRequest){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
  if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!,priv=process.env.VAPID_PRIVATE_KEY
  const auth=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
  const {data:{user}}=await auth.auth.getUser(token)
  if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
  const {bookingId}=await req.json()
  if(!bookingId)return NextResponse.json({error:'Booking ID is required.'},{status:400})
  const admin=createClient(url,secret,{auth:{persistSession:false}})
  const {data:b,error:bErr}=await admin.from('bookings').select('id,kind,user_id,start_at,end_at,status').eq('id',bookingId).maybeSingle()
  if(bErr||!b)return NextResponse.json({error:bErr?.message||'Reservation not found.'},{status:404})
  if(b.kind!=='personal'||b.user_id!==user.id||b.status!=='active')return NextResponse.json({error:'Reservation cannot be announced.'},{status:403})
  const {data:booker}=await admin.from('profiles').select('full_name,email').eq('id',user.id).maybeSingle()
  const {data:admins}=await admin.from('profiles').select('id').eq('role','admin').eq('status','approved')
  const ids=(admins||[]).map((x:any)=>x.id)
  if(!ids.length||!priv)return NextResponse.json({ok:true,sent:0})
  const {data:subs}=await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id',ids)
  webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',VAPID_PUBLIC_KEY,priv)
  const name=booker?.full_name||booker?.email||'A player'
  const body=`${name} booked ${fmtDate(b.start_at)} from ${fmtTime(b.start_at)} to ${fmtTime(b.end_at)}.`
  let sent=0
  for(const s of subs||[]){if(!s.p256dh||!s.auth)continue;try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:'Golf Sim Reservation Confirmation',body,url:'/admin/simulator/bookings',tag:`admin-booking-${b.id}`,kind:'admin-booking'}));sent++}catch(e:any){if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id)}}
  return NextResponse.json({ok:true,sent})
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to notify administrator.'},{status:500})}
}
