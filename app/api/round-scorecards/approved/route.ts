import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,secret=process.env.SUPABASE_SECRET_KEY!
  const admin=createClient(url,secret,{auth:{persistSession:false}})
  const {data:rows,error}=await admin.from('round_score_submissions').select('id,team_id,week_number,official_total,image_path,approved_at,archive_video_id,teams(name),league_months(month_start)').eq('status','approved').order('approved_at',{ascending:false})
  if(error)throw error
  const items=[] as any[]
  for(const r of rows||[]){
    let imageUrl=''
    if((r as any).image_path){const {data}=await admin.storage.from('round-scorecards').createSignedUrl((r as any).image_path,3600);imageUrl=data?.signedUrl||''}
    items.push({id:r.id,team:(r as any).teams?.name||'',weekNumber:r.week_number,score:Number(r.official_total),monthStart:(r as any).league_months?.month_start||'',archiveVideoId:(r as any).archive_video_id||'',imageUrl})
  }
  return NextResponse.json({items},{headers:{'Cache-Control':'no-store, max-age=0'}})
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to load scorecards.'},{status:500})}
}
