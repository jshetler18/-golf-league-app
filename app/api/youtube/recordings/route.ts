import {NextResponse} from 'next/server'
import {FULL_MONTHS,getKnownTeamNames,getRoundMetadata,getYouTubeChannelWithUploads} from '@/lib/youtubeLive'

export const runtime='nodejs'
export const dynamic='force-dynamic'

type Recording={
  videoId:string
  title:string
  description:string
  thumbnail?:string
  publishedAt?:string
  duration?:string
  team?:string
  month?:string
  year?:number
  roundNumber?:number
  roundText?:string
  season?:string
}

function chunks<T>(items:T[],size:number){const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}

export async function GET(){
  try{
    const {configured,key,channel}=await getYouTubeChannelWithUploads()
    if(!configured)return NextResponse.json({configured:false,recordings:[],filters:{teams:[],seasons:[],months:[],rounds:[]}},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=600'}})
    const uploads=channel?.contentDetails?.relatedPlaylists?.uploads
    if(!uploads)throw new Error('The YouTube uploads playlist could not be found.')

    const playlistItems:any[]=[]
    let pageToken=''
    for(let page=0;page<20;page++){
      const url=new URL('https://www.googleapis.com/youtube/v3/playlistItems')
      url.searchParams.set('part','snippet,contentDetails')
      url.searchParams.set('playlistId',uploads)
      url.searchParams.set('maxResults','50')
      url.searchParams.set('key',key)
      if(pageToken)url.searchParams.set('pageToken',pageToken)
      const res=await fetch(url,{next:{revalidate:300}})
      if(!res.ok)throw new Error(`YouTube recording lookup failed (${res.status}).`)
      const json=await res.json()
      playlistItems.push(...(json?.items||[]))
      pageToken=json?.nextPageToken||''
      if(!pageToken)break
    }

    const ids=playlistItems.map(x=>x?.contentDetails?.videoId||x?.snippet?.resourceId?.videoId).filter(Boolean)
    const detailsById=new Map<string,any>()
    for(const batch of chunks(ids,50)){
      const url=new URL('https://www.googleapis.com/youtube/v3/videos')
      url.searchParams.set('part','snippet,contentDetails,liveStreamingDetails,status')
      url.searchParams.set('id',batch.join(','))
      url.searchParams.set('key',key)
      const res=await fetch(url,{next:{revalidate:300}})
      if(!res.ok)continue
      const json=await res.json()
      for(const item of json?.items||[])detailsById.set(item.id,item)
    }

    const teamNames=await getKnownTeamNames()
    const recordings:Recording[]=[]
    for(const item of playlistItems){
      const videoId=item?.contentDetails?.videoId||item?.snippet?.resourceId?.videoId
      if(!videoId)continue
      const detail=detailsById.get(videoId)
      const snippet=detail?.snippet||item?.snippet||{}
      // Exclude anything that is currently live. Completed streams and normal uploaded recordings are both eligible.
      if(snippet?.liveBroadcastContent==='live'||snippet?.liveBroadcastContent==='upcoming')continue
      const title=String(snippet?.title||'Recorded Round')
      const description=String(snippet?.description||'')
      const metadata=getRoundMetadata(description,title,teamNames)
      // The archive is intentionally only league rounds that can be identified by team + month/year/round metadata.
      if(!metadata.matchedTeam||!metadata.roundText)continue
      recordings.push({
        videoId,
        title,
        description,
        thumbnail:snippet?.thumbnails?.maxres?.url||snippet?.thumbnails?.standard?.url||snippet?.thumbnails?.high?.url||snippet?.thumbnails?.medium?.url,
        publishedAt:snippet?.publishedAt||item?.contentDetails?.videoPublishedAt,
        duration:detail?.contentDetails?.duration,
        team:metadata.matchedTeam,
        month:metadata.month,
        year:metadata.year,
        roundNumber:metadata.roundNumber,
        roundText:metadata.roundText,
        season:metadata.season
      })
    }

    recordings.sort((a,b)=>new Date(b.publishedAt||0).getTime()-new Date(a.publishedAt||0).getTime())
    const unique=(values:(string|number|undefined)[])=>[...new Set(values.filter((x):x is string|number=>x!==undefined&&x!==''))]
    const monthOrder=new Map(FULL_MONTHS.map((m,i)=>[m,i]))
    const teams=unique(recordings.map(x=>x.team)).map(String).sort((a,b)=>a.localeCompare(b))
    const seasons=unique(recordings.map(x=>x.season)).map(String).sort((a,b)=>b.localeCompare(a))
    const months=unique(recordings.map(x=>x.month)).map(String).sort((a,b)=>(monthOrder.get(a)??99)-(monthOrder.get(b)??99))
    const rounds=unique(recordings.map(x=>x.roundNumber)).map(Number).sort((a,b)=>a-b)

    return NextResponse.json({configured:true,recordings,filters:{teams,seasons,months,rounds}},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=600'}})
  }catch(error:any){
    return NextResponse.json({configured:true,recordings:[],filters:{teams:[],seasons:[],months:[],rounds:[]},error:error?.message||'Unable to load recorded rounds.'},{status:502,headers:{'Cache-Control':'no-store'}})
  }
}
