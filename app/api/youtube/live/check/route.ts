import {NextRequest,NextResponse} from 'next/server'
import {runYouTubeLiveCheck} from '@/lib/youtubeLiveNotify'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function POST(req:NextRequest){
  try{
    const secret=process.env.CRON_SECRET
    if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401})
    return NextResponse.json(await runYouTubeLiveCheck())
  }catch(error:any){
    return NextResponse.json({error:error?.message||'Unable to check YouTube livestream.'},{status:500})
  }
}
