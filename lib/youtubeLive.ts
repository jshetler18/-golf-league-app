export type YouTubeLiveStatus={
  configured:boolean
  isLive:boolean
  channelId?:string
  videoId?:string
  title?:string
  startedAt?:string
  thumbnail?:string
  channelTitle?:string
}

const HANDLE='Toms19thHole'

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

  return {
    configured:true,
    isLive:true,
    channelId:channel.id,
    videoId,
    title:video?.snippet?.title||item?.snippet?.title||'Tom’s 19th Hole Live',
    startedAt:video?.liveStreamingDetails?.actualStartTime,
    thumbnail:video?.snippet?.thumbnails?.high?.url||video?.snippet?.thumbnails?.medium?.url||item?.snippet?.thumbnails?.high?.url,
    channelTitle:channel.snippet?.title
  }
}
