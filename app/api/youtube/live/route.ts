import {NextResponse} from 'next/server'
import {getYouTubeLiveStatus} from '@/lib/youtubeLive'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(){
  try{
    const status=await getYouTubeLiveStatus()
    return NextResponse.json(status,{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error:any){
    return NextResponse.json({configured:true,isLive:false,error:error?.message||'Unable to check YouTube live status.'},{status:502,headers:{'Cache-Control':'no-store, max-age=0'}})
  }
}
