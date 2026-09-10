import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

export const runtime='nodejs'

export async function POST(req:NextRequest){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
  if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!
  const authClient=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
  const {data:{user}}=await authClient.auth.getUser(token)
  if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
  const {data:profile}=await authClient.from('profiles').select('role').eq('id',user.id).single()
  if(profile?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403})
  const body=await req.json();const seasonId=String(body.seasonId||''),monthId=String(body.monthId||'')
  if(!seasonId||!monthId)return NextResponse.json({error:'Month details are incomplete.'},{status:400})
  const admin=createClient(url,secret,{auth:{persistSession:false}})
  const {data:month}=await admin.from('league_months').select('id,season_id').eq('id',monthId).eq('season_id',seasonId).maybeSingle()
  if(!month)return NextResponse.json({error:'League month could not be verified.'},{status:400})
  const {error:hErr}=await admin.from('monthly_team_handicaps').delete().eq('league_month_id',monthId)
  if(hErr)return NextResponse.json({error:hErr.message},{status:500})
  const {error:pErr}=await admin.from('handicap_publications').delete().eq('league_month_id',monthId)
  if(pErr)return NextResponse.json({error:pErr.message},{status:500})
  return NextResponse.json({ok:true})
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to reset handicaps.'},{status:500})}
}
