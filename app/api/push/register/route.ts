import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

export const runtime='nodejs'

export async function POST(req:NextRequest){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
  if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!
  const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const secret=process.env.SUPABASE_SECRET_KEY!
  const authClient=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
  const {data:{user}}=await authClient.auth.getUser(token)
  if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
  const admin=createClient(url,secret,{auth:{persistSession:false}})
  const {data:profile}=await admin.from('profiles').select('status').eq('id',user.id).maybeSingle()
  if(profile?.status!=='approved')return NextResponse.json({error:'Account approval is required.'},{status:403})
  const {endpoint,p256dh,auth}=await req.json()
  if(!endpoint||!p256dh||!auth)return NextResponse.json({error:'Incomplete notification subscription.'},{status:400})
  // An endpoint can survive logout/account deletion on a device. Service-role registration
  // safely reassigns that device endpoint to the currently authenticated approved user.
  const {error}=await admin.from('push_subscriptions').upsert({user_id:user.id,endpoint,p256dh,auth,updated_at:new Date().toISOString()},{onConflict:'endpoint'})
  if(error)return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({ok:true})
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to register notifications.'},{status:500})}
}
