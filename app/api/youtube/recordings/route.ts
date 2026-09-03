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
  matchupScores?:{team:string;rawScore:number}[]
  championshipRound?:boolean
}

function chunks<T>(items:T[],size:number){const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}

const MONTH_LOOKUP:Record<string,string>={
  jan:'January',january:'January',feb:'February',february:'February',mar:'March',march:'March',apr:'April',april:'April',may:'May',
  jun:'June',june:'June',jul:'July',july:'July',aug:'August',august:'August',sep:'September',sept:'September',september:'September',
  oct:'October',october:'October',nov:'November',november:'November',dec:'December',december:'December'
}

function looseRoundNumber(text:string){
  const patterns=[
    /\b(?:round|rnd|rd)\s*#?\s*(\d{1,2})\b/i,
    /\b(?:week|wk)\s*#?\s*(\d{1,2})\b/i,
    /\b(?:round|rnd|rd)\s*(?:number|no\.?)?\s*#?\s*(\d{1,2})\b/i
  ]
  for(const pattern of patterns){const match=text.match(pattern);if(match)return Number(match[1])}
  return undefined
}

function looseMonthYear(text:string){
  const match=text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[,./-]?\s*(20\d{2})\b/i)
  if(!match)return {}
  return {month:MONTH_LOOKUP[match[1].toLowerCase()],year:Number(match[2])}
}


type RawScoreRow={team:string;ym:string;roundNumber:number;rawScore:number}
type MatchupRow={ym:string;teamA:string;teamB:string}

function normalizeTeam(value:string){
  const normalized=value.toLowerCase().replace(/^team\s+/,'').replace(/[^a-z0-9]+/g,' ').trim()
  // Historical YouTube recordings may use Team Smith. Treat those as Team Shingler
  // everywhere in the archive so searching and raw-score matching stay unified.
  return normalized==='smith'?'shingler':normalized
}

function canonicalArchiveTeam(value:string|undefined){
  if(!value)return undefined
  return normalizeTeam(value)==='shingler'?'Team Shingler':value
}

async function getRawScoreRows(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.SUPABASE_SECRET_KEY
  const rows:RawScoreRow[]=[]
  if(!url||!key)return rows
  try{
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await supabase
      .from('team_raw_score_history')
      .select('canonical_team_name,score_month,round_number,raw_score')
      .not('round_number','is',null)
    if(error)return rows
    for(const row of data||[]){
      const team=normalizeTeam(String((row as any).canonical_team_name||''))
      const scoreMonth=String((row as any).score_month||'')
      const roundNumber=Number((row as any).round_number)
      const rawScore=Number((row as any).raw_score)
      if(!team||!/^\d{4}-\d{2}/.test(scoreMonth)||!Number.isFinite(roundNumber)||!Number.isFinite(rawScore))continue
      rows.push({team,ym:scoreMonth.slice(0,7),roundNumber,rawScore})
    }
  }catch{}
  return rows
}

function findRawScore(rows:RawScoreRow[],team:string|undefined,month:string|undefined,year:number|undefined,roundNumber:number|undefined){
  if(!team||!month||!year||!roundNumber)return undefined
  const monthIndex=FULL_MONTHS.indexOf(month)+1
  if(monthIndex<1)return undefined
  const normalizedTeam=normalizeTeam(team)
  const ym=`${year}-${String(monthIndex).padStart(2,'0')}`
  const exact=rows.find(row=>row.team===normalizedTeam&&row.ym===ym&&row.roundNumber===roundNumber)
  return exact?.rawScore
}


function findMentionedTeams(text:string,teamNames:string[]){
  const lower=text.toLowerCase()
  const found:string[]=[]
  for(const original of teamNames){
    const canonical=canonicalArchiveTeam(original)||original
    const base=normalizeTeam(original)
    const variants=[`team ${base}`,`team${base}`,base]
    if(variants.some(v=>lower.includes(v))&&!found.some(x=>normalizeTeam(x)===normalizeTeam(canonical)))found.push(canonical)
  }
  return found
}

