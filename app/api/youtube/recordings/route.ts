import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {FULL_MONTHS,getKnownTeamNames,getRoundMetadata,getYouTubeChannelWithUploads,seasonForMonthYear} from '@/lib/youtubeLive'

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
  rawScore?:number
}

function chunks<T>(items:T[],size:number){const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}

const MONTH_LOOKUP:Record<string,string>={
  jan:'January',january:'January',feb:'February',february:'February',mar:'March',march:'March',apr:'April',april:'April',may:'May',
  jun:'June',june:'June',jul:'July',july:'July',aug:'August',august:'August',sep:'September',sept:'September',september:'September',
  oct:'October',october:'October',nov:'November',november:'November',dec:'December',december:'December'
}

function looseRoundNumber(text:string){
  const match=text.match(/\b(?:round|rnd)\s*#?\s*(\d{1,2})\b/i)
  return match?Number(match[1]):undefined
}

function looseMonthYear(text:string){
  const match=text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[,./-]?\s*(20\d{2})\b/i)
  if(!match)return {}
  return {month:MONTH_LOOKUP[match[1].toLowerCase()],year:Number(match[2])}
}


async function getRawScoreLookup(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.SUPABASE_SECRET_KEY
  const lookup=new Map<string,number>()
  if(!url||!key)return lookup
  try{
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await supabase
      .from('team_raw_score_history')
      .select('canonical_team_name,score_month,round_number,raw_score')
      .not('round_number','is',null)
    if(error)return lookup
    for(const row of data||[]){
      const team=String((row as any).canonical_team_name||'').trim().toLowerCase()
      const scoreMonth=String((row as any).score_month||'')
      const roundNumber=Number((row as any).round_number)
      const rawScore=Number((row as any).raw_score)
      if(!team||!/^\d{4}-\d{2}/.test(scoreMonth)||!Number.isFinite(roundNumber)||!Number.isFinite(rawScore))continue
      const ym=scoreMonth.slice(0,7)
      lookup.set(`${team}|${ym}|${roundNumber}`,rawScore)
    }
  }catch{}
  return lookup
}

function rawScoreKey(team:string,month:string,year:number,roundNumber:number){
  const monthIndex=FULL_MONTHS.indexOf(month)+1
  if(monthIndex<1)return ''
  return `${team.trim().toLowerCase()}|${year}-${String(monthIndex).padStart(2,'0')}|${roundNumber}`
}

function dateParts(value?:string){
  if(!value)return {}
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return {}
  return {month:FULL_MONTHS[date.getUTCMonth()],year:date.getUTCFullYear()}
}

export async function GET(){
  try{
    const {configured,key,channel}=await getYouTubeChannelWithUploads()
    if(!configured)return NextResponse.json({configured:false,recordings:[],filters:{teams:[],seasons:[],months:[],rounds:[]}},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=600'}})
    const uploads=channel?.contentDetails?.relatedPlaylists?.uploads
    if(!uploads)throw new Error('The YouTube uploads playlist could not be found.')

    // Read the channel's complete uploads playlist, not just recent search results.
    // This includes archived livestreams from prior seasons as long as they remain public/unlisted-accessible through the channel playlist.
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

    const [teamNames,rawScoreLookup]=await Promise.all([getKnownTeamNames(),getRawScoreLookup()])
    const recordings:Recording[]=[]
    for(const item of playlistItems){
      const videoId=item?.contentDetails?.videoId||item?.snippet?.resourceId?.videoId
      if(!videoId)continue
      const detail=detailsById.get(videoId)
      const snippet=detail?.snippet||item?.snippet||{}
      if(snippet?.liveBroadcastContent==='live'||snippet?.liveBroadcastContent==='upcoming')continue

      const title=String(snippet?.title||'Recorded Round')
      const description=String(snippet?.description||'')
      const publishedAt=snippet?.publishedAt||item?.contentDetails?.videoPublishedAt
      const text=`${title}\n${description}`
      const strict=getRoundMetadata(description,title,teamNames)
      const looseDate=looseMonthYear(text)
      const fallbackDate=dateParts(detail?.liveStreamingDetails?.actualStartTime||publishedAt)

      // Prefer explicit metadata from the YouTube title/description. For older videos,
      // allow the round number to appear anywhere and use the stream/upload date when
      // the old description did not include a month/year.
      const month=strict.month||looseDate.month||fallbackDate.month
      const year=strict.year||looseDate.year||fallbackDate.year
      const roundNumber=strict.roundNumber||looseRoundNumber(text)
      const season=month&&year?seasonForMonthYear(month,year):undefined
      const roundText=month&&year&&roundNumber?`${month} ${year} Round ${roundNumber}`:(month&&year?`${month} ${year}`:undefined)
      const rawScore=strict.matchedTeam&&month&&year&&roundNumber?rawScoreLookup.get(rawScoreKey(strict.matchedTeam,month,year,roundNumber)):undefined

      recordings.push({
        videoId,
        title,
        description,
        thumbnail:snippet?.thumbnails?.maxres?.url||snippet?.thumbnails?.standard?.url||snippet?.thumbnails?.high?.url||snippet?.thumbnails?.medium?.url,
        publishedAt,
        duration:detail?.contentDetails?.duration,
        team:strict.matchedTeam,
        month,
        year,
        roundNumber,
        roundText,
        season,
        rawScore
      })
    }

    recordings.sort((a,b)=>new Date(b.publishedAt||0).getTime()-new Date(a.publishedAt||0).getTime())
    const unique=(values:(string|number|undefined)[])=>[...new Set(values.filter((x):x is string|number=>x!==undefined&&x!==''))]
    const monthOrder=new Map(FULL_MONTHS.map((m,i)=>[m,i]))
    // Always offer every current league team in the Team filter, even if an older video could not be classified yet.
    const teams=[...new Set([...teamNames,...unique(recordings.map(x=>x.team)).map(String)])].sort((a,b)=>a.localeCompare(b))
    const seasons=unique(recordings.map(x=>x.season)).map(String).sort((a,b)=>b.localeCompare(a))
    const months=unique(recordings.map(x=>x.month)).map(String).sort((a,b)=>(monthOrder.get(a)??99)-(monthOrder.get(b)??99))
    const rounds=unique(recordings.map(x=>x.roundNumber)).map(Number).sort((a,b)=>a-b)

    return NextResponse.json({configured:true,recordings,filters:{teams,seasons,months,rounds}},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=600'}})
  }catch(error:any){
    return NextResponse.json({configured:true,recordings:[],filters:{teams:[],seasons:[],months:[],rounds:[]},error:error?.message||'Unable to load recorded rounds.'},{status:502,headers:{'Cache-Control':'no-store'}})
  }
}
