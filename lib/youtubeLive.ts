export type YouTubeLiveStatus={
  configured:boolean
  isLive:boolean
  channelId?:string
  videoId?:string
  title?:string
  description?:string
  startedAt?:string
  thumbnail?:string
  channelTitle?:string
  liveHeadline?:string
  liveSubtext?:string
}

const HANDLE='Toms19thHole'

const MONTHS='January|February|March|April|May|June|July|August|September|October|November|December'

function normalizeLine(value:string){
  return value.replace(/\s+/g,' ').trim()
}

export function getLiveDisplayText(description?:string){
  const text=String(description||'')
  const lines=text.split(/\r?\n/).map(normalizeLine).filter(Boolean)

  let teamName=''
  for(const line of lines){
    const match=line.match(/\bTeam\s+([A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){0,2})\b/i)
    if(match){
      teamName=`Team ${match[1].trim()}`
      break
    }
  }

  let roundText=''
  const roundPattern=new RegExp(`\\b(${MONTHS})\\s+(20\\d{2})\\s*(?:[-–—:]\\s*)?Round\\s*(\\d{1,2})\\b`,'i')
  for(const line of lines){
    const match=line.match(roundPattern)
    if(match){
      const month=match[1].charAt(0).toUpperCase()+match[1].slice(1).toLowerCase()
      roundText=`${month} ${match[2]} Round ${match[3]}`
      break
    }
  }
  if(!roundText){
    const match=text.replace(/\s+/g,' ').match(roundPattern)
    if(match){
      const month=match[1].charAt(0).toUpperCase()+match[1].slice(1).toLowerCase()
      roundText=`${month} ${match[2]} Round ${match[3]}`
    }
  }

  return {
    liveHeadline:teamName?`${teamName} is now LIVE!`:'A League Round is now LIVE!',
    liveSubtext:roundText||'Tap to watch'
  }
}

export async function getYouTubeLiveStatus():Promise<YouTubeLiveStatus>{
  const key=process.env.YOUTUBE_API_KEY
  if(!key)return {configured:false,isLive:false}

  const channelUrl=new URL('https://www.googleapis.com/youtube/v3/channels')
  channelUrl.searchParams.set('part','id,snippet')
  channelUrl.searchParams.set('forHandle',HANDLE)
  channelUrl.searchParams.set('key',key)
  const channelRes=await fetch(channelUrl,{cache:'no-store'})
  if(!channelRes.ok)throw new Error(`YouTube channel lookup failed (${channelRes.status}).`)
  const channelJson=await channelRes.json()
  const channel=channelJson?.items?.[0]
  if(!channel?.id)throw new Error('YouTube channel @Toms19thHole was not found.')

  const liveUrl=new URL('https://www.googleapis.com/youtube/v3/search')
  liveUrl.searchParams.set('part','snippet')
  liveUrl.searchParams.set('channelId',channel.id)
  liveUrl.searchParams.set('eventType','live')
  liveUrl.searchParams.set('type','video')
  liveUrl.searchParams.set('maxResults','1')
  liveUrl.searchParams.set('key',key)
  const liveRes=await fetch(liveUrl,{cache:'no-store'})
  if(!liveRes.ok)throw new Error(`YouTube live lookup failed (${liveRes.status}).`)
  const liveJson=await liveRes.json()
  const item=liveJson?.items?.[0]
  const videoId=item?.id?.videoId
  if(!videoId)return {configured:true,isLive:false,channelId:channel.id,channelTitle:channel.snippet?.title}

  const videoUrl=new URL('https://www.googleapis.com/youtube/v3/videos')
  videoUrl.searchParams.set('part','snippet,liveStreamingDetails')
  videoUrl.searchParams.set('id',videoId)
  videoUrl.searchParams.set('key',key)
  const videoRes=await fetch(videoUrl,{cache:'no-store'})
  if(!videoRes.ok)throw new Error(`YouTube live video lookup failed (${videoRes.status}).`)
  const videoJson=await videoRes.json()
  const video=videoJson?.items?.[0]
  const description=video?.snippet?.description||item?.snippet?.description||''
  const display=getLiveDisplayText(description)

  return {
    configured:true,
    isLive:true,
    channelId:channel.id,
    videoId,
    title:video?.snippet?.title||item?.snippet?.title||'Tom’s 19th Hole Live',
    description,
    startedAt:video?.liveStreamingDetails?.actualStartTime,
    thumbnail:video?.snippet?.thumbnails?.high?.url||video?.snippet?.thumbnails?.medium?.url||item?.snippet?.thumbnails?.high?.url,
    channelTitle:channel.snippet?.title,
    ...display
  }
}