async function getMatchupRows(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.SUPABASE_SECRET_KEY
  const rows:MatchupRow[]=[]
  if(!url||!key)return rows
  try{
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const [{data:months},{data:teams},{data:matchups}]=await Promise.all([
      supabase.from('league_months').select('id,month_start'),
      supabase.from('teams').select('id,name'),
      supabase.from('week4_matchups').select('league_month_id,team_high_id,team_low_id')
    ])
    const monthById=new Map((months||[]).map((x:any)=>[x.id,String(x.month_start||'').slice(0,7)]))
    const teamById=new Map((teams||[]).map((x:any)=>[x.id,canonicalArchiveTeam(String(x.name||''))||String(x.name||'')]))
    for(const row of matchups||[]){
      const ym=monthById.get((row as any).league_month_id)
      const teamA=teamById.get((row as any).team_high_id)
      const teamB=teamById.get((row as any).team_low_id)
      if(ym&&teamA&&teamB)rows.push({ym,teamA,teamB})
    }
  }catch{}
  return rows
}

function matchupTeamsForVideo(text:string,teamNames:string[],matchups:MatchupRow[],month:string|undefined,year:number|undefined,roundNumber:number|undefined,primaryTeam:string|undefined){
  const mentioned=findMentionedTeams(text,teamNames)
  if(mentioned.length>=2)return mentioned.slice(0,2)
  if(roundNumber!==4||!month||!year)return mentioned
  const monthIndex=FULL_MONTHS.indexOf(month)+1
  if(monthIndex<1)return mentioned
  const ym=`${year}-${String(monthIndex).padStart(2,'0')}`
  const anchor=primaryTeam||mentioned[0]
  if(!anchor)return mentioned
  const match=matchups.find(m=>m.ym===ym&&(normalizeTeam(m.teamA)===normalizeTeam(anchor)||normalizeTeam(m.teamB)===normalizeTeam(anchor)))
  if(!match)return mentioned
  return [match.teamA,match.teamB]
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

    const [knownTeams,rawScoreRows,matchupRows]=await Promise.all([getKnownTeamNames(),getRawScoreRows(),getMatchupRows()])
    const teamNames=[...new Set([...knownTeams,'Team Smith'])]
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
      const championshipRound=/\bchampionship\b/i.test(text)
      const strict=getRoundMetadata(description,title,teamNames)
      const looseDate=looseMonthYear(text)
      const fallbackDate=dateParts(detail?.liveStreamingDetails?.actualStartTime||publishedAt)

      // Prefer explicit metadata from the YouTube title/description. For older videos,
      // allow the round number to appear anywhere and use the stream/upload date when
      // the old description did not include a month/year.
      const month=strict.month||looseDate.month||fallbackDate.month
      const year=strict.year||looseDate.year||fallbackDate.year
      // In this league the monthly Championship Round is the Week 4 / Round 4
      // head-to-head. Older YouTube descriptions may say only "Championship"
      // without "Week 4", so use Round 4 internally for score/matchup lookup.
      const roundNumber=strict.roundNumber||looseRoundNumber(text)||(championshipRound?4:undefined)
      const season=month&&year?seasonForMonthYear(month,year):undefined
      const roundText=month&&year&&roundNumber?`${month} ${year} Round ${roundNumber}`:(month&&year?`${month} ${year}`:undefined)
      const archiveTeam=canonicalArchiveTeam(strict.matchedTeam)
      const rawScore=findRawScore(rawScoreRows,archiveTeam,month,year,roundNumber)
      const matchupTeams=matchupTeamsForVideo(text,teamNames,matchupRows,month,year,roundNumber,archiveTeam)
      const matchupScores=matchupTeams.map(team=>({team,rawScore:findRawScore(rawScoreRows,team,month,year,roundNumber)})).filter((x):x is {team:string;rawScore:number}=>typeof x.rawScore==='number'&&Number.isFinite(x.rawScore))

      recordings.push({
        videoId,
        title,
        description,
        thumbnail:snippet?.thumbnails?.maxres?.url||snippet?.thumbnails?.standard?.url||snippet?.thumbnails?.high?.url||snippet?.thumbnails?.medium?.url,
        publishedAt,
        duration:detail?.contentDetails?.duration,
        team:archiveTeam,
        month,
        year,
        roundNumber,
        roundText,
        season,
        rawScore,
        matchupScores:matchupScores.length>=2?matchupScores:undefined,
        championshipRound
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
