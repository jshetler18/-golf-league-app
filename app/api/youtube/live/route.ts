import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL
    const key=process.env.SUPABASE_SECRET_KEY
    if(!url||!key)return NextResponse.json({configured:false,isLive:false},{headers:{'Cache-Control':'no-store, max-age=0'}})
    const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await admin.from('youtube_live_state').select('*').eq('id',1).maybeSingle()
    if(error)throw error
    if(!data)return NextResponse.json({configured:true,isLive:false},{headers:{'Cache-Control':'no-store, max-age=0'}})
    // A stale positive state must never leave a LIVE banner stuck on screen if
    // the cron checker stops. Two and a half minutes allows normal 1-minute checks.
    const fresh=Date.now()-new Date(data.checked_at).getTime()<150000
    return NextResponse.json({
      configured:true,isLive:fresh&&!!data.is_live,
      videoId:data.video_id||undefined,title:data.title||undefined,description:data.description||undefined,
      startedAt:data.started_at||undefined,thumbnail:data.thumbnail||undefined,channelId:data.channel_id||undefined,
      channelTitle:data.channel_title||undefined,matchedTeam:data.matched_team||undefined,roundText:data.round_text||undefined,
      liveHeadline:data.live_headline||undefined,liveSubtext:data.live_subtext||undefined,checkedAt:data.checked_at
    },{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error:any){
    return NextResponse.json({configured:true,isLive:false,error:error?.message||'Unable to read YouTube live status.'},{status:502,headers:{'Cache-Control':'no-store, max-age=0'}})
  }
}
