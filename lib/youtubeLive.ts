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

function findTeamName(text:string,teamNames:string[]){
  const normalized=normalize(text)
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
  const monthToken='(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
  const patterns=[
    new RegExp(`\\b${monthToken}\\s+(20\\d{2})\\s*(?:-|:)?\\s*(?:round|rnd|r)\\s*#?\\s*(\\d{1,2})\\b`,'i'),
    new RegExp(`\\b(?:round|rnd|r)\\s*#?\\s*(\\d{1,2})\\s*(?:-|:)?\\s*${monthToken}\\s+(20\\d{2})\\b`,'i'),
    new RegExp(`\\b${monthToken}\\s+(?:round|rnd|r)\\s*#?\\s*(\\d{1,2})\\s+(20\\d{2})\\b`,'i')
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
  const text=[title||'',description||''].filter(Boolean).join('\n')
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
  if(!key)return {configured:false,isLive:false}

  const channel=await getChannel(key)
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
  const title=video?.snippet?.title||item?.snippet?.title||'Tom’s 19th Hole Live'
  const description=video?.snippet?.description||item?.snippet?.description||''
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
    thumbnail:video?.snippet?.thumbnails?.high?.url||video?.snippet?.thumbnails?.medium?.url||item?.snippet?.thumbnails?.high?.url,
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
