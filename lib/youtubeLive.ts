import {createClient} from '@supabase/supabase-js'

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
  matchedTeam?:string
  roundText?:string
}

export type RoundMetadata={
  matchedTeam?:string
  month?:string
  year?:number
  roundNumber?:number
  roundText?:string
  season?:string
}

const HANDLE='Toms19thHole'
export const FULL_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_ALIASES:Record<string,string>={
  jan:'January',january:'January',feb:'February',february:'February',mar:'March',march:'March',apr:'April',april:'April',
  may:'May',jun:'June',june:'June',jul:'July',july:'July',aug:'August',august:'August',sep:'September',sept:'September',september:'September',
  oct:'October',october:'October',nov:'November',november:'November',dec:'December',december:'December'
}

function normalize(value:string){
  return value
    .normalize('NFKD')
    .replace(/[’‘]/g,"'")
    .replace(/[–—]/g,'-')
    .replace(/[^a-zA-Z0-9'&.-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase()
}

function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

export async function getKnownTeamNames(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.SUPABASE_SECRET_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if(!url||!key)return [] as string[]
  try{
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await supabase.from('teams').select('name')
    if(error)return []
    return [...new Set((data||[]).map((x:any)=>String(x.name||'').trim()).filter(Boolean))]
  }catch{return []}
}

const JOINED_MONTH_TOKEN='jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'

function expandJoinedTeamMetadata(text:string,teamNames:string[]){
  // OBS/YouTube descriptions are sometimes entered without a space between the
  // team name and month, e.g. "Team SmolnikDecember 2025 Week 4". Insert only
  // that missing separator for known team names so normal parsing can continue.
  let expanded=text
  const ordered=[...teamNames].sort((a,b)=>b.length-a.length)
  for(const teamName of ordered){
    const variants=[teamName,teamName.replace(/^team\s+/i,'').trim()].filter(Boolean)
    for(const variant of variants){
      const re=new RegExp(`(${escapeRegExp(variant)})(${JOINED_MONTH_TOKEN})(?=\\s*20\\d{2}\\b)`,'ig')
      expanded=expanded.replace(re,'$1 $2')
    }
  }
  return expanded
}

function findTeamName(text:string,teamNames:string[]){
  const normalized=normalize(expandJoinedTeamMetadata(text,teamNames))
  const ordered=[...teamNames].sort((a,b)=>b.length-a.length)
  for(const teamName of ordered){
    const n=normalize(teamName)
    if(!n)continue
    const re=new RegExp(`(^|\\s)${escapeRegExp(n)}(?=\\s|$)`,'i')
    if(re.test(normalized))return teamName
    const short=n.replace(/^team\s+/,'').trim()
    if(short&&short!==n){
      // Older YouTube recordings often used only the team surname (for example,
      // "Billow Round 1") instead of the full database name "Team Billow".
      // Match either form as a standalone phrase so archived rounds can still be classified.
      const shortRe=new RegExp(`(^|\\s)${escapeRegExp(short)}(?=\\s|$)`,'i')
      if(shortRe.test(normalized))return teamName
    }
  }
  return ''
}

function findRoundParts(text:string){
  const compact=normalize(text)
  const monthToken=`(${JOINED_MONTH_TOKEN})`
  const roundToken='(?:round|rnd|r|week|wk)'
  const patterns=[
    new RegExp(`\\b${monthToken}\\s+(20\\d{2})\\s*(?:-|:)?\\s*${roundToken}\\s*#?\\s*(\\d{1,2})\\b`,'i'),
    new RegExp(`\\b${roundToken}\\s*#?\\s*(\\d{1,2})\\s*(?:-|:)?\\s*${monthToken}\\s+(20\\d{2})\\b`,'i'),
    new RegExp(`\\b${monthToken}\\s+${roundToken}\\s*#?\\s*(\\d{1,2})\\s+(20\\d{2})\\b`,'i')
  ]
  for(let i=0;i<patterns.length;i++){
    const match=compact.match(patterns[i])
    if(!match)continue
    let month='',year='',round=''
    if(i===0){month=match[1];year=match[2];round=match[3]}
    else if(i===1){round=match[1];month=match[2];year=match[3]}
    else {month=match[1];round=match[2];year=match[3]}
    const fullMonth=MONTH_ALIASES[month.toLowerCase()]||FULL_MONTHS.find(m=>m.toLowerCase().startsWith(month.toLowerCase()))||month
    return {month:fullMonth,year:Number(year),roundNumber:Number(round)}
  }
  return null
}

export function seasonForMonthYear(month:string,year:number){
  const monthIndex=FULL_MONTHS.indexOf(month)+1
  if(monthIndex>=11)return `${year}-${year+1}`
  if(monthIndex>=1&&monthIndex<=4)return `${year-1}-${year}`
  return `${year}`
}

export function getRoundMetadata(description?:string,title?:string,teamNames:string[]=[]):RoundMetadata{
  const text=expandJoinedTeamMetadata([title||'',description||''].filter(Boolean).join('\n'),teamNames)
  const teamName=findTeamName(text,teamNames)
  const round=findRoundParts(text)
  if(!round)return {matchedTeam:teamName||undefined}
  return {
    matchedTeam:teamName||undefined,
    month:round.month,
    year:round.year,
    roundNumber:round.roundNumber,
    roundText:`${round.month} ${round.year} Round ${round.roundNumber}`,
    season:seasonForMonthYear(round.month,round.year)
  }
}

export function getLiveDisplayText(description?:string,title?:string,teamNames:string[]=[]){
  const metadata=getRoundMetadata(description,title,teamNames)
  return {
    matchedTeam:metadata.matchedTeam,
    roundText:metadata.roundText,
    liveHeadline:metadata.matchedTeam?`${metadata.matchedTeam} is now LIVE!`:'A League Round is now LIVE!',
    liveSubtext:metadata.roundText||'Tap to watch'
  }
}


function decodeHtml(value:string){
  return value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
}

function metaContent(html:string,property:string){
  const escaped=escapeRegExp(property)
  const a=html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,'i'))
  const b=html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`,'i'))
  return decodeHtml((a?.[1]||b?.[1]||'').trim())
}

async function getLiveFromChannelRedirect():Promise<{videoId:string,title:string,description:string,thumbnail?:string}|null>{
  try{
    const res=await fetch(`https://www.youtube.com/@${HANDLE}/live`,{
      cache:'no-store',redirect:'follow',headers:{'User-Agent':'Mozilla/5.0'}
    })
    const finalUrl=new URL(res.url)
    const videoId=finalUrl.hostname.includes('youtube.com')&&finalUrl.pathname==='/watch'?finalUrl.searchParams.get('v'):null
    if(!videoId)return null
    const html=await res.text()
    const title=metaContent(html,'og:title')||'Tom’s 19th Hole Live'
    const description=metaContent(html,'og:description')||metaContent(html,'description')||''
    const thumbnail=metaContent(html,'og:image')||undefined
    return {videoId,title,description,thumbnail}
  }catch{return null}
}

