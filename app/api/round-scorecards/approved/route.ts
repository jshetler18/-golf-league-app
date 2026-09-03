import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
export async function GET(req:NextRequest){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
  if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!
  const auth=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
  const {data:{user}}=await auth.auth.getUser(token); if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
  const admin=createClient(url,secret,{auth:{persistSession:false}})
  const {data:rows,error}=await admin.from('round_score_submissions').select('id,team_id,week_number,official_total,image_path,approved_at,teams(name),league_months(month_start)').eq('status','approved').order('approved_at',{ascending:false})
  if(error)throw error
  const items=[] as any[]
  for(const r of rows||[]){
    let imageUrl=''; if((r as any).image_path){const {data}=await admin.storage.from('round-scorecards').createSignedUrl((r as any).image_path,3600); imageUrl=data?.signedUrl||''}
    items.push({id:r.id,team:(r as any).teams?.name||'',weekNumber:r.week_number,score:Number(r.official_total),monthStart:(r as any).league_months?.month_start||'',imageUrl})
  }
  return NextResponse.json({items})
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to load scorecards.'},{status:500})}
}
