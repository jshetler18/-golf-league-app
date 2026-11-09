import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

export const runtime='nodejs'

export async function POST(req:NextRequest){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
  if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secret=process.env.SUPABASE_SECRET_KEY
  if(!url||!pub||!secret)return NextResponse.json({error:'Authentication server not configured.'},{status:500})
  const authClient=createClient(url,pub,{auth:{persistSession:false}})
  const {data:{user},error:authError}=await authClient.auth.getUser(token)
  if(authError||!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
  const admin=createClient(url,secret,{auth:{persistSession:false}})
  const {data:actor}=await admin.from('profiles').select('role,status').eq('id',user.id).maybeSingle()
  if(actor?.role!=='admin'||actor.status!=='approved')return NextResponse.json({error:'Administrator access required.'},{status:403})
  const body=await req.json()
  const profileId=String(body?.profileId||'')
  const password=String(body?.password||'')
  if(!/^[0-9a-f-]{36}$/i.test(profileId))return NextResponse.json({error:'Invalid account.'},{status:400})
  if(password.length<12||password.length>128)return NextResponse.json({error:'Temporary password must be 12–128 characters.'},{status:400})
  if(profileId===user.id)return NextResponse.json({error:'Use My Profile to change your own password.'},{status:400})
  const {data:target}=await admin.from('profiles').select('id,role,status').eq('id',profileId).maybeSingle()
  if(!target||target.role==='admin')return NextResponse.json({error:'Only non-admin member passwords can be reset here.'},{status:403})
  const {error}=await admin.auth.admin.updateUserById(profileId,{password})
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({ok:true})
 }catch{return NextResponse.json({error:'Unable to reset password.'},{status:500})}
}