async function getChannel(key:string,part='id,snippet'){
  const channelUrl=new URL('https://www.googleapis.com/youtube/v3/channels')
  channelUrl.searchParams.set('part',part)
  channelUrl.searchParams.set('forHandle',HANDLE)
  channelUrl.searchParams.set('key',key)
  const channelRes=await fetch(channelUrl,{cache:'no-store'})
  if(!channelRes.ok)throw new Error(`YouTube channel lookup failed (${channelRes.status}).`)
  const channelJson=await channelRes.json()
  const channel=channelJson?.items?.[0]
  if(!channel?.id)throw new Error('YouTube channel @Toms19thHole was not found.')
  return channel
}

export async function getYouTubeLiveStatus():Promise<YouTubeLiveStatus>{
  const key=process.env.YOUTUBE_API_KEY

  // First try YouTube's public /live redirect. This uses zero Data API quota and
  // keeps live detection working even if the Data API quota is temporarily exhausted.
  const direct=await getLiveFromChannelRedirect()
  if(direct){
    const teamNames=await getKnownTeamNames()
    const display=getLiveDisplayText(direct.description,direct.title,teamNames)
    return {configured:true,isLive:true,videoId:direct.videoId,title:direct.title,description:direct.description,thumbnail:direct.thumbnail,...display}
  }

  if(!key)return {configured:false,isLive:false}

  // v12.77: avoid YouTube Search API for live detection. Search costs 100 quota
  // units per call and exhausted the daily quota during frequent polling. The
  // uploads playlist + videos lookup costs only a few units and is safe to run
  // once per minute.
  const channel=await getChannel(key,'id,snippet,contentDetails')
  const uploadsId=channel?.contentDetails?.relatedPlaylists?.uploads
  if(!uploadsId)throw new Error('YouTube uploads playlist was not found.')

  const playlistUrl=new URL('https://www.googleapis.com/youtube/v3/playlistItems')
  playlistUrl.searchParams.set('part','snippet,contentDetails')
  playlistUrl.searchParams.set('playlistId',uploadsId)
  playlistUrl.searchParams.set('maxResults','10')
  playlistUrl.searchParams.set('key',key)
  const playlistRes=await fetch(playlistUrl,{cache:'no-store'})
  if(!playlistRes.ok)throw new Error(`YouTube uploads lookup failed (${playlistRes.status}).`)
  const playlistJson=await playlistRes.json()
  const items=playlistJson?.items||[]
  const ids=items.map((x:any)=>x?.contentDetails?.videoId||x?.snippet?.resourceId?.videoId).filter(Boolean)
  if(!ids.length)return {configured:true,isLive:false,channelId:channel.id,channelTitle:channel.snippet?.title}

  const videoUrl=new URL('https://www.googleapis.com/youtube/v3/videos')
  videoUrl.searchParams.set('part','snippet,liveStreamingDetails')
  videoUrl.searchParams.set('id',ids.join(','))
  videoUrl.searchParams.set('key',key)
  const videoRes=await fetch(videoUrl,{cache:'no-store'})
  if(!videoRes.ok)throw new Error(`YouTube live video lookup failed (${videoRes.status}).`)
  const videoJson=await videoRes.json()
  const video=(videoJson?.items||[]).find((v:any)=>
    v?.snippet?.liveBroadcastContent==='live' ||
    (!!v?.liveStreamingDetails?.actualStartTime && !v?.liveStreamingDetails?.actualEndTime)
  )
  if(!video?.id)return {configured:true,isLive:false,channelId:channel.id,channelTitle:channel.snippet?.title}
  const videoId=video.id
  const title=video?.snippet?.title||'Tom’s 19th Hole Live'
  const description=video?.snippet?.description||''
  const teamNames=await getKnownTeamNames()
  const display=getLiveDisplayText(description,title,teamNames)

  return {
    configured:true,
    isLive:true,
    channelId:channel.id,
    videoId,
    title,
    description,
    startedAt:video?.liveStreamingDetails?.actualStartTime,
    thumbnail:video?.snippet?.thumbnails?.high?.url||video?.snippet?.thumbnails?.medium?.url ,
    channelTitle:channel.snippet?.title,
    ...display
  }
}

export async function getYouTubeChannelWithUploads(){
  const key=process.env.YOUTUBE_API_KEY
  if(!key)return {configured:false as const,key:'',channel:null as any}
  const channel=await getChannel(key,'id,snippet,contentDetails')
  return {configured:true as const,key,channel}
}
